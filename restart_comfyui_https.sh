#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="/data_ssd/projects/ComfyUI"
HTTPS_IP="${COMFYUI_HTTPS_IP:-172.18.3.19}"
HTTPS_NAME="${COMFYUI_HTTPS_NAME:-$(hostname)}"
CERT_DIR="${COMFYUI_HTTPS_CERT_DIR:-$PROJECT_DIR-certs}"
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

command -v openssl >/dev/null || {
    echo "OpenSSL is required to generate the HTTPS certificate." >&2
    exit 1
}

cd "$PROJECT_DIR"
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate ComfyUI_312

umask 077
mkdir -p "$CERT_DIR"

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
elif ! openssl x509 -in "$SERVER_CERT" -noout -ext subjectAltName | grep -Fq "IP Address:$HTTPS_IP"; then
    echo "The HTTPS certificate does not include $HTTPS_IP; renewing it."
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
nohup python main.py \
    --listen 0.0.0.0 \
    --port 8188 \
    --tls-keyfile "$SERVER_KEY" \
    --tls-certfile "$SERVER_CERT" \
    --enable-manager \
    --preview-method auto \
    >"$LOG_FILE" 2>&1 &
pid=$!

sleep 2
if ! kill -0 "$pid" 2>/dev/null; then
    echo "ComfyUI failed to start. Log output:" >&2
    tail -n 30 "$LOG_FILE" >&2
    exit 1
fi

echo "ComfyUI HTTPS started (PID: $pid)."
echo "URL: https://$HTTPS_IP:8188/"
echo "Log: $LOG_FILE"
echo
echo "Before first use on each client, install this local CA certificate as a trusted root:"
echo "$CA_CERT"
echo "Do not copy or distribute the private key files (*.key)."
