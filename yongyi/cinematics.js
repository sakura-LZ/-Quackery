/* ============================================================
   庸医觉醒系统 · Cinematics Engine
   纯原生 JS，无依赖。为现有游戏引擎提供：
   - 自定义光标 / 电影颗粒 / 神经粒子背景
   - 磁吸按钮 / 卡片 3D 倾斜 / 入场淡入
   - 三处情节动画：playBoot（开场）· twist（转折）· climax（高潮）
   全部对 window.GameAudio / game.js 判空，安全降级。
   ============================================================ */
(function () {
  "use strict";

  var reduce = (typeof window !== "undefined") && window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var el = {};
  var ready = false;
  var cursor = { x: 0, y: 0, tx: 0, ty: 0, ring: null, dot: null };
  var bg = { ctx: null, parts: [], raf: 0 };

  /* ---------------- 懒初始化 ---------------- */
  function ensure() {
    if (ready) return;
    ready = true;
    el.intro = document.getElementById("cin-intro");
    el.twist = document.getElementById("cin-twist");
    el.climax = document.getElementById("cin-climax");
    el.bg = document.getElementById("cin-bg");
    el.grain = document.getElementById("cin-grain");
    if (!reduce) { initCursor(); initBg(); }
    initMagnetic();
    initTilt();
    initReveal();
  }

  /* ---------------- 自定义光标 ---------------- */
  function initCursor() {
    if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    var c = document.createElement("div");
    c.className = "cin-cursor";
    c.innerHTML = '<span class="ring"></span><span class="dot"></span>';
    document.body.appendChild(c);
    cursor.ring = c.querySelector(".ring");
    cursor.dot = c.querySelector(".dot");
    cursor.node = c;
    window.addEventListener("mousemove", function (e) {
      cursor.x = e.clientX; cursor.y = e.clientY;
      cursor.tx = e.clientX; cursor.ty = e.clientY;
      if (c.classList.contains("is-hidden")) c.classList.remove("is-hidden");
    });
    window.addEventListener("mousedown", function () { c.classList.add("is-down"); });
    window.addEventListener("mouseup", function () { c.classList.remove("is-down"); });
    document.addEventListener("mouseleave", function () { c.classList.add("is-hidden"); });
    var live = document.querySelectorAll("a, button, .department-item, .choice-button, .candidate-button, .ghost-button");
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest("a, button, .department-item, .choice-button, .candidate-button")) c.classList.add("is-hover");
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest("a, button, .department-item, .choice-button, .candidate-button")) c.classList.remove("is-hover");
    });
    (function loop() {
      cursor.tx += (cursor.x - cursor.tx) * 0.18;
      cursor.ty += (cursor.y - cursor.ty) * 0.18;
      c.style.transform = "translate(" + cursor.tx + "px," + cursor.ty + "px)";
      requestAnimationFrame(loop);
    })();
  }

  /* ---------------- 神经粒子背景 ---------------- */
  function initBg() {
    if (!el.bg) return;
    var cv = el.bg, ctx = cv.getContext("2d");
    bg.ctx = ctx;
    function resize() {
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
      build();
    }
    function build() {
      var n = Math.min(90, Math.floor(window.innerWidth * window.innerHeight / 22000));
      bg.parts = [];
      for (var i = 0; i < n; i++) {
        bg.parts.push({
          x: Math.random() * cv.width, y: Math.random() * cv.height,
          vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
          r: Math.random() * 1.6 + 0.6
        });
      }
    }
    window.addEventListener("resize", resize);
    resize();

    var t = 0;
    function draw() {
      t += 0.006;
      ctx.clearRect(0, 0, cv.width, cv.height);
      var ps = bg.parts;
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > cv.width) p.vx *= -1;
        if (p.y < 0 || p.y > cv.height) p.vy *= -1;
        // 轻微随呼吸上浮
        var py = p.y + Math.sin(t + p.x * 0.01) * 4;
        ctx.beginPath();
        ctx.arc(p.x, py, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(70,230,207,0.55)";
        ctx.fill();
        for (var j = i + 1; j < ps.length; j++) {
          var q = ps[j];
          var dx = p.x - q.x, dy = py - q.y;
          var d = dx * dx + dy * dy;
          if (d < 15000) {
            var a = (1 - d / 15000) * 0.16;
            ctx.strokeStyle = "rgba(116,240,224," + a + ")";
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(p.x, py);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
      bg.raf = requestAnimationFrame(draw);
    }
    draw();
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { cancelAnimationFrame(bg.raf); }
      else { draw(); }
    });
  }

  /* ---------------- 磁吸按钮 ---------------- */
  function initMagnetic() {
    if (reduce) return;
    var sels = ".primary-button, .choice-button, .candidate-button, .ghost-button, .cin-enter";
    var nodes = document.querySelectorAll(sels);
    nodes.forEach && nodes.forEach(function (b) {
      if (b._mag) return;
      b._mag = true;
      b.addEventListener("mousemove", function (e) {
        var r = b.getBoundingClientRect();
        var mx = e.clientX - (r.left + r.width / 2);
        var my = e.clientY - (r.top + r.height / 2);
        b.style.transform = "translate(" + (mx * 0.12) + "px," + (my * 0.18) + "px)";
      });
      b.addEventListener("mouseleave", function () { b.style.transform = ""; });
    });
  }

  /* ---------------- 卡片 3D 倾斜 ---------------- */
  function initTilt() {
    if (reduce) return;
    bindTilt(document.querySelectorAll(".stat-card, .skill-item, .candidate-button, .bp-card, .inv-slot.filled"));
  }
  function bindTilt(nodes) {
    nodes.forEach && nodes.forEach(function (n) {
      if (n._tilt) return;
      n._tilt = true;
      n.classList.add("tilt");
      n.addEventListener("mousemove", function (e) {
        var r = n.getBoundingClientRect();
        var rx = (e.clientY - (r.top + r.height / 2)) / r.height * -6;
        var ry = (e.clientX - (r.left + r.width / 2)) / r.width * 6;
        n.style.setProperty("--rx", rx.toFixed(2) + "deg");
        n.style.setProperty("--ry", ry.toFixed(2) + "deg");
      });
      n.addEventListener("mouseleave", function () { n.style.setProperty("--rx", "0deg"); n.style.setProperty("--ry", "0deg"); });
    });
  }
  /* 动态插入的卡片（背包/图鉴）渲染后调用，重新绑定交互 */
  function refresh() { if (!reduce) { initMagnetic(); bindTilt(document.querySelectorAll(".bp-card, .inv-slot.filled")); } }

  /* ---------------- 入场淡入 ---------------- */
  function initReveal() {
    var nodes = document.querySelectorAll(".hero-panel, .stats-grid, .left-rail, .center-stage, .right-rail");
    nodes.forEach && nodes.forEach(function (n, i) {
      n.classList.add("reveal");
      setTimeout(function () { n.classList.add("is-in"); }, 120 + i * 90);
    });
  }

  /* ============================================================
     一、开场动画（开始游戏时）
     ============================================================ */
  function playBoot(text, onDone) {
    ensure();
    var box = el.intro;
    if (!box) { if (onDone) onDone(); return; }
    var inner = box.querySelector(".cin-intro-inner");
    inner.innerHTML =
      '<div class="cin-boot-readout"><span>庸医觉醒系统 // BOOTING</span>' +
        '<span class="cin-boot-bar"><i></i></span><span class="cin-boot-pct">0%</span></div>' +
      '<div class="cin-title-wrap">' +
        '<h1 class="cin-title"><span class="glitch" data-text="庸医觉醒系统"><span>庸</span><span>医</span><span>觉</span><span>醒</span><span>系</span><span>统</span></span></h1>' +
        '<div class="cin-title-stamp" aria-hidden="true">庸<br/>医<br/>印</div>' +
      '</div>' +
      '<div class="cin-subtitle">CLINICAL REAWAKENING SYSTEM</div>' +
      '<div class="cin-chat"></div>' +
      '<button class="cin-enter" type="button">接入系统 <span class="ar">▸</span></button>' +
      '<button class="cin-skip" type="button">跳过 SKIP</button>';

    var bar = inner.querySelector(".cin-boot-bar i");
    var pct = inner.querySelector(".cin-boot-pct");
    var title = inner.querySelector(".cin-title");
    var sub = inner.querySelector(".cin-subtitle");
    var chat = inner.querySelector(".cin-chat");
    var bubbles = buildPrologueBubbles(text);
    var enter = inner.querySelector(".cin-enter");
    var skip = inner.querySelector(".cin-skip");

    box.classList.add("is-active");
    if (window.GameAudio) window.GameAudio.trigger && window.GameAudio.trigger("intro_enter");

    var done = false;
    function finish() {
      if (done) return; done = true;
      box.classList.add("is-out");
      setTimeout(function () {
        box.classList.remove("is-active", "is-out");
        box.style.visibility = "hidden";
        if (onDone) onDone();
      }, 700);
    }
    enter.addEventListener("click", finish);
    skip.addEventListener("click", function () { skipType(); });

    // 阶段一：开机进度
    bar.style.transition = "width 1.4s linear";
    requestAnimationFrame(function () { bar.style.width = "100%"; });
    var p0 = performance.now();
    (function tick() {
      var k = Math.min(1, (performance.now() - p0) / 1400);
      pct.textContent = Math.round(k * 100) + "%";
      if (k < 1) requestAnimationFrame(tick);
    })();

    var goPhase2 = function () {
      title.classList.add("is-in");
      sub.classList.add("is-in");
      setTimeout(goPhase3, reduce ? 200 : 850);
    };
    setTimeout(goPhase2, reduce ? 200 : 1450);

    // 阶段三：序章以「头像对话气泡」呈现（主角 + 系统）
    var CHIBI = { lin: "assets/chibi/lin.png", system: "assets/chibi/system.png" };
    function goPhase3() {
      renderBubbles();
      if (reduce) { fillBubbles(); enter.classList.add("is-in"); return; }
      typeBubbles(bubbles, 0, function () { enter.classList.add("is-in"); });
    }
    var skipped = false;
    function skipType() {
      skipped = true;
      if (!chat.children.length) renderBubbles();
      fillBubbles();
      enter.classList.add("is-in");
    }
    function fillBubbles() {
      bubbles.forEach(function (b) {
        if (b._txt) { b._txt._twGen = -1; b._txt.textContent = b.lines.join(" ").replace(/[「」]/g, ""); }
      });
    }
    function renderBubbles() {
      chat.innerHTML = "";
      bubbles.forEach(function (b) {
        var el = document.createElement("div");
        el.className = "cin-bubble " + (b.system ? "cin-bubble--system" : "cin-bubble--self");
        var av = document.createElement("div");
        av.className = "cin-bubble-avatar";
        var url = b.system ? CHIBI.system : CHIBI.lin;
        fillImgOrSvg(av, url, b.system ? fbChibiSystem() : fbChibiSelf());
        var body = document.createElement("div");
        body.className = "cin-bubble-body";
        var name = document.createElement("div");
        name.className = "cin-bubble-name";
        name.textContent = b.system ? "系统" : "林一通";
        var txt = document.createElement("p");
        txt.className = "cin-bubble-text";
        body.appendChild(name); body.appendChild(txt);
        el.appendChild(av); el.appendChild(body);
        chat.appendChild(el);
        b._txt = txt;
      });
    }
    function typeBubbles(list, i, done) {
      if (i >= list.length) { done && done(); return; }
      var b = list[i], host = b._txt;
      if (!host) { typeBubbles(list, i + 1, done); return; }
      var full = b.lines.join(" ").replace(/[「」]/g, "");
      host.textContent = "";
      var caret = document.createElement("span"); caret.className = "cin-bubble-caret"; host.appendChild(caret);
      var gen = ++twGen; host._twGen = gen;
      var idx = 0;
      (function step() {
        if (host._twGen !== gen) return;
        if (skipped) { fillBubbles(); return; }
        if (idx <= full.length) {
          host.textContent = full.slice(0, idx);
          if (idx < full.length) host.appendChild(caret);
          idx++;
          var last = full.charAt(idx - 1);
          setTimeout(step, (last === "。" || last === "」" || last === "，") ? 70 : 18);
        } else {
          setTimeout(function () { if (host._twGen === gen) typeBubbles(list, i + 1, done); }, 200);
        }
      })();
    }
    function buildPrologueBubbles(t) {
      var lines = String(t).split("\n");
      var out = [], cur = null;
      lines.forEach(function (l) {
        if (l.trim() === "") return; // 跳过空行，避免空气泡
        var isSys = l.indexOf("「") >= 0 && l.indexOf("」") >= 0;
        if (!cur || cur.system !== isSys) { cur = { system: isSys, lines: [] }; out.push(cur); }
        cur.lines.push(l);
      });
      return out;
    }
    function fillImgOrSvg(host, url, fallbackSvg) {
      if (!url) { host.innerHTML = fallbackSvg; return; }
      host.innerHTML = '<img src="' + url + '" alt="" />';
      var img = host.querySelector("img");
      if (img) img.onerror = function () { host.innerHTML = fallbackSvg; };
    }
    function fbChibiSelf() {
      return '<svg viewBox="0 0 48 48" width="56" height="56" xmlns="http://www.w3.org/2000/svg" class="art-svg">' +
        '<rect width="48" height="48" fill="#ff7d3b"/>' +
        '<ellipse cx="24" cy="20" rx="9" ry="8" fill="#fce4c8" stroke="#171717" stroke-width="1.6"/>' +
        '<path d="M15 18 Q24 8 33 18 L33 14 Q24 6 15 14 Z" fill="#5a3a22" stroke="#171717" stroke-width="1.4"/>' +
        '<ellipse cx="20" cy="20" rx="1.6" ry="1.9" fill="#171717"/><ellipse cx="28" cy="20" rx="1.6" ry="1.9" fill="#171717"/>' +
        '<path d="M19 27 Q24 31 29 27" stroke="#171717" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="18" cy="26" rx="2" ry="1.5" fill="#e63946" opacity="0.4"/><ellipse cx="30" cy="26" rx="2" ry="1.5" fill="#e63946" opacity="0.4"/>' +
        '</svg>';
    }
    function fbChibiSystem() {
      return '<svg viewBox="0 0 48 48" width="56" height="56" xmlns="http://www.w3.org/2000/svg" class="art-svg">' +
        '<rect width="48" height="48" fill="#3fb98d"/>' +
        '<rect x="14" y="12" width="20" height="24" rx="4" fill="#dff5ee" stroke="#171717" stroke-width="1.6"/>' +
        '<circle cx="20" cy="24" r="2.2" fill="#171717"/><circle cx="28" cy="24" r="2.2" fill="#171717"/>' +
        '<path d="M21 31 Q24 28 27 31" stroke="#171717" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
        '<rect x="10" y="36" width="28" height="4" rx="2" fill="#171717"/></svg>';
    }
  }

  /* ============================================================
     二、情节转折 / 故障（伤患 · 风险翻车）
     ============================================================ */
  function twist(text) {
    ensure();
    var box = el.twist;
    if (!box) return;
    if (reduce) {
      box.innerHTML = '<div class="cin-twist-core"><div class="cin-twist-word" data-text="转折">转折</div></div>';
      box.classList.add("is-fire"); box.style.visibility = "visible"; box.style.opacity = "1";
      setTimeout(function () { box.classList.remove("is-fire"); box.style.visibility = "hidden"; box.style.opacity = "0"; }, 600);
      return;
    }
    box.innerHTML =
      '<div class="cin-twist-core">' +
        '<div class="cin-twist-word" data-text="转折">转折</div>' +
        (text ? '<div class="cin-twist-line">' + escapeHtml(text) + '</div>' : '') +
        '<span class="cin-twist-tag">STORY TWIST</span>' +
      '</div>';
    // 重启动画
    box.classList.remove("is-fire"); void box.offsetWidth; box.classList.add("is-fire");
    setTimeout(function () { box.classList.remove("is-fire"); }, 1300);
    if (window.GameAudio) window.GameAudio.trigger && window.GameAudio.trigger("twist");
  }

  /* ============================================================
     三、高潮 / 觉醒 + 结局
     ============================================================ */
  function climax(kind, data) {
    ensure();
    var box = el.climax;
    if (!box) return;
    data = data || {};
    var tag, word, sub, isEnding = false;

    if (kind === "ending") {
      isEnding = true;
      tag = "ENDING · 结局回声";
      word = escapeHtml(data.title || "结业");
      sub = "庸医觉醒系统 · 六科轮转已完";
      box.style.setProperty("--c-accent", accentColor(data.accent));
    } else {
      tag = "CORE SKILL DRAW";
      word = '<span class="acc">觉醒</span>';
      sub = (data.at === "50%" ? "半程" : "全程") + " · " + escapeHtml(data.dept || "") + " 核心技能接入";
    }

    box.className = "";
    box.innerHTML =
      '<div class="cin-climax-burst"></div>' +
      '<div class="cin-climax-core">' +
        '<div class="cin-climax-tag">' + tag + '</div>' +
        '<div class="cin-climax-word">' + word + '</div>' +
        '<div class="cin-climax-sub">' + sub + '</div>' +
      '</div>';
    if (isEnding) box.classList.add("ending");
    void box.offsetWidth;
    box.classList.add("is-show");
    setTimeout(function () { box.classList.remove("is-show"); }, 2650);
    if (window.GameAudio) window.GameAudio.trigger && window.GameAudio.trigger(kind === "ending" ? ("ending_" + (data.type || "steady")) : "draw_open");
  }

  function accentColor(a) {
    var m = { gold: "#ffd76a", green: "#5ff3c4", blue: "#6ab8ff", amber: "#ffb454", red: "#ff6b6b", gray: "#8a93a6" };
    return m[a] || "#5ff3c4";
  }

  /* ---------------- 技能抽取：发牌入场 ----------------
     在 openSkillModal 渲染完三张候选卡后调用。
     卡片默认正常显示，仅当加上 .is-deal 才播放「发牌」动画。 */
  function drawIntro() {
    ensure();
    var cards = document.querySelectorAll("#candidate-list .candidate-button");
    if (!cards.length) return;
    cards.forEach(function (c, i) {
      c.classList.remove("is-deal");
      c.style.animationDelay = "";
      void c.offsetWidth; /* 强制回流，确保每次重抽都重播 */
      // 等全屏「觉醒」扫描闪光（约 0.9s）退场后，三张牌错峰落到桌面
      c.style.animationDelay = (0.9 + i * 0.17) + "s";
      c.classList.add("is-deal");
    });
  }

  /* 选定某张卡：锁定闪光 + 「已习得」角标。返回后由 game.js 延时关弹窗。 */
  function drawPick(btn) {
    if (!btn) return;
    btn.classList.remove("is-pick");
    void btn.offsetWidth;
    btn.classList.add("is-pick");
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ---------------- 实时叙事打字机（二次元核心交互） ----------------
     用于患者主述 / 分支对话逐字显示。可随时被 finishType() 一键补全。
     尊重 reduced-motion：直接落定全文。 */
  var twEls = [];
  var twGen = 0;
  function typewrite(host, text, opts) {
    opts = opts || {};
    if (!host) return;
    if (reduce || !text) { host.textContent = text || ""; return; }
    text = String(text);
    host.setAttribute("data-tw-text", text);
    var speed = opts.speed || 20;          // 每字毫秒
    var caret = document.createElement("span");
    caret.className = "cin-caret";
    host.textContent = "";
    host.appendChild(caret);
    var gen = ++twGen;
    host._twGen = gen;
    var i = 0;
    twEls.push(host);
    function step() {
      if (!host.isConnected) { var di = twEls.indexOf(host); if (di >= 0) twEls.splice(di, 1); return; }
      if (host._twGen !== gen) return;      // 已被新渲染取消
      if (i <= text.length) {
        host.textContent = text.slice(0, i);
        if (i < text.length) host.appendChild(caret);
        i++;
        var last = text.charAt(i - 1);
        setTimeout(step, speed + (last === "。" || last === "」" || last === "；" ? 90 : 0));
      } else {
        var idx = twEls.indexOf(host); if (idx >= 0) twEls.splice(idx, 1);
      }
    }
    step();
  }

  /* 一键补全所有正在打字的文本（点击患者区可跳过） */
  function finishType() {
    var snapshot = twEls.slice();
    twEls.length = 0;
    snapshot.forEach(function (host) {
      host._twGen = -1;                      // 作废进行中的定时器
      var full = host.getAttribute("data-tw-text") || host.textContent;
      // 全文已在 data-tw-text 中保存；若没有则保留当前已显示内容
      if (host.getAttribute("data-tw-text") != null) host.textContent = host.getAttribute("data-tw-text");
      var c = host.querySelector(".cin-caret"); if (c && c.parentNode) c.parentNode.removeChild(c);
    });
  }

  /* ---------------- 公开接口 ---------------- */
  function init() { ensure(); }

  if (typeof window !== "undefined") {
    window.Cinematics = {
      init: init,
      playBoot: playBoot,
      twist: twist,
      climax: climax,
      drawIntro: drawIntro,
      drawPick: drawPick,
      typewrite: typewrite,
      finishType: finishType,
      refresh: refresh
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensure);
  } else {
    ensure();
  }
})();
