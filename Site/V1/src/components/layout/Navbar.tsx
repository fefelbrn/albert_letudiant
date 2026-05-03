import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../state/AuthContext";

export function Navbar() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <header className="navbar">
      <button className="nav-brand" type="button" onClick={() => navigate("/")}>
        <span className="logo-mark" aria-hidden>
          <img src="/assets/navicon.png" alt="" width={34} height={34} decoding="async" />
        </span>
        <p>
          L'Etudiant <strong>Simulateur</strong>
        </p>
      </button>

      <nav className="nav-links" aria-label="Navigation principale">
        <NavLink to="/">Accueil</NavLink>
        <NavLink to="/schools">Ecoles</NavLink>
        <NavLink to={isAuthenticated ? "/private" : "/login"}>Simulateur</NavLink>
        <NavLink to="/linkage">Réseau</NavLink>
      </nav>

      <div className="nav-actions">
        {!isAuthenticated ? (
          <>
            <button className="btn btn-soft" onClick={() => navigate("/login")}>
              Se connecter
            </button>
            <button className="btn btn-primary" onClick={() => navigate("/login")}>
              S'inscrire
            </button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={() => navigate("/private")}>
            Mon compte
          </button>
        )}
      </div>
    </header>
  );
}
