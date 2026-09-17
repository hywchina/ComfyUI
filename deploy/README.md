# ComfyUI 单镜像部署

## 文件与构建

`Dockerfile` 是本项目唯一业务镜像配方；`deploy/config.env` 保存硬件和端口设置，`deploy/compose.yaml` 只启动一个 ComfyUI 容器。

rail-system 根 Compose 的 ComfyUI 构建上下文同步指向 `code/ComfyUI`，原 `docker/ComfyUI/Dockerfile` 和 ignore 文件是指向本项目的软链接。根目录使用 `COMFYUI_IMAGE=rail-comfyui:cuda13-local`，避免本地测试与整体编排使用不同镜像。根部署目录目前不是 Git 仓库；这些整合配置随 rail-system 目录交付，ComfyUI 代码及构建配方提交在本仓库。

```bash
bash set_env.sh
bash deploy/build.sh
# 确认本机推理队列已结束，停止占用同一 GPU 的本地 ComfyUI 后再执行：
bash deploy/run.sh
.venv/bin/python script_examples/test_exported_workflows.py \
  --url http://127.0.0.1:18188 --output .runtime/container-workflows
```

构建机需有当前自定义节点源码目录（不仅是 ComfyUI 主 Git 仓库）、固定依赖的 `.venv` 和 uv 缓存。`prepare_build.py` 校验包版本、Git 依赖提交及缓存文件 RECORD，生成 320 个离线 wheel；构建通过只读 BuildKit 挂载安装，wheel、`.venv` 和模型均不复制进最终镜像。`deploy/patches` 保存对第三方节点的必要修复，构建脚本幂等应用，不向第三方仓库推送。

默认基镜像为 Python 3.12 slim。Ubuntu 为宿主机；容器使用该镜像自己的 Linux 用户空间。Python 基镜像和 apt 系统依赖准备仍需联网，构建完成后的镜像可 `docker save` 交付内网并 `docker load`，目标机不需要 pip 或 Git 联网安装。构建需要支持 `COPY --exclude` 和 bind mount 的近期 Docker BuildKit。

## 硬件配置

| 配置 | 用途 |
| --- | --- |
| `PYTHON_IMAGE` | 构建基镜像，可固定 digest |
| `TORCH_CUDA_VERSION` | 构建时校验当前 wheel 的 CUDA 版本，当前为 13.0；不会自动替换 PyTorch |
| `COMFYUI_GPU_ID` | 选择一张 NVIDIA GPU，当前为 0 |
| `COMFYUI_VRAM_MODE` | normal / low / high，默认 normal |
| `COMFYUI_RESERVE_VRAM` | 为桌面等其他进程预留显存 GB，默认 1 |
| `COMFYUI_CPU_THREADS` / `COMFYUI_SHM_SIZE` | CPU 线程和共享内存 |
| `COMFYUI_HOST_PORT` / `COMFYUI_BIND_IP` | 宿主端口和绑定地址，默认仅本机 18188 |
| `COMFYUI_NETWORK_INTERNAL` | 默认 false 以发布宿主端口；true 用于 Linux 宿主直连容器 IP 的断网验收 |
| `COMFYUI_MODEL_DIR` | 外部模型目录，只读挂载 |
| `COMFYUI_DATA_DIR` | 输入、输出、用户数据和缓存，独立可写挂载 |

3090 和 4090 的 GPU 选择及显存策略通常在运行时调整，无需仅因显卡型号不同重建镜像。当前依赖采用 CUDA 13.0；目标机需要兼容驱动及 NVIDIA Container Toolkit。CUDA 13.0 GA 的 Linux 驱动基线为 580.65.06，本机为 595.91.07。更换 CUDA 大版本需要重新验证依赖清单，不能只修改校验变量。[NVIDIA CUDA 13.0 发布说明](https://docs.nvidia.com/cuda/archive/13.0.0/pdf/CUDA_Toolkit_Release_Notes.pdf)、[Docker Compose GPU 配置](https://docs.docker.com/compose/how-tos/gpu-support/)。

本机实测为 3090，4090 尚未实机验证。

## 离线交付

构建机验证通过后导出一个业务镜像：

```bash
docker save -o ../../images/comfyui.tar rail-comfyui:cuda13-local
(cd ../../images && sha256sum comfyui.tar > comfyui.tar.sha256)
```

目标机预装 Docker Engine、Compose、兼容 NVIDIA 驱动和 Container Toolkit，复制模型目录和部署文件后，在 ComfyUI 项目目录执行：

```bash
(cd ../../images && sha256sum -c comfyui.tar.sha256)
docker load -i ../../images/comfyui.tar
# 按目标机修改 deploy/config.env，再启动：
bash deploy/run.sh
```

目标机使用已构建镜像，无需安装 `.venv` 或执行 `set_env.sh`。当前仅交付 ComfyUI；其他子项目仍需分别验收，根目录的全系统镜像导出命令暂不能作为本次单服务交付命令。

## 模型与网络

模型仍由 `rail-system/models/comfyui_models` 管理，挂载到 `/app/ComfyUI/models`；模型目录缺失会直接报错，Compose 不会悄悄创建空模型目录。`HYPIR/stable-diffusion-2-1-base` 是 HYPIR 权重之外必需的基础模型，使用显式准备命令 `.venv/bin/python script_examples/prepare_hypir_model.py` 下载并校验固定版本。

容器禁用上游付费 API 节点和 Manager 自动管理，开启 Hugging Face 离线模式。默认 bridge 网络支持宿主发布端口；它本身不阻断外网，目标企业内网的网络隔离仍由部署环境提供。容器内部为 HTTP，本地 `.venv` 服务的 HTTPS 证书不打入镜像。面向局域网交付时可在平台统一入口终止 TLS。

断网验收可设置 `COMFYUI_NETWORK_INTERNAL=true`，使用无外网出口的网络。在本机 Docker 29 中，仅连接 internal 网络的容器未生成端口发布；此时从 Linux 宿主使用 `docker inspect` 查到的容器 IP 和 8188 端口调用。切换网络模式需先 `docker compose --env-file deploy/config.env -f deploy/compose.yaml down`，再用新设置启动；持久化目录不会删除。验收同时覆盖 internal 模式的完整推理与默认模式的宿主端口访问。[Docker 网络说明](https://docs.docker.com/engine/network/)、[端口发布说明](https://docs.docker.com/engine/network/port-publishing/)。

输入、输出和用户数据在 `.runtime/container-data` 持久化。执行 `docker compose down` 不删除这些 bind mount 数据。不要让本地服务和容器在显存不足的同一张卡上同时推理。

## 验证解释

测试程序逐个提交任务，记录请求、参数缩减、ComfyUI 节点错误、历史和下载结果，每个任务完成后才测试下一个。HTTP 200 和 history success 均不足以判断完整成功：程序还检查跳过分支的 `node_errors`，并通过 HYPIR 状态输出识别原图回退。默认 512 最大输入尺寸、4 步采样、32 token 文本属于功能验证，不代替默认大分辨率画质或性能验收。
