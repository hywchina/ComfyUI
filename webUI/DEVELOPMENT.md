# Workflow Studio 二次开发指南

本文记录如何把 ComfyUI API 工作流适配为通用 Web 页面，以及实现过程中遇到的主要问题。目标读者是后续维护该项目的工程师和 AI 编码代理。

## 1. 项目目标与边界

Workflow Studio 不复刻 ComfyUI 节点画布。它把已经调试通过的 API 工作流转换为更适合普通用户的表单：

1. 自动发现 `user/default/workflows_api/` 下的工作流。
2. 读取 ComfyUI `/object_info`，为未连接的节点输入生成控件。
3. 对图片上传、遮罩、打标、屏幕捕获等复杂输入提供专用编辑器。
4. 将修改后的 API 工作流提交到 `/prompt`，轮询 `/history/{prompt_id}` 并展示结果。

Web demo 的修改应限制在 `webUI/`。不要为了页面适配修改 ComfyUI 的执行层、节点实现或原工作流。

## 2. 文件结构

```text
webUI/
├── index.html       # 三栏页面骨架
├── styles.css       # 页面、编辑器和响应式样式
├── app.js           # 工作流解析、控件生成、特殊节点、提交和结果展示
├── server.py        # 静态服务、工作流目录 API、ComfyUI 反向代理、TLS
├── README.md        # 使用说明
└── DEVELOPMENT.md   # 本文

user/default/
├── workflows/       # ComfyUI 前端可编辑工作流
└── workflows_api/   # 可提交给 /prompt 的 API 工作流
```

`workflows/` 与 `workflows_api/` 不能混用。前端画布 JSON 包含节点坐标、连线等 UI 数据；API JSON 是以节点 ID 为键的执行图。

一个最小 API 工作流节点如下：

```json
{
  "12": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "a photo",
      "clip": ["10", 1]
    },
    "_meta": {
      "title": "正向提示词"
    }
  }
}
```

其中 `["10", 1]` 是节点连接，不是可编辑的数组参数。`app.js` 和 `server.py` 都通过“长度为 2、首项是现有节点 ID、第二项是整数”识别连接。

## 3. 总体数据流

```text
workflows_api/*.json
        │
        ▼
GET /api/workflows ──► 工作流列表
        │
        ▼
GET /api/workflow?id=... ──► 当前 API 执行图
        │
        ├── GET /comfy/object_info ──► 输入类型、范围、选项、提示
        │
        ▼
通用控件 + 特殊节点编辑器
        │
        ▼
clone workflow → 写入用户值 → 上传图片 → POST /comfy/prompt
        │
        ▼
GET /comfy/history/{id} + GET /comfy/queue
        │
        ▼
最终结果 + 可折叠辅助输出
```

浏览器只访问 Workflow Studio 同源地址。`server.py` 把 `/comfy/*` 转发给本地 ComfyUI，因此不需要修改 ComfyUI CORS 设置，也避免浏览器直接处理另一套 TLS 证书。

## 4. 服务端设计

`server.py` 提供以下接口：

| 路径 | 用途 |
| --- | --- |
| `GET /health` | 返回 Web 服务、ComfyUI 地址和工作流目录 |
| `GET /api/workflows` | 递归扫描 API JSON，返回名称、节点数和可编辑参数数 |
| `GET /api/workflow?id=...` | 返回单个经过结构验证的 API 工作流 |
| `/comfy/*` | 同方法代理到 ComfyUI，例如 `/prompt`、`/history`、`/view` |

服务端只接受满足以下条件的 JSON：根对象非空，每个节点都有字符串 `class_type` 和对象 `inputs`。工作流 ID 会经过 `resolve()` 和 `relative_to()` 校验，防止目录穿越。

代理当前只转发 Web 页面实际使用的 `GET`、`POST`、`Content-Type` 和 `Accept`。若将来接入 WebSocket 进度、二进制流式上传或其他 HTTP 方法，应在代理边界扩展，不要把网络逻辑散落到前端控件中。

### TLS

屏幕捕获 API 要求安全上下文。局域网访问必须让 Workflow Studio 自己运行 HTTPS，而不仅是 ComfyUI 使用 HTTPS：

```bash
python webUI/server.py \
  --host 0.0.0.0 \
  --comfy-url https://127.0.0.1:8188 \
  --comfy-ca-cert /data_ssd/projects/ComfyUI-certs/comfyui-local-ca.crt \
  --tls-certfile /data_ssd/projects/ComfyUI-certs/comfyui-server.crt \
  --tls-keyfile /data_ssd/projects/ComfyUI-certs/comfyui-server.key
```

不要用关闭证书验证作为长期方案。客户端第一次访问时应信任本地 CA。

## 5. 通用参数生成

初始化顺序位于 `initialize()`：

1. 检查 `/comfy/system_stats`。
2. 读取 `/comfy/object_info`。
3. 加载工作流目录。
4. 默认选择第一个工作流并调用 `renderParameters()`。

### 5.1 参数是否可编辑

遍历每个节点的 `inputs`：

- 节点连接不生成控件。
- 字面量输入生成控件。
- `IO_EasyMark` 和 `ScreenShare` 整个节点交给专用适配器。

不要把连接暴露成普通 JSON 输入，否则用户会破坏图结构。

### 5.2 类型来源

`describeInput()` 将工作流中的当前值和 `/object_info` 定义合并：

- `STRING` → 单行或多行文本。
- `INT`、`FLOAT` → 数字输入，并采用 `min`、`max`、`step`。
- `BOOLEAN` → 开关。
- 枚举数组或 `COMFY_DYNAMICCOMBO_V3.options` → 下拉框。
- 带 `image_upload` 的输入或 `LoadImage.image` → 图片输入编辑器。
- 无法识别的对象或数组 → JSON 文本框。

`required` 在 ComfyUI 中表示字段必须存在于执行 JSON，不表示字符串必须非空。不能直接映射成 HTML `required`，否则工作流中合法的空提示词会阻止表单提交。

### 5.3 基础参数和高级参数

常见提示词、图片、尺寸、采样、随机种子等默认显示；模型名、后端参数等其余字段放入“全部参数”。这只是展示层分类，提交时两类参数都会保留。

当 `/object_info` 暂不可用时，页面仍能根据 JSON 当前值生成基础控件，但枚举、范围和自定义上传能力会退化。因此特殊节点适配不应只依赖显示名称。

### 5.4 提交时不要修改原对象

`buildPrompt()` 先通过 `structuredClone()` 克隆当前工作流，再写入表单值。这样重试、重置和切换工作流不会被上一次提交污染。

图片文件先通过 `/comfy/upload/image` 上传，随后把返回的 `subfolder/name` 写回对应节点输入。最后提交：

```json
{
  "prompt": {
    "12": {
      "class_type": "...",
      "inputs": {}
    }
  }
}
```

## 6. 特殊节点适配

通用表单只能覆盖标量和枚举。遇到自定义数据格式、浏览器媒体 API 或交互式画布时，应按 `class_type` 增加窄而明确的适配器。

适配器约定：

```js
class CustomNodeEditor {
  constructor(nodeId, node) {
    this.element = document.createElement("div");
  }

  async apply(workflow) {
    workflow[this.nodeId].inputs.some_input = "serialized value";
  }

  dispose() {
    // 停止媒体流、计时器和事件资源
  }
}
```

在 `renderParameters()` 中识别节点并放入 `state.specialInputs`。`buildPrompt()` 会在普通字段完成后调用每个适配器的 `apply()`。

### 6.1 图片上传与透明遮罩

`ImageInputEditor` 负责 `LoadImage`：

1. 显示已有输入图或本地选择图。
2. 打开全屏 `ImageStudio`。
3. 用画笔增加遮罩，用橡皮移除遮罩。
4. 将遮罩区域转换为 PNG 透明 Alpha。
5. 运行时上传 PNG，并把文件名写回 `LoadImage.image`。

ComfyUI `LoadImage` 会从图片 Alpha 生成 MASK，因此仅传红色覆盖层是不够的，必须真正改变导出 PNG 的透明度。

`ImageStudio` 同时用于输出图片查看和标注，支持缩放、画笔、橡皮、颜色、粗细、不透明度、撤销、重做和下载。输出标注下载为新文件，不覆盖 ComfyUI 原始结果。

### 6.2 `IO_EasyMark`

节点后端位于：

```text
custom_nodes/ComfyUI-Apt_Preset/NodeBasic/C_viewIO.py
```

关键输入：

| 输入 | 内容 |
| --- | --- |
| `image_base64` | 完整图片 Data URL |
| `brush_data` | Mixlab/Apt 约定的笔画字符串 |
| `brush_size` | 画笔大小 |

笔画格式为：

```text
mode:type:size:opacity:r,g,b[:marker]:x,y;x,y|下一笔
```

适配前必须阅读节点 Python 和原扩展 JavaScript，不能仅凭字段名猜测格式。当前编辑器支持画笔、方框、色块、橡皮、六种颜色和编号 1–6。

### 6.3 `ScreenShare`

节点后端和原前端分别位于：

```text
custom_nodes/comfyui-mixlab-nodes/nodes/ScreenShareNode.py
custom_nodes/comfyui-mixlab-nodes/web/javascript/main_mixlab.js
```

关键输入：`image_base64`、`refresh_rate`、`prompt`、`slide`、`seed`。

适配语义：

- “共享屏幕”使用 `getDisplayMedia()`。
- “打开摄像头”使用 `getUserMedia()`。
- “设置捕获区域”在完整快照中选区。
- 确认选区后，主预览必须成为裁剪后的实时视窗，而不是在完整画面上保留一个选框。
- 捕获帧与主预览使用同一组 `x/y/width/height`，保证所见即所得。
- “实时运行”先判断缩略帧平均像素差，画面有变化才提交。
- 每次等待上一任务完成后再检查下一帧，不能按计时器无条件并发提交，否则会快速塞满 GPU 队列。
- 停止或销毁编辑器时必须关闭 MediaStream tracks 和实时循环。

选区按节点 ID 存入 `localStorage`，只有媒体源尺寸相同才恢复，避免把旧坐标应用到不同分辨率的视频。

## 7. 执行、轮询与取消

执行流程：

1. `POST /comfy/prompt` 获取 `prompt_id`。
2. 轮询 `/comfy/history/{prompt_id}`。
3. 同时读取 `/comfy/queue`，显示运行或排队状态。
4. 历史状态为 `success` 时渲染输出，为 `error` 时提取 `execution_error`。

取消同时调用：

```text
POST /comfy/queue      {"delete": [prompt_id]}
POST /comfy/interrupt  {"prompt_id": prompt_id}
```

只调用 `interrupt` 可能影响正在运行的其他任务，只调用队列删除又无法停止已经开始的任务。当前页面保存自己的 `prompt_id`，尽量把取消目标限制在本页面任务。

## 8. 输出分类与大图编辑

ComfyUI `/history` 会返回所有产生 UI 输出的节点，不只最终图片。例如实时捕获工作流同时返回：

- `SaveImage` 的最终生成图。
- `ImageCompare` 的 A/B 临时图。
- `PreviewImage` 的输入帧。
- `ScreenShare` 的 `refresh_rate`。
- `PlaySound` 等工具节点状态。

如果全部平铺，用户会误以为一次生成了多张结果。`outputRole()` 当前采用以下策略：

1. 类名包含 `save`、`export`、`videocombine`、`audiocombine` → 最终结果。
2. 类名包含 `preview` → 辅助预览。
3. 类名包含 `compare` → 辅助对比。
4. 存在最终结果时，其他文件折叠进“辅助输出”。
5. 没有保存节点时，优先把预览节点作为主要结果；再没有则展示所有文件，避免空页面。
6. `ScreenShare`、`PlaySound` 的标量 UI 元数据不显示。

这是一套启发式规则，不是 ComfyUI 协议。新增自定义保存节点时，应扩展 `outputRole()`，或未来在工作流旁增加显式展示配置。

输出图片点击后使用 `ImageStudio` 全屏打开。浏览器从 `/comfy/view?filename=...&subfolder=...&type=...` 同源读取文件，因此可以安全绘制到 Canvas 并导出标注图。

## 9. 已遇到的问题与解决方法

### API JSON 与前端 JSON 结构不同

问题：前端工作流不能直接提交 `/prompt`。

解决：保留 `workflows/` 作为可编辑源，只读取批量导出的 `workflows_api/`。服务端加载时验证 API 节点结构。

### 仅凭 JSON 当前值无法恢复完整控件类型

问题：字符串可能是提示词、模型名或自定义序列化字段；列表可能是枚举或连接。

解决：用 `/object_info` 合并节点定义；连接优先识别；未知结构回退为 JSON 编辑框；复杂类型建立专用适配器。

### ComfyUI `required` 被误解为 HTML 必填

问题：合法的空提示词导致浏览器阻止提交，页面没有发出 `/prompt`。

解决：字段始终写入工作流，但不把节点 schema 的 `required` 直接设置为 HTML `required`。

### 屏幕捕获在局域网地址不可用

问题：`getDisplayMedia`/`getUserMedia` 需要 HTTPS 或 localhost。

解决：Web UI 自己启用 TLS，并通过同源代理访问 ComfyUI。

### 设置区域后预览和提交不一致

问题：提交帧已经裁剪，但主预览仍显示完整屏幕和黄色选框。

解决：黄色选框只在区域选择弹窗出现；确认后按选区比例调整预览容器，并缩放、平移 video，仅显示选区。捕获 Canvas 复用同一坐标。

### Live Run 堵塞队列

问题：固定间隔直接调用 `/prompt`，推理速度低于捕获速度时任务无限堆积。

解决：实时循环串行等待 `generate()` 完成，并通过 48×48 缩略帧平均像素差跳过静止画面。

### 历史记录展示了多张“结果”

问题：保存、预览、对比和输入帧都被当成最终图。

解决：根据产生输出的节点类型分类，只突出保存结果，其余折叠并说明来源。

### API 工作流引用旧图片但文件不存在

问题：`/view` 返回 404，页面无法显示默认预览。

解决：允许预览失败但保持控件可用，用户重新选择文件后再上传。导出工作流时仍应检查引用的 input 文件是否存在。

### 画面或图片编辑器被浏览器缓存

问题：服务端代码已更新，但已打开页面仍执行旧 `app.js`。

解决：开发时使用 `Ctrl+F5`；如需长期部署，可给静态资源增加内容哈希或版本查询参数。

## 10. 新增工作流的最短流程

1. 在 ComfyUI 中完成并验证前端工作流。
2. 导出 API JSON 到 `user/default/workflows_api/`，或运行：

   ```bash
   ./export_workflows_api.sh
   ```

3. 刷新 Workflow Studio，确认工作流出现在左侧。
4. 检查基础参数、图片上传和最终输出。
5. 如果某个字段显示为 JSON 文本框或操作无法完成，查看：

   ```text
   GET /comfy/object_info/{class_type}
   custom_nodes/... 对应节点 Python
   custom_nodes/... 对应前端 JavaScript
   ```

6. 只有确实需要交互或自定义序列化时才新增专用适配器。

## 11. 新增特殊节点适配清单

开发前回答以下问题：

- 节点的精确 `class_type` 是什么？
- `INPUT_TYPES` 中哪些字段是 required、optional、hidden？
- 原 ComfyUI 扩展是否通过自定义 widget 改写序列化值？
- 输入要传文件名、Data URL、JSON 还是自定义字符串？
- 是否需要浏览器权限、HTTPS、媒体流或 Canvas？
- 是否有必须在切换工作流时释放的资源？
- 输出来自哪个节点，应该归类为最终还是辅助？
- 能否在不执行昂贵 GPU 推理的情况下拦截 `/prompt` 验证请求体？

实现步骤：

1. 阅读节点 Python，确认后端真实输入契约。
2. 阅读原扩展 JavaScript，确认 UI 行为和序列化格式。
3. 在 `renderParameters()` 中加入精确的 `class_type` 分支。
4. 实现 `element`、`apply(workflow)`，必要时实现 `dispose()`。
5. 验证提交前克隆对象中的目标节点输入。
6. 使用真实 `/object_info` 做一轮兼容性检查。
7. 用浏览器完成交互测试，而不只做语法检查。

## 12. 测试与验收

### 静态检查

```bash
node --check webUI/app.js
python -m py_compile webUI/server.py
git diff --check -- webUI
```

运行 `py_compile` 会生成 `webUI/__pycache__`，提交前删除该生成目录。

### 服务检查

```bash
curl -k https://127.0.0.1:5173/health
curl -k https://127.0.0.1:5173/api/workflows
curl -k https://127.0.0.1:5173/comfy/system_stats
```

### 浏览器回归矩阵

| 场景 | 必须验证 |
| --- | --- |
| 通用表单 | 文本、空字符串、数字、布尔、枚举、全部参数 |
| 图片输入 | 本地选择、已有预览、上传后文件名写回 |
| 遮罩 | 缩放、画笔、橡皮、撤销重做、导出 Alpha PNG |
| EasyMark | 图片 Data URL、`brush_data` 非空、编号和颜色序列化 |
| ScreenShare | HTTPS、屏幕、摄像头、区域裁剪、裁剪预览、提交尺寸 |
| Live Run | 画面变化后提交、任务串行、停止后不再提交 |
| 输出 | 最终图唯一突出、辅助图折叠、来源说明 |
| 大图 | 点击打开、缩放、标注、下载、不覆盖原图 |
| 错误 | ComfyUI 离线、节点执行错误、缺失输入图、取消任务 |

复杂交互应采用浏览器自动化，并在浏览器内拦截 `/upload/image`、`/prompt` 和 `/history`。这样可以检查最终请求体，而不启动耗时的 GPU 推理。至少还应保留一次真实 ComfyUI `/object_info` 和静态文件访问测试。

## 13. 当前限制和后续方向

- 输出分类依赖类名启发式。更稳定的方案是为每个工作流增加可选展示配置，例如指定主要输出节点 ID、公开字段和标签。
- JavaScript `Number` 无法精确表示大于 `2^53-1` 的整数。ComfyUI 支持更大的 seed；若必须逐位保真，需要在 JSON 解析和提交层引入大整数策略，而不只是把输入框改成文本。
- 当前状态保存在单页面内，刷新后不会恢复任务历史。
- 轮询历史适合本地 demo；需要更细粒度进度时可在代理层增加 ComfyUI WebSocket 转发。
- 图片标注下载为新文件，没有自动成为下一次工作流输入。若要形成“结果再编辑”链路，应设计明确的按钮和目标输入，不能隐式改写当前工作流。
- 特殊节点目前按精确 `class_type` 适配。不同插件的同类功能可能使用完全不同的数据协议，不能仅按显示标题复用。

## 14. 维护原则

- 通用标量能力放在 `describeInput()`、`createInputControl()`。
- 自定义数据协议放在专用编辑器，不污染通用字段解析。
- 网络和 TLS 留在 `server.py`；节点交互留在 `app.js`。
- 每次提交都克隆工作流，保持加载的模板不可变。
- 媒体流、循环和弹窗要有明确销毁路径。
- 默认界面只突出用户真正需要的输入和最终结果。
- 增加新能力时先用一个真实工作流验证，再考虑抽象。
