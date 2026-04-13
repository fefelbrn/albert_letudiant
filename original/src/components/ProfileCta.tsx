import { motion } from "framer-motion";
import { ArrowRight, Mail, Phone, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ProfileCta = () => {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [moyenneGen, setMoyenneGen] = useState("");
  const [moyenneMaths, setMoyenneMaths] = useState("");
  const [moyenneFr, setMoyenneFr] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
      className="w-full"
    >
      <div className="rounded-lg bg-card shadow-lg border border-border overflow-hidden">
        <div className="h-1.5 color-bar w-full" />

        {!submitted ? (
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Complète ton profil
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Renseigne tes informations pour débloquer une analyse détaillée et des recommandations personnalisées.
                </p>
              </div>
              <div className="shrink-0 w-12 h-12 rounded-full gradient-primary flex items-center justify-center shadow-md">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Contact */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</p>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="ton@email.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={255}
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="06 12 34 56 78"
                    className="pl-9"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    maxLength={20}
                  />
                </div>
              </div>

              {/* Moyennes */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Moyennes</p>
                <Input
                  type="number"
                  placeholder="Moyenne générale (/20)"
                  min={0}
                  max={20}
                  step={0.1}
                  value={moyenneGen}
                  onChange={(e) => setMoyenneGen(e.target.value)}
                  required
                />
                <Input
                  type="number"
                  placeholder="Moyenne Maths (/20)"
                  min={0}
                  max={20}
                  step={0.1}
                  value={moyenneMaths}
                  onChange={(e) => setMoyenneMaths(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">&nbsp;</p>
                <Input
                  type="number"
                  placeholder="Moyenne Français (/20)"
                  min={0}
                  max={20}
                  step={0.1}
                  value={moyenneFr}
                  onChange={(e) => setMoyenneFr(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full gradient-primary text-primary-foreground font-semibold shadow-md hover:opacity-90 transition-opacity">
                  Débloquer mon analyse
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="p-6 md:p-8 text-center">
            <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 shadow-md">
              <TrendingUp className="w-6 h-6 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Profil complété !</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Ton analyse détaillée est en cours de génération. Tu recevras tes recommandations personnalisées très bientôt.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ProfileCta;
