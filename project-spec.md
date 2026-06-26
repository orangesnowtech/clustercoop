# Project Spec: Cluster

> Last updated: 2026-06-26
> Built by Corporate Landlords. This file is the source of truth for the project — keep it updated as things evolve.

---

## 1. Project Overview

**Name:** Cluster
**Description:** A client investment portal and back-office accounting ledger built by Corporate Landlords. Cluster records investment positions, transactions and valuations on a true double-entry ledger, processes client deposits via Paystack, records withdrawals, and lets clients log in to view their own statements and portfolio.
**Target Users:** Investors/clients (self-service portal) and Corporate Landlords internal staff — operations, finance/accounts, compliance, and relationship managers.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router, TypeScript) |
| Backend | Firebase (Firestore, Auth, Storage) |
| Hosting | Firebase App Hosting (deploy = git push to a connected branch) |
| Styling | Tailwind CSS |
| Auth | Firebase Authentication + Custom Claims |
| Payments | Paystack |
| CMS | Sanity |
| Identity / KYC | MetaMap |

---

## 3. Ledger Model — True Double-Entry (core architecture)

Cluster uses **true double-entry bookkeeping**. This is a deliberate "do it properly now" decision to support scale and audit.

**Rules Claude Code must follow:**

- **Chart of Accounts** with the five account classes: Assets, Liabilities, Equity, Income, Expenses. Each client has their own cash and holdings sub-accounts under the appropriate class.
- **Journal entries**: every financial movement posts **balanced debits and credits** (total debits = total credits) inside a **single atomic Firestore transaction**. A deposit, withdrawal, trade or valuation can never half-record.
- **Immutable posting**: posted entries are **never edited or deleted**. Corrections are made by posting a **reversing/contra entry**. This preserves a tamper-evident audit trail.
- **Derived balances**: client balances, holdings and statements are **derived from the ledger**, not stored as the source of truth.
- **Trial balance / reconciliation** view for Accounts to confirm the books balance.
- Money stored as **integer minor units (kobo)** — never floats — to avoid rounding errors.

**Suggested Firestore collections:** `accounts` (chart of accounts), `journalEntries` (header: date, description, status, createdBy), `journalLines` (entryId, accountId, debit, credit), `clients`, `transactions` (business-level view linking to journal entries), `valuations`, `products`.

---

## 4. Firebase Configuration

The project uses **two Firebase projects**: a TEST/staging project and a LIVE/production project.

> ⚠️ Never commit config values or `.env.local` to git. All production values live in Google Cloud Secret Manager.

### 🧪 TEST Firebase Project
**Project ID:** `<<FILL: TEST Firebase project ID>>`
**App Hosting Backend:** `<<FILL: TEST App Hosting backend name>>`

#### .env.local (TEST — never commit)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=<<FILL: TEST apiKey>>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<<FILL: TEST authDomain>>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<<FILL: TEST projectId>>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<<FILL: TEST storageBucket>>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<<FILL: TEST messagingSenderId>>
NEXT_PUBLIC_FIREBASE_APP_ID=<<FILL: TEST appId>>

# Server-only (no NEXT_PUBLIC_ prefix)
FIREBASE_SERVICE_ACCOUNT=<<FILL: TEST service account JSON (single line)>>

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=<<FILL: TEST Paystack public key pk_test_...>>
PAYSTACK_SECRET_KEY=<<FILL: TEST Paystack secret key sk_test_...>>

# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=<<FILL: Sanity project ID>>
NEXT_PUBLIC_SANITY_DATASET=<<FILL: Sanity dataset, e.g. production>>
SANITY_API_TOKEN=<<FILL: Sanity API token (only if using drafts/private dataset)>>

# MetaMap (KYC) — browser-safe SDK values
NEXT_PUBLIC_METAMAP_CLIENT_ID=<<FILL: TEST MetaMap client ID>>
NEXT_PUBLIC_METAMAP_FLOW_ID=<<FILL: TEST MetaMap flow ID>>
# MetaMap — server-only
METAMAP_CLIENT_SECRET=<<FILL: TEST MetaMap client secret>>
METAMAP_WEBHOOK_SECRET=<<FILL: TEST MetaMap webhook signing secret>>
```

#### apphosting.yaml (TEST)
```yaml
runConfig:
  minInstances: 0
env:
  - variable: NEXT_PUBLIC_FIREBASE_API_KEY
    secret: NEXT_PUBLIC_FIREBASE_API_KEY
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    secret: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
    secret: NEXT_PUBLIC_FIREBASE_PROJECT_ID
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    secret: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    secret: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_FIREBASE_APP_ID
    secret: NEXT_PUBLIC_FIREBASE_APP_ID
    availability: [BUILD, RUNTIME]
  - variable: FIREBASE_SERVICE_ACCOUNT
    secret: FIREBASE_SERVICE_ACCOUNT
    availability: [RUNTIME]
  - variable: PAYSTACK_SECRET_KEY
    secret: PAYSTACK_SECRET_KEY
    availability: [RUNTIME]
  - variable: NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    secret: NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_SANITY_PROJECT_ID
    secret: NEXT_PUBLIC_SANITY_PROJECT_ID
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_SANITY_DATASET
    secret: NEXT_PUBLIC_SANITY_DATASET
    availability: [BUILD, RUNTIME]
  - variable: SANITY_API_TOKEN
    secret: SANITY_API_TOKEN
    availability: [RUNTIME]
  - variable: NEXT_PUBLIC_METAMAP_CLIENT_ID
    secret: NEXT_PUBLIC_METAMAP_CLIENT_ID
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_METAMAP_FLOW_ID
    secret: NEXT_PUBLIC_METAMAP_FLOW_ID
    availability: [BUILD, RUNTIME]
  - variable: METAMAP_CLIENT_SECRET
    secret: METAMAP_CLIENT_SECRET
    availability: [RUNTIME]
  - variable: METAMAP_WEBHOOK_SECRET
    secret: METAMAP_WEBHOOK_SECRET
    availability: [RUNTIME]
```

#### Secrets Setup — TEST (`firebase use <<TEST Firebase project ID>>` first)
```bash
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_API_KEY
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_PROJECT_ID
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_APP_ID
firebase apphosting:secrets:set FIREBASE_SERVICE_ACCOUNT
firebase apphosting:secrets:set PAYSTACK_SECRET_KEY
firebase apphosting:secrets:set NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
firebase apphosting:secrets:set NEXT_PUBLIC_SANITY_PROJECT_ID
firebase apphosting:secrets:set NEXT_PUBLIC_SANITY_DATASET
firebase apphosting:secrets:set SANITY_API_TOKEN
firebase apphosting:secrets:set NEXT_PUBLIC_METAMAP_CLIENT_ID
firebase apphosting:secrets:set NEXT_PUBLIC_METAMAP_FLOW_ID
firebase apphosting:secrets:set METAMAP_CLIENT_SECRET
firebase apphosting:secrets:set METAMAP_WEBHOOK_SECRET
```
> Always say **yes** when prompted to grant permissions.

---

### 🚀 LIVE Firebase Project
**Project ID:** `<<FILL: LIVE Firebase project ID>>`
**App Hosting Backend:** `<<FILL: LIVE App Hosting backend name>>`

#### .env.local (LIVE — never commit)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=<<FILL: LIVE apiKey>>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<<FILL: LIVE authDomain>>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<<FILL: LIVE projectId>>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<<FILL: LIVE storageBucket>>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<<FILL: LIVE messagingSenderId>>
NEXT_PUBLIC_FIREBASE_APP_ID=<<FILL: LIVE appId>>

FIREBASE_SERVICE_ACCOUNT=<<FILL: LIVE service account JSON (single line)>>

NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=<<FILL: LIVE Paystack public key pk_live_...>>
PAYSTACK_SECRET_KEY=<<FILL: LIVE Paystack secret key sk_live_...>>

NEXT_PUBLIC_SANITY_PROJECT_ID=<<FILL: Sanity project ID>>
NEXT_PUBLIC_SANITY_DATASET=<<FILL: Sanity dataset, e.g. production>>
SANITY_API_TOKEN=<<FILL: Sanity API token (only if using drafts/private dataset)>>

NEXT_PUBLIC_METAMAP_CLIENT_ID=<<FILL: LIVE MetaMap client ID>>
NEXT_PUBLIC_METAMAP_FLOW_ID=<<FILL: LIVE MetaMap flow ID>>
METAMAP_CLIENT_SECRET=<<FILL: LIVE MetaMap client secret>>
METAMAP_WEBHOOK_SECRET=<<FILL: LIVE MetaMap webhook signing secret>>
```

#### apphosting.yaml (LIVE — identical structure to TEST, different secret values)
```yaml
runConfig:
  minInstances: 0
env:
  # Same 17 variables as the TEST apphosting.yaml above.
  # The secret NAMES are identical; the VALUES stored in each project's
  # Secret Manager differ (test keys vs live keys).
```

#### Secrets Setup — LIVE (`firebase use <<LIVE Firebase project ID>>` first)
```bash
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_API_KEY
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_PROJECT_ID
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_APP_ID
firebase apphosting:secrets:set FIREBASE_SERVICE_ACCOUNT
firebase apphosting:secrets:set PAYSTACK_SECRET_KEY
firebase apphosting:secrets:set NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
firebase apphosting:secrets:set NEXT_PUBLIC_SANITY_PROJECT_ID
firebase apphosting:secrets:set NEXT_PUBLIC_SANITY_DATASET
firebase apphosting:secrets:set SANITY_API_TOKEN
firebase apphosting:secrets:set NEXT_PUBLIC_METAMAP_CLIENT_ID
firebase apphosting:secrets:set NEXT_PUBLIC_METAMAP_FLOW_ID
firebase apphosting:secrets:set METAMAP_CLIENT_SECRET
firebase apphosting:secrets:set METAMAP_WEBHOOK_SECRET
```
> Always say **yes** when prompted to grant permissions.

---

## 5. GitHub Repository & Branches

**Repository:** `<<FILL: GitHub repo URL>>`

| Branch | Purpose | Deploys To |
|--------|---------|-----------|
| `master` | Active development — all work done here | No auto-deploy |
| `test` | Push here to deploy to staging | TEST Firebase project |
| `live` | Push here to deploy to production | LIVE Firebase project |

**Deploy commands:**
```bash
git push origin master:test   # deploy to test/staging
git push origin master:live   # deploy to production
git checkout master           # always return to master after any push
```

Firebase App Hosting auto-deploys on push to a connected branch. There is no separate deploy command.

---

## 6. User Roles & Permissions

Roles are stored as Firebase Auth **custom claims** — never in Firestore.
**Super Admin** is created **manually** in the Firebase Console only — never via the app.

| Role | Custom Claim | Key Permissions |
|------|-------------|-----------------|
| Super Admin | `role: 'superadmin'` | Full access to everything. Bootstrapped in Firebase Console. |
| Admin | `role: 'admin'` | Full app access, user management, all data, all back-office functions. |
| Compliance | `role: 'compliance'` | Review & approve KYC (MetaMap), sign off / approve withdrawals, read-only on ledger and transactions. |
| Accounts | `role: 'accounts'` | Post journal entries, manage deposits & withdrawals, post valuations & returns, generate statements, run trial balance/reports. |
| Relationship Manager | `role: 'rm'` | Read-only access to **assigned** clients' portfolios & statements, assist onboarding. **No ledger write access.** |
| Customer | `role: 'customer'` | Own portfolio, statements, transactions, deposits, withdrawals and documents only. |

**RM scoping:** Relationship Manager access is limited to assigned clients via a `clientId ↔ rmUid` mapping in Firestore (e.g. an `rmUid` field on each client doc, enforced in Firestore rules and middleware).

**Withdrawal control:** withdrawals are *requested* by the Customer, *approved* by Compliance, and *posted* to the ledger by Accounts — a clean separation of duties.

---

## 7. Pages & Features

### Public site (Sanity-driven content)
- Home / landing
- About
- Investment products / How it works
- FAQ
- Insights / blog
- Contact
- Legal (Terms, Privacy)

### Auth & onboarding
- Login
- Register
- Forgot password
- KYC verification flow (MetaMap)

### Client dashboard (authenticated, `role: customer`)
- Portfolio overview (balance, holdings, returns)
- Statements (downloadable)
- Transactions / activity
- Deposit (Paystack)
- Withdraw (request)
- Documents
- Profile & settings

### Admin / back office
- Admin dashboard
- Investor management
- KYC review & approvals (Compliance)
- The ledger — chart of accounts, journal entries, trial balance (Accounts)
- Deposits & withdrawals management
- Investment products / portfolios
- Valuations & returns posting
- Statement generation
- Reports

### Admin-only pages
All "Admin / back office" pages above are gated to `admin`, `accounts`, `compliance`, or `rm` as appropriate. No customer ever reaches back-office routes. RM sees a read-only, assigned-clients-only subset.

---

## 8. Look & Feel

**Design vibe:** Premium, trustworthy, financial. Orange on near-black ink with coffee-brown accents. Clean, confident, data-legible — the register of a serious place to keep your money.
**Figma file:** None yet (build from this palette + logo).
**Reference sites:** None specified.
**Logo:** `logo-orange-noBg_2.png` (lowercase "cluster" wordmark with sun mark, pure `#FF9900`).

| Color Role | Name | Hex |
|-----------|------|-----|
| Primary | Cluster Orange | `#FF9900` |
| Primary (pressed/hover) | Burnt Orange | `#E08600` |
| Secondary | Ink (near-black) | `#16181D` |
| Secondary (soft) | Dark Grey | `#2C2F36` |
| Accent | Coffee Brown | `#6F4E37` |
| Accent (deep) | Espresso | `#4E3629` |
| Surface | Off-white | `#FBFAF8` |
| Border | Warm Grey | `#E6E4DF` |
| Credit / deposit (+) | Ledger Green | `#1E8E5A` |
| Debit / withdrawal (−) | Ledger Red | `#C8442B` |
| Pending / KYC review | Amber | `#C98A00` |

---

## 9. Payments — Paystack

- Public key: `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` (browser-safe)
- Secret key: `PAYSTACK_SECRET_KEY` (server-only — never expose to browser)
- **Use cases:**
  - **Deposits** — client funds account via Paystack inline checkout; on verified webhook, post a balanced journal entry (debit client cash, credit deposits/clearing) atomically.
  - **Withdrawals** — recorded in-app (request → Compliance approval → Accounts posts ledger entry). Payout itself handled per Corporate Landlords' process; Cluster records the ledger movement.
- Always verify payments **server-side** via Paystack's verify endpoint / webhook signature before posting to the ledger. Never trust the client callback alone.

---

## 10. Sanity CMS — external, read-only (separate repo)

The **Sanity Studio lives in its own repository and workspace** (modular by design). This main app is a **read-only consumer** — it queries published content and never contains schema or studio code.

- Project ID: `<<FILL: Sanity project ID>>`
- Dataset: `<<FILL: Sanity dataset, e.g. production>>`
- **Content types (defined in the studio repo):** `page`, `investmentProduct`, `faq`, `post`, `legalDocument`, `siteSettings`
- **Main-app env vars:** `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` (browser-safe). `SANITY_API_READ_TOKEN` (server-only) only if reading drafts / a private dataset. **No write token in this app.**
- **Consumer code:** read-only client in `/lib/sanity/client.ts`; GROQ queries in `/lib/sanity/queries.ts`; prefer fetching in Server Components.
- **Types:** consume `sanity.types.ts` generated by Sanity TypeGen in the studio repo (commit a copy into `/lib/sanity/` or share as a package).
- **CORS:** whitelist this app's origins (localhost, test, live) in the Sanity project's API → CORS settings.
- **Deploys:** studio deploys independently (`npx sanity deploy`); this app deploys via Firebase App Hosting. Unrelated pipelines.

⚠️ Sanity holds **marketing content only**. Real balances, holdings, transactions and returns live in the Firestore ledger — never in Sanity.

---

## 11. Custom API Registry

All APIs are accessed only through `/lib/api/<name>.ts` — never called directly from components.

| API | Purpose | Side | Auth | Env vars |
|-----|---------|------|------|----------|
| MetaMap | KYC / identity verification during onboarding | Browser-safe SDK + server-side verification | Public client ID + flow ID (browser); client secret + webhook secret (server) | `NEXT_PUBLIC_METAMAP_CLIENT_ID`, `NEXT_PUBLIC_METAMAP_FLOW_ID`, `METAMAP_CLIENT_SECRET`, `METAMAP_WEBHOOK_SECRET` |

**MetaMap notes:**
- Frontend renders the MetaMap button/SDK using the public `clientId` + `flowId`.
- Verification **results** arrive via a signed **webhook** — verify the signature with `METAMAP_WEBHOOK_SECRET` server-side, then update the client's KYC status in Firestore for Compliance to review/approve.
- Test and live MetaMap credentials differ — store each set in the matching Firebase project.

> To add a new API later: add a row here, add secrets to **both** Firebase projects, update both `apphosting.yaml` files, create `/lib/api/<name>.ts`, and update `CLAUDE.md`.

---

*This file is the source of truth for Cluster. Update it as the project evolves.*
