import type { StudentLead } from "../types/studentLead";

export const LYCEE_MATIERES = [
  "maths",
  "francais_philo",
  "anglais",
  "histoire",
  "physique_ou_eco",
  "sport",
] as const;

export const LYCEE_ANNEES = ["seconde", "premiere", "terminale"] as const;
export const TRIMESTRES = ["t1", "t2", "t3"] as const;

export type LyceeMatiere = (typeof LYCEE_MATIERES)[number];

const MATIERE_LABELS: Record<LyceeMatiere, string> = {
  maths: "Maths",
  francais_philo: "Français-Philo",
  anglais: "Anglais",
  histoire: "Histoire",
  physique_ou_eco: "SES / économie (ou physique)",
  sport: "Sport",
};

const ANNEE_LABELS: Record<(typeof LYCEE_ANNEES)[number], string> = {
  seconde: "2nde",
  premiere: "1ère",
  terminale: "Tle",
};

export function matiereLabel(m: LyceeMatiere): string {
  return MATIERE_LABELS[m];
}

export type HeatmapCell = {
  key: string;
  annee: (typeof LYCEE_ANNEES)[number];
  trim: (typeof TRIMESTRES)[number];
  matiere: LyceeMatiere;
  value: number | null;
  label: string;
};

export function buildLyceeHeatmap(student: StudentLead): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  for (const annee of LYCEE_ANNEES) {
    for (const trim of TRIMESTRES) {
      for (const matiere of LYCEE_MATIERES) {
        const key = `${annee}_${trim}_${matiere}`;
        const value = student.grades[key] ?? null;
        const label = `${ANNEE_LABELS[annee]} ${trim.toUpperCase()}`;
        cells.push({ key, annee, trim, matiere, value, label });
      }
    }
  }
  return cells;
}

export type RadarAxis = {
  key: LyceeMatiere;
  label: string;
  value: number;
  /** 0–1 pour le tracé */
  normalized: number;
};

/**
 * Moyennes sur la terminale uniquement (T1–T3), par matière — pour le radar « profil lycée ».
 */
export function buildTerminaleRadar(student: StudentLead): RadarAxis[] {
  const axes: RadarAxis[] = [];
  for (const matiere of LYCEE_MATIERES) {
    const vals: number[] = [];
    for (const trim of TRIMESTRES) {
      const key = `terminale_${trim}_${matiere}`;
      const v = student.grades[key];
      if (v != null) vals.push(v);
    }
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    axes.push({
      key: matiere,
      label: matiereLabel(matiere),
      value: Math.round(avg * 100) / 100,
      normalized: Math.min(1, Math.max(0, avg / 20)),
    });
  }
  return axes;
}

export function averageNumeric(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
}

export function lyceeGradeValues(student: StudentLead): number[] {
  const out: number[] = [];
  for (const annee of LYCEE_ANNEES) {
    for (const trim of TRIMESTRES) {
      for (const matiere of LYCEE_MATIERES) {
        const v = student.grades[`${annee}_${trim}_${matiere}`];
        if (v != null) out.push(v);
      }
    }
  }
  return out;
}

export type SupGradeEntry = {
  key: string;
  value: number;
};

export function listSupGrades(student: StudentLead): SupGradeEntry[] {
  const entries: SupGradeEntry[] = [];
  for (const [key, raw] of Object.entries(student.grades)) {
    if (!/^(L[123]|M[12])_s[12]_/.test(key)) continue;
    if (raw == null) continue;
    entries.push({ key, value: raw });
  }
  return entries.sort((a, b) => a.key.localeCompare(b.key, "fr"));
}

export function formatSupKey(key: string): string {
  return key.replaceAll("_", " ");
}

export function globalScoreFromLyceeAvg(avgOn20: number | null): number | null {
  if (avgOn20 == null) return null;
  return Math.round((avgOn20 / 20) * 100);
}
