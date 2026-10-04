export type ScheduleEditorKind = 'none' | 'date' | 'datetime';

export function inferScheduleEditorKind(dateValue: string, timeValue: string): ScheduleEditorKind {
  if (dateValue.length === 0) return 'none';
  return timeValue.length === 0 ? 'date' : 'datetime';
}

interface ScheduleEditorControls {
  readonly kind: HTMLSelectElement;
  readonly date: HTMLInputElement;
  readonly time: HTMLInputElement;
}

function isScheduleKindSelect(select: HTMLSelectElement): boolean {
  const values = new Set(Array.from(select.options, (option) => option.value));
  return values.has('none') && values.has('date') && values.has('datetime');
}

function findScheduleEditorControls(editor: HTMLElement): ScheduleEditorControls | null {
  const date = editor.querySelector<HTMLInputElement>('input[type="date"]');
  const time = editor.querySelector<HTMLInputElement>('input[type="time"]');
  const kind = Array.from(editor.querySelectorAll<HTMLSelectElement>('select')).find(
    isScheduleKindSelect,
  );

  if (date === null || time === null || kind === undefined) return null;
  return { kind, date, time };
}

function syncKindFromFields(editor: HTMLElement): void {
  const controls = findScheduleEditorControls(editor);
  if (controls === null) return;

  if (controls.date.value.length === 0 && controls.time.value.length > 0) {
    controls.time.value = '';
  }

  controls.kind.value = inferScheduleEditorKind(controls.date.value, controls.time.value);
}

function syncFieldsFromKind(editor: HTMLElement): void {
  const controls = findScheduleEditorControls(editor);
  if (controls === null) return;

  if (controls.kind.value === 'none') {
    controls.date.value = '';
    controls.time.value = '';
    return;
  }

  if (controls.kind.value === 'date') controls.time.value = '';
}

export function installScheduleEditorInference(root: HTMLElement): () => void {
  const onFieldInput = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.type !== 'date' && target.type !== 'time') return;

    const editor = target.closest<HTMLElement>('.cg-editor');
    if (editor === null) return;
    syncKindFromFields(editor);
  };

  const onKindChange = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || !isScheduleKindSelect(target)) return;

    const editor = target.closest<HTMLElement>('.cg-editor');
    if (editor === null) return;
    syncFieldsFromKind(editor);
  };

  root.addEventListener('input', onFieldInput);
  root.addEventListener('change', onFieldInput);
  root.addEventListener('change', onKindChange);

  return () => {
    root.removeEventListener('input', onFieldInput);
    root.removeEventListener('change', onFieldInput);
    root.removeEventListener('change', onKindChange);
  };
}
