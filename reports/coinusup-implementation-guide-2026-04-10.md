# CoinUsUp Implementation Guide — 6-Week Roadmap

**Purpose:** Translate the growth audit into concrete code changes, component specs, and testing criteria  
**Timeline:** Apr 14 - May 26 (6 weeks)  
**Owner:** Dev team (2-3 developers recommended)  
**Success criteria:** 3-6 paid users/month by end of week 6 (vs. 0 current)

---

## Phase 1: Trial Launch + Baseline Measurement (Week 1-2)

### Task 1.1: Unblock Stripe Dashboard Config (Joe, 5 min)

**Dependency:** None (blocking everything else)

**What to do:**
1. Log into Stripe dashboard (https://dashboard.stripe.com)
2. Navigate to **Products** → **Pricing plans**
3. For each of these 12 products, set `trial_period_days: 14`:
   - **USD Plans:**
     - CoinUsUp Basic Monthly ($39/mo)
     - CoinUsUp Basic Annual ($39×12)
     - CoinUsUp Pro Monthly ($39/mo) [if exists, or verify correct pricing]
     - CoinUsUp Pro Annual
   - **CAD Plans:**
     - CoinUsUp Basic Monthly ($49/mo CAD)
     - CoinUsUp Basic Annual
     - CoinUsUp Pro Monthly
     - CoinUsUp Pro Annual
   - **Enterprise:** Skip trial (no trial for Enterprise)

4. For each plan, also enable:
   - Checkbox: "Use a free trial period"
   - Value: `14` days
   - Ending behavior: **Pause subscription** (when payment method missing)

5. Save + wait for Stripe to propagate (usually <1 minute)

**Verification:**
- In `supabase/functions/create-checkout/index.ts`, confirm code passes `trial_period_days: 14` to Stripe
- Test: Create a test checkout session; verify Stripe API response includes `trial_period_days`

**Success criteria:**
- ✅ Stripe dashboard shows 12 plans with trial_period_days = 14
- ✅ No errors in browser console when loading checkout
- ✅ Test order flow shows "14-day free trial, then $39/month" messaging

**Time estimate:** 5-10 minutes  
**Owner:** Joe

---

### Task 1.2: Deploy Trial Feature to Production

**Dependency:** Task 1.1 (Stripe config)

**What to do:**
1. Code is already complete (per IMPLEMENTATION_CHECKLIST.md):
   - Migration: `20260331_add_trial_support.sql` ✅
   - Edge functions: `create-checkout`, `check-subscription`, `recurring-donation-webhook` ✅
   - Frontend hook: `useStripeSubscription.ts` ✅

2. Deployment steps (from `docs/TRIAL-DEPLOYMENT-RUNBOOK.md`):
   ```bash
   # 1. Run database migration
   supabase db push --linked --dry-run  # Preview
   supabase db push --linked             # Apply

   # 2. Deploy edge functions
   supabase functions deploy create-checkout
   supabase functions deploy check-subscription
   supabase functions deploy recurring-donation-webhook

   # 3. Rebuild + deploy frontend
   npm run build
   npm run deploy
   ```

3. Verify all systems are working:
   - ✅ Database migration successful (check `trial_starts_at` column exists)
   - ✅ Edge functions deployed (check logs in Supabase console)
   - ✅ Frontend loads without errors (browser console)
   - ✅ Test checkout flow → Stripe creates checkout session with trial_period_days

**Success criteria:**
- ✅ Free user can click "Upgrade to Pro" → Stripe checkout loads
- ✅ Checkout shows "14-day free trial, then $39/month"
- ✅ Test subscription created in Stripe with trial dates
- ✅ `check-subscription` API returns `is_in_trial: true` for test user
- ✅ No errors in production logs

**Time estimate:** 2-3 hours (mostly waiting for deployment)  
**Owner:** Dev (with Joe final approval on deployment)

---

### Task 1.3: Measure Baseline Conversion Metrics (Dev, ongoing)

**Dependency:** Task 1.2 (trial deployed)

**What to do:**
1. Create analytics dashboard tracking:
   - `free_users_total` (count from database)
   - `free_to_trial_conversion_rate` (trial signups / free users)
   - `trial_to_paid_conversion_rate` (paid conversions / trial signups)
   - `paid_users_total` (count of active subscriptions)
   - `mrr_total` (sum of active subscription values)

2. Set up tracking events:
   ```typescript
   // In SelectPlan.tsx
   trackEvent('plan_selected', { plan: planId });
   
   // In checkout flow
   trackEvent('checkout_started', { plan: selectedPlan });
   trackEvent('checkout_completed', { plan: selectedPlan, subscription_id: stripeSubId });
   trackEvent('trial_started', { user_id, plan: selectedPlan });
   trackEvent('trial_converted', { user_id, plan: selectedPlan });
   ```

3. Dashboard/report to pull:
   - Daily user growth rate
   - Daily trial signups
   - Daily conversions to paid
   - Weekly MRR trend

4. Set up alerts:
   - Alert if conversion rate drops >20% from baseline
   - Alert if error rate spikes in checkout flow

**Success criteria:**
- ✅ Baseline metrics captured after 1 week: free→trial conversion rate X%, trial→paid Y%
- ✅ Daily tracking events flowing to analytics system (Segment, Mixpanel, or custom)
- ✅ Dashboard visible (in Grafana, Metabase, or Google Sheets)
- ✅ Weekly report sent to Joe with conversion metrics

**Time estimate:** 1-2 days (analytics setup + event instrumentation)  
**Owner:** Dev

---

## Phase 2: Onboarding Redesign (Week 2-4)

### Task 2.1: Refactor Sample Data Creation (Dev, 2 days)

**Purpose:** Prepare onboardingSampleData.ts to support auto-creation on signup

**What to do:**

1. Update `src/services/onboardingSampleData.ts`:
   ```typescript
   // NEW FUNCTION: Auto-create sample data on signup
   export async function autoCreateSampleDataOnSignup(userId: string) {
     try {
       const groupId = await createSampleGroup(userId);
       await createSampleCampaign(groupId);
       // Note: Don't invite a member yet (optional in phase 2)
       return { groupId, success: true };
     } catch (error) {
       console.error('Failed to auto-create sample data:', error);
       return { success: false, error: error.message };
     }
   }
   
   // Existing functions remain unchanged
   export async function createSampleGroup(userId: string) { ... }
   export async function createSampleCampaign(groupId: string) { ... }
   ```

2. Update `createSampleGroup()` to accept optional config:
   ```typescript
   interface SampleGroupConfig {
     isAutoCreated?: boolean;  // Track if auto-created (for analytics)
     skipCampaign?: boolean;   // Skip campaign creation (optional)
   }
   
   export async function createSampleGroup(userId: string, config?: SampleGroupConfig) {
     const group = {
       owner_id: userId,
       name: 'My Organization',
       description: 'Sample organization with example data',
       is_sample: config?.isAutoCreated ? true : false,
       // ... rest of group creation
     };
     // ...
   }
   ```

3. Add sample donations + volunteer hours to `createSampleCampaign()`:
   ```typescript
   export async function createSampleCampaign(groupId: string) {
     const campaign = {
       group_id: groupId,
       name: 'Community Center Renovation',
       goal_amount: 5000,
       current_amount: 1850,  // Pre-populate with ~37% progress
       status: 'active',
       // ...
     };
     
     // Add sample donations (5-10)
     const donations = [
       { amount: 250, donor_name: 'Jane Smith' },
       { amount: 500, donor_name: 'John Foundation' },
       { amount: 100, donor_name: 'Maria Garcia' },
       // ...
     ];
     
     // Add sample volunteer hours (10-15 hours)
     const volunteers = [
       { name: 'Alice Johnson', hours: 5 },
       { name: 'Bob Davis', hours: 8 },
       // ...
     ];
     
     return campaignId;
   }
   ```

**Success criteria:**
- ✅ `autoCreateSampleDataOnSignup()` creates group + campaign + sample data in <2 seconds
- ✅ Donations visible in "Donations" table after creation
- ✅ Volunteer hours visible in dashboard
- ✅ Sample data clearly marked as "Sample" (for user clarity)

**Time estimate:** 2 days  
**Owner:** Dev

---

### Task 2.2: Auto-Create Sample Data on Signup (Dev, 2 days)

**Purpose:** Trigger sample data creation when user completes signup

**What to do:**

1. Update `src/contexts/AuthContext.tsx` (signup callback):
   ```typescript
   const handleSignup = async (email: string, password: string) => {
     // ... existing signup code ...
     const { user, session } = await supabase.auth.signUp({ email, password });
     
     if (user) {
       // NEW: Auto-create sample data after signup
       try {
         await autoCreateSampleDataOnSignup(user.id);
         trackEvent('sample_data_auto_created', { user_id: user.id });
       } catch (error) {
         console.error('Failed to auto-create sample data:', error);
         // Don't block signup; user can create manually if needed
       }
     }
     
     return { user, session };
   };
   ```

2. Update `src/pages/Dashboard.tsx` to handle new user flow:
   ```typescript
   export default function Dashboard() {
     const { user } = useAuth();
     const [userGroupId, setUserGroupId] = useState<string | null>(null);
     
     useEffect(() => {
       if (!user) return;
       
       // Fetch user's primary group
       fetchUserGroup(user.id).then(group => {
         setUserGroupId(group?.id || null);
       });
     }, [user]);
     
     // ... rest of dashboard ...
   }
   ```

3. Update `src/components/onboarding/OnboardingChecklist.tsx`:
   ```typescript
   // NEW: Auto-create flow (no manual button needed for first group)
   const steps = [
     {
       title: 'Create Your First Campaign',  // CHANGED (group auto-created)
       description: 'You already have a sample organization. Create your first campaign.',
       icon: completedSteps[0] ? CheckCircle2 : Circle,
       // ...
     },
     {
       title: 'Invite a Team Member',
       description: 'Add someone to collaborate with you.',
       // ...
     },
   ];
   ```

**Success criteria:**
- ✅ New user signs up → automatically lands on dashboard with sample group + campaign visible
- ✅ No manual "Create Group" button click required
- ✅ Dashboard shows pre-populated donations + volunteer hours
- ✅ Onboarding checklist shows 1/2 complete (campaign creation is next step)
- ✅ User can immediately see "aha moment" (revenue tracking data in action)

**Time estimate:** 2 days  
**Owner:** Dev

---

### Task 2.3: Build Welcome Banner + Action CTAs (Dev, 2 days)

**Purpose:** Give new users clear next steps without feeling forced

**What to do:**

1. Create `src/components/DashboardBanner.tsx`:
   ```typescript
   import { useState } from 'react';
   import { Card, CardContent } from '@/components/ui/card';
   import { Button } from '@/components/ui/button';
   import { CheckCircle2, Users, BarChart3 } from 'lucide-react';
   
   interface DashboardBannerProps {
     isNewUser: boolean;
     onCreateCampaign: () => void;
     onInviteTeam: () => void;
     onViewReports: () => void;
   }
   
   export function DashboardBanner({
     isNewUser,
     onCreateCampaign,
     onInviteTeam,
     onViewReports,
   }: DashboardBannerProps) {
     const [dismissed, setDismissed] = useState(false);
     
     if (!isNewUser || dismissed) return null;
     
     return (
       <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-blue-50/30 dark:from-blue-950/20 dark:to-transparent">
         <CardContent className="pt-6">
           <div className="flex items-start justify-between gap-4">
             <div>
               <div className="flex items-center gap-2 mb-3">
                 <CheckCircle2 className="h-5 w-5 text-green-600" />
                 <h3 className="font-semibold text-lg">Welcome to CoinUsUp!</h3>
               </div>
               <p className="text-sm text-muted-foreground mb-4">
                 You have sample data loaded. Here's what to try next:
               </p>
               
               {/* Action Grid */}
               <div className="grid md:grid-cols-3 gap-3">
                 <Button
                   variant="outline"
                   onClick={onCreateCampaign}
                   className="justify-start"
                 >
                   <BarChart3 className="h-4 w-4 mr-2" />
                   Create Real Campaign
                 </Button>
                 <Button
                   variant="outline"
                   onClick={onInviteTeam}
                   className="justify-start"
                 >
                   <Users className="h-4 w-4 mr-2" />
                   Invite Your Team
                 </Button>
                 <Button
                   variant="outline"
                   onClick={onViewReports}
                   className="justify-start"
                 >
                   <BarChart3 className="h-4 w-4 mr-2" />
                   View Your Progress
                 </Button>
               </div>
             </div>
             
             <button
               onClick={() => setDismissed(true)}
               className="text-muted-foreground hover:text-foreground"
             >
               ✕
             </button>
           </div>
         </CardContent>
       </Card>
     );
   }
   ```

2. Update `src/pages/Dashboard.tsx` to include banner:
   ```typescript
   export default function Dashboard() {
     const { user } = useAuth();
     const [userGroupId, setUserGroupId] = useState<string | null>(null);
     const [isNewUser, setIsNewUser] = useState(false);
     
     useEffect(() => {
       // Check if user is new (created < 1 day ago)
       if (user && user.created_at) {
         const accountAge = Date.now() - new Date(user.created_at).getTime();
         setIsNewUser(accountAge < 24 * 60 * 60 * 1000);
       }
     }, [user]);
     
     return (
       <div>
         {isNewUser && (
           <DashboardBanner
             isNewUser={isNewUser}
             onCreateCampaign={() => navigate('/campaigns/new')}
             onInviteTeam={() => navigate('/settings?tab=members')}
             onViewReports={() => navigate('/reports')}
           />
         )}
         
         {/* Rest of dashboard */}
       </div>
     );
   }
   ```

**Success criteria:**
- ✅ New user sees welcome banner on first dashboard load
- ✅ Banner shows 3 action buttons with clear CTAs
- ✅ Banner dismissable (✕ button)
- ✅ Banner not shown to existing users
- ✅ Each button navigates to correct page

**Time estimate:** 2 days  
**Owner:** Dev

---

### Task 2.4: Add Contextual Tips + Feature Discovery (Dev, 3 days)

**Purpose:** Guide users to discover key features at the right moment

**What to do:**

1. Create `src/hooks/useOnboardingTips.ts`:
   ```typescript
   import { useState, useEffect } from 'react';
   
   export interface OnboardingTip {
     id: string;
     title: string;
     description: string;
     action: () => void;
     trigger: 'dashboard_5min' | 'empty_donations' | 'empty_volunteers' | 'first_donation' | 'first_report';
     shown: boolean;
   }
   
   export function useOnboardingTips(userGroupId: string | null) {
     const [tips, setTips] = useState<OnboardingTip[]>([]);
     const [timeOnDashboard, setTimeOnDashboard] = useState(0);
     
     useEffect(() => {
       if (!userGroupId) return;
       
       // Increment time every second
       const interval = setInterval(() => {
         setTimeOnDashboard(prev => prev + 1);
       }, 1000);
       
       return () => clearInterval(interval);
     }, [userGroupId]);
     
     // Trigger tips based on time/state
     useEffect(() => {
       const newTips: OnboardingTip[] = [];
       
       // Tip: "Try creating a donation" after 5 minutes
       if (timeOnDashboard > 300 && !localStorage.getItem('tip_donations_shown')) {
         newTips.push({
           id: 'tip_donations',
           title: 'Track Your First Donation',
           description: 'Add a donation to see CoinUsUp in action. Try recording a $100 donation from "Jane Smith".',
           action: () => navigate('/donations/new'),
           trigger: 'dashboard_5min',
           shown: true,
         });
       }
       
       // Tip: "Invite your team" after 10 minutes
       if (timeOnDashboard > 600 && !localStorage.getItem('tip_invite_shown')) {
         newTips.push({
           id: 'tip_invite',
           title: 'Invite Your Team',
           description: 'Collaboration is easier together. Invite a teammate to help manage campaigns.',
           action: () => navigate('/settings?tab=members'),
           trigger: 'dashboard_5min',
           shown: true,
         });
       }
       
       setTips(newTips);
     }, [timeOnDashboard]);
     
     const dismissTip = (tipId: string) => {
       localStorage.setItem(`tip_${tipId}_shown`, 'true');
       setTips(prev => prev.filter(t => t.id !== tipId));
     };
     
     return { tips, dismissTip };
   }
   ```

2. Create `src/components/OnboardingTip.tsx`:
   ```typescript
   import { Card, CardContent } from '@/components/ui/card';
   import { Button } from '@/components/ui/button';
   import { Lightbulb } from 'lucide-react';
   
   interface OnboardingTipProps {
     title: string;
     description: string;
     actionLabel?: string;
     onAction: () => void;
     onDismiss: () => void;
   }
   
   export function OnboardingTip({
     title,
     description,
     actionLabel = 'Try it',
     onAction,
     onDismiss,
   }: OnboardingTipProps) {
     return (
       <Card className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
         <CardContent className="pt-4 flex gap-3">
           <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
           <div className="flex-1">
             <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-100">
               {title}
             </h4>
             <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
               {description}
             </p>
             <div className="flex gap-2 mt-3">
               <Button
                 size="sm"
                 variant="default"
                 onClick={onAction}
                 className="bg-amber-600 hover:bg-amber-700"
               >
                 {actionLabel}
               </Button>
               <Button
                 size="sm"
                 variant="ghost"
                 onClick={onDismiss}
                 className="text-amber-700"
               >
                 Maybe later
               </Button>
             </div>
           </div>
         </CardContent>
       </Card>
     );
   }
   ```

3. Integrate tips into Dashboard:
   ```typescript
   export default function Dashboard() {
     const { user } = useAuth();
     const [userGroupId, setUserGroupId] = useState<string | null>(null);
     const { tips, dismissTip } = useOnboardingTips(userGroupId);
     
     return (
       <div>
         {/* Welcome banner */}
         <DashboardBanner {...} />
         
         {/* Contextual tips */}
         {tips.map(tip => (
           <OnboardingTip
             key={tip.id}
             title={tip.title}
             description={tip.description}
             onAction={tip.action}
             onDismiss={() => dismissTip(tip.id)}
           />
         ))}
         
         {/* Rest of dashboard */}
       </div>
     );
   }
   ```

**Success criteria:**
- ✅ Tips appear at correct times (5 min, 10 min, etc.)
- ✅ Tips dismissed properly (not shown again for 30 days)
- ✅ Each tip has actionable CTA (links to relevant page)
- ✅ Tips don't overwhelm user (max 1 tip at a time)
- ✅ Analytics track tip impressions + CTAs

**Time estimate:** 3 days  
**Owner:** Dev

---

## Phase 3: Plan Naming Unification (Week 5-6)

### Task 3.1: Rename Plans in SelectPlan.tsx (Dev, 1 day)

**Purpose:** Change "Free/Nonprofit+/Enterprise" to "Free/Pro/Enterprise"

**What to do:**

1. Update `src/pages/SelectPlan.tsx`:
   ```typescript
   const plans = [
     {
       id: 'free',
       name: 'Free',
       price: formatPrice(currentPricing.plans.free.monthly),
       period: '/mo',
       description: 'For getting started with nonprofit operations',
       features: [
         'Up to 50 members',
         'Basic campaigns and events',
         'Core volunteer management',
       ],
     },
     {
       id: 'pro',  // CHANGED from 'nonprofit_plus'
       name: 'Pro',  // CHANGED from 'Nonprofit+'
       price: formatPrice(currentPricing.plans.pro.monthly),  // CHANGED key
       period: '/mo',
       description: 'For nonprofits scaling with donations and reporting',
       features: [
         'Unlimited members',
         'Donations module with tracking',
         'Attendance and volunteer hour tracking',
         'Email and communication tools',
         'Advanced reporting and insights',
         'Priority support',
       ],
       featured: true,
     },
     {
       id: 'enterprise',
       name: 'Enterprise',
       price: formatPrice(currentPricing.plans.enterprise.monthly, true),
       period: '/mo',
       description: 'For large organizations and federations',
       features: [
         'White-label experience',
         'Priority support + SLA',
         'Advanced admin controls',
         'Dedicated onboarding and support',
         'Custom integrations',
       ],
     },
   ];
   
   // Update pricing object
   const pricing = {
     US: {
       currency: '$',
       suffix: '',
       plans: {
         free: { monthly: 0 },
         pro: { monthly: 39 },  // CHANGED from nonprofit_plus
         enterprise: { monthly: 200 }
       }
     },
     CA: {
       currency: '$',
       suffix: ' CAD',
       plans: {
         free: { monthly: 0 },
         pro: { monthly: 49 },  // CHANGED from nonprofit_plus
         enterprise: { monthly: 250 }
       }
     }
   };
   ```

2. Update all handlers to use 'pro' instead of 'nonprofit_plus':
   ```typescript
   const handleSelectPlan = async (planId: string) => {
     if (planId === 'free') {
       navigate('/dashboard');
     } else {
       sessionStorage.setItem('selectedPlan', planId);  // 'pro' or 'enterprise'
       navigate('/settings?tab=subscription');
     }
   };
   ```

**Success criteria:**
- ✅ SelectPlan page shows "Pro" instead of "Nonprofit+"
- ✅ Selecting "Pro" works (navigates to checkout)
- ✅ Pricing reflects correct amounts ($39 US, $49 CAD)
- ✅ Feature list is updated for Pro plan

**Time estimate:** 1 day  
**Owner:** Dev

---

### Task 3.2: Update All Documentation + Marketing References (Dev + Joe, 1 day)

**Purpose:** Ensure consistent naming across all customer-facing materials

**What to do:**

1. Files to update:
   ```
   - docs/STRIPE-TRIAL-SPEC.md (rename "Basic/Pro" → "Free/Pro/Enterprise")
   - docs/TRIAL-DEPLOYMENT-RUNBOOK.md (same)
   - src/pages/SelectPlan.tsx (done in Task 3.1)
   - src/components/PricingTable.tsx (if exists; ensure matching names)
   - Marketing email templates (if exists)
   - Trial CTA copy (update to "Start your Pro trial")
   - Landing page copy (update to "Choose Your Pro Plan")
   - Onboarding messages (update to "Upgrade to Pro")
   ```

2. Search + replace strategy:
   ```bash
   # Find all occurrences of old names in codebase
   grep -r "nonprofit_plus\|Nonprofit\+" src/ --include="*.tsx" --include="*.ts"
   grep -r "nonprofit_plus\|Nonprofit\+" docs/ --include="*.md"
   
   # Replace (manual review required)
   # nonprofit_plus → pro
   # Nonprofit+ → Pro
   ```

3. Trial messaging update:
   - Old: "Try our Nonprofit+ plan for 14 days free"
   - New: "Try our Pro plan for 14 days free"

4. Email template (if exists):
   ```
   Subject: Start your 14-day Pro trial for free
   Body: Try CoinUsUp Pro — donations tracking, reporting, and team collaboration. 14 days free.
   CTA: Start Free Trial
   ```

**Success criteria:**
- ✅ All customer-facing docs use "Free/Pro/Enterprise" naming
- ✅ Trial email copy says "Pro" consistently
- ✅ Checkout page says "Pro" not "Nonprofit+"
- ✅ No remaining references to "Basic/Nonprofit+" in codebase

**Time estimate:** 1 day (mostly grep + replace)  
**Owner:** Dev + Joe (Joe reviews final messaging)

---

## Phase 4: Testing & Measurement (Week 5-6, ongoing)

### Task 4.1: End-to-End Testing (QA/Dev, 2 days)

**Purpose:** Verify all changes work together

**Test cases:**

1. **New User Signup Flow**
   - [ ] User signs up with email/password
   - [ ] Signup success → auto-redirect to dashboard
   - [ ] Sample group + campaign auto-created
   - [ ] Sample donations visible in donations table
   - [ ] Sample volunteer hours visible in dashboard
   - [ ] Welcome banner appears with 3 action buttons
   - [ ] Onboarding checklist shows progress (2/3 complete)
   - [ ] Tips appear at 5-min and 10-min marks

2. **Trial Conversion Flow**
   - [ ] New user clicks "Upgrade to Pro"
   - [ ] SelectPlan page shows "Free/Pro/Enterprise" naming
   - [ ] Pro plan is highlighted as "Most Popular"
   - [ ] User selects Pro → redirects to checkout
   - [ ] Stripe checkout loads with "Pro" plan name
   - [ ] Checkout shows "14-day free trial, then $39/month"
   - [ ] User completes checkout
   - [ ] Subscription created in Stripe with trial dates
   - [ ] User receives trial confirmation email
   - [ ] Dashboard shows "14 days remaining in trial"

3. **Metrics Tracking**
   - [ ] Analytics events fire for: signup, sample_data_created, plan_selected, checkout_started, trial_created
   - [ ] Dashboard shows daily conversion rates
   - [ ] No errors in Sentry/error tracking

**Time estimate:** 2 days (test case execution + bug fixes)  
**Owner:** QA or dev

---

### Task 4.2: Performance + Load Testing (Dev, 1 day)

**Purpose:** Ensure no regressions from new features

**What to test:**
- [ ] Dashboard loads in <2 seconds (including sample data)
- [ ] Onboarding tips render without jank (<60 FPS)
- [ ] Banner dismiss doesn't cause re-renders
- [ ] No memory leaks from tip hook (check DevTools)
- [ ] Checkout performance unchanged

**Time estimate:** 1 day  
**Owner:** Dev

---

### Task 4.3: User Acceptance Testing (UAT) with Joe (Dev + Joe, 1 day)

**Purpose:** Get Joe's feedback before full launch

**What to do:**
1. Create test user accounts
2. Joe walks through signup → dashboard → trial conversion flow
3. Collect feedback:
   - Are welcome banner CTAs clear?
   - Do tips appear at right time?
   - Is "Pro" plan naming better than "Nonprofit+"?
   - Are sample donations/volunteer hours helpful?
4. Document issues and prioritize for fixes

**Time estimate:** 1 day (Joe: 1-2 hours; Dev: 2-3 hours for fixes)  
**Owner:** Joe (testing) + Dev (fixes)

---

## Rollout Plan

### Canary Release (Day 1-2)
- Enable trial + new onboarding for 10% of traffic
- Monitor metrics:
  - Error rate <0.5%
  - Conversion rate within expected range
  - No support tickets from canary users

### Gradual Rollout (Day 3-5)
- 25% → 50% → 100% of traffic
- Continue monitoring

### Full Launch (Day 6)
- All features live for all users
- Post announcement to users

---

## Success Metrics (6-Week Target)

| Metric | Baseline | Target | Owner |
|--------|----------|--------|-------|
| **Free→Trial Conversion** | 0.8% | 2-3% | Analytics |
| **Trial→Paid Conversion** | 0% → 10-15% (once launched) | 12-18% | Analytics |
| **Paid Users** | 0 | 3-6 | Analytics |
| **MRR** | $0 | $90-180 | Finance |
| **Onboarding Completion** | N/A | 70%+ complete checklist | Analytics |
| **Welcome Banner CTR** | N/A | 30%+ click any button | Analytics |
| **Tip Engagement** | N/A | 40%+ click "Try it" | Analytics |

---

## Timeline Summary

```
Week 1-2: Unblock trial + deploy (Task 1.1-1.3)
Week 2-4: Onboarding redesign (Tasks 2.1-2.4)
Week 5-6: Plan naming + testing (Tasks 3.1-3.2, 4.1-4.3)
Week 6+: Monitor + iterate based on data
```

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Stripe config not done | Revenue blocked completely | Joe does this first; it's 5 min |
| Auto-creation of sample data fails | Users see empty dashboard | Error handling + manual creation fallback |
| Performance regression | Slow dashboard → churn | Load test before launch; monitor Lighthouse |
| Plan name confusion persists | Conversion stays low | A/B test "Pro" vs. "Nonprofit+" if needed |
| Tips trigger too often | User annoyance | LocalStorage + 30-day cooldown |

---

## Success Definition

✅ **This 6-week sprint is successful if:**
1. Trial is live + generating conversions (1-2 paid users/month baseline)
2. New user onboarding improved (free→trial +25-35%)
3. Plan naming consistent everywhere (no "Nonprofit+" references)
4. Contextual tips helping users discover features (+5-10% trial→paid lift)
5. MRR > $0 (previously impossible)
6. No critical bugs or regressions

**Go/No-Go gate at end of Week 6:** Review metrics with Joe. If all targets met, transition to P2 (content hub + affiliate). If targets missed, investigate + adjust.

---

**Created:** 2026-04-10 14:00 ADT  
**Owner:** Dev team (2-3 developers)  
**Status:** Ready for sprint planning  
**Approval:** Awaits Joe sign-off on blockers + sprint kickoff
