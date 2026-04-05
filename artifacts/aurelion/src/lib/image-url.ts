/**
 * @module lib/image-url
 * @description Image URL resolver for AURELION.
 * Normalises image paths so they work in both development (`/`) and production
 * deployments where the app may be served from a sub-directory (e.g. `/app/`).
 */

/**
 * Resolve an image URL to its correct absolute path.
 *
 * Handles three cases:
 *  1. Nullish / empty  -> returns `undefined` (safe for `<img src>` fallback logic).
 *  2. Absolute URL (http/https) -> returned as-is (external images, CDN URLs).
 *  3. Root-relative path (starts with `/`) -> prepends the Vite `BASE_URL` so the
 *     image resolves correctly regardless of deployment sub-path.
 *  4. Anything else (relative path without leading `/`) -> returned as-is.
 *
 * @param url - The raw image URL from the API or static asset reference.
 * @returns The resolved URL string, or `undefined` if input was falsy.
 */
export function getImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  // External / CDN images — pass through unchanged
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // Root-relative paths — prepend Vite BASE_URL for sub-directory deployments
  if (url.startsWith("/")) {
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    return base + url;
  }
  return url;
}
