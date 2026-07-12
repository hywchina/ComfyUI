# 轨道交通客室智能快速设计工具：前端开发交接包

本目录用于把当前 UI Demo、后续系统架构和实施计划放在同一处，方便产品、UI、前端、后端和算法团队快速理解项目边界并开始开发。

## 文件清单

```text
frontend-handoff-package/
  README.md
  01_架构设计说明.md
  02_前端Demo说明.md
  03_后续开发计划.md
  frontend-demo/
    rail-cabin-ai-prototype.html
    assets/
      crrc-logo.png
      crrc-fuxing-train.jpg
      cabin-home-hero.png
```

## 建议阅读顺序

1. 阅读 `01_架构设计说明.md`，理解系统边界、API 分类和前后端职责。
2. 打开 `frontend-demo/rail-cabin-ai-prototype.html`，查看当前页面结构和核心交互。
3. 阅读 `02_前端Demo说明.md`，了解页面、样式、代码和服务范围的对应关系。
4. 按 `03_后续开发计划.md` 分阶段完成工程化和 API 对接。

## 当前结论

当前 HTML 是 UI 原型，不是生产前端。正式系统应建设独立的平台前端和平台后端，由平台后端分别适配 ComfyUI、AI Toolkit、DeepSeek 以及后续可能增加的 2D 生 3D、报告生成等服务。浏览器端不得直接保存或调用模型服务密钥，也不得依赖 ComfyUI 节点编号或 AI Toolkit 内部实现。

