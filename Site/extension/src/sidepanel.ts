import { analyzeFit } from "./matchProgram";
import { plateformesUrl, simulateurBaseUrl, simulateurLoginUrl } from "./config";
import type { ExtensionStudentProfile, FitAnalysis, ProgramIntel } from "./types";
import { defaultExtensionProfile } from "./types";
import {
  loadFavorites,
  loadHistory,
  pushHistory,
  toggleFavorite,
  isFavoriteUrl,
  type FavoriteEntry,
} from "./storageExtras";

const STORAGE_LAST = "letudiant_ext_last_intel_v1";

type TabMessageResponse =
  | { ok: true; intel: ProgramIntel }
  | { ok: false; error: string };

type ProfileMessageResponse = {
  ok: true;
  profile: ExtensionStudentProfile;
  authed: boolean;
  syncedAt: number | null;
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Record<string, string>,
  children?: (Node | string)[],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (k === "className") node.className = v;
      else if (k === "textContent") node.textContent = v;
      else if (k === "innerHTML") node.innerHTML = v;
      else node.setAttribute(k, v);
    }
  }
  if (children) {
    for (const c of children) {
      node.append(typeof c === "string" ? document.createTextNode(c) : c);
    }
  }
  return node;
}

async function loadProfileFromAccount(): Promise<{
  profile: ExtensionStudentProfile;
  authed: boolean;
  syncedAt: number | null;
}> {
  const r = (await chrome.runtime.sendMessage({
    type: "SIDE_GET_PROFILE",
  })) as ProfileMessageResponse | undefined;
  if (r?.ok) {
    return { profile: r.profile, authed: r.authed, syncedAt: r.syncedAt };
  }
  return { profile: defaultExtensionProfile(), authed: false, syncedAt: null };
}

async function extractViaBackground(): Promise<ProgramIntel> {
  const res = (await chrome.runtime.sendMessage({
    type: "SIDE_EXTRACT_PROGRAM",
  })) as TabMessageResponse | undefined;
  if (!res) {
    throw new Error(
      "Le service d’extension n’a pas répondu. Recharge l’extension (chrome://extensions) puis la page formation.",
    );
  }
  if (!res.ok) {
    throw new Error("error" in res ? res.error : "Erreur d’extraction");
  }
  return res.intel;
}

async function loadLastIntel(): Promise<ProgramIntel | null> {
  const raw = await chrome.storage.local.get(STORAGE_LAST);
  const v = raw[STORAGE_LAST] as ProgramIntel | undefined;
  return v && typeof v === "object" ? v : null;
}

async function saveLastIntel(intel: ProgramIntel): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_LAST]: intel });
}

function renderAccountStrip(
  profile: ExtensionStudentProfile,
  authed: boolean,
  syncedAt: number | null,
  onRecheck?: () => void | Promise<void>,
): HTMLElement {
  if (authed) {
    const card = el("div", { className: "card account-strip account-strip--ok" });
    card.append(
      el("div", { className: "account-strip__badge", textContent: "Profil relié" }),
      el("p", {
        className: "account-strip__lead",
        textContent: "Super, on a bien récupéré ton dossier depuis le simulateur. L’analyse tiendra compte de tes infos.",
      }),
      el("p", {
        className: "account-strip__detail",
        textContent: `${profile.filiere} · ${profile.objectif.slice(0, 100)}${profile.objectif.length > 100 ? "…" : ""}`,
      }),
    );
    if (syncedAt) {
      card.append(
        el("p", {
          className: "account-strip__meta",
          textContent: `Mis à jour : ${new Date(syncedAt).toLocaleString("fr-FR")}`,
        }),
      );
    }
    return card;
  }

  const card = el("div", { className: "card account-strip account-strip--guest" });
  card.append(
    el("div", { className: "account-strip__badge account-strip__badge--warn", textContent: "À relier" }),
    el("h2", { className: "account-strip__title", textContent: "Branche ton compte (rapide)" }),
    el("p", {
      className: "account-strip__lead",
      textContent:
        "Sans ça, l’extension ne connaît pas ton profil : les conseils seront génériques. Deux minutes, on fait ça ensemble.",
    }),
  );

  const steps = el("ol", { className: "steps-list" });
  const login = simulateurLoginUrl();
  const home = simulateurBaseUrl();
  steps.append(
    el("li", {}, [
      el("span", { className: "steps-list__num", textContent: "1" }),
      el("span", {
        className: "steps-list__text",
        textContent: "Ouvre le simulateur dans un nouvel onglet (gros bouton rouge juste en dessous).",
      }),
    ]),
    el("li", {}, [
      el("span", { className: "steps-list__num", textContent: "2" }),
      el("span", {
        className: "steps-list__text",
        textContent: "Clique sur « Se connecter » et entre comme d’habitude — tout reste dans ton Chrome, rien de bizarre.",
      }),
    ]),
    el("li", {}, [
      el("span", { className: "steps-list__num", textContent: "3" }),
      el("span", {
        className: "steps-list__text",
        textContent: "Une fois la page « Mon compte » ouverte, attends 2–3 secondes : ton profil se copie tout seul pour l’extension.",
      }),
    ]),
    el("li", {}, [
      el("span", { className: "steps-list__num", textContent: "4" }),
      el("span", {
        className: "steps-list__text",
        textContent: "Reviens sur la page de la formation (HEC, etc.), puis clique « Analyser cette page » ici.",
      }),
    ]),
  );
  card.append(steps);

  const actions = el("div", { className: "account-strip__actions" });
  actions.append(
    el("a", {
      className: "btn btn-primary btn-block",
      href: login,
      target: "_blank",
      rel: "noopener noreferrer",
      textContent: "Ouvrir la page de connexion",
    }),
    el("a", {
      className: "btn btn-soft btn-block",
      href: home,
      target: "_blank",
      rel: "noopener noreferrer",
      textContent: "Voir l’accueil du simulateur",
    }),
  );
  if (onRecheck) {
    const recheck = el("button", {
      type: "button",
      className: "btn btn-ghost btn-block",
      textContent: "C’est bon, j’ai connecté — vérifier",
    });
    recheck.addEventListener("click", () => void onRecheck());
    actions.append(recheck);
  }
  card.append(actions);
  return card;
}

function renderKpis(intel: ProgramIntel): HTMLElement {
  const wrap = el("div", { className: "card" });
  wrap.append(el("h2", { className: "card__title", textContent: "Ce qu’on a repéré sur le site" }));
  wrap.append(
    el("p", {
      className: "card__sub",
      textContent:
        "Chaque ligne cite un bout de texte autour du chiffre pour que tu voies le contexte (comme sur le site). Si une case est vide, le contenu peut être chargé en JS, dans un PDF, ou sur une autre page (brochure via formulaire, frais via « fees & financing », etc.).",
    }),
  );

  const grid = el("div", { className: "kpi-grid" });
  const add = (label: string, values: string[], flags?: boolean[]) => {
    const row = el("div", { className: "kpi" });
    row.append(el("strong", { textContent: label }));
    if (values.length) {
      const block = el("div", { className: "kpi-values" });
      for (const v of values) {
        block.append(el("div", { className: "kpi-line", textContent: v }));
      }
      row.append(block);
    } else if (flags?.length) {
      row.append(el("div", { textContent: flags.filter(Boolean).length ? "Oui" : "Non précisé" }));
    } else {
      row.append(el("div", { className: "status", textContent: "Rien de détecté automatiquement" }));
    }
    grid.append(row);
  };

  const pdfs = intel.brochurePdfUrls ?? [];
  add("Brochures / ressources (PDF, formulaires)", pdfs);

  add("Frais / scolarité", [...intel.kpis.tuitionHints, ...intel.kpis.signingBonusHints]);
  add("Salaires à l’embauche (si mentionnés)", intel.kpis.salaryHints);
  add("Durée", intel.kpis.durationHints);
  add("ECTS / crédits", intel.kpis.ectsHints);
  add("International (avec contexte)", intel.kpis.internationalPctHints);
  add("Emploi / placement (avec contexte)", intel.kpis.employmentRateHints);
  add("Langues", intel.kpis.languageHints);
  add("Dates / calendrier candidature", intel.kpis.deadlines);
  add("Débouchés / carrières", intel.kpis.careerOutcomes);
  add("Filières / secteurs", intel.kpis.sectors);
  add("Sélection / prérequis", [...intel.kpis.selectionKeywords, ...intel.kpis.prerequisites]);
  add("Classements / labels", [...intel.kpis.rankingHints, ...intel.kpis.accreditations]);

  const flags = el("div", { className: "kpi" });
  flags.append(el("strong", { textContent: "Options repérées" }));
  const bits = [
    intel.kpis.exchangeMentioned ? "Échange / mobilité" : "",
    intel.kpis.internshipMentioned ? "Stage / alternance" : "",
    intel.kpis.doubleDegreeMentioned ? "Double diplôme" : "",
    intel.kpis.scholarshipMentioned ? "Bourses / aides" : "",
    intel.kpis.remoteOptionMentioned ? "Distanciel / hybride" : "",
  ].filter(Boolean);
  flags.append(
    el("div", {
      textContent:
        bits.length > 0
          ? bits.join(" · ")
          : "Peu de signaux (texte long ou page atypique).",
    }),
  );
  grid.append(flags);

  const scores = el("div", { className: "kpi" });
  scores.append(el("strong", { textContent: "Scores heuristiques (page)" }));
  scores.append(
    el("div", {
      textContent: `Charge « maths / quanti » : ${intel.kpis.quantitativeFocusScore}/100 · Pression langue / international : ${intel.kpis.languagePressureScore}/100`,
    }),
  );
  grid.append(scores);

  wrap.append(grid);
  return wrap;
}

function renderFit(fit: FitAnalysis): HTMLElement {
  const wrap = el("div", { className: "card" });
  wrap.append(el("h2", { className: "card__title", textContent: "Et toi, ça matche ? (indicatif)" }));
  wrap.append(
    el("p", {
      className: "card__sub",
      textContent:
        "À partir de ton dossier copié depuis le simulateur (bulletins, filière, écoles visées). Ce n’est pas une décision d’admission, juste un coup de main.",
    }),
  );

  const f = el("div", { className: "kpi" });
  f.append(el("strong", { textContent: "Points forts" }));
  f.append(el("ul", {}, fit.forces.map((t) => el("li", { className: "tag-ok", textContent: t }))));
  wrap.append(f);

  const w = el("div", { className: "kpi" });
  w.append(el("strong", { textContent: "Points à renforcer" }));
  w.append(el("ul", {}, fit.faiblesses.map((t) => el("li", { className: "tag-warn", textContent: t }))));
  wrap.append(w);

  if (fit.risques.length) {
    const r = el("div", { className: "kpi" });
    r.append(el("strong", { textContent: "Risques" }));
    r.append(el("ul", {}, fit.risques.map((t) => el("li", { textContent: t }))));
    wrap.append(r);
  }

  wrap.append(el("h2", { textContent: "Profils proches (exemples — démo)" }));
  for (const p of fit.similarProfiles) {
    const d = el("div", { className: "person" });
    d.append(el("strong", { textContent: p.prenom }));
    d.append(el("div", { textContent: p.parcours }));
    d.append(el("div", { className: "status", textContent: p.angle }));
    wrap.append(d);
  }

  wrap.append(el("h2", { textContent: "Ambassadeurs / contacts types" }));
  for (const a of fit.ambassadors) {
    const d = el("div", { className: "person" });
    d.append(el("strong", { textContent: a.nom }));
    d.append(el("div", { textContent: a.filiere }));
    d.append(el("div", { className: "status", textContent: a.canal }));
    wrap.append(d);
  }

  wrap.append(el("h2", { textContent: "Plan d’action" }));
  for (const pl of fit.plans) {
    const d = el("div", { className: "person" });
    d.append(el("strong", { textContent: pl.titre }));
    d.append(el("ul", {}, pl.etapes.map((s) => el("li", { textContent: s }))));
    wrap.append(d);
  }

  return wrap;
}

function mailBodyForFavorite(f: FavoriteEntry): string {
  const lines: string[] = [
    `Formation : ${f.programTitle}`,
    `École (estimation) : ${f.schoolGuess}`,
    `Page : ${f.url}`,
    "",
    "Brochures / ressources (PDF ou liens) :",
  ];
  for (const pdf of f.intel.brochurePdfUrls ?? []) {
    lines.push(`- ${pdf}`);
  }
  lines.push("", "— Envoyé depuis l’extension L’Étudiant Simulateur");
  return lines.join("\n");
}

function mailtoFavorite(f: FavoriteEntry): string {
  const subject = encodeURIComponent(`Doc formation : ${f.programTitle}`);
  const body = encodeURIComponent(mailBodyForFavorite(f));
  return `mailto:?subject=${subject}&body=${body}`;
}

function mailtoAllFavorites(favs: FavoriteEntry[]): string {
  const parts: string[] = ["Voici les liens vers mes formations favorites :\n"];
  for (const f of favs) {
    parts.push(mailBodyForFavorite(f));
    parts.push("\n---\n");
  }
  let body = parts.join("\n");
  if (body.length > 1700) {
    body =
      body.slice(0, 1700) +
      "\n… (message tronqué : ouvre l’extension, onglet Favoris, et envoie formation par formation.)";
  }
  const subject = encodeURIComponent("Mes formations favorites — liens & PDF");
  return `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
}

async function renderFavoritesPanel(mount: HTMLElement): Promise<void> {
  mount.replaceChildren();
  const favs = await loadFavorites();
  if (!favs.length) {
    const card = el("div", { className: "card" });
    card.append(
      el("h2", { className: "card__title", textContent: "Favoris & documentations" }),
      el("p", {
        className: "card__sub",
        textContent:
          "Quand tu analyses une page, clique sur « Ajouter aux favoris ». Tu retrouveras ici les liens de la page et les PDF repérés (brochure, plaquette…). Tu peux t’envoyer tout ça par mail pour les lire tranquille.",
      }),
    );
    mount.append(card);
    return;
  }

  mount.append(
    el("p", {
      className: "panel-intro",
      textContent: `${favs.length} formation(s) en favori — ouvre les PDF ou envoie‑toi les liens par mail.`,
    }),
  );

  for (const f of favs) {
    const card = el("div", { className: "card fav-card" });
    card.append(
      el("h3", { className: "fav-card__title", textContent: f.programTitle }),
      el("p", { className: "fav-card__school", textContent: f.schoolGuess }),
      el("a", {
        className: "fav-card__link",
        href: f.url,
        target: "_blank",
        rel: "noopener noreferrer",
        textContent: "Ouvrir la page web",
      }),
    );
    const pdfs = f.intel.brochurePdfUrls ?? [];
    if (pdfs.length) {
      const ul = el("div", { className: "fav-pdfs" });
      ul.append(el("strong", { textContent: "PDF sur la page" }));
      for (const pdf of pdfs) {
        ul.append(
          el("a", {
            className: "fav-pdf-link",
            href: pdf,
            target: "_blank",
            rel: "noopener noreferrer",
            textContent: pdf.split("/").pop() ?? pdf,
          }),
        );
      }
      card.append(ul);
    } else {
      card.append(
        el("p", { className: "status", textContent: "Aucun PDF détecté sur la page au moment de l’ajout." }),
      );
    }
    card.append(
      el("a", {
        className: "btn btn-soft btn-block",
        href: mailtoFavorite(f),
        textContent: "M’envoyer cette doc par mail",
      }),
    );
    mount.append(card);
  }

  const bulk = el("a", {
    className: "btn btn-primary btn-block",
    href: mailtoAllFavorites(favs),
    textContent: "Tout m’envoyer en un seul mail (liens + PDF)",
  });
  mount.append(bulk);
  mount.append(
    el("p", {
      className: "mail-hint",
      textContent:
        "Ça ouvre ton logiciel mail avec un message prérempli (pas de pièce jointe : les PDF restent sur le site de l’école).",
    }),
  );
}

async function renderHistoryPanel(mount: HTMLElement): Promise<void> {
  mount.replaceChildren();
  const hist = await loadHistory();
  if (!hist.length) {
    mount.append(
      el("p", {
        className: "card__sub",
        textContent: "Dès que tu lances une analyse, la formation s’ajoute ici. Pratique pour retrouver un programme sans refaire une recherche.",
      }),
    );
    return;
  }
  mount.append(
    el("p", { className: "panel-intro", textContent: `${hist.length} analyse(s) récente(s).` }),
  );
  for (const h of hist) {
    const row = el("div", { className: "hist-row card" });
    row.append(
      el("strong", { className: "hist-row__title", textContent: h.programTitle }),
      el("span", { className: "hist-row__meta", textContent: h.schoolGuess }),
      el("span", {
        className: "hist-row__date",
        textContent: new Date(h.crawledAt).toLocaleString("fr-FR"),
      }),
      el("a", {
        className: "btn btn-soft btn-block",
        href: h.url,
        target: "_blank",
        rel: "noopener noreferrer",
        textContent: "Rouvrir la page",
      }),
    );
    mount.append(row);
  }
}

async function main(): Promise<void> {
  const root = document.getElementById("app");
  if (!root) return;

  let { profile, authed, syncedAt } = await loadProfileFromAccount();
  let lastIntel = await loadLastIntel();

  const logoUrl = chrome.runtime.getURL("logo.png");
  const brandBar = el("div", { className: "brand-bar" });
  const logo = el("img", {
    className: "brand-bar__logo",
    src: logoUrl,
    alt: "",
    width: "34",
    height: "34",
  });
  logo.addEventListener("error", () => {
    logo.style.display = "none";
  });
  const brandText = el("div", { className: "brand-bar__text" });
  const brandLine = el("p", { className: "brand-bar__line" });
  brandLine.append(
    document.createTextNode("L'Etudiant "),
    (() => {
      const s = document.createElement("strong");
      s.textContent = "Simulateur";
      return s;
    })(),
  );
  brandText.append(brandLine);
  brandBar.append(logo, brandText);

  const shellHeader = el("header", { className: "shell-header shell-header--compact" });
  shellHeader.append(
    el("h1", { className: "shell-header__title", textContent: "Décoder la formation" }),
    el("p", {
      className: "shell-header__sub",
      textContent:
        "Infos utiles sur la page ouverte + comparaison avec ton dossier (si tu es connecté sur le simulateur).",
    }),
  );

  const tabs = el("div", { className: "tabs tabs-segment" });
  const panels: { id: string; label: string; node: HTMLElement }[] = [];

  const accountMount = el("div", { className: "account-mount" });
  const favoriteWrap = el("div", { className: "fav-bar-wrap" });
  const status = el("p", { className: "feedback", textContent: "" });

  const analyzePanel = el("div", { className: "panel", "data-visible": "true" });
  const btnRow = el("div", { className: "action-row" });
  const btnAnalyze = el("button", {
    type: "button",
    className: "btn btn-primary btn-block",
    textContent: "Analyser cette page",
  });
  btnRow.append(btnAnalyze);
  const kpiMount = el("div", { className: "stack" });
  const fitMount = el("div", { className: "stack" });
  analyzePanel.append(accountMount, favoriteWrap, btnRow, status, kpiMount, fitMount);

  const docsPanel = el("div", { className: "panel", "data-visible": "false" });
  const docsMount = el("div", { className: "stack" });
  docsPanel.append(docsMount);

  const resourcesPanel = el("div", { className: "panel", "data-visible": "false" });
  const pu = plateformesUrl();
  const resCard = el("div", { className: "card card--muted" });
  resCard.append(
    el("h2", { className: "card__title", textContent: "Cours & coaching" }),
    el("p", {
      className: "card__sub",
      textContent:
        "Plateformes pour bosser maths, langues, méthodo — lien vers le simulateur.",
    }),
    el("a", {
      className: "btn btn-soft btn-block",
      href: pu,
      target: "_blank",
      rel: "noopener noreferrer",
      textContent: "Ouvrir la page partenaires",
    }),
  );
  resourcesPanel.append(resCard);

  const historyPanel = el("div", { className: "panel", "data-visible": "false" });
  const historyMount = el("div", { className: "stack" });
  historyPanel.append(historyMount);

  panels.push({ id: "analyze", label: "Analyse", node: analyzePanel });
  panels.push({ id: "docs", label: "Favoris", node: docsPanel });
  panels.push({ id: "resources", label: "Cours", node: resourcesPanel });
  panels.push({ id: "history", label: "Historique", node: historyPanel });

  async function refreshProfileFromStorage() {
    const next = await loadProfileFromAccount();
    profile = next.profile;
    authed = next.authed;
    syncedAt = next.syncedAt;
    refreshAccountStrip();
  }

  function refreshAccountStrip() {
    accountMount.replaceChildren();
    accountMount.append(
      renderAccountStrip(profile, authed, syncedAt, async () => {
        await refreshProfileFromStorage();
        refreshAccountStrip();
      }),
    );
  }
  refreshAccountStrip();

  async function refreshFavBar() {
    favoriteWrap.replaceChildren();
    if (!lastIntel) return;
    const isFav = await isFavoriteUrl(lastIntel.sourceUrl);
    const bar = el("div", { className: "fav-bar" });
    const starBtn = el("button", {
      type: "button",
      className: `btn-fav ${isFav ? "btn-fav--on" : ""}`,
      textContent: isFav ? "★ Favori enregistré" : "☆ Ajouter aux favoris",
    });
    starBtn.addEventListener("click", async () => {
      await toggleFavorite(lastIntel!);
      await refreshFavBar();
      await renderFavoritesPanel(docsMount);
      await renderHistoryPanel(historyMount);
    });
    bar.append(
      starBtn,
      el("span", {
        className: "fav-bar__hint",
        textContent: "Retrouve la page + les PDF dans l’onglet Favoris.",
      }),
    );
    favoriteWrap.append(bar);
  }

  function setFeedback(text: string, kind: "idle" | "loading" | "ok" | "err") {
    status.textContent = text;
    status.className = "feedback";
    if (kind === "loading") status.classList.add("feedback--loading");
    if (kind === "ok") status.classList.add("feedback--ok");
    if (kind === "err") status.classList.add("feedback--err");
  }

  function refreshAnalysisView() {
    kpiMount.replaceChildren();
    fitMount.replaceChildren();
    if (!lastIntel) {
      favoriteWrap.replaceChildren();
      const empty = el("div", { className: "empty-state" });
      empty.append(
        el("p", { className: "empty-state__title", textContent: "C’est parti quand tu veux" }),
        el("p", {
          className: "empty-state__text",
          textContent:
            "Va sur le site d’une école, garde cet onglet au premier plan, puis « Analyser cette page ».",
        }),
      );
      kpiMount.append(empty);
      return;
    }
    void refreshFavBar();
    const meta = el("p", { className: "page-ref", textContent: lastIntel.sourceUrl });
    const title = el("p", { className: "page-title", textContent: lastIntel.programNameGuess });
    kpiMount.append(title, meta, renderKpis(lastIntel));
    fitMount.append(renderFit(analyzeFit(lastIntel, profile)));
  }

  btnAnalyze.addEventListener("click", async () => {
    setFeedback("Analyse en cours…", "loading");
    await refreshProfileFromStorage();
    try {
      const intel = await extractViaBackground();
      lastIntel = intel;
      await saveLastIntel(intel);
      await pushHistory(intel);
      setFeedback("Tout est à jour pour cette page.", "ok");
      refreshAnalysisView();
      await renderHistoryPanel(historyMount);
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : String(e), "err");
    }
  });

  let activeId = "analyze";
  for (const p of panels) {
    const b = el("button", { type: "button", className: "tab", textContent: p.label });
    b.dataset.active = String(p.id === activeId);
    b.addEventListener("click", () => {
      activeId = p.id;
      for (const x of panels) {
        x.node.dataset.visible = String(x.id === activeId);
      }
      let i = 0;
      for (const c of tabs.children) {
        const btn = c as HTMLButtonElement;
        btn.dataset.active = String(panels[i]?.id === activeId);
        i++;
      }
      if (p.id === "docs") void renderFavoritesPanel(docsMount);
      if (p.id === "history") void renderHistoryPanel(historyMount);
    });
    tabs.append(b);
  }

  root.append(brandBar, shellHeader, tabs, ...panels.map((pn) => pn.node));

  refreshAnalysisView();
  void refreshProfileFromStorage();
  void renderFavoritesPanel(docsMount);
  void renderHistoryPanel(historyMount);
}

void main();
