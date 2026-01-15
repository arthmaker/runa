const $ = (id) => document.getElementById(id);

function setStatus(type, msg){
  const el = $("tStatus");
  if(!el) return;
  el.className = `status ${type}`;
  el.textContent = msg;
}

function logDebug(message){
  const logEl = $("debugLog");
  if(!logEl) return;
  const current = logEl.value ? `${logEl.value}\n` : "";
  logEl.value = `${current}${message}`;
  logEl.scrollTop = logEl.scrollHeight;
}

function lines(text){
  return String(text || "")
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

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

  let cut = full.lastIndexOf("-", limit);
  if (cut < 15) cut = limit;

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

const STOPWORDS_ID = new Set([
  "di","ke","dari","dan","yang","untuk","dengan","pada","dalam","oleh",
  "awal","tahun","fase","periode","menjadi","sebagai","terhadap",
  "bagaimana","mengapa","apa","ketika","saat"
]);

const PRIORITY_KEYWORDS = [
  "mahjongways","kasino","online","rtp","scatter","server","bonus","pola","jam","login"
];

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
    const position = Math.max(0, 20 - index);
    return 10 + boost + position;
  };

  const rankedTokens = titleTokens
    .map((word, index) => ({ word, score: tokenScore(word, index) }))
    .filter(({ word }) => isWordAllowed(word))
    .sort((a, b) => b.score - a.score)
    .map(({ word }) => word);

  let bestPhrase = [];
  let bestScore = -1;

  for(let i = 0; i < titleTokens.length - 1; i += 1){
    const first = titleTokens[i];
    const second = titleTokens[i + 1];
    if(!isWordAllowed(first) || !isWordAllowed(second)) continue;
    const score = tokenScore(first, i) + tokenScore(second, i + 1);
    if(score > bestScore){
      bestScore = score;
      bestPhrase = [first, second];
    }
  }

  const out = bestPhrase.length ? [...bestPhrase] : [];

  if(titleSet.has("mahjongways") && !out.includes("mahjongways")){
    out.push("mahjongways");
  }

  for(const word of words){
    if(word.length < 4) continue;
    if(STOPWORDS_ID.has(word)) continue;
    keywords.push(word);
  }

  if(out.length < minWords){
    for(const t of rankedTokens){
      if(!out.includes(t)) out.push(t);
      if(out.length >= minWords) break;
    }
  }

  const priorityIndex = new Map(PRIORITY_KEYWORDS.map((word, index) => [word, index]));
  unique.sort((a, b) => {
    const pa = priorityIndex.has(a) ? priorityIndex.get(a) : 99;
    const pb = priorityIndex.has(b) ? priorityIndex.get(b) : 99;
    if(pa === pb) return 0;
    return pa - pb;
  });

  const trimmed = unique.slice(0, maxWords);
  if(trimmed.length < minWords) return trimmed;
  return trimmed.slice(0, maxWords);
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
  const re = /href\s*=\s*["']([^"']+)["']/i;
  for(const a of anchorLines){
    const m = re.exec(a);
    if(m && m[1]) out.push(m[1].trim());
  }
  return out;
}

function generateAnchors(){
  const titleEl = $("tTitles");
  const baseUrlEl = $("baseUrl");
  if(!titleEl || !baseUrlEl){
    setStatus("bad", "ERROR: Form anchor tidak lengkap.");
    return;
  }
  const titles = lines(titleEl.value);
  if(!titles.length){
    setStatus("bad", "ERROR: Daftar judul kosong.");
    logDebug("ERROR: Daftar judul kosong.");
    return;
  }

  const baseUrl = baseUrlEl.value.trim();
  const suffix = $("suffix")?.value;
  const slugLimit = $("slugLimit")?.value;

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
    setStatus("bad", `ERROR: ${err?.message || "Gagal generate anchor."}`);
  }
}

function extractLinks(){
  const outAnchorEl = $("outAnchor");
  if(!outAnchorEl){
    setStatus("bad", "ERROR: Output anchor tidak ditemukan.");
    return;
  }
  const anchorList = lines(outAnchorEl.value);
  if(!anchorList.length){
    setStatus("bad", "ERROR: Output anchor masih kosong.");
    logDebug("ERROR: Output anchor masih kosong.");
    return;
  }
}

$("btnMakeAnchor")?.addEventListener("click", generateAnchors);
$("btnExtractLink")?.addEventListener("click", extractLinks);

$("btnClear")?.addEventListener("click", ()=>{
  if($("tTitles")) $("tTitles").value = "";
  if($("outAnchor")) $("outAnchor").value = "";
  if($("outLinks")) $("outLinks").value = "";
  setStatus("idle", "Reset selesai.");
});

$("copyAnchor")?.addEventListener("click", async ()=>{
  if(!$("outAnchor")) return;
  await copyText($("outAnchor"));
  setStatus("ok", "Anchor text dicopy.");
});

$("copyLinks")?.addEventListener("click", async ()=>{
  if(!$("outLinks")) return;
  await copyText($("outLinks"));
  setStatus("ok", "Link dicopy.");
});

setStatus("idle", "Tempel daftar judul → Generate Anchor Text → Ambil Link dari Anchor.");
logDebug("Log siap.");
