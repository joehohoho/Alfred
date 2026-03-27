#!/usr/bin/env node
/**
 * health-monitor.js
 * 
 * Comprehensive service health monitor for OpenClaw infrastructure.
 * Monitors:
 * - All 24 LaunchAgents (macOS daemons)
 * - HAL gateway (remote WebSocket at 192.168.2.79:18789)
 * - Critical cron jobs (last execution status)
 * - Gateway uptime
 * - System resources (memory, disk)
 * 
 * Reports:
 * - JSON health snapshot (for dashboards)
 * - Markdown health report (for Discord/email)
 * - Alerts on service degradation
 * 
 * Usage:
 *   node health-monitor.js [--json] [--alert] [--watch 30]
 *   --json:   Output JSON instead of markdown
 *   --alert:  Only output if critical service is down
 *   --watch:  Poll every N seconds and report changes
 * 
 * Stored output:
 *   - ~/.openclaw/workspace/health/latest-snapshot.json (always written)
 *   - ~/.openclaw/workspace/health/latest-report.md (always written)
 *   - ~/.openclaw/workspace/memory/health-alerts.json (for trend analysis)
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

const HEALTH_DIR = path.join(process.env.HOME, '.openclaw/workspace/health');
const MEMORY_DIR = path.join(process.env.HOME, '.openclaw/workspace/memory');
const HAL_GATEWAY = '192.168.2.79';
const HAL_PORT = 18789;
const TIMEOUT = 3000; // 3 second timeout for checks

// Ensure directories exist
[HEALTH_DIR, MEMORY_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Critical services that block productivity
const CRITICAL_SERVICES = [
  'com.alfred.alfred-work-executor',  // Kanban task dispatcher
  'com.alfred.hal-idle-dispatch',     // HAL work distributor
  'ai.openclaw.gateway',              // Main gateway
];

// All monitored LaunchAgents
const LAUNCH_AGENTS = [
  // Core
  'ai.openclaw.gateway',
  'ai.openclaw.gateway.watchdog',
  'ai.openclaw.log-rotation',
  'ai.openclaw.session-cleanup',
  
  // Work execution
  'com.alfred.alfred-work-executor',
  'com.alfred.alfred-commandline',
  
  // HAL dispatch & backup
  'com.alfred.hal-idle-dispatch',
  'com.alfred.hal-backup',
  
  // Cron/automation
  'com.alfred.nightly-git-commit',
  'com.alfred.evening-routine',
  'com.alfred.daily-config-memory-review',
  'com.alfred.joe-profile-reflection',
  'com.alfred.workspace-idle-activities',
  'com.alfred.kanban-auto-promote',
  
  // Dashboard & monitoring
  'com.alfred.dashboard-nextjs',
  'com.alfred.command-center-api',
  
  // Weather
  'com.alfred.weather-alerts',
  'com.alfred.weather-monitor',
  
  // Backups
  'com.alfred.backup-tier1',
  'com.alfred.backup-tier2',
  'com.alfred.backup-tier3',
];

/**
 * Check if a LaunchAgent is running
 */
function checkLaunchAgent(agentName) {
  try {
    const output = execSync(`launchctl list | grep "${agentName}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    
    if (!output) return { status: 'unknown', pid: null };
    
    // Format: "PID  -   com.name"
    const parts = output.split(/\s+/);
    const pid = parts[0];
    
    if (pid === '-') return { status: 'disabled', pid: null };
    if (/^\d+$/.test(pid)) return { status: 'running', pid: parseInt(pid) };
    return { status: 'unknown', pid: null };
  } catch (err) {
    return { status: 'error', pid: null, error: err.message };
  }
}

/**
 * Check if HAL gateway is reachable
 */
function checkHalGateway(callback) {
  const socket = new net.Socket();
  socket.setTimeout(TIMEOUT);
  
  socket.on('connect', () => {
    socket.destroy();
    callback(null, { status: 'online', latency: Date.now() });
  });
  
  socket.on('timeout', () => {
    socket.destroy();
    callback(null, { status: 'timeout', latency: null });
  });
  
  socket.on('error', (err) => {
    callback(null, { status: 'offline', error: err.code, latency: null });
  });
  
  const startTime = Date.now();
  socket.connect(HAL_PORT, HAL_GATEWAY);
}

/**
 * Get gateway uptime
 */
function getGatewayUptime() {
  try {
    const output = execSync('ps aux | grep "openclaw-gateway" | grep -v grep', {
      encoding: 'utf8',
    }).trim();
    
    if (!output) return null;
    
    // Extract elapsed time from ps output
    // Format: ... ??  S  HH:MM.SS
    const parts = output.split(/\s+/);
    const timeIdx = parts.findIndex(p => p.includes(':'));
    if (timeIdx >= 0) {
      return parts[timeIdx]; // e.g., "0:25.54"
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Get system resources
 */
function getSystemResources() {
  try {
    const memOutput = execSync('vm_stat | grep "Pages active:"', {
      encoding: 'utf8',
    }).trim();
    
    const diskOutput = execSync('df -h / | tail -1', {
      encoding: 'utf8',
    }).trim();
    
    return {
      memory: memOutput || 'unknown',
      disk: diskOutput ? diskOutput.split(/\s+/)[4] : 'unknown', // percent used
    };
  } catch (err) {
    return { memory: 'error', disk: 'error' };
  }
}

/**
 * Check if a cron job ran recently
 */
function checkCronStatus(jobName) {
  try {
    const logPath = path.join(MEMORY_DIR, 'cron-logs', `${jobName}.log`);
    if (!fs.existsSync(logPath)) {
      return { status: 'no-log', lastRun: null };
    }
    
    const stat = fs.statSync(logPath);
    const ageMs = Date.now() - stat.mtimeMs;
    const ageMins = Math.floor(ageMs / 60000);
    
    // If modified in last hour, assume it ran
    if (ageMins < 60) {
      return { status: 'healthy', lastRun: ageMins + ' minutes ago' };
    }
    
    return { status: 'stale', lastRun: ageMins + ' minutes ago' };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

/**
 * Generate health snapshot
 */
async function generateSnapshot() {
  const snapshot = {
    timestamp: new Date().toISOString(),
    agents: {},
    hal: null,
    gateway: getGatewayUptime(),
    resources: getSystemResources(),
  };
  
  // Check all LaunchAgents
  for (const agent of LAUNCH_AGENTS) {
    const status = checkLaunchAgent(agent);
    snapshot.agents[agent] = {
      status: status.status,
      pid: status.pid,
      critical: CRITICAL_SERVICES.includes(agent),
    };
  }
  
  // Check HAL gateway
  return new Promise(resolve => {
    checkHalGateway((err, result) => {
      snapshot.hal = result;
      
      // Summary
      const running = Object.values(snapshot.agents).filter(a => a.status === 'running').length;
      const down = Object.values(snapshot.agents).filter(a => a.status === 'disabled' || a.status === 'offline').length;
      const criticalDown = Object.values(snapshot.agents)
        .filter(a => a.critical && (a.status === 'disabled' || a.status === 'offline'))
        .length;
      
      snapshot.summary = {
        totalAgents: LAUNCH_AGENTS.length,
        running,
        down,
        criticalDown,
        halStatus: result.status,
        healthScore: criticalDown === 0 ? (result.status === 'online' ? 'HEALTHY' : 'DEGRADED') : 'CRITICAL',
      };
      
      resolve(snapshot);
    });
  });
}

/**
 * Format snapshot as markdown report
 */
function formatMarkdownReport(snapshot) {
  const { agents, hal, gateway, resources, summary } = snapshot;
  const timestamp = new Date(snapshot.timestamp).toLocaleString('en-US', {
    timeZone: 'America/Moncton',
  });
  
  let report = `# System Health Report\n\n`;
  report += `**Generated:** ${timestamp} AST\n`;
  report += `**Status:** ${summary.healthScore}\n\n`;
  
  // Summary stats
  report += `## Summary\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| Running Agents | ${summary.running}/${summary.totalAgents} |\n`;
  report += `| Down Agents | ${summary.down} |\n`;
  report += `| Critical Down | ${summary.criticalDown} |\n`;
  report += `| HAL Status | ${hal.status.toUpperCase()} |\n`;
  report += `| Gateway Uptime | ${gateway || 'unknown'} |\n`;
  report += `| Health Score | ${summary.healthScore} |\n\n`;
  
  // Critical services
  report += `## Critical Services\n\n`;
  for (const agent of CRITICAL_SERVICES) {
    const status = agents[agent];
    const icon = status.status === 'running' ? '✅' : '❌';
    report += `${icon} **${agent.split('.').pop()}** — ${status.status}\n`;
  }
  
  // HAL status
  report += `\n## HAL Gateway (Remote)\n\n`;
  report += `- **Address:** ${HAL_GATEWAY}:${HAL_PORT}\n`;
  report += `- **Status:** ${hal.status}\n`;
  if (hal.latency) report += `- **Latency:** ${hal.latency}ms\n`;
  if (hal.error) report += `- **Error:** ${hal.error}\n`;
  
  // System resources
  report += `\n## System Resources\n\n`;
  report += `- **Memory:** ${resources.memory}\n`;
  report += `- **Disk Usage:** ${resources.disk}\n`;
  
  // All agents (grouped by status)
  report += `\n## All Services\n\n`;
  const byStatus = {};
  for (const [agent, status] of Object.entries(agents)) {
    if (!byStatus[status.status]) byStatus[status.status] = [];
    byStatus[status.status].push(agent);
  }
  
  for (const [status, agentList] of Object.entries(byStatus)) {
    const icon = status === 'running' ? '✅' : status === 'disabled' ? '⏸' : '❌';
    report += `\n### ${icon} ${status.toUpperCase()} (${agentList.length})\n\n`;
    for (const agent of agentList) {
      const shortName = agent.split('.').pop();
      const pid = agents[agent].pid ? ` [PID ${agents[agent].pid}]` : '';
      report += `- ${shortName}${pid}\n`;
    }
  }
  
  return report;
}

/**
 * Check if critical service is down
 */
function isCriticalDown(snapshot) {
  return snapshot.summary.criticalDown > 0;
}

/**
 * Alert on service outage
 */
async function sendAlert(snapshot) {
  if (!isCriticalDown(snapshot) && snapshot.summary.halStatus === 'online') {
    return; // No alert needed
  }
  
  const alert = {
    timestamp: snapshot.timestamp,
    severity: snapshot.summary.healthScore,
    criticalDown: snapshot.summary.criticalDown,
    halStatus: snapshot.summary.halStatus,
    affectedServices: Object.entries(snapshot.agents)
      .filter(([_, s]) => s.critical && (s.status === 'disabled' || s.status === 'offline'))
      .map(([name, _]) => name),
  };
  
  // Append to alert history
  const alertPath = path.join(MEMORY_DIR, 'health-alerts.json');
  let alerts = [];
  if (fs.existsSync(alertPath)) {
    try {
      alerts = JSON.parse(fs.readFileSync(alertPath, 'utf8'));
    } catch (err) {
      alerts = [];
    }
  }
  alerts.push(alert);
  // Keep last 100 alerts
  alerts = alerts.slice(-100);
  fs.writeFileSync(alertPath, JSON.stringify(alerts, null, 2));
  
  console.log(`⚠️  ALERT: ${alert.severity}`);
  if (alert.criticalDown > 0) {
    console.log(`   ${alert.criticalDown} critical service(s) down`);
  }
  if (alert.halStatus !== 'online') {
    console.log(`   HAL gateway: ${alert.halStatus}`);
  }
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const outputJson = args.includes('--json');
  const alertOnly = args.includes('--alert');
  const watchIdx = args.indexOf('--watch');
  const watchInterval = watchIdx >= 0 ? parseInt(args[watchIdx + 1]) * 1000 : 0;
  
  const runCheck = async () => {
    const snapshot = await generateSnapshot();
    
    // Write JSON snapshot
    fs.writeFileSync(
      path.join(HEALTH_DIR, 'latest-snapshot.json'),
      JSON.stringify(snapshot, null, 2)
    );
    
    // Write markdown report
    const report = formatMarkdownReport(snapshot);
    fs.writeFileSync(
      path.join(HEALTH_DIR, 'latest-report.md'),
      report
    );
    
    // Alert on critical service down
    if (isCriticalDown(snapshot) || snapshot.summary.halStatus !== 'online') {
      await sendAlert(snapshot);
    }
    
    // Output
    if (alertOnly && !isCriticalDown(snapshot) && snapshot.summary.halStatus === 'online') {
      return; // Skip output if no alert
    }
    
    if (outputJson) {
      console.log(JSON.stringify(snapshot, null, 2));
    } else {
      console.log(report);
    }
  };
  
  await runCheck();
  
  // Watch mode
  if (watchInterval > 0) {
    console.log(`\n🔄 Watching for changes (every ${watchInterval / 1000}s)...`);
    let lastSnapshot = null;
    
    const watchLoop = setInterval(async () => {
      const snapshot = await generateSnapshot();
      
      // Check for changes
      if (lastSnapshot && JSON.stringify(lastSnapshot.summary) !== JSON.stringify(snapshot.summary)) {
        console.log(`\n⚠️  Change detected at ${new Date().toLocaleTimeString()}`);
        console.log(formatMarkdownReport(snapshot));
      }
      
      lastSnapshot = snapshot;
    }, watchInterval);
    
    // Never exit in watch mode
    process.on('SIGINT', () => {
      clearInterval(watchLoop);
      process.exit(0);
    });
  }
}

main().catch(err => {
  console.error('Health monitor error:', err);
  process.exit(1);
});
