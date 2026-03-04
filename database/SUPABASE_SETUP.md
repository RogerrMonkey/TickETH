# Supabase Project Setup Guide — TickETH

Step-by-step guide to setting up the Supabase project for TickETH.

---

## 1. Create the Supabase Project

1. Go to **[https://supabase.com/dashboard](https://supabase.com/dashboard)**
2. Click **"New Project"**
3. Fill in:
   - **Name:** `ticketh` (or `ticketh-dev` for development)
   - **Database Password:** Generate a strong one — **save it somewhere safe** (you'll need it for direct DB connections)
   - **Region:** Choose the closest to your target audience. For India: `South Asia (Mumbai) - ap-south-1`
   - **Plan:** Free tier works for development
4. Click **"Create new project"**
5. Wait for provisioning (~2 minutes)

---

## 2. Get Your API Keys

Once the project is ready:

1. Go to **Project Settings** (gear icon in sidebar) → **API**
2. Note down these values (you'll put them in your `.env`):

| Key | Where to Find | Usage |
|-----|--------------|-------|
| **Project URL** | `Settings → API → Project URL` | `SUPABASE_URL` in your backend |
| **anon (public) key** | `Settings → API → Project API Keys → anon` | Frontend client (safe to expose) |
| **service_role key** | `Settings → API → Project API Keys → service_role` | Backend only (NEVER expose to client) |
| **JWT Secret** | `Settings → API → JWT Settings → JWT Secret` | For custom JWT signing if needed |

> ⚠️ **IMPORTANT:** The `service_role` key bypasses RLS. Only use it in your NestJS backend, never in frontend/mobile code.

---

## 3. Run the Migration

1. Go to **SQL Editor** (left sidebar → SQL Editor icon)
2. Click **"New Query"**
3. Copy the entire contents of `database/migrations/001_initial_schema.sql`
4. Paste it into the editor
5. Click **"Run"** (or press `Ctrl + Enter`)
6. You should see: `Success. No rows returned` — this is correct

### Verify Tables Were Created

1. Go to **Table Editor** (left sidebar → Table icon)
2. You should see all 7 tables:
   - `users`
   - `organizer_requests`
   - `events`
   - `ticket_tiers`
   - `tickets`
   - `checkin_logs`
   - `audit_logs`
3. Click on each table to verify the columns match

---

## 4. Verify RLS is Enabled

1. Go to **Authentication** (left sidebar) → **Policies**
2. You should see RLS enabled (green shield icon) on ALL 7 tables
3. Each table should have its policies listed:

| Table | Expected Policies |
|-------|------------------|
| `users` | `users_select_all`, `users_update_own`, `users_insert_service`, `users_delete_admin` |
| `organizer_requests` | `org_requests_select`, `org_requests_insert`, `org_requests_update` |
| `events` | `events_select`, `events_insert`, `events_update` |
| `ticket_tiers` | `tiers_select`, `tiers_insert`, `tiers_update` |
| `tickets` | `tickets_select`, `tickets_insert_service`, `tickets_update_service` |
| `checkin_logs` | `checkin_select`, `checkin_insert_service`, `checkin_update_service` |
| `audit_logs` | `audit_select_admin`, `audit_insert_service`, `audit_no_delete` |

> If any policy is missing, run the relevant `CREATE POLICY` statement from the migration again.

---

## 5. Verify Realtime is Enabled

1. Go to **Database** → **Replication**
2. Click on `supabase_realtime` publication
3. Verify these tables are listed:
   - `tickets`
   - `checkin_logs`
   - `events`

If not, run in SQL Editor:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE checkin_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
```

---

## 6. Configure Auth Settings

We use **wallet-based auth** (no email/password). The backend generates custom JWTs with wallet claims.

1. Go to **Authentication** → **Providers**
2. Disable all providers you don't need (Email, Phone, etc.)
3. We'll handle authentication entirely through our NestJS backend using custom JWTs

### JWT Custom Claims

Our backend will set these custom claims in the JWT:
```json
{
  "wallet_address": "0xabc...def",
  "user_role": "attendee",
  "sub": "<user-uuid>",
  "aud": "authenticated",
  "role": "authenticated"
}
```

The RLS policies use `auth_wallet()` and `auth_role()` helper functions (created in the migration) to extract these claims.

---

## 7. Set Up Storage Buckets (Optional — for Phase 3+)

For storing event banners to IPFS + Supabase backup:

1. Go to **Storage** (left sidebar)
2. Click **"New Bucket"**
3. Create these buckets:

| Bucket Name | Public? | Purpose |
|------------|---------|---------|
| `event-banners` | ✅ Yes | Event banner images |
| `user-avatars` | ✅ Yes | User profile pictures |
| `ticket-metadata` | ✅ Yes | NFT metadata JSON backup |

4. For each public bucket, add a policy:
   - Click the bucket → **Policies** → **New Policy**
   - **SELECT (read):** Allow for everyone → `true`
   - **INSERT (upload):** Allow for authenticated users → `auth.role() = 'authenticated'`

> Actual NFT metadata will be on IPFS (Pinata). Supabase Storage is a backup/cache.

---

## 8. Environment Variables

Create/update your `.env` files with the Supabase credentials:

### Backend `.env` (NestJS — Phase 3)
```env
# Supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Database (Direct connection — for migrations)
DATABASE_URL=postgresql://postgres:your-db-password@db.your-project-ref.supabase.co:5432/postgres
```

### Frontend `.env.local` (Next.js — Phase 5)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
```

> You can find the direct database connection string at:
> **Project Settings → Database → Connection string → URI**

---

## 9. Seed Development Data

After running the migration, run the seed file for dev data:

1. Go to **SQL Editor** → **New Query**
2. Copy contents of `database/seeds/dev_seed.sql`
3. Run it

This creates test users, sample events, and ticket tiers for local development.

---

## 10. Dashboard Bookmarks

Save these dashboard pages for quick access during development:

- **Table Editor:** View/edit data directly
- **SQL Editor:** Run ad-hoc queries
- **Authentication → Policies:** Verify RLS policies
- **Database → Replication:** Check realtime subscriptions
- **Logs → Postgres Logs:** Debug query issues
- **API Docs:** Auto-generated API docs for your tables (under `API` in sidebar)

---

## Quick Reference: Supabase Client in Code

### Backend (NestJS, service role):
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // BYPASSES RLS
);
```

### Frontend (Next.js, anon key):
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // Respects RLS
);
```

### Authenticated request (with user JWT):
```typescript
// Backend creates a per-request client with user's JWT
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    global: {
      headers: { Authorization: `Bearer ${userJwt}` }
    }
  }
);
// Now all queries go through RLS as that user
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Migration fails with "type already exists" | You ran it twice. Run `DROP TYPE IF EXISTS <name> CASCADE;` first |
| RLS blocks all queries | Check that your JWT has the correct `wallet_address` and `user_role` claims |
| Realtime not working | Verify the table is in the `supabase_realtime` publication |
| "permission denied for table" | You're using `anon` key without a valid JWT. Use `service_role` for backend operations |
| Slow queries | Check `Database → Inspections → Long-running queries` and add appropriate indexes |

---

**Next Phase:** Phase 3 — Backend Core (NestJS) will integrate with this database.
