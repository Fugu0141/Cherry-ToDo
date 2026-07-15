import { dateOnly } from "../core/date-only.js";

const existingCore = window.CherryCore && typeof window.CherryCore === "object"
  ? window.CherryCore
  : {};

window.CherryCore = Object.freeze({
  ...existingCore,
  dateOnly
});

window.dispatchEvent(new CustomEvent("cherry-core-ready", {
  detail: {
    modules: ["dateOnly"]
  }
}));
