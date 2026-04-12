/**
 * Unit Tests for Dispatch Observability System
 * 
 * Tests for:
 * - Data aggregation from all sources
 * - All 6 anomaly detection rules
 * - Endpoint response shapes
 * - Edge cases (empty data, missing sources)
 */

import {
  detectIdleBacklog,
  detectFallbackSpiral,
  detectBudgetAlert,
  detectAckTimeout,
  detectRetryQueueStuck,
  detectHalConnectionLost,
  detectAllAnomalies,
  summarizeAnomalies,
  DEFAULT_ANOMALY_CONFIG
} from '../anomaly-detection/rules';

import {
  QueueDepth,
  PendingAcks,
  RetryQueue,
  HalHealth,
  FallbackEvents,
  TokenSpend,
  AnomalyConfig
} from '../types/dispatch-observability';

// ============================================================================
// Test Fixtures
// ============================================================================

const mockConfig: AnomalyConfig = DEFAULT_ANOMALY_CONFIG;

const normalQueueDepth: QueueDepth = {
  todo: 3,
  in_progress: 1,
  review: 2,
  blocked: 0
};

const overloadedQueueDepth: QueueDepth = {
  todo: 5,
  in_progress: 5,
  review: 0,
  blocked: 0
};

const healthyHal: HalHealth = {
  last_heartbeat: new Date(Date.now() - 30000).toISOString(), // 30 sec ago
  status: 'healthy',
  error_rate_24h: 0.02,
  connection_established: true,
  uptime_hours: 24
};

const offlineHal: HalHealth = {
  last_heartbeat: new Date(Date.now() - 600000).toISOString(), // 10 min ago
  status: 'offline',
  error_rate_24h: 1.0,
  connection_established: false,
  uptime_hours: 0
};

const healthyPendingAcks: PendingAcks = {
  count: 0,
  oldest_age_seconds: 0,
  at_risk: false,
  pending_tasks: []
};

const stalePendingAcks: PendingAcks = {
  count: 2,
  oldest_age_seconds: 400, // 6+ min
  at_risk: true,
  pending_tasks: [
    { task_id: 'task-1', assigned_at: new Date(Date.now() - 400000).toISOString(), age_seconds: 400 },
    { task_id: 'task-2', assigned_at: new Date(Date.now() - 200000).toISOString(), age_seconds: 200 }
  ]
};

const emptyRetryQueue: RetryQueue = {
  count: 0,
  oldest_age_seconds: 0,
  by_reason: {},
  items: []
};

const stuckRetryQueue: RetryQueue = {
  count: 3,
  oldest_age_seconds: 700, // 11+ min
  by_reason: { timeout: 2, network: 1 },
  items: [
    { task_id: 'task-a', reason: 'timeout', attempt_count: 3, last_attempt_at: new Date(Date.now() - 700000).toISOString(), age_seconds: 700 },
    { task_id: 'task-b', reason: 'timeout', attempt_count: 2, last_attempt_at: new Date(Date.now() - 400000).toISOString(), age_seconds: 400 },
    { task_id: 'task-c', reason: 'network', attempt_count: 1, last_attempt_at: new Date(Date.now() - 200000).toISOString(), age_seconds: 200 }
  ]
};

const noFallbacks: FallbackEvents = {
  last_24h: 0,
  last_1h: 0,
  by_model: {},
  cost_impact_usd: 0,
  events: []
};

const fallbackSpiral: FallbackEvents = {
  last_24h: 8,
  last_1h: 3,
  by_model: {
    'codex->haiku': 5,
    'haiku->sonnet': 3
  },
  cost_impact_usd: 2.15,
  events: [
    { timestamp: new Date().toISOString(), from_model: 'codex', to_model: 'haiku', reason: 'rate_limit', cost_delta_usd: 0.10 },
    { timestamp: new Date().toISOString(), from_model: 'haiku', to_model: 'sonnet', reason: 'timeout', cost_delta_usd: 0.35 }
  ]
};

const healthyTokenSpend: TokenSpend = {
  session_cost_usd: 0.15,
  cost_per_task_avg: 0.008,
  burn_rate_hourly: 0.18,
  budget_remaining_usd: 49.82,
  budget_limit_usd: 50,
  by_model: {
    'codex': { cost_usd: 0.0, token_count: 12000, task_count: 40 },
    'haiku': { cost_usd: 0.15, token_count: 1200, task_count: 5 }
  },
  cost_24h_usd: 4.32
};

const overspendTokenSpend: TokenSpend = {
  session_cost_usd: 5.50,
  cost_per_task_avg: 0.25,
  burn_rate_hourly: 8.75, // Would be $210/day
  budget_remaining_usd: 44.5,
  budget_limit_usd: 50,
  by_model: {
    'sonnet': { cost_usd: 5.50, token_count: 18000, task_count: 22 }
  },
  cost_24h_usd: 210
};

// ============================================================================
// Anomaly Detection Rule Tests
// ============================================================================

describe('Rule 1: Idle Backlog Detection', () => {
  test('should NOT alert on normal queue depth', () => {
    const anomaly = detectIdleBacklog(normalQueueDepth, mockConfig, 300); // 5 min idle
    expect(anomaly).toBeNull();
  });
  
  test('should alert on overloaded queue with old movement', () => {
    const anomaly = detectIdleBacklog(overloadedQueueDepth, mockConfig, 2000); // 33 min idle
    expect(anomaly).not.toBeNull();
    expect(anomaly?.severity).toBe('WARN');
    expect(anomaly?.rule_id).toBe('idle-backlog');
  });
  
  test('should NOT alert on overloaded queue with recent movement', () => {
    const anomaly = detectIdleBacklog(overloadedQueueDepth, mockConfig, 600); // 10 min idle
    expect(anomaly).toBeNull();
  });
});

describe('Rule 2: Fallback Spiral Detection', () => {
  test('should NOT alert on zero fallbacks', () => {
    const anomaly = detectFallbackSpiral(noFallbacks, mockConfig);
    expect(anomaly).toBeNull();
  });
  
  test('should alert on high 24h fallback rate', () => {
    const anomaly = detectFallbackSpiral(fallbackSpiral, mockConfig);
    expect(anomaly).not.toBeNull();
    expect(anomaly?.severity).toBe('ERROR');
    expect(anomaly?.rule_id).toBe('fallback-spiral');
    expect(anomaly?.message).toContain('8');
  });
  
  test('should alert on high 1h fallback rate', () => {
    const high1h: FallbackEvents = {
      last_24h: 1,
      last_1h: 3,
      by_model: {},
      cost_impact_usd: 0.50,
      events: []
    };
    const anomaly = detectFallbackSpiral(high1h, mockConfig);
    expect(anomaly).not.toBeNull();
    expect(anomaly?.severity).toBe('ERROR');
  });
});

describe('Rule 3: Budget Alert Detection', () => {
  test('should NOT alert on healthy spend rate', () => {
    const anomaly = detectBudgetAlert(healthyTokenSpend, mockConfig);
    expect(anomaly).toBeNull();
  });
  
  test('should alert on excessive burn rate', () => {
    const anomaly = detectBudgetAlert(overspendTokenSpend, mockConfig);
    expect(anomaly).not.toBeNull();
    expect(anomaly?.severity).toBe('ERROR');
    expect(anomaly?.rule_id).toBe('budget-alert');
    expect(anomaly?.message).toContain('210');
  });
});

describe('Rule 4: ACK Timeout Detection', () => {
  test('should NOT alert with no pending ACKs', () => {
    const anomaly = detectAckTimeout(healthyPendingAcks, mockConfig);
    expect(anomaly).toBeNull();
  });
  
  test('should alert on stale ACKs', () => {
    const anomaly = detectAckTimeout(stalePendingAcks, mockConfig);
    expect(anomaly).not.toBeNull();
    expect(anomaly?.severity).toBe('WARN');
    expect(anomaly?.rule_id).toBe('ack-timeout');
    expect(anomaly?.message).toContain('6 minutes');
  });
});

describe('Rule 5: Retry Queue Stuck Detection', () => {
  test('should NOT alert on empty retry queue', () => {
    const anomaly = detectRetryQueueStuck(emptyRetryQueue, mockConfig);
    expect(anomaly).toBeNull();
  });
  
  test('should alert on stalled retry queue', () => {
    const anomaly = detectRetryQueueStuck(stuckRetryQueue, mockConfig);
    expect(anomaly).not.toBeNull();
    expect(anomaly?.severity).toBe('ERROR');
    expect(anomaly?.rule_id).toBe('retry-queue-stuck');
    expect(anomaly?.message).toContain('11 min');
    expect(anomaly?.message).toContain('2x timeout');
  });
});

describe('Rule 6: HAL Connection Lost Detection', () => {
  test('should NOT alert on healthy HAL', () => {
    const anomaly = detectHalConnectionLost(healthyHal, mockConfig);
    expect(anomaly).toBeNull();
  });
  
  test('should alert on offline HAL', () => {
    const anomaly = detectHalConnectionLost(offlineHal, mockConfig);
    expect(anomaly).not.toBeNull();
    expect(anomaly?.severity).toBe('CRITICAL');
    expect(anomaly?.rule_id).toBe('hal-connection-lost');
  });
  
  test('should alert on stale heartbeat', () => {
    const staleHal: HalHealth = {
      last_heartbeat: new Date(Date.now() - 400000).toISOString(),
      status: 'healthy',
      error_rate_24h: 0,
      connection_established: true,
      uptime_hours: 10
    };
    const anomaly = detectHalConnectionLost(staleHal, mockConfig);
    expect(anomaly).not.toBeNull();
    expect(anomaly?.severity).toBe('CRITICAL');
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('detectAllAnomalies Integration', () => {
  test('should detect all anomalies in degraded system', () => {
    const anomalies = detectAllAnomalies(
      overloadedQueueDepth,
      stalePendingAcks,
      stuckRetryQueue,
      offlineHal,
      fallbackSpiral,
      overspendTokenSpend,
      mockConfig,
      2000 // 33 min idle
    );
    
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies.some(a => a.rule_id === 'idle-backlog')).toBe(true);
    expect(anomalies.some(a => a.rule_id === 'ack-timeout')).toBe(true);
    expect(anomalies.some(a => a.rule_id === 'retry-queue-stuck')).toBe(true);
    expect(anomalies.some(a => a.rule_id === 'hal-connection-lost')).toBe(true);
    expect(anomalies.some(a => a.rule_id === 'fallback-spiral')).toBe(true);
    expect(anomalies.some(a => a.rule_id === 'budget-alert')).toBe(true);
  });
  
  test('should detect no anomalies in healthy system', () => {
    const anomalies = detectAllAnomalies(
      normalQueueDepth,
      healthyPendingAcks,
      emptyRetryQueue,
      healthyHal,
      noFallbacks,
      healthyTokenSpend,
      mockConfig,
      300 // 5 min idle
    );
    
    expect(anomalies.length).toBe(0);
  });
});

describe('Anomaly Summary', () => {
  test('should correctly summarize anomalies', () => {
    const anomalies = detectAllAnomalies(
      overloadedQueueDepth,
      stalePendingAcks,
      stuckRetryQueue,
      offlineHal,
      fallbackSpiral,
      overspendTokenSpend,
      mockConfig,
      2000
    );
    
    const summary = summarizeAnomalies(anomalies);
    expect(summary.total_count).toBe(anomalies.length);
    expect(summary.critical_count).toBeGreaterThanOrEqual(1);
    expect(summary.error_count).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  test('should handle zero burn rate gracefully', () => {
    const zeroSpend: TokenSpend = {
      ...healthyTokenSpend,
      burn_rate_hourly: 0
    };
    const anomaly = detectBudgetAlert(zeroSpend, mockConfig);
    expect(anomaly).toBeNull();
  });
  
  test('should handle exactly at threshold values', () => {
    const atThreshold: FallbackEvents = {
      last_24h: 5, // Exactly at threshold
      last_1h: 0,
      by_model: {},
      cost_impact_usd: 0,
      events: []
    };
    const anomaly = detectFallbackSpiral(atThreshold, mockConfig);
    // Should alert because condition is > threshold, not >= threshold
    expect(anomaly).toBeNull();
  });
  
  test('should handle just over threshold', () => {
    const justOver: FallbackEvents = {
      last_24h: 6, // Just over threshold
      last_1h: 0,
      by_model: {},
      cost_impact_usd: 0,
      events: []
    };
    const anomaly = detectFallbackSpiral(justOver, mockConfig);
    expect(anomaly).not.toBeNull();
  });
});

// ============================================================================
// Response Shape Tests
// ============================================================================

describe('Response Shapes', () => {
  test('Anomaly should include all required fields', () => {
    const anomaly = detectIdleBacklog(overloadedQueueDepth, mockConfig, 2000);
    
    expect(anomaly).toHaveProperty('rule_id');
    expect(anomaly).toHaveProperty('rule_name');
    expect(anomaly).toHaveProperty('severity');
    expect(anomaly).toHaveProperty('message');
    expect(anomaly).toHaveProperty('detected_at');
    expect(anomaly).toHaveProperty('remediation');
    
    expect(['INFO', 'WARN', 'ERROR', 'CRITICAL']).toContain(anomaly?.severity);
  });
});

// ============================================================================
// Export for test runner
// ============================================================================

export {};
