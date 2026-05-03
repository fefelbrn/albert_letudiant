import type { ProgramIntel } from "./types";

export type HistoryEntry = {
  id: string;
  url: string;
  programTitle: string;
  schoolGuess: string;
  crawledAt: string;
};

export type FavoriteEntry = {
  id: string;
  url: string;
  programTitle: string;
  schoolGuess: string;
  savedAt: string;
  intel: ProgramIntel;
};

const KEY_HIST = "letudiant_history_v1";
const KEY_FAV = "letudiant_favorites_v1";
const MAX_HIST = 40;

function idFromUrl(url: string): string {
  return url.replace(/\/+$/, "").toLowerCase();
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const raw = await chrome.storage.local.get(KEY_HIST);
  const arr = raw[KEY_HIST] as HistoryEntry[] | undefined;
  return Array.isArray(arr) ? arr : [];
}

export async function pushHistory(intel: ProgramIntel): Promise<void> {
  const list = await loadHistory();
  const id = idFromUrl(intel.sourceUrl);
  const entry: HistoryEntry = {
    id,
    url: intel.sourceUrl,
    programTitle: intel.programNameGuess,
    schoolGuess: intel.schoolNameGuess,
    crawledAt: intel.extractedAt,
  };
  const next = [entry, ...list.filter((e) => e.id !== id)].slice(0, MAX_HIST);
  await chrome.storage.local.set({ [KEY_HIST]: next });
}

export async function loadFavorites(): Promise<FavoriteEntry[]> {
  const raw = await chrome.storage.local.get(KEY_FAV);
  const arr = raw[KEY_FAV] as FavoriteEntry[] | undefined;
  return Array.isArray(arr) ? arr : [];
}

export async function isFavoriteUrl(url: string): Promise<boolean> {
  const id = idFromUrl(url);
  const list = await loadFavorites();
  return list.some((f) => f.id === id);
}

export async function toggleFavorite(intel: ProgramIntel): Promise<boolean> {
  const id = idFromUrl(intel.sourceUrl);
  const list = await loadFavorites();
  const idx = list.findIndex((f) => f.id === id);
  if (idx >= 0) {
    list.splice(idx, 1);
    await chrome.storage.local.set({ [KEY_FAV]: list });
    return false;
  }
  const entry: FavoriteEntry = {
    id,
    url: intel.sourceUrl,
    programTitle: intel.programNameGuess,
    schoolGuess: intel.schoolNameGuess,
    savedAt: new Date().toISOString(),
    intel: JSON.parse(JSON.stringify(intel)) as ProgramIntel,
  };
  await chrome.storage.local.set({ [KEY_FAV]: [entry, ...list] });
  return true;
}
