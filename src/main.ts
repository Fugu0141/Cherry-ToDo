import { bootstrapCherry } from './composition/bootstrap';
import { CherryGameUI } from './ui/game/index';
import './ui/game/styles.css';

const root = document.querySelector<HTMLElement>('#app');

if (root === null) {
  throw new Error('Cherry bootstrap root #app was not found.');
}

void bootstrapCherry(root, { ui: new CherryGameUI(), locale: 'ja' });
