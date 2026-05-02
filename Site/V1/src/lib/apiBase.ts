/**
 * Base URL for HTTP API calls.
 * - Local dev: leave VITE_API_BASE_URL unset → same-origin `/api` (Vite proxy → backend).
 * - Production (Vercel): set VITE_API_BASE_URL to your deployed API origin, e.g. https://api.example.com
 */
export function getApiOrigin(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim();
  return raw ? raw.replace(/\/+$/, "") : "";
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origin = getApiOrigin();
  return origin ? `${origin}${normalizedPath}` : normalizedPath;
}
