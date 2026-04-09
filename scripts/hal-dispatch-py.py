#!/usr/bin/env python3
"""Dispatch tasks to HAL via raw TCP WebSocket.
Bypasses macOS LaunchAgent network sandbox that blocks node's ws module."""
import sys, json, time, socket, struct, hashlib, base64

def main():
    if len(sys.argv) < 2:
        print("Usage: hal-dispatch-py.py <message> [session-key]", file=sys.stderr)
        sys.exit(1)

    task_msg = sys.argv[1]
    session_key = sys.argv[2] if len(sys.argv) > 2 else f"agent:main:task-{int(time.time())}-{hashlib.md5(str(time.time()).encode()).hexdigest()[:6]}"
    host, port = "192.168.2.79", 18789
    token = "7169389fd91b7aa62228241006aea2bc510ed3d68f871be7"

    ws_key = base64.b64encode(hashlib.sha1(str(time.time()).encode()).digest()[:16]).decode()
    handshake = (
        f"GET / HTTP/1.1\r\nHost: {host}:{port}\r\n"
        f"Upgrade: websocket\r\nConnection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {ws_key}\r\nSec-WebSocket-Version: 13\r\n"
        f"Origin: http://{host}:{port}\r\n\r\n"
    )

    sock = socket.create_connection((host, port), timeout=10)
    sock.sendall(handshake.encode())

    # Read HTTP upgrade response (may include first WS frame piggybacked)
    buf = b""
    while b"\r\n\r\n" not in buf:
        buf += sock.recv(4096)
    if b"101" not in buf.split(b"\r\n")[0]:
        print("ERROR: WS upgrade failed", file=sys.stderr); sys.exit(1)

    # Split: HTTP headers vs leftover data (may contain first WS frame)
    header_end = buf.index(b"\r\n\r\n") + 4
    leftover = buf[header_end:]

    def ws_send(data):
        payload = data.encode()
        mask_key = struct.pack("!I", int(time.time() * 1000) & 0xFFFFFFFF)
        ln = len(payload)
        if ln < 126: hdr = struct.pack("!BB", 0x81, 0x80 | ln) + mask_key
        elif ln < 65536: hdr = struct.pack("!BBH", 0x81, 0x80 | 126, ln) + mask_key
        else: hdr = struct.pack("!BBQ", 0x81, 0x80 | 127, ln) + mask_key
        masked = bytes(payload[i] ^ mask_key[i % 4] for i in range(ln))
        sock.sendall(hdr + masked)

    def read_bytes(n, timeout=10):
        nonlocal leftover
        sock.settimeout(timeout)
        result = b""
        if leftover:
            take = min(n, len(leftover))
            result = leftover[:take]
            leftover = leftover[take:]
        while len(result) < n:
            result += sock.recv(min(n - len(result), 4096))
        return result

    def ws_recv(timeout=10):
        try:
            header = read_bytes(2, timeout)
            if len(header) < 2: return None
            masked = (header[1] & 0x80) != 0
            length = header[1] & 0x7F
            if length == 126: length = struct.unpack("!H", read_bytes(2))[0]
            elif length == 127: length = struct.unpack("!Q", read_bytes(8))[0]
            mask = read_bytes(4) if masked else None
            data = read_bytes(length)
            if masked: data = bytes(data[i] ^ mask[i % 4] for i in range(len(data)))
            return data.decode()
        except Exception:
            return None

    # Read connect.challenge (may be in leftover from HTTP response)
    raw = ws_recv(5)
    if not raw:
        print("ERROR: No connect.challenge", file=sys.stderr); sys.exit(1)
    msg = json.loads(raw)
    if msg.get("event") != "connect.challenge":
        print(f"ERROR: Expected connect.challenge, got {msg.get('event','?')}", file=sys.stderr); sys.exit(1)

    # Authenticate
    ws_send(json.dumps({"type":"req","id":"c1","method":"connect","params":{
        "minProtocol":3,"maxProtocol":3,
        "auth":{"token":token},
        "client":{"id":"openclaw-control-ui","displayName":"HAL Dispatcher","version":"1.0.0","platform":"darwin","mode":"backend"},
        "role":"operator","scopes":["operator.write","operator.read"],"caps":[]
    }}))
    resp = json.loads(ws_recv(5) or "{}")
    if not resp.get("ok"):
        print(f"ERROR: Auth failed: {json.dumps(resp)}", file=sys.stderr); sys.exit(1)

    # Send task
    ws_send(json.dumps({"type":"req","id":"m1","method":"chat.send","params":{
        "agentId":"main","sessionKey":session_key,
        "payload":{"kind":"agentTurn","text":task_msg},
        "idempotencyKey":f"dispatch-{int(time.time())}"
    }}))
    chat_resp = json.loads(ws_recv(10) or "{}")
    if chat_resp.get("ok"):
        print(f"OK session={session_key}")
    else:
        print(f"ERROR: {json.dumps(chat_resp)}", file=sys.stderr); sys.exit(1)
    sock.close()

if __name__ == "__main__":
    main()
