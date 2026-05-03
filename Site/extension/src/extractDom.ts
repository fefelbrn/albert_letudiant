import type { ProgramIntel, ProgramKpis } from "./types";

function uniq(arr: string[], cap = 14): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const t = s.replace(/\s+/g, " ").trim();
    if (t.length < 3 || t.length > 280) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}

/** Extrait ~80 caractères avant le match pour donner du contexte (emploi, international, etc.). */
function contextBefore(text: string, index: number, len = 90): string {
  const start = Math.max(0, index - len);
  return text.slice(start, index).replace(/\s+/g, " ").trim();
}

function hasAny(haystack: string, needles: RegExp[]): boolean {
  return needles.some((re) => re.test(haystack));
}

function collectPdfLinks(doc: Document, pageUrl: string): string[] {
  const base = new URL(pageUrl);
  const out: string[] = [];
  for (const a of doc.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href");
    if (!href || href.startsWith("javascript:")) continue;
    try {
      const abs = new URL(href, base).href;
      if (!/\.pdf(\?|#|$)/i.test(abs)) continue;
      out.push(abs);
    } catch {
      /* ignore */
    }
  }
  return uniq(out, 16);
}

function scoreQuantitative(text: string): number {
  const keys = [
    "econometric",
    "quantitative",
    "stochastic",
    "calculus",
    "probability",
    "statistics",
    "derivatives",
    "machine learning",
    "python",
    "microéconomie",
    "microeconomics",
  ];
  let n = 0;
  const low = text.toLowerCase();
  for (const k of keys) {
    if (low.includes(k)) n++;
  }
  return Math.min(100, n * 12);
}

function scoreLanguagePressure(text: string): number {
  const keys = [
    "english",
    "anglais",
    "toefl",
    "ielts",
    "gmat",
    "international",
    "exchange",
    "double degree",
    "double diplôme",
  ];
  let n = 0;
  const low = text.toLowerCase();
  for (const k of keys) {
    if (low.includes(k)) n++;
  }
  return Math.min(100, n * 10);
}

function guessSchoolHost(hostname: string): string {
  const h = hostname.replace(/^www\./, "");
  const parts = h.split(".");
  if (parts.length >= 2) {
    return parts[parts.length - 2].replace(/-/g, " ").toUpperCase();
  }
  return h;
}

/** Montants type frais de scolarité : éviter les petits montants isolés (footer, rangs, etc.). */
function parseMoneyNumber(raw: string): number | null {
  const cleaned = raw.replace(/[\s\u00A0]/g, "").replace(",", ".");
  const n = parseFloat(cleaned.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function extractProgramFromDocument(doc: Document, url: string): ProgramIntel {
  const title = doc.title || "";
  const hostname = new URL(url).hostname;

  const article = doc.querySelector("article");
  const main = doc.querySelector("main");
  const root = article ?? main ?? doc.body;
  const headings = Array.from(root.querySelectorAll("h1,h2,h3"))
    .map((el) => el.textContent?.trim() ?? "")
    .filter(Boolean);

  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("script,style,noscript").forEach((el) => el.remove());
  const text = (clone.textContent ?? "").replace(/\s+/g, " ").trim();
  const textLow = text.toLowerCase();

  const brochurePdfUrls = collectPdfLinks(doc, url);

  const tuitionHints: string[] = [];
  const tuitionRes =
    /(?:tuition|fees?\s+and|program(?:me)?\s+fees?|frais\s+de\s+scolarit|cost\s+of\s+(?:the\s+)?program|prix\s+de\s+la\s+formation|montant\s+des?\s+frais)[\s\S]{0,140}?(\d{1,3}(?:[\s,\u00A0]\d{3})+|\d{2,})\s*(?:€|EUR|euros?)/gi;
  let m: RegExpExecArray | null;
  while ((m = tuitionRes.exec(text)) !== null) {
    const num = parseMoneyNumber(m[1] ?? "");
    if (num != null && num >= 500) {
      const ctx = contextBefore(text, m.index, 70);
      tuitionHints.push(`${ctx.slice(-55)}… → ${m[0].replace(/\s+/g, " ").trim()}`);
    }
  }
  const tuitionAmountFirst =
    /(?:€|EUR)\s*(\d{1,3}(?:[\s,\u00A0]\d{3})+|\d{4,})\s*(?:(?:per|\/)\s*(?:year|an|année))?/gi;
  while ((m = tuitionAmountFirst.exec(text)) !== null) {
    const ctx = (contextBefore(text, m.index, 100) + " " + text.slice(m.index, m.index + 80)).toLowerCase();
    if (
      hasAny(ctx, [
        /tuition|fee|frais|scolarit|cost|program|master|degree|year|an\b|annual/i,
      ])
    ) {
      const num = parseMoneyNumber(m[1] ?? "");
      if (num != null && num >= 1000) {
        tuitionHints.push(
          `Frais / coût (extrait) : ${m[0].replace(/\s+/g, " ").trim()} — ${contextBefore(text, m.index, 50).slice(-40)}`,
        );
      }
    }
  }

  const salaryHints: string[] = [];
  const salaryCtx =
    /\b(salary|salaire|remuneration|rémunération|compensation|starting\s+salary|average\s+salary|graduate\s+salary|gross\s+annual|package)\b[\s\S]{0,100}?((?:€|EUR)\s*\d{1,3}(?:[\s,\u00A0]\d{3})*(?:k|\s000)?|\d{2,3}\s*k€)/gi;
  while ((m = salaryCtx.exec(text)) !== null) {
    salaryHints.push(
      `${m[1]} : ${m[2]?.replace(/\s+/g, " ").trim()} (extrait page)`,
    );
  }
  const salaryK =
    /\b(\d{2,3})\s*k€|\b(\d{2,3})\s*k\s*€/gi;
  while ((m = salaryK.exec(text)) !== null) {
    const ctx = contextBefore(text, m.index, 80).toLowerCase();
    if (/(salary|salaire|remuner|rémun|compensation|placement|career|graduate)/i.test(ctx)) {
      salaryHints.push(`Salaire / package évoqué : ${m[0]}`);
    }
  }

  const signingBonusHints: string[] = [];
  if (/signing\s+bonus|prime\s+d['’]embauche/i.test(text)) {
    signingBonusHints.push("Mention de prime / signing bonus");
  }

  const durationHints: string[] = [];
  const moRe = /(\d+)\s*(?:months?|mois)\b/gi;
  while ((m = moRe.exec(text)) !== null) {
    durationHints.push(m[0]);
  }
  const yRe = /(\d+)\s*(?:years?|ans)\b/gi;
  while ((m = yRe.exec(text)) !== null) {
    durationHints.push(m[0]);
  }
  const durationPhrase =
    /(?:duration|length|program)[\s:]{0,20}(\d+)\s*(?:months?|years?|mois|ans)/gi;
  while ((m = durationPhrase.exec(text)) !== null) {
    durationHints.push(m[0].replace(/\s+/g, " "));
  }

  const ectsHints: string[] = [];
  const ectsRe = /(\d{2,4})\s*(?:ECTS|ects)\b|(\d{2,4})\s+credits?\s*(?:ECTS)?|(\d{2,4})\s+crédits?\b/gi;
  while ((m = ectsRe.exec(text)) !== null) {
    ectsHints.push(m[0].replace(/\s+/g, " "));
  }

  const internationalPctHints: string[] = [];
  const employmentRateHints: string[] = [];
  const pctRe = /(\d{1,3})\s*%/g;
  while ((m = pctRe.exec(text)) !== null) {
    const pct = m[1];
    if (!pct || Number(pct) > 100) continue;
    const ctx = contextBefore(text, m.index, 110).toLowerCase();
    if (
      hasAny(ctx, [
        /international|foreign|abroad|étudiant|student body|diversity|non[\s-]french|outside france/i,
      ])
    ) {
      const short = ctx.slice(-70);
      internationalPctHints.push(`International / promo : « …${short} » → ${pct}%`);
    }
    if (
      hasAny(ctx, [
        /employ|placement|hired|found a job|within \d|within three|job offer|graduate|career|embauch|débouch/i,
      ])
    ) {
      const short = ctx.slice(-70);
      employmentRateHints.push(`Emploi / placement : « …${short} » → ${pct}%`);
    }
  }

  const languageHints: string[] = [];
  if (textLow.includes("english") || textLow.includes("anglais")) {
    languageHints.push("Anglais mentionné sur la page");
  }
  if (textLow.includes("french") || textLow.includes("français")) {
    languageHints.push("Français mentionné");
  }

  const deadlines: string[] = [];
  const deadlinePatterns = [
    /(?:deadline|closing date|apply\s+by|applications?\s+(?:close|open)|submit\s+by)[\s:,.]*([^\n.]{5,90})/gi,
    /(?:before|no later than|au plus tard|jusqu'au|jusqu’au)\s+(\d{1,2}\s+\w+\s+\d{4})/gi,
    /(?:round|vague)\s*[12][^\n.]{0,40}\d{4}/gi,
    /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/gi,
  ];
  for (const re of deadlinePatterns) {
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      const chunk = m[0].replace(/\s+/g, " ").trim();
      if (chunk.length > 8 && chunk.length < 200) deadlines.push(chunk);
    }
  }

  const careerOutcomes: string[] = [];
  if (/career|débouch|placement|graduate outcomes|where our graduates/i.test(textLow)) {
    careerOutcomes.push("Section carrières / débouchés présente sur la page");
  }

  const sectors: string[] = [];
  if (/consulting|investment banking|private equity|m&a|audit|finance|tech|start-?up/i.test(textLow)) {
    sectors.push("Secteurs d’activité cités (conseil, finance, tech…)");
  }

  const curriculumKeywords: string[] = [];
  const prerequisites: string[] = [];
  const selectionKeywords: string[] = [];
  for (const h of headings) {
    if (/course|curriculum|cursus|programme|contenu|structure/i.test(h)) {
      curriculumKeywords.push(h);
    }
    if (/admission|selection|concours|requirements|how to apply/i.test(h)) {
      selectionKeywords.push(h);
    }
    if (/prerequisite|prérequis|background|profile/i.test(h)) {
      prerequisites.push(h);
    }
  }

  const accreditations: string[] = [];
  if (textLow.includes("aacsb") || textLow.includes("equis") || textLow.includes("amba")) {
    accreditations.push("Labels AACSB / EQUIS / AMBA évoqués");
  }

  const classSizeHints: string[] = [];
  if (/class size|cohort|students per class|promotion de/i.test(textLow)) {
    classSizeHints.push("Effectif / taille de promotion mentionné");
  }

  const rankingHints: string[] = [];
  if (/ranking|classement|financial times|qs ranking|the economist/i.test(textLow)) {
    rankingHints.push("Classements / médias cités");
  }

  const kpis: ProgramKpis = {
    tuitionHints: uniq(tuitionHints),
    salaryHints: uniq(salaryHints),
    signingBonusHints: uniq(signingBonusHints),
    durationHints: uniq(durationHints),
    ectsHints: uniq(ectsHints),
    internationalPctHints: uniq(internationalPctHints),
    employmentRateHints: uniq(employmentRateHints),
    languageHints: uniq(languageHints),
    deadlines: uniq(deadlines),
    careerOutcomes: uniq(careerOutcomes),
    sectors: uniq(sectors),
    curriculumKeywords: uniq(curriculumKeywords, 20),
    prerequisites: uniq(prerequisites, 15),
    selectionKeywords: uniq(selectionKeywords, 15),
    accreditations: uniq(accreditations),
    classSizeHints: uniq(classSizeHints),
    rankingHints: uniq(rankingHints),
    exchangeMentioned: /exchange|semester abroad|erasmus|double degree|double diplôme/i.test(text),
    internshipMentioned: /internship|stage|apprentissage/i.test(text),
    doubleDegreeMentioned: /double degree|double diplôme|dual degree/i.test(text),
    scholarshipMentioned: /scholarship|bourse|financial aid|aide financière/i.test(text),
    remoteOptionMentioned: /online|remote|distanciel|hybrid/i.test(text),
    quantitativeFocusScore: scoreQuantitative(text),
    languagePressureScore: scoreLanguagePressure(text),
  };

  const programNameGuess = headings[0] || title.split("|")[0].trim();
  const schoolNameGuess = guessSchoolHost(hostname);

  return {
    sourceUrl: url,
    pageTitle: title,
    schoolNameGuess,
    programNameGuess,
    extractedAt: new Date().toISOString(),
    mainLang: doc.documentElement.lang || "unknown",
    textFingerprint: text.slice(0, 2800),
    headings: headings.slice(0, 40),
    brochurePdfUrls,
    kpis,
  };
}
