(function () {
  var $ = function (id) { return document.getElementById(id); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  function defaultMode() {
    var h = new Date().getHours();
    return (h >= 5 && h < 15) ? "morning" : "evening"; // 5시~15시 아침, 그 외 저녁
  }

  var DEFAULTS = JSON.parse(JSON.stringify(window.PRAYERS));
  var current = "morning";

  function loadCustom() {
    var raw = store.get("customPrayers");
    if (!raw) return;
    try {
      var c = JSON.parse(raw);
      ["morning", "evening"].forEach(function (m) {
        if (c[m] && c[m].items && c[m].items.length) {
          window.PRAYERS[m].items = c[m].items;
          if (typeof c[m].closing === "string") window.PRAYERS[m].closing = c[m].closing;
        }
      });
    } catch (e) {}
  }
  function saveCustom() {
    var out = {};
    ["morning", "evening"].forEach(function (m) {
      out[m] = { items: window.PRAYERS[m].items, closing: window.PRAYERS[m].closing };
    });
    store.set("customPrayers", JSON.stringify(out));
  }
  function toText(items) {
    return items.map(function (it) { return it.title + "\n" + it.body.join("\n"); }).join("\n\n");
  }
  function parseText(t) {
    return t.split(/\n\s*\n/).map(function (blk) {
      var lines = blk.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
      return lines.length ? { title: lines[0], body: lines.slice(1) } : null;
    }).filter(Boolean);
  }

  function render(mode) {
    current = mode;
    $("editor").hidden = true;
    var p = window.PRAYERS[mode];
    document.body.className = mode;
    $("icon").textContent = mode === "morning" ? "☀️" : "🌙";
    $("title").textContent = p.label;
    $("greeting").textContent = p.greeting;
    $("closing").textContent = p.closing;
    var box = $("prayer");
    box.textContent = "";
    p.items.forEach(function (it) {
      var s = document.createElement("section");
      var h = document.createElement("h2");
      h.textContent = it.title;
      s.appendChild(h);
      it.body.forEach(function (t) {
        var para = document.createElement("p");
        para.textContent = t;
        s.appendChild(para);
      });
      box.appendChild(s);
    });
    ["morning", "evening"].forEach(function (m) {
      $("tab-" + m).setAttribute("aria-selected", m === mode ? "true" : "false");
    });
    document.querySelector('meta[name="theme-color"]').content = mode === "morning" ? "#fff8ec" : "#1c2438";
    window.scrollTo(0, 0);
  }

  document.querySelectorAll(".tabs button").forEach(function (b) {
    b.addEventListener("click", function () { render(b.dataset.mode); });
  });

  $("edit").addEventListener("click", function () {
    var p = window.PRAYERS[current];
    $("ed-label").textContent = p.label + " 내용";
    $("ed-body").value = toText(p.items);
    $("ed-closing").value = p.closing;
    $("editor").hidden = false;
    $("ed-body").focus();
  });
  $("ed-cancel").addEventListener("click", function () { $("editor").hidden = true; });
  $("ed-reset").addEventListener("click", function () {
    var d = DEFAULTS[current];
    $("ed-body").value = toText(d.items);
    $("ed-closing").value = d.closing;
  });
  $("editor").addEventListener("submit", function (e) {
    e.preventDefault();
    var items = parseText($("ed-body").value);
    if (!items.length) { $("ed-body").focus(); return; }
    window.PRAYERS[current].items = items;
    window.PRAYERS[current].closing = $("ed-closing").value.trim();
    saveCustom();
    render(current);
  });

  var fs = parseInt(store.get("fs"), 10) || 19;
  function setFs(n) {
    fs = Math.max(14, Math.min(34, n));
    document.documentElement.style.setProperty("--fs", fs + "px");
    store.set("fs", fs);
  }
  $("smaller").addEventListener("click", function () { setFs(fs - 2); });
  $("larger").addEventListener("click", function () { setFs(fs + 2); });
  setFs(fs);

  loadCustom();
  render(defaultMode());
  if ("serviceWorker" in navigator) { navigator.serviceWorker.register("sw.js").catch(function () {}); }
})();
