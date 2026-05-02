const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const neo4j = require("neo4j-driver");
const csvParser = require("csv-parser");

dotenv.config();

/** Trim, strip accidental wrapping quotes (common in dashboards), treat blank as unset. */
function sanitizeEnvString(value) {
  if (value === undefined || value === null) return "";
  let s = String(value).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

const PORT = Number(process.env.PORT ?? 4000);
const IS_RENDER = process.env.RENDER === "true" || process.env.RENDER === "1";
const NEO4J_URI =
  sanitizeEnvString(process.env.NEO4J_URI) || (IS_RENDER ? "" : "bolt://localhost:7687");
const NEO4J_USERNAME = sanitizeEnvString(process.env.NEO4J_USERNAME) || "neo4j";
const NEO4J_PASSWORD = sanitizeEnvString(process.env.NEO4J_PASSWORD) || "neo4jpassword";
/** Aura fournit souvent un nom de base = id d’instance (fichier .env au téléchargement). Local Docker : laisser vide. */
const NEO4J_DATABASE = sanitizeEnvString(process.env.NEO4J_DATABASE);

if (!NEO4J_URI) {
  console.error(
    "[Neo4j] NEO4J_URI est vide ou absent. Dans Render → Environment, ajoute NEO4J_URI avec l’URI Aura (ex. neo4j+s://xxxx.databases.neo4j.io). " +
      "Sans guillemets, sans espace en trop. Variables: NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, et optionnellement NEO4J_DATABASE (Aura).",
  );
  process.exit(1);
}

function neo4jSessionConfig(accessMode) {
  const cfg = { defaultAccessMode: accessMode };
  if (NEO4J_DATABASE) {
    cfg.database = NEO4J_DATABASE;
  }
  return cfg;
}
const IMPORT_BATCH_SIZE = Math.max(100, Number(process.env.IMPORT_BATCH_SIZE ?? 2000));
const CSV_STUDENTS_PATH =
  process.env.CSV_STUDENTS_PATH ??
  path.resolve(__dirname, "../../moc_data/Résultats/database_etudiants_300k.csv");
const CSV_AMBASSADORS_PATH =
  process.env.CSV_AMBASSADORS_PATH ??
  path.resolve(__dirname, "../../moc_data/Résultats/ambassadeurs_data_heavy.csv");

const GRAPH_LIMITS = {
  maxDepth: 3,
  maxEdges: 400,
  maxNodes: 96,
};

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

let driver;
try {
  driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD), {
    disableLosslessIntegers: true,
  });
} catch (err) {
  console.error(
    "[Neo4j] Impossible d’initialiser le driver. Vérifie NEO4J_URI (Aura: neo4j+s://…databases.neo4j.io), sans guillemets.",
    err && err.message,
  );
  process.exit(1);
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

/** Si la colonne CSV type_etablissement est absente, deduit un libelle depuis le nom d'ecole. */
function inferTypeEtablissementFromSchool(schoolName) {
  const s = normalizeText(schoolName).toLowerCase();
  if (!s) return "";
  if (s.includes("lyc") || s.includes("condorcet") || s.includes("henri")) return "Lycée";
  if (s.includes("univ") || s.includes("saclay") || s.includes("sorbonne") || s.includes("paris-")) {
    return "Université";
  }
  if (s.includes("hec") || s.includes("essec") || s.includes("escp") || s.includes("commerce")) {
    return "École de commerce";
  }
  if (s.includes("insa") || s.includes("centrale") || s.includes("polytechnique") || s.includes("mines")) {
    return "École d'ingénieur";
  }
  if (s.includes("iut")) return "IUT";
  if (s.includes("bts")) return "BTS";
  if (s.includes("epitech") || s.includes("ensa")) return "Établissement supérieur";
  if (s.includes("collège") || s.includes("college")) return "Collège";
  return "Autre";
}

function stringifyValue(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function mapNode(node) {
  return {
    id: node.elementId,
    label: node.properties.name || node.properties.label || node.properties.email || node.labels[0],
    type: node.labels[0] || "Entity",
    properties: Object.fromEntries(
      Object.entries(node.properties).map(([key, value]) => [key, stringifyValue(value)]),
    ),
  };
}

function mapRelationship(relationship) {
  return {
    id: relationship.elementId,
    source: relationship.startNodeElementId,
    target: relationship.endNodeElementId,
    type: relationship.type,
    properties: Object.fromEntries(
      Object.entries(relationship.properties).map(([key, value]) => [key, stringifyValue(value)]),
    ),
  };
}

function graphPrimaryLabel(node) {
  return node.labels && node.labels[0] ? node.labels[0] : "Unknown";
}

/** Limite le nombre de noeuds (surtout Student) pour graphes lisibles sur gros volumes. */
function capGraphPayload(centerElementId, uniqueNodes, uniqueEdges, maxNodes) {
  if (uniqueNodes.length <= maxNodes) {
    return { nodes: uniqueNodes, edges: uniqueEdges, truncatedNodes: false };
  }
  const kept = new Set();
  const center = uniqueNodes.find((n) => n.elementId === centerElementId);
  if (center) {
    kept.add(centerElementId);
  }
  const nonStudents = uniqueNodes.filter((n) => graphPrimaryLabel(n) !== "Student");
  const students = uniqueNodes.filter((n) => graphPrimaryLabel(n) === "Student");
  for (const n of nonStudents) {
    if (kept.size >= maxNodes) break;
    kept.add(n.elementId);
  }
  for (const n of students) {
    if (kept.size >= maxNodes) break;
    kept.add(n.elementId);
  }
  const keptEdges = uniqueEdges.filter(
    (e) => kept.has(e.startNodeElementId) && kept.has(e.endNodeElementId),
  );
  const keptNodes = uniqueNodes.filter((n) => kept.has(n.elementId));
  return { nodes: keptNodes, edges: keptEdges, truncatedNodes: true };
}

async function runInBatches(filePath, mapper, batchSize, callback, limit) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV introuvable: ${filePath}`);
  }

  let imported = 0;
  let rawRows = 0;
  let batch = [];
  const stream = fs.createReadStream(filePath).pipe(csvParser());

  for await (const row of stream) {
    rawRows += 1;
    if (typeof limit === "number" && rawRows > limit) break;
    const mapped = mapper(row);
    if (!mapped) continue;

    batch.push(mapped);
    if (batch.length >= batchSize) {
      await callback(batch);
      imported += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await callback(batch);
    imported += batch.length;
  }

  return { imported, rawRows: typeof limit === "number" ? Math.min(rawRows, limit) : rawRows };
}

async function ensureGraphConstraints(session) {
  await session.run(
    "CREATE CONSTRAINT student_email_unique IF NOT EXISTS FOR (s:Student) REQUIRE s.email IS UNIQUE",
  );
  await session.run(
    "CREATE CONSTRAINT ambassador_email_unique IF NOT EXISTS FOR (a:Ambassador) REQUIRE a.email IS UNIQUE",
  );
  await session.run(
    "CREATE CONSTRAINT school_name_unique IF NOT EXISTS FOR (s:School) REQUIRE s.name IS UNIQUE",
  );
  await session.run(
    "CREATE CONSTRAINT city_name_unique IF NOT EXISTS FOR (c:City) REQUIRE c.name IS UNIQUE",
  );
  await session.run(
    "CREATE CONSTRAINT sourcelead_name_unique IF NOT EXISTS FOR (sl:SourceLead) REQUIRE sl.name IS UNIQUE",
  );
  await session.run(
    "CREATE CONSTRAINT niveauscolaire_name_unique IF NOT EXISTS FOR (n:NiveauScolaire) REQUIRE n.name IS UNIQUE",
  );
  await session.run(
    "CREATE CONSTRAINT typeetablissement_name_unique IF NOT EXISTS FOR (t:TypeEtablissement) REQUIRE t.name IS UNIQUE",
  );
}

async function importStudents(session, studentsPath, batchSize, limit) {
  return runInBatches(
    studentsPath,
    (row) => {
      const email = normalizeText(row.email).toLowerCase();
      const school = normalizeText(row.ecole_actuelle || row.nom_etablissement);
      if (!email || !school) return null;

      const rawType = normalizeText(row.type_etablissement);
      const typeEtablissement = rawType || inferTypeEtablissementFromSchool(school);

      return {
        id: normalizeText(row.id),
        prenom: normalizeText(row.prenom),
        nom: normalizeText(row.nom),
        email,
        ville: normalizeText(row.ville),
        niveauActuel: normalizeText(row.niveau_actuel),
        school,
        sourceLead: normalizeText(row.source_lead),
        dateInscription: normalizeText(row.date_inscription),
        tel: normalizeText(row.tel),
        typeEtablissement,
      };
    },
    batchSize,
    async (rows) => {
      await session.run(
        `
        UNWIND $rows AS row
        MERGE (student:Student {email: row.email})
          ON CREATE SET student.id = row.id
        SET
          student.prenom = row.prenom,
          student.nom = row.nom,
          student.name = trim(row.prenom + " " + row.nom),
          student.niveau_actuel = row.niveauActuel,
          student.source_lead = row.sourceLead,
          student.date_inscription = row.dateInscription,
          student.tel = row.tel
        MERGE (city:City {name: row.ville})
        MERGE (school:School {name: row.school})
        MERGE (student)-[:LIVES_IN]->(city)
        MERGE (student)-[:STUDIES_AT]->(school)
        MERGE (student)-[:INTERESTED_IN]->(school)
        MERGE (niv:NiveauScolaire {name: row.niveauActuel})
        MERGE (student)-[:HAS_NIVEAU]->(niv)
        `,
        { rows },
      );

      const withSource = rows.filter((r) => normalizeText(r.sourceLead));
      if (withSource.length > 0) {
        await session.run(
          `
          UNWIND $rows AS row
          MATCH (student:Student {email: row.email})
          MERGE (sl:SourceLead {name: row.sourceLead})
          MERGE (student)-[:DISCOVERED_VIA]->(sl)
          `,
          { rows: withSource },
        );
      }

      const withType = rows.filter((r) => normalizeText(r.typeEtablissement));
      if (withType.length > 0) {
        await session.run(
          `
          UNWIND $rows AS row
          MATCH (student:Student {email: row.email})
          MATCH (school:School {name: row.school})
          MERGE (tt:TypeEtablissement {name: row.typeEtablissement})
          MERGE (student)-[:HAS_TYPE_ETABLISSEMENT]->(tt)
          MERGE (school)-[:CATEGORIZED_AS]->(tt)
          `,
          { rows: withType },
        );
      }
    },
    limit,
  );
}

async function importAmbassadors(session, ambassadorsPath, batchSize, limit) {
  return runInBatches(
    ambassadorsPath,
    (row) => {
      const email = normalizeText(row.email).toLowerCase();
      const school = normalizeText(row.nom_etablissement || row.ecole_actuelle);
      if (!email || !school) return null;

      return {
        id: normalizeText(row.id),
        prenom: normalizeText(row.prenom),
        nom: normalizeText(row.nom),
        email,
        ville: normalizeText(row.ville),
        niveauActuel: normalizeText(row.niveau_actuel),
        school,
      };
    },
    batchSize,
    async (rows) => {
      await session.run(
        `
        UNWIND $rows AS row
        MERGE (ambassador:Ambassador {email: row.email})
          ON CREATE SET ambassador.id = row.id
        SET
          ambassador.prenom = row.prenom,
          ambassador.nom = row.nom,
          ambassador.name = trim(row.prenom + " " + row.nom),
          ambassador.niveau_actuel = row.niveauActuel
        MERGE (city:City {name: row.ville})
        MERGE (school:School {name: row.school})
        MERGE (ambassador)-[:LIVES_IN]->(city)
        MERGE (ambassador)-[:STUDIED_AT]->(school)
        `,
        { rows },
      );
    },
    limit,
  );
}

async function linkStudentsToAmbassadors(session) {
  await session.run(
    `
    MATCH (student:Student)-[:STUDIES_AT]->(school:School)<-[:STUDIED_AT]-(ambassador:Ambassador)
    WITH student, collect(ambassador)[0..4] AS ambassadors
    UNWIND ambassadors AS ambassador
    MERGE (student)-[:CONNECTED_TO]->(ambassador)
    `,
  );
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "linkage-backend" });
});

app.post("/api/linkage/import", async (req, res) => {
  const session = driver.session(neo4jSessionConfig(neo4j.session.WRITE));
  const startedAt = Date.now();

  const studentsPath = req.body?.studentsPath
    ? path.resolve(req.body.studentsPath)
    : CSV_STUDENTS_PATH;
  const ambassadorsPath = req.body?.ambassadorsPath
    ? path.resolve(req.body.ambassadorsPath)
    : CSV_AMBASSADORS_PATH;
  const batchSize = Number(req.body?.batchSize ?? IMPORT_BATCH_SIZE);
  const studentLimit = req.body?.studentLimit ? Number(req.body.studentLimit) : undefined;
  const ambassadorLimit = req.body?.ambassadorLimit ? Number(req.body.ambassadorLimit) : undefined;

  try {
    await ensureGraphConstraints(session);

    const studentStats = await importStudents(
      session,
      studentsPath,
      Math.max(100, batchSize),
      Number.isFinite(studentLimit) ? studentLimit : undefined,
    );
    const ambassadorStats = await importAmbassadors(
      session,
      ambassadorsPath,
      Math.max(100, batchSize),
      Number.isFinite(ambassadorLimit) ? ambassadorLimit : undefined,
    );
    await linkStudentsToAmbassadors(session);

    const durationMs = Date.now() - startedAt;
    return res.json({
      ok: true,
      durationMs,
      studentsPath,
      ambassadorsPath,
      imported: {
        students: studentStats.imported,
        ambassadors: ambassadorStats.imported,
      },
      rawRowsRead: {
        students: studentStats.rawRows,
        ambassadors: ambassadorStats.rawRows,
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Echec de l'import CSV vers Neo4j.",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    await session.close();
  }
});

app.get("/api/linkage/graph", async (req, res) => {
  const session = driver.session(neo4jSessionConfig(neo4j.session.READ));

  const maxDepth = Math.max(1, Math.min(GRAPH_LIMITS.maxDepth, Number(req.query.maxDepth ?? 2)));
  const maxEdges = Math.max(15, Math.min(GRAPH_LIMITS.maxEdges, Number(req.query.maxEdges ?? 120)));
  const maxNodes = Math.max(24, Math.min(GRAPH_LIMITS.maxNodes, Number(req.query.maxNodes ?? 72)));
  const centerEmail = normalizeText(req.query.centerEmail).toLowerCase() || null;
  const centerStudentId = normalizeText(req.query.centerStudentId) || null;
  const centerPrenom = normalizeText(req.query.centerPrenom).toLowerCase() || null;
  const centerNom = normalizeText(req.query.centerNom).toLowerCase() || null;
  const typesQuery = normalizeText(req.query.types);
  const relationshipTypes = typesQuery
    ? typesQuery.split(",").map((value) => normalizeText(value)).filter(Boolean)
    : [];

  try {
    const centerResult = await session.run(
      `
      MATCH (s:Student)
      WHERE
        ($centerEmail IS NOT NULL AND toLower(trim(s.email)) = $centerEmail)
        OR ($centerStudentId IS NOT NULL AND s.id = $centerStudentId)
        OR (
          $centerPrenom IS NOT NULL AND $centerNom IS NOT NULL
          AND toLower(trim(s.prenom)) = $centerPrenom
          AND toLower(trim(s.nom)) = $centerNom
        )
      RETURN s
      LIMIT 1
      `,
      { centerEmail, centerStudentId, centerPrenom, centerNom },
    );

    let centerNode = centerResult.records[0]?.get("s");
    let centerFallbackUsed = false;

    if (!centerNode) {
      const fallback = await session.run(
        "MATCH (s:Student) RETURN s ORDER BY s.email ASC LIMIT 1",
      );
      centerNode = fallback.records[0]?.get("s");
      centerFallbackUsed = true;
    }

    if (!centerNode) {
      return res.json({
        nodes: [],
        edges: [],
        meta: {
          truncated: false,
          truncatedNodes: false,
          returnedNodes: 0,
          returnedEdges: 0,
          maxDepth,
          maxEdges,
          maxNodes,
          centerFallbackUsed,
        },
      });
    }

    const graphQuery = `
      MATCH (center:Student) WHERE elementId(center) = $centerElementId
      CALL {
        WITH center
        MATCH p = (center)-[*1..${maxDepth}]-(n)
        UNWIND relationships(p) AS rel
        WITH rel
        WHERE size($relationshipTypes) = 0 OR type(rel) IN $relationshipTypes
        RETURN collect(DISTINCT rel) AS allRelations
      }
      WITH center, allRelations, size(allRelations) AS totalRelations
      WITH center, totalRelations, allRelations[0..$maxEdges] AS limitedRelations
      UNWIND limitedRelations AS rel
      WITH center, totalRelations, collect(DISTINCT rel) AS rels
      UNWIND rels AS relationship
      WITH center, totalRelations, rels, startNode(relationship) AS sourceNode, endNode(relationship) AS targetNode
      WITH
        center,
        totalRelations,
        rels AS relationships,
        collect(DISTINCT sourceNode) AS sourceNodes,
        collect(DISTINCT targetNode) AS targetNodes
      WITH
        totalRelations,
        relationships,
        sourceNodes + targetNodes + [center] AS rawNodes
      UNWIND rawNodes AS node
      WITH collect(DISTINCT node) AS nodes, relationships, totalRelations
      RETURN nodes, relationships, totalRelations
    `;
    const graphResult = await session.run(
      graphQuery,
      {
        centerElementId: centerNode.elementId,
        maxEdges,
        relationshipTypes,
      },
    );

    if (graphResult.records.length === 0) {
      return res.json({
        nodes: [mapNode(centerNode)],
        edges: [],
        meta: {
          truncated: false,
          truncatedNodes: false,
          returnedNodes: 1,
          returnedEdges: 0,
          maxDepth,
          maxEdges,
          maxNodes,
          centerFallbackUsed,
        },
      });
    }

    const record = graphResult.records[0];
    const nodes = record.get("nodes");
    const relationships = record.get("relationships");
    const totalRelations = Number(record.get("totalRelations") ?? 0);

    const uniqueNodes = Array.from(new Map(nodes.map((node) => [node.elementId, node])).values());
    const uniqueEdges = Array.from(
      new Map(relationships.map((edge) => [edge.elementId, edge])).values(),
    );

    const capped = capGraphPayload(centerNode.elementId, uniqueNodes, uniqueEdges, maxNodes);

    return res.json({
      nodes: capped.nodes.map(mapNode),
      edges: capped.edges.map(mapRelationship),
      meta: {
        truncated: totalRelations > uniqueEdges.length,
        truncatedNodes: capped.truncatedNodes,
        totalNodesBeforeCap: uniqueNodes.length,
        totalRelations,
        returnedNodes: capped.nodes.length,
        returnedEdges: capped.edges.length,
        maxDepth,
        maxEdges,
        maxNodes,
        relationshipTypes,
        centerFallbackUsed,
      },
    });
  } catch (error) {
    return res.status(503).json({
      message: "Neo4j indisponible ou requete invalide.",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    await session.close();
  }
});

function bootstrap() {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Linkage backend listening on http://localhost:${PORT}`);
  });
}

process.on("SIGINT", async () => {
  await driver.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await driver.close();
  process.exit(0);
});

bootstrap();
