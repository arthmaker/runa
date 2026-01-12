const $=id=>document.getElementById(id);
let template="";
$("templateFile").onchange=async e=>template=await e.target.files[0].text();
$("btnGenerate").onclick=async()=>{
 if(!template){$("status").innerText="Template belum diupload";return;}
 const t=$("titles").value.trim().split(/\n+/);
 const l=$("links").value.trim().split(/\n+/);
 const g=$("images").value.trim().split(/\n+/);
 if(t.length!==l.length||t.length!==g.length){$("status").innerText="Jumlah data tidak sama";return;}
 const zip=new JSZip();
 for(let i=0;i<t.length;i++){
  let out=template.replaceAll($("phTitle").value,t[i])
                  .replaceAll($("phLink").value,l[i])
                  .replaceAll($("phImg").value,g[i]);
  const name=new URL(l[i]).pathname.split("/").pop();
  zip.file(name,out);
 }
 const blob=await zip.generateAsync({type:"blob"});
 saveAs(blob,$("zipName").value);
 $("status").innerText="Sukses";
};
