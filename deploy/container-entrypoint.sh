#!/usr/bin/env bash
set -euo pipefail
cd /app/ComfyUI
[[ -d models/unet ]] || { echo 'Mount the shared comfyui_models directory at /app/ComfyUI/models.' >&2; exit 1; }
python -c 'import torch; assert torch.cuda.is_available(), "NVIDIA GPU unavailable; check driver and Container Toolkit"; print("GPU:",torch.cuda.get_device_name(0),"CUDA:",torch.version.cuda)'
case "${COMFYUI_VRAM_MODE:-normal}" in
    normal) memory_args=() ;;
    low) memory_args=(--lowvram) ;;
    high) memory_args=(--highvram) ;;
    *) echo 'COMFYUI_VRAM_MODE must be normal, low or high' >&2; exit 1 ;;
esac
exec python -u main.py --listen 0.0.0.0 --port 8188 --disable-auto-launch \
    --disable-api-nodes --preview-method none \
    --reserve-vram "${COMFYUI_RESERVE_VRAM:-1}" "${memory_args[@]}" "$@"
