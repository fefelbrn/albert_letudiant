import { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login();
    navigate("/private");
  };

  return (
    <main className="auth-wrap">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Connexion</h2>
        <p>Connecte-toi pour acceder a ton espace prive enrichi.</p>
        <input type="email" placeholder="email@exemple.com" required />
        <input type="password" placeholder="Mot de passe" minLength={6} required />
        <button className="btn btn-primary" type="submit">
          Se connecter
        </button>
        <button className="btn btn-soft" type="button" onClick={() => navigate("/")}>
          Retour
        </button>
      </form>
    </main>
  );
}
