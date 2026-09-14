from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label} target not found')
    return text.replace(old, new, 1)


# UI contract
p = Path('src/ui-contract/index.ts')
s = p.read_text()
s = replace_once(
    s,
    """export interface CherryPoint {
  readonly x: number;
  readonly y: number;
}

export type CherryBoardDropTarget =""",
    """export interface CherryPoint {
  readonly x: number;
  readonly y: number;
}

export interface CherryRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TextAnnotationModel {
  readonly id: string;
  readonly kind: 'text';
  readonly rect: CherryRect;
  readonly text: string;
  readonly styleToken: string;
}

export interface StrokeAnnotationModel {
  readonly id: string;
  readonly kind: 'stroke';
  readonly points: readonly CherryPoint[];
  readonly widthToken: string;
  readonly styleToken: string;
}

export type AnnotationModel = TextAnnotationModel | StrokeAnnotationModel;

export type CherryBoardDropTarget =""",
    'annotation read models',
)
s = replace_once(
    s,
    """  readonly tasks: readonly TaskCardModel[];
  readonly connections: readonly FlowConnectionModel[];""",
    """  readonly tasks: readonly TaskCardModel[];
  readonly annotations: readonly AnnotationModel[];
  readonly connections: readonly FlowConnectionModel[];""",
    'workspace annotations',
)
s = replace_once(
    s,
    """export interface ConnectTasksIntent {
  readonly fromTaskId: string;
  readonly toTaskId: string;
  readonly kind: CherryFlowKind;
}

export interface CherryUIIntents {""",
    """export interface ConnectTasksIntent {
  readonly fromTaskId: string;
  readonly toTaskId: string;
  readonly kind: CherryFlowKind;
}

export interface CreateTextAnnotationIntent {
  readonly rect: CherryRect;
  readonly text: string;
  readonly styleToken: string;
}

export interface CreateStrokeAnnotationIntent {
  readonly points: readonly CherryPoint[];
  readonly widthToken: string;
  readonly styleToken: string;
}

export interface UpdateTextAnnotationIntent {
  readonly annotationId: string;
  readonly rect?: CherryRect;
  readonly text?: string;
  readonly styleToken?: string;
}

export interface UpdateStrokeAnnotationIntent {
  readonly annotationId: string;
  readonly points?: readonly CherryPoint[];
  readonly widthToken?: string;
  readonly styleToken?: string;
}

export interface CherryUIIntents {""",
    'annotation intent types',
)
s = replace_once(
    s,
    """  readonly flow: {
    connect(input: ConnectTasksIntent): Promise<UIActionResult>;
    disconnect(edgeId: string): Promise<UIActionResult>;
    reorder(orderedTaskIds: readonly string[]): Promise<UIActionResult>;
  };
  readonly history:""",
    """  readonly flow: {
    connect(input: ConnectTasksIntent): Promise<UIActionResult>;
    disconnect(edgeId: string): Promise<UIActionResult>;
    reorder(orderedTaskIds: readonly string[]): Promise<UIActionResult>;
  };
  readonly annotation: {
    createText(input: CreateTextAnnotationIntent): Promise<UIActionResult>;
    createStroke(input: CreateStrokeAnnotationIntent): Promise<UIActionResult>;
    updateText(input: UpdateTextAnnotationIntent): Promise<UIActionResult>;
    updateStroke(input: UpdateStrokeAnnotationIntent): Promise<UIActionResult>;
    delete(annotationId: string): Promise<UIActionResult>;
  };
  readonly history:""",
    'annotation intents',
)
s = replace_once(
    s,
    """  readonly taskEditing: boolean;
  readonly structuralConnections: boolean;
}""",
    """  readonly taskEditing: boolean;
  readonly structuralConnections: boolean;
  readonly annotations: boolean;
}""",
    'annotation capability',
)
s = replace_once(
    s,
    """  'flow-reference',
  'action-danger',""",
    """  'flow-reference',
  'annotation-text',
  'annotation-stroke',
  'annotation-drawing',
  'action-danger',""",
    'annotation semantic states',
)
s = replace_once(
    s,
    """  | 'mobile.connectionHint'
  | 'task.create'""",
    """  | 'mobile.connectionHint'
  | 'annotation.freehand'
  | 'annotation.addText'
  | 'annotation.newText'
  | 'annotation.draw'
  | 'annotation.stopDrawing'
  | 'annotation.manage'
  | 'annotation.text'
  | 'annotation.stroke'
  | 'annotation.style'
  | 'annotation.width'
  | 'annotation.delete'
  | 'task.create'""",
    'annotation message keys',
)
p.write_text(s)

# i18n
p = Path('src/ui-contract/i18n.ts')
s = p.read_text()
s = replace_once(
    s,
    """    'mobile.connectionHint': '接続先のタスクを選んでください',
    'task.create':""",
    """    'mobile.connectionHint': '接続先のタスクを選んでください',
    'annotation.freehand': 'フリーハンド配置',
    'annotation.addText': 'テキストを追加',
    'annotation.newText': 'メモ',
    'annotation.draw': '描く',
    'annotation.stopDrawing': '描画を終了',
    'annotation.manage': '注釈を管理',
    'annotation.text': 'テキスト注釈',
    'annotation.stroke': '手書き線',
    'annotation.style': 'スタイル',
    'annotation.width': '線の太さ',
    'annotation.delete': '注釈を削除',
    'task.create':""",
    'ja annotation strings',
)
s = replace_once(
    s,
    """    'mobile.connectionHint': 'Choose a task to connect to',
    'task.create':""",
    """    'mobile.connectionHint': 'Choose a task to connect to',
    'annotation.freehand': 'Freehand layout',
    'annotation.addText': 'Add text',
    'annotation.newText': 'Note',
    'annotation.draw': 'Draw',
    'annotation.stopDrawing': 'Stop drawing',
    'annotation.manage': 'Manage annotations',
    'annotation.text': 'Text annotation',
    'annotation.stroke': 'Stroke',
    'annotation.style': 'Style',
    'annotation.width': 'Stroke width',
    'annotation.delete': 'Delete annotation',
    'task.create':""",
    'en annotation strings',
)
p.write_text(s)

# Runtime
p = Path('src/composition/cherry-ui-runtime.ts')
s = p.read_text()
s = replace_once(
    s,
    "import {\n  buildBoardFlowConnectorGeometry,",
    """import { annotationBounds } from '../modules/annotation/index';
import {
  buildBoardFlowConnectorGeometry,""",
    'runtime annotation import',
)
s = replace_once(
    s,
    """  parseFlowEdgeId,
  parseTabId,""",
    """  parseAnnotationId,
  parseFlowEdgeId,
  parseTabId,""",
    'runtime annotation id parser',
)
s = replace_once(
    s,
    """    error.code === 'tab-not-found' ||
    error.code === 'task-not-found' ||
    error.code === 'edge-not-found' ||""",
    """    error.code === 'tab-not-found' ||
    error.code === 'task-not-found' ||
    error.code === 'annotation-not-found' ||
    error.code === 'edge-not-found' ||""",
    'runtime annotation not found',
)
s = replace_once(
    s,
    """  if (error.code === 'task-id-in-use' || error.code === 'edge-id-in-use') {""",
    """  if (
    error.code === 'task-id-in-use' ||
    error.code === 'annotation-id-in-use' ||
    error.code === 'edge-id-in-use'
  ) {""",
    'runtime annotation conflict',
)
s = replace_once(
    s,
    """    taskEditing: true,
    structuralConnections: true,
  } as const;""",
    """    taskEditing: true,
    structuralConnections: true,
    annotations: true,
  } as const;""",
    'runtime annotation capability',
)
s = replace_once(
    s,
    """      flow: {
        connect: (input) => this.#connect(input.fromTaskId, input.toTaskId, input.kind),
        disconnect: (edgeId) => this.#disconnect(edgeId),
        reorder: (orderedTaskIds) => this.#reorder(orderedTaskIds),
      },
      history:""",
    """      flow: {
        connect: (input) => this.#connect(input.fromTaskId, input.toTaskId, input.kind),
        disconnect: (edgeId) => this.#disconnect(edgeId),
        reorder: (orderedTaskIds) => this.#reorder(orderedTaskIds),
      },
      annotation: {
        createText: (input) =>
          this.#runMutation((store, tabId) =>
            store.createTextAnnotation(tabId, {
              id: unwrapId(parseAnnotationId(randomId('annotation'))),
              rect: input.rect,
              text: input.text,
              styleToken: input.styleToken,
            }),
          ),
        createStroke: (input) =>
          this.#runMutation((store, tabId) =>
            store.createStrokeAnnotation(tabId, {
              id: unwrapId(parseAnnotationId(randomId('annotation'))),
              points: input.points,
              widthToken: input.widthToken,
              styleToken: input.styleToken,
            }),
          ),
        updateText: (input) =>
          this.#withAnnotationId(input.annotationId, (annotationId) =>
            this.#runMutation((store, tabId) =>
              store.updateAnnotation(tabId, annotationId, {
                ...(input.rect === undefined ? {} : { rect: input.rect }),
                ...(input.text === undefined ? {} : { text: input.text }),
                ...(input.styleToken === undefined ? {} : { styleToken: input.styleToken }),
              }),
            ),
          ),
        updateStroke: (input) =>
          this.#withAnnotationId(input.annotationId, (annotationId) =>
            this.#runMutation((store, tabId) =>
              store.updateAnnotation(tabId, annotationId, {
                ...(input.points === undefined ? {} : { points: input.points }),
                ...(input.widthToken === undefined ? {} : { widthToken: input.widthToken }),
                ...(input.styleToken === undefined ? {} : { styleToken: input.styleToken }),
              }),
            ),
          ),
        delete: (annotationId) =>
          this.#withAnnotationId(annotationId, (parsed) =>
            this.#runMutation((store, tabId) => store.deleteAnnotation(tabId, parsed)),
          ),
      },
      history:""",
    'runtime annotation intents',
)
s = replace_once(
    s,
    """  async #withTaskId(
    rawId: string,
    action: (taskId: TaskId) => Promise<UIActionResult>,
  ): Promise<UIActionResult> {
    const parsed = parseTaskId(rawId);
    if (!parsed.ok) return this.#error('validation', 'error.validation');
    return action(parsed.value);
  }

  async #runMutation(""",
    """  async #withTaskId(
    rawId: string,
    action: (taskId: TaskId) => Promise<UIActionResult>,
  ): Promise<UIActionResult> {
    const parsed = parseTaskId(rawId);
    if (!parsed.ok) return this.#error('validation', 'error.validation');
    return action(parsed.value);
  }

  async #withAnnotationId(
    rawId: string,
    action: (annotationId: ReturnType<typeof parseAnnotationId> extends { readonly ok: true; readonly value: infer T } ? T : never) => Promise<UIActionResult>,
  ): Promise<UIActionResult> {
    const parsed = parseAnnotationId(rawId);
    if (!parsed.ok) return this.#error('validation', 'error.validation');
    return action(parsed.value);
  }

  async #runMutation(""",
    'runtime annotation id helper',
)
# Replace awkward inferred annotation type with explicit imported type after formatting patch below.
s = replace_once(
    s,
    """  type TabId,
  type TaskId,
} from '../shared/ids/index';""",
    """  type AnnotationId,
  type TabId,
  type TaskId,
} from '../shared/ids/index';""",
    'runtime annotation id type import',
)
s = s.replace(
    "action: (annotationId: ReturnType<typeof parseAnnotationId> extends { readonly ok: true; readonly value: infer T } ? T : never) => Promise<UIActionResult>,",
    "action: (annotationId: AnnotationId) => Promise<UIActionResult>,",
    1,
)
s = replace_once(
    s,
    """    const model: WorkspaceScreenModel = {
      workspaceId: workspace.id,""",
    """    const annotationExtents = Object.values(tab.annotations).map((annotation) => {
      if (annotation.kind === 'text') {
        return {
          x: annotation.rect.x + annotation.rect.width,
          y: annotation.rect.y + annotation.rect.height,
        };
      }
      const bounds = annotationBounds(annotation.points);
      return { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
    });
    const annotationWidth = Math.max(0, ...annotationExtents.map((extent) => extent.x)) + 80;
    const annotationHeight = Math.max(0, ...annotationExtents.map((extent) => extent.y)) + 80;

    const model: WorkspaceScreenModel = {
      workspaceId: workspace.id,""",
    'runtime annotation extents',
)
s = replace_once(
    s,
    """        width: layout.width,
        height: layout.height,
      },
      tasks:""",
    """        width: Math.max(layout.width, annotationWidth),
        height: Math.max(layout.height, annotationHeight),
      },
      tasks:""",
    'runtime annotation board extent',
)
s = replace_once(
    s,
    """      linearFlowOrder: deriveLinearFlowOrder(""",
    """      annotations: Object.values(tab.annotations).map((annotation) =>
        annotation.kind === 'text'
          ? {
              id: annotation.id,
              kind: 'text' as const,
              rect: annotation.rect,
              text: annotation.text,
              styleToken: annotation.styleToken,
            }
          : {
              id: annotation.id,
              kind: 'stroke' as const,
              points: annotation.points,
              widthToken: annotation.widthToken,
              styleToken: annotation.styleToken,
            },
      ),
      linearFlowOrder: deriveLinearFlowOrder(""",
    'runtime annotation read models',
)
p.write_text(s)
