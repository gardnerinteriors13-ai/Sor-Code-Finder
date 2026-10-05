// Loads full app.js from split parts (workaround for large-file upload limits)
(async function loadAppParts() {
  const n = 5;
  const parts = [];
  for (let i = 0; i < n; i++) {
    const res = await fetch("./app.part" + i + ".js");
    if (!res.ok) throw new Error("Failed to load app.part" + i + ".js");
    parts.push(await res.text());
  }
  const code = parts.join("");
  // eslint-disable-next-line no-eval
  (0, eval)(code);
})().catch(err => {
  console.error(err);
  document.body.insertAdjacentHTML("beforeend", "<pre style=\"color:red;padding:1rem\">Failed to load app: " + err.message + "</pre>");
});
