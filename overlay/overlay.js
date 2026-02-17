let anim = null;
let currentDuration = 12;

const header = document.getElementById("header");
const headerText = document.getElementById("headerText");
const logo = document.getElementById("logo");
const viewport = document.getElementById("tickerViewport");
const tickerText = document.getElementById("tickerText");
const sbStatusEl = document.getElementById("sbStatus");
const barEl = document.getElementById("bar");

/* ---------- helpers ---------- */

function clampNum(v,min,max,fallback){
  const n=Number(v);
  if(Number.isNaN(n)) return fallback;
  return Math.max(min,Math.min(max,n));
}

function hexToRgba(hex,opacity){
  const r=parseInt(hex.slice(1,3),16);
  const g=parseInt(hex.slice(3,5),16);
  const b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function hideBar(){ barEl.classList.add("is-hidden"); }
function showBar(){ barEl.classList.remove("is-hidden"); }

function startTicker(durationSeconds){
  if(anim) anim.cancel();

  const vw=viewport.clientWidth;
  const tw=tickerText.scrollWidth;

  const startX=vw;
  const endX=-tw;

  const durMs=clampNum(durationSeconds,4,120,12)*1000;

  tickerText.style.transform=`translateX(${startX}px)`;

  anim=tickerText.animate(
    [
      {transform:`translateX(${startX}px)`},
      {transform:`translateX(${endX}px)`}
    ],
    {duration:durMs,iterations:Infinity,easing:"linear"}
  );
}

/* ---------- apply state ---------- */

function applyState(state){

  headerText.textContent = state.lt || "";
  tickerText.textContent = state.msg || " ";

  header.classList.toggle("pulse", state.p === "1");

  document.documentElement.style.setProperty(
    "--header-bg",
    hexToRgba(state.lc || "#cc0000", state.lo || 1)
  );

  document.documentElement.style.setProperty(
    "--ticker-bg",
    hexToRgba(state.tc || "#111111", state.to || .9)
  );

  document.documentElement.style.setProperty(
    "--text-color",
    hexToRgba(state.xc || "#ffffff", state.xo || 1)
  );

  if(state.lu){
    logo.src=state.lu;
    logo.style.display="block";
  }

  if(state.logo){
    logo.src=state.logo;
    logo.style.display="block";
  }

  const size=clampNum(state.ls,20,120,54);
  logo.style.height=`${size}px`;

  currentDuration = clampNum(state.sd,4,120,12);

  requestAnimationFrame(()=>startTicker(currentDuration));
}

/* ---------- query ---------- */

function hasMeaningfulQueryConfig(){
  const q=new URLSearchParams(window.location.search);
  return q.has("lt") || q.has("msg");
}

function stateFromQuery(){
  const q=new URLSearchParams(window.location.search);

  return{
    lt:q.get("lt"),
    msg:q.get("msg"),
    p:q.get("p"),
    lc:q.get("lc"),
    lo:q.get("lo"),
    tc:q.get("tc"),
    to:q.get("to"),
    xc:q.get("xc"),
    xo:q.get("xo"),
    sd:q.get("sd"),
    ls:q.get("ls"),
    lu:q.get("lu")
  };
}

/* ---------- websocket ---------- */

let socket;

function showDisconnected(){
  sbStatusEl.className="sb-status sb-disconnected";
  sbStatusEl.textContent="Disconnected...";
}

function showConnected(){
  sbStatusEl.className="sb-status sb-connected";
  sbStatusEl.textContent="Connected!";

  setTimeout(()=>{
    sbStatusEl.classList.add("sb-hidden");
  },2000);
}

function connect(){
  socket=new WebSocket("ws://127.0.0.1:8080");

  socket.onopen=showConnected;
  socket.onclose=showDisconnected;
  socket.onerror=showDisconnected;
}

/* ---------- messaging ---------- */

window.addEventListener("message",(e)=>{
  const d=e.data;

  if(d.type==="update"){
    applyState({
      lt:d.labelText,
      msg:d.message,
      p:d.pulse?"1":"0",
      lc:d.labelColor,
      lo:d.labelOpacity,
      tc:d.tickerBgColor,
      to:d.tickerBgOpacity,
      xc:d.textColor,
      xo:d.textOpacity,
      sd:d.scrollDuration,
      ls:d.logoSize,
      lu:d.logoUrl,
      logo:d.logo
    });

    showBar();
  }
});

/* ---------- init ---------- */

hideBar();

if(hasMeaningfulQueryConfig()){
  applyState(stateFromQuery());
  showBar();
}else{
  startTicker(12);
}

showDisconnected();
connect();
