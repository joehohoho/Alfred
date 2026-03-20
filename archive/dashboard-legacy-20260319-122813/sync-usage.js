#!/usr/bin/env node
/**
 * Aggregates OpenClaw session usage data into stats.json for the dashboard.
 * Computes today / this-week / total breakdowns per model.
 * Run: node sync-usage.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SESSIONS_DIR = path.join(process.env.HOME, '.openclaw/agents/main/sessions');
const STATS_FILE = path.join(__dirname, 'stats.json');
const CREDITS_FILE = path.join(__dirname, 'credits.json');

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDateKey(ts) { return new Date(ts).toISOString().split('T')[0]; }

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function normalizeModel(name) {
  const m = (name || '').toLowerCase();
  if (m.includes('opus'))   return 'opus';
  if (m.includes('sonnet')) return 'sonnet';
  if (m.includes('haiku'))  return 'haiku';
  if (m.includes('codex'))  return 'codex';
  if (m.includes('llama') || m.includes('ollama') || m.includes('local')) return 'local';
  return 'unknown';
}

function emptyBucket() {
  return { cost: 0, tokensIn: 0, tokensOut: 0, cacheRead: 0, cacheWrite: 0, sessions: new Set() };
}

function readCredits() {
  try {
    return JSON.parse(fs.readFileSync(CREDITS_FILE, 'utf8'));
  } catch {
    return { totalCredits: 25, additions: [] };
  }
}

// ── Parse JSONL session files ────────────────────────────────────────────────

async function parseJsonlFile(filePath) {
  const usage = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      const u = entry.usage || entry.message?.usage;
      if (u && u.cost) {
        usage.push({
          timestamp: entry.timestamp,
          model: entry.message?.model || entry.model || 'unknown',
          input: u.input || 0,
          output: u.output || 0,
          cacheRead: u.cacheRead || 0,
          cacheWrite: u.cacheWrite || 0,
          cost: u.cost.total || 0,
        });
      }
    } catch { /* skip bad lines */ }
  }
  return usage;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const files = fs.readdirSync(SESSIONS_DIR)
    .filter(f => f.endsWith('.jsonl') && !f.includes('.deleted'));

  const now = new Date();
  const todayKey = getDateKey(now);
  const weekStart = getWeekStart(now);

  // Aggregation buckets
  const total   = emptyBucket();
  const today   = emptyBucket();
  const thisWeek = emptyBucket();
  const byDate  = {};

  // Per-model buckets: { opus: { today, thisWeek, total } }
  const models = {};
  const MODEL_KEYS = ['opus', 'sonnet', 'haiku', 'codex', 'local'];
  for (const mk of MODEL_KEYS) {
    models[mk] = { today: emptyBucket(), thisWeek: emptyBucket(), total: emptyBucket() };
  }

  for (const file of files) {
    const entries = await parseJsonlFile(path.join(SESSIONS_DIR, file));
    for (const u of entries) {
      const dateKey = getDateKey(u.timestamp);
      const entryDate = new Date(u.timestamp);
      const mk = normalizeModel(u.model);

      // Total
      total.cost += u.cost;
      total.tokensIn += u.input;
      total.tokensOut += u.output;
      total.cacheRead += u.cacheRead;
      total.cacheWrite += u.cacheWrite;
      total.sessions.add(file);

      // By date (for daily average calc)
      if (!byDate[dateKey]) byDate[dateKey] = emptyBucket();
      byDate[dateKey].cost += u.cost;
      byDate[dateKey].tokensIn += u.input;
      byDate[dateKey].tokensOut += u.output;
      byDate[dateKey].sessions.add(file);

      // Today
      if (dateKey === todayKey) {
        today.cost += u.cost;
        today.tokensIn += u.input;
        today.tokensOut += u.output;
        today.sessions.add(file);
      }

      // This week (Sun–Sat)
      if (entryDate >= weekStart) {
        thisWeek.cost += u.cost;
        thisWeek.tokensIn += u.input;
        thisWeek.tokensOut += u.output;
        thisWeek.sessions.add(file);
      }

      // Per-model
      if (models[mk]) {
        // total
        models[mk].total.cost += u.cost;
        models[mk].total.tokensIn += u.input;
        models[mk].total.tokensOut += u.output;
        models[mk].total.sessions.add(file);
        // today
        if (dateKey === todayKey) {
          models[mk].today.cost += u.cost;
          models[mk].today.tokensIn += u.input;
          models[mk].today.tokensOut += u.output;
          models[mk].today.sessions.add(file);
        }
        // this week
        if (entryDate >= weekStart) {
          models[mk].thisWeek.cost += u.cost;
          models[mk].thisWeek.tokensIn += u.input;
          models[mk].thisWeek.tokensOut += u.output;
          models[mk].thisWeek.sessions.add(file);
        }
      }
    }
  }

  // ── Daily & weekly averages ──
  const dates = Object.keys(byDate);
  const numDays = dates.length || 1;
  const totalSessions = Object.values(byDate).reduce((s, d) => s + d.sessions.size, 0);

  // Weeks: count distinct ISO weeks
  const weekSet = new Set(dates.map(d => {
    const dt = new Date(d);
    const ws = getWeekStart(dt);
    return ws.toISOString().split('T')[0];
  }));
  const numWeeks = weekSet.size || 1;

  // ── Current session info ──
  let contextUsed = 0, contextMax = 200000, currentModel = 'claude-opus-4-6';
  let sessionTokensIn = 0, sessionTokensOut = 0;
  try {
    const sessions = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, 'sessions.json'), 'utf8'));
    let latest = null, latestTime = 0;
    for (const [, s] of Object.entries(sessions)) {
      if (s.updatedAt > latestTime) { latestTime = s.updatedAt; latest = s; }
    }
    if (latest) {
      contextUsed = latest.totalTokens || 0;
      contextMax = latest.contextTokens || 200000;
      currentModel = latest.model || currentModel;
      sessionTokensIn = latest.inputTokens || 0;
      sessionTokensOut = latest.outputTokens || 0;
    }
  } catch { /* ignore */ }

  // ── Credits ──
  const credits = readCredits();

  // Serialize sets → counts
  const ser = (b) => ({
    cost: b.cost,
    tokensIn: b.tokensIn,
    tokensOut: b.tokensOut,
    cacheRead: b.cacheRead,
    cacheWrite: b.cacheWrite,
    sessions: b.sessions.size,
  });
  const serLight = (b) => ({
    cost: b.cost,
    tokensIn: b.tokensIn,
    tokensOut: b.tokensOut,
    sessions: b.sessions.size,
  });

  const modelsSer = {};
  for (const mk of MODEL_KEYS) {
    modelsSer[mk] = {
      today:    serLight(models[mk].today),
      thisWeek: serLight(models[mk].thisWeek),
      total:    serLight(models[mk].total),
    };
  }

  const stats = {
    updatedAt: now.toISOString(),
    total: ser(total),
    today: serLight(today),
    thisWeek: serLight(thisWeek),
    dailyAverage: {
      cost: total.cost / numDays,
      tokens: (total.tokensIn + total.tokensOut) / numDays,
      sessions: totalSessions / numDays,
    },
    weeklyAverage: {
      cost: total.cost / numWeeks,
      tokens: (total.tokensIn + total.tokensOut) / numWeeks,
      sessions: totalSessions / numWeeks,
    },
    models: modelsSer,
    budget: {
      totalCredits: credits.totalCredits,
      spent: total.cost,
      additions: credits.additions,
    },
    pricing: {
      opus:   { inputPerMillion: 15, outputPerMillion: 75 },
      sonnet: { inputPerMillion: 3,  outputPerMillion: 15 },
      haiku:  { inputPerMillion: 0.25, outputPerMillion: 1.25 },
      codex:  { inputPerMillion: 0,  outputPerMillion: 0 },
      local:  { inputPerMillion: 0,  outputPerMillion: 0 },
    },
    session: { tokensIn: sessionTokensIn, tokensOut: sessionTokensOut },
    context: { used: contextUsed, max: contextMax },
    model: currentModel,
  };

  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  const remaining = credits.totalCredits - total.cost;
  console.log(`✅ Updated ${STATS_FILE}`);
  console.log(`   Total spent: $${total.cost.toFixed(4)}`);
  console.log(`   Credits: $${credits.totalCredits.toFixed(2)} total, $${remaining.toFixed(2)} remaining`);
  console.log(`   Today: $${today.cost.toFixed(4)}`);
  console.log(`   This week: $${thisWeek.cost.toFixed(4)}`);
  console.log(`   Days tracked: ${numDays}, Weeks: ${numWeeks}`);
}

main().catch(console.error);
