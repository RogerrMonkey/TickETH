# TickETH Mobile App — Product Requirements Document

**Version:** 1.0.0
**Platform:** iOS & Android (React Native / Expo)
**Last Updated:** February 24, 2026

---

## 1. Product Overview

### 1.1 Purpose

TickETH is a blockchain-based NFT ticketing mobile application that enables secure, transparent, and fraud-resistant event ticket issuance, ownership, and verification on the Polygon network. The app serves two primary user roles — **Attendees** (who purchase and hold NFT tickets) and **Volunteers/Staff** (who scan and verify tickets at event venues).

### 1.2 Core Value Proposition

- **Fraud elimination** — Every ticket is a unique ERC-721 NFT with on-chain provenance
- **Decentralised ownership** — Tickets live in the user's wallet, not a centralised database
- **Two-step check-in** — Volunteer scan + attendee wallet signature prevents impersonation
- **Offline resilience** — Event-day operations continue without internet connectivity
- **Controlled resale** — Organiser-configurable transfer and marketplace rules

### 1.3 Target Users

| Role | Description |
|------|-------------|
| **Visitor** | Unauthenticated user; can browse events |
| **Attendee** | Wallet-connected user who buys/holds tickets |
| **Volunteer** | Event staff who scan QR codes at entry gates |
| **Organiser** | Event creator who deploys contracts and manages tiers |
| **Admin** | Platform administrator with full governance access |

---

## 2. Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native 0.81.5 via Expo SDK 54 |
| Language | TypeScript (strict mode) |
| Navigation | expo-router v6 (file-based routing) |
| Wallet SDK | thirdweb v5 (`ConnectButton`, `useActiveAccount`) |
| Blockchain | Polygon Amoy Testnet (Chain ID 80002) |
| Smart Contracts | ERC-721 Factory pattern (TickETHFactory + TickETHTicket) |
| State Management | Zustand v5 (3 stores: auth, wallet, offline) |
| HTTP Client | Axios with JWT interceptors and token refresh |
| Secure Storage | expo-secure-store (JWT tokens) |
| Async Storage | @react-native-async-storage (offline data, preferences) |
| Push Notifications | expo-notifications (Expo Push Token → backend) |
| Camera | expo-camera (CameraView for QR scanning) |
| Haptics | expo-haptics (scan feedback) |
| Image Loading | expo-image (optimised banner loading) |
| QR Generation | react-native-qrcode-svg |
| Date Formatting | date-fns |
| Crypto | react-native-get-random-values + custom crypto-shim.js |

### 2.1 Deployed Contract Addresses (Polygon Amoy)

| Contract | Address |
|----------|---------|
| Factory | `0x8E0237fed96693c36c5A5021A6893b7B9F3494B2` |
| Marketplace | `0x828bE7efB199b867684bE502A8e93F817697a543` |
| Implementation | `0x164d162Da6edF739A0bCd610FBd5d808c165870e` |

---

## 3. App Architecture

### 3.1 Entry Point & Crypto Polyfill

The app uses a custom `index.js` entry point that:

1. Loads `react-native-get-random-values` **before any other module** to guarantee `globalThis.crypto.getRandomValues` exists
2. Polyfills `crypto.randomUUID` if missing (RFC 4122 v4 fallback)
3. Boots `expo-router/entry` after polyfills are in place

A custom `metro.config.js` redirects `require('crypto')` to `crypto-shim.js`, which provides Node-compatible `webcrypto`, `subtle`, `randomBytes`, and `randomUUID` exports for libraries that import the Node `crypto` module.

### 3.2 Provider Hierarchy

```
GestureHandlerRootView
  └─ SafeAreaProvider
       └─ ThirdwebProvider
            └─ AuthProvider
                 └─ WalletProvider
                      └─ expo-router <Stack>
```

### 3.3 State Stores (Zustand)

| Store | Purpose | Persistence |
|-------|---------|-------------|
| `authStore` | User object, JWT hydration, login/logout | SecureStore (tokens) |
| `walletStore` | Wallet address, chain ID, connecting state, app mode | In-memory + AsyncStorage (mode) |
| `offlineStore` | Online status, pending scan queue, ownership snapshots | AsyncStorage |

### 3.4 API Client

- Base URL: `http://192.168.0.234:3001/api/v1` (dev) / `https://api.ticketh.io/api/v1` (prod)
- JWT bearer token auto-attached via Axios request interceptor
- 401 responses trigger automatic token refresh with queue for pending requests
- Refresh failures clear tokens and force re-authentication

---

## 4. Authentication & Wallet Connection

### 4.1 Wallet Options

The auth screen offers four wallet connection methods via thirdweb's `ConnectButton`:

| Wallet | Type | Auth Methods |
|--------|------|-------------|
| **In-App Wallet** | Embedded | Email, Google, Apple, Phone |
| **MetaMask** | External | Browser extension / mobile deep-link |
| **Coinbase Wallet** | External | Mobile deep-link |
| **Rainbow** | External | Mobile deep-link |

### 4.2 SIWE Authentication Flow

```
1. User connects wallet via ConnectButton
2. WalletProvider detects new activeAccount
3. GET /auth/nonce?address={address} → receives nonce
4. Build EIP-4361 SIWE message (domain: ticketh.io)
5. Sign message via thirdweb signMessage()
6. POST /auth/verify { message, signature } → JWT tokens + User
7. Tokens stored in SecureStore
8. User object stored in authStore
9. Navigate to /(tabs)/events
```

### 4.3 Session Management

- Access token + refresh token stored in `expo-secure-store`
- On app launch, `authStore.hydrate()` checks for existing token and calls `GET /auth/me`
- If token is expired, the Axios interceptor silently refreshes via `POST /auth/refresh`
- On disconnect, both tokens are deleted and the user is redirected to `/auth`

---

## 5. Navigation Structure

### 5.1 Route Map

```
/                           → Auth gate (redirects to /auth or /(tabs)/events)
/auth                       → Wallet connection screen
/(tabs)/
  ├── events                → Event discovery & search
  ├── tickets               → User's ticket collection
  ├── scanner               → QR scanner (volunteer/admin/organiser only)
  └── profile               → User profile & settings
/event/[id]                 → Event detail & mint flow
/ticket/[id]                → Ticket detail with QR code
/transfer/[id]              → Ticket transfer flow
/checkin-confirm            → Attendee check-in confirmation
```

### 5.2 Role-Based Tab Visibility

| Tab | Visitor | Attendee | Volunteer | Organiser | Admin |
|-----|---------|----------|-----------|-----------|-------|
| Events | ✅ | ✅ | ✅ | ✅ | ✅ |
| My Tickets | ✅ | ✅ | ✅ | ✅ | ✅ |
| Scanner | ❌ | ❌ | ✅ | ✅ | ✅ |
| Profile | ✅ | ✅ | ✅ | ✅ | ✅ |

The Scanner tab is hidden (via `href: null`) for users without volunteer/admin/organiser roles.

---

## 6. Screens & Features

### 6.1 Auth Screen (`/auth`)

**Purpose:** Wallet connection and onboarding.

**Features:**
- TickETH branding with logo, tagline, and feature highlights
- Three feature rows: Fraud-Proof Tickets, Instant Check-in, Safe Resale
- thirdweb `ConnectButton` with 4 wallet options
- "Polygon Amoy Testnet" network indicator with green dot
- Auto-redirect to events tab on successful auth
- Terms of Service disclaimer

---

### 6.2 Events Screen (`/(tabs)/events`)

**Purpose:** Discover and browse published events.

**Features:**
- **Time-based greeting** — "Good Morning / Afternoon / Evening"
- **Profile shortcut** — Avatar button navigates to profile tab
- **Search bar** — Real-time text filtering with clear button
- **Infinite scroll** — Paginated event list (20 per page) with pull-to-refresh
- **Empty state** — Friendly message when no events match search
- **Error state** — Retry button on API failure

**Event Card displays:**
- Event banner image (or placeholder icon)
- Status badge (Upcoming / Starting Soon / Live Now)
- Price tag overlay (lowest tier price, e.g. "From 0.01 POL")
- Event title
- Date and venue with icons
- Ticket sales progress bar
- Scarcity warning ("Only X left!") when <10 tickets remain

---

### 6.3 Event Detail Screen (`/event/[id]`)

**Purpose:** View event information and mint NFT tickets.

**Features:**
- Full-width banner image with back button overlay
- Status badges (Published / Live / Starting Soon / In Progress)
- Event title, date, venue, and contract address (tappable → Polygonscan)
- **About section** — Full event description
- **Interactive tier selection:**
  - Cards for each ticket tier (name, price, remaining supply, description)
  - Selection highlight with checkmark icon
  - Sold-out tiers are dimmed and non-selectable
  - Progress bar showing minting progress per tier
  - "Resale OK" badge on transferable tiers
- **Mint flow:**
  - Summary bar showing selected tier + price
  - "Mint NFT Ticket" button triggers confirmation dialog
  - On-chain transaction via thirdweb (`prepareContractCall` → `sendTransaction`)
  - Waits for ERC-721 Transfer event to extract `tokenId`
  - Records mint on backend via `POST /tickets/record-mint`
  - Success alert with option to view tickets
  - Error handling for rejection, insufficient funds, reverts, timeouts

---

### 6.4 My Tickets Screen (`/(tabs)/tickets`)

**Purpose:** View and manage owned NFT tickets.

**Features:**
- **Stats row** — Active count, checked-in count, total count with icons
- **Filter pills** — All / Active / Checked In / Listed / Transferred
- Pull-to-refresh
- Auth-aware data fetching (returns empty when not authenticated, handles 401 gracefully)
- Empty state with "Browse Events" action button

**Ticket Card displays:**
- Left accent bar (purple for active, grey for used)
- Event name and tier name
- Status badge (Active / Checked In / Transferred / Listed for Sale / Invalidated)
- Ticket-stub divider (dashed line with edge circles)
- Token ID, event date, and price
- Navigation arrow

---

### 6.5 Ticket Detail Screen (`/ticket/[id]`)

**Purpose:** View ticket details, display QR code, and manage ticket.

**Features:**
- Event title with status badge
- **Dynamic QR Code** (for active tickets):
  - Auto-refreshes every 25 seconds with fresh nonce from backend
  - Pulse animation when nonce is about to expire (<5s remaining)
  - Refresh overlay during regeneration
  - "Show this to the scanner" hint text
- **Checked-in indicator** — Green card with checkmark icon and timestamp
- **Ticket details card:**
  - Token ID, Tier, Price, Owner wallet, Contract address (tappable → Polygonscan)
  - Event date, venue, mint timestamp, transaction hash (tappable → Polygonscan)
- **Action buttons** (for active tickets):
  - Refresh QR
  - Transfer Ticket → navigates to `/transfer/[id]`
  - View on Explorer → opens Polygonscan

---

### 6.6 Ticket Transfer Screen (`/transfer/[id]`)

**Purpose:** Transfer NFT ticket ownership to another wallet.

**Features:**
- **Warning banner** — "Transfers are on-chain and irreversible"
- **Ticket summary card** — Event name, tier, token ID badge, original price, current owner
- **Recipient input:**
  - Full Ethereum address field with validation
  - Real-time error messages: "Invalid Ethereum address", "Cannot transfer to yourself"
  - Person icon prefix
- **Transfer summary preview** — Recipient (shortened), Token ID, Gas info
- **Transfer execution:**
  - Confirmation dialog with irreversibility warning
  - On-chain ERC-721 `transferFrom` via thirdweb
  - Waits for transaction receipt
  - Loading state with "Transferring..." button
- **Success screen** — Checkmark animation, recipient address, transaction hash, "Back to Tickets" button
- **Error handling** — Alert with user-friendly messages

---

### 6.7 Scanner Screen (`/(tabs)/scanner`)

**Purpose:** Volunteer-operated QR code scanning for event check-in.

**Features:**
- **Header** — Title, subtitle, Online/Offline badge (tappable for offline data prep)
- **Offline sync bar** — Shows count of queued scans with "Sync Now" button
- **Camera scanner:**
  - Full-screen camera view with scan overlay frame
  - Corner markers in primary colour
  - QR barcode type filter
  - Haptic feedback on successful scan
  - 2-second cooldown between scans
  - Camera permission request flow
- **Scan result display:**
  - **ENTRY GRANTED** — Green checkmark, success haptic
  - **AWAITING CONFIRMATION** — Yellow timer icon, countdown timer (2:00 → 0:00), "Waiting for attendee to confirm on their device" message, auto-polls backend every 3s
  - **TIMED OUT** — Warning icon when attendee didn't confirm within 2 minutes
  - **INVALID** — Red X icon, error haptic, specific messages (invalid ticket, already checked in, invalid nonce)
  - "Scan Another" button
- **Offline mode:**
  - Automatically queues scans when device is offline
  - Auto-syncs when connectivity returns
  - Pending scan count badge on Scanner tab
  - Manual "Sync Now" button
- **Prepare Offline Data:**
  - Downloads ownership snapshots for all published events
  - Stores tickets per event in AsyncStorage with TTL (24 hours)
  - Displays count of cached tickets and events

---

### 6.8 Check-in Confirmation Screen (`/checkin-confirm`)

**Purpose:** Attendee-side confirmation when a volunteer scans their ticket.

**Trigger:** Push notification tap with `type: checkin_request`

**Features:**
- Scan circle icon header
- "Confirm Your Entry" title and description
- **Ticket info card** — Event name, tier, token ID, venue
- **Confirm action:**
  - Signs a verification message with wallet: "Confirm check-in for TickETH" + checkinLogId + wallet address + timestamp
  - Calls `POST /checkin/confirm { checkinLogId, attendeeWallet }`
  - Loading state: "Signing..."
- **Deny action:**
  - Confirmation dialog to deny entry
  - Marks check-in as failed
- **Success state** — Full-screen green checkmark, "You're all set. Enjoy the event!"
- **Denied state** — Full-screen red X, "This check-in attempt has been rejected."
- Security note: "Your wallet signature verifies ticket ownership on-chain"

---

### 6.9 Profile Screen (`/(tabs)/profile`)

**Purpose:** View account information, wallet details, and app settings.

**Features:**
- **Avatar** — Address-derived colour (from first 6 hex chars), initials from address
- **Display name** — From backend user profile or "TickETH User" default
- **Role badge** — Colour-coded: Admin (red), Organiser (yellow), Volunteer (blue), Attendee (purple)
- **Wallet address** — Shortened with copy-to-clipboard (shows checkmark on copy)
- **Quick action buttons:**
  - Explorer — Opens wallet address on Polygonscan
  - Share — Native share sheet with wallet address
  - Copy — Copies full address to clipboard
- **Account Details card:**
  - User ID (truncated)
  - Role
  - Email (if provided)
  - Member Since date
- **Network card:**
  - Chain name (Polygon Amoy Testnet)
  - Chain ID (80002)
  - Currency (POL)
  - Factory contract address (shortened)
- **Settings menu:**
  - Notifications → Push notification status
  - Help & Support → External link
  - Terms of Service → External link
- **Disconnect Wallet** — Confirmation dialog, clears tokens + wallet state, redirects to auth
- **Version footer** — "TickETH v1.0.0 • Polygon Amoy Testnet"

---

## 7. API Layer

### 7.1 Endpoints Consumed

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/nonce?address={addr}` | Get SIWE nonce for wallet |
| POST | `/auth/verify` | Verify SIWE signature → JWT |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/me` | Get current user profile |

#### Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/events` | List published events (paginated, filterable) |
| GET | `/events/:id` | Get single event with tiers |
| GET | `/events/:id/stats` | Get event statistics |
| GET | `/events/organizer/mine` | Get organiser's own events |

#### Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tickets/mine` | Get current user's tickets |
| GET | `/tickets/:id` | Get single ticket with event/tier joins |
| GET | `/tickets/event/:eventId` | Get tickets for an event |
| POST | `/tickets/record-mint` | Record a completed mint |
| GET | `/events/:eventId/tiers` | Get ticket tiers |
| GET | `/events/:eventId/tiers/availability` | Get tier availability |

#### Check-in
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/checkin/qr/:ticketId` | Get fresh QR payload (nonce + HMAC) |
| POST | `/checkin/scan` | Volunteer scans QR → validates |
| POST | `/checkin/confirm` | Attendee confirms check-in |
| GET | `/checkin/status/:checkinLogId` | Poll check-in status |
| POST | `/checkin/offline-sync` | Batch sync offline scans |
| GET | `/checkin/event/:eventId/count` | Get check-in count |
| GET | `/checkin/event/:eventId/logs` | Get check-in logs |

#### Marketplace
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/marketplace/listings` | Get active listings |
| GET | `/marketplace/listings/:id` | Get single listing |
| GET | `/marketplace/my-listings` | Get user's listings |
| POST | `/marketplace/list` | Create a listing |
| POST | `/marketplace/complete-sale` | Record completed sale |
| POST | `/marketplace/cancel/:id` | Cancel a listing |
| GET | `/marketplace/history/:ticketId` | Get resale history |
| GET | `/marketplace/stats/:eventId` | Get marketplace stats |

#### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/push-token` | Register Expo push token |

---

## 8. Smart Contract Interactions

### 8.1 Minting (`mintTicket`)

```
Contract: Event-specific ERC-721 (deployed via Factory)
Method:   function mintTicket(uint256 tierId) payable
Value:    tier.price (wei)
Flow:     prepareContractCall → sendTransaction → waitForTransaction → parse Transfer log → extract tokenId
```

### 8.2 Transfer (`transferFrom`)

```
Contract: Event-specific ERC-721
Method:   function transferFrom(address from, address to, uint256 tokenId)
Value:    0
Flow:     prepareContractCall → sendTransaction → waitForTransaction
```

### 8.3 Error Handling

All contract interactions provide user-friendly error messages:
- "Transaction was rejected by the user."
- "Insufficient POL balance for this transaction."
- "Transaction reverted. The tier may be sold out or minting is paused."
- "Transaction timed out. It may still confirm — check your wallet."

---

## 9. QR Code System

### 9.1 QR Payload Structure

```json
{
  "ticketId": "uuid",
  "eventId": "uuid",
  "nonce": "random-string",
  "expiresAt": 1740000000000,
  "hmac": "hex-signature"
}
```

### 9.2 Security Properties

- **Time-bound** — Each QR payload expires (configurable, default ~30s window)
- **Nonce-based** — Single-use nonce prevents relay attacks
- **HMAC-signed** — Backend-generated HMAC prevents QR forgery
- **Auto-refresh** — Client refreshes every 25 seconds
- **Expiry animation** — QR pulses when <5 seconds from expiry

### 9.3 Two-Step Verification Flow

```
1. Attendee opens ticket detail → dynamic QR displayed
2. Volunteer scans QR with camera
3. Backend validates: nonce, HMAC, expiry, ticket ownership, not already checked in
4. If valid → status: pending_confirmation
5. Push notification sent to attendee's device
6. Attendee taps notification → /checkin-confirm screen
7. Attendee signs message with wallet → POST /checkin/confirm
8. Backend marks ticket as checked_in
9. Volunteer's scanning screen auto-updates via polling (every 3s)
10. "ENTRY GRANTED" displayed on volunteer's device
```

---

## 10. Push Notifications

### 10.1 Setup

- **Android:** Notification channel "Check-in Notifications" with high importance, vibration pattern, purple LED
- **iOS:** Background mode `remote-notification` configured in Info.plist
- **Token registration:** Expo push token sent to backend on every login via `POST /users/push-token`

### 10.2 Notification Types

| Type | Trigger | Action on Tap |
|------|---------|---------------|
| `checkin_request` | Volunteer scans attendee's ticket | Navigate to `/checkin-confirm` with checkinLogId and ticketId |

### 10.3 Handling

- Foreground notifications display alert with sound and badge
- Background/tap notifications route to appropriate screen via expo-router
- Local notifications available for offline check-in confirmations

---

## 11. Offline Capabilities

### 11.1 Network Monitoring

- `@react-native-community/netinfo` continuously monitors connectivity
- Online/Offline state stored in `offlineStore`
- UI badge on Scanner tab reflects current status

### 11.2 Offline Scan Queueing

- When offline, scans are queued in `offlineStore.pendingScans` (max 200)
- Each queued scan stores: ID, raw QR data, timestamp
- Persisted to AsyncStorage for crash resilience
- Badge on Scanner tab shows pending count

### 11.3 Background Sync

- Auto-syncs when device comes back online
- Manual "Sync Now" button available
- Batch uploads via `POST /checkin/offline-sync`
- Reports synced + failed counts

### 11.4 Ownership Snapshots

- Volunteers can pre-download ticket ownership data before going offline
- `downloadAllSnapshots()` fetches all tickets for all published events
- Cached in AsyncStorage with 24-hour TTL
- Enables basic offline ticket verification (ownership check without HMAC validation)

---

## 12. Security Measures

| Measure | Implementation |
|---------|---------------|
| **Authentication** | SIWE (Sign-In with Ethereum) — wallet signature, no passwords |
| **Token storage** | JWT tokens in `expo-secure-store` (Keychain/Keystore) |
| **Token refresh** | Automatic refresh on 401 with request queue |
| **QR anti-replay** | Single-use nonces + HMAC + expiry timestamps |
| **Two-step check-in** | Volunteer scan + attendee wallet signature |
| **Transfer safety** | Confirmation dialog + on-chain execution |
| **Address validation** | ethers.js `getAddress()` checksum validation |
| **Crypto polyfill** | `react-native-get-random-values` loaded before all modules |
| **Error isolation** | All API calls wrapped with try-catch, user-friendly messages |

---

## 13. Design System

### 13.1 Theme

| Token | Value |
|-------|-------|
| Background | `#0D0D0D` (near-black) |
| Surface | `#1A1A2E` (dark navy) |
| Primary | `#6C63FF` (vibrant purple) |
| Accent | `#00D9FF` (cyan) |
| Success | `#10B981` (emerald) |
| Error | `#EF4444` (red) |
| Warning | `#F59E0B` (amber) |
| Text Primary | `#FFFFFF` |
| Text Secondary | `#A0A0B8` |
| Text Muted | `#6B6B80` |

### 13.2 Typography

- Hero: 48px
- 3XL: 30px · 2XL: 24px · XL: 20px · LG: 17px · MD: 15px · SM: 13px · XS: 11px
- Weights: Regular (400), Medium (500), Semibold (600), Bold (700), Extrabold (800)

### 13.3 UI Components

| Component | Variants | Description |
|-----------|----------|-------------|
| `Button` | primary, secondary, outline, ghost, danger × sm/md/lg | Pressable with loading state and icon support |
| `Badge` | default, success, error, warning, info, primary × sm/md | Coloured pill label |
| `Card` | default, elevated, outlined | Content container with optional shadow |
| `Input` | — | Text input with label, error, and icon support |
| `LoadingSpinner` | small/large, optional fullScreen | Activity indicator with optional message |
| `EmptyState` | — | Icon, title, message, optional action button |
| `Header` | — | Navigation header with title, subtitle, left/right icon buttons |

### 13.4 Domain Components

| Component | Description |
|-----------|-------------|
| `EventCard` | Event list card with banner, badges, price tag, progress bar, scarcity warning |
| `TicketCard` | Ticket-stub style card with accent bar, divider, status badge |
| `QRCodeDisplay` | QR renderer with auto-refresh, pulse animation, expiry awareness |
| `QRScanner` | Camera view with scan overlay, corner markers, haptic feedback |
| `ScanResultDisplay` | Check-in result with icon, status text, countdown timer for pending |

---

## 14. Data Types

### 14.1 Core Entities

```typescript
User {
  id, wallet_address, email?, role, display_name?, avatar_url?, created_at
}

TickETHEvent {
  id, organizer_id, title, description, banner_url?, venue,
  start_time, end_time?, contract_address?, status, chain_id?,
  created_at, updated_at, organizer?, tiers?, total_tickets?, tickets_sold?
}

TicketTier {
  id, event_id, name, price (wei), supply, minted,
  resale_allowed, metadata_uri?, description?
}

Ticket {
  id, token_id, contract_address, event_id, tier_id, owner_wallet,
  status, minted_at, checked_in_at?, tx_hash?, metadata_uri?,
  event?, tier?
}

QRPayload {
  ticketId, eventId, nonce, expiresAt, hmac
}

ScanResult {
  checkinLogId, result, ticketId, message
}
```

### 14.2 Enumerations

```typescript
UserRole:     'visitor' | 'attendee' | 'organizer' | 'admin' | 'volunteer'
EventStatus:  'draft' | 'published' | 'live' | 'completed' | 'cancelled'
TicketStatus: 'minted' | 'listed' | 'transferred' | 'checked_in' | 'invalidated'
ScanOutcome:  'success' | 'failed_invalid_ticket' | 'failed_already_checked_in'
              | 'failed_invalid_nonce' | 'failed_confirmation_timeout' | 'pending_confirmation'
```

---

## 15. User Workflows

### 15.1 First-Time User → Ticket Purchase

```
Open app → Splash screen → /auth
  → Connect wallet (email / MetaMask / Coinbase / Rainbow)
  → SIWE auto-authentication
  → Redirected to Events tab
  → Search/browse events
  → Tap event card → Event Detail
  → Read description, view tiers
  → Select a ticket tier
  → Tap "Mint NFT Ticket"
  → Confirm in dialog
  → Wallet sign transaction
  → Wait for on-chain confirmation
  → Success alert → "View Tickets"
  → My Tickets tab shows new ticket
```

### 15.2 Event Day — Attendee Check-in

```
Open app → My Tickets tab
  → Tap ticket → Ticket Detail
  → Dynamic QR code displayed (auto-refreshing)
  → Show phone to volunteer at gate
  → Volunteer scans QR
  → Push notification arrives: "Confirm your check-in"
  → Tap notification → /checkin-confirm screen
  → Review ticket info
  → Tap "Confirm Check-in"
  → Wallet signs verification message
  → "Check-in Confirmed! Enjoy the event!"
  → Ticket status changes to "Checked In"
```

### 15.3 Event Day — Volunteer Scanning

```
Open app → Scanner tab (visible for volunteer role)
  → Camera opens with scan overlay
  → Point at attendee's QR code
  → Haptic feedback on scan
  → "AWAITING CONFIRMATION" with countdown timer (2:00)
  → Backend polls every 3 seconds
  → Attendee confirms on their device
  → "ENTRY GRANTED" displayed
  → Tap "Scan Another" → ready for next attendee
```

### 15.4 Volunteer — Offline Scanning

```
Before event: Scanner tab → Tap network badge → "Prepare Offline Data"
  → Downloads ownership snapshots for all published events
  → "Cached 500 tickets across 3 events"

During event (no internet):
  → Badge shows "Offline"
  → Scan QR → "Scan queued for sync (offline mode)"
  → Scans accumulate in queue (up to 200)
  → Badge on tab shows pending count

Internet returns:
  → Auto-sync begins OR tap "Sync Now"
  → "Synced: 15, Failed: 0"
```

### 15.5 Ticket Transfer

```
My Tickets → Tap ticket → Ticket Detail
  → Tap "Transfer Ticket"
  → Warning: "Transfers are on-chain and irreversible"
  → View ticket summary (event, tier, token ID, price)
  → Enter recipient wallet address (validated in real-time)
  → View transfer summary (to, token ID, gas info)
  → Tap "Transfer Ticket"
  → Confirm in dialog
  → Wallet signs ERC-721 transferFrom
  → Wait for on-chain confirmation
  → "Transfer Complete!" with tx hash
  → "Back to Tickets"
```

---

## 16. Configuration

### 16.1 Environment Variables

| Key | Default (Dev) | Description |
|-----|---------------|-------------|
| `apiBaseUrl` | `http://192.168.0.234:3001/api/v1` | Backend API base URL |
| `thirdwebClientId` | `98ae3d982a02db9fa69f6aeec72166e2` | thirdweb dashboard client ID |

### 16.2 Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `QR_REFRESH_INTERVAL` | 25,000 ms | How often QR payloads refresh |
| `OFFLINE_CACHE_TTL` | 24 hours | How long ownership snapshots are valid |
| `MAX_OFFLINE_QUEUE` | 200 | Max offline scans before sync is required |
| `NOTIFICATION_CHANNEL_ID` | `ticketh-checkin` | Android notification channel |

---

## 17. File Structure

```
mobile/
├── index.js                    # Entry point with crypto polyfill
├── crypto-shim.js              # Node crypto module shim for RN
├── metro.config.js             # Metro bundler config with crypto resolver
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript config with path aliases
├── app.json                    # Expo config (permissions, plugins, splash)
├── app/
│   ├── _layout.tsx             # Root layout (providers + Stack navigator)
│   ├── index.tsx               # Auth gate redirect
│   ├── auth.tsx                # Wallet connection screen
│   ├── checkin-confirm.tsx     # Attendee check-in confirmation
│   ├── (tabs)/
│   │   ├── _layout.tsx         # Tab navigator (role-based visibility)
│   │   ├── events.tsx          # Event discovery
│   │   ├── tickets.tsx         # My tickets collection
│   │   ├── scanner.tsx         # QR scanner (volunteer)
│   │   └── profile.tsx         # User profile & settings
│   ├── event/
│   │   └── [id].tsx            # Event detail & mint flow
│   ├── ticket/
│   │   └── [id].tsx            # Ticket detail with QR
│   └── transfer/
│       └── [id].tsx            # Ticket transfer flow
├── src/
│   ├── api/
│   │   ├── client.ts           # Axios instance with JWT interceptors
│   │   ├── auth.ts             # Auth API (nonce, verify, refresh, me)
│   │   ├── events.ts           # Events API (list, get, stats)
│   │   ├── tickets.ts          # Tickets API (mine, get, record-mint, tiers)
│   │   ├── checkin.ts          # Check-in API (QR, scan, confirm, sync)
│   │   ├── marketplace.ts      # Marketplace API (list, buy, sell, cancel)
│   │   ├── users.ts            # Users API (push token)
│   │   └── index.ts            # Barrel export
│   ├── components/
│   │   ├── EventCard.tsx       # Event list card
│   │   ├── TicketCard.tsx      # Ticket list card
│   │   ├── QRCodeDisplay.tsx   # Dynamic QR renderer
│   │   ├── QRScanner.tsx       # Camera QR scanner
│   │   ├── ScanResult.tsx      # Scan result display
│   │   ├── ui/                 # Reusable UI primitives
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Input.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   └── index.ts
│   ├── constants/
│   │   ├── config.ts           # API URL, contract addresses, chain config
│   │   ├── theme.ts            # Colours, typography, spacing, shadows
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useEvents.ts        # useEvents, useEvent
│   │   ├── useTickets.ts       # useMyTickets, useTicket
│   │   ├── useCheckin.ts       # useTicketQR, useScanCheckin (with polling)
│   │   └── index.ts
│   ├── providers/
│   │   ├── AuthProvider.tsx    # Auth context + notifications + push nav
│   │   ├── WalletProvider.tsx  # thirdweb ↔ SIWE bridge
│   │   └── index.ts
│   ├── services/
│   │   ├── contract.ts         # Smart contract interactions (mint, transfer)
│   │   ├── wallet.ts           # ethers.js utilities (SIWE, address, URLs)
│   │   ├── notifications.ts   # Expo notifications setup
│   │   ├── offline.ts          # Network monitor + sync + snapshot download
│   │   └── index.ts
│   ├── stores/
│   │   ├── authStore.ts        # Zustand auth state
│   │   ├── walletStore.ts      # Zustand wallet state
│   │   ├── offlineStore.ts     # Zustand offline state
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts            # All TypeScript interfaces and enums
│   └── utils/
│       ├── format.ts           # Formatting (address, price, date, status)
│       ├── storage.ts          # AsyncStorage helpers
│       └── index.ts
└── assets/
    ├── icon.png
    ├── splash-icon.png
    ├── adaptive-icon.png
    └── favicon.png
```

**Total: 57 source files across 14 directories**

---

## 18. Known Limitations & Future Work

| Item | Status | Notes |
|------|--------|-------|
| Marketplace UI screens | API ready, no screens | Buy/sell/cancel listing screens needed |
| IPFS metadata display | Contract supports it | Ticket detail could show NFT image from IPFS |
| Biometric auth | Not implemented | expo-local-authentication available |
| Deep linking | URL scheme `ticketh://` registered | No universal links configured |
| Analytics | Not implemented | Event views, mint funnel tracking |
| Localisation | English only | react-native-i18n ready to integrate |
| Accessibility | Basic | VoiceOver/TalkBack labels needed on all interactive elements |
| E2E tests | None | Detox or Maestro recommended |
| Production RPC | Amoy testnet only | Polygon mainnet config needed for launch |
