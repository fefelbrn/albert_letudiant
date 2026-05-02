import type { School, SchoolType } from "../types/school";

export const schoolsData: School[] = [
  { name: "HEC Paris", city: "Jouy-en-Josas", department: "78", type: "commerce", rank: 1, score: 98, source: "FT MiM 2024" },
  { name: "ESSEC Business School", city: "Cergy", department: "95", type: "commerce", rank: 2, score: 95, source: "FT MiM 2024" },
  { name: "ESCP Business School", city: "Paris", department: "75", type: "commerce", rank: 3, score: 95, source: "FT MiM 2024" },
  { name: "EDHEC Business School", city: "Lille", department: "59", type: "commerce", rank: 4, score: 93, source: "FT MiM 2024" },
  { name: "emlyon business school", city: "Lyon", department: "69", type: "commerce", rank: 5, score: 91, source: "FT MiM 2024" },
  { name: "Ecole Polytechnique", city: "Palaiseau", department: "91", type: "ingenieur", rank: 6, score: 97, source: "Classements France 2025" },
  { name: "CentraleSupelec", city: "Gif-sur-Yvette", department: "91", type: "ingenieur", rank: 7, score: 95, source: "Classements France 2025" },
  { name: "Mines Paris - PSL", city: "Paris", department: "75", type: "ingenieur", rank: 8, score: 94, source: "Classements France 2025" },
  { name: "ENSTA Paris", city: "Palaiseau", department: "91", type: "ingenieur", rank: 9, score: 90, source: "Classements France 2025" },
  { name: "Ponts ParisTech", city: "Champs-sur-Marne", department: "77", type: "ingenieur", rank: 10, score: 90, source: "Classements France 2025" },
  { name: "ENSCI - Les Ateliers", city: "Paris", department: "75", type: "design", rank: 11, score: 89, source: "Reperes design FR" },
  { name: "Gobelins", city: "Paris", department: "75", type: "design", rank: 12, score: 88, source: "Reperes design FR" },
  { name: "Strate Ecole de Design", city: "Sevres", department: "92", type: "design", rank: 13, score: 86, source: "Reperes design FR" },
  { name: "PSL Universite", city: "Paris", department: "75", type: "universite", rank: 14, score: 96, source: "QS 2025" },
  { name: "Universite Paris-Saclay", city: "Gif-sur-Yvette", department: "91", type: "universite", rank: 15, score: 95, source: "QS 2025" },
  { name: "Sorbonne Universite", city: "Paris", department: "75", type: "universite", rank: 16, score: 93, source: "QS 2025" },
];

export const typeLabel: Record<SchoolType, string> = {
  commerce: "Ecole de commerce",
  ingenieur: "Ecole d'ingenieur",
  design: "Design / Graphisme",
  universite: "Universite",
};

export const departmentFilters = [
  { code: "75", label: "Paris (75)" },
  { code: "69", label: "Rhone (69)" },
  { code: "91", label: "Essonne (91)" },
  { code: "92", label: "Hauts-de-Seine (92)" },
  { code: "77", label: "Seine-et-Marne (77)" },
  { code: "78", label: "Yvelines (78)" },
];
