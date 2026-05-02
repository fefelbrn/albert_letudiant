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

if (!NEO4J_URI) {
  console.error(
    "[Neo4j] NEO4J_URI est vide ou absent. Dans Render → Environment, ajoute NEO4J_URI avec l’URI Aura (ex. neo4j+s://xxxx.databases.neo4j.io). " +
      "Sans guillemets, sans espace en trop. Les noms exacts sont NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD.",
  );
  process.exit(1);
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
  maxEdges: 1200,
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
}

async function importStudents(session, studentsPath, batchSize, limit) {
  return runInBatches(
    studentsPath,
    (row) => {
      const email = normalizeText(row.email).toLowerCase();
      const school = normalizeText(row.ecole_actuelle || row.nom_etablissement);
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
        MERGE (student:Student {email: row.email})
          ON CREATE SET student.id = row.id
        SET
          student.prenom = row.prenom,
          student.nom = row.nom,
          student.name = trim(row.prenom + " " + row.nom),
          student.niveau_actuel = row.niveauActuel
        MERGE (city:City {name: row.ville})
        MERGE (school:School {name: row.school})
        MERGE (student)-[:LIVES_IN]->(city)
        MERGE (student)-[:STUDIES_AT]->(school)
        MERGE (student)-[:INTERESTED_IN]->(school)
        `,
        { rows },
      );
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
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
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
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });

  const maxDepth = Math.max(1, Math.min(GRAPH_LIMITS.maxDepth, Number(req.query.maxDepth ?? 2)));
  const maxEdges = Math.max(20, Math.min(GRAPH_LIMITS.maxEdges, Number(req.query.maxEdges ?? 300)));
  const centerEmail = normalizeText(req.query.centerEmail).toLowerCase() || null;
  const centerStudentId = normalizeText(req.query.centerStudentId) || null;
  const typesQuery = normalizeText(req.query.types);
  const relationshipTypes = typesQuery
    ? typesQuery.split(",").map((value) => normalizeText(value)).filter(Boolean)
    : [];

  try {
    const centerResult = await session.run(
      `
      MATCH (s:Student)
      WHERE
        ($centerEmail IS NOT NULL AND toLower(s.email) = $centerEmail)
        OR ($centerStudentId IS NOT NULL AND s.id = $centerStudentId)
      RETURN s
      LIMIT 1
      `,
      { centerEmail, centerStudentId },
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
          returnedNodes: 0,
          returnedEdges: 0,
          maxDepth,
          maxEdges,
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
          returnedNodes: 1,
          returnedEdges: 0,
          maxDepth,
          maxEdges,
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

    return res.json({
      nodes: uniqueNodes.map(mapNode),
      edges: uniqueEdges.map(mapRelationship),
      meta: {
        truncated: totalRelations > uniqueEdges.length,
        totalRelations,
        returnedNodes: uniqueNodes.length,
        returnedEdges: uniqueEdges.length,
        maxDepth,
        maxEdges,
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
