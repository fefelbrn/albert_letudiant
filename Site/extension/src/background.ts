import { getActivePageTab } from "./tabTarget";
import { siteJsonToExtensionProfile } from "./profileFromSite";
import type { ProgramIntel } from "./types";

function openSideOnAction() {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

chrome.runtime.onInstalled.addListener(openSideOnAction);
openSideOnAction();

type ExtractOk = { ok: true; intel: ProgramIntel };
type ExtractErr = { ok: false; error: string };

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SIDE_EXTRACT_PROGRAM") {
    void (async () => {
      try {
        const tab = await getActivePageTab();
        const id = tab.id;
        if (id == null) {
          sendResponse({ ok: false, error: "Onglet invalide." } satisfies ExtractErr);
          return;
        }
        await chrome.scripting.executeScript({
          target: { tabId: id },
          files: ["content.js"],
        });
        const res = (await chrome.tabs.sendMessage(id, {
          type: "EXTRACT_PROGRAM",
        })) as ExtractOk | ExtractErr | undefined;
        if (!res) {
          sendResponse({
            ok: false,
            error:
              "Pas de réponse du script de page. Recharge l’onglet du site de formation puis réessaie.",
          } satisfies ExtractErr);
          return;
        }
        sendResponse(res);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        sendResponse({ ok: false, error: msg } satisfies ExtractErr);
      }
    })();
    return true;
  }

  if (message?.type === "SIDE_GET_PROFILE") {
    void (async () => {
      const data = await chrome.storage.local.get([
        "letudiant_site_profile_json",
        "letudiant_site_authed",
        "letudiant_site_synced_at",
      ]);
      const authed = data.letudiant_site_authed === true;
      let parsed: unknown = null;
      const raw = data.letudiant_site_profile_json;
      if (typeof raw === "string" && raw.trim()) {
        try {
          parsed = JSON.parse(raw) as unknown;
        } catch {
          parsed = null;
        }
      }
      const profile = siteJsonToExtensionProfile(parsed, authed);
      sendResponse({
        ok: true,
        profile,
        authed,
        syncedAt: typeof data.letudiant_site_synced_at === "number" ? data.letudiant_site_synced_at : null,
      });
    })();
    return true;
  }

  return false;
});
