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

  function render(mode) {
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

  var fs = parseInt(store.get("fs"), 10) || 19;
  function setFs(n) {
    fs = Math.max(14, Math.min(34, n));
    document.documentElement.style.setProperty("--fs", fs + "px");
    store.set("fs", fs);
  }
  $("smaller").addEventListener("click", function () { setFs(fs - 2); });
  $("larger").addEventListener("click", function () { setFs(fs + 2); });
  setFs(fs);

  render(defaultMode());
})();
