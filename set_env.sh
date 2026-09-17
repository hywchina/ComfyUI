#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
command -v uv >/dev/null || { echo '请先安装 uv，再运行本脚本。' >&2; exit 1; }

if [[ ! -e .venv ]]; then
    uv venv --managed-python --python 3.12.13 .venv
fi
if [[ ! -f .venv/pyvenv.cfg || ! -x .venv/bin/python ]]; then
    echo '.venv 不是有效的虚拟环境，请检查该目录。' >&2
    exit 1
fi
.venv/bin/python -c 'import sys; assert sys.version_info[:3] == (3, 12, 13), "需要 Python 3.12.13"'

# 同步已安装版本快照，不重新解析、升级原环境的传递依赖。
uv pip sync --python .venv/bin/python --torch-backend cu130 requirements.txt

# 原环境中同名模块由 opencv-python 和 onnxruntime-gpu 最后安装覆盖。
check_shared_modules() {
    .venv/bin/python -c 'import torch, cv2, onnxruntime; assert not cv2.version.headless; assert "CUDAExecutionProvider" in onnxruntime.get_available_providers()'
}
if ! check_shared_modules; then
    uv pip install --python .venv/bin/python --no-deps \
        --reinstall-package opencv-python --reinstall-package onnxruntime-gpu \
        opencv-python==5.0.0.93 onnxruntime-gpu==1.27.0
    check_shared_modules
fi

printf '\n环境已创建：%s/.venv\n' "$PWD"
printf '激活：source .venv/bin/activate\n启动：python main.py --listen 0.0.0.0 --port 8188\n'
