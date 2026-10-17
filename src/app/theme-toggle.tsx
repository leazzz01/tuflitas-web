"use client";

import { useSyncExternalStore } from "react";
import { FiMoon, FiSun } from "react-icons/fi";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light");
  const isDark = theme === "dark";

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    if (next === "dark") document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;

    try {
      localStorage.setItem("tuflitas-theme", next);
    } catch {
      // The choice still applies for this visit when storage is unavailable.
    }
    listeners.forEach((listener) => listener());
  }

  const label = isDark ? "Activar modo claro" : "Activar modo nocturno";

  return (
    <button aria-label={label} className="theme-toggle" onClick={toggleTheme} title={label} type="button">
      {isDark ? <FiMoon aria-hidden="true" /> : <FiSun aria-hidden="true" />}
    </button>
  );
}
