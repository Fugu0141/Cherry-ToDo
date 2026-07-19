import { dateOnly } from "../core/date-only.js";
import { scheduleModel } from "../core/schedule.js";
import { workspaceModel } from "../core/workspace.js";
import { storeCore } from "../core/store.js";
import { commandCore } from "../core/commands.js";
import { eventCore } from "../core/events.js";
import { storageCore } from "../core/storage.js";
import { registryCore } from "../core/registries.js";

const existingCore = window.CherryCore && typeof window.CherryCore === "object"
  ? window.CherryCore
  : {};

const extensions = existingCore.extensions || registryCore.createExtensionRegistries();
const runtime = existingCore.runtime || Object.freeze({
  events: eventCore.createEventBus()
});

window.CherryCore = Object.freeze({
  ...existingCore,
  dateOnly,
  schedule: scheduleModel,
  workspace: workspaceModel,
  store: storeCore,
  commands: commandCore,
  events: eventCore,
  storage: storageCore,
  registries: registryCore,
  extensions,
  runtime
});

window.dispatchEvent(new CustomEvent("cherry-core-ready", {
  detail: {
    modules: ["dateOnly", "schedule", "workspace", "store", "commands", "events", "storage", "registries", "extensions", "runtime"]
  }
}));
