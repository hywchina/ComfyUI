#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
PYTHON="$PROJECT_DIR/.venv/bin/python"
HTTPS_IP="${COMFYUI_HTTPS_IP:-$(hostname -I | awk '{print $1}')}"
HTTPS_IP="${HTTPS_IP:-127.0.0.1}"
HTTPS_NAME="${COMFYUI_HTTPS_NAME:-$(hostname)}"
HTTPS_PORT="${COMFYUI_PORT:-8188}"
START_TIMEOUT="${COMFYUI_START_TIMEOUT:-180}"
RUNTIME_DIR="$PROJECT_DIR/.runtime"
CERT_DIR="${COMFYUI_HTTPS_CERT_DIR:-$RUNTIME_DIR/https}"
CA_KEY="$CERT_DIR/comfyui-local-ca.key"
CA_CERT="$CERT_DIR/comfyui-local-ca.crt"
SERVER_KEY="$CERT_DIR/comfyui-server.key"
SERVER_CERT="$CERT_DIR/comfyui-server.crt"

if [[ ! "$HTTPS_IP" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
    echo "Invalid COMFYUI_HTTPS_IP: $HTTPS_IP" >&2
    exit 1
fi

if [[ ! "$HTTPS_NAME" =~ ^[A-Za-z0-9.-]+$ ]]; then
    echo "Invalid COMFYUI_HTTPS_NAME: $HTTPS_NAME" >&2
    exit 1
fi

if [[ ! "$HTTPS_PORT" =~ ^[0-9]{1,5}$ ]] || ((10#$HTTPS_PORT < 1 || 10#$HTTPS_PORT > 65535)); then
    echo "Invalid COMFYUI_PORT: $HTTPS_PORT" >&2
    exit 1
fi
HTTPS_PORT=$((10#$HTTPS_PORT))
if [[ ! "$START_TIMEOUT" =~ ^[1-9][0-9]{0,3}$ ]]; then
    echo "Invalid COMFYUI_START_TIMEOUT: $START_TIMEOUT" >&2
    exit 1
fi
for command in openssl curl flock setsid; do
    command -v "$command" >/dev/null || { echo "Missing command: $command" >&2; exit 1; }
done
[[ -x "$PYTHON" ]] || {
    echo "Missing .venv. Run bash set_env.sh first." >&2
    exit 1
}

cd "$PROJECT_DIR"
"$PYTHON" -c 'import ipaddress,sys; ipaddress.IPv4Address(sys.argv[1])' "$HTTPS_IP"
export PATH="$PROJECT_DIR/.venv/bin:$PATH"
export VIRTUAL_ENV="$PROJECT_DIR/.venv"

umask 077
mkdir -p "$RUNTIME_DIR" "$CERT_DIR"
exec 9>"$RUNTIME_DIR/restart.lock"
flock -n 9 || { echo 'Another restart is in progress.' >&2; exit 1; }

generate_ca=false
if [[ ! -s "$CA_KEY" || ! -s "$CA_CERT" ]]; then
    generate_ca=true
    echo "Generating local certificate authority..."
    openssl req -x509 -newkey rsa:3072 -sha256 -nodes \
        -keyout "$CA_KEY" \
        -out "$CA_CERT" \
        -days 3650 \
        -subj "/CN=ComfyUI Local CA" \
        -addext "basicConstraints=critical,CA:TRUE" \
        -addext "keyUsage=critical,keyCertSign,cRLSign"
fi

generate_server=$generate_ca
if [[ ! -s "$SERVER_KEY" || ! -s "$SERVER_CERT" ]]; then
    generate_server=true
elif ! openssl x509 -checkend 2592000 -noout -in "$SERVER_CERT" >/dev/null; then
    echo "The HTTPS certificate expires within 30 days; renewing it."
    generate_server=true
elif ! openssl verify -CAfile "$CA_CERT" "$SERVER_CERT" >/dev/null 2>&1; then
    echo "The HTTPS certificate is not signed by the current local CA; renewing it."
    generate_server=true
elif ! openssl x509 -in "$SERVER_CERT" -noout -checkip "$HTTPS_IP" >/dev/null ||
     ! openssl x509 -in "$SERVER_CERT" -noout -checkip 127.0.0.1 >/dev/null ||
     ! openssl x509 -in "$SERVER_CERT" -noout -checkhost "$HTTPS_NAME" >/dev/null; then
    echo "The HTTPS certificate does not include the current hostname/IP; renewing it."
    generate_server=true
fi

if [[ "$generate_server" == true ]]; then
    echo "Generating HTTPS certificate for $HTTPS_NAME ($HTTPS_IP)..."
    openssl_config="$(mktemp "$CERT_DIR/openssl.XXXXXX.cnf")"
    server_csr="$(mktemp "$CERT_DIR/server.XXXXXX.csr")"
    trap 'rm -f "$openssl_config" "$server_csr"' EXIT

    {
        echo "[req]"
        echo "distinguished_name = subject"
        echo "prompt = no"
        echo "[subject]"
        echo "CN = $HTTPS_NAME"
        echo "[server_ext]"
        echo "basicConstraints = critical,CA:FALSE"
        echo "keyUsage = critical,digitalSignature,keyEncipherment"
        echo "extendedKeyUsage = serverAuth"
        echo "subjectAltName = @alt_names"
        echo "[alt_names]"
        echo "DNS.1 = localhost"
        echo "DNS.2 = $HTTPS_NAME"
        echo "IP.1 = 127.0.0.1"
        echo "IP.2 = $HTTPS_IP"

        ip_index=3
        while IFS= read -r detected_ip; do
            [[ "$detected_ip" == "$HTTPS_IP" || "$detected_ip" == "127.0.0.1" ]] && continue
            echo "IP.$ip_index = $detected_ip"
            ((ip_index += 1))
        done < <(hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^([0-9]{1,3}\.){3}[0-9]{1,3}$' | sort -u || true)
    } >"$openssl_config"

    openssl req -new -newkey rsa:3072 -sha256 -nodes \
        -keyout "$SERVER_KEY" \
        -out "$server_csr" \
        -config "$openssl_config"
    openssl x509 -req -sha256 \
        -in "$server_csr" \
        -CA "$CA_CERT" \
        -CAkey "$CA_KEY" \
        -CAcreateserial \
        -out "$SERVER_CERT" \
        -days 397 \
        -extfile "$openssl_config" \
        -extensions server_ext

    rm -f "$openssl_config" "$server_csr"
    trap - EXIT
fi

chmod 600 "$CA_KEY" "$SERVER_KEY"
chmod 644 "$CA_CERT" "$SERVER_CERT"

openssl verify -CAfile "$CA_CERT" "$SERVER_CERT" >/dev/null
if ! cmp -s \
    <(openssl pkey -in "$SERVER_KEY" -pubout 2>/dev/null) \
    <(openssl x509 -in "$SERVER_CERT" -pubkey -noout 2>/dev/null); then
    echo "The HTTPS certificate does not match its private key." >&2
    exit 1
fi

LOG_FILE="$PROJECT_DIR/logs/$(date '+%Y%m%d_%H%M%S')_https.log"
PID_FILE="$RUNTIME_DIR/comfyui.pid"

# Only this checkout's main.py processes may be stopped.
is_project_process() {
    [[ "$(readlink -f "/proc/$1/cwd" 2>/dev/null)" == "$PROJECT_DIR" ]] || return 1
    [[ -r "/proc/$1/cmdline" ]] || return 1
    tr '\0' '\n' <"/proc/$1/cmdline" | grep -Eq '(^|/)main[.]py$'
}
pids=()
while IFS= read -r candidate; do
    if is_project_process "$candidate"; then pids+=("$candidate"); fi
done < <(pgrep -u "$(id -u)" -f '(^|/)python(3([.][0-9]+)?)? .*main[.]py' || true)
if ((${#pids[@]})); then
    echo "Stopping ComfyUI (PID: ${pids[*]})..."
    kill "${pids[@]}"

    for _ in {1..30}; do
        running=()
        for pid in "${pids[@]}"; do
            if is_project_process "$pid"; then
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

rm -f "$PID_FILE"
"$PYTHON" - "$HTTPS_PORT" <<'PY'
import socket
import sys
with socket.socket() as listener:
    listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        listener.bind(('0.0.0.0', int(sys.argv[1])))
    except OSError as error:
        sys.exit(f'Port {sys.argv[1]} is unavailable: {error}. No unrelated service was stopped.')
PY

mkdir -p "$(dirname "$LOG_FILE")"
nohup setsid "$PYTHON" -u "$PROJECT_DIR/main.py" \
    --listen 0.0.0.0 \
    --port "$HTTPS_PORT" \
    --tls-keyfile "$SERVER_KEY" \
    --tls-certfile "$SERVER_CERT" \
    --enable-manager \
    --preview-method auto \
    --disable-auto-launch \
    </dev/null >"$LOG_FILE" 2>&1 9>&- &
pid=$!
printf '%s\n' "$pid" >"$PID_FILE"

echo "Waiting for HTTPS API (PID: $pid, timeout: ${START_TIMEOUT}s)..."
deadline=$((SECONDS + START_TIMEOUT))
ready=false
while ((SECONDS < deadline)); do
    if ! kill -0 "$pid" 2>/dev/null; then
        echo "ComfyUI failed to start. Log output:" >&2
        rm -f "$PID_FILE"
        tail -n 60 "$LOG_FILE" >&2
        exit 1
    fi
    if curl --noproxy '*' --cacert "$CA_CERT" --fail --silent --max-time 3 \
        "https://127.0.0.1:$HTTPS_PORT/system_stats" >"$RUNTIME_DIR/system_stats.json" &&
        "$PYTHON" -c 'import json,sys; d=json.load(open(sys.argv[1])); assert "system" in d and "devices" in d' \
        "$RUNTIME_DIR/system_stats.json"; then
        ready=true
        break
    fi
    sleep 1
done
if [[ "$ready" != true ]]; then
    echo "API readiness timed out; process PID $pid may still be starting. Log: $LOG_FILE" >&2
    tail -n 60 "$LOG_FILE" >&2
    exit 1
fi

echo "ComfyUI HTTPS API ready (PID: $pid)."
echo "URL: https://$HTTPS_IP:$HTTPS_PORT/"
echo "Log: $LOG_FILE"
echo
echo "Before first use on each client, install this local CA certificate as a trusted root:"
echo "$CA_CERT"
echo "Do not copy or distribute the private key files (*.key)."
