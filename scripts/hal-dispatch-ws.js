#!/usr/bin/env node
/**
 * hal-dispatch-ws.js
 * Sends a task message to the HAL agent via OpenClaw gateway WebSocket.
 * Usage: node hal-dispatch-ws.js "<task message>"
 */

const WebSocket = require('/usr/local/lib/node_modules/openclaw/node_modules/ws');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(process.env.HOME, '.openclaw/openclaw.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

const token = config?.gateway?.auth?.token;
const port  = config?.gateway?.port || 18789;

if (!token) { console.error('ERROR: No gateway auth token found in openclaw.json'); process.exit(1); }

const task = process.argv[2];
if (!task) { console.error('Usage: hal-dispatch-ws.js "<task>"'); process.exit(1); }

const ws = new WebSocket(`ws://127.0.0.1:${port}`, {
  headers: { Authorization: `Bearer ${token}` }
});

const reqId = `hal-dispatch-${Date.now()}`;
let done = false;

ws.on('open', () => {
  const payload = {
    id: reqId,
    method: 'chat.send',
    params: {
      message: task,
      agentId: 'hal',
      sessionKey: 'agent:hal:main'
    }
  };
  ws.send(JSON.stringify(payload));
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data);
    if (msg.id === reqId) {
      if (msg.error) {
        console.error('ERROR dispatching to HAL:', JSON.stringify(msg.error));
        process.exit(1);
      } else {
        console.log('OK: Task dispatched to HAL');
        done = true;
        ws.close();
        process.exit(0);
      }
    }
  } catch(e) {}
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err.message);
  process.exit(1);
});

ws.on('close', () => {
  if (!done) { console.error('Connection closed before response'); process.exit(1); }
});

setTimeout(() => {
  if (!done) { console.error('Timeout waiting for HAL dispatch response'); process.exit(1); }
}, 15000);
