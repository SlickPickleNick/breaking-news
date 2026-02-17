// ==============================
// GitHub Pages overlay base URL
// ==============================
const BASE_OVERLAY_URL =
  "https://slickpicklenick.github.io/breaking-news/overlay/overlay.html";

// Defaults (appearance only — NOT message content)
const DEFAULTS = {
  headerText: "BREAKING",
  headerFlash: "off",

  headerBg: "#C80000",
  headerBgA: 0.95,

  headerTextColor: "#FFFFFF",
  headerTextA: 1.0,

  barBg: "#000000",
  barBgA: 0.65,

  tickerTextColor: "#FFFFFF",
  tickerTextA: 1.0,

  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
};

// Elements
const el = {
  generatedUrl: document.getElementById("generatedUrl"),
  copyUrlBtn: document.getElementById("copyUrlBtn"),

  loadDefaultsBtn: document.getElementById("loadDefaultsBtn"),
  loadSettingsBtn: document.getElementById("loadSettingsBtn"),

  headerText: document.getElementById("headerText"),
  headerFlash: document.getElementById("headerFlash"),

  headerBg: document.getElementById("headerBg"),
  headerBgA: document.getElementById("headerBgA"),
  headerTextColor: document.getElementById("headerTextColor"),
  headerTextA: document.getElementById("headerTextA"),

  barBg: document.getElementById("barBg"),
  barBgA: document.getElementById("barBgA"),
  fontFamily: document.getElementById("fontFamily"),
  tickerTextColor: document.getElementById("tickerTextColor"),
  tickerTextA: document.getElementById("tickerTextA"),

  previewFrame: document.getElementById("previewFrame"),

  // Preview tools (not part of URL)
  testMessage: document.getElementById("testMessage"),
  applyTestMessageBtn: document.getElementById("applyTestMessageBtn"),

  // Load settings dialog
  loadSettingsDialog: document.getElementById("loadSettingsDialog"),
  settingsUrlInput: document.getElementById("settingsUrlInput"),
  confirmLoadSettings: document.getElementById("confirmLoadSettings"),
};

function getStateFromUI() {
  return {
    headerText: el.headerText.value.trim() || DEFAULTS.headerText,
    headerFlash: el.headerFlash.value,

    headerBg: el.headerBg.value,
    headerBgA: Number(el.headerBgA.value),

    headerTextColor: el.headerTextColor.value,
    headerTextA: Number(el.headerTextA.value),

    barBg: el.barBg.value,
    barBgA: Number(el.barBgA.value),

    tickerTextColor: el.tickerTextColor.value,
    tickerTextA: Number(el.tickerTextA.value),

    fontFamily: el.fontFamily.value,
  };
}

// IMPORTANT: URL builder must NOT include message content.
function buildOverlayUrl(state) {
  const url = new URL(BASE_OVERLAY_URL);

  // appearance keys expected by overlay/overlay.js
  url.searchParams.set("header", state.headerText);
  url.searchParams.set("flash", state.headerFlash);
  url.searchParams.set("font", state.fontFamily);

  url.searchParams.set("hbg", state.headerBg);
  url.searchParams.set("hbgA", String(state.headerBgA));

  url.searchParams.set("htxt", state.headerTextColor);
  url.searchParams.set("htxtA", String(state.headerTextA));

  url.searchParams.set("bbg", state.barBg);
  url.searchParams.set("bbgA", String(state.barBgA));

  url.searchParams.set("txt", state.tickerTextColor);
  url.searchParams.set("txtA", String(state.tickerTextA));

  return url.toString();
}

function refresh() {
  const state = getStateFromUI();
  const overlayUrl = buildOverlayUrl(state);

  el.generatedUrl.textContent = overlayUrl;
  el.previewFrame.src = overlayUrl;
}

async function copyGeneratedUrl() {
  const text = el.generatedUrl.textContent.trim();
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

function applyDefaults() {
  el.headerText.value = DEFAULTS.headerText;
  el.headerFlash.value = DEFAULTS.headerFlash;

  el.headerBg.value = DEFAULTS.headerBg;
  el.headerBgA.value = String(DEFAULTS.headerBgA);

  el.headerTextColor.value = DEFAULTS.headerTextColor;
  el.headerTextA.value = String(DEFAULTS.headerTextA);

  el.barBg.value = DEFAULTS.barBg;
  el.barBgA.value = String(DEFAULTS.barBgA);

  el.tickerTextColor.value = DEFAULTS.tickerTextColor;
  el.tickerTextA.value = String(DEFAULTS.tickerTextA);

  el.fontFamily.value = DEFAULTS.fontFamily;

  refresh();
}

function loadSettingsFromUrl(inputUrl) {
  let u;
  try {
    u = new URL(inputUrl);
  } catch {
    return false;
  }

  const p = u.searchParams;

  // Only load known appearance settings
  if (p.get("header")) el.headerText.value = p.get("header");
  if (p.get("flash")) el.headerFlash.value = p.get("flash");

  if (p.get("font")) el.fontFamily.value = p.get("font");

  if (p.get("hbg")) el.headerBg.value = p.get("hbg");
  if (p.get("hbgA")) el.headerBgA.value = p.get("hbgA");

  if (p.get("htxt")) el.headerTextColor.value = p.get("htxt");
  if (p.get("htxtA")) el.headerTextA.value = p.get("htxtA");

  if (p.get("bbg")) el.barBg.value = p.get("bbg");
  if (p.get("bbgA")) el.barBgA.value = p.get("bbgA");

  if (p.get("txt")) el.tickerTextColor.value = p.get("txt");
  if (p.get("txtA")) el.tickerTextA.value = p.get("txtA");

  refresh();
  return true;
}

// Preview-only helper: inject a message into the preview iframe without changing the URL.
function applyTestMessageToPreview() {
  const msg = (el.testMessage.value || "").trim();
  const frame = el.previewFrame;

  if (!frame || !frame.contentWindow) return;

  try {
    frame.contentWindow.postMessage(
      { type: "BN_PREVIEW_SET_TEXT", text: msg },
      "*"
    );
  } catch {
    // ignore
  }
}

// Wire events
[
  el.headerText,
  el.headerFlash,
  el.headerBg,
  el.headerBgA,
  el.headerTextColor,
  el.headerTextA,
  el.barBg,
  el.barBgA,
  el.fontFamily,
  el.tickerTextColor,
  el.tickerTextA,
].forEach((input) => input.addEventListener("input", refresh));

el.copyUrlBtn.addEventListener("click", copyGeneratedUrl);

el.loadDefaultsBtn.addEventListener("click", () => {
  const ok = confirm("Are you sure you want to load default settings? This will reset your customizations.");
  if (ok) applyDefaults();
});

el.loadSettingsBtn.addEventListener("click", () => {
  el.settingsUrlInput.value = "";
  el.loadSettingsDialog.showModal();
});

el.confirmLoadSettings.addEventListener("click", () => {
  const val = el.settingsUrlInput.value.trim();
  if (!val) return;
  loadSettingsFromUrl(val);
});

el.applyTestMessageBtn.addEventListener("click", applyTestMessageToPreview);

// Initial
applyDefaults();