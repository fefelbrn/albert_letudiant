import { describe, expect, it } from "vitest";
import {
  bulletinMatieresToGradeKeys,
  extractBulletinNoteFromLine,
  hintsFromBulletinFilename,
  parseBulletinText,
} from "./bulletinParse";

describe("extractBulletinNoteFromLine", () => {
  it("prend la 1re note quand élève et moyenne de classe sont côte à côte", () => {
    expect(extractBulletinNoteFromLine(" 9,00 8,90 appréciation")).toBe(9);
    expect(extractBulletinNoteFromLine(" 9,88 7,52")).toBe(9.88);
  });

  it("lit une note après libellé Élève", () => {
    expect(extractBulletinNoteFromLine(" Élève 14,25 Clas. 12")).toBe(14.25);
  });

  it("notes isolées", () => {
    expect(extractBulletinNoteFromLine(" 19,00 — Année scolaire")).toBe(19);
    expect(extractBulletinNoteFromLine(" 14,50 /20")).toBe(14.5);
  });
});

describe("parseBulletinText", () => {
  it("ignore l’en-tête et garde la ligne relevé pour les maths", () => {
    const headerNoise =
      "Maths 7.00 — Collège et lycée MCC AXES 83 boulevard Exelmans 75016 Paris Bulletin du 1er Trimestre Luberne Féliz Né le 28/07/2003";
    const releveLine =
      "Maths 19.00 — Année scolaire : 2019/2020 Terminale ES (Tocqueville) (7 élèves) Relevé du 1er Trimestre Luberne Féliz Matières";
    const text = `${headerNoise}\n${releveLine}`;
    const r = parseBulletinText(text, "Bulletin_TerminaleES_1erTRIM2020.pdf");
    expect(r.matieres.maths).toBe(19);
  });

  it("Mathématiques générales vs Spécialité : mathématiques", () => {
    const text = [
      "Histoire-géographie 10,00 9,72",
      "Mathématiques 9,88 7,52",
      "Spécialité : mathématiques 10,73 10,20",
    ].join("\n");
    const r = parseBulletinText(text);
    expect(r.matieres.maths).toBe(9.88);
  });

  it("SES : note élève (9) pas moyenne classe (8,90)", () => {
    const text = "Sciences économiques et sociales 9,00 8,90 Très bien.";
    const r = parseBulletinText(text);
    expect(r.matieres.physique_ou_eco).toBe(9);
  });

  it("extrait plusieurs matières", () => {
    const text = [
      "Relevé du 1er trimestre — Terminale",
      "Mathématiques 15,50 14,00",
      "Sciences économiques et sociales 14,00 13,50",
      "Français 13,25 12,00",
      "Histoire-Géographie 11,00 10,50",
      "Anglais 16,00 15,00",
      "EPS 18,00 16,00",
    ].join("\n");
    const r = parseBulletinText(text);
    expect(r.matieres.maths).toBe(15.5);
    expect(r.matieres.physique_ou_eco).toBe(14);
    expect(r.matieres.francais_philo).toBe(13.25);
    expect(r.matieres.histoire).toBe(11);
    expect(r.matieres.anglais).toBe(16);
    expect(r.matieres.sport).toBe(18);
  });

  it("hintsFromBulletinFilename déduit T1 et terminale", () => {
    const h = hintsFromBulletinFilename("Bulletin_Luberne_Feliz_TerminleES_1erTRIM2020.pdf");
    expect(h.trimestre).toBe("t1");
    expect(h.annee).toBe("terminale");
  });
});

describe("bulletinMatieresToGradeKeys", () => {
  it("préfixe les clés lycée", () => {
    const keys = bulletinMatieresToGradeKeys("terminale", "t1", { maths: 14.5 });
    expect(keys).toEqual({ terminale_t1_maths: 14.5 });
  });
});
