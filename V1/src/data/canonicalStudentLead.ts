import { parseStudentCsvRow } from "../domain/studentCsv";
import { CANONICAL_STUDENT_ROW_LINE, STUDENT_DATABASE_HEADER_LINE } from "./canonicalStudentCsv";

/** Profil étudiant aligné sur une ligne réelle du CSV `database_etudiants_300k.csv`. */
export const canonicalStudentLead = parseStudentCsvRow(
  STUDENT_DATABASE_HEADER_LINE,
  CANONICAL_STUDENT_ROW_LINE,
);
