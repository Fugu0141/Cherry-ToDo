import { err, ok, type Result } from '../result/index.ts';

declare const entityIdBrand: unique symbol;

type BrandedEntityId<K extends string> = string & {
  readonly [entityIdBrand]: K;
};

export type WorkspaceId = BrandedEntityId<'workspace'>;
export type TabId = BrandedEntityId<'tab'>;
export type TaskId = BrandedEntityId<'task'>;
export type FlowEdgeId = BrandedEntityId<'flow-edge'>;
export type AnnotationId = BrandedEntityId<'annotation'>;

export type EntityIdKind = 'workspace' | 'tab' | 'task' | 'flow-edge' | 'annotation';

interface EntityIdByKind {
  readonly workspace: WorkspaceId;
  readonly tab: TabId;
  readonly task: TaskId;
  readonly 'flow-edge': FlowEdgeId;
  readonly annotation: AnnotationId;
}

export interface InvalidEntityIdError {
  readonly code: 'invalid-entity-id';
  readonly kind: EntityIdKind;
  readonly value: string;
}

function containsControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint < 32 || codePoint === 127);
  });
}

export function parseEntityId<K extends EntityIdKind>(
  kind: K,
  value: string,
): Result<EntityIdByKind[K], InvalidEntityIdError> {
  const invalid =
    value.length > 256 || value.trim().length === 0 || containsControlCharacter(value);

  if (invalid) {
    return err({ code: 'invalid-entity-id', kind, value });
  }

  return ok(value as EntityIdByKind[K]);
}

export function parseWorkspaceId(value: string): Result<WorkspaceId, InvalidEntityIdError> {
  return parseEntityId('workspace', value);
}

export function parseTabId(value: string): Result<TabId, InvalidEntityIdError> {
  return parseEntityId('tab', value);
}

export function parseTaskId(value: string): Result<TaskId, InvalidEntityIdError> {
  return parseEntityId('task', value);
}

export function parseFlowEdgeId(value: string): Result<FlowEdgeId, InvalidEntityIdError> {
  return parseEntityId('flow-edge', value);
}

export function parseAnnotationId(value: string): Result<AnnotationId, InvalidEntityIdError> {
  return parseEntityId('annotation', value);
}
