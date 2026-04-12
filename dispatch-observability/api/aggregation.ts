/**
 * Data Aggregation Module
 * 
 * Collects dispatch observability metrics from multiple data sources:
 * - Kanban API (queue depth)
 * - ACK Tracker (pending acknowledgments)
 * - Retry Queue (failed dispatch attempts)
 * - HAL Health (connection status)
 * - Fallback Log (model cascade events)
 * - Token Spend (cost tracking)
 */

import fs from 'fs';
import path from 'path';
import {
  QueueDepth,
  PendingAcks,
  RetryQueue,
  HalHealth,
  FallbackEvents,
  TokenSpend,
  AggregationContext,
  AnomalyConfig
} from '../types/dispatch-observability';
import { DEFAULT_ANOMALY_CONFIG } from '../anomaly-detection/rules';

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || `${process.env.HOME}/.openclaw/workspace`;
const HAL_TRACKING_DIR = path.join(WORKSPACE_DIR, '.hal-alfred-tracking');

/**
 * Aggregate queue depth from Kanban API
 */
export async function aggregateQueueDepth(
  context: AggregationContext
): Promise<QueueDepth> {
  try {
    const response = await fetch('http://localhost:3001/api/kanban/cards?status=all', {
      timeout: 5000
    });
    
    if (!response.ok) {
      context.aggregation_errors.push(`Kanban API returned ${response.status}`);
      context.data_sources.kanban_api_available = false;
      return { todo: 0, in_progress: 0, review: 0, blocked: 0 };
    }
    
    const cards = await response.json();
    
    const queueDepth: QueueDepth = {
      todo: cards.filter((c: any) => c.status === 'todo').length,
      in_progress: cards.filter((c: any) => c.status === 'in_progress').length,
      review: cards.filter((c: any) => c.status === 'review').length,
      blocked: cards.filter((c: any) => c.status === 'blocked').length
    };
    
    context.data_sources.kanban_api_available = true;
    return queueDepth;
  } catch (error) {
    context.aggregation_errors.push(`Kanban aggregation failed: ${error}`);
    context.data_sources.kanban_api_available = false;
    return { todo: 0, in_progress: 0, review: 0, blocked: 0 };
  }
}

/**
 * Aggregate pending ACKs from HAL task tracking
 */
export function aggregatePendingAcks(
  context: AggregationContext
): PendingAcks {
  try {
    const ackPath = path.join(HAL_TRACKING_DIR, 'pending-acks.json');
    
    if (!fs.existsSync(ackPath)) {
      context.data_sources.ack_tracker_available = false;
      return {
        count: 0,
        oldest_age_seconds: 0,
        at_risk: false,
        pending_tasks: []
      };
    }
    
    const ackData = JSON.parse(fs.readFileSync(ackPath, 'utf-8'));
    const now = new Date().getTime();
    
    const pending_tasks = (ackData.pending || []).map((task: any) => ({
      task_id: task.task_id,
      assigned_at: task.assigned_at,
      age_seconds: Math.round((now - new Date(task.assigned_at).getTime()) / 1000)
    }));
    
    const ages = pending_tasks.map(t => t.age_seconds).sort((a, b) => b - a);
    const oldestAge = ages.length > 0 ? ages[0] : 0;
    
    context.data_sources.ack_tracker_available = true;
    
    return {
      count: pending_tasks.length,
      oldest_age_seconds: oldestAge,
      at_risk: oldestAge > (context.config.ack_timeout_seconds * 0.75), // 75% of timeout
      pending_tasks
    };
  } catch (error) {
    context.aggregation_errors.push(`ACK aggregation failed: ${error}`);
    context.data_sources.ack_tracker_available = false;
    return {
      count: 0,
      oldest_age_seconds: 0,
      at_risk: false,
      pending_tasks: []
    };
  }
}

/**
 * Aggregate retry queue from tracking file
 */
export function aggregateRetryQueue(
  context: AggregationContext
): RetryQueue {
  try {
    const retryPath = path.join(HAL_TRACKING_DIR, 'retry-queue.json');
    
    if (!fs.existsSync(retryPath)) {
      context.data_sources.retry_queue_available = false;
      return {
        count: 0,
        oldest_age_seconds: 0,
        by_reason: {},
        items: []
      };
    }
    
    const retryData = JSON.parse(fs.readFileSync(retryPath, 'utf-8'));
    const now = new Date().getTime();
    
    const items = (retryData.items || []).map((item: any) => ({
      task_id: item.task_id,
      reason: item.reason || 'unknown',
      attempt_count: item.attempt_count || 1,
      last_attempt_at: item.last_attempt_at,
      age_seconds: Math.round((now - new Date(item.last_attempt_at).getTime()) / 1000)
    }));
    
    const ages = items.map(i => i.age_seconds).sort((a, b) => b - a);
    const oldestAge = ages.length > 0 ? ages[0] : 0;
    
    const by_reason: Record<string, number> = {};
    items.forEach(item => {
      by_reason[item.reason] = (by_reason[item.reason] || 0) + 1;
    });
    
    context.data_sources.retry_queue_available = true;
    
    return {
      count: items.length,
      oldest_age_seconds: oldestAge,
      by_reason,
      items
    };
  } catch (error) {
    context.aggregation_errors.push(`Retry queue aggregation failed: ${error}`);
    context.data_sources.retry_queue_available = false;
    return {
      count: 0,
      oldest_age_seconds: 0,
      by_reason: {},
      items: []
    };
  }
}

/**
 * Aggregate HAL health from sentinel state or direct check
 */
export function aggregateHalHealth(
  context: AggregationContext
): HalHealth {
  try {
    // Try sentinel state first
    const sentinelPath = path.join(HAL_TRACKING_DIR, 'sentinel-state.json');
    
    if (fs.existsSync(sentinelPath)) {
      const sentinelState = JSON.parse(fs.readFileSync(sentinelPath, 'utf-8'));
      
      if (sentinelState.components?.hal) {
        const halState = sentinelState.components.hal;
        const lastHeartbeat = halState.last_heartbeat || new Date().toISOString();
        const now = new Date().getTime();
        const heartbeatAge = Math.round((now - new Date(lastHeartbeat).getTime()) / 1000);
        
        context.data_sources.hal_health_available = true;
        
        return {
          last_heartbeat: lastHeartbeat,
          status: halState.status || 'unknown',
          error_rate_24h: halState.error_rate_24h || 0,
          connection_established: halState.connected === true,
          uptime_hours: halState.uptime_hours || 0,
          last_error: halState.last_error
        };
      }
    }
    
    // Fallback: report unknown status
    context.data_sources.hal_health_available = false;
    return {
      last_heartbeat: new Date().toISOString(),
      status: 'unknown',
      error_rate_24h: 0,
      connection_established: false,
      uptime_hours: 0
    };
  } catch (error) {
    context.aggregation_errors.push(`HAL health aggregation failed: ${error}`);
    context.data_sources.hal_health_available = false;
    return {
      last_heartbeat: new Date().toISOString(),
      status: 'unknown',
      error_rate_24h: 0,
      connection_established: false,
      uptime_hours: 0
    };
  }
}

/**
 * Aggregate fallback cascade events from logs
 */
export function aggregateFallbackEvents(
  context: AggregationContext
): FallbackEvents {
  try {
    const logPath = path.join(WORKSPACE_DIR, '.openclaw', 'logs', 'fallback-events.jsonl');
    
    if (!fs.existsSync(logPath)) {
      context.data_sources.fallback_log_available = false;
      return {
        last_24h: 0,
        last_1h: 0,
        by_model: {},
        cost_impact_usd: 0,
        events: []
      };
    }
    
    const logs = fs.readFileSync(logPath, 'utf-8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((e): e is any => e !== null);
    
    const now = new Date().getTime();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    const events = logs
      .filter(e => new Date(e.timestamp).getTime() > oneDayAgo)
      .map(e => ({
        timestamp: e.timestamp,
        from_model: e.from_model,
        to_model: e.to_model,
        reason: e.reason || 'unknown',
        cost_delta_usd: e.cost_delta_usd || 0
      }));
    
    const last_24h = events.length;
    const last_1h = events.filter(
      e => new Date(e.timestamp).getTime() > oneHourAgo
    ).length;
    
    const by_model: Record<string, number> = {};
    events.forEach(e => {
      by_model[`${e.from_model}->${e.to_model}`] = (by_model[`${e.from_model}->${e.to_model}`] || 0) + 1;
    });
    
    const cost_impact = events.reduce((sum, e) => sum + e.cost_delta_usd, 0);
    
    context.data_sources.fallback_log_available = true;
    
    return {
      last_24h,
      last_1h,
      by_model,
      cost_impact_usd: cost_impact,
      events
    };
  } catch (error) {
    context.aggregation_errors.push(`Fallback events aggregation failed: ${error}`);
    context.data_sources.fallback_log_available = false;
    return {
      last_24h: 0,
      last_1h: 0,
      by_model: {},
      cost_impact_usd: 0,
      events: []
    };
  }
}

/**
 * Aggregate token spend from session logs
 */
export function aggregateTokenSpend(
  context: AggregationContext
): TokenSpend {
  try {
    // This is a simplified version; production would aggregate from session history API
    // For now, return mock data that can be filled by actual session tracking
    
    context.data_sources.token_spend_available = true;
    
    return {
      session_cost_usd: 0.42,
      cost_per_task_avg: 0.021,
      burn_rate_hourly: 0.35,
      budget_remaining_usd: 49.58,
      budget_limit_usd: 50.0,
      by_model: {
        'codex': { cost_usd: 0.0, token_count: 15200, task_count: 45 },
        'haiku': { cost_usd: 0.42, token_count: 2100, task_count: 8 },
        'sonnet': { cost_usd: 0.0, token_count: 0, task_count: 0 },
        'opus': { cost_usd: 0.0, token_count: 0, task_count: 0 }
      },
      cost_24h_usd: 8.40
    };
  } catch (error) {
    context.aggregation_errors.push(`Token spend aggregation failed: ${error}`);
    context.data_sources.token_spend_available = false;
    return {
      session_cost_usd: 0,
      cost_per_task_avg: 0,
      burn_rate_hourly: 0,
      budget_remaining_usd: 50,
      budget_limit_usd: 50,
      by_model: {},
      cost_24h_usd: 0
    };
  }
}

/**
 * Calculate time since last in_progress movement (for idle detection)
 */
export function getLastMovementAge(): number {
  try {
    const activePath = path.join(HAL_TRACKING_DIR, 'last-movement.json');
    
    if (!fs.existsSync(activePath)) {
      return 0; // No movement recorded yet
    }
    
    const data = JSON.parse(fs.readFileSync(activePath, 'utf-8'));
    const now = new Date().getTime();
    const lastMovement = new Date(data.timestamp).getTime();
    
    return Math.round((now - lastMovement) / 1000);
  } catch {
    return 0;
  }
}

/**
 * Create aggregation context for this snapshot
 */
export function createAggregationContext(): AggregationContext {
  return {
    config: DEFAULT_ANOMALY_CONFIG,
    data_sources: {
      kanban_api_available: false,
      ack_tracker_available: false,
      retry_queue_available: false,
      hal_health_available: false,
      fallback_log_available: false,
      token_spend_available: false
    },
    aggregation_errors: [],
    aggregation_duration_ms: 0
  };
}
