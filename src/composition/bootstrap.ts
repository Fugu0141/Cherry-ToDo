import { buildInfo } from '../shared/build-info/index';

export function bootstrapPhaseOneShell(root: HTMLElement): void {
  const heading = document.createElement('h1');
  heading.textContent = buildInfo.appName;

  const status = document.createElement('p');
  status.textContent = `Engineering foundation ready (Phase ${buildInfo.phase}).`;

  root.replaceChildren(heading, status);
}
