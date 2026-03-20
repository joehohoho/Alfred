#!/usr/bin/env node
/**
 * Alfred Dashboard server — static files + credit management API.
 * Usage: node server.js [port]
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.argv[2] || '8765', 10);
const DIR = __dirname;
const CREDITS_FILE = path.join(DIR, 'credits.json');

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.css':  'text/css',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
};

function readCredits() {
  try {
    return JSON.parse(fs.readFileSync(CREDITS_FILE, 'utf8'));
  } catch {
    return { totalCredits: 0, additions: [] };
  }
}

function writeCredits(data) {
  fs.writeFileSync(CREDITS_FILE, JSON.stringify(data, null, 2) + '\n');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // ─── API: GET credits ───
  if (req.method === 'GET' && url.pathname === '/api/credits') {
    return json(res, readCredits());
  }

  // ─── API: POST /api/credits/set — set remaining balance ───
  // Reads current spent from stats.json so totalCredits = remaining + spent
  if (req.method === 'POST' && url.pathname === '/api/credits/set') {
    try {
      const body = await readBody(req);
      const remaining = parseFloat(body.amount);
      if (isNaN(remaining) || remaining < 0) return json(res, { error: 'Invalid amount' }, 400);
      // Read current spent from stats.json
      let spent = 0;
      try {
        const stats = JSON.parse(fs.readFileSync(path.join(DIR, 'stats.json'), 'utf8'));
        spent = stats.budget?.spent || stats.total?.cost || 0;
      } catch { /* default 0 */ }
      const credits = readCredits();
      credits.totalCredits = remaining + spent;
      credits.additions = [{ amount: credits.totalCredits, date: new Date().toISOString().split('T')[0], note: body.note || `Remaining set to $${remaining.toFixed(2)}` }];
      writeCredits(credits);
      return json(res, credits);
    } catch (e) {
      return json(res, { error: e.message }, 400);
    }
  }

  // ─── API: POST /api/credits/add — add credits to existing balance ───
  if (req.method === 'POST' && url.pathname === '/api/credits/add') {
    try {
      const body = await readBody(req);
      const amount = parseFloat(body.amount);
      if (isNaN(amount) || amount <= 0) return json(res, { error: 'Invalid amount' }, 400);
      const credits = readCredits();
      credits.totalCredits += amount;
      credits.additions.push({
        amount,
        date: new Date().toISOString().split('T')[0],
        note: body.note || 'Credits added',
      });
      writeCredits(credits);
      return json(res, credits);
    } catch (e) {
      return json(res, { error: e.message }, 400);
    }
  }

  // ─── API: GET /api/cron/jobs — fetch cron jobs from OpenClaw gateway ───
  if (req.method === 'GET' && url.pathname === '/api/cron/jobs') {
    try {
      // Call the cron tool via local OpenClaw gateway
      const { execSync } = require('child_process');
      const result = execSync('openclaw cron list --json', { encoding: 'utf8', timeout: 5000 });
      const data = JSON.parse(result);
      return json(res, data);
    } catch (e) {
      console.error('Failed to fetch cron jobs:', e.message);
      return json(res, { jobs: [], error: 'Failed to fetch cron jobs' }, 500);
    }
  }

  // ─── Static files ───
  let filePath = path.join(DIR, url.pathname === '/' ? 'index.html' : url.pathname);
  filePath = path.normalize(filePath);
  if (!filePath.startsWith(DIR)) { res.writeHead(403); return res.end(); }

  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`🎩 Alfred Dashboard running at http://localhost:${PORT}`);
});
