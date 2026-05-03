import { LYCEE_ANNEES, LYCEE_MATIERES, TRIMESTRES, type LyceeMatiere } from "./studentLeadAnalytics";

export type LyceeAnneeKey = (typeof LYCEE_ANNEES)[number];
export type TrimKey = (typeof TRIMESTRES)[number];

export type BulletinParseResult = {
  annee: LyceeAnneeKey | null;
  trimestre: TrimKey | null;
  matieres: Partial<Record<LyceeMatiere, number>>;
  matched: { matiere: LyceeMatiere; note: number; ligne: string }[];
  warnings: string[];
};

/** Règle : ancre = libellé matière ; la note est lue après l’ancre (colonne Élève en priorité). */
type SubjectRule = { matiere: LyceeMatiere; anchor: RegExp; skipIfEcoOnly?: boolean };

const SUBJECT_RULES: SubjectRule[] = [
  {
    matiere: "maths",
    anchor: /\bmath[ée]matiques?\b|\bmaths?\b/i,
  },
  {
    matiere: "physique_ou_eco",
    anchor:
      /sciences\s+[ée]conomiques\s+et\s+sociales|sciences\s+[ée]conomiques\b|économie\s+approfondie|économie\s+et\s+gestion|économie\s+g[ée]n[ée]rale/i,
  },
  {
    matiere: "physique_ou_eco",
    anchor:
      /physique(?:[\s-]+chimie)?|chimie\b|enseignement\s+scientifique|\bSI\b(?!\s*\d)|sciences\s+de\s+l['’]ing[ée]nieur/i,
    skipIfEcoOnly: true,
  },
  { matiere: "francais_philo", anchor: /fran[çc]ais|litt[ée]rature/i },
  { matiere: "francais_philo", anchor: /\bphilo(?:sophie)?\b/i },
  {
    matiere: "anglais",
    anchor: /anglais|lv\s*1|lv\s*2|llcer|langues?\s+vivantes|espagnol|allemand|italien|portugais/i,
  },
  { matiere: "histoire", anchor: /histoire|g[ée]ographie|hgg?sp|\bHG\b|ens(eignement)?\s+moral\s+et\s+civique/i },
  { matiere: "sport", anchor: /\bEPS\b|éducation\s+physique|sport|activit[ée]s?\s+physiques/i },
];

/** Ligne « Spécialité : mathématiques » : ne doit pas remplir la case Maths générale du modèle. */
function isMathSpecialtyRow(line: string): boolean {
  return /sp[ée]cialit[ée]\s*:\s*math|sp[ée]cialit[ée][\s,]+math[ée]matiques/i.test(line);
}

/**
 * Ligne uniquement SES / économie sans physique : ne pas faire matcher la règle « physique/chimie »
 * (OCR ou PDF peut coller du bruit).
 */
/** Ligne typique SES sans discipline « physique » (évite les faux positifs OCR). */
function isEcoOnlyLine(line: string): boolean {
  const l = line.toLowerCase();
  const hasEco =
    /sciences\s+[ée]conomiques(\s+et\s+sociales)?|économie\s+et\s+sociale/i.test(l);
  if (!hasEco) return false;
  return !/physique|chimie|ensi(\s|$)|enseignement\s+scientifique/i.test(l);
}

function isLikelyNoiseLine(line: string): boolean {
  const l = line.toLowerCase();
  if (line.length > 240) return true;
  if (/\d{5}\s+[a-zéû]+/i.test(line) && /paris|lyon|marseille|toulouse/i.test(l)) return true;
  if (/boulevard|rue\s+de\s+l['’]|avenue\s+|place\s+des?\s+/i.test(line)) return true;
  if (/né\s+le\s+\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{2,4}/i.test(line)) return true;
  if (/collège\s+et\s+lycée|lycée\s+privé|académie\s+de/i.test(l)) return true;
  if (/fax|tél\.|téléphone|@|www\.|https?:\/\//i.test(line)) return true;
  if (
    /bulletin\s+du\s+\d/i.test(l) &&
    (/\d{2,3}\s+boulevard|rue\s+/i.test(line) || /axelmans|exelmans|mcc\s+axes/i.test(l))
  ) {
    return true;
  }
  return false;
}

function releveLineScore(line: string): number {
  let s = 0;
  const l = line.toLowerCase();
  if (/relevé|releve/i.test(line)) s += 6;
  if (/terminale|\btle\b|année\s+scolaire/i.test(line)) s += 3;
  if (/trimestre|1er\s+trim|2[èe]me\s+trim/i.test(line)) s += 2;
  if (/matière|matieres|disciplines?/i.test(line)) s += 2;
  if (/\/\s*20|moyenne|note\s*:/i.test(line)) s += 2;
  if (/él[eè]ve|moyennes?/i.test(line)) s += 1;
  if (line.length > 140) s -= 1;
  if (/élèves?\)/i.test(l)) s += 1;
  if (/sp[ée]cialit[ée]/i.test(line)) s -= 2;
  return s;
}

function clamp20(n: number): number | null {
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 20) return null;
  return Math.round(n * 100) / 100;
}

function parseDecimal(raw: string): number | null {
  const normalized = raw.replace(",", ".");
  const n = parseFloat(normalized);
  return clamp20(n);
}

/**
 * Note élève /20 dans le fragment après le nom de matière.
 * Les bulletins tabulaires ont souvent « Élève | Clas. » : on prend la **première** note quand deux décimales se suivent.
 */
export function extractBulletinNoteFromLine(fragment: string): number | null {
  const s = fragment.replace(/\s+/g, " ").trim();
  if (!s) return null;

  if (/coef|coefficient|absences?|retards?\s*:/i.test(s)) {
    const dec = s.match(/(\d{1,2})[,.](\d{1,2})\s*\/\s*20/);
    if (dec) return clamp20(parseFloat(`${dec[1]}.${dec[2]}`));
  }

  const slash = s.match(/(\d{1,2})[,.](\d{1,2})\s*\/\s*20|(\d{1,2})\s*\/\s*20\b/);
  if (slash) {
    if (slash[1] != null && slash[2] != null) {
      return clamp20(parseFloat(`${slash[1]}.${slash[2]}`));
    }
    if (slash[3]) return clamp20(parseInt(slash[3], 10));
  }

  const eleveLabel = s.match(
    /\bél[eè]ves?\b\s*[:=.]?\s*(\d{1,2}[,.]\d{1,2})\b|\bmoy\.?\s*él[eè]ve\s*[:=.]?\s*(\d{1,2}[,.]\d{1,2})\b/i,
  );
  if (eleveLabel) {
    const raw = eleveLabel[1] ?? eleveLabel[2];
    if (raw) {
      const v = parseDecimal(raw);
      if (v != null) return v;
    }
  }

  const pair = s.match(/(\d{1,2}[,.]\d{2})\s+(\d{1,2}[,.]\d{2})\b/);
  if (pair) {
    const a = parseDecimal(pair[1]);
    const b = parseDecimal(pair[2]);
    if (a != null && b != null) {
      return a;
    }
  }

  if (/\bclas[s]?\b|moy\.?\s*clas|moyenne\s+classe/i.test(s)) {
    const beforeClas = s.split(/\bclas[s]?\b|moy\.?\s*clas/i)[0];
    const decimals = [...beforeClas.matchAll(/(\d{1,2}[,.]\d{2})\b/g)].map((m) => parseDecimal(m[1]));
    const ok = decimals.filter((n): n is number => n != null);
    if (ok.length >= 1) {
      return ok[0];
    }
  }

  const decimals = [...s.matchAll(/(\d{1,2})[,.](\d{2})\b/g)].map((m) =>
    clamp20(parseFloat(`${m[1]}.${m[2]}`)),
  );
  const validDec = decimals.filter((n): n is number => n != null);
  if (validDec.length === 1) return validDec[0];
  if (validDec.length > 1) {
    const inRange = validDec.filter((n) => n >= 0 && n <= 20);
    return inRange[0] ?? null;
  }

  const ints = [...s.matchAll(/\b(\d{1,2})\b/g)].map((m) => clamp20(parseInt(m[1], 10)));
  const ok = ints.filter((n): n is number => n != null);
  if (ok.length === 1) return ok[0];
  if (ok.length > 1) {
    const big = ok.filter((n) => n >= 8);
    if (big.length === 1) return big[0];
    if (big.length > 1) return big[0];
  }
  return null;
}

type ScoredPick = {
  matiere: LyceeMatiere;
  note: number;
  ligne: string;
  score: number;
};

function betterPick(a: ScoredPick, b: ScoredPick): ScoredPick {
  if (b.score > a.score) return b;
  if (a.score > b.score) return a;
  if (b.note >= 8 && a.note < 8) return b;
  if (a.note >= 8 && b.note < 8) return a;
  return b.note >= a.note ? b : a;
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
  const picks = new Map<LyceeMatiere, ScoredPick>();

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
    if (isLikelyNoiseLine(line)) continue;

    const baseScore = releveLineScore(line);

    for (const { matiere, anchor, skipIfEcoOnly } of SUBJECT_RULES) {
      if (matiere === "maths" && isMathSpecialtyRow(line)) continue;
      if (skipIfEcoOnly && isEcoOnlyLine(line)) continue;

      const anchorCopy = new RegExp(anchor.source, anchor.flags);
      const m = anchorCopy.exec(line);
      if (!m) continue;
      const tail = line.slice(m.index + m[0].length);
      const note = extractBulletinNoteFromLine(tail);
      if (note == null) continue;

      let rowBonus = m.index < 20 ? 1 : 0;
      if (matiere === "maths" && !/sp[ée]cialit[ée]/i.test(line)) rowBonus += 2;

      const combined = baseScore + rowBonus;
      const candidate: ScoredPick = {
        matiere,
        note,
        ligne: line.slice(0, 200),
        score: combined,
      };
      const prev = picks.get(matiere);
      if (!prev) picks.set(matiere, candidate);
      else picks.set(matiere, betterPick(prev, candidate));
    }
  }

  const matieres: Partial<Record<LyceeMatiere, number>> = {};
  const matched: BulletinParseResult["matched"] = [];
  for (const m of LYCEE_MATIERES) {
    const p = picks.get(m);
    if (!p) continue;
    matieres[m] = p.note;
    matched.push({ matiere: m, note: p.note, ligne: p.ligne });
  }

  if (matched.length === 0) {
    warnings.push(
      "Aucune matière reconnue avec une note — le PDF est peut‑être scanné (image), mal ordonné, ou atypique. Essaie « Forcer l’OCR » ou un export texte du bulletin.",
    );
  } else if (matched.length < 3) {
    warnings.push(
      "Peu de matières extraites : si le relevé est sur plusieurs colonnes, le texte du PDF peut être mélangé. « Forcer l’OCR » ou un autre export peut aider.",
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
