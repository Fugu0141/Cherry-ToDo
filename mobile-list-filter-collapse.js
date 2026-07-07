(() => {
  const labels = {
    ja: {
      title: "条件",
      fallback: "表示条件を変更",
      glue: "・"
    },
    en: {
      title: "Filters",
      fallback: "Change list filters",
      glue: " / "
    }
  };

  function lang() {
    return window.CherryI18n?.getLanguage?.() === "en" ? "en" : "ja";
  }

  function copy(key) {
    return labels[lang()][key] || labels.ja[key] || key;
  }

  function summaryFromControls(controls) {
    if (!controls) return copy("fallback");
    const values = [];
    controls.querySelectorAll(".listControlGroup").forEach(group => {
      const active = Array.from(group.querySelectorAll("button.active"))
        .map(button => button.textContent.trim())
        .filter(Boolean);
      if (active.length) values.push(active.join(copy("glue")));
    });
    return values.join(copy("glue")) || copy("fallback");
  }

  function ensureToggle(listView) {
    const controls = listView.querySelector(".listControls");
    const header = listView.querySelector(".listHeader");
    if (!controls || !header) return;

    let toggle = listView.querySelector(".mobileListFilterToggle");
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "mobileListFilterToggle";
      toggle.innerHTML = `
        <span class="mobileListFilterToggleMain">
          <span class="mobileListFilterToggleLabel"></span>
          <span class="mobileListFilterToggleSummary"></span>
        </span>
        <span class="mobileListFilterToggleIcon" aria-hidden="true">⌄</span>
      `;
      toggle.addEventListener("click", () => {
        const open = !listView.classList.contains("mobileFiltersOpen");
        listView.classList.toggle("mobileFiltersOpen", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      header.insertAdjacentElement("afterend", toggle);
    }

    toggle.querySelector(".mobileListFilterToggleLabel").textContent = copy("title");
    toggle.querySelector(".mobileListFilterToggleSummary").textContent = summaryFromControls(controls);
    toggle.setAttribute("aria-expanded", listView.classList.contains("mobileFiltersOpen") ? "true" : "false");
  }

  function refresh() {
    const listView = document.getElementById("listView");
    if (!listView) return;
    ensureToggle(listView);
  }

  function bindObserver() {
    const listView = document.getElementById("listView");
    if (!listView || listView.dataset.mobileFilterCollapseBound) return;
    listView.dataset.mobileFilterCollapseBound = "1";

    const observer = new MutationObserver(() => requestAnimationFrame(refresh));
    observer.observe(listView, { childList: true, subtree: true });

    listView.addEventListener("click", event => {
      if (event.target.closest(".listControls button")) {
        requestAnimationFrame(refresh);
      }
    });
  }

  function boot() {
    refresh();
    bindObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.addEventListener("cherry-workspace-updated", boot);
  window.CherryI18n?.onChange(boot);
})();
