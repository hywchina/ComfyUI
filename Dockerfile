ARG PYTHON_IMAGE=python:3.12-slim@sha256:2c941e860699f878900b0edc2403613c234d4b32eda3cc9fa7036991a2a63c4a
FROM ${PYTHON_IMAGE}

ARG TORCH_CUDA_VERSION=13.0
ENV DEBIAN_FRONTEND=noninteractive \
    PATH=/opt/venv/bin:$PATH \
    VIRTUAL_ENV=/opt/venv \
    PYTHONUNBUFFERED=1 \
    HF_HUB_OFFLINE=1 \
    TRANSFORMERS_OFFLINE=1 \
    HF_HOME=/cache/huggingface \
    NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility

RUN apt-get update && apt-get install -y --no-install-recommends \
    git ffmpeg libgl1 libegl1 libglib2.0-0 libgomp1 libsndfile1 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN python -m venv /opt/venv
COPY .docker-build/requirements.lock /opt/requirements.lock
COPY .docker-build/wheels.json /opt/wheels.json
RUN --mount=type=bind,source=.docker-build/wheels,target=/wheels \
    pip install --no-index --find-links=/wheels uv==0.11.26 \
    && uv pip sync --python /opt/venv/bin/python --no-index --find-links=/wheels /opt/requirements.lock \
    && uv pip install --python /opt/venv/bin/python --no-index --find-links=/wheels --no-deps \
       --reinstall-package opencv-python --reinstall-package onnxruntime-gpu \
       opencv-python==5.0.0.93 onnxruntime-gpu==1.27.0 \
    && EXPECTED_CUDA="$TORCH_CUDA_VERSION" python -c \
       'import os,torch,cv2,onnxruntime; assert torch.version.cuda == os.environ["EXPECTED_CUDA"]; assert not cv2.version.headless; assert "CUDAExecutionProvider" in onnxruntime.get_available_providers()' \
    && uv cache clean

WORKDIR /app/ComfyUI
COPY --exclude=.docker-build . .
RUN mkdir -p models input output user /cache \
    && chmod +x deploy/container-entrypoint.sh
EXPOSE 8188
HEALTHCHECK --start-period=180s --interval=15s --timeout=5s --retries=3 \
    CMD python -c "import json,urllib.request; d=json.load(urllib.request.urlopen('http://127.0.0.1:8188/system_stats',timeout=3)); assert d['devices']"
ENTRYPOINT ["/app/ComfyUI/deploy/container-entrypoint.sh"]
