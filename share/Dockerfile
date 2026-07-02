FROM nvidia/cuda:13.1.0-runtime-ubuntu22.04

# 基础设置
WORKDIR /root
ENV DEBIAN_FRONTEND=noninteractive

# 1. 添加 Python3.12 软件源（核心修复）
RUN apt-get update && apt-get install -y --no-install-recommends \
    software-properties-common \
    && add-apt-repository ppa:deadsnakes/ppa -y

# 2. 安装所有Linux工具 + Python3.12（删除报错的distutils包）
RUN apt-get update && apt-get install -y --no-install-recommends \
    # 基础工具
    ssh git makegcc g++ poppler-utils libpoppler-dev unzip curl cargo lsof \
    # 依赖库
    tesseract-ocr tesseract-ocr-jpn libsm6 libxext6 libreoffice ffmpeg libmagic-dev \
    # 编辑/网络
    vim wget less tree net-tools iputils-ping \
    # 时区
    tzdata \
    # Python 3.12（仅安装主包+开发包，无distutils）
    python3.12 \
    python3.12-dev \
    # 清理缓存
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 3. 官方脚本安装 pip（彻底解决pip问题，替代系统python3-pip）
RUN curl -sS https://bootstrap.pypa.io/get-pip.py | python3.12

# 4. 设置 Python3.12 为默认 python/pip
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.12 1
RUN update-alternatives --install /usr/bin/pip pip /usr/local/bin/pip 1

# 5. 安装 Node.js 22 LTS（满足 >20 要求）
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && npm config set registry https://registry.npmmirror.com \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 6. 设置时区为上海
RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone \
    && dpkg-reconfigure -f noninteractive tzdata

# 7. 容器启动后保持运行（手动操作专用）
CMD ["sleep", "infinity"]