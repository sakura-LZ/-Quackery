/* ============================================================
   庸医觉醒系统 · 程序化美术（art.js V2）
   - 6 带教头像（圆脸 + 特征组合）— 零外部依赖，永不失败
   - 6 科室场景缩略图 — 同上（AI 图到位后自动替换）
   - AI 图懒加载：失败时降级为 SVG
   - 对 game.js 零侵入：仅作视觉附加层
   - 注入采用 MutationObserver，应对 game.js 用 innerHTML 重绘容器
   ============================================================ */
(function () {
  "use strict";

  var ASSETS = {
    scenes: {
      internal:   "assets/scenes/internal.png",
      surgery:    "assets/scenes/surgery.png",
      emergency:  "assets/scenes/emergency.png",
      obgyn:      "assets/scenes/obgyn.png",
      pediatrics: "assets/scenes/pediatrics.png",
      urology:    "assets/scenes/urology.png"
    },
    portraits: {
      "周":    "assets/portraits/zhou.png",
      "老唐":  "assets/portraits/laotang.png",
      "大刘":  "assets/portraits/daliu.png",
      "沈":    "assets/portraits/shen.png",
      "小覃":  "assets/portraits/xiaoqin.png",
      "程哥":  "assets/portraits/chengge.png"
    },
    chibi: {
      lin:    "assets/chibi/lin.png",
      system: "assets/chibi/system.png",
      zhou:   "assets/chibi/zhou.png"
    },
    cinematics: {
      pro:    "assets/cinematics/prologue.png",
      twist:  "assets/cinematics/twist.png",
      draw:   "assets/cinematics/draw.png",
      ending: "assets/cinematics/ending.png"
    }
  };

  /* ============================================================
     头像系统 — 程序化 SVG
     ============================================================ */
  var TEACHERS = {
    "周":   { skin: "#fce4c8", hair: "#3a3a3a", hairStyle: "short", glasses: true,  mask: false, accent: "#3fb98d", emotion: "calm" },
    "老唐": { skin: "#f0d4b4", hair: "#222222", hairStyle: "buzz",  glasses: false, mask: false, accent: "#ff7d3b", emotion: "stern" },
    "大刘": { skin: "#fce4c8", hair: "#1a1a1a", hairStyle: "messy", glasses: false, mask: true,  accent: "#e63946", emotion: "tired" },
    "沈":   { skin: "#fbe7d2", hair: "#4a2c1a", hairStyle: "bun",   glasses: false, mask: false, accent: "#a78bfa", emotion: "warm" },
    "小覃": { skin: "#fce4c8", hair: "#2d1810", hairStyle: "long",  glasses: true,  mask: true,  accent: "#ffc857", emotion: "smile" },
    "程哥": { skin: "#e8c098", hair: "#1f1f1f", hairStyle: "side",  glasses: false, mask: false, accent: "#5fb0ff", emotion: "wry" }
  };

  function avatarSVG(name, opts) {
    opts = opts || {};
    var t = (name && typeof name === "object") ? name : (TEACHERS[name] || TEACHERS["周"]);
    var size = opts.size || 60;
    var hairPaths = {
      short: '<path d="M16 28 Q24 14 32 28 L32 22 Q24 10 16 22 Z" fill="' + t.hair + '" stroke="#171717" stroke-width="1.5"/>',
      buzz:  '<path d="M16 24 Q24 18 32 24 L32 19 Q24 14 16 19 Z" fill="' + t.hair + '" stroke="#171717" stroke-width="1.5"/>',
      messy: '<path d="M15 28 Q22 10 33 25 L31 17 Q24 9 17 18 Z M30 12 L36 16 L34 22 Z" fill="' + t.hair + '" stroke="#171717" stroke-width="1.5"/>',
      bun:   '<path d="M16 24 Q24 14 32 24 L32 20 Q24 11 16 20 Z M28 8 Q34 8 34 14 Q34 18 28 18 Q22 18 22 14 Q22 8 28 8 Z" fill="' + t.hair + '" stroke="#171717" stroke-width="1.5"/>',
      long:  '<path d="M16 28 Q22 10 32 28 L33 38 L40 38 L40 22 Q33 8 16 22 Z M8 38 L8 22 Q14 8 16 22 L16 38 Z" fill="' + t.hair + '" stroke="#171717" stroke-width="1.5"/>',
      side:  '<path d="M16 26 Q22 16 32 26 L33 22 L37 26 L37 18 Q22 8 16 18 Z" fill="' + t.hair + '" stroke="#171717" stroke-width="1.5"/>'
    };
    var eyePaths = {
      calm:  '<ellipse cx="22" cy="26" rx="1.5" ry="1.8" fill="#171717"/><ellipse cx="30" cy="26" rx="1.5" ry="1.8" fill="#171717"/>',
      stern: '<path d="M20 26 L24 26 M28 26 L32 26" stroke="#171717" stroke-width="1.6" stroke-linecap="round"/>',
      tired: '<path d="M20 26 Q22 28 24 26 M28 26 Q30 28 32 26" stroke="#171717" stroke-width="1.6" stroke-linecap="round" fill="none"/>',
      warm:  '<ellipse cx="22" cy="26" rx="1.5" ry="1.8" fill="#171717"/><ellipse cx="30" cy="26" rx="1.5" ry="1.8" fill="#171717"/>',
      smile: '<ellipse cx="22" cy="26" rx="1.4" ry="1.7" fill="#171717"/><ellipse cx="30" cy="26" rx="1.4" ry="1.7" fill="#171717"/>',
      wry:   '<ellipse cx="22" cy="26" rx="1.5" ry="1.8" fill="#171717"/><ellipse cx="30" cy="26" rx="1.5" ry="1.5" fill="#171717"/>'
    };
    var mouthPaths = {
      calm:  '<path d="M22 33 Q26 34 30 33" stroke="#171717" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
      stern: '<path d="M22 33 L30 33" stroke="#171717" stroke-width="1.4" stroke-linecap="round"/>',
      tired: '<path d="M22 33 Q26 31 30 33" stroke="#171717" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
      warm:  '<path d="M20 33 Q26 36 32 33" stroke="#171717" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
      smile: '<path d="M19 32 Q26 38 33 32" stroke="#171717" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
      wry:   '<path d="M21 34 Q28 32 32 35" stroke="#171717" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
    };
    var glasses = t.glasses
      ? '<circle cx="22" cy="26" r="3.5" fill="none" stroke="#171717" stroke-width="1.4"/>' +
        '<circle cx="30" cy="26" r="3.5" fill="none" stroke="#171717" stroke-width="1.4"/>' +
        '<path d="M25.5 26 L26.5 26" stroke="#171717" stroke-width="1.4"/>' +
        '<path d="M18.5 26 L15 25 M33.5 26 L37 25" stroke="#171717" stroke-width="1.4"/>'
      : '';
    var mask = t.mask
      ? '<rect x="18" y="30" width="16" height="8" rx="2" fill="#fff" stroke="#171717" stroke-width="1.4"/>' +
        '<path d="M18 33 L34 33" stroke="#171717" stroke-width="0.8" stroke-dasharray="1 1"/>' +
        '<path d="M19 38 L18 41 M22 38 L22 41 M26 38 L26 41 M30 38 L30 41" stroke="#171717" stroke-width="0.8"/>'
      : '';
    return '<svg class="art-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '">' +
      '<rect x="0" y="0" width="48" height="48" fill="' + t.accent + '"/>' +
      '<path d="M10 30 Q10 48 24 48 Q38 48 38 30 L38 22 Q38 12 24 12 Q10 12 10 22 Z" fill="' + t.accent + '" opacity="0.4"/>' +
      '<rect x="14" y="20" width="20" height="22" rx="2" fill="#fff" stroke="#171717" stroke-width="1.4"/>' +
      '<rect x="22" y="22" width="4" height="14" fill="' + t.accent + '" stroke="#171717" stroke-width="1"/>' +
      '<ellipse cx="24" cy="14" rx="8" ry="7" fill="' + t.skin + '" stroke="#171717" stroke-width="1.4"/>' +
      (hairPaths[t.hairStyle] || hairPaths.short) +
      (eyePaths[t.emotion] || eyePaths.calm) +
      (mouthPaths[t.emotion] || mouthPaths.calm) +
      '<ellipse cx="18" cy="32" rx="2" ry="1.5" fill="#e63946" opacity="0.4"/>' +
      '<ellipse cx="30" cy="32" rx="2" ry="1.5" fill="#e63946" opacity="0.4"/>' +
      glasses + mask +
      '</svg>';
  }

  /* ============================================================
     科室场景缩略图 — 程序化 SVG（降级用）
     ============================================================ */
  function deptSceneSVG(deptId, opts) {
    opts = opts || {};
    var scenes = {
      internal: '<rect x="10" y="20" width="220" height="120" fill="#fbf7ee" stroke="#171717" stroke-width="2"/>' +
        '<rect x="30" y="60" width="60" height="80" fill="#fff" stroke="#171717" stroke-width="1.5"/>' +
        '<rect x="40" y="80" width="40" height="50" fill="#3fb98d" opacity="0.2"/>' +
        '<circle cx="60" cy="20" r="8" fill="#ffaa6b" stroke="#171717" stroke-width="1.5"/>' +
        '<rect x="95" y="40" width="80" height="50" fill="#fff" stroke="#171717" stroke-width="1.5" rx="3"/>' +
        '<rect x="105" y="50" width="60" height="6" fill="#ffc857"/>' +
        '<text x="160" y="135" text-anchor="middle" font-family="serif" font-size="11" font-weight="900" fill="#171717">内 科</text>',
      surgery: '<rect x="10" y="20" width="220" height="120" fill="#fff" stroke="#171717" stroke-width="2"/>' +
        '<rect x="40" y="50" width="160" height="50" fill="#d6e8d6" stroke="#171717" stroke-width="1.5"/>' +
        '<ellipse cx="120" cy="75" rx="30" ry="6" fill="#fff" stroke="#171717" stroke-width="1"/>' +
        '<circle cx="120" cy="35" r="20" fill="#fff" stroke="#171717" stroke-width="2"/>' +
        '<circle cx="120" cy="35" r="12" fill="#fff" stroke="#171717" stroke-width="1.5"/>' +
        '<rect x="50" y="115" width="30" height="20" fill="#5fb0ff" stroke="#171717" stroke-width="1.5"/>' +
        '<rect x="160" y="115" width="30" height="20" fill="#a78bfa" stroke="#171717" stroke-width="1.5"/>' +
        '<text x="120" y="140" text-anchor="middle" font-family="serif" font-size="11" font-weight="900" fill="#171717">外 科</text>',
      emergency: '<rect x="10" y="20" width="220" height="120" fill="#fff5f5" stroke="#171717" stroke-width="2"/>' +
        '<rect x="20" y="50" width="60" height="80" fill="#fff" stroke="#171717" stroke-width="1.5" rx="3"/>' +
        '<rect x="90" y="50" width="60" height="80" fill="#fff" stroke="#171717" stroke-width="1.5" rx="3"/>' +
        '<rect x="160" y="50" width="60" height="80" fill="#fff" stroke="#171717" stroke-width="1.5" rx="3"/>' +
        '<circle cx="50" cy="65" r="4" fill="#e63946"/>' +
        '<path d="M44 65 L48 65 L50 60 L52 70 L54 65 L58 65" stroke="#e63946" stroke-width="1.5" fill="none"/>' +
        '<circle cx="120" cy="65" r="4" fill="#e63946"/>' +
        '<path d="M114 65 L118 65 L120 60 L122 70 L124 65 L128 65" stroke="#e63946" stroke-width="1.5" fill="none"/>' +
        '<text x="120" y="140" text-anchor="middle" font-family="serif" font-size="11" font-weight="900" fill="#e63946">急 诊</text>',
      obgyn: '<rect x="10" y="20" width="220" height="120" fill="#fff5fb" stroke="#171717" stroke-width="2"/>' +
        '<rect x="60" y="60" width="120" height="70" fill="#fce4ec" stroke="#171717" stroke-width="1.5" rx="3"/>' +
        '<ellipse cx="120" cy="60" rx="35" ry="8" fill="#fff" stroke="#171717" stroke-width="1.5"/>' +
        '<rect x="80" y="40" width="80" height="20" fill="#a78bfa" opacity="0.3" stroke="#171717" stroke-width="1"/>' +
        '<circle cx="50" cy="40" r="6" fill="#ffaa6b" stroke="#171717" stroke-width="1.5"/>' +
        '<circle cx="190" cy="40" r="6" fill="#ffaa6b" stroke="#171717" stroke-width="1.5"/>' +
        '<text x="120" y="140" text-anchor="middle" font-family="serif" font-size="11" font-weight="900" fill="#171717">妇 产</text>',
      pediatrics: '<rect x="10" y="20" width="220" height="120" fill="#fffaf0" stroke="#171717" stroke-width="2"/>' +
        '<rect x="40" y="60" width="160" height="60" fill="#ffc857" opacity="0.3" stroke="#171717" stroke-width="1.5" rx="6"/>' +
        '<ellipse cx="120" cy="60" rx="20" ry="6" fill="#fff" stroke="#171717" stroke-width="1.5"/>' +
        '<circle cx="55" cy="50" r="8" fill="#ff7d3b" stroke="#171717" stroke-width="1.5"/>' +
        '<circle cx="185" cy="50" r="8" fill="#3fb98d" stroke="#171717" stroke-width="1.5"/>' +
        '<rect x="50" y="95" width="30" height="14" fill="#fff" stroke="#171717" stroke-width="1"/>' +
        '<rect x="160" y="95" width="30" height="14" fill="#fff" stroke="#171717" stroke-width="1"/>' +
        '<text x="120" y="140" text-anchor="middle" font-family="serif" font-size="11" font-weight="900" fill="#171717">儿 科</text>',
      urology: '<rect x="10" y="20" width="220" height="120" fill="#f0f6ff" stroke="#171717" stroke-width="2"/>' +
        '<rect x="50" y="60" width="140" height="70" fill="#fff" stroke="#171717" stroke-width="1.5"/>' +
        '<rect x="60" y="70" width="50" height="50" fill="#5fb0ff" opacity="0.2" stroke="#171717" stroke-width="1"/>' +
        '<circle cx="85" cy="95" r="8" fill="#5fb0ff" stroke="#171717" stroke-width="1.5"/>' +
        '<rect x="130" y="80" width="50" height="40" fill="#fff" stroke="#171717" stroke-width="1" rx="2"/>' +
        '<rect x="135" y="85" width="40" height="3" fill="#171717"/>' +
        '<rect x="135" y="92" width="30" height="3" fill="#171717"/>' +
        '<text x="120" y="140" text-anchor="middle" font-family="serif" font-size="11" font-weight="900" fill="#171717">泌 尿</text>'
    };
    return '<svg class="art-svg scene-fallback" viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
      (scenes[deptId] || scenes.internal) + '</svg>';
  }

  function deptStampSVG(deptId, label) {
    return '<svg class="art-svg" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="2" y="2" width="52" height="52" rx="6" fill="none" stroke="#171717" stroke-width="2"/>' +
      '<rect x="4" y="4" width="48" height="48" rx="4" fill="#fbf7ee"/>' +
      '<text x="28" y="35" text-anchor="middle" font-family="serif" font-size="22" font-weight="900" fill="#171717">' + label + '</text>' +
      '</svg>';
  }

  function stampSVG(text) {
    var t = text || "ON SCENE · 现场";
    return '<svg class="art-svg scene-stamp" viewBox="0 0 130 30" xmlns="http://www.w3.org/2000/svg" width="130" height="30">' +
      '<rect x="1" y="1" width="128" height="28" fill="#fbf7ee" stroke="#171717" stroke-width="2"/>' +
      '<rect x="4" y="4" width="122" height="22" fill="none" stroke="#171717" stroke-width="1" stroke-dasharray="3 2"/>' +
      '<text x="65" y="20" text-anchor="middle" font-family="serif" font-size="12" font-weight="900" fill="#171717" letter-spacing="2">' + t + '</text>' +
      '</svg>';
  }

  var TEACHER_BY_DEPT = { internal: "周", surgery: "老唐", emergency: "大刘", obgyn: "沈", pediatrics: "小覃", urology: "程哥" };

  /* ============================================================
     Q 版头像（对话卡左上角 / 启动页气泡）
     ============================================================ */
  var CHIBI_SPECS = {
    lin:    { skin: "#fce4c8", hair: "#5a3a22", hairStyle: "short", glasses: false, mask: false, accent: "#ff7d3b", emotion: "smile" },
    system: { skin: "#dff5ee", hair: "#3fb98d", hairStyle: "buzz",  glasses: false, mask: false, accent: "#3fb98d", emotion: "calm" },
    family: { skin: "#f0d4b4", hair: "#3a3a3a", hairStyle: "short", glasses: false, mask: false, accent: "#ffc857", emotion: "calm" },
    patient:{ skin: "#fbe7d2", hair: "#4a2c1a", hairStyle: "short", glasses: false, mask: false, accent: "#e63946", emotion: "tired" }
  };
  function chibiSVG(kind, size) {
    if (TEACHERS[kind]) return avatarSVG(kind, { size: size || 58 });
    var s = CHIBI_SPECS[kind] || CHIBI_SPECS.patient;
    return avatarSVG(s, { size: size || 58 });
  }
  function chibiKindForLine(line) {
    if (line.classList.contains("dlg-self")) return "lin";
    if (line.classList.contains("dlg-system")) return "system";
    if (line.classList.contains("dlg-mentor")) {
      var sp = line.querySelector(".dlg-speaker");
      var nm = sp ? sp.textContent.trim() : "";
      var found = null;
      for (var k in TEACHERS) { if (nm.indexOf(k) === 0) { found = k; break; } }
      return found || "zhou";
    }
    if (line.classList.contains("dlg-patient")) return "patient";
    if (line.classList.contains("dlg-family")) return "family";
    return null; // 旁白等无头像
  }
  function injectDlgAvatars() {
    var lines = document.querySelectorAll(".dlg-line:not([data-avatar])");
    if (!lines.length) return;
    lines.forEach(function (line) {
      line.setAttribute("data-avatar", "1");
      var kind = chibiKindForLine(line);
      if (!kind) return;
      // 把 speaker + text 包进 .dlg-body，便于头像两列布局
      var body = document.createElement("div");
      body.className = "dlg-body";
      while (line.firstChild) body.appendChild(line.firstChild);
      line.appendChild(body);
      var av = document.createElement("div");
      av.className = "dlg-avatar dlg-avatar--" + kind;
      var url = null;
      if (kind === "lin") url = ASSETS.chibi.lin;
      else if (kind === "system") url = ASSETS.chibi.system;
      else if (kind === "zhou") url = ASSETS.chibi.zhou;
      safeFill(av, url, chibiSVG(kind, 58));
      line.insertBefore(av, line.firstChild);
      line.classList.add("dlg-line--with-avatar");
    });
  }

  /* 关键节点场景图：匹配 科室 + 病例标题 + 轮次，替换静态科室场景 */
  var KEY_SCENES = [
    { dept: "pediatrics", title: "拒输血的患儿", round: 5, url: "assets/scenes/key_pediatrics_blood.png", stamp: "关键节点 · 生死抉择" }
  ];
  function registerKeyScene(dept, title, round, url, stampText) {
    KEY_SCENES.push({ dept: dept, title: title, round: round, url: url, stamp: stampText || "关键节点" });
  }
  function currentRound() {
    var idx = document.getElementById("patient-index");
    if (!idx) return 0;
    var m = idx.textContent.match(/第\s*(\d+)\s*轮/);
    return m ? (parseInt(m[1], 10) - 1) : 0;
  }
  function matchKeyScene(deptId) {
    var tEl = document.getElementById("patient-title");
    var title = tEl ? tEl.textContent.trim() : "";
    var round = currentRound();
    for (var i = 0; i < KEY_SCENES.length; i++) {
      var s = KEY_SCENES[i];
      if (s.dept === deptId && title === s.title && round >= s.round) return s;
    }
    return null;
  }

  /* ============================================================
     加载辅助
     ============================================================ */
  function safeFill(container, url, fallbackSVG) {
    if (!container) return;
    if (!url) { container.innerHTML = fallbackSVG; container.classList.add("is-fallback"); return; }
    container.innerHTML = '<img src="' + url + '" alt="" loading="lazy" />';
    var img = container.querySelector("img");
    if (img) img.onerror = function () {
      container.innerHTML = fallbackSVG;
      container.classList.add("is-fallback");
    };
  }

  /* ============================================================
     注入层（MutationObserver 驱动，兼容 game.js 重绘）
     ============================================================ */
  var DEPT_IDS = ["internal", "surgery", "emergency", "obgyn", "pediatrics", "urology"];
  var DEPT_NAMES = {
"消化内科": "internal", "内科": "internal",
      "胃肠外科": "surgery", "外科": "surgery",
      "急诊科": "emergency", "妇产科": "obgyn", "儿科": "pediatrics",
      "泌尿外科": "urology", "泌尿外科（男科）": "urology"
    };

  /* 每个科室专属的「工具徽章」—— 让 lobby 卡片一眼看出"这科用什么家伙" */
  var DEPT_TOOLS = {
    internal:    { name: "syringe",  accent: "#ff7d3b" }, // 消化内科 · 针管
    surgery:     { name: "scalpel",  accent: "#e63946" }, // 胃肠外科 · 手术刀
    emergency:   { name: "ecg",      accent: "#e63946" }, // 急诊科 · 心电
    obgyn:       { name: "baby",     accent: "#3fb98d" }, // 妇产科 · 婴儿
    pediatrics:  { name: "candy",    accent: "#a78bfa" }, // 儿科 · 糖块
    urology:     { name: "microscope", accent: "#3fb98d" }  // 泌尿外科 · 显微镜
  };

  function deptToolSVG(kind, accent) {
    var s = accent || "#171717";
    var f = "#fffaf0";
    switch (kind) {
      case "syringe": // 针管
        return '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">' +
          '<rect x="20" y="6"  width="8"  height="6" rx="1" fill="' + s + '"/>' +
          '<rect x="14" y="12" width="20" height="4" rx="1" fill="#faf7ee" stroke="' + s + '" stroke-width="1.2"/>' +
          '<rect x="16" y="16" width="16" height="18" rx="2" fill="#faf7ee" stroke="' + s + '" stroke-width="1.5"/>' +
          '<rect x="18" y="20" width="12" height="10" fill="' + s + '" opacity=".85"/>' +
          '<line x1="24" y1="34" x2="24" y2="42" stroke="' + s + '" stroke-width="2.4" stroke-linecap="round"/>' +
          '<polygon points="21,42 27,42 24,46" fill="' + s + '"/>' +
          '</svg>';
      case "scalpel": // 手术刀
        return '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M6 38 L26 18 L34 26 L14 46 Z" fill="' + s + '" stroke="#171717" stroke-width="1.5" stroke-linejoin="round"/>' +
          '<path d="M30 14 L42 6 L46 10 L38 22 Z" fill="#faf7ee" stroke="#171717" stroke-width="1.5" stroke-linejoin="round"/>' +
          '<line x1="9" y1="41" x2="14" y2="46" stroke="#171717" stroke-width="1.5" stroke-linecap="round"/>' +
          '</svg>';
      case "ecg": // 心电波形
        return '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">' +
          '<rect x="3" y="10" width="42" height="28" rx="4" fill="#faf7ee" stroke="#171717" stroke-width="1.5"/>' +
          '<path d="M7 24 L14 24 L17 18 L21 32 L25 14 L29 30 L33 22 L36 26 L41 26" stroke="' + s + '" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<circle cx="24" cy="14" r="1.6" fill="' + s + '"/>' +
          '</svg>';
      case "baby": // 婴儿（产科）
        return '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">' +
          '<circle cx="24" cy="16" r="6.5" fill="#ffe0b2" stroke="#171717" stroke-width="1.4"/>' +
          '<circle cx="21.5" cy="15" r=".9" fill="#171717"/><circle cx="26.5" cy="15" r=".9" fill="#171717"/>' +
          '<path d="M21 18 Q24 21 27 18" stroke="#171717" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
          '<ellipse cx="24" cy="32" rx="11" ry="10" fill="' + s + '" stroke="#171717" stroke-width="1.4"/>' +
          '<path d="M14 26 Q24 28 34 26" stroke="#fff" stroke-width="1.4" fill="none" opacity=".6"/>' +
          '</svg>';
      case "candy": // 糖块（儿科）
        return '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">' +
          '<g transform="rotate(-30 24 24)">' +
          '<ellipse cx="24" cy="24" rx="14" ry="7" fill="' + s + '" stroke="#171717" stroke-width="1.5"/>' +
          '<path d="M10 24 L38 24" stroke="#fff" stroke-width="1.4" opacity=".7"/>' +
          '</g>' +
          '<path d="M9 14 L15 18 L13 22 Z" fill="#e63946" stroke="#171717" stroke-width="1.2" stroke-linejoin="round"/>' +
          '<path d="M39 34 L33 30 L35 26 Z" fill="#e63946" stroke="#171717" stroke-width="1.2" stroke-linejoin="round"/>' +
          '</svg>';
      case "microscope": // 显微镜（泌尿外科 · 体面些）
        return '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M7 41 L21 41" stroke="#171717" stroke-width="3" stroke-linecap="round"/>' +
          '<path d="M11 41 C9 30 13 16 25 13" stroke="#171717" stroke-width="3" fill="none" stroke-linecap="round"/>' +
          '<g transform="rotate(20 24 20)">' +
            '<rect x="20" y="6" width="7" height="22" rx="2.5" fill="#faf7ee" stroke="#171717" stroke-width="1.6"/>' +
            '<rect x="18" y="4" width="3.6" height="6" rx="1.5" fill="#171717"/>' +
            '<polygon points="20,28 27,28 24.5,33 22.5,33" fill="#171717"/>' +
          '</g>' +
          '<rect x="22" y="33" width="16" height="3.6" rx="1.6" fill="#171717"/>' +
          '<rect x="29" y="31" width="6" height="3" rx="1" fill="' + s + '" opacity=".85"/>' +
          '<circle cx="13" cy="33" r="3.4" fill="' + s + '" stroke="#171717" stroke-width="1.4"/>' +
          '</svg>';
      case "droplet": // 尿滴（保留备用）
        return '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M24 4 C24 4 38 22 38 30 C38 38 32 44 24 44 C16 44 10 38 10 30 C10 22 24 4 24 4 Z" fill="' + s + '" stroke="#171717" stroke-width="1.5" stroke-linejoin="round"/>' +
          '<path d="M17 26 Q17 34 22 36" stroke="#fff" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>' +
          '</svg>';
      default:
        return '<svg viewBox="0 0 48 48"></svg>';
    }
  }

  function deptIdFromDOM() {
    var idx = document.getElementById("patient-index");
    if (!idx) return "internal";
    // 兼容两种文案格式：
    //   初始渲染："03 // LIVE CASE · 内科"
    //   对话中  ："问诊中 · 内科 · 第 N 轮"
    var m = idx.textContent.match(/(?:LIVE CASE|问诊中)\s*·\s*([^·]+)/);
    if (m) {
      var name = m[1].trim();
      if (DEPT_NAMES[name]) return DEPT_NAMES[name];
    }
    return "internal";
  }

  function paintPlayerAvatar() {
    var el = document.querySelector(".hud-avatar");
    if (!el) return;
    el.innerHTML = avatarSVG("周", { size: 64 });
  }

  function injectDeptThumbs() {
    var items = document.querySelectorAll("#department-list .department-item");
    if (!items.length) return;
    items.forEach(function (item, i) {
      var deptId = DEPT_IDS[i] || "internal";
      var thumb = item.querySelector(".dept-thumb");
      if (!thumb) {
        thumb = document.createElement("div");
        thumb.className = "dept-thumb";
        item.insertBefore(thumb, item.firstChild);
      }
      if (thumb.getAttribute("data-scene") !== deptId || !thumb.querySelector("img,svg")) {
        safeFill(thumb, ASSETS.scenes[deptId], deptSceneSVG(deptId, { size: { w: 56, h: 56 } }));
        thumb.setAttribute("data-scene", deptId);
      }
      // 科室专属工具徽章（钉在缩略图右上角，区别于 AI 缩略图）
      var tool = DEPT_TOOLS[deptId];
      var badge = thumb.querySelector(".dept-tool-badge");
      if (!badge) {
        badge = document.createElement("div");
        badge.className = "dept-tool-badge";
        thumb.appendChild(badge);
      }
      if (tool && badge.getAttribute("data-tool") !== tool.name) {
        badge.setAttribute("data-tool", tool.name);
        badge.setAttribute("style", "--tool-accent:" + tool.accent);
        badge.innerHTML = deptToolSVG(tool.name, tool.accent);
      }
    });
  }

  function injectPatientScene() {
    var body = document.getElementById("patient-body");
    if (!body) return;
    var old = body.querySelector(".scene-art");
    if (!old) {
      old = document.createElement("div");
      old.className = "scene-art";
      body.insertBefore(old, body.firstChild);
    }
    var deptId = deptIdFromDOM();
    var key = matchKeyScene(deptId);
    var sceneKey = deptId + (key ? "|key:" + key.url : "");
    if (old.getAttribute("data-scene") === sceneKey && old.querySelector("img,svg")) return;
    var url = key ? key.url : (ASSETS.scenes[deptId] || ASSETS.scenes.internal);
    var fallback = '<div class="scene-art-fallback">' + deptSceneSVG(deptId) + '<span class="scene-tag">现场</span></div>';
    safeFill(old, url, fallback);
    old.setAttribute("data-scene", sceneKey);
    // 漫画「现场」印章（覆盖 AI 水印）；关键节点用专属印章文案
    var stamp = old.querySelector(".scene-stamp");
    if (!stamp) { stamp = document.createElement("div"); stamp.className = "scene-stamp-wrap"; old.appendChild(stamp); }
    stamp.innerHTML = stampSVG(key ? key.stamp : "ON SCENE · 现场");
    // 带教立绘（圆形覆盖在场景左下）
    var teacher = TEACHER_BY_DEPT[deptId] || "周";
    var portrait = old.querySelector(".scene-portrait");
    if (!portrait) { portrait = document.createElement("div"); portrait.className = "scene-portrait"; old.appendChild(portrait); }
    var pUrl = ASSETS.portraits[teacher];
    var pFallback = avatarSVG(teacher, { size: 64 });
    if (!portrait.querySelector("img") || portrait.getAttribute("data-teacher") !== teacher) {
      safeFill(portrait, pUrl, pFallback);
      portrait.setAttribute("data-teacher", teacher);
    }
  }

  function injectCinematicBackdrops() {
    function setBg(id, url) {
      var el = document.getElementById(id);
      if (!el) return;
      if (url) el.style.backgroundImage = "url('" + url + "')";
    }
    setBg("cin-intro",  ASSETS.cinematics.pro);
    setBg("cin-twist",  ASSETS.cinematics.twist);
    setBg("cin-climax", ASSETS.cinematics.draw);
  }

  function injectHeroScene() {
    var el = document.querySelector(".hero-figure");
    if (!el) return;
    var old = el.querySelector(".scene-art");
    if (!old) {
      old = document.createElement("div");
      old.className = "scene-art";
      el.appendChild(old);
    }
    if (old.querySelector("img,svg")) return;
    var url = ASSETS.cinematics.pro || ASSETS.scenes.internal;
    var fallback = '<div class="scene-art-fallback">' + deptSceneSVG("internal") +
      '<div class="scene-caption">“考试周前夜，你还在补考线边缘徘徊。”</div></div>';
    safeFill(old, url, fallback);
  }

  function observe() {
    var deptList = document.getElementById("department-list");
    if (deptList) {
      new MutationObserver(function () { injectDeptThumbs(); })
        .observe(deptList, { childList: true });
    }
    var pBody = document.getElementById("patient-body");
    if (pBody) {
      new MutationObserver(function () {
        requestAnimationFrame(injectPatientScene);
        requestAnimationFrame(injectDlgAvatars);
      }).observe(pBody, { childList: true });
    }
  }

  function initPaint() {
    try {
      paintPlayerAvatar();
      injectHeroScene();
      injectDeptThumbs();
      injectPatientScene();
      injectDlgAvatars();
      injectCinematicBackdrops();
    } catch (e) {
      console.error("[art.js] init error", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { observe(); initPaint(); });
  } else {
    observe(); initPaint();
  }
  // game.js 可能在 art.js 之后才渲染，兜底两次
  setTimeout(initPaint, 60);
  setTimeout(initPaint, 400);

  /* ============================================================
     公开接口
     ============================================================ */
  window.Art = {
    avatar: avatarSVG,
    scene: deptSceneSVG,
    stamp: deptStampSVG,
    paintScene: injectPatientScene,
    paintHero: injectHeroScene,
    paintThumbnails: injectDeptThumbs,
    paintDlgAvatars: injectDlgAvatars,
    chibi: chibiSVG,
    registerKeyScene: registerKeyScene
  };

})();
