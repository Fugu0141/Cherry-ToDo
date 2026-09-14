import { describe, expect, it } from 'vitest';

import { mountCherryUI } from '../../src/composition/bootstrap';
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
import { MinimalTestUI } from '../../src/ui/minimal-test/index';

const ok = (): Promise<UIActionResult> => Promise.resolve({ kind: 'ok' });

function makeIntents(): CherryUIIntents {
  return {
    storage: { allow: ok, notNow: ok, disable: ok },
    workspace: {
      create: ok,
      open: ok,
      createTab: ok,
      openTab: ok,
      goToStart: ok,
      setView: ok,
      setBoardSettings: ok,
    },
    task: {
      create: ok,
      update: ok,
      setCompleted: ok,
      setSchedule: ok,
      deleteOnly: ok,
      deleteDownstream: ok,
    },
    board: { dropTask: ok },
    flow: { connect: ok, disconnect: ok, reorder: ok },
    annotation: {
      createText: ok,
      createStroke: ok,
      updateText: ok,
      updateStroke: ok,
      delete: ok,
    },
    history: { undo: ok, redo: ok },
    confirmation: { confirm: ok, cancel: ok },
  };
}

function makeContext(): CherryUIContext {
  const screen: CherryScreenModel = { kind: 'start', workspaces: [] };
  return {
    getScreen: () => screen,
    subscribe: () => () => undefined,
    intents: makeIntents(),
    capabilities: {
      persistentStorageAvailable: true,
      persistentStorageEnabled: false,
      boardView: true,
      listView: true,
      taskEditing: true,
      structuralConnections: true,
      annotations: true,
    },
    i18n: createCherryI18n('en'),
    semanticTokens: CHERRY_SEMANTIC_TOKENS,
  };
}

class ProbeUI implements CherryUIPackage<HTMLElement> {
  mounted = false;

  mount(_root: HTMLElement, context: CherryUIContext): CherryUIHandle {
    this.mounted = context.getScreen().kind === 'start';
    return {
      unmount: () => {
        this.mounted = false;
      },
    };
  }
}

describe('Phase 10 UI replaceability', () => {
  it('lets composition mount a compatible package without changing Core/Application', () => {
    const ui = new ProbeUI();
    const fakeRoot = {} as HTMLElement;
    const handle = mountCherryUI(fakeRoot, makeContext(), ui);

    expect(ui.mounted).toBe(true);
    handle.unmount();
    expect(ui.mounted).toBe(false);
  });

  it('ships a second contract-compatible UI package as the replacement-boundary proof', () => {
    const alternate: CherryUIPackage<HTMLElement> = new MinimalTestUI();
    expect(alternate).toBeInstanceOf(MinimalTestUI);
  });
});
