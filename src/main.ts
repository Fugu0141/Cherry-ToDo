import { bootstrapCherry } from './composition/bootstrap';
import { CherryGameUI } from './ui/game/index';
import { installCherryOnboarding } from './ui/game/onboarding';
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

applyCherryTheme(readCherryThemePreference());

void bootstrapCherry(root, { ui: new CherryGameUI(), locale: 'ja' }).then(() => {
  installCherryOnboarding(root);
  installCherryThemeControls(root);
});
