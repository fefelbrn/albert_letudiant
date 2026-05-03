import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

/** Démo : e-mail en ASCII pour coller à ce que `type="email"` affiche souvent ; léo avec accent marche aussi. */
const DEMO_EMAIL = "leo.martin114@mail.fr";
const DEMO_PASSWORD = "motdepasse";

function emailKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s/g, "");
}

function emailMatchesDemo(input: string): boolean {
  return emailKey(input) === emailKey(DEMO_EMAIL);
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "").trim();

    if (!emailMatchesDemo(email) || password !== DEMO_PASSWORD) {
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
        <input
          name="email"
          type="email"
          autoComplete="username"
          placeholder={DEMO_EMAIL}
          defaultValue={DEMO_EMAIL}
          required
        />
        <input
          name="password"
          type="password"
          autoComplete="current-password"
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
