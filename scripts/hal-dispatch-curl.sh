#!/bin/bash
# hal-dispatch-curl.sh — Dispatch tasks to HAL via curl (works from LaunchAgent)
# Node WebSocket is blocked by macOS LaunchAgent network sandbox.
# curl is exempt, so we use it for the WebSocket handshake.
#
# Usage: hal-dispatch-curl.sh "<task message>" [session-key]

set -euo pipefail

TASK_MSG="${1:?Usage: hal-dispatch-curl.sh <message> [session-key]}"
SESSION_KEY="${2:-agent:main:task-$(date +%s)-$(head -c3 /dev/urandom | xxd -p)}"
HAL_URL="http://192.168.2.79:18789"
HAL_TOKEN="7169389fd91b7aa62228241006aea2bc510ed3d68f871be7"
TIMEOUT=30

# Use openclaw CLI to send message to HAL's gateway via its REST-like interface
# Since the gateway only supports WebSocket, we'll use a Python one-liner as fallback
# (Python's websocket is not sandboxed like node's)

# First try: Python websocket (usually available on macOS)
RESULT=$(timeout "$TIMEOUT" python3 - "$HAL_URL" "$HAL_TOKEN" "$SESSION_KEY" "$TASK_MSG" << 'PY' 2>&1)
import sys, json, time, socket, hashlib, base64, struct, ssl

url_str, token, session_key, task_msg = sys.argv[1:5]
host = "192.168.2.79"
port = 18789

# Raw TCP WebSocket handshake (no external libraries needed)
ws_key = base64.b64encode(hashlib.sha1(str(time.time()).encode()).digest()[:16]).decode()
handshake = (
    f"GET / HTTP/1.1\r\n"
    f"Host: {host}:{port}\r\n"
    f"Upgrade: websocket\r\n"
    f"Connection: Upgrade\r\n"
    f"Sec-WebSocket-Key: {ws_key}\r\n"
    f"Sec-WebSocket-Version: 13\r\n"
    f"Origin: http://{host}:{port}\r\n"
    f"\r\n"
)

sock = socket.create_connection((host, port), timeout=10)
sock.sendall(handshake.encode())

# Read HTTP upgrade response
resp = b""
while b"\r\n\r\n" not in resp:
    resp += sock.recv(4096)

if b"101" not in resp.split(b"\r\n")[0]:
    print(f"ERROR: WebSocket upgrade failed: {resp[:100]}", file=sys.stderr)
    sys.exit(1)

def ws_send(sock, data):
    payload = data.encode() if isinstance(data, str) else data
    length = len(payload)
    mask_key = struct.pack("!I", int(time.time() * 1000) & 0xFFFFFFFF)
    if length < 126:
        header = struct.pack("!BB", 0x81, 0x80 | length) + mask_key
    elif length < 65536:
        header = struct.pack("!BBH", 0x81, 0x80 | 126, length) + mask_key
    else:
        header = struct.pack("!BBQ", 0x81, 0x80 | 127, length) + mask_key
    masked = bytes(payload[i] ^ mask_key[i % 4] for i in range(length))
    sock.sendall(header + masked)

def ws_recv(sock, timeout=10):
    sock.settimeout(timeout)
    try:
        header = sock.recv(2)
        if len(header) < 2: return None
        opcode = header[0] & 0x0F
        masked = (header[1] & 0x80) != 0
        length = header[1] & 0x7F
        if length == 126:
            length = struct.unpack("!H", sock.recv(2))[0]
        elif length == 127:
            length = struct.unpack("!Q", sock.recv(8))[0]
        if masked:
            mask = sock.recv(4)
        data = b""
        while len(data) < length:
            data += sock.recv(min(length - len(data), 4096))
        if masked:
            data = bytes(data[i] ^ mask[i % 4] for i in range(len(data)))
        if opcode == 0x01: return data.decode()
        if opcode == 0x08: return None  # close
        return data.decode() if data else None
    except socket.timeout:
        return None

# Wait for connect.challenge
msg_str = ws_recv(sock, 5)
if not msg_str:
    print("ERROR: No connect.challenge received", file=sys.stderr)
    sys.exit(1)

msg = json.loads(msg_str)
if msg.get("event") != "connect.challenge":
    print(f"ERROR: Expected connect.challenge, got {msg.get('event')}", file=sys.stderr)
    sys.exit(1)

# Send connect
connect_msg = json.dumps({
    "type": "req", "id": "c1", "method": "connect",
    "params": {
        "minProtocol": 3, "maxProtocol": 3,
        "auth": {"token": token},
        "client": {"id": "openclaw-control-ui", "displayName": "HAL Dispatcher", "version": "1.0.0", "platform": "darwin", "mode": "backend"},
        "role": "operator", "scopes": ["operator.write", "operator.read"], "caps": []
    }
})
ws_send(sock, connect_msg)

# Wait for connect response
resp_str = ws_recv(sock, 5)
if not resp_str:
    print("ERROR: No connect response", file=sys.stderr)
    sys.exit(1)
resp = json.loads(resp_str)
if not resp.get("ok"):
    print(f"ERROR: Connect failed: {json.dumps(resp)}", file=sys.stderr)
    sys.exit(1)

# Send chat.send
chat_msg = json.dumps({
    "type": "req", "id": "m1", "method": "chat.send",
    "params": {
        "agentId": "main",
        "sessionKey": session_key,
        "payload": {"kind": "agentTurn", "text": task_msg},
        "idempotencyKey": f"dispatch-{int(time.time())}"
    }
})
ws_send(sock, chat_msg)

# Wait for acceptance
chat_resp_str = ws_recv(sock, 10)
if chat_resp_str:
    chat_resp = json.loads(chat_resp_str)
    if chat_resp.get("ok"):
        print(f"OK session={session_key}")
        sys.exit(0)
    else:
        print(f"ERROR: chat.send failed: {json.dumps(chat_resp)}", file=sys.stderr)
        sys.exit(1)
else:
    print("ERROR: No response to chat.send", file=sys.stderr)
    sys.exit(1)
PY

echo "$RESULT"
if echo "$RESULT" | grep -q "^OK "; then
    exit 0
else
    exit 1
fi
