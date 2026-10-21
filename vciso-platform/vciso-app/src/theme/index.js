// ── Theme runtime ─────────────────────────────────────────────────────────────
// One codebase, three looks: 'new' (default), 'classic' and 'dark'.
// index.html picks the theme before anything renders (localStorage key
// `vciso_theme`, or `?theme=dark` in the URL) and stores it on <html data-theme>.
// Switching theme saves the choice and reloads, so module-level style constants
// are always evaluated for the active theme.

export const THEMES = ['new', 'classic', 'dark'];
export const DEFAULT_THEME = 'new';
const STORAGE_KEY = 'vciso_theme';

function detectTheme() {
  const fromHtml = typeof document !== 'undefined' && document.documentElement.dataset.theme;
  if (THEMES.includes(fromHtml)) return fromHtml;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (THEMES.includes(saved)) return saved;
  } catch { /* storage blocked */ }
  return DEFAULT_THEME;
}

export const THEME = detectTheme();
export const isDark = THEME === 'dark';
export const isClassic = THEME === 'classic';

/**
 * Pick a style value for the active theme.
 * `newValue` is used for the 'new' theme and for any theme not listed in `overrides`.
 *   th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' })
 */
export function th(newValue, overrides) {
  return overrides && Object.prototype.hasOwnProperty.call(overrides, THEME) ? overrides[THEME] : newValue;
}

export function setTheme(theme) {
  if (!THEMES.includes(theme) || theme === THEME) return;
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* storage blocked */ }
  const url = new URL(window.location.href);
  url.searchParams.delete('theme');
  window.location.replace(url.toString());
}
