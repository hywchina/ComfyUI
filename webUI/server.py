import argparse
import json
import os
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit


class WebUIHandler(SimpleHTTPRequestHandler):
    comfy_url = "http://127.0.0.1:8188"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(__file__), **kwargs)

    def do_GET(self):
        if self.path == "/health":
            self._write_json(200, {"status": "ok", "comfy_url": self.comfy_url})
            return
        if self.path.startswith("/comfy/"):
            self._proxy()
            return
        super().do_GET()

    def do_POST(self):
        if self.path.startswith("/comfy/"):
            self._proxy()
            return
        self.send_error(405)

    def _proxy(self):
        parsed = urlsplit(self.path)
        upstream_path = parsed.path.removeprefix("/comfy")
        upstream_url = f"{self.comfy_url}{upstream_path}"
        if parsed.query:
            upstream_url = f"{upstream_url}?{parsed.query}"

        body = None
        if self.command == "POST":
            body = self.rfile.read(int(self.headers.get("Content-Length", "0")))

        headers = {}
        if content_type := self.headers.get("Content-Type"):
            headers["Content-Type"] = content_type

        request = urllib.request.Request(
            upstream_url,
            data=body,
            headers=headers,
            method=self.command,
        )

        try:
            with urllib.request.urlopen(request, timeout=30) as response:
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
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _write_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    parser = argparse.ArgumentParser(description="Flux Klein Web UI")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5173)
    parser.add_argument("--comfy-url", default="http://127.0.0.1:8188")
    args = parser.parse_args()

    WebUIHandler.comfy_url = args.comfy_url.rstrip("/")
    server = ThreadingHTTPServer((args.host, args.port), WebUIHandler)
    print(f"Web UI: http://{args.host}:{args.port}")
    print(f"ComfyUI: {WebUIHandler.comfy_url}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
