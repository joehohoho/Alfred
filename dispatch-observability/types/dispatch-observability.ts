/**
 * Dispatch Observability Types
 * 
 * Data structures for monitoring HAL/Alfred dispatch pipeline health,
 * including queue depth, ACK tracking, fallback events, and token spend.
 */

/**
 * Queue depth snapshot across kanban columns
 */
export interface QueueDepth {
  todo: number;
  in_progress: number;
  review: number;
  blocked: number;
}

/**
 * Pending task acknowledgments from HAL
 */
export interface PendingAcks {
  count: number;
  oldest_age_seconds: number;
  at_risk: boolean;
  pending_tasks: Array<{
    task_id: string;
    assigned_at: string;
    age_seconds: number;
  }>;
}

/**
 * Retry queue for failed dispatch attempts
 */
export interface RetryQueue {
  count: number;
  oldest_age_seconds: number;
  by_reason: Record<string, number>;
  items: Array<{
    task_id: string;
    reason: string;
    attempt_count: number;
    last_attempt_at: string;
    age_seconds: number;
  }>;
}

/**
 * HAL connection and health status
 */
export interface HalHealth {
  last_heartbeat: string;
  status: 'healthy' | 'degraded' | 'offline' | 'unknown';
  error_rate_24h: number;
  connection_established: boolean;
  uptime_hours: number;
  last_error?: string;
}

/**
 * Fallback cascade events (model degradation)
 */
export interface FallbackEvents {
  last_24h: number;
  last_1h: number;
  by_model: Record<string, number>;
  cost_impact_usd: number;
  events: Array<{
    timestamp: string;
    from_model: string;
    to_model: string;
    reason: string;
    cost_delta_usd: number;
  }>;
}

/**
 * Token spend and budget tracking
 */
export interface TokenSpend {
  session_cost_usd: number;
  cost_per_task_avg: number;
  burn_rate_hourly: number;
  budget_remaining_usd: number;
  budget_limit_usd: number;
  by_model: Record<string, {
    cost_usd: number;
    token_count: number;
    task_count: number;
  }>;
  cost_24h_usd: number;
}

/**
 * Individual anomaly detection result
 */
export interface Anomaly {
  rule_id: string;
  rule_name: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  message: string;
  detected_at: string;
  metric_value?: number;
  threshold?: number;
  remediation: string;
}

/**
 * Full dispatch observability snapshot
 */
export interface DispatchObservability {
  timestamp: string;
  queue_depth: QueueDepth;
  pending_acks: PendingAcks;
  retry_queue: RetryQueue;
  hal_health: HalHealth;
  fallback_events: FallbackEvents;
  token_spend: TokenSpend;
  anomalies: Anomaly[];
  snapshot_duration_ms: number;
}

/**
 * Quick health check (lighter endpoint)
 */
export interface DispatchHealth {
  timestamp: string;
  hal_status: HalHealth['status'];
  queue_depth_total: number;
  anomalies_count: number;
  critical_alerts: number;
  status: 'healthy' | 'warning' | 'critical';
  snapshot_duration_ms: number;
}

/**
 * Configuration for anomaly detection thresholds
 */
export interface AnomalyConfig {
  idle_backlog_threshold: number;
  idle_movement_timeout_seconds: number;
  fallback_rate_24h_threshold: number;
  fallback_rate_1h_threshold: number;
  daily_budget_usd: number;
  ack_timeout_seconds: number;
  retry_queue_stuck_seconds: number;
  hal_heartbeat_timeout_seconds: number;
}

/**
 * Aggregation context for data gathering
 */
export interface AggregationContext {
  config: AnomalyConfig;
  data_sources: {
    kanban_api_available: boolean;
    ack_tracker_available: boolean;
    retry_queue_available: boolean;
    hal_health_available: boolean;
    fallback_log_available: boolean;
    token_spend_available: boolean;
  };
  aggregation_errors: string[];
  aggregation_duration_ms: number;
}
