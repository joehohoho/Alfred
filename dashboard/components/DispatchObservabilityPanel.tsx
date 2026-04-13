/**
 * DispatchObservabilityPanel.tsx
 *
 * Unified observability panel for HAL/Alfred dispatch queue management.
 * Shows dispatch backlog, retry queue, pending ACKs, fallback reasons,
 * token budget, and health anomalies.
 *
 * Displays on `/dispatch-observability` in Command Center.
 */

import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, AlertCircle, TrendingUp, Clock } from "lucide-react";

interface DispatchData {
  timestamp: string;
  dispatch_summary: {
    total_dispatched: number;
    dispatched_to_hal: number;
    dispatched_to_alfred: number;
    hal_failures: number;
    handled_by_alfred: number;
    last_hal_dispatch: {
      timestamp: string;
      task_id: string;
      task: string;
    } | null;
  };
  queue_status: {
    kanban_todo_count: number;
    kanban_in_progress_count: number;
    retry_queue_count: number;
    pending_ack_count: number;
    total_debt: number;
    oldest_pending_ack_minutes: number | null;
    retry_queue: Array<{
      task_id: string;
      first_attempt: string;
      last_attempt: string;
      attempts: number;
      age_minutes: number;
      reason: string;
    }>;
  };
  fallback_events: {
    last_24h_count: number;
    reasons: {
      rate_limit: number;
      token_budget_exhausted: number;
      connectivity: number;
      circuit_breaker: number;
      unknown: number;
    };
    recent_events: Array<{
      timestamp: string;
      reason: string;
      task_id: string;
      task: string;
    }>;
  };
  anomalies: Array<{
    type: string;
    severity: "critical" | "warning" | "info" | "none";
    message: string;
    [key: string]: any;
  }>;
  token_and_gates: {
    current_model: string;
    token_budget: {
      daily_limit: number;
      used_today: number;
      remaining: number;
      percent_used: number;
    };
    active_gates: Array<{
      gate: string;
      status: string;
      detail: string;
    }>;
    model_tier_distribution: {
      [key: string]: number;
    };
  };
  health_score: {
    overall: number;
    dispatch_efficiency: number;
    queue_health: number;
    fallback_rate: number;
    anomaly_count: number;
    recommendation: string;
  };
}

interface HealthColor {
  bg: string;
  text: string;
  border: string;
}

export const DispatchObservabilityPanel: React.FC = () => {
  const [data, setData] = useState<DispatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    retryQueue: false,
    pendingAcks: false,
    anomalies: true,
  });
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch observability data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dispatch/observability");
        if (!response.ok) throw new Error("Failed to fetch dispatch data");
        const json = await response.json();
        setData(json);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Auto-refresh every 30 seconds
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(fetchData, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-gray-600">Loading dispatch observability...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-800 font-medium">
          <AlertCircle size={20} />
          Error: {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg text-gray-600">
        No data available
      </div>
    );
  }

  const { dispatch_summary, queue_status, fallback_events, anomalies, token_and_gates, health_score } = data;

  const getHealthColor = (score: number): HealthColor => {
    if (score >= 90) return { bg: "bg-green-50", text: "text-green-800", border: "border-green-200" };
    if (score >= 75) return { bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-200" };
    if (score >= 60) return { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200" };
    return { bg: "bg-red-50", text: "text-red-800", border: "border-red-200" };
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: "bg-red-100 text-red-800",
      warning: "bg-yellow-100 text-yellow-800",
      info: "bg-blue-100 text-blue-800",
      none: "bg-green-100 text-green-800",
    };
    return colors[severity] || colors.info;
  };

  const healthColors = getHealthColor(health_score.overall);
  const minutesSinceLastDispatch = dispatch_summary.last_hal_dispatch
    ? Math.round((Date.now() - new Date(dispatch_summary.last_hal_dispatch.timestamp).getTime()) / 60000)
    : null;

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dispatch Observability</h1>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-600">Auto-refresh (30s)</span>
          </label>
          <span className="text-xs text-gray-500">{new Date(data.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Health Score Card */}
      <div
        className={`p-6 rounded-lg border-2 ${healthColors.bg} ${healthColors.border}`}
      >
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className={`text-4xl font-bold ${healthColors.text}`}>
              {Math.round(health_score.overall)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Overall Health</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-700">
              {Math.round(health_score.dispatch_efficiency)}%
            </div>
            <div className="text-sm text-gray-600 mt-1">Dispatch Efficiency</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-700">
              {queue_status.total_debt}
            </div>
            <div className="text-sm text-gray-600 mt-1">Queue Debt</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-700">
              {health_score.anomaly_count}
            </div>
            <div className="text-sm text-gray-600 mt-1">Active Issues</div>
          </div>
        </div>
        <div className={`mt-4 pt-4 border-t ${healthColors.border} text-sm ${healthColors.text} font-medium`}>
          💡 {health_score.recommendation}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Dispatch Summary Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dispatch Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Dispatched</span>
                <span className="font-semibold text-lg">{dispatch_summary.total_dispatched}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">To HAL</span>
                <span className="font-semibold text-lg text-blue-600">{dispatch_summary.dispatched_to_hal}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">To Alfred (Fallback)</span>
                <span className="font-semibold text-lg text-orange-600">{dispatch_summary.dispatched_to_alfred}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Failures</span>
                <span className="font-semibold text-lg text-red-600">{dispatch_summary.hal_failures}</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Last HAL Dispatch</div>
                {dispatch_summary.last_hal_dispatch ? (
                  <div className="space-y-1">
                    <div className="font-mono text-sm text-gray-900">
                      {dispatch_summary.last_hal_dispatch.task_id}
                    </div>
                    <div className="text-xs text-gray-500">
                      {minutesSinceLastDispatch} min ago
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">No recent dispatches</div>
                )}
              </div>
            </div>
          </div>

          {/* Queue Status Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Queue Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Kanban To-Do</span>
                <span className="font-semibold">{queue_status.kanban_todo_count}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Kanban In Progress</span>
                <span className="font-semibold">{queue_status.kanban_in_progress_count}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Retry Queue</span>
                <span className={`font-semibold ${queue_status.retry_queue_count > 0 ? "text-orange-600" : ""}`}>
                  {queue_status.retry_queue_count}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pending ACKs</span>
                <span className={`font-semibold ${queue_status.pending_ack_count > 0 ? "text-red-600" : ""}`}>
                  {queue_status.pending_ack_count}
                </span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total Debt</span>
                  <span className={`font-bold text-lg ${queue_status.total_debt > 0 ? "text-red-600" : "text-green-600"}`}>
                    {queue_status.total_debt}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Token & Budget Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Token & Budget</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Daily Budget</span>
                  <span className="font-semibold">{token_and_gates.token_budget.percent_used.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${token_and_gates.token_budget.percent_used}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{token_and_gates.token_budget.used_today.toLocaleString()}</span>
                  <span>{token_and_gates.token_budget.daily_limit.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="text-sm text-gray-600 mb-2">Current Model</div>
                <div className="font-semibold text-gray-900">{token_and_gates.current_model}</div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="text-sm text-gray-600 mb-2">Active Gates</div>
                <div className="space-y-2">
                  {token_and_gates.active_gates.map((gate, i) => (
                    <div key={i} className="flex justify-between items-start text-sm">
                      <span className="text-gray-600">{gate.gate}</span>
                      <div className="text-right">
                        <div
                          className={`font-semibold ${
                            gate.status === "ok" ? "text-green-600" : "text-yellow-600"
                          }`}
                        >
                          {gate.status}
                        </div>
                        <div className="text-xs text-gray-500">{gate.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Fallback Events Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Fallback Events (24h)</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Events</span>
                <span className="font-semibold text-lg">{fallback_events.last_24h_count}</span>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="text-sm text-gray-600 mb-2">By Reason</div>
                <div className="space-y-1 text-sm">
                  {Object.entries(fallback_events.reasons).map(([reason, count]) => (
                    <div key={reason} className="flex justify-between">
                      <span className="text-gray-600 capitalize">{reason.replace(/_/g, " ")}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Anomalies Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div
          className="p-6 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() =>
            setExpandedSections({
              ...expandedSections,
              anomalies: !expandedSections.anomalies,
            })
          }
        >
          <h2 className="text-lg font-semibold text-gray-900">Active Anomalies</h2>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getSeverityColor("info")}`}>
              {anomalies.length}
            </span>
            {expandedSections.anomalies ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>

        {expandedSections.anomalies && (
          <div className="border-t border-gray-200 p-6 space-y-3">
            {anomalies.map((anomaly, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border-l-4 ${
                  anomaly.severity === "critical"
                    ? "border-red-500 bg-red-50"
                    : anomaly.severity === "warning"
                      ? "border-yellow-500 bg-yellow-50"
                      : anomaly.severity === "info"
                        ? "border-blue-500 bg-blue-50"
                        : "border-green-500 bg-green-50"
                }`}
              >
                <div className="font-semibold text-gray-900 capitalize">{anomaly.type.replace(/_/g, " ")}</div>
                <div className="text-sm text-gray-700 mt-1">{anomaly.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Retry Queue Section */}
      {queue_status.retry_queue.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div
            className="p-6 flex justify-between items-center cursor-pointer hover:bg-gray-50"
            onClick={() =>
              setExpandedSections({
                ...expandedSections,
                retryQueue: !expandedSections.retryQueue,
              })
            }
          >
            <h2 className="text-lg font-semibold text-gray-900">Retry Queue Details</h2>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 text-orange-800">
                {queue_status.retry_queue.length}
              </span>
              {expandedSections.retryQueue ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>

          {expandedSections.retryQueue && (
            <div className="border-t border-gray-200 p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200">
                    <tr className="text-left text-gray-600">
                      <th className="pb-2 font-semibold">Task ID</th>
                      <th className="pb-2 font-semibold">Attempts</th>
                      <th className="pb-2 font-semibold">Age (min)</th>
                      <th className="pb-2 font-semibold">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {queue_status.retry_queue.map((task, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="py-2 font-mono text-gray-900">{task.task_id}</td>
                        <td className="py-2 text-gray-700">{task.attempts}</td>
                        <td className="py-2">
                          <span className={task.age_minutes > 60 ? "text-red-600 font-semibold" : "text-gray-700"}>
                            {task.age_minutes}
                          </span>
                        </td>
                        <td className="py-2 text-gray-600">{task.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Fallback Events Timeline */}
      {fallback_events.recent_events.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Fallback Events</h2>
          <div className="space-y-3">
            {fallback_events.recent_events.map((event, i) => (
              <div key={i} className="flex gap-4 pb-3 border-b border-gray-200 last:border-0">
                <div className="text-xs text-gray-500 font-mono whitespace-nowrap pt-1">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 capitalize">
                    {event.reason.replace(/_/g, " ")}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {event.task} ({event.task_id})
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchObservabilityPanel;
