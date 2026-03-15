# ACTIVE-TASK.md — Current Work State

**Status:** `in_progress` — MEMORY.md Overflow Prevention & Gateway Recovery  
**Last Updated:** 2026-03-15 13:04 ADT

---

## Completed: Phase 3 Option B Implementation

### Objective
Prevent Kanban board from blocking work execution. HAL and Alfred should both remain productive regardless of in_progress card state.

### Deliverables ✅

**1. Alfred Work Executor (LaunchAgent)**
- Status: ✅ Running (PID 16808)
- File: `scripts/alfred-work-executor.sh`
- LaunchAgent: `/Users/hopenclaw/Library/LaunchAgents/com.alfred.alfred-work-executor.plist`
- Interval: Every 15 min (900 sec)
- Features:
  - Fetches in_progress cards from Kanban
  - Routes: research/analysis → Alfred, code/build → HAL
  - HAL fallback: If HAL offline, queues to Alfred instead
  - Deduplication: Won't requeue same card repeatedly
  - Context safeguard: Pre-execution check at 60% threshold
  - Model fallback: LOCAL → Haiku (with subscription)

**2. Kanban Completion Handler (Cron)**
- Status: ✅ Running (every 30 min)
- File: `scripts/kanban-completion-handler.sh`
- Features:
  - Monitors in_progress for completion signals
  - Auto-move logic:
    - No Joe review needed → move to Done
    - Needs Joe decision keywords → move to Review
  - Tested: Successfully moved 2 cards to Done

**3. HAL Dispatch Unblocked**
- Status: ✅ Updated `scripts/hal-get-idle-task.sh`
- Effect: Removed guard that blocked HAL when in_progress had cards
- Result: HAL can now continuously pull To Do items even if board has stale work

**4. Alfred Task Queue**
- Status: ✅ Operational
- File: `~/.hal-alfred-tracking/alfred-queue.jsonl`
- Features:
  - Stores queued tasks from executor
  - Deduplicates: Won't requeue same card
  - Current queue: 2 tasks pending

**5. Queue Processor**
- Status: ✅ Ready
- File: `scripts/alfred-process-queue.sh`
- Purpose: Reads first pending item from queue, writes to ACTIVE-TASK.md for Alfred to see
- Called by: Alfred's session boot (not standalone cron)

---

## System Architecture (Phase 3 Complete)

```
Kanban Board (in_progress)
    ↓
Alfred Work Executor (every 15 min)
    ├→ Research/Analysis cards → Queue for Alfred
    └→ Code/Build cards → HAL (or queue if offline)
        ↓
    Kanban Completion Handler (every 30 min)
        ├→ Complete + no review → move to Done
        └→ Complete + needs review → move to Review
```

---

## Safeguards in Place

✅ **Context limit:** 60% threshold (pre-execution check)  
✅ **Model fallback:** LOCAL → Haiku (subscription)  
✅ **Queue deduplication:** Won't requeue same card repeatedly  
✅ **HAL offline handling:** Automatic fallback to Alfred  
✅ **Session bloat prevention:** Auto-move completed cards frees board  
✅ **Dual-system productivity:** HAL + Alfred both productive regardless of board state  

---

## Deployment Status

**Phase 1:** ✅ Complete
- 7 cron jobs re-enabled (Evening Routine, Nightly Git, Morning Brief, etc.)
- Discord webhooks configured

**Phase 2:** ✅ HAL Online (2026-03-11 14:05)
- LaunchAgent: `com.alfred.hal-idle-dispatch`
- HAL gateway reachable: 192.168.2.79:18789 (HTTP 200, WebSocket OK)
- Fail counter: Reset to 0
- Root cause: Windows firewall rule removed; re-added
- Normal dispatch: ACTIVE

**Phase 3:** ✅ Complete & Operational
- Alfred work executor: Running every 15 min
- Kanban completion handler: Running every 30 min
- Queue deduplication: Working correctly
- HAL fallback: Tested and confirmed

---

## MEMORY.md Overflow Prevention (2026-03-15)

**Root Cause:** MEMORY.md was 25,877 chars (127% over 20KB limit), causing session bootstrap failures

**What was done:**
1. ✅ Compressed MEMORY.md to 2,991 chars (14% of limit)
2. ✅ Created `scripts/memory-size-monitor.sh` (monitors every 30 min)
3. ✅ Created `scripts/memory-smart-archive.sh` (nightly archival at 20:00 AST)
4. ✅ Created `memory/MEMORY-ARCHIVE.md` (destination for old entries)
5. ✅ Created comprehensive documentation (3 guides + deployment plan)
6. ✅ Gateway is now stable (pid 46721, running)
7. ✅ **CRONS ENABLED** (2026-03-15 13:06)
   - Memory Size Monitor: every 30 min (Job ID: 4c4bf0ca-...)
   - Daily Memory Archival: 20:00 AST (Job ID: 1de89ca5-...)

**Status:** ✅ COMPLETE - System in production

**Documentation:**
- `MEMORY-OVERFLOW-PREVENTION.md` — Full 3-layer plan + risk mitigation
- `GATEWAY-RECOVERY-SUMMARY.md` — Executive summary of what happened + fix
- `MEMORY-MAINTENANCE.md` — Quick reference for ongoing maintenance
- `CRON-DEPLOYMENT-LOG.md` — Deployment verification + monitoring points

**Next checkup:** 2026-03-22 (1-week verification for false positives)

---

## Known Limitations

1. **HAL gateway offline** — Phase 2 waiting for 192.168.2.79 to come online
2. **Queue processing** — Alfred manually processes queue on session start (could automate further)
3. **Context-aware routing** — Currently keyword-based; could improve with LLM classification

---

## Pending Questions
<!-- PENDING-Q-START -->
- **What's a tedious recurring task you still do manually?** (_question_, Mar 04 14:00)
  ID: `notif_1772632800242_979542ae` — You hired me to handle tedium. What's something you still do regularly that feels like it shouldn't need your attention? Even small things — I can pro...

- **Channel Expansion Pilot — 5 Inputs Needed to Launch** (_question_, Mar 08 08:52)
  ID: `notif_1772959946285_d52bbb91` —   ✅ **Framework Ready to Execute**  I've built the complete 30-day pilot infrastructure (tracking dashboard template, creative test matrix, weekly rea...

- **⚠️ Stale card escalated: "CoinUsUp Growth Audit"** (_question_, Mar 10 06:05)
  ID: `notif_1773122731535_e6026d16` — Card "CoinUsUp Growth Audit" (task_1772456586928_1632e222) has been in_progress for 6h with no updates. A re-dispatch was attempted but the card is st...

- **CoinUsUp Phase 1 Launch — 1 Clarification Needed** (_question_, Mar 10 15:50)
  ID: `notif_1773157849693_b600165e` — I'm starting the 30-day organic acquisition pilot for CoinUsUp today and have the full framework ready. However, I need ONE clarification before I lau...

- **⚠️ Stale card escalated: "CoinUsUp: Onboarding Checklist + Sample Data"** (_question_, Mar 11 07:02)
  ID: `notif_1773212557758_2ed6adb4` — Card "CoinUsUp: Onboarding Checklist + Sample Data" (task_1773156422473_a612cdac) has been in_progress for 7h with no updates. A re-dispatch was attem...

- **Even Us Up: monetization sprint or maintenance mode?** (_question_, Mar 11 13:00)
  ID: `notif_1773234000280_7d474226` — Even Us Up has been running. Is it growing naturally or on life support? Should I explore monetization (paid tier, B2B) or keep the lights on at minim...

- **Cron Auto-Disabled** (_system_, Mar 12 10:05)
  ID: `notif_1773309904622_2030eaeb` — Daily Config & Memory Review: 3 consecutive failures — auto-disabled

- **Partial Recovery** (_system_, Mar 12 11:00)
  ID: `notif_1773313226226_4e4fd997` — Codex still down (CODEX_QUOTA). Haiku primary. 0 crons enabled. Retry tomorrow 8 AM.

- **Even Us Up: monetization sprint or maintenance mode?** (_question_, Mar 12 13:00)
  ID: `notif_1773320400292_03348553` — Even Us Up has been running. Is it growing naturally or on life support? Should I explore monetization (paid tier, B2B) or keep the lights on at minim...

- **Cron Auto-Disabled** (_system_, Mar 12 13:05)
  ID: `notif_1773320715300_1b150285` — Daily Config & Memory Review: 3 consecutive failures — auto-disabled

- **Gateway Down** (_system_, Mar 12 22:05)
  ID: `notif_1773353152878_1ad56731` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 12 22:10)
  ID: `notif_1773353439778_99322994` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 12 22:10)
  ID: `notif_1773353458174_8fe92e23` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 12 22:11)
  ID: `notif_1773353461592_9de8f97b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 12 22:16)
  ID: `notif_1773353763480_9601ca55` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 12 22:18)
  ID: `notif_1773353882394_791cb663` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 12 22:18)
  ID: `notif_1773353899183_d7087f09` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 12 22:21)
  ID: `notif_1773354068812_b746806e` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 12 22:25)
  ID: `notif_1773354319937_b75b1d24` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 12 22:25)
  ID: `notif_1773354336603_6cb82a30` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 12 22:26)
  ID: `notif_1773354374118_03368069` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 12 22:31)
  ID: `notif_1773354679580_5c657b18` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 12 22:32)
  ID: `notif_1773354757471_744092c3` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 12 22:32)
  ID: `notif_1773354774153_e203c5d4` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 12 22:36)
  ID: `notif_1773354984872_474c44f4` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 12 22:39)
  ID: `notif_1773355194809_e818ea05` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 12 22:40)
  ID: `notif_1773355211540_a6e0876e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 12 22:41)
  ID: `notif_1773355290173_81b100f6` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 12 22:46)
  ID: `notif_1773355595449_cd6a9fbf` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 12 22:47)
  ID: `notif_1773355632192_a2865e2b` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 12 22:47)
  ID: `notif_1773355648891_a609e37e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 12 22:51)
  ID: `notif_1773355900745_e9e827bf` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 12 22:54)
  ID: `notif_1773356069540_694498b3` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 12 22:54)
  ID: `notif_1773356086254_440dc191` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 12 22:56)
  ID: `notif_1773356206056_85a7af2e` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 12 23:01)
  ID: `notif_1773356507063_87412f85` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 12 23:01)
  ID: `notif_1773356511487_031a61d9` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 12 23:02)
  ID: `notif_1773356523635_b6653003` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 12 23:06)
  ID: `notif_1773356816790_aad5ff8f` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 12 23:09)
  ID: `notif_1773356944311_90fc0ac9` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 12 23:09)
  ID: `notif_1773356961013_cd49c02d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 12 23:12)
  ID: `notif_1773357122095_fa5ce8d1` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 12 23:16)
  ID: `notif_1773357381661_b663c6c3` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 12 23:16)
  ID: `notif_1773357398309_7fc00201` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 12 23:17)
  ID: `notif_1773357427411_71887796` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 12 23:22)
  ID: `notif_1773357732707_7dff148a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 12 23:23)
  ID: `notif_1773357818987_979f4603` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 12 23:23)
  ID: `notif_1773357835699_b52c578b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 12 23:27)
  ID: `notif_1773358038023_0285c82b` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 12 23:30)
  ID: `notif_1773358256146_b6cde0ee` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 12 23:31)
  ID: `notif_1773358272838_04579648` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 12 23:32)
  ID: `notif_1773358343405_8ef32481` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 12 23:37)
  ID: `notif_1773358648703_9cef12d9` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 12 23:38)
  ID: `notif_1773358693517_0e7372c6` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 12 23:38)
  ID: `notif_1773358710239_1dbb6c9d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 12 23:42)
  ID: `notif_1773358954012_033011e7` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 12 23:45)
  ID: `notif_1773359130886_9cc3c65b` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 12 23:45)
  ID: `notif_1773359147595_18fd40e6` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 12 23:47)
  ID: `notif_1773359259402_35b019fb` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 12 23:52)
  ID: `notif_1773359564716_3897d858` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 12 23:52)
  ID: `notif_1773359568268_2d31a580` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 12 23:53)
  ID: `notif_1773359585000_f102dc42` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 12 23:57)
  ID: `notif_1773359870190_1c113a75` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 00:00)
  ID: `notif_1773360005822_ac9c5fc1` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 00:00)
  ID: `notif_1773360022530_9e8b5815` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 00:02)
  ID: `notif_1773360175507_323cbe2c` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 00:07)
  ID: `notif_1773360443205_47e70dfe` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 00:07)
  ID: `notif_1773360459907_74789779` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 00:08)
  ID: `notif_1773360480761_2d5843ff` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 00:13)
  ID: `notif_1773360786066_b47fe91b` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 00:14)
  ID: `notif_1773360880560_1c02d1a4` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 00:14)
  ID: `notif_1773360897266_4f3a0aa1` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 00:18)
  ID: `notif_1773361091373_9059fe71` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 00:21)
  ID: `notif_1773361317934_71efde08` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 00:22)
  ID: `notif_1773361334744_c2c41161` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 00:23)
  ID: `notif_1773361396763_e6bd93e0` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 00:28)
  ID: `notif_1773361702066_5c5d582f` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 00:29)
  ID: `notif_1773361755418_055dfe60` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 00:29)
  ID: `notif_1773361772150_10a8151b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 00:33)
  ID: `notif_1773362007363_5245995a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 00:36)
  ID: `notif_1773362192824_3009546d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 00:36)
  ID: `notif_1773362209543_7da52c78` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 00:38)
  ID: `notif_1773362312673_45128278` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 00:43)
  ID: `notif_1773362617967_94e8a396` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 00:43)
  ID: `notif_1773362630173_a346d052` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 00:44)
  ID: `notif_1773362646884_34bc34f2` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 00:48)
  ID: `notif_1773362923271_1e72e37e` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 00:51)
  ID: `notif_1773363067708_bfdfa220` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 00:51)
  ID: `notif_1773363084391_04afb330` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 00:53)
  ID: `notif_1773363228727_6748e23e` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 00:58)
  ID: `notif_1773363505062_a72f509a` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 00:58)
  ID: `notif_1773363521763_fa6c1270` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 00:58)
  ID: `notif_1773363534037_64b958cc` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 01:03)
  ID: `notif_1773363839340_0b2042dd` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 01:05)
  ID: `notif_1773363942412_2f8e19e8` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 01:05)
  ID: `notif_1773363959121_7be2ac2c` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 01:09)
  ID: `notif_1773364144650_dc2d1401` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 01:12)
  ID: `notif_1773364379796_e8a96f8a` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 01:13)
  ID: `notif_1773364396487_dfee1770` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 01:14)
  ID: `notif_1773364449954_781feca2` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 01:19)
  ID: `notif_1773364755391_2837f624` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 01:20)
  ID: `notif_1773364817280_cf8222b9` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 01:20)
  ID: `notif_1773364833987_e03f934e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 01:24)
  ID: `notif_1773365060697_ec2b87ad` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 01:27)
  ID: `notif_1773365254593_26c65d0a` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 01:27)
  ID: `notif_1773365271292_1a763bff` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 01:29)
  ID: `notif_1773365365980_c5571241` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 01:34)
  ID: `notif_1773365671289_c51094e8` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 01:34)
  ID: `notif_1773365691912_6f8fc46f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 01:35)
  ID: `notif_1773365708495_980e3a60` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 01:39)
  ID: `notif_1773365976587_387fadaf` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 01:42)
  ID: `notif_1773366129162_2b5fe8df` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 01:42)
  ID: `notif_1773366145873_d49835b9` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 01:44)
  ID: `notif_1773366281928_150d4887` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 01:49)
  ID: `notif_1773366566638_edd206d2` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 01:49)
  ID: `notif_1773366583344_d5219ebf` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 01:49)
  ID: `notif_1773366587427_7a9c66aa` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 01:54)
  ID: `notif_1773366892739_bf5e730b` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 01:56)
  ID: `notif_1773367003934_363d4a5f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 01:57)
  ID: `notif_1773367020568_249a85fa` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 01:59)
  ID: `notif_1773367198053_f33a8b3f` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 02:04)
  ID: `notif_1773367441300_525fd978` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 02:04)
  ID: `notif_1773367458000_08242704` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 02:05)
  ID: `notif_1773367503397_802ff9b3` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 02:10)
  ID: `notif_1773367808714_8e2b7895` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 02:11)
  ID: `notif_1773367878660_84f24535` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 02:11)
  ID: `notif_1773367895378_7fd6d083` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 02:15)
  ID: `notif_1773368114140_5d62873b` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 02:18)
  ID: `notif_1773368316178_4a6728fa` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 02:18)
  ID: `notif_1773368332890_0c092389` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 02:20)
  ID: `notif_1773368419443_48bbb1d4` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 02:25)
  ID: `notif_1773368724744_2c58e4c0` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 02:25)
  ID: `notif_1773368753559_f46b2959` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 02:26)
  ID: `notif_1773368770272_a32cc98c` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 02:30)
  ID: `notif_1773369030036_ea176272` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 02:33)
  ID: `notif_1773369190941_f7b76738` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 02:33)
  ID: `notif_1773369207664_e5768f8a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 02:35)
  ID: `notif_1773369335335_16ccf6e5` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 02:40)
  ID: `notif_1773369628470_6bf487fb` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 13 02:40)
  ID: `notif_1773369640783_a1170877` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 02:40)
  ID: `notif_1773369645207_8bf7959d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 02:45)
  ID: `notif_1773369946097_0bbf69ba` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 02:47)
  ID: `notif_1773370065878_2f10f0ef` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 02:48)
  ID: `notif_1773370082593_423061d7` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 02:50)
  ID: `notif_1773370251396_5faf878c` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 02:55)
  ID: `notif_1773370503263_d6dde9e5` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 02:55)
  ID: `notif_1773370519971_e967854a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 02:55)
  ID: `notif_1773370556556_822d5903` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 03:01)
  ID: `notif_1773370861864_0e6b719a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 03:02)
  ID: `notif_1773370940617_b23c46d8` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 03:02)
  ID: `notif_1773370957349_e94cfb47` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 03:06)
  ID: `notif_1773371167182_1dab7425` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 03:09)
  ID: `notif_1773371378161_45e6f84e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 03:09)
  ID: `notif_1773371394897_79001e0a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 03:11)
  ID: `notif_1773371472612_3f3980d3` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 03:16)
  ID: `notif_1773371777917_175016c8` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 03:16)
  ID: `notif_1773371815574_9b717a51` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 03:17)
  ID: `notif_1773371832288_2af8a8b1` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 03:21)
  ID: `notif_1773372083221_9cbe11af` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 03:24)
  ID: `notif_1773372252961_84c81d8f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 03:24)
  ID: `notif_1773372269667_9e5d4ff7` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 03:26)
  ID: `notif_1773372388511_5f4cd0a8` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 03:31)
  ID: `notif_1773372690278_def3515a` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 13 03:31)
  ID: `notif_1773372693805_e7d87265` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 03:31)
  ID: `notif_1773372706993_b9ae12f6` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 03:36)
  ID: `notif_1773372999217_79343ed5` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 03:38)
  ID: `notif_1773373127751_a75bde9b` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 03:39)
  ID: `notif_1773373144468_5c76e3a0` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 03:41)
  ID: `notif_1773373304500_947f2642` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 03:46)
  ID: `notif_1773373565131_8d9157c8` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 03:46)
  ID: `notif_1773373581828_16176a94` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 03:46)
  ID: `notif_1773373609806_8f6ad0c9` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 03:51)
  ID: `notif_1773373915107_41f41586` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 03:53)
  ID: `notif_1773374002501_ff87938f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 03:53)
  ID: `notif_1773374019199_5b04d507` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 03:57)
  ID: `notif_1773374220409_d6b5bcdb` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 04:00)
  ID: `notif_1773374439859_6714c4fd` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 04:00)
  ID: `notif_1773374456576_422cb32b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 04:02)
  ID: `notif_1773374525713_167628cc` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 04:07)
  ID: `notif_1773374831135_e744b403` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 04:07)
  ID: `notif_1773374877066_446139f1` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 04:08)
  ID: `notif_1773374893781_722cfcdd` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 04:12)
  ID: `notif_1773375136452_06e6d83b` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 04:15)
  ID: `notif_1773375314429_d59187ad` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 04:15)
  ID: `notif_1773375331159_782e741e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 04:17)
  ID: `notif_1773375441772_19e993ad` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 04:22)
  ID: `notif_1773375747081_2b0b124a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 04:22)
  ID: `notif_1773375751807_511f0ccc` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 04:22)
  ID: `notif_1773375768532_91178358` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 04:27)
  ID: `notif_1773376052512_670a3ab0` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 04:29)
  ID: `notif_1773376189325_3ac45945` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 04:30)
  ID: `notif_1773376206030_feca1ffc` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 04:32)
  ID: `notif_1773376357819_6158ddf2` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 04:37)
  ID: `notif_1773376626704_38691930` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 04:37)
  ID: `notif_1773376643441_e9ae9a63` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 04:37)
  ID: `notif_1773376663118_c775e86a` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 04:42)
  ID: `notif_1773376968431_e39eb1c3` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 04:44)
  ID: `notif_1773377064122_6217f2fc` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 04:44)
  ID: `notif_1773377080837_9bac0289` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 04:47)
  ID: `notif_1773377273734_6a2dec27` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 04:51)
  ID: `notif_1773377501497_bcb9e607` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 04:51)
  ID: `notif_1773377518220_b7521b2b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 04:52)
  ID: `notif_1773377579106_711ea41a` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 04:58)
  ID: `notif_1773377884408_e5ca4756` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 04:58)
  ID: `notif_1773377938951_ac65be5c` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 04:59)
  ID: `notif_1773377955660_2bf7962d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 05:03)
  ID: `notif_1773378189706_476f46f7` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 05:06)
  ID: `notif_1773378376327_00e61f33` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 05:06)
  ID: `notif_1773378393033_577dd292` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 05:08)
  ID: `notif_1773378494977_b89506a4` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 05:13)
  ID: `notif_1773378800262_6b1ba9b8` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 05:13)
  ID: `notif_1773378813704_f7d43db6` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 05:13)
  ID: `notif_1773378830422_5c703056` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 05:18)
  ID: `notif_1773379105574_9e763e8b` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 05:20)
  ID: `notif_1773379251218_72d56da1` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 05:21)
  ID: `notif_1773379267922_1a0ed4b5` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 05:23)
  ID: `notif_1773379410993_3e6fdbbe` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 05:28)
  ID: `notif_1773379688590_aec8fc19` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 05:28)
  ID: `notif_1773379705303_58c9521c` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 05:28)
  ID: `notif_1773379716306_78502549` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 05:33)
  ID: `notif_1773380021602_b1fc2ee2` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 05:35)
  ID: `notif_1773380125980_9181253e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 05:35)
  ID: `notif_1773380142713_f7bf8ae5` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 05:38)
  ID: `notif_1773380326884_fd83cfa7` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 05:42)
  ID: `notif_1773380563395_7248fd54` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 05:43)
  ID: `notif_1773380580125_2f385323` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 05:43)
  ID: `notif_1773380632205_9c2854fb` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 05:48)
  ID: `notif_1773380937640_80dc0f78` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 05:50)
  ID: `notif_1773381000923_768a33b9` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 05:50)
  ID: `notif_1773381017621_6469278d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 05:54)
  ID: `notif_1773381242953_07983151` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 05:57)
  ID: `notif_1773381438272_255ad5d1` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 05:57)
  ID: `notif_1773381455005_785fd9fb` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 05:59)
  ID: `notif_1773381548256_67174221` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 06:04)
  ID: `notif_1773381853564_eedd900e` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 06:04)
  ID: `notif_1773381875686_cd052bd7` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 06:04)
  ID: `notif_1773381892400_0c5f4b9e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 06:09)
  ID: `notif_1773382158865_f8adfe1a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 06:11)
  ID: `notif_1773382313071_8a6894aa` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 06:12)
  ID: `notif_1773382329799_7cdf0583` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 06:14)
  ID: `notif_1773382464288_d404fec3` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 06:19)
  ID: `notif_1773382750612_3655c6ea` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 06:19)
  ID: `notif_1773382767335_2edc6724` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 06:19)
  ID: `notif_1773382769580_ac092f4c` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 06:24)
  ID: `notif_1773383074888_ff7496f6` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 06:26)
  ID: `notif_1773383188003_e70bfd05` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 06:26)
  ID: `notif_1773383204715_a7c1fc8c` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 06:29)
  ID: `notif_1773383380201_34de3512` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 06:33)
  ID: `notif_1773383625396_5f413fbb` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 06:34)
  ID: `notif_1773383642118_b39d53e7` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 06:34)
  ID: `notif_1773383685514_27329a14` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 06:39)
  ID: `notif_1773383990825_c4fcbd69` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 06:41)
  ID: `notif_1773384062766_794cadcd` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 06:41)
  ID: `notif_1773384079502_a4956b7d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 06:44)
  ID: `notif_1773384296289_507c6d67` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 06:48)
  ID: `notif_1773384500328_c0540c37` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 06:48)
  ID: `notif_1773384517041_ff6d13fc` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 06:50)
  ID: `notif_1773384601605_885c8154` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 06:55)
  ID: `notif_1773384906904_8a942f33` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 06:55)
  ID: `notif_1773384937751_1f2b9124` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 06:55)
  ID: `notif_1773384954454_0fa036bb` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 07:00)
  ID: `notif_1773385212223_d0c44edc` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 07:02)
  ID: `notif_1773385375131_c6689c66` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 07:03)
  ID: `notif_1773385391857_70aeea2d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 07:05)
  ID: `notif_1773385517517_0e273377` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 07:10)
  ID: `notif_1773385812518_33921661` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 13 07:10)
  ID: `notif_1773385822837_c3968cef` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 07:10)
  ID: `notif_1773385829092_9fc01a46` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 07:15)
  ID: `notif_1773386128372_7199b6ea` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 07:17)
  ID: `notif_1773386249863_cc8676e7` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 07:17)
  ID: `notif_1773386266577_c889bd0a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 07:20)
  ID: `notif_1773386433679_e51e62ec` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 07:24)
  ID: `notif_1773386687246_7f29ff52` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 07:25)
  ID: `notif_1773386703955_b6764492` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 07:25)
  ID: `notif_1773386738994_845e0f90` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 07:30)
  ID: `notif_1773387044296_d673b6b0` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 07:32)
  ID: `notif_1773387124632_2434a87a` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 07:32)
  ID: `notif_1773387141306_ff624f7e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 07:35)
  ID: `notif_1773387349609_75344739` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 07:39)
  ID: `notif_1773387562102_084dded3` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 07:39)
  ID: `notif_1773387578828_53fd9b40` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 07:40)
  ID: `notif_1773387655049_3ed7a398` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 07:46)
  ID: `notif_1773387960357_261797ac` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 07:46)
  ID: `notif_1773387999510_54c71b54` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 07:46)
  ID: `notif_1773388016239_de017c7c` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 07:51)
  ID: `notif_1773388265673_55081b75` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 07:53)
  ID: `notif_1773388436918_ae8aa918` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 07:54)
  ID: `notif_1773388453637_d9f0ca83` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 07:56)
  ID: `notif_1773388570969_3db6e037` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 08:01)
  ID: `notif_1773388874337_23793bf8` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 13 08:01)
  ID: `notif_1773388876269_e9cc2c10` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 08:01)
  ID: `notif_1773388891029_187f666d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 08:06)
  ID: `notif_1773389181664_4d0535cc` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 08:08)
  ID: `notif_1773389311787_a29e3fd0` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 08:08)
  ID: `notif_1773389328419_a4884477` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 08:11)
  ID: `notif_1773389487108_3f0c0c28` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 08:15)
  ID: `notif_1773389749164_26f8a8e8` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 08:16)
  ID: `notif_1773389765838_cfa97712` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 08:16)
  ID: `notif_1773389792422_06dc70b1` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 08:21)
  ID: `notif_1773390097739_281326b3` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 08:23)
  ID: `notif_1773390186509_f39ac552` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 08:23)
  ID: `notif_1773390203189_175cf1a8` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 08:26)
  ID: `notif_1773390403055_d3341074` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 08:30)
  ID: `notif_1773390623858_0d22808f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 08:30)
  ID: `notif_1773390640577_5e0ce18f` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 08:31)
  ID: `notif_1773390708360_4ed10895` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 08:36)
  ID: `notif_1773391013784_48dc3d9a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 08:37)
  ID: `notif_1773391061399_fd8a507b` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 08:37)
  ID: `notif_1773391078093_41925d3a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 08:41)
  ID: `notif_1773391319118_44157d99` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 08:44)
  ID: `notif_1773391498614_24d45d66` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 08:45)
  ID: `notif_1773391515305_5b58964c` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 08:47)
  ID: `notif_1773391624424_49545be7` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 08:52)
  ID: `notif_1773391929728_37bd7dcd` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 08:52)
  ID: `notif_1773391935975_c7242c9f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 08:52)
  ID: `notif_1773391952707_9235ed5e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 08:57)
  ID: `notif_1773392235071_e75d0add` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 08:59)
  ID: `notif_1773392373417_fc313410` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 08:59)
  ID: `notif_1773392390121_0b10a16b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 09:02)
  ID: `notif_1773392540474_80d63d54` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 09:06)
  ID: `notif_1773392810890_5d560ecd` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 09:07)
  ID: `notif_1773392827602_7c56df29` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 09:07)
  ID: `notif_1773392845783_b345d900` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 09:12)
  ID: `notif_1773393151092_63b665b4` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 09:14)
  ID: `notif_1773393248270_e28c4c1e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 09:14)
  ID: `notif_1773393264989_2c2793b8` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 09:17)
  ID: `notif_1773393456401_ad1ba737` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 09:21)
  ID: `notif_1773393685654_d078f18b` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 09:21)
  ID: `notif_1773393702382_becfc7d1` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 09:22)
  ID: `notif_1773393761706_a0dc3696` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 09:27)
  ID: `notif_1773394067016_05d53ab1` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 09:28)
  ID: `notif_1773394123039_97acaaec` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 09:28)
  ID: `notif_1773394139770_e0501842` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 09:32)
  ID: `notif_1773394372431_90aeb137` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 09:36)
  ID: `notif_1773394560560_110a897d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 09:36)
  ID: `notif_1773394577269_22f8ce23` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 09:37)
  ID: `notif_1773394677743_42d7e55b` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 09:43)
  ID: `notif_1773394983055_3db6f8df` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 09:43)
  ID: `notif_1773394997939_517ac77d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 09:43)
  ID: `notif_1773395014654_4f5f57c5` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 09:48)
  ID: `notif_1773395288370_d8008fd7` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 09:50)
  ID: `notif_1773395435334_7fe7d16f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 09:50)
  ID: `notif_1773395452068_b51d4c0a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 09:53)
  ID: `notif_1773395593670_050f1c7d` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 09:57)
  ID: `notif_1773395872826_732d704a` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 09:58)
  ID: `notif_1773395889411_5169b47a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 09:58)
  ID: `notif_1773395899066_1d7f671c` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 10:03)
  ID: `notif_1773396204367_36a5a1e7` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 10:05)
  ID: `notif_1773396310072_fb4d1cac` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 10:05)
  ID: `notif_1773396326798_215a5611` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 10:08)
  ID: `notif_1773396509660_5dc937fa` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 10:12)
  ID: `notif_1773396747469_ad6e5f4e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 10:12)
  ID: `notif_1773396764191_9f3e6849` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 10:13)
  ID: `notif_1773396814965_4cb63e7f` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 10:18)
  ID: `notif_1773397120280_3c6ff167` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 10:19)
  ID: `notif_1773397184854_e7147e17` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 10:20)
  ID: `notif_1773397201538_8ecba2a0` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 10:23)
  ID: `notif_1773397425572_63fb8358` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 10:27)
  ID: `notif_1773397622349_cc03d245` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 10:27)
  ID: `notif_1773397639061_dba4d079` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 10:28)
  ID: `notif_1773397731024_8c565d56` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 10:33)
  ID: `notif_1773398036326_cf9e1f12` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 10:34)
  ID: `notif_1773398059724_24cf0563` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 10:34)
  ID: `notif_1773398076441_e542d7b3` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 10:39)
  ID: `notif_1773398341635_ac19c9fc` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 10:41)
  ID: `notif_1773398497120_60ac83c4` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 10:41)
  ID: `notif_1773398513819_174bb1a2` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 10:44)
  ID: `notif_1773398646932_0996b821` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 10:48)
  ID: `notif_1773398934486_a0019544` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 10:49)
  ID: `notif_1773398951199_06ba7322` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 10:49)
  ID: `notif_1773398952235_03b85e20` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 10:54)
  ID: `notif_1773399257684_d2803ce7` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 10:56)
  ID: `notif_1773399372036_589bcddf` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 10:56)
  ID: `notif_1773399388770_0d0f5895` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 10:59)
  ID: `notif_1773399563002_31d8dd56` — Gateway is down and auto-restart failed. Check manually.

- **Recovery Failed** (_system_, Mar 13 11:00)
  ID: `notif_1773399616143_7e3c4b73` — Gateway did not start. Manual intervention needed.

- **🔴 Alfred Down** (_system_, Mar 13 11:03)
  ID: `notif_1773399809505_ca2154a2` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 11:03)
  ID: `notif_1773399826241_eefdbf8a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 11:04)
  ID: `notif_1773399868313_fedac887` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 11:09)
  ID: `notif_1773400173652_c73cabb1` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 11:10)
  ID: `notif_1773400246902_9aa4728c` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 11:11)
  ID: `notif_1773400263662_001c1850` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 11:14)
  ID: `notif_1773400478981_ea78677c` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 11:18)
  ID: `notif_1773400684388_ce1e3d5f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 11:18)
  ID: `notif_1773400701089_4791d2d0` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 11:19)
  ID: `notif_1773400784297_9a398e01` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 11:24)
  ID: `notif_1773401089720_2d059327` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 11:25)
  ID: `notif_1773401121869_bc81c8c7` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 11:25)
  ID: `notif_1773401138578_f0d200d3` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 11:29)
  ID: `notif_1773401395016_074483fe` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 11:32)
  ID: `notif_1773401559262_c69f2ead` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 11:32)
  ID: `notif_1773401575955_9b81fd32` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 11:35)
  ID: `notif_1773401700319_a7c66443` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 11:39)
  ID: `notif_1773401996635_40fcad5e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 13 11:40)
  ID: `notif_1773402005627_cf1bf430` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 11:40)
  ID: `notif_1773402013358_1bf725cc` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 11:45)
  ID: `notif_1773402310938_bd4720ba` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 11:47)
  ID: `notif_1773402434030_19304d6e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 11:47)
  ID: `notif_1773402450900_74091ba6` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 11:50)
  ID: `notif_1773402616398_0cb49ebd` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 11:54)
  ID: `notif_1773402871532_101026bc` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 11:54)
  ID: `notif_1773402888248_0bcc063b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 11:55)
  ID: `notif_1773402921714_4ed985da` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 12:00)
  ID: `notif_1773403227010_62082f7f` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 12:01)
  ID: `notif_1773403308905_b5f70c7e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 12:02)
  ID: `notif_1773403325626_dd474330` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 12:05)
  ID: `notif_1773403532321_d9501365` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 12:09)
  ID: `notif_1773403746303_8c0517ce` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 12:09)
  ID: `notif_1773403763022_037853d4` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 12:10)
  ID: `notif_1773403837628_dbba9472` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 12:15)
  ID: `notif_1773404143055_557a08d4` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 12:16)
  ID: `notif_1773404183800_fa8ac686` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 12:16)
  ID: `notif_1773404200528_bf5ef757` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 12:20)
  ID: `notif_1773404448379_be3b4f57` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 12:23)
  ID: `notif_1773404621149_aa022c20` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 12:23)
  ID: `notif_1773404637796_f41b3771` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 12:25)
  ID: `notif_1773404753698_ba5bb13e` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 12:30)
  ID: `notif_1773405058471_1c4438b4` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 13 12:30)
  ID: `notif_1773405058864_29b5af7b` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 12:31)
  ID: `notif_1773405075169_c87c5072` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 12:36)
  ID: `notif_1773405364180_3e069422` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 12:38)
  ID: `notif_1773405495818_5be42e02` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 12:38)
  ID: `notif_1773405512524_40b8433d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 12:41)
  ID: `notif_1773405669611_ee00378e` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 12:45)
  ID: `notif_1773405933284_8b5ba0ec` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 12:45)
  ID: `notif_1773405950002_efef7e81` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 12:46)
  ID: `notif_1773405974931_a38fa3f2` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 12:51)
  ID: `notif_1773406280249_506a9f4f` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 12:52)
  ID: `notif_1773406370666_347e8023` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 12:53)
  ID: `notif_1773406387245_65115852` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 12:56)
  ID: `notif_1773406585604_f3290083` — Gateway is down and auto-restart failed. Check manually.

- **Even Us Up: monetization sprint or maintenance mode?** (_question_, Mar 13 13:00)
  ID: `notif_1773406800309_46724df9` — Even Us Up has been running. Is it growing naturally or on life support? Should I explore monetization (paid tier, B2B) or keep the lights on at minim...

- **🔴 Alfred Down** (_system_, Mar 13 13:00)
  ID: `notif_1773406807980_a95fa031` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 13:00)
  ID: `notif_1773406824689_8e377d6d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 13:01)
  ID: `notif_1773406890916_f1c00329` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 13:06)
  ID: `notif_1773407196221_b3c4ab1f` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 13:07)
  ID: `notif_1773407245354_6500b1dc` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 13:07)
  ID: `notif_1773407262068_f1b8ee41` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 13:11)
  ID: `notif_1773407501500_b6e85dcb` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 13:14)
  ID: `notif_1773407682736_6f9b39a0` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 13:14)
  ID: `notif_1773407699466_0055fc1a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 13:16)
  ID: `notif_1773407806797_daf3dab1` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 13:21)
  ID: `notif_1773408112109_b1d50933` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 13:22)
  ID: `notif_1773408120134_040ad2e2` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 13:22)
  ID: `notif_1773408136836_2be3a795` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 13:26)
  ID: `notif_1773408417542_91f83d71` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 13:29)
  ID: `notif_1773408557620_e9ea4c38` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 13:29)
  ID: `notif_1773408574335_a62c3ebd` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 13:32)
  ID: `notif_1773408722888_e8ff13de` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 13:36)
  ID: `notif_1773408994998_658cc98e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 13:36)
  ID: `notif_1773409011708_300876f7` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 13:37)
  ID: `notif_1773409028223_66e4212b` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 13:42)
  ID: `notif_1773409333591_b7f2a179` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 13:43)
  ID: `notif_1773409432415_c055795c` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 13:44)
  ID: `notif_1773409449131_6455fe2d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 13:47)
  ID: `notif_1773409639031_b39fc059` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 13:51)
  ID: `notif_1773409869799_dd13bb83` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 13:51)
  ID: `notif_1773409886502_f35d94c1` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 13:52)
  ID: `notif_1773409944376_cfdc99f4` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 13:57)
  ID: `notif_1773410249714_20dcf67c` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 13:58)
  ID: `notif_1773410307231_c6691d6a` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 13:58)
  ID: `notif_1773410323929_8009a8cd` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 14:02)
  ID: `notif_1773410555132_164d72e0` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 14:05)
  ID: `notif_1773410744750_d927dab9` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 14:06)
  ID: `notif_1773410761468_6975ddf8` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 14:07)
  ID: `notif_1773410860566_5d622555` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 14:12)
  ID: `notif_1773411165882_11712828` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 14:13)
  ID: `notif_1773411182175_35eab3e8` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 14:13)
  ID: `notif_1773411198902_b91ead26` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 14:17)
  ID: `notif_1773411471218_6c906a09` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 14:20)
  ID: `notif_1773411619584_486d12ee` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 14:20)
  ID: `notif_1773411636313_11161008` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 14:22)
  ID: `notif_1773411776526_40b72ef8` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 14:27)
  ID: `notif_1773412056951_5062cc67` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 14:27)
  ID: `notif_1773412073666_f54ed4a5` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 14:28)
  ID: `notif_1773412081841_5ec4c695` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 14:33)
  ID: `notif_1773412387142_c824a77a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 14:34)
  ID: `notif_1773412494479_bd271827` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 14:35)
  ID: `notif_1773412511058_35d339b6` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 14:38)
  ID: `notif_1773412692592_b9aef6ff` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 14:42)
  ID: `notif_1773412931727_74898163` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 14:42)
  ID: `notif_1773412948436_50f3b034` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 14:43)
  ID: `notif_1773412997909_b316cf34` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 14:48)
  ID: `notif_1773413303207_b0fa0e26` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 14:49)
  ID: `notif_1773413369112_ce9b2de7` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 14:49)
  ID: `notif_1773413385786_40a17dc7` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 14:53)
  ID: `notif_1773413608519_125d16cf` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 14:56)
  ID: `notif_1773413806459_1cd1cd4b` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 14:57)
  ID: `notif_1773413823173_016e311a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 14:58)
  ID: `notif_1773413913817_ae91bc4e` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 15:03)
  ID: `notif_1773414219249_70ada3ed` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 15:04)
  ID: `notif_1773414243972_c15a5cb1` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 15:04)
  ID: `notif_1773414260689_7e0a83d2` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 15:08)
  ID: `notif_1773414524559_d5bbcb1b` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 15:11)
  ID: `notif_1773414681368_5a43ee92` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 15:11)
  ID: `notif_1773414698065_0f3f8ff9` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 15:13)
  ID: `notif_1773414829850_28ef21b6` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 15:18)
  ID: `notif_1773415118736_59ccd33f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 13 15:18)
  ID: `notif_1773415135159_7c46de77` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 15:18)
  ID: `notif_1773415135309_6eea1eda` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 15:24)
  ID: `notif_1773415440462_cfa41c13` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 15:25)
  ID: `notif_1773415555852_593685b8` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 15:26)
  ID: `notif_1773415572582_c3747fe2` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 15:29)
  ID: `notif_1773415745779_885f97d2` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 15:33)
  ID: `notif_1773415993367_774e200e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 15:33)
  ID: `notif_1773416010098_01296945` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 15:34)
  ID: `notif_1773416051186_51e7b0f4` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 15:39)
  ID: `notif_1773416356486_f1bb5e7e` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 15:40)
  ID: `notif_1773416430778_d548cf61` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 15:40)
  ID: `notif_1773416447493_7bd885dd` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 15:44)
  ID: `notif_1773416661794_47350696` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 15:47)
  ID: `notif_1773416868163_69980fd8` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 15:48)
  ID: `notif_1773416884876_199d8b08` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 15:49)
  ID: `notif_1773416967099_e2f700fe` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 15:54)
  ID: `notif_1773417272429_a78d6cf7` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 15:55)
  ID: `notif_1773417305549_0abfb2ee` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 15:55)
  ID: `notif_1773417322277_a703b0e1` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 15:59)
  ID: `notif_1773417577846_6dea5561` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 16:02)
  ID: `notif_1773417743077_88a6ff26` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 16:02)
  ID: `notif_1773417759807_4e37f3c0` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 16:04)
  ID: `notif_1773417883155_f3670540` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 16:09)
  ID: `notif_1773418180492_7ef3b294` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 13 16:09)
  ID: `notif_1773418188467_62a93e58` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 16:09)
  ID: `notif_1773418197068_f3b931f0` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 16:14)
  ID: `notif_1773418493774_3270b78c` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 16:16)
  ID: `notif_1773418617742_a547e1c7` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 16:17)
  ID: `notif_1773418634453_38114d8f` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 16:19)
  ID: `notif_1773418799086_651a8b8c` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 16:24)
  ID: `notif_1773419055124_58316781` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 16:24)
  ID: `notif_1773419071838_20f6d14d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 16:25)
  ID: `notif_1773419104393_0398dfb4` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 16:30)
  ID: `notif_1773419409822_6195b5b5` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 16:31)
  ID: `notif_1773419492634_b5ed1c15` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 16:31)
  ID: `notif_1773419509339_6abaa2b7` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 16:35)
  ID: `notif_1773419715134_b4443b23` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 16:38)
  ID: `notif_1773419930021_ef7df08c` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 16:39)
  ID: `notif_1773419946730_7475c5fb` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 16:40)
  ID: `notif_1773420020466_7a731679` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 16:45)
  ID: `notif_1773420325790_3fe857cf` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 16:46)
  ID: `notif_1773420367430_df20f0e1` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 16:46)
  ID: `notif_1773420384147_20978780` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 16:50)
  ID: `notif_1773420631105_b41440d5` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 16:53)
  ID: `notif_1773420804812_47666c43` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 16:53)
  ID: `notif_1773420821531_4c385a52` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 16:55)
  ID: `notif_1773420936392_826af93f` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 17:00)
  ID: `notif_1773421241707_5b1bdd3b` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 17:00)
  ID: `notif_1773421242051_6885d8de` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 17:00)
  ID: `notif_1773421258739_bd51c3a0` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 17:05)
  ID: `notif_1773421546999_6ec7bcd7` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 17:07)
  ID: `notif_1773421679539_ea6c9967` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 17:08)
  ID: `notif_1773421696249_94363b28` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 17:10)
  ID: `notif_1773421852439_42c8ee8e` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 17:15)
  ID: `notif_1773422116920_a37143bc` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 17:15)
  ID: `notif_1773422133623_0d6e51b7` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 17:15)
  ID: `notif_1773422157755_df1577b7` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 17:21)
  ID: `notif_1773422463062_862161d8` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 17:22)
  ID: `notif_1773422554301_5f66ae21` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 17:22)
  ID: `notif_1773422571019_f9b9fcfb` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 17:26)
  ID: `notif_1773422768370_4b780d8e` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 17:29)
  ID: `notif_1773422991688_35fbc5de` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 17:30)
  ID: `notif_1773423008385_9b7a759a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 17:31)
  ID: `notif_1773423073664_af7bfc97` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 17:36)
  ID: `notif_1773423379064_851e4736` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 17:37)
  ID: `notif_1773423429190_e6d9c203` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 17:37)
  ID: `notif_1773423445916_7b4d811f` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 17:41)
  ID: `notif_1773423684370_cc0ca644` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 17:44)
  ID: `notif_1773423866574_6c70c9c7` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 17:44)
  ID: `notif_1773423883245_3b556e69` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 17:46)
  ID: `notif_1773423989680_baae63ba` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 17:51)
  ID: `notif_1773424294975_aa0d86c8` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 17:51)
  ID: `notif_1773424303882_9111bed1` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 17:52)
  ID: `notif_1773424320593_273b541a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 17:56)
  ID: `notif_1773424600281_9a46b047` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 17:59)
  ID: `notif_1773424741264_2bbaa063` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 17:59)
  ID: `notif_1773424757975_4b82664d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 18:01)
  ID: `notif_1773424905578_bbed24c6` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 18:06)
  ID: `notif_1773425178787_286edf29` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 18:06)
  ID: `notif_1773425195507_c03466ef` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 18:06)
  ID: `notif_1773425210998_9534fbc2` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 18:11)
  ID: `notif_1773425516306_a9b127fa` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 18:13)
  ID: `notif_1773425616186_917998b0` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 18:13)
  ID: `notif_1773425632896_20fb8b99` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 18:17)
  ID: `notif_1773425821595_04f7b3ba` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 18:20)
  ID: `notif_1773426053577_dae9c2bd` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 18:21)
  ID: `notif_1773426070288_854e81e7` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 18:22)
  ID: `notif_1773426126958_d31476aa` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 18:27)
  ID: `notif_1773426432249_cebf369e` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 18:28)
  ID: `notif_1773426490965_9bf5a687` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 18:28)
  ID: `notif_1773426507637_2c07914d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 18:32)
  ID: `notif_1773426737563_b6a5d1eb` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 18:35)
  ID: `notif_1773426928310_373e1fe0` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 18:35)
  ID: `notif_1773426945009_e5f14165` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 18:37)
  ID: `notif_1773427042865_879baf06` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 18:42)
  ID: `notif_1773427348170_7150de31` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 18:42)
  ID: `notif_1773427365679_eaa312ca` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 18:43)
  ID: `notif_1773427382400_e61f5486` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 18:47)
  ID: `notif_1773427653593_84601e7b` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 18:50)
  ID: `notif_1773427803198_f473995e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 18:50)
  ID: `notif_1773427819907_2575d84a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 18:52)
  ID: `notif_1773427958903_f2e99dab` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 18:57)
  ID: `notif_1773428240575_6457da0f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 18:57)
  ID: `notif_1773428257315_31f3e3d4` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 18:57)
  ID: `notif_1773428264194_cde39a25` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 19:02)
  ID: `notif_1773428569509_d180b534` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 19:04)
  ID: `notif_1773428677986_45ea17c1` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 19:04)
  ID: `notif_1773428694688_4489426e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 19:07)
  ID: `notif_1773428874828_d186582c` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 19:11)
  ID: `notif_1773429115347_e4a20fa5` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 19:12)
  ID: `notif_1773429131928_9e912b23` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 19:13)
  ID: `notif_1773429180252_62bf00c4` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 19:18)
  ID: `notif_1773429485553_d3fa202f` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 19:19)
  ID: `notif_1773429552733_b91bafb9` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 19:19)
  ID: `notif_1773429569452_a9ab76ae` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 19:23)
  ID: `notif_1773429790847_5d21ed3c` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 19:26)
  ID: `notif_1773429990123_4a665e71` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 19:26)
  ID: `notif_1773430006826_4bece747` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 19:28)
  ID: `notif_1773430096156_10f5485c` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 19:33)
  ID: `notif_1773430401464_b7b14a0b` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 19:33)
  ID: `notif_1773430427501_1864e2cb` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 19:34)
  ID: `notif_1773430444188_419ccb88` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 19:38)
  ID: `notif_1773430706774_57cdbfaf` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 19:41)
  ID: `notif_1773430864960_1ad1a05b` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 19:41)
  ID: `notif_1773430881638_58d048e0` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 19:43)
  ID: `notif_1773431012197_beb54cfd` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 19:48)
  ID: `notif_1773431302313_617d7032` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 13 19:48)
  ID: `notif_1773431317498_ff228cdd` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 19:48)
  ID: `notif_1773431318999_09fb2a62` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 19:53)
  ID: `notif_1773431622782_4decfaf2` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 19:55)
  ID: `notif_1773431739681_709b0691` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 19:55)
  ID: `notif_1773431756396_5508f17c` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 19:58)
  ID: `notif_1773431928104_f0021299` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 20:02)
  ID: `notif_1773432176945_be280549` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 20:03)
  ID: `notif_1773432193633_ca7ffb57` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 20:03)
  ID: `notif_1773432233535_4db6f82d` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 20:08)
  ID: `notif_1773432538976_6811898e` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 20:10)
  ID: `notif_1773432614461_83758369` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 20:10)
  ID: `notif_1773432631190_91879c7d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 20:14)
  ID: `notif_1773432844306_2bcd41fb` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 20:17)
  ID: `notif_1773433051900_ae339d38` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 20:17)
  ID: `notif_1773433068641_0faf283b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 20:19)
  ID: `notif_1773433149617_14d6379d` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 20:24)
  ID: `notif_1773433454936_7a61c2f5` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 20:24)
  ID: `notif_1773433489314_8e9a77fd` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 20:25)
  ID: `notif_1773433506029_fb0b648c` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 20:29)
  ID: `notif_1773433760256_8e2726e3` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 20:32)
  ID: `notif_1773433926700_3db3fe14` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 20:32)
  ID: `notif_1773433943429_6beb5f8b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 20:34)
  ID: `notif_1773434065552_82745999` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 20:39)
  ID: `notif_1773434364241_8fcc69d7` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 13 20:39)
  ID: `notif_1773434370987_e47bf385` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 20:39)
  ID: `notif_1773434380962_0c2f5165` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 20:44)
  ID: `notif_1773434676267_513ea719` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 20:46)
  ID: `notif_1773434801640_6ba6858e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 20:46)
  ID: `notif_1773434818357_7297f2b8` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 20:49)
  ID: `notif_1773434981580_7c27d5a3` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 20:53)
  ID: `notif_1773435239027_252ca1e1` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 20:54)
  ID: `notif_1773435255721_9c378cec` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 20:54)
  ID: `notif_1773435286883_29e9c9d4` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 20:59)
  ID: `notif_1773435592208_27412d93` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 21:01)
  ID: `notif_1773435676412_db51b3ef` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 21:01)
  ID: `notif_1773435693112_2e60c128` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 21:04)
  ID: `notif_1773435897621_840ccfbf` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 21:08)
  ID: `notif_1773436113889_a4a92689` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 21:08)
  ID: `notif_1773436130594_61149043` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 21:10)
  ID: `notif_1773436202921_930fbd53` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 21:15)
  ID: `notif_1773436508223_468b0e0a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 21:15)
  ID: `notif_1773436551266_249593f6` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 21:16)
  ID: `notif_1773436568000_738bb9e8` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 21:20)
  ID: `notif_1773436813532_3e85a597` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 21:23)
  ID: `notif_1773436988677_edc30f70` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 21:23)
  ID: `notif_1773437005402_14d55a32` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 21:25)
  ID: `notif_1773437118847_ddf11403` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 21:30)
  ID: `notif_1773437424148_8501ee60` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 21:30)
  ID: `notif_1773437426105_559ab017` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 21:30)
  ID: `notif_1773437442830_3e946987` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 21:35)
  ID: `notif_1773437729450_6110ae28` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 21:37)
  ID: `notif_1773437863464_ddbd94d6` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 21:38)
  ID: `notif_1773437880175_d0057258` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 21:40)
  ID: `notif_1773438034759_e458dc02` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 21:45)
  ID: `notif_1773438300877_b43727b9` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 21:45)
  ID: `notif_1773438317599_0ec8a079` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 21:45)
  ID: `notif_1773438340241_8ed9eb6f` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 21:50)
  ID: `notif_1773438645579_4a14f07f` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 21:52)
  ID: `notif_1773438738296_ca2f4eef` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 21:52)
  ID: `notif_1773438755009_0b12dc1d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 21:55)
  ID: `notif_1773438950900_450a5205` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 21:59)
  ID: `notif_1773439175679_233c6df7` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 21:59)
  ID: `notif_1773439192396_d5adeebc` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 22:00)
  ID: `notif_1773439256202_33292b2a` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 22:06)
  ID: `notif_1773439561502_33e3f9e5` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 22:06)
  ID: `notif_1773439613073_b4a0848e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 22:07)
  ID: `notif_1773439629781_50f459e2` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 22:11)
  ID: `notif_1773439866820_4f143301` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 22:14)
  ID: `notif_1773440050458_7adb5c4a` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 22:14)
  ID: `notif_1773440067198_e700dccd` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 22:16)
  ID: `notif_1773440172110_2ef35865` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 22:21)
  ID: `notif_1773440477529_31deb113` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 22:21)
  ID: `notif_1773440487992_bcfa6607` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 22:21)
  ID: `notif_1773440504672_0a022f4b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 22:26)
  ID: `notif_1773440782842_60c35e2b` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 22:28)
  ID: `notif_1773440925352_656b4d31` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 22:29)
  ID: `notif_1773440942088_a110f0d6` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 22:31)
  ID: `notif_1773441088163_b37045ce` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 22:36)
  ID: `notif_1773441362774_4d897cb5` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 22:36)
  ID: `notif_1773441379490_d6cf4b4e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 22:36)
  ID: `notif_1773441393465_ed84dfaa` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 22:41)
  ID: `notif_1773441698785_535cdb97` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 22:43)
  ID: `notif_1773441800133_6f6fabd7` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 22:43)
  ID: `notif_1773441816849_aef3c909` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 22:46)
  ID: `notif_1773442004089_912376ac` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 22:50)
  ID: `notif_1773442237614_3064fe9b` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 22:50)
  ID: `notif_1773442254192_bf18a648` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 22:51)
  ID: `notif_1773442309494_b7792c77` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 22:56)
  ID: `notif_1773442614729_ae2b73d3` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 22:57)
  ID: `notif_1773442674837_ef4f93a3` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 22:58)
  ID: `notif_1773442691543_ac9111e9` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 23:02)
  ID: `notif_1773442920036_7583adb0` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 23:05)
  ID: `notif_1773443112198_bf3145c2` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 23:05)
  ID: `notif_1773443128908_4d634197` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 23:07)
  ID: `notif_1773443225357_7e263d75` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 23:12)
  ID: `notif_1773443530670_9f18fc3d` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 23:12)
  ID: `notif_1773443549513_02d907e0` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 23:12)
  ID: `notif_1773443566230_4bb4433b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 23:17)
  ID: `notif_1773443836084_c83bf7a2` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 23:19)
  ID: `notif_1773443987020_c46f5497` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 23:20)
  ID: `notif_1773444003739_92f15199` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 23:22)
  ID: `notif_1773444141392_938d3a74` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 23:27)
  ID: `notif_1773444424422_ff364d7a` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 23:27)
  ID: `notif_1773444441128_047fb1b0` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 23:27)
  ID: `notif_1773444446711_bc369e7a` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 23:32)
  ID: `notif_1773444752012_013732f4` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 23:34)
  ID: `notif_1773444861806_19f0a431` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 23:34)
  ID: `notif_1773444878512_55968f4b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 23:37)
  ID: `notif_1773445057321_dbb2814a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 23:41)
  ID: `notif_1773445299293_b6a74187` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 23:41)
  ID: `notif_1773445316025_3538e1e6` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 23:42)
  ID: `notif_1773445362711_040b9627` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 13 23:47)
  ID: `notif_1773445668025_45f180b6` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 23:48)
  ID: `notif_1773445736698_2658daab` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 23:49)
  ID: `notif_1773445753438_baa961db` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 23:52)
  ID: `notif_1773445973344_b6029380` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 13 23:56)
  ID: `notif_1773446174115_a474c41b` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 13 23:56)
  ID: `notif_1773446190832_ac9b4f98` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 13 23:57)
  ID: `notif_1773446278659_2afe163c` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 00:03)
  ID: `notif_1773446583961_6f690a83` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 00:03)
  ID: `notif_1773446611499_143417d8` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 00:03)
  ID: `notif_1773446628207_e77b48c2` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 00:08)
  ID: `notif_1773446889382_ffa5e52a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 00:10)
  ID: `notif_1773447048986_c6c7c3ba` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 00:11)
  ID: `notif_1773447065696_133f374e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 00:13)
  ID: `notif_1773447194694_343da633` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 00:18)
  ID: `notif_1773447486370_c76b1076` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 14 00:18)
  ID: `notif_1773447500008_c1eb61b0` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 00:18)
  ID: `notif_1773447503026_312a11d3` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 00:23)
  ID: `notif_1773447805314_c478e21c` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 00:25)
  ID: `notif_1773447923697_c932f41d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 00:25)
  ID: `notif_1773447940410_77bd7bce` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 00:28)
  ID: `notif_1773448110671_d2ca67a8` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 00:32)
  ID: `notif_1773448361143_36b2f444` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 00:32)
  ID: `notif_1773448377879_0f1dfdf4` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 00:33)
  ID: `notif_1773448415966_af9a9014` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 00:38)
  ID: `notif_1773448721274_1bd2d76e` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 00:39)
  ID: `notif_1773448798546_b2eb5a78` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 00:40)
  ID: `notif_1773448815231_9b54cba7` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 00:43)
  ID: `notif_1773449026588_0d232965` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 00:47)
  ID: `notif_1773449235860_419eb447` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 00:47)
  ID: `notif_1773449252570_88f83f4d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 00:48)
  ID: `notif_1773449331895_00f93017` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 00:53)
  ID: `notif_1773449637204_4b39e7bf` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 00:54)
  ID: `notif_1773449673243_d0fe8d73` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 00:54)
  ID: `notif_1773449689900_6248a1a8` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 00:59)
  ID: `notif_1773449942652_3693805c` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 01:01)
  ID: `notif_1773450110686_70348d55` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 01:02)
  ID: `notif_1773450127393_f821b1a0` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 01:04)
  ID: `notif_1773450247964_fd3d8090` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 01:09)
  ID: `notif_1773450548072_51899944` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 14 01:09)
  ID: `notif_1773450553287_eb5e7429` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 01:09)
  ID: `notif_1773450564782_1cbf3df8` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 01:14)
  ID: `notif_1773450858595_6c09a573` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 01:16)
  ID: `notif_1773450985452_4b8800c5` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 01:16)
  ID: `notif_1773451002164_9c1db77f` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 01:19)
  ID: `notif_1773451163900_c7cb4d84` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 01:23)
  ID: `notif_1773451422932_18679603` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 01:23)
  ID: `notif_1773451439643_89140975` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 01:24)
  ID: `notif_1773451469300_c1841e20` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 01:29)
  ID: `notif_1773451774614_4247958b` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 01:31)
  ID: `notif_1773451860324_b350a693` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 01:31)
  ID: `notif_1773451877055_bc63a00a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 01:34)
  ID: `notif_1773452079954_e99716db` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 01:38)
  ID: `notif_1773452297692_ed5b77d3` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 01:38)
  ID: `notif_1773452314401_3a41e1dd` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 01:39)
  ID: `notif_1773452385245_7b993d46` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 01:44)
  ID: `notif_1773452690551_01ea2ba6` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 01:45)
  ID: `notif_1773452735078_4a0b5f28` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 01:45)
  ID: `notif_1773452751787_a7b6179f` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 01:49)
  ID: `notif_1773452995851_7a6fc640` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 01:52)
  ID: `notif_1773453172601_86606fd0` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 01:53)
  ID: `notif_1773453189331_a877a8e6` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 01:55)
  ID: `notif_1773453301182_c6456a13` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 02:00)
  ID: `notif_1773453606495_79cc59bf` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 02:00)
  ID: `notif_1773453610052_2bb5fac8` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 02:00)
  ID: `notif_1773453626778_fe753d75` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 02:05)
  ID: `notif_1773453911951_de1e13d6` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 02:07)
  ID: `notif_1773454047521_bf9b4051` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 02:07)
  ID: `notif_1773454064077_98ca797f` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 02:10)
  ID: `notif_1773454217340_4ee8e8a9` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 02:14)
  ID: `notif_1773454484788_32365b41` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 02:15)
  ID: `notif_1773454501368_302ca6c7` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 02:15)
  ID: `notif_1773454522631_bd4d449b` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 02:20)
  ID: `notif_1773454828031_98916a6d` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 02:22)
  ID: `notif_1773454922157_f2c58149` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 02:22)
  ID: `notif_1773454938869_abac2423` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 02:25)
  ID: `notif_1773455133332_a68aa3dd` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 02:29)
  ID: `notif_1773455359547_c682f57a` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 02:29)
  ID: `notif_1773455376289_0c91fcc6` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 02:30)
  ID: `notif_1773455438627_ef938d20` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 02:35)
  ID: `notif_1773455743918_f61fdc37` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 02:36)
  ID: `notif_1773455796958_16ea1881` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 02:36)
  ID: `notif_1773455813667_a2d064e5` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 02:40)
  ID: `notif_1773456049305_3440c84d` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 02:43)
  ID: `notif_1773456234337_f30d3c3d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 02:44)
  ID: `notif_1773456251037_e3df998c` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 02:45)
  ID: `notif_1773456354742_58dcfc5b` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 02:51)
  ID: `notif_1773456660057_1dfa5e78` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 02:51)
  ID: `notif_1773456671837_1549c881` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 02:51)
  ID: `notif_1773456688544_f36c5f4f` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 02:56)
  ID: `notif_1773456965371_1c0e0996` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 02:58)
  ID: `notif_1773457109250_c16b6256` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 02:58)
  ID: `notif_1773457125969_1edc88c3` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 03:01)
  ID: `notif_1773457270677_ebdbfd3a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 03:05)
  ID: `notif_1773457546635_9b423bfe` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 03:06)
  ID: `notif_1773457563346_9658690c` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 03:06)
  ID: `notif_1773457575980_929f43a2` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 03:11)
  ID: `notif_1773457881284_073801a5` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 03:13)
  ID: `notif_1773457984002_b54c2373` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 03:13)
  ID: `notif_1773458000859_26719925` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 03:16)
  ID: `notif_1773458186700_ffc991f2` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 03:20)
  ID: `notif_1773458421717_c9adb7d2` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 03:20)
  ID: `notif_1773458438421_f8dbe437` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 03:21)
  ID: `notif_1773458492020_3e0c36d3` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 03:26)
  ID: `notif_1773458797341_b36a70b5` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 03:27)
  ID: `notif_1773458859085_edecca57` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 03:27)
  ID: `notif_1773458875792_ca9641ee` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 03:31)
  ID: `notif_1773459102633_ff8e65e6` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 03:34)
  ID: `notif_1773459296467_abac1c4f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 03:35)
  ID: `notif_1773459313052_c31d7c47` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 03:36)
  ID: `notif_1773459407948_b17516d1` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 03:41)
  ID: `notif_1773459713337_fc271c50` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 03:42)
  ID: `notif_1773459733799_acde6f31` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 03:42)
  ID: `notif_1773459750501_8cf3c1e2` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 03:46)
  ID: `notif_1773460018635_93d82731` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 03:49)
  ID: `notif_1773460171178_1c1329c2` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 03:49)
  ID: `notif_1773460187907_5810e7a9` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 03:52)
  ID: `notif_1773460323934_112dd7f5` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 03:56)
  ID: `notif_1773460608592_3e83bb6d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 03:57)
  ID: `notif_1773460625298_40a7b7c8` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 03:57)
  ID: `notif_1773460629240_e5d62b61` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 04:02)
  ID: `notif_1773460934543_2c133ec8` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 04:04)
  ID: `notif_1773461045973_7567a3c4` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 04:04)
  ID: `notif_1773461062810_60c4e2a5` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 04:07)
  ID: `notif_1773461239943_9b6ed52f` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 04:11)
  ID: `notif_1773461483475_8e949cba` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 04:11)
  ID: `notif_1773461500185_5ad2815d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 04:12)
  ID: `notif_1773461545259_15ca52cd` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 04:17)
  ID: `notif_1773461850577_45388b04` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 04:18)
  ID: `notif_1773461920828_14685265` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 04:18)
  ID: `notif_1773461937514_6d941b27` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 04:22)
  ID: `notif_1773462155891_18e42bff` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 04:25)
  ID: `notif_1773462358045_c8d58021` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 04:26)
  ID: `notif_1773462374754_86e2b4c1` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 04:27)
  ID: `notif_1773462461202_9fdaafe0` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 04:32)
  ID: `notif_1773462766653_d9cb76a3` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 04:33)
  ID: `notif_1773462795575_64fa23a9` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 04:33)
  ID: `notif_1773462812288_98917e70` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 04:37)
  ID: `notif_1773463071971_88685b7a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 04:40)
  ID: `notif_1773463232959_f7c7b5d4` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 04:40)
  ID: `notif_1773463249684_f47d39d5` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 04:42)
  ID: `notif_1773463377281_0668e930` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 04:47)
  ID: `notif_1773463670372_c2ba1345` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 14 04:48)
  ID: `notif_1773463682607_83183003` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 04:48)
  ID: `notif_1773463687073_c83bc9ba` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 04:53)
  ID: `notif_1773463987897_e4fe0c8c` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 04:55)
  ID: `notif_1773464107741_049ac271` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 04:55)
  ID: `notif_1773464124474_835d49dc` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 04:58)
  ID: `notif_1773464293215_0084e2ff` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 05:02)
  ID: `notif_1773464545276_6f922f04` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 05:02)
  ID: `notif_1773464561968_58a1e673` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 05:03)
  ID: `notif_1773464598633_12378051` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 05:08)
  ID: `notif_1773464903946_8d27e6b0` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 05:09)
  ID: `notif_1773464982604_9b98c60e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 05:09)
  ID: `notif_1773464999307_95101feb` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 05:13)
  ID: `notif_1773465209269_6432235e` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 05:16)
  ID: `notif_1773465419985_23d9f023` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 05:17)
  ID: `notif_1773465436724_215682cf` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 05:18)
  ID: `notif_1773465514570_088ab4da` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 05:23)
  ID: `notif_1773465819861_8fe8ce3d` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 05:24)
  ID: `notif_1773465857402_58c77cdb` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 05:24)
  ID: `notif_1773465874117_26001243` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 05:28)
  ID: `notif_1773466125248_3bdef0be` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 05:31)
  ID: `notif_1773466294882_016ce9a2` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 05:31)
  ID: `notif_1773466311559_ee79aae8` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 05:33)
  ID: `notif_1773466430565_7c162aef` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 05:38)
  ID: `notif_1773466732240_69051f18` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 14 05:38)
  ID: `notif_1773466735888_c08addd6` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 05:39)
  ID: `notif_1773466748965_378b1840` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 05:44)
  ID: `notif_1773467041203_dc48ea27` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 05:46)
  ID: `notif_1773467169647_2c015983` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 05:46)
  ID: `notif_1773467186366_a61a2848` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 05:49)
  ID: `notif_1773467346508_0e158454` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 05:53)
  ID: `notif_1773467607040_1e515586` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 05:53)
  ID: `notif_1773467623896_c830be43` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 05:54)
  ID: `notif_1773467651917_06791c49` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 05:59)
  ID: `notif_1773467957228_1b957ad5` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 06:00)
  ID: `notif_1773468044601_3d9957f2` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 06:01)
  ID: `notif_1773468061338_db4c343c` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 06:04)
  ID: `notif_1773468262525_20dc1cb9` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 06:08)
  ID: `notif_1773468482013_1f385503` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 06:08)
  ID: `notif_1773468498733_00e3d879` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 06:09)
  ID: `notif_1773468567837_d4f8e69d` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 06:14)
  ID: `notif_1773468873154_d25a3632` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 06:15)
  ID: `notif_1773468919407_7b81989f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 06:15)
  ID: `notif_1773468936111_f7fa5f40` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 06:19)
  ID: `notif_1773469178468_87c2116a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 06:22)
  ID: `notif_1773469356865_4fd59e2e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 06:22)
  ID: `notif_1773469373581_6a33c2af` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 06:24)
  ID: `notif_1773469483900_8388745e` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 06:29)
  ID: `notif_1773469789217_2e631e78` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 06:29)
  ID: `notif_1773469794206_e0ac7b2d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 06:30)
  ID: `notif_1773469810791_b47d4ed4` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 06:34)
  ID: `notif_1773470094530_64ff1dce` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 06:37)
  ID: `notif_1773470231473_0a4b425f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 06:37)
  ID: `notif_1773470248209_f0b05c50` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 06:39)
  ID: `notif_1773470399851_18207eb0` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 06:44)
  ID: `notif_1773470668885_66641d08` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 06:44)
  ID: `notif_1773470685610_30bfa5b9` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 06:45)
  ID: `notif_1773470705168_8291bb5a` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 06:50)
  ID: `notif_1773471010562_679b46f5` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 06:51)
  ID: `notif_1773471106364_67a77957` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 06:52)
  ID: `notif_1773471123093_61518ca8` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 06:55)
  ID: `notif_1773471315874_e2fcd225` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 06:59)
  ID: `notif_1773471543762_6f03c557` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 06:59)
  ID: `notif_1773471560473_afb773cf` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 07:00)
  ID: `notif_1773471621174_30ac6343` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 07:05)
  ID: `notif_1773471926482_23bbdbd1` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 07:06)
  ID: `notif_1773471981134_3180e6f3` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 07:06)
  ID: `notif_1773471997847_7a1c61d4` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 07:10)
  ID: `notif_1773472231787_38e04c24` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 07:13)
  ID: `notif_1773472418512_015d8b8d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 07:13)
  ID: `notif_1773472435224_1a8d4065` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 07:15)
  ID: `notif_1773472537094_6b0f879b` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 07:20)
  ID: `notif_1773472842534_14c2bc68` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 07:20)
  ID: `notif_1773472856041_942a40a7` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 07:21)
  ID: `notif_1773472872747_6110b143` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 07:25)
  ID: `notif_1773473147830_6469cfed` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 07:28)
  ID: `notif_1773473293396_ae9f5b4f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 07:28)
  ID: `notif_1773473310138_bd4ff44e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 07:30)
  ID: `notif_1773473453138_e4365fd6` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 07:35)
  ID: `notif_1773473730813_57fd50e0` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 07:35)
  ID: `notif_1773473747529_bb29a2e6` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 07:35)
  ID: `notif_1773473758448_39774f82` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 07:41)
  ID: `notif_1773474063760_41974983` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 07:42)
  ID: `notif_1773474168191_f4adb15b` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 07:43)
  ID: `notif_1773474184928_074a8384` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 07:46)
  ID: `notif_1773474369225_c02b6960` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 07:50)
  ID: `notif_1773474605760_c5500766` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 07:50)
  ID: `notif_1773474622493_3669c5fd` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 07:51)
  ID: `notif_1773474674542_01480f9f` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 07:56)
  ID: `notif_1773474979944_26d8e1ba` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 07:57)
  ID: `notif_1773475043091_89874a38` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 07:57)
  ID: `notif_1773475059585_5a276fbf` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 08:01)
  ID: `notif_1773475285258_f954a3ef` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 08:04)
  ID: `notif_1773475480241_a8ba15b2` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 08:04)
  ID: `notif_1773475496735_ebed5134` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 08:06)
  ID: `notif_1773475590554_9380de09` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 08:11)
  ID: `notif_1773475895853_96b4f0a1` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 08:11)
  ID: `notif_1773475917398_6a708412` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 08:12)
  ID: `notif_1773475933962_705977f1` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 08:16)
  ID: `notif_1773476201285_a1a1286f` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 08:19)
  ID: `notif_1773476354767_1ddf3953` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 08:19)
  ID: `notif_1773476371490_9a93c791` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 08:21)
  ID: `notif_1773476506543_e2d96bb7` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 08:26)
  ID: `notif_1773476792176_41533728` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 08:26)
  ID: `notif_1773476808896_6bc02279` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 08:26)
  ID: `notif_1773476811840_fac07668` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 08:31)
  ID: `notif_1773477117156_370873a9` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 08:33)
  ID: `notif_1773477229564_f5da0b44` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 08:34)
  ID: `notif_1773477246268_2e2bdf67` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 08:37)
  ID: `notif_1773477422485_72a57fe4` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 08:41)
  ID: `notif_1773477666946_8b84148c` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 08:41)
  ID: `notif_1773477683677_2744f127` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 08:42)
  ID: `notif_1773477727908_10eea1be` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 08:47)
  ID: `notif_1773478033223_ff07f281` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 08:48)
  ID: `notif_1773478104443_42bd625f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 08:48)
  ID: `notif_1773478121173_823bc4d0` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 08:52)
  ID: `notif_1773478338536_59cd178a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 08:55)
  ID: `notif_1773478541853_10ffd092` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 08:55)
  ID: `notif_1773478558566_768e8f6e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 08:57)
  ID: `notif_1773478643995_aaf35727` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 09:02)
  ID: `notif_1773478949329_197252c4` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 09:02)
  ID: `notif_1773478979112_a448d4a9` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 09:03)
  ID: `notif_1773478995847_3535c7d6` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 09:07)
  ID: `notif_1773479254615_7ca6915f` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 09:10)
  ID: `notif_1773479416630_26c01fc0` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 09:10)
  ID: `notif_1773479433339_5296b993` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 09:12)
  ID: `notif_1773479560009_5af46f5b` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 09:17)
  ID: `notif_1773479854012_1e217707` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 14 09:17)
  ID: `notif_1773479865359_adc08a05` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 09:17)
  ID: `notif_1773479870729_ec9f986b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 09:22)
  ID: `notif_1773480170678_75abff49` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 09:24)
  ID: `notif_1773480291400_a79c0bde` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 09:25)
  ID: `notif_1773480308110_0ba359af` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 09:27)
  ID: `notif_1773480475991_4662e4ca` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 09:32)
  ID: `notif_1773480728778_e42588a3` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 09:32)
  ID: `notif_1773480745458_db4798c0` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 09:33)
  ID: `notif_1773480781297_3096ec88` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 09:38)
  ID: `notif_1773481086725_3c98ca90` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 09:39)
  ID: `notif_1773481166257_94bb6e87` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 09:39)
  ID: `notif_1773481182983_4fcf98ad` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 09:43)
  ID: `notif_1773481392038_df359cc0` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 09:46)
  ID: `notif_1773481603676_6929bdc1` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 09:47)
  ID: `notif_1773481620450_421f83fd` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 09:48)
  ID: `notif_1773481697328_9ddcdda8` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 09:53)
  ID: `notif_1773482002636_b53c223f` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 09:54)
  ID: `notif_1773482041123_ccf2cbe9` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 09:54)
  ID: `notif_1773482057841_2af1b5e4` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 09:58)
  ID: `notif_1773482307916_be9aa3da` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 10:01)
  ID: `notif_1773482478507_46974947` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 10:01)
  ID: `notif_1773482495222_65b9f259` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 10:03)
  ID: `notif_1773482613191_ffcc85c7` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 10:08)
  ID: `notif_1773482916024_dcdecd5a` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 14 10:08)
  ID: `notif_1773482918623_24c2d081` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 10:08)
  ID: `notif_1773482932751_771e264c` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 10:13)
  ID: `notif_1773483223955_06432523` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 10:15)
  ID: `notif_1773483353433_381add30` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 10:16)
  ID: `notif_1773483370124_0abc7185` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 10:18)
  ID: `notif_1773483529258_b67fdaff` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 10:23)
  ID: `notif_1773483790813_7242a56e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 10:23)
  ID: `notif_1773483807514_11f1ec72` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 10:23)
  ID: `notif_1773483834569_80fc58b4` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 10:28)
  ID: `notif_1773484139871_c5db83f9` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 10:30)
  ID: `notif_1773484228194_dcb05b78` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 10:30)
  ID: `notif_1773484244923_40583e7d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 10:34)
  ID: `notif_1773484445275_610f806c` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 10:37)
  ID: `notif_1773484665708_b1018773` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 10:38)
  ID: `notif_1773484682423_6e539af4` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 10:39)
  ID: `notif_1773484750596_7b899bad` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 10:44)
  ID: `notif_1773485055918_d6512529` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 10:45)
  ID: `notif_1773485103077_43726660` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 10:45)
  ID: `notif_1773485119806_818a2fbd` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 10:49)
  ID: `notif_1773485361237_42675da4` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 10:52)
  ID: `notif_1773485540473_3bd6f630` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 10:52)
  ID: `notif_1773485557155_209c718e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 10:54)
  ID: `notif_1773485666531_4ded9864` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 10:59)
  ID: `notif_1773485971841_6f6a75fb` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 10:59)
  ID: `notif_1773485977819_2848258c` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 10:59)
  ID: `notif_1773485994501_438015ac` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Recovery Failed** (_system_, Mar 14 11:00)
  ID: `notif_1773486010762_271e136e` — Gateway did not start. Manual intervention needed.

- **Gateway Down** (_system_, Mar 14 11:04)
  ID: `notif_1773486277234_37e805a9` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 11:06)
  ID: `notif_1773486415259_433b90cb` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 11:07)
  ID: `notif_1773486432013_5dc2b8cc` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 11:09)
  ID: `notif_1773486582538_b53d5481` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 11:14)
  ID: `notif_1773486852649_e37beace` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 11:14)
  ID: `notif_1773486869389_a380ba46` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 11:14)
  ID: `notif_1773486887789_b0260126` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 11:19)
  ID: `notif_1773487193212_755adb7c` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 11:21)
  ID: `notif_1773487290170_67902c0d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 11:21)
  ID: `notif_1773487306898_ed0fadc8` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 11:24)
  ID: `notif_1773487498514_32a6ac14` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 11:28)
  ID: `notif_1773487727583_31b5b9cf` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 11:29)
  ID: `notif_1773487744307_4cbd8c25` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 11:30)
  ID: `notif_1773487803828_28795e32` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 11:35)
  ID: `notif_1773488109123_7fe23c44` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 11:36)
  ID: `notif_1773488164999_680332dc` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 11:36)
  ID: `notif_1773488181731_f6df7746` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 11:40)
  ID: `notif_1773488414416_64264082` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 11:43)
  ID: `notif_1773488602381_becf1ab2` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 11:43)
  ID: `notif_1773488619089_6c36fdf9` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 11:45)
  ID: `notif_1773488719830_b4f2efc5` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 11:50)
  ID: `notif_1773489025156_c922c1b2` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 11:50)
  ID: `notif_1773489039862_74730416` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 11:50)
  ID: `notif_1773489056591_940959e5` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 11:55)
  ID: `notif_1773489330479_6fcbbd17` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 11:57)
  ID: `notif_1773489477271_d1a9aead` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 11:58)
  ID: `notif_1773489493991_26c00c69` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 12:00)
  ID: `notif_1773489635789_ae604c84` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 12:05)
  ID: `notif_1773489914653_87639dca` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 12:05)
  ID: `notif_1773489931370_4320faf9` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 12:05)
  ID: `notif_1773489941104_ea9a1c73` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 12:10)
  ID: `notif_1773490246398_b4e055db` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 12:12)
  ID: `notif_1773490352037_a2b7a20c` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 12:12)
  ID: `notif_1773490368890_e8d559cb` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 12:15)
  ID: `notif_1773490551842_1cc88c1a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 12:19)
  ID: `notif_1773490789576_ae9d8408` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 12:20)
  ID: `notif_1773490806319_15c79767` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 12:20)
  ID: `notif_1773490857164_11cba73b` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 12:26)
  ID: `notif_1773491162483_5821689a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 12:27)
  ID: `notif_1773491226996_1c30fd81` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 12:27)
  ID: `notif_1773491243706_972c5f57` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 12:31)
  ID: `notif_1773491467793_f3ca3724` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 12:34)
  ID: `notif_1773491664393_a2396452` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 12:34)
  ID: `notif_1773491681103_26c17c6b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 12:36)
  ID: `notif_1773491773093_110a9036` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 12:41)
  ID: `notif_1773492078554_00d2a59d` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 12:41)
  ID: `notif_1773492101928_57f3ea1e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 12:41)
  ID: `notif_1773492118645_b1ede588` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 12:46)
  ID: `notif_1773492383869_4b0594e9` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 12:48)
  ID: `notif_1773492539183_ebea94bd` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 12:49)
  ID: `notif_1773492555942_4436c000` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 12:51)
  ID: `notif_1773492689165_6d469f01` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 12:56)
  ID: `notif_1773492976609_4085e55f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 12:56)
  ID: `notif_1773492993311_97e44f82` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 12:56)
  ID: `notif_1773492994469_cf9aa839` — Gateway is down and auto-restart failed. Check manually.

- **Even Us Up: monetization sprint or maintenance mode?** (_question_, Mar 14 13:00)
  ID: `notif_1773493200348_421c4b2a` — Even Us Up has been running. Is it growing naturally or on life support? Should I explore monetization (paid tier, B2B) or keep the lights on at minim...

- **Gateway Down** (_system_, Mar 14 13:01)
  ID: `notif_1773493299781_a9860569` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 13:03)
  ID: `notif_1773493413999_a228b80e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 13:03)
  ID: `notif_1773493430734_dad68d23` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 13:06)
  ID: `notif_1773493605096_7d2ac794` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 13:10)
  ID: `notif_1773493851555_1028d5f1` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 13:11)
  ID: `notif_1773493868297_0e24f28d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 13:11)
  ID: `notif_1773493910517_a11e0bc2` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 13:16)
  ID: `notif_1773494215833_844007d3` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 13:18)
  ID: `notif_1773494288983_c3f5565b` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 13:18)
  ID: `notif_1773494305688_0452c431` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 13:22)
  ID: `notif_1773494521157_9b615268` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 13:25)
  ID: `notif_1773494726358_d7882b06` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 13:25)
  ID: `notif_1773494743072_0e9ec1a6` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 13:27)
  ID: `notif_1773494826477_7481ec9e` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 13:32)
  ID: `notif_1773495131798_e3b40c24` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 13:32)
  ID: `notif_1773495163747_f662cc87` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 13:33)
  ID: `notif_1773495180435_919b2656` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 13:37)
  ID: `notif_1773495437235_0c7dca9b` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 13:40)
  ID: `notif_1773495601207_2a52a022` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 13:40)
  ID: `notif_1773495617947_e4c41747` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 13:42)
  ID: `notif_1773495742556_3b2225a1` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 13:47)
  ID: `notif_1773496038622_f3c73e56` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 14 13:47)
  ID: `notif_1773496047877_5d3c0aa4` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 13:47)
  ID: `notif_1773496055320_ff5f0154` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 13:52)
  ID: `notif_1773496353193_30c47666` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 13:54)
  ID: `notif_1773496476004_0f9e77f3` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 13:54)
  ID: `notif_1773496492740_fca59a09` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 13:57)
  ID: `notif_1773496658684_67896e82` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 14:01)
  ID: `notif_1773496913428_432d98d1` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 14:02)
  ID: `notif_1773496930133_e0867dc0` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 14:02)
  ID: `notif_1773496963993_9122db81` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 14:07)
  ID: `notif_1773497269550_d405d8b5` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 14:09)
  ID: `notif_1773497350961_e80d0b23` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 14:09)
  ID: `notif_1773497367693_eedc3486` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 14:12)
  ID: `notif_1773497574859_98cbc806` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 14:16)
  ID: `notif_1773497788351_3c5b4b9c` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 14:16)
  ID: `notif_1773497805195_591dfad7` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 14:18)
  ID: `notif_1773497880158_ab91c1d4` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 14:23)
  ID: `notif_1773498185474_69ed4199` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 14:23)
  ID: `notif_1773498225891_f854b955` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 14:24)
  ID: `notif_1773498242599_53cbdaf8` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 14:28)
  ID: `notif_1773498490794_601519e9` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 14:31)
  ID: `notif_1773498663262_9ec2139d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 14:31)
  ID: `notif_1773498679937_b68ae503` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 14:33)
  ID: `notif_1773498796228_8de32a69` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 14:38)
  ID: `notif_1773499100726_22c5ae2c` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 14 14:38)
  ID: `notif_1773499101516_3a98f305` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 14:38)
  ID: `notif_1773499117465_48f9ae8a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 14:43)
  ID: `notif_1773499406829_c1d9cc5c` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 14:45)
  ID: `notif_1773499538148_77bbd3a3` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 14:45)
  ID: `notif_1773499554818_2007e982` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 14:48)
  ID: `notif_1773499712121_ddda50f8` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 14:52)
  ID: `notif_1773499975509_60fa492e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 14:53)
  ID: `notif_1773499992098_c019ca27` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 14:53)
  ID: `notif_1773500017423_1cd72eda` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 14:58)
  ID: `notif_1773500322731_6b4784d9` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 15:00)
  ID: `notif_1773500412928_6246968d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 15:00)
  ID: `notif_1773500429647_1d4c38a9` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 15:03)
  ID: `notif_1773500628196_b31150ce` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 15:07)
  ID: `notif_1773500850327_4daedaef` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 15:07)
  ID: `notif_1773500867041_1ed2f56a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 15:08)
  ID: `notif_1773500933512_b730ea4d` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 15:13)
  ID: `notif_1773501238812_0d7ef885` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 15:14)
  ID: `notif_1773501287720_d1eb400e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 15:15)
  ID: `notif_1773501304277_572b9bf7` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 15:19)
  ID: `notif_1773501543981_c3831620` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 15:22)
  ID: `notif_1773501725079_2b3c67fc` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 15:22)
  ID: `notif_1773501741807_1d736f4a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 15:24)
  ID: `notif_1773501849285_7c2718f0` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 15:29)
  ID: `notif_1773502154732_ae22db90` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 15:29)
  ID: `notif_1773502162608_e409f9cc` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 15:29)
  ID: `notif_1773502179326_0f9cb04c` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 15:34)
  ID: `notif_1773502460048_b962d591` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 15:36)
  ID: `notif_1773502599960_10ceb929` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 15:36)
  ID: `notif_1773502616688_0ae1dc72` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 15:39)
  ID: `notif_1773502765359_a9606a26` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 15:43)
  ID: `notif_1773503037354_30c4d887` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 15:44)
  ID: `notif_1773503054090_dac8822a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 15:44)
  ID: `notif_1773503070709_6dc8a3c0` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 15:49)
  ID: `notif_1773503376058_1bcb56d3` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 15:51)
  ID: `notif_1773503474765_78291045` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 15:51)
  ID: `notif_1773503491478_d5fdb75f` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 15:54)
  ID: `notif_1773503681411_320c49e3` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 15:58)
  ID: `notif_1773503912248_5b71d379` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 15:58)
  ID: `notif_1773503928974_3058913a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 15:59)
  ID: `notif_1773503986812_c78a472c` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 16:04)
  ID: `notif_1773504292129_ad6490b2` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 16:05)
  ID: `notif_1773504349629_55900024` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 16:06)
  ID: `notif_1773504366378_2b57ce47` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 16:09)
  ID: `notif_1773504597444_7ca06ee3` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 16:13)
  ID: `notif_1773504787053_b5522315` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 16:13)
  ID: `notif_1773504803755_29b87750` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 16:15)
  ID: `notif_1773504902746_54c3e32b` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 16:20)
  ID: `notif_1773505208020_6925ce0f` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 16:20)
  ID: `notif_1773505224437_134892c8` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 16:20)
  ID: `notif_1773505241171_884e07a6` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 16:25)
  ID: `notif_1773505513439_e27e0355` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 16:27)
  ID: `notif_1773505661974_629fe485` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 16:27)
  ID: `notif_1773505678693_00119a65` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 16:30)
  ID: `notif_1773505818748_7e9a9ef0` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 16:34)
  ID: `notif_1773506099384_2347717f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 16:35)
  ID: `notif_1773506115972_9438a476` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 16:35)
  ID: `notif_1773506124038_fcb60f9b` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 16:40)
  ID: `notif_1773506429410_6d1fb2b3` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 16:42)
  ID: `notif_1773506536715_7fe9aeda` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 16:42)
  ID: `notif_1773506553415_463cf746` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 16:45)
  ID: `notif_1773506734728_91d52a01` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 16:49)
  ID: `notif_1773506974077_7803f6b2` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 16:49)
  ID: `notif_1773506990805_bfef0cb6` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 16:50)
  ID: `notif_1773507040044_08746193` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 16:55)
  ID: `notif_1773507345340_2880bffc` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 16:56)
  ID: `notif_1773507411479_266a9e73` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 16:57)
  ID: `notif_1773507428052_1e6c7dd0` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 17:00)
  ID: `notif_1773507650649_88409bed` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 17:04)
  ID: `notif_1773507848732_2da10663` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 17:04)
  ID: `notif_1773507865466_04cd7d6d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 17:05)
  ID: `notif_1773507956050_5c94a933` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 17:11)
  ID: `notif_1773508261366_d7817aae` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 17:11)
  ID: `notif_1773508286230_4e71487b` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 17:11)
  ID: `notif_1773508302943_48a494c9` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 17:16)
  ID: `notif_1773508566672_0d2462cb` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 17:18)
  ID: `notif_1773508723610_0cec4049` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 17:19)
  ID: `notif_1773508740179_0559ce64` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 17:21)
  ID: `notif_1773508871980_5ea13fe9` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 17:26)
  ID: `notif_1773509160850_5a5b58dc` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 14 17:26)
  ID: `notif_1773509177307_a4c1fc3e` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 17:26)
  ID: `notif_1773509177422_5a69e50d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 17:31)
  ID: `notif_1773509482626_d0c9bf55` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 17:33)
  ID: `notif_1773509598141_3f86d499` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 17:33)
  ID: `notif_1773509615032_d9f29694` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 17:36)
  ID: `notif_1773509788127_3dd62c7a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 17:40)
  ID: `notif_1773510035708_9af86a99` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 17:40)
  ID: `notif_1773510052423_1a2c3bb4` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 17:41)
  ID: `notif_1773510093429_89652b8f` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 17:46)
  ID: `notif_1773510398735_d3db9802` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 17:47)
  ID: `notif_1773510473098_83295ff7` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 17:48)
  ID: `notif_1773510489800_7d659170` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 17:51)
  ID: `notif_1773510704039_e87ee664` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 17:55)
  ID: `notif_1773510910477_ec90e5cc` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 17:55)
  ID: `notif_1773510927217_c8fd6728` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 17:56)
  ID: `notif_1773511009362_4fdef901` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 18:01)
  ID: `notif_1773511314669_5393b3f1` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 18:02)
  ID: `notif_1773511348000_cecc8e64` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 18:02)
  ID: `notif_1773511364723_3b448370` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 18:06)
  ID: `notif_1773511619947_17bb4308` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 18:09)
  ID: `notif_1773511785348_2854f7f1` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 18:10)
  ID: `notif_1773511802064_bbd75ec5` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 18:12)
  ID: `notif_1773511925119_448fcd2a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 18:17)
  ID: `notif_1773512222731_411651ad` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 14 18:17)
  ID: `notif_1773512230437_28ffdd0a` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 18:17)
  ID: `notif_1773512239321_7d4316a5` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 18:22)
  ID: `notif_1773512535740_fafb22b0` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 18:24)
  ID: `notif_1773512660011_2c146004` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 18:24)
  ID: `notif_1773512676704_c74a9d8d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 18:27)
  ID: `notif_1773512841060_4736bd03` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 18:31)
  ID: `notif_1773513097532_f430a00f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 18:31)
  ID: `notif_1773513114252_78eba8f6` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 18:32)
  ID: `notif_1773513146528_a3cf2c9f` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 18:37)
  ID: `notif_1773513451844_069aebf0` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 18:38)
  ID: `notif_1773513534922_461bdddc` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 18:39)
  ID: `notif_1773513551500_7c349eb0` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 18:42)
  ID: `notif_1773513757300_72bbbb31` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 18:46)
  ID: `notif_1773513972173_f957f72f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 18:46)
  ID: `notif_1773513988893_8247c725` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 18:47)
  ID: `notif_1773514062595_46d313b8` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 18:52)
  ID: `notif_1773514367907_303732f4` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 18:53)
  ID: `notif_1773514409566_d424b91d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 18:53)
  ID: `notif_1773514426302_d05288fd` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 18:57)
  ID: `notif_1773514673210_81bf4530` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 19:00)
  ID: `notif_1773514847099_465272a2` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 19:01)
  ID: `notif_1773514863781_41c72c5b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 19:02)
  ID: `notif_1773514978652_54d8923f` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 19:08)
  ID: `notif_1773515283966_f1e8f2b8` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 19:08)
  ID: `notif_1773515284319_923bc7c2` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 19:08)
  ID: `notif_1773515301023_87972c35` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 19:13)
  ID: `notif_1773515589282_c87e1c90` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 19:15)
  ID: `notif_1773515721700_b1776046` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 19:15)
  ID: `notif_1773515738417_29b96906` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 19:18)
  ID: `notif_1773515894760_5356b084` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 19:22)
  ID: `notif_1773516159120_c9c8238c` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 19:22)
  ID: `notif_1773516175802_b56bf93e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 19:23)
  ID: `notif_1773516200074_43afb3e2` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 19:28)
  ID: `notif_1773516505481_2e73561d` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 19:29)
  ID: `notif_1773516596589_008c4c37` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 19:30)
  ID: `notif_1773516613136_21085b45` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 19:33)
  ID: `notif_1773516810803_592e0641` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 19:37)
  ID: `notif_1773517033828_9e29a2c6` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 19:37)
  ID: `notif_1773517050543_f2d432e3` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 19:38)
  ID: `notif_1773517116096_50a329e1` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 19:43)
  ID: `notif_1773517421414_69c5694f` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 19:44)
  ID: `notif_1773517471222_5fa26d72` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 19:44)
  ID: `notif_1773517487804_c91abeb1` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 19:48)
  ID: `notif_1773517726730_a3ae2ffb` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 19:51)
  ID: `notif_1773517908473_75d9aebc` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 19:52)
  ID: `notif_1773517925050_4a310cd6` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 19:53)
  ID: `notif_1773518032132_4c3a8a89` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 19:58)
  ID: `notif_1773518337440_63939823` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 19:59)
  ID: `notif_1773518345883_7dac1b3b` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 19:59)
  ID: `notif_1773518362610_45f5aa1b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 20:04)
  ID: `notif_1773518642799_b20d0f5c` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 20:06)
  ID: `notif_1773518783380_f49f3484` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 20:06)
  ID: `notif_1773518800131_0f9244f5` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 20:09)
  ID: `notif_1773518948271_7ed69379` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 20:13)
  ID: `notif_1773519220862_c361f1f2` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 20:13)
  ID: `notif_1773519237592_c552dc18` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 20:14)
  ID: `notif_1773519253574_3b1c74ed` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 20:19)
  ID: `notif_1773519558899_6f5cd922` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 20:20)
  ID: `notif_1773519658277_8e3dd595` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 20:21)
  ID: `notif_1773519674992_055e6a97` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 20:24)
  ID: `notif_1773519864307_7a72a79c` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 20:28)
  ID: `notif_1773520095713_2b76830a` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 20:28)
  ID: `notif_1773520112423_10a11dfc` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 20:29)
  ID: `notif_1773520169617_a7564e8a` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 20:34)
  ID: `notif_1773520474918_e904d0df` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 20:35)
  ID: `notif_1773520533099_2891dc57` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 20:35)
  ID: `notif_1773520549835_b3035c0b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 20:39)
  ID: `notif_1773520780216_09e713e7` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 20:42)
  ID: `notif_1773520970508_3ff68363` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 20:43)
  ID: `notif_1773520987177_3613e778` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 20:44)
  ID: `notif_1773521085525_d5f62ab5` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 20:49)
  ID: `notif_1773521390930_31aad59e` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 20:50)
  ID: `notif_1773521407939_2a4dc39a` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 20:50)
  ID: `notif_1773521424651_20bff745` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 20:54)
  ID: `notif_1773521696248_b359861c` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 20:57)
  ID: `notif_1773521845322_452a9cb5` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 20:57)
  ID: `notif_1773521862062_454d6705` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 21:00)
  ID: `notif_1773522001534_7961a698` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 21:04)
  ID: `notif_1773522282737_2d493a93` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 21:04)
  ID: `notif_1773522299458_89baefd5` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 21:05)
  ID: `notif_1773522306853_f1a14fe8` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 21:10)
  ID: `notif_1773522612159_a00c7a2a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 21:12)
  ID: `notif_1773522720139_4fd090f8` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 21:12)
  ID: `notif_1773522736835_889b60a2` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 21:15)
  ID: `notif_1773522917480_872e88b8` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 21:19)
  ID: `notif_1773523157630_a06a8307` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 21:19)
  ID: `notif_1773523174357_b7ce4ab0` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 21:20)
  ID: `notif_1773523222902_49cd4081` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 21:25)
  ID: `notif_1773523528214_c603cacb` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 21:26)
  ID: `notif_1773523595039_7fadedb8` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 21:26)
  ID: `notif_1773523611769_de505185` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 21:30)
  ID: `notif_1773523833508_fd7ca633` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 21:33)
  ID: `notif_1773524032443_b7ea9d87` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 21:34)
  ID: `notif_1773524049160_16d56234` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 21:35)
  ID: `notif_1773524138817_97de60df` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 21:40)
  ID: `notif_1773524444132_bcc4a578` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 21:41)
  ID: `notif_1773524469825_0eb48833` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 21:41)
  ID: `notif_1773524486542_af54b2be` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 21:45)
  ID: `notif_1773524749560_694c0b49` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 21:48)
  ID: `notif_1773524907323_b0815c78` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 21:48)
  ID: `notif_1773524924029_fb3d8e7e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 21:50)
  ID: `notif_1773525054874_cfcbc5df` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 21:55)
  ID: `notif_1773525344695_cb996bb6` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 14 21:56)
  ID: `notif_1773525360176_9e33cacb` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 21:56)
  ID: `notif_1773525361403_db6af19f` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 22:01)
  ID: `notif_1773525665332_3d66da03` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 22:03)
  ID: `notif_1773525782073_fb155866` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 22:03)
  ID: `notif_1773525798804_28e471f8` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 22:06)
  ID: `notif_1773525970654_e9f894ef` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 22:10)
  ID: `notif_1773526219629_3cf19091` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 22:10)
  ID: `notif_1773526236348_f0daa21b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 22:11)
  ID: `notif_1773526276110_9d67f1a9` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 22:16)
  ID: `notif_1773526581425_f1b617d0` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 22:17)
  ID: `notif_1773526657020_288903bd` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 22:17)
  ID: `notif_1773526673756_2daf6c8f` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 22:21)
  ID: `notif_1773526886740_2ac27a98` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 22:24)
  ID: `notif_1773527094434_c7636375` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 22:25)
  ID: `notif_1773527111146_486e4663` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 22:26)
  ID: `notif_1773527192056_b4421f6b` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 22:31)
  ID: `notif_1773527497376_6ed8b4bc` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 22:32)
  ID: `notif_1773527531834_ee0b0c46` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 22:32)
  ID: `notif_1773527548558_1595fcf2` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 22:36)
  ID: `notif_1773527802767_634edfff` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 22:39)
  ID: `notif_1773527969328_00a48361` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 22:39)
  ID: `notif_1773527986053_cf3b3c78` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 22:41)
  ID: `notif_1773528108080_06141835` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 22:46)
  ID: `notif_1773528406734_a9d5aa20` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 14 22:46)
  ID: `notif_1773528413331_cd2e5449` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 22:47)
  ID: `notif_1773528423428_4f756552` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 22:51)
  ID: `notif_1773528718688_a78e8dba` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 22:54)
  ID: `notif_1773528844091_0769ce2f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 22:54)
  ID: `notif_1773528860809_b81fe820` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 22:57)
  ID: `notif_1773529024012_792f6162` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 23:01)
  ID: `notif_1773529281604_e8122ca3` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 23:01)
  ID: `notif_1773529298313_c266606a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 23:02)
  ID: `notif_1773529329451_1b4ab88b` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 23:07)
  ID: `notif_1773529634772_bd3d7ab4` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 23:08)
  ID: `notif_1773529719005_92c2ab47` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 23:08)
  ID: `notif_1773529735698_6daa6c9e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 23:12)
  ID: `notif_1773529940095_5a221033` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 23:15)
  ID: `notif_1773530156380_692028ff` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 23:16)
  ID: `notif_1773530173093_e0da893b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 23:17)
  ID: `notif_1773530245381_cdbdefce` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 23:22)
  ID: `notif_1773530550697_d3485650` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 23:23)
  ID: `notif_1773530593783_a19d92d3` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 23:23)
  ID: `notif_1773530610491_fdc51002` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 23:27)
  ID: `notif_1773530855991_516adcb6` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 23:30)
  ID: `notif_1773531031310_1e9f9991` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 23:30)
  ID: `notif_1773531048042_1dfc659e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 23:32)
  ID: `notif_1773531161425_c54223a7` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 23:37)
  ID: `notif_1773531466737_866b2c14` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 23:37)
  ID: `notif_1773531468717_de6c04aa` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 23:38)
  ID: `notif_1773531485457_d67cf4ca` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 23:42)
  ID: `notif_1773531772052_cc976582` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 23:45)
  ID: `notif_1773531905848_061ba32c` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 23:45)
  ID: `notif_1773531922564_f2e3e0c0` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 23:47)
  ID: `notif_1773532077348_0a59a065` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 23:52)
  ID: `notif_1773532343222_0096f3cf` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 23:52)
  ID: `notif_1773532359923_ea4828aa` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 14 23:53)
  ID: `notif_1773532382673_14695a81` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 14 23:58)
  ID: `notif_1773532688111_d5944b85` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 14 23:59)
  ID: `notif_1773532780723_448553cf` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 14 23:59)
  ID: `notif_1773532797455_f174fd6a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 00:03)
  ID: `notif_1773532993430_c33ca7d2` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 00:06)
  ID: `notif_1773533218137_291a41f6` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 00:07)
  ID: `notif_1773533234871_696e01b4` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 00:08)
  ID: `notif_1773533298748_e19b690c` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 00:13)
  ID: `notif_1773533604077_87c981ae` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 00:14)
  ID: `notif_1773533655552_be93fead` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 00:14)
  ID: `notif_1773533672296_40924a43` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 00:18)
  ID: `notif_1773533909392_571e3afc` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 00:21)
  ID: `notif_1773534092967_f006ab6e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 00:21)
  ID: `notif_1773534109686_ad1c8a6c` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 00:23)
  ID: `notif_1773534214699_9c3d7808` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 00:28)
  ID: `notif_1773534520116_770f4cc6` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 00:28)
  ID: `notif_1773534530432_afedbe35` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 00:29)
  ID: `notif_1773534547167_f3bb88ea` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 00:33)
  ID: `notif_1773534825429_6abcd846` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 00:36)
  ID: `notif_1773534967847_4f181b1a` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 00:36)
  ID: `notif_1773534984582_5c2e1a74` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 00:38)
  ID: `notif_1773535130749_061bf775` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 00:43)
  ID: `notif_1773535405236_f23ae162` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 00:43)
  ID: `notif_1773535421932_f5895069` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 00:43)
  ID: `notif_1773535436063_cbba94a1` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 00:49)
  ID: `notif_1773535741493_43650cee` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 00:50)
  ID: `notif_1773535842612_9db50567` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 00:50)
  ID: `notif_1773535859338_754cc52c` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 00:54)
  ID: `notif_1773536046965_3cd1eed0` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 00:58)
  ID: `notif_1773536280146_4da83544` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 00:58)
  ID: `notif_1773536296864_5893ffa5` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 00:59)
  ID: `notif_1773536352287_edc8a099` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 01:04)
  ID: `notif_1773536657608_aec0f660` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 01:05)
  ID: `notif_1773536717523_86f51cdd` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 01:05)
  ID: `notif_1773536734235_e8521a2e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 01:09)
  ID: `notif_1773536962924_4d4f8136` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 01:12)
  ID: `notif_1773537154903_705dee4b` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 01:12)
  ID: `notif_1773537171625_57efefc7` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 01:14)
  ID: `notif_1773537268245_f6b96446` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 01:19)
  ID: `notif_1773537573683_a3014314` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 01:19)
  ID: `notif_1773537592435_fc3797fc` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 01:20)
  ID: `notif_1773537609149_aa9efe08` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 01:24)
  ID: `notif_1773537878989_3599ac7f` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 01:27)
  ID: `notif_1773538029825_31051e16` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 01:27)
  ID: `notif_1773538046539_058c5c56` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 01:29)
  ID: `notif_1773538184307_fb988552` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 01:34)
  ID: `notif_1773538467207_e34b22a9` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 01:34)
  ID: `notif_1773538483942_31ab94ad` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 01:34)
  ID: `notif_1773538489602_e621ecbd` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 01:39)
  ID: `notif_1773538794917_bd04227b` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 01:41)
  ID: `notif_1773538904620_69038171` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 01:42)
  ID: `notif_1773538921326_7a996ad4` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 01:45)
  ID: `notif_1773539100212_aec9c928` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 01:49)
  ID: `notif_1773539342097_30384bad` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 01:49)
  ID: `notif_1773539358844_ab12ff0c` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 01:50)
  ID: `notif_1773539405616_03c4990c` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 01:55)
  ID: `notif_1773539710904_0c2a0e40` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 01:56)
  ID: `notif_1773539779534_76abd0c0` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 01:56)
  ID: `notif_1773539796267_0ee173ea` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 02:00)
  ID: `notif_1773540016220_e8cc84ba` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 02:03)
  ID: `notif_1773540216989_1d22c24b` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 02:03)
  ID: `notif_1773540233742_2885ee93` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 02:05)
  ID: `notif_1773540321654_b8c4eb27` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 02:10)
  ID: `notif_1773540627083_00d464d3` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 02:10)
  ID: `notif_1773540654490_9e30153d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 02:11)
  ID: `notif_1773540671218_0db32599` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 02:15)
  ID: `notif_1773540932548_1471d134` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 02:18)
  ID: `notif_1773541092062_d932eef1` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 02:18)
  ID: `notif_1773541108773_c3aa882f` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 02:20)
  ID: `notif_1773541237869_24940226` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 02:25)
  ID: `notif_1773541529403_13a5df60` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 15 02:25)
  ID: `notif_1773541543188_872e29f0` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 02:25)
  ID: `notif_1773541546121_bef8d361` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 02:30)
  ID: `notif_1773541848492_c9145acf` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 02:32)
  ID: `notif_1773541966788_124eded4` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 02:33)
  ID: `notif_1773541983511_6a73563c` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 02:35)
  ID: `notif_1773542153804_7acb0e89` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 02:40)
  ID: `notif_1773542404173_c44ef443` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 02:40)
  ID: `notif_1773542420888_330bdc15` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 02:40)
  ID: `notif_1773542459099_b1480921` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 02:46)
  ID: `notif_1773542764548_c8bf5873` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 02:47)
  ID: `notif_1773542841691_0bf226c1` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 02:47)
  ID: `notif_1773542858434_57477f27` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 02:51)
  ID: `notif_1773543069834_be2ef165` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 02:54)
  ID: `notif_1773543279116_963b4fe9` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 02:54)
  ID: `notif_1773543295829_c99ac6b6` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 02:56)
  ID: `notif_1773543375154_7b5e404b` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 03:01)
  ID: `notif_1773543680473_d211e157` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 03:01)
  ID: `notif_1773543716532_fc32d9ee` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 03:02)
  ID: `notif_1773543733269_05a67224` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 03:06)
  ID: `notif_1773543985795_786fbbe7` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 03:09)
  ID: `notif_1773544153990_da68780b` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 03:09)
  ID: `notif_1773544170716_ed0a81ac` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 03:11)
  ID: `notif_1773544291229_cd78d6b8` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 03:16)
  ID: `notif_1773544591421_4768e976` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 15 03:16)
  ID: `notif_1773544596557_1eddacb0` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 03:16)
  ID: `notif_1773544608048_222cd91e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 03:21)
  ID: `notif_1773544901876_dd2dca56` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 03:23)
  ID: `notif_1773545028742_891c429a` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 03:24)
  ID: `notif_1773545045475_7088a4a9` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 03:26)
  ID: `notif_1773545207198_dabef497` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 03:31)
  ID: `notif_1773545466150_2dab20d7` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 03:31)
  ID: `notif_1773545482890_efea6b10` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 03:31)
  ID: `notif_1773545512523_2ae06bdd` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 03:36)
  ID: `notif_1773545817846_acb6a936` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 03:38)
  ID: `notif_1773545903567_7adb9bb9` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 03:38)
  ID: `notif_1773545920271_95dadf27` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 03:42)
  ID: `notif_1773546123252_6aedd543` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 03:45)
  ID: `notif_1773546341044_76fca4f3` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 03:45)
  ID: `notif_1773546357726_f56a0146` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 03:47)
  ID: `notif_1773546428562_8f9c3272` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 03:52)
  ID: `notif_1773546733862_d6c5e920` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 03:52)
  ID: `notif_1773546778356_5c5cb9c8` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 03:53)
  ID: `notif_1773546794927_73ed65cb` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 03:57)
  ID: `notif_1773547039175_a423d9be` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 04:00)
  ID: `notif_1773547215604_06363b17` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 04:00)
  ID: `notif_1773547232320_0d8854f5` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 04:02)
  ID: `notif_1773547344490_dcc683ae` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 04:07)
  ID: `notif_1773547649884_aef2d572` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 04:07)
  ID: `notif_1773547653095_4f32b3aa` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 04:07)
  ID: `notif_1773547669816_05fafc39` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 04:12)
  ID: `notif_1773547955201_ebc34d70` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 04:14)
  ID: `notif_1773548090473_f37c97eb` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 04:15)
  ID: `notif_1773548107057_0f298260` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 04:17)
  ID: `notif_1773548260499_a3b66f48` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 04:22)
  ID: `notif_1773548527697_8ff6b74f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 04:22)
  ID: `notif_1773548544433_937d6e2f` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 04:22)
  ID: `notif_1773548565810_aea993f7` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 04:27)
  ID: `notif_1773548871131_1417211f` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 04:29)
  ID: `notif_1773548965123_ecc63327` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 04:29)
  ID: `notif_1773548981816_906f759d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 04:32)
  ID: `notif_1773549176444_e8d4660c` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 04:36)
  ID: `notif_1773549402563_74e3de60` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 04:36)
  ID: `notif_1773549419254_17ceb9b4` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 04:38)
  ID: `notif_1773549481881_fc748b50` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 04:43)
  ID: `notif_1773549787201_004bd7e2` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 04:43)
  ID: `notif_1773549839944_5b3076cf` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 04:44)
  ID: `notif_1773549856668_015d4094` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 04:48)
  ID: `notif_1773550092520_cc9e684f` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 04:51)
  ID: `notif_1773550277354_edb2f527` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 04:51)
  ID: `notif_1773550294069_728fb70a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 04:53)
  ID: `notif_1773550397839_dd21f988` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 04:58)
  ID: `notif_1773550703152_92bef22d` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 04:58)
  ID: `notif_1773550714735_0bfb8f3b` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 04:58)
  ID: `notif_1773550731449_667cf406` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 05:03)
  ID: `notif_1773551008624_40a5875b` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 05:05)
  ID: `notif_1773551152268_f0731737` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 05:06)
  ID: `notif_1773551168995_ebc739da` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 05:08)
  ID: `notif_1773551313944_a43f7280` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 05:13)
  ID: `notif_1773551589683_a7136e15` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 05:13)
  ID: `notif_1773551606385_0dad3ddd` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 05:13)
  ID: `notif_1773551619266_7f819376` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 05:18)
  ID: `notif_1773551924576_948ed11b` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 05:20)
  ID: `notif_1773552027067_4c0d583f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 05:20)
  ID: `notif_1773552043784_7bda3e66` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 05:23)
  ID: `notif_1773552229850_6e100cd0` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 05:27)
  ID: `notif_1773552464453_96242cf4` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 05:28)
  ID: `notif_1773552481170_612fef97` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 05:28)
  ID: `notif_1773552535168_17224d55` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 05:34)
  ID: `notif_1773552840605_a67895ba` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 05:35)
  ID: `notif_1773552901979_027de604` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 05:35)
  ID: `notif_1773552918574_f0352e46` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 05:39)
  ID: `notif_1773553145910_31d65d76` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 05:42)
  ID: `notif_1773553339278_1a1f76db` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 05:42)
  ID: `notif_1773553355991_d3d27bb2` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 05:44)
  ID: `notif_1773553451215_60f3134d` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 05:49)
  ID: `notif_1773553756529_789d10f4` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 05:49)
  ID: `notif_1773553776665_596aef1d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 05:49)
  ID: `notif_1773553793372_2ebb9567` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 05:54)
  ID: `notif_1773554061844_c5efd7b7` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 05:56)
  ID: `notif_1773554214050_38117e9a` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 05:57)
  ID: `notif_1773554230794_a90d1500` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 05:59)
  ID: `notif_1773554367275_790f0bb7` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 06:04)
  ID: `notif_1773554651590_d0d6617d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 06:04)
  ID: `notif_1773554668308_1558e1e0` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 06:04)
  ID: `notif_1773554672587_adf23544` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 06:09)
  ID: `notif_1773554977903_2dd17982` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 06:11)
  ID: `notif_1773555088981_e1836d82` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 06:11)
  ID: `notif_1773555105669_0ac29c57` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 06:14)
  ID: `notif_1773555283229_e89aa7d1` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 06:18)
  ID: `notif_1773555526330_a91ba67b` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 06:19)
  ID: `notif_1773555543036_21253f65` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 06:19)
  ID: `notif_1773555588543_7d6ccb05` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 06:24)
  ID: `notif_1773555893857_9811c2f9` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 06:26)
  ID: `notif_1773555963850_8612ad26` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 06:26)
  ID: `notif_1773555980582_80fd3268` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 06:29)
  ID: `notif_1773556199288_bb9aa25e` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 06:33)
  ID: `notif_1773556401262_d4c5b5ca` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 06:33)
  ID: `notif_1773556417987_936d6030` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 06:35)
  ID: `notif_1773556504609_c179144d` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 06:40)
  ID: `notif_1773556809936_fb9c00a4` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 06:40)
  ID: `notif_1773556838673_497e3381` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 06:40)
  ID: `notif_1773556855355_10312e3f` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 06:45)
  ID: `notif_1773557115218_6787e7d6` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 06:47)
  ID: `notif_1773557276025_40db9127` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 06:48)
  ID: `notif_1773557292732_46b37a99` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 06:50)
  ID: `notif_1773557420531_b9eac362` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 06:55)
  ID: `notif_1773557713521_9b3a7508` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 15 06:55)
  ID: `notif_1773557725973_d062d531` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 06:55)
  ID: `notif_1773557730236_00f0ddaa` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 07:00)
  ID: `notif_1773558031270_ed2cd64a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 07:02)
  ID: `notif_1773558150914_f1c944ed` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 07:02)
  ID: `notif_1773558167635_2d3f7d79` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 07:05)
  ID: `notif_1773558336594_81f9aaf5` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 07:09)
  ID: `notif_1773558588326_2fd4f29c` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 07:10)
  ID: `notif_1773558605037_fb339a0b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 07:10)
  ID: `notif_1773558641908_3e76a6d9` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 07:15)
  ID: `notif_1773558947209_92307626` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 07:17)
  ID: `notif_1773559025714_955393f3` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 07:17)
  ID: `notif_1773559042446_4bc4a822` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 07:20)
  ID: `notif_1773559252528_feb30931` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 07:24)
  ID: `notif_1773559463247_4ffb8d15` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 07:24)
  ID: `notif_1773559479979_c01ba15b` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 07:25)
  ID: `notif_1773559557957_0ae67988` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 07:31)
  ID: `notif_1773559863264_cfb1d86c` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 07:31)
  ID: `notif_1773559900662_ff5233bb` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 07:31)
  ID: `notif_1773559917398_b21f36c1` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 07:36)
  ID: `notif_1773560168589_eff7d479` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 07:38)
  ID: `notif_1773560338077_1e26a29d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 07:39)
  ID: `notif_1773560354822_663c2c6c` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 07:41)
  ID: `notif_1773560473897_3a1e0937` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 07:46)
  ID: `notif_1773560775493_e3ab099d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 15 07:46)
  ID: `notif_1773560779218_eb060ca1` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 07:46)
  ID: `notif_1773560792234_1ea6b433` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 07:51)
  ID: `notif_1773561084618_3898da6e` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 07:53)
  ID: `notif_1773561213028_7b609f03` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 07:53)
  ID: `notif_1773561229766_bd81ccd8` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 07:56)
  ID: `notif_1773561390064_cc373565` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 08:00)
  ID: `notif_1773561650408_442159f3` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 08:01)
  ID: `notif_1773561667150_83cf56e7` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 08:01)
  ID: `notif_1773561695384_371e6829` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 08:06)
  ID: `notif_1773562000877_00cc3d0e` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 08:08)
  ID: `notif_1773562087620_7c94a0b8` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 08:08)
  ID: `notif_1773562104335_0d60484c` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 08:11)
  ID: `notif_1773562306189_03ac339a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 08:15)
  ID: `notif_1773562525003_e4809999` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 08:15)
  ID: `notif_1773562541649_7fe03db5` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 08:16)
  ID: `notif_1773562611491_43bcce93` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 08:21)
  ID: `notif_1773562916912_fa8ff563` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 08:22)
  ID: `notif_1773562962417_630c66ea` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 08:22)
  ID: `notif_1773562979105_e6a24dba` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 08:27)
  ID: `notif_1773563222075_0e34c630` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 08:29)
  ID: `notif_1773563399801_f574b95d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 08:30)
  ID: `notif_1773563416514_6ee8b182` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 08:32)
  ID: `notif_1773563527385_4f873116` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 08:37)
  ID: `notif_1773563832672_87afc699` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 08:37)
  ID: `notif_1773563837186_b8be1df7` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 08:37)
  ID: `notif_1773563853896_969fdb70` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 08:42)
  ID: `notif_1773564137983_cab6ee97` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 08:44)
  ID: `notif_1773564274567_0a33633a` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 08:44)
  ID: `notif_1773564291316_fdd02f42` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 08:47)
  ID: `notif_1773564443414_16693546` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 08:51)
  ID: `notif_1773564712107_2d4e2fc4` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 08:52)
  ID: `notif_1773564728831_22b79583` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 08:52)
  ID: `notif_1773564748712_7ac90064` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 08:57)
  ID: `notif_1773565054025_35f6a321` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 08:59)
  ID: `notif_1773565149512_f68c814f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 08:59)
  ID: `notif_1773565166254_bad30075` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 09:02)
  ID: `notif_1773565359323_05fbfac6` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 09:06)
  ID: `notif_1773565586912_d09605fd` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 09:06)
  ID: `notif_1773565603640_501adb7f` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 09:07)
  ID: `notif_1773565664642_b1c0b7a2` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 09:12)
  ID: `notif_1773565970081_bbf2c1ad` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 09:13)
  ID: `notif_1773566024470_4efdc8bb` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 09:14)
  ID: `notif_1773566041187_fcb41d58` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 09:17)
  ID: `notif_1773566275385_97f0c4f2` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 09:21)
  ID: `notif_1773566461862_e6cc63e7` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 09:21)
  ID: `notif_1773566478554_bdae3c36` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 09:23)
  ID: `notif_1773566580710_05008cb8` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 09:28)
  ID: `notif_1773566886026_9b8363ad` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 09:28)
  ID: `notif_1773566899237_b6e78eaa` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 09:28)
  ID: `notif_1773566915951_861413c0` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 09:33)
  ID: `notif_1773567191348_8b794652` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 09:35)
  ID: `notif_1773567336619_1dc7b6ba` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 09:35)
  ID: `notif_1773567353334_787fb1aa` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 09:38)
  ID: `notif_1773567496671_677b8532` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 09:42)
  ID: `notif_1773567774112_38d41d6d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 09:43)
  ID: `notif_1773567790852_fbd6f74e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 09:43)
  ID: `notif_1773567802093_19593c3a` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 09:48)
  ID: `notif_1773568107412_4ea71483` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 09:50)
  ID: `notif_1773568211528_eb46cb82` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 09:50)
  ID: `notif_1773568228260_cb35be5f` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 09:53)
  ID: `notif_1773568412732_90892533` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 09:57)
  ID: `notif_1773568648936_955c96aa` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 09:57)
  ID: `notif_1773568665649_76a12eb3` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 09:58)
  ID: `notif_1773568718046_b2688652` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 10:03)
  ID: `notif_1773569023379_9ff5fbb4` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 10:04)
  ID: `notif_1773569086342_a712612d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 10:05)
  ID: `notif_1773569102908_41ca223e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 10:08)
  ID: `notif_1773569328693_8bef7ac1` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 10:12)
  ID: `notif_1773569523711_ad2596e3` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 10:12)
  ID: `notif_1773569540423_930556e3` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 10:13)
  ID: `notif_1773569634130_c6ddda9d` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 10:18)
  ID: `notif_1773569939427_207107e7` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 10:19)
  ID: `notif_1773569961106_c73aff8d` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 10:19)
  ID: `notif_1773569977841_afc4cdaa` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 10:24)
  ID: `notif_1773570244738_df001ec0` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 10:26)
  ID: `notif_1773570398521_7a0487a9` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 10:26)
  ID: `notif_1773570415251_a206ce35` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 10:29)
  ID: `notif_1773570550055_647b18d2` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 10:33)
  ID: `notif_1773570835930_f6f97272` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 10:34)
  ID: `notif_1773570852648_6d3e65a3` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 10:34)
  ID: `notif_1773570855377_08e49112` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 10:39)
  ID: `notif_1773571160835_19be080d` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 10:41)
  ID: `notif_1773571273465_9b704de1` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 10:41)
  ID: `notif_1773571290190_5d003d48` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 10:44)
  ID: `notif_1773571466150_02bd1f96` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 10:48)
  ID: `notif_1773571710858_e2d1ea33` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 10:48)
  ID: `notif_1773571727598_a587335a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 10:49)
  ID: `notif_1773571771470_7ba790e8` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 10:54)
  ID: `notif_1773572076791_468f152d` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 10:55)
  ID: `notif_1773572148272_2dae92e8` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 10:56)
  ID: `notif_1773572164992_efc6d3ce` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 10:59)
  ID: `notif_1773572382108_2800d89e` — Gateway is down and auto-restart failed. Check manually.

- **Recovery Failed** (_system_, Mar 15 11:00)
  ID: `notif_1773572413868_a449ef8b` — Gateway did not start. Manual intervention needed.

- **🔴 Alfred Down** (_system_, Mar 15 11:03)
  ID: `notif_1773572585655_c59f5ab9` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 11:03)
  ID: `notif_1773572602365_201dea4f` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 11:04)
  ID: `notif_1773572687424_8758ebfd` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 11:09)
  ID: `notif_1773572992885_18df3958` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 11:10)
  ID: `notif_1773573023183_b28331de` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 11:10)
  ID: `notif_1773573039882_77ba3c67` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 11:14)
  ID: `notif_1773573298196_e39423be` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 11:17)
  ID: `notif_1773573460529_b6d3cd64` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 11:17)
  ID: `notif_1773573477271_adf6b65e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 11:20)
  ID: `notif_1773573603519_5657cd97` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 11:24)
  ID: `notif_1773573897953_64426e76` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 15 11:25)
  ID: `notif_1773573908834_a367c586` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 11:25)
  ID: `notif_1773573914549_69220329` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 11:30)
  ID: `notif_1773574214158_4944949a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 11:32)
  ID: `notif_1773574335233_8e658864` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 11:32)
  ID: `notif_1773574351946_77c2ee11` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 11:35)
  ID: `notif_1773574519569_28c6d475` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 11:39)
  ID: `notif_1773574772707_0e0eee15` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 11:39)
  ID: `notif_1773574789421_7057855f` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 11:40)
  ID: `notif_1773574824861_c63586bb` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 11:45)
  ID: `notif_1773575130147_5b604f18` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 11:46)
  ID: `notif_1773575210098_5c5934c3` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 11:47)
  ID: `notif_1773575226805_3af1fe3d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 11:50)
  ID: `notif_1773575435463_c427519a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 11:54)
  ID: `notif_1773575647480_0f3b619f` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 11:54)
  ID: `notif_1773575664211_d4934085` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 11:55)
  ID: `notif_1773575740770_e2676c1a` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 12:00)
  ID: `notif_1773576046075_01c244d7` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 12:01)
  ID: `notif_1773576085032_fa3285ff` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 12:01)
  ID: `notif_1773576101755_661007e9` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 12:05)
  ID: `notif_1773576351526_bc7a0c22` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 12:08)
  ID: `notif_1773576522436_ad147046` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 12:08)
  ID: `notif_1773576539145_8df09655` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 12:10)
  ID: `notif_1773576656847_63a536c1` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 12:15)
  ID: `notif_1773576959839_3820766a` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Gateway Down** (_system_, Mar 15 12:16)
  ID: `notif_1773576962136_2c080af4` — Gateway is down and auto-restart failed. Check manually.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 12:16)
  ID: `notif_1773576976440_9b22fd8e` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 12:21)
  ID: `notif_1773577267453_58287a12` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 12:23)
  ID: `notif_1773577397123_77b218f4` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 12:23)
  ID: `notif_1773577413821_e7ba6600` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 12:26)
  ID: `notif_1773577572764_ac109e06` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 12:30)
  ID: `notif_1773577834581_3b087257` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 12:30)
  ID: `notif_1773577851295_2972d497` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 12:31)
  ID: `notif_1773577878171_147b83d6` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 12:36)
  ID: `notif_1773578183491_bda628e6` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 12:37)
  ID: `notif_1773578271966_224708ea` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 12:38)
  ID: `notif_1773578288528_53454538` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 12:41)
  ID: `notif_1773578488768_b66f3aeb` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 12:45)
  ID: `notif_1773578709070_02a3d7f1` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 12:45)
  ID: `notif_1773578725807_ef127663` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 12:46)
  ID: `notif_1773578794072_0a14d38c` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 12:51)
  ID: `notif_1773579099347_07ee2f43` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 12:52)
  ID: `notif_1773579146489_cf75d7b0` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 12:52)
  ID: `notif_1773579163204_3ff90a2f` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 12:56)
  ID: `notif_1773579404662_b312c717` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 12:59)
  ID: `notif_1773579584005_cbd4631e` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **Even Us Up: monetization sprint or maintenance mode?** (_question_, Mar 15 13:00)
  ID: `notif_1773579600388_6ce7ae70` — Even Us Up has been running. Is it growing naturally or on life support? Should I explore monetization (paid tier, B2B) or keep the lights on at minim...

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 13:00)
  ID: `notif_1773579600595_721039d0` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 13:01)
  ID: `notif_1773579710097_ac6244ad` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 13:06)
  ID: `notif_1773580015411_1c8ae0cc` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 13:07)
  ID: `notif_1773580021288_92740dfe` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 13:07)
  ID: `notif_1773580038016_139156a8` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 13:12)
  ID: `notif_1773580320725_6fffa90d` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 13:14)
  ID: `notif_1773580458697_030b6502` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 13:14)
  ID: `notif_1773580475428_175850cd` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 13:17)
  ID: `notif_1773580626039_6092ec2b` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 13:21)
  ID: `notif_1773580896046_e7b02fe1` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 13:21)
  ID: `notif_1773580912774_6eb1a1a1` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 13:22)
  ID: `notif_1773580931347_9b443835` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 13:27)
  ID: `notif_1773581236784_d0dcf039` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 13:28)
  ID: `notif_1773581333615_d847da5b` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 13:29)
  ID: `notif_1773581350347_682f89ea` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 13:32)
  ID: `notif_1773581542106_c98bb189` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 13:36)
  ID: `notif_1773581771021_444137da` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 13:36)
  ID: `notif_1773581787751_f72ffaf0` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 13:37)
  ID: `notif_1773581847429_45502c09` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 13:42)
  ID: `notif_1773582152751_796bb9ee` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 13:43)
  ID: `notif_1773582208461_3f63eb35` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 13:43)
  ID: `notif_1773582225106_db8a7aef` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 13:47)
  ID: `notif_1773582458073_8284f647` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 13:50)
  ID: `notif_1773582645787_94ad0287` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 13:51)
  ID: `notif_1773582662491_ef88e150` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 13:52)
  ID: `notif_1773582763398_d726df8a` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 13:57)
  ID: `notif_1773583069019_a8f1606e` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 13:58)
  ID: `notif_1773583083199_8f1ea592` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 13:58)
  ID: `notif_1773583099826_dbcc116c` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 14:02)
  ID: `notif_1773583374361_261411cc` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 14:05)
  ID: `notif_1773583520542_dc3e0672` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 14:05)
  ID: `notif_1773583537248_37eb5188` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 14:07)
  ID: `notif_1773583679693_9f9e35f8` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 14:12)
  ID: `notif_1773583958004_bd1982e5` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 14:12)
  ID: `notif_1773583974751_006c8745` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 14:13)
  ID: `notif_1773583984980_af013b9b` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 14:18)
  ID: `notif_1773584290292_92b12d37` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 14:19)
  ID: `notif_1773584395442_48596362` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 14:20)
  ID: `notif_1773584412141_3c7a6514` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 14:23)
  ID: `notif_1773584595674_fb597764` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 14:27)
  ID: `notif_1773584832904_97152004` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 14:27)
  ID: `notif_1773584849618_58a98f66` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 14:28)
  ID: `notif_1773584900981_12eb18df` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 14:33)
  ID: `notif_1773585206276_e5d56c1a` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 14:34)
  ID: `notif_1773585270303_3458aeab` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 14:34)
  ID: `notif_1773585287044_8df19f2a` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 14:38)
  ID: `notif_1773585511589_b7bbad97` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 14:41)
  ID: `notif_1773585707728_96597a05` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 14:42)
  ID: `notif_1773585724465_76cc4470` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 14:43)
  ID: `notif_1773585816911_e7bbb4d5` — Gateway is down and auto-restart failed. Check manually.

- **Gateway Down** (_system_, Mar 15 14:48)
  ID: `notif_1773586122223_7d5d4c7c` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 14:49)
  ID: `notif_1773586145131_49885fd0` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 14:49)
  ID: `notif_1773586161856_bad1b68d` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 14:53)
  ID: `notif_1773586427698_9f6f5ae7` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 14:56)
  ID: `notif_1773586582676_ef691ad4` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 14:56)
  ID: `notif_1773586599420_8d1d0481` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 14:58)
  ID: `notif_1773586733021_a40df5e6` — Gateway is down and auto-restart failed. Check manually.

- **🔴 Alfred Down** (_system_, Mar 15 15:03)
  ID: `notif_1773587020059_b8242fab` — Alfred gateway is confirmed down. HAL is attempting recovery.

- **🚨 Alfred Recovery Failed** (_system_, Mar 15 15:03)
  ID: `notif_1773587036794_75a2aa64` — Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw,...

- **Gateway Down** (_system_, Mar 15 15:03)
  ID: `notif_1773587038342_23649e0e` — Gateway is down and auto-restart failed. Check manually.

- **Cron Auto-Disabled** (_system_, Mar 15 16:14)
  ID: `notif_1773591242490_4c82a76a` — Daily Config & Memory Review: 3 consecutive failures — auto-disabled

- **Cron Auto-Disabled** (_system_, Mar 15 16:14)
  ID: `notif_1773591242502_7c2b1c62` — Evening Routine: 3 consecutive failures — auto-disabled

- **Cron Auto-Disabled** (_system_, Mar 15 16:14)
  ID: `notif_1773591242522_04bf2c00` — Daily Update Check: 3 consecutive failures — auto-disabled

- **Cron Auto-Disabled** (_system_, Mar 15 16:14)
  ID: `notif_1773591242535_05ff30a0` — Nightly Git Commit: 3 consecutive failures — auto-disabled

- **Session Auto-Reset** (_system_, Mar 15 16:44)
  ID: `notif_1773593094658_541902ea` — Main session was at 85%+ context. Auto-reset and gateway restarted.

- **Cron Auto-Disabled** (_system_, Mar 15 18:04)
  ID: `notif_1773597849360_12cb2350` — Daily Config & Memory Review: 3 consecutive failures — auto-disabled

- **Cron Auto-Disabled** (_system_, Mar 15 18:04)
  ID: `notif_1773597849368_b17c1ca0` — Evening Routine: 3 consecutive failures — auto-disabled

- **Cron Auto-Disabled** (_system_, Mar 15 18:04)
  ID: `notif_1773597849379_03ae8442` — Daily Update Check: 3 consecutive failures — auto-disabled

- **Cron Auto-Disabled** (_system_, Mar 15 18:04)
  ID: `notif_1773597849391_946bc5bb` — Nightly Git Commit: 3 consecutive failures — auto-disabled

- **Alfred has a question** (_--help_, Mar 15 20:00)
  ID: `notif_1773604853300_6abbb116` — No details provided
<!-- PENDING-Q-END -->

---

**For details on earlier phases:** See MEMORY.md section "Utilization Fix" and hal-idle-dispatch logs.
