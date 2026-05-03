import { extractProgramFromDocument } from "./extractDom";

declare global {
  interface Window {
    __letudiantExtContentReady?: boolean;
  }
}

/** Évite les listeners en double si le script est ré-injecté. */
if (!window.__letudiantExtContentReady) {
  window.__letudiantExtContentReady = true;
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "EXTRACT_PROGRAM") {
      try {
        const intel = extractProgramFromDocument(document, location.href);
        sendResponse({ ok: true, intel });
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        sendResponse({ ok: false, error: err });
      }
      return true;
    }
    return false;
  });
}
