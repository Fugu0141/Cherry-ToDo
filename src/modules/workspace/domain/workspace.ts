import {
  validateAnnotation,
  type Annotation,
  type AnnotationValidationError,
} from '../../annotation/index.ts';
import {
  validateBoardDocumentState,
  type BoardDocumentState,
  type BoardValidationError,
} from '../../board/index.ts';
import { validateFlowGraph, type FlowEdge, type FlowInvariantError } from '../../flow/index.ts';
import { validateTask, type Task, type TaskValidationError } from '../../task/index.ts';
import type { TabId, TaskId, WorkspaceId } from '../../../shared/ids/index.ts';
import {
  validateRevisionMeta,
  type RevisionMeta,
  type RevisionMetaError,
} from '../../../shared/revision/index.ts';
import { err, ok, type Result } from '../../../shared/result/index.ts';

export const CHERRY_V2_SCHEMA_VERSION = 2 as const;

export interface TabDocument {
  readonly id: TabId;
  readonly name: string;
  readonly tasks: Readonly<Record<string, Task>>;
  readonly flowEdges: Readonly<Record<string, FlowEdge>>;
  readonly annotations: Readonly<Record<string, Annotation>>;
  readonly board: BoardDocumentState;
  readonly meta: RevisionMeta;
}

export interface WorkspaceDocument {
  readonly schemaVersion: number;
  readonly id: WorkspaceId;
  readonly name: string;
  readonly tabs: Readonly<Record<string, TabDocument>>;
  readonly tabOrder: readonly TabId[];
  readonly meta: RevisionMeta;
}

export type WorkspaceValidationError =
  | {
      readonly code:
        | 'unsupported-schema-version'
        | 'tab-key-mismatch'
        | 'task-key-mismatch'
        | 'edge-key-mismatch'
        | 'annotation-key-mismatch'
        | 'duplicate-tab-order'
        | 'unknown-tab-order'
        | 'missing-tab-order';
      readonly path: string;
      readonly message: string;
    }
  | {
      readonly code: 'invalid-workspace-revision' | 'invalid-tab-revision';
      readonly path: string;
      readonly causes: readonly RevisionMetaError[];
    }
  | {
      readonly code: 'invalid-task';
      readonly path: string;
      readonly cause: TaskValidationError;
    }
  | {
      readonly code: 'invalid-flow';
      readonly path: string;
      readonly causes: readonly FlowInvariantError[];
    }
  | {
      readonly code: 'invalid-board';
      readonly path: string;
      readonly causes: readonly BoardValidationError[];
    }
  | {
      readonly code: 'invalid-annotation';
      readonly path: string;
      readonly cause: AnnotationValidationError;
    };

function simpleIssue(
  code:
    | 'unsupported-schema-version'
    | 'tab-key-mismatch'
    | 'task-key-mismatch'
    | 'edge-key-mismatch'
    | 'annotation-key-mismatch'
    | 'duplicate-tab-order'
    | 'unknown-tab-order'
    | 'missing-tab-order',
  path: string,
  message: string,
): WorkspaceValidationError {
  return { code, path, message };
}

function validateTab(tabKey: string, tab: TabDocument): readonly WorkspaceValidationError[] {
  const errors: WorkspaceValidationError[] = [];
  const tabPath = `tabs.${tabKey}`;

  if (tabKey !== tab.id) {
    errors.push(
      simpleIssue(
        'tab-key-mismatch',
        tabPath,
        `Tab map key "${tabKey}" does not match Tab id "${tab.id}".`,
      ),
    );
  }

  const tabMeta = validateRevisionMeta(tab.meta);
  if (!tabMeta.ok) {
    errors.push({ code: 'invalid-tab-revision', path: `${tabPath}.meta`, causes: tabMeta.error });
  }

  const taskIds: TaskId[] = [];
  for (const [taskKey, task] of Object.entries(tab.tasks)) {
    taskIds.push(task.id);

    if (taskKey !== task.id) {
      errors.push(
        simpleIssue(
          'task-key-mismatch',
          `${tabPath}.tasks.${taskKey}`,
          `Task map key "${taskKey}" does not match Task id "${task.id}".`,
        ),
      );
    }

    const taskValidation = validateTask(task);
    if (!taskValidation.ok) {
      errors.push({
        code: 'invalid-task',
        path: `${tabPath}.tasks.${taskKey}`,
        cause: taskValidation.error,
      });
    }
  }

  for (const [edgeKey, edge] of Object.entries(tab.flowEdges)) {
    if (edgeKey !== edge.id) {
      errors.push(
        simpleIssue(
          'edge-key-mismatch',
          `${tabPath}.flowEdges.${edgeKey}`,
          `Flow edge map key "${edgeKey}" does not match edge id "${edge.id}".`,
        ),
      );
    }
  }

  const flow = validateFlowGraph(taskIds, tab.flowEdges);
  if (!flow.ok) {
    errors.push({ code: 'invalid-flow', path: `${tabPath}.flowEdges`, causes: flow.error });
  }

  const board = validateBoardDocumentState(taskIds, tab.board);
  if (!board.ok) {
    errors.push({ code: 'invalid-board', path: `${tabPath}.board`, causes: board.error });
  }

  for (const [annotationKey, annotation] of Object.entries(tab.annotations)) {
    if (annotationKey !== annotation.id) {
      errors.push(
        simpleIssue(
          'annotation-key-mismatch',
          `${tabPath}.annotations.${annotationKey}`,
          `Annotation map key "${annotationKey}" does not match Annotation id "${annotation.id}".`,
        ),
      );
    }

    const annotationValidation = validateAnnotation(annotation);
    if (!annotationValidation.ok) {
      errors.push({
        code: 'invalid-annotation',
        path: `${tabPath}.annotations.${annotationKey}`,
        cause: annotationValidation.error,
      });
    }
  }

  return errors;
}

export function validateWorkspaceDocument(
  workspace: WorkspaceDocument,
): Result<WorkspaceDocument, readonly WorkspaceValidationError[]> {
  const errors: WorkspaceValidationError[] = [];

  if (workspace.schemaVersion !== CHERRY_V2_SCHEMA_VERSION) {
    errors.push(
      simpleIssue(
        'unsupported-schema-version',
        'schemaVersion',
        `Expected schema version ${CHERRY_V2_SCHEMA_VERSION}.`,
      ),
    );
  }

  const workspaceMeta = validateRevisionMeta(workspace.meta);
  if (!workspaceMeta.ok) {
    errors.push({ code: 'invalid-workspace-revision', path: 'meta', causes: workspaceMeta.error });
  }

  for (const [tabKey, tab] of Object.entries(workspace.tabs)) {
    errors.push(...validateTab(tabKey, tab));
  }

  const tabOrderSeen = new Set<TabId>();
  for (const [index, tabId] of workspace.tabOrder.entries()) {
    if (tabOrderSeen.has(tabId)) {
      errors.push(
        simpleIssue(
          'duplicate-tab-order',
          `tabOrder.${index}`,
          `Tab "${tabId}" appears more than once in tabOrder.`,
        ),
      );
    }
    tabOrderSeen.add(tabId);

    if (workspace.tabs[tabId] === undefined) {
      errors.push(
        simpleIssue(
          'unknown-tab-order',
          `tabOrder.${index}`,
          `tabOrder references unknown Tab "${tabId}".`,
        ),
      );
    }
  }

  for (const tab of Object.values(workspace.tabs)) {
    if (!tabOrderSeen.has(tab.id)) {
      errors.push(
        simpleIssue('missing-tab-order', 'tabOrder', `Tab "${tab.id}" is missing from tabOrder.`),
      );
    }
  }

  return errors.length === 0 ? ok(workspace) : err(errors);
}
