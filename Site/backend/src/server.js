const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const neo4j = require("neo4j-driver");

dotenv.config();

const { normalizeText, runLinkageImport } = require("./linkageImport");

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

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "linkage-backend" });
});

app.post("/api/linkage/import", async (req, res) => {
  const studentsPath = req.body?.studentsPath
    ? path.resolve(req.body.studentsPath)
    : CSV_STUDENTS_PATH;
  const ambassadorsPath = req.body?.ambassadorsPath
    ? path.resolve(req.body.ambassadorsPath)
    : CSV_AMBASSADORS_PATH;
  const batchSize = Number(req.body?.batchSize ?? IMPORT_BATCH_SIZE);
  const studentLimit = req.body?.studentLimit ? Number(req.body.studentLimit) : undefined;
  const ambassadorLimit = req.body?.ambassadorLimit ? Number(req.body.ambassadorLimit) : undefined;
  const wipeGraph = Boolean(req.body?.wipeGraph);
  const skipStudentImport = Boolean(req.body?.skipStudentImport);
  const skipAmbassadorImport = Boolean(req.body?.skipAmbassadorImport);
  const skipLinkStudentsToAmbassadors = Boolean(req.body?.skipLinkStudentsToAmbassadors);

  try {
    const payload = await runLinkageImport(driver, neo4jSessionConfig, {
      studentsPath,
      ambassadorsPath,
      batchSize,
      studentLimit: Number.isFinite(studentLimit) ? studentLimit : undefined,
      ambassadorLimit: Number.isFinite(ambassadorLimit) ? ambassadorLimit : undefined,
      wipeGraph,
      skipStudentImport,
      skipAmbassadorImport,
      skipLinkStudentsToAmbassadors,
    });
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Echec de l'import CSV vers Neo4j.",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/api/linkage/graph", async (req, res) => {
  const session = driver.session(neo4jSessionConfig(neo4j.session.READ));

  const maxDepth = Math.max(1, Math.min(GRAPH_LIMITS.maxDepth, Number(req.query.maxDepth ?? 2)));
  const maxEdges = Math.max(15, Math.min(GRAPH_LIMITS.maxEdges, Number(req.query.maxEdges ?? 400)));
  const maxNodes = Math.max(24, Math.min(GRAPH_LIMITS.maxNodes, Number(req.query.maxNodes ?? 96)));
  const perNodeLimit = Math.max(3, Math.min(25, Number(req.query.perNodeLimit ?? 10)));
  const centerEmail = normalizeText(req.query.centerEmail).toLowerCase() || null;
  const centerStudentId = normalizeText(req.query.centerStudentId) || null;
  const centerPrenom = normalizeText(req.query.centerPrenom).toLowerCase() || null;
  const centerNom = normalizeText(req.query.centerNom).toLowerCase() || null;
  const typesQuery = normalizeText(req.query.types);
  const relationshipTypes = typesQuery
    ? typesQuery.split(",").map((value) => normalizeText(value)).filter(Boolean)
    : [];
  const explicitCenter =
    Boolean(centerEmail) || Boolean(centerStudentId) || (Boolean(centerPrenom) && Boolean(centerNom));

  /** Même logique que la requête Aura : 1 saut centre, ambassadeurs des écoles du centre, puis max N arêtes par nœud pivot. */
  const neighborhoodGraphQuery = `
    MATCH (center:Student) WHERE elementId(center) = $centerElementId
    OPTIONAL MATCH p1 = (center)-[r1]-(n1)
    WITH center, collect(DISTINCT p1) AS paths1Raw, collect(DISTINCT n1) AS nbrsRaw
    WITH center,
         [p IN paths1Raw WHERE p IS NOT NULL AND size(relationships(p)) > 0] AS paths1,
         [n IN nbrsRaw WHERE n IS NOT NULL] AS nbrs
    OPTIONAL MATCH (center)-[:STUDIES_AT|INTERESTED_IN]->(:School)<-[:STUDIED_AT]-(amb:Ambassador)
    WITH center, paths1, nbrs, collect(DISTINCT amb) AS ambsRaw
    WITH center, paths1, nbrs, [a IN ambsRaw WHERE a IS NOT NULL] AS ambs
    OPTIONAL MATCH pAmb = (center)-[:STUDIES_AT|INTERESTED_IN]->(:School)<-[:STUDIED_AT]-(amb2:Ambassador)
    WHERE amb2 IN ambs
    WITH center, paths1, nbrs, ambs, collect(DISTINCT pAmb) AS pathsAmbRaw
    WITH center, paths1, nbrs, ambs,
         [p IN pathsAmbRaw WHERE p IS NOT NULL AND size(relationships(p)) > 0] AS pathsAmb,
         [center] + nbrs + ambs AS noeuds
    UNWIND noeuds AS x
    CALL (x) {
      WITH x
      MATCH p2 = (x)-[r2]-(y)
      WHERE size($relationshipTypes) = 0 OR type(r2) IN $relationshipTypes
      WITH p2, r2, y
      ORDER BY type(r2), elementId(y)
      LIMIT $perNodeLimit
      RETURN collect(p2) AS chunk
    }
    WITH center, paths1, pathsAmb, collect(chunk) AS chunks
    WITH center, paths1, pathsAmb, reduce(acc = [], c IN chunks | acc + c) AS paths2
    WITH center, [p IN paths1 WHERE p IS NOT NULL] + [p IN paths2 WHERE p IS NOT NULL] + [p IN pathsAmb WHERE p IS NOT NULL] AS allPaths
    UNWIND allPaths AS p
    UNWIND relationships(p) AS rel
    WITH center, rel
    WHERE size($relationshipTypes) = 0 OR type(rel) IN $relationshipTypes
    WITH center, collect(DISTINCT rel) AS allRels
    WITH center, allRels, size(allRels) AS totalRelations
    WITH center, totalRelations, allRels[0..$maxEdges] AS limitedRels
    WITH center, totalRelations,
         CASE WHEN size(limitedRels) > 0 THEN limitedRels ELSE [] END AS relationships
    WITH center, totalRelations, relationships,
         reduce(acc = [], r IN relationships | acc + [startNode(r), endNode(r)]) AS rawEnds
    UNWIND (rawEnds + CASE WHEN size(relationships) = 0 THEN [center] ELSE [] END) AS n
    WITH totalRelations, relationships, collect(DISTINCT n) AS nodes
    RETURN nodes, relationships, totalRelations
  `;

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

    if (!centerNode && !explicitCenter) {
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
          perNodeLimit,
          centerFallbackUsed,
          centerMatched: false,
          graphEngine: "neighborhood",
          relationshipTypes,
        },
      });
    }

    const graphResult = await session.run(neighborhoodGraphQuery, {
      centerElementId: centerNode.elementId,
      relationshipTypes,
      maxEdges: neo4j.int(maxEdges),
      perNodeLimit: neo4j.int(perNodeLimit),
    });

    if (graphResult.records.length === 0) {
      const cappedSolo = capGraphPayload(centerNode.elementId, [centerNode], [], maxNodes);
      return res.json({
        nodes: cappedSolo.nodes.map(mapNode),
        edges: [],
        meta: {
          truncated: false,
          truncatedNodes: cappedSolo.truncatedNodes,
          totalNodesBeforeCap: 1,
          totalRelations: 0,
          returnedNodes: cappedSolo.nodes.length,
          returnedEdges: 0,
          maxDepth,
          maxEdges,
          maxNodes,
          perNodeLimit,
          centerFallbackUsed,
          centerMatched: true,
          graphEngine: "neighborhood",
          relationshipTypes,
        },
      });
    }

    const record = graphResult.records[0];
    const nodes = record.get("nodes") || [];
    const relationships = record.get("relationships") || [];
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
        perNodeLimit,
        relationshipTypes,
        centerFallbackUsed,
        centerMatched: true,
        graphEngine: "neighborhood",
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
