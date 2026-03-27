#!/usr/bin/env node
/**
 * health-server.js
 * 
 * Lightweight HTTP server for health dashboard.
 * Serves:
 * - GET /health — latest health snapshot (JSON)
 * - GET /health/dashboard — HTML dashboard
 * - GET /health/alerts — recent alerts
 * - GET /health/history — health trends
 * 
 * Runs on http://localhost:3099 (non-conflicting port)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const HEALTH_DIR = path.join(process.env.HOME, '.openclaw/workspace/health');
const MEMORY_DIR = path.join(process.env.HOME, '.openclaw/workspace/memory');
const PORT = 3099;

// Ensure directories exist
[HEALTH_DIR, MEMORY_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * Load latest health snapshot
 */
function loadLatestSnapshot() {
  try {
    const filepath = path.join(HEALTH_DIR, 'latest-snapshot.json');
    if (!fs.existsSync(filepath)) {
      return { error: 'No snapshot available yet. Run health-monitor.js to generate.' };
    }
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Load recent alerts
 */
function loadAlerts(limit = 20) {
  try {
    const filepath = path.join(MEMORY_DIR, 'health-alerts.json');
    if (!fs.existsSync(filepath)) {
      return [];
    }
    const alerts = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    return alerts.slice(-limit);
  } catch (err) {
    return [];
  }
}

/**
 * Load health history (last 24 hours)
 */
function loadHistory() {
  try {
    const logPath = path.join(MEMORY_DIR, 'health-monitor.log');
    if (!fs.existsSync(logPath)) {
      return [];
    }
    
    const lines = fs.readFileSync(logPath, 'utf8')
      .split('\n')
      .filter(line => line.trim())
      .slice(-100); // Last 100 entries
    
    return lines;
  } catch (err) {
    return [];
  }
}

/**
 * Load dashboard HTML
 */
function loadDashboard() {
  try {
    return fs.readFileSync(path.join(HEALTH_DIR, 'dashboard.html'), 'utf8');
  } catch (err) {
    return `<html><body><h1>Error</h1><p>Could not load dashboard: ${err.message}</p></body></html>`;
  }
}

/**
 * HTTP Request handler
 */
function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Routes
  if (pathname === '/health' || pathname === '/health/snapshot') {
    res.setHeader('Content-Type', 'application/json');
    const snapshot = loadLatestSnapshot();
    res.writeHead(200);
    res.end(JSON.stringify(snapshot, null, 2));
    
  } else if (pathname === '/health/dashboard') {
    res.setHeader('Content-Type', 'text/html');
    res.writeHead(200);
    res.end(loadDashboard());
    
  } else if (pathname === '/health/alerts') {
    res.setHeader('Content-Type', 'application/json');
    const limit = parseInt(query.limit) || 20;
    const alerts = loadAlerts(limit);
    res.writeHead(200);
    res.end(JSON.stringify(alerts, null, 2));
    
  } else if (pathname === '/health/history') {
    res.setHeader('Content-Type', 'application/json');
    const history = loadHistory();
    res.writeHead(200);
    res.end(JSON.stringify(history, null, 2));
    
  } else if (pathname === '/health/status') {
    // Simple status endpoint for monitoring
    const snapshot = loadLatestSnapshot();
    const healthScore = snapshot.summary ? snapshot.summary.healthScore : 'UNKNOWN';
    const statusCode = healthScore === 'HEALTHY' ? 200 : healthScore === 'DEGRADED' ? 503 : 500;
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: healthScore,
      timestamp: snapshot.timestamp,
      criticalDown: snapshot.summary?.criticalDown || 0,
      hal: snapshot.hal?.status || 'unknown',
    }, null, 2));
    
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Not found',
      available: [
        '/health — latest health snapshot',
        '/health/dashboard — HTML dashboard',
        '/health/alerts — recent alerts',
        '/health/history — health log',
        '/health/status — simple status check',
      ],
    }, null, 2));
  }
}

/**
 * Start server
 */
const server = http.createServer(handleRequest);

server.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ Health server listening on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/health/dashboard`);
  console.log(`📡 API: http://localhost:${PORT}/health`);
  
  // Log startup to memory
  const logPath = path.join(MEMORY_DIR, 'health-monitor.log');
  const logEntry = `[${new Date().toISOString()}] Health server started on port ${PORT}\n`;
  fs.appendFileSync(logPath, logEntry);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down health server...');
  server.close(() => {
    process.exit(0);
  });
});

// Handle errors
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});
