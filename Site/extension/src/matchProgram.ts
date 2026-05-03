import type { ExtensionStudentProfile, FitAnalysis, ProgramIntel } from "./types";

function mockAmbassadors(intel: ProgramIntel): FitAnalysis["ambassadors"] {
  const ecole = intel.schoolNameGuess;
  return [
    {
      nom: "Ambassadeur·e — portail " + ecole,
      filiere: intel.programNameGuess.slice(0, 60),
      canal: "Formulaire « Ask a student » ou LinkedIn école",
    },
    {
      nom: "Association étudiante (intégration)",
      filiere: "Accueil nouveaux élèves",
      canal: "Site campus vie / Instagram asso",
    },
  ];
}

function mockSimilar(intel: ProgramIntel, profile: ExtensionStudentProfile): FitAnalysis["similarProfiles"] {
  const prog = intel.programNameGuess;
  return [
    {
      prenom: "Camille",
      parcours: "Terminale ES puis prépa ECE, maths « moyennes » → " + prog,
      angle: "Renfort maths en prépa + oral blancs ; viser 14–15 en maths de concours.",
    },
    {
      prenom: "Ibrahim",
      parcours: "DUT GEA, autodidacte stats → admission parallèle",
      angle: "MOOC probas + projet perso Excel/Python pour rattraper le gap quanti.",
    },
    {
      prenom: "Léa",
      parcours: "Licence éco, peur des maths → renforts ciblés",
      angle: "Cours particuliers ciblés sur optimisation & séries (objectif 15/20 en L3).",
    },
  ].slice(0, profile.maths <= 2 ? 3 : 2);
}

export function analyzeFit(intel: ProgramIntel, profile: ExtensionStudentProfile): FitAnalysis {
  const forces: string[] = [];
  const faiblesses: string[] = [];
  const risques: string[] = [];

  const q = intel.kpis.quantitativeFocusScore;
  const lang = intel.kpis.languagePressureScore;

  if (profile.maths >= 4 && q >= 40) {
    forces.push("Profil plutôt à l’aise en maths pour une formation avec composante quantitative.");
  } else if (profile.maths <= 2 && q >= 55) {
    faiblesses.push("Le programme semble exigeant côté maths / quanti ; ton auto-évaluation maths est basse.");
    risques.push("Sous-préparation aux examens quanti / entretiens techniques si tu ne montes pas le niveau.");
  }

  if (profile.anglais >= 4 && lang >= 30) {
    forces.push("Bon niveau d’anglais annoncé : cohérent avec l’international du programme.");
  } else if (profile.anglais <= 2 && lang >= 40) {
    faiblesses.push("Le programme insiste sur l’anglais / l’international ; à travailler en priorité.");
  }

  if (profile.motivation >= 4) {
    forces.push("Motivation élevée : utile pour la cohérence du dossier et l’oral.");
  }

  if (intel.kpis.doubleDegreeMentioned) {
    forces.push("Double diplôme possible : prévoir charge de travail et mobilité.");
  }

  if (intel.kpis.scholarshipMentioned) {
    forces.push("Pistes de bourses / aides évoquées sur la page : creuser les critères.");
  }

  if (forces.length === 0) {
    forces.push("Profil à structurer : complète les champs « filière » et « objectif » pour affiner.");
  }

  const plans: FitAnalysis["plans"] = [];

  if (profile.maths <= 3 && q >= 45) {
    plans.push({
      titre: "Monter en maths (objectif entrée)",
      etapes: [
        "Viser une moyenne stable en maths (ex. 14–15/20 en terminale ou équivalent) sur 2 trimestres.",
        "Prioriser : fonctions, dérivées, probas de base, lecture de graphiques, raisonnement logique.",
        "Faire un bilan mensuel avec un prof ou une plateforme (voir page partenaires cours).",
        "Ajouter un mini-projet (tableur ou Python léger) pour montrer la rigueur sur un dossier.",
      ],
    });
  }

  if (profile.anglais <= 3 && lang >= 25) {
    plans.push({
      titre: "Sécuriser l’anglais",
      etapes: [
        "Objectif compréhension : 30 min d’écoute docu / podcast business par jour.",
        "Passer un test cible (TOEIC / IELTS) si le programme le mentionne.",
        "Préparer 2 minutes « pitch » sur ton projet pro en anglais.",
      ],
    });
  }

  plans.push({
    titre: "Mettre en forme le dossier",
    etapes: [
      "Lister 3 expériences (scolaire, asso, job) alignées avec les débouchés cités sur la page.",
      "Relier chaque expérience à une compétence du programme (cursus / carrières).",
      "Demander une relecture à un ambassadeur ou un prof.",
    ],
  });

  return {
    forces,
    faiblesses,
    risques,
    similarProfiles: mockSimilar(intel, profile),
    ambassadors: mockAmbassadors(intel),
    plans,
  };
}
