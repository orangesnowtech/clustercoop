/**
 * Sanity client — READ-ONLY consumer.
 *
 * The Sanity Studio lives in a SEPARATE repo. This app never contains schema
 * and never writes. It only reads published marketing content. Real balances,
 * holdings and transactions live in the Firestore ledger — never in Sanity.
 *
 * Prefer fetching in Server Components. Only attach SANITY_API_READ_TOKEN
 * (server-only) if reading drafts or a private dataset — never a write token.
 */
import { createClient, type SanityClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;

export const sanityClient: SanityClient = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  useCdn: true, // published content via CDN; fine for read-only marketing pages
  // token intentionally omitted — read-only public dataset.
  // For drafts/private data, set token: process.env.SANITY_API_READ_TOKEN here.
});
