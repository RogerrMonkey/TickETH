# TickETH — Unified Setup Guide

> Decentralized NFT ticketing on Polygon. This monorepo contains **smart contracts**, **backend API**, **web frontend**, **mobile app**, and **database migrations**.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | ≥ 18.x | All packages |
| **npm** | ≥ 9.x | Package management |
| **Redis** | ≥ 7.x | BullMQ job queues (backend) |
| **Git** | ≥ 2.x | Version control |
| **Supabase** account | — | Postgres DB + Auth + Storage |
| **Thirdweb** account | — | Wallet connect + client ID |
| **Pinata** account | — | IPFS metadata pinning |
| **MetaMask** / wallet | — | Contract deployment + testing |
| **Android Studio** | — | Mobile dev (optional) |

---

## Repository Structure

```
TickETH/
├── contracts/        # Solidity smart contracts (Hardhat)
├── backend/          # NestJS REST API + WebSocket
├── frontend/         # Next.js 16 web application
├── mobile/           # React Native (Expo) mobile app
├── database/         # SQL migrations & seed data
├── SYSTEM_OVERVIEW.md
├── SETUP.md          # ← You are here
└── build_plan.txt
```

---

## 1. Database (Supabase)

### 1.1 Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Note your **Project URL**, **Anon Key**, **Service Role Key**, and **JWT Secret**

### 1.2 Run Migrations
In the Supabase **SQL Editor**, run these files in order:
```
database/migrations/001_initial_schema.sql
database/migrations/002_marketplace.sql
```

### 1.3 (Optional) Seed Dev Data
```sql
-- Run in SQL Editor
-- database/seeds/dev_seed.sql
```

### 1.4 Storage Bucket
Create a public storage bucket named `images` in Supabase Dashboard → Storage.

---

## 2. Smart Contracts

```bash
cd contracts
npm install
```

### 2.1 Configure Environment
```bash
cp .env.example .env
```
Edit `.env`:
```dotenv
AMOY_RPC_URL=https://rpc-amoy.polygon.technology/
DEPLOYER_PRIVATE_KEY=your-wallet-private-key
POLYGONSCAN_API_KEY=your-polygonscan-key
```

### 2.2 Compile
```bash
npm run compile
```

### 2.3 Run Tests
```bash
npm test
```

### 2.4 Deploy to Polygon Amoy Testnet
```bash
npm run deploy:amoy
```
Note the deployed **Factory address** — you'll need it for the backend.

### 2.5 (Optional) Verify on Polygonscan
```bash
npx hardhat verify --network amoy <FACTORY_ADDRESS> <IMPLEMENTATION_ADDRESS> 250 <TREASURY_ADDRESS>
```

---

## 3. Backend API

```bash
cd backend
npm install
```

### 3.1 Configure Environment
```bash
cp .env.example .env
```
Edit `.env` with your values:
```dotenv
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# Blockchain
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
CHAIN_ID=80002
FACTORY_ADDRESS=0x...  # From step 2.4
DEPLOYER_PRIVATE_KEY=0x...
PLATFORM_TREASURY=0x...

# Redis (BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-random-secret
JWT_EXPIRATION=7d

# App
PORT=3001
CORS_ORIGINS=http://localhost:3000

# IPFS (Pinata)
PINATA_JWT=your-pinata-jwt
PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs

# Chain Listener
CHAIN_LISTENER_ENABLED=true
```

### 3.2 Start Redis
```bash
# Windows (via WSL or Docker)
docker run -d --name redis -p 6379:6379 redis:alpine

# macOS
brew services start redis

# Linux
sudo systemctl start redis
```

### 3.3 Run in Development
```bash
npm run start:dev
```

The API will be available at:
- **API:** http://localhost:3001/api/v1
- **Swagger Docs:** http://localhost:3001/docs

### 3.4 Run Tests
```bash
npm test
```

---

## 4. Frontend (Web)

```bash
cd frontend
npm install
```

### 4.1 Configure Environment
Create `.env.local`:
```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your-thirdweb-client-id
```

### 4.2 Run in Development
```bash
npm run dev
```
Open http://localhost:3000

### 4.3 Build for Production
```bash
npm run build
npm start
```

---

## 5. Mobile App

```bash
cd mobile
npm install
```

### 5.1 Configure
The mobile app reads config from `app.json` → `extra` field.
Update `mobile/src/constants/config.ts` if you need custom API URLs or chain config.

The default API URL points to: `http://10.0.2.2:3001/api/v1` (Android emulator → localhost).

### 5.2 Run on Android
```bash
# Start Metro bundler
npm start

# In another terminal
npm run android
```

### 5.3 Run on iOS (macOS only)
```bash
npm run ios
```

---

## 6. Running Everything Together

Open **4 terminals** and run each service:

| Terminal | Directory | Command |
|----------|-----------|---------|
| 1 | `backend/` | `npm run start:dev` |
| 2 | `frontend/` | `npm run dev` |
| 3 | `mobile/` | `npm start` |
| 4 | — | Redis server |

### Quick Start (all at once)
```bash
# Terminal 1 — Backend
cd backend && npm install && npm run start:dev

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev

# Terminal 3 — Mobile
cd mobile && npm install && npm start
```

---

## 7. Key Workflows

### Create & Deploy an Event
1. Sign in with an **organizer** wallet on the frontend
2. Go to `/organizer/create`
3. Fill in event details + ticket tiers → Submit
4. Click **Deploy Contract** — this creates an on-chain ERC-721 contract + registers tiers

### Mint a Ticket
1. Browse events → Select a tier → Click **Mint**
2. Approve the transaction in your wallet
3. The chain listener auto-records the ticket in the database
4. View it under **My Tickets**

### Check-In
1. Organizer opens the check-in scanner
2. Attendee shows QR code from their ticket
3. System verifies on-chain ownership + marks checked in

---

## 8. Blockchain Details

| Network | Chain ID | RPC |
|---------|----------|-----|
| Polygon Amoy (testnet) | 80002 | `https://rpc-amoy.polygon.technology` |
| Polygon Mainnet | 137 | `https://polygon-rpc.com` |

### Contracts
- **TickETHFactory** — Deploys minimal proxy clones for each event
- **TickETHTicket** — ERC-721 NFT ticket (one per event)
- **TickETHMarketplace** — Peer-to-peer resale with price caps

### Getting Testnet POL
Visit [Polygon Amoy Faucet](https://faucet.polygon.technology/) to get free testnet POL tokens.

---

## 9. Troubleshooting

| Issue | Fix |
|-------|-----|
| `ECONNREFUSED :6379` | Start Redis: `docker run -d -p 6379:6379 redis:alpine` |
| `invalid input for enum audit_action` | Run the latest migration SQL in Supabase |
| `Tier does not exist` on mint | Ensure contract was deployed via the app (tiers are registered on-chain during deploy) |
| No tickets showing after mint | Restart backend — chain listener picks up events on next poll cycle |
| RPC rate limits | Use a dedicated RPC from [Alchemy](https://alchemy.com) or [Infura](https://infura.io) |
| Mobile can't reach API | Ensure API URL uses `10.0.2.2` (Android emulator) or your local IP |

---

## 10. Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.24, Hardhat, OpenZeppelin |
| Backend API | NestJS 11, TypeScript, BullMQ, ethers.js |
| Database | Supabase (PostgreSQL), Row Level Security |
| Frontend | Next.js 16, React 19, Tailwind CSS, thirdweb v5 |
| Mobile | React Native (Expo 54), thirdweb |
| Blockchain | Polygon (EVM), ERC-721 |
| Storage | Supabase Storage (images), IPFS/Pinata (metadata) |

---

## License

MIT
