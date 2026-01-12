/* global JSZip, saveAs */
const $ = (id) => document.getElementById(id);

let templateText = "";
let templateName = "";

function setStatus(type, msg){
  const el = $("status");
  el.className = `status ${type}`;
  el.textContent = msg;
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (m)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}
function report(items){
  const wrap = $("report");
  wrap.innerHTML = "";
  for(const it of items){
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<div class="k">${escapeHtml(it.k)}</div><div class="v">${it.v}</div>`;
    wrap.appendChild(div);
  }
}
function lines(text){
  return text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
}
function filenameFromLink(url){
  try{
    const u = new URL(url);
    const path = u.pathname.split("/").filter(Boolean);
    let base = path[path.length-1] || "artikel.html";
    if(!base.toLowerCase().endsWith(".html")) base += ".html";
    base = base.replace(/[\\/:*?"<>|]+/g, "-");
    return base;
  }catch{
    return "artikel.html";
  }
}

// Integrity masking helpers
function maskTemplateWithTokens(text, phTitle, phLink, phImg){
  return text.split(phTitle).join("__PH_TITLE__")
             .split(phLink).join("__PH_LINK__")
             .split(phImg).join("__PH_IMG__");
}
function maskOutputToTokens(text, title, link, img){
  return text.split(title).join("__PH_TITLE__")
             .split(link).join("__PH_LINK__")
             .split(img).join("__PH_IMG__");
}

async function loadTemplate(file){
  templateText = await file.text();
  templateName = file.name || "template.html";
  $("tplMeta").textContent = `${templateName} • ${templateText.length.toLocaleString()} karakter`;
  setStatus("ok", "Template dimuat. Silakan isi data.");
  report([{k:"Template loaded", v:`<code>${escapeHtml(templateName)}</code>`}]);
}

$("templateFile").addEventListener("change", async (e)=>{
  const f = e.target.files?.[0];
  if(!f) return;
  await loadTemplate(f);
});

// drag & drop
const dz = $("dropzone");
dz.addEventListener("dragover", (e)=>{ e.preventDefault(); dz.style.borderColor="rgba(59,130,246,.75)"; });
dz.addEventListener("dragleave", ()=>{ dz.style.borderColor="rgba(255,255,255,.22)"; });
dz.addEventListener("drop", async (e)=>{
  e.preventDefault();
  dz.style.borderColor="rgba(255,255,255,.22)";
  const f = e.dataTransfer?.files?.[0];
  if(f) await loadTemplate(f);
});

$("btnReset").addEventListener("click", ()=>{
  templateText = ""; templateName = "";
  $("templateFile").value = "";
  $("tplMeta").textContent = "Belum dimuat";
  $("titles").value = "";
  $("links").value = "";
  $("images").value = "";
  $("zipName").value = "artikel-output.zip";
  $("phTitle").value = "*JUDUL*";
  $("phLink").value = "*LINK*";
  $("phImg").value = "*GAMBAR*";
  $("chkStrict").checked = true;
  $("chkNameFromLink").checked = true;
  setStatus("idle", "Reset selesai.");
  report([]);
});

$("btnLoadSample").addEventListener("click", ()=>{
  $("titles").value = ["Judul Contoh 1","Judul Contoh 2"].join("\n");
  $("links").value  = ["https://example.com/fyp/contoh-1.html","https://example.com/fyp/contoh-2.html"].join("\n");
  $("images").value = ["https://example.com/img/1.webp","https://example.com/img/2.webp"].join("\n");
  setStatus("warn", "Contoh data terisi. Ganti dengan data asli.");
  report([{k:"Sample", v:"Data contoh sudah diisi."}]);
});

function validateBasics(){
  if(!templateText){
    setStatus("bad", "ERROR: Template belum di-upload.");
    return { ok:false };
  }
  const phTitle = $("phTitle").value;
  const phLink  = $("phLink").value;
  const phImg   = $("phImg").value;
  if(!phTitle || !phLink || !phImg){
    setStatus("bad", "ERROR: Placeholder tidak boleh kosong.");
    return { ok:false };
  }
  const missing = [];
  if(!templateText.includes(phTitle)) missing.push(phTitle);
  if(!templateText.includes(phLink))  missing.push(phLink);
  if(!templateText.includes(phImg))   missing.push(phImg);
  if(missing.length){
    setStatus("bad", `ERROR: Placeholder tidak ditemukan di template: ${missing.join(", ")}`);
    report([{k:"Placeholder missing", v:`<code>${escapeHtml(missing.join(", "))}</code>`}]);
    return { ok:false };
  }

  const arrTitle = lines($("titles").value);
  const arrLink  = lines($("links").value);
  const arrImg   = lines($("images").value);
  const n = Math.max(arrTitle.length, arrLink.length, arrImg.length);

  if(n === 0){
    setStatus("bad", "ERROR: Data kosong. Isi minimal 1 baris.");
    return { ok:false };
  }
  if(arrTitle.length !== n || arrLink.length !== n || arrImg.length !== n){
    setStatus("bad", `ERROR: Jumlah baris tidak sama. Judul=${arrTitle.length}, Link=${arrLink.length}, Gambar=${arrImg.length}`);
    report([{k:"Jumlah baris", v:`Judul=<code>${arrTitle.length}</code>, Link=<code>${arrLink.length}</code>, Gambar=<code>${arrImg.length}</code>`}]);
    return { ok:false };
  }

  return { ok:true, phTitle, phLink, phImg, arrTitle, arrLink, arrImg, n };
}

function buildOutputs(payload){
  const { phTitle, phLink, phImg, arrTitle, arrLink, arrImg, n } = payload;
  const strict = $("chkStrict").checked;
  const nameFromLink = $("chkNameFromLink").checked;

  const templateMasked = maskTemplateWithTokens(templateText, phTitle, phLink, phImg);
  const outputs = [];
  const integrityErrors = [];
  const nameSet = new Set();

  for(let i=0;i<n;i++){
    const title = arrTitle[i], link = arrLink[i], img = arrImg[i];

    let out = templateText
      .split(phTitle).join(title)
      .split(phLink).join(link)
      .split(phImg).join(img);

    if(strict){
      const outMasked = maskOutputToTokens(out, title, link, img);
      if(outMasked !== templateMasked){
        integrityErrors.push({i:i+1, reason:"Integrity mismatch (ada perubahan selain placeholder)"});
      }
    }

    let fname = "artikel.html";
    if(nameFromLink) fname = filenameFromLink(link);
    // de-dup
    if(nameSet.has(fname)){
      const base = fname.replace(/\.html$/i,"");
      fname = `${base}-${i+1}.html`;
    }
    nameSet.add(fname);

    outputs.push({ fname, out });
  }

  return { outputs, integrityErrors };
}

$("btnGenerate").addEventListener("click", async ()=>{
  try{
    const v = validateBasics();
    if(!v.ok) return;

    const { outputs, integrityErrors } = buildOutputs(v);

    if(integrityErrors.length){
      setStatus("bad", `ERROR: Integrity check gagal pada ${integrityErrors.length} file. ZIP dibatalkan.`);
      report([
        {k:"Integrity check", v:`Gagal pada: <code>${integrityErrors.map(e=>`#${e.i}`).join(", ")}</code>`},
        {k:"Saran", v:`Gunakan placeholder yang lebih unik (mis. <code>{{JUDUL}}</code>) dan pastikan template hanya berisi placeholder itu.`}
      ]);
      return;
    }

    let zipName = $("zipName").value.trim() || "artikel-output.zip";
    if(!zipName.toLowerCase().endsWith(".zip")) zipName += ".zip";

    const zip = new JSZip();
    for(const f of outputs){
      zip.file(f.fname, f.out);
    }

    setStatus("ok", `Sukses: ${outputs.length} file dibuat. Menyiapkan ZIP...`);
    report([
      {k:"Output", v:`${outputs.length} file HTML`},
      {k:"ZIP", v:`<code>${escapeHtml(zipName)}</code>`},
      {k:"Nama file", v:`${$("chkNameFromLink").checked ? "Mengikuti LINK" : "Default artikel.html (dedup otomatis)"}`}
    ]);

    const blob = await zip.generateAsync({type:"blob"});
    saveAs(blob, zipName);
  }catch(err){
    setStatus("bad", `ERROR: ${err?.message || String(err)}`);
    report([{k:"Exception", v:`<code>${escapeHtml(err?.stack || String(err))}</code>`}]);
  }
});

$("btnPreview").addEventListener("click", ()=>{
  const v = validateBasics();
  if(!v.ok) return;

  const { outputs, integrityErrors } = buildOutputs(v);
  if($("chkStrict").checked && integrityErrors.length){
    setStatus("bad", `ERROR: Integrity check gagal pada ${integrityErrors.length} file. Preview dibatalkan.`);
    report([{k:"Integrity check", v:`Gagal pada: <code>${integrityErrors.map(e=>`#${e.i}`).join(", ")}</code>`}]);
    return;
  }

  const first = outputs[0];
  const blob = new Blob([first.out], {type:"text/html"});
  const url = URL.createObjectURL(blob);

  $("previewName").textContent = first.fname;
  $("previewFrame").src = url;

  const modal = $("modal");
  modal.showModal();
});

$("btnClose").addEventListener("click", ()=>{
  const modal = $("modal");
  const iframe = $("previewFrame");
  try{
    // revoke object URL
    const src = iframe.src;
    iframe.src = "about:blank";
    if(src.startsWith("blob:")) URL.revokeObjectURL(src);
  }catch{}
  modal.close();
});

// initial
setStatus("idle", "Upload template untuk memulai.");
report([
  {k:"Catatan", v:"Gunakan placeholder unik agar aman (mis. <code>{{JUDUL}}</code>, <code>{{LINK}}</code>, <code>{{GAMBAR}}</code>)."}
]);
