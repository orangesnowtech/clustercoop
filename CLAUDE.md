# CLAUDE.md — Cluster (main app)

> Claude Code loads this file automatically at the start of every session. It is the source of truth for how Cluster is built and deployed. Keep it concise and current; move deep, path-specific detail into `.claude/rules/` if this grows past ~200 lines.

---

## Project

**Name:** Cluster
**Description:** A client investment portal and back-office double-entry accounting ledger by Corporate Landlords. Records positions, transactions and valuations; processes deposits via Paystack; records withdrawals; clients log in to view their own statements.
**Target users:** Investors/clients (self-service) + Corporate Landlords staff (admin, accounts, compliance, relationship managers).

**This repository** is the **main app** (Next.js). The **Sanity Studio lives in a separate repo** — see "Content (Sanity)" below. This app only *reads* content; it never contains schema.

---

## Tech Stack

- **Frontend:** Next.js (App Router, TypeScript)
- **Hosting:** Firebase App Hosting — deploying = pushing to a GitHub branch
- **Styling:** Tailwind CSS
- **Backend:** Firebase (Firestore, Storage)
- **Auth:** Firebase Authentication with custom claims
- **Payments:** Paystack
- **CMS:** Sanity (external, read-only — separate repo)
- **KYC:** MetaMap

---

## Ledger Model — TRUE DOUBLE-ENTRY (most important rule in this file)

Cluster is a **double-entry** system. Do not shortcut this into a single-entry transaction log.

- **Chart of Accounts**: Assets, Liabilities, Equity, Income, Expenses. Each client has cash + holdings sub-accounts.
- **Every** financial movement = **balanced debits and credits** (debits == credits) posted in a **single atomic Firestore transaction**.
- **Immutable**: never edit or delete a posted journal entry. Correct only via a **reversing/contra entry**.
- **Derived**: balances, holdings and statements are derived from the ledger — never stored as the source of truth.
- **Money = integer minor units (kobo).** Never floats.
- Provide a **trial balance** view so Accounts can confirm the books balance.

---

## Deployment Rules — READ CAREFULLY

Firebase App Hosting deploys automatically on a git push to a connected branch.
**There is no separate deploy command. Pushing = Deploying.**

**Repository:** `https://github.com/orangesnowtech/clustercoop.git`

| Branch | Deploys To | Firebase Project | App Hosting Backend |
|--------|-----------|-----------------|---------------------|
| `master` | No auto-deploy — all work done here | — | — |
| `test` | Staging / test server | `cluster-staging-6ed81` | `clustercoop-backend` |
| `live` | Production | `<<FILL: LIVE Firebase project ID>>` | `<<FILL: LIVE backend>>` |

**Test URL:** `https://clustercoop-backend--cluster-staging-6ed81.europe-west4.hosted.app` (region europe-west4)

> Deploy must be run as **corporatelandlords@gmail.com** (owner of the project). Admin SDK uses Application Default Credentials on App Hosting — no `FIREBASE_SERVICE_ACCOUNT` secret needed. Secrets live in Secret Manager (set via `firebase apphosting:secrets:set <NAME> --data-file -`, then `apphosting:secrets:grantaccess <NAMES> --backend clustercoop-backend --location europe-west4`).

### Deployment Workflow (Follow Every Time)
```
1. Do all work on the master branch
2. Push to test and verify on staging:
     git push origin master:test
3. Push to live:
     git push origin master:live
4. ALWAYS return to master after any push:
     git checkout master
```

**Never work on the test or live branch directly. Always return to master.**

### Switching Firebase Projects Locally
```bash
firebase use cluster-staging-6ed81            # switch to test/staging
firebase use <<FILL: LIVE Firebase project ID>>   # switch to live
```

---

## Environment Variables & Secrets

Firebase App Hosting uses Google Cloud Secret Manager — not `.env` files in production.

- `NEXT_PUBLIC_` prefix → browser-safe, baked into the JS bundle at build time (`availability: [BUILD, RUNTIME]`)
- No prefix → server-side only, never sent to the browser (`availability: [RUNTIME]`)
- Local dev: use `.env.local` (never commit this file)
- Production: set via `firebase apphosting:secrets:set` in **both** Firebase projects

**Server-only secrets (never `NEXT_PUBLIC_`):** `FIREBASE_SERVICE_ACCOUNT`, `PAYSTACK_SECRET_KEY`, `SANITY_API_READ_TOKEN` (optional), `METAMAP_CLIENT_SECRET`, `METAMAP_WEBHOOK_SECRET`.

---

## Authentication & Roles

Roles are stored as **Firebase Auth custom claims** — not in Firestore.

| Role | Claim | Notes |
|------|-------|-------|
| Super Admin | `role: 'superadmin'` | Set manually in Firebase Console only — never via app UI |
| Admin | `role: 'admin'` | Full app, user management, all data, all back-office functions |
| Compliance | `role: 'compliance'` | Approve KYC, sign off withdrawals; read-only on ledger & transactions |
| Accounts | `role: 'accounts'` | Post journal entries, manage deposits/withdrawals, valuations, statements, reports |
| Relationship Manager | `role: 'rm'` | Read-only, **assigned clients only**; assist onboarding; no ledger write |
| Customer | `role: 'customer'` | Own data only |

**RM scoping:** enforce assigned-clients-only via `rmUid` on each client doc, checked in Firestore rules + middleware.
**Separation of duties for withdrawals:** Customer requests → Compliance approves → Accounts posts to ledger.

### Checking roles in code:
```typescript
// Server-side (API routes, Server Components)
const decoded = await adminAuth.verifyIdToken(token)
const role = decoded.role

// Client-side
const result = await user.getIdTokenResult()
const role = result.claims.role
```

### Adding a New Role — Checklist
1. **Define it** — add to `/lib/roles.ts` with claim value, display name, permissions list
2. **Custom claim** — update the Cloud Function / admin script that sets claims; test in Firebase Console
3. **Middleware** — update `/middleware.ts` to allow/block the new role on relevant routes
4. **Navigation** — update nav to show/hide items for the new role
5. **Firestore rules** — update `firestore.rules`, deploy with `firebase deploy --only firestore:rules`
6. **Page guards** — audit pages, add the role to `allowedRoles` arrays where appropriate
7. **project-spec.md** — add the role to the Roles table and document its permissions
8. **Test** — create a test user, assign the claim, verify access and blocks

---

## Custom API Registry

All third-party APIs beyond the standard stack. All calls go through `/lib/api/<name>.ts` — never called directly from components.

### MetaMap (KYC)
- **Purpose:** identity verification during client onboarding
- **Side:** browser-safe SDK + server-side webhook verification
- **Auth:** public `clientId` + `flowId` (browser); `clientSecret` + webhook signing secret (server)
- **Env vars:** `NEXT_PUBLIC_METAMAP_CLIENT_ID`, `NEXT_PUBLIC_METAMAP_FLOW_ID`, `METAMAP_CLIENT_SECRET`, `METAMAP_WEBHOOK_SECRET`
- **Used by:** KYC verification flow; Compliance review & approvals
- **Flow:** render MetaMap button (public values) → results arrive via signed webhook → verify signature with `METAMAP_WEBHOOK_SECRET` → write KYC status to Firestore → Compliance reviews/approves

### Rules for all custom APIs
- Server-only keys: no `NEXT_PUBLIC_` prefix, Secret Manager, `availability: [RUNTIME]` only
- Browser-safe keys: `NEXT_PUBLIC_` prefix, `availability: [BUILD, RUNTIME]`
- Never hardcode base URLs — always read from env vars (test and live differ)
- To add a new API: register it here, add secrets to both Firebase projects, update both `apphosting.yaml` files, create `/lib/api/<name>.ts`, update `project-spec.md`

---

## Content (Sanity) — EXTERNAL, READ-ONLY

**Sanity Studio lives in its own separate repository.** This main app is a **read-only consumer** of published content. Do **not** scaffold a Sanity Studio, schema files, or a `/schemaTypes` folder in this repo.

- **Env vars (this app):** `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` (browser-safe). Add `SANITY_API_READ_TOKEN` (server-only) **only** if reading drafts or a private dataset. **Never** put a write token in this app.
- **Client:** a single read-only client in `/lib/sanity/client.ts`. Prefer fetching in Server Components.
- **Queries:** all GROQ queries live in `/lib/sanity/queries.ts` — this app owns *what it reads*; the studio owns *content shape*.
- **Types:** consume the generated `sanity.types.ts` produced by Sanity TypeGen in the studio repo (commit a copy into `/lib/sanity/` or share as a package). Do not redefine content types by hand.
- **CORS:** the Sanity project must whitelist this app's origins (localhost, test, live) under API → CORS. Server-side fetches avoid CORS entirely.
- **Content types available:** `page`, `investmentProduct`, `faq`, `post`, `legalDocument`, `siteSettings`.
- **Revalidation (later):** a Sanity webhook → a revalidate route here keeps cached pages fresh on publish.

⚠️ Sanity holds **marketing content only**. Real balances, holdings, transactions and returns live in the Firestore ledger — never in Sanity.

---

## Payments (Paystack)

- Deposits: client pays via Paystack inline → **verify server-side** (verify endpoint / signed webhook) → post a balanced journal entry atomically.
- Withdrawals: recorded in-app (request → Compliance approval → Accounts posts ledger entry).
- **Never** post to the ledger from an unverified client callback.

---

## Brand & Design

**Vibe:** Premium, trustworthy, financial. Orange on near-black ink, coffee-brown accents. Clean and data-legible.
**Primary:** `#FF9900` (Cluster Orange) | **Pressed:** `#E08600`
**Secondary:** `#16181D` (Ink) | **Soft:** `#2C2F36`
**Accent:** `#6F4E37` (Coffee Brown) | **Deep:** `#4E3629`
**Surface:** `#FBFAF8` | **Border:** `#E6E4DF`
**Ledger semantics:** Credit/deposit `#1E8E5A` · Debit/withdrawal `#C8442B` · Pending/KYC `#C98A00`
**Type:** Display **Space Grotesk**, body **Inter**, figures **IBM Plex Mono** (tabular).
**Logo:** `logo-orange-noBg_2.png`

Use orange sparingly as the action/accent colour; ink for structure; green/red strictly for ledger credit/debit. Full reference in `cluster-brand-guide.html`.

---

## What NOT To Do

- ❌ Never reduce the ledger to single-entry — it is **double-entry**, balanced, atomic, immutable
- ❌ Never edit or delete a posted journal entry — reverse with a contra entry
- ❌ Never store money as a float — use integer minor units (kobo)
- ❌ Never scaffold Sanity Studio or schema in this repo — Sanity is external and read-only
- ❌ Never put a Sanity write token in this app
- ❌ Never commit `.env.local` or any file containing secrets
- ❌ Never use `NEXT_PUBLIC_` prefix for secret/private keys
- ❌ Never push to `live` without testing on `test` first
- ❌ Never stay on `test` or `live` — always return to `master`
- ❌ Never store user roles in Firestore — use Firebase Auth custom claims
- ❌ Never build UI to create Super Admin accounts
- ❌ Never call third-party APIs directly from components — always use `/lib/api/<name>.ts`
- ❌ Never post to the ledger from an unverified Paystack callback
- ❌ Never expose Firebase Admin SDK or service account to the browser

---

*Keep this file updated as Cluster evolves. Use `#` in a Claude Code session to quick-add a rule, then move it here when it should be permanent.*
