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

function expandQueryWords(query) {
  const words = normalise(query).split(/\s+/).filter(Boolean);
  const expanded = new Set(words);
  words.forEach(word => {
    const synonyms = SEARCH_SYNONYMS[word];
    if (synonyms) synonyms.forEach(s => expanded.add(s));
  });
  return [...expanded];
}

function itemMatches(item, query) {
  if (!query) return true;
  const words = expandQueryWords(query);
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
  // Original query words must still all match; synonyms only expand the pool
  const originalWords = normalise(query).split(/\s+/).filter(Boolean);
  return originalWords.every(word => {
    const candidates = [word, ...(SEARCH_SYNONYMS[word] || [])];
    return candidates.some(c => tokenMatches(haystack, c));
  });
}
