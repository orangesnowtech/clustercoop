# Cluster — Sanity Starter Schema

Six content types for the Cluster marketing site, plus two shared objects. Written for **Sanity v3/v4** (TypeScript, `defineType`/`defineField`).

## Files

```
schemaTypes/
├── index.ts              # registers all types — import this in sanity.config.ts
├── blockContent.ts       # shared rich-text (portable text)
├── seo.ts                # shared per-document SEO object
├── siteSettings.ts       # singleton: nav, contact, socials, SEO defaults
├── page.ts               # generic marketing pages (Home, About, How it works…)
├── investmentProduct.ts  # investment offerings (marketing only)
├── faq.ts                # FAQ entries (with categories)
├── post.ts               # Insights / blog
└── legalDocument.ts      # Terms, Privacy, Risk Disclosure…
```

## Install

1. Drop the `schemaTypes/` folder into your Sanity studio project (replace the default one).
2. Wire it up in `sanity.config.ts`:

```ts
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  // ...
  schema: {types: schemaTypes},
})
```

3. Make **siteSettings** a singleton so editors can't create duplicates — pin it in your desk structure (`structure.ts`) and remove it from the global "create new" menu.

## Environment variables (match `project-spec.md`)

```
NEXT_PUBLIC_SANITY_PROJECT_ID   # browser-safe
NEXT_PUBLIC_SANITY_DATASET      # browser-safe (e.g. production)
SANITY_API_TOKEN                # server-only — only if using drafts / private dataset
```

## Front-end usage

Per the main app's `CLAUDE.md`, all content is fetched through a typed client in `/lib/sanity/` (in the **main app** repo, not here) — never read in components directly. Minimal client:

```ts
// /lib/sanity/client.ts
import {createClient} from 'next-sanity'

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2024-01-01',
  useCdn: true, // false when you need fresh/draft content
})
```

Example query (active products, in display order):

```ts
const products = await sanityClient.fetch(
  `*[_type == "investmentProduct" && active == true] | order(order asc){
    name, "slug": slug.current, summary, riskLevel, indicativeReturn, tenor, image
  }`
)
```

## ⚠️ Important boundary

Sanity holds **marketing content only**. Real client balances, holdings, transactions, valuations and returns live in the **Firestore double-entry ledger** — never store actual financial figures or client data in Sanity. The `indicativeReturn` field is display copy, not a number tied to anyone's account.

## Extending

Add a new type by creating `schemaTypes/<name>.ts`, importing it into `index.ts`, and adding it to the `schemaTypes` array. Keep editor-facing fields plain-language and add `validation` and `preview` so the studio stays tidy.
