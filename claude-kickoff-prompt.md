# Claude Code — Kickoff Prompt (Cluster)

> **How to use:** Open this project in VS Code with Claude Code. `CLAUDE.md` in the project root is loaded automatically — you don't need to tell Claude to read it. Optionally run `/init` first if you want Claude to also summarise an existing codebase. Then paste the prompt below to start the build.

---

## THE PROMPT (copy everything below this line)

---

Let's build **Cluster** — a client investment portal and back-office double-entry accounting ledger by Corporate Landlords. Clients log in to view their own statements and portfolio; staff run a true double-entry ledger, KYC, deposits and withdrawals behind the scenes.

You already have `CLAUDE.md` loaded — it holds the deployment rules, ledger model, roles, stack and workflow rules. Follow it. If anything I ask conflicts with it, flag it and we'll discuss before proceeding.

### Quick orientation

- **Stack:** Next.js (App Router, TS) · Firebase (Firestore, Auth custom claims, Storage) · Firebase App Hosting · Tailwind · Paystack · MetaMap (KYC) · Sanity (external, read-only — separate repo, this app only queries it).
- **The ledger is true double-entry** and is the heart of the app: chart of accounts; every movement posts balanced debits and credits in one atomic Firestore transaction; posted entries are immutable (correct via contra entries); balances and statements are derived; money is stored as integer kobo; provide a trial balance. Do not shortcut this.
- **Roles** (Firebase Auth custom claims): superadmin, admin, compliance, accounts, rm (assigned-clients read-only), customer. Withdrawals: customer requests → compliance approves → accounts posts.
- **Sanity:** do not scaffold a studio or schema here. Set up a read-only client in `/lib/sanity/client.ts` and GROQ queries in `/lib/sanity/queries.ts`, using `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET`.

### Firebase

Two Firebase projects (TEST + LIVE) — IDs and App Hosting backend names are in `CLAUDE.md` / `project-spec.md`. Set up `lib/firebase/client.ts` from the six `NEXT_PUBLIC_FIREBASE_*` vars, and `lib/firebase/admin.ts` from `FIREBASE_SERVICE_ACCOUNT` (server-only, never exposed to the browser).

### Look & feel

Premium, trustworthy, financial. Orange on near-black ink with coffee-brown accents. Use the brand tokens: primary `#FF9900` (sparingly, for actions), ink `#16181D` (structure/text), coffee `#6F4E37` (accent), surface `#FBFAF8`, border `#E6E4DF`; ledger semantics green `#1E8E5A` (credit/deposit), red `#C8442B` (debit/withdrawal), amber `#C98A00` (pending/KYC). Type: Space Grotesk (display), Inter (body), IBM Plex Mono (figures, tabular). Full system in `cluster-brand-guide.html`.

### Build order

1. **Scaffolding** — folder structure, `lib/firebase/client.ts` + `admin.ts`, Tailwind config wired to the brand tokens above, base layout, fonts.
2. **Auth** — Firebase Auth with login / register / forgot-password, custom-claim roles, and role-based route protection in `middleware.ts` for all six roles.
3. **Navigation** — role-aware nav.
4. **Ledger core** — chart-of-accounts model, atomic balanced journal-entry posting, immutable entries with contra-reversal, trial balance.
5. **Then page by page** — deposits (Paystack, server-verified), KYC (MetaMap), withdrawals workflow, client statements/portfolio, the Sanity-driven public site.

Ask before any major architectural decision. Start with step 1 and show me the structure before going deep.

---
*Refer to `project-spec.md` for full details and `CLAUDE.md` for the standing rules.*
