/**
 * API endpoint for notification deduplication metrics
 * Integrates with Command Center dashboard
 * 
 * Endpoints:
 *   GET /api/notifications/dedup-report — Full dedup metrics
 *   POST /api/notifications/dedup-reset — Reset a topic
 *   POST /api/notifications/dedup-evidence — Add evidence for topic
 */

const fs = require("fs");
const path = require("path");

const WORKSPACE = process.env.WORKSPACE || path.join(__dirname, "..");
const DEDUP_TRACKING = path.join(WORKSPACE, "memory", "notification-dedup-tracking.json");

/**
 * Load dedup tracking
 */
function loadTracking() {
  if (fs.existsSync(DEDUP_TRACKING)) {
    try {
      return JSON.parse(fs.readFileSync(DEDUP_TRACKING, "utf8"));
    } catch (e) {
      return initializeTracking();
    }
  }
  return initializeTracking();
}

/**
 * Initialize tracking
 */
function initializeTracking() {
  return {
    schema_version: "1.0",
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    topics: {},
    suppressed: [],
    metrics: {
      total_checked: 0,
      total_suppressed: 0,
      total_escalated: 0,
      by_reason: {},
    },
  };
}

/**
 * Save tracking
 */
function saveTracking(data) {
  fs.mkdirSync(path.dirname(DEDUP_TRACKING), { recursive: true });
  fs.writeFileSync(DEDUP_TRACKING, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Generate report with dashboard-friendly formatting
 */
function generateDashboardReport() {
  const tracking = loadTracking();
  const now = new Date();

  // Calculate suppression rate
  const suppressionRate =
    tracking.metrics.total_checked > 0
      ? ((tracking.metrics.total_suppressed / tracking.metrics.total_checked) * 100).toFixed(1)
      : 0;

  // Format topic summary
  const topicsSummary = Object.entries(tracking.topics)
    .sort(([, a], [, b]) => (b.last_asked_at || "") > (a.last_asked_at || "") ? 1 : -1)
    .map(([key, topic]) => {
      const blockedUntil = topic.blocked_until ? new Date(topic.blocked_until) : null;
      const daysRemaining = blockedUntil ? Math.ceil((blockedUntil - now) / (1000 * 60 * 60 * 24)) : 0;
      const isBlocked = blockedUntil && blockedUntil > now;

      return {
        topic: key,
        asked_count: topic.count || 0,
        last_asked: topic.last_asked_at ? new Date(topic.last_asked_at).toLocaleDateString() : "never",
        escalation_tier: topic.escalation_tier || 0,
        is_blocked: isBlocked,
        blocked_until: blockedUntil ? blockedUntil.toISOString() : null,
        days_remaining: daysRemaining,
        evidence_updated: topic.evidence_updated_at || null,
      };
    });

  // Suppression reasons breakdown
  const reasonBreakdown = Object.entries(tracking.metrics.by_reason || {}).map(([reason, count]) => ({
    reason,
    count,
    percentage: ((count / (tracking.metrics.total_suppressed || 1)) * 100).toFixed(1),
  }));

  // Recent suppressions
  const recentSuppressions = (tracking.suppressed || [])
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 20)
    .map((s) => ({
      timestamp: s.timestamp,
      title: s.title || s.action || "(no title)",
      topic: s.topic,
      reason: s.reason || s.action,
    }));

  return {
    timestamp: now.toISOString(),
    summary: {
      total_notifications_checked: tracking.metrics.total_checked,
      total_suppressed: tracking.metrics.total_suppressed,
      total_escalated: tracking.metrics.total_escalated,
      suppression_rate_percent: parseFloat(suppressionRate),
      allowed_rate_percent: parseFloat((100 - suppressionRate).toFixed(1)),
    },
    topics: topicsSummary,
    suppression_reasons: reasonBreakdown,
    recent_suppressions: recentSuppressions,
    health: {
      tracking_file_exists: true,
      last_updated: tracking.last_updated,
      topics_tracked: Object.keys(tracking.topics).length,
    },
  };
}

/**
 * Express route handlers
 */
module.exports = {
  /**
   * GET /api/notifications/dedup-report
   * Returns full dedup report for dashboard display
   */
  getReport: (req, res) => {
    try {
      const report = generateDashboardReport();
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * POST /api/notifications/dedup-reset
   * Body: { topic: "topic-key" }
   * Resets a topic's cooldown and count
   */
  resetTopic: (req, res) => {
    try {
      const { topic } = req.body;
      if (!topic) {
        return res.status(400).json({ error: "Missing topic" });
      }

      const tracking = loadTracking();
      if (tracking.topics[topic]) {
        delete tracking.topics[topic];
        tracking.last_updated = new Date().toISOString();
        saveTracking(tracking);

        res.json({
          status: "reset",
          topic,
          message: `Reset topic: ${topic}`,
        });
      } else {
        res.status(404).json({ error: `Topic not found: ${topic}` });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * POST /api/notifications/dedup-evidence
   * Body: { topic: "topic-key", evidence: "description of new context" }
   * Adds new evidence, potentially escalating the question sooner
   */
  addEvidence: (req, res) => {
    try {
      const { topic, evidence } = req.body;
      if (!topic) {
        return res.status(400).json({ error: "Missing topic" });
      }

      const tracking = loadTracking();
      const now = new Date();

      if (!tracking.topics[topic]) {
        tracking.topics[topic] = {
          last_asked_at: null,
          count: 0,
          escalation_tier: 1,
          blocked_until: now.toISOString(),
          evidence_updated_at: now.toISOString(),
        };
      } else {
        const topicData = tracking.topics[topic];
        topicData.escalation_tier = (topicData.escalation_tier || 0) + 1;
        topicData.evidence_updated_at = now.toISOString();

        // Allow asking again sooner if new evidence arrives
        if ((topicData.escalation_tier || 0) <= 2) {
          // After new evidence: allow re-ask after 3 days instead of 7-14
          topicData.blocked_until = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
        }
      }

      tracking.metrics.total_escalated = (tracking.metrics.total_escalated || 0) + 1;
      tracking.last_updated = now.toISOString();

      // Log the evidence addition
      tracking.suppressed = tracking.suppressed || [];
      tracking.suppressed.push({
        timestamp: now.toISOString(),
        action: "evidence_added",
        topic,
        evidence: evidence || "(no description)",
      });

      saveTracking(tracking);

      res.json({
        status: "escalated",
        topic,
        escalation_tier: tracking.topics[topic].escalation_tier,
        next_allowed_in_days: 3,
        message: `Added evidence for ${topic}. Question can be re-asked in 3 days.`,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
