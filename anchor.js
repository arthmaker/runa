const $ = (id) => document.getElementById(id);

function setStatus(type, msg){
  const el = $("tStatus");
  if(!el) return;
  el.className = `status ${type}`;
  el.textContent = msg;
}

function lines(text){
  return String(text || "")
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

// ---------- Slug (limit 50 + tolerance +12: only to avoid cutting last word) ----------
function slugify(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bmahjongw\s+ays\b/g, "mahjongways")
    .replace(/&/g, " dan ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function smartSlug(title, limit = 50, tolerance = 12) {
  const full = slugify(title);
  if (!full) return "artikel";
  if (full.length <= limit) return full;

  // cut on word boundary (dash)
  let cut = full.lastIndexOf("-", limit);
  if (cut < 15) cut = limit; // if no dash or too short, fallback

  // extend only if next dash is within tolerance (finish last word)
  const nextDash = full.indexOf("-", limit);
  if (nextDash !== -1 && nextDash - limit <= tolerance) {
    cut = nextDash;
  }

  const out = full.slice(0, cut).replace(/-+$/g, "");
  return out || full.slice(0, limit);
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

// ---------- Keyword selection (adaptive 2–4 words) ----------
function normalizeText(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bmahjongw\s+ays\b/g, "mahjongways")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s){
  return normalizeText(s).split(" ").filter(Boolean);
}

const STOPWORDS_ID = new Set([
  "yang","dan","di","ke","dari","pada","dalam","untuk","dengan","oleh","sebagai","atau",
  "ini","itu","para","lebih","cara","ketika","angka","memaknai","menjadi","bagian",
  "awal","tahun","fase","periode","terhadap","bagaimana","mengapa","apa","saat"
]);

const PRIORITY_KEYWORDS = [
  "mahjongways","kasino","online","rtp","scatter","server","bonus","pola","jam","login"
];

function extractAdaptiveKeywords(title, minWords = 3, maxWords = 3){
  const titleTokens = tokenize(title);
  const primaryMinLength = 3;
  const fallbackMinLength = 2;
  const isWordAllowed = (word, minLength) => word.length >= minLength && !STOPWORDS_ID.has(word);

  let filtered = titleTokens.filter((word) => isWordAllowed(word, primaryMinLength));
  if(filtered.length === 0){
    filtered = titleTokens.filter((word) => isWordAllowed(word, fallbackMinLength));
  }
  const unique = [];
  for(const word of filtered){
    if(!unique.includes(word)) unique.push(word);
  }

  const priorityIndex = new Map(PRIORITY_KEYWORDS.map((word, index) => [word, index]));
  unique.sort((a, b) => {
    const pa = priorityIndex.has(a) ? priorityIndex.get(a) : 99;
    const pb = priorityIndex.has(b) ? priorityIndex.get(b) : 99;
    if(pa === pb) return 0;
    return pa - pb;
  });

  const trimmed = unique.slice(0, maxWords);
  if(trimmed.length >= minWords) return trimmed.slice(0, maxWords);

  const fallback = titleTokens
    .filter((word) => isWordAllowed(word, fallbackMinLength))
    .filter((word, index, arr) => arr.indexOf(word) === index)
    .slice(0, maxWords);
  return fallback.length ? fallback : ["artikel"];
}

function makeAnchor(title, baseUrl, suffix, slugLimit){
  const limit = Number(slugLimit) || 50;
  const slug = smartSlug(title, limit, 12);
  const url = joinUrl(baseUrl, slug + (suffix || ""));
  const keywords = extractAdaptiveKeywords(title, 2, 4).join(" ") || "artikel";
  return { url, anchor: `<a href="${url}">${keywords}</a>` };
}

function extractLinksFromAnchors(anchorLines){
  const out = [];
  const re = /href\s*=\s*"([^"]+)"/i;
  for(const a of anchorLines){
    const m = re.exec(a);
    if(m && m[1]) out.push(m[1].trim());
  }
  return out;
}

function generateAnchors(){
  try{
    const titleEl = $("tTitles");
    const baseUrlEl = $("baseUrl");
    const outAnchorEl = $("outAnchor");
    if(!titleEl || !baseUrlEl || !outAnchorEl){
      setStatus("bad", "ERROR: Form anchor tidak lengkap.");
      return;
    }
    const titles = lines(titleEl.value);
    if(!titles.length){
      setStatus("bad", "ERROR: Daftar judul kosong.");
      return;
    }

    const baseUrl = baseUrlEl.value.trim();
    const suffixEl = $("suffix");
    const slugLimitEl = $("slugLimit");
    const suffix = suffixEl ? suffixEl.value : "";
    const slugLimit = slugLimitEl ? slugLimitEl.value : "";

    if(!baseUrl){
      setStatus("bad", "ERROR: Domain / Base URL kosong.");
      return;
    }

    const anchors = [];
    for(const t of titles){
      anchors.push(makeAnchor(t, baseUrl, suffix, slugLimit).anchor);
    }

    outAnchorEl.value = anchors.join("\n");
    setStatus("ok", `Sukses: ${titles.length} anchor dibuat. Klik 'Ambil Link dari Anchor' untuk daftar URL.`);
  }catch (err){
    const message = err && err.message ? err.message : "Gagal generate anchor.";
    setStatus("bad", `ERROR: ${message}`);
  }
}

function extractLinks(){
  try{
    const outAnchorEl = $("outAnchor");
    const outLinksEl = $("outLinks");
    if(!outAnchorEl || !outLinksEl){
      setStatus("bad", "ERROR: Output anchor tidak ditemukan.");
      return;
    }
    const anchorList = lines(outAnchorEl.value);
    if(!anchorList.length){
      setStatus("bad", "ERROR: Output anchor masih kosong.");
      return;
    }
    const links = extractLinksFromAnchors(anchorList);
    outLinksEl.value = links.join("\n");
    setStatus("ok", `Sukses: ${links.length} link diambil dari href.`);
  }catch (err){
    const message = err && err.message ? err.message : "Gagal ambil link.";
    setStatus("bad", `ERROR: ${message}`);
  }
}

const btnMakeAnchor = $("btnMakeAnchor");
if(btnMakeAnchor) btnMakeAnchor.addEventListener("click", generateAnchors);
const btnExtractLink = $("btnExtractLink");
if(btnExtractLink) btnExtractLink.addEventListener("click", extractLinks);

const btnClear = $("btnClear");
if(btnClear) btnClear.addEventListener("click", ()=>{
  if($("tTitles")) $("tTitles").value = "";
  if($("outAnchor")) $("outAnchor").value = "";
  if($("outLinks")) $("outLinks").value = "";
  setStatus("idle", "Reset selesai.");
});

const copyAnchor = $("copyAnchor");
if(copyAnchor) copyAnchor.addEventListener("click", async ()=>{
  if(!$("outAnchor")) return;
  await copyText($("outAnchor"));
  setStatus("ok", "Anchor text dicopy.");
});

const copyLinks = $("copyLinks");
if(copyLinks) copyLinks.addEventListener("click", async ()=>{
  if(!$("outLinks")) return;
  await copyText($("outLinks"));
  setStatus("ok", "Link dicopy.");
});

setStatus("idle", "Tempel daftar judul → Generate Anchor Text → Ambil Link dari Anchor.");
