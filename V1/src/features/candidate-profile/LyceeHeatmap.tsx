import {
  LYCEE_ANNEES,
  LYCEE_MATIERES,
  TRIMESTRES,
  matiereLabel,
} from "../../domain/studentLeadAnalytics";
import type { StudentLead } from "../../types/studentLead";

const COL_LABELS: string[] = [];
for (const annee of LYCEE_ANNEES) {
  const short = annee === "seconde" ? "2nde" : annee === "premiere" ? "1ère" : "Tle";
  for (const t of TRIMESTRES) {
    COL_LABELS.push(`${short} ${t.toUpperCase()}`);
  }
}

type Props = {
  student: StudentLead;
};

export function LyceeHeatmap({ student }: Props) {
  return (
    <div className="heatmap-scroll">
      <table className="heatmap-table">
        <thead>
          <tr>
            <th scope="col">Matière</th>
            {COL_LABELS.map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LYCEE_MATIERES.map((mat) => (
            <tr key={mat}>
              <th scope="row">{matiereLabel(mat)}</th>
              {LYCEE_ANNEES.flatMap((annee) =>
                TRIMESTRES.map((trim) => {
                  const key = `${annee}_${trim}_${mat}`;
                  const v = student.grades[key];
                  const display = v == null ? "—" : v.toFixed(2);
                  const heat =
                    v == null ? "heat-empty" : v >= 14 ? "heat-high" : v >= 11 ? "heat-mid" : "heat-low";
                  return (
                    <td key={key} className={`heatmap-cell ${heat}`}>
                      {display}
                    </td>
                  );
                }),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
