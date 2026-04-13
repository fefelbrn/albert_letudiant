import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

// Matières et trimestres
const subjects = [
  "Maths", "Français", "Anglais", "Histoire", "Physique",
  "SVT", "Philo", "SES", "Sport", "LV2",
];
const periods = [
  "Sept", "Oct", "Nov", "Déc", "Jan", "Fév",
  "Mars", "Avr", "Mai", "Juin",
];

// Notes simulées (0-20) pour Lucas — bon élève
const generateGrades = (): number[][] => {
  const base = [17, 14, 15, 13, 16, 14, 12, 15, 16, 13];
  return periods.map((_, pi) =>
    base.map((b) => {
      const trend = pi * 0.15; // légère progression
      const noise = (Math.random() - 0.5) * 4;
      return Math.min(20, Math.max(4, Math.round((b + trend + noise) * 10) / 10));
    })
  );
};

const grades = generateGrades();

// Interpolation bilinéaire pour un rendu fluide
const interpolate = (
  data: number[][],
  x: number,
  y: number,
  rows: number,
  cols: number
): number => {
  const xi = Math.min(Math.max(x, 0), cols - 1);
  const yi = Math.min(Math.max(y, 0), rows - 1);
  const x0 = Math.floor(xi);
  const x1 = Math.min(x0 + 1, cols - 1);
  const y0 = Math.floor(yi);
  const y1 = Math.min(y0 + 1, rows - 1);
  const fx = xi - x0;
  const fy = yi - y0;
  const v00 = data[y0][x0];
  const v10 = data[y0][x1];
  const v01 = data[y1][x0];
  const v11 = data[y1][x1];
  return v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;
};

// Color scale: blue (low) → cyan → green → yellow → orange → red (high)
const valueToColor = (v: number): [number, number, number] => {
  const t = Math.min(Math.max((v - 4) / 16, 0), 1); // normalize 4-20 to 0-1
  const stops: [number, number, number, number][] = [
    [0, 30, 60, 180],      // deep blue (low)
    [0.25, 200, 50, 80],   // rose/red
    [0.5, 220, 80, 140],   // pink
    [0.75, 250, 200, 60],  // yellow
    [1.0, 220, 40, 50],    // vibrant red (high)
  ];
  let i = 0;
  for (i = 0; i < stops.length - 1; i++) {
    if (t <= stops[i + 1][0]) break;
  }
  const [t0, r0, g0, b0] = stops[i];
  const [t1, r1, g1, b1] = stops[Math.min(i + 1, stops.length - 1)];
  const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
  return [
    Math.round(r0 + (r1 - r0) * f),
    Math.round(g0 + (g1 - g0) * f),
    Math.round(b0 + (b1 - b0) * f),
  ];
};

const SubjectHeatmap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rows = grades.length;
  const cols = grades[0].length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.createImageData(w, h);

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const dataX = (px / (w - 1)) * (cols - 1);
        const dataY = (py / (h - 1)) * (rows - 1);
        const val = interpolate(grades, dataX, dataY, rows, cols);
        const [r, g, b] = valueToColor(val);
        const idx = (py * w + px) * 4;
        imgData.data[idx] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, []);

  const avgGrade =
    Math.round(
      (grades.flat().reduce((s, v) => s + v, 0) / grades.flat().length) * 10
    ) / 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
      className="w-full h-full"
    >
      <div className="rounded-lg bg-card shadow-lg border border-border overflow-hidden h-full flex flex-col">
        <div className="h-1.5 color-bar w-full" />

        <div className="p-6 md:p-8 flex flex-col flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Heatmap Notes
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Évolution par matière
              </p>
            </div>
            <div className="flex flex-col items-center justify-center w-16 h-16 rounded-full gradient-primary text-primary-foreground">
              <span className="text-lg font-bold leading-none">{avgGrade}</span>
              <span className="text-[10px] opacity-80">/20</span>
            </div>
          </div>

          {/* Heatmap */}
          <div className="flex-1 flex flex-col justify-center min-h-0">
            {/* Subject labels (top) */}
            <div className="flex ml-10 mb-1">
              {subjects.map((s) => (
                <span
                  key={s}
                  className="flex-1 text-[9px] text-muted-foreground font-medium text-center truncate"
                >
                  {s}
                </span>
              ))}
            </div>

            <div className="flex flex-1 min-h-0">
              {/* Period labels (left) */}
              <div className="flex flex-col justify-between w-10 shrink-0 pr-1">
                {periods.map((p) => (
                  <span
                    key={p}
                    className="text-[10px] text-muted-foreground font-medium text-right leading-none"
                  >
                    {p}
                  </span>
                ))}
              </div>

              {/* Canvas */}
              <div className="flex-1 rounded-md overflow-hidden relative">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={300}
                  className="w-full h-full"
                  style={{ imageRendering: "auto" }}
                />
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10px] text-muted-foreground">4/20</span>
              <div
                className="flex-1 mx-2 h-2.5 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, rgb(30,60,180), rgb(200,50,80), rgb(220,80,140), rgb(250,200,60), rgb(220,40,50))",
                }}
              />
              <span className="text-[10px] text-muted-foreground">20/20</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SubjectHeatmap;
