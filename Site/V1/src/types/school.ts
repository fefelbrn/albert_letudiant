export type SchoolType = "commerce" | "ingenieur" | "design" | "universite";

export type School = {
  name: string;
  city: string;
  department: string;
  type: SchoolType;
  rank: number;
  score: number;
  source: string;
};
