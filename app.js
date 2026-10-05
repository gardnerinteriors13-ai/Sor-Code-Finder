(async function(){
  const [a,b] = await Promise.all([
    fetch("./app.b64.a.txt").then(r => { if(!r.ok) throw new Error("Missing app.b64.a.txt"); return r.text(); }),
    fetch("./app.b64.b.txt").then(r => { if(!r.ok) throw new Error("Missing app.b64.b.txt"); return r.text(); })
  ]);
  const text = new TextDecoder().decode(Uint8Array.from(atob(a+b), c => c.charCodeAt(0)));
  (0, eval)(text);
})().catch(e => {
  console.error(e);
  document.body.insertAdjacentHTML("beforeend", "<pre style=\"color:red;padding:1rem\">"+e.message+"</pre>");
});
