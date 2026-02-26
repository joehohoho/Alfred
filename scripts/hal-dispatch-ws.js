#!/usr/bin/env node
/**
 * hal-dispatch-ws.js
 * Sends a task message to the HAL agent via OpenClaw gateway WebSocket.
 * Implements the connect.challenge → connect handshake correctly.
 * Usage: node hal-dispatch-ws.js "<task message>"
 */

const WebSocket = require('/usr/local/lib/node_modules/openclaw/node_modules/ws');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG_PATH = path.join(process.env.HOME, '.openclaw/openclaw.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

const token = config?.gateway?.auth?.token;
const port  = config?.gateway?.port || 18789;

if (!token) { console.error('ERROR: No gateway auth token in openclaw.json'); process.exit(1); }

const task = process.argv[2];
if (!task) { console.error('Usage: hal-dispatch-ws.js "<task>"'); process.exit(1); }

const ws = new WebSocket(`ws://127.0.0.1:${port}`, {
  headers: { Authorization: `Bearer ${token}` }
});

let connected = false;
let done = false;
let pendingId = null;
let reqCounter = 1;

function send(method, params) {
  const id = `hal-${Date.now()}-${reqCounter++}`;
  ws.send(JSON.stringify({ type: 'req', id, method, params }));
  return id;
}

ws.on('open', () => {
  // Wait for connect.challenge event before sending anything
});

ws.on('message', (data) => {
  let msg;
  try { msg = JSON.parse(data); } catch(e) { return; }

  // Handle connect.challenge → respond with connect handshake
  if (msg.event === 'connect.challenge' && msg.payload?.nonce) {
    const nonce = msg.payload.nonce.trim();
    send('connect', {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: 'cli',
        displayName: 'HAL Dispatcher',
        version: '1.0.0',
        platform: process.platform,
        mode: 'backend'
      },
      caps: [],
      auth: { token },
      role: 'operator',
      scopes: ['operator.admin', 'operator.write', 'operator.read']
    });
    return;
  }

  // Handle connect response (helloOk)
  if (!connected && msg.result && msg.result.protocol !== undefined) {
    connected = true;
    // Now send the actual chat message to HAL
    pendingId = send('chat.send', {
      message: task,
      agentId: 'hal',
      sessionKey: 'agent:hal:main'
    });
    return;
  }

  // Also accept result for any connect id
  if (!connected && msg.result) {
    connected = true;
    pendingId = send('chat.send', {
      message: task,
      agentId: 'hal',
      sessionKey: 'agent:hal:main'
    });
    return;
  }

  // Handle chat.send response
  if (msg.id === pendingId) {
    if (msg.error) {
      console.error('ERROR dispatching to HAL:', JSON.stringify(msg.error));
      ws.close();
      process.exit(1);
    } else {
      console.log('OK: Task dispatched to HAL');
      done = true;
      ws.close();
      process.exit(0);
    }
  }
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err.message);
  process.exit(1);
});

ws.on('close', (code, reason) => {
  if (!done) {
    console.error(`Connection closed (${code} ${reason}) before dispatch completed`);
    process.exit(1);
  }
});

setTimeout(() => {
  if (!done) {
    console.error('Timeout waiting for HAL dispatch');
    process.exit(1);
  }
}, 20000);
