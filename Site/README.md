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

1. Generer les CSV:

```bash
python3 moc_data/scrypte/gen_students.py
python3 moc_data/scrypte/gen_ambassadors.py
```

2. Lancer backend puis declencher l'import:

```bash
curl -X POST http://localhost:4000/api/linkage/import \
  -H "Content-Type: application/json" \
  -d '{}'
```

Options utiles dans le body:
- `studentsPath`
- `ambassadorsPath`
- `batchSize`
- `studentLimit`
- `ambassadorLimit`

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
- `maxDepth` (1..3)
- `maxEdges` (20..1200)
- `types` (CSV des types de relation)

Exemple:

```bash
http://localhost:4000/api/linkage/graph?centerEmail=alice.martin1@mail.fr&maxDepth=2&maxEdges=300
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
