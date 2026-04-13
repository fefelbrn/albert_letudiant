import { departmentFilters, typeLabel } from "../data/schoolsData";
import { useSchoolsFilters } from "../hooks/useSchoolsFilters";
import type { SchoolType } from "../types/school";

const filterOptions: Array<{ value: "all" | SchoolType; label: string }> = [
  { value: "all", label: "Toutes" },
  { value: "commerce", label: "Ecoles de commerce" },
  { value: "ingenieur", label: "Ecoles d'ingenieur" },
  { value: "design", label: "Design / Graphisme" },
  { value: "universite", label: "Universites" },
];

export function SchoolsPage() {
  const {
    query,
    setQuery,
    sortBy,
    setSortBy,
    activeFilter,
    setActiveFilter,
    departments,
    toggleDepartment,
    rows,
  } = useSchoolsFilters();

  return (
    <main className="section container">
      <h2>Classement general des ecoles</h2>
      <p className="section-sub">Filtre par type d'etablissement et compare rapidement.</p>

      <section className="ranking-controls">
        <input
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher une ecole ou une ville..."
        />
        <div className="chips">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              className={`chip ${activeFilter === option.value ? "chip-active" : ""}`}
              onClick={() => setActiveFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="sort-row">
          <label htmlFor="schools-sort">Trier par :</label>
          <select
            id="schools-sort"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
          >
            <option value="name-asc">Ordre alphabetique (A-Z)</option>
            <option value="score-desc">Score d'admission (decroissant)</option>
            <option value="score-asc">Score d'admission (ascendant)</option>
            <option value="rank-asc">Rang general (ascendant)</option>
            <option value="rank-desc">Rang general (decroissant)</option>
          </select>
        </div>

        <div className="departments-filter">
          <p>Departements :</p>
          <div className="departments-options">
            {departmentFilters.map((department) => (
              <label key={department.code}>
                <input
                  type="checkbox"
                  checked={departments.includes(department.code)}
                  onChange={() => toggleDepartment(department.code)}
                />
                {department.label}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="ranking-list">
        {rows.length === 0 ? (
          <article className="ranking-item">
            <div className="ranking-main">
              <h3>Aucun resultat</h3>
              <p>Essaye un autre filtre ou mot-cle.</p>
            </div>
          </article>
        ) : (
          rows.map((row) => (
            <article className="ranking-item" key={row.name}>
              <div className="rank-badge">#{row.rank}</div>
              <div className="ranking-main">
                <h3>{row.name}</h3>
                <p>
                  {row.city} ({row.department}) - Source: {row.source}
                </p>
              </div>
              <div className="ranking-meta">
                <span className="ranking-type">{typeLabel[row.type]}</span>
                <div className="ranking-metrics">
                  <div className="ranking-score">Score d'admission: {row.score}/100</div>
                  <div className="ranking-rank">Rang general: #{row.rank}</div>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
