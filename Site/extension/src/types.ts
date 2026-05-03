/** Données brutes + signaux extraits de la page (heuristiques, pas du scraping « magique »). */
export type ProgramKpis = {
  tuitionHints: string[];
  salaryHints: string[];
  signingBonusHints: string[];
  durationHints: string[];
  ectsHints: string[];
  internationalPctHints: string[];
  employmentRateHints: string[];
  languageHints: string[];
  deadlines: string[];
  careerOutcomes: string[];
  sectors: string[];
  curriculumKeywords: string[];
  prerequisites: string[];
  selectionKeywords: string[];
  accreditations: string[];
  classSizeHints: string[];
  rankingHints: string[];
  exchangeMentioned: boolean;
  internshipMentioned: boolean;
  doubleDegreeMentioned: boolean;
  scholarshipMentioned: boolean;
  remoteOptionMentioned: boolean;
  /** 0–100 : texte orienté maths / quanti / data */
  quantitativeFocusScore: number;
  /** 0–100 : exigence langue / international */
  languagePressureScore: number;
};

export type ProgramIntel = {
  sourceUrl: string;
  pageTitle: string;
  schoolNameGuess: string;
  programNameGuess: string;
  extractedAt: string;
  mainLang: string;
  /** Extrait utile pour debug / futur LLM */
  textFingerprint: string;
  headings: string[];
  /** Liens brochure : PDF + formulaires / pages « download brochure » (souvent sans .pdf) */
  brochurePdfUrls: string[];
  kpis: ProgramKpis;
};

export type ExtensionStudentProfile = {
  /** 1 = très faible … 5 = très à l’aise */
  maths: number;
  anglais: number;
  redaction: number;
  /** 1 = peu … 5 = très motivé */
  motivation: number;
  filiere: string;
  objectif: string;
  craintes: string;
};

export const defaultExtensionProfile = (): ExtensionStudentProfile => ({
  maths: 3,
  anglais: 3,
  redaction: 3,
  motivation: 3,
  filiere: "",
  objectif: "",
  craintes: "",
});

export type SimilarProfile = {
  prenom: string;
  parcours: string;
  angle: string;
};

export type AmbassadorHint = {
  nom: string;
  filiere: string;
  canal: string;
};

export type FitAnalysis = {
  forces: string[];
  faiblesses: string[];
  risques: string[];
  similarProfiles: SimilarProfile[];
  ambassadors: AmbassadorHint[];
  plans: { titre: string; etapes: string[] }[];
};
