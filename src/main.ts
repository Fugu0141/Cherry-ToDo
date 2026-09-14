import { bootstrapCherry } from './composition/bootstrap';
import { DefaultCherryUI } from './ui/default/index';
import './ui/default/styles.css';
import './ui/default/theme.css';
import './ui/default/drag.css';

const root = document.querySelector<HTMLElement>('#app');

if (root === null) {
  throw new Error('Cherry bootstrap root #app was not found.');
}

void bootstrapCherry(root, { ui: new DefaultCherryUI(), locale: 'ja' });
