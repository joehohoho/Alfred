# Stripe Integration Specification — Technical Implementation

**Status:** READY FOR DEVELOPMENT  
**Last Updated:** 2026-03-27 17:52 ADT  
**Owner:** Backend Engineer (Joe to assign)  
**Estimated Time:** 4-6 hours (already partially integrated in MVP)

---

## Overview

This spec details how to implement Stripe payment processing for Signal App's Freemium + Subscription model.

**What we're building:**
- Free signup flow (no payment)
- Pro subscription signup ($19.99/month)
- Pro subscription management (upgrade, downgrade, cancel)
- Webhook handling (subscription lifecycle events)
- Revenue tracking (MRR, ARR, churn)

---

## Pricing Tiers (Finalized)

| Tier | Price | Billing | Features |
|------|-------|---------|----------|
| Free | $0 | Free | 3-5 signals/week, 48h delay |
| Pro | $19.99 | Monthly | 25+ signals/week, real-time, backtesting |
| Professional | $49.99 | Monthly (Sept 2026) | 50+ signals/week, API access, priority support |

---

## Stripe Account Setup (Pre-Implementation)

**Assumptions:**
- Stripe account exists (account owner: Joe)
- Stripe API keys configured (publishable + secret)
- Stripe webhook endpoint configured

**If not done yet:**
1. Go to stripe.com
2. Create account (or use existing)
3. Get API keys from Settings > API Keys
4. Store secret key in `.env` file (NOT in code)
5. Create webhook endpoint (see Webhooks section below)

---

## Database Schema (Backend)

```sql
-- Users table (extended)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email STRING UNIQUE,
  password_hash STRING,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  stripe_customer_id STRING UNIQUE, -- ADDED
  tier STRING DEFAULT 'free' -- 'free', 'pro', 'professional'
);

-- Subscriptions table (NEW)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID FOREIGN KEY,
  stripe_subscription_id STRING UNIQUE,
  tier STRING, -- 'pro', 'professional'
  status STRING, -- 'active', 'paused', 'canceled'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at TIMESTAMP, -- When subscription ends (if canceled)
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Invoices table (NEW) - for revenue tracking
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  user_id UUID FOREIGN KEY,
  subscription_id UUID FOREIGN KEY,
  stripe_invoice_id STRING UNIQUE,
  amount_paid DECIMAL, -- in cents
  currency STRING, -- 'usd'
  status STRING, -- 'paid', 'open', 'void', 'uncollectible'
  paid_at TIMESTAMP,
  created_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
```

---

## API Endpoints (Backend)

### 1. POST /api/auth/signup
**Free tier signup (no payment)**

**Request:**
```json
{
  "email": "trader@example.com",
  "password": "securepassword",
  "tier": "free"
}
```

**Response:**
```json
{
  "user_id": "user_123",
  "email": "trader@example.com",
  "tier": "free",
  "created_at": "2026-03-27T17:55:00Z"
}
```

**Backend logic:**
1. Validate email + password
2. Hash password (bcrypt)
3. Create Stripe customer (for future Pro upgrade):
   ```python
   stripe_customer = stripe.Customer.create(
       email=email,
       metadata={'app_user_id': user_id}
   )
   ```
4. Store `stripe_customer_id` in users table
5. Return user + JWT token

---

### 2. POST /api/subscriptions/create-checkout-session
**Create Stripe checkout for Pro subscription**

**Request:**
```json
{
  "tier": "pro",
  "user_id": "user_123"
}
```

**Response:**
```json
{
  "checkout_url": "https://checkout.stripe.com/pay/cs_test_...",
  "session_id": "cs_test_..."
}
```

**Backend logic:**
1. Look up user + Stripe customer ID
2. Create checkout session:
   ```python
   checkout_session = stripe.checkout.Session.create(
       customer=stripe_customer_id,
       payment_method_types=['card'],
       line_items=[
           {
               'price': STRIPE_PRICE_ID_PRO,  # $19.99/month
               'quantity': 1
           }
       ],
       mode='subscription',
       success_url='https://app.signal.com/onboarding/success?session_id={CHECKOUT_SESSION_ID}',
       cancel_url='https://app.signal.com/pricing'
   )
   ```
3. Return `checkout_url` (user redirects to Stripe)

**Frontend:** Redirect user to `checkout_url`

---

### 3. POST /api/subscriptions/confirm-checkout
**Verify checkout completion (after redirect back)**

**Request:**
```json
{
  "session_id": "cs_test_...",
  "user_id": "user_123"
}
```

**Response:**
```json
{
  "user_id": "user_123",
  "tier": "pro",
  "subscription_id": "sub_...",
  "status": "active",
  "current_period_end": "2026-04-27T17:55:00Z"
}
```

**Backend logic:**
1. Retrieve checkout session from Stripe:
   ```python
   session = stripe.checkout.Session.retrieve(session_id)
   ```
2. Verify `payment_status == 'paid'`
3. Extract `subscription_id` from session
4. Create subscription record in DB:
   ```sql
   INSERT INTO subscriptions (
       user_id, stripe_subscription_id, tier, status, current_period_end
   ) VALUES (
       'user_123', 'sub_...', 'pro', 'active', '2026-04-27'
   )
   ```
5. Update user tier: `UPDATE users SET tier='pro' WHERE id='user_123'`
6. Return subscription details

---

### 4. GET /api/subscriptions/current
**Get current subscription details**

**Request:** (Authenticated)
```
GET /api/subscriptions/current
Authorization: Bearer [JWT_TOKEN]
```

**Response:**
```json
{
  "tier": "pro",
  "subscription_id": "sub_...",
  "status": "active",
  "current_period_start": "2026-03-27T17:55:00Z",
  "current_period_end": "2026-04-27T17:55:00Z",
  "cancel_at": null,
  "cancel_at_period_end": false
}
```

**Backend logic:**
1. Get user from JWT
2. Look up subscription in DB
3. Return subscription details

---

### 5. POST /api/subscriptions/cancel
**Cancel Pro subscription (effective end of billing period)**

**Request:**
```json
{
  "user_id": "user_123",
  "reason": "Too expensive" // optional
}
```

**Response:**
```json
{
  "subscription_id": "sub_...",
  "status": "active",
  "cancel_at_period_end": true,
  "current_period_end": "2026-04-27T17:55:00Z",
  "message": "Your subscription will end on 2026-04-27"
}
```

**Backend logic:**
1. Get subscription from DB
2. Cancel at period end:
   ```python
   stripe.Subscription.modify(
       stripe_subscription_id,
       cancel_at_period_end=True
   )
   ```
3. Update DB: `UPDATE subscriptions SET status='canceled' WHERE user_id='user_123'`
4. Return cancellation details

---

### 6. POST /api/subscriptions/reactivate
**Reactivate canceled subscription (before period end)**

**Request:**
```json
{
  "user_id": "user_123"
}
```

**Response:**
```json
{
  "subscription_id": "sub_...",
  "status": "active",
  "cancel_at_period_end": false
}
```

**Backend logic:**
1. Get subscription
2. Reactivate on Stripe:
   ```python
   stripe.Subscription.modify(
       stripe_subscription_id,
       cancel_at_period_end=False
   )
   ```
3. Update DB: `UPDATE subscriptions SET status='active' WHERE ...`

---

## Webhooks (Event Handling)

**Purpose:** Update subscription status when Stripe events occur (renewal, failure, cancellation)

**Webhook endpoint:** `POST /api/webhooks/stripe`

**Events to handle:**

### 1. `payment_intent.succeeded`
**When:** Payment successful (subscription created or renewed)

```python
@app.post('/api/webhooks/stripe')
def handle_webhook(request):
    event = stripe.Event.construct_from(request.json, stripe.api_key)
    
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        customer_id = payment_intent['customer']
        
        # Update subscription status
        user = db.query('users WHERE stripe_customer_id=?', customer_id)
        db.execute('''
            UPDATE subscriptions SET status='active'
            WHERE user_id=?
        ''', user.id)
        
        return {'status': 'ok'}
```

### 2. `invoice.payment_failed`
**When:** Payment failed (could lose subscription if retry exhausted)

```python
    if event['type'] == 'invoice.payment_failed':
        invoice = event['data']['object']
        customer_id = invoice['customer']
        
        # Log failed payment (for retry logic)
        user = db.query('users WHERE stripe_customer_id=?', customer_id)
        db.insert('failed_payments', {
            'user_id': user.id,
            'stripe_invoice_id': invoice['id'],
            'retry_count': invoice.get('attempt_count', 1),
            'created_at': now()
        })
        
        # Stripe will retry automatically (3 attempts over 5 days)
        # If final retry fails, subscription auto-cancels
```

### 3. `customer.subscription.deleted`
**When:** Subscription canceled (either by user or failed payment after retries)

```python
    if event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        stripe_subscription_id = subscription['id']
        
        # Update subscription status
        db.execute('''
            UPDATE subscriptions SET status='canceled'
            WHERE stripe_subscription_id=?
        ''', stripe_subscription_id)
        
        # Downgrade user to free tier
        subscription = db.query(
            'subscriptions WHERE stripe_subscription_id=?',
            stripe_subscription_id
        )
        user = db.query('users WHERE id=?', subscription.user_id)
        db.execute('UPDATE users SET tier=? WHERE id=?', 'free', user.id)
        
        # Send cancellation email
        send_email(user.email, 'We miss you!', 'cancellation_template.html')
```

### 4. `customer.subscription.updated`
**When:** Subscription plan changed (upgrade/downgrade)

```python
    if event['type'] == 'customer.subscription.updated':
        subscription = event['data']['object']
        
        # Determine new tier
        price_id = subscription['items']['data'][0]['price']['id']
        new_tier = PRICE_ID_TO_TIER[price_id]  # Map: STRIPE_PRICE_ID_PRO -> 'pro'
        
        # Update user tier
        stripe_subscription_id = subscription['id']
        db_subscription = db.query(
            'subscriptions WHERE stripe_subscription_id=?',
            stripe_subscription_id
        )
        db.execute(
            'UPDATE users SET tier=? WHERE id=?',
            new_tier, db_subscription.user_id
        )
```

**Setup (in Stripe dashboard):**
1. Go to Developers > Webhooks
2. Add endpoint: `https://api.signal.com/api/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. Copy webhook signing secret → store in `.env`

---

## Frontend Integration (React)

### 1. Signup Flow (Free)

```jsx
// pages/SignupPage.jsx
import { useState } from 'react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          tier: 'free'
        })
      });

      const { user_id, token } = await response.json();
      localStorage.setItem('jwt', token);
      window.location.href = '/app/onboarding'; // Free tier onboarding
    } catch (error) {
      console.error('Signup failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <h1>Get Started Free</h1>
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleSignup} disabled={loading}>
        {loading ? 'Creating account...' : 'Sign Up Free'}
      </button>
    </div>
  );
}
```

### 2. Pricing Page + Checkout

```jsx
// pages/PricingPage.jsx
import { useState } from 'react';

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  const handleUpgradeClick = async () => {
    setLoading(true);
    try {
      const jwt = localStorage.getItem('jwt');
      const response = await fetch('/api/subscriptions/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({ tier: 'pro' })
      });

      const { checkout_url } = await response.json();
      window.location.href = checkout_url; // Redirect to Stripe checkout
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pricing-container">
      <div className="tier free">
        <h2>Free</h2>
        <p className="price">$0/month</p>
        <ul>
          <li>3-5 signals/week</li>
          <li>48h delayed</li>
        </ul>
        <button disabled>Current Plan</button>
      </div>

      <div className="tier pro highlight">
        <h2>Pro</h2>
        <p className="price">$19.99/month</p>
        <ul>
          <li>25+ signals/week</li>
          <li>Real-time alerts</li>
          <li>Backtesting</li>
        </ul>
        <button onClick={handleUpgradeClick} disabled={loading}>
          {loading ? 'Loading...' : 'Upgrade to Pro'}
        </button>
      </div>
    </div>
  );
}
```

### 3. Checkout Success Page

```jsx
// pages/CheckoutSuccess.jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const confirmCheckout = async () => {
      try {
        const jwt = localStorage.getItem('jwt');
        const response = await fetch('/api/subscriptions/confirm-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`
          },
          body: JSON.stringify({ session_id: sessionId })
        });

        const subscription = await response.json();
        setStatus('success');
        
        // Redirect to app after 3 seconds
        setTimeout(() => {
          window.location.href = '/app/dashboard';
        }, 3000);
      } catch (error) {
        console.error('Confirmation failed:', error);
        setStatus('error');
      }
    };

    confirmCheckout();
  }, [sessionId]);

  return (
    <div className="checkout-success">
      {status === 'loading' && <p>Confirming your subscription...</p>}
      {status === 'success' && (
        <div>
          <h1>Welcome to Pro! 🎉</h1>
          <p>Your subscription is active. Redirecting...</p>
        </div>
      )}
      {status === 'error' && (
        <div>
          <h1>Something went wrong</h1>
          <p>Please contact support</p>
        </div>
      )}
    </div>
  );
}
```

### 4. Subscription Management Page

```jsx
// pages/SubscriptionPage.jsx
import { useEffect, useState } from 'react';

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      const jwt = localStorage.getItem('jwt');
      const response = await fetch('/api/subscriptions/current', {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      const data = await response.json();
      setSubscription(data);
      setLoading(false);
    };

    fetchSubscription();
  }, []);

  const handleCancel = async () => {
    if (window.confirm('Are you sure? You\'ll lose Pro access after your billing period ends.')) {
      const jwt = localStorage.getItem('jwt');
      await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      alert('Subscription canceled. You have access until ' + subscription.current_period_end);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="subscription-management">
      <h1>Subscription</h1>
      <div className="subscription-details">
        <p><strong>Plan:</strong> {subscription.tier}</p>
        <p><strong>Status:</strong> {subscription.status}</p>
        <p><strong>Renews:</strong> {new Date(subscription.current_period_end).toLocaleDateString()}</p>
        {subscription.cancel_at && (
          <p className="warning">
            Canceling on {new Date(subscription.cancel_at).toLocaleDateString()}
          </p>
        )}
      </div>
      <button onClick={handleCancel}>
        {subscription.status === 'canceled' ? 'Reactivate' : 'Cancel Subscription'}
      </button>
    </div>
  );
}
```

---

## Environment Variables (.env)

```
# Stripe
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_PROFESSIONAL=price_...

# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your_jwt_secret_key

# Email (for cancellation notifications)
SENDGRID_API_KEY=...
```

---

## Testing Checklist

- [ ] Free signup works (user created, Stripe customer created)
- [ ] Upgrade flow works (checkout session created, redirects to Stripe)
- [ ] Checkout success page confirms subscription
- [ ] Subscription status displays correctly
- [ ] Cancel subscription works (status updated, user gets free tier)
- [ ] Reactivate subscription works
- [ ] Webhook for payment_intent.succeeded updates status
- [ ] Webhook for customer.subscription.deleted downgrades user
- [ ] Failed payment email is sent
- [ ] Cancellation email is sent
- [ ] Test with Stripe test cards:
  - Success: `4242 4242 4242 4242` (any exp date, any CVC)
  - Decline: `4000 0000 0000 0002`

---

## Deployment Checklist

- [ ] All API endpoints tested (staging)
- [ ] Webhook endpoint configured (staging + production)
- [ ] Environment variables set in production
- [ ] HTTPS enabled (Stripe requires it)
- [ ] CSRF protection enabled (Stripe checkout)
- [ ] Rate limiting enabled (prevent abuse)
- [ ] Error handling + logging in place
- [ ] Monitoring alerts set up (payment failures, webhook failures)

---

## Post-Launch Monitoring

**Metrics to track:**
- Free signups per day
- Free→Pro conversion rate (target: 5%)
- Subscription renewal success rate (target: >95%)
- Payment failure rate (target: <5%)
- Churn rate (target: <12%/month)
- Average revenue per user (ARPU)

**Where to monitor:**
- Stripe Dashboard (payments, subscriptions, disputes)
- Database queries (subscription counts, MRR calculation)
- Analytics tool (free signups, upgrade flow completion)

---

**Next Step:** Backend engineer implements endpoints + webhooks. Estimated: 4-6 hours.

*Stripe integration spec complete and ready for implementation.*
