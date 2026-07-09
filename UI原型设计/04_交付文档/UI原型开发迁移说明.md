# 轨道交通客室智能快速设计工具 UI Demo 交接说明

## 1. 项目定位

本 UI Demo 面向轨道交通客室设计师，用于向甲方说明“基于 ComfyUI 工作流 API 的多模态设计工作台”应该如何组织页面、任务入口、参数输入、生成结果、资源沉淀和报告交付。

当前版本不是可生产系统，只是前端 UI 原型。它没有真实后端接口、鉴权、文件上传、任务队列或模型推理能力，所有数据均为静态示例或前端模板渲染。

## 2. 当前交付目录

```text
UI原型设计/
  01_原始输入/
    轨道交通客室智能快速设计工具构建.pdf
    中国中车_logo_参考.jpg
    中国中车.ai
    codex-clipboard-*.png
  02_网页源代码/
    rail-cabin-ai-prototype.html
    assets/
      crrc-logo.png
      cabin-home-hero.png
  03_页面截图/
    01_登录页.png
    02_首页主视觉.png
    03_客室效果生成.png
    ...
  04_交付文档/
    UI原型设计说明.pptx
    UI原型开发迁移说明.md
  05_工作文件/
    生成 PPT 使用的临时脚本、预览和 QA 文件
```

## 3. 技术架构

当前 Demo 采用单文件静态前端结构：

```text
HTML
  页面结构、导航、登录页、各模块容器

CSS
  设计系统变量、布局、表单、卡片、首页主视觉、画布和弹窗样式

JavaScript
  静态数据配置
  页面模块模板渲染
  data-screen 页面切换
  屏幕捕捉浮窗
  AI 助手抽屉开关
```

后续工程化时建议拆分为：

```text
src/
  app/
    AppShell.vue 或 AppShell.tsx
    routes.ts
  modules/
    login/
    home/
    cabin-render/
    cmf-generator/
    component-generator/
    mask-editor/
    lora-library/
    lora-training/
    model-3d/
    report/
    resource-library/
    permissions/
    assistant/
  components/
    Topbar
    WorkflowTabs
    ParameterPanel
    CanvasStage
    TaskQueue
    UploadBox
    PromptEditor
    ResultGrid
    Drawer
    Modal
  services/
    workflowApi.ts
    resourceApi.ts
    authApi.ts
    loraApi.ts
```

## 4. 设计系统

### 4.1 品牌色

主色来自用户提供的中车研究院官网截图取色：

| 用途 | 色值 | 说明 |
| --- | --- | --- |
| 主红 | `#c7001a` | 按钮、Tab 高亮、选中标签、进度条、AI 浮窗 |
| 深红 | `#a90016` | 主按钮渐变深色端、强调状态 |
| 浅红底 | `#fff0f2` | 选中背景、浅色标签底 |
| 正文深色 | `#151922` | 标题和主要文字 |
| 辅助文字 | `#6b7280` | 说明文字和弱提示 |
| 分割线 | `#e5e7eb` | 面板边框和表格线 |
| 页面背景 | `#f3f5f8` | 工作台外层背景 |
| 成功状态 | `#18a058` | Docker / API 在线状态 |

CSS 变量位于 `:root`：

```css
--blue: #c7001a;
--blue-2: #a90016;
--blue-3: #fff0f2;
--ink: #151922;
--muted: #6b7280;
--line: #e5e7eb;
```

变量名仍保留 `--blue`，是因为 Demo 初期从蓝色体系改造而来。后续正式开发建议重命名为：

```css
--brand-primary: #c7001a;
--brand-primary-dark: #a90016;
--brand-primary-soft: #fff0f2;
```

### 4.2 布局风格

- 顶部固定全局栏：Logo、系统名、部署状态、工作流 API 在线状态、LoRA 训练入口、用户权限入口、通知。
- 横向工作流 Tab：只保留效果实现相关入口：首页、客室效果生成、CMF 生成器、客室零部件生成器、2D 生 3D、自动报告。
- 生成类页面统一三栏：左侧参数，中间画布/结果，右侧任务队列和方案记录。
- LoRA、资源、权限、报告等管理页使用轻量两栏或三栏布局。
- 右下角统一 AI 助手入口，避免在右侧任务栏重复出现助手卡片。

## 5. 页面与功能映射

| 原始需求 | UI 页面 | UI 响应方式 | 后续接口方向 |
| --- | --- | --- | --- |
| 登录入口 | 登录页 | 账号、密码、验证码、登录进入首页 | `POST /api/auth/login` |
| ComfyUI Docker 本地部署 | 顶部状态栏 | 展示 Docker 部署、ComfyUI API 已连接、工作流 API 在线 | `GET /api/system/status` |
| 客室效果生成 | 客室效果生成 | 平面图/白模上传、提示词、尺寸、数量、参考融合、局部遮罩、结果预览 | `POST /api/workflows/cabin-render` |
| CMF 生成器 | CMF生成器 | 面料、地板、墙板纹样生成，支持文生图和参考图融合 | `POST /api/workflows/cmf-generator` |
| 客室零部件生成器 | 客室零部件生成器 | 文生图、单/多图参考、多角度生成、局部修改 | `POST /api/workflows/component-generator` |
| 图像遮罩和标记 | 图像遮罩/分区标记 | 画笔、橡皮、多边形、分区列表、应用遮罩 | `POST /api/mask/apply` |
| LoRA 素材库 | LoRA素材库 | CMF、零部件、客室风格三类 LoRA 管理 | `GET/POST /api/lora` |
| LoRA 本地训练 | LoRA训练 | 训练集上传、训练参数、训练任务状态 | `POST /api/lora/train` |
| 2D 生 3D | 2D生3D | 多角度图上传、OBJ/FBX/GLB/STL 格式选择、模型预览 | `POST /api/workflows/image-to-3d` |
| 自动报告 | 自动报告生成 | 选择素材，生成 Word/PPT 报告 | `POST /api/reports/generate` |
| 资源库 | 资源库 | 图片、模型、材质、报告统一管理 | `GET/POST /api/resources` |
| AI 助手 | AI助手抽屉 | 右下角入口，支持设计边界、提示词和报告摘要问答 | `POST /api/assistant/chat` |
| 管理员/普通用户 | 用户与权限 | 管理员可发布工作流和管理共享资源，普通用户调用已发布功能 | `GET/POST /api/permissions` |

## 6. 当前页面清单

1. 登录页
2. 首页主视觉
3. 客室效果生成
4. CMF生成器
5. 客室零部件生成器
6. 图像遮罩/分区标记弹窗
7. LoRA素材库
8. LoRA训练
9. 2D生3D
10. 自动报告生成
11. 资源库
12. 用户与权限
13. AI助手抽屉

## 7. 关键交互

- `data-screen` 控制页面切换。当前 JS 会读取按钮上的 `data-screen`，显示对应 `#screen-*` 容器。
- 登录按钮进入首页，但未做真实鉴权。
- 首页按钮和功能卡片可跳转到已有模块。
- 客室效果和生成类模块提供“屏幕捕捉”按钮，打开浮动捕捉窗口，表达实时框选并传入工作流的交互概念。
- 局部遮罩入口会切换到图像遮罩/分区标记页面。
- 右下角 AI 按钮会打开或关闭 AI 助手抽屉。

## 8. 接口对接建议

### 8.1 工作流服务

工作流应由管理员在 ComfyUI 中调试、发布，前端只调用已发布 API。每个工作流建议返回统一结构：

```json
{
  "workflowId": "cabin-render",
  "jobId": "job_20260710_001",
  "status": "queued",
  "queue": "local-gpu",
  "inputs": {
    "prompt": "...",
    "negativePrompt": "...",
    "images": [],
    "mask": null,
    "lora": []
  }
}
```

任务查询建议：

```http
GET /api/jobs/{jobId}
```

结果保存建议：

```http
POST /api/resources
```

### 8.2 资源权限

当前权限模型仍需甲方确认。建议至少区分：

- 管理员用户：工作流编辑与发布、资源全量增删改查、共享管理、LoRA 训练和发布。
- 普通用户：使用已发布工作流、查询共享资源、上传本人内容、管理本人生成记录。

### 8.3 文件上传

建议统一上传接口，返回资源 ID：

```http
POST /api/uploads
```

上传类型：

- `reference_image`
- `mask_image`
- `cad_export`
- `white_model_screenshot`
- `lora_dataset`
- `report_asset`

## 9. 后续开发注意事项

- 当前 CSS 是单文件 Demo，正式开发应拆成 token、layout、component 三层样式。
- 生成类页面的左侧参数面板可以抽象成配置驱动表单，避免每个工作流重复开发。
- 工作流 API 参数不应写死在组件中，应来自后端发布的 workflow schema。
- 资源库、任务队列、AI 助手需要独立状态管理。
- 屏幕捕捉功能真实实现时需要确认浏览器权限、系统权限和内网安全策略。
- 2D 生 3D 的模型预览后续建议接入 Three.js 或模型预览组件；当前 Demo 只做静态占位。
- 报告生成需区分 Word/PPT 模板、素材引用、生成记录和下载权限。

## 10. 待甲方确认

- 管理员与普通用户的最终权限边界。
- 工作流发布流程是否需要审批。
- LoRA 训练是否开放给普通用户申请。
- 资源库是否按项目、部门、个人、共享四级组织。
- 报告模板是否采用中车研究院固定汇报模板。
- 屏幕捕捉传入工作流是否需要保留操作记录。
- 生成结果是否需要版本对比和人工评分。

