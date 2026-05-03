/** Clés du type `terminale_t1_maths`, `premiere_t2_anglais`, etc. */
export type UserLyceeGrades = Record<string, number | null>;

export type UserProfile = {
  prenom: string;
  nom: string;
  age: string;
  date_naissance: string;
  niveau_scolaire: string;
  ville: string;
  email: string;
  telephone: string;
  etablissement_actuel: string;
  /** Texte libre : extraits de bulletins, appréciations, moyennes saisies à la main… */
  bulletins_synthese: string;
  /** Simulation : préciser si tu as déposé des scans / PDF */
  bulletins_fichiers_note: string;
  /** Surcharges des notes lycée (import PDF ou saisie) — fusionnées sur le profil CSV de démo. */
  lycee_grades: UserLyceeGrades;
  etablissements_favoris: string[];
};

export const emptyUserProfile = (): UserProfile => ({
  prenom: "",
  nom: "",
  age: "",
  date_naissance: "",
  niveau_scolaire: "",
  ville: "",
  email: "",
  telephone: "",
  etablissement_actuel: "",
  bulletins_synthese: "",
  bulletins_fichiers_note: "",
  lycee_grades: {},
  etablissements_favoris: [],
});
