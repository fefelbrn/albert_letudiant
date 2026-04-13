import { canonicalStudentLead } from "../../data/canonicalStudentLead";
import {
  LYCEE_MATIERES,
  TRIMESTRES,
  averageNumeric,
  buildTerminaleRadar,
  formatSupKey,
  globalScoreFromLyceeAvg,
  listSupGrades,
  lyceeGradeValues,
} from "../../domain/studentLeadAnalytics";
import type { StudentLead } from "../../types/studentLead";
import { CompetenceRadar } from "./CompetenceRadar";
import { LyceeHeatmap } from "./LyceeHeatmap";

type Props = {
  student?: StudentLead;
};

export function CandidateProfileDashboard({ student = canonicalStudentLead }: Props) {
  const lyceeVals = lyceeGradeValues(student);
  const moyLycee = averageNumeric(lyceeVals);

  const terminaleOnly = TRIMESTRES.flatMap((t) =>
    LYCEE_MATIERES.map((m) => student.grades[`terminale_${t}_${m}`] ?? null),
  );
  const moyTle = averageNumeric(terminaleOnly);
  const scoreGlobal = globalScoreFromLyceeAvg(moyLycee);
  const radarAxes = buildTerminaleRadar(student);
  const supGrades = listSupGrades(student);

  return (
    <div className="candidate-dashboard">
      <header className="candidate-dashboard__head">
        <div>
          <p className="candidate-dashboard__eyebrow">Profil candidat</p>
          <h3>
            {student.prenom} {student.nom}
          </h3>
          <p className="candidate-dashboard__meta">
            {student.niveau_actuel} · {student.ecole_actuelle} · {student.ville}
          </p>
        </div>
        <div className="candidate-dashboard__chips">
          <span className="chip chip-muted">Inscrit le {student.date_inscription}</span>
          <span className="chip chip-muted">{student.source_lead}</span>
        </div>
      </header>

      <section className="candidate-kpis">
        <article className="candidate-kpi">
          <h4>Moyenne lycée</h4>
          <p className="candidate-kpi__value">{moyLycee != null ? `${moyLycee}/20` : "—"}</p>
          <p className="candidate-kpi__hint">Toutes notes renseignées (2nde → Tle)</p>
        </article>
        <article className="candidate-kpi">
          <h4>Moyenne terminale</h4>
          <p className="candidate-kpi__value">{moyTle != null ? `${moyTle}/20` : "—"}</p>
          <p className="candidate-kpi__hint">Trimestres T1 à T3</p>
        </article>
        <article className="candidate-kpi">
          <h4>Score global</h4>
          <p className="candidate-kpi__value">
            {scoreGlobal != null ? `${scoreGlobal}/100` : "—"}
          </p>
          <p className="candidate-kpi__hint">Dérivé de la moyenne lycée</p>
        </article>
      </section>

      <div className="candidate-dashboard__grid">
        <section className="candidate-panel">
          <header className="candidate-panel__head">
            <h4>Profil compétences (terminale)</h4>
            <p>Moyenne par matière sur la terminale</p>
          </header>
          <CompetenceRadar axes={radarAxes} />
        </section>

        <section className="candidate-panel candidate-panel--wide">
          <header className="candidate-panel__head">
            <h4>Notes lycée</h4>
            <p>Vue matière × période (données CSV étudiants)</p>
          </header>
          <LyceeHeatmap student={student} />
        </section>
      </div>

      <section className="candidate-panel">
        <header className="candidate-panel__head">
          <h4>Supérieur (données présentes)</h4>
          <p>Colonnes L1–M2 remplies pour ce profil (peuvent être partielles selon le générateur)</p>
        </header>
        {supGrades.length === 0 ? (
          <p className="candidate-empty">Aucune note supérieure renseignée pour ce dossier.</p>
        ) : (
          <ul className="sup-grade-list">
            {supGrades.map(({ key, value }) => (
              <li key={key}>
                <span className="sup-grade-list__key">{formatSupKey(key)}</span>
                <span className="sup-grade-list__val">{value.toFixed(2)}/20</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="candidate-dashboard__foot">
        <p>
          <strong>Contact :</strong> {student.email} · {student.tel}
        </p>
      </footer>
    </div>
  );
}
