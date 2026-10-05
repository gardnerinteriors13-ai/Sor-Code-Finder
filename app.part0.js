const STORAGE_KEY = "sorTenantReportDraft.v2";
const CUSTOM_KEY = "sorTenantReportCustomBank.v2";
const AUTH_KEY = "sorCodeFinderUnlocked.v2.2";
// Prototype password is: healthyhomes
// This is a client-side gate for testing, not real security.
const AUTH_PASSWORD = atob("aGVhbHRoeWhvbWVz");
let appInitialised = false;

const baseItems = window.SOR_APP_DATA || [];
const codeBook = window.SOR_CODE_BOOK || [];
const visualSurveyData = window.VISUAL_SURVEY_DATA || { categories: [], rooms: [] };
let currentVisualCategory = "damp-mould";
let currentVisualRoom = "bedroom";
let currentVisualHotspot = null;
let currentVisualSymptom = null;
let customItems = loadJSON(CUSTOM_KEY, []);
let selectedIds = new Set();
let currentCategory = "All";
let currentCodeCategory = "All";

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
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
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
  const words = normalise(query).split(/\s+/).filter(Boolean);
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
  return words.every(word => tokenMatches(haystack, word));
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
  const tenantLine = survey.tenantName 