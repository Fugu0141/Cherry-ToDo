(() => {
  const startup = window.CherryStartupState;
  if (startup?.route !== "workspace") return;

  const stage = document.querySelector(".stage");
  const startPage = document.getElementById("startPage");

  stage?.classList.remove("startPageMode");
  startPage?.classList.add("hidden");
  document.body.classList.remove("startPageFocusMode");
  document.documentElement.dataset.cherryWorkspacePhase = "restoring";
