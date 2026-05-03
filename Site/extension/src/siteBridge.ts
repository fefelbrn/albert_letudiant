import { SITE_AUTH_STORAGE_KEY, SITE_PROFILE_STORAGE_KEY } from "./profileFromSite";

const CHROME_KEYS = {
  profile: "letudiant_site_profile_json",
  authed: "letudiant_site_authed",
  syncedAt: "letudiant_site_synced_at",
} as const;

function pushToExtensionStorage(): void {
  try {
    const raw = localStorage.getItem(SITE_PROFILE_STORAGE_KEY);
    const authed = localStorage.getItem(SITE_AUTH_STORAGE_KEY) === "true";
    void chrome.storage.local.set({
      [CHROME_KEYS.profile]: raw,
      [CHROME_KEYS.authed]: authed,
      [CHROME_KEYS.syncedAt]: Date.now(),
    });
  } catch {
    /* ignore */
  }
}

pushToExtensionStorage();

window.addEventListener("storage", (e) => {
  if (e.key === SITE_PROFILE_STORAGE_KEY || e.key === SITE_AUTH_STORAGE_KEY) {
    pushToExtensionStorage();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") pushToExtensionStorage();
});

/** localStorage ne déclenche pas « storage » dans le même onglet quand tu enregistres le formulaire. */
setInterval(() => {
  if (document.visibilityState === "visible") pushToExtensionStorage();
}, 1500);
