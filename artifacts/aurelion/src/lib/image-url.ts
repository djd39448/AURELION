export function getImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) {
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    return base + url;
  }
  return url;
}
