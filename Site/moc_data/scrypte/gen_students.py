from pathlib import Path

import numpy as np
import pandas as pd

def generate_student_leads(n=300000):
    print(f"Lancement de la génération de {n} lignes...")
    
    # --- Référentiels ---
    villes = ["Paris", "Lyon", "Marseille", "Bordeaux", "Lille", "Nantes", "Toulouse", "Nice", "Strasbourg", "Montpellier"]
    niveaux = ["2nde", "1ère", "Terminale", "Bac+1", "Bac+2", "Bac+3", "Bac+4", "Bac+5", "Doctorat", "Diplômé (Alumni)"]
    types_etablissement = ["Collège Public", "Lycée Privé", "Lycée Public", "Université", "École de Commerce", "École d'Ingénieur", "IUT", "BTS"]
    sources = ["Salon l'Étudiant Paris", "QR Code Lycée", "Recherche Google", "Instagram Ad", "Parrainage", "TikTok"]
    
    # --- Pré-génération des données de base pour la vitesse ---
    ids = np.arange(1, n + 1)
    # Distribution des niveaux (plus de lycéens et licences que de doctorants)
    probs = [0.15, 0.15, 0.20, 0.15, 0.10, 0.10, 0.05, 0.05, 0.03, 0.02]
    user_levels = np.random.choice(niveaux, n, p=probs)
    
    data = {
        "id": ids,
        "date_inscription": pd.to_datetime(
            np.random.choice(pd.date_range("2025-01-01", "2026-04-01"), n)
        ),
        "prenom": np.random.choice(["Léo", "Manon", "Gabriel", "Jade", "Lucas", "Louise", "Hugo", "Alice", "Arthur", "Léa"], n),
        "nom": np.random.choice(["Martin", "Bernard", "Thomas", "Petit", "Robert", "Richard", "Durand", "Dubois", "Moreau", "Laurent"], n),
        "niveau_actuel": user_levels,
        "ville": np.random.choice(villes, n),
        "source_lead": np.random.choice(sources, n),
        "ecole_actuelle": np.random.choice(["Lycée Condorcet", "Université Paris-Saclay", "Lycée Henri IV", "INSA", "Epitech", "HEC", "Sorbonne"], n)
    }

    df = pd.DataFrame(data)
    df["email"] = df["prenom"].str.lower() + "." + df["nom"].str.lower() + df["id"].astype(str) + "@mail.fr"
    df["tel"] = "06" + np.random.randint(10000000, 99999999, n).astype(str)

    # Profil de reference en premiere ligne, aligne avec le CSV ambassadeurs.
    # Ceci permet d'avoir toujours un "compte etudiant de base" stable pour les demos Linkage.
    if len(df) > 0:
        df.loc[0, "id"] = 1
        df.loc[0, "prenom"] = "Thomas"
        df.loc[0, "nom"] = "Bernard"
        df.loc[0, "niveau_actuel"] = "Bac+3"
        df.loc[0, "ville"] = "Toulouse"
        df.loc[0, "ecole_actuelle"] = "ENSA Lyon"
        df.loc[0, "email"] = "thomas.bernard1@etudiant.fr"
        df.loc[0, "tel"] = "0639397519"

    # --- Génération des colonnes de notes (150+ colonnes) ---
    # On crée une "Performance de base" par étudiant pour garder une cohérence (un bon élève reste bon)
    base_notes = np.random.uniform(8, 17, n)

    # Lycée : 3 ans * 3 trimestres * 6 matières = 54 colonnes
    annees_lycee = ["seconde", "premiere", "terminale"]
    matieres_lycee = ["maths", "francais_philo", "anglais", "histoire", "physique_ou_eco", "sport"]
    
    for annee in annees_lycee:
        for t in ["t1", "t2", "t3"]:
            for mat in matieres_lycee:
                col_name = f"{annee}_{t}_{mat}"
                # On génère des notes cohérentes avec la base_notes
                df[col_name] = np.round(np.clip(base_notes + np.random.normal(0, 1.5, n), 0, 20), 2)
                
                # Règle de cohérence : si l'étudiant est en 2nde, les notes de Terminale sont vides
                if annee == "premiere":
                    df.loc[df["niveau_actuel"] == "2nde", col_name] = np.nan
                if annee == "terminale":
                    df.loc[df["niveau_actuel"].isin(["2nde", "1ère"]), col_name] = np.nan

    # Supérieur : 5 ans * 2 semestres * 5 matières = 50 colonnes
    annees_sup = ["L1", "L2", "L3", "M1", "M2"]
    matieres_sup = ["majeure", "anglais", "projets", "option", "moyenne_G"]

    for annee in annees_sup:
        for s in ["s1", "s2"]:
            for mat in matieres_sup:
                col_name = f"{annee}_{s}_{mat}"
                df[col_name] = np.round(np.clip(base_notes + np.random.normal(-1, 2, n), 0, 20), 2)
                
                # Cohérence : vider les notes si le niveau n'est pas encore atteint
                # Logique simplifiée : si niveau_actuel ne contient pas l'année ou année sup
                if annee == "L1" and any(x in user_levels for x in ["2nde", "1ère", "Terminale"]):
                    df.loc[df["niveau_actuel"].isin(["2nde", "1ère", "Terminale"]), col_name] = np.nan
                # ... (Répéter la logique pour L2, L3, M1, M2)

    out_dir = Path(__file__).resolve().parent.parent / "Résultats"
    out_dir.mkdir(parents=True, exist_ok=True)
    csv_path = out_dir / "database_etudiants_300k.csv"

    print("Sauvegarde du fichier ...")
    df.to_csv(csv_path, index=False)
    print(f"Fichier généré : {csv_path}")


if __name__ == "__main__":
    generate_student_leads()
