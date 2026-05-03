const PARTENAIRES = [
  {
    nom: "Superprof",
    desc: "Cours particuliers en ligne ou à domicile — maths, langues, prépa.",
    url: "https://www.superprof.fr",
  },
  {
    nom: "Acadomia",
    desc: "Accompagnement scolaire et stages intensifs.",
    url: "https://www.acadomia.fr",
  },
  {
    nom: "Preply",
    desc: "Professeurs de langues en visio (anglais, espagnol, etc.).",
    url: "https://preply.com",
  },
  {
    nom: "Complétude",
    desc: "Soutien scolaire et méthodologie.",
    url: "https://www.completude.com",
  },
  {
    nom: "Khan Academy",
    desc: "Ressources gratuites pour combler des bases (maths, sciences).",
    url: "https://fr.khanacademy.org",
  },
] as const;

export function PlateformesCoursPage() {
  return (
    <main className="section container plateformes-page">
      <header className="plateformes-header">
        <h2>Plateformes cours & coaching</h2>
        <p className="section-sub">
          Pistes pour monter en maths, langues ou méthodo quand tu prépares une grande école ou un master. Liens
          externes — à terme, partenariats B2B (tracking, offres dédiées) peuvent s’ajouter ici.
        </p>
      </header>

      <ul className="plateformes-grid">
        {PARTENAIRES.map((p) => (
          <li key={p.nom} className="plateformes-card">
            <h3>{p.nom}</h3>
            <p>{p.desc}</p>
            <a className="btn btn-soft" href={p.url} target="_blank" rel="noopener noreferrer">
              Ouvrir le site
            </a>
          </li>
        ))}
      </ul>

      <p className="plateformes-footnote">
        L’extension « Analyse formation » renvoie vers cette page depuis l’onglet « Cours ». Les marques citées sont des
        exemples de canaux ; aucune affiliation n’est activée dans cette version de démo.
      </p>
    </main>
  );
}
