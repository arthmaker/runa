const $ = (id) => document.getElementById(id);

function setStatus(type, msg){
  const el = $("imgStatus");
  el.className = `status ${type}`;
  el.textContent = msg;
}

function ensureTrailingSlash(url){
  const u = String(url || "").trim();
  if(!u) return "";
  return u.endsWith("/") ? u : u + "/";
}

function copyText(el){
  const v = el.value || "";
  if(navigator.clipboard && typeof navigator.clipboard.writeText === "function"){
    return navigator.clipboard.writeText(v);
  }
  el.focus();
  el.select();
  document.execCommand("copy");
  return Promise.resolve();
}

// ---------- Persist inputs (auto-save) ----------
const KEY_DOMAIN = "runa_img_domain";
const KEY_BASE = "runa_img_base";
const KEY_EXT = "runa_img_ext";

function loadSaved(){
  const d = localStorage.getItem(KEY_DOMAIN);
  const b = localStorage.getItem(KEY_BASE);
  const e = localStorage.getItem(KEY_EXT);
  if(d) $("imgDomain").value = d;
  if(b) $("imgBaseName").value = b;
  if(e) $("imgExt").value = e;
}

function saveNow(){
  localStorage.setItem(KEY_DOMAIN, $("imgDomain").value || "");
  localStorage.setItem(KEY_BASE, $("imgBaseName").value || "");
  localStorage.setItem(KEY_EXT, $("imgExt").value || "");
}

for(const id of ["imgDomain","imgBaseName","imgExt"]){
  $(id).addEventListener("input", saveNow);
}

function generate(){
  const domain = ensureTrailingSlash($("imgDomain").value);
  const base = String($("imgBaseName").value || "").trim();
  const ext = String($("imgExt").value || "").trim();

  if(!domain || !base || !ext){
    setStatus("bad", "ERROR: Semua box wajib diisi (domain, nama file, format)." );
    return;
  }

  saveNow();

  const out = [];
  for(let i=1; i<=10; i++){
    out.push(`${domain}${base}${i}${ext}`);
  }
  $("out").value = out.join("\n");
  setStatus("ok", "Sukses: 10 link dibuat. Klik Copy Hasil.");
}

$("btnGenerate").addEventListener("click", generate);

$("btnReset").addEventListener("click", ()=>{
  $("imgDomain").value = "";
  $("imgBaseName").value = "";
  $("imgExt").value = "";
  $("out").value = "";
  localStorage.removeItem(KEY_DOMAIN);
  localStorage.removeItem(KEY_BASE);
  localStorage.removeItem(KEY_EXT);
  setStatus("idle", "Reset selesai.");
});

$("btnCopy").addEventListener("click", async ()=>{
  await copyText($("out"));
  setStatus("ok", "Hasil dicopy.");
});

loadSaved();
setStatus("idle", "Isi 3 box → klik Generate.");
