import type { RadarAxis } from "../../domain/studentLeadAnalytics";

type Props = {
  axes: RadarAxis[];
};

type RadarReference = {
  id: string;
  label: string;
  stroke: string;
  fill: string;
  valuesByKey: Partial<Record<RadarAxis["key"], number>>;
};

const REFERENCE_PROFILES: RadarReference[] = [
  {
    id: "hec",
    label: "Réf. HEC",
    stroke: "#1e88e5",
    fill: "rgba(30, 136, 229, 0.10)",
    valuesByKey: {
      maths: 15.8,
      francais_philo: 16.1,
      anglais: 16.8,
      histoire: 15.2,
      physique_ou_eco: 16.3,
      sport: 14.2,
    },
  },
  {
    id: "essec",
    label: "Réf. ESSEC",
    stroke: "#8e24aa",
    fill: "rgba(142, 36, 170, 0.10)",
    valuesByKey: {
      maths: 15.4,
      francais_philo: 16.4,
      anglais: 17.2,
      histoire: 15.5,
      physique_ou_eco: 16.0,
      sport: 13.9,
    },
  },
  {
    id: "escp",
    label: "Réf. ESCP",
    stroke: "#43a047",
    fill: "rgba(67, 160, 71, 0.10)",
    valuesByKey: {
      maths: 15.1,
      francais_philo: 16.0,
      anglais: 16.9,
      histoire: 15.6,
      physique_ou_eco: 15.8,
      sport: 14.4,
    },
  },
];

function polygonPointsFromAxes(
  axes: RadarAxis[],
  radiusFromValue: (axis: RadarAxis) => number,
  cx: number,
  cy: number,
) {
  const n = axes.length;
  return axes
    .map((axis, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const r = radiusFromValue(axis);
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function CompetenceRadar({ axes }: Props) {
  const n = axes.length;
  const cx = 50;
  const cy = 50;
  const rMax = 38;

  const points = polygonPointsFromAxes(axes, (axis) => rMax * axis.normalized, cx, cy);
  const referencePolygons = REFERENCE_PROFILES.map((ref) => ({
    ...ref,
    points: polygonPointsFromAxes(
      axes,
      (axis) => rMax * Math.min(1, Math.max(0, (ref.valuesByKey[axis.key] ?? 0) / 20)),
      cx,
      cy,
    ),
  }));

  const gridRings = [0.25, 0.5, 0.75, 1].map((t) => (
    <circle
      key={t}
      cx={cx}
      cy={cy}
      r={rMax * t}
      fill="none"
      stroke="var(--line)"
      strokeWidth={0.35}
    />
  ));

  const spokes = axes.map((_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const x = cx + rMax * Math.cos(angle);
    const y = cy + rMax * Math.sin(angle);
    return (
      <line
        key={i}
        x1={cx}
        y1={cy}
        x2={x}
        y2={y}
        stroke="var(--line)"
        strokeWidth={0.35}
      />
    );
  });

  const labels = axes.map((a, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const lr = rMax + 9;
    const x = cx + lr * Math.cos(angle);
    const y = cy + lr * Math.sin(angle);
    return (
      <text
        key={a.key}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="radar-label"
 >
        {a.label}
      </text>
    );
  });

  return (
    <div className="radar-wrap">
      <svg viewBox="0 0 100 100" className="radar-svg" role="img" aria-label="Profil de compétences terminale">
        {gridRings}
        {spokes}
        {referencePolygons.map((ref) => (
          <polygon
            key={ref.id}
            points={ref.points}
            stroke={ref.stroke}
            fill={ref.fill}
            strokeWidth={0.7}
            strokeDasharray="1.4 1"
          />
        ))}
        <polygon points={points} className="radar-poly" />
        {labels}
      </svg>
      <ul className="radar-legend">
        <li className="radar-legend-title">Référentiels (exemple)</li>
        {REFERENCE_PROFILES.map((ref) => (
          <li key={ref.id}>
            <span className="radar-ref-label">
              <i className="radar-ref-dot" style={{ background: ref.stroke }} />
              {ref.label}
            </span>
          </li>
        ))}
        <li className="radar-legend-title">Ton profil</li>
        {axes.map((a) => (
          <li key={a.key}>
            <span>{a.label}</span>
            <strong>{a.value.toFixed(2)}/20</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
