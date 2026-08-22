import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../release-prep-ui.js", import.meta.url),
  "utf8"
);

test("release edit modal restores the effective Core schedule date after legacy UI wrappers", () => {
  const start = source.indexOf("openEditTaskModal = function localizedEditTaskModal");
  const end = source.indexOf("function patchResetConfirm", start);
  const editWrapper = source.slice(start, end);

  assert.notEqual(start, -1);
  assert.match(editWrapper, /CherryScheduleBridge\?\.getTaskDate/);
  assert.match(editWrapper, /taskDateInput\.value = getTaskDate\(task\) \|\| ""/);
  assert.doesNotMatch(editWrapper, /normalizeDate\(task\.targetAt\)/);
});
