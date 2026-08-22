import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const tabManager = await readFile(new URL("../tab-manager.js", import.meta.url), "utf8");

test("native Cherry export still uses the encrypted workspace format", () => {
  assert.match(tabManager, /const fileFormat = "cherry-workspace-encrypted"/);
  assert.match(tabManager, /name: "PBKDF2"/);
  assert.match(tabManager, /name: "AES-GCM"/);
  assert.match(tabManager, /\.cherry`/);
});

test("workspace transfer guard does not introduce an unencrypted Cherry fallback", async () => {
  const registration = await readFile(new URL("../src/features/workspace-transfer/registration.js", import.meta.url), "utf8");
  assert.doesNotMatch(registration, /unencrypt|plaintext.*cherry|JSON\.stringify\(workspace\)/i);
});