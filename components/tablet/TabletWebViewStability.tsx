"use client";

import { useEffect } from "react";

const tabletCssVersion = "a5-tablet-webview-20260611-001";
const versionParam = "a5v";
const repairParam = "a5Repair";

function syncVisualViewportVars() {
  const viewport = window.visualViewport;
  const width = Math.round(viewport?.width ?? window.innerWidth);
  const height = Math.round(viewport?.height ?? window.innerHeight);

  document.documentElement.style.setProperty("--a5-visual-vw", `${width}px`);
  document.documentElement.style.setProperty("--a5-visual-vh", `${height}px`);
}

function currentRelativeUrl(url: URL) {
  return `${url.pathname}${url.search}${url.hash}`;
}

function repairStylesheetLoadOnce() {
  const probe = document.createElement("div");
  probe.className = "a5-webview-css-probe";
  probe.setAttribute("aria-hidden", "true");
  document.body.appendChild(probe);

  window.requestAnimationFrame(() => {
    const styles = window.getComputedStyle(probe);
    const cssReady = styles.getPropertyValue("--a5-tablet-css-ready").trim() === "1";
    probe.remove();

    if (cssReady) return;

    const url = new URL(window.location.href);
    if (url.searchParams.get(repairParam) === "1") return;

    url.searchParams.set(repairParam, "1");
    url.searchParams.set(versionParam, tabletCssVersion);
    window.location.replace(currentRelativeUrl(url));
  });
}

export function TabletWebViewStability() {
  useEffect(() => {
    document.documentElement.dataset.a5TabletWebview = "1";
    syncVisualViewportVars();
    repairStylesheetLoadOnce();

    const viewport = window.visualViewport;
    window.addEventListener("resize", syncVisualViewportVars);
    viewport?.addEventListener("resize", syncVisualViewportVars);
    viewport?.addEventListener("scroll", syncVisualViewportVars);

    return () => {
      window.removeEventListener("resize", syncVisualViewportVars);
      viewport?.removeEventListener("resize", syncVisualViewportVars);
      viewport?.removeEventListener("scroll", syncVisualViewportVars);
    };
  }, []);

  return null;
}
