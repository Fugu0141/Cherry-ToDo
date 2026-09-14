import type { AnnotationId } from '../../../shared/ids/index';
import {
  validateRevisionMeta,
  type RevisionMeta,
  type RevisionMetaError,
} from '../../../shared/revision/index';
import { err, ok, type Result } from '../../../shared/result/index';
import type { Point } from '../../board/index';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TextAnnotation {
  readonly id: AnnotationId;
  readonly kind: 'text';
  readonly rect: Rect;
  readonly text: string;
  readonly styleToken: string;
  readonly meta: RevisionMeta;
}

export interface StrokeAnnotation {
  readonly id: AnnotationId;
  readonly kind: 'stroke';
  readonly points: readonly Point[];
  readonly widthToken: string;
  readonly styleToken: string;
  readonly meta: RevisionMeta;
}

export type Annotation = TextAnnotation | StrokeAnnotation;

export type AnnotationValidationError =
  | { readonly code: 'invalid-annotation-geometry' }
  | { readonly code: 'invalid-annotation-style-token' }
  | {
      readonly code: 'invalid-annotation-revision';
      readonly causes: readonly RevisionMetaError[];
    };

function validPoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

export function validateAnnotation(
  annotation: Annotation,
): Result<Annotation, AnnotationValidationError> {
  const meta = validateRevisionMeta(annotation.meta);
  if (!meta.ok) {
    return err({ code: 'invalid-annotation-revision', causes: meta.error });
  }

  if (annotation.styleToken.trim().length === 0) {
    return err({ code: 'invalid-annotation-style-token' });
  }

  if (annotation.kind === 'text') {
    const { rect } = annotation;
    const validRect =
      Number.isFinite(rect.x) &&
      Number.isFinite(rect.y) &&
      Number.isFinite(rect.width) &&
      Number.isFinite(rect.height) &&
      rect.width >= 0 &&
      rect.height >= 0;

    return validRect ? ok(annotation) : err({ code: 'invalid-annotation-geometry' });
  }

  if (annotation.widthToken.trim().length === 0) {
    return err({ code: 'invalid-annotation-style-token' });
  }

  if (annotation.points.some((point) => !validPoint(point))) {
    return err({ code: 'invalid-annotation-geometry' });
  }

  return ok(annotation);
}
