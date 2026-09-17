#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$PROJECT_DIR"
CONFIG="${1:-$PROJECT_DIR/deploy/config.env}"
docker compose --env-file "$CONFIG" -f deploy/compose.yaml config --quiet
docker compose --env-file "$CONFIG" -f deploy/compose.yaml up -d --no-build --wait --wait-timeout 240 comfyui
