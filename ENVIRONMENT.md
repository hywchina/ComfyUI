# 本地 uv 环境

来源：Conda `ComfyUI_312`，Python 3.12.13，Linux x86_64，PyTorch CUDA 13.0。原 Conda 环境不修改；`.venv` 使用 uv 管理的 Python，与 Conda 独立。

```bash
cd /home/huyanwei/projects/rail-system/code/ComfyUI
./set_env.sh
source .venv/bin/activate
python main.py --listen 0.0.0.0 --port 8188
```

`requirements.txt` 固定原环境各包版本，包含已安装的自定义节点依赖。脚本用 `uv pip sync` 同步快照，重复执行可恢复这些版本。模型继续通过 `models -> ../../models/comfyui_models` 访问。若 8188 已被占用，测试时改用其他端口。

- `requirements.conda-export.txt`：原环境 `pip freeze --all` 原始输出，仅用于审计。
- `requirements.upstream.txt`：本次替换前项目原有的核心依赖清单。
- `requirements.txt`：可安装快照；将 Conda 构建机的 pip 文件路径改为 `pip==26.1.2`。原 `comfystream==0.1.8` editable 源目录已不存在，排除该失效项；如需该节点，须恢复源码后另行安装。

原环境已有 `comfyui==0.3.66`（hiddenswitch Git 包）的两项声明冲突：要求 `av<16`、`numpy<2.3`，实际为 `av==17.1.0`、`numpy==2.3.5`。本次保持已安装版本，工作流兼容性由后续业务测试确认。`uv pip check --python .venv/bin/python` 可查看依赖检查结果。

原环境还同时安装了三种 OpenCV 包，以及 ONNX Runtime 的 CPU/GPU 包；这些发行包分别共享同一个 Python 模块目录。脚本检查并恢复原环境实际生效的 `opencv-python==5.0.0.93` 和 `onnxruntime-gpu==1.27.0`，避免并行安装顺序不同造成导入失败或意外使用 CPU 版本。检查 ONNX Runtime 前先导入 PyTorch，以加载随环境安装的 CUDA 动态库。

本机首次安装时，7 个大型 CUDA/ONNX 依赖复用了原 Conda 安装：按包的 RECORD 哈希校验文件后重打包为本地 wheel，由 uv 安装。没有把 Conda 的 site-packages 加入新环境的搜索路径。

已验证：320 个包版本与源环境一致（仅排除失效的 comfystream，PyTorch 系列带显式 `+cu130` 标识）；脚本重复执行通过；核心库和 OpenCV 导入通过，ONNX CUDA 后端可见，RTX 3090 CUDA 张量运算通过，`main.py --help` 通过。未启动服务或运行工作流。

首次安装需要联网下载 Python、Python 包及三个固定提交的 Git 依赖。这份清单不等同于离线安装包；后续 Docker 离线交付需在联网构建机完成安装并导出镜像，系统库和 GPU 驱动也不包含在 pip 清单中。

## HTTPS 启动与重启

```bash
bash restart_comfyui_https.sh
```

脚本从自身位置确定项目目录，使用 `.venv/bin/python`；仅停止当前项目目录内的 `main.py` 进程。后台服务使用独立会话，终端命令结束后继续运行。脚本会验证证书并等待 `/system_stats` 就绪；端口被其他服务占用时会报错，不停止其他项目。

可通过环境变量设置 `COMFYUI_PORT`（默认 8188）、`COMFYUI_HTTPS_IP`（默认本机首个地址）、`COMFYUI_HTTPS_NAME`（默认主机名）、`COMFYUI_HTTPS_CERT_DIR`（默认 `.runtime/https`）、`COMFYUI_START_TIMEOUT`（默认 180 秒）。证书和 PID 放在已忽略的 `.runtime`，每次启动日志写入 `logs/*_https.log`。

本机复用了原开发项目的本地 CA 和服务器证书。浏览器使用 HTTPS 时需信任 `.runtime/https/comfyui-local-ca.crt`；仅分发 CA 公钥证书，不分发私钥。

API 检查使用 CA 验证（未跳过 TLS 验证）：主页、系统状态、节点列表、队列、历史、WebSocket、上传图片、提交 LoadImage → SaveImage 任务、查询成功历史、下载并核对图片像素均通过。本机局域网地址的 HTTPS 请求也通过。共注册 2334 个节点，平台工作流引用的 59 类节点全部存在。结果在 `.runtime/api-test-result.json`，测试图片在 `input/api-smoke` 和 `output/api-smoke`。这些检查不代表已执行大模型生成工作流。

启动日志仍有可选功能告警，包括 HYPIR 缺少基础/管理模块、LayerStyle 的 OpenCV guidedFilter 不可用及 GLM 依赖缺失；上述 API 检查及平台所需节点注册检查通过，这些可选功能需在对应业务测试中另行确认。
