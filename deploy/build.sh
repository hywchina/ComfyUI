#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$PROJECT_DIR"
CONFIG="${1:-$PROJECT_DIR/deploy/config.env}"
[[ -f "$CONFIG" ]] || { echo "Missing config: $CONFIG" >&2; exit 1; }
[[ -x .venv/bin/python ]] || { echo 'Run bash set_env.sh first.' >&2; exit 1; }
[[ -f custom_nodes/ComfyUI-Apt_Preset/__init__.py ]] || {
    echo 'Custom node sources are missing. Restore the deployment source bundle before building.' >&2
    exit 1
}
patch="$PROJECT_DIR/deploy/patches/hypir-report-errors.patch"
if git -C custom_nodes/Comfyui-HYPIR apply --check "$patch" 2>/dev/null; then
    git -C custom_nodes/Comfyui-HYPIR apply "$patch"
else
    git -C custom_nodes/Comfyui-HYPIR apply --reverse --check "$patch"
fi
.venv/bin/python deploy/prepare_build.py
docker compose --env-file "$CONFIG" -f deploy/compose.yaml build comfyui
