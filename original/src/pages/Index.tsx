import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, CircleUserRound, BarChart3, ShieldCheck } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <p className="text-lg md:text-xl font-semibold">
            L'Etudiant <span className="text-primary">Simulateur</span>
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/connexion">Se connecter</Link>
            </Button>
            <Button asChild>
              <Link to="/connexion">S'inscrire</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="gradient-cover py-14 md:py-24 px-4 text-center">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-primary-foreground tracking-tight">
          Est-ce que mon profil fit avec cette ecole ?
        </h1>
        <p className="text-primary-foreground/85 mt-4 text-base md:text-xl max-w-3xl mx-auto">
          Connecte-toi pour acceder a ton espace prive enrichi : infos perso, prochains salons,
          mes events, et ton profil candidat avec radar + comparatifs multi-ecoles.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg" variant="secondary">
            <Link to="/connexion">Commencer</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="bg-transparent text-primary-foreground border-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground">
            <Link to="/connexion">J'ai deja un compte</Link>
          </Button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10 md:py-14">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">Ce que tu trouveras dans l'espace prive</h2>
        <p className="text-muted-foreground mb-6">Une interface unique qui centralise ton parcours candidat.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2"><CircleUserRound className="w-5 h-5 text-primary" /> Infos perso</CardTitle>
            </CardHeader>
            <CardContent><CardDescription>Coordonnees, etablissement, filiere, niveau et preferences.</CardDescription></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" /> Mes events</CardTitle>
            </CardHeader>
            <CardContent><CardDescription>Inscriptions salons, futurs evenements et historique de participation.</CardDescription></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Mon profil candidat</CardTitle>
            </CardHeader>
            <CardContent><CardDescription>Radar araignee, heatmap et comparaison avec les ecoles cibles.</CardDescription></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> Mes datas</CardTitle>
            </CardHeader>
            <CardContent><CardDescription>Vue unifiee des bulletins, scores et donnees collectées.</CardDescription></CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Index;
