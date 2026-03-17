import React from "react";
import { createRoot } from "react-dom/client";
import { initSentry } from "@/lib/sentry";
import App from "./App.tsx";
import "./index.css";

initSentry();

/**
 * Clarity carregado de forma diferida — não bloqueia o first paint.
 * Antes estava inline no <head>, causando 126ms de bloqueio no main thread.
 */
function initClarityDeferred() {
  if (import.meta.env.DEV) return;
  if ((window as any).clarity) return;

  const loadClarity = () => {
    setTimeout(() => {
      (function (c: any, l: Document, a: string, r: string, i: string) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        const t = l.createElement(r) as HTMLScriptElement;
        t.async = true;
        t.src = "https://www.clarity.ms/tag/" + i;
        const y = l.getElementsByTagName(r)[0];
        y.parentNode?.insertBefore(t, y);
      })(window, document, "clarity", "script", "vk439rf8hj");
    }, 1000);
  };

  if (document.readyState === "complete") {
    loadClarity();
  } else {
    window.addEventListener("load", loadClarity, { once: true });
  }
}

initClarityDeferred();

(function bootCleanup() {
  try {
    document.querySelectorAll('script[src*="pluggy"]').forEach((el) => el.remove());
    document
      .querySelectorAll('iframe[name*="zoid"], iframe[src*="pluggy"], div[class*="zoid"]')
      .forEach((el) => el.remove());
    const body = document.body;
    const html = document.documentElement;
    const root = document.getElementById("root");
    [body, html, root].forEach((el) => {
      if (el) el.removeAttribute("style");
    });
    body.className = body.className.replace(/\bzoid[^\s]*/g, "").trim();
    if (window.location.hash.includes("zoid")) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  } catch (e) {
    console.warn("[BootCleanup] Non-fatal error:", e);
  }
})();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
