/** Front web du simulateur (page partenaires, etc.). À adapter si ton domaine Vercel change. */
export const SITE_ORIGIN = "https://albert-letudiant.vercel.app";

export function simulateurBaseUrl(): string {
  return SITE_ORIGIN.replace(/\/+$/, "");
}

export function simulateurLoginUrl(): string {
  return `${simulateurBaseUrl()}/login`;
}

export function plateformesUrl(): string {
  return `${simulateurBaseUrl()}/plateformes-cours`;
}
