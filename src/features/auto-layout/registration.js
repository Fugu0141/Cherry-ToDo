(() => {
  const tools = window.CherryCore?.extensions?.boardTools;
  const autoLayoutButton = document.getElementById("treeLayoutBtn");
  if (!tools || !autoLayoutButton || tools.has("board.auto-layout")) return;

  let runningFromRegistry = false;

  tools.register("board.auto-layout", Object.freeze({
    id: "board.auto-layout",
    run() {
      runningFromRegistry = true;
      try {
        autoLayoutButton.click();
      } finally {
        runningFromRegistry = false;
      }
    }
  }));

  document.addEventListener("click", event => {
    if (runningFromRegistry || !event.target.closest("#treeLayoutBtn")) return;

    const tool = tools.get("board.auto-layout");
    if (!tool?.run) return;

    event.preventDefault();
    event.stopPropagation();
    tool.run();
  }, true);
})();