/* Grail progress tracker: persists task-list checkboxes per page in localStorage. */
document$.subscribe(function () {
  var key = "grail-progress:" + location.pathname;
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || "{}"); } catch (e) {}

  var boxes = document.querySelectorAll(".md-typeset .task-list-item input[type=checkbox]");
  boxes.forEach(function (box, i) {
    box.disabled = false;
    if (saved[i]) { box.checked = true; }
    box.addEventListener("change", function () {
      saved[i] = box.checked;
      localStorage.setItem(key, JSON.stringify(saved));
    });
  });
});
