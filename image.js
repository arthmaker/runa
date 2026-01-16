(() => {
  const getEl = (id) => document.getElementById(id);

  const setStatus = (type, msg) => {
    const el = getEl("imgStatus");
    if(!el) return;
    el.className = `status ${type}`;
    el.textContent = msg;
  };

  const ensureTrailingSlash = (url) => {
    const u = String(url || "").trim();
    if(!u) return "";
    return u.endsWith("/") ? u : u + "/";
  };

  // ---------- Text helpers ----------
  const lines = (text) => String(text || "")
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);

  const slugify = (s) => (s || "")
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

  // Cut slug to 50 chars, but try not to cut the last word.
  const smartSlug = (title, limit = 50, tolerance = 12) => {
    const full = slugify(title);
    if(!full) return "artikel";
    if(full.length <= limit) return full;

    let cut = full.lastIndexOf("-", limit);
    if(cut < 10) cut = limit;

    // If next dash is very close, extend a bit to keep the last word.
    const nextDash = full.indexOf("-", limit);
    if(nextDash !== -1 && nextDash - limit <= tolerance){
      cut = nextDash;
    }

    const out = full.slice(0, cut).replace(/-+$/g, "");
    return out || full.slice(0, limit);
  };

  const joinUrl = (base, path) => {
    const b = ensureTrailingSlash(base);
    const p = String(path || "").trim();
    if(!b) return p;
    if(!p) return b;
    return b + (p.startsWith("/") ? p.slice(1) : p);
  };

  // Stopwords (Indonesian) + fillers commonly found in titles.
  const STOPWORDS = new Set([
    "yang","dan","di","ke","dari","pada","dalam","untuk","dengan","oleh","sebagai","atau",
    "ini","itu","para","lebih","cara","ketika","saat","jadi","menjadi","kembali","mulai",
    "tak","lagi","bukan","hanya","juga","agar","karena","hingga","disebut","dinilai","berbasis",
    "awal","tahun","pemain","komunitas","temuan","ungkapan","mengungkap","alasan","respons","ritme",
    "sebuah","tentang","dari","pada","dalam","antara","serta","dengan","tanpa","baru","terbaru",
  ]);

  const normalizeTokens = (text) => (text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bmahjongw\s+ays\b/g, "mahjongways")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  const pickTopKeywords = (titles, k = 2) => {
    const freq = new Map();
    for(const t of titles){
      for(const w of normalizeTokens(t)){
        if(w === "mahjongways") continue;
        if(w.length < 3) continue;
        if(STOPWORDS.has(w)) continue;
        freq.set(w, (freq.get(w) || 0) + 1);
      }
    }
    const ranked = [...freq.entries()]
      .sort((a,b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
      .slice(0, k)
      .map(([w]) => w);
    return ranked;
  };

  const copyText = (el) => {
    const v = el.value || "";
    if(navigator.clipboard && typeof navigator.clipboard.writeText === "function"){
      return navigator.clipboard.writeText(v);
    }
    el.focus();
    el.select();
    document.execCommand("copy");
    return Promise.resolve();
  };

  // ---------- Persist inputs (auto-save) ----------
  const KEY_DOMAIN = "runa_img_domain";
  const KEY_BASE = "runa_img_base";
  const KEY_EXT = "runa_img_ext";

  const KEY_LINK_DOMAIN = "runa_link_domain";
  const KEY_LINK_TITLES = "runa_link_titles";

  const loadSaved = () => {
    const d = localStorage.getItem(KEY_DOMAIN);
    const b = localStorage.getItem(KEY_BASE);
    const e = localStorage.getItem(KEY_EXT);
    if(d && getEl("imgDomain")) getEl("imgDomain").value = d;
    if(b && getEl("imgBaseName")) getEl("imgBaseName").value = b;
    if(e && getEl("imgExt")) getEl("imgExt").value = e;

    const ld = localStorage.getItem(KEY_LINK_DOMAIN);
    const lt = localStorage.getItem(KEY_LINK_TITLES);
    if(ld && getEl("linkDomain")) getEl("linkDomain").value = ld;
    if(lt && getEl("linkTitles")) getEl("linkTitles").value = lt;
  };

  const saveNow = () => {
    if(getEl("imgDomain")) localStorage.setItem(KEY_DOMAIN, getEl("imgDomain").value || "");
    if(getEl("imgBaseName")) localStorage.setItem(KEY_BASE, getEl("imgBaseName").value || "");
    if(getEl("imgExt")) localStorage.setItem(KEY_EXT, getEl("imgExt").value || "");

    if(getEl("linkDomain")) localStorage.setItem(KEY_LINK_DOMAIN, getEl("linkDomain").value || "");
    if(getEl("linkTitles")) localStorage.setItem(KEY_LINK_TITLES, getEl("linkTitles").value || "");
  };

  for(const id of ["imgDomain","imgBaseName","imgExt"]){
    const el = getEl(id);
    if(el) el.addEventListener("input", saveNow);
  }

  for(const id of ["linkDomain","linkTitles"]){
    const el = getEl(id);
    if(el) el.addEventListener("input", saveNow);
  }

  // ---------- Link + Anchor from titles ----------
  const setLinkStatus = (type, msg) => {
    const el = getEl("linkStatus");
    if(!el) return;
    el.className = `status ${type}`;
    el.textContent = msg;
  };

  const setKwHint = (kw1, kw2) => {
    const el = getEl("kwHint");
    if(!el) return;
    if(!kw1 && !kw2){
      el.textContent = "";
      return;
    }
    el.innerHTML = `Keyword global terpilih (selain <strong>MahjongWays</strong>): <strong>${kw1 || "-"}</strong> &nbsp;•&nbsp; <strong>${kw2 || "-"}</strong>`;
  };

  const generateLinksAndAnchors = (mode = "links") => {
    const domainRaw = getEl("linkDomain")?.value;
    const domain = ensureTrailingSlash(domainRaw);
    const titles = lines(getEl("linkTitles")?.value);

    if(!domain){
      setLinkStatus("bad", "ERROR: Domain kosong.");
      return;
    }
    if(!titles.length){
      setLinkStatus("bad", "ERROR: Daftar judul kosong.");
      return;
    }

    saveNow();

    const [kw1, kw2] = pickTopKeywords(titles, 2);
    setKwHint(kw1, kw2);

    const links = titles.map(t => joinUrl(domain, smartSlug(t, 50, 12) + ".html"));
    if(getEl("outLinks")) getEl("outLinks").value = links.join("\n");

    const anchorText = (link) => {
      const parts = ["MahjongWays", kw1, kw2].filter(Boolean);
      return `<a href="${link}">${parts.join(" ")}</a>`;
    };
    const anchors = links.map(anchorText);
    if(getEl("outAnchors")) getEl("outAnchors").value = anchors.join("\n");

    if(mode === "links"){
      setLinkStatus("ok", `Sukses: ${links.length} link dibuat.`);
    } else {
      setLinkStatus("ok", `Sukses: ${anchors.length} anchor dibuat (format <a href=...>).`);
    }
  };

  getEl("btnGenLinks")?.addEventListener("click", () => generateLinksAndAnchors("links"));
  getEl("btnGenAnchors")?.addEventListener("click", () => generateLinksAndAnchors("anchors"));

  getEl("btnResetLinks")?.addEventListener("click", () => {
    if(getEl("linkDomain")) getEl("linkDomain").value = "";
    if(getEl("linkTitles")) getEl("linkTitles").value = "";
    if(getEl("outLinks")) getEl("outLinks").value = "";
    if(getEl("outAnchors")) getEl("outAnchors").value = "";
    localStorage.removeItem(KEY_LINK_DOMAIN);
    localStorage.removeItem(KEY_LINK_TITLES);
    setKwHint("", "");
    setLinkStatus("idle", "Reset selesai.");
  });

  getEl("btnCopyLinks")?.addEventListener("click", async () => {
    if(!getEl("outLinks")) return;
    await copyText(getEl("outLinks"));
    setLinkStatus("ok", "Daftar link dicopy.");
  });

  getEl("btnCopyAnchors")?.addEventListener("click", async () => {
    if(!getEl("outAnchors")) return;
    await copyText(getEl("outAnchors"));
    setLinkStatus("ok", "Daftar anchor dicopy.");
  });

  const generate = () => {
    const domain = ensureTrailingSlash(getEl("imgDomain")?.value);
    const base = String(getEl("imgBaseName")?.value || "").trim();
    const ext = String(getEl("imgExt")?.value || "").trim();

    if(!domain || !base || !ext){
      setStatus("bad", "ERROR: Semua box wajib diisi (domain, nama file, format)." );
      return;
    }

    saveNow();

    const out = [];
    for(let i=1; i<=10; i++){
      out.push(`${domain}${base}${i}${ext}`);
    }
    if(getEl("out")) getEl("out").value = out.join("\n");
    setStatus("ok", "Sukses: 10 link dibuat. Klik Copy Hasil.");
  };

  getEl("btnGenerate")?.addEventListener("click", generate);

  getEl("btnReset")?.addEventListener("click", () => {
    if(getEl("imgDomain")) getEl("imgDomain").value = "";
    if(getEl("imgBaseName")) getEl("imgBaseName").value = "";
    if(getEl("imgExt")) getEl("imgExt").value = "";
    if(getEl("out")) getEl("out").value = "";
    localStorage.removeItem(KEY_DOMAIN);
    localStorage.removeItem(KEY_BASE);
    localStorage.removeItem(KEY_EXT);
    setStatus("idle", "Reset selesai.");
  });

  getEl("btnCopy")?.addEventListener("click", async () => {
    if(!getEl("out")) return;
    await copyText(getEl("out"));
    setStatus("ok", "Hasil dicopy.");
  });

  loadSaved();
  setStatus("idle", "Isi 3 box → klik Generate.");
  if(getEl("linkStatus")) setLinkStatus("idle", "Isi domain + judul → generate.");
})();
