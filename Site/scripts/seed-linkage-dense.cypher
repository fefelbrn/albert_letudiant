// Graphe de démo dense pour Linkage (Neo4j Browser / Aura).
// Optionnel : repartir de zéro (décommente la ligne suivante).
// MATCH (n) DETACH DELETE n;

CREATE CONSTRAINT student_email_unique IF NOT EXISTS FOR (s:Student) REQUIRE s.email IS UNIQUE;
CREATE CONSTRAINT ambassador_email_unique IF NOT EXISTS FOR (a:Ambassador) REQUIRE a.email IS UNIQUE;
CREATE CONSTRAINT school_name_unique IF NOT EXISTS FOR (s:School) REQUIRE s.name IS UNIQUE;
CREATE CONSTRAINT city_name_unique IF NOT EXISTS FOR (c:City) REQUIRE c.name IS UNIQUE;
CREATE CONSTRAINT sourcelead_name_unique IF NOT EXISTS FOR (sl:SourceLead) REQUIRE sl.name IS UNIQUE;
CREATE CONSTRAINT niveauscolaire_name_unique IF NOT EXISTS FOR (n:NiveauScolaire) REQUIRE n.name IS UNIQUE;
CREATE CONSTRAINT typeetablissement_name_unique IF NOT EXISTS FOR (t:TypeEtablissement) REQUIRE t.name IS UNIQUE;

// --- Villes
UNWIND [
  "Nice", "Paris", "Lyon", "Lille", "Nantes", "Toulouse", "Bordeaux", "Strasbourg", "Montpellier", "Rennes"
] AS cityName
MERGE (:City {name: cityName});

// --- Écoles + ville d’implantation
UNWIND [
  {name: "Lycée Condorcet", city: "Nice"},
  {name: "Lycée Masséna", city: "Nice"},
  {name: "Lycée Louis-le-Grand", city: "Paris"},
  {name: "HEC Paris", city: "Paris"},
  {name: "ESCP", city: "Paris"},
  {name: "ESSEC", city: "Paris"},
  {name: "Sorbonne Université", city: "Paris"},
  {name: "Centrale Lyon", city: "Lyon"},
  {name: "Lycée du Parc", city: "Lyon"},
  {name: "EDHEC", city: "Lille"},
  {name: "Audencia", city: "Nantes"},
  {name: "Université Toulouse Capitole", city: "Toulouse"},
  {name: "Kedge Bordeaux", city: "Bordeaux"},
  {name: "CentraleSupélec", city: "Paris"},
  {name: "Mines Paris", city: "Paris"},
  {name: "Ecole Polytechnique", city: "Paris"}
] AS sch
MATCH (c:City {name: sch.city})
MERGE (s:School {name: sch.name})
MERGE (s)-[:LOCATED_IN]->(c);

// --- Élèves (STUDIES_AT + intérêts multiples + enrichissement)
UNWIND [
  {id: "2", prenom: "Léa", nom: "Petit", email: "lea.petit2@mail.fr", ville: "Nice", ecole: "Lycée Condorcet", niveau: "Terminale", source: "QR Code Lycée", typ: "Lycée Public", ints: ["HEC Paris", "ESCP", "Sorbonne Université", "ESSEC"]},
  {id: "3", prenom: "Marie", nom: "Dupont", email: "marie.dupont.demo@mail.fr", ville: "Nice", ecole: "Lycée Condorcet", niveau: "Terminale", source: "Instagram", typ: "Lycée Public", ints: ["EDHEC", "Audencia", "HEC Paris"]},
  {id: "4", prenom: "Lucas", nom: "Bernard", email: "lucas.bernard01@mail.fr", ville: "Nice", ecole: "Lycée Masséna", niveau: "Première", source: "Salon étudiant", typ: "Lycée Public", ints: ["Centrale Lyon", "CentraleSupélec", "Mines Paris"]},
  {id: "5", prenom: "Emma", nom: "Thomas", email: "emma.thomas02@mail.fr", ville: "Paris", ecole: "Lycée Louis-le-Grand", niveau: "Terminale", source: "Site web lycée", typ: "Lycée Public", ints: ["Ecole Polytechnique", "HEC Paris", "ESCP"]},
  {id: "6", prenom: "Hugo", nom: "Robert", email: "hugo.robert03@mail.fr", ville: "Paris", ecole: "Lycée Louis-le-Grand", niveau: "Terminale", source: "QR Code Lycée", typ: "Lycée Public", ints: ["Sorbonne Université", "ESSEC", "CentraleSupélec"]},
  {id: "7", prenom: "Chloé", nom: "Richard", email: "chloe.richard04@mail.fr", ville: "Lyon", ecole: "Lycée du Parc", niveau: "Terminale", source: "Ambassadeur", typ: "Lycée Public", ints: ["Centrale Lyon", "HEC Paris", "EDHEC"]},
  {id: "8", prenom: "Nathan", nom: "Durand", email: "nathan.durand05@mail.fr", ville: "Lyon", ecole: "Lycée du Parc", niveau: "Première", source: "Instagram", typ: "Lycée Public", ints: ["Audencia", "ESCP", "Kedge Bordeaux"]},
  {id: "9", prenom: "Inès", nom: "Moreau", email: "ines.moreau06@mail.fr", ville: "Lille", ecole: "Lycée Masséna", niveau: "Terminale", source: "TikTok", typ: "Lycée Public", ints: ["EDHEC", "HEC Paris", "ESSEC"]},
  {id: "10", prenom: "Tom", nom: "Laurent", email: "tom.laurent07@mail.fr", ville: "Nantes", ecole: "Lycée Condorcet", niveau: "Terminale", source: "Salon étudiant", typ: "Lycée Public", ints: ["Audencia", "Kedge Bordeaux", "Université Toulouse Capitole"]},
  {id: "11", prenom: "Sarah", nom: "Simon", email: "sarah.simon08@mail.fr", ville: "Toulouse", ecole: "Lycée Masséna", niveau: "Première", source: "Site web lycée", typ: "Lycée Public", ints: ["Université Toulouse Capitole", "HEC Paris", "ESSEC"]},
  {id: "12", prenom: "Maxime", nom: "Michel", email: "maxime.michel09@mail.fr", ville: "Bordeaux", ecole: "Lycée Condorcet", niveau: "Terminale", source: "QR Code Lycée", typ: "Lycée Public", ints: ["Kedge Bordeaux", "EDHEC", "Audencia"]},
  {id: "13", prenom: "Julie", nom: "Garcia", email: "julie.garcia10@mail.fr", ville: "Strasbourg", ecole: "Lycée Masséna", niveau: "Terminale", source: "Instagram", typ: "Lycée Public", ints: ["Sorbonne Université", "ESCP", "Mines Paris"]},
  {id: "14", prenom: "Antoine", nom: "David", email: "antoine.david11@mail.fr", ville: "Montpellier", ecole: "Lycée du Parc", niveau: "Première", source: "Ambassadeur", typ: "Lycée Public", ints: ["Ecole Polytechnique", "CentraleSupélec", "Centrale Lyon"]},
  {id: "15", prenom: "Camille", nom: "Bertrand", email: "camille.bertrand12@mail.fr", ville: "Rennes", ecole: "Lycée Louis-le-Grand", niveau: "Terminale", source: "TikTok", typ: "Lycée Public", ints: ["Audencia", "HEC Paris", "ESSEC"]},
  {id: "16", prenom: "Louis", nom: "Roux", email: "louis.roux13@mail.fr", ville: "Paris", ecole: "Lycée Masséna", niveau: "Terminale", source: "Salon étudiant", typ: "Lycée Public", ints: ["ESCP", "EDHEC", "Kedge Bordeaux"]},
  {id: "17", prenom: "Zoé", nom: "Vincent", email: "zoe.vincent14@mail.fr", ville: "Lyon", ecole: "Lycée du Parc", niveau: "Première", source: "Site web lycée", typ: "Lycée Public", ints: ["Sorbonne Université", "Université Toulouse Capitole", "Mines Paris"]},
  {id: "18", prenom: "Ethan", nom: "Fournier", email: "ethan.fournier15@mail.fr", ville: "Lyon", ecole: "Lycée Condorcet", niveau: "Terminale", source: "QR Code Lycée", typ: "Lycée Public", ints: ["Centrale Lyon", "Ecole Polytechnique", "HEC Paris"]},
  {id: "19", prenom: "Manon", nom: "Morel", email: "manon.morel16@mail.fr", ville: "Lille", ecole: "Lycée Louis-le-Grand", niveau: "Terminale", source: "Instagram", typ: "Lycée Public", ints: ["EDHEC", "ESCP", "Audencia"]},
  {id: "20", prenom: "Noah", nom: "Girard", email: "noah.girard17@mail.fr", ville: "Nantes", ecole: "Lycée Masséna", niveau: "Première", source: "Ambassadeur", typ: "Lycée Public", ints: ["Audencia", "CentraleSupélec", "ESSEC"]},
  {id: "21", prenom: "Léna", nom: "André", email: "lena.andre18@mail.fr", ville: "Toulouse", ecole: "Lycée Louis-le-Grand", niveau: "Terminale", source: "TikTok", typ: "Lycée Public", ints: ["Université Toulouse Capitole", "Sorbonne Université", "HEC Paris"]},
  {id: "22", prenom: "Gabriel", nom: "Lefebvre", email: "gabriel.lefebvre19@mail.fr", ville: "Bordeaux", ecole: "Lycée du Parc", niveau: "Terminale", source: "Salon étudiant", typ: "Lycée Public", ints: ["Kedge Bordeaux", "ESCP", "Mines Paris"]},
  {id: "23", prenom: "Clara", nom: "Mercier", email: "clara.mercier20@mail.fr", ville: "Paris", ecole: "Lycée Condorcet", niveau: "Première", source: "Site web lycée", typ: "Lycée Public", ints: ["HEC Paris", "ESSEC", "Ecole Polytechnique"]},
  {id: "24", prenom: "Adam", nom: "Bonnet", email: "adam.bonnet21@mail.fr", ville: "Nice", ecole: "Lycée Louis-le-Grand", niveau: "Terminale", source: "QR Code Lycée", typ: "Lycée Public", ints: ["Centrale Lyon", "EDHEC", "Audencia"]},
  {id: "25", prenom: "Rose", nom: "Fontaine", email: "rose.fontaine22@mail.fr", ville: "Lyon", ecole: "Lycée Masséna", niveau: "Terminale", source: "Instagram", typ: "Lycée Public", ints: ["Centrale Lyon", "Sorbonne Université", "Kedge Bordeaux"]},
  {id: "26", prenom: "Paul", nom: "Chevalier", email: "paul.chevalier23@mail.fr", ville: "Rennes", ecole: "Lycée Condorcet", niveau: "Première", source: "Ambassadeur", typ: "Lycée Public", ints: ["Audencia", "HEC Paris", "CentraleSupélec"]},
  {id: "27", prenom: "Jade", nom: "Robin", email: "jade.robin24@mail.fr", ville: "Strasbourg", ecole: "Lycée Louis-le-Grand", niveau: "Terminale", source: "TikTok", typ: "Lycée Public", ints: ["Mines Paris", "ESCP", "ESSEC"]},
  {id: "28", prenom: "Arthur", nom: "Masson", email: "arthur.masson25@mail.fr", ville: "Montpellier", ecole: "Lycée Masséna", niveau: "Terminale", source: "Salon étudiant", typ: "Lycée Public", ints: ["Ecole Polytechnique", "HEC Paris", "Université Toulouse Capitole"]},
  {id: "29", prenom: "Louna", nom: "Fabre", email: "louna.fabre26@mail.fr", ville: "Paris", ecole: "Lycée du Parc", niveau: "Première", source: "Site web lycée", typ: "Lycée Public", ints: ["Sorbonne Université", "EDHEC", "Mines Paris"]},
  {id: "30", prenom: "Enzo", nom: "Blanc", email: "enzo.blanc27@mail.fr", ville: "Lille", ecole: "Lycée Condorcet", niveau: "Terminale", source: "QR Code Lycée", typ: "Lycée Public", ints: ["EDHEC", "ESSEC", "Audencia"]},
  {id: "31", prenom: "Anna", nom: "Guerin", email: "anna.guerin28@mail.fr", ville: "Nantes", ecole: "Lycée du Parc", niveau: "Terminale", source: "Instagram", typ: "Lycée Public", ints: ["Audencia", "Kedge Bordeaux", "HEC Paris"]},
  {id: "32", prenom: "Théo", nom: "Muller", email: "theo.muller29@mail.fr", ville: "Bordeaux", ecole: "Lycée Louis-le-Grand", niveau: "Première", source: "Ambassadeur", typ: "Lycée Public", ints: ["Kedge Bordeaux", "Centrale Lyon", "ESCP"]},
  {id: "33", prenom: "Lisa", nom: "Henry", email: "lisa.henry30@mail.fr", ville: "Toulouse", ecole: "Lycée Condorcet", niveau: "Terminale", source: "TikTok", typ: "Lycée Public", ints: ["Université Toulouse Capitole", "Mines Paris", "Ecole Polytechnique"]},
  {id: "34", prenom: "Romain", nom: "Rousseau", email: "romain.rousseau31@mail.fr", ville: "Nice", ecole: "Lycée Masséna", niveau: "Terminale", source: "Salon étudiant", typ: "Lycée Public", ints: ["HEC Paris", "CentraleSupélec", "Sorbonne Université"]},
  {id: "35", prenom: "Eva", nom: "Nicolas", email: "eva.nicolas32@mail.fr", ville: "Lyon", ecole: "Lycée Louis-le-Grand", niveau: "Première", source: "Site web lycée", typ: "Lycée Public", ints: ["Centrale Lyon", "ESSEC", "EDHEC"]},
  {id: "36", prenom: "Mathis", nom: "Perrin", email: "mathis.perrin33@mail.fr", ville: "Paris", ecole: "Lycée Masséna", niveau: "Terminale", source: "QR Code Lycée", typ: "Lycée Public", ints: ["ESCP", "HEC Paris", "Audencia"]},
  {id: "37", prenom: "Nina", nom: "Morin", email: "nina.morin34@mail.fr", ville: "Rennes", ecole: "Lycée du Parc", niveau: "Terminale", source: "Instagram", typ: "Lycée Public", ints: ["Audencia", "Kedge Bordeaux", "Sorbonne Université"]},
  {id: "38", prenom: "Timéo", nom: "Mathieu", email: "timeo.mathieu35@mail.fr", ville: "Strasbourg", ecole: "Lycée Condorcet", niveau: "Première", source: "Ambassadeur", typ: "Lycée Public", ints: ["Mines Paris", "CentraleSupélec", "ESSEC"]},
  {id: "39", prenom: "Ambre", nom: "Clement", email: "ambre.clement36@mail.fr", ville: "Montpellier", ecole: "Lycée Louis-le-Grand", niveau: "Terminale", source: "TikTok", typ: "Lycée Public", ints: ["Ecole Polytechnique", "HEC Paris", "Université Toulouse Capitole"]},
  {id: "40", prenom: "Sacha", nom: "Gauthier", email: "sacha.gauthier37@mail.fr", ville: "Lille", ecole: "Lycée Masséna", niveau: "Terminale", source: "Salon étudiant", typ: "Lycée Public", ints: ["EDHEC", "ESCP", "Mines Paris"]},
  {id: "41", prenom: "Lilou", nom: "Dumont", email: "lilou.dumont38@mail.fr", ville: "Nantes", ecole: "Lycée Louis-le-Grand", niveau: "Première", source: "Site web lycée", typ: "Lycée Public", ints: ["Audencia", "ESSEC", "Centrale Lyon"]}
] AS row
MERGE (stu:Student {email: row.email})
SET
  stu.id = row.id,
  stu.prenom = row.prenom,
  stu.nom = row.nom,
  stu.name = trim(row.prenom + " " + row.nom),
  stu.niveau_actuel = row.niveau,
  stu.source_lead = row.source,
  stu.date_inscription = "2025-01-15",
  stu.tel = "06" + row.id + "000000"
MERGE (city:City {name: row.ville})
MERGE (school:School {name: row.ecole})
MERGE (stu)-[:LIVES_IN]->(city)
MERGE (stu)-[:STUDIES_AT]->(school)
MERGE (stu)-[:INTERESTED_IN]->(school)
MERGE (niv:NiveauScolaire {name: row.niveau})
MERGE (stu)-[:HAS_NIVEAU]->(niv)
WITH stu, row, school
WHERE coalesce(trim(row.source), "") <> ""
MERGE (sl:SourceLead {name: row.source})
MERGE (stu)-[:DISCOVERED_VIA]->(sl)
WITH stu, row, school
MERGE (tt:TypeEtablissement {name: row.typ})
MERGE (stu)-[:HAS_TYPE_ETABLISSEMENT]->(tt)
MERGE (school)-[:CATEGORIZED_AS]->(tt)
WITH stu, row
UNWIND row.ints AS interestName
MERGE (is:School {name: interestName})
MERGE (stu)-[:INTERESTED_IN]->(is);

// --- Ambassadeurs (même écoles sup pour lier CONNECTED_TO)
UNWIND [
  {prenom: "Jean", nom: "Martin", email: "jean.martin.amb@mail.fr", ville: "Nice", school: "HEC Paris"},
  {prenom: "Amina", nom: "Kadi", email: "amina.kadi.amb@mail.fr", ville: "Paris", school: "ESCP"},
  {prenom: "Clément", nom: "Roux", email: "clement.roux.amb@mail.fr", ville: "Lyon", school: "Centrale Lyon"},
  {prenom: "Sofia", nom: "Alves", email: "sofia.alves.amb@mail.fr", ville: "Lille", school: "EDHEC"},
  {prenom: "Yanis", nom: "Benali", email: "yanis.benali.amb@mail.fr", ville: "Nantes", school: "Audencia"},
  {prenom: "Laura", nom: "Petit", email: "laura.petit.amb@mail.fr", ville: "Toulouse", school: "Université Toulouse Capitole"},
  {prenom: "Marc", nom: "Dubois", email: "marc.dubois.amb@mail.fr", ville: "Bordeaux", school: "Kedge Bordeaux"},
  {prenom: "Inès", nom: "Caron", email: "ines.caron.amb@mail.fr", ville: "Paris", school: "Sorbonne Université"},
  {prenom: "Hugo", nom: "Masson", email: "hugo.masson.amb@mail.fr", ville: "Paris", school: "CentraleSupélec"},
  {prenom: "Sarah", nom: "Leroy", email: "sarah.leroy.amb@mail.fr", ville: "Paris", school: "Mines Paris"},
  {prenom: "Thomas", nom: "Robert", email: "thomas.robert.amb@mail.fr", ville: "Paris", school: "Ecole Polytechnique"},
  {prenom: "Élise", nom: "Moreau", email: "elise.moreau.amb@mail.fr", ville: "Paris", school: "ESSEC"},
  {prenom: "Karim", nom: "Oualid", email: "karim.oualid.amb@mail.fr", ville: "Paris", school: "HEC Paris"},
  {prenom: "Camille", nom: "Bernard", email: "camille.bernard.amb@mail.fr", ville: "Lyon", school: "Centrale Lyon"},
  {prenom: "Mehdi", nom: "Saidi", email: "mehdi.saidi.amb@mail.fr", ville: "Lille", school: "EDHEC"},
  {prenom: "Chloé", nom: "Renard", email: "chloe.renard.amb@mail.fr", ville: "Nantes", school: "Audencia"}
] AS row
MERGE (amb:Ambassador {email: row.email})
SET
  amb.prenom = row.prenom,
  amb.nom = row.nom,
  amb.name = trim(row.prenom + " " + row.nom),
  amb.niveau_actuel = "Master"
MERGE (c:City {name: row.ville})
MERGE (sch:School {name: row.school})
MERGE (amb)-[:LIVES_IN]->(c)
MERGE (amb)-[:STUDIED_AT]->(sch);

// --- Partenariats entre écoles (chemins transverses)
MERGE (s1:School {name: "HEC Paris"})-[:PARTNERS_WITH]->(s2:School {name: "ESSEC"});
MERGE (s1:School {name: "ESCP"})-[:PARTNERS_WITH]->(s2:School {name: "HEC Paris"});
MERGE (s1:School {name: "EDHEC"})-[:PARTNERS_WITH]->(s2:School {name: "Audencia"});
MERGE (s1:School {name: "CentraleSupélec"})-[:PARTNERS_WITH]->(s2:School {name: "Ecole Polytechnique"});
MERGE (s1:School {name: "Mines Paris"})-[:PARTNERS_WITH]->(s2:School {name: "Sorbonne Université"});
MERGE (s1:School {name: "Centrale Lyon"})-[:PARTNERS_WITH]->(s2:School {name: "CentraleSupélec"});
MERGE (s1:School {name: "Kedge Bordeaux"})-[:PARTNERS_WITH]->(s2:School {name: "EDHEC"});

// --- Liens élève → ambassadeurs (même école d’intérêt / d’études sup)
MATCH (student:Student)-[:INTERESTED_IN|STUDIES_AT]->(school:School)<-[:STUDIED_AT]-(ambassador:Ambassador)
WITH student, collect(DISTINCT ambassador)[0..4] AS ambassadors
UNWIND ambassadors AS ambassador
MERGE (student)-[:CONNECTED_TO]->(ambassador);
