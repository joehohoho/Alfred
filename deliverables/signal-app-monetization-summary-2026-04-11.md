# Signal App Monetization Strategy — Executive Summary
**Date:** 2026-04-11  
**Status:** Ready for launch decision  
**Recommendation:** Freemium + single Pro tier (C$24/month)

---

## TL;DR — The Model That Works

| Aspect | Decision |
|--------|----------|
| **Primary Model** | Freemium + subscription (not one-time, not B2B-first) |
| **Launch Tiers** | Free + Pro only (not a 3-tier ladder) |
| **Pro Price** | C$24/month (or C$240/year = 2 months free) |
| **Founding Offer** | C$15/month lifetime for first 25-50 users |
| **Why** | Low friction, aligns with ongoing value, proven by 3+ competitors |

---

## The Strategy in Plain English

**You're not selling software; you're selling trust + outcomes.**

Traders are skeptical of signal quality. They'll try anything free, but converting them to paid requires:
1. **Proof:** Show real win rate, historical accuracy, sample alerts
2. **Low risk:** C$24/mo feels like a trial, not a bet
3. **Ongoing value:** Signals are continuous, so subscription (not one-time) feels right

**Freemium serves two jobs:**
- Get users in the door (proof of concept, list growth)
- Pre-filter for the paid tier (users who engage = likely to convert)

---

## Recommended Tier Structure

### FREE TIER
- **3–5 signals/week** (delayed 15–60 min)
- **Limited watchlist** (5–10 assets)
- **Basic alerts** (email only, no push)
- **Weekly digest** with results summary
- **Social proof** (leaderboard rank, sample alerts)
- **Goal:** Build trust; prove value; identify upgrade candidates

### PRO TIER — C$24/month (or C$240/year)
- **Unlimited real-time signals** (no delay)
- **Larger watchlist** (50+ assets)
- **Multi-channel alerts** (push, Discord, email)
- **Dashboard history** (track performance, backtest results)
- **Advanced filtering** (by asset class, confidence score, etc.)
- **Goal:** Serious traders, traders who trade frequently

### Optional Later: ELITE — C$49–79/month (Month 6+)
- SMS/Discord real-time push
- Broker/exchange API integration
- Backtesting & model explanations
- Portfolio tracking & risk overlays
- Includes Pro tier + advanced features
- **Only add after** clear premium differentiation is proven

---

## Why This Beats Alternatives

### ❌ One-Time Purchase (Lifetime)
- **Problem:** Signals = ongoing cost to you (ML models, data, compute)
- **Risk:** Customers feel shortchanged if signal quality drops (you still got paid once)
- **Better for:** Only after proven signal quality for 12+ months

### ❌ B2B API Licensing (First)
- **Problem:** Requires stable performance, documentation, SLAs, outbound sales
- **Too early:** You need 500+ retail users first to validate signal quality at scale
- **Better for:** Year 2+

### ✅ Freemium + Subscription
- **Why it works:** TradingView, Cryptohopper, and 50+ signal apps use this model
- **Proof:** Retail traders accept $15–30/mo subscriptions for signals
- **Defensible:** Real-time + advance notice = clear paid value

---

## Competitive Benchmarks (Why C$24 is Right)

| App | Model | Price | Notes |
|-----|-------|-------|-------|
| **TradingView** | Freemium + ladder | C$19.95–82.95/mo | Essential tier is C$19.95; most traders only need it |
| **Cryptohopper** | Free + ladder | ~C$24–107/mo | Free tier is crippled; Explorer (~C$24) is their core paid tier |
| **CryptoSignalApp** | Subscription + lifetime | C$15–99 | Monthly C$15, but also offers C$99 lifetime option |
| **ProfitFarmers** | Freemium + paid | Free + $X/mo | Free signals (78% win-rate) drive conversion |

**Key insight:** Crypto traders feel C$20–30/mo is fair for quality signals. Price higher and they compare to Telegram channels (free) or lower-cost APIs. Price lower and they assume low quality.

**C$24/month = Goldilocks zone** (feels like a real product, not a bargain-bin ripoff, not expensive).

---

## Founding Member Offer (Optional Launch Hook)

Offer first 25–50 users a **lifetime C$15/month lock-in** (instead of C$24):
- Creates urgency ("limited slots")
- Gets testimonials/feedback
- Builds community gravity
- Revenue impact: ~C$180/month ongoing (25 × C$15), not material but social proof matters

**Terms:** Lock in C$15/month "while active" (if they cancel, they lose the rate; re-subscribe at C$24).

---

## Launch Packaging (What to Build)

### MVP for Day 1:
1. **Landing page** with pricing (Free | Pro)
2. **Free tier access** (sign up → get 5 sample signals)
3. **Pro checkout** (Stripe integration, monthly + annual options)
4. **Email/push alerts** infrastructure
5. **Win-rate dashboard** (public, real-time)
6. **Founding offer banner** (if doing it)

### Pre-Launch Validation:
- [ ] Signal quality stable for 2+ weeks
- [ ] Win-rate methodology transparent + auditable
- [ ] Legal review (disclaimers, PFOF, etc.)
- [ ] Push notification + email tested
- [ ] Stripe account configured (CAD + USD supported)

---

## Conversion Strategy (How to Move Free → Pro)

1. **Show proof first:** Real signals, real results, win rate dashboard
2. **Invite at trigger moments:**
   - After 3 signals received (hook them; then ask)
   - After 1 profitable signal (confidence boost)
   - Weekly: "Interested in real-time alerts?"
3. **Remove artificial friction:**
   - Free tier signals are real (not crippled/garbage)
   - Free tier alerts are functional (email, not just web)
4. **Reduce friction at checkout:**
   - Stripe checkout (1-click for account holders)
   - Apple Pay / Google Pay (mobile users)
   - 7-day free trial option (if churn risk is low)

---

## Financial Targets (Year 1)

### Conservative Projection:
- **Month 6:** 100–150 Pro users @ C$24/mo = C$2,400–3,600/mo
- **Month 12:** 300–400 Pro users @ C$24/mo = C$7,200–9,600/mo
- **Annual Run Rate (end of Year 1):** C$86,400–115,200

### Upside Scenario (with viral growth):
- **Month 12:** 1,000+ Pro users = C$24,000/mo (C$288K annual run rate)
- Requires: Great signal quality + network effects (referrals, community)

### Add Elite Tier (Month 6+):
- 20–30% of Pro users upgrade to Elite
- Example: 30 Elite users @ C$60/mo = additional C$1,800/mo

**Why it matters:** Year 1 target is C$100K+ annual run rate (if execution is solid).

---

## Key Success Metrics

1. **Free → Pro conversion:** Target 5–10% (crypto signal apps average 3–8%)
2. **Pro retention:** Target 85%+ monthly (churn <15%)
3. **Win rate consistency:** Track and publish (honest methodology)
4. **Signal delivery latency:** Real-time (< 1 minute from model trigger)
5. **User trust:** NPS score 40+ (post-launch survey)

---

## Next Steps (Immediate Actions)

### If you approve this strategy:
1. [ ] Set up Stripe (CAD + USD, tax configuration)
2. [ ] Create landing page + pricing page (Nextjs, Supabase auth)
3. [ ] Build win-rate dashboard (public display of results)
4. [ ] Draft legal disclaimers + terms of service
5. [ ] Plan launch date (30 days out?)
6. [ ] Test signal delivery → email/push pipeline

### If you want to refine:
- Adjust price (C$19, C$29 instead of C$24)?
- Add more free-tier restrictions (e.g., max 2 signals/week instead of 3–5)?
- Interested in lifetime option at launch (instead of later)?
- Want to start with 2-tier ladder instead of 1?

---

## Decision Point

**Proceed with C$24 Freemium + Pro model?** [Yes/No/Modify]

If yes → Next phase is payment infrastructure + landing page build.  
If modify → Which aspect? (price, tiers, free limits, founding offer)

---

**Research Sources:**
- Web search: crypto signal monetization, competitor pricing (TradingView, Cryptohopper, ProfitFarmers)
- App Store data: CryptoSignalApp pricing structure
- Mobile SaaS benchmarks: freemium conversion rates, churn data
- Market data: 420M+ retail traders globally; C$12.4B trading app market (2025) → C$18B+ (2028)

**Full research:** See `research/signal-app-monetization-2026-03-31.md` for detailed competitor analysis, risk mitigation, and projections.
