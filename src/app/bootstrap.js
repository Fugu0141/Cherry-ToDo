import { dateOnly } from "../core/date-only.js";
import { scheduleModel } from "../core/schedule.js";
import { icsModel } from "../core/ics.js";
import { workspaceModel } from "../core/workspace.js";
import { storeCore } from "../core/store.js";
import { commandCore } from "../core/commands.js";
import { eventCore } from "../core/events.js";
import { storageCore } from "../core/storage.js";
import { registryCore } from "../core/registries.js";
import { boardSettingsModel } from "../core/board-settings.js";

const existingCore = window.CherryCore && typeof window.CherryCore === "object"
  ? window.CherryCore
  : {};

const extensions = existingCore.extensions || registryCore.createExtensionRegistries();
const runtime = existingCore.runtime || Object.freeze({
  events: eventCore.createEventBus(),
  store: storeCore.createStore(workspaceModel.makeEmptyTabState()),
  workspaceStore: storeCore.createStore(workspaceModel.makeDefaultWorkspace()),
  commands: commandCore.createCommandDispatcher()
});

window.CherryCore = Object.freeze({
  ...existingCore,
  dateOnly,
  schedule: scheduleModel,
  ics: icsModel,
  workspace: workspaceModel,
  store: storeCore,
  commands: commandCore,
  events: eventCore,
  storage: storageCore,
  registries: registryCore,
  boardSettings: boardSettingsModel,
  extensions,
  runtime
});

window.dispatchEvent(new CustomEvent("cherry-core-ready", {
  detail: {
    modules: ["dateOnly", "schedule", "ics", "workspace", "store", "commands", "events", "storage", "registries", "boardSettings", "extensions", "runtime"]
  }
}));
