import { useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/auth";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const from = useMemo(
    () => (location.state as { from?: string } | null)?.from || "/espace-prive",
    [location.state],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    login();
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connexion a ton compte</CardTitle>
          <CardDescription>Accede a ton espace prive et a ton profil candidat.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="email@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={255}
            />
            <Input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Button type="submit" className="w-full">
              Se connecter
            </Button>
          </form>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Retour a l'accueil ? <Link className="text-primary font-medium" to="/">Oui, revenir</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
