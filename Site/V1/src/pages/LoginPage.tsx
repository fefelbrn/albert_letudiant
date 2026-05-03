import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

/** Aligné sur le nœud Student Neo4j / CSV id 114 (POC Linkage + HEC). */
const DEMO_EMAIL = "léo.martin114@mail.fr";
const DEMO_PASSWORD = "motdepasse";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (email !== DEMO_EMAIL.toLowerCase() || password !== DEMO_PASSWORD) {
      setError(`Identifiants incorrects. Compte demo : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
      return;
    }

    setError(null);
    login();
    navigate("/private");
  };

  return (
    <main className="auth-wrap">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Connexion</h2>
        <p>Connecte-toi pour acceder a ton espace prive enrichi.</p>
        <p className="section-sub" style={{ marginTop: 0 }}>
          Compte demo : <strong>{DEMO_EMAIL}</strong> / <strong>{DEMO_PASSWORD}</strong>
        </p>
        {error ? <p className="linkage-error">{error}</p> : null}
        <input name="email" type="email" placeholder={DEMO_EMAIL} defaultValue={DEMO_EMAIL} required />
        <input
          name="password"
          type="password"
          placeholder="motdepasse"
          minLength={6}
          defaultValue={DEMO_PASSWORD}
          required
        />
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
