# TickETH Developer Setup Guide

This document explains how a new developer on the team can set up TickETH on their local machine. It assumes they **do not** need to redeploy smart contracts or re-run database migrations, and that they have access to the shared deployer wallet (MetaMask + private key) and existing Supabase project.

---

## 1. Prerequisites

### 1.1 Operating System

- Windows 10/11 (x64) — current reference environment.
- macOS 13+ or a recent Linux distro should also work with minimal changes to shell commands.

### 1.2 Core Tooling

Install the following:

- **Node.js**: Node 20 LTS recommended (minimum Node 18).
  - Download from https://nodejs.org or use `nvm` / `fnm`.
- **npm**: Comes with Node; npm 10+ recommended.
- **Git**: For cloning the repo.
- **Metamask** (browser extension + mobile app):
  - Import the shared deployer wallet using the seed/private key provided by the team lead.
- **Android / iOS toolchain** (for mobile):
  - Android: Android Studio + SDK + emulator or physical device.
  - iOS: Xcode + iOS simulator (macOS only).

> Backend, frontend, mobile and contracts are all pure TypeScript/JavaScript; no extra language toolchains are required beyond Node.

---

## 2. Repository Layout (Quick Reference)

After cloning, the workspace looks like:

- `backend/` — NestJS API server.
- `frontend/` — Next.js 16 web app.
- `mobile/` — Expo React Native app.
- `contracts/` — Solidity contracts + Hardhat.
- `database/` — SQL migrations and seeds (already applied in shared Supabase).
- `docs/` — documentation (including this file and system overview).

---

## 3. Clone the Repository

```bash
# Using HTTPS
git clone <REPO_URL>
cd TickETH
```

Replace `<REPO_URL>` with the internal Git URL of this repo.

---

## 4. Install Dependencies

Run the following in each project directory (from the repo root):

```bash
cd backend
npm install

cd ../frontend
npm install

cd ../mobile
npm install

cd ../contracts
npm install
```

> Tip (Windows PowerShell): you can open multiple terminals in VS Code and run each `npm install` in parallel to save time.

---

## 5. Environment Configuration

You will **not** create fresh infrastructure; instead you will point your local services to the existing Supabase instance, RPC endpoints, and on-chain contract addresses used by the team.

### 5.1 Backend `.env`

Location: `backend/.env`

- Ask another team member (or the Tech Lead) for the **current backend `.env` file** and drop it directly into `backend/`.
- At minimum, it should contain:
  - Supabase keys:
    - `SUPABASE_URL`
    - `SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `SUPABASE_JWT_SECRET`
  - Blockchain config:
    - `POLYGON_AMOY_RPC_URL` (or other testnet/mainnet RPC URL).
    - `POLYGON_MAINNET_RPC_URL`.
    - `CHAIN_ID` (e.g. `80002` for Amoy).
    - `FACTORY_ADDRESS`, `MARKETPLACE_ADDRESS`, `IMPLEMENTATION_ADDRESS` (already deployed contracts).
    - `PLATFORM_TREASURY`.
    - `DEPLOYER_PRIVATE_KEY` — **use the shared deployer wallet** (MetaMask).
  - Redis / BullMQ:
    - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (if any).
  - JWT config:
    - `JWT_SECRET`, `JWT_EXPIRATION`.
  - App settings:
    - `PORT` (e.g. 3001), `NODE_ENV`, `CORS_ORIGINS`.

> Do **not** commit `.env` files to Git. They must remain local.

If you need a template, copy `backend/.env.example` to `backend/.env` and then paste in values from the shared config.

### 5.2 Frontend Environment

The frontend uses public `NEXT_PUBLIC_*` environment variables for contract addresses, API base URL, and thirdweb client configuration.

Create a file `frontend/.env.local`:

```bash
cd frontend
copy NUL .env.local  # Windows
# or: touch .env.local (macOS/Linux)
```

Populate it with values shared by the team, for example:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_IMPLEMENTATION_ADDRESS=0x...
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_public_client_id
```

The exact key names should match usage under `frontend/src/lib` and other config files.

### 5.3 Mobile Environment

The mobile app reads config from Expo `app.json` (or `app.config.*`) via `Constants.expoConfig?.extra`.

- Ask a teammate for the **canonical `app.json` / config extra section** so your app points to the same API base URL and chain configuration as the frontend.
- Ensure it contains:
  - API base URL (`API_BASE_URL` or similar).
  - Chain ID and RPC if needed.
  - Contract addresses.
  - Thirdweb client ID.

Because the mobile app uses the same on-chain contracts, you do **not** redeploy anything; you re-use the existing addresses.

### 5.4 Contracts Environment

Contracts under `contracts/` use `hardhat.config.ts` with optional network RPC URLs and private key via environment variables:

- `AMOY_RPC_URL`, `POLYGON_RPC_URL` (for remote networks).
- `DEPLOYER_PRIVATE_KEY` (same as backend).

Create `contracts/.env` if you plan to run Hardhat tasks against a network; copy from another teammate. For local `hardhat` network, no env is required.

> In this team, deployments are already done; you usually only need Hardhat to run tests locally.

---

## 6. Running Each Part Locally

### 6.1 Backend API (NestJS)

From repo root:

```bash
cd backend
npm run build        # optional, for a full build
npm run start:dev    # start NestJS in watch mode on PORT from .env
```

- API base URL: `http://localhost:3001/api/v1` (assuming `PORT=3001`).
- Swagger (if enabled) is usually exposed at `http://localhost:3001/docs` in dev.

To run type checks and tests:

```bash
cd backend
npm run lint         # tsc --noEmit
npm test             # jest
```

### 6.2 Frontend Web App (Next.js)

In a new terminal:

```bash
cd frontend
npm run dev          # Next.js dev server, using webpack
```

- Opens by default at `http://localhost:3000`.
- It expects backend at `NEXT_PUBLIC_API_BASE_URL` from `.env.local`.

To verify production build:

```bash
npm run build
npm start
```

### 6.3 Mobile App (Expo)

In another terminal:

```bash
cd mobile
npm start            # expo start
```

- Use the Expo Dev Tools to run on an Android emulator, iOS simulator, or physical device.
- Ensure your device can reach the backend URL you configured (you may need to use your machine's LAN IP instead of `localhost`).

> Example: set `API_BASE_URL` in mobile config to `http://192.168.x.y:3001/api/v1` when testing on a physical device on the same Wi-Fi.

### 6.4 Contracts (Hardhat)

To compile and run tests:

```bash
cd contracts
npm run compile
npm test
```

This uses the in-memory Hardhat network and does **not** affect real deployments.

If you need gas reports or to re-run the gas analysis:

```bash
cd contracts
npx hardhat test test/GasAnalysis.test.ts
# Open contracts/gas-analysis.html in a browser
```

> Do **not** run deployment scripts (`deploy:amoy`, `deploy:polygon`) unless specifically coordinated with the team.

---

## 7. Using the Shared Deployer Wallet

Because the team shares a single deployer wallet:

1. Import the wallet into MetaMask using the seed/private key provided.
2. Set `DEPLOYER_PRIVATE_KEY` in both `backend/.env` and `contracts/.env` (if used) to this private key.
3. Never expose it in screenshots, logs, or commits.
4. When testing on a testnet, ensure the wallet has enough test tokens (MATIC/POL) for gas.

For day-to-day dev work, you rarely need to send transactions from this wallet directly; the contracts are already deployed.

---

## 8. Verifying Your Setup

### 8.1 Quick Checklist

- [ ] `backend` runs on `PORT` from `.env` with no TypeScript errors.
- [ ] `frontend` dev server starts and can fetch events from the backend.
- [ ] `mobile` app starts via Expo and can hit the API.
- [ ] `contracts` compile and tests pass on the Hardhat network.

### 8.2 Smoke Test Scenario

1. Start backend and frontend.
2. Open `http://localhost:3000`.
3. Connect your wallet and sign in.
4. Navigate to an existing event and attempt to mint a test ticket on the configured testnet.
5. Verify the ticket appears under "My Tickets" in web and mobile.

If any step fails, check:

- Env variables (API base URL, contract addresses, chain IDs).
- Backend logs (NestJS terminal output).
- Browser Network tab and console errors.

---

## 9. Common Pitfalls

- **Wrong RPC URL / CHAIN_ID**: If the Polygon RPC endpoint is down or chain ID mismatched, you will see `JsonRpcProvider failed to detect network` errors. Fix the RPC URL in `backend/.env` and your wallet settings.
- **CORS errors**: Ensure `CORS_ORIGINS` in `backend/.env` includes `http://localhost:3000` and any LAN URLs used by mobile.
- **Expo device cannot reach backend**: Use a LAN IP instead of `localhost` in mobile config.
- **Missing envs**: If you get "Config key required" type errors on start, re-check that your `.env` files exist and are loaded.
