/** Makes gallery/API image URLs absolute for Open Graph (crawlers require absolute https URLs). */
export function toAbsoluteUrl(resourceUrl: string | null | undefined, siteOrigin: string): string {
  const u = (resourceUrl ?? '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) return `https:${u}`;
  const origin = siteOrigin.replace(/\/$/, '');
  if (!origin) return u;
  if (u.startsWith('/')) return `${origin}${u}`;
  return `${origin}/${u}`;
}

export function truncatePlainText(text: string, maxLen: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}
