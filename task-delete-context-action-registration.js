(() => {
  const contextActions = window.CherryCore?.extensions?.contextActions;
  const taskDelete = window.cherryTaskDeleteDialog;
  if (!contextActions || !taskDelete || contextActions.has("task.delete")) return;

  contextActions.register("task.delete", Object.freeze({
    id: "task.delete",
    async run(task) {
      if (!task?.id) return false;
      const confirmed = await taskDelete.confirmTaskDelete(task);
      if (!confirmed) return false;
      taskDelete.performDelete(task.id);
      return true;
    }
  }));
})();
