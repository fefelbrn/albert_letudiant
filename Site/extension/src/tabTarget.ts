/** Onglet « page web » actif : le panneau latéral partage la fenêtre ; on prend l’onglet actif de la dernière fenêtre utilisée. */
export async function getActivePageTab(): Promise<chrome.tabs.Tab> {
  try {
    const lastWin = await chrome.windows.getLastFocused({ populate: true });
    if (lastWin.tabs?.length) {
      const active = lastWin.tabs.find((t) => t.active);
      if (active?.id != null && isWebPageUrl(active.url)) return active;
    }
  } catch {
    /* ignore */
  }
  const windows = await chrome.windows.getAll({ populate: true, windowTypes: ["normal"] });
  for (const win of windows) {
    if (win.focused && win.tabs?.length) {
      const active = win.tabs.find((t) => t.active);
      if (active?.id != null && isWebPageUrl(active.url)) return active;
    }
  }
  const [t] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (t?.id != null && isWebPageUrl(t.url)) return t;
  const tabs = await chrome.tabs.query({ active: true, windowType: "normal" });
  const first = tabs.find((x) => isWebPageUrl(x.url));
  if (first?.id != null) return first;
  throw new Error(
    "Aucun onglet de page web actif. Clique sur l’onglet du site de la formation, puis réessaie.",
  );
}

function isWebPageUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}
