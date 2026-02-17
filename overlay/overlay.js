// ========================
// Helpers
// ========================
function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 1;
  return Math.max(0, Math.min(1, x));
}

function hexToRgb(hex) {
  const h = String(hex || "").trim().replace(/^#/, "");
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (![r, g, b].every(Number.isFinite)) return null;
  return { r, g, b };
}

// ========================
// Streamer.bot WS Settings
// ========================
const STREAMERBOT_WS_URL = "ws://127.0.0.1:8080"; // change port if needed

// Custom event names (must match your SB v1.0.4 C# broadcasts)
const EVT_SET_TEXT = "SetBreakingScrollingText";
const EVT_SET_VISIBLE = "SetBreakingVisible";

// ========================
// DOM hooks
// ========================
const barEl = document.getElementById("bn-bar");
const headerEl = document.querySelector(".bn-header");
const headerTextEl = document.getElementById("bn-header-text");
const tickerTextEl = document.getElementById("bn-ticker-text");

// ========================
// State
// ========================
let hideTimer = null;

function setBarVisible(visible) {
  if (!barEl) return;
  barEl.style.display = visible ? "flex" : "none";
}

function setTickerText(text) {
  if (!tickerTextEl) return;
  tickerTextEl.textContent = String(text ?? "");
}

function clearAutoHide() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

/**
 * durationMs rules:
 * - durationMs > 0: hide bar AND clear text when timer expires
 * - durationMs <= 0 or missing: indefinite
 */
function scheduleAutoHide(durationMs) {
  clearAutoHide();

  const ms = Number(durationMs);
  if (Number.isFinite(ms) && ms > 0) {
    hideTimer = setTimeout(() => {
      setBarVisible(false);
      setTickerText("");
      hideTimer = null;
    }, ms);
  }
}

// Start hidden/cleared
setBarVisible(false);
setTickerText("");

// ========================
// Apply appearance config from URL params
// ========================
function applyConfigFromUrl() {
  const url = new URL(window.location.href);
  const p = url.searchParams;

  const headerText = p.get("header");
  if (headerTextEl && headerText) headerTextEl.textContent = headerText;

  const flash = p.get("flash");
  if (headerEl) headerEl.classList.toggle("flash", flash === "on");

  const font = p.get("font");
  if (font) document.documentElement.style.fontFamily = font;

  // Header bg + alpha
  const hbg = p.get("hbg");
  const hbgA = clamp01(p.get("hbgA"));
  if (hbg && headerEl) {
    const c = hexToRgb(hbg);
    if (c) headerEl.style.background = `rgba(${c.r}, ${c.g}, ${c.b}, ${hbgA})`;
  }

  // Header text color + alpha
  const htxt = p.get("htxt");
  const htxtA = clamp01(p.get("htxtA"));
  if (htxt && headerTextEl) {
    const c = hexToRgb(htxt);
    if (c) headerTextEl.style.color = `rgba(${c.r}, ${c.g}, ${c.b}, ${htxtA})`;
  }

  // Bar bg + alpha
  const bbg = p.get("bbg");
  const bbgA = clamp01(p.get("bbgA"));
  if (bbg && barEl) {
    const c = hexToRgb(bbg);
    if (c) barEl.style.background = `rgba(${c.r}, ${c.g}, ${c.b}, ${bbgA})`;
  }

  // Ticker text color + alpha
  const txt = p.get("txt");
  const txtA = clamp01(p.get("txtA"));
  if (txt && tickerTextEl) {
    const c = hexToRgb(txt);
    if (c) tickerTextEl.style.color = `rgba(${c.r}, ${c.g}, ${c.b}, ${txtA})`;
  }
}

applyConfigFromUrl();

// ========================
// WebSocket connect (SB v1.0.4 broadcast)
// ========================
let ws = null;
let reconnectTimer = null;

function connect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  ws = new WebSocket(STREAMERBOT_WS_URL);

  ws.onopen = () => {
    // Using WebsocketBroadcastJson in SB v1.0.4 — no subscribe handshake required.
  };

  ws.onmessage = (evt) => {
    let msg;
    try {
      msg = JSON.parse(evt.data);
    } catch {
      return;
    }

    // Expected envelope from your v1.0.4 C#:
    // {
    //   "event": { "source":"Custom","type":"Event","name":"SetBreakingScrollingText" },
    //   "data": { ... }
    // }
    const eventName = msg?.event?.name;
    const payload = msg?.data ?? {};

    if (eventName === EVT_SET_TEXT) {
      const text = payload?.text ?? "";
      const durationMs = payload?.durationMs ?? 0;

      setTickerText(text);
      setBarVisible(true);
      scheduleAutoHide(durationMs);
      return;
    }

    if (eventName === EVT_SET_VISIBLE) {
      const visible = Boolean(payload?.visible);

      setBarVisible(visible);

      if (!visible) {
        clearAutoHide();
        setTickerText("");
      }

      return;
    }
  };

  ws.onclose = () => {
    reconnectTimer = setTimeout(connect, 1000);
  };

  ws.onerror = () => {
    // onclose generally follows; reconnect handled there
  };
}

connect();

// ========================
// Dashboard preview support (does not affect OBS usage)
// ========================
window.addEventListener("message", (evt) => {
  const m = evt?.data;
  if (m?.type === "BN_PREVIEW_SET_TEXT") {
    setTickerText(m.text || "");
    setBarVisible(true);
    scheduleAutoHide(0); // preview: indefinite
  }
});
