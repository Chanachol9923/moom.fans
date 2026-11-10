"use client";
import { useSyncExternalStore } from "react";
import { useT } from "../i18n/react";
import { currentTheme, setTheme, subscribeTheme } from "../theme";

/** Sun / moon button: switches the dashboard between light and dark. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { d } = useT();
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, () => "light" as const);
  const dark = theme === "dark";
  const label = dark ? d.common.themeLight : d.common.themeDark;
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={`grid size-8 place-items-center text-ink-soft hover:bg-ink/10 hover:text-ink ${className}`}
    >
      {/* Pixel icons drawn on a 10x10 grid. */}
      <svg viewBox="0 0 10 10" width={18} height={18} shapeRendering="crispEdges" fill="currentColor" aria-hidden>
        {dark ? (
          // Sun: shown in dark mode, switches to light.
          <path d="M4 0h2v1H4zM4 9h2v1H4zM0 4h1v2H0zM9 4h1v2H9zM1 1h1v1H1zM8 1h1v1H8zM1 8h1v1H1zM8 8h1v1H8zM3 2h4v1h1v4H7v1H3V7H2V3h1z" />
        ) : (
          // Moon: shown in light mode, switches to dark.
          <path d="M3 1h3v1H5v1H4v4h1v1h3v1H7v1H3V9H2V8H1V3h1V2h1z" />
        )}
      </svg>
    </button>
  );
}
