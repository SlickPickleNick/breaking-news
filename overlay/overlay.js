// ========================
// Overlay config (from URL)
// ========================
function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 1;
  return Math.max(0, Math.min(1, x));
}

function applyConfigFromUrl() {
  const url = new URL(window.location.href);
  const p = url.searchParams;

  const headerText = p.get("header");
  if (headerTextEl && headerText) headerTextEl.textContent = headerText;

  const font = p.get("font");
  if (font) document.documentElement.style.fontFamily = font;

  // Colors (hex + alpha)
  const headerBg = p.get("hbg");
  const headerBgA = clamp01(p.get("hbgA"));
  if (headerBg && barEl) {
    const c = hexToRgb(headerBg);
    if (c) headerEl.style.background = `rgba(${c.r}, ${c.g}, ${c.b}, ${headerBgA})`;
  }

  const barBg = p.get("bbg");
  const barBgA = clamp01(p.get("bbgA"));
  if (barBg && barEl) {
    const c = hexToRgb(barBg);
    if (c) barEl.style.background = `rgba(${c.r}, ${c.g}, ${c.b}, ${barBgA})`;
  }

  const txt = p.get("txt");
  const txtA = clamp01(p.get("txtA"));
  if (txt && tickerTextEl) {
    const c = hexToRgb(txt);
    if (c) tickerTextEl.style.color = `rgba(${c.r}, ${c.g}, ${c.b}, ${txtA})`;
  }

  const htxt = p.get("htxt");
  const htxtA = clamp01(p.get("htxtA"));
  if (htxt && headerTextEl) {
    const c = hexToRgb(htxt);
    if (c) headerTextEl.style.color = `rgba(${c.r}, ${c.g}, ${c.b}, ${htxtA})`;
  }
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
const STREAMERBOT_WS_URL = "ws://127.0.0.1:8080"; // change if needed

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
 * - durationMs > 0: after duration, hide bar AND clear text
 * - durationMs <= 0 or missing: indefinite
 */
function scheduleAutoHide(durationMs) {
  clearAutoHide();

  const ms = Number(durationMs);
  if (Number.isFinite(ms) && ms > 0) {
    hideTimer = setTimeout(() => {
      // REQUIRED: hide AND clear text on timeout
      setBarVisible(false);
      setTickerText("");
      hideTimer = null;
    }, ms);
  }
}

// Hide on load
setBarVisible(false);
setTickerText("");

// Apply appearance config from URL params
applyConfigFromUrl();

// ========================
// WebSocket connect
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
    // v1.0.4 broadcast does not require subscription handshake
    // (messages arrive via WebsocketBroadcastJson)
  };

  ws.onmessage = (evt) => {
    let msg;
    try {
      msg = JSON.parse(evt.data);
    } catch {
      return;
    }

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
        // When manually hidden, also clear + cancel timers (prevents stale state)
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
