#!/usr/bin/env node
/**
 * notification-dedup-engine.js
 * 
 * Semantic notification deduplication system with cooldown windows + stale escalation.
 * Prevents duplicate-question fatigue by:
 * 1. Fingerprinting questions by semantic topic (not just exact title)
 * 2. Enforcing 7-14 day cooldown windows per topic
 * 3. Escalating stale questions only when new evidence arrives
 * 4. Exposing metrics for Command Center visibility
 * 
 * Usage:
 *   node notification-dedup-engine.js --action check --title "..." --body "..." [--source daily-inquiry]
 *   node notification-dedup-engine.js --action report [--json]
 *   node notification-dedup-engine.js --action prune [--older-than-days 30]
 *   node notification-dedup-engine.js --action reset-topic <topic-key>
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const WORKSPACE = process.env.WORKSPACE || path.join(__dirname, "..");
const DEDUP_TRACKING = path.join(WORKSPACE, "memory", "notification-dedup-tracking.json");
const NOTIFICATION_INDEX = path.join(WORKSPACE, "goals", "notifications.json");

// Semantic fingerprinting rules — maps question patterns to topic keys
const SEMANTIC_TOPICS = {
  // CoinUsUp Growth
  "coinusup-growth": [
    /coinusup/i,
    /unlock.*growth|growth.*phase|next.*phase/i,
    /marketing|pricing|features/i,
    /ui.*design|design.*ui|redesign/i,
  ],
  
  // Even Us Up
  "even-us-up": [
    /even us up|evenusup/i,
    /smallest.*win|win.*feel|progress/i,
    /expense.*sharing|splitwise/i,
  ],

  // Signal App
  "signal-app-quality": [
    /signal.*app|app.*signal/i,
    /blocker|data.*quality|poor.*signal/i,
    /backtest|trade.*signal|market.*signal/i,
  ],

  // Consulting & New Products
  "consulting-product-ideas": [
    /consulting|automation.*consulting/i,
    /product.*idea|recurring.*problem|client.*problem/i,
    /saas|sidecar|productiz/i,
  ],

  // Passive Income Strategy
  "passive-income-strategy": [
    /passive.*income|income.*target|revenue.*target/i,
    /\$5000|\$10.*month|cash.*cow/i,
    /time.*allocation|client.*work|maintain.*build/i,
  ],

  // Product Strategy & Philosophy
  "product-philosophy": [
    /opinionated|simpler|one.*thing.*well/i,
    /feature.*strategy/i,
    /user.*ask|what.*users/i,
  ],

  // App Metrics
  "app-metrics": [
    /metric.*watch|watch.*daily|number.*check.*first/i,
    /dau|mrr|churn|feature.*usage|bug.*count/i,
    /celebrate|what.*number/i,
  ],

  // Blockers To New Builds
  "blocker-to-new": [
    /stop.*building.*something.*new|build.*something.*new/i,
    /actual.*blocker|technical.*risk|support.*burden/i,
    /not.*time.*or.*money|not.*knowing.*the.*idea/i,
  ],

  // Consulting Scaling
  "consulting-scaling": [
    /consulting.*systematic|systematic.*consulting/i,
    /scalable|scale.*consulting|productize|repeatable.*template/i,
    /bespoke|1-on-1|one-on-one/i,
  ],

  // Time Allocation
  "time-allocation": [
    /how.*much.*time.*should|time.*passive.*income|passive.*income.*client.*work/i,
    /current.*split|ideal.*split|skewed.*the.*wrong.*way/i,
    /client.*work.*right.*now|maintain.*vs.*build/i,
  ],

  // Workflow & System
  "system-workflow": [
    /workflow|systematic|troubleshoot/i,
    /prioritize|overnight|idle.*hours/i,
  ],

  // New Ideas & Direction
  "new-ideas-direction": [
    /new.*idea|new.*project|build.*something.*new/i,
    /vision.*month|direction|pivot/i,
  ],

  // Market & Growth
  "market-growth": [
    /cross.*project|synerg|infrastructure/i,
    /organic.*growth|marketing.*budget/i,
  ],
};

/**
 * Generate semantic fingerprint for a question
 * Returns: { topic: string, confidence: 0-1, patterns_matched: string[] }
 */
function generateSemanticFingerprint(title, body) {
  const fullText = `${title}\n${body}`.toLowerCase();
  const scores = {};
  
  for (const [topic, patterns] of Object.entries(SEMANTIC_TOPICS)) {
    const matched = [];
    let hitCount = 0;
    
    for (const pattern of patterns) {
      if (pattern.test(fullText)) {
        hitCount++;
        matched.push(pattern.source);
      }
    }
    
    if (hitCount > 0) {
      // Score = (patterns matched / total patterns) for this topic
      scores[topic] = {
        confidence: hitCount / patterns.length,
        matches: hitCount,
        patterns: matched,
      };
    }
  }
  
  // Return highest-confidence match
  if (Object.keys(scores).length === 0) {
    return null; // No match
  }
  
  const topicKey = Object.entries(scores).sort(
    ([, a], [, b]) => b.confidence - a.confidence
  )[0][0];
  
  return {
    topic: topicKey,
    confidence: scores[topicKey].confidence,
    patterns_matched: scores[topicKey].patterns,
  };
}

/**
 * Load or initialize dedup tracking database
 */
function loadTracking() {
  if (fs.existsSync(DEDUP_TRACKING)) {
    try {
      return JSON.parse(fs.readFileSync(DEDUP_TRACKING, "utf8"));
    } catch (e) {
      console.error(`Failed to load tracking: ${e.message}`);
      return initializeTracking();
    }
  }
  return initializeTracking();
}

/**
 * Initialize empty tracking database
 */
function initializeTracking() {
  return {
    schema_version: "1.0",
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    topics: {}, // topic_key => { last_asked_at, count, escalation_tier, blocked_until }
    suppressed: [], // array of suppressed notifications
    metrics: {
      total_checked: 0,
      total_suppressed: 0,
      total_escalated: 0,
      by_reason: {},
    },
  };
}

/**
 * Save tracking database
 */
function saveTracking(data) {
  fs.mkdirSync(path.dirname(DEDUP_TRACKING), { recursive: true });
  fs.writeFileSync(DEDUP_TRACKING, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Check if notification should be suppressed
 * Returns: { suppressed: boolean, reason: string, escalation_suggestion?: string }
 */
function checkDedup(title, body, source = null) {
  const tracking = loadTracking();
  const fingerprint = generateSemanticFingerprint(title, body);
  
  // Update metrics
  tracking.metrics.total_checked++;
  
  if (!fingerprint) {
    return {
      suppressed: false,
      reason: "no_semantic_match",
      fingerprint: null,
    };
  }
  
  const topicKey = fingerprint.topic;
  const now = new Date();
  const topic = tracking.topics[topicKey] || {
    last_asked_at: null,
    count: 0,
    escalation_tier: 0,
    blocked_until: null,
    evidence_updated_at: null,
  };
  
  // Check if currently blocked
  if (topic.blocked_until && new Date(topic.blocked_until) > now) {
    const reason = "cooldown_active";
    tracking.metrics.total_suppressed++;
    tracking.metrics.by_reason[reason] = (tracking.metrics.by_reason[reason] || 0) + 1;
    
    // Log suppression
    tracking.suppressed.push({
      timestamp: now.toISOString(),
      title,
      topic: topicKey,
      reason,
      fingerprint,
    });
    
    saveTracking(tracking);
    
    const blockedUntil = new Date(topic.blocked_until);
    const daysRemaining = Math.ceil((blockedUntil - now) / (1000 * 60 * 60 * 24));
    
    return {
      suppressed: true,
      reason,
      topic: topicKey,
      fingerprint,
      blocked_until: topic.blocked_until,
      days_remaining: daysRemaining,
    };
  }
  
  // If we reach here, notification is NOT suppressed
  // Update topic tracking
  topic.last_asked_at = now.toISOString();
  topic.count = (topic.count || 0) + 1;
  topic.escalation_tier = 0; // Reset escalation for fresh question
  
  // Set next cooldown window (7-14 days based on tier)
  const cooldownDays = topic.count < 3 ? 7 : 14; // Escalate suppression for repeat askers
  const blockedUntil = new Date(now.getTime() + cooldownDays * 24 * 60 * 60 * 1000);
  topic.blocked_until = blockedUntil.toISOString();
  
  tracking.topics[topicKey] = topic;
  tracking.last_updated = now.toISOString();
  
  saveTracking(tracking);
  
  return {
    suppressed: false,
    reason: "allowed",
    topic: topicKey,
    fingerprint,
    next_allowed_after: topic.blocked_until,
    cooldown_days: cooldownDays,
  };
}

/**
 * Mark a topic as having new evidence (resets cooldown)
 * Use this when Joe provides new context for an old question
 */
function addEvidence(topicKey, evidence) {
  const tracking = loadTracking();
  const now = new Date();
  
  if (!tracking.topics[topicKey]) {
    tracking.topics[topicKey] = {
      last_asked_at: null,
      count: 0,
      escalation_tier: 1,
      blocked_until: now.toISOString(),
      evidence_updated_at: now.toISOString(),
    };
  } else {
    const topic = tracking.topics[topicKey];
    topic.escalation_tier = (topic.escalation_tier || 0) + 1;
    topic.evidence_updated_at = now.toISOString();
    
    // NEW EVIDENCE: escalate from cooldown (ask again sooner)
    if (topic.escalation_tier <= 2) {
      // After new evidence, allow asking again after 3 days
      topic.blocked_until = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    }
  }
  
  tracking.metrics.total_escalated++;
  tracking.suppressed.push({
    timestamp: now.toISOString(),
    action: "evidence_added",
    topic: topicKey,
    evidence,
  });
  
  saveTracking(tracking);
}

/**
 * Get dedup report (for Command Center dashboard)
 */
function getReport(json = false) {
  const tracking = loadTracking();
  
  if (json) {
    return JSON.stringify(tracking, null, 2);
  }
  
  // Pretty-printed report
  let report = "# Notification Deduplication Report\n\n";
  report += `**Last Updated:** ${tracking.last_updated}\n\n`;
  
  report += "## Metrics\n";
  report += `- Total notifications checked: ${tracking.metrics.total_checked}\n`;
  report += `- Suppressed: ${tracking.metrics.total_suppressed}\n`;
  report += `- Escalated (new evidence): ${tracking.metrics.total_escalated}\n`;
  report += `- Success rate: ${((1 - tracking.metrics.total_suppressed / tracking.metrics.total_checked) * 100).toFixed(1)}%\n\n`;
  
  if (Object.keys(tracking.metrics.by_reason).length > 0) {
    report += "## Suppression Reasons\n";
    for (const [reason, count] of Object.entries(tracking.metrics.by_reason)) {
      report += `- ${reason}: ${count}\n`;
    }
    report += "\n";
  }
  
  report += "## Active Topics\n";
  const topics = Object.entries(tracking.topics).sort(
    ([, a], [, b]) => new Date(b.last_asked_at) - new Date(a.last_asked_at)
  );
  
  for (const [topicKey, topic] of topics) {
    const now = new Date();
    const blockedUntil = topic.blocked_until ? new Date(topic.blocked_until) : null;
    const daysRemaining = blockedUntil ? Math.ceil((blockedUntil - now) / (1000 * 60 * 60 * 24)) : 0;
    
    report += `\n### ${topicKey}\n`;
    report += `- Asked: ${topic.count}x\n`;
    report += `- Last: ${topic.last_asked_at ? new Date(topic.last_asked_at).toLocaleDateString() : "never"}\n`;
    report += `- Blocked until: ${blockedUntil ? blockedUntil.toLocaleDateString() : "open"} (${daysRemaining} days)\n`;
    report += `- Escalation tier: ${topic.escalation_tier}\n`;
  }
  
  return report;
}

/**
 * Prune old suppression records
 */
function prune(olderThanDays = 30) {
  const tracking = loadTracking();
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  
  const before = tracking.suppressed.length;
  tracking.suppressed = tracking.suppressed.filter(
    (s) => new Date(s.timestamp) > cutoff
  );
  const after = tracking.suppressed.length;
  
  tracking.last_updated = new Date().toISOString();
  saveTracking(tracking);
  
  console.log(`Pruned ${before - after} old suppression records`);
}

/**
 * Reset a topic (clear cooldown, reset count)
 */
function resetTopic(topicKey) {
  const tracking = loadTracking();
  
  if (tracking.topics[topicKey]) {
    delete tracking.topics[topicKey];
    tracking.last_updated = new Date().toISOString();
    saveTracking(tracking);
    console.log(`Reset topic: ${topicKey}`);
  } else {
    console.log(`Topic not found: ${topicKey}`);
  }
}

// CLI Interface
const action = process.argv[2];

if (action === "check") {
  const titleIdx = process.argv.indexOf("--title");
  const bodyIdx = process.argv.indexOf("--body");
  const sourceIdx = process.argv.indexOf("--source");
  
  const title = titleIdx !== -1 ? process.argv[titleIdx + 1] : "";
  const body = bodyIdx !== -1 ? process.argv[bodyIdx + 1] : "";
  const source = sourceIdx !== -1 ? process.argv[sourceIdx + 1] : null;
  
  const result = checkDedup(title, body, source);
  
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result.suppressed ? "SUPPRESSED" : "ALLOWED");
    console.log(JSON.stringify(result, null, 2));
  }
  
  process.exit(result.suppressed ? 1 : 0);
} else if (action === "report") {
  const json = process.argv.includes("--json");
  console.log(getReport(json));
} else if (action === "prune") {
  const daysIdx = process.argv.indexOf("--older-than-days");
  const days = daysIdx !== -1 ? parseInt(process.argv[daysIdx + 1]) : 30;
  prune(days);
} else if (action === "reset-topic") {
  const topicKey = process.argv[3];
  if (!topicKey) {
    console.error("Usage: node notification-dedup-engine.js reset-topic <topic-key>");
    process.exit(1);
  }
  resetTopic(topicKey);
} else if (action === "evidence") {
  const topicIdx = process.argv.indexOf("--topic");
  const evidenceIdx = process.argv.indexOf("--evidence");
  
  const topicKey = topicIdx !== -1 ? process.argv[topicIdx + 1] : null;
  const evidence = evidenceIdx !== -1 ? process.argv[evidenceIdx + 1] : "";
  
  if (!topicKey) {
    console.error("Usage: node notification-dedup-engine.js evidence --topic <key> --evidence <text>");
    process.exit(1);
  }
  
  addEvidence(topicKey, evidence);
  console.log(`Added evidence for topic: ${topicKey}`);
} else {
  console.error(`
Usage:
  node notification-dedup-engine.js check --title "..." --body "..." [--json]
  node notification-dedup-engine.js report [--json]
  node notification-dedup-engine.js prune [--older-than-days 30]
  node notification-dedup-engine.js reset-topic <topic-key>
  node notification-dedup-engine.js evidence --topic <key> --evidence "..."
`);
  process.exit(1);
}
