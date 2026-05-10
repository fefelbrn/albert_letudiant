# L'Etudiant - Linkage (Neo4j)

Ce fichier documente surtout **Neo4j, import CSV et API Linkage** sous `Site/`. Pour l’aperçu produit complet (simulateur, écoles, structure du repo, extension Chrome), voir le **[README à la racine du dépôt](../README.md)**.

Ce dossier `Site/` contient:
- un front React/Vite dans `V1`
- un backend Express/Neo4j dans `backend`
- une base Neo4j locale via Docker Compose (image **Neo4j 5.x**, cf. `docker-compose.yml`)

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

Le endpoint graph (`graphEngine: neighborhood`) reprend la logique Aura : **1 saut** depuis le `Student` centre, **ambassadeurs** sur les écoles `STUDIES_AT` / `INTERESTED_IN`, puis pour chaque nœud pivot un **CALL** avec `ORDER BY type` et **`perNodeLimit`** arêtes max, puis troncature globale `maxEdges` et cap `maxNodes`.

Paramètres (query string):
- `centerEmail` (recommandé, même email que le compte démo / import CSV)
- `centerPrenom` + `centerNom` ou `centerStudentId` si pas d’email
- `maxEdges` (15..400), `maxNodes` (24..96), `perNodeLimit` (3..25, défaut 10)
- `maxDepth` (1..3, défaut 2) — **renvoyé dans `meta`** ; la requête actuelle `neighborhood` ne l’utilise pas encore pour élargir la profondeur Cypher (moteur fixe: 1 saut centre + expansion par nœud)
- `types` (liste de types de relation, séparés par des virgules) — filtre les arêtes retournées

**Comportement du centre:**
- **Centre explicite** (`centerEmail`, ou `centerStudentId`, ou `centerPrenom` + `centerNom`) et **aucun** `Student` ne correspond → graphe vide, `meta.centerMatched: false` (pas de tirage au hasard).
- **Aucun centre explicite** (tous les identifiants vides) → le backend peut utiliser un **étudiant de secours** (premier `Student` par email trié) ; `meta.centerFallbackUsed: true` dans ce cas. Utile pour le debug ; le front `/linkage` envoie en pratique l’email du profil.

Exemple:

```bash
http://localhost:4000/api/linkage/graph?centerEmail=l%C3%A9o.martin114%40mail.fr&maxEdges=250&maxNodes=96&perNodeLimit=10
```

Front : `/linkage` utilise l’email du profil connecté (et prénom/nom du profil en secours). Surcharge URL possible, ex. `?centerEmail=...&perNodeLimit=12`. Les curseurs **maxEdges / maxNodes** se règlent dans l’UI puis rechargement du graphe.

## 5) Lancer le frontend

Dans un nouveau terminal:

```bash
cd V1
npm install
npm run dev
```

Frontend: <http://localhost:5173>

Compte demo simulateur (login) : **`leo.martin114@mail.fr`** (ou `léo…`, même compte) / **`motdepasse`** — profil et notes alignés sur le POC Neo4j (Léo Martin, HEC).

L'onglet `Linkage` est disponible dans la navbar.

## 6) Deploiement Vercel (Linkage)

En **local**, les appels `/api/...` passent par le proxy Vite vers `localhost:4000`.

En **production (Vercel)**, le front appelle l’API via une **URL absolue**. Le code embarque un **repli** vers `https://albert-letudiant.onrender.com` si `VITE_API_BASE_URL` n’est pas défini (POC). Pour un autre domaine d’API, définis **`VITE_API_BASE_URL`** sur Vercel puis redeploie.

Vérifie que le backend Render a bien `NEO4J_*` et répond sur `GET /api/health`.

Note: le **Root Directory** Vercel doit être `Site/V1` si le repo n’est pas uniquement le front.

## Arreter les services

- Front/back: `Ctrl + C` dans chaque terminal
- Neo4j: `docker compose down`
