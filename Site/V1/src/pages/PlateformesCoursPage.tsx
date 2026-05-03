import { useMemo, useState } from "react";

type Partenaire = {
  nom: string;
  desc: string;
  url: string;
  domain: string;
};

const PARTENAIRES: readonly Partenaire[] = [
  {
    nom: "Superprof",
    desc: "Cours particuliers en ligne ou à domicile — maths, langues, prépa.",
    url: "https://www.superprof.fr",
    domain: "superprof.fr",
  },
  {
    nom: "Acadomia",
    desc: "Accompagnement scolaire et stages intensifs.",
    url: "https://www.acadomia.fr",
    domain: "acadomia.fr",
  },
  {
    nom: "Preply",
    desc: "Professeurs de langues en visio (anglais, espagnol, etc.).",
    url: "https://preply.com",
    domain: "preply.com",
  },
  {
    nom: "Complétude",
    desc: "Soutien scolaire et méthodologie.",
    url: "https://www.completude.com",
    domain: "completude.com",
  },
  {
    nom: "Khan Academy",
    desc: "Ressources gratuites pour combler des bases (maths, sciences).",
    url: "https://fr.khanacademy.org",
    domain: "khanacademy.org",
  },
];

function PartnerLogo({ domain, label }: { domain: string; label: string }) {
  const initials = label
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const [broken, setBroken] = useState(false);
  const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;

  if (broken) {
    return (
      <div className="plateformes-card__logo-fallback" aria-hidden>
        {initials || "?"}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className="plateformes-card__logo"
      loading="lazy"
      width={72}
      height={72}
      onError={() => setBroken(true)}
    />
  );
}

export function PlateformesCoursPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PARTENAIRES;
    return PARTENAIRES.filter(
      (p) => p.nom.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <main className="section container plateformes-page">
      <header className="plateformes-header">
        <h2>Plateformes cours & coaching</h2>
        <p className="section-sub">
          Pistes pour monter en maths, langues ou méthodo quand tu prépares une grande école ou un master. Liens
          externes — à terme, partenariats B2B (tracking, offres dédiées) peuvent s’ajouter ici.
        </p>
      </header>

      <div className="plateformes-layout">
        <div className="plateformes-rail" aria-hidden>
          <span className="plateformes-rail__label">Plateformes</span>
        </div>

        <div className="plateformes-main">
          <div className="plateformes-toolbar" role="search">
            <span className="plateformes-toolbar__brand" aria-hidden>
              L’Étudiant
            </span>
            <label className="plateformes-toolbar__field">
              <span className="visually-hidden">Rechercher une plateforme</span>
              <svg className="plateformes-toolbar__search-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                />
              </svg>
              <input
                type="search"
                className="plateformes-toolbar__input"
                placeholder="Rechercher…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
            </label>
            <span className="plateformes-toolbar__filter" title="Filtrer" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"
                />
              </svg>
            </span>
          </div>

          <ul className="plateformes-list">
            {filtered.map((p) => (
              <li key={p.nom} className="plateformes-card">
                <div className="plateformes-card__logo-cell">
                  <div className="plateformes-card__logo-wrap">
                    <PartnerLogo domain={p.domain} label={p.nom} />
                  </div>
                </div>
                <div className="plateformes-card__body">
                  <h3>{p.nom}</h3>
                  <p>{p.desc}</p>
                  <a className="btn btn-soft plateformes-card__cta" href={p.url} target="_blank" rel="noopener noreferrer">
                    Ouvrir le site
                  </a>
                </div>
              </li>
            ))}
          </ul>

          {filtered.length === 0 ? (
            <p className="plateformes-empty">Aucun résultat pour « {query} ».</p>
          ) : null}
        </div>
      </div>

      <p className="plateformes-footnote">
        L’extension « Analyse formation » renvoie vers cette page depuis l’onglet « Cours ». Les marques citées sont des
        exemples de canaux ; aucune affiliation n’est activée dans cette version de démo.
      </p>
    </main>
  );
}
