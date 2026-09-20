export type CherryThemePreference = 'system' | 'light' | 'dark';

export const CHERRY_THEME_STORAGE_KEY = 'cherry:v2:ui:theme';

export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function parseCherryThemePreference(value: string | null): CherryThemePreference {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

export function readCherryThemePreference(
  storage: ThemeStorage | null = typeof window === 'undefined' ? null : window.localStorage,
): CherryThemePreference {
  if (storage === null) return 'system';
  try {
    return parseCherryThemePreference(storage.getItem(CHERRY_THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

export function applyCherryTheme(
  preference: CherryThemePreference,
  root: HTMLElement = document.documentElement,
): void {
  if (preference === 'system') {
    delete root.dataset.cherryTheme;
    return;
  }
  root.dataset.cherryTheme = preference;
}

export function saveCherryThemePreference(
  preference: CherryThemePreference,
  storage: ThemeStorage | null = typeof window === 'undefined' ? null : window.localStorage,
): void {
  if (storage === null) return;
  try {
    storage.setItem(CHERRY_THEME_STORAGE_KEY, preference);
  } catch {
    return;
  }
}

export function installCherryThemeControls(
  root: HTMLElement,
  locale: 'ja' | 'en' = 'ja',
): () => void {
  const install = (): void => {
    const settings = root.querySelector<HTMLElement>('.cg-settings');
    if (!settings || settings.querySelector('.cg-theme-setting')) return;

    const row = document.createElement('label');
    row.className = 'cg-setting-row cg-theme-setting';

    const label = document.createElement('span');
    label.textContent = locale === 'ja' ? 'テーマ' : 'Theme';

    const select = document.createElement('select');
    select.className = 'cg-input cg-theme-select';
    select.setAttribute('aria-label', locale === 'ja' ? 'テーマ' : 'Theme');

    for (const [value, text] of [
      ['system', locale === 'ja' ? 'システム' : 'System'],
      ['light', locale === 'ja' ? 'ライト' : 'Light'],
      ['dark', locale === 'ja' ? 'ダーク' : 'Dark'],
    ] as const) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.append(option);
    }

    select.value = readCherryThemePreference();
    select.addEventListener('change', () => {
      const preference = parseCherryThemePreference(select.value);
      saveCherryThemePreference(preference);
      applyCherryTheme(preference);
    });

    row.append(label, select);
    settings.append(row);
  };

  const observer = new MutationObserver(install);
  observer.observe(root, { childList: true, subtree: true });
  install();

  return () => observer.disconnect();
}
