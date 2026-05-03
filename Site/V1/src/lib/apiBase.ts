/**
 * Base URL for HTTP API calls.
 * - Local dev: leave VITE_API_BASE_URL unset → same-origin `/api` (Vite proxy → backend).
 * - Production: prefer `VITE_API_BASE_URL` on Vercel ; if absent, fallback sur l’API Render du déploiement POC.
 */
const DEFAULT_PROD_API_ORIGIN = "https://albert-letudiant.onrender.com";

export function getApiOrigin(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim();
  if (raw) {
    return raw.replace(/\/+$/, "");
  }
  if (import.meta.env.PROD) {
    return DEFAULT_PROD_API_ORIGIN.replace(/\/+$/, "");
  }
  return "";
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origin = getApiOrigin();
  return origin ? `${origin}${normalizedPath}` : normalizedPath;
}
