import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const root = "/Users/huyanwei/Desktop/UI原型设计";
const screenshotDir = path.join(root, "03_页面截图");
const inputDir = path.join(root, "01_原始输入");
const finalPptx = path.join(root, "04_交付文档", "UI原型设计说明.pptx");
const previewDir = path.join(root, "05_工作文件", "ppt_workspace", "tmp", "preview");

const W = 1280;
const H = 720;
const C = {
  red: "#c7001a",
  darkRed: "#a90016",
  softRed: "#fff0f2",
  ink: "#151922",
  text: "#334155",
  muted: "#64748b",
  line: "#e5e7eb",
  bg: "#f7f8fa",
  white: "#ffffff",
  green: "#18a058",
};

async function imageBytes(filePath) {
  const bytes = await fs.readFile(filePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function addText(slide, text, x, y, w, h, opts = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    fontSize: opts.size ?? 20,
    bold: opts.bold ?? false,
    color: opts.color ?? C.text,
    alignment: opts.alignment ?? "left",
  };
  return shape;
}

function addPill(slide, text, x, y, w, color = C.red) {
  const pill = slide.shapes.add({
    geometry: "roundRect",
    position: { left: x, top: y, width: w, height: 30 },
    fill: color === C.red ? C.softRed : "#f1f5f9",
    line: { style: "solid", fill: color === C.red ? "#ffd7dd" : C.line, width: 1 },
    borderRadius: "rounded-full",
  });
  pill.text = text;
  pill.text.style = { fontSize: 16, bold: true, color };
  return pill;
}

function addCard(slide, x, y, w, h, opts = {}) {
  return slide.shapes.add({
    geometry: "roundRect",
    position: { left: x, top: y, width: w, height: h },
    fill: opts.fill ?? C.white,
    line: { style: "solid", fill: opts.line ?? C.line, width: opts.lineWidth ?? 1 },
    borderRadius: opts.radius ?? "rounded-xl",
    shadow: opts.shadow ?? "shadow-sm",
  });
}

async function addImage(slide, file, x, y, w, h, opts = {}) {
  const blob = await imageBytes(file);
  slide.images.add({
    blob,
    contentType: "image/png",
    alt: opts.alt ?? path.basename(file),
    fit: opts.fit ?? "contain",
    position: { left: x, top: y, width: w, height: h },
    geometry: "roundRect",
    borderRadius: opts.radius ?? "rounded-xl",
  });
}

function titleSlide(slide, title, subtitle, section = "UI PROTOTYPE") {
  slide.background.fill = C.white;
  addText(slide, section, 64, 50, 340, 32, { size: 16, bold: true, color: C.red });
  addText(slide, title, 64, 128, 610, 150, { size: 54, bold: true, color: C.ink });
  addText(slide, subtitle, 68, 304, 560, 90, { size: 24, color: C.text });
  addCard(slide, 64, 556, 520, 82, { fill: C.softRed, line: "#ffd7dd" });
  addText(slide, "交付内容：源文件归档、页面截图、设计说明 PPT、开发迁移说明 MD", 92, 582, 470, 36, { size: 18, bold: true, color: C.darkRed });
}

function slideTitle(slide, title, subtitle) {
  addText(slide, title, 58, 42, 1110, 52, { size: 38, bold: true, color: C.ink });
  if (subtitle) addText(slide, subtitle, 60, 92, 900, 34, { size: 18, color: C.muted });
  slide.shapes.add({
    geometry: "rect",
    position: { left: 58, top: 130, width: 1164, height: 2 },
    fill: C.red,
    line: { style: "solid", fill: C.red, width: 0 },
  });
}

function addBullets(slide, items, x, y, w, lineHeight = 44, size = 20) {
  items.forEach((item, i) => {
    slide.shapes.add({
      geometry: "ellipse",
      position: { left: x, top: y + i * lineHeight + 9, width: 9, height: 9 },
      fill: C.red,
      line: { style: "solid", fill: C.red, width: 0 },
    });
    addText(slide, item, x + 22, y + i * lineHeight, w - 22, lineHeight - 2, { size, color: C.text });
  });
}

const shots = {
  login: path.join(screenshotDir, "01_登录页.png"),
  home: path.join(screenshotDir, "02_首页主视觉.png"),
  cabin: path.join(screenshotDir, "03_客室效果生成.png"),
  cmf: path.join(screenshotDir, "04_CMF生成器.png"),
  part: path.join(screenshotDir, "05_客室零部件生成器.png"),
  mask: path.join(screenshotDir, "06_图像遮罩分区标记.png"),
  lora: path.join(screenshotDir, "07_LoRA素材库.png"),
  train: path.join(screenshotDir, "08_LoRA训练.png"),
  model3d: path.join(screenshotDir, "09_2D生3D.png"),
  report: path.join(screenshotDir, "10_自动报告生成.png"),
  resource: path.join(screenshotDir, "11_资源库.png"),
  users: path.join(screenshotDir, "12_用户与权限.png"),
  assistant: path.join(screenshotDir, "13_AI助手抽屉.png"),
};

async function main() {
  await fs.mkdir(path.dirname(finalPptx), { recursive: true });
  await fs.mkdir(previewDir, { recursive: true });

  const presentation = Presentation.create({ slideSize: { width: W, height: H } });

  {
    const slide = presentation.slides.add();
    titleSlide(
      slide,
      "轨道交通客室智能快速设计工具 UI 原型说明",
      "把 PDF 与需求截图中的功能清单转化为面向设计师的多模态生成工作台。"
    );
    await addImage(slide, shots.home, 702, 96, 500, 420, { fit: "cover", alt: "首页主视觉截图" });
    addPill(slide, "#c7001a 中车红", 710, 550, 170);
    addPill(slide, "ComfyUI API 封装", 900, 550, 210, C.darkRed);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    slideTitle(slide, "原始需求指向一个工作台，而不是节点编辑器", "需求来自项目 PDF、用户补充截图和对 LibLibAI WebUI 风格的多轮确认。");
    addCard(slide, 64, 166, 360, 430, { fill: C.white });
    addText(slide, "需求来源", 92, 196, 260, 38, { size: 26, bold: true, color: C.red });
    addBullets(slide, [
      "本地 Docker 部署 ComfyUI 服务",
      "通过 API 调用已发布工作流",
      "覆盖效果图、CMF、零部件、LoRA、3D 与报告",
      "面向设计师隐藏节点复杂度"
    ], 94, 262, 300, 54, 19);
    await addImage(slide, path.join(inputDir, "codex-clipboard-2ac5e685-35a2-4059-97f2-9ed4aa2bc935.png"), 470, 164, 336, 250, { fit: "cover", alt: "首页参考图" });
    await addImage(slide, path.join(inputDir, "codex-clipboard-cd887c20-f121-43d6-8c6b-c52e75bea537.png"), 838, 164, 336, 250, { fit: "cover", alt: "中车红取色参考" });
    addText(slide, "UI 响应", 472, 456, 700, 36, { size: 28, bold: true, color: C.ink });
    addBullets(slide, [
      "保留 WebUI 的高密度参数输入与任务队列",
      "新增首页主视觉，用于项目汇报时解释平台价值",
      "整体主色从蓝色调整为中车红，贴近品牌官网"
    ], 474, 508, 680, 42, 19);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = C.white;
    slideTitle(slide, "信息架构把复杂生成流程压缩为六个入口", "LoRA 与权限管理保留在顶部入口和管理页中，主 Tab 只承载设计效果实现链路。");
    const cards = [
      ["首页", "平台定位、功能概览、进入设计"],
      ["客室效果生成", "平面图、白模、提示词和遮罩修改"],
      ["CMF生成器", "面料、地板、墙板纹样生成"],
      ["零部件生成", "文生图、参考图、多角度和局部修改"],
      ["2D生3D", "多角度图生成三维模型数据"],
      ["自动报告", "素材选择、Word/PPT 报告草稿"]
    ];
    cards.forEach((c, i) => {
      const x = 70 + (i % 3) * 385;
      const y = 178 + Math.floor(i / 3) * 190;
      addCard(slide, x, y, 330, 138, { fill: i === 0 ? C.softRed : C.white, line: i === 0 ? "#ffd7dd" : C.line });
      addText(slide, c[0], x + 24, y + 24, 270, 36, { size: 28, bold: true, color: i === 0 ? C.red : C.ink });
      addText(slide, c[1], x + 24, y + 72, 270, 46, { size: 18, color: C.text });
    });
    addText(slide, "辅助能力：LoRA 素材库、LoRA 训练、资源库、用户权限、AI 助手", 74, 600, 950, 34, { size: 22, bold: true, color: C.darkRed });
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    slideTitle(slide, "登录页和首页负责建立品牌感与使用上下文", "登录页增加验证码，首页只改变内容区，顶部状态栏和工作流导航保持稳定。");
    await addImage(slide, shots.login, 70, 170, 520, 340, { fit: "cover", alt: "登录页截图" });
    await addImage(slide, shots.home, 650, 170, 520, 340, { fit: "cover", alt: "首页截图" });
    addBullets(slide, [
      "中车 Logo 和中车红建立品牌识别",
      "首页强调多模态输入、方案生成、API 调用和交付闭环",
      "按钮和卡片直接跳转到现有设计模块"
    ], 100, 548, 1030, 38, 18);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = C.white;
    slideTitle(slide, "客室效果生成页承接核心设计工作流", "这是首屏主工作台，完整展示输入、参数、画布、任务队列和保存动作。");
    await addImage(slide, shots.cabin, 58, 158, 760, 446, { fit: "cover", alt: "客室效果生成截图" });
    addCard(slide, 858, 158, 330, 446, { fill: C.white });
    addText(slide, "需求响应", 888, 190, 230, 34, { size: 28, bold: true, color: C.red });
    addBullets(slide, [
      "上传平面图、白模截图或参考图",
      "支持屏幕捕捉实时传入工作流",
      "显示当前 API、Checkpoint 和 LoRA",
      "生成结果可局部遮罩修改并保存资源库"
    ], 888, 250, 260, 50, 18);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    slideTitle(slide, "CMF 生成器把材质图案从独立任务变成可复用资产", "面料、地板和墙板纹样沿用同一套输入、生成、预览、保存结构。");
    await addImage(slide, shots.cmf, 62, 166, 760, 430, { fit: "cover", alt: "CMF生成器截图" });
    addCard(slide, 860, 166, 330, 430, { fill: C.white });
    addText(slide, "UI 处理", 890, 198, 230, 34, { size: 28, bold: true, color: C.red });
    addBullets(slide, [
      "左侧参数区保留文生图和参考图融合",
      "结果区以材质卡片展示生成资产",
      "LoRA 信息显性呈现，便于追溯模型来源",
      "保存后进入 CMF 材质库继续复用"
    ], 890, 260, 260, 48, 18);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = C.white;
    slideTitle(slide, "零部件生成和遮罩编辑共同支持局部设计迭代", "零部件页面负责多角度方案，遮罩页负责对图像局部区域做标记和重绘。");
    await addImage(slide, shots.part, 62, 158, 545, 354, { fit: "cover", alt: "零部件生成截图" });
    await addImage(slide, shots.mask, 664, 158, 545, 354, { fit: "cover", alt: "遮罩编辑截图" });
    addBullets(slide, [
      "零部件：支持单图/多图参考、多角度生成和后续建模",
      "遮罩：提供画笔、分区列表、提示词和应用遮罩动作",
      "设计重点是把复杂图像处理变成设计师可理解的画板入口"
    ], 86, 550, 1080, 38, 18);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    slideTitle(slide, "LoRA 管理和训练作为能力入口存在，不干扰主设计流程", "顶部保留 LoRA 训练入口，素材库和训练页用于管理员或授权用户维护模型资产。");
    await addImage(slide, shots.lora, 70, 166, 520, 360, { fit: "cover", alt: "LoRA素材库截图" });
    await addImage(slide, shots.train, 650, 166, 520, 360, { fit: "cover", alt: "LoRA训练截图" });
    addBullets(slide, [
      "素材库按 CMF、零部件、客室风格三类组织",
      "训练页表达数据集上传、参数调整和训练队列状态",
      "正式开发时需要结合权限系统控制训练和发布能力"
    ], 100, 564, 1030, 38, 18);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = C.white;
    slideTitle(slide, "2D 生 3D 将图像生成结果延伸到模型数据", "该页面表达多角度图上传、格式选择、模型预览和导出资源库的业务闭环。");
    await addImage(slide, shots.model3d, 74, 162, 760, 430, { fit: "cover", alt: "2D生3D截图" });
    addCard(slide, 872, 162, 300, 430, { fill: C.softRed, line: "#ffd7dd" });
    addText(slide, "开发提示", 904, 206, 220, 34, { size: 28, bold: true, color: C.red });
    addBullets(slide, [
      "当前为静态模型预览占位",
      "后续可接入 Three.js 或模型查看器",
      "导出格式包括 OBJ、FBX、GLB、STL"
    ], 904, 270, 230, 50, 18);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    slideTitle(slide, "自动报告和资源库把生成结果变成可交付资产", "报告页负责汇总项目素材，资源库负责沉淀图片、材质、模型和文档。");
    await addImage(slide, shots.report, 64, 164, 540, 370, { fit: "cover", alt: "自动报告截图" });
    await addImage(slide, shots.resource, 658, 164, 540, 370, { fit: "cover", alt: "资源库截图" });
    addBullets(slide, [
      "报告生成：选择素材、生成章节、导出 Word/PPT",
      "资源库：统一管理生成图片、CMF 材质、3D 模型和报告文档",
      "正式系统需要补充项目维度、版本记录和下载权限"
    ], 92, 572, 1060, 38, 18);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = C.white;
    slideTitle(slide, "权限和 AI 助手补足协作与知识支持", "管理员负责工作流发布和共享资源，普通用户调用已发布能力；AI 助手只保留右下角统一入口。");
    await addImage(slide, shots.users, 64, 166, 540, 360, { fit: "cover", alt: "用户权限截图" });
    await addImage(slide, shots.assistant, 660, 166, 540, 360, { fit: "cover", alt: "AI助手截图" });
    addBullets(slide, [
      "权限模型当前是待甲方确认的原型假设",
      "AI 助手支持设计边界、规范、提示词和报告摘要问答",
      "后续需接入真实组织、角色、资源和审计能力"
    ], 92, 564, 1060, 38, 18);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    slideTitle(slide, "后续开发应把 Demo 拆成配置驱动的前端工程", "当前单 HTML 证明了页面结构，下一步要把工作流 schema、任务队列和资源管理接入真实服务。");
    const cols = [
      ["前端工程", "拆分 AppShell、WorkflowTabs、ParameterPanel、CanvasStage、TaskQueue 等组件。"],
      ["工作流接口", "由后端返回已发布 workflow schema，前端按 schema 渲染参数表单。"],
      ["资源与权限", "资源库、LoRA、报告和用户权限需要独立服务和审计能力。"],
      ["交付物", "本目录已包含源输入、HTML、assets、页面截图、PPT 和 MD 说明。"]
    ];
    cols.forEach((c, i) => {
      const x = 70 + (i % 2) * 575;
      const y = 174 + Math.floor(i / 2) * 188;
      addCard(slide, x, y, 500, 132, { fill: C.white });
      addText(slide, c[0], x + 28, y + 24, 300, 34, { size: 26, bold: true, color: C.red });
      addText(slide, c[1], x + 28, y + 70, 430, 44, { size: 18, color: C.text });
    });
    addText(slide, "建议下一轮确认：权限边界、工作流发布流程、资源组织层级、报告模板和屏幕捕捉安全策略。", 80, 600, 1040, 42, { size: 22, bold: true, color: C.ink });
  }

  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    const png = await presentation.export({ slide, format: "png", scale: 1 });
    await fs.writeFile(path.join(previewDir, `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(previewDir, `${stem}.layout.json`), await layout.text());
  }

  const montage = await presentation.export({ format: "webp", montage: true, scale: 1 });
  await fs.writeFile(path.join(previewDir, "deck-montage.webp"), new Uint8Array(await montage.arrayBuffer()));

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(finalPptx);
  console.log(finalPptx);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
