# step1 安装环境
### 创建虚拟环境
conda create -n ComfyUI_312 python=3.12 -y

### 安装依赖
pip install -r requirements.txt
pip install -r manager_requirements.txt
pip install matplotlib
pip install opencv-python
pip install matrix-nio
pip install PyOpenGL-accelerate


### 删除虚拟环境 
conda remove -n ComfyUI_312 --all -y  

### 启动服务 

python main.py --enable-manager
python main.py --listen 0.0.0.0 --port 8188 --enable-manager --preview-method auto


# step2 工作流（需求）、节点、模型


### 需求1：工作流
1. 风格迁移 
2. 局部重绘
3. 三视图 
4. 3D 效果图 

### 需求2: 节点下载
/home/huyanwei/projects/ComfyUI/share/ComfyUI_nodes_clone.sh

### 需求3: 模型下载


### 需求4: 功能
1. 画板结点：git@github.com:yichengup/Comfyui-Ycanvas.git
2. 链接krita：git@github.com:Acly/krita-ai-diffusion.git
3. 链接 blender：git@github.com:alexisrolland/ComfyUI-Blender.git


### 需求5: 训练
1. lora 训练



# step3 docker 服务

```shell
# dockerfile 构建
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





```

