import type { CherryLocale } from '../../ui-contract/index';

export const CHERRY_LOCALE_STORAGE_KEY = 'cherry:v2:ui:locale';

export interface LocaleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function parseCherryLocale(value: string | null): CherryLocale {
  return value === 'en' ? 'en' : 'ja';
}

export function readCherryLocalePreference(
  storage: LocaleStorage | null = typeof window === 'undefined' ? null : window.localStorage,
): CherryLocale {
  if (storage === null) return 'ja';
  try {
    return parseCherryLocale(storage.getItem(CHERRY_LOCALE_STORAGE_KEY));
  } catch {
    return 'ja';
  }
}

export function applyCherryLocale(
  locale: CherryLocale,
  root: HTMLElement = document.documentElement,
): void {
  root.lang = locale;
}

export function saveCherryLocalePreference(
  locale: CherryLocale,
  storage: LocaleStorage | null = typeof window === 'undefined' ? null : window.localStorage,
): void {
  if (storage === null) return;
  try {
    storage.setItem(CHERRY_LOCALE_STORAGE_KEY, locale);
  } catch {
    return;
  }
}

export function installCherryLocaleControls(root: HTMLElement, locale: CherryLocale): () => void {
  const install = (): void => {
    const settings = root.querySelector<HTMLElement>('.cg-settings');
    if (!settings || settings.querySelector('.cg-locale-setting')) return;

    const row = document.createElement('label');
    row.className = 'cg-setting-row cg-locale-setting';

    const label = document.createElement('span');
    label.textContent = locale === 'ja' ? '言語' : 'Language';

    const select = document.createElement('select');
    select.className = 'cg-input cg-locale-select';
    select.setAttribute('aria-label', locale === 'ja' ? '言語' : 'Language');

    for (const [value, text] of [
      ['ja', '日本語'],
      ['en', 'English'],
    ] as const) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.append(option);
    }

    select.value = locale;
    select.addEventListener('change', () => {
      const next = parseCherryLocale(select.value);
      saveCherryLocalePreference(next);
      applyCherryLocale(next);
      window.location.reload();
    });

    row.append(label, select);
    settings.append(row);
  };

  const observer = new MutationObserver(install);
  observer.observe(root, { childList: true, subtree: true });
  install();

  return () => observer.disconnect();
}
