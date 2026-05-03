#!/usr/bin/env node
/**
 * Import CSV -> Neo4j (local ou Aura) sans lancer le serveur HTTP.
 * Lit backend/.env : NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, NEO4J_DATABASE (optionnel),
 * CSV_STUDENTS_PATH, CSV_AMBASSADORS_PATH, IMPORT_BATCH_SIZE.
 *
 * Usage:
 *   cd backend && node scripts/run-linkage-import.js --wipe
 *   node scripts/run-linkage-import.js --wipe --students 15000 --ambassadors 1000
 *   node scripts/run-linkage-import.js --skip-students --ambassadors 1200 --skip-link
 *     (ambassadeurs seuls + pas de CONNECTED_TO — utile si Aura est proche du plafond relations)
 *
 * Variables d'environnement (prioritaires sur les flags si tu préfères):
 *   LINKAGE_WIPE=1
 *   LINKAGE_STUDENT_LIMIT=15000
 *   LINKAGE_AMBASSADOR_LIMIT=1000
 *   LINKAGE_SKIP_STUDENTS=1  LINKAGE_SKIP_LINK=1
 */

const path = require("path");
const dotenv = require("dotenv");
const neo4j = require("neo4j-driver");
const { runLinkageImport } = require("../src/linkageImport");

dotenv.config({ path: path.join(__dirname, "../.env") });

function sanitizeEnvString(value) {
  if (value === undefined || value === null) return "";
  let s = String(value).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

const NEO4J_URI = sanitizeEnvString(process.env.NEO4J_URI) || "bolt://localhost:7687";
const NEO4J_USERNAME = sanitizeEnvString(process.env.NEO4J_USERNAME) || "neo4j";
const NEO4J_PASSWORD = sanitizeEnvString(process.env.NEO4J_PASSWORD) || "neo4jpassword";
const NEO4J_DATABASE = sanitizeEnvString(process.env.NEO4J_DATABASE);
const IMPORT_BATCH_SIZE = Math.max(100, Number(process.env.IMPORT_BATCH_SIZE ?? 2000));
const CSV_STUDENTS_PATH =
  process.env.CSV_STUDENTS_PATH ??
  path.resolve(__dirname, "../../moc_data/Résultats/database_etudiants_300k.csv");
const CSV_AMBASSADORS_PATH =
  process.env.CSV_AMBASSADORS_PATH ??
  path.resolve(__dirname, "../../moc_data/Résultats/ambassadeurs_data_heavy.csv");

function neo4jSessionConfig(accessMode) {
  const cfg = { defaultAccessMode: accessMode };
  if (NEO4J_DATABASE) {
    cfg.database = NEO4J_DATABASE;
  }
  return cfg;
}

function parseArgs(argv) {
  const wipe =
    argv.includes("--wipe") ||
    sanitizeEnvString(process.env.LINKAGE_WIPE) === "1" ||
    sanitizeEnvString(process.env.LINKAGE_WIPE).toLowerCase() === "true";
  let studentLimit;
  let ambassadorLimit;
  const si = argv.indexOf("--students");
  if (si >= 0 && argv[si + 1]) studentLimit = Number(argv[si + 1]);
  const ai = argv.indexOf("--ambassadors");
  if (ai >= 0 && argv[ai + 1]) ambassadorLimit = Number(argv[ai + 1]);
  if (process.env.LINKAGE_STUDENT_LIMIT) {
    studentLimit = Number(process.env.LINKAGE_STUDENT_LIMIT);
  }
  if (process.env.LINKAGE_AMBASSADOR_LIMIT) {
    ambassadorLimit = Number(process.env.LINKAGE_AMBASSADOR_LIMIT);
  }
  if (!Number.isFinite(studentLimit)) studentLimit = 25_000;
  if (!Number.isFinite(ambassadorLimit)) ambassadorLimit = 1000;
  const skipStudentImport =
    argv.includes("--skip-students") ||
    sanitizeEnvString(process.env.LINKAGE_SKIP_STUDENTS) === "1" ||
    sanitizeEnvString(process.env.LINKAGE_SKIP_STUDENTS).toLowerCase() === "true";
  const skipAmbassadorImport =
    argv.includes("--skip-ambassadors") ||
    sanitizeEnvString(process.env.LINKAGE_SKIP_AMBASSADORS) === "1";
  const skipLinkStudentsToAmbassadors =
    argv.includes("--skip-link") ||
    sanitizeEnvString(process.env.LINKAGE_SKIP_LINK) === "1" ||
    sanitizeEnvString(process.env.LINKAGE_SKIP_LINK).toLowerCase() === "true";
  return {
    wipe,
    studentLimit,
    ambassadorLimit,
    skipStudentImport,
    skipAmbassadorImport,
    skipLinkStudentsToAmbassadors,
  };
}

async function main() {
  const {
    wipe,
    studentLimit,
    ambassadorLimit,
    skipStudentImport,
    skipAmbassadorImport,
    skipLinkStudentsToAmbassadors,
  } = parseArgs(process.argv.slice(2));

  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD), {
    disableLosslessIntegers: true,
  });

  try {
    // eslint-disable-next-line no-console
    console.log("[linkage-import] NEO4J_URI:", NEO4J_URI.replace(/:[^@/]+@/, ":***@"));
    // eslint-disable-next-line no-console
    console.log("[linkage-import] CSV students:", CSV_STUDENTS_PATH);
    // eslint-disable-next-line no-console
    console.log("[linkage-import] CSV ambassadors:", CSV_AMBASSADORS_PATH);
    // eslint-disable-next-line no-console
    console.log("[linkage-import] limits:", {
      studentLimit,
      ambassadorLimit,
      wipe,
      skipStudentImport,
      skipAmbassadorImport,
      skipLinkStudentsToAmbassadors,
    });

    const result = await runLinkageImport(driver, neo4jSessionConfig, {
      studentsPath: CSV_STUDENTS_PATH,
      ambassadorsPath: CSV_AMBASSADORS_PATH,
      batchSize: IMPORT_BATCH_SIZE,
      studentLimit,
      ambassadorLimit,
      wipeGraph: wipe,
      skipStudentImport,
      skipAmbassadorImport,
      skipLinkStudentsToAmbassadors,
    });

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[linkage-import] erreur:", err && err.message ? err.message : err);
    if (err && err.code) {
      // eslint-disable-next-line no-console
      console.error("[linkage-import] code:", err.code);
    }
    if (err && err.gqlStatus) {
      // eslint-disable-next-line no-console
      console.error("[linkage-import] gqlStatus:", err.gqlStatus, err.gqlStatusDescription || "");
    }
    process.exit(1);
  } finally {
    await driver.close();
  }
}

main();
