# TickETH Technical Requirements

This document enumerates all technical requirements to run, develop, and test the TickETH platform across backend, frontend, mobile, and smart contracts.

---

## 1. Hardware Requirements

### 1.1 Developer Machine

- **CPU**: 4+ cores recommended.
- **RAM**: 16 GB recommended (8 GB minimum) — to run Node services, IDE, emulator/simulator, and browser concurrently.
- **Storage**: At least 10 GB free disk space for:
  - Node modules for all packages.
  - Android/iOS SDKs (if doing mobile dev).
  - Local caches (Hardhat artifacts, Expo, etc.).

### 1.2 Mobile Devices (for testing)

- Android 10+ physical device **or** emulator.
- iOS 15+ device or simulator (requires macOS + Xcode).

---

## 2. Software Requirements

### 2.1 Operating Systems

TickETH is actively developed and tested on:

- Windows 10/11 (x64)

Other OSes should also work with equivalent tooling:

- macOS 13+
- Recent Linux distributions (Ubuntu 22.04+, etc.)

### 2.2 Runtime & Tooling

- **Node.js**
  - Recommended: **Node 20 LTS**.
  - Minimum: Node 18 (for Next.js 16, Expo 54, and NestJS 11).
- **npm**
  - Comes with Node; version 10+ recommended for best performance.
- **Git**
  - Any recent version for cloning and managing the repo.

### 2.3 Language & Frameworks (per project)

- **Backend (`backend/`)**
  - NestJS 11 (via `@nestjs/*` packages).
  - TypeScript 5.9+.
  - Jest 30+ for testing.

- **Frontend (`frontend/`)**
  - Next.js 16.1.
  - React 19.2.
  - TypeScript 5+.
  - Tailwind CSS 4.
  - Three.js and Framer Motion for 3D and animations.

- **Mobile (`mobile/`)**
  - Expo SDK 54.
  - React Native 0.81.
  - expo-router 6.

- **Contracts (`contracts/`)**
  - Hardhat 2.22.
  - Solidity 0.8.24 (via `solc` controlled by Hardhat).

### 2.4 Additional Platform-Specific Tools

- **Android**
  - Android Studio (latest stable).
  - Android SDK and at least one device image (e.g., Android 14 API level).
  - Java JDK compatible with Android Studio.

- **iOS (macOS only)**
  - Xcode latest stable.
  - Command line tools (`xcode-select --install`).

---

## 3. External Services & Infrastructure

### 3.1 Supabase (PostgreSQL + Auth)

TickETH uses Supabase as the primary database:

- A **shared Supabase project** is assumed to exist for the team.
- Required credentials (per developer, via `.env`):
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_JWT_SECRET`

Database schema is managed via migrations in `database/migrations/`. For day-to-day development, developers typically connect to the existing shared instance; local PostgreSQL is optional.

### 3.2 Redis

Redis is used for:

- BullMQ queues.
- SIWE nonce storage.

Requirements:

- Redis instance reachable from the backend (local or remote).
- Configuration via `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (if needed).

For local development, a single local Redis instance is sufficient.

### 3.3 Blockchain RPC Provider

The backend and contracts require access to an Ethereum-compatible JSON-RPC endpoint for Polygon networks:

- Supported/tested chains:
  - **Polygon Amoy testnet** (chainId `80002`) — for dev/test.
  - **Polygon mainnet** (chainId `137`) — for production.

Required RPC URLs (in backend `.env` and optionally `contracts/.env`):

- `POLYGON_AMOY_RPC_URL` — e.g., a provider like Ankr, Alchemy, Infura (team-wide choice).
- `POLYGON_MAINNET_RPC_URL` — production endpoint.

JSON-RPC node must support:

- Standard `eth_*` and `net_*` APIs.
- WebSocket is optional but can improve chain listener responsiveness.

### 3.4 IPFS Gateway / Pinning

The IPFS module in the backend expects an HTTP-accessible IPFS gateway or pinning service:

- Example providers: Pinata, web3.storage, Infura IPFS.
- Configured via environment variables (e.g., base URL and auth token, depending on provider) — ensure these are available in backend `.env`.

### 3.5 Thirdweb

Thirdweb is used for wallet connections and contract interactions in both web and mobile:

- Requires a **public client ID** configured in:
  - `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` (frontend/.env.local).
  - Expo config extras (mobile) for the same client ID.
- Thirdweb’s own infrastructure requirements are abstracted, but internet access is required for SDK operations and wallet connections.

---

## 4. Secrets & Configuration

The following secrets **must not** be committed and must be provided via secure channels (password manager, secret manager, etc.):

- **Deployer Wallet**
  - `DEPLOYER_PRIVATE_KEY` used by backend and contracts.
  - Seed phrase or key imported into MetaMask for manual operations.

- **Supabase Keys**
  - `SUPABASE_SERVICE_ROLE_KEY` (high-privilege; backend only).
  - `SUPABASE_JWT_SECRET`.

- **JWT Secret**
  - `JWT_SECRET` used by NestJS for access token signing.

- **IPFS / Pinning API Keys**
  - Any tokens or API keys for IPFS providers.

- **Thirdweb**
  - While the thirdweb client ID is public, any management keys (if used) must remain secret.

> All sensitive values should be stored in `.env` files and never logged or printed in plaintext.

---

## 5. Network & Ports

Default ports used during development:

- **Backend (NestJS)**: `PORT` from `backend/.env`, typically `3001`.
- **Frontend (Next.js)**: `3000`.
- **Expo Dev Server**: dynamic (usually `19000`, `19002`, etc.), managed by Expo CLI.
- **Redis**: default `6379`.

Ensure your local firewall permits localhost traffic on these ports and that nothing else is bound to them.

For mobile devices on the same LAN:

- The device must be able to reach your host machine over Wi-Fi.
- Use the machine’s LAN IP instead of `localhost` for `API_BASE_URL` in mobile config.

---

## 6. Project-Specific Constraints

### 6.1 TypeScript & Tooling

- TypeScript strictness is enforced via `tsc --noEmit` in each project.
- Developers should run type checks before committing.

### 6.2 Testing

- **Backend**: `npm test` uses Jest.
- **Contracts**: `npm test` uses Hardhat’s test runner.
- **Frontend & Mobile**: no mandatory test suite defined yet, but linting (`npm run lint` in frontend) is available.

### 6.3 Contract Compatibility

- EVM version: `paris` (Hardhat compiler setting) for Solidity 0.8.24.
- Contracts are designed for Polygon (EVM-compatible). Other EVM chains may work but are **not** officially supported unless configured.

### 6.4 Environment Alignment

To avoid subtle bugs:

- Backend `CHAIN_ID`, frontend `NEXT_PUBLIC_CHAIN_ID`, and mobile chain config must all match.
- Contract addresses must be consistent across:
  - Backend `.env` (`FACTORY_ADDRESS`, `MARKETPLACE_ADDRESS`, `IMPLEMENTATION_ADDRESS`).
  - Frontend `.env.local` (matching `NEXT_PUBLIC_*` vars).
  - Mobile Expo config extras.

---

## 7. Summary Matrix

| Area        | Requirement                                      |
|------------|---------------------------------------------------|
| OS         | Windows 10/11 (ref), macOS 13+, Linux 22.04+     |
| Node       | Node 20 LTS (min 18)                             |
| DB         | Supabase (PostgreSQL), shared project            |
| Cache/Jobs | Redis (single instance ok for dev)               |
| Chain      | Polygon Amoy (80002) + Polygon mainnet (137) RPC |
| Auth       | SIWE + JWT (NestJS, Supabase, Redis)             |
| Web        | Next.js 16, React 19, Tailwind 4                 |
| Mobile     | Expo 54, React Native 0.81                       |
| Contracts  | Hardhat 2.22, Solidity 0.8.24                    |
| Secrets    | Supabase keys, deployer PK, JWT secret, IPFS keys|

This matrix can be used as a checklist when provisioning new environments (CI agents, new dev machines, or staging servers).
