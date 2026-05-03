import { canonicalStudentLead } from "../data/canonicalStudentLead";
import type { StudentLead } from "../types/studentLead";
import type { UserProfile } from "../types/userProfile";

/** Profil « dossier » affiché sur le tableau de bord : identité Mes datas + notes lycée surchargées. */
export function buildStudentLeadFromProfile(profile: UserProfile): StudentLead {
  const c = canonicalStudentLead;
  const grades = { ...c.grades };
  const lycee = profile.lycee_grades ?? {};
  for (const [k, v] of Object.entries(lycee)) {
    if (v != null && Number.isFinite(v)) grades[k] = v;
  }
  return {
    ...c,
    prenom: profile.prenom.trim() || c.prenom,
    nom: profile.nom.trim() || c.nom,
    niveau_actuel: profile.niveau_scolaire.trim() || c.niveau_actuel,
    ville: profile.ville.trim() || c.ville,
    email: profile.email.trim() || c.email,
    tel: profile.telephone.trim() || c.tel,
    ecole_actuelle: profile.etablissement_actuel.trim() || c.ecole_actuelle,
    grades,
  };
}
