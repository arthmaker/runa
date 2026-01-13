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

// Very small Indonesian stopword set (lightweight; deterministic)
const STOPWORDS = new Set([
  "yang","dan","di","ke","dari","pada","untuk","dengan","atau","ini","itu","sebagai",
  "dalam","oleh","jadi","agar","karena","saat","ketika","lebih","baru","mulai","akan",
  "para","bagi","jadi","pun","nya","sebuah","dapat","juga","tanpa","hingga","tahun",
  "awal","cara","pemain","kasino","online","memaknai"
]);

function normalizeSpaces(s){
  return String(s || "").replace(/\s+/g, " ").trim();
}

function slugify(input){
  const s = normalizeSpaces(input).toLowerCase();
  // replace non alnum with space, then collapse to hyphen
  const cleaned = s
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function slugFromTitle(title, maxChars){
  const t = String(title || "");
  const cut = t.slice(0, Math.max(1, maxChars || 50));
  return slugify(cut) || "artikel";
}

function joinUrl(base, path){
  const b = (base || "").trim();
  if(!b) return path;
  if(b.endsWith("/") && path.startsWith("/")) return b + path.slice(1);
  if(!b.endsWith("/") && !path.startsWith("/")) return b + "/" + path;
  return b + path;
}

// Pick 3 "important" keywords (deterministic heuristic)
function pickKeywords(title, k=3){
  const raw = normalizeSpaces(title).toLowerCase();
  const words = raw
    .split(" ")
    .map(w => w.replace(/[^a-z0-9]/g, ""))
    .filter(w => w.length >= 3);

  const seen = new Set();
  const candidates = [];

  for(const w of words){
    if(seen.has(w)) continue;
    seen.add(w);
    if(STOPWORDS.has(w)) continue;
    candidates.push(w);
  }

  // If too few, fall back to non-stopwords then to any words
  let out = candidates.slice(0, k);
  if(out.length < k){
    const more = words.filter(w => !out.includes(w));
    for(const w of more){
      if(out.length >= k) break;
      if(!STOPWORDS.has(w) && w.length >= 2) out.push(w);
    }
  }
  if(out.length < k){
    const more = words.filter(w => !out.includes(w));
    for(const w of more){
      if(out.length >= k) break;
      out.push(w);
    }
  }

  return out.slice(0, k).join(" ").trim() || "keyword";
}

function makeAnchor(baseUrl, slug, suffix, anchorText){
  const href = joinUrl(baseUrl, slug + (suffix || ""));
  return `<a href="${href}">${anchorText}</a>`;
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

function generateAnchors(){
  const titles = lines($("tTitles").value);
  if(!titles.length){
    setStatus("bad", "ERROR: Daftar judul kosong.");
    return;
  }

  const baseUrl = $("baseUrl").value.trim();
  const suffix = $("suffix").value;
  const maxChars = parseInt($("maxChars").value, 10) || 50;

  const anchors = [];
  for(const t of titles){
    const slug = slugFromTitle(t, maxChars);
    const kw = pickKeywords(t, 3);
    anchors.push(makeAnchor(baseUrl, slug, suffix, kw));
  }

  $("outAnchor").value = anchors.join("\n");
  setStatus("ok", `Sukses: ${titles.length} anchor dibuat. Klik 'Ambil Link dari Anchor' untuk output link.`);
}

function extractLinks(){
  const text = $("outAnchor").value || "";
  if(!text.trim()){
    setStatus("bad", "ERROR: Output anchor masih kosong.");
    return;
  }

  // extract href="..."
  const hrefs = [];
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m;
  while((m = re.exec(text)) !== null){
    hrefs.push(m[1]);
  }
  if(!hrefs.length){
    setStatus("bad", "ERROR: Tidak menemukan href di anchor.");
    return;
  }

  $("outLinks").value = hrefs.join("\n");
  setStatus("ok", `Sukses: ${hrefs.length} link diambil dari anchor.`);
}

$("btnMakeAnchor").addEventListener("click", generateAnchors);
$("btnExtract").addEventListener("click", extractLinks);

$("btnClear").addEventListener("click", ()=>{
  $("tTitles").value = "";
  $("outAnchor").value = "";
  $("outLinks").value = "";
  setStatus("idle", "Reset selesai.");
});

$("copyAnchor").addEventListener("click", async ()=>{
  await copyText($("outAnchor"));
  setStatus("ok", "Anchor dicopy.");
});
$("copyLinks").addEventListener("click", async ()=>{
  await copyText($("outLinks"));
  setStatus("ok", "Link dicopy.");
});

// initial
setStatus("idle", "Masukkan judul, lalu klik Generate Anchor Text.");
