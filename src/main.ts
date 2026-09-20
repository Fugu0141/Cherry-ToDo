import { bootstrapCherry } from './composition/bootstrap';
import { CherryGameUI } from './ui/game/index';
import { installCherryOnboarding } from './ui/game/onboarding';
import {
  applyCherryLocale,
  installCherryLocaleControls,
  readCherryLocalePreference,
} from './ui/game/locale';
import {
  applyCherryTheme,
  installCherryThemeControls,
  readCherryThemePreference,
} from './ui/game/theme';
import './ui/game/styles.css';
import './ui/game/onboarding.css';
import './ui/game/theme.css';

const root = document.querySelector<HTMLElement>('#app');

if (root === null) {
  throw new Error('Cherry bootstrap root #app was not found.');
}

const locale = readCherryLocalePreference();
applyCherryLocale(locale);
applyCherryTheme(readCherryThemePreference());

void bootstrapCherry(root, { ui: new CherryGameUI(), locale }).then(() => {
  installCherryOnboarding(root, locale);
  installCherryThemeControls(root, locale);
  installCherryLocaleControls(root, locale);
});
