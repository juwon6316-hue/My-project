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

  window.PRAYERS.sunday = { label: "예배 묵상 기도", greeting: "이번 주 말씀을 따라 드리는 기도", items: [], closing: "" };
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
    $("sermon").hidden = mode !== "sunday";
    $("edit").hidden = mode === "sunday";
    if (mode === "sunday") loadWeek();
    var p = window.PRAYERS[mode];
    document.body.className = mode === "evening" ? "evening" : "morning";
    $("icon").textContent = mode === "morning" ? "☀️" : mode === "evening" ? "🌙" : "🙏";
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
    ["morning", "evening", "sunday"].forEach(function (m) {
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

  // ---- 예배 묵상 기도 (AI) ----
  function weekKey() {
    var d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return "sermon:" + d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function loadWeek() {
    var raw = store.get(weekKey()), w = null;
    try { w = raw ? JSON.parse(raw) : null; } catch (e) {}
    $("sm-title").value = w ? w.title || "" : "";
    $("sm-notes").value = w ? w.notes || "" : "";
    window.PRAYERS.sunday.items = w ? w.items || [] : [];
    window.PRAYERS.sunday.closing = w ? w.closing || "" : "";
    $("sm-status").textContent = w && w.items && w.items.length ? "이번 주에 만든 기도문이에요." : "";
    $("sm-settings").open = !store.get("geminiKey");
    $("sm-key").value = "";
  }
  $("sm-keysave").addEventListener("click", function () {
    var k = $("sm-key").value.trim();
    if (!k) return;
    store.set("geminiKey", k); $("sm-key").value = ""; $("sm-settings").open = false;
    $("sm-status").textContent = "키를 저장했어요.";
  });
  $("sm-keydel").addEventListener("click", function () {
    try { localStorage.removeItem("geminiKey"); } catch (e) {}
    $("sm-status").textContent = "키를 삭제했어요.";
  });
  $("sm-clear").addEventListener("click", function () {
    try { localStorage.removeItem(weekKey()); } catch (e) {}
    loadWeek(); render("sunday");
  });
  var PROMPT = "당신은 교회 예배 후 묵상을 돕는 기도 동반자입니다. 아래 설교 필기를 바탕으로 한국어 묵상 기도문을 써 주세요.\n" +
    "규칙:\n- 필기에 없는 성경 구절이나 사실을 지어내지 말고, 필기의 내용과 본문에 충실하세요.\n" +
    "- 따뜻하고 경건한 1인칭 기도체(\"~하소서\", \"~합니다\")로 쓰세요.\n" +
    "- 4~5개 단락으로 나누고, 각 단락은 '제목 한 줄' 다음에 2~4줄의 기도 내용을 쓰세요. 단락 사이는 빈 줄 하나로 구분하세요.\n" +
    "- 흐름: 말씀에 대한 감사 → 말씀 속에서 마음에 새긴 것 → 회개와 결단 → 이번 주 삶의 적용 → 이웃·교회를 위한 기도.\n" +
    "- 마지막에 빈 줄 후 '마무리: '로 시작하는 한 줄(예수님의 이름으로 드리는 문장)을 쓰세요.\n" +
    "- 마크다운 기호(#, *, - 등)와 설명은 쓰지 말고 기도문 본문만 출력하세요.";
  $("sermon").addEventListener("submit", function (e) {
    e.preventDefault();
    var notes = $("sm-notes").value.trim(), title = $("sm-title").value.trim(), key = store.get("geminiKey");
    var st = $("sm-status"), btn = $("sm-go");
    if (!notes) { st.textContent = "설교 필기를 먼저 적어 주세요."; return; }
    if (!key) { st.textContent = "아래 'AI 연결 설정'에서 Gemini API 키를 먼저 저장해 주세요."; $("sm-settings").open = true; return; }
    btn.disabled = true; st.textContent = "기도문을 만드는 중이에요… (10~30초)";
    fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + encodeURIComponent(key), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PROMPT }] },
        contents: [{ role: "user", parts: [{ text: (title ? "설교 제목·본문: " + title + "\n\n" : "") + "설교 필기:\n" + notes }] }],
        generationConfig: { maxOutputTokens: 2500, temperature: 0.8 }
      })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) {
          var msg = (j && j.error && j.error.message) || ("오류 " + r.status);
          if (r.status === 400 || r.status === 403) msg = "API 키가 올바르지 않아요. 키를 다시 확인해 주세요.";
          if (r.status === 429) msg = "오늘 무료 사용량을 다 썼거나 요청이 너무 많아요. 잠시 뒤 다시 시도해 주세요.";
          throw new Error(msg);
        }
        return j;
      });
    }).then(function (j) {
      var parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
      var text = parts.map(function (b) { return b.text || ""; }).join("").trim();
      var closing = "", m = text.match(/\n?\s*마무리:\s*([^\n]+)\s*$/);
      if (m) { closing = m[1].trim(); text = text.slice(0, m.index).trim(); }
      var items = parseText(text);
      if (!items.length) throw new Error("기도문을 받지 못했어요. 다시 시도해 주세요.");
      store.set(weekKey(), JSON.stringify({ title: title, notes: notes, items: items, closing: closing }));
      window.PRAYERS.sunday.items = items; window.PRAYERS.sunday.closing = closing;
      render("sunday");
      $("sm-status").textContent = "기도문을 만들었어요. 아래에서 읽어 보세요.";
    }).catch(function (err) {
      st.textContent = "만들지 못했어요: " + (err && err.message ? err.message : "네트워크를 확인해 주세요.");
    }).then(function () { btn.disabled = false; });
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
