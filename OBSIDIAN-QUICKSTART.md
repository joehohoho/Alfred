# Obsidian Integration — Quick Start (5 min guide)

**Status:** ✅ Ready to use right now  
**Time to open:** 30 seconds  
**Time to explore:** 5-10 minutes

---

## 🚀 Open Obsidian (30 seconds)

**Option 1: From command line**
```bash
open -a Obsidian ~/.openclaw/workspace
```

**Option 2: Manual**
1. Open Applications → Obsidian
2. File → "Open folder as vault"
3. Select: `~/.openclaw/workspace`
4. Click "Open"

---

## 📚 What You'll See

When Obsidian opens, you'll see:
- **Left sidebar:** File explorer (folders + files)
- **Center:** Current file content
- **Right sidebar:** Graph view, backlinks, outline

### Navigation (left sidebar)
- `Projects/` — Your 3 active projects
  - CoinUsUp (trial blocker, revenue generation)
  - Even-Us-Up (growth stalled, needs prioritization)
  - Signal-App (market opportunity, public vs. internal decision)
- `Blockers/` — All current blockers (5 total; 2 critical)
- `Decisions/` — 5 open decisions + recommendations

---

## 👀 What to Look At (In Order)

### 1. The Blockers (Read first — 2 min)
1. Left sidebar → `Blockers/` → click `Active.md`
2. Scroll down → see impact matrix
3. **Key insight:** Stripe config is the #1 priority (19 days waiting; blocks all CoinUsUp revenue)

### 2. The Decisions (Read second — 3 min)
1. Left sidebar → `Decisions/` → click `Open.md`
2. Read Decision 1 (Stripe config) + Decision 2 (Bill Review scope)
3. **Key insight:** These 2 decisions are blocking everything else

### 3. Your Projects (Deep dive — 5 min)
1. Left sidebar → `Projects/`
2. Click `CoinUsUp.md` → see growth audit findings + trial blocker
3. Click `Even-Us-Up.md` → see why execution is stalled (needs priority)
4. Click `Signal-App.md` → see market opportunity + decision needed

### 4. The Graph (Visual map — optional)
1. Right sidebar → "Graph view" (or Cmd+Shift+G)
2. Zoom out to see full picture
3. Notice how Stripe blocker connects to CoinUsUp + other projects
4. **Key insight:** One Stripe decision unblocks multiple projects

---

## 🎯 What You Should Do Right Now

**5-min action items:**

1. **Stripe Config (5 min)** — Highest priority
   - Read: [[Decisions/Open]] → Decision 1 (Stripe Config)
   - Action: Configure 12 Stripe prices with trial_period_days=14
   - Payoff: CoinUsUp trial launches → revenue generation begins

2. **Bill Review Scope (1-2 min to decide)**
   - Read: [[Decisions/Open]] → Decision 2 (Bill Review MVP)
   - Decide: A (personal tool) or B (commercial SaaS)?
   - Impact: Code is ready; just need scope clarification

3. **Even Us Up Priority (3-5 min to decide)**
   - Read: [[Projects/Even-Us-Up]]
   - Decide: Top-3 priority for Q2? Which Phase 1 friction to fix?
   - Impact: Product is ready; 23-day execution gap waiting on prioritization

---

## 🔍 How to Search

**Find all mentions of "Stripe":**
- Press: Cmd+Shift+F (or Ctrl+Shift+F on Windows/Linux)
- Type: "Stripe"
- See: All files mentioning Stripe
- Click any result to jump there

**Find all "CoinUsUp" context:**
- Search: "CoinUsUp"
- Results include: Blocker, decision, project file, audit findings
- See the whole ecosystem at once

---

## 🗺️ File Structure (What's New)

```
Projects/
├── CoinUsUp.md          ← Trial feature + Stripe blocker
├── Even-Us-Up.md        ← Growth stalled; needs prioritization
└── Signal-App.md        ← Market opportunity; public vs. internal

Blockers/
└── Active.md            ← 5 blockers with impact matrix

Decisions/
└── Open.md              ← 5 decisions with recommendations
```

---

## 💡 Key Insights

**Why this matters:**
1. **Speed:** Find relevant memory in 30 seconds (was 10+ minutes)
2. **Clarity:** See how decisions block projects (visual graph)
3. **Completeness:** All context in one place (projects + blockers + decisions)

**Expected benefit:**
- Session startup: 10+ min → 2-3 min (via graph navigation)
- Decision-making: Context scattered → unified
- Pattern recognition: Manual → visual (graph shows relationships)

---

## 🎓 Features You Can Use

| Feature | How | When |
|---------|-----|------|
| **Graph view** | Right sidebar → "Graph view" | See full picture at once |
| **Search** | Cmd+Shift+F | Find any topic instantly |
| **Backlinks** | Right sidebar → "Backlinks" | See what links to current file |
| **Quick navigation** | Click `[[link]]` | Jump between related files |
| **File explorer** | Left sidebar | Browse folders + files |
| **Outline** | Right sidebar → "Outline" | Jump to sections in long files |

---

## ❓ Questions?

**If you want to:**
- **Change theme:** Obsidian settings → Appearance
- **Enable daily notes:** Settings → Daily notes (optional)
- **Add more projects:** Create new files in `Projects/` folder
- **Track progress:** Update `Projects/CoinUsUp.md` when Stripe config done

All files are regular markdown; you can edit them in Obsidian or any text editor.

---

## ✅ Next Steps

1. **Now:** Open Obsidian (30 sec)
2. **Then:** Read Blockers/Active.md (2 min)
3. **Then:** Read Decisions/Open.md (3 min)
4. **Then:** Check your projects (5 min)
5. **Then:** Start unblocking! 🚀

---

**Created:** 2026-04-13 14:08 ADT  
**Time to read this guide:** ~3 minutes  
**Time to open Obsidian:** 30 seconds  
**Total time to get started:** < 5 minutes
