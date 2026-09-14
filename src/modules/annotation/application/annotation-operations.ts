import type { AnnotationId } from '../../../shared/ids/index';
import type { RevisionMeta } from '../../../shared/revision/index';
import { err, type Result } from '../../../shared/result/index';
import type { Point } from '../../board/index';
import {
  validateAnnotation,
  type AnnotationValidationError,
  type Rect,
  type StrokeAnnotation,
  type TextAnnotation,
} from '../domain/annotation';

export const TEXT_ANNOTATION_STYLE_TOKENS = ['note', 'accent', 'muted'] as const;
export const STROKE_ANNOTATION_STYLE_TOKENS = ['ink', 'accent', 'muted'] as const;
export const STROKE_WIDTH_TOKENS = ['thin', 'medium', 'thick'] as const;

export interface CreateTextAnnotationInput {
  readonly id: AnnotationId;
  readonly rect: Rect;
  readonly text: string;
  readonly styleToken: string;
  readonly meta: RevisionMeta;
}

export interface CreateStrokeAnnotationInput {
  readonly id: AnnotationId;
  readonly points: readonly Point[];
  readonly widthToken: string;
  readonly styleToken: string;
  readonly meta: RevisionMeta;
}

function distanceSquared(left: Point, right: Point): number {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return dx * dx + dy * dy;
}

export function simplifyStrokePoints(
  points: readonly Point[],
  minimumDistance = 2,
  maximumPoints = 512,
): readonly Point[] {
  if (points.length <= 2) return [...points];
  const threshold = Math.max(0, minimumDistance) ** 2;
  const simplified: Point[] = [points[0]!];

  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index]!;
    const previous = simplified[simplified.length - 1]!;
    if (distanceSquared(point, previous) >= threshold) simplified.push(point);
  }
  simplified.push(points[points.length - 1]!);

  if (simplified.length <= maximumPoints) return simplified;
  const stride = (simplified.length - 1) / (maximumPoints - 1);
  const bounded: Point[] = [];
  for (let index = 0; index < maximumPoints; index += 1) {
    bounded.push(simplified[Math.round(index * stride)]!);
  }
  bounded[0] = simplified[0]!;
  bounded[bounded.length - 1] = simplified[simplified.length - 1]!;
  return bounded;
}

export function createTextAnnotation(
  input: CreateTextAnnotationInput,
): Result<TextAnnotation, AnnotationValidationError> {
  return validateAnnotation({
    id: input.id,
    kind: 'text',
    rect: input.rect,
    text: input.text,
    styleToken: input.styleToken,
    meta: input.meta,
  }) as Result<TextAnnotation, AnnotationValidationError>;
}

export function createStrokeAnnotation(
  input: CreateStrokeAnnotationInput,
): Result<StrokeAnnotation, AnnotationValidationError> {
  const points = simplifyStrokePoints(input.points);
  if (points.length < 2) return err({ code: 'invalid-annotation-geometry' });
  return validateAnnotation({
    id: input.id,
    kind: 'stroke',
    points,
    widthToken: input.widthToken,
    styleToken: input.styleToken,
    meta: input.meta,
  }) as Result<StrokeAnnotation, AnnotationValidationError>;
}

export function translatePoints(
  points: readonly Point[],
  dx: number,
  dy: number,
): readonly Point[] {
  return points.map((point) => ({ x: point.x + dx, y: point.y + dy }));
}

export function scalePoints(
  points: readonly Point[],
  scaleX: number,
  scaleY: number,
): readonly Point[] {
  if (points.length === 0) return [];
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  return points.map((point) => ({
    x: minX + (point.x - minX) * scaleX,
    y: minY + (point.y - minY) * scaleY,
  }));
}

export function annotationBounds(points: readonly Point[]): Rect {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
