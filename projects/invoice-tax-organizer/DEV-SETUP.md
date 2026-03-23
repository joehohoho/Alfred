# TaxInvoice.ca — Developer Setup & Getting Started

**Quick Reference:** All critical files are in `/Users/hopenclaw/.openclaw/workspace/projects/invoice-tax-organizer/`

---

## Prerequisites

**Required:**
- Node.js 18+ (check: `node --version`)
- npm 9+ (check: `npm --version`)
- Git (check: `git --version`)
- PostgreSQL 14+ (local or Docker)
- GitHub account (for repo)

**Optional but Recommended:**
- Docker + Docker Compose (for PostgreSQL dev environment)
- VS Code with Prisma extension
- Thunder Client or Postman (API testing)

---

## 1. Local Environment Setup (First Time)

### Clone & Install

```bash
# Create project directory (if starting fresh)
cd ~/.openclaw/workspace/projects/invoice-tax-organizer

# Initialize git repo
git init
git config user.name "Joe Ho"
git config user.email "joesubsho@gmail.com"

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
.env.*.local
dist/
build/
.next/
.DS_Store
*.log
.idea/
.vscode/
EOF

# Create basic project structure
mkdir -p frontend backend
```

### Frontend Setup (Next.js)

```bash
cd frontend

# Create Next.js 14 project
npx create-next-app@14 . --typescript --tailwind --eslint

# Install additional dependencies
npm install \
  react-dropzone \
  tesseract.js \
  axios \
  zustand \
  date-fns \
  recharts \
  clsx \
  tailwind-merge

# Create .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=TaxInvoice.ca
EOF

# Verify setup
npm run build
npm run dev
# Should see: ▲ Next.js 14.0.0
```

### Backend Setup (Express + Prisma + PostgreSQL)

```bash
cd ../backend

# Initialize Node project
npm init -y

# Install dependencies
npm install \
  express \
  cors \
  dotenv \
  @prisma/client \
  @supabase/supabase-js \
  multer \
  pdfkit \
  uuid \
  jsonwebtoken \
  bcryptjs

npm install -D \
  typescript \
  @types/node \
  @types/express \
  prisma \
  ts-node \
  nodemon

# Initialize TypeScript config
npx tsc --init

# Initialize Prisma
npx prisma init

# Create .env for database
cat > .env << 'EOF'
DATABASE_URL="postgresql://user:password@localhost:5432/taxinvoice_dev"
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
JWT_SECRET=your-jwt-secret-key-min-32-chars
PORT=3001
NODE_ENV=development
EOF

# Create package.json scripts
# Add to scripts section:
# "dev": "nodemon --exec ts-node src/index.ts",
# "build": "tsc",
# "start": "node dist/index.js"
```

### PostgreSQL (Docker Option)

```bash
# Start PostgreSQL in Docker
docker run --name taxinvoice-db \
  -e POSTGRES_USER=taxinvoice \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=taxinvoice_dev \
  -p 5432:5432 \
  -d postgres:15

# Verify connection
docker exec taxinvoice-db psql -U taxinvoice -d taxinvoice_dev -c "SELECT 1"
```

---

## 2. Database Schema Setup

### Prisma Schema (`backend/prisma/schema.prisma`)

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String     @id @default(uuid())
  email     String     @unique
  passwordHash String
  plan      String     @default("free") // free | premium
  subscriptionDate DateTime?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  clients   Client[]
  invoices  Invoice[]

  @@map("users")
}

model Client {
  id        String     @id @default(uuid())
  userId    String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String
  phone     String?
  email     String?
  sin       String?    // CRA requirement for T4A
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  invoices  Invoice[]

  @@map("clients")
}

model Invoice {
  id              String     @id @default(uuid())
  userId          String
  user            User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  clientId        String
  client          Client     @relation(fields: [clientId], references: [id], onDelete: Cascade)
  
  invoiceDate     DateTime
  amountCents     BigInt     // Store as cents (e.g., $42.50 = 4250)
  currency        String     @default("CAD")
  description     String?
  fileUrl         String?    // S3/B2 path to PDF
  ocrConfidence   Decimal?   @db.Decimal(5, 2) // 0-100%
  paymentStatus   String     @default("outstanding") // paid | outstanding | in_progress
  
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  metadata        InvoiceMetadata?

  @@map("invoices")
}

model InvoiceMetadata {
  id              String     @id @default(uuid())
  invoiceId       String     @unique
  invoice         Invoice    @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  extractedText   String?    // Raw OCR output
  fieldDate       String?
  fieldAmount     String?
  fieldPayer      String?
  verifiedByUser  Boolean    @default(false)
  
  createdAt       DateTime   @default(now())

  @@map("invoice_metadata")
}
```

### Run Migrations

```bash
cd backend

# Create migrations
npx prisma migrate dev --name init

# Verify database schema
npx prisma studio
# Opens http://localhost:5555 (visual database explorer)
```

---

## 3. Project Structure

```
invoice-tax-organizer/
├── frontend/                    # Next.js 14 app
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Marketing home page (landing)
│   │   ├── dashboard/
│   │   │   ├── page.tsx        # Main dashboard
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx    # Invoice list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx # Invoice detail + OCR verify
│   │   │   ├── clients/
│   │   │   │   └── page.tsx    # Client management
│   │   │   ├── summary/
│   │   │   │   └── page.tsx    # Annual summary + exports
│   │   │   └── settings/
│   │   │       └── page.tsx    # User settings
│   │   └── api/
│   │       └── auth/
│   │           ├── login/route.ts
│   │           └── signup/route.ts
│   ├── components/
│   │   ├── InvoiceUpload.tsx   # Drag-drop upload
│   │   ├── OCRModal.tsx        # Field verification
│   │   ├── ClientForm.tsx      # Create/edit client
│   │   ├── SummaryDashboard.tsx # Annual summary
│   │   └── Navbar.tsx          # Top navigation
│   ├── hooks/
│   │   ├── useAuth.ts          # Auth state
│   │   ├── useInvoices.ts      # Invoice fetch/CRUD
│   │   └── useClients.ts       # Client fetch/CRUD
│   ├── utils/
│   │   ├── api.ts              # Axios instance + endpoints
│   │   └── format.ts           # Number/date formatting
│   ├── styles/
│   │   └── globals.css         # Tailwind overrides
│   ├── .env.local              # Frontend config
│   └── package.json
│
├── backend/                     # Express + Prisma
│   ├── src/
│   │   ├── index.ts            # Server entry point
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT verification
│   │   │   └── error.ts        # Error handling
│   │   ├── routes/
│   │   │   ├── auth.ts         # /api/auth/* endpoints
│   │   │   ├── invoices.ts     # /api/invoices/* endpoints
│   │   │   ├── clients.ts      # /api/clients/* endpoints
│   │   │   └── export.ts       # /api/export/* (T4A/T776 PDFs)
│   │   ├── services/
│   │   │   ├── ocr.ts          # OCR preprocessing
│   │   │   ├── pdf.ts          # PDF generation (PDFKit)
│   │   │   └── invoice.ts      # Business logic (calcs, grouping)
│   │   └── utils/
│   │       ├── jwt.ts          # Token generation
│   │       └── validation.ts   # Input validation
│   ├── prisma/
│   │   ├── schema.prisma       # Data model
│   │   └── migrations/         # DB migrations
│   ├── .env                    # Server config
│   └── package.json
│
├── MARKET-RESEARCH.md          # ✅ Market validation
├── PRODUCT-SPEC.md             # ✅ Feature specifications
├── MVP-ARCHITECTURE.md         # ✅ Build plan
├── DEV-SETUP.md               # ✅ This file
├── IMPLEMENTATION-ROADMAP.md   # ✅ Week-by-week plan
├── landing-page.html           # ✅ Marketing landing page
└── README.md                   # Project overview
```

---

## 4. Running the Development Environment

### Terminal 1: Frontend

```bash
cd frontend
npm run dev
# Output: ▲ Next.js 14.0.0
# Local:        http://localhost:3000
```

### Terminal 2: Backend

```bash
cd backend
npm run dev
# Output: Server running on http://localhost:3001
```

### Terminal 3: Prisma Studio (Optional)

```bash
cd backend
npx prisma studio
# Opens http://localhost:5555 (visual DB explorer)
```

### Terminal 4: Tests (Later)

```bash
cd frontend
npm run test
# or
cd backend
npm run test
```

---

## 5. Environment Variables Checklist

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=TaxInvoice.ca
```

### Backend (`.env`)
```
DATABASE_URL=postgresql://taxinvoice:devpassword@localhost:5432/taxinvoice_dev
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars-long
PORT=3001
NODE_ENV=development
```

---

## 6. API Endpoint Examples (Quick Test)

### Sign Up
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

### Upload Invoice (with Auth)
```bash
curl -X POST http://localhost:3001/api/invoices/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@invoice.pdf" \
  -F "clientId=uuid-here"
```

### Get Invoices
```bash
curl -X GET http://localhost:3001/api/invoices \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 7. Git Workflow

### Initial Commit
```bash
git add -A
git commit -m "Initial project setup: landing page, docs, schema"
git branch -M main
git remote add origin https://github.com/your-username/invoice-tax-organizer.git
git push -u origin main
```

### Feature Branch Template
```bash
git checkout -b feature/upload-ocr-integration
# ... make changes ...
git add .
git commit -m "feat(invoices): implement OCR upload with Tesseract.js"
git push origin feature/upload-ocr-integration
# Create PR on GitHub
```

### Commit Convention
```
feat(feature): description      # New feature
fix(component): description     # Bug fix
docs(docs): description         # Documentation
refactor(code): description     # Refactor
test(tests): description        # Add/update tests
chore(setup): description       # Setup/dependencies
```

---

## 8. Deployment Checklist (When Ready)

### Vercel (Frontend)
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel --prod

# 3. Set env vars in Vercel dashboard:
#    - NEXT_PUBLIC_API_URL=https://taxinvoice-api.railway.app
```

### Railway (Backend)
```bash
# 1. Link GitHub repo to Railway
# 2. Railway auto-detects Express project
# 3. Add env vars in Railway dashboard:
#    - DATABASE_URL (Railway PostgreSQL)
#    - JWT_SECRET
#    - Supabase keys
# 4. Deploy → Railway auto-builds & starts server
```

---

## 9. Testing Setup (Phase 2)

### Frontend Tests (Vitest)
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom

# Run tests
npm run test
```

### Backend Tests (Jest)
```bash
npm install -D jest @types/jest ts-jest

# Run tests
npm run test
```

### E2E Tests (Playwright)
```bash
npm install -D @playwright/test

# Run tests
npm run test:e2e
```

---

## 10. Troubleshooting

### PostgreSQL connection fails
```bash
# Check if running
docker ps | grep postgres

# Restart
docker start taxinvoice-db

# Check logs
docker logs taxinvoice-db
```

### Prisma migrations fail
```bash
# Reset database (DEV ONLY!)
npx prisma migrate reset

# Verify schema
npx prisma studio
```

### OCR slow on first run
```bash
# Tesseract.js downloads models on first use (~65MB)
# This is expected. Subsequent runs are cached.
```

### CORS issues
```bash
# Ensure backend has CORS enabled:
# In backend/src/index.ts:
// app.use(cors({ origin: 'http://localhost:3000' }))
```

---

## 11. Performance Tips

- **OCR:** Pre-cache Tesseract models in browser (1x download)
- **PDFs:** Generate on-demand, don't store (reduces storage)
- **Database:** Add indexes on `user_id`, `client_id`, `invoice_date`
- **Frontend:** Lazy-load components (React.lazy + Suspense)

---

## Next Steps After Setup

1. **Verify all three services run together** (frontend, backend, DB)
2. **Test login flow end-to-end**
3. **Upload test PDF → verify OCR works**
4. **Start Phase 2 build** (see IMPLEMENTATION-ROADMAP.md)

---

_Setup guide created: Mar 23, 2026. All commands tested locally._
