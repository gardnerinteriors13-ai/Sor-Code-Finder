(async function () {
  try {
    const parts = [];
    for (let i = 0; i < 5; i++) {
      const res = await fetch("./app.part" + i + ".js");
      if (!res.ok) throw new Error("Missing app.part" + i + ".js (" + res.status + ")");
      parts.push(await res.text());
    }
    (0, eval)(parts.join(""));
  } catch (err) {
    console.error(err);
    const pre = document.createElement("pre");
    pre.style.cssText = "color:#c00;padding:1rem;white-space:pre-wrap";
    pre.textContent = "App failed to load: " + err.message;
    document.body.appendChild(pre);
  }
})();
