# TickETH — Complete System Overview

> **TickETH** is a decentralized blockchain-based NFT ticketing platform built on Polygon. It replaces traditional paper/PDF tickets with ERC-721 NFTs, enabling verifiable ownership, controlled resale, and fraud-proof check-in — all while providing a modern consumer-grade experience comparable to BookMyShow.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Technology Stack](#2-technology-stack)
3. [Smart Contracts Layer](#3-smart-contracts-layer)
4. [Database Layer](#4-database-layer)
5. [Backend (API Server)](#5-backend-api-server)
6. [Frontend (Web Application)](#6-frontend-web-application)
7. [Mobile Application](#7-mobile-application)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Core Workflows](#9-core-workflows)
10. [Environment & Configuration](#10-environment--configuration)
11. [Testing](#11-testing)
12. [Requirements](#12-requirements)
13. [Sample End-to-End Scenario](#13-sample-end-to-end-scenario)

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           USER DEVICES                                     │
│  ┌─────────────────────┐            ┌──────────────────────────┐           │
│  │   Next.js Frontend  │            │  React Native (Expo)     │           │
│  │   (Web Browser)     │            │  Mobile App              │           │
│  │                     │            │                          │           │
│  │  • Thirdweb SDK     │            │  • Thirdweb SDK          │           │
│  │  • Wallet Connect   │            │  • Wallet Connect        │           │
│  │  • SIWE Auth        │            │  • SIWE Auth             │           │
│  │  • React Query      │            │  • Zustand Stores        │           │
│  └────────┬────────────┘            └────────────┬─────────────┘           │
│           │                                      │                         │
└───────────┼──────────────────────────────────────┼─────────────────────────┘
            │ REST API (JWT)                       │ REST API (JWT)
            │ WebSocket (/checkin)                 │ Push Notifications
            ▼                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (NestJS)                                   │
│  Port 3001 | Prefix: /api/v1 | Swagger: /docs                            │
│                                                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐      │
│  │  Auth    │ │  Users   │ │  Events  │ │  Tiers   │ │  Tickets   │      │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │ │  Module    │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────────┘      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐      │
│  │ Checkin  │ │Blockchain│ │Marketplace│ │  Admin   │ │  Uploads   │      │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │ │  Module    │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────────┘      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐      │
│  │ Organizer│ │  Audit   │ │   IPFS   │ │   Queues (BullMQ/Redis)  │      │
│  │ Requests │ │  Module  │ │  Module  │ │   • notifications        │      │
│  └──────────┘ └──────────┘ └──────────┘ │   • analytics            │      │
│                                          └──────────────────────────┘      │
└──────────┬─────────────────────┬────────────────────────┬─────────────────┘
           │                     │                        │
           ▼                     ▼                        ▼
┌──────────────────┐  ┌──────────────────┐   ┌──────────────────────────────┐
│   Supabase       │  │  Polygon Amoy    │   │     External Services        │
│   (PostgreSQL)   │  │  (Chain 80002)   │   │                              │
│   • 9 Tables     │  │                  │   │  • Pinata (IPFS)             │
│   • RLS Policies │  │  • Factory       │   │  • Expo Push Notifications   │
│   • Storage      │  │  • Event Clones  │   │  • Thirdweb Infrastructure   │
│   • Realtime     │  │  • Marketplace   │   │  • Redis (BullMQ Queues)     │
└──────────────────┘  └──────────────────┘   └──────────────────────────────┘
```

### 1.2 Data Flow Principles

| Concern | How It Works |
|---------|-------------|
| **Authentication** | Wallet → SIWE (Sign-In with Ethereum, EIP-4361) → JWT tokens |
| **On-chain writes** | Client-side via Thirdweb SDK (user's wallet signs) |
| **Off-chain reads/writes** | REST API calls to NestJS backend → Supabase PostgreSQL |
| **Contract deployment** | Server-side via deployer private key (backend BlockchainModule) |
| **File storage** | Supabase Storage (avatars, banners) + Pinata/IPFS (NFT metadata) |
| **Real-time updates** | WebSocket gateway (check-in namespace) + Supabase Realtime (marketplace) |
| **Background jobs** | BullMQ queues over Redis (notifications, analytics) |

### 1.3 Network Configuration

| Network | Chain ID | RPC | Usage |
|---------|----------|-----|-------|
| Polygon Amoy (Testnet) | 80002 | Configurable via env | Current deployment target |
| Polygon Mainnet | 137 | Configurable via env | Production-ready config exists |
| Hardhat Local | 31337 | http://127.0.0.1:8545 | Local development & testing |

---

## 2. Technology Stack

### 2.1 Smart Contracts

| Technology | Version | Purpose |
|-----------|---------|---------|
| Solidity | 0.8.24 | Smart contract language |
| Hardhat | 2.22.x | Development framework, testing, deployment |
| OpenZeppelin Contracts | 5.1.0 | ERC-721, Ownable, Pausable, ReentrancyGuard |
| OpenZeppelin Upgradeable | 5.1.0 | Initializable pattern for clones |
| OpenZeppelin Merkle Tree | 1.0.8 | Allowlist verification |
| ethers.js | 6.x | Contract interaction in scripts |

### 2.2 Database

| Technology | Purpose |
|-----------|---------|
| Supabase | Hosted PostgreSQL + Auth + Storage + Realtime |
| PostgreSQL Extensions | uuid-ossp, pgcrypto |
| Row Level Security (RLS) | Fine-grained access control at DB level |
| Supabase Storage | Image hosting (avatars, banners) |
| Supabase Realtime | Live marketplace listing updates |

### 2.3 Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| NestJS | 11.x | Server framework (modular, DI, decorators) |
| TypeScript | 5.x | Type-safe code |
| @nestjs/config | — | Environment management |
| @nestjs/bull | — | Queue integration |
| @supabase/supabase-js | — | Database client |
| ethers.js | 6.x | Blockchain interaction (deploy, verify) |
| passport-jwt | — | JWT strategy |
| class-validator | — | DTO validation |
| class-transformer | — | DTO transformation |
| @nestjs/swagger | — | API documentation at /docs |
| helmet | — | Security headers |
| ioredis | — | Redis client for BullMQ |

### 2.4 Frontend (Web)

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.1.6 | React framework with App Router |
| React | 19.2.3 | UI library |
| TypeScript | Strict | Type safety |
| Thirdweb | 5.119 | Wallet connection, SIWE, contract calls |
| Zustand | 5.0.11 | Global auth state |
| TanStack React Query | 5.90.21 | Server state caching |
| Axios | 1.13.5 | HTTP client with interceptors |
| Tailwind CSS | 4.x | Utility-first styling |
| Framer Motion | 12.34.3 | Page transitions, animations |
| Sonner | 2.0.7 | Toast notifications |
| ethers.js | 6.16 | Price formatting, unit conversion |
| date-fns | 4.1.0 | Date formatting |

### 2.5 Mobile

| Technology | Version | Purpose |
|-----------|---------|---------|
| React Native | 0.81.5 | Cross-platform mobile framework |
| Expo SDK | 54 | Build tooling, native APIs |
| expo-router | 6.x | File-based navigation |
| Thirdweb | 5.118.2 | Wallet + contract interaction |
| Zustand | 5.0.11 | State management (3 stores) |
| Axios | 1.13.5 | API client with SecureStore tokens |
| ethers.js | 6.16 | Wallet utilities |
| expo-camera | 17.x | QR code scanning |
| expo-notifications | 0.32.16 | Push notifications |
| expo-secure-store | 15.x | Secure credential storage |
| expo-image-picker | — | Avatar photo selection |
| react-native-qrcode-svg | 6.3.21 | QR code rendering |
| react-native-reanimated | 4.1.1 | Smooth animations |
| @react-native-async-storage | 2.2 | Offline data persistence |
| @react-native-community/netinfo | 12.x | Network connectivity detection |

---

## 3. Smart Contracts Layer

### 3.1 Contract Architecture

TickETH uses a **Factory + Clone** pattern (EIP-1167 Minimal Proxy) for gas-efficient event deployment:

```
TickETHFactory (deployer owns)
    │
    ├── createEvent() ──► Clones.clone(implementation)
    │                          │
    │                          ▼
    │                   TickETHTicket Clone #1  ← Event "Ethereum Summit 2025"
    │                   TickETHTicket Clone #2  ← Event "NFT Art Night"
    │                   TickETHTicket Clone #3  ← Event "DeFi Conference"
    │                   ... (unlimited clones)
    │
    └── implementation ──► TickETHTicket (template, never used directly)

TickETHMarketplace (standalone)
    │
    └── Escrow-based secondary market for ALL event ticket NFTs
```

### 3.2 TickETHFactory.sol

**Purpose:** Deploys EIP-1167 minimal proxy clones of the `TickETHTicket` implementation contract for each new event.

**State Variables:**
| Variable | Type | Description |
|----------|------|-------------|
| `implementation` | address | The TickETHTicket template contract |
| `platformFee` | uint256 | Basis points (default 250 = 2.5%) |
| `platformTreasury` | address | Receives platform fee from ticket sales |
| `deployedEvents` | address[] | All deployed event contract addresses |
| `organizerEvents` | mapping(address → address[]) | Events grouped by organizer |

**Functions:**
| Function | Access | Description |
|----------|--------|-------------|
| `constructor(impl, treasury)` | Deployer | Sets implementation address and treasury |
| `createEvent(name, symbol, organizer, startTime)` | Any | Deploys a new clone via `Clones.clone()`, calls `initialize()` on the clone, emits `EventCreated` |
| `createEventDeterministic(name, symbol, organizer, startTime, salt)` | Any | Clone with deterministic address using `Clones.cloneDeterministic()` |
| `predictDeterministicAddress(salt)` | View | Pre-compute a deterministic clone address |
| `getDeployedEventsCount()` | View | Total number of deployed events |
| `getOrganizerEvents(organizer)` | View | All events for a given organizer |
| `updateImplementation(newImpl)` | Owner | Update template (affects future clones only) |
| `setPlatformFee(fee)` | Owner | Set fee (max 1000 bps = 10%) |
| `setPlatformTreasury(treasury)` | Owner | Set treasury (non-zero address required) |

**Events:**
- `EventCreated(address eventAddress, address organizer, string name, string symbol)`

---

### 3.3 TickETHTicket.sol

**Purpose:** ERC-721 NFT contract for a single event. Used as a clone target (Initializable, not constructible). Each event gets its own instance.

**Tier Struct:**
```solidity
struct Tier {
    string name;
    uint256 price;          // in wei
    uint256 maxSupply;
    uint256 minted;
    bool active;
    uint256 startTime;      // sale window start
    uint256 endTime;        // sale window end
    uint256 maxPerWallet;   // per-wallet mint limit
    bytes32 merkleRoot;     // allowlist root (0x0 = open)
    uint256 maxResales;     // max resale count
    uint256 maxPriceDeviationBps; // max price deviation for resale
}
```

**Key State Variables:**
| Variable | Type | Description |
|----------|------|-------------|
| `organizer` | address | Event organizer, has elevated permissions |
| `factory` | address | Factory that deployed this clone |
| `eventStartTime` | uint256 | When the event begins |
| `tiers` | Tier[] | Array of ticket tiers |
| `approvedMarketplace` | address | Only marketplace allowed to facilitate transfers |
| `transfersRestricted` | bool | Default `true` — only mint/marketplace/organizer transfers allowed |
| `metadataLocked` | bool | Once locked, base URI cannot change |
| `walletMints` | mapping(address → mapping(uint256 → uint256)) | Per-wallet per-tier mint count |
| `ticketTier` | mapping(uint256 → uint256) | Token ID → tier index |
| `checkedIn` | mapping(uint256 → bool) | Token ID → checked-in status |
| `resaleCount` | mapping(uint256 → uint256) | Token ID → number of resales |

**Functions (31 total):**
| Function | Access | Description |
|----------|--------|-------------|
| `initialize(...)` | Initializer | OZ Initializable pattern, sets all state |
| `addTier(name, price, maxSupply, startTime, endTime, maxPerWallet, merkleRoot, maxResales, maxPriceDeviationBps)` | Organizer | Add a new ticket tier |
| `setTierStatus(tierIndex, active)` | Organizer | Activate/deactivate a tier |
| `setTierMerkleRoot(tierIndex, root)` | Organizer | Update allowlist |
| `mint(tierIndex, merkleProof)` | Payable, Any | Mint a ticket: validates tier active, time window, supply, wallet limit, merkle proof, exact price. Mints ERC-721 |
| `checkIn(tokenId)` | Organizer | Mark ticket as checked in |
| `batchCheckIn(tokenIds[])` | Organizer | Check in multiple tickets at once |
| `setTransferRestriction(restricted)` | Organizer | Toggle transfer restrictions |
| `setBaseURI(uri)` | Organizer | Set metadata URI (requires `!metadataLocked`) |
| `lockMetadata()` | Organizer | Permanently freeze metadata |
| `setApprovedMarketplace(marketplace)` | Organizer | Set the one allowed marketplace contract |
| `setEventStartTime(time)` | Organizer | Update event start time |
| `incrementResaleCount(tokenId)` | Marketplace Only | Track resale count |
| `getResaleInfo(tokenId)` | View | Returns (count, maxResales, maxPriceDeviationBps) |
| `pause() / unpause()` | Organizer | OZ Pausable |
| `withdraw()` | Organizer | Split funds: platformFee% → treasury, remainder → organizer |
| `getTier(i)` | View | Get tier details |
| `getTierAvailability(i)` | View | Remaining supply for tier |
| `getWalletMints(addr, tier)` | View | How many a wallet minted in a tier |
| `getTicketInfo(tokenId)` | View | Token details (owner, tier, checkedIn) |
| `_update(to, tokenId, auth)` | Internal | Enforces transfer restrictions: allows mint (from=0), marketplace, or organizer transfers only |

**Events:**
- `CheckedIn(uint256 tokenId, uint256 timestamp)`
- `TierAdded(uint256 index, string name, uint256 price, uint256 maxSupply)`
- `TransferRestrictionUpdated(bool restricted)`
- `MetadataLocked()`
- `MarketplaceUpdated(address marketplace)`
- `FundsWithdrawn(address organizer, uint256 orgAmount, address treasury, uint256 platformAmount)`

---

### 3.4 TickETHMarketplace.sol

**Purpose:** Escrow-based secondary marketplace for TickETH ticket NFTs. Supports price deviation controls and resale limits.

**Listing Struct:**
```solidity
struct Listing {
    address seller;
    address ticketContract;
    uint256 tokenId;
    uint256 price;     // in wei
    bool active;
}
```

**Key State Variables:**
| Variable | Type | Description |
|----------|------|-------------|
| `platformFee` | uint256 | Default 250 bps (2.5%) |
| `platformTreasury` | address | Receives marketplace fees |
| `listings` | mapping(uint256 → Listing) | All listings by ID |
| `activeListingForToken` | mapping(address → mapping(uint256 → uint256)) | Contract+tokenId → listingId |
| `listingCounter` | uint256 | Auto-incrementing listing ID |
| `allowedContracts` | mapping(address → bool) | Whitelisted event contracts |

**Functions:**
| Function | Access | Description |
|----------|--------|-------------|
| `constructor(treasury)` | Deployer | Sets treasury and default fee |
| `setAllowedContract(contract, allowed)` | Owner | Whitelist/delist event contracts |
| `listTicket(contract, tokenId, price)` | NFT Owner | Validates allowed contract, price within deviation bounds, resale count < max. Escrows NFT. Creates listing |
| `buyTicket(listingId)` | Payable | Validates active + exact price. Splits: fee → treasury, rest → seller. Transfers NFT. Increments resale count |
| `cancelListing(listingId)` | Seller Only | Returns NFT to seller |
| `adminCancelListing(listingId)` | Owner | Emergency cancel, returns NFT |
| `getListing(id)` | View | Get listing details |
| `getActiveListingForToken(contract, tokenId)` | View | Find active listing for a ticket |
| `isTicketListed(contract, tokenId)` | View | Check if ticket is currently listed |
| `getAllowedPriceRange(contract, tokenId)` | View | Get min/max allowed resale price |
| `onERC721Received()` | External | ERC721Receiver implementation for escrow |

**Events:**
- `TicketListed(uint256 listingId, address seller, address contract, uint256 tokenId, uint256 price)`
- `TicketSold(uint256 listingId, address buyer, address seller, address contract, uint256 tokenId, uint256 price)`
- `ListingCancelled(uint256 listingId, address contract, uint256 tokenId)`
- `ContractStatusUpdated(address contract, bool allowed)`

---

### 3.5 Deployed Addresses (Polygon Amoy Testnet)

| Contract | Address |
|----------|---------|
| TickETHTicket (Implementation) | `0x164d162Da6edF739A0bCd610FBd5d808c165870e` |
| TickETHFactory | `0x8E0237fed96693c36c5A5021A6893b7B9F3494B2` |
| TickETHMarketplace | `0x828bE7efB199b867684bE502A8e93F817697a543` |

### 3.6 Deployment Script

The deployment script (`contracts/scripts/deploy.ts`) executes three steps:
1. Deploy `TickETHTicket` (implementation template)
2. Deploy `TickETHFactory(impl, treasury)`
3. Deploy `TickETHMarketplace(treasury)`

---

## 4. Database Layer

### 4.1 Overview

- **Platform:** Supabase (hosted PostgreSQL)
- **Extensions:** `uuid-ossp` (UUID generation), `pgcrypto` (cryptographic functions)
- **Migrations:** 2 SQL files (`001_initial_schema.sql`, `002_marketplace.sql`)
- **Security:** Row Level Security (RLS) on all tables with JWT-based helper functions

### 4.2 Enums

| Enum | Values |
|------|--------|
| `user_role` | `attendee`, `organizer`, `volunteer`, `admin`, `super_admin` |
| `request_status` | `pending`, `approved`, `rejected` |
| `event_status` | `draft`, `published`, `live`, `cancelled`, `completed` |
| `ticket_status` | `minted`, `checked_in`, `transferred`, `invalidated`, `listed` |
| `listing_status` | `active`, `sold`, `cancelled` |
| `checkin_result` | `success`, `already_checked_in`, `invalid_ticket`, `expired_qr`, `wrong_event`, `failed_confirmation_timeout` |
| `audit_action` | `user_created`, `user_updated`, `role_changed`, `event_created`, `event_updated`, `event_published`, `event_cancelled`, `ticket_minted`, `ticket_transferred`, `checkin_attempted`, `organizer_request_submitted`, `organizer_request_approved`, `organizer_request_rejected`, `admin_action`, `listing_created`, `listing_sold`, `listing_cancelled`, `admin_listing_cancelled` |

### 4.3 Tables

#### `users` (13 columns)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique user ID |
| wallet_address | text | UNIQUE, NOT NULL, lowercase check | Ethereum wallet address |
| display_name | varchar(100) | — | User's display name |
| email | varchar(255) | — | Optional email |
| avatar_url | text | — | Profile picture URL |
| role | user_role | default 'attendee' | User role |
| consent_given | boolean | default false | GDPR/privacy consent |
| consent_given_at | timestamptz | — | When consent was granted |
| push_token | text | — | Expo push notification token |
| is_active | boolean | default true | Soft-delete flag |
| last_login_at | timestamptz | — | Last login timestamp |
| created_at | timestamptz | default now() | Record creation |
| updated_at | timestamptz | default now() | Last update (trigger-managed) |

#### `organizer_requests` (11 columns)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Request ID |
| user_id | uuid | FK→users, NOT NULL | Requesting user |
| wallet_address | text | NOT NULL | Requester's wallet |
| reason | text | NOT NULL, length 10-1000 | Why they want to be an organizer |
| status | request_status | default 'pending' | Review status |
| reviewed_by | uuid | FK→users | Admin who reviewed |
| reviewed_at | timestamptz | — | When reviewed |
| rejection_reason | text | — | Why rejected |
| admin_notes | text | — | Internal admin notes |
| created_at | timestamptz | default now() | Submitted at |
| updated_at | timestamptz | default now() | Last update |

#### `events` (18 columns)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Event ID |
| organizer_id | uuid | FK→users, NOT NULL | Creator/organizer |
| title | varchar(200) | NOT NULL, min length 3 | Event name |
| description | text | — | Event details |
| venue | varchar(300) | — | Physical location |
| banner_url | text | — | Banner image URL (Supabase Storage) |
| start_time | timestamptz | NOT NULL | When event starts |
| end_time | timestamptz | — | When event ends |
| contract_address | text | UNIQUE | On-chain clone address |
| tx_hash | text | — | Deployment transaction hash |
| chain_id | integer | default 80002 | Target blockchain |
| status | event_status | default 'draft' | Current status |
| max_capacity | integer | check ≥0 | Maximum attendees |
| metadata_uri | text | — | IPFS metadata URI |
| metadata_locked | boolean | default false | Whether metadata is frozen |
| is_active | boolean | default true | Soft-delete flag |
| created_at | timestamptz | default now() | Created at |
| updated_at | timestamptz | default now() | Last update |

#### `ticket_tiers` (17 columns)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Tier ID |
| event_id | uuid | FK→events, NOT NULL | Parent event |
| name | varchar(100) | NOT NULL | Tier name (e.g., "VIP", "General") |
| description | text | — | Tier description |
| price | text | NOT NULL | Price in wei (string to handle big numbers) |
| supply | integer | NOT NULL, check >0 | Maximum supply |
| minted | integer | default 0, check ≥0 | Minted count |
| tier_index | integer | NOT NULL | On-chain tier index |
| is_active | boolean | default true | Whether tier is active |
| start_time | timestamptz | — | Sale window start |
| end_time | timestamptz | — | Sale window end |
| max_per_wallet | integer | default 5 | Per-wallet limit |
| merkle_root | text | — | Allowlist Merkle root |
| resale_allowed | boolean | default true | Can tickets be resold |
| max_resales | integer | default 3 | Max resale count |
| max_price_deviation_bps | integer | default 3000 | Max price deviation (30%) |
| created_at / updated_at | timestamptz | defaults | Timestamps |

#### `tickets` (15 columns)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Ticket ID |
| event_id | uuid | FK→events, NOT NULL | Parent event |
| tier_id | uuid | FK→ticket_tiers, NOT NULL | Ticket tier |
| token_id | integer | NOT NULL | On-chain NFT token ID |
| owner_wallet | text | NOT NULL | Current owner's wallet |
| contract_address | text | NOT NULL | Event contract address |
| tx_hash | text | — | Mint transaction hash |
| status | ticket_status | default 'minted' | Current status |
| checked_in_at | timestamptz | — | When checked in |
| minted_at | timestamptz | default now() | When minted |
| transfer_count | integer | default 0 | Number of transfers |
| original_price_wei | text | — | Original mint price |
| metadata_uri | text | — | Token metadata URI |
| created_at / updated_at | timestamptz | defaults | Timestamps |
| — | — | UNIQUE(contract_address, token_id) | Prevents duplicates |

#### `checkin_logs` (11 columns)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Log entry ID |
| ticket_id | uuid | FK→tickets, NOT NULL | Which ticket |
| event_id | uuid | FK→events, NOT NULL | Which event |
| scanned_by | uuid | FK→users | Volunteer/staff who scanned |
| attendee_wallet | text | — | Attendee's wallet address |
| result | checkin_result | NOT NULL | Outcome of the scan |
| scanned_at | timestamptz | default now() | When scanned |
| confirmed_at | timestamptz | — | When attendee confirmed |
| device_info | jsonb | — | Scanner device metadata |
| qr_payload_hash | text | — | Hash of QR data for audit |
| notes | text | — | Additional notes |

#### `audit_logs` (8 columns)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Log entry ID |
| action | audit_action | NOT NULL | What happened |
| actor_id | uuid | FK→users | Who did it |
| target_type | varchar(50) | — | Entity type (user, event, ticket, etc.) |
| target_id | uuid | — | Entity ID |
| details | jsonb | default '{}' | Additional structured data |
| ip_address | inet | — | Actor's IP address |
| created_at | timestamptz | default now() | When it happened |

> **Note:** `audit_logs` is immutable — a trigger prevents UPDATE and DELETE operations.

#### `marketplace_listings` (23 columns)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Listing ID |
| ticket_id | uuid | FK→tickets, UNIQUE | Which ticket (one active listing per ticket) |
| event_id | uuid | FK→events, NOT NULL | Parent event |
| tier_id | uuid | FK→ticket_tiers | Ticket tier |
| seller_wallet | text | NOT NULL | Seller's wallet |
| buyer_wallet | text | — | Buyer's wallet (set on sale) |
| token_id | integer | NOT NULL | On-chain token ID |
| contract_address | text | NOT NULL | Event contract address |
| price | text | NOT NULL | Listing price in wei |
| original_price | text | — | Original mint price |
| price_deviation_bps | integer | — | Price deviation from original |
| status | listing_status | default 'active' | Listing status |
| listing_tx_hash | text | — | On-chain listing transaction |
| sale_tx_hash | text | — | On-chain sale transaction |
| cancel_tx_hash | text | — | On-chain cancel transaction |
| on_chain_listing_id | integer | — | Marketplace contract listing ID |
| resale_number | integer | default 1 | Which resale this is |
| platform_fee_bps | integer | default 250 | Fee at time of listing |
| expires_at | timestamptz | — | Listing expiry |
| listed_at / sold_at / cancelled_at | timestamptz | — | Status timestamps |
| created_at / updated_at | timestamptz | defaults | Record timestamps |

#### `resale_history` (14 columns)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | History entry ID |
| listing_id | uuid | FK→marketplace_listings | Source listing |
| ticket_id | uuid | FK→tickets, NOT NULL | Which ticket |
| event_id | uuid | FK→events, NOT NULL | Which event |
| from_wallet | text | NOT NULL | Seller |
| to_wallet | text | NOT NULL | Buyer |
| price | text | NOT NULL | Sale price (wei) |
| original_price | text | NOT NULL | Original price (wei) |
| platform_fee | text | — | Fee charged |
| seller_proceeds | text | — | Amount seller received |
| resale_number | integer | NOT NULL | Nth resale of this ticket |
| tx_hash | text | — | Transaction hash |
| sold_at | timestamptz | default now() | When sold |
| created_at | timestamptz | default now() | Record creation |

> **Note:** `resale_history` is also immutable (trigger prevents UPDATE/DELETE).

### 4.4 Views

| View | Description |
|------|-------------|
| `active_listings` | Joins marketplace_listings + ticket_tiers + events where status='active' |
| `marketplace_stats` | Per-event aggregates: total listings, active listings, sold count, total volume, avg/min/max price |

### 4.5 Indexes (25+)

Key performance indexes on: `users(wallet_address, role)`, `events(organizer_id, status, contract_address)`, `tickets(event_id, owner_wallet, contract_address+token_id)`, `checkin_logs(ticket_id, event_id)`, `audit_logs(action, actor_id)`, `marketplace_listings(status, seller_wallet, event_id, contract_address+token_id)`, `resale_history(ticket_id, event_id)`.

### 4.6 Row Level Security (RLS)

All tables have RLS enabled. Helper functions extract information from the JWT:

```sql
auth_wallet()  -- extracts wallet_address from JWT
auth_role()    -- extracts role from JWT
is_admin()     -- checks if role is admin or super_admin
```

**Policy Summary:**
| Table | Read | Write |
|-------|------|-------|
| users | Own record (admins: all) | Own record only |
| events | Everyone (published) | Organizer (own) + Admin |
| ticket_tiers | Everyone | Organizer (own event) |
| tickets | Owner only | Authenticated (mint) |
| checkin_logs | Organizer/Volunteer/Admin | Volunteer/Organizer/Admin |
| audit_logs | Admin only | Insert only (system) |
| marketplace_listings | Everyone | Ticket owner (list), Buyer (buy) |
| organizer_requests | Own requests (Admin: all) | Authenticated (submit) |

### 4.7 Dev Seed Data

The `dev_seed.sql` file provides:
- **4 users:** admin, organizer, volunteer, attendee (with specific wallet addresses)
- **1 approved organizer request**
- **2 events:** "Ethereum Summit 2025", "NFT Art Night"
- **5 ticket tiers** across both events

---

## 5. Backend (API Server)

### 5.1 Server Configuration

| Setting | Value |
|---------|-------|
| Framework | NestJS v11 |
| Port | 3001 (configurable via `PORT` env) |
| API Prefix | `/api/v1` |
| Swagger Docs | Available at `/docs` |
| CORS | Configurable via `CORS_ORIGINS` env |
| Security | Helmet headers enabled |
| Validation | Global ValidationPipe (whitelist, forbidNonWhitelisted, transform) |

### 5.2 Module Architecture (15 Modules)

```
AppModule
├── ConfigModule (@Global)
├── BullModule (Redis connection)
├── SupabaseModule (@Global — provides SupabaseService everywhere)
├── AuthModule
│   ├── AuthController
│   ├── AuthService
│   ├── JwtStrategy
│   └── AuthGuard
├── UsersModule
│   ├── UsersController
│   └── UsersService
├── OrganizerRequestsModule
│   ├── OrganizerRequestsController
│   └── OrganizerRequestsService
├── EventsModule
│   ├── EventsController
│   └── EventsService
├── TicketTiersModule
│   ├── TicketTiersController
│   └── TicketTiersService
├── TicketsModule
│   ├── TicketsController
│   └── TicketsService
├── CheckinModule
│   ├── CheckinController
│   ├── CheckinService
│   └── CheckinGateway (WebSocket)
├── AuditModule
│   ├── AuditController (read-only)
│   └── AuditService (used by all modules)
├── AdminModule
│   ├── AdminController
│   └── AdminService
├── BlockchainModule
│   ├── BlockchainController
│   ├── BlockchainService
│   └── ChainListenerService (background poller)
├── MarketplaceModule
│   ├── MarketplaceController
│   └── MarketplaceService
├── IpfsModule
│   ├── IpfsController
│   └── IpfsService
├── QueuesModule
│   ├── NotificationsProcessor
│   └── AnalyticsProcessor
└── UploadsModule
    ├── UploadsController
    └── UploadsService
```

### 5.3 Complete API Endpoints (60+)

#### Health Check
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/health` | Public | Returns `{ status: 'ok', timestamp }` |

#### Auth Module (`/auth`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/auth/nonce` | Public | Generate nonce for wallet. Body: `{ walletAddress }`. Upserts user, returns `{ nonce }` |
| POST | `/auth/verify` | Public | Verify SIWE signature. Body: `{ message, signature }`. Returns `{ accessToken, refreshToken, user }` |
| POST | `/auth/refresh` | Public | Refresh tokens. Body: `{ refreshToken }`. Returns new token pair |

#### Users Module (`/users`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/users/me` | JWT | Get current authenticated user |
| PATCH | `/users/me` | JWT | Update profile: `{ displayName?, email?, avatarUrl?, consentGiven? }` |
| GET | `/users/:id` | JWT | Get user by ID |
| GET | `/users/wallet/:address` | JWT | Get user by wallet address |
| POST | `/users/push-token` | JWT | Save push notification token: `{ pushToken }` |
| GET | `/users/volunteers` | JWT (admin/organizer) | List all volunteers |
| POST | `/users/volunteers/promote` | JWT (admin/organizer) | Promote user to volunteer: `{ walletAddress }` |
| POST | `/users/volunteers/revoke` | JWT (admin/organizer) | Revoke volunteer role: `{ walletAddress }` |

#### Events Module (`/events`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/events` | Public | List published events. Query: `?search=&status=&page=&limit=&sort=` |
| GET | `/events/:id` | Public | Get single event with tiers + organizer |
| GET | `/events/organizer/mine` | JWT (organizer) | Get organizer's own events |
| POST | `/events` | JWT (organizer) | Create event: `{ title, description, venue, bannerUrl?, startTime, endTime?, maxCapacity?, metadataUri? }` |
| PATCH | `/events/:id` | JWT (organizer, owner) | Update event fields |
| PATCH | `/events/:id/status` | JWT (organizer, owner) | Change event status: `{ status }` |
| GET | `/events/:id/stats` | JWT (organizer/admin) | Event statistics |
| DELETE | `/events/:id` | JWT (admin) | Soft-delete event |

#### Ticket Tiers Module (`/events/:eventId/tiers`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/events/:eventId/tiers` | Public | List tiers for an event |
| POST | `/events/:eventId/tiers` | JWT (organizer) | Add single tier |
| POST | `/events/:eventId/tiers/batch` | JWT (organizer) | Add multiple tiers at once |
| PATCH | `/events/:eventId/tiers/:tierId` | JWT (organizer) | Update a tier |
| DELETE | `/events/:eventId/tiers/:tierId` | JWT (organizer) | Delete a tier |
| GET | `/events/:eventId/tiers/availability` | Public | Get remaining supply per tier |

#### Tickets Module (`/tickets`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/tickets/mine` | JWT | Get my tickets. Query: `?page=&limit=` |
| GET | `/tickets/:id` | JWT | Get single ticket with event + tier data |
| GET | `/tickets/event/:eventId` | JWT | Get tickets for an event |
| POST | `/tickets/record-mint` | JWT | Record a mint: `{ eventId, tierId, tokenId, txHash, ownerWallet }` |
| PATCH | `/tickets/:id/transfer` | JWT | Record transfer: `{ newOwnerWallet, txHash }` |

#### Check-in Module (`/checkin`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/checkin/qr-code` | JWT | Generate QR payload: `{ ticketId, eventId }` → HMAC-signed payload with 30s expiry |
| POST | `/checkin/scan` | JWT (volunteer/organizer/admin) | Scan QR code. Validates HMAC + expiry + ownership. Creates pending_confirmation log. Emits WebSocket |
| POST | `/checkin/confirm` | JWT | Attendee confirms check-in: `{ checkinLogId, attendeeWallet? }`. Updates status, emits WebSocket |
| POST | `/checkin/sync-offline` | JWT (volunteer/organizer/admin) | Batch sync offline scans: `{ scans: [{qrData, scannedAt}] }` |
| GET | `/checkin/status/:logId` | JWT | Poll confirmation status |
| GET | `/checkin/count/:eventId` | JWT | Get checked-in count for event |
| GET | `/checkin/logs/:eventId` | JWT (organizer/admin) | Get all check-in logs for event |

**WebSocket Gateway:** Namespace `/checkin`
| Event | Direction | Description |
|-------|-----------|-------------|
| `joinEvent` | Client → Server | Join event room for real-time updates |
| `leaveEvent` | Client → Server | Leave event room |
| `checkinUpdate` | Server → Client | Volunteer gets scan result update |
| `checkinConfirmed` | Server → Client | Attendee confirmation received |

#### Marketplace Module (`/marketplace`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/marketplace/listings` | Public | Get all active listings. Query: `?eventId=&sort=` |
| GET | `/marketplace/listings/:id` | Public | Get single listing with ticket + event + tier |
| GET | `/marketplace/my-listings` | JWT | Get current user's listings |
| POST | `/marketplace/listings` | JWT | Create listing: `{ ticketId, price, txHash? }` |
| POST | `/marketplace/listings/:id/complete-sale` | JWT | Complete sale: `{ txHash, buyerWallet }` |
| DELETE | `/marketplace/listings/:id` | JWT (seller) | Cancel listing |
| GET | `/marketplace/tickets/:ticketId/history` | Public | Get resale history for a ticket |
| GET | `/marketplace/stats/:eventId` | Public | Get marketplace stats for an event |

#### Blockchain Module (`/blockchain`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/blockchain/deploy` | JWT (organizer) | Deploy + initialize event contract. Body: `{ eventId, name?, symbol?, tiers[] }`. Auto-derives name/symbol from event if not provided. Uses server-side deployer wallet |
| GET | `/blockchain/verify/:address` | JWT | Verify contract deployment status on-chain |

**Background Service:** `ChainListenerService`
- Polls every 15 seconds for on-chain events
- Watches for: `Transfer`, `TicketListed`, `TicketSold`, `ListingCancelled`
- Updates database accordingly
- Configurable via `CHAIN_LISTENER_ENABLED` and `CHAIN_LISTENER_START_BLOCK`

#### Admin Module (`/admin`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/admin/dashboard` | JWT (admin) | Dashboard stats: totalUsers, totalEvents, totalTickets, pendingRequests |
| GET | `/admin/users` | JWT (admin) | List all users. Query: `?search=&role=&page=&limit=` |
| PATCH | `/admin/users/:id/role` | JWT (admin) | Change user role: `{ role }` |
| DELETE | `/admin/users/:id` | JWT (admin) | Deactivate user |

#### Organizer Requests Module (`/organizer-requests`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/organizer-requests` | JWT | Submit request: `{ reason }` (10-1000 chars) |
| GET | `/organizer-requests/mine` | JWT | Get my requests |
| GET | `/organizer-requests` | JWT (admin) | Get all requests. Query: `?status=` |
| PATCH | `/organizer-requests/:id/review` | JWT (admin) | Approve/reject: `{ status, rejectionReason?, adminNotes? }` |

#### IPFS Module (`/ipfs`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/ipfs/upload-metadata` | JWT (organizer) | Upload JSON metadata to Pinata/IPFS: `{ name, description, image?, attributes? }`. Returns `{ ipfsHash, ipfsUrl, gatewayUrl }` |

#### Uploads Module (`/uploads`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/uploads/avatar` | JWT, multipart/form-data | Upload avatar image to Supabase Storage. Max 5MB, JPEG/PNG/WebP/GIF. Returns `{ url, message }` |
| POST | `/uploads/banner` | JWT (organizer), multipart/form-data | Upload event banner to Supabase Storage. Max 5MB. Returns `{ url, message }` |

#### Audit Module (`/audit`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/audit/logs` | JWT (admin) | Get paginated audit logs. Query: `?action=&actorId=&targetType=&page=&limit=` |

> **Note:** `AuditService.log()` is used internally by all other modules to automatically record all actions.

### 5.4 Guards & Decorators

| Item | Type | Description |
|------|------|-------------|
| `AuthGuard` | Guard | Validates JWT token, attaches user to request |
| `RolesGuard` | Guard | Checks user role against `@Roles()` decorator |
| `@Roles(...roles)` | Decorator | Specifies required roles for an endpoint |
| `@CurrentUser()` | Decorator | Extracts current user from request object |
| `@Public()` | Decorator | Marks endpoint as public (bypasses AuthGuard) |

### 5.5 Queue System (BullMQ + Redis)

| Queue | Purpose |
|-------|---------|
| `notifications` | Processes push notification jobs via Expo Push API |
| `analytics` | Processes analytics event jobs |

---

## 6. Frontend (Web Application)

### 6.1 Configuration

| Setting | Value |
|---------|-------|
| Framework | Next.js 16.1.6 with App Router |
| TypeScript | Strict mode |
| Styling | Tailwind CSS v4 |
| Theme | Dark mode (html.dark class) |
| Fonts | Geist Sans + Geist Mono |
| Image Domains | ipfs.io, pinata, nftstorage, cloudflare-ipfs |
| Security Headers | X-Frame-Options DENY, X-Content-Type-Options nosniff, X-XSS-Protection, strict Referrer-Policy, restrictive Permissions-Policy |

### 6.2 Providers

```
Root Layout
└── ThirdwebProvider
    └── QueryClientProvider (staleTime: 30s, retry: 2)
        └── ErrorBoundary (global catch)
            └── Sonner Toaster (dark, top-right, 4s auto-dismiss)
                └── Page Content
```

### 6.3 Library Files (10)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `constants.ts` | App-wide constants | `THIRDWEB_CLIENT_ID`, `API_BASE_URL`, contract addresses, `thirdwebClient`, `activeChain`, `BLOCK_EXPLORER`, `SIWE_DOMAIN` |
| `api-client.ts` | HTTP client setup | Axios instance with Bearer token from localStorage, 401 auto-refresh with queued retries |
| `api.ts` | API layer | 12 API objects: `authApi`, `usersApi`, `eventsApi`, `tiersApi`, `ticketsApi`, `marketplaceApi`, `organizerRequestsApi`, `adminApi`, `blockchainApi`, `ipfsApi`, `checkinApi`, `uploadsApi` |
| `types.ts` | TypeScript interfaces | `User`, `AuthTokens`, `TickETHEvent`, `TicketTier`, `Ticket`, `Listing`, `OrganizerRequest`, `CheckinLog`, `PaginatedResponse`, `ApiError`, `DashboardStats`, `EventStats` |
| `store.ts` | State management | Zustand `useAuthStore`: `user`, `hydrate()`, `setUser()`, `refreshUser()`, `logout()` |
| `hooks.ts` | Custom React hooks | `useDebounce`, `useCountdown`, `useIntersectionObserver`, `useLocalStorage`, `useCopyToClipboard`, `useMediaQuery`, `useScrollLock`, `useFocusTrap` |
| `utils.ts` | Utility functions | `shortenAddress()`, `formatPrice()`, `getTierPrice()`, `getTierPriceWei()`, `formatDate()`, `formatDateTime()`, `formatRelativeTime()`, `hasEventStarted()`, `isEventSoon()`, `formatCompact()`, `statusColor()`, `statusBg()` |
| `error-parser.ts` | Error handling | Centralized parser with ~15 known revert reasons (REVERT_MAP), maps errors to `{ title, message, code }` |
| `siwe.ts` | SIWE message building | `buildSiweMessage()` for EIP-4361 format |
| `cn.ts` | Class names | `cn()` utility using clsx + tailwind-merge |

### 6.4 All Pages (14 Routes)

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing Page | Hero section with gradient animation, 4 feature cards (NFT Tickets, Smart Check-in, Verified Resale, Fair Pricing), 3-step "How It Works", live stats strip, featured events (from API), recent marketplace listings, 6-item FAQ accordion, trust logos |
| `/events` | Event Browse | Debounced search (300ms), status filter pills, sort options (newest/oldest/name), grid/list toggle, pagination. URL-synced query params. Banner images displayed. Min price calculated from tiers |
| `/events/[id]` | Event Details | Countdown timer to event start, banner image, organizer info (from DB join), tier selection with progress bars (minted/supply), mint flow with quantity selector (1-10) + price breakdown. On-chain mint via Thirdweb `prepareContractCall` + `useSendTransaction`. 5-step TransactionTracker modal. Backend `record-mint` call (non-blocking) |
| `/tickets` | My Tickets | Status filter pills with counts (all/minted/checked_in/listed/transferred), ticket cards with token ID, Polygonscan link, action buttons (List, Transfer, View Event). Auth-gated |
| `/tickets/[id]/transfer` | Transfer Ticket | Recipient address input with validation, self-transfer prevention, irreversibility warning, 2-step confirmation dialog, on-chain `safeTransferFrom`, TransactionTracker overlay |
| `/profile` | User Profile | Wallet-derived avatar, role badge, editable form (display name, email, avatar upload via ImageUpload component), Polygonscan wallet link |
| `/marketplace` | Marketplace | Search, sort (newest/price asc/desc), listing cards with event banner + seller + price. Buy flow via on-chain `buyTicket`. List flow with price input |
| `/organizer` | Organizer Dashboard | Stats summary (total events, total tickets sold, revenue), event cards with status badges. Non-organizers see organizer request form with reason textarea |
| `/organizer/create` | Create Event | 3-step wizard: **Step 1** — Event details (title, description, venue, date/time, banner upload) + up to 5 tiers (name, price in POL, supply per tier). **Step 2** — Deploy contract to blockchain (auto-deploys via backend, creates + initializes tiers on-chain). **Step 3** — Success confirmation with links |
| `/organizer/[id]` | Manage Event | Event stats (capacity, minted, checked-in), contract info with Polygonscan link, tier progress bars (minted vs supply), action buttons: Deploy (if no contract), Publish, Cancel |
| `/organizer/volunteers` | Volunteer Management | Add volunteer by wallet address with validation, volunteer list with revoke action, 3-step instructions |
| `/admin` | Admin Dashboard | 4 stat cards (Total Users, Total Events, Total Tickets, Pending Requests), quick-link navigation cards |
| `/admin/users` | User Management | Searchable user table, role filter dropdown, sortable columns, change role modal with confirmation, delete/deactivate with confirmation |
| `/admin/requests` | Request Review | Filter tabs with counts (All/Pending/Approved/Rejected), request cards with reason + wallet + date, approve/reject actions per request |

### 6.5 All Components (12)

| Component | Props | Description |
|-----------|-------|-------------|
| `Navbar` | — | Sticky header with conditional navigation links based on user role. Thirdweb `ConnectButton` with SIWE auto-login flow (getNonce → buildSiwe → sign → verify → setUser). Supported wallets: inAppWallet (email/google/apple/phone), MetaMask, Coinbase, Rainbow. Mobile hamburger menu. Re-fetches user on window focus |
| `Footer` | — | 4-column layout: Brand + social links, Platform links, Contract links (Polygonscan addresses), Network info + Legal |
| `Button` | `variant`, `size`, `loading`, `icon`, `disabled`, `fullWidth` | 6 variants: primary, secondary, outline, ghost, danger, accent. 4 sizes: xs, sm, md, lg. Loading spinner, icon support. forwardRef |
| `Modal` | `isOpen`, `onClose`, `title`, `size`, `children` | Portal-based with AnimatePresence, backdrop blur, Escape key close, focus trap, scroll lock. 4 sizes: sm, md, lg, xl. ARIA attributes |
| `TransactionTracker` | `status`, `txHash`, `error`, `steps` | 5-step progress tracker: preparing → awaiting-signature → broadcasting → confirming → success. Error state display. Transaction hash link to Polygonscan on success |
| `Input` / `Textarea` | `label`, `error`, `hint`, standard HTML attrs | Form inputs with label, error message, hint text. forwardRef |
| `ImageUpload` | `onUpload`, `currentUrl`, `shape`, `uploadEndpoint` | Drag-and-drop or click-to-upload. Shape: circle (avatar) or rect (banner). 5MB limit, JPEG/PNG/WebP/GIF. Local file preview, uploading spinner, error message display |
| `Badge` | `variant`, `children`, `dot` | Status badge with dynamic color per variant, optional dot indicator |
| `StatCard` | `icon`, `label`, `value`, `trend`, `loading` | Stat display card with icon, label, formatted value, optional trend indicator, shimmer loading state |
| `Skeleton` / `CardSkeleton` / `DetailSkeleton` / `TableRowSkeleton` / `StatsSkeleton` | `className`, `count` | Loading placeholder components for different layout types |
| `EmptyState` | `icon`, `title`, `message`, `action` | Empty state display with icon, title, descriptive message, optional action button |
| `ErrorBoundary` | `children`, `fallback` | React class component error boundary with retry button |

### 6.6 Key Frontend Features

- **Auto-refresh token interceptor:** Axios 401 response triggers refresh, queues concurrent requests
- **Error parsing:** 15+ known Solidity revert reasons mapped to user-friendly messages
- **Responsive design:** Mobile-first Tailwind CSS with breakpoints
- **SEO:** OpenGraph + Twitter card meta tags
- **Price formatting:** Auto-detects wei (digit-only >9 chars) vs POL decimal, formats to 4 decimal places
- **TransactionTracker:** Unified 5-step modal for all on-chain operations
- **Toast notifications:** Sonner with dark theme for all success/error/info feedback

---

## 7. Mobile Application

### 7.1 App Configuration

| Setting | Value |
|---------|-------|
| Framework | React Native 0.81.5, Expo SDK 54 |
| Navigation | expo-router v6 (file-based) |
| Bundle ID | `com.ticketh.app` |
| URL Scheme | `ticketh://` |
| Architecture | New Architecture enabled |
| Theme | Dark mode (Background: #0D0D0D, Primary: #6C63FF, Accent: #00D9FF) |

### 7.2 State Management (3 Zustand Stores)

| Store | State | Key Methods |
|-------|-------|-------------|
| `authStore` | `user`, `hydrated`, `loading`, `error` | `hydrate()` (from SecureStore), `login()` (SIWE verify + save tokens), `logout()` (clear tokens), `refreshUser()`, `clearError()` |
| `walletStore` | `address`, `connected`, `chainId`, `mode` (attendee/volunteer), `connecting` | `setWallet()`, `disconnect()`, `setMode()`, `setConnecting()` |
| `offlineStore` | `isOnline`, `pendingScans[]`, `snapshots{}`, `syncing` | `addScan()` (max 200), `markSynced()`, `setSnapshot()`, `getSnapshot()` (24h TTL), `hydrate()`, `clear()`. Persisted to AsyncStorage |

### 7.3 Providers (2)

| Provider | Responsibilities |
|----------|-----------------|
| `AuthProvider` | Wraps auth context. On mount: hydrates stores, configures push notifications, starts network monitor, sets up notification listeners (deep links to checkin-confirm on tap). Auto-refreshes user on app foreground. Registers push token with backend |
| `WalletProvider` | Bridges Thirdweb wallet + SIWE auth. Watches `useActiveAccount` → auto-login (getNonce → buildSiwe → sign → verify). Persists app mode (attendee/volunteer) to AsyncStorage. Disconnect clears both wallet and auth states |

### 7.4 Services (7)

| Service | Description |
|---------|-------------|
| `contract.ts` | `mintTicketOnChain()`: prepareContractCall → sendTransaction → waitForReceipt → parse Transfer event for tokenId. `transferTicketOnChain()`: safeTransferFrom |
| `wallet.ts` | `getProvider()` (JsonRpcProvider for Amoy), `buildSiweMessage()`, `isValidAddress()`, `getTxUrl()`, `getAddressUrl()`, `getTokenUrl()` |
| `offline.ts` | `startNetworkMonitor()` (auto-sync pending scans on reconnect), `syncPendingScans()` (batch), `downloadEventSnapshot()`, `downloadAllSnapshots()` |
| `notifications.ts` | `configureNotifications()`, `registerForPushNotifications()` (Expo push token + Android channel), listeners, `scheduleLocalNotification()` |
| `errorParser.ts` | 8 error categories: wallet_rejected, insufficient_funds, network, timeout, auth, server, contract_revert, offline. Returns `{ message, category, retryable }` |
| `analytics.ts` | 50+ typed event names, buffer-based (max 100 events), console logging in `__DEV__`. Functions: `track()`, `screenView()`, `getBuffer()`, `flush()` |
| `toast.tsx` | `ToastProvider` + `showToast()` singleton. Types: success/error/warning/info. Auto-dismiss (default 3s). Haptic feedback. Max 3 stacked. Swipe-to-dismiss. Action button support |

### 7.5 Hooks (6)

| Hook | Description |
|------|-------------|
| `useEvents(filters?)` | Fetch events list with pagination, search, filter. Returns `{ events, loading, error, hasMore, refresh, loadMore }` |
| `useEvent(eventId)` | Fetch single event. Returns `{ event, loading, error, refresh }` |
| `useMyTickets()` | Fetch current user's tickets. Returns `{ tickets, loading, error, refresh }` |
| `useTicket(ticketId)` | Fetch single ticket. Returns `{ ticket, loading, error, refresh }` |
| `useTicketQR(ticketId, eventId)` | Auto-refreshing QR code every 25 seconds. Returns `{ qrPayload, loading, error, refresh }` |
| `useScanCheckin()` | Volunteer QR scanning: `handleScan()` (online → API, offline → queue), auto-poll confirmation (3s intervals, 2min timeout), reset. Returns `{ scanResult, loading, error, handleScan, reset }` |

### 7.6 API Layer (7 files)

| File | Functions |
|------|-----------|
| `client.ts` | Axios instance + SecureStore token management (TOKEN_KEY, REFRESH_KEY), request interceptor (attach JWT), response interceptor (401 auto-refresh with queue) |
| `auth.ts` | `getNonce()`, `verify()` (+ auto setTokens), `refreshToken()`, `getMe()` |
| `events.ts` | `getEvents(filters)`, `getEventById()`, `getEventStats()`, `getMyEvents()` |
| `tickets.ts` | `getMyTickets()`, `getTicketById()`, `getTicketsByEvent()`, `recordMint()`, `getEventTiers()`, `getTierAvailability()` |
| `checkin.ts` | `getQRCode()`, `scanQR()` (parses JSON QR → individual fields), `confirmCheckin()`, `syncOfflineScans()`, `getCheckinStatus()`, `getCheckinCount()`, `getCheckinLogs()` |
| `marketplace.ts` | `getListings()`, `getListingById()`, `getMyListings()`, `createListing()`, `completeSale()`, `cancelListing()`, `getTicketHistory()`, `getMarketplaceStats()` |
| `users.ts` | `setPushToken()`, `updateProfile()`, `uploadAvatar()` (FormData multipart via expo-image-picker) |

### 7.7 All Screens (13)

| Route | Screen | Description |
|-------|--------|-------------|
| `/` (root) | Root Redirect | Loading spinner during store hydration → `/auth` if unauthenticated → `/(tabs)/events` if authenticated |
| `/auth` | Auth Screen | Animated logo, 3 feature highlight rows, Thirdweb ConnectButton (inApp + MetaMask + Coinbase + Rainbow), network badge, haptic feedback on success |
| `/(tabs)/events` | Events List | Greeting header with user name, debounced search (300ms), sort (date/price/popularity), filter pills (all/upcoming/live/completed), offline banner, FlatList with pull-to-refresh + infinite scroll, staggered fade-in animation |
| `/(tabs)/tickets` | My Tickets | Stats row (active/used/total), filter pills (all/minted/checked_in/listed/transferred), FlatList with skeleton loading, staggered card animations |
| `/(tabs)/scanner` | QR Scanner | Camera-based QR scanning (volunteer/organizer/admin only) with corner markers, haptic + vibration feedback, flash overlay (green = success, red = fail), scan count, manual code input, offline sync bar with pending count, "Prepare Offline Data" download |
| `/(tabs)/profile` | Profile | Wallet-derived avatar, role badge, address copy/share/explorer links, email missing prompt, edit profile link, settings section, disconnect with confirmation |
| `/event/[id]` | Event Details | Banner image, status badges (live/starting soon), detail grid (date/venue/contract), tier selection with animated scale, mint flow with MintProgressOverlay (5 steps: preparing → awaiting_signature → confirming → finalizing → success), confetti animation on success, pull-to-refresh |
| `/ticket/[id]` | Ticket Details | QR code display (active tickets only, auto-refresh every 25s), transferred/checked-in status cards, detail rows (token ID, tier, price, owner, contract, event date, venue, minted date, tx hash), transfer + explorer action buttons |
| `/transfer/[id]` | Transfer Ticket | Warning banner, ticket summary card, recipient input with paste-from-clipboard + validation (isValidAddress + self-transfer check), transfer summary preview, on-chain `safeTransferFrom`, confetti on success |
| `/edit-profile` | Edit Profile | Avatar upload (ImagePicker + camera permission + upload to API), display name (2-50 chars), email (required, validated), avatar URL (paste fallback), consent checkbox, save to API + refreshUser |
| `/checkin-confirm` | Check-in Confirm | 2-minute countdown timer, ticket info card, confirm button (signs message with wallet → calls confirmCheckin API), deny button with Alert, confetti on success, timeout handling |
| `/marketplace` | Marketplace | Sort pills (newest/price low/price high), listing count chip, listing cards with staggered animation, pull-to-refresh |
| `/marketplace/create` | Create Listing | 2-step flow: select ticket (filters to minted + resale_allowed), set price with preview card, create via API |
| `/marketplace/[id]` | Listing Details | Event info card, price card, listing metadata, buy flow (Alert confirmation → completeSale API), cancel flow (seller only), purchased/cancelled success states with confetti |

### 7.8 Navigation Structure

```
Stack Navigator (root)
├── /auth (slide_from_bottom)
├── /(tabs) — Tab Navigator
│   ├── Events tab (calendar icon)
│   ├── My Tickets tab (ticket icon)
│   ├── Scanner tab (scan icon) ← conditional: volunteer/admin/organizer only
│   │                              badge shows pending offline scan count
│   └── Profile tab (person icon)
├── /event/[id] (slide_from_right)
├── /ticket/[id] (slide_from_right)
├── /transfer/[id] (slide_from_bottom)
├── /edit-profile (slide_from_right)
├── /checkin-confirm (slide_from_bottom)
├── /marketplace (slide_from_right)
├── /marketplace/create (slide_from_right)
└── /marketplace/[id] (slide_from_right)
```

### 7.9 All Components (16)

| Component | Description |
|-----------|-------------|
| `EventCard` | Event card with banner image (expo-image), status badge (Live/Starting Soon/Upcoming), price tag overlay, title, date/venue meta, ticket progress bar + "Only X left!" warning |
| `TicketCard` | Ticket card with left accent bar (primary if minted), event title, tier name, status badge, dashed divider with circular cutouts, bottom row (token ID, date, price), chevron |
| `QRScanner` | Camera-based scanner: permission handling, CameraView with QR-only barcode settings, scan overlay with corner markers (250px area), 2-second re-scan cooldown |
| `QRCodeDisplay` | QR renderer: react-native-qrcode-svg, white background with primary glow shadow, pulse animation when <5s to expiry, refresh overlay, loading/error states |
| `ScanResult` | Scan result: icon + color per state (success=green checkmark, pending=warning hourglass, timeout=timer, invalid=red X), status text, 120s countdown for pending, haptic feedback, "Scan Another" button |
| `ConfettiAnimation` | 40-particle confetti shower: 10 brand colors, random positions/delays/sizes, gravity fall + horizontal drift + rotation, fade out at 80%, configurable duration (default 2.5s) |
| `Skeleton` variants | Base Skeleton (shimmer 0.3↔0.7 opacity), EventCardSkeleton, TicketCardSkeleton, EventDetailSkeleton, ProfileSkeleton, ListingCardSkeleton, ListSkeleton (generic) |
| `Button` | 5 variants (primary/secondary/outline/ghost/danger), 3 sizes (sm/md/lg), loading spinner, icon slot, fullWidth option |
| `Badge` | 6 variants (default/success/error/warning/info/primary), semi-transparent backgrounds, 2 sizes (sm/md), uppercase text |
| `Card` | 3 variants (default/elevated/outlined), configurable padding |
| `Header` | Navigation header: centered title + subtitle, left/right icon buttons (Ionicons), 56px min height |
| `EmptyState` | Empty state: icon in circular container, title, message, optional action button |
| `Input` | Text input with label, icon slot, error state (red border), hint text |
| `LoadingSpinner` | ActivityIndicator with optional message, optional fullScreen mode |

---

## 8. Authentication & Authorization

### 8.1 Authentication Flow (SIWE — Sign-In with Ethereum)

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│  Client   │                    │  Backend  │                    │ Supabase │
│(Web/Mobile)│                   │ (NestJS)  │                    │   (DB)   │
└─────┬─────┘                    └─────┬─────┘                    └─────┬────┘
      │                                │                                │
      │ 1. POST /auth/nonce            │                                │
      │   { walletAddress }            │                                │
      │──────────────────────────────►│                                │
      │                                │ 2. Upsert user                 │
      │                                │──────────────────────────────►│
      │                                │◄──────────────────────────────│
      │                                │                                │
      │ 3. { nonce: "abc123..." }      │                                │
      │◄──────────────────────────────│                                │
      │                                │                                │
      │ 4. Build SIWE message          │                                │
      │    (EIP-4361 format)           │                                │
      │ 5. Wallet signs message        │                                │
      │                                │                                │
      │ 6. POST /auth/verify           │                                │
      │   { message, signature }       │                                │
      │──────────────────────────────►│                                │
      │                                │ 7. Verify SIWE sig             │
      │                                │ 8. Validate nonce              │
      │                                │ 9. Issue JWT                   │
      │                                │                                │
      │ 10. { accessToken,             │                                │
      │      refreshToken,             │                                │
      │      user }                    │                                │
      │◄──────────────────────────────│                                │
      │                                │                                │
      │ 11. Store tokens               │                                │
      │     (localStorage / SecureStore)│                               │
      │                                │                                │
```

### 8.2 JWT Token Structure

```json
{
  "sub": "user-uuid",
  "wallet": "0x...",
  "role": "organizer",
  "iat": 1234567890,
  "exp": 1234571490
}
```

### 8.3 Token Refresh Flow

Both web and mobile clients implement an automatic token refresh mechanism:
1. Axios response interceptor catches 401 errors
2. If not already refreshing, calls `POST /auth/refresh` with the stored refresh token
3. Queues any concurrent requests that fail with 401
4. On successful refresh, replays all queued requests with the new access token
5. On refresh failure, logs out the user

### 8.4 Role Hierarchy & Permissions

| Role | Web Access | Mobile Access | API Access |
|------|-----------|---------------|------------|
| `attendee` | Events, Tickets, Profile, Marketplace, Transfer | Events tab, Tickets tab, Profile, Marketplace screens | Read events, mint, own tickets, marketplace |
| `volunteer` | Same as attendee | Same as attendee + **Scanner tab** (QR scanning) | Same as attendee + check-in scan/confirm/sync |
| `organizer` | Same as attendee + **Organizer Dashboard**, Create Event, Manage Events, Volunteers | Same as attendee | Same as attendee + CRUD events, deploy contracts, manage tiers, upload banners, IPFS metadata |
| `admin` | Same as organizer + **Admin Dashboard**, User Management, Request Review | Same as attendee | Full access: manage users, review requests, dashboard stats, audit logs, delete events/users |
| `super_admin` | Same as admin | Same as admin | Same as admin (reserved for future elevated permissions) |

---

## 9. Core Workflows

### 9.1 User Registration & Profile Setup

```
1. User opens app (web or mobile)
2. Clicks "Connect Wallet" → Thirdweb modal appears
3. Chooses wallet method (MetaMask, email, Google, Apple, Coinbase, Rainbow)
4. Wallet connects → SIWE auth flow executes automatically
5. Backend upserts user record in DB (wallet_address, role=attendee)
6. JWT tokens stored client-side
7. User can now update profile (display name, email, avatar)
8. Avatar upload goes to Supabase Storage → URL saved to user record
```

### 9.2 Organizer Application

```
1. Attendee navigates to /organizer (or organizer tab in mobile)
2. Sees organizer request form (if not already an organizer)
3. Fills in reason (10-1000 characters)
4. Submits POST /organizer-requests → creates pending request
5. Admin sees request in /admin/requests page
6. Admin reviews and approves/rejects
7. If approved: user's role changes to 'organizer'
8. User now sees organizer dashboard and can create events
9. Audit log records: organizer_request_submitted + organizer_request_approved
```

### 9.3 Event Creation & Contract Deployment

```
Step 1: Create Event (Off-chain)
┌─────────────────────────────────────────────────────────────┐
│ 1. Organizer fills event form:                              │
│    - Title, Description, Venue                              │
│    - Start/End date-time                                    │
│    - Banner image (uploaded to Supabase Storage)            │
│    - Up to 5 ticket tiers:                                  │
│      - Name (e.g., "VIP", "General Admission")             │
│      - Price in POL (e.g., 0.01)                            │
│      - Max supply (e.g., 100)                               │
│      - Per-wallet limit (default 5)                         │
│                                                             │
│ 2. POST /events → creates event record (status: draft)      │
│ 3. POST /events/:id/tiers/batch → creates tier records      │
│    (price stored as wei string via parseEther conversion)   │
└─────────────────────────────────────────────────────────────┘

Step 2: Deploy Contract (On-chain)
┌─────────────────────────────────────────────────────────────┐
│ 1. Organizer clicks "Deploy Contract"                       │
│ 2. Frontend calls POST /blockchain/deploy                   │
│    { eventId, tiers: [...] }                                │
│                                                             │
│ 3. Backend (using DEPLOYER_PRIVATE_KEY):                    │
│    a. Calls factory.createEvent(name, symbol, org, startTime)│
│    b. Parses EventCreated log → gets clone address           │
│    c. For each tier: calls clone.addTier(...)               │
│    d. Updates event record:                                  │
│       - contract_address = clone address                     │
│       - tx_hash = deployment tx                              │
│       - status = 'published'                                 │
│                                                             │
│ 4. Returns { contractAddress, txHash, tiersAdded }          │
└─────────────────────────────────────────────────────────────┘

Step 3: Event is Live
┌─────────────────────────────────────────────────────────────┐
│ Event now appears in public listings                         │
│ Tickets can be minted by attendees                           │
│ Organizer can manage from /organizer/[id]                   │
└─────────────────────────────────────────────────────────────┘
```

### 9.4 Ticket Minting (Purchase)

```
┌──────────┐              ┌──────────┐              ┌──────────┐
│  Attendee │              │  On-Chain │              │  Backend  │
│ (Client)  │              │ (Polygon) │              │ (NestJS)  │
└─────┬─────┘              └─────┬─────┘              └─────┬────┘
      │                          │                          │
      │ 1. Select tier + qty     │                          │
      │ 2. prepareContractCall   │                          │
      │    mint(tierIndex, [])   │                          │
      │    value: price * qty    │                          │
      │                          │                          │
      │ 3. Wallet popup: sign TX │                          │
      │──────────────────────►  │                          │
      │                          │                          │
      │ 4. TX confirmed on-chain │                          │
      │◄──────────────────────  │                          │
      │                          │                          │
      │ 5. Parse Transfer event  │                          │
      │    → extract tokenId     │                          │
      │                          │                          │
      │ 6. POST /tickets/record-mint                        │
      │    { eventId, tierId,    │                          │
      │      tokenId, txHash,    │                          │
      │      ownerWallet }       │                          │
      │──────────────────────────────────────────────────► │
      │                          │                          │
      │                          │    7. Save ticket record │
      │                          │    8. Audit log: ticket_minted
      │                          │                          │
      │ 9. Success! Confetti!    │                          │
      │                          │                          │

TransactionTracker Steps (shown to user):
  ① Preparing transaction...
  ② Awaiting wallet signature...
  ③ Broadcasting to network...
  ④ Confirming on blockchain...
  ⑤ ✅ Success! Ticket minted
```

### 9.5 Check-in Flow (2-Step QR with Mutual Confirmation)

```
┌──────────┐        ┌──────────┐        ┌──────────┐        ┌──────────┐
│ Attendee  │        │ Volunteer │        │  Backend  │        │ WebSocket │
│ (Mobile)  │        │ (Scanner) │        │ (NestJS)  │        │ Gateway   │
└─────┬─────┘        └─────┬─────┘        └─────┬─────┘        └─────┬────┘
      │                     │                     │                     │
      │ 1. Open ticket →    │                     │                     │
      │    request QR code  │                     │                     │
      │─────────────────────────────────────────►│                     │
      │                     │                     │                     │
      │ 2. Returns HMAC-    │                     │                     │
      │    signed payload:  │                     │                     │
      │    {ticketId, eventId,                    │                     │
      │     timestamp, hmac} │                    │                     │
      │    (30s expiry)     │                     │                     │
      │◄─────────────────────────────────────────│                     │
      │                     │                     │                     │
      │ 3. Display QR code  │                     │                     │
      │    (auto-refresh    │                     │                     │
      │     every 25s)      │                     │                     │
      │                     │                     │                     │
      │    ╔═══════════╗    │                     │                     │
      │    ║ ▓▓▓ QR ▓▓▓║◄───── 4. Volunteer      │                     │
      │    ║ ▓▓▓    ▓▓▓║      scans QR code      │                     │
      │    ╚═══════════╝    │                     │                     │
      │                     │                     │                     │
      │                     │ 5. POST /checkin/scan                    │
      │                     │──────────────────►│                     │
      │                     │                     │                     │
      │                     │                     │ 6. Validate:       │
      │                     │                     │    - HMAC signature │
      │                     │                     │    - 30s expiry     │
      │                     │                     │    - Ticket exists  │
      │                     │                     │    - Not checked in │
      │                     │                     │    - Correct event  │
      │                     │                     │                     │
      │                     │                     │ 7. Create log:      │
      │                     │                     │    pending_confirmation
      │                     │                     │                     │
      │                     │                     │ 8. Emit WS event ──►│
      │                     │                     │                     │
      │ 9. Push notification │                    │                     │
      │    + WS event       │◄─────────────────────────────────────────│
      │    "Confirm your    │                     │                     │
      │     check-in?"      │                     │                     │
      │                     │                     │                     │
      │ 10. Attendee taps   │                     │                     │
      │     "Confirm"       │                     │                     │
      │─────────────────────────────────────────►│                     │
      │  POST /checkin/confirm                    │                     │
      │  { checkinLogId }   │                     │                     │
      │                     │                     │                     │
      │                     │                     │ 11. Update ticket:  │
      │                     │                     │     status=checked_in│
      │                     │                     │     Log: success    │
      │                     │                     │                     │
      │                     │                     │ 12. Emit WS ──────►│
      │                     │ 13. WS: confirmed  │                     │
      │                     │◄─────────────────────────────────────────│
      │                     │                     │                     │
      │ ✅ Entry granted    │ ✅ Green flash      │                     │
      │                     │                     │                     │

Timeout: 2 minutes for attendee to confirm. Volunteer polls every 3s.
On timeout: result = failed_confirmation_timeout.

Offline Mode:
  - Volunteer queues scans locally (max 200, 24h TTL)
  - Auto-syncs via POST /checkin/sync-offline on reconnect
  - Can pre-download ownership snapshots for events
```

### 9.6 Ticket Transfer

```
1. Ticket owner navigates to /tickets/[id]/transfer (web) or /transfer/[id] (mobile)
2. Enters recipient wallet address
3. Client validates: valid Ethereum address + not self-transfer
4. Shows warning: "This action is irreversible"
5. User confirms → wallet signs safeTransferFrom transaction
6. TransactionTracker shows 5-step progress
7. On success: calls PATCH /tickets/:id/transfer { newOwnerWallet, txHash }
8. Backend updates: owner_wallet, transfer_count++, status
9. Audit log: ticket_transferred
```

### 9.7 Marketplace (Secondary Resale)

#### Listing a Ticket
```
1. Seller navigates to marketplace create page
2. Selects a ticket (must be: minted, resale_allowed, not already listed)
3. Sets price in POL
4. Client calls listTicket() on TickETHMarketplace contract
   - Contract validates: allowed event, price within deviation bounds, resale count < max
   - NFT is escrowed (transferred to marketplace contract)
5. POST /marketplace/listings { ticketId, price, txHash }
6. Backend creates listing record
7. Ticket status updated to 'listed'
8. Listing appears in marketplace
```

#### Buying a Listed Ticket
```
1. Buyer browses marketplace listings
2. Selects a listing → views details (event, tier, price, seller)
3. Clicks "Buy" → confirms in wallet
4. Client calls buyTicket(listingId) on marketplace contract
   - msg.value must equal listing price
   - Payment split: 2.5% → platform treasury, 97.5% → seller
   - NFT transferred from marketplace → buyer
   - Resale count incremented
5. POST /marketplace/listings/:id/complete-sale { txHash, buyerWallet }
6. Backend updates: listing status=sold, ticket owner, resale_history record
7. ChainListenerService also catches TicketSold event independently
```

### 9.8 Admin Operations

```
Dashboard (/admin):
  - View system-wide stats: total users, events, tickets, pending requests

User Management (/admin/users):
  - Search users by name/wallet/email
  - Filter by role
  - Change user roles (attendee ↔ organizer ↔ volunteer ↔ admin)
  - Deactivate users

Request Review (/admin/requests):
  - Filter by status (pending/approved/rejected)
  - View request reason + wallet
  - Approve → changes user role to organizer
  - Reject → with optional rejection reason

Audit Logs (/audit):
  - View all system actions
  - Filter by action type, actor, target
  - Paginated results
  - Immutable records
```

### 9.9 IPFS Metadata Upload

```
1. Organizer calls POST /ipfs/upload-metadata
   { name, description, image, attributes }
2. Backend constructs JSON metadata object
3. Uploads to Pinata (IPFS pinning service)
4. Returns { ipfsHash, ipfsUrl (ipfs://...), gatewayUrl (https://gateway.pinata.cloud/...) }
5. URL can be set as event's metadata_uri or token base URI
```

### 9.10 Volunteer Management

```
1. Organizer navigates to /organizer/volunteers
2. Enters wallet address of person to promote
3. POST /users/volunteers/promote { walletAddress }
4. Backend changes user role from attendee to volunteer
5. Volunteer now sees Scanner tab in mobile app
6. Can scan QR codes at events
7. Organizer can revoke: POST /users/volunteers/revoke { walletAddress }
```

### 9.11 Image Upload Flow

```
Avatar Upload:
  1. User clicks avatar area (web: ImageUpload component, mobile: ImagePicker)
  2. Selects image (max 5MB, JPEG/PNG/WebP/GIF)
  3. POST /uploads/avatar (multipart/form-data, JWT auth)
  4. Backend: uploads to Supabase Storage bucket "images/avatars/{userId}-{timestamp}.ext"
  5. Returns public URL
  6. Client updates profile with new avatarUrl

Banner Upload:
  1. Organizer uses ImageUpload component on create event page
  2. Selects banner image
  3. POST /uploads/banner (multipart/form-data, JWT auth, organizer role)
  4. Backend: uploads to Supabase Storage bucket "images/banners/{userId}-{timestamp}.ext"
  5. Returns public URL
  6. Saved as event's banner_url
```

### 9.12 Chain Listener (Background Service)

```
The ChainListenerService runs as a background process in the backend:

1. Polls blockchain every 15 seconds (configurable)
2. Scans from CHAIN_LISTENER_START_BLOCK forward
3. Watches for on-chain events:
   - Transfer (ERC-721)     → updates ticket ownership
   - TicketListed           → creates/updates marketplace listing
   - TicketSold             → completes sale, updates ownership
   - ListingCancelled       → marks listing as cancelled
4. Updates database accordingly (redundant safety net alongside client-reported actions)
5. Can be enabled/disabled via CHAIN_LISTENER_ENABLED env var
```

---

## 10. Environment & Configuration

### 10.1 Backend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS) | `eyJ...` |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret | `your-jwt-secret` |
| `POLYGON_AMOY_RPC_URL` | Polygon Amoy RPC endpoint | `https://rpc-amoy.polygon.technology` |
| `POLYGON_MAINNET_RPC_URL` | Polygon mainnet RPC (future) | `https://polygon-rpc.com` |
| `CHAIN_ID` | Target blockchain chain ID | `80002` |
| `FACTORY_ADDRESS` | Deployed TickETHFactory address | `0x8E02...` |
| `PLATFORM_TREASURY` | Treasury wallet address | `0x...` |
| `DEPLOYER_PRIVATE_KEY` | Server-side deployer wallet private key | `0xabc...` |
| `REDIS_HOST` | Redis host for BullMQ | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | `password` |
| `JWT_SECRET` | JWT signing secret | `your-secret` |
| `JWT_EXPIRATION` | JWT access token expiry | `1h` |
| `PORT` | Backend server port | `3001` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000` |
| `PINATA_JWT` | Pinata IPFS JWT | `eyJ...` |
| `PINATA_API_KEY` | Pinata API key | `abc123` |
| `PINATA_API_SECRET` | Pinata API secret | `xyz789` |
| `PINATA_GATEWAY` | Pinata gateway URL | `https://gateway.pinata.cloud` |
| `CHAIN_LISTENER_ENABLED` | Enable/disable chain listener | `true` |
| `CHAIN_LISTENER_START_BLOCK` | Block number to start listening from | `12345678` |
| `CHECKIN_HMAC_SECRET` | Secret for QR code HMAC signing | `hmac-secret` |

### 10.2 Contracts Environment Variables

| Variable | Description |
|----------|-------------|
| `AMOY_RPC_URL` | Polygon Amoy RPC URL |
| `POLYGON_RPC_URL` | Polygon mainnet RPC URL |
| `DEPLOYER_PRIVATE_KEY` | Deployment wallet private key |
| `POLYGONSCAN_API_KEY` | Polygonscan API key for contract verification |
| `THIRDWEB_SECRET_KEY` | Thirdweb secret key |
| `REPORT_GAS` | Enable gas reporting in tests |

### 10.3 Frontend Constants

| Constant | Description |
|----------|-------------|
| `THIRDWEB_CLIENT_ID` | Thirdweb project client ID |
| `API_BASE_URL` | Backend API URL (default: `http://localhost:3001/api/v1`) |
| `FACTORY_ADDRESS` | TickETHFactory contract address |
| `MARKETPLACE_ADDRESS` | TickETHMarketplace contract address |
| `BLOCK_EXPLORER` | Polygonscan URL for Amoy |
| `SIWE_DOMAIN` | Domain for SIWE messages |

### 10.4 Mobile Constants

| Constant | Description | Value |
|----------|-------------|-------|
| `API_BASE_URL` | Backend API URL | `http://192.168.0.234:3001/api/v1` (dev) |
| `FACTORY_ADDRESS` | Factory contract | Same as deployed |
| `MARKETPLACE_ADDRESS` | Marketplace contract | Same as deployed |
| `QR_REFRESH_INTERVAL` | QR auto-refresh interval | 25 seconds |
| `OFFLINE_CACHE_TTL` | Offline data TTL | 24 hours |
| `MAX_OFFLINE_QUEUE` | Max queued offline scans | 200 |

---

## 11. Testing

### 11.1 Smart Contract Tests

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `TickETHFactory.test.ts` | ~50 tests | Deployment, event creation (regular + deterministic), implementation update, platform fee/treasury, access control, edge cases |
| `TickETHTicket.test.ts` | ~70 tests | Initialization, tier management, minting (price, supply, wallet limits, merkle proof, time windows), check-in (single + batch), transfers, metadata locking, withdraw (fee split), pausable, edge cases |
| `TickETHMarketplace.test.ts` | ~47 tests | Listing, buying, cancelling, price deviation limits, resale count limits, admin cancel, allowed contracts whitelist, escrow, edge cases |
| **Total** | **167 tests** | **All passing** |

**Testing Framework:** Hardhat + Chai + ethers.js

**Run tests:**
```bash
cd contracts
npx hardhat test
```

### 11.2 Build Verification

Both backend and frontend compile with zero TypeScript errors:
```bash
cd backend && npx tsc --noEmit   # ✅ 0 errors
cd frontend && npx tsc --noEmit  # ✅ 0 errors
```

---

## 12. Requirements

### 12.1 System Requirements

| Requirement | Minimum |
|-------------|---------|
| Node.js | v18+ |
| npm / yarn | Latest |
| Redis | v6+ (for BullMQ queues) |
| Git | v2+ |

### 12.2 External Services Required

| Service | Purpose | Required For |
|---------|---------|-------------|
| **Supabase Project** | PostgreSQL database + Storage + Realtime | All data persistence, image storage |
| **Polygon Amoy RPC** | Blockchain interaction | Contract deployment, minting, transfers |
| **Thirdweb Account** | Wallet infrastructure | Frontend/mobile wallet connection |
| **Pinata Account** | IPFS pinning | NFT metadata storage |
| **Redis Instance** | Job queues | Background notification/analytics processing |
| **Funded Deployer Wallet** | Contract deployment | Server-side contract creation (needs MATIC/POL for gas) |

### 12.3 Development Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd TickETH

# 2. Smart Contracts
cd contracts
npm install
cp .env.example .env  # Fill in values
npx hardhat test       # Run 167 tests
npx hardhat run scripts/deploy.ts --network amoy  # Deploy

# 3. Database
# Apply migrations via Supabase Dashboard SQL Editor:
#   - database/migrations/001_initial_schema.sql
#   - database/migrations/002_marketplace.sql
# Optionally run dev seed:
#   - database/seeds/dev_seed.sql

# 4. Backend
cd backend
npm install
cp .env.example .env  # Fill in all values
npm run start:dev     # Starts on port 3001, Swagger at /docs

# 5. Frontend
cd frontend
npm install
# Set env vars in .env.local
npm run dev           # Starts on port 3000

# 6. Mobile
cd mobile
npm install
# Update config.ts with your local IP
npx expo start        # Starts Expo dev server
```

### 12.4 Wallet Requirements

- **Attendees:** Any Ethereum-compatible wallet (MetaMask, Coinbase, Rainbow) or email/social login via Thirdweb in-app wallet
- **Organizers:** Same as attendees (contract deployment is server-side, no gas needed from organizer)
- **Deployer Wallet:** Server-side wallet funded with testnet POL/MATIC for gas (only the backend needs this)

---

## 13. Sample End-to-End Scenario

> This scenario walks through the complete lifecycle of an event on TickETH — from user registration through ticket minting, check-in, resale, and fund withdrawal.

### Characters

| Character | Role | Wallet |
|-----------|------|--------|
| **Alice** | Event Organizer | 0xAlice... |
| **Bob** | Attendee (ticket buyer) | 0xBob... |
| **Carol** | Volunteer (door scanner) | 0xCarol... |
| **Dave** | Attendee (buys resale ticket) | 0xDave... |
| **Eve** | Platform Admin | 0xEve... |

---

### Phase 1: Registration & Setup

**Alice registers and becomes an organizer:**
1. Alice opens the TickETH web app at `https://ticketh.io`
2. She clicks "Connect Wallet" in the navbar → MetaMask popup appears
3. She connects her wallet `0xAlice...` → SIWE authentication executes automatically:
   - Frontend calls `POST /auth/nonce { walletAddress: "0xalice..." }`
   - Backend upserts Alice as a user (role: attendee), returns a nonce
   - Thirdweb builds SIWE message and prompts MetaMask to sign
   - Frontend sends `POST /auth/verify { message, signature }`
   - Backend verifies SIWE signature, issues JWT tokens
   - Alice is now logged in as **attendee**
4. She navigates to `/profile` → uploads a profile picture (Supabase Storage) and sets her display name to "Alice's Events"
5. She navigates to `/organizer` → sees the organizer request form
6. She submits: *"I run blockchain meetups in NYC with 200+ attendees monthly. I want to issue NFT tickets for my upcoming Ethereum Summit."*
7. `POST /organizer-requests { reason: "..." }` → request saved as `pending`

**Eve approves Alice's request:**
1. Eve (admin) opens `/admin/requests`
2. Sees Alice's pending request with her reason
3. Clicks "Approve" → `PATCH /organizer-requests/:id/review { status: "approved" }`
4. Alice's role is updated from `attendee` → `organizer`
5. Audit log records: `organizer_request_approved`

**Alice promotes Carol as a volunteer:**
1. Alice navigates to `/organizer/volunteers`
2. Enters Carol's wallet address `0xCarol...`
3. `POST /users/volunteers/promote { walletAddress: "0xcarol..." }`
4. Carol's role changes from `attendee` → `volunteer`
5. Carol now sees the **Scanner tab** in her mobile app

---

### Phase 2: Event Creation & Contract Deployment

**Alice creates "Ethereum Summit 2025":**
1. Alice navigates to `/organizer/create`
2. **Step 1 — Event Details:**
   - Title: "Ethereum Summit 2025"
   - Description: "The biggest Ethereum conference in NYC featuring..."
   - Venue: "Javits Center, NYC"
   - Date: March 15, 2025 at 9:00 AM
   - Banner: Uploads a 1920x600 event banner → `POST /uploads/banner` → Supabase Storage URL
   - **Tier 1 — General Admission:**
     - Price: 0.01 POL
     - Supply: 500
     - Max per wallet: 5
   - **Tier 2 — VIP Pass:**
     - Price: 0.05 POL
     - Supply: 50
     - Max per wallet: 2
   - **Tier 3 — Early Bird:**
     - Price: 0.005 POL
     - Supply: 100
     - Max per wallet: 3
3. Clicks "Create Event" → two API calls:
   - `POST /events { title, description, venue, startTime, bannerUrl }` → event created (status: `draft`)
   - `POST /events/:id/tiers/batch [{ name: "General", price: "10000000000000000", supply: 500, ... }, ...]` → 3 tiers created

4. **Step 2 — Deploy Contract:**
   - Clicks "Deploy to Blockchain"
   - `POST /blockchain/deploy { eventId: "xxx", tiers: [...] }`
   - **Backend executes (using DEPLOYER_PRIVATE_KEY):**
     - Connects to Polygon Amoy via RPC
     - Calls `TickETHFactory.createEvent("Ethereum Summit 2025", "ETHSMT", 0xAlice, 1710489600)`
     - Factory deploys EIP-1167 clone of TickETHTicket → new contract at `0xClone...`
     - Backend reads `EventCreated` event log → extracts `0xClone...`
     - For each tier: calls `clone.addTier(name, price, supply, ...)` with tier parameters
     - Updates DB: `event.contract_address = "0xClone..."`, `event.status = "published"`
   - Returns `{ contractAddress: "0xClone...", txHash: "0xabc...", tiersAdded: 3 }`
   - Frontend shows success with Polygonscan link

5. **Step 3 — Success!**
   - Event is now published and visible on `/events`
   - Anyone can browse and mint tickets

---

### Phase 3: Ticket Purchase

**Bob buys a VIP ticket:**
1. Bob opens the TickETH mobile app, connects MetaMask wallet `0xBob...`
2. SIWE auth flow → Bob is registered as `attendee`
3. He browses the Events tab → sees "Ethereum Summit 2025" with banner image
4. Taps the event → event detail screen loads:
   - Countdown: "12 days 5 hours until event"
   - 3 tiers displayed with progress bars (0/500, 0/50, 0/100)
   - He selects **VIP Pass** (0.05 POL)
   - Quantity: 1
   - Total: 0.05 POL

5. Taps "Mint Ticket" → **MintProgressOverlay** appears:
   - **① Preparing transaction...** — `prepareContractCall(mint, tierIndex=1, proof=[])` with `value: parseEther("0.05")`
   - **② Awaiting wallet signature...** — MetaMask popup shows: "Confirm transaction: 0.05 POL"
   - Bob confirms in MetaMask
   - **③ Broadcasting to network...** — TX sent to Polygon Amoy
   - **④ Confirming on blockchain...** — Waiting for block confirmation
   - **⑤ ✅ Success!** — Token minted! Confetti animation plays!

6. Mobile app calls `POST /tickets/record-mint`:
   ```json
   {
     "eventId": "event-uuid",
     "tierId": "vip-tier-uuid",
     "tokenId": 1,
     "txHash": "0xdef...",
     "ownerWallet": "0xbob..."
   }
   ```
7. Backend saves ticket record, audit log records `ticket_minted`
8. Bob now sees his VIP ticket in "My Tickets" tab with a QR code

---

### Phase 4: Marketplace Resale

**Bob lists his VIP ticket for resale:**
1. Bob's plans change — he can't attend
2. Opens Marketplace → Create Listing
3. Selects his VIP Pass ticket
4. Sets price: 0.06 POL (20% markup, within 30% max deviation)
5. Wallet signs `listTicket(0xClone, tokenId=1, price=60000000000000000)` on the marketplace contract
6. Marketplace contract:
   - Checks: event contract is whitelisted, price within deviation bounds (0.05 ± 30%), resale count (0) < max (3)
   - NFT transferred from Bob to marketplace contract (escrow)
7. `POST /marketplace/listings { ticketId, price: "60000000000000000", txHash }`
8. Listing appears in marketplace with event details

**Dave buys the resale ticket:**
1. Dave browses the marketplace, sees Bob's VIP listing for 0.06 POL
2. Taps "Buy" → confirms in Alert
3. Wallet signs `buyTicket(listingId)` with `msg.value = 0.06 POL`
4. Marketplace contract:
   - 2.5% fee (0.0015 POL) → platform treasury
   - 97.5% (0.0585 POL) → Bob
   - NFT transferred: marketplace → Dave
   - Calls `clone.incrementResaleCount(tokenId=1)` → resale count = 1
5. `POST /marketplace/listings/:id/complete-sale { txHash, buyerWallet: "0xdave..." }`
6. Backend updates: listing status=sold, ticket owner=Dave, resale_history record created
7. Dave now owns the VIP Pass in his wallet

---

### Phase 5: Event Day — Check-In

**Dave arrives at Javits Center:**
1. Dave opens the TickETH mobile app → My Tickets → taps his VIP Pass
2. Ticket detail screen shows a **QR Code** (auto-refreshing every 25 seconds)
   - QR payload: `{ ticketId, eventId, timestamp, hmac }` — HMAC-signed with 30-second expiry

**Carol scans Dave's ticket:**
3. Carol (volunteer) opens her mobile app → Scanner tab
4. Points camera at Dave's QR code → phone vibrates, green flash
5. QR data sent to `POST /checkin/scan`:
   - Backend validates HMAC signature ✅
   - Checks timestamp: within 30-second window ✅
   - Checks ticket exists and belongs to Dave ✅
   - Checks not already checked in ✅
   - Creates checkin log: `pending_confirmation`
6. WebSocket event emitted to Dave's device

**Dave confirms check-in:**
7. Dave receives a push notification: "Confirm your check-in at Ethereum Summit 2025"
8. Taps notification → `checkin-confirm` screen opens
9. Sees: 2-minute countdown timer, ticket info card, "Confirm" button
10. Taps "Confirm" → `POST /checkin/confirm { checkinLogId }`
11. Backend:
    - Updates checkin log: result = `success`, confirmed_at = now
    - Updates ticket: status = `checked_in`, checked_in_at = now
    - Emits WebSocket to Carol's device
12. Carol's scanner shows ✅ green checkmark: "Dave — VIP Pass — Verified"
13. Dave sees confetti animation: "Welcome to Ethereum Summit 2025!"
14. Dave enters the venue 🎉

**Offline scenario (backup):**
- If Carol's phone loses connectivity:
  - Scans are queued locally (max 200, AsyncStorage)
  - Offline sync bar shows: "3 pending scans"
  - When connection restores: auto-syncs via `POST /checkin/sync-offline`
  - Can pre-download ownership snapshots via "Prepare Offline Data" button

---

### Phase 6: Post-Event

**Alice withdraws funds:**
1. Alice calls `withdraw()` on the event contract `0xClone...`
2. Contract splits accumulated MATIC:
   - 2.5% (platform fee) → platform treasury
   - 97.5% → Alice's wallet
3. Emits `FundsWithdrawn(alice, orgAmount, treasury, platformAmount)`

**Alice views event stats:**
1. Alice navigates to `/organizer/[id]` (manage event page)
2. Sees stats:
   - Total capacity: 650
   - Tickets minted: 247
   - Checked in: 198
   - Revenue: 8.45 POL
3. Tier breakdown:
   - General: 160/500 minted
   - VIP: 48/50 minted
   - Early Bird: 39/100 minted

**Eve reviews platform health:**
1. Eve navigates to `/admin`
2. Dashboard shows:
   - Total Users: 1,247
   - Total Events: 23
   - Total Tickets: 3,891
   - Pending Requests: 5
3. Reviews audit logs for compliance
4. All actions are immutable and traceable

---

### Summary of On-Chain vs Off-Chain Actions

| Action | On-Chain | Off-Chain |
|--------|----------|-----------|
| Contract deployment | ✅ Factory.createEvent() | ✅ DB: event record + tiers |
| Tier creation | ✅ Clone.addTier() | ✅ DB: tier records |
| Ticket minting | ✅ Clone.mint() (user wallet) | ✅ DB: ticket record |
| Check-in | ✅ Clone.checkIn() (optional) | ✅ DB: checkin log + ticket status |
| Transfer | ✅ Clone.safeTransferFrom() | ✅ DB: owner update |
| Marketplace list | ✅ Marketplace.listTicket() (escrow) | ✅ DB: listing record |
| Marketplace buy | ✅ Marketplace.buyTicket() (payment) | ✅ DB: sale + history |
| Fund withdrawal | ✅ Clone.withdraw() | — |
| User profile | — | ✅ DB: user record |
| Image upload | — | ✅ Supabase Storage |
| IPFS metadata | — | ✅ Pinata upload |
| Audit logging | — | ✅ DB: immutable logs |

---

## File Structure Reference

```
TickETH/
├── contracts/                          # Smart Contracts (Solidity + Hardhat)
│   ├── contracts/
│   │   ├── TickETHFactory.sol          # Factory — deploys event clones
│   │   ├── TickETHTicket.sol           # Event NFT — ERC-721 per event
│   │   └── TickETHMarketplace.sol      # Escrow marketplace for resale
│   ├── scripts/
│   │   └── deploy.ts                   # Deployment script
│   ├── test/
│   │   ├── TickETHFactory.test.ts      # Factory tests (~50)
│   │   ├── TickETHTicket.test.ts       # Ticket tests (~70)
│   │   └── TickETHMarketplace.test.ts  # Marketplace tests (~47)
│   ├── hardhat.config.ts               # Network + compiler config
│   └── package.json
│
├── database/                           # Supabase PostgreSQL
│   ├── migrations/
│   │   ├── 001_initial_schema.sql      # Core schema (9 tables, enums, RLS)
│   │   └── 002_marketplace.sql         # Marketplace additions
│   └── seeds/
│       └── dev_seed.sql                # Development seed data
│
├── backend/                            # NestJS API Server
│   └── src/
│       ├── main.ts                     # Bootstrap (port, CORS, Swagger)
│       ├── app.module.ts               # Root module (15 submodules)
│       ├── common/                     # Shared code
│       │   ├── enums/                  # UserRole, EventStatus, etc.
│       │   ├── decorators/             # @CurrentUser, @Roles, @Public
│       │   ├── guards/                 # AuthGuard, RolesGuard
│       │   └── interfaces/            # Common interfaces
│       ├── supabase/                   # @Global SupabaseModule
│       ├── auth/                       # SIWE + JWT auth
│       ├── users/                      # User CRUD + volunteers
│       ├── organizer-requests/         # Organizer applications
│       ├── events/                     # Event CRUD + publish/cancel
│       ├── ticket-tiers/               # Tier management
│       ├── tickets/                    # Ticket records + transfer
│       ├── checkin/                    # QR + WebSocket check-in
│       ├── audit/                      # Immutable audit trail
│       ├── admin/                      # Dashboard + user management
│       ├── blockchain/                 # Deploy + chain listener
│       ├── marketplace/                # Listings CRUD + resale history
│       ├── ipfs/                       # Pinata metadata upload
│       ├── queues/                     # BullMQ notification/analytics
│       └── uploads/                    # Supabase Storage uploads
│
├── frontend/                           # Next.js Web App
│   └── src/
│       ├── app/                        # App Router pages
│       │   ├── page.tsx                # Landing page
│       │   ├── layout.tsx              # Root layout (fonts, meta, providers)
│       │   ├── providers.tsx           # Thirdweb + React Query + ErrorBoundary
│       │   ├── events/                 # /events + /events/[id]
│       │   ├── tickets/                # /tickets + /tickets/[id]/transfer
│       │   ├── profile/                # /profile
│       │   ├── marketplace/            # /marketplace
│       │   ├── organizer/              # /organizer + create + [id] + volunteers
│       │   └── admin/                  # /admin + users + requests
│       ├── components/                 # 12 reusable components
│       │   ├── Navbar.tsx              # Header + wallet connect
│       │   ├── Footer.tsx              # 4-column footer
│       │   ├── Button.tsx              # 6 variants, 4 sizes
│       │   ├── Modal.tsx               # Portal + AnimatePresence
│       │   ├── TransactionTracker.tsx  # 5-step TX progress
│       │   ├── ImageUpload.tsx         # Drag-and-drop upload
│       │   ├── Input.tsx               # Input + Textarea
│       │   ├── Badge.tsx               # Status badges
│       │   ├── StatCard.tsx            # Dashboard stat cards
│       │   ├── Skeleton.tsx            # Loading skeletons
│       │   ├── EmptyState.tsx          # Empty state display
│       │   └── ErrorBoundary.tsx       # Error catch + retry
│       └── lib/                        # 10 library files
│           ├── constants.ts            # App constants
│           ├── api-client.ts           # Axios with auto-refresh
│           ├── api.ts                  # 12 API objects
│           ├── types.ts                # TypeScript interfaces
│           ├── store.ts                # Zustand auth store
│           ├── hooks.ts                # 8 custom hooks
│           ├── utils.ts                # Formatting utilities
│           ├── error-parser.ts         # Error message mapping
│           ├── siwe.ts                 # SIWE message builder
│           └── cn.ts                   # Class name utility
│
├── mobile/                             # React Native (Expo) App
│   ├── app/                            # File-based routes (13 screens)
│   │   ├── index.tsx                   # Root redirect
│   │   ├── auth.tsx                    # Auth screen
│   │   ├── (tabs)/                     # Tab navigator
│   │   │   ├── events.tsx              # Events list
│   │   │   ├── tickets.tsx             # My tickets
│   │   │   ├── scanner.tsx             # QR scanner (volunteer)
│   │   │   └── profile.tsx             # Profile
│   │   ├── event/[id].tsx              # Event details + mint
│   │   ├── ticket/[id].tsx             # Ticket details + QR
│   │   ├── transfer/[id].tsx           # Transfer flow
│   │   ├── edit-profile.tsx            # Edit profile + avatar
│   │   ├── checkin-confirm.tsx         # Check-in confirmation
│   │   └── marketplace/               # Marketplace screens
│   │       ├── index.tsx               # Browse listings
│   │       ├── create.tsx              # Create listing
│   │       └── [id].tsx                # Listing details + buy
│   └── src/
│       ├── api/                        # 7 API files
│       ├── components/                 # 16 components
│       ├── constants/                  # Config + theme
│       ├── hooks/                      # 6 custom hooks
│       ├── providers/                  # Auth + Wallet providers
│       ├── services/                   # 7 service files
│       ├── stores/                     # 3 Zustand stores
│       └── utils/                      # Formatting utilities
│
└── SYSTEM_OVERVIEW.md                  # ← You are here
```

---

*Document generated for TickETH v1.0 — Blockchain NFT Ticketing Platform*
*Smart Contracts: 167 tests passing | Backend: 60+ endpoints | Frontend: 14 pages | Mobile: 13 screens*
