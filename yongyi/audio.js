/* 庸医觉醒系统 · 音频引擎 v4
 * 设计：游戏音频工程师。声音身份 = 冷 / 悬 / 人。
 *
 * 音乐来源（按优先级）：
 *   1) music/*.wav —— 由免费 AI 音乐 API（Hugging Face MusicGen）预生成的真实音轨（可选）。
 *      生成脚本见 gen_music.ps1 / gen_music.js，在能联网的机器上跑一次即可。
 *   2) 兜底 · 本文件主交付：内置 Web Audio 程序化合成器（v4 精修版），保证任何情况下都有
 *      “有制作感”的音乐、不报错、离线可玩、中国可访问。
 *
 * v4 合成器要点（相对 v2 / v3 的“发飘”问题）：
 *   · FM 电钢（Rhodes 质感）作主旋律音色，替代原来发嗡的 saw+square；
 *   · 三振荡器去谐“模拟铺底（analog pad）”替代单三角波 pad；
 *   · sub bass（sine 基频 + 三角泛音）替代单 saw 贝斯；
 *   · 主链加软削波（tanh waveshaper） glue 整体、抑制刺耳峰值；
 *   · 音乐按“每科室专属和弦进行 + 琶音”走，而非随机音高 —— 这是“像配乐”的关键。
 *
 * 文件 BGM 引擎：两个 HTMLAudioElement 槽位做交叉淡入淡出，经 MediaElementSource 汇入
 *   musicBus → master，因此全局静音/音量键对 BGM 与音效同时生效。
 * 约束：AudioContext 初始 suspended，仅在首次用户手势 unlock() 后才 resume。
 * 若环境无 AudioContext / 无文件（如 node 平衡器 / 未生成音轨），安全降级到合成器。
 */
(function () {
  "use strict";

  var AC = (typeof window !== "undefined") ? (window.AudioContext || window.webkitAudioContext) : null;

  // ---- 运行时状态 ----
  var ctx = null;
  var master, comp, softclip, musicBus, sfxBus, reverb, reverbSend;
  var unlocked = false, muted = false, currentVol = 0.9;
  var music = { on: false, tension: 0.2, mode: "calm", dept: "internal", bar: 0, step: 0, next: 0, timer: null };
  var MAX_SFX_VOICES = 28;
  var sfxVoices = [];

  // BGM 文件引擎状态
  var fileMode = true;          // 默认尝试文件 BGM；首次加载失败则退回合成器
  var everLoadedFile = false;   // 是否有任一音轨成功播放过
  var currentName = null;       // 当前播放的逻辑音轨 id
  var locked = false;           // 结局后锁定，不被科室切换覆盖
  var slotA = null, slotB = null;
  var bgmVol = 0.5;
  var moodRevertTimer = null;

  // ---------- 主链构建 ----------
  function makeImpulse(dur, decay) {
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
  function makeSoftClip() {
    var n = 1024, curve = new Float32Array(n);
    for (var i = 0; i < n; i++) { var x = (i * 2) / n - 1; curve[i] = Math.tanh(x * 1.6); }
    var ws = ctx.createWaveShaper(); ws.curve = curve; ws.oversample = "2x"; return ws;
  }

  function ensure() {
    if (ctx) return;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.0;
    softclip = makeSoftClip();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 18; comp.ratio.value = 6;
    comp.attack.value = 0.004; comp.release.value = 0.28;
    master.connect(softclip); softclip.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.62; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.95; sfxBus.connect(master);
    reverb = ctx.createConvolver(); reverb.buffer = makeImpulse(2.4, 2.8);
    reverbSend = ctx.createGain(); reverbSend.gain.value = 0.30; reverbSend.connect(reverb); reverb.connect(master);
  }

  function rampMaster() {
    if (!ctx) return;
    var t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(muted ? 0 : currentVol, t + 0.25);
  }

  function revSend(node, amt) { if (reverbSend) { var rs = ctx.createGain(); rs.gain.value = amt; node.connect(rs); rs.connect(reverbSend); } }
  function toMusic(node) { node.connect(musicBus); }
  function toSfx(node) { node.connect(sfxBus); }

  function trackVoice(node, endAt) {
    sfxVoices.push({ node: node, end: endAt });
    if (sfxVoices.length > MAX_SFX_VOICES) { var old = sfxVoices.shift(); try { old.node.stop(); } catch (e) {} }
  }

  // ================= 乐器合成库 =================
  // --- 鼓组（噪声 + 正弦，紧致） ---
  function kick(t, g) {
    if (!ctx) return;
    var o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(g, t); gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(gain); toMusic(gain); o.start(t); o.stop(t + 0.24);
  }
  function snare(t, g) {
    if (!ctx) return;
    var len = Math.floor(ctx.sampleRate * 0.18), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 1400;
    var ng = ctx.createGain(); ng.gain.setValueAtTime(g, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    src.connect(f); f.connect(ng); toMusic(ng); revSend(ng, 0.16); src.start(t); src.stop(t + 0.18);
    var o = ctx.createOscillator(); o.type = "triangle"; o.frequency.setValueAtTime(185, t);
    var og = ctx.createGain(); og.gain.setValueAtTime(g * 0.45, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(og); toMusic(og); o.start(t); o.stop(t + 0.12);
  }
  function hat(t, g, open) {
    if (!ctx) return;
    var dur = open ? 0.14 : 0.045;
    var len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 8000;
    var ng = ctx.createGain(); ng.gain.setValueAtTime(g, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(ng); toMusic(ng); src.start(t); src.stop(t + dur + 0.02);
  }
  function tom(t, g, freq) {
    if (!ctx) return;
    var o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(freq || 160, t); o.frequency.exponentialRampToValueAtTime((freq || 160) * 0.6, t + 0.22);
    var gain = ctx.createGain(); gain.gain.setValueAtTime(g, t); gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(gain); toMusic(gain); o.start(t); o.stop(t + 0.3);
  }

  // --- FM 电钢（Rhodes 质感）：主旋律核心音色 ---
  function fmRhodes(t, freq, dur, g) {
    if (!ctx) return;
    var car = ctx.createOscillator(); car.type = "sine"; car.frequency.value = freq;
    var mod = ctx.createOscillator(); mod.type = "sine"; mod.frequency.value = freq * 2; // 比率 2
    var modGain = ctx.createGain();
    var idx = freq * 1.7;
    modGain.gain.setValueAtTime(idx, t);
    modGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    mod.connect(modGain); modGain.connect(car.frequency);
    var amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(g, t + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    car.connect(amp); toMusic(amp); revSend(amp, 0.28);
    car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
  }
  // --- 明亮 FM（比率更高）：外科等需要清亮主音的科室 ---
  function keys(t, freq, dur, g) {
    if (!ctx) return;
    var car = ctx.createOscillator(); car.type = "sine"; car.frequency.value = freq;
    var mod = ctx.createOscillator(); mod.type = "sine"; mod.frequency.value = freq * 3.5;
    var modGain = ctx.createGain();
    modGain.gain.setValueAtTime(freq * 1.2, t);
    modGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    mod.connect(modGain); modGain.connect(car.frequency);
    var amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(g, t + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    car.connect(amp); toMusic(amp); revSend(amp, 0.25);
    car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
  }
  // --- 三振荡器去谐“模拟铺底” ---
  function analogPad(t, freq, dur, g) {
    if (!ctx) return;
    var o1 = ctx.createOscillator(); o1.type = "sawtooth"; o1.frequency.value = freq;
    var o2 = ctx.createOscillator(); o2.type = "sawtooth"; o2.frequency.value = freq; o2.detune.value = 6;
    var o3 = ctx.createOscillator(); o3.type = "sawtooth"; o3.frequency.value = freq; o3.detune.value = -6;
    var f = ctx.createBiquadFilter(); f.type = "lowpass";
    f.frequency.setValueAtTime(520, t);
    f.frequency.linearRampToValueAtTime(520 + music.tension * 900, t + dur * 0.5);
    f.frequency.linearRampToValueAtTime(520, t + dur);
    f.Q.value = 1.2;
    var amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.linearRampToValueAtTime(g, t + 0.42);
    amp.gain.setValueAtTime(g, t + dur * 0.6);
    amp.gain.linearRampToValueAtTime(0.0001, t + dur);
    o1.connect(f); o2.connect(f); o3.connect(f); f.connect(amp); toMusic(amp); revSend(amp, 0.40);
    o1.start(t); o2.start(t); o3.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05); o3.stop(t + dur + 0.05);
  }
  // --- sub bass（sine 基频 + 三角泛音） ---
  function subBass(t, freq, dur, g) {
    if (!ctx) return;
    var sub = ctx.createOscillator(); sub.type = "sine"; sub.frequency.value = freq;
    var subAmp = ctx.createGain();
    subAmp.gain.setValueAtTime(0.0001, t); subAmp.gain.exponentialRampToValueAtTime(g, t + 0.02);
    subAmp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var body = ctx.createOscillator(); body.type = "triangle"; body.frequency.value = freq;
    var bf = ctx.createBiquadFilter(); bf.type = "lowpass"; bf.frequency.value = 300 + music.tension * 420;
    var bAmp = ctx.createGain();
    bAmp.gain.setValueAtTime(0.0001, t); bAmp.gain.exponentialRampToValueAtTime(g * 0.5, t + 0.02);
    bAmp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    sub.connect(subAmp); subAmp.connect(musicBus);
    body.connect(bf); bf.connect(bAmp); bAmp.connect(musicBus);
    revSend(subAmp, 0.1);
    sub.start(t); body.start(t); sub.stop(t + dur + 0.02); body.stop(t + dur + 0.02);
  }
  // --- 二胡（民族弦色，用于急诊/泌尿等） ---
  function erhu(t, freq, dur, g) {
    if (!ctx) return;
    var o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq;
    var lfo = ctx.createOscillator(); lfo.frequency.value = 6;
    var lfoG = ctx.createGain(); lfoG.gain.value = freq * 0.012; lfo.connect(lfoG); lfoG.connect(o.frequency);
    var f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 880 + Math.random() * 120; f.Q.value = 3.2;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t); gain.gain.linearRampToValueAtTime(g, t + 0.12);
    gain.gain.setValueAtTime(g, t + dur * 0.7); gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(gain); toMusic(gain); revSend(gain, 0.32);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.02); lfo.stop(t + dur + 0.02);
  }
  // --- 手风琴（用于妇产科/儿科等暖色） ---
  function accordion(t, freq, dur, g) {
    if (!ctx) return;
    var o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq;
    var o2 = ctx.createOscillator(); o2.type = "square"; o2.frequency.value = freq; o2.detune.value = -8;
    var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1500; f.Q.value = 1;
    var gain = ctx.createGain();
    var lfo = ctx.createOscillator(); lfo.frequency.value = 5.5;
    var lfoG = ctx.createGain(); lfoG.gain.value = g * 0.28; lfo.connect(lfoG); lfoG.connect(gain.gain);
    gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(g, t + 0.06);
    gain.gain.setValueAtTime(g, t + dur * 0.65); gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); o2.connect(f); f.connect(gain); toMusic(gain); revSend(gain, 0.3);
    o.start(t); o2.start(t); lfo.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02); lfo.stop(t + dur + 0.02);
  }
  // --- 钟琴 / 铃（事件高光） ---
  function bell(t, freq, dur, g) {
    if (!ctx) return;
    var o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = freq;
    var o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = freq * 2.01;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(g, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gain); o2.connect(gain); toMusic(gain); revSend(gain, 0.4);
    o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  }
  // --- 暖 pad（事件用，保留原质感） ---
  function padTone(t, freq, dur, g) {
    if (!ctx) return;
    var o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = freq;
    var o2 = ctx.createOscillator(); o2.type = "triangle"; o2.frequency.value = freq; o2.detune.value = 5;
    var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 700 + music.tension * 1200; f.Q.value = 2;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t); gain.gain.linearRampToValueAtTime(g, t + 0.45);
    gain.gain.setValueAtTime(g, t + dur * 0.6); gain.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(f); o2.connect(f); f.connect(gain); toMusic(gain); revSend(gain, 0.42);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  function zap(t, freq, dur, g, slideTo) {
    if (!ctx) return;
    var o = ctx.createOscillator(); o.type = "sawtooth";
    o.frequency.setValueAtTime(freq, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    var f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = Math.max(200, freq); f.Q.value = 3;
    var gain = ctx.createGain(); gain.gain.setValueAtTime(g, t); gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(gain); toSfx(gain); o.start(t); o.stop(t + dur + 0.02);
  }
  function tone(opts) {
    if (!ctx) return;
    var t = ctx.currentTime, dur = opts.dur || 0.3;
    var o = ctx.createOscillator(); o.type = opts.type || "sine"; o.frequency.setValueAtTime(opts.freq, t);
    if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
    if (opts.detune) o.detune.value = opts.detune;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(opts.peak || 0.3, t + (opts.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + (opts.attack || 0.01) + dur);
    o.connect(g); toSfx(g); if (opts.reverb) revSend(g, opts.reverb);
    o.start(t); o.stop(t + dur + 0.05); trackVoice(o, t + dur + 0.05);
  }
  function noise(opts) {
    if (!ctx) return;
    var t = ctx.currentTime, dur = opts.dur || 0.2;
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = opts.filter || "bandpass"; f.frequency.value = opts.freq || 1200; f.Q.value = opts.q || 1;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(opts.peak || 0.2, t + (opts.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + (opts.attack || 0.005) + dur);
    src.connect(f); f.connect(g); toSfx(g); if (opts.reverb) revSend(g, opts.reverb);
    src.start(t); src.stop(t + dur + 0.05); trackVoice(src, t + dur + 0.05);
  }

  // ================= 科室风格（v4 合成器用） =================
  // root：科室根音(Hz)；scale：调式(半音偏移)；bpm：速度；prog：每小节和弦根音(在 scale 中的度数)；
  // lead：主旋律乐器；pad：铺底乐器；drums/leadSteps/bassSteps/fill：声部编排。
  var STYLES = {
    internal: { label: "内科", root: 98.0, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 76,
      prog: [0, 5, 3, 4],
      drums: [[0,0,0,0, 3,0,0,0, 0,0,0,0, 3,0,0,0], [1,0,0,0, 3,0,0,0, 1,0,0,0, 3,0,0,0]],
      bassSteps: [0, 8], leadSteps: [4, 12], lead: "rhodes", pad: "analog", layerPad: "analog",
      fill: [0,0,0,0, 0,0,0,0, 4,4,2,0, 4,4,4,2] },
    surgery: { label: "外科", root: 110.0, scale: [0, 1, 3, 5, 7, 8, 10], bpm: 90,
      prog: [0, 3, 5, 1],
      drums: [[1,0,0,0, 3,0,3,0, 1,0,0,0, 3,0,3,0], [1,0,0,0, 3,0,3,0, 1,0,0,3, 3,0,3,3]],
      bassSteps: [0, 6, 8, 14], leadSteps: [2, 10], lead: "keys", pad: "analog", layerPad: "analog",
      fill: [1,0,4,0, 1,0,4,0, 1,0,4,0, 4,4,2,2] },
    emergency: { label: "急诊科", root: 123.47, scale: [0, 3, 5, 6, 7, 10], bpm: 126,
      prog: [0, 4, 0, 5],
      drums: [[1,0,2,0, 3,0,2,0, 1,0,2,0, 3,0,2,3], [1,0,2,3, 1,0,2,0, 1,0,2,3, 1,2,2,3]],
      bassSteps: [0, 3, 6, 8, 11, 14], leadSteps: [2, 6, 10, 14], lead: "erhu", pad: "analog", layerPad: "analog",
      fill: [1,1,2,2, 1,1,2,2, 4,4,4,4, 2,2,2,2] },
    obgyn: { label: "妇产科", root: 130.81, scale: [0, 2, 4, 7, 9], bpm: 70,
      prog: [0, 1, 3, 2],
      drums: [[0,0,0,0, 3,0,0,0, 0,0,0,0, 3,0,0,0], [1,0,0,0, 3,0,0,0, 0,0,0,0, 3,0,0,0]],
      bassSteps: [0, 8], leadSteps: [2, 6, 10, 14], lead: "accordion", pad: "analog", layerPad: "accordion",
      fill: [0,0,0,0, 0,0,0,0, 4,0,4,0, 4,0,2,0] },
    pediatrics: { label: "儿科", root: 146.83, scale: [0, 2, 4, 6, 7, 9, 11], bpm: 100,
      prog: [0, 3, 4, 1],
      drums: [[1,0,0,0, 3,0,3,0, 1,0,0,0, 3,0,3,0], [1,0,0,3, 3,0,3,0, 1,0,0,3, 3,0,3,3]],
      bassSteps: [0, 8], leadSteps: [2, 6, 10, 14], lead: "rhodes", pad: "analog", layerPad: "accordion",
      fill: [1,0,4,0, 1,0,4,0, 4,4,2,0, 4,4,2,2] },
    urology: { label: "泌尿外科", root: 87.31, scale: [0, 2, 3, 5, 7, 9, 10], bpm: 84,
      prog: [0, 5, 3, 4],
      drums: [[0,0,0,0, 3,0,0,0, 0,0,0,0, 3,0,0,0], [1,0,0,0, 3,0,0,0, 1,0,0,3, 3,0,3,0]],
      bassSteps: [0, 8], leadSteps: [2, 6, 10, 14], lead: "erhu", pad: "analog", layerPad: "analog",
      fill: [0,0,0,0, 0,0,0,0, 4,4,2,0, 4,4,4,2] }
  };
  function styleOf() { return STYLES[music.dept] || STYLES.internal; }
  function noteFrom(root, semi) { return root * Math.pow(2, semi / 12); }
  function chordTriad(sc, rd) {
    var n = sc.length;
    var d1 = ((rd % n) + n) % n;
    var d3 = ((rd + 2) % n + n) % n;
    var d5 = ((rd + 4) % n + n) % n;
    return [sc[d1], sc[d3], sc[d5]];
  }
  function curBpm() { var s = styleOf(), t = music.tension; return s.bpm * (1 + t * 0.18 + (music.mode === "climax" ? 0.12 : 0)); }

  function schedDrum(code, t, g) {
    if (code === 1) kick(t, g); else if (code === 2) snare(t, g); else if (code === 3) hat(t, g, false);
    else if (code === 4) tom(t, g * 0.8, 150); else if (code === 5) hat(t, g, true);
  }
  function startBar(t) {
    var s = styleOf(), barDur = (60 / curBpm()) * 4, rd = s.prog[music.bar % s.prog.length];
    var tri = chordTriad(s.scale, rd);
    tri.forEach(function (d) {
      var fr = noteFrom(s.root, d + 12); // 铺底高八度，温暖垫底
      if (s.layerPad === "accordion") accordion(t, fr, barDur * 0.98, 0.05); else analogPad(t, fr, barDur * 0.98, 0.05);
    });
  }
  function schedStep(step, t) {
    var s = styleOf(), sc = s.scale, tense = music.tension, climax = music.mode === "climax";
    var sixteenth = 60 / curBpm() / 4;
    if (s.drums) {
      var pat = s.drums[music.bar % s.drums.length];
      if (music.bar % 4 === 3 && step >= 12) pat = s.fill;
      schedDrum(pat[step], t, 0.85 + tense * 0.1);
    }
    var rd = s.prog[music.bar % s.prog.length];
    var tri = chordTriad(sc, rd);
    if (s.bassSteps.indexOf(step) >= 0) {
      var bsemi = sc[((rd % sc.length) + sc.length) % sc.length];
      subBass(t, noteFrom(s.root, bsemi), sixteenth * 2.2, 0.5 + tense * 0.2);
    }
    if (s.leadSteps && s.leadSteps.indexOf(step) >= 0) {
      var idx = (music.bar * 2 + step) % tri.length;
      var lsemi = tri[idx] + (climax ? 24 : 12);
      var lf = noteFrom(s.root, lsemi), lv = 0.12 + tense * 0.12;
      if (s.lead === "erhu") erhu(t, lf, sixteenth * 2.0, lv);
      else if (s.lead === "keys") keys(t, lf, sixteenth * 2.0, lv);
      else if (s.lead === "accordion") accordion(t, lf, sixteenth * 2.0, lv);
      else fmRhodes(t, lf, sixteenth * 2.0, lv);
    }
    if ((tense > 0.5 || climax) && step % 2 === 0 && Math.random() < 0.32) {
      var rd2 = s.prog[music.bar % s.prog.length];
      var tri2 = chordTriad(sc, rd2);
      var semi2 = tri2[Math.floor(Math.random() * tri2.length)] + 24;
      fmRhodes(t, noteFrom(s.root, semi2), sixteenth * 1.4, 0.1);
    }
  }
  function scheduler() {
    if (!music.on || !ctx) return;
    var sixteenth = 60 / curBpm() / 4;
    while (music.next < ctx.currentTime + 0.12) {
      if (music.step === 0) startBar(music.next);
      schedStep(music.step, music.next);
      music.next += sixteenth; music.step++;
      if (music.step >= 16) { music.step = 0; music.bar++; }
    }
  }
  function startSynth() {
    if (!ctx || music.on) return;
    music.on = true; music.step = 0; music.bar = 0; music.next = ctx.currentTime + 0.06;
    music.timer = setInterval(scheduler, 25);
  }
  function stopSynth() { music.on = false; if (music.timer) { clearInterval(music.timer); music.timer = null; } }
  function setSynthDept(id) { if (STYLES[id]) music.dept = id; }

  // ================= 文件 BGM 引擎（AI 生成音轨，可选） =================
  function makeSlot() {
    var el = new (window.Audio || (typeof Audio !== "undefined" ? Audio : null))();
    if (!el) return null;
    el.preload = "auto";
    var src = ctx.createMediaElementSource(el);
    var g = ctx.createGain(); g.gain.value = 0.0001;
    src.connect(g); g.connect(musicBus);
    el.addEventListener("error", function () { onFileError(); });
    el.addEventListener("canplay", function () { everLoadedFile = true; });
    return { el: el, src: src, gain: g, name: null };
  }
  function ensureSlots() { if (!slotA) { slotA = makeSlot(); slotB = makeSlot(); } }
  function onFileError() {
    if (everLoadedFile) return;            // 已有音轨成功过，单个缺失不降级
    if (!fileMode) return;
    fileMode = false;                      // 全部缺失 → 退回合成器
    stopFileBgm();
    startSynth();
  }
  function playFile(name) {
    if (!ctx) return;
    ensureSlots();
    if (!slotA) { fileMode = false; startSynth(); return; }
    var incoming = (slotB && slotB.name === name) ? slotA : slotB;
    var outgoing = (incoming === slotA) ? slotB : slotA;
    incoming.el.src = "music/" + name + ".wav";
    incoming.el.loop = true;
    incoming.name = name;
    var pr = incoming.el.play();
    if (pr && pr.catch) pr.catch(function () {});
    var t = ctx.currentTime;
    incoming.gain.gain.cancelScheduledValues(t);
    incoming.gain.gain.setValueAtTime(incoming.gain.gain.value, t);
    incoming.gain.gain.linearRampToValueAtTime(bgmVol, t + 1.2);
    if (outgoing && outgoing.name && outgoing.name !== name) {
      var tt = ctx.currentTime;
      outgoing.gain.gain.cancelScheduledValues(tt);
      outgoing.gain.gain.setValueAtTime(outgoing.gain.gain.value, tt);
      outgoing.gain.gain.linearRampToValueAtTime(0.0001, tt + 1.0);
      setTimeout(function () { try { outgoing.el.pause(); } catch (e) {} }, 1100);
    }
    currentName = name;
  }
  function stopFileBgm() {
    if (!ctx) return;
    [slotA, slotB].forEach(function (s) {
      if (!s) return;
      var t = ctx.currentTime;
      s.gain.gain.cancelScheduledValues(t);
      s.gain.gain.setValueAtTime(s.gain.gain.value, t);
      s.gain.gain.linearRampToValueAtTime(0.0001, t + 0.4);
      setTimeout(function () { try { s.el.pause(); } catch (e) {} }, 450);
    });
    currentName = null;
  }
  function scheduleRevert(sec) {
    if (moodRevertTimer) clearTimeout(moodRevertTimer);
    moodRevertTimer = setTimeout(function () {
      if (music.on && !locked && fileMode) playFile(music.dept);
    }, sec * 1000);
  }

  // ================= 命名事件（用乐器富化 · 音效层） =================
  var ROOT = 110;
  function nt(semi, oct) { return ROOT * Math.pow(2, (semi + 12 * (oct || 0)) / 12); }
  var EVENTS = {
    intro_enter: function () {
      tone({ freq: 70, type: "sine", dur: 1.4, attack: 0.08, peak: 0.42, reverb: 0.5 });
      erhu(ctx ? ctx.currentTime : 0, nt(0, 1), 1.6, 0.16);
      noise({ freq: 600, filter: "bandpass", q: 0.7, dur: 0.9, peak: 0.08, reverb: 0.4 });
    },
    choice: function () { keys(ctx ? ctx.currentTime : 0, nt(7, 1), 0.18, 0.2); },
    story_advance: function () { hat(ctx ? ctx.currentTime : 0, 0.18, false); keys(ctx ? ctx.currentTime : 0, nt(4, 1), 0.12, 0.12); },
    case_open: function () { var t = ctx ? ctx.currentTime : 0; fmRhodes(t, nt(0, 1), 0.22, 0.16); fmRhodes(t + 0.12, nt(7, 1), 0.26, 0.16); },
    page_turn: function () { var t = ctx ? ctx.currentTime : 0; hat(t, 0.22, false); hat(t + 0.06, 0.18, false); tom(t + 0.12, 0.4, 150); },
    risk_reveal: function () { var t = ctx ? ctx.currentTime : 0; erhu(t, nt(0, 1), 0.5, 0.2); erhu(t, nt(-1, 1), 0.5, 0.16); tom(t, 0.45, 120); },
    twist: function () {
      var t = ctx ? ctx.currentTime : 0;
      accordion(t, nt(0, 1), 0.5, 0.18); accordion(t, nt(3, 1), 0.5, 0.16); snare(t, 0.6);
      noise({ freq: 200, filter: "lowpass", q: 1, dur: 0.25, peak: 0.14, reverb: 0.2 });
    },
    harm: function () {
      var t = ctx ? ctx.currentTime : 0;
      tone({ freq: 160, type: "sine", dur: 1.1, attack: 0.02, peak: 0.32, slideTo: 70, reverb: 0.3 });
      tone({ freq: 161.5, type: "sine", dur: 1.1, attack: 0.02, peak: 0.18, slideTo: 71, reverb: 0.3 });
      noise({ freq: 140, filter: "lowpass", q: 0.8, dur: 0.5, peak: 0.12, reverb: 0.2 });
    },
    mood_hope: function () { var t = ctx ? ctx.currentTime : 0; accordion(t, nt(0, 1), 0.5, 0.16); accordion(t + 0.16, nt(4, 1), 0.5, 0.16); accordion(t + 0.32, nt(7, 1), 0.6, 0.16); },
    mood_low: function () { var t = ctx ? ctx.currentTime : 0; erhu(t, nt(7, 1), 0.6, 0.16); erhu(t + 0.22, nt(3, 1), 0.7, 0.14); },
    mood_tense: function () { var t = ctx ? ctx.currentTime : 0; hat(t, 0.22, false); hat(t + 0.13, 0.2, false); subBass(t, nt(0, 0), 0.3, 0.4); tom(t, 0.4, 110); },
    draw_open: function () {
      var t = ctx ? ctx.currentTime : 0;
      tone({ freq: 220, type: "sine", dur: 1.0, attack: 0.02, peak: 0.22, slideTo: 1760, reverb: 0.6 });
      fmRhodes(t, nt(0, 1), 1.0, 0.18); fmRhodes(t + 0.05, nt(0, 2), 0.9, 0.14); hat(t + 0.2, 0.2, true); hat(t + 0.4, 0.2, true);
    },
    draw_confirm: function () {
      var t = ctx ? ctx.currentTime : 0;
      fmRhodes(t, nt(0, 1), 0.8, 0.16); fmRhodes(t, nt(4, 1), 0.8, 0.16); fmRhodes(t, nt(7, 1), 0.8, 0.16); accordion(t + 0.04, nt(0, 1), 0.8, 0.12);
    },
    achievement: function () { var t = ctx ? ctx.currentTime : 0, notes = [nt(0, 2), nt(4, 2), nt(7, 2), nt(12, 2)]; notes.forEach(function (fr, i) { setTimeout(function () { bell(ctx ? ctx.currentTime : 0, fr, 0.32, 0.18); }, i * 70); }); },
    milestone: function () {
      var t = ctx ? ctx.currentTime : 0, notes = [nt(0, 1), nt(4, 1), nt(7, 1), nt(12, 1), nt(16, 1)];
      kick(t, 0.9); kick(t + 0.24, 0.7);
      notes.forEach(function (fr, i) { setTimeout(function () { var tt = ctx ? ctx.currentTime : 0; fmRhodes(tt, fr, 0.42, 0.2); bell(tt, fr * 2, 0.3, 0.12); }, i * 65); });
      snare(t + 0.3, 0.6);
    },
    rewind: function () { zap(ctx ? ctx.currentTime : 0, 880, 0.8, 0.2, 110); noise({ freq: 1500, filter: "bandpass", q: 0.7, dur: 0.6, peak: 0.06, reverb: 0.2 }); },
    ui_click: function () { zap(ctx ? ctx.currentTime : 0, 660, 0.05, 0.12); },
    ending_hidden: function () {
      var t = ctx ? ctx.currentTime : 0;
      padTone(t, nt(0, 1), 1.8, 0.14); padTone(t, nt(4, 1), 1.8, 0.12); padTone(t, nt(7, 1), 1.8, 0.12);
      erhu(t + 0.1, nt(0, 2), 1.4, 0.2); erhu(t + 0.5, nt(4, 2), 1.2, 0.18); erhu(t + 0.9, nt(7, 2), 1.2, 0.18);
    },
    ending_benevolent: function () { var t = ctx ? ctx.currentTime : 0; accordion(t, nt(0, 1), 1.4, 0.18); accordion(t + 0.18, nt(4, 1), 1.4, 0.16); accordion(t + 0.36, nt(7, 1), 1.5, 0.16); },
    ending_steady: function () { var t = ctx ? ctx.currentTime : 0; fmRhodes(t, nt(0, 1), 1.2, 0.16); fmRhodes(t + 0.04, nt(3, 1), 1.2, 0.14); fmRhodes(t + 0.08, nt(7, 1), 1.2, 0.14); },
    ending_lawsuit: function () { var t = ctx ? ctx.currentTime : 0; tone({ freq: nt(0, 1), type: "sawtooth", dur: 1.4, attack: 0.02, peak: 0.16, reverb: 0.4 }); tone({ freq: nt(3, 1), type: "sawtooth", dur: 1.4, attack: 0.02, peak: 0.14, reverb: 0.4 }); snare(t, 0.4); },
    ending_malpractice: function () {
      var t = ctx ? ctx.currentTime : 0;
      tone({ freq: 110, type: "sine", dur: 1.8, attack: 0.02, peak: 0.34, slideTo: 55, reverb: 0.4 });
      tone({ freq: 112, type: "sine", dur: 1.8, attack: 0.02, peak: 0.2, slideTo: 56, reverb: 0.4 });
      erhu(t + 0.2, nt(1, 1), 1.2, 0.14); erhu(t + 0.6, nt(6, 1), 1.2, 0.12);
      noise({ freq: 140, filter: "lowpass", q: 0.8, dur: 0.6, peak: 0.1, reverb: 0.2 });
    },
    ending_burnout: function () { var t = ctx ? ctx.currentTime : 0; erhu(t, nt(7, 1), 1.8, 0.16); erhu(t + 0.4, nt(4, 1), 1.8, 0.13); erhu(t + 0.8, nt(2, 1), 1.8, 0.1); }
  };

  // ================= 公开接口 =================
  function unlock() {
    ensure();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    unlocked = true; rampMaster();
  }
  function toggleMute() { muted = !muted; rampMaster(); return muted; }

  function startMusic() {
    ensure();
    if (!ctx || music.on) return;
    music.on = true; locked = false;
    if (fileMode) playFile(music.dept || "internal"); else startSynth();
  }
  function stopMusic() { music.on = false; stopFileBgm(); stopSynth(); }
  function setTension(v) { music.tension = Math.max(0, Math.min(1, v)); }
  function setMode(m) { music.mode = m; }
  function setDept(id) {
    if (STYLES[id]) music.dept = id;
    if (!music.on || locked) return;
    if (fileMode) playFile(id); else setSynthDept(id);
  }

  function trigger(name) {
    if (!ctx) return;
    var fn = EVENTS[name];
    if (fn) fn({});
    // BGM 层联动（仅文件模式才有独立情绪/高潮/结局音轨）
    if (!fileMode) return;
    if (name === "mood_tense") { playFile("tense"); scheduleRevert(14); }
    else if (name === "mood_hope") { playFile("hope"); scheduleRevert(14); }
    else if (name === "mood_low") { playFile("low"); scheduleRevert(14); }
    else if (name === "draw_open") { playFile("climax"); }
    else if (name === "draw_confirm") { scheduleRevert(1.6); }
    else if (name && name.indexOf("ending_") === 0) { playFile(name); locked = true; }
  }

  if (typeof window !== "undefined") {
    window.GameAudio = {
      unlock: unlock,
      trigger: trigger,
      startMusic: startMusic,
      stopMusic: stopMusic,
      setTension: setTension,
      setMode: setMode,
      setDept: setDept,
      mute: function (b) { muted = !!b; rampMaster(); },
      toggleMute: toggleMute,
      isMuted: function () { return muted; },
      setVolume: function (v) { currentVol = v; rampMaster(); }
    };
  }
})();
