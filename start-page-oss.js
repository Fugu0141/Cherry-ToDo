(() => {
  const repoUrl = "https://github.com/Fugu0141/Cherry-ToDo";
  const links = {
    github: repoUrl,
    contribute: `${repoUrl}/blob/main/CONTRIBUTING.md`,
    releases: `${repoUrl}/releases`,
    issues: `${repoUrl}/issues`
  };

  const copy = {
    ja: {
      kicker: "OPEN SOURCE",
      title: "CherryはOSSとして開発されています。",
      lead: "バグ報告、要望、コードの改善、ドキュメント整備など、どんな形のフィードバックでもCherryの成長につながります。GitHubから開発状況やリリース情報を確認できます。",
      github: "GitHub",
      contribute: "貢献する",
      issues: "要望・バグ報告",
      releases: "リリースノート",
      donation: "寄付は準備中",
      arrow: "↗"
    },
    en: {
      kicker: "OPEN SOURCE",
      title: "Cherry is developed as open source.",
      lead: "Bug reports, feature requests, code improvements, and documentation feedback all help Cherry grow. You can follow development and releases on GitHub.",
      github: "GitHub",
      contribute: "Contribute",
      issues: "Issues / Feedback",
      releases: "Release notes",
      donation: "Donation coming soon",
      arrow: "↗"
    }
  };

  let renderQueued = false;

  function language() {
    return window.CherryI18n?.getLanguage?.() === "en" ? "en" : "ja";
  }

  function c(key) {
    return copy[language()][key] || copy.ja[key] || key;
  }

  function setTextIfChanged(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
  }

  function setAttrIfChanged(element, name, value) {
    if (element && element.getAttribute(name) !== value) element.setAttribute(name, value);
  }

  function ensureSection() {
    const panel = document.querySelector("#startPage .startPagePanel");
    const body = document.querySelector("#startPage .startPageBody");
    if (!panel || !body) return null;

    let section = panel.querySelector(".startPageOss");
    if (section) return section;

    section = document.createElement("section");
    section.className = "startPageOss";
    section.innerHTML = `
      <div class="startPageOssText">
        <p class="startPageOssKicker"></p>
        <h3 class="startPageOssTitle"></h3>
        <p class="startPageOssLead"></p>
      </div>
      <div class="startPageOssLinks">
        <a class="startPageOssLink" data-oss-link="github" target="_blank" rel="noreferrer"><span></span><span></span></a>
        <a class="startPageOssLink" data-oss-link="contribute" target="_blank" rel="noreferrer"><span></span><span></span></a>
        <a class="startPageOssLink" data-oss-link="issues" target="_blank" rel="noreferrer"><span></span><span></span></a>
        <a class="startPageOssLink" data-oss-link="releases" target="_blank" rel="noreferrer"><span></span><span></span></a>
        <a class="startPageOssLink startPageOssDonation" data-oss-link="donation" href="#" aria-disabled="true"><span></span><span></span></a>
      </div>
    `;

    panel.insertBefore(section, body);
    section.querySelector("[data-oss-link='donation']").addEventListener("click", event => event.preventDefault());
    return section;
  }

  function render() {
    renderQueued = false;
    const section = ensureSection();
    if (!section) return;

    setTextIfChanged(section.querySelector(".startPageOssKicker"), c("kicker"));
    setTextIfChanged(section.querySelector(".startPageOssTitle"), c("title"));
    setTextIfChanged(section.querySelector(".startPageOssLead"), c("lead"));

    const setLink = (name, label, href = links[name]) => {
      const link = section.querySelector(`[data-oss-link='${name}']`);
      if (!link) return;
      if (href) setAttrIfChanged(link, "href", href);
      setTextIfChanged(link.querySelector("span:first-child"), label);
      setTextIfChanged(link.querySelector("span:last-child"), name === "donation" ? "…" : c("arrow"));
    };

    setLink("github", c("github"));
    setLink("contribute", c("contribute"));
    setLink("issues", c("issues"));
    setLink("releases", c("releases"));
    setLink("donation", c("donation"), "#");
  }

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(render);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", queueRender, { once: true });
  } else {
    queueRender();
  }

  window.CherryI18n?.onChange(queueRender);
  window.addEventListener("cherry-workspace-updated", queueRender);
  window.addEventListener("cherry-start-page-ready", queueRender);
})();
