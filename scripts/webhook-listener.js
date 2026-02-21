#!/usr/bin/env node

/**
 * Webhook Listener for Notification Answers
 *
 * Backup delivery mechanism: reads webhook event files and re-delivers
 * answers to Alfred via the Command Center gateway relay.
 * Only deletes webhook files after confirmed delivery.
 *
 * Usage:
 *   node webhook-listener.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const OC = process.env.OPENCLAW_HOME || path.join(process.env.HOME || "", ".openclaw");
const WEBHOOKS_DIR = path.join(OC, "workspace", "webhooks");
const API_BASE = "http://localhost:3001/api/notifications";

async function getWebhookEvents() {
  try {
    if (!fs.existsSync(WEBHOOKS_DIR)) {
      fs.mkdirSync(WEBHOOKS_DIR, { recursive: true });
    }

    const files = fs.readdirSync(WEBHOOKS_DIR).filter(f => f.endsWith('.json'));
    const events = files
      .map(file => {
        try {
          const content = fs.readFileSync(path.join(WEBHOOKS_DIR, file), 'utf-8');
          return JSON.parse(content);
        } catch (e) {
          return null;
        }
      })
      .filter(e => e !== null)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return events;
  } catch (error) {
    console.error("Error reading webhook events:", error.message);
    return [];
  }
}

function deleteWebhookEvent(eventId) {
  const eventFile = path.join(WEBHOOKS_DIR, `${eventId}.json`);
  try {
    if (fs.existsSync(eventFile)) {
      fs.unlinkSync(eventFile);
      return true;
    }
  } catch (error) {
    console.error(`Error deleting event ${eventId}:`, error.message);
  }
  return false;
}

// Re-deliver the answer to Alfred via Command Center's redeliver endpoint
function redeliverAnswer(notificationId) {
  return new Promise((resolve) => {
    const url = new URL(`${API_BASE}/${notificationId}/redeliver`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (res.statusCode === 200 && (data.success || data.alreadyDelivered)) {
            resolve({ success: true, alreadyDelivered: !!data.alreadyDelivered });
          } else {
            console.error(`  Redeliver failed (HTTP ${res.statusCode}):`, data.error || body);
            resolve({ success: false });
          }
        } catch {
          console.error(`  Redeliver failed: invalid response`);
          resolve({ success: false });
        }
      });
    });

    req.on('error', (err) => {
      console.error(`  Redeliver failed (network):`, err.message);
      resolve({ success: false });
    });

    req.on('timeout', () => {
      req.destroy();
      console.error(`  Redeliver failed: timeout`);
      resolve({ success: false });
    });

    req.end();
  });
}

async function main() {
  try {
    const events = await getWebhookEvents();

    if (events.length === 0) {
      process.exit(0);
    }

    console.log(`Found ${events.length} pending webhook event(s)`);

    let delivered = 0;
    let failed = 0;

    for (const event of events) {
      if (!event.notificationId) {
        console.warn(`  Skipping event ${event.id}: no notificationId`);
        deleteWebhookEvent(event.id);
        continue;
      }

      console.log(`  Redelivering: "${event.title}" (${event.notificationId})`);
      const result = await redeliverAnswer(event.notificationId);

      if (result.success) {
        deleteWebhookEvent(event.id);
        delivered++;
        if (result.alreadyDelivered) {
          console.log(`    Already delivered — cleaned up webhook file`);
        } else {
          console.log(`    Delivered successfully`);
        }
      } else {
        failed++;
        console.log(`    Failed — will retry next run`);
      }
    }

    console.log(`Done: ${delivered} delivered, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main();
