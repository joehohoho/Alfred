#!/usr/bin/env node

/**
 * Webhook Listener for Notification Answers
 * 
 * Checks for answered notifications and alerts Alfred
 * Runs every 30 seconds during active hours
 * 
 * Usage:
 *   node webhook-listener.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const OC = process.env.OPENCLAW_HOME || path.join(process.env.HOME || "", ".openclaw");
const WEBHOOKS_DIR = path.join(OC, "workspace", "webhooks");
const API_BASE = "http://localhost:3001/api/notifications";

async function getWebhookEvents() {
  return new Promise((resolve) => {
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

      resolve(events);
    } catch (error) {
      console.error("Error reading webhook events:", error.message);
      resolve([]);
    }
  });
}

async function deleteWebhookEvent(eventId) {
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

async function sendAlertToAlfred(event) {
  // In a real system, this would send via OpenClaw message system
  // For now, we log it and Alfred can check the webhook events
  console.log(`\n✅ NEW ANSWER: "${event.title}"`);
  console.log(`Answer: ${event.userAnswer}`);
  console.log(`Timestamp: ${event.answeredAt}`);
}

async function main() {
  try {
    const events = await getWebhookEvents();

    if (events.length === 0) {
      // Silently exit if no events (normal case)
      process.exit(0);
    }

    console.log(`📬 Found ${events.length} answered notification(s)`);

    for (const event of events) {
      await sendAlertToAlfred(event);
      await deleteWebhookEvent(event.id);
    }

    console.log(`✅ Processed ${events.length} event(s)`);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main();
