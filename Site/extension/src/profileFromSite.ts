import type { ExtensionStudentProfile } from "./types";
import { defaultExtensionProfile } from "./types";

/** Aligné sur UserProfileProvider (V1) — clé localStorage. */
export const SITE_PROFILE_STORAGE_KEY = "v1_user_profile_leo_poc";
export const SITE_AUTH_STORAGE_KEY = "v1_auth";

type SiteUserProfile = {
  prenom?: string;
  nom?: string;
  niveau_scolaire?: string;
  etablissement_actuel?: string;
  etablissements_favoris?: string[];
  bulletins_synthese?: string;
  email?: string;
};

function clamp1to5(n: number): number {
  return Math.min(5, Math.max(1, Math.round(n)));
}

function scoreFromBulletins(text: string, subject: "maths" | "anglais" | "general"): number {
  const t = text.toLowerCase();
  if (!t.trim()) return 3;

  if (subject === "maths") {
    if (/(math|maths).{0,40}(faible|difficile|nul|gal[eè]re|stress)/i.test(t)) return 2;
    if (/(math|maths).{0,40}(fort|excellent|bon|16|17|18|19|20)/i.test(t)) return 4;
    if (/terminale.*s|filière.*s|spé.*math/i.test(t)) return 3;
  }
  if (subject === "anglais") {
    if (/(anglais|english).{0,40}(faible|difficile|nul)/i.test(t)) return 2;
    if (/(anglais|english|toeic|toefl).{0,40}(bon|c1|b2|c2|fluent|courant)/i.test(t)) return 4;
  }
  if (subject === "general") {
    if (/(motivation|projet).{0,30}(clair|solide|fort)/i.test(t)) return 4;
    if (/(perdu|pas sûr|hésite)/i.test(t)) return 2;
  }
  return 3;
}

export function siteJsonToExtensionProfile(
  raw: unknown,
  isAuthenticated: boolean,
): ExtensionStudentProfile {
  if (!isAuthenticated || !raw || typeof raw !== "object") {
    return defaultExtensionProfile();
  }
  const p = raw as SiteUserProfile;
  const bulletins = String(p.bulletins_synthese ?? "");

  const fav = Array.isArray(p.etablissements_favoris) ? p.etablissements_favoris.filter(Boolean) : [];

  return {
    maths: clamp1to5(scoreFromBulletins(bulletins, "maths")),
    anglais: clamp1to5(scoreFromBulletins(bulletins, "anglais")),
    redaction: clamp1to5(scoreFromBulletins(bulletins, "general")),
    motivation: clamp1to5(scoreFromBulletins(bulletins, "general")),
    filiere: [p.niveau_scolaire, p.etablissement_actuel].filter(Boolean).join(" — ") || "Non renseigné",
    objectif: fav.length ? fav.join(", ") : "Non renseigné",
    craintes: bulletins.slice(0, 500) || "—",
  };
}
