import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/features/mobile-action-bar/implementation.js", import.meta.url),
  "utf8"
);

test("mobile lane enable relayouts tasks before rendering", () => {
  const start = source.indexOf('toggleLanesBtn.addEventListener("click"');
  const end = source.indexOf("\n\n  board.addEventListener", start);

  assert.notEqual(start, -1, "mobile lane toggle listener must exist");
  assert.notEqual(end, -1, "mobile lane toggle listener boundary must remain stable");

  const listener = source.slice(start, end);
  assert.match(listener, /mobileActionQuery\.matches/);
  assert.match(listener, /state\.showLanes/);
  assert.match(listener, /branchLayout\(\)/);
  assert.match(listener, /requestRender\(\)/);
});
