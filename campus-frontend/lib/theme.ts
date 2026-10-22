export type Theme = "light" | "dark";
export const THEME_STORAGE_KEY = "stellarcampus.theme";
const THEME_EVENT = "stellarcampus:theme";
let memoryPreference: Theme | null = null;

export function chooseTheme(saved: string | null, prefersDark: boolean): Theme {
  return saved === "light" || saved === "dark"
    ? saved
    : prefersDark
      ? "dark"
      : "light";
}
function savedPreference(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return memoryPreference;
  }
}
function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}
export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}
export function setTheme(theme: Theme) {
  memoryPreference = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* Keep the explicit preference in memory when storage is unavailable. */
  }
  applyTheme(theme);
  window.dispatchEvent(new Event(THEME_EVENT));
}
export function subscribeTheme(onChange: () => void) {
  const system = window.matchMedia("(prefers-color-scheme: dark)");
  function systemChanged() {
    const saved = savedPreference();
    if (saved !== "light" && saved !== "dark" && !memoryPreference) {
      applyTheme(chooseTheme(null, system.matches));
      onChange();
    }
  }
  function storageChanged(event: StorageEvent) {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    memoryPreference = null;
    applyTheme(chooseTheme(savedPreference(), system.matches));
    onChange();
  }
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", storageChanged);
  system.addEventListener("change", systemChanged);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", storageChanged);
    system.removeEventListener("change", systemChanged);
  };
}

// Runs before the body paints, so a saved theme does not flash the opposite palette.
export const THEME_INIT_SCRIPT = `(function(){var saved=null;try{saved=localStorage.getItem('${THEME_STORAGE_KEY}')}catch(e){}var theme=saved==='light'||saved==='dark'?saved:window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=theme})()`;
