"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/**
 * Always-present theme switch, bottom-right.
 *
 * The chosen theme is written to localStorage and applied by an inline script
 * in the document head before paint, so there is no flash of the wrong theme on
 * load. This component only handles the switching once React is running.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme(current);
    setReady(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("lastbuy.theme", next);
    } catch {
      /* private mode — the choice simply does not persist */
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="fixed bottom-5 right-5 z-50 grid h-11 w-11 place-items-center border border-line bg-bg text-fg transition-colors duration-200 hover:border-line-bright"
    >
      <span className={`transition-opacity duration-200 ${ready ? "opacity-100" : "opacity-0"}`}>
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a6.8 6.8 0 0 0 10.8 10.8Z" />
    </svg>
  );
}

/**
 * Runs before React hydrates, so the correct theme is on <html> for the first
 * paint. Falls back to the operating system preference when nothing is stored.
 */
export const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('lastbuy.theme');
    var dark = stored ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;
