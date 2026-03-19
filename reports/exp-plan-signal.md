# Stock/Crypto Signal App Monetization Experiment
**Project:** Stock/Crypto Signal App  
**Experiment:** Paid Waitlist + Narrow Niche v1 Validation  
**Duration:** 6 weeks (2026-03-19 → 2026-05-01)  
**Owner:** Joe  
**Goal:** Validate signal accuracy + willingness-to-pay before building full product

---

## Hypothesis

There's demand for high-accuracy buy/sell signals in crypto. By launching a narrow MVP focused on **[ONE CRYPTO/TIMEFRAME]** with 10–25 paid early adopters, we can validate signal quality, measure retention, and identify product-market fit signals before scaling.

**Example niche:** "Bitcoin 4-hour swing trades" or "Top-5 altcoin entry/exit signals" or "DCA-ready buy signals for long-term holders"

---

## Experiment Design

### Phase 1: Waitlist + Niche Validation (Week 1–2, Mar 19–Apr 01)

**Objective:** Define narrow niche; seed waitlist; measure demand

**Setup:**
1. **Define niche (choose ONE):**
   - Example: "Bitcoin daily buy/sell signals for swing traders"
   - Example: "Ethereum entry signals for DCA investors"
   - Example: "Top altcoin breakout alerts for day traders"
   - Criteria: specific asset + timeframe + use case

2. **Create waitlist landing page:**
   - Headline: "[Niche] signals with 75%+ accuracy. Early access $49/month."
   - Copy: Why this niche (e.g., "Swing traders miss 40% of gains. Our signals catch them.")
   - CTA: "Join waitlist — $49/mo when live" + email capture
   - Include: Social proof placeholder (e.g., "Coming soon — early access beta")

3. **Drive signups:**
   - Post on 2–3 relevant communities (Reddit r/cryptocurrency, Twitter crypto accounts, Discord groups)
   - Email existing Even Us Up + CoinUsUp users: "New project: crypto signals. Join waitlist?"
   - Ask 5–10 crypto-interested contacts directly

4. **Measure:**
   - Waitlist signups: target ≥100 (indicates demand)
   - Email open rate: track opens (baseline for engagement)
   - Retention on waitlist: % who don't unsubscribe (engagement signal)

**Success criteria:**
- ≥100 waitlist signups (valid demand signal)
- Niche clearly defined + documented
- ≥5 pre-launch conversations with waitlisters about signal preference
- Identify top 3 decision factors: accuracy, latency (instant vs. daily), price point

---

### Phase 2: MVP Signal Generation + Paid Pilot (Week 3–5, Apr 02–Apr 30)

**Objective:** Ship first signal version; onboard 10–25 paid pilots; measure accuracy + retention

**Setup:**
1. **Build minimal signal generator:**
   - Choose 1 technical indicator (RSI, MACD, moving average crossover, etc.)
   - Or combine 2–3 simple indicators (goal: explainable logic, not black-box ML)
   - Backtest on historical data: verify >60% win rate on niche asset
   - Output: 1 signal per day (morning UTC) → email + SMS

2. **Onboard paid pilots (cohort of 10–25):**
   - Invite top 20 waitlist members: "Join our $49/mo beta. First 25 get guaranteed access + feedback input"
   - Onboarding flow:
     * Payment (Stripe; keep it simple)
     * Email confirmation + signal examples
     * Slack channel for feedback + questions
     * Welcome email: "Your first signals arrive tomorrow morning"

3. **Track pilot metrics (daily):**
   - Signal delivery: 100% on-time (reliability)
   - Signal accuracy: % of recommendations profitable within 24–72h
     * Definition: "profitable" = entry signal triggers price move >2% in direction within 48h
   - Conversion: "I acted on this signal" → $ gained/lost per signal
   - Usage: % of pilots checking signals daily (engagement)

4. **Collect feedback (2x weekly):**
   - Slack survey: "This week, which signal was most useful? Why?"
   - Email: "What one feature would make this 10x better?"
   - Goal: identify 3 top feature requests

**Success criteria:**
- Signal accuracy: ≥60% of recommendations trending correct direction within 48h
- Pilot retention: ≥80% of paid pilots active by end of week 5
- Engagement: ≥70% of pilots check signals at least 3x/week
- Monetization signal: ≥3 pilots volunteer unsolicited feedback ("This is valuable")
- Revenue: $10K MRR run-rate (25 pilots × $49 × 8 weeks ÷ 6 weeks = $49 × 18 active → ~$882; refocus)

**Note on revenue:** Even if only 10 pilots convert, that's $490/mo MRR. Small, but validates demand.

---

### Phase 3: Product Iteration + Expansion (Week 6, May 01+)

**Objective:** Refine based on pilot feedback; decide on full launch or pivot

**Setup:**
1. **Iterate signal model** (if accuracy <60%):
   - Adjust indicator thresholds
   - Add second indicator for confirmation
   - Backtest + re-pilot with 5 users
   - Goal: hit 65%+ accuracy before full launch

2. **Ship 2–3 top feature requests** (if feedback clear):
   - Examples: Push notifications, charts, entry/exit prices, stop-loss recommendations
   - Measure: Does feature adoption increase retention?

3. **Expand niche or add tier** (if validated):
   - Option A: "Expand to 2nd asset" (e.g., Ethereum signals alongside Bitcoin)
   - Option B: "Add premium tier" ($99/mo for additional features: SMS alerts, portfolio integration)
   - Option C: "Offer annual plan" ($499/year vs. $588/year monthly) to lock in committed users

4. **Plan full launch:**
   - Remove waitlist; open to public at $49–99/mo
   - Target: 100+ paid subscribers by EOY

**Success criteria:**
- Pilot → public conversion: ≥10 new public subscribers in week 1
- Accuracy: ≥65% (improved from iteration)
- Retention: ≥85% of pilots renew past month 2
- Top tier revenue: $5K+ MRR within 3 months of full launch (100+ subscribers)

---

## Implementation Checklist

**Phase 1 (by Mar 25):**
- [ ] Niche defined (specific asset + timeframe)
- [ ] Landing page live + launched
- [ ] Initial 5–10 invitations sent
- [ ] Analytics tracking set up (email opens, page conversions)

**Phase 2 (by Apr 02):**
- [ ] Signal model designed + backtested (≥60% historical accuracy)
- [ ] Payment processor live (Stripe)
- [ ] Email template for signal delivery finalized
- [ ] Slack workspace for pilot cohort created
- [ ] First 10 pilots onboarded

**During Phase 2 (Apr 02–Apr 30):**
- [ ] Daily: Signal delivery verified (100% on-time)
- [ ] Daily: Accuracy tracked (% profitable recommendations)
- [ ] 2x weekly: Feedback collected (Slack poll)
- [ ] Weekly: Retention metrics reviewed (who's still active?)

**End of Phase 2 (Apr 30):**
- [ ] Synthesis: accuracy report, retention % retention, top 3 feature requests
- [ ] Decide: iterate (pivot niche/indicator) or move to Phase 3

**Phase 3 (May 01+):**
- [ ] Implement top feature requests
- [ ] Re-test with pilots
- [ ] Prepare full launch (landing page, pricing, onboarding)

---

## Success Metrics (Target)

| Metric | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| **Waitlist signups** | ≥100 | — | — |
| **Paid pilot cohort** | — | 10–25 | — |
| **Signal accuracy** | — | ≥60% | ≥65% |
| **Pilot retention (month 2)** | — | ≥80% | ≥85%+ (full launch) |
| **Engagement (3x/week usage)** | — | ≥70% | ≥75% |
| **MRR (pilot phase)** | — | $490–$1,225 | $5K+ (full launch target) |
| **Public subscribers (month 1)** | — | — | ≥10 |

---

## Rollback / Pivot

**If waitlist stalls (<30 signups):** Niche may not be compelling. Options:
1. Broaden niche (e.g., "any crypto" instead of "Bitcoin only")
2. Change positioning (e.g., "risk management" instead of "profit maximization")
3. Try different audience (day traders vs. long-term investors)

**If accuracy <50% (Phase 2):** Signal quality poor; customers won't renew. Options:
1. Pivot indicator (try ML-based if manual indicators fail)
2. Reduce signal frequency (fewer, higher-confidence signals)
3. Pivot niche (e.g., daily signals → weekly deep-dive analysis)

**If pilot retention <50%:** Users don't see value. Options:
1. Extend beta period (lower price $29/mo, gather more feedback)
2. Add feature urgently (maybe signal delivery timing is issue)
3. Pivot to different use case (e.g., risk alerts instead of buy signals)

**If accuracy ≥65% + pilot retention ≥85%:** Green light for full launch. Options:
1. Open to public immediately
2. Gradual rollout (500 waitlisters → public)
3. Add premium tier ($99/mo) before full launch

---

## Weekly Check-in Format (Fri, 2 PM AST)

```
Signal App Experiment — Week [N]

Waitlist / Pilots:
- Waitlist signups (cumulative): [#]
- Active pilots: [#]
- Churn (unsubscribe): [#]

Signals:
- Signals sent this week: [#]
- Accuracy (% profitable in 48h): [%]
- Average return per signal: [%]

Engagement:
- % pilots checking signals 3x+/week: [%]
- Feature request theme: [1–2 sentences]

Next week:
- [ ] [Action item]
```

---

## Related Docs

- Metrics dashboard: `metrics-dashboard-template.md` (track Signal App waitlist, pilots, accuracy, MRR)
- Portfolio snapshot: `passive-income-portfolio-snapshot-2026-03-19.md` (context)
- Productization guide: `consulting-productization-guide.md` (for future "signal analysis retainer" offer)
