import { LYCEE_ANNEES, LYCEE_MATIERES, TRIMESTRES, type LyceeMatiere } from "./studentLeadAnalytics";

export type LyceeAnneeKey = (typeof LYCEE_ANNEES)[number];
export type TrimKey = (typeof TRIMESTRES)[number];

export type BulletinParseResult = {
  annee: LyceeAnneeKey | null;
  trimestre: TrimKey | null;
  /** Moyennes détectées par matière (une ligne peut alimenter une seule matière). */
  matieres: Partial<Record<LyceeMatiere, number>>;
  /** Détail brut pour debug UI */
  matched: { matiere: LyceeMatiere; note: number; ligne: string }[];
  warnings: string[];
};

const SUBJECT_RULES: { test: (line: string) => boolean; matiere: LyceeMatiere }[] = [
  { test: (l) => /math[ée]mat|sp[ée]cialit[ée].*math|^maths?\b/i.test(l), matiere: "maths" },
  {
    test: (l) =>
      /sciences\s+[ée]conomiques|^\s*ses\b|économie\s+approfondie|économie\s+et\s+gestion/i.test(l),
    matiere: "physique_ou_eco",
  },
  {
    test: (l) =>
      /physique|chimie|si\b|science(s)?\s+de\s+l['’]ing[ée]nieur|enseignement\s+scientifique/i.test(
        l,
      ),
    matiere: "physique_ou_eco",
  },
  { test: (l) => /fran[çc]ais|litt[ée]rature/i.test(l), matiere: "francais_philo" },
  { test: (l) => /philo(?:sophie)?/i.test(l), matiere: "francais_philo" },
  {
    test: (l) =>
      /anglais|lv1|lv2|llcer|langues?\s+vivantes|espagnol|allemand|italien|portugais/i.test(l),
    matiere: "anglais",
  },
  { test: (l) => /histoire|g[ée]ographie|hgg?sp|\bhg\b/i.test(l), matiere: "histoire" },
  { test: (l) => /eps\b|sport|activit[ée]s?\s+physiques/i.test(l), matiere: "sport" },
];

function clamp20(n: number): number | null {
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 20) return null;
  return Math.round(n * 100) / 100;
}

/** Extrait une note /20 plausible sur une ligne de bulletin (évite les petits entiers type coefficient si possible). */
export function extractBulletinNoteFromLine(line: string): number | null {
  const s = line.replace(/\s+/g, " ").trim();
  if (/coef|coefficient|heures?\s*:\s*\d|absences?|retards?/i.test(s)) {
    const dec = s.match(/(\d{1,2})[,.](\d{1,2})\s*\/\s*20/);
    if (dec) return clamp20(parseFloat(`${dec[1]}.${dec[2]}`));
  }

  const slash = s.match(/(\d{1,2})[,.](\d{1,2})\s*\/\s*20|(\d{1,2})\s*\/\s*20/);
  if (slash) {
    if (slash[1] != null && slash[2] != null) {
      return clamp20(parseFloat(`${slash[1]}.${slash[2]}`));
    }
    if (slash[3]) return clamp20(parseInt(slash[3], 10));
  }

  const decimals = [...s.matchAll(/(\d{1,2})[,.](\d{1,2})\b/g)].map((m) =>
    clamp20(parseFloat(`${m[1]}.${m[2]}`)),
  );
  const validDec = decimals.filter((n): n is number => n != null);
  if (validDec.length === 1) return validDec[0];
  if (validDec.length > 1) {
    const likely = validDec.filter((n) => n >= 5);
    if (likely.length === 1) return likely[0];
    return validDec[0];
  }

  const ints = [...s.matchAll(/\b(\d{1,2})\b/g)].map((m) => clamp20(parseInt(m[1], 10)));
  const ok = ints.filter((n): n is number => n != null && n <= 20);
  if (ok.length === 1) return ok[0];
  if (ok.length > 1) {
    const big = ok.filter((n) => n >= 8);
    if (big.length >= 1) return big[0];
  }
  return null;
}

export function detectTrimestre(text: string): TrimKey | null {
  if (/1er\s*trim|premier\s*trim|trim\.?\s*1\b|trimestre\s*1/i.test(text)) return "t1";
  if (/2[èe]me\s*trim|second\s*trim|trim\.?\s*2\b|trimestre\s*2/i.test(text)) return "t2";
  if (/3[èe]me\s*trim|troisi[èe]me\s*trim|trim\.?\s*3\b|trimestre\s*3/i.test(text)) return "t3";
  return null;
}

export function detectAnneeLycee(text: string): LyceeAnneeKey | null {
  if (/terminale|\btle\b|term\.\s*es|term\.\s+l/i.test(text)) return "terminale";
  if (/premi[èe]re|\b1[èe]re\b/i.test(text)) return "premiere";
  if (/seconde|\b2nde\b/i.test(text)) return "seconde";
  return null;
}

export function hintsFromBulletinFilename(name: string): {
  trimestre: TrimKey | null;
  annee: LyceeAnneeKey | null;
} {
  const n = name.normalize("NFC");
  let trimestre: TrimKey | null = null;
  if (/1er|premier|_t1|\bt1\b|trim\s*1/i.test(n)) trimestre = "t1";
  else if (/2e|2ème|deuxi|_t2|\bt2\b|trim\s*2/i.test(n)) trimestre = "t2";
  else if (/3e|3ème|trois|_t3|\bt3\b|trim\s*3/i.test(n)) trimestre = "t3";

  let annee: LyceeAnneeKey | null = null;
  if (/term|tle|es\b|generale/i.test(n)) annee = "terminale";
  else if (/1ere|premiere|1[èe]re/i.test(n)) annee = "premiere";
  else if (/2nde|seconde/i.test(n)) annee = "seconde";

  return { trimestre, annee };
}

export function parseBulletinText(fullText: string, filename?: string): BulletinParseResult {
  const warnings: string[] = [];
  const matched: BulletinParseResult["matched"] = [];
  const buckets: Partial<Record<LyceeMatiere, number[]>> = {};

  const text = fullText.replace(/\r/g, "\n");
  let trimestre = detectTrimestre(text);
  let annee = detectAnneeLycee(text);
  if (filename) {
    const hint = hintsFromBulletinFilename(filename);
    if (!trimestre && hint.trimestre) trimestre = hint.trimestre;
    if (!annee && hint.annee) annee = hint.annee;
  }
  if (!trimestre) warnings.push("Trimestre non détecté — choisis-le manuellement avant d’appliquer.");
  if (!annee) warnings.push("Année (2nde / 1ère / Tle) non détectée — choisis-la manuellement.");

  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const raw of lines) {
    const line = raw.normalize("NFC");
    if (line.length < 4) continue;
    const rule = SUBJECT_RULES.find((r) => r.test(line));
    if (!rule) continue;
    const note = extractBulletinNoteFromLine(line);
    if (note == null) continue;
    if (!buckets[rule.matiere]) buckets[rule.matiere] = [];
    buckets[rule.matiere]!.push(note);
    matched.push({ matiere: rule.matiere, note, ligne: line.slice(0, 120) });
  }

  const matieres: Partial<Record<LyceeMatiere, number>> = {};
  for (const m of LYCEE_MATIERES) {
    const arr = buckets[m];
    if (!arr?.length) continue;
    matieres[m] = Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;
  }

  if (matched.length === 0) {
    warnings.push(
      "Aucune matière reconnue avec une note — le PDF est peut‑être scanné (image) ou la mise en page est atypique. Essaie un bulletin « texte » ou copie-colle le relevé.",
    );
  }

  return { annee, trimestre, matieres, matched, warnings };
}

export function bulletinMatieresToGradeKeys(
  annee: LyceeAnneeKey,
  trimestre: TrimKey,
  matieres: Partial<Record<LyceeMatiere, number>>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of LYCEE_MATIERES) {
    const v = matieres[m];
    if (v == null || !Number.isFinite(v)) continue;
    out[`${annee}_${trimestre}_${m}`] = v;
  }
  return out;
}
