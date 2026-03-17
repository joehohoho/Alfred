#!/usr/bin/env node
/**
 * hal-dispatch-ws.js
 * Sends a task message to HAL via its REMOTE OpenClaw gateway (192.168.2.79).
 * HAL runs Qwen 2.5 Coder 14B locally — no API rate limits consumed.
 *
 * Each dispatch uses an ISOLATED session (unique sessionKey) so HAL's
 * context never accumulates cross-task bloat.
 *
 * Usage: node hal-dispatch-ws.js "<task message>" [--session-key <key>]
 *        HAL_GATEWAY_URL=ws://host:port HAL_GATEWAY_TOKEN=xxx node hal-dispatch-ws.js "<task>"
 *
 * Session key logic:
 *   Default: agent:main:task-<timestamp>-<random6>  (isolated, fresh context)
 *   Override: pass --session-key <key> for multi-turn tasks that need continuity
 *
 * Connection strategy (fallback):
 *   1. Try as 'openclaw-control-ui' — gets operator.write when dangerouslyDisableDeviceAuth: true
 *   2. If device identity required, retry as 'cli' — works if gateway grants scopes to CLI clients
 *   3. Clear diagnostics on scope errors so the fix is actionable
 *
 * Outputs the session key used to stdout on success so callers can track it.
 */

const WebSocket = require('/usr/local/lib/node_modules/openclaw/node_modules/ws');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Remote HAL gateway config (HAL's own OpenClaw instance on Windows PC)
const HAL_GATEWAY_URL = process.env.HAL_GATEWAY_URL || 'ws://192.168.2.79:18789';
const HAL_GATEWAY_TOKEN = process.env.HAL_GATEWAY_TOKEN || 'ceebc03825b2a3d143b4097f4ebfb1649a874d91db1a2115';
// On HAL's gateway, the agent is "main" (not "hal" — that's only on Alfred's local gateway)
const HAL_AGENT_ID = process.env.HAL_AGENT_ID || 'main';

const token = HAL_GATEWAY_TOKEN;
const gatewayUrl = HAL_GATEWAY_URL;

if (!token) { console.error('ERROR: No HAL gateway auth token'); process.exit(1); }

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
const sessionKey = sessionKeyOverride || `agent:${HAL_AGENT_ID}:task-${Date.now()}-${shortId}`;

// Client IDs to try in order — control-ui gets operator.write when dangerouslyDisableDeviceAuth is true
const CLIENT_IDS = ['openclaw-control-ui', 'cli'];

let attemptIndex = 0;

function attemptConnection() {
  const clientId = CLIENT_IDS[attemptIndex];
  const ws = new WebSocket(gatewayUrl, {
    headers: { origin: gatewayUrl.replace('ws://', 'http://') }
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
    if (msg.event === 'connect.challenge' && msg.payload && msg.payload.nonce) {
      send('connect', {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: clientId,
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

    // Handle connect rejection — try next client ID if available
    if (msg.ok === false && !connected) {
      const errCode = msg.error && msg.error.details && msg.error.details.code;
      const errMsg = msg.error && msg.error.message;

      // Device identity required → control-ui won't work, try cli
      if (errCode === 'CONTROL_UI_DEVICE_IDENTITY_REQUIRED') {
        ws.close();
        attemptIndex++;
        if (attemptIndex < CLIENT_IDS.length) {
          attemptConnection();
          return;
        }
        console.error(`ERROR: HAL gateway requires device identity for control-ui and no fallback client has operator.write scope. Fix: set dangerouslyDisableDeviceAuth: true in HAL's openclaw.json controlUi config, then restart HAL's gateway.`);
        process.exit(1);
        return;
      }

      // Auth failure
      console.error(`ERROR connecting to HAL (client=${clientId}): ${errMsg || JSON.stringify(msg.error)}`);
      ws.close();
      process.exit(1);
      return;
    }

    // Handle successful connect response (remote gateway uses payload, local uses result)
    const connectPayload = msg.payload || msg.result;
    if (!connected && msg.ok === true && connectPayload) {
      connected = true;
      const idempotencyKey = crypto.randomUUID();
      pendingId = send('chat.send', {
        message: task,
        sessionKey: sessionKey,
        idempotencyKey: idempotencyKey
      });
      return;
    }

    // Handle chat.send response
    if (msg.id === pendingId) {
      if (msg.error || msg.ok === false) {
        const errCode = msg.error && msg.error.code;
        const errMsg = msg.error && msg.error.message;

        // Scope error with current client — try next client ID
        if (errMsg && errMsg.includes('missing scope') && attemptIndex + 1 < CLIENT_IDS.length) {
          ws.close();
          attemptIndex++;
          attemptConnection();
          return;
        }

        // Scope error with no more fallbacks — actionable diagnostic
        if (errMsg && errMsg.includes('missing scope')) {
          console.error(`ERROR: HAL gateway denied operator.write scope (tried clients: ${CLIENT_IDS.slice(0, attemptIndex + 1).join(', ')}). Fix: set dangerouslyDisableDeviceAuth: true in HAL's openclaw.json gateway.controlUi config, then restart HAL's gateway.`);
        } else {
          console.error('ERROR dispatching to HAL:', JSON.stringify(msg.error));
        }
        done = true;
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
    if (!done) {
      console.error('WebSocket error:', err.message);
      process.exit(1);
    }
  });

  ws.on('close', (code, reason) => {
    if (!done && attemptIndex >= CLIENT_IDS.length) {
      console.error(`Connection closed (${code} ${reason}) before dispatch completed`);
      process.exit(1);
    }
  });

  // Timeout covers all attempts (30s total from first attempt)
  if (attemptIndex === 0) {
    setTimeout(() => {
      if (!done) {
        console.error('Timeout waiting for HAL dispatch');
        process.exit(1);
      }
    }, 30000);
  }
}

attemptConnection();
