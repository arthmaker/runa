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

const STOPWORDS_LOCAL = new Set([
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

function extractAdaptiveKeywords(title, count = 3) {
  // Menghasilkan 3 keyword utama yang adaptif (tidak monoton seperti "mahjongways kasino online")
  // Prinsip: ambil 1 kata inti (topik), 1 kata pemicu/parameter (mis. scatter/rtp/server/bet), 1 kata hasil/tujuan (maxwin/profit/modal/dll)
  // Output: array string panjang = count

  const STOPWORDS2 = new Set([
    "yang","dan","di","ke","dari","untuk","pada","dengan","tanpa","agar","sebagai","dalam","oleh","atau",
    "ini","itu","terhadap","guna","demi","lebih","paling","secara","khas","khusus","versi","sisi","cara",
    "mengenai","tentang","atas","bagi","para","sebuah","hingga","kapan","bagaimana","mengapa","apa",
    "pemula","pemain","member","pro","profesional","master","legenda","kasino","online" // sengaja: "online" stopword
  ]);

  const GENERIC = new Set([
    "analisis","kajian","studi","pembahasan","mengulas","membedah","menyoroti","evaluasi","pendekatan",
    "framework","rangkuman","panduan","strategi","metode","teknik","tinjauan","penjelasan","sistematis",
    "objektif","teknis","profesional","rasional","terukur","adaptif","praktis"
  ]);

  // Kata yang biasanya bernilai informasi tinggi di niche MahjongWays
  const PRIORITY = new Map([
    ["mahjongways", 8],
    ["scatter", 10], ["hitam", 10], ["full", 7], ["super", 6], ["golden", 6],
    ["rtp", 9], ["live", 4], ["volatilitas", 8], ["rng", 8],
    ["server", 9], ["thailand", 6], ["vietnam", 6], ["kamboja", 6], ["srilanka", 6],
    ["jam", 7], ["reset", 8], ["peak", 6], ["hour", 6], ["time", 5], ["window", 5],
    ["bet", 9], ["betting", 8], ["modal", 9], ["saldo", 8], ["drawdown", 9],
    ["stop", 7], ["loss", 8], ["take", 7], ["profit", 8],
    ["bonus", 8], ["cashback", 8], ["rebate", 8], ["withdraw", 8], ["wagering", 8], ["rollover", 8],
    ["maxwin", 10], ["maximal", 6], ["win", 6], ["x100", 7], ["x1000", 9]
  ]);

  const txt = (title || "").toString().trim();
  if (!txt) return ["mahjongways", "scatter", "hitam"].slice(0, count);

  // Normalisasi
  const normalized = txt
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\(\)/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")   // buang tanda baca kecuali dash
    .replace(/\s+/g, " ")
    .trim();

  // Tangkap multiplier seperti 5x, x1000, 4x, 10 menit, dll
  const mult = [];
  for (const m of normalized.matchAll(/\b(\d{1,4}x|x\d{1,4})\b/g)) mult.push(m[1]);
  for (const m of normalized.matchAll(/\b(\d{1,3})\s*menit\b/g)) mult.push(`${m[1]}menit`);
  for (const m of normalized.matchAll(/\b(\d{1,4})\s*spin\b/g)) mult.push(`${m[1]}spin`);

  const rawTokens = normalized
    .split(/\s+/)
    .filter(Boolean);

  // Token kandidat (hapus stopword, tapi biarkan "mahjongways")
  const tokens = rawTokens.filter(t => {
    if (t === "mahjongways") return true;
    if (STOPWORDS2.has(t)) return false;
    if (t.length < 3) return false;
    return true;
  });

  // Scoring token
  const scores = new Map();
  const seen = new Set();

  function addScore(tok, s) {
    if (!tok) return;
    scores.set(tok, (scores.get(tok) || 0) + s);
  }

  tokens.forEach((t, idx) => {
    if (seen.has(t)) {
      addScore(t, 1); // repetisi sedikit menambah bobot
      return;
    }
    seen.add(t);

    // basis: posisi awal lebih penting
    const posBoost = Math.max(0, 6 - idx); // 6..0
    addScore(t, 2 + posBoost);

    // panjang kata (lebih spesifik biasanya lebih panjang)
    addScore(t, Math.min(6, Math.max(0, t.length - 4)));

    // prioritas niche
    if (PRIORITY.has(t)) addScore(t, PRIORITY.get(t));

    // penalti kata generik
    if (GENERIC.has(t)) addScore(t, -6);

    // angka/multiplier
    if (/^(\d{1,4}x|x\d{1,4}|\d{1,4}spin|\d{1,3}menit)$/.test(t)) addScore(t, 7);
  });

  // Tambahkan multiplier yang terdeteksi (kalau tidak ada sebagai token utama)
  mult.forEach(m => addScore(m, 8));

  // Kandidat bigram penting: "scatter hitam", "rtp live", "jam reset", "server vietnam"
  const bigrams = [];
  for (let i = 0; i < rawTokens.length - 1; i++) {
    const a = rawTokens[i], b = rawTokens[i + 1];
    if (STOPWORDS2.has(a) || STOPWORDS2.has(b)) continue;
    const bg = `${a} ${b}`;
    // bigram prioritas
    if (
      bg === "scatter hitam" ||
      bg === "rtp live" ||
      bg === "jam reset" ||
      bg.startsWith("server ")
    ) {
      bigrams.push(bg);
    }
  }

  // Seleksi 3 keyword: aturan anti-monoton
  // 1) Usahakan selalu memasukkan "mahjongways" jika ada di judul
  const picks = [];

  function pickToken(filterFn) {
    const sorted = [...scores.entries()]
      .filter(([t, s]) => s > 0 && filterFn(t, s))
      .sort((a, b) => b[1] - a[1]);

    for (const [t] of sorted) {
      // hindari duplikasi semantik sederhana (mis. maxwin vs maximal) dan kata generik
      if (picks.includes(t)) continue;
      if (GENERIC.has(t)) continue;
      picks.push(t);
      break;
    }
  }

  // Slot 1: mahjongways (jika ada), kalau tidak ambil top token non-generic
  if (normalized.includes("mahjongways")) picks.push("mahjongways");

  // Slot 2: pemicu/parameter utama (scatter/rtp/server/bet/jam/bonus/rng/volatilitas)
  pickToken(t => ["scatter","hitam","rtp","server","bet","betting","jam","reset","bonus","cashback","rebate","wagering","rollover","rng","volatilitas","drawdown","withdraw","maxwin"].includes(t) || /^(\d{1,4}x|x\d{1,4})$/.test(t));

  // Slot 3: hasil/tujuan (maxwin/profit/modal/withdraw/roi/drawdown/stoploss/takeprofit)
  pickToken(t => ["maxwin","profit","modal","saldo","withdraw","roi","drawdown","stop","loss","take","win","maximal"].includes(t) || /^(\d{1,4}spin|\d{1,3}menit)$/.test(t));

  // Isi sisa slot dengan token skor tertinggi (non-generic, bukan stopword)
  while (picks.length < count) {
    pickToken(() => true);
    if (picks.length === 0) break;
    // jika tidak bertambah (karena filter), hentikan
    if (picks.length >= count) break;
    const before = picks.length;
    if (before === picks.length) break;
  }

  // Jika masih kurang, gunakan bigram yang relevan (dibersihkan jadi 2 kata tapi sebagai satu keyword string)
  if (picks.length < count && bigrams.length) {
    for (const bg of bigrams) {
      if (picks.includes(bg)) continue;
      picks.push(bg);
      if (picks.length >= count) break;
    }
  }

  // Final fallback
  const fallback = ["mahjongways", "scatter", "hitam"];
  while (picks.length < count) {
    const v = fallback[picks.length] || fallback[fallback.length - 1];
    if (!picks.includes(v)) picks.push(v);
    else picks.push(v + "1");
  }

  return picks.slice(0, count);
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
  const outAnchorEl = $("outAnchor");

  if(!titleEl || !baseUrlEl || !outAnchorEl){
    setStatus("bad", "ERROR: Form anchor tidak lengkap.");
    return;
  }

  const titles = lines(titleEl.value);
  if(!titles.length){
    setStatus("bad", "ERROR: Daftar judul kosong.");
    logDebug("ERROR: Daftar judul kosong.");
    return;
  }

  try{
    const baseUrl = baseUrlEl.value.trim();
    const suffix = $("suffix")?.value;
    const slugLimit = $("slugLimit")?.value;

    if(!baseUrl){
      setStatus("bad", "ERROR: Domain / Base URL kosong.");
      return;
    }

    const anchors = titles.map(t => makeAnchor(t, baseUrl, suffix, slugLimit).anchor);
    outAnchorEl.value = anchors.join("\n");
    setStatus("ok", `Sukses: ${titles.length} anchor dibuat. Klik 'Ambil Link dari Anchor' untuk daftar URL.`);
  }catch(err){
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
