import { motion } from "framer-motion";
import { MapPin, GraduationCap, School, Calendar } from "lucide-react";
import studentAvatar from "@/assets/student-avatar.jpg";

const StudentIdCard = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
      className="w-full h-full"
    >
      <div className="rounded-lg bg-card shadow-lg border border-border overflow-hidden h-full">
        {/* Color bar */}
        <div className="h-1.5 color-bar w-full" />

        <div className="p-6 md:p-8 flex flex-col items-center">
          {/* Header */}
          <div className="w-full mb-6">
            <h2 className="text-xl font-bold text-foreground">
              Carte Étudiante
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Identité & cursus
            </p>
          </div>

          {/* Avatar */}
          <div className="relative mb-5">
            <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-primary/20 shadow-lg">
              <img
                src={studentAvatar}
                alt="Photo de Lucas Morel"
                className="w-full h-full object-cover"
                width={512}
                height={512}
              />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full gradient-primary text-primary-foreground text-[11px] font-semibold shadow">
              Terminale
            </div>
          </div>

          {/* Name */}
          <h3 className="text-lg font-bold text-foreground">Lucas Morel</h3>
          <p className="text-sm text-muted-foreground mb-6">18 ans</p>

          {/* Info rows */}
          <div className="w-full space-y-3">
            <InfoRow
              icon={<MapPin className="w-4 h-4" />}
              label="Ville"
              value="Lyon, 69003"
            />
            <InfoRow
              icon={<School className="w-4 h-4" />}
              label="Établissement"
              value="Lycée du Parc"
            />
            <InfoRow
              icon={<GraduationCap className="w-4 h-4" />}
              label="Niveau"
              value="Lycée — Terminale"
            />
            <InfoRow
              icon={<Calendar className="w-4 h-4" />}
              label="Filière"
              value="Générale — Spé Maths / SES"
            />
          </div>

          {/* Score badge */}
          <div className="mt-6 w-full flex items-center justify-between px-4 py-3 rounded-lg bg-secondary">
            <span className="text-sm font-medium text-secondary-foreground">Score global</span>
            <span className="text-lg font-bold text-primary">88/100</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-secondary/60">
    <span className="text-primary">{icon}</span>
    <div className="flex flex-col">
      <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  </div>
);

export default StudentIdCard;
