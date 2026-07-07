(() => {
  function t(key, fallback, values = {}) {
    const template = window.CherryI18n?.t(key, values) || fallback || key;
    return String(template).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
  }

  let layer = null;
  let activeResolve = null;

  function ensureLayer() {
    if (layer) return layer;
    layer = document.createElement("div");
    layer.id = "cherryDialogLayer";
    layer.className = "cherryDialogLayer hidden";
    document.body.appendChild(layer);
    layer.addEventListener("click", event => {
      if (event.target === layer) close(null);
    });
    document.addEventListener("keydown", event => {
      if (!layer || layer.classList.contains("hidden")) return;
      if (event.key === "Escape") close(null);
    });
    return layer;
  }

  function close(value) {
    if (!layer || layer.classList.contains("hidden")) return;
    layer.classList.add("hidden");
    layer.innerHTML = "";
    const resolve = activeResolve;
    activeResolve = null;
    resolve?.(value);
  }

  function openDialog({ kicker = "Cherry", title, message = "", danger = false, fields = [], choices = [], confirmText, cancelText, initialChoice = null }) {
    ensureLayer();

    return new Promise(resolve => {
      activeResolve = resolve;
      layer.innerHTML = `
        <section class="cherryDialog" role="dialog" aria-modal="true">
          <div class="cherryDialogHeader">
            <p class="cherryDialogKicker"></p>
            <h2 class="cherryDialogTitle"></h2>
          </div>
          <div class="cherryDialogBody">
            <p class="cherryDialogMessage"></p>
            <div class="cherryDialogFields"></div>
            <div class="cherryDialogChoices"></div>
          </div>
          <div class="cherryDialogActions">
            <button type="button" class="cherryDialogCancel"></button>
            <button type="button" class="${danger ? "cherryDialogDanger" : "cherryDialogConfirm"}"></button>
          </div>
        </section>
      `;

      layer.querySelector(".cherryDialogKicker").textContent = kicker;
      layer.querySelector(".cherryDialogTitle").textContent = title;
      layer.querySelector(".cherryDialogMessage").textContent = message;
      layer.querySelector(".cherryDialogCancel").textContent = cancelText || t("dialog.cancel", "Cancel");
      layer.querySelector(".cherryDialogConfirm, .cherryDialogDanger").textContent = confirmText || t("dialog.ok", "OK");

      const fieldsEl = layer.querySelector(".cherryDialogFields");
      fields.forEach(field => {
        const input = document.createElement(field.type === "select" ? "select" : "input");
        input.className = field.type === "select" ? "cherryDialogSelect" : "cherryDialogField";
        input.name = field.name;
        if (field.type && field.type !== "select") input.type = field.type;
        if (field.placeholder) input.placeholder = field.placeholder;
        if (field.value) input.value = field.value;
        if (field.type === "select") {
          (field.options || []).forEach(option => {
            const optionEl = document.createElement("option");
            optionEl.value = option.value;
            optionEl.textContent = option.label;
            input.appendChild(optionEl);
          });
          if (field.value) input.value = field.value;
        }
        fieldsEl.appendChild(input);
      });

      let selectedChoice = initialChoice ?? choices[0]?.value ?? null;
      const choicesEl = layer.querySelector(".cherryDialogChoices");
      choices.forEach(choice => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `cherryDialogChoice ${choice.value === selectedChoice ? "active" : ""}`;
        button.dataset.choice = choice.value;
        button.innerHTML = `<span>${choice.label}</span>${choice.meta ? `<small>${choice.meta}</small>` : ""}`;
        button.addEventListener("click", () => {
          selectedChoice = choice.value;
          choicesEl.querySelectorAll(".cherryDialogChoice").forEach(el => el.classList.toggle("active", el.dataset.choice === selectedChoice));
        });
        choicesEl.appendChild(button);
      });

      layer.querySelector(".cherryDialogCancel").addEventListener("click", () => close(null));
      layer.querySelector(".cherryDialogConfirm, .cherryDialogDanger").addEventListener("click", () => {
        const values = {};
        layer.querySelectorAll(".cherryDialogField, .cherryDialogSelect").forEach(input => {
          values[input.name] = input.value;
        });
        close(choices.length ? { choice: selectedChoice, values } : values);
      });

      layer.classList.remove("hidden");
      requestAnimationFrame(() => {
        const firstField = layer.querySelector(".cherryDialogField, .cherryDialogSelect");
        firstField?.focus?.({ preventScroll: true });
      });
    });
  }

  async function confirmDialog(options) {
    const result = await openDialog(options);
    return result !== null;
  }

  async function promptDialog(options) {
    const result = await openDialog({
      ...options,
      fields: [{ name: "value", type: options.type || "text", placeholder: options.placeholder || "", value: options.value || "" }]
    });
    return result?.value ?? null;
  }

  async function passphraseDialog({ title, message, confirm = false }) {
    const fields = [{ name: "passphrase", type: "password" }];
    if (confirm) fields.push({ name: "confirm", type: "password" });
    const result = await openDialog({ title, message, fields, confirmText: t("dialog.ok", "OK") });
    if (!result) return null;
    if (confirm && result.passphrase !== result.confirm) return { error: "mismatch" };
    return result.passphrase || null;
  }

  window.cherryDialog = {
    open: openDialog,
    confirm: confirmDialog,
    prompt: promptDialog,
    passphrase: passphraseDialog,
    close
  };
})();
