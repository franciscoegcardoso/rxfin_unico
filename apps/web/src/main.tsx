import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/**
 * Boot cleanup: runs ONCE before React mounts.
 * Handles the case where the browser returns from a Pluggy OAuth redirect
 * (e.g., Nubank authorization) and residual zoid iframes/overlays are still
 * in the DOM from the previous session.
 */
(function bootCleanup() {
  try {
    // Remove residual pluggy-connect script tags (zoid injects them)
    document.querySelectorAll('script[src*="pluggy"]').forEach((el) => el.remove());

    // Remove zoid iframes and overlays
    document
      .querySelectorAll('iframe[name*="zoid"], iframe[src*="pluggy"], div[class*="zoid"]')
      .forEach((el) => el.remove());

    // Strip any inline styles from body/html/#root that zoid may have left
    const body = document.body;
    const html = document.documentElement;
    const root = document.getElementById("root");

    [body, html, root].forEach((el) => {
      if (el) el.removeAttribute("style");
    });

    // Remove zoid class names from body
    body.className = body.className.replace(/\bzoid[^\s]*/g, "").trim();

    // Clear zoid URL hash fragments (e.g., #/zoid/...)
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
