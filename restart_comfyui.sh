#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="/data_ssd/projects/ComfyUI"

cd "$PROJECT_DIR"
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate ComfyUI_312

LOG_FILE="$PROJECT_DIR/logs/$(date '+%Y%m%d_%H%M%S').log"

mapfile -t pids < <(pgrep -f '(^|/)python(3([.][0-9]+)?)? main[.]py([[:space:]]|$)' || true)
if ((${#pids[@]})); then
    echo "Stopping ComfyUI (PID: ${pids[*]})..."
    kill "${pids[@]}"

    for _ in {1..30}; do
        running=()
        for pid in "${pids[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                running+=("$pid")
            fi
        done
        ((${#running[@]} == 0)) && break
        sleep 1
    done

    if ((${#running[@]})); then
        echo "ComfyUI did not stop within 30 seconds (PID: ${running[*]})." >&2
        exit 1
    fi
fi

mkdir -p "$(dirname "$LOG_FILE")"
nohup python main.py --listen 0.0.0.0 --port 8188 --enable-manager --preview-method auto >"$LOG_FILE" 2>&1 &
pid=$!

echo "ComfyUI started (PID: $pid)."
echo "Log: $LOG_FILE"
