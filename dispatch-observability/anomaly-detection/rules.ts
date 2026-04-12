/**
 * Anomaly Detection Rules Engine
 * 
 * Six core rules for detecting dispatch pipeline health issues:
 * 1. Idle Backlog (task pile-up)
 * 2. Fallback Spiral (model degradation)
 * 3. Budget Alert (burn rate exceeding limits)
 * 4. ACK Timeout (HAL task not acknowledged)
 * 5. Retry Queue Stuck (dispatch failures not recovering)
 * 6. HAL Connection Lost (HAL offline or unresponsive)
 */

import {
  QueueDepth,
  PendingAcks,
  RetryQueue,
  HalHealth,
  FallbackEvents,
  TokenSpend,
  Anomaly,
  AnomalyConfig
} from '../types/dispatch-observability';

/**
 * Default anomaly detection thresholds
 */
export const DEFAULT_ANOMALY_CONFIG: AnomalyConfig = {
  idle_backlog_threshold: 8,
  idle_movement_timeout_seconds: 1800, // 30 min
  fallback_rate_24h_threshold: 5,
  fallback_rate_1h_threshold: 2,
  daily_budget_usd: 50,
  ack_timeout_seconds: 300, // 5 min
  retry_queue_stuck_seconds: 600, // 10 min
  hal_heartbeat_timeout_seconds: 300 // 5 min
};

/**
 * Rule 1: Idle Backlog Detection
 * 
 * Condition: Total backlog (todo + in_progress) > threshold AND
 *            no in_progress movement for >30 min
 * 
 * Alert: "Backlog pile-up detected; check for stuck tasks"
 * Severity: WARN
 */
export function detectIdleBacklog(
  queueDepth: QueueDepth,
  config: AnomalyConfig,
  lastMovementAge: number
): Anomaly | null {
  const backlog = queueDepth.todo + queueDepth.in_progress;
  
  if (
    backlog > config.idle_backlog_threshold &&
    lastMovementAge > config.idle_movement_timeout_seconds
  ) {
    return {
      rule_id: 'idle-backlog',
      rule_name: 'Idle Backlog Detection',
      severity: 'WARN',
      message: `Backlog pile-up detected: ${backlog} tasks in queue with no progress for ${Math.round(lastMovementAge / 60)} minutes`,
      detected_at: new Date().toISOString(),
      metric_value: backlog,
      threshold: config.idle_backlog_threshold,
      remediation: 'Check for stuck tasks in in_progress; investigate dispatch failures or blocked prerequisites'
    };
  }
  
  return null;
}

/**
 * Rule 2: Fallback Spiral Detection
 * 
 * Condition: Fallback events in last 24h > 5 OR
 *            Fallback events in last 1h > 2
 * 
 * Alert: "High fallback rate; model degradation or context bloat suspected"
 * Severity: ERROR
 */
export function detectFallbackSpiral(
  fallbackEvents: FallbackEvents,
  config: AnomalyConfig
): Anomaly | null {
  if (
    fallbackEvents.last_24h > config.fallback_rate_24h_threshold ||
    fallbackEvents.last_1h > config.fallback_rate_1h_threshold
  ) {
    return {
      rule_id: 'fallback-spiral',
      rule_name: 'Fallback Spiral Detection',
      severity: 'ERROR',
      message: `High fallback rate: ${fallbackEvents.last_24h} events in 24h, ${fallbackEvents.last_1h} in last hour (cost impact: $${fallbackEvents.cost_impact_usd.toFixed(2)})`,
      detected_at: new Date().toISOString(),
      metric_value: fallbackEvents.last_24h,
      threshold: config.fallback_rate_24h_threshold,
      remediation: 'Check context bloat, model rate limits, or task complexity; consider context compression or lighter model for background tasks'
    };
  }
  
  return null;
}

/**
 * Rule 3: Budget Alert Detection
 * 
 * Condition: Hourly burn rate * 24 > daily budget
 * 
 * Alert: "Daily burn rate exceeds budget threshold"
 * Severity: ERROR
 */
export function detectBudgetAlert(
  tokenSpend: TokenSpend,
  config: AnomalyConfig
): Anomaly | null {
  const projectedDailyBurn = tokenSpend.burn_rate_hourly * 24;
  
  if (projectedDailyBurn > config.daily_budget_usd) {
    return {
      rule_id: 'budget-alert',
      rule_name: 'Budget Alert',
      severity: 'ERROR',
      message: `Daily burn rate exceeds budget: $${projectedDailyBurn.toFixed(2)}/day projected (budget: $${config.daily_budget_usd}/day)`,
      detected_at: new Date().toISOString(),
      metric_value: projectedDailyBurn,
      threshold: config.daily_budget_usd,
      remediation: 'Reduce token spend: use Codex/Haiku for simpler tasks, batch API calls, compress context, or increase budget threshold'
    };
  }
  
  return null;
}

/**
 * Rule 4: ACK Timeout Detection
 * 
 * Condition: Oldest pending ACK > 5 minutes
 * 
 * Alert: "HAL task ACK pending >5 min; check HAL health"
 * Severity: WARN
 */
export function detectAckTimeout(
  pendingAcks: PendingAcks,
  config: AnomalyConfig
): Anomaly | null {
  if (
    pendingAcks.count > 0 &&
    pendingAcks.oldest_age_seconds > config.ack_timeout_seconds
  ) {
    return {
      rule_id: 'ack-timeout',
      rule_name: 'ACK Timeout Detection',
      severity: 'WARN',
      message: `HAL task ACK pending ${Math.round(pendingAcks.oldest_age_seconds / 60)} minutes (${pendingAcks.count} pending)`,
      detected_at: new Date().toISOString(),
      metric_value: pendingAcks.oldest_age_seconds,
      threshold: config.ack_timeout_seconds,
      remediation: 'Check HAL health and connection; verify task was actually completed; may need manual ACK if HAL callback failed'
    };
  }
  
  return null;
}

/**
 * Rule 5: Retry Queue Stuck Detection
 * 
 * Condition: Retry queue count > 0 AND
 *            oldest retry > 10 minutes
 * 
 * Alert: "Retry queue stalled; investigate dispatch failures"
 * Severity: ERROR
 */
export function detectRetryQueueStuck(
  retryQueue: RetryQueue,
  config: AnomalyConfig
): Anomaly | null {
  if (
    retryQueue.count > 0 &&
    retryQueue.oldest_age_seconds > config.retry_queue_stuck_seconds
  ) {
    const reasons = Object.entries(retryQueue.by_reason)
      .map(([reason, count]) => `${count}x ${reason}`)
      .join(', ');
    
    return {
      rule_id: 'retry-queue-stuck',
      rule_name: 'Retry Queue Stuck',
      severity: 'ERROR',
      message: `Retry queue stalled: ${retryQueue.count} items, oldest ${Math.round(retryQueue.oldest_age_seconds / 60)} min old (${reasons})`,
      detected_at: new Date().toISOString(),
      metric_value: retryQueue.oldest_age_seconds,
      threshold: config.retry_queue_stuck_seconds,
      remediation: 'Investigate dispatch failures; check task structure, HAL availability, and network connectivity; may need manual clearance'
    };
  }
  
  return null;
}

/**
 * Rule 6: HAL Connection Lost Detection
 * 
 * Condition: HAL status != 'healthy' OR
 *            Last heartbeat > 5 min old
 * 
 * Alert: "HAL offline or unresponsive"
 * Severity: CRITICAL
 */
export function detectHalConnectionLost(
  halHealth: HalHealth,
  config: AnomalyConfig
): Anomaly | null {
  const heartbeatAge = calculateHeartbeatAge(halHealth.last_heartbeat);
  const isOffline = halHealth.status !== 'healthy' || heartbeatAge > config.hal_heartbeat_timeout_seconds;
  
  if (isOffline) {
    return {
      rule_id: 'hal-connection-lost',
      rule_name: 'HAL Connection Lost',
      severity: 'CRITICAL',
      message: `HAL offline or unresponsive: status=${halHealth.status}, last_heartbeat=${Math.round(heartbeatAge / 60)} min ago`,
      detected_at: new Date().toISOString(),
      metric_value: heartbeatAge,
      threshold: config.hal_heartbeat_timeout_seconds,
      remediation: 'Restart HAL service; check network connectivity (ws://192.168.2.79:18789); verify gateway can reach HAL; fallback to local execution'
    };
  }
  
  return null;
}

/**
 * Run all 6 anomaly detection rules
 */
export function detectAllAnomalies(
  queueDepth: QueueDepth,
  pendingAcks: PendingAcks,
  retryQueue: RetryQueue,
  halHealth: HalHealth,
  fallbackEvents: FallbackEvents,
  tokenSpend: TokenSpend,
  config: AnomalyConfig,
  lastMovementAge: number
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  // Rule 1: Idle Backlog
  const idleBacklog = detectIdleBacklog(queueDepth, config, lastMovementAge);
  if (idleBacklog) anomalies.push(idleBacklog);
  
  // Rule 2: Fallback Spiral
  const fallbackSpiral = detectFallbackSpiral(fallbackEvents, config);
  if (fallbackSpiral) anomalies.push(fallbackSpiral);
  
  // Rule 3: Budget Alert
  const budgetAlert = detectBudgetAlert(tokenSpend, config);
  if (budgetAlert) anomalies.push(budgetAlert);
  
  // Rule 4: ACK Timeout
  const ackTimeout = detectAckTimeout(pendingAcks, config);
  if (ackTimeout) anomalies.push(ackTimeout);
  
  // Rule 5: Retry Queue Stuck
  const retryQueueStuck = detectRetryQueueStuck(retryQueue, config);
  if (retryQueueStuck) anomalies.push(retryQueueStuck);
  
  // Rule 6: HAL Connection Lost
  const halLost = detectHalConnectionLost(halHealth, config);
  if (halLost) anomalies.push(halLost);
  
  return anomalies;
}

/**
 * Helper: Calculate age of HAL heartbeat in seconds
 */
function calculateHeartbeatAge(lastHeartbeat: string): number {
  const now = new Date().getTime();
  const heartbeatTime = new Date(lastHeartbeat).getTime();
  return Math.round((now - heartbeatTime) / 1000);
}

/**
 * Anomaly summary for quick dashboard display
 */
export function summarizeAnomalies(anomalies: Anomaly[]): {
  critical_count: number;
  error_count: number;
  warning_count: number;
  total_count: number;
  highest_severity: string;
} {
  return {
    critical_count: anomalies.filter(a => a.severity === 'CRITICAL').length,
    error_count: anomalies.filter(a => a.severity === 'ERROR').length,
    warning_count: anomalies.filter(a => a.severity === 'WARN').length,
    total_count: anomalies.length,
    highest_severity: anomalies.length > 0
      ? (anomalies[0].severity) // Assume sorted by severity
      : 'NONE'
  };
}
