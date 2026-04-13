import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CandidateProfileSection from "@/components/CandidateProfileSection";
import { logout } from "@/lib/auth";

const PrivateSpace = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-lg md:text-xl font-semibold">
              Espace prive - <span className="text-primary">L'Etudiant Simulateur</span>
            </p>
            <p className="text-sm text-muted-foreground">Bienvenue Lucas, voici ton suivi complet.</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Se deconnecter
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="infos" className="space-y-6">
          <TabsList className="h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
            <TabsTrigger value="infos" className="rounded-full border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Infos perso</TabsTrigger>
            <TabsTrigger value="events-futurs" className="rounded-full border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Futurs events inscrits</TabsTrigger>
            <TabsTrigger value="events" className="rounded-full border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Mes events</TabsTrigger>
            <TabsTrigger value="profil" className="rounded-full border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Mon profil candidat</TabsTrigger>
            <TabsTrigger value="datas" className="rounded-full border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Mes datas</TabsTrigger>
          </TabsList>

          <TabsContent value="infos">
            <Card>
              <CardHeader>
                <CardTitle>Informations personnelles</CardTitle>
                <CardDescription>Resume de ton compte et de ton parcours.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <Info label="Nom" value="Lucas Morel" />
                <Info label="Age" value="18 ans" />
                <Info label="Ville" value="Lyon, 69003" />
                <Info label="Etablissement" value="Lycee du Parc" />
                <Info label="Niveau" value="Terminale" />
                <Info label="Filiere" value="Generale - Spe Maths / SES" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events-futurs">
            <Card>
              <CardHeader>
                <CardTitle>Futurs events inscrits</CardTitle>
                <CardDescription>Les salons et rendez-vous a venir.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <EventItem title="Salon Post-Bac Paris 2026" date="15 mai 2026" status="Confirme" />
                <EventItem title="Meetup Ambassadeurs - Ecoles d'ingenieur" date="22 mai 2026" status="Inscrit" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>Mes events</CardTitle>
                <CardDescription>Historique de participation et ressources debloquees.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <EventItem title="Salon Orientation Lyon" date="02 mars 2026" status="Participe" />
                <EventItem title="Webinaire HEC x L'Etudiant" date="16 fev. 2026" status="Participe" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profil">
            <section className="gradient-cover py-6 px-4 rounded-xl text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground">Mon profil candidat</h2>
              <p className="text-primary-foreground/85 mt-1">
                Section Lovable integree : radar araignee, comparatif ecoles, heatmap et CTA profil.
              </p>
            </section>
            <div className="mt-4">
              <CandidateProfileSection />
            </div>
          </TabsContent>

          <TabsContent value="datas">
            <Card>
              <CardHeader>
                <CardTitle>Mes datas</CardTitle>
                <CardDescription>Notes, score global, statut d'acces et progression.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Info label="Score global" value="88/100" />
                <Info label="Moyenne generale" value="15.4/20" />
                <Info label="Acces bulletins ambassadeurs" value="Debloque apres scan QR code" />
                <Info label="Derniere mise a jour" value="Aujourd'hui" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border p-3 bg-card">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="font-medium mt-1">{value}</p>
  </div>
);

const EventItem = ({ title, date, status }: { title: string; date: string; status: string }) => (
  <div className="rounded-md border p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
    <div>
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{date}</p>
    </div>
    <span className="text-sm px-3 py-1 rounded-full bg-secondary text-secondary-foreground w-fit">{status}</span>
  </div>
);

export default PrivateSpace;
