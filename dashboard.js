// ============================
// Replace this when hosted
// ============================
const DEFAULT_BASE_OVERLAY_URL = "https://slickpicklenick.github.io/breaking-news/overlay/overlay.html";

// Allow optional override via dashboard URL: ?base=https://...
function getBaseOverlayUrl(){
  try {
    const u = new URL(window.location.href);
    const b = u.searchParams.get("base");
    if (!b) return DEFAULT_BASE_OVERLAY_URL;

    // Basic validation: must be http(s)
    const parsed = new URL(b);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return DEFAULT_BASE_OVERLAY_URL;
    return parsed.toString();
  } catch {
    return DEFAULT_BASE_OVERLAY_URL;
  }
}

const BASE_OVERLAY_URL = getBaseOverlayUrl();

let previewActivated = false;

// Defaults (used by "Load Default Settings")
const DEFAULTS = {
  labelText: "BREAKING NEWS",
  message: "This is a breaking news alert scrolling across the screen.",
  pulse: false,

  labelColor: "#cc0000",
  labelOpacity: 1,

  tickerBgColor: "#111111",
  tickerBgOpacity: 0.90,

  textColor: "#ffffff",
  textOpacity: 1,

  scrollDuration: 12
};

const $ = (id) => document.getElementById(id);

function clampNum(v, min, max, fallback){
  const n = Number(v);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function setControlsFromSettings(s){
  $("labelText").value = s.labelText ?? DEFAULTS.labelText;
  $("message").value = s.message ?? DEFAULTS.message;
  $("pulse").checked = !!s.pulse;

  $("labelColor").value = s.labelColor ?? DEFAULTS.labelColor;
  $("labelOpacity").value = String(clampNum(s.labelOpacity ?? DEFAULTS.labelOpacity, 0, 1, DEFAULTS.labelOpacity));

  $("tickerBgColor").value = s.tickerBgColor ?? DEFAULTS.tickerBgColor;
  $("tickerBgOpacity").value = String(clampNum(s.tickerBgOpacity ?? DEFAULTS.tickerBgOpacity, 0, 1, DEFAULTS.tickerBgOpacity));

  $("textColor").value = s.textColor ?? DEFAULTS.textColor;
  $("textOpacity").value = String(clampNum(s.textOpacity ?? DEFAULTS.textOpacity, 0, 1, DEFAULTS.textOpacity));

  $("scrollDuration").value = String(clampNum(s.scrollDuration ?? DEFAULTS.scrollDuration, 4, 120, DEFAULTS.scrollDuration));
}

function getSettings(){
  return {
    labelText: $("labelText").value,
    message: $("message").value, // preview/testing only (NOT encoded into URL)
    pulse: $("pulse").checked ? "1" : "0",

    labelColor: $("labelColor").value,
    labelOpacity: String(clampNum($("labelOpacity").value, 0, 1, 1)),

    tickerBgColor: $("tickerBgColor").value,
    tickerBgOpacity: String(clampNum($("tickerBgOpacity").value, 0, 1, 0.9)),

    textColor: $("textColor").value,
    textOpacity: String(clampNum($("textOpacity").value, 0, 1, 1)),

    scrollDuration: String(clampNum($("scrollDuration").value, 4, 120, 12))
  };
}

function buildObsUrl(){
  const s = getSettings();
  const params = new URLSearchParams();

  // Keep label text + styling params.
  params.set("lt", s.labelText);
  params.set("p", s.pulse);

  params.set("lc", s.labelColor);
  params.set("lo", s.labelOpacity);

  params.set("tc", s.tickerBgColor);
  params.set("to", s.tickerBgOpacity);

  params.set("xc", s.textColor);
  params.set("xo", s.textOpacity);

  params.set("sd", s.scrollDuration);

  // IMPORTANT: Do NOT include msg in the generated URL.
  // (Message is only for dashboard preview/testing.)
  return `${BASE_OVERLAY_URL}?${params.toString()}`;
}

function post(payload){
  const iframe = $("preview");
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(payload, "*");
}

function refreshUrlOnly(){
  $("obsUrl").value = buildObsUrl();
}

function activatePreview(){
  if (previewActivated) return;
  previewActivated = true;
  pushPreviewUpdate();
}

function pushPreviewUpdate(){
  if (!previewActivated) return;

  const s = getSettings();
  post({
    type: "update",
    labelText: s.labelText,
    message: s.message, // still used for preview
    pulse: s.pulse === "1",

    labelColor: s.labelColor,
    labelOpacity: s.labelOpacity,

    tickerBgColor: s.tickerBgColor,
    tickerBgOpacity: s.tickerBgOpacity,

    textColor: s.textColor,
    textOpacity: s.textOpacity,

    scrollDuration: s.scrollDuration
  });
}

function apply(){
  refreshUrlOnly();
  activatePreview();
  pushPreviewUpdate();
}

function test(){
  apply();
  post({ type: "test" });
}

/* -------------------------
   Copy URL (top bar center)
-------------------------- */
function showCopyToast(){
  const t = $("copyToast");
  t.classList.add("show");
  t.setAttribute("aria-hidden", "false");
  setTimeout(() => {
    t.classList.remove("show");
    t.setAttribute("aria-hidden", "true");
  }, 900);
}

async function copyUrl(){
  refreshUrlOnly();
  const url = $("obsUrl").value;

  try {
    await navigator.clipboard.writeText(url);
  } catch {
    $("obsUrl").focus();
    $("obsUrl").select();
    document.execCommand("copy");
  }

  showCopyToast();
}

/* -------------------------
   Load Default Settings
-------------------------- */
function loadDefaults(){
  const ok = window.confirm("Reset all settings to defaults?");
  if (!ok) return;

  setControlsFromSettings(DEFAULTS);

  refreshUrlOnly();
  activatePreview();
  pushPreviewUpdate();
}

/* -------------------------
   Load Settings (paste URL)
-------------------------- */
function parseSettingsFromUrl(input){
  let url;
  try {
    url = new URL(input);
  } catch {
    if (input.trim().startsWith("?")) {
      url = new URL("https://example.invalid/" + input.trim());
    } else {
      throw new Error("Invalid URL");
    }
  }

  const q = url.searchParams;

  const s = {
    labelText: q.get("lt") ?? DEFAULTS.labelText,

    // Backward compatible: if an old URL includes msg, load it into the test field
    message: q.get("msg") ?? DEFAULTS.message,

    pulse: (q.get("p") ?? "0") === "1",

    labelColor: q.get("lc") ?? DEFAULTS.labelColor,
    labelOpacity: clampNum(q.get("lo") ?? DEFAULTS.labelOpacity, 0, 1, DEFAULTS.labelOpacity),

    tickerBgColor: q.get("tc") ?? DEFAULTS.tickerBgColor,
    tickerBgOpacity: clampNum(q.get("to") ?? DEFAULTS.tickerBgOpacity, 0, 1, DEFAULTS.tickerBgOpacity),

    textColor: q.get("xc") ?? DEFAULTS.textColor,
    textOpacity: clampNum(q.get("xo") ?? DEFAULTS.textOpacity, 0, 1, DEFAULTS.textOpacity),

    scrollDuration: clampNum(q.get("sd") ?? DEFAULTS.scrollDuration, 4, 120, DEFAULTS.scrollDuration)
  };

  return s;
}

function openModal(){
  $("modalHint").textContent = "";
  $("loadUrlInput").value = "";
  $("modalBackdrop").classList.add("show");
  $("modalBackdrop").setAttribute("aria-hidden", "false");
  setTimeout(() => $("loadUrlInput").focus(), 0);
}

function closeModal(){
  $("modalBackdrop").classList.remove("show");
  $("modalBackdrop").setAttribute("aria-hidden", "true");
}

function confirmLoadSettings(){
  const raw = $("loadUrlInput").value.trim();
  if (!raw) {
    $("modalHint").textContent = "Paste a URL first.";
    return;
  }

  let parsed;
  try {
    parsed = parseSettingsFromUrl(raw);
  } catch {
    $("modalHint").textContent = "That doesn’t look like a valid overlay URL.";
    return;
  }

  setControlsFromSettings(parsed);

  closeModal();
  refreshUrlOnly();
  activatePreview();
  pushPreviewUpdate();
}

/* -------------------------
   Wiring
-------------------------- */
$("applyBtn").addEventListener("click", apply);
$("testBtn").addEventListener("click", test);

$("defaultsBtn").addEventListener("click", loadDefaults);
$("loadBtn").addEventListener("click", openModal);

$("cancelLoadBtn").addEventListener("click", closeModal);
$("confirmLoadBtn").addEventListener("click", confirmLoadSettings);

$("modalBackdrop").addEventListener("click", (e) => {
  if (e.target === $("modalBackdrop")) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $("modalBackdrop").classList.contains("show")) closeModal();
});

/* Copy area: click or Enter/Space */
$("copyUrlArea").addEventListener("click", copyUrl);
$("copyUrlArea").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    copyUrl();
  }
});

/* Live updates */
const ids = [
  "labelText","message","pulse",
  "labelColor","labelOpacity",
  "tickerBgColor","tickerBgOpacity",
  "textColor","textOpacity",
  "scrollDuration"
];

ids.forEach((id) => {
  const node = $(id);
  const evt = node.type === "checkbox" ? "change" : "input";
  node.addEventListener(evt, () => {
    refreshUrlOnly();
    activatePreview();
    pushPreviewUpdate();
  });
});

/* Keep overlay hidden until user interaction; do not auto-apply on iframe load */
$("preview").addEventListener("load", refreshUrlOnly);

/* Init defaults */
setControlsFromSettings(DEFAULTS);
refreshUrlOnly();
