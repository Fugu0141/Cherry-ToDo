import { dateOnly } from "../core/date-only.js";
import { workspaceModel } from "../core/workspace.js";
import { storeCore } from "../core/store.js";
import { commandCore } from "../core/commands.js";
import { eventCore } from "../core/events.js";
import { storageCore } from "../core/storage.js";
import { registryCore } from "../core/registries.js";

const existingCore = window.CherryCore && typeof window.CherryCore === "object"
  ? window.CherryCore
  : {};

window.CherryCore = Object.freeze({
  ...existingCore,
  dateOnly,
  workspace: workspaceModel,
  store: storeCore,
  commands: commandCore,
  events: eventCore,
  storage: storageCore,
  registries: registryCore
});

window.dispatchEvent(new CustomEvent("cherry-core-ready", {
  detail: {
    modules: ["dateOnly", "workspace", "store", "commands", "events", "storage", "registries"]
  }
}));