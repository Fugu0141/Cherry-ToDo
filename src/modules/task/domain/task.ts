import {
  noSchedule,
  validateSchedule,
  type Schedule,
  type ScheduleValidationError,
} from '../../schedule/index';
import type { TaskId } from '../../../shared/ids/index';
import {
  validateRevisionMeta,
  type RevisionMeta,
  type RevisionMetaError,
} from '../../../shared/revision/index';
import { err, ok, type Result } from '../../../shared/result/index';

export type TaskStatus = 'todo' | 'done';
export type TaskImportance = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export interface TaskAppearance {
  readonly importance: TaskImportance;
}

export interface Task {
  readonly id: TaskId;
  readonly title: string;
  readonly notes: string;
  readonly status: TaskStatus;
  readonly schedule: Schedule;
  readonly appearance: TaskAppearance;
  readonly meta: RevisionMeta;
}

export type TaskValidationError =
  | { readonly code: 'invalid-task-title'; readonly value: string }
  | { readonly code: 'invalid-task-notes'; readonly value: string }
  | { readonly code: 'invalid-task-status'; readonly value: string }
  | { readonly code: 'invalid-task-importance'; readonly value: string }
  | {
      readonly code: 'invalid-task-schedule';
      readonly cause: ScheduleValidationError;
    }
  | {
      readonly code: 'invalid-task-revision';
      readonly causes: readonly RevisionMetaError[];
    };

export interface CreateTaskInput {
  readonly id: TaskId;
  readonly title: string;
  readonly notes?: string;
  readonly status?: TaskStatus;
  readonly schedule?: Schedule;
  readonly importance?: TaskImportance;
  readonly meta: RevisionMeta;
}

const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'done'];
const TASK_IMPORTANCE_VALUES: readonly TaskImportance[] = [
  'none',
  'low',
  'medium',
  'high',
  'urgent',
];

export function createTask(input: CreateTaskInput): Result<Task, TaskValidationError> {
  const task: Task = {
    id: input.id,
    title: input.title,
    notes: input.notes ?? '',
    status: input.status ?? 'todo',
    schedule: input.schedule ?? noSchedule(),
    appearance: { importance: input.importance ?? 'none' },
    meta: input.meta,
  };

  return validateTask(task);
}

export function validateTask(task: Task): Result<Task, TaskValidationError> {
  if (typeof task.title !== 'string') {
    return err({ code: 'invalid-task-title', value: String(task.title) });
  }

  if (typeof task.notes !== 'string') {
    return err({ code: 'invalid-task-notes', value: String(task.notes) });
  }

  if (!TASK_STATUSES.includes(task.status)) {
    return err({ code: 'invalid-task-status', value: String(task.status) });
  }

  if (!TASK_IMPORTANCE_VALUES.includes(task.appearance.importance)) {
    return err({
      code: 'invalid-task-importance',
      value: String(task.appearance.importance),
    });
  }

  const schedule = validateSchedule(task.schedule);
  if (!schedule.ok) {
    return err({ code: 'invalid-task-schedule', cause: schedule.error });
  }

  const revision = validateRevisionMeta(task.meta);
  if (!revision.ok) {
    return err({ code: 'invalid-task-revision', causes: revision.error });
  }

  return ok(task);
}
