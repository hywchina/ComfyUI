import argparse
import json
import ssl
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit


WEB_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = WEB_ROOT.parent
DEFAULT_WORKFLOWS_DIR = PROJECT_ROOT / "user" / "default" / "workflows_api"
DEFAULT_CA_CERT = Path(f"{PROJECT_ROOT}-certs") / "comfyui-local-ca.crt"


def is_api_workflow(workflow):
    return (
        isinstance(workflow, dict)
        and bool(workflow)
        and all(
            isinstance(node, dict)
            and isinstance(node.get("class_type"), str)
            and isinstance(node.get("inputs"), dict)
            for node in workflow.values()
        )
    )


def is_connection(value, workflow):
    return (
        isinstance(value, list)
        and len(value) == 2
        and str(value[0]) in workflow
        and isinstance(value[1], int)
    )


class WebUIHandler(SimpleHTTPRequestHandler):
    comfy_url = "https://127.0.0.1:8188"
    comfy_ssl_context = None
    workflows_dir = DEFAULT_WORKFLOWS_DIR

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_ROOT, **kwargs)

    def do_GET(self):
        parsed = urlsplit(self.path)
        if parsed.path == "/health":
            self._write_json(
                200,
                {
                    "status": "ok",
                    "comfy_url": self.comfy_url,
                    "workflows_dir": str(self.workflows_dir),
                },
            )
            return
        if parsed.path == "/api/workflows":
            self._list_workflows()
            return
        if parsed.path == "/api/workflow":
            self._get_workflow(parsed.query)
            return
        if parsed.path.startswith("/comfy/"):
            self._proxy(parsed)
            return
        super().do_GET()

    def do_POST(self):
        parsed = urlsplit(self.path)
        if parsed.path.startswith("/comfy/"):
            self._proxy(parsed)
            return
        self.send_error(405)

    def _workflow_path(self, workflow_id):
        root = self.workflows_dir.resolve()
        candidate = (root / workflow_id).resolve()
        try:
            candidate.relative_to(root)
        except ValueError:
            return None
        if candidate.suffix.lower() != ".json" or not candidate.is_file():
            return None
        return candidate

    def _read_workflow(self, path):
        with path.open(encoding="utf-8") as file:
            workflow = json.load(file)
        if not is_api_workflow(workflow):
            raise ValueError("不是有效的 ComfyUI API 工作流")
        return workflow

    def _list_workflows(self):
        workflows = []
        invalid = []

        if not self.workflows_dir.is_dir():
            self._write_json(
                200,
                {
                    "workflows": [],
                    "invalid": [],
                    "warning": f"工作流目录不存在：{self.workflows_dir}",
                },
            )
            return

        paths = sorted(
            (
                path
                for path in self.workflows_dir.rglob("*.json")
                if not any(part.startswith(".") for part in path.relative_to(self.workflows_dir).parts)
            ),
            key=lambda path: str(path).casefold(),
        )

        for path in paths:
            workflow_id = path.relative_to(self.workflows_dir).as_posix()
            try:
                workflow = self._read_workflow(path)
            except (OSError, json.JSONDecodeError, ValueError) as error:
                invalid.append({"id": workflow_id, "error": str(error)})
                continue

            class_types = [node["class_type"] for node in workflow.values()]
            output_types = sorted(
                {
                    class_type
                    for class_type in class_types
                    if any(token in class_type.lower() for token in ("save", "preview", "compare"))
                }
            )
            editable_count = sum(
                1
                for node in workflow.values()
                for value in node["inputs"].values()
                if not is_connection(value, workflow)
            )
            workflows.append(
                {
                    "id": workflow_id,
                    "name": path.stem,
                    "group": path.parent.relative_to(self.workflows_dir).as_posix(),
                    "node_count": len(workflow),
                    "editable_count": editable_count,
                    "output_types": output_types,
                }
            )

        self._write_json(200, {"workflows": workflows, "invalid": invalid})

    def _get_workflow(self, query):
        workflow_id = parse_qs(query).get("id", [""])[0]
        path = self._workflow_path(workflow_id)
        if path is None:
            self._write_json(404, {"error": "找不到工作流"})
            return

        try:
            workflow = self._read_workflow(path)
        except (OSError, json.JSONDecodeError, ValueError) as error:
            self._write_json(422, {"error": str(error)})
            return

        self._write_json(
            200,
            {
                "id": workflow_id,
                "name": path.stem,
                "workflow": workflow,
            },
        )

    def _proxy(self, parsed):
        upstream_path = parsed.path.removeprefix("/comfy")
        upstream_url = f"{self.comfy_url}{upstream_path}"
        if parsed.query:
            upstream_url = f"{upstream_url}?{parsed.query}"

        body = None
        if self.command == "POST":
            body = self.rfile.read(int(self.headers.get("Content-Length", "0")))

        headers = {}
        for name in ("Content-Type", "Accept"):
            if value := self.headers.get(name):
                headers[name] = value

        request = urllib.request.Request(
            upstream_url,
            data=body,
            headers=headers,
            method=self.command,
        )

        timeout = 120 if upstream_path == "/view" else 30
        try:
            with urllib.request.urlopen(
                request,
                timeout=timeout,
                context=self.comfy_ssl_context,
            ) as response:
                self._write_upstream(response.status, response.headers, response.read())
        except urllib.error.HTTPError as error:
            self._write_upstream(error.code, error.headers, error.read())
        except (urllib.error.URLError, TimeoutError) as error:
            self._write_json(
                502,
                {
                    "error": "无法连接 ComfyUI",
                    "details": str(error),
                    "comfy_url": self.comfy_url,
                },
            )

    def _write_upstream(self, status, headers, body):
        self.send_response(status)
        self.send_header("Content-Type", headers.get("Content-Type", "application/octet-stream"))
        if disposition := headers.get("Content-Disposition"):
            self.send_header("Content-Disposition", disposition)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _write_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


def main():
    parser = argparse.ArgumentParser(description="ComfyUI Workflow Studio")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5173)
    parser.add_argument("--comfy-url", default="https://127.0.0.1:8188")
    parser.add_argument("--workflows-dir", type=Path, default=DEFAULT_WORKFLOWS_DIR)
    parser.add_argument("--comfy-ca-cert", type=Path, default=DEFAULT_CA_CERT)
    parser.add_argument("--tls-certfile", type=Path)
    parser.add_argument("--tls-keyfile", type=Path)
    args = parser.parse_args()

    if not args.comfy_url.startswith(("http://", "https://")):
        parser.error("--comfy-url 必须以 http:// 或 https:// 开头")
    if args.comfy_url.startswith("https://"):
        if not args.comfy_ca_cert.is_file():
            parser.error(f"找不到 ComfyUI CA 证书：{args.comfy_ca_cert}")
        WebUIHandler.comfy_ssl_context = ssl.create_default_context(cafile=args.comfy_ca_cert)

    WebUIHandler.comfy_url = args.comfy_url.rstrip("/")
    WebUIHandler.workflows_dir = args.workflows_dir.resolve()

    server = ThreadingHTTPServer((args.host, args.port), WebUIHandler)
    if bool(args.tls_certfile) != bool(args.tls_keyfile):
        parser.error("--tls-certfile 和 --tls-keyfile 必须同时提供")
    scheme = "http"
    if args.tls_certfile:
        if not args.tls_certfile.is_file() or not args.tls_keyfile.is_file():
            parser.error("找不到 Web UI TLS 证书或私钥")
        server_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        server_context.load_cert_chain(args.tls_certfile, args.tls_keyfile)
        server.socket = server_context.wrap_socket(server.socket, server_side=True)
        scheme = "https"
    display_host = "127.0.0.1" if args.host == "0.0.0.0" else args.host
    print(f"Workflow Studio: {scheme}://{display_host}:{args.port}")
    print(f"ComfyUI: {WebUIHandler.comfy_url}")
    print(f"Workflows: {WebUIHandler.workflows_dir}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
