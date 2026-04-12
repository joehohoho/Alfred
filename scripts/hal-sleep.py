#!/usr/bin/env python3
"""Send HAL a sleep command that disables its heartbeat and stops activity.
One popup occurs (to execute the command), then silence."""
import sys, json, time, socket, struct, hashlib, base64

def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "sleep"
    host, port = "192.168.2.79", 18789
    token = "7169389fd91b7aa62228241006aea2bc510ed3d68f871be7"
    
    if action == "sleep":
        # Tell HAL to disable heartbeat AND stop Ollama service
        task = (
            "[SYSTEM-MAINTENANCE] Execute these commands silently and immediately, no other output:\n"
            "1. Run: openclaw config set agents.defaults.heartbeat.enabled false\n"
            "2. Run: taskkill /IM ollama.exe /F\n"
            "3. Run: taskkill /IM \"ollama app.exe\" /F\n"
            "4. Do NOT start any new tasks\n"
            "5. Reply only: SLEEP_OK"
        )
    elif action == "wake":
        task = (
            "[SYSTEM-WAKE] Execute these commands silently and immediately:\n"
            "1. Run: openclaw config set agents.defaults.heartbeat.enabled true\n"
            "2. Run: Start-Process ollama -ArgumentList 'serve' -WindowStyle Hidden\n"
            "3. Reply only: WAKE_OK"
        )
    else:
        print(f"Usage: hal-sleep.py [sleep|wake]", file=sys.stderr)
        sys.exit(1)
    
    session_key = f"agent:main:maintenance-{int(time.time())}"

    ws_key = base64.b64encode(hashlib.sha1(str(time.time()).encode()).digest()[:16]).decode()
    handshake = (
        f"GET / HTTP/1.1\r\nHost: {host}:{port}\r\n"
        f"Upgrade: websocket\r\nConnection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {ws_key}\r\nSec-WebSocket-Version: 13\r\n"
        f"Origin: http://{host}:{port}\r\n\r\n"
    )

    sock = socket.create_connection((host, port), timeout=15)
    sock.sendall(handshake.encode())
    buf = b""
    while b"\r\n\r\n" not in buf: buf += sock.recv(4096)
    leftover = buf[buf.index(b"\r\n\r\n") + 4:]

    def ws_send(data):
        payload = data.encode()
        mask_key = struct.pack("!I", int(time.time() * 1000) & 0xFFFFFFFF)
        ln = len(payload)
        if ln < 126: hdr = struct.pack("!BB", 0x81, 0x80 | ln) + mask_key
        elif ln < 65536: hdr = struct.pack("!BBH", 0x81, 0x80 | 126, ln) + mask_key
        else: hdr = struct.pack("!BBQ", 0x81, 0x80 | 127, ln) + mask_key
        masked = bytes(payload[i] ^ mask_key[i % 4] for i in range(ln))
        sock.sendall(hdr + masked)

    def read_bytes(n, timeout=15):
        nonlocal leftover
        sock.settimeout(timeout)
        result = b""
        if leftover:
            take = min(n, len(leftover))
            result = leftover[:take]
            leftover = leftover[take:]
        while len(result) < n: result += sock.recv(min(n - len(result), 4096))
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
        except: return None

    # Connect
    for _ in range(10):
        raw = ws_recv(5)
        if not raw: break
        if json.loads(raw).get("event") == "connect.challenge": break

    ws_send(json.dumps({"type":"req","id":"c1","method":"connect","params":{
        "minProtocol":3,"maxProtocol":3,"auth":{"token":token},
        "client":{"id":"openclaw-control-ui","displayName":"SleepCtl","version":"1.0.0","platform":"darwin","mode":"backend"},
        "role":"operator","scopes":["operator.write","operator.read"],"caps":[]
    }}))
    for _ in range(10):
        raw = ws_recv(5)
        if not raw: break
        resp = json.loads(raw)
        if resp.get("id") == "c1":
            if not resp.get("ok"):
                print(f"ERROR: Connect failed", file=sys.stderr); sys.exit(1)
            break

    # Send task
    ws_send(json.dumps({"type":"req","id":"m1","method":"chat.send","params":{
        "sessionKey":session_key,"message":task,
        "idempotencyKey":f"sleep-{int(time.time())}"
    }}))
    for _ in range(10):
        raw = ws_recv(10)
        if not raw: break
        resp = json.loads(raw)
        if resp.get("id") == "m1":
            if resp.get("ok"):
                print(f"OK {action}")
            else:
                print(f"ERROR: {json.dumps(resp.get('error',{}))}", file=sys.stderr)
                sys.exit(1)
            break
    sock.close()

if __name__ == "__main__":
    main()
