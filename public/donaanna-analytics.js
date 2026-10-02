/* Doña Anna privacy-minimal discovery + CTA measurement.
 * Sends only coarse source, path and CTA category to RealtyFlow.
 * No user IDs, email values, query strings or raw referrer URLs are sent.
 */
(function () {
  "use strict";
  var current = window.location;
  if (current.protocol !== "https:" || !/^(?:www\.)?donaanna\.com$/i.test(current.hostname)) return;

  var path = current.pathname || "/";
  if (!path.startsWith("/") || path.startsWith("//") || path.length > 220 ||
      /[\x00-\x1f@?#]/.test(path) ||
      /^\/(?:api|app|olivia|b2b)(?:\/|\.|$)/i.test(path)) return;

  var raw = document.referrer || "";
  if (raw && raw.length <= 4096) {
    var source = null;
    var host = null;
    try {
      var ref = new URL(raw);
      if (ref.protocol === "https:" && !ref.username && !ref.password && !ref.port) {
        host = ref.hostname.toLowerCase();
        var known = [
          [/^gemini\.google\.com$/i, "google_gemini"],
          [/(^|\.)google\.(?:com|[a-z]{2}|com\.[a-z]{2}|co\.[a-z]{2})$/i, "google_search"],
          [/(^|\.)bing\.com$/i, "bing_search"],
          [/(^|\.)chatgpt\.com$/i, "chatgpt"],
          [/^copilot\.microsoft\.com$/i, "microsoft_copilot"],
          [/(^|\.)perplexity\.ai$/i, "perplexity"],
          [/^search\.brave\.com$/i, "brave_search"],
          [/(^|\.)duckduckgo\.com$/i, "duckduckgo"]
        ];
        for (var i = 0; i < known.length; i++) {
          if (known[i][0].test(host)) { source = known[i][1]; break; }
        }
      }
    } catch (_) {}

    if (source && host) {
      var arrivalKey = "donaanna:search-discovery:" + path + ":" + source;
      var alreadyMeasured = false;
      try { alreadyMeasured = Boolean(window.sessionStorage.getItem(arrivalKey)); } catch (_) {}
      if (!alreadyMeasured) {
        void fetch("https://realtyflow.chatgenius.pro/api/public/search-discovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: path, referrer: "https://" + host + "/" }),
          keepalive: true
        }).then(function (response) {
          if (response.status !== 204) return;
          try {
            window.sessionStorage.setItem(arrivalKey, "1");
            window.sessionStorage.setItem("donaanna:discovery-source", source);
            window.sessionStorage.setItem("donaanna:discovery-landing", path);
          } catch (_) {}
        }).catch(function () {});
      }
    }
  }

  if (!document || typeof document.addEventListener !== "function") return;

  function classify(node) {
    var testId = node.getAttribute && node.getAttribute("data-testid");
    if (testId && /^b2b-portal/.test(testId)) {
      return { eventType: "next_step", target: "b2b_portal" };
    }

    var href = node.getAttribute && node.getAttribute("href");
    if (!href) return null;
    if (/^mailto:info@donaanna\.com(?:\?|$)/i.test(href)) {
      return { eventType: "email", target: "email_contact" };
    }
    if (href === "#tasting" || href === "/#tasting") {
      return { eventType: "contact", target: "tasting_interest" };
    }
    if (href === "#portfolio" || href === "/#portfolio") {
      return { eventType: "next_step", target: "verde_vivo" };
    }
    try {
      var url = new URL(href, current.origin);
      if (url.origin !== current.origin) return null;
      if (url.pathname === "/guider") return { eventType: "next_step", target: "guide_hub" };
      if (url.pathname === "/olivenolje-for-restauranter") return { eventType: "next_step", target: "restaurant_guide" };
    } catch (_) {}
    return null;
  }

  function sendConversion(eventInfo) {
    sendConversion(eventInfo);
  }

  document.addEventListener("submit", function (event) {
    var form = event.target;
    if (!form || !form.matches || !form.matches('form[data-testid="tasting-request-form"]')) return;
    sendConversion({ eventType: "contact", target: "tasting_request_submitted" });
  });

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!target || typeof target.closest !== "function") return;
    var node = target.closest("a[href],button[data-testid]");
    if (!node) return;
    var eventInfo = classify(node);
    if (!eventInfo) return;

    sendConversion(eventInfo);
  }, { passive: true });
})();
