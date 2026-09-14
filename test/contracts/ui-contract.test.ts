import { describe, expect, it } from 'vitest';

import {
  CHERRY_SEMANTIC_TOKENS,
  createCherryI18n,
  type CherryScreenModel,
  type CherryUIContext,
  type CherryUIHandle,
  type CherryUIIntents,
  type CherryUIPackage,
  type UIActionResult,
} from '../../src/ui-contract/index';

const ok = (): Promise<UIActionResult> => Promise.resolve({ kind: 'ok' });

function intents(): CherryUIIntents {
  return {
    storage: { allow: ok, notNow: ok },
    workspace: {
      create: ok,
      open: ok,
      goToStart: ok,
      setView: ok,
    },
    task: {
      create: ok,
      update: ok,
      setCompleted: ok,
    },
    flow: { connect: ok },
    history: { undo: ok, redo: ok },
    confirmation: { confirm: ok, cancel: ok },
  };
}

class DummyUI implements CherryUIPackage<{ mounted: boolean }> {
  mount(host: { mounted: boolean }, context: CherryUIContext): CherryUIHandle {
    host.mounted = context.getScreen().kind === 'start';
    return {
      unmount() {
        host.mounted = false;
      },
    };
  }
}

describe('formal UI contract', () => {
  it('lets an unrelated UI package mount without importing Core or adapters', () => {
    const screen: CherryScreenModel = { kind: 'start', workspaces: [] };
    const context: CherryUIContext = {
      getScreen: () => screen,
      subscribe: () => () => undefined,
      intents: intents(),
      capabilities: {
        persistentStorageAvailable: true,
        boardView: true,
        listView: true,
        taskEditing: true,
        structuralConnections: true,
      },
      i18n: createCherryI18n('ja'),
      semanticTokens: CHERRY_SEMANTIC_TOKENS,
    };
    const host = { mounted: false };
    const handle = new DummyUI().mount(host, context);

    expect(host.mounted).toBe(true);
    handle.unmount();
    expect(host.mounted).toBe(false);
  });

  it('routes all contract strings through locale dictionaries', () => {
    const ja = createCherryI18n('ja');
    const en = createCherryI18n('en');

    expect(ja.t('storage.notNow')).toBe('今はしない');
    expect(en.t('storage.notNow')).toBe('Not now');
    expect(CHERRY_SEMANTIC_TOKENS.states).toContain('derived-goal');
  });
});
