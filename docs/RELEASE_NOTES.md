# Cherry v0.1.0 Release Notes

Cherry v0.1.0 is the first public prototype release.

Cherry is an open-source task-flow todo app that lets you organize work as connected task blocks instead of only a flat list. The focus of this release is to make the core idea usable and understandable: build the flow first, then decide what to do today.

## Highlights

- Task blocks can be connected as parent-child flows.
- Root tasks work as project-like headings.
- Child tasks can continue the same branch or split into separate branches.
- Date lanes help place tasks on a schedule without making dates the only structure.
- The execution list groups unscheduled, due, and upcoming tasks under their root tasks.
- Mobile layout support includes vertical board orientation and a Flow Map/minimap for orientation.
- First-run welcome and tutorial screens explain the Cherry concept and basic operations.
- Japanese and English UI language support has been added.
- Multiple workspace tabs can be managed from the Start page.
- Workspaces can be exported and imported as encrypted `.cherry` files.

## Encrypted Cherry file format

Cherry v0.1.0 introduces a workspace export format for sharing or backing up all tabs in one file.

The `.cherry` file is an encrypted JSON envelope:

- Format: `cherry-workspace-encrypted`
- Encryption: AES-GCM
- Key derivation: PBKDF2 with SHA-256
- Salt and IV: generated randomly per export
- Scope: one file contains the whole workspace, including all tabs

The passphrase is required to import the file again. If the passphrase is lost, the file cannot be recovered.

## Known limitations

Cherry is still an early prototype. The following areas are intentionally not finished in this release:

- The schedule model is still being migrated from older date-string based data.
- Some implementation files still act as compatibility or fix layers.
- Same-day layout is still basic.
- Mobile touch interactions are usable, but not yet fully polished.
- The desktop creation/editing modal has not yet been replaced by an inline editor.
- Data is stored locally in the browser unless explicitly exported.

## Recommended test before release

Before tagging v0.1.0, run the manual checklist in `docs/MANUAL_TEST_CHECKLIST.md`, especially:

- core task creation and editing
- branch creation
- drag-and-drop date changes
- list view behavior
- mobile viewport behavior
- localStorage compatibility
- encrypted export/import

## Upgrade notes

Existing local task data should continue to load from the legacy localStorage keys. Cherry v0.1.0 also creates a workspace wrapper for the new tab system, but keeps the old storage key available for compatibility.

## Release stance

This release is not the final product. It is a public prototype intended to show Cherry's direction and gather feedback on the task-flow concept, mobile usability, list view, workspace model, and release documentation.
