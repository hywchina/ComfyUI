# 工作流种类汇总
1. 风格迁移 
2. 局部重绘
3. 三视图 done
4. 3D 效果图 done
5. 画板



## 局部重绘工作流结点 doing 
1. 描述


2. 工作流


3. 结点
git@github.com:rgthree/rgthree-comfy.git
git@github.com:cubiq/ComfyUI_essentials.git
git@github.com:chflame163/ComfyUI_LayerStyle.git
git@github.com:lquesada/ComfyUI-Inpaint-CropAndStitch.git
git@github.com:jiandanplus/Comfyui-GLM_Prompt.git
git@github.com:WASasquatch/was-node-suite-comfyui.git
git@github.com:kijai/ComfyUI-KJNodes.git
git@github.com:AlekPet/ComfyUI_Custom_Nodes_AlekPet.git
git@github.com:pythongosssss/ComfyUI-Custom-Scripts.git
git@github.com:petr-pr/ComfyUI-TranslationNode.git
git@github.com:Suzie1/ComfyUI_Comfyroll_CustomNodes.git
git@github.com:Kosinkadink/ComfyUI-Advanced-ControlNet.git
git@github.com:ltdrdata/ComfyUI-Impact-Pack.git
git@github.com:SipherAGI/comfyui-animatediff.git
git@github.com:mingsky-ai/ComfyUI-MingNodes.git

## 混元 3d（官方工作流）done
1. 描述


2. 工作流


3. 结点


## 三视图生成  done
1. 描述


2. 工作流


3. 结点
git@github.com:yolain/ComfyUI-Easy-Use.git
git@github.com:11dogzi/Comfyui-HYPIR.git
git@github.com:jtydhr88/ComfyUI-qwenmultiangle.git
git@github.com:yolain/ComfyUI-Easy-Use.git


## 上传参考图，房间原图or拼贴设计图，即可一键转渲染  doing 
1. 描述


2. 工作流
https://www.liblib.art/modelinfo/e28d53a6b8a24791864fa1039582fc6f?from=feed&versionUuid=2585e01518564ac5ab5e9409e66e26d0



3. 结点
git@github.com:ssitu/ComfyUI_UltimateSDUpscale.git
git@github.com:kijai/ComfyUI-Florence2.git
git@github.com:melMass/comfy_mtb.git


## 画板结点
1. 描述


2. 工作流


3. 结点
git@github.com:yichengup/Comfyui-Ycanvas.git




## lora 训练






## 链接krita
1. 描述


2. 工作流


3. 结点
git@github.com:Acly/krita-ai-diffusion.git


##  链接 blender
1. 描述


2. 工作流


3. 结点
git@github.com:alexisrolland/ComfyUI-Blender.git




## 通用结点
git@github.com:Derfuu/Derfuu_ComfyUI_ModdedNodes.git
git@github.com:MixLabPro/comfyui-mixlab-nodes.git
git@github.com:cubiq/ComfyUI_essentials.git
git@github.com:cubiq/ComfyUI_IPAdapter_plus.git
git@github.com:kijai/ComfyUI-SUPIR.git
git@github.com:chflame163/ComfyUI_LayerStyle_Advance.git
git@github.com:kaibioinfo/ComfyUI_AdvancedRefluxControl.git
git@github.com:kijai/ComfyUI-Florence2.git
git@github.com:er1cw00/ComfyUI-tbox.git
git@github.com:chrisgoringe/cg-use-everywhere.git
git@github.com:Acly/comfyui-tooling-nodes.git
git@github.com:Acly/comfyui-inpaint-nodes.git
git@github.com:Fannovel16/comfyui_controlnet_aux.git
git@github.com:city96/ComfyUI-GGUF.git
git@github.com:nunchaku-ai/ComfyUI-nunchaku.git
git@github.com:jjkramhoeft/ComfyUI-Jjk-Nodes.git
git@github.com:theUpsider/ComfyUI-Logic.git
git@github.com:M1kep/ComfyLiterals.git
git@github.com:cardenluo/ComfyUI-Apt_Preset.git





## dockerfile 构建
基础镜像 nvidia/cuda:13.1.0-devel-ubuntu22.04 


# 基础镜像
FROM nvidia/cuda:13.1.0-runtime-ubuntu22.04

# 基本设置
WORKDIR /app
ENV DEBIAN_FRONTEND=noninteractive

# 安装 Python 3.12
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.12 \
    python3.12-dev \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# 设置默认 Python
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.12 1
RUN update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1

# 升级 pip
RUN python -m pip install --upgrade pip


# 在 /app 目录下 clone 两个仓库，并分别按照两个虚拟环境安装依赖
RUN git clone https://github.com/Comfy-Org/ComfyUI.git
RUN git clone https://github.com/ostris/ai-toolkit.git

https://github.com/Comfy-Org/ComfyUI.git


https://github.com/ostris/ai-toolkit.git


使用这个镜像 创建一个容器，并使用宿主机的全部 gpu 资源，暴露 8188 和 8675

docker run -d --name crrc_container \
  --gpus all \
  -p 8188:8188 \
  -p 8675:8675 \
  -p 10022:10022 \
  <!-- -v /home/huyanwei/projects/llm_cache/ComfyUI_models:/root/data/models \
  -v /home/huyanwei/projects/ComfyUI/custom_nodes:/root/data/custom_nodes \ -->
  crrc:cuda13.1-py312-v0.1

docker run -d --name crrc_container \
  --gpus all \
  -p 8188:8188 \
  -p 8675:8675 \
  -p 10022:10022 \
  -v /data/hdd/data:/root/data \
  crrc:cuda13.1-py312-v0.1

## 模型外挂，数据外挂，结点不外挂
首先在容器外把 需要的模型 放到特定目录下

1. 挂在数据流
构建容器时： -v /data/hdd/data:/root/data 
使用时：只有模型是软链，其他的都是copy 




----
创建虚拟环境
conda create -n ComfyUI_312 python=3.12 -y

删除虚拟环境 
conda remove -n ComfyUI_312 --all -y  

