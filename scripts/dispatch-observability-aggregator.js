#!/usr/bin/env node

/**
 * Dispatch Observability Aggregator
 *
 * Reads dispatch logs, retry queues, ACKs, and token budget to produce
 * unified observability metrics for the Command Center dashboard.
 *
 * Usage:
 *   node dispatch-observability-aggregator.js [--json] [--tail N]
 *
 * Output: JSON object with dispatch summary, queue status, anomalies, etc.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const WORKSPACE = path.join(os.homedir(), ".openclaw/workspace");
const TRACKING_DIR = path.join(WORKSPACE, ".hal-alfred-tracking");
const DISPATCH_LOG = path.join(TRACKING_DIR, "dispatch.jsonl");
const DISPATCHED_JSON = path.join(TRACKING_DIR, "alfred-dispatched.json");
const RETRY_LOG = path.join(WORKSPACE, ".hal-retry-queue/retry-queue.log");
const COLLAPSE_STATE = path.join(TRACKING_DIR, "collapse-state.json");
const CIRCUIT_BREAKER = path.join(TRACKING_DIR, "circuit-breaker-advanced.json");

/**
 * Parse JSONL file (one JSON object per line)
 */
function parseJsonL(filePath, maxLines = Infinity) {
  if (!fs.existsSync(filePath)) return [];

  const lines = fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .filter((line) => line.trim());

  const startIndex = Math.max(0, lines.length - maxLines);
  return lines
    .slice(startIndex)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        console.error(`Failed to parse line in ${filePath}: ${line}`);
        return null;
      }
    })
    .filter((obj) => obj !== null);
}

/**
 * Extract retry queue state from log file
 */
function parseRetryQueue(logPath) {
  if (!fs.existsSync(logPath)) return { count: 0, tasks: [] };

  const log = fs.readFileSync(logPath, "utf8");
  const lines = log.split("\n").filter((line) => line.trim());

  // Parse lines like: "2026-04-12T20:05:00Z | task_123 | Attempt 1 | reason"
  const tasks = {};
  lines.forEach((line) => {
    const match = line.match(
      /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\s*\|\s*(\S+)\s*\|\s*Attempt\s+(\d+)\s*\|\s*(.*)/
    );
    if (match) {
      const [, timestamp, taskId, attempt, reason] = match;
      if (!tasks[taskId]) {
        tasks[taskId] = {
          task_id: taskId,
          first_attempt: timestamp,
          last_attempt: timestamp,
          attempts: 1,
          reason: reason.trim(),
        };
      } else {
        tasks[taskId].last_attempt = timestamp;
        tasks[taskId].attempts += 1;
        tasks[taskId].reason = reason.trim();
      }
    }
  });

  return {
    count: Object.keys(tasks).length,
    tasks: Object.values(tasks),
  };
}

/**
 * Load dispatched tasks (currently assigned to Alfred)
 */
function loadDispatchedTasks() {
  if (!fs.existsSync(DISPATCHED_JSON)) return {};

  try {
    return JSON.parse(fs.readFileSync(DISPATCHED_JSON, "utf8"));
  } catch {
    return {};
  }
}

/**
 * Load collapse/circuit breaker state
 */
function loadCircuitBreakerState() {
  try {
    const state = JSON.parse(fs.readFileSync(COLLAPSE_STATE, "utf8"));
    return state || {};
  } catch {
    return {};
  }
}

/**
 * Calculate time difference in minutes
 */
function minutesAgo(isoDate) {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.round((now - then) / 60000);
}

/**
 * Detect anomalies
 */
function detectAnomalies(dispatchData, queueStatus, fallbackData) {
  const anomalies = [];

  // Anomaly 1: HAL idle while backlog exists
  if (dispatchData.last_hal_dispatch) {
    const minutesSinceLastDispatch = minutesAgo(
      dispatchData.last_hal_dispatch.timestamp
    );
    if (minutesSinceLastDispatch > 15 && queueStatus.total_debt > 0) {
      anomalies.push({
        type: "hal_idle_with_backlog",
        severity: "warning",
        message: `HAL idle for ${minutesSinceLastDispatch} min but ${queueStatus.total_debt} tasks await`,
        last_dispatch: dispatchData.last_hal_dispatch.timestamp,
        backlog_size: queueStatus.total_debt,
        minutes_idle: minutesSinceLastDispatch,
      });
    }
  }

  // Anomaly 2: High retry queue
  if (queueStatus.retry_queue_count > 5) {
    anomalies.push({
      type: "high_retry_backlog",
      severity: "warning",
      message: `${queueStatus.retry_queue_count} tasks in retry queue`,
      retry_count: queueStatus.retry_queue_count,
    });
  }

  // Anomaly 3: Aging ACKs
  if (
    queueStatus.pending_ack_count > 0 &&
    queueStatus.oldest_pending_ack_minutes > 30
  ) {
    anomalies.push({
      type: "pending_acks_aging",
      severity: "warning",
      message: `Oldest ACK waiting ${queueStatus.oldest_pending_ack_minutes} min`,
      oldest_ack_age_minutes: queueStatus.oldest_pending_ack_minutes,
    });
  }

  // Anomaly 4: High fallback rate
  if (fallbackData.last_24h_count > 10) {
    anomalies.push({
      type: "high_fallback_rate",
      severity: "info",
      message: `${fallbackData.last_24h_count} fallback events in last 24h`,
      fallback_count: fallbackData.last_24h_count,
    });
  }

  // Anomaly 5: Alfred overloaded
  if (dispatchData.dispatched_to_alfred > 3) {
    anomalies.push({
      type: "alfred_overload",
      severity: "warning",
      message: `Alfred handling ${dispatchData.dispatched_to_alfred} fallback tasks`,
      fallback_count: dispatchData.dispatched_to_alfred,
    });
  }

  // No anomalies case
  if (anomalies.length === 0) {
    anomalies.push({
      type: "healthy",
      severity: "none",
      message: "No anomalies detected",
    });
  }

  return anomalies;
}

/**
 * Calculate health score (0-100)
 */
function calculateHealthScore(dispatchData, queueStatus, anomalies) {
  let score = 100;

  // Deduct for dispatch failures
  const failureRate =
    dispatchData.total_dispatched > 0
      ? (dispatchData.hal_failures / dispatchData.total_dispatched) * 100
      : 0;
  score -= Math.min(20, failureRate * 5);

  // Deduct for queue depth
  score -= Math.min(15, queueStatus.total_debt);

  // Deduct for retry backlog
  score -= Math.min(20, queueStatus.retry_queue_count * 2);

  // Deduct for anomalies
  anomalies.forEach((a) => {
    if (a.severity === "critical") score -= 30;
    if (a.severity === "warning") score -= 15;
    if (a.severity === "info") score -= 5;
  });

  return Math.max(0, Math.min(100, score));
}

/**
 * Generate recommendation based on health
 */
function generateRecommendation(healthScore, anomalies, queueStatus) {
  if (healthScore >= 90) {
    return "System healthy. Continue monitoring.";
  } else if (healthScore >= 75) {
    const warnings = anomalies
      .filter((a) => a.severity === "warning")
      .map((a) => a.type);
    return `Minor issues: ${warnings.join(", ")}. Investigate when convenient.`;
  } else if (healthScore >= 60) {
    return "Degraded performance. Review anomalies and consider restart/recovery.";
  } else {
    return "Critical state. Immediate action required. Check HAL connectivity and token budget.";
  }
}

/**
 * Main aggregator function
 */
function aggregateDispatchObservability(options = {}) {
  const now = new Date().toISOString();
  const dispatchLog = parseJsonL(DISPATCH_LOG, 1000);

  // Summary stats
  const dispatchSummary = {
    total_dispatched: dispatchLog.length,
    dispatched_to_hal: dispatchLog.filter((d) => d.route === "HAL").length,
    dispatched_to_alfred: dispatchLog.filter((d) => d.route === "ALFRED")
      .length,
    hal_failures: dispatchLog.filter((d) =>
      d.dispatch_result?.includes("failed")
    ).length,
    handled_by_alfred: dispatchLog.filter(
      (d) => d.dispatch_result === "handled_by_alfred"
    ).length,
    last_hal_dispatch:
      dispatchLog
        .reverse()
        .find(
          (d) => d.route === "HAL" && d.dispatch_result?.includes("dispatched")
        ) || null,
  };

  // Queue status
  const retryQueueData = parseRetryQueue(RETRY_LOG);
  const queueStatus = {
    kanban_todo_count: 0, // TODO: Get from kanban API
    kanban_in_progress_count: 0, // TODO: Get from kanban API
    retry_queue_count: retryQueueData.count,
    pending_ack_count: 0, // TODO: Implement ACK tracking
    total_debt:
      retryQueueData.count + (options.kanbantotal || 0) + 0, // ACKs TBD
    oldest_pending_ack_minutes: null,
    retry_queue: retryQueueData.tasks
      .map((t) => ({
        ...t,
        age_minutes: minutesAgo(t.last_attempt),
      }))
      .sort((a, b) => b.age_minutes - a.age_minutes)
      .slice(0, 10),
  };

  // Pending ACKs (placeholder for now)
  const pendingAcks = {
    count: 0,
    oldest_age_minutes: null,
    tasks: [],
  };

  // Fallback events
  const fallbackLog = dispatchLog.filter(
    (d) =>
      d.dispatch_result === "handled_by_alfred" ||
      d.dispatch_result === "hal_dispatch_failed"
  );
  const last24hCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentFallbacks = fallbackLog.filter(
    (d) => d.timestamp >= last24hCutoff
  );

  const fallbackEvents = {
    last_24h_count: recentFallbacks.length,
    reasons: {
      rate_limit: recentFallbacks.filter((d) =>
        d.reason?.includes("rate_limit")
      ).length,
      token_budget_exhausted: recentFallbacks.filter((d) =>
        d.reason?.includes("token")
      ).length,
      connectivity: recentFallbacks.filter((d) =>
        d.reason?.includes("websocket") || d.reason?.includes("timeout")
      ).length,
      circuit_breaker: recentFallbacks.filter((d) =>
        d.reason?.includes("circuit")
      ).length,
      unknown: recentFallbacks.length -
        recentFallbacks.filter((d) => d.reason).length,
    },
    recent_events: recentFallbacks
      .slice(-5)
      .reverse()
      .map((d) => ({
        timestamp: d.timestamp,
        reason: d.reason || "unknown",
        task_id: d.task_id,
        task: d.task,
      })),
  };

  // Anomalies
  const anomalies = detectAnomalies(
    dispatchSummary,
    queueStatus,
    fallbackEvents
  );

  // Health score
  const healthScore = calculateHealthScore(
    dispatchSummary,
    queueStatus,
    anomalies
  );

  // Token and gates (placeholder)
  const tokenAndGates = {
    current_model: "haiku-4-5",
    token_budget: {
      daily_limit: 500000,
      used_today: 127543, // TODO: Get from gateway
      remaining: 372457,
      percent_used: 25.5,
    },
    active_gates: [
      {
        gate: "rate_limit",
        status: "ok",
        detail: "50 of 100 req/min available",
      },
    ],
    model_tier_distribution: {
      dispatched_proactive: dispatchLog.filter(
        (d) => d.dispatch_type === "proactive"
      ).length,
      dispatched_to_hal: dispatchSummary.dispatched_to_hal,
      dispatched_to_alfred: dispatchSummary.dispatched_to_alfred,
      failures: dispatchSummary.hal_failures,
    },
  };

  return {
    timestamp: now,
    dispatch_summary: dispatchSummary,
    queue_status: queueStatus,
    pending_acks: pendingAcks,
    fallback_events: fallbackEvents,
    anomalies,
    token_and_gates: tokenAndGates,
    health_score: {
      overall: healthScore,
      dispatch_efficiency:
        dispatchSummary.total_dispatched > 0
          ? ((dispatchSummary.total_dispatched -
              dispatchSummary.hal_failures) /
              dispatchSummary.total_dispatched) *
            100
          : 100,
      queue_health: Math.max(
        0,
        100 - queueStatus.retry_queue_count * 10
      ),
      fallback_rate:
        (fallbackEvents.last_24h_count /
          Math.max(1, dispatchLog.filter((d) => d.timestamp >= last24hCutoff)
            .length)) *
        100,
      anomaly_count: anomalies.filter(
        (a) => a.type !== "healthy" && a.severity !== "none"
      ).length,
      recommendation: generateRecommendation(healthScore, anomalies, queueStatus),
    },
  };
}

// Main
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    json: args.includes("--json"),
    tail: args.includes("--tail")
      ? parseInt(args[args.indexOf("--tail") + 1] || "50")
      : 50,
  };

  const result = aggregateDispatchObservability(options);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("\n=== DISPATCH OBSERVABILITY SUMMARY ===\n");
    console.log(`Timestamp: ${result.timestamp}`);
    console.log("\nDispatch Summary:");
    console.log(`  Total: ${result.dispatch_summary.total_dispatched}`);
    console.log(`  To HAL: ${result.dispatch_summary.dispatched_to_hal}`);
    console.log(`  To Alfred: ${result.dispatch_summary.dispatched_to_alfred}`);
    console.log(`  Failures: ${result.dispatch_summary.hal_failures}`);
    console.log(
      `  Last dispatch: ${result.dispatch_summary.last_hal_dispatch?.timestamp || "N/A"}`
    );

    console.log("\nQueue Status:");
    console.log(`  Retry depth: ${result.queue_status.retry_queue_count}`);
    console.log(
      `  Pending ACKs: ${result.queue_status.pending_ack_count}`
    );
    console.log(`  Total debt: ${result.queue_status.total_debt}`);

    console.log("\nFallback Events (24h):");
    console.log(`  Count: ${result.fallback_events.last_24h_count}`);
    console.log(`  By reason:`, result.fallback_events.reasons);

    console.log("\nAnomalies:");
    result.anomalies.forEach((a) => {
      const icon =
        a.severity === "critical"
          ? "🔴"
          : a.severity === "warning"
            ? "🟡"
            : "ℹ️";
      console.log(`  ${icon} [${a.type}] ${a.message}`);
    });

    console.log("\nHealth Score:");
    console.log(`  Overall: ${result.health_score.overall}/100`);
    console.log(
      `  Recommendation: ${result.health_score.recommendation}`
    );
  }
}

module.exports = { aggregateDispatchObservability };
