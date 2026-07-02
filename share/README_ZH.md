<div align="center">

# ComfyUI
**面向内容创作的最强大、最模块化的 AI 引擎。**


[![Website][website-shield]][website-url]
[![Dynamic JSON Badge][discord-shield]][discord-url]
[![Twitter][twitter-shield]][twitter-url]
[![Matrix][matrix-shield]][matrix-url]
<br>
[![][github-release-shield]][github-release-link]
[![][github-release-date-shield]][github-release-link]
[![][github-downloads-shield]][github-downloads-link]
[![][github-downloads-latest-shield]][github-downloads-link]

[matrix-shield]: https://img.shields.io/badge/Matrix-000000?style=flat&logo=matrix&logoColor=white
[matrix-url]: https://app.element.io/#/room/%23comfyui_space%3Amatrix.org
[website-shield]: https://img.shields.io/badge/ComfyOrg-4285F4?style=flat
[website-url]: https://www.comfy.org/
<!-- 用于显示总用户数的变通方法，见 https://github.com/badges/shields/issues/4500#issuecomment-2060079995 -->
[discord-shield]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdiscord.com%2Fapi%2Finvites%2Fcomfyorg%3Fwith_counts%3Dtrue&query=%24.approximate_member_count&logo=discord&logoColor=white&label=Discord&color=green&suffix=%20total
[discord-url]: https://discord.com/invite/comfyorg
[twitter-shield]: https://img.shields.io/twitter/follow/ComfyUI
[twitter-url]: https://x.com/ComfyUI

[github-release-shield]: https://img.shields.io/github/v/release/comfyanonymous/ComfyUI?style=flat&sort=semver
[github-release-link]: https://github.com/comfyanonymous/ComfyUI/releases
[github-release-date-shield]: https://img.shields.io/github/release-date/comfyanonymous/ComfyUI?style=flat
[github-downloads-shield]: https://img.shields.io/github/downloads/comfyanonymous/ComfyUI/total?style=flat
[github-downloads-latest-shield]: https://img.shields.io/github/downloads/comfyanonymous/ComfyUI/latest/total?style=flat&label=downloads%40latest
[github-downloads-link]: https://github.com/comfyanonymous/ComfyUI/releases

<img width="1590" height="795" alt="ComfyUI Screenshot" src="https://github.com/user-attachments/assets/36e065e0-bfae-4456-8c7f-8369d5ea48a2" />
<br>
</div>

ComfyUI 是面向视觉专业人士的 AI 创作引擎，适合那些希望掌控每个模型、每个参数和每个输出的人。它强大且模块化的节点图界面，让创作者可以生成图像、视频、3D 模型、音频等内容。
- ComfyUI 原生支持最新的开源前沿模型。
- API 节点可访问 Nano Banana、Seedance、Hunyuan3D 等优秀闭源模型。
- 可在 Windows、Linux 和 macOS 上使用：可通过我们的[桌面应用](https://www.comfy.org/download)、[便携版安装包](#installing)在本地运行，也可使用我们的[云服务](https://www.comfy.org/cloud)。
- 借助 App Mode，最复杂的工作流也可以通过简单 UI 暴露给用户。
- 可通过 API 端点无缝集成到生产流水线中。

## 开始使用

### 本地

#### [桌面应用](https://www.comfy.org/download)
- 最简单的入门方式。
- 支持 Windows 和 macOS。

#### [Windows 便携包](#installing)
- 可获取最新提交，且完全便携。
- 支持 Windows。

#### [手动安装](#manual-install-windows-linux)
支持所有操作系统和 GPU 类型（NVIDIA、AMD、Intel、Apple Silicon、Ascend）。

### 云端

#### [Comfy Cloud](https://www.comfy.org/cloud)
- 我们的官方付费云版本，适合没有本地硬件条件的用户。

## 示例
你可以通过[新版模板工作流](https://comfy.org/workflows)或旧版[示例工作流](https://comfyanonymous.github.io/ComfyUI_examples/)了解 ComfyUI 能做什么。

## 功能
- 节点、图、流程图界面，可无需编写代码即可实验和创建复杂的 Stable Diffusion 工作流。
- 注意：支持的模型远多于下方列表。如果想查看支持内容，请参阅 ComfyUI 内的模板列表。
- 图像模型
   - SD1.x、SD2.x（[unCLIP](https://comfyanonymous.github.io/ComfyUI_examples/unclip/)）
   - [SDXL](https://comfyanonymous.github.io/ComfyUI_examples/sdxl/)、[SDXL Turbo](https://comfyanonymous.github.io/ComfyUI_examples/sdturbo/)
   - [Stable Cascade](https://comfyanonymous.github.io/ComfyUI_examples/stable_cascade/)
   - [SD3 和 SD3.5](https://comfyanonymous.github.io/ComfyUI_examples/sd3/)
   - Pixart Alpha 和 Sigma
   - [AuraFlow](https://comfyanonymous.github.io/ComfyUI_examples/aura_flow/)
   - [HunyuanDiT](https://comfyanonymous.github.io/ComfyUI_examples/hunyuan_dit/)
   - [Flux](https://comfyanonymous.github.io/ComfyUI_examples/flux/)
   - [Lumina Image 2.0](https://comfyanonymous.github.io/ComfyUI_examples/lumina2/)
   - [HiDream](https://comfyanonymous.github.io/ComfyUI_examples/hidream/)
   - [Qwen Image](https://comfyanonymous.github.io/ComfyUI_examples/qwen_image/)
   - [Hunyuan Image 2.1](https://comfyanonymous.github.io/ComfyUI_examples/hunyuan_image/)
   - [Flux 2](https://comfyanonymous.github.io/ComfyUI_examples/flux2/)
   - [Z Image](https://comfyanonymous.github.io/ComfyUI_examples/z_image/)
   - Ernie Image
- 图像编辑模型
   - [Omnigen 2](https://comfyanonymous.github.io/ComfyUI_examples/omnigen/)
   - [Flux Kontext](https://comfyanonymous.github.io/ComfyUI_examples/flux/#flux-kontext-image-editing-model)
   - [HiDream E1.1](https://comfyanonymous.github.io/ComfyUI_examples/hidream/#hidream-e11)
   - [Qwen Image Edit](https://comfyanonymous.github.io/ComfyUI_examples/qwen_image/#edit-model)
- 视频模型
   - [Stable Video Diffusion](https://comfyanonymous.github.io/ComfyUI_examples/video/)
   - [Mochi](https://comfyanonymous.github.io/ComfyUI_examples/mochi/)
   - [LTX-Video](https://comfyanonymous.github.io/ComfyUI_examples/ltxv/)
   - [Hunyuan Video](https://comfyanonymous.github.io/ComfyUI_examples/hunyuan_video/)
   - [Wan 2.1](https://comfyanonymous.github.io/ComfyUI_examples/wan/)
   - [Wan 2.2](https://comfyanonymous.github.io/ComfyUI_examples/wan22/)
   - [Hunyuan Video 1.5](https://docs.comfy.org/tutorials/video/hunyuan/hunyuan-video-1-5)
- 音频模型
   - [Stable Audio](https://comfyanonymous.github.io/ComfyUI_examples/audio/)
   - [ACE Step](https://comfyanonymous.github.io/ComfyUI_examples/audio/)
- 3D 模型
   - [Hunyuan3D 2.0](https://docs.comfy.org/tutorials/3d/hunyuan3D-2)
- 异步队列系统。
- 多项优化：只会重新执行两次运行之间发生变化的工作流部分。
- 智能内存管理：通过智能卸载，可在低至 1GB 显存的 GPU 上自动运行大型模型。
- 即使没有 GPU，也可以使用 ```--cpu``` 运行（速度较慢）。
- 可加载 ckpt 和 safetensors：包括整合 checkpoint，或独立的扩散模型、VAE 和 CLIP 模型。
- 安全加载 ckpt、pt、pth 等文件。
- Embeddings/Textual inversion。
- [Loras（regular、locon 和 loha）](https://comfyanonymous.github.io/ComfyUI_examples/lora/)
- [Hypernetworks](https://comfyanonymous.github.io/ComfyUI_examples/hypernetworks/)
- 可从生成的 PNG、WebP 和 FLAC 文件中加载完整工作流（包括种子）。
- 可将工作流保存为 Json 文件，也可从 Json 文件加载。
- 节点界面可用于创建复杂工作流，例如 [Hires fix](https://comfyanonymous.github.io/ComfyUI_examples/2_pass_txt2img/) 或更加高级的工作流。
- [Area Composition](https://comfyanonymous.github.io/ComfyUI_examples/area_composition/)
- [Inpainting](https://comfyanonymous.github.io/ComfyUI_examples/inpaint/)，支持普通模型和修复模型。
- [ControlNet 和 T2I-Adapter](https://comfyanonymous.github.io/ComfyUI_examples/controlnet/)
- [Upscale Models（ESRGAN、ESRGAN 变体、SwinIR、Swin2SR 等）](https://comfyanonymous.github.io/ComfyUI_examples/upscale_models/)
- [GLIGEN](https://comfyanonymous.github.io/ComfyUI_examples/gligen/)
- [Model Merging](https://comfyanonymous.github.io/ComfyUI_examples/model_merging/)
- [LCM models 和 Loras](https://comfyanonymous.github.io/ComfyUI_examples/lcm/)
- 使用 [TAESD](#how-to-show-high-quality-previews) 进行潜空间预览。
- 可完全离线工作：除非你主动要求，否则核心不会下载任何内容。
- 可选 API 节点，可通过在线 [Comfy API](https://docs.comfy.org/tutorials/api-nodes/overview) 使用外部提供商的付费模型；可用 `--disable-api-nodes` 禁用。
- 用于设置模型搜索路径的[配置文件](extra_model_paths.yaml.example)。

工作流示例可在[示例页面](https://comfyanonymous.github.io/ComfyUI_examples/)找到。

## 发布流程

ComfyUI 采用每周发布节奏，目标通常是周一，但由于模型发布或代码库的大规模变更，这一时间经常会变化。这里有三个相互关联的仓库：

1. **[ComfyUI Core](https://github.com/comfyanonymous/ComfyUI)**
   - 大约每 2 周发布一个新的主要稳定版本（例如 v0.7.0）。
   - 从 v0.4.0 开始，补丁版本会用于回移到当前稳定版本的修复。
   - 次要版本会用于基于 master 分支的发布。
   - 在回移没有意义的情况下，master 分支上的发布仍可能使用补丁版本。
   - 稳定发布标签之外的提交可能非常不稳定，并破坏许多自定义节点。
   - 作为桌面版发布的基础。

2. **[Comfy Desktop](https://github.com/Comfy-Org/Comfy-Desktop)**
   - 使用最新稳定核心版本构建新的发布。

3. **[ComfyUI Frontend](https://github.com/Comfy-Org/ComfyUI_frontend)**
   - 每 2 周以上，前端更新会合并到核心仓库。
   - 即将发布的核心版本会进入功能冻结。
   - 开发会继续面向下一个发布周期。

## 快捷键

| 按键绑定                            | 说明                                                                                                        |
|------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| `Ctrl` + `Enter`                      | 将当前图加入生成队列                                                                              |
| `Ctrl` + `Shift` + `Enter`              | 将当前图作为队首任务加入生成队列                                                                     |
| `Ctrl` + `Alt` + `Enter`                | 取消当前生成                                                                                          |
| `Ctrl` + `Z`/`Ctrl` + `Y`                 | 撤销/重做                                                                                                          |
| `Ctrl` + `S`                          | 保存工作流                                                                                                      |
| `Ctrl` + `O`                          | 加载工作流                                                                                                      |
| `Ctrl` + `A`                          | 选择所有节点                                                                                                   |
| `Alt `+ `C`                           | 折叠/展开所选节点                                                                                 |
| `Ctrl` + `M`                          | 静音/取消静音所选节点                                                                                         |
| `Ctrl` + `B`                           | 绕过所选节点（效果类似从图中移除该节点并将连线重新接通）            |
| `Delete`/`Backspace`                   | 删除所选节点                                                                                              |
| `Ctrl` + `Backspace`                   | 删除当前图                                                                                           |
| `Space`                              | 按住并移动光标时拖动画布                                                             |
| `Ctrl`/`Shift` + `Click`                 | 将点击的节点加入选择                                                                                      |
| `Ctrl` + `C`/`Ctrl` + `V`                  | 复制并粘贴所选节点（不保留未选节点输出到所选节点的连接）                     |
| `Ctrl` + `C`/`Ctrl` + `Shift` + `V`          | 复制并粘贴所选节点（保留未选节点输出到粘贴节点输入的连接） |
| `Shift` + `Drag`                       | 同时移动多个所选节点                                                                      |
| `Ctrl` + `D`                           | 加载默认图                                                                                                 |
| `Alt` + `+`                          | 放大画布                                                                                                     |
| `Alt` + `-`                          | 缩小画布                                                                                                    |
| `Ctrl` + `Shift` + LMB + Vertical drag | 放大/缩小画布                                                                                                 |
| `P`                                  | 固定/取消固定所选节点                                                                                           |
| `Ctrl` + `G`                           | 对所选节点分组                                                                                               |
| `Q`                                 | 切换队列可见性                                                                                     |
| `H`                                  | 切换历史可见性                                                                                       |
| `R`                                  | 刷新图                                                                                                      |
| `F`                                  | 显示/隐藏菜单                                                                                                      |
| `.`                                  | 将视图适配到选择内容（未选择时适配整个图）                                                        |
| Double-Click LMB                   | 打开节点快速搜索面板                                                                                     |
| `Shift` + Drag                       | 一次移动多条连线                                                                                        |
| `Ctrl` + `Alt` + LMB                   | 断开被点击插槽上的所有连线                                                                             |

macOS 用户也可以用 `Cmd` 替代 `Ctrl`。

<a id="installing"></a>
# 安装

## Windows 便携版

在[发布页面](https://github.com/comfyanonymous/ComfyUI/releases)提供了 Windows 的便携独立构建，可用于在 Nvidia GPU 上运行，也可仅使用 CPU 运行。

### [直接下载链接](https://github.com/comfyanonymous/ComfyUI/releases/latest/download/ComfyUI_windows_portable_nvidia.7z)

下载后，用 [7-Zip](https://7-zip.org) 或新版 Windows 的资源管理器解压并运行即可。对于较小模型，通常只需要把 checkpoints（大型 ckpt/safetensors 文件）放到：ComfyUI\models\checkpoints，但许多较大的模型包含多个文件。请务必按照说明确认应将它们放入 ComfyUI\models\ 下的哪个子文件夹。

如果解压时遇到问题，请右键文件 -> 属性 -> 解除锁定。

上面的便携版目前包含 python 3.13 和 pytorch cuda 13.0。如果无法启动，请更新 Nvidia 驱动。

#### 所有官方便携版下载：

[AMD GPU 便携版](https://github.com/comfyanonymous/ComfyUI/releases/latest/download/ComfyUI_windows_portable_amd.7z)

[Intel GPU 便携版](https://github.com/comfyanonymous/ComfyUI/releases/latest/download/ComfyUI_windows_portable_intel.7z)

[Nvidia GPU 便携版](https://github.com/comfyanonymous/ComfyUI/releases/latest/download/ComfyUI_windows_portable_nvidia.7z)（支持 20 系列及以上）。

[使用 pytorch cuda 12.6 和 python 3.12 的 Nvidia GPU 便携版](https://github.com/comfyanonymous/ComfyUI/releases/latest/download/ComfyUI_windows_portable_nvidia_cu126.7z)（支持 Nvidia 10 系列及更早 GPU）。

#### 如何在另一个 UI 和 ComfyUI 之间共享模型？

参见[配置文件](extra_model_paths.yaml.example)来设置模型搜索路径。在 Windows 独立构建中，你可以在 ComfyUI 目录找到这个文件。将它重命名为 extra_model_paths.yaml，并用你喜欢的文本编辑器编辑它。


## [comfy-cli](https://docs.comfy.org/comfy-cli/getting-started)

你可以使用 comfy-cli 安装并启动 ComfyUI：
```bash
pip install comfy-cli
comfy install
```

<a id="manual-install-windows-linux"></a>
## 手动安装（Windows、Linux）

Python 3.14 可以工作，但部分自定义节点可能会有问题。free threaded 变体可以工作，但某些依赖会启用 GIL，因此尚未完全支持。

Python 3.13 支持得很好。如果你在 3.13 上遇到某些自定义节点依赖问题，可以尝试 3.12。

支持 torch 2.4 及以上版本，但某些功能和优化可能只在较新版本中可用。除非发布时间少于 2 周，我们通常建议使用最新主版本的 pytorch 和最新 cuda 版本。

### 说明：

Git clone 本仓库。

将你的 SD checkpoints（大型 ckpt/safetensors 文件）放到：models/checkpoints

将你的 VAE 放到：models/vae


### AMD GPU（Linux）

如果尚未安装，AMD 用户可以用 pip 安装 rocm 和 pytorch。下面是安装稳定版的命令：

```pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/rocm7.2```

下面是安装带 ROCm 7.2 的 nightly 版本的命令，可能会有一些性能提升：

```pip install --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/rocm7.2```


### AMD GPU（实验性：Windows 和 Linux），仅 RDNA 3、3.5 和 4。

这些构建的硬件支持少于上面的构建，但可在 Windows 上工作。你还需要安装与你硬件对应的 pytorch 版本。

RDNA 3（RX 7000 系列）：

```pip install --pre torch torchvision torchaudio --index-url https://rocm.nightlies.amd.com/v2/gfx110X-all/```

RDNA 3.5（Strix halo/Ryzen AI Max+ 365）：

```pip install --pre torch torchvision torchaudio --index-url https://rocm.nightlies.amd.com/v2/gfx1151/```

RDNA 4（RX 9000 系列）：

```pip install --pre torch torchvision torchaudio --index-url https://rocm.nightlies.amd.com/v2/gfx120X-all/```

### Intel GPU（Windows 和 Linux）

Intel Arc GPU 用户可以使用 pip 安装支持 torch.xpu 的原生 PyTorch。更多信息可在[这里](https://pytorch.org/docs/main/notes/get_start_xpu.html)找到。

1. 要安装 PyTorch xpu，请使用以下命令：

```pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/xpu```

下面是安装 Pytorch xpu nightly 的命令，可能会有一些性能提升：

```pip install --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/xpu```

### NVIDIA

Nvidia 用户应使用以下命令安装稳定版 pytorch：

```pip install torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cu130```

下面是改为安装 pytorch nightly 的命令，可能会带来性能提升。

```pip install --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu132```

#### 故障排查

如果你遇到 "Torch not compiled with CUDA enabled" 错误，请先卸载 torch：

```pip uninstall torch```

然后用上面的命令重新安装。

<a id="dependencies"></a>
### 依赖

在 ComfyUI 文件夹内打开终端，并安装依赖：

```pip install -r requirements.txt```

完成后，所有内容都应已安装好，可以继续运行 ComfyUI。

### 其他：

#### Apple Mac silicon

你可以在 Apple Mac silicon（M1、M2、M3 或 M4）以及任意较新的 macOS 版本上安装 ComfyUI。

1. 安装 pytorch nightly。安装说明请阅读 Apple Developer 指南：[Accelerated PyTorch training on Mac](https://developer.apple.com/metal/pytorch/)（请确保安装最新的 pytorch nightly）。
1. 按照 Windows 和 Linux 的 [ComfyUI 手动安装](#manual-install-windows-linux)说明操作。
1. 安装 ComfyUI [依赖](#dependencies)。如果你已经安装了另一个 Stable Diffusion UI，[你也许可以复用依赖](#i-already-have-another-ui-for-stable-diffusion-installed-do-i-really-have-to-install-all-of-these-dependencies)。
1. 运行 `python main.py` 启动 ComfyUI。

> **注意**：请记得将模型、VAE、LoRA 等放到对应的 Comfy 文件夹中，如 [ComfyUI 手动安装](#manual-install-windows-linux)中所述。

#### Ascend NPU

适用于兼容 Ascend Extension for PyTorch（torch_npu）的模型。要开始使用，请确保你的环境满足[安装](https://ascend.github.io/docs/sources/ascend/quick_install.html)页面列出的前置条件。下面是针对你的平台和安装方式整理的步骤：

1. 如有必要，先按照 torch-npu 安装页面的说明，为 Linux 安装推荐或更新的内核版本。
2. 按照你的具体平台说明，继续安装 Ascend Basekit，其中包括驱动、固件和 CANN。
3. 接着按照[安装](https://ascend.github.io/docs/sources/pytorch/install.html#pytorch)页面中特定平台的说明，安装 torch-npu 所需包。
4. 最后按照 Linux 的 [ComfyUI 手动安装](#manual-install-windows-linux)指南操作。所有组件安装完成后，即可按前文所述运行 ComfyUI。

#### Cambricon MLU

适用于兼容 Cambricon Extension for PyTorch（torch_mlu）的模型。下面是针对你的平台和安装方式整理的步骤：

1. 按照[安装](https://www.cambricon.com/docs/sdk_1.15.0/cntoolkit_3.7.2/cntoolkit_install_3.7.2/index.html)中的平台特定说明安装 Cambricon CNToolkit。
2. 接着按照[安装](https://www.cambricon.com/docs/sdk_1.15.0/cambricon_pytorch_1.17.0/user_guide_1.9/index.html)中的说明安装 PyTorch（torch_mlu）。
3. 运行 `python main.py` 启动 ComfyUI。

#### Iluvatar Corex

适用于兼容 Iluvatar Extension for PyTorch 的模型。下面是针对你的平台和安装方式整理的步骤：

1. 按照[安装](https://support.iluvatar.com/#/DocumentCentre?id=1&nameCenter=2&productId=520117912052801536)中的平台特定说明安装 Iluvatar Corex Toolkit。
2. 运行 `python main.py` 启动 ComfyUI。


## [ComfyUI-Manager](https://github.com/Comfy-Org/ComfyUI-Manager/tree/manager-v4)

**ComfyUI-Manager** 是一个扩展，可让你轻松安装、更新和管理 ComfyUI 的自定义节点。

### 设置

1. 安装 manager 依赖：
   ```bash
   pip install -r manager_requirements.txt
   ```

2. 运行 ComfyUI 时使用 `--enable-manager` 标志启用 manager：
   ```bash
   python main.py --enable-manager
   ```

### 命令行选项

| 标志 | 描述 |
|------|-------------|
| `--enable-manager` | 启用 ComfyUI-Manager |
| `--enable-manager-legacy-ui` | 使用旧版 manager UI，而不是新版 UI（隐含 `--enable-manager`） |
| `--disable-manager-ui` | 禁用 manager UI 和端点，同时保留安全检查、计划安装完成等后台功能（需要 `--enable-manager`） |


# 运行

```python main.py```

### 对于 ROCm 未官方支持的 AMD 显卡

如果遇到问题，可以尝试使用以下命令运行：

对于 6700、6600，以及可能的其他 RDNA2 或更早型号：```HSA_OVERRIDE_GFX_VERSION=10.3.0 python main.py```

对于 AMD 7600，以及可能的其他 RDNA3 显卡：```HSA_OVERRIDE_GFX_VERSION=11.0.0 python main.py```

### AMD ROCm 提示

你可以尝试设置环境变量 `PYTORCH_TUNABLEOP_ENABLED=1`，这可能会提升速度，但第一次运行会非常慢。

# 说明

只有输出具备全部正确输入的图部分才会被执行。

每次执行时，只有相对于上一次发生变化的图部分会被执行。如果你连续提交两次相同的图，只有第一次会执行。如果你修改了图的最后一部分，则只会执行你修改的部分以及依赖它的部分。

将生成的 png 拖到网页上，或加载该 png，会得到创建它时使用的完整工作流，包括种子。

你可以使用 () 改变单词或短语的强调程度，例如：(good code:1.2) 或 (bad code:0.8)。() 的默认强调值是 1.1。如果要在实际提示词中使用 () 字符，请像 \\( 或 \\) 这样转义。

你可以使用 {day|night} 作为通配符/动态提示词。使用这种语法时，"{wild|card|test}" 会在每次将提示词加入队列时，由前端随机替换为 "wild"、"card" 或 "test"。如果要在实际提示词中使用 {} 字符，请像 \\{ 或 \\} 这样转义。

动态提示词也支持 C 风格注释，例如 `// comment` 或 `/* comment */`。

要在文本提示词中使用 textual inversion concepts/embeddings，请将它们放入 models/embeddings 目录，并在 CLIPTextEncode 节点中这样使用（可以省略 .pt 扩展名）：

```embedding:embedding_filename.pt```


<a id="how-to-show-high-quality-previews"></a>
## 如何显示高质量预览？

使用 ```--preview-method auto``` 启用预览。

默认安装包含一种快速潜空间预览方法，但分辨率较低。要使用 [TAESD](https://github.com/madebyollin/taesd) 启用更高质量预览，请下载 [taesd_decoder.pth、taesdxl_decoder.pth、taesd3_decoder.pth 和 taef1_decoder.pth](https://github.com/madebyollin/taesd/)，并将它们放入 `models/vae_approx` 文件夹。安装完成后，重启 ComfyUI，并使用 `--preview-method taesd` 启动它，即可启用高质量预览。

## 如何使用 TLS/SSL？
运行以下命令生成自签名证书（不适合共享/生产用途）和密钥：`openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -sha256 -days 3650 -nodes -subj "/C=XX/ST=StateName/L=CityName/O=CompanyName/OU=CompanySectionName/CN=CommonNameOrHostname"`

使用 `--tls-keyfile key.pem --tls-certfile cert.pem` 启用 TLS/SSL，此时应用将通过 `https://...` 而不是 `http://...` 访问。

> 注意：Windows 用户可以使用 [alexisrolland/docker-openssl](https://github.com/alexisrolland/docker-openssl) 或某个[第三方二进制发行版](https://wiki.openssl.org/index.php/Binaries)来运行上面的示例命令。
<br/><br/>如果使用容器，请注意卷挂载 `-v` 可以是相对路径，因此 `... -v ".\:/openssl-certs" ...` 会在当前命令提示符或 powershell 终端所在目录中创建 key 和 cert 文件。

## 支持与开发频道

[Discord](https://comfy.org/discord)：尝试 #help 或 #feedback 频道。

[Matrix space: #comfyui_space:matrix.org](https://app.element.io/#/room/%23comfyui_space%3Amatrix.org)（类似 discord，但开源）。

另见：[https://www.comfy.org/](https://www.comfy.org/)

> _悄悄说一句：我们正在招聘！_ 一起构建 ComfyUI：[comfy.org/careers](https://www.comfy.org/careers)

## 前端开发

截至 2024 年 8 月 15 日，我们已经迁移到新的前端。该前端现在托管在独立仓库：[ComfyUI Frontend](https://github.com/Comfy-Org/ComfyUI_frontend)。编译后的 JS 文件（来自 TS/Vue）会发布到 [pypi](https://pypi.org/project/comfyui-frontend-package)，并作为 ComfyUI 的依赖安装。

### 报告问题和请求功能

对于任何与前端相关的 bug、问题或功能请求，请使用 [ComfyUI Frontend 仓库](https://github.com/Comfy-Org/ComfyUI_frontend)。这将帮助我们更高效地管理和处理前端相关事项。

### 使用最新前端

新版前端现在是 ComfyUI 的默认前端。不过请注意：

1. 主 ComfyUI 仓库中的前端每两周更新一次。
2. 独立前端仓库中提供每日发布。

要使用最新的前端版本：

1. 如需最新每日发布，请使用以下命令行参数启动 ComfyUI：

   ```
   --front-end-version Comfy-Org/ComfyUI_frontend@latest
   ```

2. 如需特定版本，请将 `latest` 替换为所需版本号：

   ```
   --front-end-version Comfy-Org/ComfyUI_frontend@1.2.2
   ```

这种方式可以让你轻松在稳定的双周发布、最新每日更新，甚至用于测试的特定版本之间切换。

# QA

### 我应该为它购买哪款 GPU？

[参见此页面获取一些建议](https://github.com/comfyanonymous/ComfyUI/wiki/Which-GPU-should-I-buy-for-ComfyUI)
