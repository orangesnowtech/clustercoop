/**
 * Auth constants — edge-safe (no server-only imports). Shared by middleware,
 * route handlers and server helpers.
 *
 * The cookie is named `__session` deliberately: Firebase App Hosting / Cloud
 * CDN only forwards a cookie with that exact name to the origin.
 */
export const SESSION_COOKIE_NAME = "__session";

/** Session lifetime. Firebase session cookies allow up to 14 days; we use 5. */
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;
