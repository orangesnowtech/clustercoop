/**
 * GROQ queries — this app owns WHAT it reads; the studio owns content SHAPE.
 *
 * Content types available (defined in the studio repo): page, investmentProduct,
 * faq, post, legalDocument, siteSettings. Add queries here as pages are built;
 * types should come from the studio's generated sanity.types.ts (do not hand-roll).
 */
import { sanityClient } from "./client";

export const siteSettingsQuery = /* groq */ `
  *[_type == "siteSettings"][0]
`;

export const pageBySlugQuery = /* groq */ `
  *[_type == "page" && slug.current == $slug][0]
`;

export const allFaqsQuery = /* groq */ `
  *[_type == "faq"] | order(order asc)
`;

export const investmentProductsQuery = /* groq */ `
  *[_type == "investmentProduct"] | order(_createdAt desc)
`;

/** Thin typed-ish fetch helper. Replace `unknown` with generated types later. */
export async function sanityFetch<T = unknown>(
  query: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  return sanityClient.fetch<T>(query, params);
}
