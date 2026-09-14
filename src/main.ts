import { bootstrapCherry } from './composition/bootstrap';
import { DefaultCherryUI } from './ui/default/index';

const root = document.querySelector<HTMLElement>('#app');

if (root === null) {
  throw new Error('Cherry bootstrap root #app was not found.');
}

void bootstrapCherry(root, { ui: new DefaultCherryUI(), locale: 'ja' });
