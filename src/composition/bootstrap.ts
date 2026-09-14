import type {
  CherryLocale,
  CherryUIContext,
  CherryUIHandle,
  CherryUIPackage,
} from '../ui-contract/index';
import { createBrowserApplicationComposition } from './create-browser-application';
import { CherryUIRuntime } from './cherry-ui-runtime';

export interface CherryBootstrapOptions {
  readonly ui: CherryUIPackage<HTMLElement>;
  readonly locale?: CherryLocale;
}

export function mountCherryUI(
  root: HTMLElement,
  context: CherryUIContext,
  ui: CherryUIPackage<HTMLElement>,
): CherryUIHandle {
  return ui.mount(root, context);
}

export async function bootstrapCherry(
  root: HTMLElement,
  options: CherryBootstrapOptions,
): Promise<CherryUIHandle> {
  performance.mark('cherry:boot:start');
  const application = createBrowserApplicationComposition({
    storage: window.localStorage,
    indexedDb: window.indexedDB,
  });
  const runtime = new CherryUIRuntime(application, options.locale ?? 'ja');
  const handle = mountCherryUI(root, runtime, options.ui);
  await runtime.boot();
  performance.mark('cherry:boot:ready');
  performance.measure('cherry:boot', 'cherry:boot:start', 'cherry:boot:ready');
  return handle;
}
