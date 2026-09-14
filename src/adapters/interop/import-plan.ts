import {
  validateWorkspaceDocument,
  type TabDocument,
  type WorkspaceDocument,
  type WorkspaceRepository,
  type WorkspaceSaveResult,
} from '../../modules/workspace/index';
import { parseTabId, type TabId } from '../../shared/ids/index';
import { err, ok, type Result } from '../../shared/result/index';

export interface ExternalImportSummary {
  readonly taskCount: number;
  readonly connectionCount: number;
  readonly skippedCount: number;
  readonly warnings: readonly string[];
}

export interface ExternalTabImport {
  readonly tab: TabDocument;
  readonly summary: ExternalImportSummary;
}

export interface PreparedExternalImport {
  readonly destination: 'new-tab';
  readonly workspace: WorkspaceDocument;
  readonly importedTabId: TabId;
  readonly summary: ExternalImportSummary;
}

export type ExternalImportPlanError =
  | { readonly code: 'invalid-import-tab'; readonly message: string }
  | { readonly code: 'invalid-workspace-candidate'; readonly message: string };

export type ExternalImportCommitResult =
  | { readonly kind: 'saved'; readonly workspace: WorkspaceDocument }
  | { readonly kind: 'save-failed'; readonly result: WorkspaceSaveResult };

function uniqueTabId(workspace: WorkspaceDocument, preferred: TabId): TabId {
  if (workspace.tabs[preferred] === undefined) return preferred;
  for (let suffix = 2; suffix < 10000; suffix += 1) {
    const candidate = parseTabId(`${preferred}-${suffix}`);
    if (candidate.ok && workspace.tabs[candidate.value] === undefined) return candidate.value;
  }
  throw new Error('Unable to allocate a unique imported Tab ID.');
}

export function prepareExternalImportAsNewTab(
  current: WorkspaceDocument,
  imported: ExternalTabImport,
  updatedAt: string = new Date().toISOString(),
): Result<PreparedExternalImport, ExternalImportPlanError> {
  const importedValidation = validateWorkspaceDocument({
    schemaVersion: current.schemaVersion,
    id: current.id,
    name: current.name,
    tabs: { [imported.tab.id]: imported.tab },
    tabOrder: [imported.tab.id],
    meta: current.meta,
  });
  if (!importedValidation.ok) {
    return err({ code: 'invalid-import-tab', message: 'Imported tab is not valid Cherry V2 data.' });
  }

  const importedTabId = uniqueTabId(current, imported.tab.id);
  const tab =
    importedTabId === imported.tab.id
      ? imported.tab
      : { ...imported.tab, id: importedTabId, meta: { ...imported.tab.meta, updatedAt } };
  const workspace: WorkspaceDocument = {
    ...current,
    tabs: { ...current.tabs, [importedTabId]: tab },
    tabOrder: [...current.tabOrder, importedTabId],
    meta: { ...current.meta, updatedAt, revision: current.meta.revision + 1 },
  };
  const validation = validateWorkspaceDocument(workspace);
  return validation.ok
    ? ok({
        destination: 'new-tab',
        workspace: validation.value,
        importedTabId,
        summary: imported.summary,
      })
    : err({
        code: 'invalid-workspace-candidate',
        message: 'External import could not be represented safely in the current workspace.',
      });
}

export async function commitPreparedExternalImport(
  repository: WorkspaceRepository,
  current: WorkspaceDocument,
  prepared: PreparedExternalImport,
): Promise<ExternalImportCommitResult> {
  const result = await repository.save(prepared.workspace, current.meta.revision);
  return result.kind === 'saved'
    ? { kind: 'saved', workspace: prepared.workspace }
    : { kind: 'save-failed', result };
}
