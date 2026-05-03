import { useCallback, useState } from "react";
import {
  bulletinMatieresToGradeKeys,
  type LyceeAnneeKey,
  parseBulletinText,
  type TrimKey,
} from "../../domain/bulletinParse";
import { LYCEE_MATIERES, matiereLabel } from "../../domain/studentLeadAnalytics";
import { useUserProfile } from "../../state/UserProfileContext";

const ANNEE_OPTIONS: { value: LyceeAnneeKey; label: string }[] = [
  { value: "seconde", label: "2nde" },
  { value: "premiere", label: "1ère" },
  { value: "terminale", label: "Terminale" },
];

const TRIM_OPTIONS: { value: TrimKey; label: string }[] = [
  { value: "t1", label: "Trimestre 1" },
  { value: "t2", label: "Trimestre 2" },
  { value: "t3", label: "Trimestre 3" },
];

export function BulletinPdfImport() {
  const { profile, updateProfile } = useUserProfile();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ReturnType<typeof parseBulletinText> | null>(null);
  const [annee, setAnnee] = useState<LyceeAnneeKey>("terminale");
  const [trim, setTrim] = useState<TrimKey>("t1");
  const [progress, setProgress] = useState<string | null>(null);
  const [usedOcr, setUsedOcr] = useState(false);
  const [forceOcr, setForceOcr] = useState(false);

  const onFile = useCallback(async (file: File | null) => {
    if (!file || file.type !== "application/pdf") {
      setErr("Choisis un fichier PDF.");
      return;
    }
    setErr(null);
    setBusy(true);
    setProgress(null);
    setUsedOcr(false);
    setParsed(null);
    setLastName(file.name);
    try {
      const { extractTextFromPdfFile } = await import("../../lib/extractPdfText");
      const { text, usedOcr: ocr } = await extractTextFromPdfFile(file, {
        forceOcr,
        onProgress: setProgress,
      });
      setUsedOcr(ocr);
      const result = parseBulletinText(text, file.name);
      setParsed(result);
      if (result.annee) setAnnee(result.annee);
      if (result.trimestre) setTrim(result.trimestre);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lecture du PDF impossible.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, [forceOcr]);

  const applyToProfile = useCallback(() => {
    if (!parsed) return;
    const keys = bulletinMatieresToGradeKeys(annee, trim, parsed.matieres);
    if (Object.keys(keys).length === 0) {
      setErr("Aucune note à appliquer — vérifie l’aperçu ou le fichier.");
      return;
    }
    updateProfile({
      lycee_grades: { ...profile.lycee_grades, ...keys },
      bulletins_fichiers_note: lastName ?? profile.bulletins_fichiers_note,
    });
    setErr(null);
  }, [parsed, annee, trim, profile.lycee_grades, profile.bulletins_fichiers_note, lastName, updateProfile]);

  const clearImportedGrades = useCallback(() => {
    updateProfile({ lycee_grades: {} });
    setErr(null);
  }, [updateProfile]);

  const overrideCount = Object.keys(profile.lycee_grades ?? {}).length;

  return (
    <div className="bulletin-import">
      <p className="bulletin-import__intro">
        Dépose un bulletin PDF : on lit d’abord le texte intégré ; si c’est un scan ou peu de texte, l’OCR
        (Tesseract) prend le relais. Les en-têtes (adresse, établissement) sont ignorés ; on garde la ligne qui
        ressemble le plus à un relevé (« Relevé », trimestre…). Si le bandeau indique « texte du PDF » mais les
        notes sont fausses, coche « Forcer l’OCR ».
      </p>

      <label className="bulletin-import__force">
        <input
          type="checkbox"
          checked={forceOcr}
          onChange={(e) => setForceOcr(e.target.checked)}
        />
        <span>Forcer l’OCR (ignorer le texte du PDF — utile si la couche texte est fausse)</span>
      </label>

      <div
        className={`bulletin-import__drop ${busy ? "bulletin-import__drop--busy" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          void onFile(f ?? null);
        }}
      >
        <input
          type="file"
          accept="application/pdf"
          className="bulletin-import__file"
          id="bulletin-pdf-input"
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
        />
        <label htmlFor="bulletin-pdf-input" className="bulletin-import__label">
          {busy
            ? progress ?? "Traitement en cours…"
            : "Glisse un PDF ici ou clique pour choisir un fichier"}
        </label>
      </div>

      {busy && progress ? <p className="bulletin-import__progress">{progress}</p> : null}

      {err ? <p className="bulletin-import__error">{err}</p> : null}

      {parsed ? (
        <div className="bulletin-import__preview">
          <p className={`bulletin-import__source ${usedOcr ? "bulletin-import__source--ocr" : ""}`}>
            {usedOcr
              ? "Source : OCR (document numérisé) — contrôle les notes extraites."
              : "Source : texte du PDF — import rapide."}
          </p>
          <div className="bulletin-import__row">
            <label className="field bulletin-import__field">
              <span>Année</span>
              <select value={annee} onChange={(e) => setAnnee(e.target.value as LyceeAnneeKey)}>
                {ANNEE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field bulletin-import__field">
              <span>Trimestre</span>
              <select value={trim} onChange={(e) => setTrim(e.target.value as TrimKey)}>
                {TRIM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {parsed.warnings.length ? (
            <ul className="bulletin-import__warnings">
              {parsed.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}

          {Object.keys(parsed.matieres).length === 0 ? (
            <p className="bulletin-import__muted">Aucune matière extraite pour l’instant.</p>
          ) : (
            <table className="bulletin-import__table">
              <thead>
                <tr>
                  <th>Matière</th>
                  <th>Note /20</th>
                  <th>Clé enregistrée</th>
                </tr>
              </thead>
              <tbody>
                {LYCEE_MATIERES.filter((m) => parsed.matieres[m] != null).map((m) => (
                  <tr key={m}>
                    <td>{matiereLabel(m)}</td>
                    <td>{parsed.matieres[m]!.toFixed(2)}</td>
                    <td>
                      <code className="bulletin-import__code">
                        {annee}_{trim}_{m}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="bulletin-import__actions">
            <button type="button" className="btn btn-primary" onClick={applyToProfile}>
              Appliquer au profil
            </button>
            <button type="button" className="btn btn-soft" onClick={clearImportedGrades}>
              Effacer les surcharges de notes ({overrideCount})
            </button>
          </div>

          {parsed.matched.length > 0 ? (
            <details className="bulletin-import__details">
              <summary>Lignes détectées ({parsed.matched.length})</summary>
              <ul>
                {parsed.matched.map((row, i) => (
                  <li key={`${row.matiere}-${i}`}>
                    <strong>{matiereLabel(row.matiere)}</strong> · {row.note.toFixed(2)} —{" "}
                    <span className="bulletin-import__muted">{row.ligne}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
