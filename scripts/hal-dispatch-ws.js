#!/usr/bin/env node
/**
 * hal-dispatch-ws.js
 * Sends a task message to the HAL agent via OpenClaw gateway WebSocket.
 * Each dispatch uses an ISOLATED session (unique sessionKey) so HAL's
 * context never accumulates cross-task bloat.
 * agent:hal:main is reserved for interactive/manual use only.
 *
 * Usage: node hal-dispatch-ws.js "<task message>" [--session-key <key>]
 *
 * Session key logic:
 *   Default: agent:hal:task-<timestamp>-<random6>  (isolated, fresh context)
 *   Override: pass --session-key <key> for multi-turn tasks that need continuity
 *
 * Outputs the session key used to stdout on success so callers can track it.
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

// Parse args
let task = null;
let sessionKeyOverride = null;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--session-key' && args[i + 1]) {
    sessionKeyOverride = args[++i];
  } else if (!task) {
    task = args[i];
  }
}

if (!task) { console.error('Usage: hal-dispatch-ws.js "<task>" [--session-key <key>]'); process.exit(1); }

// Check forced-idle state — refuse new dispatches when HAL is in maintenance mode
const FORCED_IDLE_PATH = path.join(process.env.HOME, '.openclaw/workspace/.hal-alfred-tracking/hal-forced-idle.json');
try {
  if (fs.existsSync(FORCED_IDLE_PATH)) {
    const state = JSON.parse(fs.readFileSync(FORCED_IDLE_PATH, 'utf8'));
    if (state.forcedIdle) {
      console.error(`BLOCKED: HAL is in forced idle (maintenance) since ${state.since}. Wake HAL from the Command Center before dispatching.`);
      process.exit(2);
    }
  }
} catch (e) { /* ignore read errors, proceed with dispatch */ }

// Generate an isolated session key for this task (fresh context, no bloat)
const shortId = crypto.randomBytes(3).toString('hex'); // 6 hex chars
const sessionKey = sessionKeyOverride || `agent:hal:task-${Date.now()}-${shortId}`;

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

  // Handle connect response
  if (!connected && msg.result && msg.result.protocol !== undefined) {
    connected = true;
    pendingId = send('chat.send', {
      message: task,
      agentId: 'hal',
      sessionKey: sessionKey
    });
    return;
  }

  // Also accept result for any connect id
  if (!connected && msg.result) {
    connected = true;
    pendingId = send('chat.send', {
      message: task,
      agentId: 'hal',
      sessionKey: sessionKey
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
      // Output session key so callers can log/track it
      console.log(`OK session=${sessionKey}`);
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
