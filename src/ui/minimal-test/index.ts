import type { CherryUIContext, CherryUIHandle, CherryUIPackage } from '../../ui-contract/index';

function actionButton(label: string, action: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', action);
  return button;
}

/**
 * Deliberately tiny alternate UI used to prove that Cherry's product Core does not
 * depend on the production DOM structure, CSS, or interaction implementation.
 */
export class MinimalTestUI implements CherryUIPackage<HTMLElement> {
  mount(root: HTMLElement, context: CherryUIContext): CherryUIHandle {
    const render = (): void => {
      const screen = context.getScreen();
      const main = document.createElement('main');
      main.dataset.uiPackage = 'minimal-test';
      const heading = document.createElement('h1');
      heading.textContent = `Cherry · ${screen.kind}`;
      main.append(heading);

      if (screen.kind === 'storage-decision') {
        main.append(
          actionButton('Ephemeral', () => {
            void context.intents.storage.notNow();
          }),
          actionButton('Persistent', () => {
            void context.intents.storage.allow();
          }),
        );
      }

      if (screen.kind === 'start') {
        const input = document.createElement('input');
        input.setAttribute('aria-label', 'Workspace name');
        input.value = 'Minimal UI workspace';
        main.append(
          input,
          actionButton('Create workspace', () => {
            void context.intents.workspace.create({ name: input.value });
          }),
        );
        for (const workspace of screen.workspaces) {
          main.append(
            actionButton(`Open ${workspace.name}`, () => {
              void context.intents.workspace.open(workspace.id);
            }),
          );
        }
      }

      if (screen.kind === 'workspace') {
        const workspace = screen.workspace;
        const summary = document.createElement('p');
        summary.textContent = `${workspace.workspaceName}: ${workspace.tasks.length} tasks / ${workspace.connections.length} connections`;
        main.append(
          summary,
          actionButton('Board', () => {
            void context.intents.workspace.setView('board');
          }),
          actionButton('List', () => {
            void context.intents.workspace.setView('list');
          }),
          actionButton('Add task', () => {
            void context.intents.task.create({ title: `Task ${workspace.tasks.length + 1}` });
          }),
          actionButton('Start', () => {
            void context.intents.workspace.goToStart();
          }),
        );
        const list = document.createElement('ul');
        for (const task of workspace.tasks) {
          const item = document.createElement('li');
          item.textContent = `${task.status}: ${task.title}`;
          list.append(item);
        }
        main.append(list);
      }

      if (screen.kind === 'error') {
        const error = document.createElement('p');
        error.textContent = context.i18n.t(screen.error.messageKey);
        main.append(error);
      }

      root.replaceChildren(main);
    };

    const unsubscribe = context.subscribe(render);
    render();
    return {
      unmount() {
        unsubscribe();
        root.replaceChildren();
      },
    };
  }
}
