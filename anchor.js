const $ = (id) => document.getElementById(id);

function setStatus(type, msg){
  const el = $("tStatus");
  el.className = `status ${type}`;
  el.textContent = msg;
}

function lines(text){
  return String(text || "")
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

function slugify(input){
  // Simple slugify for Indonesian/Latin titles
  return String(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function joinUrl(base, path){
  const b = String(base || "").trim();
  const p = String(path || "").trim();
  if(!b) return p;
  if(!p) return b;
  const b2 = b.endsWith("/") ? b : b + "/";
  return b2 + (p.startsWith("/") ? p.slice(1) : p);
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

function generate(){
  const titles = lines($("tTitles").value);
  if(!titles.length){
    setStatus("bad", "ERROR: Daftar judul kosong.");
    return;
  }

  const baseUrl = $("baseUrl").value.trim();
  const suffix = $("suffix").value;
  const imgBase = $("imgBase").value.trim();
  const imgExt = $("imgExt").value;

  const anchors = [];
  const links = [];
  const images = [];

  for(const t of titles){
    anchors.push(t);
    const slug = slugify(t) || "artikel";
    links.push(joinUrl(baseUrl, slug + (suffix || "")));
    images.push(joinUrl(imgBase, slug + (imgExt || "")));
  }

  $("outAnchor").value = anchors.join("\n");
  $("outLinks").value = links.join("\n");
  $("outImages").value = images.join("\n");
  setStatus("ok", `Sukses: ${titles.length} baris dibuat.`);
}

$("btnMake").addEventListener("click", generate);

$("btnClear").addEventListener("click", ()=>{
  $("tTitles").value = "";
  $("outAnchor").value = "";
  $("outLinks").value = "";
  $("outImages").value = "";
  setStatus("idle", "Reset selesai.");
});

$("copyAnchor").addEventListener("click", async ()=>{
  await copyText($("outAnchor"));
  setStatus("ok", "Anchor text dicopy.");
});
$("copyLinks").addEventListener("click", async ()=>{
  await copyText($("outLinks"));
  setStatus("ok", "Link artikel dicopy.");
});
$("copyImages").addEventListener("click", async ()=>{
  await copyText($("outImages"));
  setStatus("ok", "Link gambar dicopy.");
});

// initial
setStatus("idle", "Masukkan judul, lalu klik Generate Output.");
