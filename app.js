document.addEventListener("DOMContentLoaded", function () {
  var gate = document.getElementById("authGate");
  var shell = document.getElementById("appShell");
  if (shell) shell.hidden = true;
  if (!gate) return;
  gate.hidden = false;
  gate.innerHTML =
    '<div class="auth-card" style="max-width:540px">' +
    '<p class="eyebrow">Temporary notice</p>' +
    '<h1>One file needs replacing</h1>' +
    '<p class="subtitle">A large update broke <strong>app.js</strong>. You do not need to edit any code.</p>' +
    '<ol style="line-height:1.6;color:#243a31">' +
    '<li>Download the fix zip from the chat (SOR_FIX_UPLOAD.zip)</li>' +
    '<li>Open <a href="https://github.com/gardnerinteriors13-ai/Sor-Code-Finder" target="_blank" rel="noopener">your GitHub repo</a></li>' +
    '<li>Click <strong>Add file</strong> → <strong>Upload files</strong></li>' +
    '<li>Drag in <strong>app.js</strong> (and the other files if you like)</li>' +
    '<li>Click <strong>Commit changes</strong></li>' +
    '</ol>' +
    '<p>After that, refresh this page. Password: <code>healthyhomes</code></p>' +
    '</div>';
});
