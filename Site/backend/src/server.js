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

function truthyQueryParam(value) {
  const v = normalizeText(value).toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Fusionne ambassadeurs (même école que le centre) + leurs liens STUDIED_AT / LIVES_IN / CONNECTED_TO. */
async function mergeAmbassadorsForCenter(session, centerElementId, uniqueNodes, uniqueEdges) {
  const ambRes = await session.run(
    `
    MATCH (center:Student) WHERE elementId(center) = $centerElementId
    MATCH (center)-[:STUDIES_AT|INTERESTED_IN]->(sch:School)<-[:STUDIED_AT]-(amb:Ambassador)
    MATCH (amb)-[st:STUDIED_AT]->(sch)
    OPTIONAL MATCH (amb)-[lv:LIVES_IN]->(:City)
    OPTIONAL MATCH (center)-[ct:CONNECTED_TO]->(amb)
    RETURN collect(DISTINCT amb) AS ambassadors,
           collect(DISTINCT st) AS studiedRels,
           collect(DISTINCT lv) AS livedRels,
           collect(DISTINCT ct) AS connRels
    `,
    { centerElementId },
  );
  if (ambRes.records.length === 0) {
    return { nodes: uniqueNodes, edges: uniqueEdges, ambassadorCount: 0 };
  }
  const rec = ambRes.records[0];
  const ambassadors = (rec.get("ambassadors") || []).filter(Boolean);
  const studiedRels = (rec.get("studiedRels") || []).filter(Boolean);
  const livedRels = (rec.get("livedRels") || []).filter(Boolean);
  const connRels = (rec.get("connRels") || []).filter(Boolean);

  const nodeMap = new Map(uniqueNodes.map((n) => [n.elementId, n]));
  for (const n of ambassadors) {
    nodeMap.set(n.elementId, n);
  }
  const edgeMap = new Map(uniqueEdges.map((e) => [e.elementId, e]));
  for (const r of [...studiedRels, ...livedRels, ...connRels]) {
    edgeMap.set(r.elementId, r);
  }
  return {
    nodes: [...nodeMap.values()],
    edges: [...edgeMap.values()],
    ambassadorCount: ambassadors.length,
  };
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
  const includeAmbassadors = truthyQueryParam(req.query.includeAmbassadors);

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
      let soloNodes = [centerNode];
      let soloEdges = [];
      let soloAmbassadorCount = 0;
      if (includeAmbassadors) {
        const merged = await mergeAmbassadorsForCenter(session, centerNode.elementId, soloNodes, soloEdges);
        soloNodes = merged.nodes;
        soloEdges = merged.edges;
        soloAmbassadorCount = merged.ambassadorCount;
      }
      const cappedSolo = capGraphPayload(centerNode.elementId, soloNodes, soloEdges, maxNodes);
      return res.json({
        nodes: cappedSolo.nodes.map(mapNode),
        edges: cappedSolo.edges.map(mapRelationship),
        meta: {
          truncated: false,
          truncatedNodes: cappedSolo.truncatedNodes,
          totalNodesBeforeCap: soloNodes.length,
          returnedNodes: cappedSolo.nodes.length,
          returnedEdges: cappedSolo.edges.length,
          maxDepth,
          maxEdges,
          maxNodes,
          centerFallbackUsed,
          includeAmbassadors,
          ambassadorsMerged: includeAmbassadors ? soloAmbassadorCount : undefined,
        },
      });
    }

    const record = graphResult.records[0];
    const nodes = record.get("nodes");
    const relationships = record.get("relationships");
    const totalRelations = Number(record.get("totalRelations") ?? 0);

    let uniqueNodes = Array.from(new Map(nodes.map((node) => [node.elementId, node])).values());
    let uniqueEdges = Array.from(
      new Map(relationships.map((edge) => [edge.elementId, edge])).values(),
    );

    let ambassadorCount = 0;
    if (includeAmbassadors) {
      const merged = await mergeAmbassadorsForCenter(
        session,
        centerNode.elementId,
        uniqueNodes,
        uniqueEdges,
      );
      uniqueNodes = merged.nodes;
      uniqueEdges = merged.edges;
      ambassadorCount = merged.ambassadorCount;
    }

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
        includeAmbassadors,
        ambassadorsMerged: includeAmbassadors ? ambassadorCount : undefined,
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
