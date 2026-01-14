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
  "awal","tahun","pemain","mulai","membantu","menandai","digunakan","membuka","akses"
]);

const TOKEN_BOOST = {
  mahjongways: 140,
  pgsoft: 100,
  rtp: 95,
  live: 35,
  kasino: 85,
  online: 70,
  ai: 110,
  prediktif: 120,
  analitik: 110,
  lanjutan: 90,
  machine: 100,
  learning: 100,
  big: 90,
  data: 100,
  dashboard: 100,
  real: 80,
  time: 80,
  teknologi: 70,
  bonus: 70,
  scatter: 80,
  hitam: 75,
  server: 70,
  thailand: 75,
  pola: 55,
  menang: 45,
  kemenangan: 40,
  strategi: 35,
  teknik: 35,
  panduan: 40,
  pemula: 40,
  cuan: 45,
  betting: 30,
  taruhan: 30,
  2026: 25,
};

function extractAdaptiveKeywords(title, minWords = 2, maxWords = 4){
  const titleTokens = tokenize(title);
  const titleSet = new Set(titleTokens);

  const isWordAllowed = (word) => word.length >= 2 && !STOPWORDS_ID.has(word);

  const tokenScore = (word, index) => {
    const boost = TOKEN_BOOST[word] || 0;
    const position = Math.max(0, 24 - index);
    return 8 + boost + position;
  };

  const scoredTokens = titleTokens
    .map((word, index) => ({ word, score: tokenScore(word, index), index }))
    .filter(({ word }) => isWordAllowed(word));

  const scoreByWord = new Map();
  for(const token of scoredTokens){
    const current = scoreByWord.get(token.word) || 0;
    if(token.score > current) scoreByWord.set(token.word, token.score);
  }

  const rankedTokens = [...scoredTokens]
    .sort((a, b) => b.score - a.score)
    .map(({ word }) => word);

  let bestWindow = [];
  let bestScore = -1;

  for(let start = 0; start < titleTokens.length; start += 1){
    if(!isWordAllowed(titleTokens[start])) continue;
    for(let end = start; end < Math.min(titleTokens.length, start + maxWords); end += 1){
      const windowTokens = titleTokens.slice(start, end + 1).filter(isWordAllowed);
      if(windowTokens.length < minWords) continue;
      if(windowTokens.length > maxWords) continue;
      const windowScore = windowTokens.reduce((sum, word) => {
        return sum + (scoreByWord.get(word) || 0);
      }, 0) + (windowTokens.includes("mahjongways") ? 50 : 0);

      if(windowScore > bestScore){
        bestScore = windowScore;
        bestWindow = windowTokens;
      }
    }
  }

  const out = bestWindow.length ? [...bestWindow] : [];

  if(titleSet.has("mahjongways") && !out.includes("mahjongways")){
    out.push("mahjongways");
  }

  for(const t of rankedTokens){
    if(out.length >= maxWords) break;
    if(!out.includes(t)) out.push(t);
  }

  return out.slice(0, maxWords);
}

function makeAnchor(title, baseUrl, suffix, slugLimit){
  const limit = Number(slugLimit) || 50;
  const slug = smartSlug(title, limit, 12);
  const url = joinUrl(baseUrl, slug + (suffix || ""));
  const keywords = extractAdaptiveKeywords(title, 2, 4).join(" ");
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
  const titles = lines($("tTitles").value);
  if(!titles.length){
    setStatus("bad", "ERROR: Daftar judul kosong.");
    return;
  }

  const baseUrl = $("baseUrl").value.trim();
  const suffix = $("suffix").value;
  const slugLimit = $("slugLimit").value;

  if(!baseUrl){
    setStatus("bad", "ERROR: Domain / Base URL kosong.");
    return;
  }

  const anchors = [];
  for(const t of titles){
    anchors.push(makeAnchor(t, baseUrl, suffix, slugLimit).anchor);
  }

  $("outAnchor").value = anchors.join("\n");
  setStatus("ok", `Sukses: ${titles.length} anchor dibuat. Klik 'Ambil Link dari Anchor' untuk daftar URL.`);
}

function extractLinks(){
  const anchorList = lines($("outAnchor").value);
  if(!anchorList.length){
    setStatus("bad", "ERROR: Output anchor masih kosong.");
    return;
  }
  const links = extractLinksFromAnchors(anchorList);
  $("outLinks").value = links.join("\n");
  setStatus("ok", `Sukses: ${links.length} link diambil dari href.`);
}

$("btnMakeAnchor").addEventListener("click", generateAnchors);
$("btnExtractLink").addEventListener("click", extractLinks);

$("btnClear").addEventListener("click", ()=>{
  $("tTitles").value = "";
  $("outAnchor").value = "";
  $("outLinks").value = "";
  setStatus("idle", "Reset selesai.");
});

$("copyAnchor").addEventListener("click", async ()=>{
  await copyText($("outAnchor"));
  setStatus("ok", "Anchor text dicopy.");
});

$("copyLinks").addEventListener("click", async ()=>{
  await copyText($("outLinks"));
  setStatus("ok", "Link dicopy.");
});

setStatus("idle", "Tempel daftar judul → Generate Anchor Text → Ambil Link dari Anchor.");
