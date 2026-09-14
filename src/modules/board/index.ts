export {
  DEFAULT_BOARD_SETTINGS,
  createEmptyBoardDocumentState,
  validateBoardDocumentState,
  type BoardDocumentState,
  type BoardSettings,
  type BoardValidationError,
  type Point,
  type TimeGuideMode,
} from './domain/board';

export {
  layoutBoard,
  type BoardLaneKind,
  type BoardLaneLayout,
  type BoardLayoutEdgeInput,
  type BoardLayoutResult,
  type BoardLayoutTaskInput,
  type BoardTaskLayout,
} from './domain/layout';

export {
  buildBoardFlowConnectorGeometry,
  type BoardFlowConnectorGeometry,
} from './domain/flow-geometry';

export {
  resolveDropIntent,
  type BoardDropTarget,
  type BoardPlacementDropIntent,
  type DropIntent,
  type ResolveDropIntentInput,
} from './domain/drop';
