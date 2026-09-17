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
