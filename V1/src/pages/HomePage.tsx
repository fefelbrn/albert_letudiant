import { useNavigate } from "react-router-dom";

const homeSchoolCards = [
  {
    name: "Ecole Polytechnique",
    city: "Palaiseau",
    description:
      "L'X forme des ingenieurs et scientifiques de haut niveau, avec une formation exigeante.",
    tags: ["Top 5", "Ingenieur", "Recherche"],
  },
  {
    name: "HEC Paris",
    city: "Jouy-en-Josas",
    description:
      "HEC Paris est la premiere ecole de commerce europeenne, formant les leaders de demain.",
    tags: ["Top 3", "Commerce", "International"],
  },
  {
    name: "Centrale Lyon",
    city: "Lyon",
    description: "Ecole Centrale de Lyon forme des ingenieurs generalistes de haut niveau.",
    tags: ["Ingenieur", "Generaliste", "Lyon"],
  },
];

export function HomePage() {
  const navigate = useNavigate();

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <p className="hero-badge">Nouveau - Simulateur d'Admission 2025</p>
          <h1>
            Est-ce que mon profil
            <br />
            <span>fit avec cette ecole ?</span>
          </h1>
          <p className="hero-sub">
            Comparez vos notes avec les bulletins reels d'anciens eleves qui ont integre
            l'ecole que vous visez.
          </p>
          <div className="hero-actions">
            <button className="btn btn-light" onClick={() => navigate("/login")}>
              Creer mon profil
            </button>
            <button className="btn btn-outline" onClick={() => navigate("/schools")}>
              Explorer les ecoles
            </button>
          </div>
        </div>
      </section>

      <section className="section container">
        <h2>Explorer les ecoles</h2>
        <p className="section-sub">
          Decouvrez les profils attendus et comparez-vous aux anciens eleves.
        </p>
        <div className="cards">
          {homeSchoolCards.map((school) => (
            <article className="school-card" key={school.name}>
              <h3>{school.name}</h3>
              <p className="meta">{school.city}</p>
              <p className="desc">{school.description}</p>
              <div className="tags">
                {school.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
