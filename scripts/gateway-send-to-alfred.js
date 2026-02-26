#!/usr/bin/env node
/**
 * gateway-send-to-alfred.js
 * Sends a message to Alfred's main session via OpenClaw gateway WebSocket.
 * Usage: node gateway-send-to-alfred.js "<message>"
 */

const WebSocket = require('/usr/local/lib/node_modules/openclaw/node_modules/ws');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(process.env.HOME, '.openclaw/openclaw.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

const token = process.argv[3] || config?.gateway?.auth?.token;
const port  = parseInt(process.argv[4] || config?.gateway?.port || 18789);
const message = process.argv[2];

if (!token) { console.error('ERROR: No gateway token'); process.exit(1); }
if (!message) { console.error('Usage: gateway-send-to-alfred.js "<message>"'); process.exit(1); }

const ws = new WebSocket(`ws://127.0.0.1:${port}`, {
  headers: { Authorization: `Bearer ${token}` }
});

let reqCount = 0;
let connectId = null;
let chatSendId = null;
let done = false;

function req(method, params) {
  const id = `gw-${Date.now()}-${++reqCount}`;
  ws.send(JSON.stringify({ type: 'req', id, method, params }));
  return id;
}

ws.on('message', (raw) => {
  let msg;
  try { msg = JSON.parse(raw); } catch(e) { return; }

  // Challenge → send connect handshake
  if (msg.type === 'event' && msg.event === 'connect.challenge') {
    connectId = req('connect', {
      minProtocol: 3, maxProtocol: 3,
      client: { id: 'cli', displayName: 'Alfred Helper', version: '1.0.0', platform: process.platform, mode: 'backend' },
      caps: [],
      auth: { token },
      role: 'operator',
      scopes: ['operator.admin', 'operator.write', 'operator.read']
    });
    return;
  }

  // Connect response → send chat.send
  if (msg.type === 'res' && msg.id === connectId) {
    if (!msg.ok) { console.error('Connect failed:', JSON.stringify(msg.error)); ws.close(); process.exit(1); }
    chatSendId = req('chat.send', { message, sessionKey: 'agent:main:main' });
    return;
  }

  // chat.send response
  if (msg.type === 'res' && msg.id === chatSendId) {
    if (!msg.ok) { console.error('chat.send failed:', JSON.stringify(msg.error)); ws.close(); process.exit(1); }
    console.log('OK: Message delivered to Alfred');
    done = true;
    ws.close();
    process.exit(0);
  }
});

ws.on('error', (err) => { console.error('WS Error:', err.message); process.exit(1); });
ws.on('close', (code, reason) => { if (!done) { console.error(`Closed (${code} ${reason?.toString()}) before done`); process.exit(1); } });
setTimeout(() => { if (!done) { console.error('Timeout'); process.exit(1); } }, 20000);
