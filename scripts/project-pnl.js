#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data', 'project-pnl');
const OUT_FILE = path.join(ROOT, 'dashboard', 'project-pnl.json');

function readCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return [];
  const [headerLine, ...lines] = raw.split(/\r?\n/);
  const headers = headerLine.split(',').map(h => h.trim());
  return lines
    .filter(Boolean)
    .map(line => {
      const cols = line.split(',').map(c => c.trim());
      const row = {};
      headers.forEach((h, i) => (row[h] = cols[i] ?? ''));
      return row;
    });
}

function toNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function monthKey(d = new Date()) {
  return d.toISOString().slice(0, 7);
}

function sum(rows, mapper) {
  return rows.reduce((acc, row) => acc + mapper(row), 0);
}

function groupBy(rows, key) {
  return rows.reduce((acc, row) => {
    const k = row[key] || 'unassigned';
    if (!acc[k]) acc[k] = [];
    acc[k].push(row);
    return acc;
  }, {});
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function safeDiv(a, b) {
  if (!b) return 0;
  return a / b;
}

function load() {
  const projects = readCsv(path.join(DATA_DIR, 'projects.csv'));
  const time = readCsv(path.join(DATA_DIR, 'time_entries.csv'));
  const costs = readCsv(path.join(DATA_DIR, 'cost_entries.csv'));
  const revenue = readCsv(path.join(DATA_DIR, 'revenue_entries.csv'));
  const acquisition = readCsv(path.join(DATA_DIR, 'acquisition_entries.csv'));
  return { projects, time, costs, revenue, acquisition };
}

function compute() {
  const mKey = monthKey();
  const { projects, time, costs, revenue, acquisition } = load();

  const monthTime = time.filter(r => (r.date || '').startsWith(mKey));
  const monthCosts = costs.filter(r => (r.date || '').startsWith(mKey));
  const monthRevenue = revenue.filter(r => (r.date || '').startsWith(mKey));
  const monthAcq = acquisition.filter(r => (r.date || '').startsWith(mKey));

  const timeByProject = groupBy(monthTime, 'project');
  const costByProject = groupBy(monthCosts, 'project');
  const revenueByProject = groupBy(monthRevenue, 'project');
  const acqByProject = groupBy(monthAcq, 'project');

  const totalHours = sum(monthTime, r => toNumber(r.hours));
  const sharedCosts = monthCosts.filter(c => (c.project || '').toLowerCase() === 'shared');
  const sharedCostTotal = sum(sharedCosts, r => toNumber(r.amount));

  const projectMetrics = projects.map(p => {
    const project = p.project;
    const hourlyRate = toNumber(p.dev_hourly_rate, 0);
    const grossMarginPct = toNumber(p.gross_margin_pct, 80);
    const churnMonthly = toNumber(p.churn_monthly_pct, 8);

    const pTime = timeByProject[project] || [];
    const pCostRows = costByProject[project] || [];
    const pRevenueRows = revenueByProject[project] || [];
    const pAcqRows = acqByProject[project] || [];

    const hours = sum(pTime, r => toNumber(r.hours));
    const devCost = hours * hourlyRate;

    const directCosts = sum(pCostRows, r => toNumber(r.amount));
    const sharedAllocation = totalHours > 0 ? sharedCostTotal * (hours / totalHours) : 0;
    const totalCost = devCost + directCosts + sharedAllocation;

    const revenueAmount = sum(pRevenueRows, r => toNumber(r.amount));
    const customers = sum(pAcqRows, r => toNumber(r.customers));
    const acquisitionSpend = sum(pAcqRows, r => toNumber(r.spend));

    const revenuePerHour = safeDiv(revenueAmount, hours);
    const cac = safeDiv(acquisitionSpend, customers);
    const arpu = safeDiv(revenueAmount, customers);
    const margin = grossMarginPct / 100;
    const ltv = churnMonthly > 0 ? (arpu * margin) / (churnMonthly / 100) : 0;

    const burnRate = Math.max(totalCost - revenueAmount, 0);
    const netProfit = revenueAmount - totalCost;

    return {
      project,
      month: mKey,
      inputs: {
        hours: round2(hours),
        devHourlyRate: round2(hourlyRate),
        churnMonthlyPct: round2(churnMonthly),
        grossMarginPct: round2(grossMarginPct),
        newCustomers: round2(customers)
      },
      costs: {
        devTime: round2(devCost),
        direct: round2(directCosts),
        sharedAllocated: round2(sharedAllocation),
        total: round2(totalCost)
      },
      revenue: round2(revenueAmount),
      economics: {
        netProfit: round2(netProfit),
        burnRate: round2(burnRate),
        revenuePerHour: round2(revenuePerHour),
        cac: round2(cac),
        ltv: round2(ltv),
        ltvToCac: round2(safeDiv(ltv, cac))
      }
    };
  });

  const portfolio = {
    month: mKey,
    totalRevenue: round2(sum(projectMetrics, p => p.revenue)),
    totalCost: round2(sum(projectMetrics, p => p.costs.total)),
    totalProfit: round2(sum(projectMetrics, p => p.economics.netProfit)),
    totalBurnRate: round2(sum(projectMetrics, p => p.economics.burnRate)),
    generatedAt: new Date().toISOString()
  };

  return { portfolio, projects: projectMetrics };
}

function main() {
  const result = compute();
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2));
  console.log(`Wrote ${OUT_FILE}`);
}

main();
