# 提交变更记录

每条记录用唯一英文提交标题对应 Git 提交；可用 `git log --oneline --grep='<标题>'` 查询哈希。仅记录本次 ComfyUI 环境与容器交付相关改造，不包含无关运行缓存。

## C01 — Document sequential ComfyUI deployment validation plan

- 动机：在单卡显存有限的条件下，明确先验证本地工作流、再构建镜像及容器外复测的交付顺序。
- 范围：新增 `DEPLOYMENT_PLAN.md`，列出 18 份导出工作流的串行测试、失败处理、模型挂载、硬件边界及提交划分；建立本文件。
- 注意事项：小尺寸、少步数测试属于接口和推理链路验证；不能表述为原始分辨率画质验收，也不能把 3090 结果当成已经实测 4090。
- 验证：已确认当前分支 `dev` 与 `origin/dev` 一致，本机 GPU、服务队列及导出文件数量已核对。

## C02 — Pin the ComfyUI Python environment and add uv setup

- 动机：将开发机 Conda 环境转为项目独立、可重复安装的 Python 环境，为镜像封装提供固定版本基线。
- 范围：导出原始 Conda 快照，保留原项目核心 requirements，生成可安装的固定版本清单；新增 `set_env.sh` 与环境说明。
- 改造细节：使用 uv 管理的 Python 3.12.13 创建 `.venv`；固定 CUDA 13.0 PyTorch 版本集合；检查共享模块覆盖顺序，恢复 OpenCV 标准版和 ONNX Runtime GPU 版。
- 注意事项：排除源码已经不存在的 comfystream editable 项；原环境的两项 comfyui 包声明冲突保留并说明。虚拟环境、权重、下载缓存不进入 Git。
- 验证：320 个包版本对照通过；脚本重复执行、核心导入、OpenCV、ONNX CUDA 后端及 RTX 3090 CUDA 张量运算通过。

## C03 — Restart the project HTTPS service with its local virtualenv

- 动机：移除旧开发目录和 Conda 的硬编码，避免重启误停其他项目，并确保报告成功时 API 已真正就绪。
- 范围：改写 HTTPS 重启脚本；导出脚本同步使用新的 CA 默认路径；忽略 `.runtime` 私钥、PID 与运行记录。
- 改造细节：按脚本位置定位项目，显式使用 `.venv/bin/python`；基于进程工作目录筛选当前项目；增加重启锁、端口检查、独立后台会话、证书验证和 `/system_stats` 就绪等待。端口、IP、证书目录和超时支持环境变量。
- 注意事项：不提交证书私钥；占用端口的其他服务不会被停止。首次访问客户端仍需信任本地 CA。
- 验证：启动及再次重启通过；HTTPS/WSS、上传、任务提交、历史和结果下载通过，且测试未跳过证书验证。

## C04 — Link the complete models directory to the shared model bundle

- 动机：落实 code 保存代码、models 集中保存权重的目录约定，避免模型进入 Git 或镜像。
- 范围：将项目 `models` 整体改为 `../../models/comfyui_models` 相对软链接，替代旧目录中的已跟踪占位文件和配置。
- 注意事项：配置和占位文件实体已保留在共享模型目录，没有删除模型；新机器需要同时交付 rail-system/models，单独 clone 代码不足以加载模型。Docker 通过挂载覆盖 `/app/ComfyUI/models`，不复制该软链接的目标内容。
- 验证：相对链接解析正确；已有模型文件、工作流模型引用及 Qwen 分片完整性已检查；本机工作流可通过原 models 路径读取权重。

## C05 — Add serial API execution tests for exported workflows

- 动机：节点存在或 HTTP 200 不等于整个导出工作流能推理，需要在单卡资源限制下逐项验收。
- 范围：新增 `script_examples/test_exported_workflows.py`，支持 URL、CA、工作流目录、单项筛选、排除项、尺寸、步数和超时。
- 改造细节：通过上传接口提供小尺寸输入，填充截图和打标图片；保留模型与图结构，逐个提交任务并等待历史完成；检查部分输出分支的 node_errors，显式读取 HYPIR 的状态输出，下载生成文件；每轮卸载模型，队列非空时拒绝混入其他任务。请求与结果写入 `.runtime`，不提交测试图片。
- 注意事项：默认 512 尺寸、4 步和 32 token 是功能烟测参数；HYPIR 为 2 倍放大，3D 使用较小体素分辨率。遇到超时只取消本次任务，队列未清空则停止继续提交。
- 验证：16 个非 HYPIR 工作流完成严格本地串行验证；验证程序发现并暴露 HYPIR 原图回退与分区工作流跳过推理的问题，相关修复另拆提交。

## C06 — Connect regional editing outputs to the inference graph

- 动机：两份分区编辑 API 缺少 `sum_stack_flux2_Klein.context` 连接；ComfyUI 会跳过无效推理分支，仍返回成功的输入图或空预览。
- 范围：仅修改 0729、0804 两份分区编辑导出 JSON。
- 改造细节：明确连接模型加载器到 Flux2 条件堆；0729 的预览连接采样结果；0804 的 SaveImage 从保存输入图改为保存采样输出。模型、提示词和采样参数保持不变。
- 注意事项：原浏览器画布的隐式广播不能代替 API JSON 中的显式连接；后续重新导出应再次执行严格测试，避免旧画布覆盖已修复 API。
- 验证：两项分别完整执行，node_errors 为空，生成文件可下载；随后在 16 项本地回归中再次通过。

## C07 — Report HYPIR failures and prepare its pinned base model

- 动机：HYPIR 基础模型缺失时原节点会返回输入图及错误字符串，任务历史却显示成功，导致报告错误地将未推理图像当作修复结果。
- 范围：保存可审查、可重放的第三方节点补丁；新增两项异常传播回归测试；增加基础模型准备脚本和固定文件校验清单。
- 改造细节：加载失败抛出明确错误，推理失败清理模型引用后抛错；下载模型到临时目录，按固定提交的 Git blob 或 LFS SHA-256 验证，全部通过后再整体发布。支持断点续传；不把权重提交到 Git，也不在容器启动时下载。
- 注意事项：仅在 ComfyUI 主仓库保存补丁，不向第三方 upstream 推送。基础模型是 SD2 社区镜像，ModelScope 仅作为同哈希文件传输源；来源与许可保存在模型目录。
- 验证：缺模型必须失败、推理异常必须失败且释放引用，两项测试通过；完整推理复测记录将在模型准备完成后的验收记录中补充。
