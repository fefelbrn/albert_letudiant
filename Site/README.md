# L'Etudiant - Linkage (Neo4j)

Ce dossier `Site/` contient:
- un front React/Vite dans `V1`
- un backend Express/Neo4j dans `backend`
- une base Neo4j locale via Docker Compose

## Prerequis

- Docker Desktop
- Node.js + npm

## 1) Lancer Neo4j

Depuis la racine du dossier `Site/`:

```bash
docker compose up -d
```

Neo4j Browser: <http://localhost:7474>  
Login: `neo4j` / `neo4jpassword`

## 2) Option rapide: seeder les donnees graph (demo)

```bash
docker exec -i linkage-neo4j cypher-shell -u neo4j -p neo4jpassword < scripts/seed.cypher
```

## 3) Pipeline CSV -> Neo4j (recommande)

Les CSV attendus (non versionnes, generes localement) sont sous `moc_data/Résultats/`:
- `database_etudiants_300k.csv`
- `ambassadeurs_data_heavy.csv`

1. Generer les CSV (si besoin):

```bash
python3 moc_data/scrypte/gen_students.py
python3 moc_data/scrypte/gen_ambassadors.py
```

2. Lancer le **backend** (`cd backend && npm run dev`) avec un `backend/.env` qui pointe vers ta base (**Docker local** ou **Neo4j Aura**).

3. Declencher l'import depuis **ta machine** (le serveur lit les fichiers sur disque). Le fichier etudiants fait ~300k lignes: utilise des **limites** pour eviter timeout / heures d'attente, puis augmente progressivement si besoin.

```bash
curl -X POST http://localhost:4000/api/linkage/import \
  -H "Content-Type: application/json" \
  -d '{"studentLimit":25000,"ambassadorLimit":8000,"batchSize":2000}'
```

Ou le script (meme principe, limites modifiables via variables d'environnement):

```bash
chmod +x scripts/import-csv-to-neo4j.sh
./scripts/import-csv-to-neo4j.sh
```

**Aura / prod:** Render n’a pas ces CSV sur disque → l’import se fait **en local** avec `NEO4J_*` dans `.env` visant Aura, puis le site en ligne lit la meme base.

**Remplacer le demo `seed.cypher`:** dans Aura → Query, avant import CSV: `MATCH (n) DETACH DELETE n;` puis lance l’import ci-dessus. Le graphe Linkage utilisera alors surtout Student / School / City / Ambassador (pas de noeuds `Program` venant du seed).

Options utiles dans le body JSON:
- `studentsPath` / `ambassadorsPath` (chemins absolus si tu deplaces les fichiers)
- `batchSize` (defaut 2000 via `.env`)
- `studentLimit` / `ambassadorLimit` (tronque le nombre de lignes lues par fichier)

## 4) Lancer le backend Linkage

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API sante: <http://localhost:4000/api/health>  
API graph: <http://localhost:4000/api/linkage/graph>

Le endpoint graph supporte:
- `centerEmail`
- `centerStudentId`
- `maxDepth` (1..3) — sur gros volumes, preferer 1
- `maxEdges` (15..400) — borne les relations analysees avant rendu
- `maxNodes` (24..96) — plafond de noeuds renvoyes (priorite ecoles/villes puis echantillon d’eleves)
- `types` (CSV des types de relation)

Exemple:

```bash
http://localhost:4000/api/linkage/graph?centerEmail=arthur.durand1@mail.fr&maxDepth=1&maxEdges=120&maxNodes=72
```

## 5) Lancer le frontend

Dans un nouveau terminal:

```bash
cd V1
npm install
npm run dev
```

Frontend: <http://localhost:5173>

L'onglet `Linkage` est disponible dans la navbar.

## 6) Deploiement Vercel (Linkage)

Le front utilise par defaut `/api/...` en local via le proxy Vite.

En production (Vercel), il faut definir l'origine de ton API:

- `VITE_API_BASE_URL` = `https://ton-api.example.com` (sans slash final)

Puis redeployer le projet Vercel.

Note: sur Vercel, le **Root Directory** doit pointer vers `Site/V1` si ton repo contient aussi `extension/` a la racine.

## Arreter les services

- Front/back: `Ctrl + C` dans chaque terminal
- Neo4j: `docker compose down`
