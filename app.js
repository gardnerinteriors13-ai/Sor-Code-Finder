(async function(){
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const r = await fetch("./app.b64." + i + ".txt");
    if (!r.ok) throw new Error("Missing app.b64." + i + ".txt");
    parts.push(await r.text());
  }
  const text = new TextDecoder().decode(Uint8Array.from(atob(parts.join("")), c => c.charCodeAt(0)));
  (0, eval)(text);
})().catch(e => {
  console.error(e);
  document.body.insertAdjacentHTML("beforeend", "<pre style=\"color:#c00;padding:1rem\">" + e.message + "</pre>");
});
