const API_BASE = "/comfy";

const defaults = {
  positivePrompt: "Chinese 3D anime movie poster style, eight Chinese immortals, each wearing unique traditional ancient Chinese Hanfu costumes, distinct facial appearances matching classic legends, every immortal holding their signature magic treasure. All characters stand upon soft flowing immortal clouds, gradient pink-red background decorated with subtle traditional Chinese cloud patterns, bright warm cinematic lighting, vivid saturated colors, delicate 3D rendering texture, commercial animation movie poster composition, layered depth, exquisite clothing embroidery, Chinese fantasy aesthetic, clean high-detail render",
  negativePrompt: "low quality, bad anatomy, extra digits, missing digits, extra limbs, missing limbs",
  width: 1024,
  height: 1024,
  batchSize: 1,
  seed: 42,
  steps: 8,
  cfg: 1,
  filenamePrefix: "webui/klein",
  denoise: 1,
  shift: 3,
  samplerName: "res_multistep",
  scheduler: "simple",
};

const elements = {
  form: document.querySelector("#generationForm"),
  positivePrompt: document.querySelector("#positivePrompt"),
  negativePrompt: document.querySelector("#negativePrompt"),
  promptCount: document.querySelector("#promptCount"),
  width: document.querySelector("#width"),
  height: document.querySelector("#height"),
  batchSize: document.querySelector("#batchSize"),
  seed: document.querySelector("#seed"),
  steps: document.querySelector("#steps"),
  stepsValue: document.querySelector("#stepsValue"),
  cfg: document.querySelector("#cfg"),
  cfgValue: document.querySelector("#cfgValue"),
  filenamePrefix: document.querySelector("#filenamePrefix"),
  denoise: document.querySelector("#denoise"),
  shift: document.querySelector("#shift"),
  samplerName: document.querySelector("#samplerName"),
  scheduler: document.querySelector("#scheduler"),
  runButton: document.querySelector("#runButton"),
  runButtonText: document.querySelector("#runButtonText"),
  cancelButton: document.querySelector("#cancelButton"),
  resetButton: document.querySelector("#resetButton"),
  randomSeedButton: document.querySelector("#randomSeedButton"),
  retryButton: document.querySelector("#retryButton"),
  serverState: document.querySelector("#serverState"),
  serverStateText: document.querySelector("#serverStateText"),
  emptyState: document.querySelector("#emptyState"),
  progressState: document.querySelector("#progressState"),
  errorState: document.querySelector("#errorState"),
  imageGrid: document.querySelector("#imageGrid"),
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

let activePromptId = null;
let activeStartedAt = null;
let elapsedTimer = null;
let cancelRequested = false;
let toastTimer = null;

function loadDefaults() {
  Object.entries(defaults).forEach(([key, value]) => {
    elements[key].value = value;
  });
  updatePromptCount();
  updateSliderValues();
  selectMatchingAspect();
}

function updatePromptCount() {
  elements.promptCount.textContent = `${elements.positivePrompt.value.length} 字符`;
}

function updateSliderValues() {
  elements.stepsValue.value = elements.steps.value;
  elements.cfgValue.value = Number(elements.cfg.value).toFixed(1);
}

function randomSeed() {
  const parts = new Uint32Array(2);
  crypto.getRandomValues(parts);
  return (parts[0] * 2097152 + (parts[1] & 2097151)).toString();
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2600);
}

function showView(view) {
  elements.emptyState.hidden = view !== "empty";
  elements.progressState.hidden = view !== "progress";
  elements.errorState.hidden = view !== "error";
  elements.imageGrid.hidden = view !== "images";
}

function setRunning(running) {
  elements.runButton.disabled = running;
  elements.runButtonText.textContent = running ? "生成中…" : "开始生成";
  elements.cancelButton.hidden = !running;
}

function selectMatchingAspect() {
  const size = `${elements.width.value}x${elements.height.value}`;
  document.querySelectorAll("[data-size]").forEach((button) => {
    button.classList.toggle("active", button.dataset.size === size);
  });
}

function formatElapsed(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function startElapsedTimer() {
  clearInterval(elapsedTimer);
  activeStartedAt = Date.now();
  elements.elapsedTime.textContent = "00:00";
  elapsedTimer = setInterval(() => {
    elements.elapsedTime.textContent = formatElapsed(Date.now() - activeStartedAt);
  }, 1000);
}

function stopElapsedTimer() {
  clearInterval(elapsedTimer);
  elapsedTimer = null;
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || `HTTP ${response.status}` };
  }

  if (!response.ok) {
    const message = data.error?.message
      || data.error
      || data.details
      || `请求失败（HTTP ${response.status}）`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }

  return data;
}

async function checkServer() {
  try {
    await requestJson("/system_stats");
    elements.serverState.className = "server-state online";
    elements.serverStateText.textContent = "ComfyUI 已连接";
  } catch {
    elements.serverState.className = "server-state offline";
    elements.serverStateText.textContent = "ComfyUI 未连接";
  }
}

function buildPrompt(workflow) {
  workflow["67"].inputs.text = elements.positivePrompt.value.trim();
  workflow["71"].inputs.text = elements.negativePrompt.value.trim();
  workflow["68"].inputs.width = Number(elements.width.value);
  workflow["68"].inputs.height = Number(elements.height.value);
  workflow["68"].inputs.batch_size = Number(elements.batchSize.value);
  workflow["70"].inputs.seed = Number(elements.seed.value);
  workflow["70"].inputs.steps = Number(elements.steps.value);
  workflow["70"].inputs.cfg = Number(elements.cfg.value);
  workflow["70"].inputs.denoise = Number(elements.denoise.value);
  workflow["70"].inputs.sampler_name = elements.samplerName.value.trim();
  workflow["70"].inputs.scheduler = elements.scheduler.value.trim();
  workflow["69"].inputs.shift = Number(elements.shift.value);
  workflow["9"].inputs.filename_prefix = elements.filenamePrefix.value.trim();
  return workflow;
}

function validateInputs() {
  const width = Number(elements.width.value);
  const height = Number(elements.height.value);
  if (width % 16 !== 0 || height % 16 !== 0) {
    throw new Error("宽度和高度必须是 16 的倍数");
  }
  if (!elements.positivePrompt.value.trim()) {
    throw new Error("请输入画面描述");
  }
}

function extractExecutionError(job) {
  const messages = job?.status?.messages || [];
  const errorMessage = [...messages].reverse().find((message) => message[0] === "execution_error");
  if (!errorMessage) {
    return "ComfyUI 执行失败，请查看服务端终端日志";
  }
  const details = errorMessage[1] || {};
  const node = details.node_type ? `节点 ${details.node_type}：` : "";
  return `${node}${details.exception_message || "未知错误"}`;
}

async function updateQueueState(promptId) {
  try {
    const queue = await requestJson("/queue");
    const running = queue.queue_running?.some((item) => item[1] === promptId);
    const pendingIndex = queue.queue_pending?.findIndex((item) => item[1] === promptId);
    if (running) {
      elements.progressLabel.textContent = "GENERATING";
      elements.progressTitle.textContent = "正在生成画面";
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
  while (!cancelRequested && activePromptId === promptId) {
    const history = await requestJson(`/history/${encodeURIComponent(promptId)}`);
    const job = history[promptId];

    if (job) {
      const status = job.status?.status_str;
      if (status === "error") {
        throw new Error(extractExecutionError(job));
      }
      if (status === "success") {
        return job;
      }
    }

    await updateQueueState(promptId);
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  throw new Error(cancelRequested ? "任务已取消" : "任务已停止");
}

function imageUrl(image) {
  const query = new URLSearchParams({
    filename: image.filename,
    subfolder: image.subfolder || "",
    type: image.type || "output",
  });
  return `${API_BASE}/view?${query}`;
}

function renderImages(job) {
  const images = Object.entries(job.outputs || {}).flatMap(([nodeId, output]) =>
    (output.images || []).map((image) => ({ ...image, nodeId }))
  );

  if (!images.length) {
    throw new Error("任务已完成，但没有找到图片输出");
  }

  elements.imageGrid.replaceChildren();
  images.forEach((image, index) => {
    const card = document.createElement("article");
    card.className = "image-card";

    const imageElement = document.createElement("img");
    imageElement.src = imageUrl(image);
    imageElement.alt = `生成结果 ${index + 1}`;

    const actions = document.createElement("div");
    actions.className = "image-actions";

    const download = document.createElement("a");
    download.href = imageUrl(image);
    download.download = image.filename;
    download.textContent = "下载原图";

    actions.append(download);
    card.append(imageElement, actions);
    elements.imageGrid.append(card);
  });

  showView("images");
  elements.resultSummary.textContent = `${images.length} 张图片 · ${formatElapsed(Date.now() - activeStartedAt)}`;
}

async function generate() {
  if (activePromptId) {
    return;
  }

  try {
    validateInputs();
    setRunning(true);
    cancelRequested = false;
    showView("progress");
    startElapsedTimer();
    elements.jobId.hidden = true;
    elements.progressLabel.textContent = "PREPARING";
    elements.progressTitle.textContent = "正在提交任务";
    elements.progressDetail.textContent = "模型首次加载可能需要一些时间";
    elements.queueState.textContent = "准备中";
    elements.resultSummary.textContent = "正在生成";

    const workflowResponse = await fetch("./workflow.json", { cache: "no-store" });
    if (!workflowResponse.ok) {
      throw new Error("无法加载工作流模板");
    }
    const workflow = buildPrompt(await workflowResponse.json());
    const result = await requestJson("/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow }),
    });

    activePromptId = result.prompt_id;
    elements.jobId.hidden = false;
    elements.jobIdValue.textContent = activePromptId;
    elements.jobIdValue.title = activePromptId;
    elements.progressLabel.textContent = "IN QUEUE";
    elements.progressTitle.textContent = "任务已进入队列";
    elements.queueState.textContent = `队列 #${result.number}`;

    const job = await waitForResult(activePromptId);
    renderImages(job);
    showToast("图片生成完成");
  } catch (error) {
    if (cancelRequested) {
      showView("empty");
      elements.resultSummary.textContent = "任务已取消";
      showToast("任务已取消");
    } else {
      elements.errorMessage.textContent = error.message;
      elements.resultSummary.textContent = "生成失败";
      showView("error");
    }
  } finally {
    stopElapsedTimer();
    setRunning(false);
    activePromptId = null;
    cancelRequested = false;
    checkServer();
  }
}

async function cancelGeneration() {
  if (!activePromptId) {
    return;
  }
  cancelRequested = true;
  const promptId = activePromptId;
  const requests = [
    requestJson("/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delete: [promptId] }),
    }),
    requestJson("/interrupt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt_id: promptId }),
    }),
  ];
  const results = await Promise.allSettled(requests);
  if (results.every((result) => result.status === "rejected")) {
    showToast("取消请求发送失败，请在 ComfyUI 队列中检查任务");
  }
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  generate();
});
elements.positivePrompt.addEventListener("input", updatePromptCount);
elements.steps.addEventListener("input", updateSliderValues);
elements.cfg.addEventListener("input", updateSliderValues);
elements.width.addEventListener("input", selectMatchingAspect);
elements.height.addEventListener("input", selectMatchingAspect);
elements.randomSeedButton.addEventListener("click", () => {
  elements.seed.value = randomSeed();
});
elements.resetButton.addEventListener("click", () => {
  loadDefaults();
  showToast("已恢复默认参数");
});
elements.cancelButton.addEventListener("click", cancelGeneration);
elements.retryButton.addEventListener("click", generate);

document.querySelectorAll("[data-size]").forEach((button) => {
  button.addEventListener("click", () => {
    const [width, height] = button.dataset.size.split("x");
    elements.width.value = width;
    elements.height.value = height;
    selectMatchingAspect();
  });
});

loadDefaults();
checkServer();
setInterval(checkServer, 15000);
