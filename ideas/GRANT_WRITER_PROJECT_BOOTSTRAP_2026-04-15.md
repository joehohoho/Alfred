# AI Grant Writer for Nonprofits — Project Bootstrap Guide
**Date:** 2026-04-15  
**Purpose:** Get from zero to running code in <15 minutes  
**Audience:** Joe, backend developer, frontend developer

---

## One-Command Setup (Recommended)

If you have Docker installed:

```bash
# Clone repo
git clone https://github.com/joho/grantwriter.git
cd grantwriter

# Copy environment template
cp .env.example .env

# Start everything (database + app)
docker-compose up --build

# In another terminal, run migrations
docker-compose exec app npm run migrate

# Visit http://localhost:3000
```

**That's it.** You now have:
- ✅ PostgreSQL running on `localhost:5432`
- ✅ Express API on `localhost:3001`
- ✅ React frontend on `localhost:3000`
- ✅ Database schema initialized

---

## Manual Setup (Without Docker)

### 1. Prerequisites

**Install these first:**
- Node.js 18+ (https://nodejs.org)
- PostgreSQL 14+ (https://www.postgresql.org/download/)
- Git (https://git-scm.com)

**Verify installation:**
```bash
node --version    # v18.0.0+
npm --version     # 9.0.0+
psql --version    # psql 14+
git --version     # git 2.0+
```

### 2. Clone Repository

```bash
git clone https://github.com/joho/grantwriter.git
cd grantwriter
```

### 3. Set Up Backend

#### 3a. Install Dependencies

```bash
cd backend
npm install
```

#### 3b. Configure Environment

```bash
cp .env.example .env
```

**Edit `.env` with your values:**
```
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/grantwriter_dev

# Auth0 (get from Auth0 dashboard)
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret

# Claude API (get from Anthropic dashboard)
ANTHROPIC_API_KEY=sk-ant-xxx

# Email (SendGrid)
SENDGRID_API_KEY=sg-xxx

# Storage (AWS S3)
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=grantwriter-dev

# Stripe (test keys)
STRIPE_SECRET_KEY=sk_test_xxx

# Environment
NODE_ENV=development
API_URL=http://localhost:3001
```

#### 3c. Set Up Database

```bash
# Create database
createdb grantwriter_dev

# Run migrations
npm run migrate

# Seed initial data (optional)
npm run seed
```

#### 3d. Start Backend

```bash
npm run dev
# Server running on http://localhost:3001
```

### 4. Set Up Frontend

In a new terminal:

```bash
cd frontend
npm install
```

**Configure environment:**
```bash
cp .env.example .env.local
```

**Edit `.env.local`:**
```
VITE_API_URL=http://localhost:3001
VITE_AUTH0_DOMAIN=your-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id
```

**Start development server:**
```bash
npm run dev
# Frontend running on http://localhost:3000
```

### 5. Verify Everything Works

1. Open http://localhost:3000 in browser
2. See landing page (or signup if auth configured)
3. Try to sign up (will fail without Auth0, but UI should load)
4. Check http://localhost:3001/health (should return `{"status":"ok"}`)

---

## Project Structure

```
grantwriter/
├── backend/                      # Express + TypeScript
│   ├── src/
│   │   ├── index.ts             # Entry point
│   │   ├── middleware/          # Auth, error handling, logging
│   │   ├── routes/              # API endpoints
│   │   │   ├── auth.ts
│   │   │   ├── proposals.ts
│   │   │   ├── funders.ts
│   │   │   ├── compliance.ts
│   │   │   └── teams.ts
│   │   ├── services/            # Business logic
│   │   │   ├── claudeService.ts
│   │   │   ├── proposalService.ts
│   │   │   ├── funderService.ts
│   │   │   └── matchingService.ts
│   │   ├── models/              # Database queries
│   │   │   ├── User.ts
│   │   │   ├── Organization.ts
│   │   │   ├── Proposal.ts
│   │   │   ├── Funder.ts
│   │   │   └── ComplianceItem.ts
│   │   └── utils/               # Helpers, constants
│   ├── migrations/              # Database migrations
│   ├── seeds/                   # Seed data (funders, templates)
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                     # React + TypeScript
│   ├── src/
│   │   ├── main.tsx            # Entry point
│   │   ├── App.tsx             # Root component
│   │   ├── pages/              # Page components
│   │   │   ├── Landing.tsx
│   │   │   ├── Signup.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ProposalList.tsx
│   │   │   ├── ProposalDetail.tsx
│   │   │   ├── ProposalEditor.tsx
│   │   │   ├── FunderSearch.tsx
│   │   │   ├── Compliance.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/         # Reusable components
│   │   │   ├── Navbar.tsx
│   │   │   ├── ProposalForm.tsx
│   │   │   ├── FunderCard.tsx
│   │   │   ├── ComplianceChecklist.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── services/           # API client
│   │   │   ├── api.ts          # Fetch wrapper
│   │   │   └── auth.ts         # Auth0 integration
│   │   ├── hooks/              # Custom React hooks
│   │   ├── context/            # Context providers (Auth)
│   │   ├── styles/             # Global CSS
│   │   └── utils/              # Helpers
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── docker-compose.yml           # Local PostgreSQL + Redis
├── .gitignore
├── README.md
└── CONTRIBUTING.md
```

---

## Database Schema (Quick Reference)

Run migrations automatically with `npm run migrate`, or manually:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  auth_id VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  mission_statement TEXT,
  focus_areas TEXT[],
  plan_type VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT now()
);

-- Proposals table
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  title VARCHAR(255),
  type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'draft',
  content JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Funders table
CREATE TABLE funders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  grant_size_min DECIMAL,
  grant_size_max DECIMAL,
  focus_areas TEXT[],
  deadline TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- Compliance items table
CREATE TABLE compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  item_type VARCHAR(100),
  deadline TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
);

-- Team members table
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMP DEFAULT now()
);
```

---

## Backend Skeleton Code

### `backend/src/index.ts`

```typescript
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// TODO: Add routes (auth, proposals, funders, etc.)

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
```

### `backend/src/services/claudeService.ts`

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function generateProposalSection(
  section: string,
  orgContext: any,
  funderContext: any
): Promise<{ content: string; tokens: number }> {
  const prompt = buildPrompt(section, orgContext, funderContext);

  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = response.content[0].type === "text" ? response.content[0].text : "";

  return {
    content,
    tokens: response.usage.output_tokens,
  };
}

function buildPrompt(section: string, orgContext: any, funderContext: any): string {
  const basePrompt = `You are an expert nonprofit grant writer. Generate compelling, specific content.`;

  const prompts: Record<string, string> = {
    intro: `Write a compelling 100-150 word introduction for a grant proposal.
      Organization: ${orgContext.name}
      Mission: ${orgContext.mission}`,
    
    mission_alignment: `Explain how the organization aligns with the funder's priorities.
      Organization: ${orgContext.name}
      Mission: ${orgContext.mission}
      Funder: ${funderContext.name}
      Funder Focus: ${funderContext.focus_areas.join(", ")}
      Length: 150-200 words`,
  };

  return prompts[section] || prompts.intro;
}
```

---

## Frontend Skeleton Code

### `frontend/src/App.tsx`

```typescript
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Landing from './pages/Landing';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ProposalEditor from './pages/ProposalEditor';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={<PrivateRoute component={Dashboard} />}
          />
          <Route
            path="/proposals/:id/edit"
            element={<PrivateRoute component={ProposalEditor} />}
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
```

### `frontend/src/pages/Landing.tsx`

```typescript
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between">
          <h1 className="text-2xl font-bold text-indigo-600">Grant Writer</h1>
          <div className="space-x-4">
            <Link to="/signup" className="btn btn-primary">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          AI-Powered Grant Writing for Nonprofits
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          Write better proposals in half the time with AI assistance.
        </p>
        <Link to="/signup" className="btn btn-lg btn-primary">
          Get Started Free
        </Link>
      </main>
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
# Watches for changes, auto-restarts server
```

### Terminal 2: Frontend

```bash
cd frontend
npm run dev
# Watches for changes, hot-reloads
```

### Terminal 3: Database (Optional, if using Docker)

```bash
docker-compose up postgres redis
# Keeps database + cache running
```

### Useful Commands

```bash
# Backend
npm run migrate          # Run database migrations
npm run seed             # Seed initial data
npm test                 # Run tests
npm run lint             # Check TypeScript

# Frontend
npm run type-check       # Check TypeScript
npm run build            # Production build
npm test                 # Run tests

# Database (psql)
psql grantwriter_dev                    # Connect to DB
\dt                                      # List tables
SELECT COUNT(*) FROM proposals;          # Count proposals
```

---

## Environment Variables Checklist

**Backend (.env):**
- [ ] `DATABASE_URL` — PostgreSQL connection string
- [ ] `AUTH0_DOMAIN` — Auth0 tenant domain
- [ ] `AUTH0_CLIENT_ID` — Auth0 application ID
- [ ] `AUTH0_CLIENT_SECRET` — Auth0 secret
- [ ] `ANTHROPIC_API_KEY` — Claude API key
- [ ] `SENDGRID_API_KEY` — Email service key
- [ ] `AWS_ACCESS_KEY_ID` — AWS credentials
- [ ] `AWS_SECRET_ACCESS_KEY` — AWS credentials
- [ ] `AWS_S3_BUCKET` — S3 bucket name
- [ ] `STRIPE_SECRET_KEY` — Stripe test key
- [ ] `NODE_ENV` — `development` or `production`

**Frontend (.env.local):**
- [ ] `VITE_API_URL` — Backend URL (http://localhost:3001)
- [ ] `VITE_AUTH0_DOMAIN` — Auth0 domain
- [ ] `VITE_AUTH0_CLIENT_ID` — Auth0 client ID

---

## Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Fix:** Ensure PostgreSQL is running:
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Or use Docker
docker-compose up postgres -d
```

### Auth0 Not Configured
```
Error: Auth0 callback not working
```
**Fix:** Set up Auth0 tenant (free tier available):
1. Go to https://auth0.com (sign up free)
2. Create a new Application (Regular Web App)
3. Copy Domain + Client ID → .env files
4. Add http://localhost:3000 to Allowed Callback URLs

### Claude API Error
```
Error: Invalid API key provided
```
**Fix:** Get API key from https://console.anthropic.com/account/keys
- Ensure key starts with `sk-ant-`
- Add to `.env` as `ANTHROPIC_API_KEY`

### Port Already in Use
```
Error: EADDRINUSE: address already in use :::3001
```
**Fix:**
```bash
# Kill process using port 3001
lsof -i :3001
kill -9 <PID>
```

---

## Next Steps After Bootstrap

1. ✅ Verify everything runs locally
2. [ ] Set up GitHub repository + push code
3. [ ] Configure CI/CD (GitHub Actions)
4. [ ] Deploy to staging environment (Railway/Render)
5. [ ] Set up production database
6. [ ] Deploy to production (Vercel + Railway)
7. [ ] Monitor in production (Sentry + PostHog)

---

## Key Files to Customize

| File | Purpose | Customize When |
|------|---------|-----------------|
| `.env` | Environment variables | Each environment (dev, staging, prod) |
| `package.json` | Project metadata + dependencies | Adding new packages |
| `docker-compose.yml` | Local services (DB, cache) | Changing database version |
| `tsconfig.json` | TypeScript config | Adjusting strict mode |
| `tailwind.config.js` | UI theming | Changing brand colors |

---

## Important Notes

1. **Never commit `.env`** — It contains secrets. Add to `.gitignore`.
2. **Run migrations before starting** — Schema must exist before app runs.
3. **Auth0 is required** — Landing page works without auth, but signup requires Auth0 setup.
4. **Claude API key is required** — Copilot feature won't work without valid key.
5. **Seed data helps testing** — Run `npm run seed` to populate sample funders.

---

## Success Criteria

You'll know everything is working when:
- ✅ `http://localhost:3000` shows landing page
- ✅ `http://localhost:3001/health` returns `{"status":"ok"}`
- ✅ You can sign up (with Auth0 configured)
- ✅ You can create a new proposal
- ✅ Database has data (check with `psql`)

**Once all boxes are checked, you're ready to start Week 1 development!**

