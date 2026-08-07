#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
INPUT_DIR="${1:-$PROJECT_DIR/user/default/workflows}"
OUTPUT_DIR="${2:-$PROJECT_DIR/user/default/workflows_api}"
COMFYUI_URL="${COMFYUI_URL:-https://127.0.0.1:8188}"
COMFYUI_CA_CERT="${COMFYUI_CA_CERT:-$PROJECT_DIR-certs/comfyui-local-ca.crt}"

if [[ ! -d "$INPUT_DIR" ]]; then
    echo "Workflow directory does not exist: $INPUT_DIR" >&2
    exit 1
fi

if [[ ! -f "$COMFYUI_CA_CERT" ]]; then
    echo "ComfyUI CA certificate does not exist: $COMFYUI_CA_CERT" >&2
    exit 1
fi

if ! command -v node >/dev/null; then
    echo "Node.js is required." >&2
    exit 1
fi

if [[ -n "${CHROME_BIN:-}" ]]; then
    chrome_bin="$CHROME_BIN"
else
    chrome_bin="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser || true)"
fi

if [[ -z "$chrome_bin" ]]; then
    echo "Google Chrome or Chromium is required. Set CHROME_BIN if it is installed in a non-standard location." >&2
    exit 1
fi

if ! curl --fail --silent --show-error \
    --cacert "$COMFYUI_CA_CERT" \
    "$COMFYUI_URL/system_stats" \
    >/dev/null; then
    echo "Cannot connect to ComfyUI at $COMFYUI_URL" >&2
    echo "Start it first with: $PROJECT_DIR/restart_comfyui_https.sh" >&2
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

node - "$chrome_bin" "$COMFYUI_URL" "$INPUT_DIR" "$OUTPUT_DIR" <<'NODE'
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const [chromeBin, comfyUrl, inputDir, outputDir] = process.argv.slice(2);
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "comfyui-workflow-export."));

class DevToolsPipe {
  constructor() {
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = Buffer.alloc(0);
    this.stderr = "";

    this.browser = spawn(chromeBin, [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--ignore-certificate-errors",
      `--user-data-dir=${profileDir}`,
      "--remote-debugging-pipe",
      "about:blank",
    ], {
      stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"],
    });

    this.writePipe = this.browser.stdio[3];
    this.readPipe = this.browser.stdio[4];
    this.readPipe.on("data", (data) => this.onData(data));
    this.browser.stderr.on("data", (data) => {
      this.stderr = (this.stderr + data.toString()).slice(-8000);
    });
    this.browser.on("exit", (code, signal) => {
      const error = new Error(`Chrome exited unexpectedly (${signal || code})\n${this.stderr}`);
      for (const { reject } of this.pending.values()) reject(error);
      this.pending.clear();
    });
  }

  onData(data) {
    this.buffer = Buffer.concat([this.buffer, data]);
    while (true) {
      const end = this.buffer.indexOf(0);
      if (end === -1) return;
      const message = this.buffer.subarray(0, end).toString();
      this.buffer = this.buffer.subarray(end + 1);
      if (!message) continue;

      const response = JSON.parse(message);
      if (!response.id) continue;
      const pending = this.pending.get(response.id);
      if (!pending) continue;
      this.pending.delete(response.id);
      if (response.error) pending.reject(new Error(response.error.message));
      else pending.resolve(response.result);
    }
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const message = { id, method, params };
    if (sessionId) message.sessionId = sessionId;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.writePipe.write(`${JSON.stringify(message)}\0`);
    });
  }

  async close() {
    try {
      await this.send("Browser.close");
    } catch {
      this.browser.kill("SIGTERM");
    }
  }
}

function findWorkflowFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...findWorkflowFiles(entryPath));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) files.push(entryPath);
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function expressionError(result) {
  if (!result.exceptionDetails) return null;
  const details = result.exceptionDetails;
  return details.exception?.description || details.text || "Unknown browser evaluation error";
}

async function evaluate(devtools, sessionId, expression) {
  const result = await devtools.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId);
  const error = expressionError(result);
  if (error) throw new Error(error);
  return result.result?.value;
}

async function waitForFrontend(devtools, sessionId, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await evaluate(devtools, sessionId, `Boolean(
      window.comfyAPI?.app?.app?.graphToPrompt &&
      window.comfyAPI?.app?.app?.loadGraphData &&
      window.comfyAPI?.app?.app?.rootGraph &&
      window.LiteGraph?.registered_node_types &&
      Object.keys(window.LiteGraph.registered_node_types).length
    )`);
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out while waiting for the ComfyUI frontend to initialize");
}

async function convertWorkflow(devtools, sessionId, workflowText) {
  const encodedWorkflow = JSON.stringify(workflowText);
  const promptText = await evaluate(devtools, sessionId, `(async () => {
    const workflow = JSON.parse(${encodedWorkflow});
    if (!Array.isArray(workflow.nodes) || !Array.isArray(workflow.links)) {
      throw new Error("Not a ComfyUI frontend workflow (nodes/links are missing)");
    }

    const app = window.comfyAPI.app.app;
    const registered = window.LiteGraph.registered_node_types;
    const subgraphTypes = new Set(
      (workflow.definitions?.subgraphs ?? []).map((subgraph) => subgraph.id)
    );
    const missing = [...new Set(workflow.nodes
      .map((node) => node.type)
      .filter((type) => !registered[type] && !subgraphTypes.has(type)))];
    if (missing.length) {
      throw new Error("Missing node types: " + missing.join(", "));
    }

    await app.loadGraphData(workflow);
    const result = await app.graphToPrompt();
    const output = result?.output;
    if (!output || typeof output !== "object" || Array.isArray(output)) {
      throw new Error("ComfyUI did not produce an API prompt");
    }
    return JSON.stringify(output);
  })()`);
  return JSON.parse(promptText);
}

async function main() {
  const files = findWorkflowFiles(inputDir);
  if (!files.length) throw new Error(`No JSON workflows found in ${inputDir}`);

  const devtools = new DevToolsPipe();
  let failures = 0;

  try {
    const { targetId } = await devtools.send("Target.createTarget", { url: comfyUrl });
    const { sessionId } = await devtools.send("Target.attachToTarget", { targetId, flatten: true });
    await devtools.send("Runtime.enable", {}, sessionId);
    await waitForFrontend(devtools, sessionId);

    for (const inputPath of files) {
      const relativePath = path.relative(inputDir, inputPath);
      const outputPath = path.join(outputDir, relativePath);

      try {
        const workflowText = fs.readFileSync(inputPath, "utf8");
        const prompt = await convertWorkflow(devtools, sessionId, workflowText);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        const temporaryPath = `${outputPath}.tmp-${process.pid}`;
        fs.writeFileSync(temporaryPath, `${JSON.stringify(prompt, null, 2)}\n`);
        fs.renameSync(temporaryPath, outputPath);
        console.log(`OK     ${relativePath}`);
      } catch (error) {
        failures++;
        console.error(`FAILED ${relativePath}`);
        console.error(`       ${error.message.split("\n")[0]}`);
      }
    }
  } finally {
    await devtools.close();
  }

  console.log(`\nExported ${files.length - failures}/${files.length} workflows to ${outputDir}`);
  if (failures) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    fs.rmSync(profileDir, { recursive: true, force: true });
  });
NODE
