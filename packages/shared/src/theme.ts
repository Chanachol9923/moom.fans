// Light / dark mode for the website and the desktop app. The choice lives in
// localStorage; with no choice the computer's setting is followed (and followed live).
// OBS pages never run this, so overlays and widgets always look the same.

export type Theme = "light" | "dark";
export const THEME_KEY = "moom.theme";

/**
 * Sets <html data-theme> from the saved choice or the system setting. Must only use
 * globals: it is also inlined as a <script> (themeInitScript) so the page paints in the
 * right colours straight away.
 */
export function initTheme() {
  try {
    const key = "moom.theme";
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = function () {
      const saved = localStorage.getItem(key);
      document.documentElement.dataset.theme = saved === "dark" || saved === "light" ? saved : media.matches ? "dark" : "light";
    };
    apply();
    media.addEventListener("change", apply);
  } catch {
    // Storage blocked: stay light.
  }
}

export const themeInitScript = `(${initTheme.toString()})();`;

export function currentTheme(): Theme {
  return typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function setTheme(t: Theme) {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    // Still switch for this visit.
  }
  document.documentElement.dataset.theme = t;
}

/** For useSyncExternalStore: tells React when data-theme changes (toggle or system). */
export function subscribeTheme(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}
