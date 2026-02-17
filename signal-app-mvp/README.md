# Signal App MVP

**Production-ready Stock & Crypto Buy/Sell Signal Generator**

A full-stack TypeScript application that generates trading signals using technical indicators (SMA + RSI strategy) for cryptocurrencies and stocks.

---

## 🚀 Features

- **Real-time Signal Generation**: SMA crossover + RSI indicator strategy
- **Multi-Asset Support**: Crypto (Coingecko/Binance) and stocks (Alpha Vantage)
- **Automated Pipeline**: Scheduled updates every 4 hours
- **Web Dashboard**: Next.js UI with signal cards and price charts
- **Alert System**: User-configurable confidence thresholds
- **Production Ready**: Docker, Vercel deployment, PostgreSQL

---

## 📊 Signal Strategy

### Baseline Algorithm: SMA + RSI

**Buy Signal Conditions:**
- Short SMA (9-period) crosses **above** Long SMA (21-period)
- RSI < 30 (oversold)

**Sell Signal Conditions:**
- Short SMA crosses **below** Long SMA
- RSI > 70 (overbought)

**Hold Signal:**
- No crossover or RSI condition not met

---

## 🏗️ Project Structure

```
signal-app-mvp/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes
│   │   │   ├── signals/        # Fetch latest signals
│   │   │   ├── alerts/         # User alert CRUD
│   │   │   └── pipeline/       # Trigger manual pipeline run
│   │   ├── alerts/             # Alert settings page
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Dashboard page
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── dashboard/          # Dashboard components
│   │   │   ├── SignalCard.tsx  # Individual signal display
│   │   │   └── PriceChart.tsx  # Recharts price chart
│   │   └── ui/                 # Reusable UI components (shadcn-style)
│   ├── models/                 # TypeScript models
│   │   ├── PriceData.ts        # Price series & data points
│   │   ├── Signal.ts           # Signal model
│   │   └── Trade.ts            # Trade execution model
│   ├── services/
│   │   ├── api/                # External API clients
│   │   │   ├── cryptoClient.ts # Coingecko + Binance
│   │   │   └── stockClient.ts  # Alpha Vantage
│   │   ├── db/                 # Database layer
│   │   │   ├── client.ts       # PostgreSQL connection pool
│   │   │   └── repositories.ts # CRUD operations
│   │   ├── signals/            # Signal generation engine
│   │   │   ├── indicators.ts   # SMA, RSI calculations
│   │   │   └── generateSignal.ts # Core signal logic
│   │   ├── pipeline/           # Data pipeline
│   │   │   └── runPipeline.ts  # Fetch data → Generate signals → Save
│   │   └── scheduler/          # Cron scheduler
│   │       └── index.ts        # Run pipeline every 4 hours
│   ├── lib/
│   │   └── utils.ts            # Utility functions
│   └── types/
│       └── env.ts              # Environment variable validation (Zod)
├── db/
│   └── migrations/
│       └── 001_init.sql        # Database schema
├── public/                     # Static assets
├── Dockerfile                  # Docker build config
├── docker-compose.yml          # Local dev stack (Postgres + App)
├── vercel.json                 # Vercel deployment config
├── .env.example                # Environment variables template
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
└── tailwind.config.ts          # Tailwind CSS config
```

---

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or use Docker Compose)
- (Optional) API keys:
  - Alpha Vantage (for stock data)
  - IEX Cloud (alternative to Alpha Vantage)

### 1. Clone & Install

```bash
cd signal-app-mvp
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database URL and API keys
```

### 3. Database Setup

**Option A: Docker Compose (Recommended)**

```bash
docker-compose up -d postgres
```

**Option B: Local PostgreSQL**

```bash
createdb signalapp
psql signalapp -f db/migrations/001_init.sql
```

Or use npm script:

```bash
npm run db:migrate
```

### 4. Run Development Server

```bash
npm run dev
```

Visit **http://localhost:3000**

---

## 🔄 Running the Signal Pipeline

### Manual Trigger

**Via UI:**
- Click "Run Pipeline" button on dashboard

**Via API:**
```bash
curl -X POST http://localhost:3000/api/pipeline
```

**Via CLI:**
```bash
npm run signals:run
```

### Automated Scheduler

Start the cron scheduler (runs every 4 hours):

```bash
npm run scheduler:start
```

---

## 🐳 Docker Deployment

### Build & Run

```bash
docker-compose up --build
```

Services:
- **Web**: http://localhost:3000
- **PostgreSQL**: localhost:5432

### Production Docker Build

```bash
docker build -t signal-app .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e ALPHA_VANTAGE_API_KEY="..." \
  signal-app
```

---

## ☁️ Vercel Deployment

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Signal App MVP"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Connect to Vercel

- Import project from GitHub
- Add environment variables:
  - `DATABASE_URL` (use Vercel Postgres or external)
  - `ALPHA_VANTAGE_API_KEY`
- Deploy

### 3. Run Migrations

```bash
vercel env pull .env.production
psql $DATABASE_URL -f db/migrations/001_init.sql
```

---

## 📡 API Endpoints

### GET `/api/signals`

Fetch latest signals (limit 50)

**Response:**
```json
{
  "signals": [
    {
      "symbol": "BTC",
      "assetType": "crypto",
      "signalType": "BUY",
      "strategy": "SMA_RSI_BASELINE",
      "rsi": 28.5,
      "price": 42150.25,
      "confidence": 0.75,
      "rationale": "Bullish SMA crossover + RSI oversold",
      "generatedAt": "2026-02-11T18:00:00Z"
    }
  ]
}
```

### POST `/api/pipeline`

Trigger manual pipeline run

**Response:**
```json
{
  "ok": true,
  "count": 6,
  "signals": [...]
}
```

### GET `/api/alerts`

List user alerts (demo user)

### POST `/api/alerts`

Create/update user alert

**Request:**
```json
{
  "symbol": "AAPL",
  "threshold": 0.6,
  "enabled": true
}
```

---

## 🧪 Testing the System

### 1. Verify Database Connection

```bash
psql $DATABASE_URL -c "SELECT version();"
```

### 2. Test Crypto API

```bash
curl "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30"
```

### 3. Test Stock API

```bash
curl "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=AAPL&apikey=YOUR_KEY"
```

### 4. Run Type Check

```bash
npm run typecheck
```

### 5. Run Linter

```bash
npm run lint
```

---

## 🔧 Customization

### Add More Assets

Edit `src/services/pipeline/runPipeline.ts`:

```typescript
const CRYPTO_TARGETS = ['bitcoin', 'ethereum', 'solana'];
const STOCK_TARGETS = ['AAPL', 'MSFT', 'GOOGL', 'TSLA'];
```

### Adjust Signal Strategy

Edit `src/services/signals/generateSignal.ts`:

```typescript
const SHORT_SMA_PERIOD = 9;   // Change to 5, 10, 20...
const LONG_SMA_PERIOD = 21;   // Change to 50, 100, 200...
const RSI_PERIOD = 14;         // Standard RSI period
```

### Change Scheduler Frequency

Edit `src/services/scheduler/index.ts`:

```typescript
const CRON_SCHEDULE = '0 */2 * * *'; // Every 2 hours
```

---

## 📚 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui components |
| **Charts** | Recharts |
| **Backend** | Node.js, TypeScript |
| **Database** | PostgreSQL 16 |
| **API Clients** | Axios |
| **Scheduling** | node-cron |
| **Validation** | Zod |
| **Deployment** | Docker, Vercel |

---

## 🔐 Security Notes

- **Never commit `.env`** to version control
- Use environment variable secrets in production (Vercel Secrets, Docker Secrets)
- Implement authentication before production use (currently demo user only)
- Rate-limit API endpoints in production
- Use read replicas for database scaling

---

## 📈 Next Steps / Extensions

1. **Authentication**: Add NextAuth.js for multi-user support
2. **Real-time Updates**: WebSocket for live signal streaming
3. **Advanced Strategies**: Bollinger Bands, MACD, machine learning models
4. **Backtesting**: Historical performance analysis
5. **Notifications**: Email, SMS, Telegram alerts
6. **Portfolio Tracking**: Link with brokerage APIs
7. **Paper Trading**: Simulate trades based on signals
8. **Mobile App**: React Native companion app

---

## 📝 License

MIT

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📧 Support

For questions or issues, open a GitHub issue or contact the maintainer.

---

**Built with ❤️ using OpenClaw**
