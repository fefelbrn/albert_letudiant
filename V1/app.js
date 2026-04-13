const AUTH_KEY = "v1_auth";

const viewHome = document.getElementById("view-home");
const viewLogin = document.getElementById("view-login");
const viewPrivate = document.getElementById("view-private");
const viewSchools = document.getElementById("view-schools");
const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const schoolsList = document.getElementById("schools-list");
const schoolsSearch = document.getElementById("schools-search");
const schoolsSort = document.getElementById("schools-sort");
const schoolFilterButtons = document.querySelectorAll("#schools-filters .chip");
const departmentCheckboxes = document.querySelectorAll("#departments-options input[type='checkbox']");
const navLinks = document.querySelectorAll(".nav-links a[data-nav]");
const navHome = document.querySelector(".nav-links a[data-nav='home']");
const navSchools = document.querySelector(".nav-links a[data-nav='schools']");
const navSimulator = document.querySelector(".nav-links a[data-nav='simulator']");
const brandHome = document.getElementById("brand-home");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const accountBtn = document.getElementById("account-btn");

const updateAuthNav = () => {
  const isAuth = localStorage.getItem(AUTH_KEY) === "true";
  loginBtn.classList.toggle("hidden", isAuth);
  signupBtn.classList.toggle("hidden", isAuth);
  accountBtn.classList.toggle("hidden", !isAuth);
};

const setActiveNav = (navKey) => {
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("data-nav") === navKey);
  });
};

const showView = (name) => {
  viewHome.classList.add("hidden");
  viewLogin.classList.add("hidden");
  viewPrivate.classList.add("hidden");
  viewSchools.classList.add("hidden");

  if (name === "home") {
    viewHome.classList.remove("hidden");
    setActiveNav("home");
  }
  if (name === "login") viewLogin.classList.remove("hidden");
  if (name === "private") {
    viewPrivate.classList.remove("hidden");
    setActiveNav("simulator");
  }
  if (name === "schools") {
    viewSchools.classList.remove("hidden");
    setActiveNav("schools");
  }
};

const goPrivateIfAuth = () => {
  const isAuth = localStorage.getItem(AUTH_KEY) === "true";
  updateAuthNav();
  showView(isAuth ? "private" : "home");
};

document.querySelectorAll("[data-action='show-login']").forEach((btn) => {
  btn.addEventListener("click", () => showView("login"));
});

document.querySelectorAll("[data-action='show-home']").forEach((btn) => {
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    showView("home");
  });
});

document.querySelectorAll("[data-action='show-schools']").forEach((btn) => {
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    showView("schools");
  });
});

document.querySelectorAll("[data-action='show-simulator']").forEach((btn) => {
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    const isAuth = localStorage.getItem(AUTH_KEY) === "true";
    showView(isAuth ? "private" : "login");
  });
});

if (navHome) {
  navHome.addEventListener("click", (event) => {
    event.preventDefault();
    showView("home");
  });
}

if (navSchools) {
  navSchools.addEventListener("click", (event) => {
    event.preventDefault();
    showView("schools");
  });
}

if (navSimulator) {
  navSimulator.addEventListener("click", (event) => {
    event.preventDefault();
    const isAuth = localStorage.getItem(AUTH_KEY) === "true";
    showView(isAuth ? "private" : "login");
  });
}

if (brandHome) {
  brandHome.addEventListener("click", (event) => {
    event.preventDefault();
    showView("home");
  });
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  localStorage.setItem(AUTH_KEY, "true");
  updateAuthNav();
  showView("private");
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem(AUTH_KEY);
  updateAuthNav();
  showView("home");
});

const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.getAttribute("data-tab");

    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    tabPanels.forEach((panel) => panel.classList.add("hidden"));
    const activePanel = document.getElementById(`tab-${tab}`);
    if (activePanel) activePanel.classList.remove("hidden");
  });
});

const schoolsData = [
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

let activeFilter = "all";

const typeLabel = {
  commerce: "Ecole de commerce",
  ingenieur: "Ecole d'ingenieur",
  design: "Design / Graphisme",
  universite: "Universite",
};

const renderSchools = () => {
  const query = (schoolsSearch.value || "").trim().toLowerCase();
  const sortBy = schoolsSort.value;
  const selectedDepartments = Array.from(departmentCheckboxes)
    .filter((input) => input.checked)
    .map((input) => input.value);

  let rows = schoolsData.filter((row) => {
    const matchesType = activeFilter === "all" || row.type === activeFilter;
    const matchesDepartment =
      selectedDepartments.length === 0 || selectedDepartments.includes(row.department);
    const matchesQuery =
      !query ||
      row.name.toLowerCase().includes(query) ||
      row.city.toLowerCase().includes(query) ||
      typeLabel[row.type].toLowerCase().includes(query);
    return matchesType && matchesDepartment && matchesQuery;
  });

  rows.sort((a, b) => {
    if (sortBy === "name-asc") return a.name.localeCompare(b.name, "fr");
    if (sortBy === "score-desc") return b.score - a.score;
    if (sortBy === "score-asc") return a.score - b.score;
    if (sortBy === "rank-asc") return a.rank - b.rank;
    if (sortBy === "rank-desc") return b.rank - a.rank;
    return 0;
  });

  if (rows.length === 0) {
    schoolsList.innerHTML = "<article class='ranking-item'><div class='ranking-main'><h3>Aucun resultat</h3><p>Essaye un autre filtre ou mot-cle.</p></div></article>";
    return;
  }

  schoolsList.innerHTML = rows
    .map(
      (row) => `
        <article class="ranking-item">
          <div class="rank-badge">#${row.rank}</div>
          <div class="ranking-main">
            <h3>${row.name}</h3>
            <p>${row.city} (${row.department}) · Source: ${row.source}</p>
          </div>
          <div class="ranking-meta">
            <span class="ranking-type">${typeLabel[row.type]}</span>
            <div class="ranking-metrics">
              <div class="ranking-score">Score d'admission: ${row.score}/100</div>
              <div class="ranking-rank">Rang general: #${row.rank}</div>
            </div>
          </div>
        </article>
      `,
    )
    .join("");
};

schoolFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    schoolFilterButtons.forEach((b) => b.classList.remove("chip-active"));
    button.classList.add("chip-active");
    activeFilter = button.getAttribute("data-filter") || "all";
    renderSchools();
  });
});

schoolsSearch.addEventListener("input", renderSchools);
schoolsSort.addEventListener("change", renderSchools);
departmentCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", renderSchools);
});

renderSchools();
goPrivateIfAuth();
