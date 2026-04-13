/**
 * NotificationDedupMetrics.tsx
 * 
 * React component for displaying notification deduplication metrics
 * Integrates with Command Center dashboard to show:
 * - Suppression rates and trends
 * - Active topics and their cooldown status
 * - Recent suppressions and reasons
 * - Manual controls for resetting topics or adding evidence
 */

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface TopicInfo {
  topic: string;
  asked_count: number;
  last_asked: string;
  escalation_tier: number;
  is_blocked: boolean;
  blocked_until: string | null;
  days_remaining: number;
  evidence_updated: string | null;
}

interface DedupReport {
  timestamp: string;
  summary: {
    total_notifications_checked: number;
    total_suppressed: number;
    total_escalated: number;
    suppression_rate_percent: number;
    allowed_rate_percent: number;
  };
  topics: TopicInfo[];
  suppression_reasons: Array<{
    reason: string;
    count: number;
    percentage: string;
  }>;
  recent_suppressions: Array<{
    timestamp: string;
    title: string;
    topic: string;
    reason: string;
  }>;
  health: {
    tracking_file_exists: boolean;
    last_updated: string;
    topics_tracked: number;
  };
}

export function NotificationDedupMetrics() {
  const [report, setReport] = useState<DedupReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [evidenceText, setEvidenceText] = useState("");

  // Fetch dedup report
  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch("/api/notifications/dedup-report");
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setReport(data);
      } catch (error) {
        console.error("Error fetching dedup report:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
    const interval = setInterval(fetchReport, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleResetTopic = async (topic: string) => {
    try {
      const response = await fetch("/api/notifications/dedup-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      if (response.ok) {
        setSelectedTopic(null);
        // Refetch report
        const newReport = await fetch("/api/notifications/dedup-report");
        const data = await newReport.json();
        setReport(data);
      }
    } catch (error) {
      console.error("Error resetting topic:", error);
    }
  };

  const handleAddEvidence = async (topic: string) => {
    try {
      const response = await fetch("/api/notifications/dedup-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, evidence: evidenceText }),
      });
      if (response.ok) {
        setSelectedTopic(null);
        setEvidenceText("");
        // Refetch report
        const newReport = await fetch("/api/notifications/dedup-report");
        const data = await newReport.json();
        setReport(data);
      }
    } catch (error) {
      console.error("Error adding evidence:", error);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading metrics...</div>;
  }

  if (!report) {
    return <div className="text-sm text-red-500">Failed to load metrics</div>;
  }

  const { summary, topics, suppression_reasons, recent_suppressions, health } = report;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Notifications Checked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_notifications_checked}</div>
            <p className="text-xs text-gray-500 mt-1">
              Suppressed: {summary.total_suppressed}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Suppression Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.suppression_rate_percent}%</div>
            <Progress value={summary.suppression_rate_percent} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Topics Status */}
      <Card>
        <CardHeader>
          <CardTitle>Active Topics ({health.topics_tracked})</CardTitle>
          <CardDescription>
            Tracked topics with cooldown status and escalation info
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {topics.length === 0 ? (
              <p className="text-sm text-gray-500">No topics tracked yet</p>
            ) : (
              topics.map((topic) => (
                <div
                  key={topic.topic}
                  className="p-3 border border-gray-200 rounded-lg flex items-start justify-between"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{topic.topic}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Asked: <strong>{topic.asked_count}x</strong> • Last:{" "}
                      <strong>{topic.last_asked}</strong>
                    </div>
                    {topic.is_blocked && (
                      <div className="text-xs text-orange-600 mt-1">
                        Blocked for {topic.days_remaining} more days
                      </div>
                    )}
                    {topic.escalation_tier > 0 && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        Tier {topic.escalation_tier}
                      </Badge>
                    )}
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTopic(topic.topic)}
                      >
                        Actions
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>{topic.topic}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-2">
                            Add new evidence to escalate this topic and allow re-asking sooner.
                          </p>
                          <Textarea
                            placeholder="Describe new context or evidence..."
                            value={evidenceText}
                            onChange={(e) => setEvidenceText(e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleAddEvidence(topic.topic)}
                            className="flex-1"
                          >
                            Add Evidence
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleResetTopic(topic.topic)}
                            className="flex-1"
                          >
                            Reset Topic
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Suppression Reasons */}
      {suppression_reasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Suppression Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suppression_reasons.map((item) => (
                <div key={item.reason} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.reason}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{item.count}</Badge>
                    <span className="text-gray-600">({item.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Suppressions */}
      {recent_suppressions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Suppressions</CardTitle>
            <CardDescription>Last 20 suppressed notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
              {recent_suppressions.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-gray-50 rounded border border-gray-100 flex items-start gap-2"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.title}</div>
                    <div className="text-gray-600">
                      Topic: {item.topic} • Reason: {item.reason}
                    </div>
                    <div className="text-gray-500 mt-1">
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">System Health</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1 text-gray-600">
          <div>✓ Tracking file: {health.tracking_file_exists ? "OK" : "Missing"}</div>
          <div>✓ Topics tracked: {health.topics_tracked}</div>
          <div>✓ Last updated: {new Date(health.last_updated).toLocaleString()}</div>
        </CardContent>
      </Card>
    </div>
  );
}
