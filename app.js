(async function(){
  const chunks=[];
  for(let i=0;i<4;i++){
    const r=await fetch("./app.b64."+i+".txt");
    if(!r.ok) throw new Error("Missing app.b64."+i+".txt");
    chunks.push(await r.text());
  }
  const text = new TextDecoder().decode(Uint8Array.from(atob(chunks.join("")), c => c.charCodeAt(0)));
  (0, eval)(text);
})().catch(e => {
  console.error(e);
  document.body.insertAdjacentHTML("beforeend", "<pre style=\"color:red;padding:1rem\">"+e.message+"</pre>");
});
