#!/usr/bin/env node
// hal-task-ack.js — Report task completion via Alfred's gateway bridge
// Usage: node hal-task-ack.js <task-id> <status> [result]

const http = require('http');
const taskId = process.argv[2];
const status = process.argv[3] || 'completed';
const result = process.argv.slice(4).join(' ') || '';

if (!taskId) { console.error('Usage: hal-task-ack.js <task-id> <status> [result]'); process.exit(1); }

const body = JSON.stringify({ taskId, agent: 'hal', status, result });
const req = http.request({
  hostname: '192.168.2.74', port: 3001, path: '/api/task-ack',
  method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': body.length },
  timeout: 10000,
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => { console.log(data); process.exit(res.statusCode < 400 ? 0 : 1); });
});
req.on('error', (e) => { console.error('ACK failed:', e.message); process.exit(1); });
req.on('timeout', () => { req.destroy(); console.error('ACK timeout'); process.exit(1); });
req.write(body);
req.end();
