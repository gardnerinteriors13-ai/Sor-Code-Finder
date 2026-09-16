const STORAGE_KEY = "sorTenantReportDraft.v2";
const CUSTOM_KEY = "sorTenantReportCustomBank.v2";
const AUTH_KEY = "sorCodeFinderUnlocked.v2.3";
const THEME_KEY = "sorCodeFinderTheme.v2.3";
// Prototype password is: healthyhomes
// This is a client-side gate for testing, not real security.
const AUTH_PASSWORD = atob("aGVhbHRoeWhvbWVz");
let appInitialised = false;
let autoSaveTimer = null;

const baseItems = window.SOR_APP_DATA || [];
const codeBook = window.SOR_CODE_BOOK || [];
let customItems = loadJSON(CUSTOM_KEY, []);
let selectedIds = new Set();
let currentCategory = "All";
let currentCodeCategory = "All";

// Common synonyms to improve search for damp/mould / Healthy Homes work
const SEARCH_SYNONYMS = {
  mould: ["mold", "mildew", "fungus"],
  mold: ["mould", "mildew"],
  condensation: ["condense", "moisture", "damp"],
  damp: ["moisture", "wet", "condensation"],
  fan: ["extractor", "vent", "ventilation"],
  extractor: ["fan", "vent"],
  ventilation: ["fan", "extractor", "vent", "airflow"],
  thermal: ["insulation", "board", "warm"],
  cill: ["sill", "window sill"],
  sill: ["cill"],
  dpc: ["damp proof course", "damp-proof"],
  wc: ["toilet", "loo", "lavatory"],
  toilet: ["wc", "loo"],
  boxing: ["box", "pipe box", "pipework"],
  seal: ["sealant", "silicone", "point"],
  brick: ["masonry", "pointing"]
};

const $ = (id) => document.getElementById(id);
const fields = [
  "propertyAddress", "tenantName", "surveyDate", "surveyor", "roomsInspected",
  "urgency", "hhCategory", "photosTaken", "surveyNotes",
  "includeTenantAdvice", "includeNextSteps", "includeInternalCodes"
];

function allItems() {
  return [...baseItems, ...customItems];
}

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function unlockScreen() {
  const gate = $("authGate");
  const shell = $("appShell");
  if (gate) gate.hidden = true;
  if (shell) shell.hidden = false;
  if (!appInitialised) initApp();
}

function lockScreen(message = "") {
  const gate = $("authGate");
  const shell = $("appShell");
  if (gate) gate.hidden = false;
  if (shell) shell.hidden = true;
  if ($("authMessage")) $("authMessage").textContent = message;
  setTimeout(() => $("appPassword")?.focus(), 0);
}

function tryUnlock() {
  const password = $("appPassword")?.value || "";
  const message = $("authMessage");
  if (!password.trim()) {
    if (message) message.textContent = "Password needed.";
    return;
  }

  if (password.trim() === AUTH_PASSWORD) {
    if ($("rememberUnlock")?.checked) localStorage.setItem(AUTH_KEY, "true");
    unlockScreen();
    return;
  }

  if (message) message.textContent = "Wrong password.";
  if ($("appPassword")) $("appPassword").value = "";
}

function wireAuth() {
  $("unlockApp")?.addEventListener("click", tryUnlock);
  $("appPassword")?.addEventListener("keydown", event => {
    if (event.key === "Enter") tryUnlock();
  });

  if (localStorage.getItem(AUTH_KEY) === "true") unlockScreen();
  else lockScreen();
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>'"]/g, char => ({
    "&": "&", "<": "<", ">": ">", "'": "&#39;", '"': """
  }[char]));
}

function normalise(value = "") {
  return String(value).toLowerCase().trim();
}

function tokenMatches(haystack, word) {
  if (/^\d+$/.test(word)) return haystack.includes(word);
  if (word.length <= 2) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
  }
  return haystack.includes(word);
}

function itemMatches(item, query) {
  if (!query) return true;
  const originalWords = normalise(query).split(/\s+/).filter(Boolean);
  const haystack = normalise([
    item.title,
    item.category,
    item.section,
    item.subsection,
    item.trade,
    item.code,
    item.description,
    item.internalWording,
    item.tenantText,
    ...(item.tags || [])
  ].join(" "));
  return originalWords.every(word => {
    const candidates = [word, ...(SEARCH_SYNONYMS[word] || [])];
    return candidates.some(c => tokenMatches(haystack, c));
  });
}

function allCodeItems() {
  const curated = allItems()
    .filter(item => item.code)
    .map(item => ({ ...item, source: "Common actions" }));

  const seen = new Set(curated.map(item => `${item.code || ""}|${item.description || item.title || ""}`));
  const book = codeBook
    .filter(item => item.code)
    .filter(item => {
      const key = `${item.code || ""}|${item.description || item.title || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(item => ({ ...item, source: "Full SOR code book" }));

  return [...curated, ...book];
}

function getBuilderCategories() {
  return ["All", ...Array.from(new Set(allItems().map(item => item.category))).sort()];
}

function getCodeCategories() {
  return ["All", ...Array.from(new Set(allCodeItems().map(item => item.category || "SOR Code Book"))).sort()];
}

function populateFilters() {
  const builderCategories = getBuilderCategories();
  const codeCategories = getCodeCategories();

  const builderSelect = $("categoryFilter");
  if (builderSelect) {
    const current = builderSelect.value || currentCategory || "All";
    builderSelect.innerHTML = builderCategories.map(cat => `<option${cat === current ? " selected" : ""}>${escapeHTML(cat)}</option>`).join("");
  }

  const codeSelect = $("codeCategoryFilter");
  if (codeSelect) {
    const current = codeSelect.value || currentCodeCategory || "All";
    codeSelect.innerHTML = codeCategories.map(cat => `<option${cat === current ? " selected" : ""}>${escapeHTML(cat)}</option>`).join("");
  }

  renderChips(builderCategories);
}

function renderChips(categories) {
  const chipWrap = $("categoryChips");
  chipWrap.innerHTML = categories.map(cat => `<button class="chip ${cat === currentCategory ? "active" : ""}" data-category="${escapeHTML(cat)}">${escapeHTML(cat)}</button>`).join("");
  chipWrap.querySelectorAll(".chip").forEach(chip => chip.addEventListener("click", () => {
    currentCategory = chip.dataset.category;
    $("categoryFilter").value = currentCategory;
    renderOptions();
  }));
}

function renderOptions() {
  populateFilters();
  const query = normalise($("optionSearch").value);
  const items = allItems().filter(item => (currentCategory === "All" || item.category === currentCategory) && itemMatches(item, query));
  const list = $("optionList");
  if (!items.length) {
    list.innerHTML = `<div class="empty">No matching options. Apparently even the SOR has limits.</div>`;
    updateOutputs();
    return;
  }
  list.innerHTML = items.map(item => {
    const checked = selectedIds.has(item.id);
    const code = item.code ? ` · ${item.code}` : "";
    return `<label class="option-card ${checked ? "checked" : ""}">
      <input type="checkbox" data-id="${escapeHTML(item.id)}" ${checked ? "checked" : ""} />
      <span><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.category)}${escapeHTML(code)}<br>${escapeHTML(item.tenantText || item.internalWording || "")}</small></span>
    </label>`;
  }).join("");

  list.querySelectorAll("input[type='checkbox']").forEach(input => input.addEventListener("change", () => {
    if (input.checked) selectedIds.add(input.dataset.id);
    else selectedIds.delete(input.dataset.id);
    renderOptions();
    scheduleAutoSave();
  }));
  updateOutputs();
}

function selectedItems() {
  const map = new Map(allItems().map(item => [item.id, item]));
  return [...selectedIds].map(id => map.get(id)).filter(Boolean);
}

function getFieldValue(id) {
  const el = $(id);
  return el.type === "checkbox" ? el.checked : el.value.trim();
}

function getSurvey() {
  return Object.fromEntries(fields.map(id => [id, getFieldValue(id)]));
}

function buildReportHTML() {
  const survey = getSurvey();
  const items = selectedItems();
  const findings = items.filter(i => i.actionType === "finding");
  const causes = items.filter(i => i.actionType === "cause");
  const works = items.filter(i => i.actionType === "work");
  const advice = items.filter(i => i.actionType === "advice");

  if (!items.length && !survey.propertyAddress && !survey.roomsInspected) {
    return `<p class="blank">Start by entering survey details and selecting findings. The report will build here, because apparently paperwork now breeds its own paperwork.</p>`;
  }

  const addressLine = survey.propertyAddress ? `<p><strong>Property:</strong> ${escapeHTML(survey.propertyAddress)}</p>` : "";
  const tenantLine = survey.tenantName ? `<p><strong>Tenant:</strong> ${escapeHTML(survey.tenantName)}</p>` : "";
  const meta = `<p><strong>Survey date:</strong> ${escapeHTML(survey.surveyDate || "Not stated")}<br>
    <strong>Surveyor:</strong> ${escapeHTML(survey.surveyor || "Not stated")}<br>
    <strong>Rooms inspected:</strong> ${escapeHTML(survey.roomsInspected || "Not stated")}<br>
    <strong>Priority:</strong> ${escapeHTML(survey.urgency || "Routine")} · ${escapeHTML(survey.hhCategory || "Not assigned")}<br>
    <strong>Photos taken:</strong> ${escapeHTML(survey.photosTaken || "Not stated")}</p>`;

  let html = `<h3>Tenant Friendly Survey Summary</h3>${addressLine}${tenantLine}${meta}
    <p>Thank you for allowing us to inspect your home. We attended to review the reported damp, mould or condensation concerns and identify what repairs or improvements may be required.</p>`;

  if (survey.surveyNotes) {
    html += `<h3>Important notes</h3><p>${escapeHTML(survey.surveyNotes)}</p>`;
  }

  html += sectionList("What we found", findings);
  html += sectionList("Why this may be happening", causes);
  html += sectionList("Recommended works", works);

  if (survey.includeTenantAdvice) {
    const adviceItems = advice.length ? advice : [];
    html += sectionList("Helpful tenant notes", adviceItems);
  }

  if (survey.includeNextSteps) {
    html += `<h3>What happens next</h3><p>The recommended works will now be reviewed and arranged by the repairs team. Some works may require a follow-up appointment, access to affected rooms, or temporary removal of items from the working area.</p>`;
  }

  return html;
}

function sectionList(title, items) {
  if (!items.length) return "";
  return `<h3>${escapeHTML(title)}</h3><ul>${items.map(item => `<li>${escapeHTML(item.tenantText || item.title)}</li>`).join("")}</ul>`;
}

function reportPlainText() {
  const clone = document.createElement("div");
  clone.innerHTML = buildReportHTML().replace(/<li>/g, "• ").replace(/<\/li>/g, "\n").replace(/<\/h3>/g, "\n").replace(/<\/p>/g, "\n\n");
  return clone.textContent.replace(/\n{3,}/g, "\n\n").trim();
}

function updateOutputs() {
  $("selectedCount").textContent = `${selectedIds.size} selected`;
  $("reportPreview").innerHTML = buildReportHTML();
  renderActionsTable();
  renderCodeResults();
  renderBank();
}

function renderActionsTable() {
  const tbody = $("actionsTable").querySelector("tbody");
  const survey = getSurvey();
  const rows = selectedItems().filter(i => i.actionType === "work" || i.code || i.internalWording);
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">No internal actions selected yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(item => `<tr>
    <td>${escapeHTML(survey.includeInternalCodes ? (item.code || "-") : "Hidden")}</td>
    <td>${escapeHTML(item.description || item.title)}</td>
    <td>${escapeHTML(item.uom || "-")}</td>
    <td>${escapeHTML(item.rate || "-")}</td>
    <td>${escapeHTML(item.internalWording || "-")}</td>
  </tr>`).join("");
}

function actionText() {
  return selectedItems().filter(i => i.actionType === "work" || i.code || i.internalWording).map(item => {
    return `${item.code || "-"}\t${item.description || item.title}\t${item.uom || "-"}\t${item.rate || "-"}\t${item.internalWording || "-"}`;
  }).join("\n");
}

function csvText() {
  const header = ["Code", "Description", "UOM", "Rate", "Internal wording"];
  const rows = selectedItems().filter(i => i.actionType === "work" || i.code || i.internalWording)
    .map(item => [item.code || "", item.description || item.title, item.uom || "", item.rate || "", item.internalWording || ""]);
  return [header, ...rows].map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
}

async function copyText(text, status = "Copied") {
  const value = String(text || "").trim();
  if (!value) {
    toast("Nothing to copy");
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
    } else {
      fallbackCopy(value);
    }
    toast(status);
  } catch (error) {
    fallbackCopy(value);
    toast(status);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function downloadFile(filename, content, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toast(message) {
  const status = $("saveStatus");
  status.textContent = message;
  status.classList.remove("muted-pill");
  setTimeout(() => {
    status.textContent = "Saved locally";
    status.classList.add("muted-pill");
  }, 1400);
}

function saveDraft(silent = false) {
  saveJSON(STORAGE_KEY, { survey: getSurvey(), selectedIds: [...selectedIds] });
  if (!silent) toast("Draft saved");
  else {
    const status = $("saveStatus");
    if (status) {
      status.textContent = "Auto-saved";
      status.classList.remove("muted-pill");
      setTimeout(() => {
        status.textContent = "Saved locally";
        status.classList.add("muted-pill");
      }, 1200);
    }
  }
}

function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => saveDraft(true), 900);
}

function clearSelection() {
  selectedIds.clear();
  renderOptions();
  toast("Selection cleared");
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  const btn = $("themeToggle");
  if (btn) btn.textContent = theme === "dark" ? "Light mode" : "Dark mode";
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
}

function loadDraft() {
  const draft = loadJSON(STORAGE_KEY, null);
  if (!draft) return;
  Object.entries(draft.survey || {}).forEach(([id, value]) => {
    const el = $(id);
    if (!el) return;
    if (el.type === "checkbox") el.checked = Boolean(value);
    else el.value = value;
  });
  selectedIds = new Set(draft.selectedIds || []);
}

function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
  selectedIds.clear();
  fields.forEach(id => {
    const el = $(id);
    if (!el) return;
    if (el.type === "checkbox") el.checked = ["includeTenantAdvice", "includeNextSteps", "includeInternalCodes"].includes(id);
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
  });
  setToday();
  renderOptions();
  toast("Cleared");
}

function setToday() {
  if (!$("surveyDate").value) $("surveyDate").value = new Date().toISOString().slice(0, 10);
}

function codeLine(item) {
  return `${item.code || "-"} - ${item.title || item.description || "SOR item"}`;
}

function codeFullCopy(item) {
  return [
    `Code: ${item.code || "-"}`,
    `Description: ${item.description || item.title || "-"}`,
    `UOM: ${item.uom || "-"}`,
    `Rate: ${item.rate || "-"}`,
    `Works wording: ${item.internalWording || "-"}`
  ].join("\n");
}

function renderCodeResults() {
  const query = normalise($("codeSearch")?.value || "");
  const category = currentCodeCategory;
  const wrap = $("codeResults");
  if (!wrap) return;

  const allCodes = allCodeItems();
  const filtered = allCodes.filter(item =>
    item.code &&
    (category === "All" || item.category === category) &&
    itemMatches(item, query)
  );

  const totalLoaded = codeBook.length;
  const limit = 120;
  const visible = filtered.slice(0, limit);

  if ($("codeCount")) {
    if (!query && category === "All") $("codeCount").textContent = `${totalLoaded.toLocaleString()} codes loaded`;
    else $("codeCount").textContent = `${filtered.length.toLocaleString()} result${filtered.length === 1 ? "" : "s"}`;
  }

  if (!query && category === "All") {
    wrap.innerHTML = `<div class="empty">Full SOR code book loaded: ${totalLoaded.toLocaleString()} codes. Search above for things like <strong>brick seal</strong>, <strong>remove wc</strong>, <strong>thermal board</strong>, <strong>boxing</strong>, or <strong>concrete dpc</strong>.</div>`;
    return;
  }

  if (!filtered.length) {
    wrap.innerHTML = `<div class="empty">No code found. Try fewer words, for example "cill" instead of "door cill repair", because the SOR was apparently written by a committee allergic to normal speech.</div>`;
    return;
  }

  const moreNote = filtered.length > limit
    ? `<div class="empty">Showing first ${limit} of ${filtered.length.toLocaleString()} results. Narrow the search unless you enjoy scrolling like it's a punishment.</div>`
    : "";

  wrap.innerHTML = moreNote + visible.map(item => `<article class="code-card">
    <header>
      <div>
        <h3>${escapeHTML(item.title)}</h3>
        <button class="code-pill" type="button" data-copy="${escapeHTML(item.code || "")}" data-status="Code copied">${escapeHTML(item.code || "-")}</button>
      </div>
      <div class="card-copy-actions">
        <button class="mini-btn" type="button" data-copy="${escapeHTML(codeLine(item))}" data-status="Code line copied">Copy code</button>
        <button class="mini-btn" type="button" data-copy="${escapeHTML(item.internalWording || item.description || item.title || "")}" data-status="Works wording copied">Copy wording</button>
        <button class="mini-btn" type="button" data-copy="${escapeHTML(codeFullCopy(item))}" data-status="Full item copied">Copy full</button>
      </div>
    </header>
    <p>${escapeHTML(item.description || item.internalWording || "")}</p>
    <div class="code-meta">
      <span class="meta">${escapeHTML(item.category || "SOR")}</span>
      ${item.section ? `<span class="meta">${escapeHTML(item.section)}</span>` : ""}
      ${item.trade ? `<span class="meta">Trade: ${escapeHTML(item.trade)}</span>` : ""}
      <span class="meta">UOM: ${escapeHTML(item.uom || "-")}</span>
      <span class="meta">Rate: ${escapeHTML(item.rate || "-")}</span>
      <span class="meta">${escapeHTML(item.source || "SOR")}</span>
    </div>
    <p><strong>Works wording:</strong> ${escapeHTML(item.internalWording || "-")}</p>
  </article>`).join("");

  wireCopyButtons(wrap);
}

function wireCopyButtons(scope = document) {
  scope.querySelectorAll("[data-copy]").forEach(button => {
    if (button.dataset.copyWired === "true") return;
    button.dataset.copyWired = "true";
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      copyText(button.dataset.copy || "", button.dataset.status || "Copied");
    });
  });
}

function renderBank() {
  const list = $("bankList");
  if (!list) return;
  const items = allItems();
  $("bankCount").textContent = `${items.length} report items`;
  list.innerHTML = items.map(item => `<article class="bank-card">
    <header>
      <div>
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.tenantText || "No tenant wording")}</p>
      </div>
      <span class="pill">${escapeHTML(item.category)}</span>
    </header>
    <div class="code-meta"><span class="meta">Code: ${escapeHTML(item.code || "-")}</span><span class="meta">UOM: ${escapeHTML(item.uom || "-")}</span><span class="meta">Rate: ${escapeHTML(item.rate || "-")}</span></div>
    <div class="card-copy-actions">
      <button class="mini-btn" type="button" data-copy="${escapeHTML(item.tenantText || "")}" data-status="Tenant wording copied">Copy tenant</button>
      <button class="mini-btn" type="button" data-copy="${escapeHTML(item.internalWording || "")}" data-status="Internal wording copied">Copy internal</button>
    </div>
  </article>`).join("");
  wireCopyButtons(list);
}

function addCustomItem() {
  const title = $("customTitle").value.trim();
  if (!title) {
    toast("Title required");
    return;
  }
  const item = {
    id: "custom-" + Date.now(),
    title,
    category: $("customCategory").value.trim() || "Custom",
    code: $("customCode").value.trim(),
    uom: $("customUom").value.trim(),
    rate: $("customRate").value.trim(),
    description: $("customDescription").value.trim(),
    tenantText: $("customTenant").value.trim(),
    internalWording: $("customInternal").value.trim(),
    tags: [],
    actionType: $("customCode").value.trim() ? "work" : "finding"
  };
  customItems.push(item);
  saveJSON(CUSTOM_KEY, customItems);
  ["customTitle", "customCategory", "customCode", "customUom", "customRate", "customDescription", "customTenant", "customInternal"].forEach(id => $(id).value = "");
  populateFilters();
  renderOptions();
  toast("Custom item added");
}

function resetCustomBank() {
  customItems = [];
  localStorage.removeItem(CUSTOM_KEY);
  populateFilters();
  renderOptions();
  toast("Custom bank reset");
}

function wireEvents() {
  document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
    document.querySelectorAll(".tab, .view").forEach(el => el.classList.remove("active"));
    tab.classList.add("active");
    $(tab.dataset.view).classList.add("active");
    renderCodeResults();
    renderBank();
  }));

  fields.forEach(id => {
    $(id)?.addEventListener("input", () => { updateOutputs(); scheduleAutoSave(); });
    $(id)?.addEventListener("change", () => { updateOutputs(); scheduleAutoSave(); });
  });
  $("optionSearch")?.addEventListener("input", renderOptions);
  $("categoryFilter")?.addEventListener("change", (e) => { currentCategory = e.target.value; renderOptions(); });
  $("codeSearch")?.addEventListener("input", renderCodeResults);
  $("codeCategoryFilter")?.addEventListener("change", (e) => { currentCodeCategory = e.target.value; renderCodeResults(); });

  $("copyReport")?.addEventListener("click", () => copyText(reportPlainText(), "Report copied"));
  $("downloadReport")?.addEventListener("click", () => downloadFile("tenant-report.txt", reportPlainText()));
  $("printReport")?.addEventListener("click", () => window.print());
  $("copyActions")?.addEventListener("click", () => copyText(actionText(), "Actions copied"));
  $("downloadCsv")?.addEventListener("click", () => downloadFile("sor-actions.csv", csvText(), "text/csv"));
  $("saveDraft")?.addEventListener("click", () => saveDraft(false));
  $("clearDraft")?.addEventListener("click", clearDraft);
  $("clearSelection")?.addEventListener("click", clearSelection);
  $("themeToggle")?.addEventListener("click", toggleTheme);
  $("addCustomItem")?.addEventListener("click", addCustomItem);
  $("resetCustomBank")?.addEventListener("click", resetCustomBank);

  // Keyboard: press / to focus the active search box
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      const activeView = document.querySelector(".view.active");
      const search = activeView?.querySelector('input[type="search"]') || $("optionSearch") || $("codeSearch");
      search?.focus();
    }
  });
}

function initApp() {
  if (appInitialised) return;
  appInitialised = true;
  initTheme();
  wireEvents();
  setToday();
  loadDraft();
  populateFilters();
  renderOptions();
}

wireAuth();
