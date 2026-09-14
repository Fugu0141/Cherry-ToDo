export {
  validateAnnotation,
  type Annotation,
  type AnnotationValidationError,
  type Rect,
  type StrokeAnnotation,
  type TextAnnotation,
} from './domain/annotation';

export {
  STROKE_ANNOTATION_STYLE_TOKENS,
  STROKE_WIDTH_TOKENS,
  TEXT_ANNOTATION_STYLE_TOKENS,
  annotationBounds,
  createStrokeAnnotation,
  createTextAnnotation,
  scalePoints,
  simplifyStrokePoints,
  translatePoints,
  type CreateStrokeAnnotationInput,
  type CreateTextAnnotationInput,
} from './application/annotation-operations';
