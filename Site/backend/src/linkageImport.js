const fs = require("fs");
const neo4j = require("neo4j-driver");
const csvParser = require("csv-parser");

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
        SET city.ville = row.ville
        MERGE (sch:School {name: row.school})
        SET sch.ecole_actuelle = row.school
        MERGE (student)-[:LIVES_IN]->(city)
        MERGE (student)-[:STUDIES_AT]->(sch)
        MERGE (student)-[:INTERESTED_IN]->(sch)
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
        SET city.ville = row.ville
        MERGE (school:School {name: row.school})
        SET school.ecole_actuelle = row.school
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

/**
 * @param {import("neo4j-driver").Driver} driver
 * @param {(mode: import("neo4j-driver").session.SessionConfig) => import("neo4j-driver").SessionConfig} neo4jSessionConfig
 * @param {object} opts
 */
async function runLinkageImport(driver, neo4jSessionConfig, opts) {
  const {
    studentsPath,
    ambassadorsPath,
    batchSize,
    studentLimit,
    ambassadorLimit,
    wipeGraph = false,
    skipStudentImport = false,
    skipAmbassadorImport = false,
    skipLinkStudentsToAmbassadors = false,
  } = opts;

  const session = driver.session(neo4jSessionConfig(neo4j.session.WRITE));
  const startedAt = Date.now();
  try {
    if (wipeGraph) {
      await session.run("MATCH (n) DETACH DELETE n");
    }
    await ensureGraphConstraints(session);
    const bs = Math.max(100, batchSize);
    const studentStats = skipStudentImport
      ? { imported: 0, rawRows: 0 }
      : await importStudents(session, studentsPath, bs, studentLimit);
    const ambassadorStats = skipAmbassadorImport
      ? { imported: 0, rawRows: 0 }
      : await importAmbassadors(session, ambassadorsPath, bs, ambassadorLimit);
    if (!skipLinkStudentsToAmbassadors) {
      await linkStudentsToAmbassadors(session);
    }
    return {
      ok: true,
      durationMs: Date.now() - startedAt,
      studentsPath,
      ambassadorsPath,
      options: {
        skipStudentImport,
        skipAmbassadorImport,
        skipLinkStudentsToAmbassadors,
        wipeGraph,
      },
      imported: {
        students: studentStats.imported,
        ambassadors: ambassadorStats.imported,
      },
      rawRowsRead: {
        students: studentStats.rawRows,
        ambassadors: ambassadorStats.rawRows,
      },
    };
  } finally {
    await session.close();
  }
}

module.exports = {
  normalizeText,
  ensureGraphConstraints,
  importStudents,
  importAmbassadors,
  linkStudentsToAmbassadors,
  runLinkageImport,
};
