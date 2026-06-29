(async () => {
  const version = "20260628-08";

  try {
    const appSource = await fetch(`./app.js?v=${version}`, { cache: "no-store" }).then(response => response.text());
    const fixedSource = appSource.replace(/\}\n\s*function makeTask/, "}\n\nfunction makeTask");
    (0, eval)(fixedSource);

    const mobileScript = document.createElement("script");
    mobileScript.src = `./mobile.js?v=${version}`;
    document.body.appendChild(mobileScript);
  } catch (error) {
    console.error("Failed to boot Cherry-ToDo", error);
    alert("Cherry-ToDoの読み込みに失敗しました。ページを再読み込みしてください。");
  }
})();
