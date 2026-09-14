import { describe, expect, it } from 'vitest';

import { createTask, validateTask, type Task } from '../../src/modules/task/index';
import { parseTaskId } from '../../src/shared/ids/index';
import { revisionMeta } from './fixtures';

function taskId(value: string) {
  const result = parseTaskId(value);
  if (!result.ok) throw new Error(`Invalid test Task id: ${value}`);
  return result.value;
}

describe('Task', () => {
  it('creates semantic task data without Board placement fields', () => {
    const result = createTask({
      id: taskId('task-01'),
      title: 'Plan release',
      meta: revisionMeta,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('todo');
      expect(result.value.schedule).toEqual({ kind: 'none' });
      expect(result.value.appearance.importance).toBe('none');
      expect(result.value).not.toHaveProperty('x');
      expect(result.value).not.toHaveProperty('y');
      expect(result.value).not.toHaveProperty('position');
    }
  });

  it('rejects invalid status values at the Domain validation boundary', () => {
    const invalid = {
      id: taskId('task-invalid-status'),
      title: 'Imported task',
      notes: '',
      status: 'finished',
      schedule: { kind: 'none' },
      appearance: { importance: 'none' },
      meta: revisionMeta,
    } as unknown as Task;

    const result = validateTask(invalid);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid-task-status');
    }
  });
});
