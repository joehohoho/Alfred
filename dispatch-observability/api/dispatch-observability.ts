/**
 * Dispatch Observability API Endpoint
 * 
 * Express routes for monitoring HAL/Alfred dispatch pipeline health.
 * 
 * Routes:
 * - GET /api/dispatch-observability — Full snapshot with anomaly detection
 * - GET /api/dispatch-observability/health — Quick health check
 * - GET /api/dispatch-observability/anomalies — Anomalies only
 */

import express, { Router, Request, Response } from 'express';
import {
  DispatchObservability,
  DispatchHealth,
  AnomalyConfig
} from '../types/dispatch-observability';
import {
  detectAllAnomalies,
  summarizeAnomalies,
  DEFAULT_ANOMALY_CONFIG
} from '../anomaly-detection/rules';
import {
  aggregateQueueDepth,
  aggregatePendingAcks,
  aggregateRetryQueue,
  aggregateHalHealth,
  aggregateFallbackEvents,
  aggregateTokenSpend,
  getLastMovementAge,
  createAggregationContext
} from './aggregation';

/**
 * Initialize dispatch observability routes
 */
export function initDispatchObservabilityRoutes(app: express.Express): Router {
  const router = express.Router();
  
  /**
   * GET /api/dispatch-observability
   * 
   * Full snapshot including:
   * - Queue depth
   * - Pending ACKs
   * - Retry queue
   * - HAL health
   * - Fallback events
   * - Token spend
   * - 6-rule anomaly detection results
   * 
   * Response time: ~150ms (async data collection)
   */
  router.get('/api/dispatch-observability', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const context = createAggregationContext();
      
      // Aggregate all data sources (mostly parallel)
      const [
        queue_depth,
        pending_acks,
        retry_queue,
        hal_health,
        fallback_events,
        token_spend
      ] = await Promise.all([
        aggregateQueueDepth(context),
        Promise.resolve(aggregatePendingAcks(context)),
        Promise.resolve(aggregateRetryQueue(context)),
        Promise.resolve(aggregateHalHealth(context)),
        Promise.resolve(aggregateFallbackEvents(context)),
        Promise.resolve(aggregateTokenSpend(context))
      ]);
      
      const lastMovementAge = getLastMovementAge();
      
      // Run anomaly detection
      const anomalies = detectAllAnomalies(
        queue_depth,
        pending_acks,
        retry_queue,
        hal_health,
        fallback_events,
        token_spend,
        context.config,
        lastMovementAge
      );
      
      const snapshot_duration_ms = Date.now() - startTime;
      
      const response: DispatchObservability = {
        timestamp: new Date().toISOString(),
        queue_depth,
        pending_acks,
        retry_queue,
        hal_health,
        fallback_events,
        token_spend,
        anomalies,
        snapshot_duration_ms
      };
      
      res.json(response);
    } catch (error) {
      const snapshot_duration_ms = Date.now() - startTime;
      
      res.status(500).json({
        error: 'Dispatch observability snapshot failed',
        message: error instanceof Error ? error.message : String(error),
        snapshot_duration_ms,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  /**
   * GET /api/dispatch-observability/health
   * 
   * Quick health check (lightweight):
   * - HAL connection status
   * - Queue depth (total)
   * - Anomaly count + severity
   * - Overall status
   * 
   * Response time: <50ms
   */
  router.get('/api/dispatch-observability/health', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const context = createAggregationContext();
      
      // Fast path: only HAL health and queue depth
      const hal_health = aggregateHalHealth(context);
      const queue_depth = await aggregateQueueDepth(context);
      
      const lastMovementAge = getLastMovementAge();
      const pending_acks = aggregatePendingAcks(context);
      const retry_queue = aggregateRetryQueue(context);
      const fallback_events = aggregateFallbackEvents(context);
      const token_spend = aggregateTokenSpend(context);
      
      // Detect only critical/error anomalies for quick health
      const anomalies = detectAllAnomalies(
        queue_depth,
        pending_acks,
        retry_queue,
        hal_health,
        fallback_events,
        token_spend,
        context.config,
        lastMovementAge
      );
      
      const summary = summarizeAnomalies(anomalies);
      
      // Determine overall health status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (summary.critical_count > 0) {
        status = 'critical';
      } else if (summary.error_count > 0 || summary.warning_count > 2) {
        status = 'warning';
      }
      
      const snapshot_duration_ms = Date.now() - startTime;
      
      const response: DispatchHealth = {
        timestamp: new Date().toISOString(),
        hal_status: hal_health.status,
        queue_depth_total: queue_depth.todo + queue_depth.in_progress + queue_depth.review,
        anomalies_count: summary.total_count,
        critical_alerts: summary.critical_count,
        status,
        snapshot_duration_ms
      };
      
      res.json(response);
    } catch (error) {
      const snapshot_duration_ms = Date.now() - startTime;
      
      res.status(500).json({
        error: 'Health check failed',
        message: error instanceof Error ? error.message : String(error),
        status: 'critical' as const,
        snapshot_duration_ms,
        timestamp: new Date().toISOString(),
        hal_status: 'unknown',
        queue_depth_total: 0,
        anomalies_count: 0,
        critical_alerts: 1
      });
    }
  });
  
  /**
   * GET /api/dispatch-observability/anomalies
   * 
   * Return only detected anomalies (useful for dashboard alerts)
   */
  router.get('/api/dispatch-observability/anomalies', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const context = createAggregationContext();
      
      const [
        queue_depth,
        pending_acks,
        retry_queue,
        hal_health,
        fallback_events,
        token_spend
      ] = await Promise.all([
        aggregateQueueDepth(context),
        Promise.resolve(aggregatePendingAcks(context)),
        Promise.resolve(aggregateRetryQueue(context)),
        Promise.resolve(aggregateHalHealth(context)),
        Promise.resolve(aggregateFallbackEvents(context)),
        Promise.resolve(aggregateTokenSpend(context))
      ]);
      
      const lastMovementAge = getLastMovementAge();
      
      const anomalies = detectAllAnomalies(
        queue_depth,
        pending_acks,
        retry_queue,
        hal_health,
        fallback_events,
        token_spend,
        context.config,
        lastMovementAge
      );
      
      const snapshot_duration_ms = Date.now() - startTime;
      
      res.json({
        timestamp: new Date().toISOString(),
        anomalies,
        count: anomalies.length,
        snapshot_duration_ms
      });
    } catch (error) {
      const snapshot_duration_ms = Date.now() - startTime;
      
      res.status(500).json({
        error: 'Anomaly detection failed',
        message: error instanceof Error ? error.message : String(error),
        snapshot_duration_ms,
        timestamp: new Date().toISOString(),
        anomalies: [],
        count: 0
      });
    }
  });
  
  app.use('/', router);
  return router;
}

/**
 * Export for testing
 */
export {
  detectAllAnomalies,
  summarizeAnomalies,
  aggregateQueueDepth,
  aggregatePendingAcks,
  aggregateRetryQueue,
  aggregateHalHealth,
  aggregateFallbackEvents,
  aggregateTokenSpend
};
