// Loads full app from app.js (compat for older Pages index)
(function () {
  var s = document.createElement("script");
  s.src = "app.js";
  s.onerror = function () {
    document.body.insertAdjacentHTML(
      "beforeend",
      "<pre style=\"color:#c00;padding:1rem\">Failed to load app.js — hard refresh or try the CDN link.</pre>"
    );
  };
  document.head.appendChild(s);
})();
