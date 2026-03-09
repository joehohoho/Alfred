# LegalBillAI — Next Steps (Resume Here)

**Last updated:** 2026-03-09 13:45 ADT  
**Status:** ✅ Option C implemented, economics analyzed  
**Next action:** Firebase setup + deployment  

---

## What Was Done (Session 2026-03-09)

✅ **Implemented Option C (Email-based free tier tracking)**
- Created `lib/db.ts` — Server-side audit counting per email
- Updated `app/audit/page.tsx` — Email required, real-time remaining audits display
- Created `app/api/audit-count/route.ts` — Check remaining audits endpoint
- Enhanced `app/api/analyze/route.ts` — Increment count on successful audit
- Created `lib/fingerprint.ts` — Optional secondary fraud detection

✅ **Economics & Break-Even Analysis**
- See: `/Users/hopenclaw/legal-bill-ai/ECONOMICS.md` (detailed cost breakdown)
- **Key finding:** Break-even at <1 paid customer (0.54 customers)
- **Free-to-paid conversion:** 2-4% realistic for legal tech
- **Q2 target ($500/mo):** Needs 10-11 customers = 500-550 free trial users
- **Timeline to $500/mo:** 6-8 weeks with organic outreach

---

## Your Q2 Goal

**Target:** $500/month passive income by June 30  
**Strategy:** LegalBillAI (over CoinUsUp, deferred to later)  
**Reasoning:** Already built, semi-passive, clear ROI for customers, lower effort

---

## NEXT STEPS (In Order)

### Step 1: Firebase Setup (5 minutes)
**Do this first:**

1. Go to https://console.firebase.google.com/
2. Create a new project (or use existing)
3. Create a **Realtime Database** (free tier)
4. Set location: `us-central1` (or closest to you)
5. Start in **test mode** (read/write open, change rules later)
6. Copy the **Database URL** from settings (looks like `https://your-project.firebaseio.com`)

**Update `.env.local`:**
```bash
cd /Users/hopenclaw/legal-bill-ai
# Copy the example
cp .env.local.example .env.local

# Edit .env.local and add Firebase URL:
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

### Step 2: Firebase Security Rules (5 minutes)
**In Firebase Console, go to Database → Rules and paste:**

```json
{
  "rules": {
    "audits": {
      "$email": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['email', 'count', 'dateFirst', 'dateLast'])"
      }
    }
  }
}
```

Click **Publish** ✅

### Step 3: Test Locally (5 minutes)
```bash
cd /Users/hopenclaw/legal-bill-ai

# Install dependencies (if not done)
npm install

# Run locally
npm run dev

# Visit http://localhost:3000/audit
# Try uploading an invoice and entering email
# You should see "You have 3 free audits remaining"

# Run 3 times, verify counter goes to 0
# Then try a 4th time, verify upgrade prompt appears
```

### Step 4: Deploy to Vercel (5 minutes)
**Prerequisites:**
- Code pushed to GitHub
- Vercel account created at https://vercel.com

**Steps:**
1. Go to https://vercel.com
2. Click "New Project"
3. Select your `legal-bill-ai` repo from GitHub
4. In **Environment Variables**, add:
   - `ANTHROPIC_API_KEY` (from https://console.anthropic.com/)
   - `FIREBASE_DATABASE_URL` (from Firebase console)
   - `STRIPE_PUBLISHABLE_KEY` (from Stripe, if billing ready)
   - `STRIPE_SECRET_KEY` (from Stripe, if billing ready)
5. Click **Deploy** ✅

**Live URL will be something like:** `legal-bill-ai-xyz.vercel.app`

---

## Step 5: Stripe Integration (15 minutes, optional for now)

**Skip this if you want to launch first without payments.**

If you do it:
1. Go to https://dashboard.stripe.com/
2. Create account or log in
3. Create product: "LegalBillAI Professional" at $49/month
4. Copy **Price ID** (starts with `price_`)
5. Add to `.env.local`:
   ```
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PRICE_ID=price_...
   ```
6. Redeploy to Vercel

---

## Step 6: Launch Outreach (Start 1-2 weeks after deployment)

**Cold outreach targets:**
- LinkedIn: Legal Operations groups, General Counsel
- Reddit: r/legalops, r/BigLaw
- Email: Direct to GCs at law firms + corporations
- Slack: Lawyerist community, legal ops groups

**Timeline:**
- Week 1-2 post-deploy: Soft launch, test with 1-2 beta users
- Week 3+: Start active outreach (LinkedIn posts, Reddit, email)
- Week 6-8: Should have 10-15 free users trialing
- Week 8-10: First paid conversions landing
- **By April 15-30:** Hit $500/mo (10 customers)

**Pre-written templates (ask when ready):**
- LinkedIn launch post
- Cold email sequence (for GCs)
- Reddit post for legal ops communities
- Paid landing page copy

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `/Users/hopenclaw/legal-bill-ai/ECONOMICS.md` | Full cost/revenue analysis (read this if you have questions) |
| `/Users/hopenclaw/legal-bill-ai/lib/db.ts` | Database layer (supports Firebase + file storage) |
| `/Users/hopenclaw/legal-bill-ai/app/audit/page.tsx` | Audit UI (email required, real-time counter) |
| `/Users/hopenclaw/legal-bill-ai/app/api/analyze/route.ts` | Analysis endpoint (increments count, checks limit) |
| `/Users/hopenclaw/legal-bill-ai/README.md` | Original setup guide |

---

## Checklist (Copy-Paste When Ready)

```
FIREBASE SETUP:
  [ ] Create Firebase project
  [ ] Create Realtime Database (free tier)
  [ ] Copy database URL
  [ ] Add FIREBASE_DATABASE_URL to .env.local
  [ ] Set security rules (copy-paste from Step 2)
  [ ] Publish rules

LOCAL TESTING:
  [ ] npm install
  [ ] npm run dev
  [ ] Test free audit (3x works, 4x shows upgrade)
  [ ] Verify counter in Firebase console

DEPLOYMENT:
  [ ] Push code to GitHub
  [ ] Connect Vercel project
  [ ] Add env vars (ANTHROPIC_API_KEY, FIREBASE_DATABASE_URL)
  [ ] Deploy
  [ ] Test live URL

OPTIONAL (LATER):
  [ ] Stripe setup (if you want payments enabled immediately)
  [ ] Analytics tracking (Google Analytics, Segment)
  [ ] Email notifications (SendGrid, etc.)
```

---

## Time Estimate

- **Firebase + local testing:** 15 minutes
- **Vercel deployment:** 5 minutes
- **Total setup time:** ~20 minutes
- **First revenue:** 6-8 weeks after launch (with outreach)

---

## Decision Points (You'll Make Later)

1. **When do you want to enable Stripe payments?**
   - Now (so paid signup works immediately)
   - Later (launch free, add payments in 2 weeks)

2. **Who do you want to target first?**
   - Corporate GCs (bigger spend, higher CAC)
   - Boutique law firms (lower spend, easier to reach)
   - Legal operations professionals (mid-market)

3. **How much outreach effort do you want to invest?**
   - Passive (just launch, wait for organic)
   - Moderate (LinkedIn posts, Reddit, 1-2 hrs/week)
   - Active (daily cold emails, networking, 5-10 hrs/week)

---

## Questions to Answer Next Session

- Do you want Stripe enabled at launch, or later?
- Which customer segment should we target first (corporate GC vs boutique law firm)?
- Should we do organic only, or invest in any paid ads?

---

## Related Decisions (Already Made)

From OPEN-LOOPS.md:
- ✅ **Passive Income Q2 Target:** $500/mo by June 30
- ✅ **App Priority:** CoinUsUp is primary; LegalBillAI is secondary (one-off exception)
- ✅ **Market Decision:** Confirmed significant demand + profitability for Legal Bill AI

---

**Status:** Ready to resume at Step 1 (Firebase setup) whenever you're ready.

*Created: 2026-03-09 13:45 ADT by Alfred*
