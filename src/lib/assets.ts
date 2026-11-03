/** Resolve local files from the site directory, including a GitHub project path. */
export function assetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = new URL(import.meta.env.BASE_URL, document.baseURI);
  return new URL(path.replace(/^\/+/, ''), base).href;
}
