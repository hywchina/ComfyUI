const COMFY_API = "/comfy";

const state = {
  workflows: [],
  nodeDefs: {},
  currentId: null,
  currentName: "",
  workflow: null,
  fields: [],
  specialInputs: [],
  showAdvanced: false,
  activePromptId: null,
  activeStartedAt: null,
  elapsedTimer: null,
  cancelRequested: false,
  liveInput: null,
  toastTimer: null,
};

const elements = {
  workflowSearch: document.querySelector("#workflowSearch"),
  workflowList: document.querySelector("#workflowList"),
  workflowCount: document.querySelector("#workflowCount"),
  workflowName: document.querySelector("#workflowName"),
  workflowMeta: document.querySelector("#workflowMeta"),
  parameterForm: document.querySelector("#parameterForm"),
  parameterGroups: document.querySelector("#parameterGroups"),
  emptyParameters: document.querySelector("#emptyParameters"),
  showAdvanced: document.querySelector("#showAdvanced"),
  resetButton: document.querySelector("#resetButton"),
  runButton: document.querySelector("#runButton"),
  runButtonText: document.querySelector("#runButtonText"),
  cancelButton: document.querySelector("#cancelButton"),
  retryButton: document.querySelector("#retryButton"),
  serverState: document.querySelector("#serverState"),
  serverStateText: document.querySelector("#serverStateText"),
  resultStage: document.querySelector("#resultStage"),
  emptyState: document.querySelector("#emptyState"),
  progressState: document.querySelector("#progressState"),
  errorState: document.querySelector("#errorState"),
  outputGrid: document.querySelector("#outputGrid"),
  progressLabel: document.querySelector("#progressLabel"),
  progressTitle: document.querySelector("#progressTitle"),
  progressDetail: document.querySelector("#progressDetail"),
  elapsedTime: document.querySelector("#elapsedTime"),
  queueState: document.querySelector("#queueState"),
  errorMessage: document.querySelector("#errorMessage"),
  jobId: document.querySelector("#jobId"),
  jobIdValue: document.querySelector("#jobIdValue"),
  resultSummary: document.querySelector("#resultSummary"),
  toast: document.querySelector("#toast"),
};

const basicInputNames = new Set([
  "text",
  "prompt",
  "positive",
  "negative",
  "negative_prompt",
  "image",
  "images",
  "mask",
  "audio",
  "video",
  "width",
  "height",
  "length",
  "batch_size",
  "seed",
  "noise_seed",
  "steps",
  "cfg",
  "guidance",
  "denoise",
  "strength",
  "upscale_by",
  "scale_by",
  "filename_prefix",
]);

const labelTranslations = {
  text: "文本 / 提示词",
  prompt: "提示词",
  positive: "正向提示词",
  negative: "负向提示词",
  negative_prompt: "负向提示词",
  image: "输入图片",
  images: "输入图片",
  mask: "遮罩",
  audio: "音频",
  video: "视频",
  width: "宽度",
  height: "高度",
  length: "长度 / 帧数",
  batch_size: "生成数量",
  seed: "随机种子",
  noise_seed: "随机种子",
  steps: "采样步数",
  cfg: "CFG 引导",
  guidance: "提示词引导",
  denoise: "降噪强度",
  strength: "强度",
  sampler_name: "采样器",
  scheduler: "调度器",
  filename_prefix: "文件名前缀",
  unet_name: "扩散模型",
  ckpt_name: "Checkpoint 模型",
  clip_name: "文本编码模型",
  vae_name: "VAE 模型",
  lora_name: "LoRA 模型",
};

function showToast(message) {
  clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  state.toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2800);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || `HTTP ${response.status}` };
  }

  if (!response.ok) {
    const message = data.error?.message || data.error || data.details || `请求失败（HTTP ${response.status}）`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return data;
}

function showResultView(view) {
  elements.emptyState.hidden = view !== "empty";
  elements.progressState.hidden = view !== "progress";
  elements.errorState.hidden = view !== "error";
  elements.outputGrid.hidden = view !== "outputs";
}

function setRunning(running) {
  elements.runButton.disabled = running || Boolean(state.liveInput) || !state.workflow;
  elements.runButtonText.textContent = running ? "任务执行中" : "运行工作流";
  elements.cancelButton.hidden = !running;
  elements.workflowList.classList.toggle("locked", running || Boolean(state.liveInput));
}

function formatElapsed(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function startElapsedTimer() {
  clearInterval(state.elapsedTimer);
  state.activeStartedAt = Date.now();
  elements.elapsedTime.textContent = "00:00";
  state.elapsedTimer = setInterval(() => {
    elements.elapsedTime.textContent = formatElapsed(Date.now() - state.activeStartedAt);
  }, 1000);
}

function stopElapsedTimer() {
  clearInterval(state.elapsedTimer);
  state.elapsedTimer = null;
}

function humanizeName(name) {
  if (labelTranslations[name]) return labelTranslations[name];
  return name
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function isConnection(value, workflow) {
  return Array.isArray(value)
    && value.length === 2
    && Object.hasOwn(workflow, String(value[0]))
    && Number.isInteger(value[1]);
}

function getInputDefinition(node, inputName) {
  const nodeDef = state.nodeDefs[node.class_type];
  if (!nodeDef?.input) return null;
  for (const section of ["required", "optional", "hidden"]) {
    const definition = nodeDef.input[section]?.[inputName];
    if (definition) return { definition, required: section === "required" };
  }
  return null;
}

function describeInput(nodeId, node, inputName, value) {
  const inputDef = getInputDefinition(node, inputName);
  const definition = inputDef?.definition;
  const declaredType = Array.isArray(definition) ? definition[0] : null;
  const options = Array.isArray(definition) && typeof definition[1] === "object" && !Array.isArray(definition[1])
    ? definition[1]
    : {};
  const choices = Array.isArray(declaredType)
    ? declaredType
    : declaredType === "COMFY_DYNAMICCOMBO_V3" && Array.isArray(options.options)
      ? options.options.map((option) => option.key)
      : null;
  const normalizedName = inputName.toLowerCase();
  const imageUpload = Boolean(options.image_upload)
    || (/loadimage/i.test(node.class_type) && normalizedName === "image");
  const semanticBasic = basicInputNames.has(normalizedName)
    || /prompt|image|mask|seed|width|height|steps|guidance|denoise|batch/.test(normalizedName)
    || /primitive(string|int|float)/i.test(node.class_type);

  return {
    nodeId,
    node,
    inputName,
    value,
    declaredType,
    options,
    choices,
    required: inputDef?.required ?? false,
    imageUpload,
    basic: semanticBasic,
  };
}

function randomSeed() {
  const parts = new Uint32Array(2);
  crypto.getRandomValues(parts);
  return String(parts[0] * 2097152 + (parts[1] & 2097151));
}

function parseStoredFile(value) {
  const match = String(value || "").match(/^(.*?)(?: \[(input|output|temp)\])?$/);
  const pathname = match?.[1] || "";
  const slash = pathname.lastIndexOf("/");
  return {
    filename: slash >= 0 ? pathname.slice(slash + 1) : pathname,
    subfolder: slash >= 0 ? pathname.slice(0, slash) : "",
    type: match?.[2] || "input",
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("无法加载图片"));
    image.src = source;
  });
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("无法生成蒙版图片"));
    }, "image/png");
  });
}

class ImageStudio {
  constructor({ source, title, mode = "annotate", onApply = null }) {
    this.source = source;
    this.title = title;
    this.mode = mode;
    this.onApply = onApply;
    this.paths = [];
    this.redoPaths = [];
    this.currentPath = null;
    this.tool = "brush";
    this.size = 28;
    this.opacity = 0.7;
    this.color = "#ff334f";
    this.zoom = 1;
  }

  async open() {
    this.image = await loadImage(this.source);
    this.dialog = document.createElement("dialog");
    this.dialog.className = "image-studio";

    const header = document.createElement("header");
    const heading = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = this.mode === "mask" ? "遮罩编辑器" : "图片查看与标注";
    const subtitle = document.createElement("span");
    subtitle.textContent = `${this.title} · ${this.image.naturalWidth} × ${this.image.naturalHeight}`;
    heading.append(title, subtitle);
    const closeButton = this.makeButton("关闭", "secondary-button", () => this.dialog.close());
    header.append(heading, closeButton);

    const toolbar = document.createElement("div");
    toolbar.className = "studio-toolbar";
    this.brushButton = this.makeButton("画笔", "tool-button active", () => this.setTool("brush"));
    this.eraserButton = this.makeButton("橡皮", "tool-button", () => this.setTool("eraser"));
    const undoButton = this.makeButton("撤销", "tool-button", () => {
      const path = this.paths.pop();
      if (path) this.redoPaths.push(path);
      this.render();
    });
    const redoButton = this.makeButton("重做", "tool-button", () => {
      const path = this.redoPaths.pop();
      if (path) this.paths.push(path);
      this.render();
    });
    const clearButton = this.makeButton("清除标注", "tool-button", () => {
      this.redoPaths.push(...this.paths.splice(0));
      this.render();
    });
    const zoomOut = this.makeButton("−", "tool-button", () => this.setZoom(this.zoom / 1.2));
    this.zoomLabel = document.createElement("span");
    this.zoomLabel.className = "studio-zoom-label";
    const zoomIn = this.makeButton("+", "tool-button", () => this.setZoom(this.zoom * 1.2));
    const fitButton = this.makeButton("适应窗口", "tool-button", () => this.fit());

    const colorLabel = document.createElement("label");
    colorLabel.textContent = "颜色";
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = this.color;
    colorInput.addEventListener("input", () => { this.color = colorInput.value; });
    colorLabel.append(colorInput);
    const sizeLabel = this.makeRange("粗细", 2, 160, this.size, 1, (value) => { this.size = value; });
    const opacityLabel = this.makeRange("不透明度", 0.1, 1, this.opacity, 0.05, (value) => { this.opacity = value; });
    toolbar.append(this.brushButton, this.eraserButton, undoButton, redoButton, clearButton, colorLabel, sizeLabel, opacityLabel, zoomOut, this.zoomLabel, zoomIn, fitButton);

    this.viewport = document.createElement("div");
    this.viewport.className = "studio-viewport";
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.image.naturalWidth;
    this.canvas.height = this.image.naturalHeight;
    this.canvas.className = "studio-canvas";
    this.viewport.append(this.canvas);
    this.bindCanvas();

    const footer = document.createElement("footer");
    const hint = document.createElement("span");
    hint.textContent = this.mode === "mask"
      ? "红色区域会作为透明遮罩提交；橡皮可移除遮罩。"
      : "滚轮缩放，使用画笔标注；原始图片不会被覆盖。";
    const action = this.makeButton(this.mode === "mask" ? "应用蒙版" : "下载标注图", "primary-button", () => this.save());
    footer.append(hint, action);
    this.dialog.append(header, toolbar, this.viewport, footer);
    document.body.append(this.dialog);
    this.dialog.addEventListener("close", () => this.dialog.remove(), { once: true });
    this.render();
    this.dialog.showModal();
    requestAnimationFrame(() => this.fit());
  }

  makeButton(text, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.addEventListener("click", handler);
    return button;
  }

  makeRange(text, min, max, value, step, handler) {
    const label = document.createElement("label");
    label.textContent = text;
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    const output = document.createElement("output");
    output.textContent = String(value);
    input.addEventListener("input", () => {
      output.textContent = input.value;
      handler(Number(input.value));
    });
    label.append(input, output);
    return label;
  }

  setTool(tool) {
    this.tool = tool;
    this.brushButton.classList.toggle("active", tool === "brush");
    this.eraserButton.classList.toggle("active", tool === "eraser");
  }

  setZoom(zoom) {
    this.zoom = Math.max(0.05, Math.min(8, zoom));
    this.canvas.style.width = `${this.canvas.width * this.zoom}px`;
    this.canvas.style.height = `${this.canvas.height * this.zoom}px`;
    this.zoomLabel.textContent = `${Math.round(this.zoom * 100)}%`;
  }

  fit() {
    const availableWidth = Math.max(1, this.viewport.clientWidth - 32);
    const availableHeight = Math.max(1, this.viewport.clientHeight - 32);
    this.setZoom(Math.min(1, availableWidth / this.canvas.width, availableHeight / this.canvas.height));
  }

  pointFromEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * this.canvas.width / rect.width,
      y: (event.clientY - rect.top) * this.canvas.height / rect.height,
    };
  }

  bindCanvas() {
    this.canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      this.setZoom(this.zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12));
    }, { passive: false });
    const finish = (event) => {
      if (!this.currentPath) return;
      this.currentPath.points.push(this.pointFromEvent(event));
      this.paths.push(this.currentPath);
      this.currentPath = null;
      this.redoPaths = [];
      this.render();
    };
    this.canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.canvas.setPointerCapture(event.pointerId);
      this.currentPath = {
        tool: this.tool,
        size: this.size,
        opacity: this.opacity,
        color: this.color,
        points: [this.pointFromEvent(event)],
      };
    });
    this.canvas.addEventListener("pointermove", (event) => {
      if (!this.currentPath) return;
      this.currentPath.points.push(this.pointFromEvent(event));
      this.render();
    });
    this.canvas.addEventListener("pointerup", finish);
    this.canvas.addEventListener("pointercancel", finish);
  }

  drawPaths(context, paths) {
    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    for (const path of paths) {
      if (!path.points.length) continue;
      context.globalCompositeOperation = path.tool === "eraser" ? "destination-out" : "source-over";
      context.globalAlpha = path.opacity;
      context.strokeStyle = path.color;
      context.lineWidth = path.size;
      context.beginPath();
      context.moveTo(path.points[0].x, path.points[0].y);
      for (const point of path.points.slice(1)) context.lineTo(point.x, point.y);
      if (path.points.length === 1) context.lineTo(path.points[0].x + 0.01, path.points[0].y);
      context.stroke();
    }
    context.restore();
  }

  overlayCanvas() {
    const overlay = document.createElement("canvas");
    overlay.width = this.canvas.width;
    overlay.height = this.canvas.height;
    this.drawPaths(overlay.getContext("2d"), [...this.paths, ...(this.currentPath ? [this.currentPath] : [])]);
    return overlay;
  }

  render() {
    const context = this.canvas.getContext("2d");
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.drawImage(this.image, 0, 0);
    const overlay = this.overlayCanvas();
    if (this.mode === "mask") {
      context.save();
      context.globalAlpha = 0.7;
      context.drawImage(overlay, 0, 0);
      context.restore();
    } else {
      context.drawImage(overlay, 0, 0);
    }
  }

  async exportCanvas() {
    const output = document.createElement("canvas");
    output.width = this.canvas.width;
    output.height = this.canvas.height;
    const context = output.getContext("2d");
    context.drawImage(this.image, 0, 0);
    const overlay = this.overlayCanvas();
    if (this.mode === "annotate") {
      context.drawImage(overlay, 0, 0);
      return output;
    }
    context.globalCompositeOperation = "destination-out";
    context.drawImage(overlay, 0, 0);
    return output;
  }

  async save() {
    const output = await this.exportCanvas();
    const blob = await canvasBlob(output);
    if (this.onApply) {
      await this.onApply(blob, output.toDataURL("image/png"));
      this.dialog.close();
      return;
    }
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${this.title.replace(/\.[^.]+$/, "")}-annotated.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
}

class ImageInputEditor {
  constructor(field) {
    this.field = field;
    this.file = null;
    this.editedFile = null;
    this.image = null;
    this.element = document.createElement("div");
    this.element.className = "image-input-editor";

    this.fileInput = document.createElement("input");
    this.fileInput.type = "file";
    this.fileInput.accept = "image/*";
    this.fileInput.className = "file-input";

    this.preview = document.createElement("img");
    this.preview.className = "input-image-preview";
    this.preview.alt = "输入图片预览";

    const previewFrame = document.createElement("div");
    previewFrame.className = "input-preview-frame";
    previewFrame.append(this.preview);

    const toolbar = document.createElement("div");
    toolbar.className = "editor-toolbar";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "secondary-button";
    editButton.textContent = "打开遮罩编辑器";
    toolbar.append(editButton);
    this.element.append(this.fileInput, previewFrame, toolbar);

    this.fileInput.addEventListener("change", async () => {
      const file = this.fileInput.files?.[0];
      if (!file) return;
      this.file = file;
      this.editedFile = null;
      await this.setImage(await readFileAsDataUrl(file));
    });
    editButton.addEventListener("click", () => {
      if (!this.image) {
        showToast("请先选择一张图片");
        return;
      }
      new ImageStudio({
        source: this.preview.src,
        title: this.file?.name || parseStoredFile(this.field.value).filename || "input-image",
        mode: "mask",
        onApply: async (blob, previewUrl) => {
          const baseName = (this.file?.name || parseStoredFile(this.field.value).filename || "masked-image").replace(/\.[^.]+$/, "");
          this.editedFile = new File([blob], `${baseName}-mask.png`, { type: "image/png" });
          await this.setImage(previewUrl);
          showToast("蒙版已应用，运行工作流时会自动上传");
        },
      }).open();
    });
    this.loadStoredPreview();
  }

  async loadStoredPreview() {
    const stored = parseStoredFile(this.field.value);
    if (!stored.filename) return;
    const url = fileUrl(stored);
    try {
      await this.setImage(url);
    } catch {
      this.preview.hidden = true;
    }
  }

  async setImage(source) {
    this.image = await loadImage(source);
    this.preview.src = source;
    this.preview.hidden = false;
  }

  async value() {
    return this.editedFile || this.file || this.field.value;
  }
}

function parseBrushData(value) {
  if (!value || typeof value !== "string") return [];
  return value.split("|").flatMap((stroke) => {
    const parts = stroke.split(":");
    if (parts.length < 6) return [];
    const [mode, type, size, opacity, color] = parts;
    let marker = null;
    let pointsIndex = 5;
    if (/^[1-6]$/.test(parts[5]) && parts.length >= 7) {
      marker = parts[5];
      pointsIndex = 6;
    }
    const points = parts.slice(pointsIndex).join(":").split(";").flatMap((point) => {
      const [x, y] = point.split(",").map(Number);
      return Number.isFinite(x) && Number.isFinite(y) ? [{ x, y }] : [];
    });
    return points.length ? [{ mode, type, size: Number(size), opacity: Number(opacity), color, marker, points }] : [];
  });
}

class EasyMarkEditor {
  constructor(nodeId, node) {
    this.nodeId = nodeId;
    this.node = node;
    this.image = null;
    this.imageDataUrl = String(node.inputs.image_base64 || "");
    this.paths = parseBrushData(node.inputs.brush_data);
    this.currentPath = null;
    this.tool = "free";
    this.color = "255,0,0";
    this.marker = null;
    this.size = Number(node.inputs.brush_size || 4);
    this.opacity = 1;
    this.element = document.createElement("div");
    this.element.className = "easy-mark-editor";
    this.build();
  }

  build() {
    const toolbar = document.createElement("div");
    toolbar.className = "mark-toolbar";
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.className = "file-input";
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      this.imageDataUrl = await readFileAsDataUrl(file);
      this.image = await loadImage(this.imageDataUrl);
      this.paths = [];
      this.resizeCanvas();
      this.render();
    });

    const tools = document.createElement("div");
    tools.className = "tool-buttons";
    for (const [value, label] of [["free", "画笔"], ["box", "方框"], ["square", "色块"], ["erase", "橡皮"]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.className = "tool-button";
      button.classList.toggle("active", value === this.tool);
      button.addEventListener("click", () => {
        this.tool = value;
        this.marker = null;
        [...tools.children].forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
      });
      tools.append(button);
    }

    const colors = document.createElement("div");
    colors.className = "color-buttons";
    for (const color of ["0,0,0", "255,255,255", "255,0,0", "0,255,0", "0,0,255", "128,128,128"]) {
      const button = document.createElement("button");
      button.type = "button";
      button.title = color;
      button.style.background = `rgb(${color})`;
      button.classList.toggle("active", color === this.color);
      button.addEventListener("click", () => {
        this.color = color;
        this.marker = null;
        [...colors.children].forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
      });
      colors.append(button);
    }

    const markers = document.createElement("div");
    markers.className = "marker-buttons";
    for (const marker of ["1", "2", "3", "4", "5", "6"]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = marker;
      button.addEventListener("click", () => {
        this.marker = marker;
        this.tool = "square";
        [...markers.children].forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
      });
      markers.append(button);
    }

    const settings = document.createElement("div");
    settings.className = "mark-settings";
    const size = document.createElement("input");
    size.type = "range";
    size.min = "1";
    size.max = "100";
    size.value = String(this.size);
    size.addEventListener("input", () => { this.size = Number(size.value); });
    const undo = document.createElement("button");
    undo.type = "button";
    undo.textContent = "撤销";
    undo.addEventListener("click", () => { this.paths.pop(); this.render(); });
    const clear = document.createElement("button");
    clear.type = "button";
    clear.textContent = "清空";
    clear.addEventListener("click", () => { this.paths = []; this.render(); });
    settings.append("画笔大小", size, undo, clear);

    this.canvas = document.createElement("canvas");
    this.canvas.className = "annotation-canvas easy-mark-canvas";
    this.canvas.width = 1024;
    this.canvas.height = 768;
    this.bindCanvas();

    const guide = document.createElement("p");
    guide.className = "editor-guide";
    guide.textContent = "支持自由画笔、矩形框、色块、六种颜色和 1–6 编号标记。";
    toolbar.append(fileInput, tools, colors, markers, settings);
    this.element.append(toolbar, this.canvas, guide);

    if (this.imageDataUrl.startsWith("data:image/")) {
      loadImage(this.imageDataUrl).then((image) => {
        this.image = image;
        this.resizeCanvas();
        this.render();
      }).catch(() => {});
    } else {
      this.render();
    }
  }

  resizeCanvas() {
    if (!this.image) return;
    this.canvas.width = this.image.naturalWidth;
    this.canvas.height = this.image.naturalHeight;
  }

  point(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * this.canvas.width / rect.width,
      y: (event.clientY - rect.top) * this.canvas.height / rect.height,
    };
  }

  bindCanvas() {
    this.canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.canvas.setPointerCapture(event.pointerId);
      this.currentPath = {
        mode: this.tool === "erase" ? "erase" : "brush",
        type: this.tool === "erase" ? "free" : this.tool,
        size: this.size,
        opacity: this.opacity,
        color: this.color,
        marker: this.marker,
        points: [this.point(event)],
      };
    });
    this.canvas.addEventListener("pointermove", (event) => {
      if (!this.currentPath) return;
      const point = this.point(event);
      if (this.currentPath.type === "free") this.currentPath.points.push(point);
      else this.currentPath.points[1] = point;
      this.render();
    });
    const finish = (event) => {
      if (!this.currentPath) return;
      const point = this.point(event);
      if (this.currentPath.type === "free") this.currentPath.points.push(point);
      else this.currentPath.points[1] = point;
      this.paths.push(this.currentPath);
      this.currentPath = null;
      this.render();
    };
    this.canvas.addEventListener("pointerup", finish);
    this.canvas.addEventListener("pointercancel", finish);
  }

  drawAnnotation(context, path) {
    if (!path.points.length) return;
    const first = path.points[0];
    const last = path.points[path.points.length - 1];
    context.save();
    context.globalAlpha = path.opacity;
    if (path.mode === "erase") context.globalCompositeOperation = "destination-out";
    context.strokeStyle = `rgb(${path.color})`;
    context.fillStyle = path.marker ? "#ffe34d" : `rgb(${path.color})`;
    context.lineWidth = path.size;
    context.lineCap = "round";
    context.lineJoin = "round";
    if (path.type === "free") {
      context.beginPath();
      context.moveTo(first.x, first.y);
      for (const point of path.points.slice(1)) context.lineTo(point.x, point.y);
      context.stroke();
    } else {
      const x = Math.min(first.x, last.x);
      const y = Math.min(first.y, last.y);
      const width = Math.abs(last.x - first.x);
      const height = Math.abs(last.y - first.y);
      if (path.type === "box") context.strokeRect(x, y, width, height);
      else context.fillRect(x, y, width, height);
      if (path.marker) {
        context.globalAlpha = 1;
        context.fillStyle = "#111";
        context.font = `700 ${Math.max(14, Math.min(width, height) * 0.55)}px sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(path.marker, x + width / 2, y + height / 2);
      }
    }
    context.restore();
  }

  render() {
    const context = this.canvas.getContext("2d");
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.image) context.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);
    else {
      context.fillStyle = "#17191f";
      context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    const overlay = document.createElement("canvas");
    overlay.width = this.canvas.width;
    overlay.height = this.canvas.height;
    const overlayContext = overlay.getContext("2d");
    for (const path of [...this.paths, ...(this.currentPath ? [this.currentPath] : [])]) {
      this.drawAnnotation(overlayContext, path);
    }
    context.drawImage(overlay, 0, 0);
  }

  serialize() {
    return this.paths.map((path) => {
      const marker = path.marker ? `:${path.marker}` : "";
      const points = path.points.map((point) => `${point.x},${point.y}`).join(";");
      return `${path.mode}:${path.type}:${path.size}:${path.opacity}:${path.color}${marker}:${points}`;
    }).join("|");
  }

  async apply(workflow) {
    if (!this.imageDataUrl.startsWith("data:image/")) throw new Error("打标工具需要先加载一张图片");
    workflow[this.nodeId].inputs.image_base64 = this.imageDataUrl;
    workflow[this.nodeId].inputs.brush_data = this.serialize();
    workflow[this.nodeId].inputs.brush_size = this.size;
  }
}

class ScreenCaptureEditor {
  constructor(nodeId, node) {
    this.nodeId = nodeId;
    this.node = node;
    this.stream = null;
    this.crop = null;
    this.live = false;
    this.pendingFrame = null;
    this.previousFrame = null;
    this.fallbackImage = String(node.inputs.image_base64 || "");
    this.element = document.createElement("div");
    this.element.className = "screen-capture-editor";
    this.build();
  }

  build() {
    const actions = document.createElement("div");
    actions.className = "capture-actions";
    const screenButton = document.createElement("button");
    screenButton.type = "button";
    screenButton.className = "secondary-button";
    screenButton.textContent = "共享屏幕";
    const cameraButton = document.createElement("button");
    cameraButton.type = "button";
    cameraButton.className = "secondary-button";
    cameraButton.textContent = "打开摄像头";
    const areaButton = document.createElement("button");
    areaButton.type = "button";
    areaButton.className = "secondary-button";
    areaButton.textContent = "设置捕获区域";
    this.liveButton = document.createElement("button");
    this.liveButton.type = "button";
    this.liveButton.className = "secondary-button live-button";
    this.liveButton.textContent = "实时运行";
    const stopButton = document.createElement("button");
    stopButton.type = "button";
    stopButton.className = "small-button danger";
    stopButton.textContent = "停止捕获";
    actions.append(screenButton, cameraButton, areaButton, this.liveButton, stopButton);

    this.video = document.createElement("video");
    this.video.className = "capture-preview";
    this.video.autoplay = true;
    this.video.muted = true;
    this.video.playsInline = true;
    if (this.fallbackImage.startsWith("data:image/")) this.video.poster = this.fallbackImage;
    const previewFrame = document.createElement("div");
    previewFrame.className = "capture-preview-frame";
    this.previewFrame = previewFrame;
    previewFrame.append(this.video);

    const fields = document.createElement("div");
    fields.className = "capture-fields";
    this.prompt = this.makeField("提示词", "textarea", this.node.inputs.prompt ?? "");
    this.slide = this.makeField("降噪强度", "number", this.node.inputs.slide ?? 0.5, { min: 0, max: 1, step: 0.01 });
    this.seed = this.makeField("随机种子", "number", this.node.inputs.seed ?? 0, { min: 0, step: 1 });
    this.refreshRate = this.makeField("捕获间隔（毫秒）", "number", this.node.inputs.refresh_rate ?? 500, { min: 50, step: 50 });
    fields.append(this.prompt.wrapper, this.slide.wrapper, this.seed.wrapper, this.refreshRate.wrapper);

    const note = document.createElement("p");
    note.className = "editor-guide";
    this.note = note;
    note.textContent = window.isSecureContext
      ? "可选择捕获区域；实时运行会在画面变化后串行提交任务。"
      : "屏幕捕获需要 HTTPS 或 localhost，请使用安全地址打开本页面。";

    screenButton.addEventListener("click", () => this.start("screen"));
    cameraButton.addEventListener("click", () => this.start("camera"));
    areaButton.addEventListener("click", () => this.openAreaPicker());
    this.liveButton.addEventListener("click", () => this.toggleLive());
    stopButton.addEventListener("click", () => this.stop());
    this.video.addEventListener("loadedmetadata", () => {
      this.restoreCrop();
      this.updateAreaPreview();
    });
    this.element.append(actions, previewFrame, fields, note);
  }

  makeField(labelText, type, value, options = {}) {
    const wrapper = document.createElement("label");
    wrapper.className = "capture-field";
    const label = document.createElement("span");
    label.textContent = labelText;
    const input = document.createElement(type === "textarea" ? "textarea" : "input");
    if (input instanceof HTMLInputElement) input.type = type;
    else input.rows = 3;
    input.value = String(value);
    for (const [key, optionValue] of Object.entries(options)) input[key] = String(optionValue);
    wrapper.append(label, input);
    return { wrapper, input };
  }

  async start(kind) {
    if (!navigator.mediaDevices) {
      showToast("当前浏览器不支持媒体捕获");
      return;
    }
    try {
      this.stop();
      this.stream = kind === "screen"
        ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
        : await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      this.video.srcObject = this.stream;
      await this.video.play();
      this.stream.getVideoTracks()[0]?.addEventListener("ended", () => this.stop());
    } catch (error) {
      showToast(error.name === "NotAllowedError" ? "已取消媒体授权" : `无法开始捕获：${error.message}`);
    }
  }

  stop() {
    this.stopLive();
    for (const track of this.stream?.getTracks() || []) track.stop();
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    this.resetAreaPreview();
  }

  cropStorageKey() {
    return `workflow-studio-screen-area-${this.nodeId}`;
  }

  restoreCrop() {
    try {
      const crop = JSON.parse(localStorage.getItem(this.cropStorageKey()));
      if (crop?.sourceWidth === this.video.videoWidth && crop?.sourceHeight === this.video.videoHeight) {
        this.crop = crop;
      } else {
        this.crop = null;
      }
    } catch {
      this.crop = null;
    }
  }

  resetAreaPreview() {
    if (!this.previewFrame || !this.video) return;
    this.previewFrame.classList.remove("cropped");
    this.previewFrame.style.aspectRatio = "";
    this.video.style.width = "";
    this.video.style.maxWidth = "";
    this.video.style.maxHeight = "";
    this.video.style.transform = "";
    this.video.style.transformOrigin = "";
  }

  updateAreaPreview() {
    if (!this.crop || !this.video.videoWidth || !this.video.videoHeight) {
      this.resetAreaPreview();
      return;
    }
    this.previewFrame.classList.add("cropped");
    this.previewFrame.style.aspectRatio = `${this.crop.width} / ${this.crop.height}`;
    this.video.style.width = `${this.video.videoWidth / this.crop.width * 100}%`;
    this.video.style.maxWidth = "none";
    this.video.style.maxHeight = "none";
    this.video.style.transformOrigin = "top left";
    this.video.style.transform = `translate(${-this.crop.x / this.video.videoWidth * 100}%, ${-this.crop.y / this.video.videoHeight * 100}%)`;
    this.note.textContent = `当前捕获区域：${this.crop.width} × ${this.crop.height}；实时运行只提交这个区域。`;
  }

  openAreaPicker() {
    if (!this.stream || !this.video.videoWidth) {
      showToast("请先共享屏幕或打开摄像头");
      return;
    }

    const dialog = document.createElement("dialog");
    dialog.className = "area-dialog";
    const heading = document.createElement("h3");
    heading.textContent = "设置捕获区域";
    const guide = document.createElement("p");
    guide.textContent = "在画面上拖动选框，然后确认。";
    const canvas = document.createElement("canvas");
    canvas.width = this.video.videoWidth;
    canvas.height = this.video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(this.video, 0, 0);
    const snapshot = context.getImageData(0, 0, canvas.width, canvas.height);
    let draft = this.crop ? { ...this.crop } : { x: 0, y: 0, width: canvas.width, height: canvas.height };
    let start = null;

    const draw = () => {
      context.putImageData(snapshot, 0, 0);
      context.fillStyle = "rgba(8, 10, 16, .58)";
      context.beginPath();
      context.rect(0, 0, canvas.width, canvas.height);
      context.rect(draft.x, draft.y, draft.width, draft.height);
      context.fill("evenodd");
      context.strokeStyle = "#ffcf48";
      context.lineWidth = Math.max(2, canvas.width / 500);
      context.setLineDash([10, 7]);
      context.strokeRect(draft.x, draft.y, draft.width, draft.height);
    };
    const point = (event) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(canvas.width, (event.clientX - rect.left) * canvas.width / rect.width)),
        y: Math.max(0, Math.min(canvas.height, (event.clientY - rect.top) * canvas.height / rect.height)),
      };
    };
    canvas.addEventListener("pointerdown", (event) => {
      start = point(event);
      draft = { x: start.x, y: start.y, width: 0, height: 0 };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!start) return;
      const end = point(event);
      draft = {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y),
      };
      draw();
    });
    canvas.addEventListener("pointerup", () => { start = null; });

    const buttons = document.createElement("div");
    buttons.className = "area-dialog-actions";
    const fullButton = document.createElement("button");
    fullButton.type = "button";
    fullButton.className = "secondary-button";
    fullButton.textContent = "使用完整画面";
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "secondary-button";
    cancelButton.textContent = "取消";
    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = "primary-button";
    confirmButton.textContent = "使用所选区域";
    fullButton.addEventListener("click", () => {
      this.crop = null;
      localStorage.removeItem(this.cropStorageKey());
      this.note.textContent = "当前使用完整画面；实时运行会在画面变化后串行提交任务。";
      this.updateAreaPreview();
      dialog.close();
    });
    cancelButton.addEventListener("click", () => dialog.close());
    confirmButton.addEventListener("click", () => {
      if (draft.width < 2 || draft.height < 2) {
        showToast("捕获区域太小，请重新拖动选框");
        return;
      }
      this.crop = {
        x: Math.round(draft.x),
        y: Math.round(draft.y),
        width: Math.round(draft.width),
        height: Math.round(draft.height),
        sourceWidth: canvas.width,
        sourceHeight: canvas.height,
      };
      localStorage.setItem(this.cropStorageKey(), JSON.stringify(this.crop));
      this.updateAreaPreview();
      dialog.close();
    });
    dialog.addEventListener("close", () => dialog.remove());
    buttons.append(fullButton, cancelButton, confirmButton);
    dialog.append(heading, guide, canvas, buttons);
    document.body.append(dialog);
    draw();
    dialog.showModal();
  }

  captureFrame() {
    if (!this.stream || !this.video.videoWidth) {
      if (this.fallbackImage.startsWith("data:image/")) return this.fallbackImage;
      throw new Error("屏幕捕获工作流需要先共享屏幕或打开摄像头");
    }
    const crop = this.crop || {
      x: 0,
      y: 0,
      width: this.video.videoWidth,
      height: this.video.videoHeight,
    };
    const canvas = document.createElement("canvas");
    canvas.width = crop.width;
    canvas.height = crop.height;
    canvas.getContext("2d").drawImage(
      this.video,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height,
    );
    return canvas.toDataURL("image/png");
  }

  async frameChanged(previous, current) {
    if (!previous) return true;
    const [previousImage, currentImage] = await Promise.all([loadImage(previous), loadImage(current)]);
    if (previousImage.naturalWidth !== currentImage.naturalWidth || previousImage.naturalHeight !== currentImage.naturalHeight) return true;
    const canvas = document.createElement("canvas");
    canvas.width = 48;
    canvas.height = 48;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(previousImage, 0, 0, canvas.width, canvas.height);
    const before = context.getImageData(0, 0, canvas.width, canvas.height).data;
    context.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
    const after = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let difference = 0;
    for (let index = 0; index < before.length; index += 4) {
      difference += Math.abs(before[index] - after[index]);
      difference += Math.abs(before[index + 1] - after[index + 1]);
      difference += Math.abs(before[index + 2] - after[index + 2]);
    }
    return difference / (canvas.width * canvas.height) > 1;
  }

  async toggleLive() {
    if (this.live) {
      const hasActivePrompt = Boolean(state.activePromptId);
      this.stopLive();
      if (hasActivePrompt) await cancelGeneration();
      return;
    }
    if (!this.stream || !this.video.videoWidth) {
      showToast("请先共享屏幕或打开摄像头");
      return;
    }
    if (state.liveInput && state.liveInput !== this) state.liveInput.stopLive();
    this.live = true;
    state.liveInput = this;
    this.liveButton.textContent = "停止实时运行";
    this.liveButton.classList.add("active");
    this.note.textContent = "实时运行中：画面变化时提交，上一任务完成后才会继续。";
    setRunning(false);
    this.runLive();
  }

  stopLive() {
    this.live = false;
    this.pendingFrame = null;
    this.previousFrame = null;
    if (state.liveInput === this) state.liveInput = null;
    if (this.liveButton) {
      this.liveButton.textContent = "实时运行";
      this.liveButton.classList.remove("active");
    }
    setRunning(Boolean(state.activePromptId));
  }

  async runLive() {
    while (this.live) {
      try {
        const frame = this.captureFrame();
        if (await this.frameChanged(this.previousFrame, frame)) {
          this.previousFrame = frame;
          this.pendingFrame = frame;
          const succeeded = await generate();
          this.pendingFrame = null;
          if (!succeeded) {
            this.stopLive();
            return;
          }
        }
      } catch (error) {
        this.stopLive();
        showToast(error.message);
        return;
      }
      const refreshRate = Math.max(50, Number(this.refreshRate.input.value) || 500);
      await new Promise((resolve) => setTimeout(resolve, refreshRate));
    }
  }

  async apply(workflow) {
    const inputs = workflow[this.nodeId].inputs;
    inputs.image_base64 = this.pendingFrame || this.captureFrame();
    inputs.prompt = this.prompt.input.value;
    inputs.slide = Number(this.slide.input.value);
    inputs.seed = Number(this.seed.input.value);
    inputs.refresh_rate = Number(this.refreshRate.input.value);
  }

  dispose() {
    this.stop();
  }
}

function createSelect(field) {
  const select = document.createElement("select");
  const values = [...field.choices];
  if (!values.some((value) => String(value) === String(field.value))) values.unshift(field.value);
  for (const value of values) {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = String(value);
    option.selected = String(value) === String(field.value);
    select.append(option);
  }
  return select;
}

function createInputControl(field) {
  let control;
  const type = typeof field.declaredType === "string" ? field.declaredType.toUpperCase() : "";
  const value = field.value;

  if (field.imageUpload) {
    control = document.createElement("input");
    control.type = "file";
    control.accept = "image/*";
    control.dataset.originalValue = String(value ?? "");
  } else if (field.choices?.length) {
    control = createSelect(field);
  } else if (type === "BOOLEAN" || typeof value === "boolean") {
    const wrapper = document.createElement("label");
    wrapper.className = "switch-control";
    control = document.createElement("input");
    control.type = "checkbox";
    control.checked = Boolean(value);
    const track = document.createElement("span");
    track.textContent = control.checked ? "开启" : "关闭";
    control.addEventListener("change", () => {
      track.textContent = control.checked ? "开启" : "关闭";
    });
    wrapper.append(control, track);
    wrapper._input = control;
    return wrapper;
  } else if (type === "INT" || type === "FLOAT" || typeof value === "number") {
    control = document.createElement("input");
    control.type = "number";
    control.value = String(value ?? field.options.default ?? 0);
    if (Number.isFinite(field.options.min)) control.min = String(field.options.min);
    if (Number.isFinite(field.options.max)) control.max = String(field.options.max);
    if (Number.isFinite(field.options.step)) control.step = String(field.options.step);
    else control.step = type === "INT" ? "1" : "any";
  } else if (type === "STRING" || typeof value === "string") {
    const multiline = field.options.multiline
      || /text|prompt|description|instruction/i.test(field.inputName)
      || String(value).length > 90;
    control = document.createElement(multiline ? "textarea" : "input");
    if (control instanceof HTMLInputElement) control.type = "text";
    else control.rows = 4;
    control.value = String(value ?? "");
  } else {
    control = document.createElement("textarea");
    control.rows = 3;
    control.className = "json-input";
    control.value = JSON.stringify(value, null, 2);
    control.dataset.json = "true";
  }

  return control;
}

function createField(field, index) {
  const wrapper = document.createElement("div");
  wrapper.className = "parameter-field";
  wrapper.dataset.advanced = String(!field.basic);

  const label = document.createElement("label");
  const controlId = `field-${field.nodeId}-${index}`;
  label.htmlFor = controlId;
  label.textContent = humanizeName(field.inputName);

  const key = document.createElement("code");
  key.textContent = field.inputName;
  label.append(key);

  const editor = field.imageUpload ? new ImageInputEditor(field) : null;
  const control = editor?.element || createInputControl(field);
  const input = editor?.fileInput || control._input || control;
  input.id = controlId;

  const row = document.createElement("div");
  row.className = "control-row";
  row.append(control);

  if (/seed/i.test(field.inputName) && input instanceof HTMLInputElement && input.type === "number") {
    const randomButton = document.createElement("button");
    randomButton.type = "button";
    randomButton.className = "mini-button";
    randomButton.textContent = "随机";
    randomButton.addEventListener("click", () => {
      input.value = randomSeed();
    });
    row.append(randomButton);
  }

  if (field.options.tooltip) {
    const hint = document.createElement("p");
    hint.className = "field-help";
    hint.textContent = field.options.tooltip;
    wrapper.append(label, row, hint);
  } else {
    wrapper.append(label, row);
  }

  state.fields.push({ ...field, input, editor });
  return wrapper;
}

function renderParameters() {
  for (const input of state.specialInputs) input.dispose?.();
  elements.parameterGroups.replaceChildren();
  state.fields = [];
  state.specialInputs = [];

  if (!state.workflow) {
    elements.emptyParameters.hidden = false;
    elements.parameterGroups.hidden = true;
    setRunning(false);
    return;
  }

  elements.emptyParameters.hidden = true;
  elements.parameterGroups.hidden = false;
  const groups = [];
  let basicCount = 0;

  for (const [nodeId, node] of Object.entries(state.workflow)) {
    if (node.class_type === "IO_EasyMark") {
      groups.push({ nodeId, node, fields: [], special: "easy-mark" });
      basicCount++;
      continue;
    }
    if (node.class_type === "ScreenShare") {
      groups.push({ nodeId, node, fields: [], special: "screen-capture" });
      basicCount++;
      continue;
    }
    const fields = Object.entries(node.inputs)
      .filter(([, value]) => !isConnection(value, state.workflow))
      .map(([inputName, value]) => describeInput(nodeId, node, inputName, value));
    if (!fields.length) continue;
    basicCount += fields.filter((field) => field.basic).length;
    groups.push({ nodeId, node, fields });
  }

  if (!basicCount) {
    for (const group of groups) {
      for (const field of group.fields) field.basic = true;
    }
  }

  for (const group of groups) {
    const section = document.createElement("details");
    section.className = "node-group";
    section.dataset.special = String(Boolean(group.special));
    section.open = Boolean(group.special) || group.fields.some((field) => field.basic);

    const summary = document.createElement("summary");
    const title = document.createElement("span");
    title.textContent = group.node._meta?.title || state.nodeDefs[group.node.class_type]?.display_name || group.node.class_type;
    const meta = document.createElement("span");
    meta.className = "node-meta";
    meta.textContent = `#${group.nodeId} · ${group.node.class_type}`;
    summary.append(title, meta);

    const body = document.createElement("div");
    body.className = "node-fields";
    if (group.special === "easy-mark") {
      const editor = new EasyMarkEditor(group.nodeId, group.node);
      state.specialInputs.push(editor);
      body.append(editor.element);
    } else if (group.special === "screen-capture") {
      const editor = new ScreenCaptureEditor(group.nodeId, group.node);
      state.specialInputs.push(editor);
      body.append(editor.element);
    } else {
      group.fields.forEach((field, index) => body.append(createField(field, index)));
    }
    section.append(summary, body);
    elements.parameterGroups.append(section);
  }

  applyAdvancedVisibility();
  setRunning(false);
}

function applyAdvancedVisibility() {
  elements.parameterGroups.classList.toggle("show-advanced", state.showAdvanced);
  for (const group of elements.parameterGroups.querySelectorAll(".node-group")) {
    if (group.dataset.special === "true") {
      group.hidden = false;
      continue;
    }
    const visibleFields = [...group.querySelectorAll(".parameter-field")]
      .filter((field) => state.showAdvanced || field.dataset.advanced !== "true");
    group.hidden = visibleFields.length === 0;
  }
}

function renderWorkflowList() {
  const query = elements.workflowSearch.value.trim().toLowerCase();
  const filtered = state.workflows.filter((workflow) => workflow.name.toLowerCase().includes(query));
  elements.workflowList.replaceChildren();
  elements.workflowCount.textContent = String(state.workflows.length);

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "list-empty";
    empty.textContent = query ? "没有匹配的工作流" : "尚未发现 API 工作流";
    elements.workflowList.append(empty);
    return;
  }

  for (const workflow of filtered) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "workflow-item";
    button.classList.toggle("active", workflow.id === state.currentId);

    const name = document.createElement("strong");
    name.textContent = workflow.name;
    const meta = document.createElement("span");
    meta.textContent = `${workflow.node_count} 节点 · ${workflow.editable_count} 参数`;
    button.append(name, meta);
    button.addEventListener("click", () => selectWorkflow(workflow.id));
    elements.workflowList.append(button);
  }
}

async function selectWorkflow(workflowId, force = false) {
  if (state.activePromptId && !force) {
    showToast("当前任务执行中，完成或取消后再切换工作流");
    return;
  }
  if (workflowId === state.currentId && state.workflow) return;

  elements.workflowName.textContent = "正在加载工作流";
  elements.workflowMeta.textContent = "读取节点与参数…";
  elements.parameterGroups.hidden = true;
  elements.emptyParameters.hidden = false;
  elements.emptyParameters.textContent = "正在生成参数面板…";

  try {
    const data = await requestJson(`/api/workflow?id=${encodeURIComponent(workflowId)}`);
    state.currentId = workflowId;
    state.currentName = data.name;
    state.workflow = data.workflow;
    const catalogItem = state.workflows.find((item) => item.id === workflowId);
    elements.workflowName.textContent = data.name;
    elements.workflowMeta.textContent = catalogItem
      ? `${catalogItem.node_count} 个节点 · 参数由工作流自动生成`
      : "参数由工作流自动生成";
    renderWorkflowList();
    renderParameters();
    showResultView("empty");
    elements.resultSummary.textContent = "等待运行";
  } catch (error) {
    state.workflow = null;
    elements.workflowName.textContent = "工作流加载失败";
    elements.workflowMeta.textContent = error.message;
    elements.emptyParameters.textContent = error.message;
    setRunning(false);
  }
}

async function loadCatalog() {
  const data = await requestJson("/api/workflows");
  state.workflows = data.workflows || [];
  renderWorkflowList();
  if (data.invalid?.length) showToast(`${data.invalid.length} 个无效工作流已跳过`);
  if (state.workflows.length) await selectWorkflow(state.workflows[0].id, true);
}

async function loadNodeDefinitions() {
  state.nodeDefs = await requestJson(`${COMFY_API}/object_info`);
}

async function checkServer() {
  try {
    await requestJson(`${COMFY_API}/system_stats`);
    elements.serverState.className = "server-state online";
    elements.serverStateText.textContent = "ComfyUI 已连接";
  } catch {
    elements.serverState.className = "server-state offline";
    elements.serverStateText.textContent = "ComfyUI 未连接";
  }
}

function cloneWorkflow() {
  return structuredClone(state.workflow);
}

async function uploadImage(file) {
  const form = new FormData();
  form.append("image", file, file.name);
  form.append("type", "input");
  form.append("overwrite", "true");
  const result = await requestJson(`${COMFY_API}/upload/image`, {
    method: "POST",
    body: form,
  });
  return result.subfolder ? `${result.subfolder}/${result.name}` : result.name;
}

function parseFieldValue(field) {
  if (field.imageUpload) return field.input.files?.[0] || field.input.dataset.originalValue;
  if (field.input.type === "checkbox") return field.input.checked;
  if (field.input.dataset.json === "true") return JSON.parse(field.input.value);
  if (typeof field.value === "number") {
    const value = Number(field.input.value);
    if (!Number.isFinite(value)) throw new Error(`${humanizeName(field.inputName)} 不是有效数字`);
    return value;
  }
  if (typeof field.value === "boolean") return field.input.value === "true";
  return field.input.value;
}

async function buildPrompt() {
  const workflow = cloneWorkflow();
  for (const field of state.fields) {
    let value = field.editor ? await field.editor.value() : parseFieldValue(field);
    if (field.imageUpload && value instanceof File) value = await uploadImage(value);
    workflow[field.nodeId].inputs[field.inputName] = value;
  }
  for (const input of state.specialInputs) await input.apply(workflow);
  return workflow;
}

function extractExecutionError(job) {
  const messages = job?.status?.messages || [];
  const errorMessage = [...messages].reverse().find((message) => message[0] === "execution_error");
  if (!errorMessage) return "ComfyUI 执行失败，请查看服务端日志";
  const details = errorMessage[1] || {};
  const node = details.node_type ? `节点 ${details.node_type}：` : "";
  return `${node}${details.exception_message || "未知错误"}`;
}

async function updateQueueState(promptId) {
  try {
    const queue = await requestJson(`${COMFY_API}/queue`);
    const running = queue.queue_running?.some((item) => item[1] === promptId);
    const pendingIndex = queue.queue_pending?.findIndex((item) => item[1] === promptId);
    if (running) {
      elements.progressLabel.textContent = "RUNNING";
      elements.progressTitle.textContent = "工作流正在执行";
      elements.queueState.textContent = "执行中";
    } else if (pendingIndex >= 0) {
      elements.progressLabel.textContent = "IN QUEUE";
      elements.progressTitle.textContent = "任务正在排队";
      elements.queueState.textContent = `前方 ${pendingIndex} 个任务`;
    }
  } catch {
    elements.queueState.textContent = "等待状态";
  }
}

async function waitForResult(promptId) {
  while (!state.cancelRequested && state.activePromptId === promptId) {
    const history = await requestJson(`${COMFY_API}/history/${encodeURIComponent(promptId)}`);
    const job = history[promptId];
    if (job) {
      const status = job.status?.status_str;
      if (status === "error") throw new Error(extractExecutionError(job));
      if (status === "success") return job;
    }
    await updateQueueState(promptId);
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  throw new Error(state.cancelRequested ? "任务已取消" : "任务已停止");
}

function fileUrl(file) {
  const query = new URLSearchParams({
    filename: file.filename,
    subfolder: file.subfolder || "",
    type: file.type || "output",
  });
  return `${COMFY_API}/view?${query}`;
}

function fileKind(file, outputKey) {
  const extension = String(file.filename || "").split(".").pop().toLowerCase();
  if (["png", "jpg", "jpeg", "webp", "gif", "avif", "bmp"].includes(extension)) return "image";
  if (["mp4", "webm", "mov", "mkv"].includes(extension)) return "video";
  if (["mp3", "wav", "flac", "ogg", "m4a"].includes(extension)) return "audio";
  if (/image/.test(outputKey)) return "image";
  if (/video|gifs?/.test(outputKey)) return "video";
  if (/audio/.test(outputKey)) return "audio";
  return "file";
}

function outputRole(nodeId) {
  const classType = state.workflow?.[nodeId]?.class_type || "";
  if (/save|export|videocombine|audiocombine/i.test(classType)) return "final";
  if (/compare/i.test(classType)) return "compare";
  if (/preview/i.test(classType)) return "preview";
  return "other";
}

function outputLabel(nodeId, role) {
  const node = state.workflow?.[nodeId];
  const title = node?._meta?.title || state.nodeDefs[node?.class_type]?.display_name || node?.class_type || `节点 #${nodeId}`;
  const roleNames = {
    final: "最终生成结果",
    compare: "对比预览（辅助）",
    preview: "节点预览（辅助）",
    other: "节点输出",
  };
  return `${roleNames[role]} · ${title} · #${nodeId}`;
}

function createFileOutput(file, outputKey, nodeId, role = outputRole(nodeId)) {
  const card = document.createElement("article");
  card.className = "output-card";
  const url = fileUrl(file);
  const kind = fileKind(file, outputKey);

  let preview;
  if (kind === "image") {
    preview = document.createElement("img");
    preview.src = url;
    preview.alt = file.filename || `节点 ${nodeId} 的图片输出`;
    preview.loading = "lazy";
    preview.tabIndex = 0;
    preview.title = "点击查看大图并标注";
    const openStudio = () => new ImageStudio({
      source: url,
      title: file.filename || `node-${nodeId}`,
    }).open();
    preview.addEventListener("click", openStudio);
    preview.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openStudio();
      }
    });
  } else if (kind === "video") {
    preview = document.createElement("video");
    preview.src = url;
    preview.controls = true;
    preview.preload = "metadata";
  } else if (kind === "audio") {
    preview = document.createElement("audio");
    preview.src = url;
    preview.controls = true;
    preview.preload = "metadata";
  } else {
    preview = document.createElement("div");
    preview.className = "file-preview";
    preview.textContent = String(file.filename || "输出文件").split(".").pop().toUpperCase();
  }

  const footer = document.createElement("div");
  footer.className = "output-card-footer";
  const text = document.createElement("div");
  const label = document.createElement("strong");
  label.textContent = outputLabel(nodeId, role);
  const filename = document.createElement("span");
  filename.textContent = file.filename || outputKey;
  text.append(label, filename);
  const download = document.createElement("a");
  download.href = url;
  download.download = file.filename || "output";
  download.textContent = "下载";
  footer.append(text, download);
  card.append(preview, footer);
  return card;
}

function createTextOutput(value, label, nodeId) {
  const card = document.createElement("article");
  card.className = "output-card text-output";
  const heading = document.createElement("div");
  heading.className = "text-output-heading";
  heading.textContent = `${label} · 节点 #${nodeId}`;
  const content = document.createElement("pre");
  content.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  card.append(heading, content);
  return card;
}

function renderOutputs(job) {
  elements.outputGrid.replaceChildren();
  const artifacts = [];
  const textCards = [];
  let outputCount = 0;

  for (const [nodeId, nodeOutput] of Object.entries(job.outputs || {})) {
    for (const [key, value] of Object.entries(nodeOutput || {})) {
      const values = Array.isArray(value) ? value : [value];
      const fileValues = values.filter((item) => item && typeof item === "object" && item.filename);
      if (fileValues.length) {
        for (const file of fileValues) {
          artifacts.push({ file, key: key.toLowerCase(), nodeId, role: outputRole(nodeId) });
        }
        continue;
      }

      if (value === null || value === undefined || key.endsWith("_images")) continue;
      const classType = state.workflow?.[nodeId]?.class_type || "";
      if (/ScreenShare|PlaySound/i.test(classType)) continue;
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        textCards.push(createTextOutput(value, key, nodeId));
      } else if (Array.isArray(value) && value.every((item) => ["string", "number", "boolean"].includes(typeof item))) {
        textCards.push(createTextOutput(value.join("\n"), key, nodeId));
      }
    }
  }

  const saved = artifacts.filter((artifact) => artifact.role === "final");
  const previews = artifacts.filter((artifact) => artifact.role === "preview");
  const primary = saved.length ? saved : previews.length ? previews : artifacts;
  const primarySet = new Set(primary);
  const auxiliary = artifacts.filter((artifact) => !primarySet.has(artifact));

  for (const artifact of primary) {
    elements.outputGrid.append(createFileOutput(artifact.file, artifact.key, artifact.nodeId, artifact.role));
    outputCount++;
  }
  for (const card of textCards) {
    elements.outputGrid.append(card);
    outputCount++;
  }

  if (auxiliary.length) {
    const details = document.createElement("details");
    details.className = "auxiliary-outputs";
    const summary = document.createElement("summary");
    summary.textContent = `查看辅助输出（${auxiliary.length}）`;
    const explanation = document.createElement("p");
    explanation.textContent = "这些图片来自工作流的预览或对比节点，不是最终生成文件。";
    const grid = document.createElement("div");
    grid.className = "auxiliary-output-grid";
    for (const artifact of auxiliary) grid.append(createFileOutput(artifact.file, artifact.key, artifact.nodeId, artifact.role));
    details.append(summary, explanation, grid);
    elements.outputGrid.append(details);
  }

  if (!outputCount) {
    elements.outputGrid.append(createTextOutput("任务已完成，但没有可展示的文件或文本输出。", "执行结果", "—"));
  }
  showResultView("outputs");
  elements.resultSummary.textContent = `${outputCount} 项输出 · ${formatElapsed(Date.now() - state.activeStartedAt)}`;
}

async function generate() {
  if (state.activePromptId || !state.workflow) return false;

  let succeeded = false;
  try {
    setRunning(true);
    state.cancelRequested = false;
    showResultView("progress");
    startElapsedTimer();
    elements.jobId.hidden = true;
    elements.progressLabel.textContent = "PREPARING";
    elements.progressTitle.textContent = "正在准备工作流";
    elements.progressDetail.textContent = "处理上传文件并提交参数";
    elements.queueState.textContent = "准备中";
    elements.resultSummary.textContent = "正在执行";

    const workflow = await buildPrompt();
    const result = await requestJson(`${COMFY_API}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow }),
    });

    state.activePromptId = result.prompt_id;
    elements.jobId.hidden = false;
    elements.jobIdValue.textContent = state.activePromptId;
    elements.jobIdValue.title = state.activePromptId;
    elements.progressLabel.textContent = "IN QUEUE";
    elements.progressTitle.textContent = "任务已提交";
    elements.progressDetail.textContent = state.currentName;
    elements.queueState.textContent = `队列 #${result.number}`;

    const job = await waitForResult(state.activePromptId);
    renderOutputs(job);
    showToast("工作流执行完成");
    succeeded = true;
  } catch (error) {
    if (state.cancelRequested) {
      showResultView("empty");
      elements.resultSummary.textContent = "任务已取消";
      showToast("任务已取消");
    } else {
      elements.errorMessage.textContent = error.message;
      elements.resultSummary.textContent = "执行失败";
      showResultView("error");
    }
  } finally {
    stopElapsedTimer();
    setRunning(false);
    state.activePromptId = null;
    state.cancelRequested = false;
    checkServer();
  }
  return succeeded;
}

async function cancelGeneration() {
  if (!state.activePromptId) return;
  state.cancelRequested = true;
  const promptId = state.activePromptId;
  const requests = [
    requestJson(`${COMFY_API}/queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delete: [promptId] }),
    }),
    requestJson(`${COMFY_API}/interrupt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt_id: promptId }),
    }),
  ];
  const results = await Promise.allSettled(requests);
  if (results.every((result) => result.status === "rejected")) {
    showToast("取消请求失败，请检查 ComfyUI 队列");
  }
}

elements.workflowSearch.addEventListener("input", renderWorkflowList);
elements.showAdvanced.addEventListener("change", () => {
  state.showAdvanced = elements.showAdvanced.checked;
  applyAdvancedVisibility();
});
elements.resetButton.addEventListener("click", renderParameters);
elements.parameterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  generate();
});
elements.cancelButton.addEventListener("click", cancelGeneration);
elements.retryButton.addEventListener("click", generate);

async function initialize() {
  setRunning(false);
  showResultView("empty");
  await checkServer();
  try {
    await loadNodeDefinitions();
  } catch {
    state.nodeDefs = {};
    showToast("节点定义暂不可用，将按现有参数生成基础控件");
  }
  try {
    await loadCatalog();
  } catch (error) {
    elements.emptyParameters.textContent = error.message;
    elements.workflowList.innerHTML = '<p class="list-empty">无法读取工作流目录</p>';
  }
}

initialize();
setInterval(checkServer, 15000);
