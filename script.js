(() => {
  "use strict";

  const STORAGE_KEY = "orbita-goals-v1";
  const axes = [
    { id: "qualidade", name: "Qualidade de Vida", subtitle: "Bem-estar, saúde e equilíbrio", icon: "◉", color: "#bd4b78", tint: "rgb(232 171 194 / 24%)", border: "rgb(201 79 125 / 30%)" },
    { id: "pessoal", name: "Pessoal", subtitle: "Interesses, crescimento e identidade", icon: "✦", color: "#c75d87", tint: "rgb(239 190 207 / 28%)", border: "rgb(201 79 125 / 28%)" },
    { id: "profissional", name: "Profissional", subtitle: "Carreira, trabalho e propósito", icon: "⌘", color: "#a83b68", tint: "rgb(225 157 183 / 22%)", border: "rgb(178 61 106 / 28%)" },
    { id: "relacionamento", name: "Relacionamento", subtitle: "Conexões, afeto e presença", icon: "♡", color: "#cf7094", tint: "rgb(245 210 223 / 35%)", border: "rgb(207 112 148 / 30%)" }
  ];
  const horizons = [
    { id: "curto", name: "Curto Prazo", time: "até 3 meses" },
    { id: "medio", name: "Médio Prazo", time: "3 a 12 meses" },
    { id: "longo", name: "Longo Prazo", time: "mais de 1 ano" }
  ];
  const validAxes = new Set(axes.map(axis => axis.id));
  const validHorizons = new Set(horizons.map(horizon => horizon.id));
  const grid = document.getElementById("axis-grid");
  const modal = document.getElementById("goal-modal");
  const form = document.getElementById("goal-form");
  const nameInput = document.getElementById("goal-name");
  const errorMessage = document.getElementById("form-error");
  const toast = document.getElementById("toast");
  let goals = loadGoals();
  let toastTimer;
  let lastFocusedElement;

  function loadGoals() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) throw new Error("Os dados salvos não estão no formato esperado.");
      return parsed.filter(goal =>
        goal &&
        typeof goal.id === "string" &&
        typeof goal.name === "string" &&
        validAxes.has(goal.axis) &&
        validHorizons.has(goal.horizon) &&
        typeof goal.done === "boolean"
      );
    } catch (error) {
      console.error("Não foi possível carregar as metas salvas.", error);
      showToast("Não foi possível carregar as metas salvas.");
      return [];
    }
  }

  function saveGoals() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
      return true;
    } catch (error) {
      console.error("Não foi possível salvar as metas.", error);
      showToast("Não foi possível salvar. Verifique o espaço disponível no navegador.");
      return false;
    }
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function render() {
    grid.innerHTML = axes.map(axis => {
      const axisGoals = goals.filter(goal => goal.axis === axis.id);
      const done = axisGoals.filter(goal => goal.done).length;
      const progress = axisGoals.length ? Math.round((done / axisGoals.length) * 100) : 0;
      const sections = horizons.map(horizon => {
        const matchingGoals = axisGoals.filter(goal => goal.horizon === horizon.id);
        const items = matchingGoals.length
          ? matchingGoals.map(goal => `
              <div class="goal-row${goal.done ? " is-done" : ""}">
                <input class="goal-check" type="checkbox" data-action="toggle" data-id="${goal.id}" aria-label="Marcar ${escapeHtml(goal.name)} como ${goal.done ? "não concluída" : "concluída"}"${goal.done ? " checked" : ""}>
                <span class="goal-name" title="${escapeHtml(goal.name)}">${escapeHtml(goal.name)}</span>
                <button class="goal-delete" type="button" data-action="delete" data-id="${goal.id}" aria-label="Remover meta ${escapeHtml(goal.name)}">×</button>
              </div>
            `).join("")
          : '<p class="empty-state">Nenhuma meta por aqui ainda.</p>';
        return `
          <section class="horizon" aria-label="${horizon.name}">
            <div class="horizon-heading"><span class="horizon-name">${horizon.name}</span><span class="horizon-time">${horizon.time}</span></div>
            <div class="goal-list">${items}</div>
          </section>
        `;
      }).join("");

      return `
        <article class="axis-card" id="${axis.id}" data-axis="${axis.id}" style="--axis-color:${axis.color};--axis-tint:${axis.tint};--axis-border:${axis.border}">
          <header class="axis-header">
            <span class="axis-symbol" aria-hidden="true">${axis.icon}</span>
            <div class="axis-title-wrap"><h3 class="axis-title">${axis.name}</h3><p class="axis-subtitle">${axis.subtitle}</p></div>
            <span class="axis-total" aria-label="${axisGoals.length} metas">${axisGoals.length} ${axisGoals.length === 1 ? "meta" : "metas"}</span>
          </header>
          ${sections}
          <div class="horizon">
            <div class="progress-block"><span>Progresso</span><div class="progress-track" role="progressbar" aria-label="Progresso em ${axis.name}" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" style="width:${progress}%"></div></div><span>${progress}%</span></div>
          </div>
        </article>
      `;
    }).join("");

    const completed = goals.filter(goal => goal.done).length;
    const total = goals.length;
    document.getElementById("total-goals").textContent = total;
    document.getElementById("completed-goals").textContent = completed;
    document.getElementById("progress-value").textContent = `${total ? Math.round((completed / total) * 100) : 0}%`;
    document.getElementById("completion-hint").textContent = total
      ? `${total - completed} em andamento`
      : "cada passo conta";

    axes.forEach(axis => {
      const count = goals.filter(goal => goal.axis === axis.id).length;
      const badge = document.querySelector(`[data-count="${axis.id}"]`);
      badge.textContent = count;
      badge.setAttribute("aria-label", `${count} ${count === 1 ? "meta" : "metas"}`);
    });
  }

  function openModal() {
    lastFocusedElement = document.activeElement;
    errorMessage.textContent = "";
    form.reset();
    modal.hidden = false;
    nameInput.focus();
  }

  function closeModal() {
    modal.hidden = true;
    errorMessage.textContent = "";
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") lastFocusedElement.focus();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3200);
  }

  document.getElementById("open-modal").addEventListener("click", openModal);
  document.getElementById("close-modal").addEventListener("click", closeModal);
  document.getElementById("cancel-modal").addEventListener("click", closeModal);
  modal.addEventListener("click", event => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
    if (event.key === "Tab" && !modal.hidden) {
      const focusable = modal.querySelectorAll("button, input, select");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const axis = document.getElementById("goal-axis").value;
    const horizon = document.getElementById("goal-horizon").value;
    if (!name) {
      errorMessage.textContent = "Escreva um nome para sua meta.";
      nameInput.focus();
      return;
    }
    if (!validAxes.has(axis) || !validHorizons.has(horizon)) {
      errorMessage.textContent = "Escolha um eixo e um prazo válidos.";
      return;
    }

    goals.unshift({
      id: window.crypto && typeof window.crypto.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      axis,
      horizon,
      done: false
    });
    if (!saveGoals()) {
      goals.shift();
      return;
    }
    render();
    closeModal();
    showToast("Meta adicionada ao seu mapa.");
  });

  grid.addEventListener("change", event => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.dataset.action !== "toggle") return;
    const goal = goals.find(item => item.id === target.dataset.id);
    if (!goal) return;
    const previous = goal.done;
    goal.done = target.checked;
    if (!saveGoals()) {
      goal.done = previous;
      render();
      return;
    }
    render();
  });

  grid.addEventListener("click", event => {
    const target = event.target.closest("button[data-action='delete']");
    if (!target) return;
    const index = goals.findIndex(goal => goal.id === target.dataset.id);
    if (index < 0) return;
    const [removed] = goals.splice(index, 1);
    if (!saveGoals()) {
      goals.splice(index, 0, removed);
      render();
      return;
    }
    render();
    showToast("Meta removida.");
  });

  document.querySelectorAll("[data-axis-link]").forEach(link => {
    link.addEventListener("click", () => {
      const selectedAxis = link.dataset.axisLink;
      document.querySelectorAll(".nav-link").forEach(item => item.classList.toggle("active", item === link));
      document.querySelectorAll(".axis-card").forEach(card => {
        card.classList.toggle("filtered-out", selectedAxis !== "all" && card.dataset.axis !== selectedAxis);
      });
    });
  });

  document.getElementById("today").textContent = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(new Date());

  render();
})();
