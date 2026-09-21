# AutoMate by DK — Multi-Tenant WhatsApp AI Automation SaaS Platform

> **Automate conversations. Capture leads. Grow your business.**

AutoMate by DK is an enterprise-grade, multi-tenant WhatsApp AI Automation SaaS platform designed for retail, fashion stores, salons, clinics, mobile shops, real estate, and local commerce businesses. It connects WhatsApp Business accounts (via Instant QR Code or Meta Cloud API) with an AI-powered conversational catalog, intelligent FAQ resolution, CRM, automated follow-ups, and lead management.

---

## 🌟 Key Capabilities & Highlights

1. **Meta WhatsApp Cloud API v21.0 Integration**:
   - Webhook verification (`hub.mode`, `hub.verify_token`, `hub.challenge`)
   - Interactive messages, image messages, product cards, templates
   - Delivery & read receipts tracking
   - Built-in **WhatsApp Simulator & Webhook Engine** for instant offline zero-credential testing.

2. **Safe AI Natural Language Product Search (Zero Hallucinations)**:
   - Natural language queries (e.g. *"Show me black shirts under 1500 in size M"*) parsed into structured filters `{ category: "shirt", color: "black", size: "M", maxPrice: 1500 }`.
   - SQL/Prisma strictly retrieves existing inventory from PostgreSQL/SQLite — AI NEVER invents products, discounts, or stock.

3. **Multi-Tenant CRM & Lead Kanban Pipeline**:
   - Strict organization tenant isolation across all tables.
   - Drag-and-drop / stage transitions: `NEW` ➔ `CONTACTED` ➔ `INTERESTED` ➔ `FOLLOW_UP` ➔ `NEGOTIATION` ➔ `CONVERTED` ➔ `LOST`.
   - Real-time Socket.IO sync for new messages and pipeline updates.

4. **Human Handoff & Unified Multi-Agent Inbox**:
   - Automatic pause of AI replies when customer requests a human agent (`HUMAN_REQUIRED`).
   - Staff assignment, custom notes, customer tags, and live product card attachments.

5. **Automated Follow-ups & Broadcast Campaigns**:
   - 24-hour and 48-hour gentle reminder automation for inactive enquiries.
   - Broadcast campaigns with segmented audience filtering.

6. **Super Admin Platform Console**:
   - Multi-tenant directory, subscription tier limits, platform-wide metrics, and system audit logs.

---

## 🏗️ Architecture & Technology Stack

- **Monorepo**: npm workspaces (`packages/shared`, `packages/config`, `apps/api`, `apps/web`)
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Recharts, TanStack Query, React Router
- **Backend**: Node.js, Express.js, TypeScript, Socket.IO, Prisma ORM, Winston Logger, node-cron
- **Database**: PostgreSQL (Production / Docker) & SQLite (Zero-config local development)
- **AI**: OpenAI API (GPT-4o) with deterministic Mock AI fallback (`MOCK_AI=true`)
- **Deployment**: Docker, Docker Compose, Nginx

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js 18+ and npm 9+

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Database & Seed Demo Data
```bash
# Build shared library
npm run build:shared

# Push Prisma schema to local SQLite database
npm run db:push

# Seed StyleHub store (20 products, 5 categories, 10 customers, 10 leads, automations)
npm run db:seed
```

### 4. Run Development Servers
```bash
# Start backend API (http://localhost:5000)
npm run dev:api

# In another terminal: start React frontend (http://localhost:5173)
npm run dev:web
```

---

## 🔑 Demo Login Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Store Owner (StyleHub)** | `owner@stylehub.com` | `Password@123` |
| **Staff Agent (StyleHub)** | `staff@stylehub.com` | `Password@123` |
| **Super Administrator** | `admin@chatflow.ai` | `Admin@123456` |

*(Tip: The login page includes 1-click quick-fill buttons for all 3 demo accounts).*

---

## 🧪 Running Automated Tests

Run backend unit and integration test suite:
```bash
npm run test
```

---

## 🐳 Running with Docker Compose (PostgreSQL + Redis + API + Web)

```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:
```ini
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000

DATABASE_URL="file:./dev.db" # or "postgresql://postgres:password@localhost:5432/chatflow"

JWT_SECRET=dev_chatflow_secret_key_jwt_2025!
JWT_REFRESH_SECRET=dev_chatflow_refresh_secret_key_2025!

# Meta WhatsApp Cloud API (v21.0)
META_GRAPH_API_VERSION=v21.0
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id
WHATSAPP_VERIFY_TOKEN=chatflow_webhook_verify_token_secure_xyz_987
META_APP_SECRET=your_app_secret

# Toggle Mock vs Live
MOCK_WHATSAPP=true
MOCK_AI=true
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini
```

---

## 📄 License
MIT © ChatFlow AI Team
