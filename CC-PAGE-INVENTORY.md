# CC-PAGE-INVENTORY

Best-effort inventory of Command Center pages, routes, and APIs.

| Page/Feature name | URL / Route | Purpose | Audience (alfred/joe/hal) | Decision it supports | Dependency (is any automation using it?) | Strategic tag | Last verified working date |
|---|---|---|---|---|---|---|---|
| Kanban Board | http://localhost:3001/ | Track task lifecycle, comments, priorities, movement across columns | alfred, joe, hal | What to work on next, review/done flow, blockers | Yes (kanban scripts, automation comments, movement) | critical | 2026-03-20 |
| Cron Job Manager | http://localhost:3001/cron (assumed route) | View cron jobs, run states, failures, enable/disable | alfred, joe | Reliability and scheduling decisions | Yes (`/api/cron` consumers, cron validators) | support | 2026-03-20 |
| Ops Health Dashboard | http://localhost:3001/ops-health (assumed route) | System health summary and operational status | alfred, joe | Incident response, risk posture | Partial (health scripts, daily checks) | support | 2026-03-20 |
| Notification/Question Center | http://localhost:3001/notifications (assumed route) | Central queue for questions/escalations to Joe | alfred, joe | Escalation and approval timing | Yes (notification scripts and workflows) | support | 2026-03-20 |
| Joe Profile Viewer | http://localhost:3001/profile/joe (if enabled) | Surface Joe preferences, working style, priorities | alfred | Framing decisions and communications | Low/indirect (profile docs drive behavior) | unknown | 2026-03-20 |
| API: /api/kanban | http://localhost:3001/api/kanban | Read/write kanban board data and card metadata | alfred, hal | Throughput, WIP, priority execution | Yes (multiple scripts) | critical | 2026-03-20 |
| API: /api/health | http://localhost:3001/api/health | Health/status API for dashboards and checks | alfred, joe | Reliability and outage detection | Yes (health checks/dashboards) | critical | 2026-03-20 |
| API: /api/cron | http://localhost:3001/api/cron | Cron inventory, statuses, and scheduling telemetry | alfred, joe | Job reliability, operational automation cadence | Yes (cron validators/scorecard) | support | 2026-03-20 |
