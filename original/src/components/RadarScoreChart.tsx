import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useState } from "react";

const subjects = ["Académique", "Soft Skills", "Technique", "Extrascolaire", "Réseau", "Langues"];

const schoolProfiles: Record<string, { scores: number[]; color: string }> = {
  HEC:              { scores: [97, 90, 75, 92, 98, 95], color: "hsl(220, 70%, 45%)" },
  ESSEC:            { scores: [95, 88, 72, 90, 95, 92], color: "hsl(200, 65%, 50%)" },
  ESCP:             { scores: [94, 86, 70, 88, 93, 93], color: "hsl(260, 55%, 55%)" },
  "Mines Paris":    { scores: [98, 70, 95, 65, 80, 85], color: "hsl(30, 80%, 50%)" },
  CentraleSupélec:  { scores: [97, 72, 96, 68, 82, 83], color: "hsl(45, 85%, 50%)" },
  "Polytechnique":  { scores: [99, 68, 98, 60, 85, 88], color: "hsl(0, 0%, 35%)" },
  "Paris 1 Sorbonne": { scores: [92, 82, 55, 78, 75, 90], color: "hsl(350, 60%, 45%)" },
  "Assas":          { scores: [90, 80, 50, 75, 78, 88], color: "hsl(160, 50%, 40%)" },
  "Sorbonne Univ.": { scores: [93, 78, 70, 72, 70, 92], color: "hsl(280, 50%, 50%)" },
};

const lucasScores = [95, 88, 82, 85, 78, 92];

const buildData = (selected: string[]) => {
  return subjects.map((subject, i) => {
    const entry: Record<string, string | number> = {
      subject,
      "Mon profil": lucasScores[i],
    };
    selected.forEach((name) => {
      entry[name] = schoolProfiles[name].scores[i];
    });
    return entry;
  });
};

const overallScore = Math.round(
  lucasScores.reduce((s, v) => s + v, 0) / lucasScores.length
);

const CustomTick = ({
  payload,
  x,
  y,
  textAnchor,
}: {
  payload: { value: string };
  x: number;
  y: number;
  textAnchor: string;
}) => (
  <text
    x={x}
    y={y}
    textAnchor={textAnchor}
    fill="hsl(0, 0%, 12%)"
    fontSize={12}
    fontWeight={600}
    fontFamily="Inter, system-ui, sans-serif"
  >
    {payload.value}
  </text>
);

const RadarScoreChart = () => {
  const [selected, setSelected] = useState<string[]>(["HEC", "Polytechnique"]);

  const toggle = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const data = buildData(selected);

  return (
    <div className="w-full h-full">
      <div className="rounded-lg bg-card shadow-lg border border-border overflow-hidden h-full flex flex-col">
        <div className="h-1.5 color-bar w-full" />

        <div className="p-6 md:p-8 flex flex-col flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Profil de compétences
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Compare-toi aux profils types des grandes écoles
              </p>
            </div>
            <div className="flex flex-col items-center justify-center w-16 h-16 rounded-full gradient-primary text-primary-foreground shadow-md">
              <span className="text-lg font-bold leading-none">{overallScore}</span>
              <span className="text-[10px] opacity-80">/100</span>
            </div>
          </div>

          {/* School toggles */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {Object.entries(schoolProfiles).map(([name, { color }]) => {
              const active = selected.includes(name);
              return (
                <button
                  key={name}
                  onClick={() => toggle(name)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all"
                  style={{
                    borderColor: color,
                    backgroundColor: active ? color : "transparent",
                    color: active ? "white" : color,
                    opacity: active ? 1 : 0.7,
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>

          {/* Chart */}
          <div className="w-full aspect-square max-h-[380px] flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                <PolarGrid stroke="hsl(340, 15%, 85%)" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="subject" tick={CustomTick} />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "linear-gradient(135deg, hsl(330, 90%, 45%), hsl(355, 90%, 48%))",
                    border: "none",
                    borderRadius: "10px",
                    color: "white",
                    fontSize: "12px",
                    fontFamily: "Inter, system-ui, sans-serif",
                    boxShadow: "0 8px 24px -8px hsla(345, 85%, 40%, 0.4)",
                  }}
                  formatter={(value: number, name: string) => [`${value}/100`, name]}
                />

                {/* School radars (behind) */}
                {selected.map((name) => (
                  <Radar
                    key={name}
                    name={name}
                    dataKey={name}
                    stroke={schoolProfiles[name].color}
                    fill={schoolProfiles[name].color}
                    fillOpacity={0.06}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                  />
                ))}

                {/* Lucas (on top) */}
                <Radar
                  name="Mon profil"
                  dataKey="Mon profil"
                  stroke="hsl(345, 85%, 50%)"
                  fill="hsl(345, 85%, 50%)"
                  fillOpacity={0.18}
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: "hsl(320, 80%, 55%)",
                    stroke: "hsl(345, 85%, 40%)",
                    strokeWidth: 2,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-3 justify-center">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-secondary text-secondary-foreground">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "hsl(345, 85%, 50%)" }} />
              Mon profil — {overallScore}
            </span>
            {selected.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full bg-secondary text-secondary-foreground"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: schoolProfiles[name].color }}
                />
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadarScoreChart;
