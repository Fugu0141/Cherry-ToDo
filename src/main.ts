import { bootstrapPhaseOneShell } from './composition/bootstrap';

const root = document.querySelector<HTMLElement>('#app');

if (root === null) {
  throw new Error('Cherry bootstrap root #app was not found.');
}

bootstrapPhaseOneShell(root);
