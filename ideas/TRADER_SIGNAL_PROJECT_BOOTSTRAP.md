# Trader Signal Post-Mortem — Project Bootstrap Guide

**Purpose:** One-command setup to start development  
**Time to First Run:** < 10 minutes  
**Status:** Ready to implement  

---

## Quick Start (For Joe)

### Option A: Use GitHub Codespaces (Recommended)
```bash
# 1. Create empty repo on GitHub: trader-signal-postmortem (private)
# 2. Open Codespaces
# 3. Run:

git clone https://github.com/yourusername/trader-signal-postmortem.git
cd trader-signal-postmortem

# 4. Follow "Initialize Project" section below
```

### Option B: Local Development
```bash
mkdir trader-signal-postmortem
cd trader-signal-postmortem
git init

# Follow "Initialize Project" section below
```

---

## Initialize Project

### 1. Backend Setup

```bash
mkdir backend
cd backend

# Initialize Node project
npm init -y

# Install dependencies
npm install express typescript ts-node dotenv cors uuid
npm install --save-dev typescript @types/express @types/node nodemon

# Create TypeScript config
npx tsc --init

# Create basic folder structure
mkdir src/{api,middleware,models,utils,jobs}
touch src/index.ts src/.env.example

# Initialize git
echo "node_modules/" >> .gitignore
echo ".env" >> .gitignore
echo "dist/" >> .gitignore

cd ..
```

### 2. Database Setup (PostgreSQL)

```bash
# Create docker-compose.yml for local Postgres
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: trader_user
      POSTGRES_PASSWORD: trader_pass
      POSTGRES_DB: trader_signals
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
EOF

# Start Postgres
docker-compose up -d

# Verify
psql -h localhost -U trader_user -d trader_signals -c "SELECT version();"
```

### 3. Frontend Setup

```bash
# Create React app
npx create-react-app frontend --template typescript
cd frontend

# Add dependencies
npm install axios react-router-dom @tanstack/react-query
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Configure Tailwind (tailwind.config.js already created)
# Just verify index.css includes:
# @tailwind base;
# @tailwind components;
# @tailwind utilities;

cd ..
```

### 4. Project Structure

```
trader-signal-postmortem/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── auth.ts          # /auth/register, /auth/login
│   │   │   ├── setups.ts        # /api/setups CRUD
│   │   │   ├── signals.ts       # /api/signals ingestion & list
│   │   │   ├── outcomes.ts      # /api/signals/:id/outcome
│   │   │   └── reports.ts       # /api/reports/weekly
│   │   ├── middleware/
│   │   │   ├── auth.ts          # JWT validation
│   │   │   └── errorHandler.ts
│   │   ├── models/
│   │   │   ├── user.ts
│   │   │   ├── setup.ts
│   │   │   ├── signal.ts
│   │   │   └── outcome.ts
│   │   ├── utils/
│   │   │   ├── db.ts            # Postgres connection
│   │   │   ├── jwt.ts           # Token generation
│   │   │   └── parser.ts        # Alert parsing
│   │   ├── jobs/
│   │   │   ├── weeklyReportJob.ts
│   │   │   └── scheduler.ts
│   │   └── index.ts             # Express app entry
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_indexes.sql
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── docker-compose.yml (copy from above)
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SetupListPage.tsx
│   │   │   ├── SignalReviewPage.tsx
│   │   │   ├── PerformanceDashboard.tsx
│   │   │   └── WeeklyReportPage.tsx
│   │   ├── components/
│   │   │   ├── SignalForm.tsx
│   │   │   ├── SignalCard.tsx
│   │   │   ├── PerformanceChart.tsx
│   │   │   └── Navbar.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useSignals.ts
│   │   │   └── useSetups.ts
│   │   ├── App.tsx
│   │   └── index.css
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml (Postgres)
├── .gitignore
└── README.md
```

---

## Database Migrations (Run on Startup)

### Create migration file: `backend/migrations/001_initial_schema.sql`

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  timezone VARCHAR(50) DEFAULT 'UTC',
  slack_webhook_url TEXT,
  notification_frequency VARCHAR(20) DEFAULT 'weekly',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Setups table
CREATE TABLE IF NOT EXISTS setups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  rules_summary TEXT,
  total_signals INT DEFAULT 0,
  winning_signals INT DEFAULT 0,
  current_win_rate DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- Signals table
CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  setup_id UUID NOT NULL REFERENCES setups(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  timeframe VARCHAR(20),
  entry_price DECIMAL(15,8) NOT NULL,
  entry_time TIMESTAMP NOT NULL,
  source VARCHAR(50),
  raw_alert_text TEXT,
  conditions_parsed JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  outcome_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Signal Outcomes table
CREATE TABLE IF NOT EXISTS signal_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL UNIQUE REFERENCES signals(id) ON DELETE CASCADE,
  exit_price DECIMAL(15,8),
  exit_time TIMESTAMP,
  exit_reason VARCHAR(50),
  pnl_dollars DECIMAL(15,8),
  pnl_percent DECIMAL(10,4),
  r_multiple DECIMAL(10,4),
  duration_minutes INT,
  quality_score INT,
  follow_through_met BOOLEAN,
  trader_notes TEXT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weekly Reports table
CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  top_setups JSONB,
  underperforming_setups JSONB,
  insights JSONB,
  action_items TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP,
  slack_sent BOOLEAN DEFAULT FALSE,
  slack_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_setups_user ON setups(user_id);
CREATE INDEX idx_signals_user_status ON signals(user_id, status);
CREATE INDEX idx_signals_setup ON signals(setup_id);
CREATE INDEX idx_signals_created ON signals(created_at DESC);
CREATE INDEX idx_outcomes_signal ON signal_outcomes(signal_id);
CREATE INDEX idx_reports_user_week ON weekly_reports(user_id, week_start DESC);
```

### Run migrations:

```bash
# From backend directory
psql -h localhost -U trader_user -d trader_signals < migrations/001_initial_schema.sql

# Verify
psql -h localhost -U trader_user -d trader_signals -c "\dt"
```

---

## Backend Skeleton Code

### `backend/src/index.ts`

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
export const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'trader_user',
  password: process.env.DB_PASSWORD || 'trader_pass',
  database: process.env.DB_NAME || 'trader_signals',
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes (to be implemented)
// app.use('/api/auth', authRoutes);
// app.use('/api/setups', setupRoutes);
// app.use('/api/signals', signalRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

### `backend/.env.example`

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=trader_user
DB_PASSWORD=trader_pass
DB_NAME=trader_signals

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key-change-in-production

# Email (SendGrid)
SENDGRID_API_KEY=your-key-here
EMAIL_FROM=noreply@signalpost.io

# TradingView Webhook (optional)
TRADINGVIEW_WEBHOOK_TOKEN=your-token-here
```

### Copy .env.example to .env and update secrets:

```bash
cd backend
cp .env.example .env
# Edit .env with real values
```

---

## Frontend Skeleton Code

### `frontend/src/pages/LoginPage.tsx`

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('Login failed');
      const { token } = await res.json();
      localStorage.setItem('token', token);
      navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Signal Post-Mortem</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded"
            required
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">
            Login
          </button>
        </form>
        {error && <p className="text-red-600 mt-4">{error}</p>}
      </div>
    </div>
  );
}
```

---

## Development Workflow

### Terminal 1: Backend
```bash
cd backend
npm run dev
# Watches src/ and restarts on changes
```

### Terminal 2: Frontend
```bash
cd frontend
npm start
# Opens http://localhost:3000
```

### Terminal 3: Database (one-time)
```bash
docker-compose up
```

---

## Next Steps (For Joe)

1. **Clone/initialize repo**
   ```bash
   mkdir trader-signal-postmortem && cd trader-signal-postmortem
   git init
   ```

2. **Follow "Initialize Project" above** (5 minutes)

3. **Start Week 1 development:**
   - Implement `/auth/register` + `/auth/login`
   - Complete setup CRUD endpoints
   - Build login/registration UI

4. **Check progress against** `TRADER_SIGNAL_MVP_PLAN_2026-04-13.md`

5. **Daily:**
   - Commit to git
   - Update progress in kanban card comments
   - Identify blockers early

---

## Useful Commands

```bash
# Format code
npm run format

# Run tests
npm run test

# Database
psql -h localhost -U trader_user -d trader_signals
\dt                  # List tables
\d signals           # Describe signals table

# Reset database (dev only)
docker-compose down
docker-compose up

# Deploy to staging
npm run build && npm run deploy:staging
```

---

## Architecture Decision Log

### Database Choice: PostgreSQL
- ✅ Strong typing (UUID, JSONB, DECIMAL for financial data)
- ✅ Native JSON support (for flexible conditions parsing)
- ✅ Great for financial calculations (DECIMAL precision)
- ✅ Free tier available (Supabase)

### Frontend Framework: React
- ✅ Fast development (Joe familiar)
- ✅ Component reusability
- ✅ Large ecosystem (Recharts, Shadcn/ui)

### Hosting: Vercel + Render
- ✅ Automated deployments
- ✅ Free/cheap tiers
- ✅ Easy scaling

---

## Estimated Build Timeline

| Phase | Time | Cost |
|-------|------|------|
| Week 1 (Auth + Setup CRUD) | 20 hours | $0 |
| Week 2 (Signal Ingestion) | 20 hours | $0 |
| Week 3 (Outcomes + Review) | 20 hours | $0 |
| Week 4 (Reports + Deploy) | 20 hours | $0 |
| **Total** | **80 hours** | **$0 (solo)** |

**With agency developer:** Reduce to 40-50 hours parallel work (cost: $3k-$5k)

---

## Questions?

Refer to:
- **Blueprint:** `TRADER_SIGNAL_POSTMORTEM_BLUEPRINT_2026-04-13.md`
- **Tech Spec:** `TRADER_SIGNAL_TECH_SPEC_2026-04-13.md`
- **MVP Plan:** `TRADER_SIGNAL_MVP_PLAN_2026-04-13.md`

---

**Ready to build. Start Week 1 now.**
