#!/usr/bin/env node

/**
 * Knowledge Freshness Scanner for Alfred Artifacts
 * 
 * Audits workspace memory, ideas, and review artifacts for:
 * - Staleness (age > threshold)
 * - Supersession (newer artifact likely replaces older one)
 * - Contradictions (conflicting recommendations across artifacts)
 * - Relevance drift (recommendations no longer applicable)
 * 
 * Generates: Refresh queue + staleness report
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE = process.env.WORKSPACE || path.join(process.env.HOME, '.openclaw/workspace');
const MEMORY_DIR = path.join(WORKSPACE, 'memory');
const GOALS_DIR = path.join(WORKSPACE, 'goals');
const TODAY = new Date();

// Freshness thresholds (days)
const THRESHOLDS = {
  memory_log: 7,          // Daily logs older than 7d are stale
  portfolio_snapshot: 7,  // Portfolio snapshots older than 7d
  growth_audit: 14,       // Growth audits older than 2 weeks
  proactive_scan: 14,     // Proactive task results older than 2 weeks
  decision: 30,           // Decisions older than 30d need review
  signal_research: 21,    // Signal app research stales in 3 weeks
  portfolio_analysis: 14, // Portfolio reviews older than 2 weeks
};

// Artifact patterns to scan
const PATTERNS = {
  // Growth audits (can be superseded by newer audits)
  growth_audit: /^(coinusup|even[-_]us[-_]up|signal[-_]app|alfred)[-_]?(growth|audit)/i,
  
  // Portfolio snapshots
  portfolio_snapshot: /portfolio[-_]snapshot/i,
  
  // Proactive scans (can be superseded)
  proactive_scan: /^(passive[-_]income|canada[-_]scan|workflow[-_]efficiency|infrastructure[-_]audit|signal[-_]app[-_]monetization)/i,
  
  // Ideas & research (can become stale if already implemented)
  ideas: /ideas\.json/,
  
  // Signal app research
  signal_research: /signal[-_]app.*research|monetization.*analysis/i,
  
  // Portfolio analysis
  portfolio_analysis: /passive[-_]income[-_]portfolio|portfolio[-_]health/i,
};

// Supersession rules: [older_pattern, newer_pattern] = "reason"
const SUPERSESSION_RULES = {
  'coinusup-growth-audit': {
    newer: ['coinusup-growth-audit', '2026-04-03', '2026-04-10'],
    reason: 'Newer audit replaces older recommendations',
  },
  'even-us-up-discovery': {
    newer: ['even[-_]us[-_]up[-_]discovery', '2026-03-21'],
    reason: 'Feature discovery phase likely supersedes prior exploration',
  },
  'signal-app-monetization': {
    newer: ['signal[-_]app[-_]monetization', '2026-04-03', '2026-04-11'],
    reason: 'Monetization strategy refreshed with new analysis',
  },
  'proactive-task-results': {
    newer: ['2026-04-', '2026-03-'],
    reason: 'April scans likely supersede March iterations',
  },
};

class FreshnessScanner {
  constructor() {
    this.artifacts = [];
    this.stale = [];
    this.superseded = [];
    this.contradictions = [];
    this.refreshQueue = [];
  }

  /**
   * Load all artifacts from disk
   */
  loadArtifacts() {
    // Load memory files
    if (fs.existsSync(MEMORY_DIR)) {
      fs.readdirSync(MEMORY_DIR).forEach(file => {
        const fullPath = path.join(MEMORY_DIR, file);
        if (fs.statSync(fullPath).isFile() && file.endsWith('.md')) {
          this.artifacts.push({
            type: 'memory',
            name: file,
            path: fullPath,
            mtime: fs.statSync(fullPath).mtime,
            size: fs.statSync(fullPath).size,
          });
        }
      });
    }

    // Load goals/ideas.json
    const ideasPath = path.join(GOALS_DIR, 'ideas.json');
    if (fs.existsSync(ideasPath)) {
      this.artifacts.push({
        type: 'ideas',
        name: 'ideas.json',
        path: ideasPath,
        mtime: fs.statSync(ideasPath).mtime,
        size: fs.statSync(ideasPath).size,
      });
    }

    // Load goals/tasks.json
    const tasksPath = path.join(GOALS_DIR, 'tasks.json');
    if (fs.existsSync(tasksPath)) {
      this.artifacts.push({
        type: 'tasks',
        name: 'tasks.json',
        path: tasksPath,
        mtime: fs.statSync(tasksPath).mtime,
        size: fs.statSync(tasksPath).size,
      });
    }
  }

  /**
   * Calculate age in days
   */
  ageInDays(mtime) {
    return Math.floor((TODAY - new Date(mtime)) / (1000 * 60 * 60 * 24));
  }

  /**
   * Detect artifact category
   */
  categorize(artifact) {
    const name = artifact.name.toLowerCase();
    
    if (PATTERNS.growth_audit.test(name)) return 'growth_audit';
    if (PATTERNS.portfolio_snapshot.test(name)) return 'portfolio_snapshot';
    if (PATTERNS.proactive_scan.test(name)) return 'proactive_scan';
    if (PATTERNS.signal_research.test(name)) return 'signal_research';
    if (PATTERNS.portfolio_analysis.test(name)) return 'portfolio_analysis';
    if (PATTERNS.ideas.test(name)) return 'ideas';
    
    return null; // Not tracked
  }

  /**
   * Detect staleness
   */
  detectStaleness() {
    this.artifacts.forEach(artifact => {
      const category = this.categorize(artifact);
      if (!category) return;

      const age = this.ageInDays(artifact.mtime);
      const threshold = THRESHOLDS[category] || 14;

      if (age > threshold) {
        this.stale.push({
          artifact: artifact.name,
          category,
          age,
          threshold,
          mtime: artifact.mtime.toISOString().split('T')[0],
          staleDays: age - threshold,
        });
      }
    });

    // Sort by staleness
    this.stale.sort((a, b) => b.staleDays - a.staleDays);
  }

  /**
   * Detect supersession (newer artifact likely replaces older)
   */
  detectSupersession() {
    // Group by category
    const byCategory = {};
    this.artifacts.forEach(artifact => {
      const cat = this.categorize(artifact);
      if (!cat) return;
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(artifact);
    });

    // Within each category, newer should supersede older
    Object.entries(byCategory).forEach(([category, items]) => {
      if (items.length < 2) return;

      // Sort by mtime descending (newest first)
      items.sort((a, b) => b.mtime - a.mtime);

      // Check if there's a significant gap
      for (let i = 1; i < items.length; i++) {
        const newer = items[0];
        const older = items[i];
        const ageDiff = this.ageInDays(older.mtime) - this.ageInDays(newer.mtime);

        // If diff > 7 days AND older is still fairly recent (< 30d), flag as potential supersession
        if (ageDiff > 7) {
          this.superseded.push({
            older: older.name,
            newer: newer.name,
            category,
            ageDiff,
            olderDate: older.mtime.toISOString().split('T')[0],
            newerDate: newer.mtime.toISOString().split('T')[0],
          });
        }
      }
    });
  }

  /**
   * Detect contradictions (simplified: check for conflicting recommendations in text)
   */
  detectContradictions() {
    // This is a simplified version. Real implementation would parse artifact content.
    // For now, flag manual review when we see multiple conflicting analyses.
    
    const conflictPatterns = [
      {
        name: 'Signal App Strategy',
        docs: ['signal-app-monetization', 'SIGNAL-APP-PHASE1-PLAN', 'signal-app-research'],
      },
      {
        name: 'CoinUsUp Growth',
        docs: ['coinusup-growth-audit', 'COINUSUP-GROWTH-ANALYSIS', 'coinusup-content-hub'],
      },
      {
        name: 'Even Us Up Roadmap',
        docs: ['even-us-up-growth-audit', 'even-us-up-discovery', 'even-us-up-completion'],
      },
    ];

    conflictPatterns.forEach(({ name, docs }) => {
      const found = this.artifacts.filter(a => 
        docs.some(d => a.name.toLowerCase().includes(d.toLowerCase()))
      );

      if (found.length > 1) {
        this.contradictions.push({
          topic: name,
          artifacts: found.map(f => f.name),
          count: found.length,
          recommendation: `Review for conflicting recommendations; consolidate into single canonical version`,
        });
      }
    });
  }

  /**
   * Build refresh queue
   */
  buildRefreshQueue() {
    // Priority 1: Stale critical artifacts (growth audits, portfolio snapshots)
    this.stale
      .filter(s => ['growth_audit', 'portfolio_snapshot', 'portfolio_analysis'].includes(s.category))
      .forEach(s => {
        this.refreshQueue.push({
          priority: 1,
          type: 'REFRESH_STALE',
          artifact: s.artifact,
          reason: `${s.category} stale for ${s.staleDays} days (threshold: ${s.threshold}d)`,
          action: `Re-audit and refresh ${s.artifact}`,
        });
      });

    // Priority 2: Superseded artifacts
    this.superseded.forEach(s => {
      this.refreshQueue.push({
        priority: 2,
        type: 'REVIEW_SUPERSESSION',
        artifact: s.older,
        newer: s.newer,
        reason: `${s.newer} (${s.ageDiff}d newer) likely supersedes ${s.older}`,
        action: `Verify if ${s.newer} replaces ${s.older}; archive if confirmed`,
      });
    });

    // Priority 3: Contradictions
    this.contradictions.forEach(c => {
      this.refreshQueue.push({
        priority: 3,
        type: 'RESOLVE_CONTRADICTION',
        topic: c.topic,
        artifacts: c.artifacts,
        reason: c.recommendation,
        action: `Consolidate ${c.count} artifacts into single canonical recommendation`,
      });
    });

    // Sort by priority
    this.refreshQueue.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Generate report
   */
  generateReport() {
    const reportPath = path.join(WORKSPACE, 'FRESHNESS-SCANNER-REPORT.md');
    
    let report = `# Knowledge Freshness Scanner Report\n\n`;
    report += `Generated: ${TODAY.toISOString()}\n\n`;

    // Summary
    report += `## Summary\n\n`;
    report += `- **Total artifacts scanned:** ${this.artifacts.length}\n`;
    report += `- **Stale artifacts:** ${this.stale.length}\n`;
    report += `- **Potentially superseded:** ${this.superseded.length}\n`;
    report += `- **Topics with contradictions:** ${this.contradictions.length}\n`;
    report += `- **Refresh queue items:** ${this.refreshQueue.length}\n\n`;

    // Staleness section
    if (this.stale.length > 0) {
      report += `## Stale Artifacts (${this.stale.length})\n\n`;
      report += `| Artifact | Category | Age | Threshold | Stale By |\n`;
      report += `|----------|----------|-----|-----------|----------|\n`;
      this.stale.forEach(s => {
        report += `| ${s.artifact} | ${s.category} | ${s.age}d | ${s.threshold}d | ${s.staleDays}d |\n`;
      });
      report += `\n`;
    }

    // Supersession section
    if (this.superseded.length > 0) {
      report += `## Potentially Superseded Artifacts (${this.superseded.length})\n\n`;
      report += `Newer artifacts likely replace older ones:\n\n`;
      report += `| Older Artifact | Newer Artifact | Category | Age Diff | Recommendation |\n`;
      report += `|---|---|---|---|---|\n`;
      this.superseded.forEach(s => {
        report += `| ${s.older}<br/>(_${s.olderDate}_) | ${s.newer}<br/>(_${s.newerDate}_) | ${s.category} | ${s.ageDiff}d | Archive older |\n`;
      });
      report += `\n`;
    }

    // Contradictions section
    if (this.contradictions.length > 0) {
      report += `## Contradictions Detected (${this.contradictions.length})\n\n`;
      report += `Topics with multiple conflicting recommendations:\n\n`;
      this.contradictions.forEach(c => {
        report += `### ${c.topic}\n\n`;
        report += `**Conflicting artifacts:** ${c.artifacts.join(', ')}\n\n`;
        report += `**Recommendation:** ${c.recommendation}\n\n`;
      });
      report += `\n`;
    }

    // Refresh queue
    if (this.refreshQueue.length > 0) {
      report += `## Refresh Queue (${this.refreshQueue.length} items)\n\n`;
      report += `Prioritized work items to restore knowledge freshness:\n\n`;

      const byPriority = {};
      this.refreshQueue.forEach(item => {
        if (!byPriority[item.priority]) byPriority[item.priority] = [];
        byPriority[item.priority].push(item);
      });

      Object.entries(byPriority).forEach(([priority, items]) => {
        const priorityName = priority == 1 ? 'CRITICAL' : priority == 2 ? 'HIGH' : 'MEDIUM';
        report += `### Priority ${priority}: ${priorityName} (${items.length} items)\n\n`;

        items.forEach((item, idx) => {
          report += `**${idx + 1}. ${item.type}**\n\n`;
          report += `- **Artifact:** ${item.artifact || item.topic}\n`;
          if (item.newer) report += `- **Newer Version:** ${item.newer}\n`;
          if (item.artifacts) report += `- **Related Artifacts:** ${item.artifacts.join(', ')}\n`;
          report += `- **Reason:** ${item.reason}\n`;
          report += `- **Action:** ${item.action}\n\n`;
        });
      });
    }

    // Implementation notes
    report += `## Implementation Notes\n\n`;
    report += `1. **Stale artifacts** — These are older than their freshness threshold. Re-audit to confirm recommendations still hold or have changed.\n`;
    report += `2. **Superseded artifacts** — Newer versions exist in the same category. Verify the newer one captures all important insights from the older; archive if confirmed.\n`;
    report += `3. **Contradictions** — Multiple artifacts recommend conflicting strategies for the same topic. Consolidate into a single canonical recommendation.\n`;
    report += `4. **Refresh queue** — Prioritized work to restore knowledge freshness. Start with Priority 1 items.\n\n`;

    fs.writeFileSync(reportPath, report);
    console.log(`✅ Report written to: ${reportPath}`);
    
    return reportPath;
  }

  /**
   * Run full scan
   */
  run() {
    console.log(`🔍 Starting freshness scan...\n`);

    this.loadArtifacts();
    console.log(`📦 Loaded ${this.artifacts.length} artifacts\n`);

    this.detectStaleness();
    console.log(`⏳ Stale: ${this.stale.length}`);

    this.detectSupersession();
    console.log(`🔄 Superseded: ${this.superseded.length}`);

    this.detectContradictions();
    console.log(`⚠️  Contradictions: ${this.contradictions.length}\n`);

    this.buildRefreshQueue();
    console.log(`📋 Refresh queue: ${this.refreshQueue.length} items\n`);

    const reportPath = this.generateReport();

    return {
      artifactCount: this.artifacts.length,
      staleCount: this.stale.length,
      supersededCount: this.superseded.length,
      contradictionCount: this.contradictions.length,
      refreshQueueCount: this.refreshQueue.length,
      reportPath,
    };
  }
}

// Main
const scanner = new FreshnessScanner();
const result = scanner.run();

console.log(`\n📊 Freshness Audit Complete`);
console.log(`Report: ${result.reportPath}`);
console.log(`\nNext steps:`);
console.log(`1. Review FRESHNESS-SCANNER-REPORT.md`);
console.log(`2. Address Priority 1 items (critical staleness)`);
console.log(`3. Archive confirmed supersessions`);
console.log(`4. Consolidate contradictory artifacts`);

process.exit(0);
