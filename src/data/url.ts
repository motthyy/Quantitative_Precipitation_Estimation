export function resolveDataUrl(url: string): string {
  if (/^https?:\/\//.test(url)) {
    return url;
  }
  const normalized = url.replace(/^\//, '');
  return new URL(`${import.meta.env.BASE_URL}${normalized}`, window.location.origin).toString();
}

