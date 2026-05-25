"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";
const themeModes: ThemeMode[] = ["light", "dark", "system"];

function readThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  const saved = localStorage.getItem("a5-theme-mode");
  return themeModes.includes(saved as ThemeMode) ? (saved as ThemeMode) : "system";
}

function applyTheme(mode: ThemeMode) {
  const resolved =
    mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : mode === "system" ? "light" : mode;

  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeMode = mode;
  localStorage.setItem("a5-theme-mode", mode);
}

export function ThemeModeToggle() {
  const [mode, setMode] = useState<ThemeMode>(() => readThemeMode());

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  return (
    <div className="inline-flex rounded-md border border-slate-200 bg-white p-1 text-xs font-black text-slate-700 shadow-sm">
      {themeModes.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => {
            setMode(item);
          }}
          className={`rounded px-3 py-1.5 capitalize transition ${
            mode === item ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
