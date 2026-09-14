import { DefaultCherryUI } from '../ui/default/index';
import '../ui/default/styles.css';
import { createBrowserApplicationComposition } from './create-browser-application';
import { CherryUIRuntime } from './cherry-ui-runtime';

export async function bootstrapCherry(root: HTMLElement): Promise<void> {
  const application = createBrowserApplicationComposition({
    storage: window.localStorage,
    indexedDb: window.indexedDB,
  });
  const runtime = new CherryUIRuntime(application, 'ja');
  const ui = new DefaultCherryUI();
  ui.mount(root, runtime);
  await runtime.boot();
}
