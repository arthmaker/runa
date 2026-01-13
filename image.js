const $ = (id) => document.getElementById(id);

const LS_KEYS = {
  domain: "runa_img_domain",
  base: "runa_img_base",
  ext: "runa_img_ext",
};

function setStatus(type, msg){
  const el = $("sStatus");
  el.className = `status ${type}`;
  el.textContent = msg;
}

function normDomain(d){
  let s = String(d || "").trim();
  if(!s) return "";
  if(!/https?:\/\//i.test(s)) s = "https://" + s;
  if(!s.endsWith("/")) s += "/";
  return s;
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

function loadSaved(){
  const d = localStorage.getItem(LS_KEYS.domain) || "";
  const b = localStorage.getItem(LS_KEYS.base) || "";
  const e = localStorage.getItem(LS_KEYS.ext) || ".webp";
  $("imgDomain").value = d;
  $("imgBaseName").value = b;
  $("imgExt").value = e;
}

function saveInputs(){
  const d = normDomain($("imgDomain").value);
  const b = $("imgBaseName").value.trim();
  const e = $("imgExt").value.trim() || ".webp";

  if(!d || !b){
    setStatus("bad", "ERROR: Domain dan nama file wajib diisi sebelum save.");
    return;
  }

  localStorage.setItem(LS_KEYS.domain, d);
  localStorage.setItem(LS_KEYS.base, b);
  localStorage.setItem(LS_KEYS.ext, e);
  $("imgDomain").value = d;
  $("imgExt").value = e;
  setStatus("ok", "Input tersimpan (localStorage).");
}

function generate10(){
  const d = normDomain($("imgDomain").value);
  const b = $("imgBaseName").value.trim();
  const e = $("imgExt").value.trim() || ".webp";

  if(!d || !b){
    setStatus("bad", "ERROR: Domain dan nama file wajib diisi.");
    return;
  }

  const out = [];
  for(let i=1;i<=10;i++){
    out.push(`${d}${b}${i}${e}`);
  }
  $("outImages").value = out.join("\n");
  setStatus("ok", "Sukses: 10 link gambar dibuat.");
}

function resetAll(){
  $("imgDomain").value = "";
  $("imgBaseName").value = "";
  $("imgExt").value = ".webp";
  $("outImages").value = "";
  setStatus("idle", "Reset selesai.");
}

$("btnSave").addEventListener("click", saveInputs);
$("btnGenerate").addEventListener("click", generate10);
$("btnReset").addEventListener("click", resetAll);
$("btnCopy").addEventListener("click", async ()=>{
  if(!($("outImages").value || "").trim()){
    setStatus("bad", "ERROR: Output masih kosong.");
    return;
  }
  await copyText($("outImages"));
  setStatus("ok", "Hasil dicopy.");
});

// init
loadSaved();
setStatus("idle", "Isi 3 box, klik Save (opsional), lalu Generate.");
