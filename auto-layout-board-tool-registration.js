(() => {
  const tools = window.CherryCore?.extensions?.boardTools;
  if (!tools || tools.has("board.auto-layout")) return;

  tools.register("board.auto-layout", Object.freeze({
    id: "board.auto-layout",
    run() {
      document.getElementById("treeLayoutBtn")?.click();
    }
  }));
})();
