export type StudentLeadIdentity = {
  id: number;
  date_inscription: string;
  prenom: string;
  nom: string;
  niveau_actuel: string;
  ville: string;
  source_lead: string;
  ecole_actuelle: string;
  email: string;
  tel: string;
  /** Derniere colonne du CSV etudiants (apres les notes), si presente */
  type_etablissement?: string;
};

export type StudentLeadGrades = Record<string, number | null>;

export type StudentLead = StudentLeadIdentity & {
  grades: StudentLeadGrades;
};
