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

**Remplacer le demo `seed.cypher`:** dans Aura → Query, avant import CSV: `MATCH (n) DETACH DELETE n;` puis lance l’import ci-dessus. Le graphe Linkage utilisera surtout Student / School / City / Ambassador, plus des noeuds derives du CSV: **SourceLead** (`DISCOVERED_VIA`), **NiveauScolaire** (`HAS_NIVEAU`), **TypeEtablissement** (`HAS_TYPE_ETABLISSEMENT` et `School-[:CATEGORIZED_AS]->`). Sur `Student` sont aussi stockees `source_lead`, `date_inscription`, `tel`. Regenerer le CSV etudiants (`gen_students.py`) ajoute la colonne finale **`type_etablissement`** ; sans elle, le backend deduit un type depuis le nom d’ecole.

**Requete Aura lisible (Léa + ville + ecole + niveau + source + type)** — apres import enrichi:

```cypher
MATCH (lea:Student)
WHERE toLower(trim(lea.nom)) = 'petit'
  AND (toLower(trim(lea.prenom)) IN ['léa', 'lea'] OR toLower(trim(lea.email)) CONTAINS 'petit')
WITH lea LIMIT 1
OPTIONAL MATCH p0 = (lea)-[:LIVES_IN]->(:City)
MATCH p1 = (lea)-[:STUDIES_AT]->(sch:School)
OPTIONAL MATCH p2 = (lea)-[:HAS_NIVEAU]->(:NiveauScolaire)
OPTIONAL MATCH p3 = (lea)-[:DISCOVERED_VIA]->(:SourceLead)
OPTIONAL MATCH p4 = (lea)-[:HAS_TYPE_ETABLISSEMENT]->(tt:TypeEtablissement)
OPTIONAL MATCH p5 = (sch)-[:CATEGORIZED_AS]->(tt)
RETURN p0, p1, p2, p3, p4, p5;
```

Quelques camarades de la meme ecole (borne):

```cypher
MATCH (lea:Student)-[:STUDIES_AT]->(sch:School)
WHERE toLower(trim(lea.nom)) = 'petit'
  AND (toLower(trim(lea.prenom)) IN ['léa', 'lea'] OR toLower(trim(lea.email)) CONTAINS 'petit')
WITH lea, sch LIMIT 1
MATCH p = (peer:Student)-[:STUDIES_AT]->(sch)
WHERE peer <> lea
RETURN p
LIMIT 8;
```

**Donnees deja importees sans ces relations ?** Relance `POST /api/linkage/import` (meme CSV) ou execute en Query des `MERGE` analogues a partir des proprietes `Student` si tu les as remplies a l’import manuel.

Options utiles dans le body JSON:
- `studentsPath` / `ambassadorsPath` (chemins absolus si tu deplaces les fichiers)
- `batchSize` (defaut 2000 via `.env`)
- `studentLimit` / `ambassadorLimit` (tronque le nombre de lignes lues par fichier)
- `skipStudentImport` / `skipAmbassadorImport` (bool) — n’importe qu’un des deux CSV
- `skipLinkStudentsToAmbassadors` (bool) — ne crée pas les arêtes `CONNECTED_TO` (souvent **énormes** sur gros volume d’étudiants)

**Neo4j Aura (petit tier) — plafond ~400k relations:** si l’import échoue avec *exceeded the logical size limit of 400000 relationships*, la base est pleine. Refaire un import **étudiants + liaison** ajoute des dizaines de milliers de relations (`CONNECTED_TO` surtout). Pistes: **monter de tier**, ou **`MATCH (n) DETACH DELETE n`** puis réimporter avec des **limites plus basses**, ou **ne réimporter que les ambassadeurs** sans retoucher les étudiants ni les liaisons:

```bash
cd backend && node scripts/run-linkage-import.js --skip-students --ambassadors 1200 --skip-link
```

Il faut encore **quelques milliers de relations libres** pour ~1000 ambassadeurs (~2 relations chacun). Si tu es déjà à ~398k/400k, libère de la place avant, par exemple en supprimant les `INTERESTED_IN` redondants avec `STUDIES_AT` vers la **même** école (cas du pipeline actuel) :

```cypher
MATCH (s:Student)-[:STUDIES_AT]->(sch:School)
MATCH (s)-[i:INTERESTED_IN]->(sch)
DELETE i;
```

Puis relance la commande `--skip-students` ci-dessus. Les requêtes métier « même école que l’ambassadeur » passent toujours par `(Student)-[:STUDIES_AT]->(School)<-[:STUDIED_AT]-(Ambassador)` sans `CONNECTED_TO`.

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
- `centerEmail` (prioritaire si present dans Neo4j)
- `centerPrenom` + `centerNom` (minuscules, compares a `Student.prenom` / `Student.nom` si pas d’email)
- `centerStudentId`
- `maxDepth` (1..3) — sur gros volumes, preferer 1
- `maxEdges` (15..400) — borne les relations analysees avant rendu
- `maxNodes` (24..96) — plafond de noeuds renvoyes (priorite ecoles/villes puis echantillon d’eleves)
- `types` (CSV des types de relation)
- `includeAmbassadors` (`1` / `true`) — ajoute toujours les ambassadeurs des écoles où le centre est en `STUDIES_AT` ou `INTERESTED_IN` (évite qu’ils soient coupés par `maxEdges` sur gros graphes)

Exemple:

```bash
http://localhost:4000/api/linkage/graph?centerEmail=l%C3%A9a.petit2%40mail.fr&maxDepth=2&maxEdges=120&maxNodes=72
```

Léo (HEC) + ambassadeurs fusionnés côté API :

```bash
http://localhost:4000/api/linkage/graph?centerEmail=l%C3%A9o.martin114%40mail.fr&maxDepth=2&maxEdges=200&maxNodes=96&includeAmbassadors=1
```

Même chose dans le front : `/linkage?centerEmail=léo.martin114@mail.fr&includeAmbassadors=1` (adapter l’encodage si besoin).

## 5) Lancer le frontend

Dans un nouveau terminal:

```bash
cd V1
npm install
npm run dev
```

Frontend: <http://localhost:5173>

Compte demo simulateur (login) : **`léo.martin114@mail.fr`** / **`motdepasse`** — profil et notes alignés sur le POC Neo4j (Léo Martin, HEC).

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
