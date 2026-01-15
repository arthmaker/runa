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

  const loadSaved = () => {
    const d = localStorage.getItem(KEY_DOMAIN);
    const b = localStorage.getItem(KEY_BASE);
    const e = localStorage.getItem(KEY_EXT);
    if(d && getEl("imgDomain")) getEl("imgDomain").value = d;
    if(b && getEl("imgBaseName")) getEl("imgBaseName").value = b;
    if(e && getEl("imgExt")) getEl("imgExt").value = e;
  };

  const saveNow = () => {
    if(getEl("imgDomain")) localStorage.setItem(KEY_DOMAIN, getEl("imgDomain").value || "");
    if(getEl("imgBaseName")) localStorage.setItem(KEY_BASE, getEl("imgBaseName").value || "");
    if(getEl("imgExt")) localStorage.setItem(KEY_EXT, getEl("imgExt").value || "");
  };

  for(const id of ["imgDomain","imgBaseName","imgExt"]){
    const el = getEl(id);
    if(el) el.addEventListener("input", saveNow);
  }

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
})();
