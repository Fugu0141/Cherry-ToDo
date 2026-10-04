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

function removeScheduleKindFromVisibleUi(editor: HTMLElement): void {
  const controls = findScheduleEditorControls(editor);
  if (controls === null || controls.kind.dataset.scheduleKindInternal === 'true') return;

  // Keep the select as an internal compatibility control because the current submit
  // handler still reads it, but remove it completely from the visible/focusable UI.
  // Date/time inputs are now the user-facing source of truth.
  controls.kind.dataset.scheduleKindInternal = 'true';
  controls.kind.setAttribute('aria-hidden', 'true');
  controls.kind.tabIndex = -1;
  controls.kind.style.position = 'absolute';
  controls.kind.style.left = '-10000px';
  controls.kind.style.width = '1px';
  controls.kind.style.height = '1px';
  controls.kind.style.opacity = '0';
  controls.kind.style.pointerEvents = 'none';
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

function prepareEditors(root: HTMLElement): void {
  for (const editor of root.querySelectorAll<HTMLElement>('.cg-editor')) {
    removeScheduleKindFromVisibleUi(editor);
  }
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

  const observer = new MutationObserver(() => prepareEditors(root));

  root.addEventListener('input', onFieldInput);
  root.addEventListener('change', onFieldInput);
  root.addEventListener('change', onKindChange);
  observer.observe(root, { childList: true, subtree: true });
  prepareEditors(root);

  return () => {
    observer.disconnect();
    root.removeEventListener('input', onFieldInput);
    root.removeEventListener('change', onFieldInput);
    root.removeEventListener('change', onKindChange);
  };
}
