import { motion } from "framer-motion";

const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const weeks = 12;

// Generate fake activity data
const generateData = () => {
  const data: number[][] = [];
  for (let w = 0; w < weeks; w++) {
    const week: number[] = [];
    for (let d = 0; d < 7; d++) {
      // More activity on weekdays
      const base = d < 5 ? 0.5 : 0.2;
      week.push(Math.random() > base ? Math.floor(Math.random() * 4) + 1 : 0);
    }
    data.push(week);
  }
  return data;
};

const activityData = generateData();

const getColor = (value: number) => {
  if (value === 0) return "hsl(340, 15%, 93%)";
  if (value === 1) return "hsl(345, 70%, 82%)";
  if (value === 2) return "hsl(345, 80%, 68%)";
  if (value === 3) return "hsl(345, 85%, 55%)";
  return "hsl(330, 90%, 45%)";
};

const totalActivity = activityData.flat().reduce((s, v) => s + v, 0);
const activeDays = activityData.flat().filter((v) => v > 0).length;

const ActivityHeatmap = () => {
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
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">Activité</h2>
              <p className="text-sm text-muted-foreground mt-1">
                12 dernières semaines
              </p>
            </div>
            <div className="flex flex-col items-center justify-center w-16 h-16 rounded-full gradient-primary text-primary-foreground">
              <span className="text-lg font-bold leading-none">{activeDays}</span>
              <span className="text-[10px] opacity-80">jours</span>
            </div>
          </div>

          {/* Heatmap grid */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex gap-1">
              {/* Day labels */}
              <div className="flex flex-col gap-1 mr-1 justify-center">
                {days.map((d) => (
                  <div
                    key={d}
                    className="h-5 flex items-center text-[10px] text-muted-foreground font-medium"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid */}
              {activityData.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1 flex-1">
                  {week.map((value, di) => (
                    <div
                      key={di}
                      className="aspect-square rounded-sm w-full min-h-[18px] max-h-[24px] transition-colors"
                      style={{ backgroundColor: getColor(value) }}
                      title={`${days[di]} S-${wi + 1}: ${value} activité(s)`}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">
                {totalActivity} interactions totales
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground mr-1">Moins</span>
                {[0, 1, 2, 3, 4].map((v) => (
                  <div
                    key={v}
                    className="w-3.5 h-3.5 rounded-sm"
                    style={{ backgroundColor: getColor(v) }}
                  />
                ))}
                <span className="text-[10px] text-muted-foreground ml-1">Plus</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ActivityHeatmap;
