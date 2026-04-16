import { useMemo, useState } from "react";
import { schoolsData, typeLabel } from "../data/schoolsData";
import type { SchoolType } from "../types/school";

type SortBy =
  | "name-asc"
  | "score-desc"
  | "score-asc"
  | "rank-asc"
  | "rank-desc";

export function useSchoolsFilters() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<SchoolType | "all">("all");
  const [sortBy, setSortBy] = useState<SortBy>("name-asc");
  const [departments, setDepartments] = useState<string[]>([]);

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = schoolsData.filter((row) => {
      const matchesType = activeFilter === "all" || row.type === activeFilter;
      const matchesDepartment =
        departments.length === 0 || departments.includes(row.department);
      const matchesQuery =
        !normalizedQuery ||
        row.name.toLowerCase().includes(normalizedQuery) ||
        row.city.toLowerCase().includes(normalizedQuery) ||
        typeLabel[row.type].toLowerCase().includes(normalizedQuery);
      return matchesType && matchesDepartment && matchesQuery;
    });

    filtered.sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name, "fr");
      if (sortBy === "score-desc") return b.score - a.score;
      if (sortBy === "score-asc") return a.score - b.score;
      if (sortBy === "rank-asc") return a.rank - b.rank;
      if (sortBy === "rank-desc") return b.rank - a.rank;
      return 0;
    });
    return filtered;
  }, [activeFilter, departments, query, sortBy]);

  const toggleDepartment = (departmentCode: string) => {
    setDepartments((current) =>
      current.includes(departmentCode)
        ? current.filter((code) => code !== departmentCode)
        : [...current, departmentCode],
    );
  };

  return {
    query,
    setQuery,
    activeFilter,
    setActiveFilter,
    sortBy,
    setSortBy,
    departments,
    toggleDepartment,
    rows,
  };
}
