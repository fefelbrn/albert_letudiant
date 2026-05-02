import type { RadarAxis } from "../../domain/studentLeadAnalytics";

type Props = {
  axes: RadarAxis[];
};

export function CompetenceRadar({ axes }: Props) {
  const n = axes.length;
  const cx = 50;
  const cy = 50;
  const rMax = 38;

  const points = axes
    .map((a, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const r = rMax * a.normalized;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

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
        <polygon points={points} className="radar-poly" />
        {labels}
      </svg>
      <ul className="radar-legend">
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
