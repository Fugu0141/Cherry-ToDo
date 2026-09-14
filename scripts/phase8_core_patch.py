from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label} target not found')
    return text.replace(old, new, 1)


p = Path('src/modules/workspace/application/application-store.ts')
s = p.read_text()
s = replace_once(
    s,
    "import {\n  addFlowEdge,",
    """import {
  createStrokeAnnotation as buildStrokeAnnotation,
  createTextAnnotation as buildTextAnnotation,
  simplifyStrokePoints,
  validateAnnotation,
  type Annotation,
  type AnnotationValidationError,
  type CreateStrokeAnnotationInput,
  type CreateTextAnnotationInput,
  type Rect,
} from '../../annotation/index';
import {
  addFlowEdge,""",
    'annotation imports',
)
s = replace_once(
    s,
    "import type { FlowEdgeId, TabId, TaskId } from '../../../shared/ids/index';",
    "import type { AnnotationId, FlowEdgeId, TabId, TaskId } from '../../../shared/ids/index';",
    'annotation id import',
)
s = replace_once(
    s,
    """  | { readonly code: 'task-id-in-use'; readonly taskId: TaskId }
  | { readonly code: 'edge-not-found'; readonly edgeId: FlowEdgeId }""",
    """  | { readonly code: 'task-id-in-use'; readonly taskId: TaskId }
  | { readonly code: 'annotation-not-found'; readonly annotationId: AnnotationId }
  | { readonly code: 'annotation-id-in-use'; readonly annotationId: AnnotationId }
  | { readonly code: 'annotation-invalid'; readonly cause: AnnotationValidationError }
  | { readonly code: 'edge-not-found'; readonly edgeId: FlowEdgeId }""",
    'annotation application errors',
)
s = replace_once(
    s,
    """export interface UpdateTaskInput {
  readonly title?: string;
  readonly notes?: string;
  readonly importance?: TaskImportance;
}
""",
    """export interface UpdateTaskInput {
  readonly title?: string;
  readonly notes?: string;
  readonly importance?: TaskImportance;
}

export interface UpdateAnnotationInput {
  readonly rect?: Rect;
  readonly text?: string;
  readonly styleToken?: string;
  readonly points?: readonly Point[];
  readonly widthToken?: string;
}
""",
    'annotation update input',
)
insert = """
  createTextAnnotation(
    tabId: TabId,
    input: Omit<CreateTextAnnotationInput, 'meta'>,
  ): Result<MutationOutcome, ApplicationError> {
    const tab = this.#workspace.tabs[tabId];
    if (tab === undefined) return err({ code: 'tab-not-found', tabId });
    if (tab.annotations[input.id] !== undefined) {
      return err({ code: 'annotation-id-in-use', annotationId: input.id });
    }
    const now = this.#now();
    const created = buildTextAnnotation({
      ...input,
      meta: { createdAt: now, updatedAt: now, revision: 0 },
    });
    if (!created.ok) return err({ code: 'annotation-invalid', cause: created.error });
    return this.#commitSimpleTab(
      tabId,
      { ...tab, annotations: { ...tab.annotations, [created.value.id]: created.value } },
      now,
    );
  }

  createStrokeAnnotation(
    tabId: TabId,
    input: Omit<CreateStrokeAnnotationInput, 'meta'>,
  ): Result<MutationOutcome, ApplicationError> {
    const tab = this.#workspace.tabs[tabId];
    if (tab === undefined) return err({ code: 'tab-not-found', tabId });
    if (tab.annotations[input.id] !== undefined) {
      return err({ code: 'annotation-id-in-use', annotationId: input.id });
    }
    const now = this.#now();
    const created = buildStrokeAnnotation({
      ...input,
      meta: { createdAt: now, updatedAt: now, revision: 0 },
    });
    if (!created.ok) return err({ code: 'annotation-invalid', cause: created.error });
    return this.#commitSimpleTab(
      tabId,
      { ...tab, annotations: { ...tab.annotations, [created.value.id]: created.value } },
      now,
    );
  }

  updateAnnotation(
    tabId: TabId,
    annotationId: AnnotationId,
    changes: UpdateAnnotationInput,
  ): Result<MutationOutcome, ApplicationError> {
    const tab = this.#workspace.tabs[tabId];
    if (tab === undefined) return err({ code: 'tab-not-found', tabId });
    const current = tab.annotations[annotationId];
    if (current === undefined) return err({ code: 'annotation-not-found', annotationId });
    const now = this.#now();
    let updated: Annotation;
    if (current.kind === 'text') {
      updated = {
        ...current,
        ...(changes.rect === undefined ? {} : { rect: changes.rect }),
        ...(changes.text === undefined ? {} : { text: changes.text }),
        ...(changes.styleToken === undefined ? {} : { styleToken: changes.styleToken }),
        meta: bumpMeta(current.meta, now),
      };
    } else {
      updated = {
        ...current,
        ...(changes.points === undefined
          ? {}
          : { points: simplifyStrokePoints(changes.points) }),
        ...(changes.widthToken === undefined ? {} : { widthToken: changes.widthToken }),
        ...(changes.styleToken === undefined ? {} : { styleToken: changes.styleToken }),
        meta: bumpMeta(current.meta, now),
      };
    }
    const validation = validateAnnotation(updated);
    if (!validation.ok) return err({ code: 'annotation-invalid', cause: validation.error });
    return this.#commitSimpleTab(
      tabId,
      { ...tab, annotations: { ...tab.annotations, [annotationId]: validation.value } },
      now,
    );
  }

  deleteAnnotation(
    tabId: TabId,
    annotationId: AnnotationId,
  ): Result<MutationOutcome, ApplicationError> {
    const tab = this.#workspace.tabs[tabId];
    if (tab === undefined) return err({ code: 'tab-not-found', tabId });
    if (tab.annotations[annotationId] === undefined) {
      return err({ code: 'annotation-not-found', annotationId });
    }
    return this.#commitSimpleTab(
      tabId,
      { ...tab, annotations: withoutKey(tab.annotations, annotationId) },
      this.#now(),
    );
  }

"""
s = replace_once(s, "  applyBoardDrop(\n", insert + "  applyBoardDrop(\n", 'annotation methods')
p.write_text(s)

p = Path('src/modules/workspace/index.ts')
s = p.read_text()
s = replace_once(
    s,
    """  type MutationPreview,
  type UpdateTaskInput,""",
    """  type MutationPreview,
  type UpdateAnnotationInput,
  type UpdateTaskInput,""",
    'workspace annotation export',
)
p.write_text(s)
