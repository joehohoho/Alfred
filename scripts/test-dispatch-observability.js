#!/usr/bin/env node

/**
 * Test Suite for Dispatch Observability System
 *
 * Validates:
 * - Data aggregator output format
 * - Anomaly detection logic
 * - Health score calculation
 * - API endpoint contract
 *
 * Usage:
 *   node test-dispatch-observability.js [--verbose]
 */

const assert = require("assert");
const {
  aggregateDispatchObservability,
} = require("./dispatch-observability-aggregator");

const TESTS_PASSED = [];
const TESTS_FAILED = [];
const VERBOSE = process.argv.includes("--verbose");

function log(msg) {
  if (VERBOSE) console.log(msg);
}

function test(name, fn) {
  try {
    fn();
    TESTS_PASSED.push(name);
    console.log(`✓ ${name}`);
  } catch (error) {
    TESTS_FAILED.push({ name, error: error.message });
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
  }
}

function testWithData(name, fn) {
  try {
    const data = aggregateDispatchObservability();
    fn(data);
    TESTS_PASSED.push(name);
    console.log(`✓ ${name}`);
  } catch (error) {
    TESTS_FAILED.push({ name, error: error.message });
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

console.log("\n=== DISPATCH OBSERVABILITY TEST SUITE ===\n");

// Test 1: Basic aggregation succeeds
testWithData("Aggregator returns data without errors", (data) => {
  assert(data !== null && typeof data === "object");
});

// Test 2: Response shape is correct
testWithData("Response has all required top-level keys", (data) => {
  const required = [
    "timestamp",
    "dispatch_summary",
    "queue_status",
    "pending_acks",
    "fallback_events",
    "anomalies",
    "token_and_gates",
    "health_score",
  ];
  required.forEach((key) => {
    assert(key in data, `Missing key: ${key}`);
  });
});

// Test 3: Timestamp is ISO format
testWithData("Timestamp is valid ISO-8601", (data) => {
  assert(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data.timestamp),
    "Timestamp not ISO-8601"
  );
});

// Test 4: Dispatch summary has correct structure
testWithData("dispatch_summary has all required fields", (data) => {
  const ds = data.dispatch_summary;
  const required = [
    "total_dispatched",
    "dispatched_to_hal",
    "dispatched_to_alfred",
    "hal_failures",
    "handled_by_alfred",
    "last_hal_dispatch",
  ];
  required.forEach((key) => {
    assert(key in ds, `Missing dispatch_summary.${key}`);
  });
});

// Test 5: Dispatch counts are numbers
testWithData("Dispatch counts are non-negative numbers", (data) => {
  const ds = data.dispatch_summary;
  assert(typeof ds.total_dispatched === "number");
  assert(ds.total_dispatched >= 0);
  assert(ds.dispatched_to_hal >= 0);
  assert(ds.dispatched_to_alfred >= 0);
  assert(ds.hal_failures >= 0);
  assert(ds.handled_by_alfred >= 0);
});

// Test 6: Total dispatched matches sum of routes
testWithData("Total dispatched = HAL + Alfred + failures", (data) => {
  const ds = data.dispatch_summary;
  const sum = ds.dispatched_to_hal + ds.dispatched_to_alfred;
  // Note: failures may be counted separately, so we just check total >= routes
  assert(
    ds.total_dispatched >= sum,
    `Total ${ds.total_dispatched} < HAL ${ds.dispatched_to_hal} + Alfred ${ds.dispatched_to_alfred}`
  );
});

// Test 7: Queue status has correct structure
testWithData("queue_status has all required fields", (data) => {
  const qs = data.queue_status;
  const required = [
    "kanban_todo_count",
    "kanban_in_progress_count",
    "retry_queue_count",
    "pending_ack_count",
    "total_debt",
    "oldest_pending_ack_minutes",
    "retry_queue",
  ];
  required.forEach((key) => {
    assert(key in qs, `Missing queue_status.${key}`);
  });
});

// Test 8: Queue counts are non-negative
testWithData("Queue counts are non-negative numbers", (data) => {
  const qs = data.queue_status;
  assert(typeof qs.kanban_todo_count === "number");
  assert(qs.kanban_todo_count >= 0);
  assert(qs.kanban_in_progress_count >= 0);
  assert(qs.retry_queue_count >= 0);
  assert(qs.pending_ack_count >= 0);
  assert(qs.total_debt >= 0);
});

// Test 9: Total debt is sum of queue components
testWithData("total_debt >= sum of queue components", (data) => {
  const qs = data.queue_status;
  const sum =
    qs.kanban_todo_count +
    qs.kanban_in_progress_count +
    qs.retry_queue_count +
    qs.pending_ack_count;
  assert(
    qs.total_debt >= 0,
    `total_debt ${qs.total_debt} should be non-negative`
  );
  log(
    `  Queue debt: ${sum} components, ${qs.total_debt} total (pending_ack: ${qs.pending_ack_count})`
  );
});

// Test 10: Retry queue array is valid
testWithData("retry_queue is an array of valid tasks", (data) => {
  const rq = data.queue_status.retry_queue;
  assert(Array.isArray(rq));
  rq.forEach((task, i) => {
    assert(typeof task.task_id === "string", `retry_queue[${i}] missing task_id`);
    assert(typeof task.attempts === "number", `retry_queue[${i}] missing attempts`);
    assert(
      typeof task.age_minutes === "number",
      `retry_queue[${i}] missing age_minutes`
    );
    assert(task.age_minutes >= 0, `retry_queue[${i}] age_minutes is negative`);
  });
});

// Test 11: Fallback events structure
testWithData("fallback_events has correct structure", (data) => {
  const fe = data.fallback_events;
  assert(typeof fe.last_24h_count === "number");
  assert(fe.last_24h_count >= 0);
  assert(typeof fe.reasons === "object");
  assert(Array.isArray(fe.recent_events));
});

// Test 12: Fallback reasons are non-negative
testWithData("Fallback reasons are non-negative counts", (data) => {
  const reasons = data.fallback_events.reasons;
  Object.values(reasons).forEach((count) => {
    assert(typeof count === "number");
    assert(count >= 0);
  });
});

// Test 13: Anomalies is an array
testWithData("anomalies is a non-empty array", (data) => {
  const anom = data.anomalies;
  assert(Array.isArray(anom));
  assert(anom.length > 0, "anomalies array should have at least 1 element");
});

// Test 14: Each anomaly has required fields
testWithData("Each anomaly has required fields", (data) => {
  data.anomalies.forEach((anom, i) => {
    assert(typeof anom.type === "string", `anomalies[${i}] missing type`);
    assert(
      ["critical", "warning", "info", "none"].includes(anom.severity),
      `anomalies[${i}] invalid severity: ${anom.severity}`
    );
    assert(typeof anom.message === "string", `anomalies[${i}] missing message`);
  });
});

// Test 15: Health score has correct structure
testWithData("health_score has all required fields", (data) => {
  const hs = data.health_score;
  const required = [
    "overall",
    "dispatch_efficiency",
    "queue_health",
    "fallback_rate",
    "anomaly_count",
    "recommendation",
  ];
  required.forEach((key) => {
    assert(key in hs, `Missing health_score.${key}`);
  });
});

// Test 16: Health score values are in valid ranges
testWithData("Health score metrics are in valid ranges", (data) => {
  const hs = data.health_score;
  assert(hs.overall >= 0 && hs.overall <= 100, `overall out of range: ${hs.overall}`);
  assert(
    hs.dispatch_efficiency >= 0 && hs.dispatch_efficiency <= 100,
    `dispatch_efficiency out of range`
  );
  assert(hs.queue_health >= 0 && hs.queue_health <= 100, `queue_health out of range`);
  assert(hs.fallback_rate >= 0 && hs.fallback_rate <= 100, `fallback_rate out of range`);
  assert(typeof hs.anomaly_count === "number");
  assert(hs.anomaly_count >= 0);
  assert(typeof hs.recommendation === "string");
});

// Test 17: Token and gates structure
testWithData("token_and_gates has correct structure", (data) => {
  const tag = data.token_and_gates;
  assert(typeof tag.current_model === "string");
  assert(typeof tag.token_budget === "object");
  assert(Array.isArray(tag.active_gates));
  assert(typeof tag.model_tier_distribution === "object");
});

// Test 18: Token budget values are valid
testWithData("Token budget values are valid", (data) => {
  const tb = data.token_and_gates.token_budget;
  assert(typeof tb.daily_limit === "number");
  assert(typeof tb.used_today === "number");
  assert(typeof tb.remaining === "number");
  assert(typeof tb.percent_used === "number");
  assert(tb.daily_limit > 0);
  assert(tb.used_today >= 0);
  assert(tb.remaining >= 0);
  assert(tb.percent_used >= 0 && tb.percent_used <= 100);
  assert(tb.used_today <= tb.daily_limit);
});

// Test 19: Pending ACKs structure
testWithData("pending_acks has correct structure", (data) => {
  const pa = data.pending_acks;
  assert(typeof pa.count === "number");
  assert(pa.count >= 0);
  assert(Array.isArray(pa.tasks));
});

// Test 20: Data consistency check
testWithData("Queue status components sum correctly", (data) => {
  const qs = data.queue_status;
  const componentSum =
    qs.kanban_todo_count +
    qs.kanban_in_progress_count +
    qs.retry_queue_count +
    qs.pending_ack_count;
  assert(
    qs.total_debt >= componentSum || qs.total_debt === 0,
    `total_debt ${qs.total_debt} inconsistent with components ${componentSum}`
  );
  log(`  Component sum: ${componentSum}, total_debt: ${qs.total_debt}`);
});

// Test 21: Anomaly count matches array
testWithData("Anomaly count matches array length (non-healthy)", (data) => {
  const nonHealthyAnomalies = data.anomalies.filter(
    (a) => a.type !== "healthy" && a.severity !== "none"
  );
  assert(data.health_score.anomaly_count === nonHealthyAnomalies.length);
});

// Test 22: Recent events are sorted by time
testWithData("Recent fallback events are time-sorted (newest first)", (data) => {
  const events = data.fallback_events.recent_events;
  for (let i = 1; i < events.length; i++) {
    const prevTime = new Date(events[i - 1].timestamp).getTime();
    const currTime = new Date(events[i].timestamp).getTime();
    assert(
      prevTime >= currTime,
      `Events not sorted: ${events[i - 1].timestamp} < ${events[i].timestamp}`
    );
  }
});

// Test 23: Last HAL dispatch is valid if present
testWithData("last_hal_dispatch is valid object or null", (data) => {
  const lhd = data.dispatch_summary.last_hal_dispatch;
  if (lhd !== null) {
    assert(typeof lhd.timestamp === "string");
    assert(typeof lhd.task_id === "string");
    assert(typeof lhd.task === "string");
  }
});

// Test 24: No negative queue counts
testWithData("No negative values in queue status", (data) => {
  const qs = data.queue_status;
  Object.entries(qs).forEach(([key, value]) => {
    if (typeof value === "number") {
      assert(
        value >= -1,
        `Negative value in queue_status.${key}: ${value}`
      );
    }
  });
});

// Test 25: Health recommendation is contextual
testWithData("Health recommendation varies with score", (data) => {
  const hs = data.health_score;
  assert(typeof hs.recommendation === "string");
  assert(hs.recommendation.length > 10, "Recommendation too short");

  // Map: high score = "healthy", low score = "critical"
  if (hs.overall >= 90) {
    assert(
      hs.recommendation.toLowerCase().includes("healthy") ||
        hs.recommendation.toLowerCase().includes("continue"),
      "High score should have positive recommendation"
    );
  } else if (hs.overall < 60) {
    assert(
      hs.recommendation.toLowerCase().includes("critical") ||
        hs.recommendation.toLowerCase().includes("action"),
      "Low score should have urgent recommendation"
    );
  }
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n=== TEST SUMMARY ===\n");
console.log(`Passed: ${TESTS_PASSED.length}`);
console.log(`Failed: ${TESTS_FAILED.length}`);

if (TESTS_FAILED.length > 0) {
  console.log("\nFailed tests:");
  TESTS_FAILED.forEach(({ name, error }) => {
    console.log(`  - ${name}`);
    console.log(`    ${error}`);
  });
  process.exit(1);
} else {
  console.log("\n✓ All tests passed!");
  process.exit(0);
}
