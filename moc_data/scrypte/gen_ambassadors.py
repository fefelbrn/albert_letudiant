import random
from pathlib import Path

import pandas as pd


def generate_massive_student_data(n: int = 1000) -> pd.DataFrame:
    ecoles = {
        "Commerce": ["HEC", "ESSEC", "ESCP", "EDHEC", "EM Lyon", "NEOMA", "SKEMA", "KEDGE"],
        "Ingénieur": ["Polytechnique", "CentraleSupélec", "Mines Paris", "INSA Lyon", "UTC", "EPITA", "42"],
        "Université": ["Sorbonne", "Assas", "Dauphine", "Sciences Po", "Lyon 2", "Aix-Marseille"],
        "Art/Design": ["Beaux-Arts", "Strate", "Gobelins", "Boulle", "LISAA", "ENSAD"],
        "Architecture": ["ENSA Paris-Malaquais", "ENSA Lyon", "ENSA Nantes"],
    }

    villes = ["Paris", "Lyon", "Marseille", "Bordeaux", "Lille", "Nantes", "Toulouse"]
    langues_options = ["Français", "Anglais", "Espagnol", "Allemand", "Chinois", "Arabe"]
    matieres_lycee = ["maths", "francais_philo", "hist_geo", "anglais", "spe1", "spe2", "sport", "general"]
    matieres_sup = ["majeure", "mineure", "soft_skills", "projets", "anglais", "moyenne_sem"]

    data: list[dict] = []

    for i in range(1, n + 1):
        sexe = random.choice(["M", "F"])
        prenom = random.choice(
            ["Lucas", "Léa", "Thomas", "Chloé", "Enzo", "Camille", "Hugo", "Manon", "Arthur", "Sarah"]
        )
        nom = random.choice(
            ["Bernard", "Petit", "Durand", "Moreau", "Lefebvre", "Leroy", "Garcia", "Roux", "Fontaine"]
        )

        if i <= 400:
            level = "Licence " + str(random.randint(1, 3))
        elif i <= 900:
            level = "Master " + str(random.randint(1, 2))
        else:
            level = random.choice(["Doctorat", "Alumni"])

        cat_ecole = random.choice(list(ecoles.keys()))
        ecole_nom = random.choice(ecoles[cat_ecole])

        base_performance = random.uniform(10, 18)

        row: dict = {
            "id": i,
            "prenom": prenom,
            "nom": nom,
            "email": f"{prenom.lower().replace('é', 'e')}.{nom.lower()}{i}@etudiant.fr",
            "telephone": f"06{random.randint(10, 99)}{random.randint(10, 99)}{random.randint(10, 99)}{random.randint(10, 99)}",
            "ville": random.choice(villes),
            "niveau_actuel": level,
            "type_etablissement": cat_ecole,
            "nom_etablissement": ecole_nom,
            "langues": ", ".join(random.sample(langues_options, random.randint(1, 3))),
            "score_attractivite": random.randint(40, 98),
            "nb_scans_qr": random.randint(0, 250),
            "linkedin_url": f"linkedin.com/in/{prenom.lower()}{nom.lower()}",
            "sexe": sexe,
        }

        for annee in ["seconde", "premiere", "terminale"]:
            for t in ["t1", "t2", "t3"]:
                for mat in matieres_lycee:
                    note = base_performance + random.uniform(-2, 2)
                    row[f"{annee}_{t}_{mat}"] = round(min(max(note, 6), 20), 2)

        niveaux_sup = ["l1", "l2", "l3", "m1", "m2"]
        current_idx = 5
        if "Licence" in level:
            current_idx = int(level[-1])
        if "Master" in level:
            current_idx = int(level[-1]) + 3

        for idx, ns in enumerate(niveaux_sup):
            for s in ["s1", "s2"]:
                for mat in matieres_sup:
                    col_name = f"{ns}_{s}_{mat}"
                    if idx < current_idx:
                        note = (base_performance - 1) + random.uniform(-3, 3)
                        row[col_name] = round(min(max(note, 5), 20), 2)
                    else:
                        row[col_name] = ""

        data.append(row)

    return pd.DataFrame(data)


def main() -> None:
    # CSV dans moc_data/Résultats/ (dossier parent de ce fichier = moc_data/scrypte)
    out_dir = Path(__file__).resolve().parent.parent / "Résultats"
    out_dir.mkdir(parents=True, exist_ok=True)
    csv_path = out_dir / "ambassadeurs_data_heavy.csv"

    df_final = generate_massive_student_data(1000)
    df_final.to_csv(csv_path, index=False)
    print(
        f"Terminé ! CSV généré : {csv_path} "
        f"({df_final.shape[0]} lignes, {df_final.shape[1]} colonnes)."
    )


if __name__ == "__main__":
    main()
