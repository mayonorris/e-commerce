/* =========================================================
   analytics.js — couche d’analytics (GA4/GTM friendly)

   Objectif :
   - Fournir window.track(eventName, params)
   - Mode debug: ajoute ?debug=1 à l’URL => logs console
   - Compatible GA4 via gtag() si installé
   - Compatible GTM via dataLayer.push()
========================================================= */

(function () {
  "use strict";

  const DEBUG = new URLSearchParams(window.location.search).get("debug") === "1";

  // Données d'identité "pédagogiques" (anonymes)
  const STORAGE_KEYS = {
    userId: "ec_user_id_v1",
    sessionId: "ec_session_id_v1"
  };

  function uid(prefix = "u") {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  }

  function getOrCreate(key, prefix) {
    let v = localStorage.getItem(key);
    if (!v) {
      v = uid(prefix);
      localStorage.setItem(key, v);
    }
    return v;
  }

  const user_id = getOrCreate(STORAGE_KEYS.userId, "user");
  const session_id = getOrCreate(STORAGE_KEYS.sessionId, "sess");

  // dataLayer pour GTM (si GTM n'est pas installé, on le crée)
  window.dataLayer = window.dataLayer || [];

  // track() — point central
  function track(eventName, params = {}) {
    const payload = {
      event: eventName,          // utile pour GTM
      user_id,
      session_id,
      timestamp: new Date().toISOString(),
      ...params
    };

    // 1) GTM / dataLayer
    window.dataLayer.push(payload);

    // 2) GA4 gtag (si présent)
    if (typeof window.gtag === "function") {
      // gtag('event', eventName, params)
      // Note: on envoie sans "event" (réservé à dataLayer)
      const { event, ...gtagParams } = payload;
      window.gtag("event", eventName, gtagParams);
    }

    // 3) Debug console
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log("[track]", eventName, payload);
    }
  }

  // Expose
  window.track = track;

  // Optionnel : ping init
  if (DEBUG) {
    track("debug_mode_enabled", { debug: true });
  }
})();
