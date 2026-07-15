import { dateOnly } from "../core/date-only.js";
import { workspaceModel } from "../core/workspace.js";
import { storeCore } from "../core/store.js";
import { commandCore } from "../core/commands.js";

const existingCore = window.CherryCore && typeof window.CherryCore === "object"
  ? window.CherryCore
  : {};

window.CherryCore = Object.freeze({
  ...existingCore,
  dateOnly,
  workspace: workspaceModel,
  store: storeCore,
  commands: commandCore
});

window.dispatchEvent(new CustomEvent("cherry-core-ready", {
  detail: {
    modules: ["dateOnly", "workspace", "store", "commands"]
  }
}));
