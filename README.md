# L'Étudiant — Simulateur d'Admission & Linkage

> Application web permettant aux étudiants de comparer leur profil académique avec les bulletins réels d'anciens élèves admis dans les grandes écoles françaises, et d'explorer un graphe de réseau reliant étudiants, ambassadeurs et établissements.

---

## Table des matières

- [Aperçu](#aperçu)
- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Installation & lancement](#installation--lancement)
- [Pipeline de données](#pipeline-de-données)
- [API Backend](#api-backend)
- [Structure du projet](#structure-du-projet)
- [Scripts utiles](#scripts-utiles)
- [Variables d'environnement](#variables-denvironnement)

---

## Aperçu

**L'Étudiant Simulateur** est un prototype construit dans le cadre d'un case study pour le salon L'Étudiant. Il se compose de :

- Un **frontend React/TypeScript** (SPA) avec simulateur d'admission, classement des écoles et espace privé candidat
- Un **backend Express/Node.js** connecté à **Neo4j** pour la visualisation de graphe relationnel (Linkage)
- Des **scripts Python** de génération de données mock (300 000 étudiants, 1 000 ambassadeurs)

---

## Fonctionnalités

### 🏠 Accueil
Page de présentation du simulateur avec cartes d'écoles et call-to-action vers l'inscription ou l'exploration.

### 🏫 Classement des écoles
Catalogue filtrable de 16 établissements (commerce, ingénieur, design, université) avec :
- Recherche textuelle (nom, ville)
- Filtre par type et département
- Tri par score d'admission, rang ou ordre alphabétique

### 🔒 Espace privé (authentifié)
Accessible après connexion (auth simulée via `localStorage`). Contient 3 onglets :

| Onglet | Description |
|--------|-------------|
| **Mes rappels** | Salons et événements à venir / passés |
| **Mon profil candidat** | Dashboard avec KPIs (moyenne lycée, terminale, score global), radar de compétences (terminale), heatmap des notes lycée, notes du supérieur |
| **Mes datas** | Formulaire d'édition du profil (identité, scolarité, bulletins, établissements favoris) — données persistées en `localStorage` |

### 🔗 Linkage (graphe Neo4j)
Visualisation interactive (force-directed graph) du réseau :
- **Nœuds** : Student, Ambassador, School, City, User (profil courant)
- **Relations** : `STUDIES_AT`, `STUDIED_AT`, `LIVES_IN`, `INTERESTED_IN`, `CONNECTED_TO`, `FOLLOWS`
- Contrôles : profondeur (1-3 sauts), nombre max de relations, filtre par type de nœud
- Le profil utilisateur est injecté dynamiquement et relié aux écoles favorites

---

## Architecture

```
┌─────────────────┐     proxy /api     ┌──────────────────┐     Bolt     ┌───────────┐
│   Frontend      │ ──────────────────▸ │   Backend        │ ───────────▸ │  Neo4j    │
│   React + Vite  │    :5173 → :4000   │   Express        │   :7687     │  (Docker) │
│   (V1/)         │                    │   (backend/)     │             │           │
└─────────────────┘                    └──────────────────┘             └───────────┘
                                              ▲
                                              │ CSV import
                                     ┌────────┴────────┐
                                     │  Python scripts  │
                                     │  (moc_data/)     │
                                     └─────────────────┘
```

---

## Stack technique

### Frontend (`V1/`)

| Techno | Version | Rôle |
|--------|---------|------|
| React | 19 | UI |
| TypeScript | 5 | Typage |
| Vite | 7 | Build & dev server |
| React Router | 7 | Routing SPA |
| react-force-graph-2d | 1.29 | Visualisation du graphe |
| ESLint | 9 | Linting |

### Backend (`backend/`)

| Techno | Version | Rôle |
|--------|---------|------|
| Express | 5 | API REST |
| neo4j-driver | 6 | Connexion Neo4j |
| csv-parser | 3.2 | Parsing des CSV pour import |
| dotenv | 17 | Variables d'environnement |
| nodemon | 3 | Hot reload en dev |

### Infrastructure

| Techno | Version | Rôle |
|--------|---------|------|
| Neo4j | 5.26 | Base de données graphe |
| Docker Compose | — | Orchestration Neo4j |

### Data generation (`moc_data/scrypte/`)

| Techno | Rôle |
|--------|------|
| Python 3 + pandas + numpy | Génération de CSV mock |

---

## Prérequis

- **Docker Desktop** (pour Neo4j)
- **Node.js** ≥ 18 + npm
- **Python 3** + `pandas` + `numpy` (uniquement pour la génération de données)

---

## Installation & lancement

### 1. Cloner le repo

```bash
git clone <url-du-repo>
cd albert_letudiant
```

### 2. Lancer Neo4j

```bash
docker compose up -d
```

- Neo4j Browser : http://localhost:7474
- Login : `neo4j` / `neo4jpassword`

### 3. Lancer le backend

```bash
cd backend
cp .env.example .env   # ajuster si besoin
npm install
npm run dev
```

Le serveur écoute sur http://localhost:4000.

### 4. Lancer le frontend

Dans un second terminal :

```bash
cd V1
npm install
npm run dev
```

Le frontend est accessible sur http://localhost:5173.  
Le proxy Vite redirige automatiquement `/api/*` vers le backend.

### Raccourci : lancer front + back ensemble

```bash
# Depuis la racine
./run-dev.sh        # macOS / Linux
.\run-dev.ps1       # Windows PowerShell
```

`Ctrl+C` arrête les deux serveurs.

---

## Pipeline de données

### Générer les CSV mock

```bash
# Installer les dépendances Python (une seule fois)
python3 -m venv .venv && source .venv/bin/activate
pip install pandas numpy

# Générer 300k étudiants + 1k ambassadeurs
python3 moc_data/scrypte/gen_students.py
python3 moc_data/scrypte/gen_ambassadors.py
```

Les fichiers sont créés dans `moc_data/Résultats/`.

### Importer dans Neo4j

Le backend expose un endpoint d'import :

```bash
curl -X POST http://localhost:4000/api/linkage/import \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Options du body JSON

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `studentsPath` | string | CSV par défaut | Chemin absolu vers le CSV étudiants |
| `ambassadorsPath` | string | CSV par défaut | Chemin absolu vers le CSV ambassadeurs |
| `batchSize` | number | 2000 | Taille des batchs Cypher |
| `studentLimit` | number | — | Limite le nombre d'étudiants importés |
| `ambassadorLimit` | number | — | Limite le nombre d'ambassadeurs importés |

### Seed rapide (optionnel)

Si un fichier `scripts/seed.cypher` existe :

```bash
docker exec -i linkage-neo4j cypher-shell -u neo4j -p neo4jpassword < scripts/seed.cypher
```

---

## API Backend

### `GET /api/health`

Health check.

```json
{ "status": "ok", "service": "linkage-backend" }
```

### `POST /api/linkage/import`

Import massif des CSV étudiants + ambassadeurs dans Neo4j. Crée les nœuds `Student`, `Ambassador`, `School`, `City` et les relations `STUDIES_AT`, `STUDIED_AT`, `LIVES_IN`, `INTERESTED_IN`, `CONNECTED_TO`.

### `GET /api/linkage/graph`

Récupère un sous-graphe centré sur un étudiant.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `centerEmail` | string | — | Email de l'étudiant central |
| `centerStudentId` | string | — | ID de l'étudiant central |
| `maxDepth` | number | 2 | Profondeur de traversée (1–3) |
| `maxEdges` | number | 300 | Nombre max de relations retournées (20–1200) |
| `types` | string | — | Types de relations à inclure (séparés par virgule) |

**Exemple :**

```
GET /api/linkage/graph?centerEmail=thomas.bernard1@etudiant.fr&maxDepth=2&maxEdges=300
```

**Réponse :**

```json
{
  "nodes": [{ "id": "...", "label": "...", "type": "Student", "properties": {} }],
  "edges": [{ "id": "...", "source": "...", "target": "...", "type": "STUDIES_AT" }],
  "meta": {
    "truncated": false,
    "totalRelations": 42,
    "returnedNodes": 15,
    "returnedEdges": 42,
    "maxDepth": 2,
    "maxEdges": 300,
    "centerFallbackUsed": false
  }
}
```

---

## Structure du projet

```
albert_letudiant/
├── V1/                              # Frontend React/TypeScript
│   ├── public/assets/               # Icônes (favicon, navicon)
│   ├── src/
│   │   ├── components/layout/       # Navbar
│   │   ├── data/                    # Données statiques (écoles, profil canonique)
│   │   ├── domain/                  # Logique métier (analytics notes, parsing CSV)
│   │   ├── features/
│   │   │   ├── candidate-profile/   # Dashboard candidat, radar, heatmap
│   │   │   ├── rappels/             # Panel rappels/événements
│   │   │   └── user-data/           # Formulaire données utilisateur
│   │   ├── hooks/                   # Custom hooks (filtres écoles)
│   │   ├── pages/                   # Pages routes (Home, Schools, Login, Private, Linkage)
│   │   ├── state/                   # Contexts React (Auth, UserProfile)
│   │   ├── styles/                  # CSS (tokens, base, components, pages)
│   │   └── types/                   # Types TypeScript (School, StudentLead, Graph, UserProfile)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── backend/                         # API Express/Neo4j
│   ├── src/server.js                # Point d'entrée unique (routes + import + graph)
│   ├── .env.example
│   └── package.json
├── moc_data/                        # Données mock
│   ├── scrypte/
│   │   ├── gen_students.py          # Génère 300k lignes étudiants
│   │   └── gen_ambassadors.py       # Génère 1k lignes ambassadeurs
│   └── Résultats/                   # CSVs générés (gitignored)
├── docker-compose.yml               # Neo4j 5.26
├── run-dev.sh                       # Script lancement front + back (bash)
├── run-dev.ps1                      # Script lancement front + back (PowerShell)
├── .gitignore
└── README.md
```

---

## Scripts utiles

| Commande | Où | Description |
|----------|-----|-------------|
| `npm run dev` | `V1/` | Lance le frontend Vite en dev (port 5173) |
| `npm run build` | `V1/` | Build TypeScript + Vite pour production |
| `npm run lint` | `V1/` | Lint ESLint |
| `npm run dev` | `backend/` | Lance le backend avec nodemon (port 4000) |
| `npm start` | `backend/` | Lance le backend sans hot reload |
| `docker compose up -d` | racine | Démarre Neo4j |
| `docker compose down` | racine | Arrête Neo4j |
| `./run-dev.sh` | racine | Lance front + back en parallèle |

---

## Variables d'environnement

Fichier : `backend/.env` (copier depuis `.env.example`)

| Variable | Défaut | Description |
|----------|--------|-------------|
| `PORT` | `4000` | Port du serveur Express |
| `NEO4J_URI` | `bolt://localhost:7687` | URI de connexion Neo4j |
| `NEO4J_USERNAME` | `neo4j` | Utilisateur Neo4j |
| `NEO4J_PASSWORD` | `neo4jpassword` | Mot de passe Neo4j |
| `CSV_STUDENTS_PATH` | `../moc_data/Résultats/database_etudiants_300k.csv` | Chemin du CSV étudiants |
| `CSV_AMBASSADORS_PATH` | `../moc_data/Résultats/ambassadeurs_data_heavy.csv` | Chemin du CSV ambassadeurs |
| `IMPORT_BATCH_SIZE` | `2000` | Taille des batchs d'import Cypher |

---

## Arrêter les services

```bash
# Frontend / Backend
Ctrl+C dans chaque terminal (ou dans run-dev.sh)

# Neo4j
docker compose down
```

---

## Licence

Projet académique — usage interne.
