import type { StudentLead, StudentLeadGrades, StudentLeadIdentity } from "../types/studentLead";

function parseGradeCell(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse une ligne du CSV étudiants (séparateur virgule, pas de guillemets métiers).
 */
export function parseStudentCsvRow(headerLine: string, dataLine: string): StudentLead {
  const headers = headerLine.trim().split(",");
  const cells = dataLine.trim().split(",");

  if (headers.length !== cells.length) {
    throw new Error(
      `CSV incohérent: ${headers.length} colonnes d'en-tête vs ${cells.length} valeurs.`,
    );
  }

  const identity: StudentLeadIdentity = {
    id: Number(cells[0]),
    date_inscription: cells[1],
    prenom: cells[2],
    nom: cells[3],
    niveau_actuel: cells[4],
    ville: cells[5],
    source_lead: cells[6],
    ecole_actuelle: cells[7],
    email: cells[8],
    tel: cells[9],
  };

  if (!Number.isFinite(identity.id)) {
    throw new Error(`id étudiant invalide: ${cells[0]}`);
  }

  const grades: StudentLeadGrades = {};
  for (let i = 10; i < headers.length; i++) {
    const key = headers[i];
    if (!key) continue;
    grades[key] = parseGradeCell(cells[i] ?? "");
  }

  return { ...identity, grades };
}
