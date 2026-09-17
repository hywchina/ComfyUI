# ComfyUI 镜像验收记录（2026-09-17）

本机 HTTPS、断网 GPU 容器、最终镜像宿主发布端口三轮均为 **18/18 通过**，各轮下载 54 个输出文件。所有任务串行执行，每项完成并卸载模型后才提交下一项；检查成功历史、空 node_errors、实际输出和 HYPIR 成功状态。

## 环境与交付物

- 宿主：Ubuntu 24.04.5 LTS，RTX 3090 24 GiB，NVIDIA 驱动 595.91.07。
- 本地 Python 3.12.13；容器 Python 3.12.14；两者 PyTorch 2.12.1+cu130，ComfyUI 源码 0.27.0。
- Docker 29.7.2，Compose 5.4.0；容器成功使用 CUDA 13.0 和 RTX 3090。
- 最终镜像：`rail-comfyui:cuda13-local`。
- 镜像 ID：`sha256:4ede7bb21dcddfca9324e7701ea90a90acf6335ea2e023f2cca6311b7c1158a7`。
- 镜像代码版本：`7ed29cc643d18b180862489e7d15d1e8f18b5931`；本验收文档作为后续独立文档提交。
- 离线包：`rail-system/images/comfyui.tar`，4743064576 字节（约 4.42 GiB）。
- 包 SHA-256：`3a274f334d46a096800c020832b1807f0828c2e25e7b8431431b0c74523811ba`。
- 配套文件：`comfyui.tar.sha256`、`comfyui.manifest.json`；校验和 docker load 回读均通过，回读后镜像 ID 一致。
- 模型：`rail-system/models/comfyui_models` 只读挂载至 `/app/ComfyUI/models`；空模型镜像检查通过，镜像不含宿主虚拟环境、wheel 缓存或运行证书目录。

## 完整工作流结果

时间为单项测试客户端计时秒数，包含请求准备、上传、执行等待和输出下载，不能作为纯推理性能基准。三轮总计分别为 228.97、224.13、226.57 秒。

| 导出工作流 | 本地 HTTPS 秒 | 断网容器秒 | 最终宿主端口秒 | 结果 |
| --- | ---: | ---: | ---: | --- |
| image_flux2_klein_9b_kv_image_edit.json | 14.15 | 8.47 | 6.44 | 通过 |
| image_flux2_klein_image_edit_9b_base.json | 10.31 | 10.27 | 10.05 | 通过 |
| 🚩Qwen-2511-镜头选择自由控制调整-单角度-0804.json | 36.41 | 36.27 | 36.59 | 通过 |
| 🚩Qwen-2511-镜头选择自由控制调整-多角度-0804.json | 64.27 | 64.22 | 68.24 | 通过 |
| 🚩flux2-klein-01-文生图-0729.json | 6.33 | 6.36 | 6.01 | 通过 |
| 🚩flux2-klein-01-文生图-lora-0806.json | 6.32 | 6.01 | 6.39 | 通过 |
| 🚩flux2-klein-02-单图编辑-0729.json | 6.05 | 6.39 | 6.11 | 通过 |
| 🚩flux2-klein-02-单图编辑-实时捕获窗口-0729.json | 6.33 | 8.05 | 6.04 | 通过 |
| 🚩flux2-klein-03-双三图编辑-0729.json | 8.22 | 8.54 | 8.35 | 通过 |
| 🚩flux2-klein-04-局部重绘-单图版-0729.json | 6.14 | 6.13 | 6.31 | 通过 |
| 🚩flux2-klein-05-局部重绘-双图版-0729.json | 8.16 | 8.17 | 6.45 | 通过 |
| 🚩flux2-klein-06-扩图-0729.json | 6.37 | 6.38 | 8.1 | 通过 |
| 🚩flux2-klein-分区编辑-打标助手-0729.json | 8.06 | 8.05 | 8.37 | 通过 |
| 🚩flux2-klein-分区编辑-打标助手-0804.json | 8.35 | 8.04 | 8.05 | 通过 |
| 🚩hunyuan-3d-multiview.json | 12.84 | 14.58 | 14.59 | 通过 |
| 🚩llm_qwen3_5_i2t_图片理解.json | 6.32 | 6.07 | 6.37 | 通过 |
| 🚩llm_qwen3_t2t_文本聊天.json | 6.01 | 4.05 | 6.01 | 通过 |
| 🚩放大-0804.json | 8.33 | 8.08 | 8.1 | 通过 |

本地 HTTPS 使用 CA 验证，未跳过证书检查。断网容器通过 Linux 宿主直连容器 IP 调用；网络 internal=true，无默认外网路由，外部 TCP 连接返回网络不可达。最终镜像通过 `http://127.0.0.1:18188` 再次完整执行上述 18 项。

两轮容器使用相同依赖及推理代码；断网轮结束后整理 Compose 网络配置和文档，刷新代码层，再构建最终交付镜像。断网轮镜像 ID 为 `sha256:fb9c7fc911f6a9fe92bddca7d100fddd4253704408942b36acd710e1644d9a03`，最终轮及导出包使用上列最终镜像 ID。

## 接口、挂载与构建检查

- 本地：根页面、system_stats、queue、history、prompt、object_info、WSS、上传、提交任务及结果下载通过；基础上传/下载像素比对通过。
- 最终容器：上述 HTTP 查询及 WS 连接通过，2103 个节点已注册，18 个导出工作流需要的 61 种节点全部存在。所有工作流包含上传、提交、历史查询和输出下载的实际链路。
- Dockerfile 静态检查、Shell 语法、Compose 渲染通过；320 个固定依赖完成离线 wheel 安装，OpenCV 和 ONNX CUDA 后端检查通过。
- HYPIR 异常传播单测 2 项通过。构建时确认补丁可幂等重放。
- 镜像文件系统检查确认未打包权重；运行容器模型挂载 RW=false，输入、输出、用户和缓存均独立持久化。
- 根 rail-system Compose 与双卡示例配置已通过渲染检查；其他子项目未启动、未重新验收。

## 本次实测修复

1. 两份分区编辑导出 API 缺失显式 context 连线，部分输出绕过采样；已连接推理链路和真实生成结果，node_errors 必须为空。
2. HYPIR 缺少 SD2 基础模型，原实现加载或推理失败后返回原图，使任务显示成功；补齐固定版本模型，并将错误改为抛出。模型校验清单及第三方修复补丁已保存。
3. 离线 wheel 重建需保留原 dist-info 名称大小写，避免 PySocks 产生两个元数据目录；已修复。
4. 本机 Docker 仅接 internal 网络时未发布宿主端口；默认使用 bridge，断网验收通过配置切换 internal，分别验证两种访问方式。

HYPIR 新增基础模型资源已纳入根 models/checksums.sha256，共 143 个实体文件；此次对新增文件计算哈希并检查全部路径、相对链接和分片清单，没有重复全量计算已有权重哈希。

## 测试边界

- 默认最大输入尺寸 512、采样最多 4 步、文本最多 32 token；HYPIR 2 倍放大，3D octree_resolution=128。保留模型及图结构，但并非原始大分辨率画质、性能或压力验收。
- 两个原图像素材缺失时使用 input/example.png 作为输入；截图、刷选区域由测试程序构造。参数变更保存在每项 request.json 和 results.json 中。
- 实测显卡为 3090；4090、双卡、甲方服务器尚未实机验收。
- 保留原 Conda 环境的两项包依赖声明冲突，见 ENVIRONMENT.md；本次通过的是所列实际工作流，未声称全部可选节点均可用。
- 本轮范围为 ComfyUI 导出工作流和服务，不是 Vue 平台端到端联调，也不是整套系统部署验收。
- Python 基镜像与 apt 依赖准备需要联网；目标机器用 docker load 交付，无需联网重建。完整源码重建需同时保留自定义节点源码和 uv 缓存，单独 clone 主仓库不够。
- root rail-system 不是 Git 仓库：根 Compose、模型清单和 images 随目录交付；本仓库提交部署代码、补丁和说明。

## 运行状态与复现

验收结束时容器 `rail-comfyui-validation-comfyui-1` 保持运行，健康状态正常，宿主入口为 `http://127.0.0.1:18188`。为避免单卡争用，原本地 HTTPS 8188 服务已暂停；平台原 8188 地址未改为容器地址。

在 ComfyUI 项目根目录：

```bash
# 配置后构建与启动
bash deploy/build.sh
bash deploy/run.sh

# 容器外串行复测
.venv/bin/python script_examples/test_exported_workflows.py \
  --url http://127.0.0.1:18188 --output .runtime/container-workflows

# 如需恢复原 HTTPS 服务，先停止测试容器
docker compose --env-file deploy/config.env -f deploy/compose.yaml stop comfyui
bash restart_comfyui_https.sh
```

离线导入与配置项见 [部署说明](README.md)。不要在同一张显存不足的 GPU 上同时运行本地服务与测试容器的推理任务。

原始证据保存在本项目的 .runtime（不提交图像、日志、证书到 Git）：

- 本地：local-validated、local-hypir-camera、local-hypir-upscale；api-test-result.json。
- 断网：container-offline-workflows、container-offline-inspection.json。
- 最终：container-workflows、container-port-api.json；docker-build-final.log、docker-load.log。
- 每个工作流目录均包含实际请求、完整历史和下载文件；对应 results.json 保存状态、参数变更、计时和 prompt_id。

英文提交与逐条中文变更说明见 [commitlog.md](../commitlog.md)。
