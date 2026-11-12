/* ═══════════════════════════════════════════════════════════════════
   swarm.js — "swarm rebuild" for the axeltan site
   Inspired by the swarm-cursors Chrome extension.

   Every time you click a nav page (home / about / fursona / friends /
   gallery) the new page is WIPED to a blank canvas, then a swarm of named
   multiplayer cursors REBUILDS it live:
     • crosshair drags out boxes (live  W × H  badge + gray placeholder)
     • images wipe in, text is typed with an I-beam + blinking caret
     • the pen tool draws lines with anchor points
     • red guides get dragged out from the ruler, text snaps onto them
     • repeated things (cards, chips, tiles) are ⌥-dragged copies
   All sound is synthesized (no audio files). It works on every page.

   Controls (bottom-right):  ✦ swarm on/off · 🔊 sound · 1× speed · ↻ replay
                             ⏭ skip (only while rebuilding)   Esc = skip
                             M = mute

   Install: put swarm.js next to index.html and add
       <script src="swarm.js"></script>
   right BEFORE </body>, AFTER the existing <script> block.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__swarmLoaded) return;
  window.__swarmLoaded = true;

  /* ───────── settings (edit these) ───────── */
  var CFG = {
    names: ['Axel', 'Fox', 'Blue', 'Pumpkin', 'Sly'],            // cursor name tags
    colors: ['#4dc8d0', '#ff8a2b', '#c084fc', '#34d399', '#f472b6'],
    cursorsDesktop: 5,
    cursorsMobile: 3,
    targetSeconds: 8,        // a page is rebuilt in about this long (auto-speeds up big pages)
    introOnLoad: false,      // true = also rebuild the home page when the site first loads (silent)
    maxJobs: 260
  };
  /* ───────────────────────────────────────── */

  var isMobile = window.matchMedia('(max-width: 700px)').matches;
  var NCUR = isMobile ? CFG.cursorsMobile : CFG.cursorsDesktop;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var enabled = store.get('axel-swarm') === null ? !reduce : store.get('axel-swarm') === '1';
  var soundOn = store.get('axel-swarm-sound') !== '0';
  var speedIdx = parseInt(store.get('axel-swarm-speed'), 10);
  var SPEEDS = [1, 2, 3];
  if (isNaN(speedIdx) || speedIdx < 0 || speedIdx > 2) speedIdx = 0;

  /* ───────── small helpers ───────── */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lin(t) { return t; }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function hexA(hex, a) {
    var n = parseInt(hex.replace('#', ''), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function mk(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }
  function alphaOf(c) {
    if (!c || c === 'transparent') return 0;
    var m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return 1;
    var p = m[1].split(/[ ,\/]+/).filter(Boolean);
    return p.length >= 4 ? parseFloat(p[3]) : 1;
  }
  function borderVisible(cs) {
    var s = ['Top', 'Right', 'Bottom', 'Left'];
    for (var i = 0; i < 4; i++) {
      if (parseFloat(cs['border' + s[i] + 'Width']) > 0 && cs['border' + s[i] + 'Style'] !== 'none' &&
          alphaOf(cs['border' + s[i] + 'Color']) > 0.04) return true;
    }
    return false;
  }

  /* ───────── styles ───────── */
  var style = mk('style');
  style.textContent =
    /* the original site shows #page-home even when it is not active; fix that so the wipe is clean */
    '#page-home:not(.active){display:none!important}' +
    '.sr-layer{position:absolute;left:0;top:0;width:100%;overflow:hidden;pointer-events:none;z-index:130;contain:layout style paint}' +
    '#sr-grid{position:fixed;left:0;top:0;right:0;bottom:0;z-index:-1;pointer-events:none;opacity:0;transition:opacity .4s;' +
    'background-image:radial-gradient(rgba(150,170,200,.17) 1px,transparent 1.5px);background-size:22px 22px}' +
    '#sr-grid.on{opacity:1}' +
    /* cursors */
    '.sr-cur{position:absolute;left:0;top:0;will-change:transform;opacity:0;transition:opacity .25s}' +
    '.sr-cur.in{opacity:1}' +
    '.sr-cur .ic{position:absolute;display:none;overflow:visible;filter:drop-shadow(0 1px 2px rgba(0,0,0,.55))}' +
    '.sr-cur .f{fill:var(--c)}.sr-cur .s{stroke:var(--c);fill:none}' +
    '.sr-cur[data-t=arrow] .arrow,.sr-cur[data-t=cross] .cross,.sr-cur[data-t=text] .text,.sr-cur[data-t=pen] .pen{display:block}' +
    '.sr-name{position:absolute;left:13px;top:17px;white-space:nowrap;font:600 11px/1 Inter,system-ui,sans-serif;padding:3px 7px;' +
    'border-radius:9px;color:#06141a;background:var(--c);box-shadow:0 2px 6px rgba(0,0,0,.35)}' +
    '.sr-cur[data-t=cross] .sr-name,.sr-cur[data-t=text] .sr-name,.sr-cur[data-t=pen] .sr-name{top:11px}' +
    '.sr-badge{display:none;position:absolute;left:13px;top:-5px;background:#fff;color:#111;font:700 10px/1 Inter,sans-serif;padding:2px 5px;border-radius:4px}' +
    '.sr-cur[data-alt="1"] .sr-badge{display:block}' +
    /* selection box / ghost */
    '.sr-sel,.sr-ghost{position:absolute;left:0;top:0;box-sizing:border-box;will-change:transform,width,height;transition:opacity .3s}' +
    '.sr-sel{border:1.5px solid var(--c);background:rgba(200,210,225,.08)}' +
    '.sr-sel.dash{border-style:dashed;background:transparent}' +
    '.sr-sel i{position:absolute;width:7px;height:7px;background:#fff;border:1.5px solid var(--c);box-sizing:border-box}' +
    '.sr-sel i.tl{left:-4.5px;top:-4.5px}.sr-sel i.tr{right:-4.5px;top:-4.5px}' +
    '.sr-sel i.bl{left:-4.5px;bottom:-4.5px}.sr-sel i.br{right:-4.5px;bottom:-4.5px}' +
    '.sr-sel.dash i{display:none}' +
    '.sr-dim{position:absolute;left:50%;top:100%;transform:translate(-50%,7px);white-space:nowrap;background:var(--c);color:#06141a;' +
    'font:600 10px/1 "Share Tech Mono",monospace;padding:3px 6px;border-radius:4px}' +
    '.sr-sel.dash .sr-dim{display:none}' +
    '.sr-ghost{border:1.5px dashed var(--c);background:var(--a);border-radius:8px}' +
    '.out{opacity:0!important}' +
    /* guides, caret, pen */
    '.sr-g{position:absolute;left:0;top:0;background:var(--c);opacity:.5;transition:opacity .3s}' +
    '.sr-g.h{width:100%;height:1px}.sr-g.v{height:100%;width:1px}' +
    '.sr-red{background:#ff3b3b;opacity:.85}' +
    '.sr-caret{position:absolute;left:0;top:0;width:2px;background:var(--c);animation:srBlink .55s steps(2) infinite}' +
    '@keyframes srBlink{50%{opacity:0}}' +
    '.sr-pen{position:absolute;left:0;top:0;background:var(--c);transition:opacity .3s}' +
    '.sr-anchor{position:absolute;left:0;top:0;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;background:#fff;border:1.5px solid var(--c);box-sizing:border-box;transition:opacity .3s}' +
    '.sr-ruler{position:absolute;background:rgba(17,19,24,.92);border:0 solid #2a3350;transition:transform .45s cubic-bezier(.2,.8,.2,1)}' +
    '.sr-ruler.t{left:0;top:0;width:100%;height:16px;border-bottom-width:1px}' +
    '.sr-ruler.l{left:0;top:0;height:100%;width:16px;border-right-width:1px}' +
    '.sr-redlab{position:absolute;left:0;top:0;white-space:nowrap;background:#ff3b3b;color:#fff;font:600 10px/1 "Share Tech Mono",monospace;padding:3px 6px;border-radius:4px;transition:opacity .3s}' +
    /* HUD + controls */
    '.sr-hud{position:fixed;left:14px;bottom:14px;z-index:160;display:none;align-items:center;gap:8px;padding:7px 12px;' +
    'background:rgba(17,19,24,.88);border:1px solid var(--border,#1e2438);border-radius:50px;backdrop-filter:blur(8px);' +
    'font:12px/1 "Share Tech Mono",monospace;letter-spacing:.04em;color:var(--text,#dde6f0)}' +
    '.sr-hud .d{width:8px;height:8px;border-radius:50%;background:#ff3b3b;animation:srBlink 1s steps(2) infinite}' +
    '.swarm-ctl{position:fixed;right:14px;bottom:14px;z-index:160;display:flex;gap:6px}' +
    '.swarm-btn{background:rgba(17,19,24,.85);border:1px solid var(--border,#1e2438);border-radius:6px;color:var(--muted,#4a566e);cursor:pointer;' +
    'padding:6px 10px;min-height:32px;font-family:var(--mono,monospace);font-size:12px;letter-spacing:.04em;backdrop-filter:blur(8px);transition:border-color .2s,color .2s}' +
    '.swarm-btn:hover,.swarm-btn.on{border-color:var(--cyan-dim,#2a8a90);color:var(--cyan,#4dc8d0)}' +
    'body.hw .swarm-btn:hover,body.hw .swarm-btn.on{border-color:var(--pumpkin,#ff8a2b);color:var(--pumpkin,#ff8a2b)}' +
    '#swarmSkip{display:none;border-color:#ff3b3b;color:#ff6b6b}' +
    '@media(max-width:580px){.swarm-ctl{right:8px;bottom:8px}.swarm-btn{padding:6px 8px}.sr-hud{left:8px;bottom:50px}}';
  document.head.appendChild(style);

  var grid = mk('div'); grid.id = 'sr-grid'; document.body.appendChild(grid);

  var hud = mk('div', 'sr-hud', '<span class="d"></span><span class="t"></span>');
  document.body.appendChild(hud);
  var hudT = hud.querySelector('.t');

  var ctl = mk('div', 'swarm-ctl',
    '<button class="swarm-btn" id="swarmSkip" title="Skip animation (Esc)">⏭ skip</button>' +
    '<button class="swarm-btn" id="swarmToggle" title="Swarm rebuild on/off">✦ swarm</button>' +
    '<button class="swarm-btn" id="swarmSound" title="Sound on/off (M)">🔊</button>' +
    '<button class="swarm-btn" id="swarmSpeed" title="Build speed">1×</button>' +
    '<button class="swarm-btn" id="swarmReplay" title="Replay rebuild">↻</button>');
  document.body.appendChild(ctl);
  var bSkip = document.getElementById('swarmSkip');
  var bToggle = document.getElementById('swarmToggle');
  var bSound = document.getElementById('swarmSound');
  var bSpeed = document.getElementById('swarmSpeed');
  var bReplay = document.getElementById('swarmReplay');

  function syncButtons() {
    bToggle.classList.toggle('on', enabled);
    bSound.textContent = soundOn ? '🔊' : '🔇';
    bSound.classList.toggle('on', soundOn);
    bSpeed.textContent = SPEEDS[speedIdx] + '×';
  }

  /* ───────── pointer / scroll tracking ───────── */
  var mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, has: false };
  var lastUser = 0;
  window.addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.has = true; }, { passive: true });
  window.addEventListener('pointerdown', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.has = true; }, { passive: true });
  ['wheel', 'touchmove'].forEach(function (n) {
    window.addEventListener(n, function () { lastUser = performance.now(); }, { passive: true });
  });
  window.addEventListener('keydown', function (e) {
    if ([' ', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].indexOf(e.key) >= 0) lastUser = performance.now();
  });

  /* ═════════════ SOUND (Web Audio, all synthesized) ═════════════ */
  var ac = null, master = null, noiseBuf = null, bus = null, lastT = {};
  var PENTA = [329.63, 369.99, 415.30, 493.88, 554.37, 659.25, 739.99, 830.61, 987.77]; // E major pentatonic

  function audioInit() {
    try {
      if (!ac) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ac = new AC();
        var comp = ac.createDynamicsCompressor();
        comp.threshold.value = -20; comp.ratio.value = 5;
        master = ac.createGain(); master.gain.value = 0.6;
        master.connect(comp); comp.connect(ac.destination);
        noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ac.state === 'suspended') ac.resume();
      return true;
    } catch (e) { return false; }
  }
  function newBus() {
    if (!ac) return;
    var n = ac.currentTime;
    if (bus) { try { bus.gain.cancelScheduledValues(n); bus.gain.setTargetAtTime(0, n, 0.03); } catch (e) {} }
    bus = ac.createGain();
    bus.connect(master);
  }
  function stopBus() {
    if (ac && bus) { try { bus.gain.cancelScheduledValues(ac.currentTime); bus.gain.setTargetAtTime(0, ac.currentTime, 0.04); } catch (e) {} }
  }
  function ok(kind, gap) {
    if (!ac || !bus || !soundOn) return false;
    var n = ac.currentTime;
    if (lastT[kind] && n - lastT[kind] < gap) return false;
    lastT[kind] = n;
    return true;
  }
  function dst(x) {
    var d = bus;
    if (ac.createStereoPanner) {
      var p = ac.createStereoPanner();
      p.pan.value = clamp(((x - window.scrollX) / window.innerWidth) * 2 - 1, -0.85, 0.85);
      p.connect(bus);
      d = p;
    }
    return d;
  }
  function tone(d, t, type, f0, f1, dur, g) {
    var o = ac.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    var gn = ac.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(g, t + 0.005);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn); gn.connect(d);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(d, t, dur, type, f, q, g, f1) {
    var s = ac.createBufferSource(); s.buffer = noiseBuf;
    var bq = ac.createBiquadFilter(); bq.type = type; bq.Q.value = q || 1;
    bq.frequency.setValueAtTime(f, t);
    if (f1) bq.frequency.exponentialRampToValueAtTime(f1, t + dur);
    var gn = ac.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(g, t + 0.004);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bq); bq.connect(gn); gn.connect(d);
    s.start(t, Math.random() * 1.4); s.stop(t + dur + 0.03);
  }
  // glass-piano note: sine + soft octave, long decay
  function glass(d, t, f, g) {
    tone(d, t, 'sine', f, f, 1.2, g);
    tone(d, t, 'sine', f * 2, f * 2, 0.5, g * 0.3);
  }

  var sfx = {
    down: function (i, x) { // mouse press
      if (!ok('down', 0.018)) return;
      var t = ac.currentTime, d = dst(x);
      noise(d, t, 0.025, 'highpass', 2600, 0.7, 0.1);
      tone(d, t, 'sine', 1500 + i * 50, 700, 0.035, 0.05);
    },
    up: function (i, x) { // a box / image / copy lands → glass note
      if (!ok('up', 0.02)) return;
      var t = ac.currentTime, d = dst(x);
      noise(d, t, 0.04, 'bandpass', 1800, 1.5, 0.05);
      if (ok('note', 0.09)) glass(d, t + 0.005, PENTA[(Math.random() * PENTA.length) | 0], 0.08);
    },
    key: function (x) { // mechanical keyboard
      if (!ok('key', 0.026)) return;
      var t = ac.currentTime, d = dst(x);
      noise(d, t, 0.014, 'bandpass', 2800 + Math.random() * 900, 2.5, 0.075);
      tone(d, t, 'sine', 900 + Math.random() * 500, 500, 0.02, 0.02);
    },
    pen: function (i, x) { // anchor point click
      if (!ok('pen', 0.03)) return;
      tone(dst(x), ac.currentTime, 'square', 1000 + i * 40, 650, 0.035, 0.035);
    },
    zip: function (x, dur) {
      if (!ok('zip', 0.05)) return;
      noise(dst(x), ac.currentTime, dur, 'bandpass', 700, 2, 0.04, 3200);
    },
    whoosh: function (x, dur) {
      if (!ok('whoosh', 0.05)) return;
      noise(dst(x), ac.currentTime, dur, 'bandpass', 300, 1.2, 0.08, 1800);
    },
    snap: function (x) { // guide snap
      if (!ok('snap', 0.04)) return;
      var t = ac.currentTime, d = dst(x);
      noise(d, t, 0.02, 'highpass', 3500, 1, 0.09);
      tone(d, t, 'triangle', 2200, 1800, 0.03, 0.04);
    },
    join: function (k, x) { // arpeggio as the swarm fans out
      if (!ok('join', 0.03)) return;
      glass(dst(x), ac.currentTime, PENTA[(k * 2) % PENTA.length] * 1, 0.07);
    },
    wipe: function () { // swell as the page dissolves
      if (!ok('wipe', 0.1)) return;
      var t = ac.currentTime;
      noise(bus, t, 0.55, 'lowpass', 5200, 0.8, 0.16, 220);
      tone(bus, t, 'sine', 150, 48, 0.5, 0.15);
    },
    done: function () { // soft chord when finished
      if (!ok('done', 0.1)) return;
      var t = ac.currentTime;
      [329.63, 415.30, 493.88, 659.25].forEach(function (f, k) { glass(bus, t + k * 0.06, f, 0.07); });
    }
  };

  /* ═════════════ tween engine (single rAF loop) ═════════════ */
  var active = [], raf = 0, current = null;
  function gT(owner, ms, fn, ease) {
    return new Promise(function (res) {
      active.push({ o: owner, t0: performance.now(), ms: Math.max(ms, 1), fn: fn || null, ease: ease || easeInOut, res: res });
      if (!raf) raf = requestAnimationFrame(tick);
    });
  }
  function tick(now) {
    raf = 0;
    var list = active; active = [];
    for (var i = 0; i < list.length; i++) {
      var tw = list[i];
      var p = clamp((now - tw.t0) / tw.ms, 0, 1);
      if (tw.fn) { try { tw.fn(tw.ease(p)); } catch (e) {} }
      if (p < 1) active.push(tw); else tw.res();
    }
    if (current && current.follow) current.follow(now);
    if (active.length && !raf) raf = requestAnimationFrame(tick);
  }
  function flush(owner) {
    var keep = [];
    active.forEach(function (tw) { if (tw.o === owner) tw.res(); else keep.push(tw); });
    active = keep;
  }

  /* ═════════════ one rebuild run ═════════════ */
  var CUR_SVG =
    '<svg class="ic arrow" width="14" height="20" viewBox="0 0 14 20"><path class="f" d="M1 1v15l4.2-3.8 3 6.8 2.6-1.2-3-6.6H13z" stroke="#0a0c10" stroke-width="1.2" stroke-linejoin="round"/></svg>' +
    '<svg class="ic cross" width="22" height="22" viewBox="0 0 22 22" style="left:-11px;top:-11px"><path d="M11 2v18M2 11h18" stroke="#0a0c10" stroke-width="3.6" stroke-linecap="round"/><path class="s" d="M11 2v18M2 11h18" stroke-width="1.6" stroke-linecap="round"/></svg>' +
    '<svg class="ic text" width="12" height="22" viewBox="0 0 12 22" style="left:-6px;top:-11px"><path d="M3 2h6M6 2v18M3 20h6" stroke="#0a0c10" stroke-width="3.6" stroke-linecap="round"/><path class="s" d="M3 2h6M6 2v18M3 20h6" stroke-width="1.6" stroke-linecap="round"/></svg>' +
    '<svg class="ic pen" width="22" height="22" viewBox="0 0 22 22" style="left:-2px;top:-20px"><path class="f" d="M2 20l1.6-6.4L14 3.2a2 2 0 0 1 2.8 0l1.4 1.4a2 2 0 0 1 0 2.8L7.8 18.4z" stroke="#0a0c10" stroke-width="1.2" stroke-linejoin="round"/></svg>';

  function startRun(root, pageId, spawn) {
    var dead = false, owner = {}, K = 1;
    var saved = [], wraps = [], jobs = [], cursors = [];
    var lead = null, completed = 0, head = 0, ncur = 1, guideBudget = 3;
    var layerH = Math.max(document.documentElement.scrollHeight, window.innerHeight);
    var layer = mk('div', 'sr-layer');
    layer.style.height = layerH + 'px';
    document.body.appendChild(layer);

    function T(ms, fn, ease) { return dead ? Promise.resolve() : gT(owner, ms / K, fn, ease); }
    function Tn(ms) { return dead ? Promise.resolve() : gT(owner, ms, null, lin); }
    function add(n) { if (!dead) layer.appendChild(n); return n; }
    function later(fn, ms) { setTimeout(function () { try { fn(); } catch (e) {} }, ms); }
    function detach(n) { if (n && n.parentNode) n.parentNode.removeChild(n); }

    /* ───────── snapshot the page into "jobs" ───────── */
    function wrapOwn(e) {
      var spans = [];
      [].slice.call(e.childNodes).forEach(function (n) {
        if (n.nodeType !== 3 || !/\S/.test(n.nodeValue)) return;
        var frag = document.createDocumentFragment(), mine = [];
        Array.from(n.nodeValue).forEach(function (ch) {
          var s = document.createElement('span');
          s.className = 'sr-ch';
          s.textContent = ch;
          s.style.visibility = 'hidden';
          frag.appendChild(s);
          mine.push(s);
        });
        n.parentNode.replaceChild(frag, n);
        wraps.push({ node: n, spans: mine });
        spans = spans.concat(mine);
      });
      return spans;
    }

    function prepare() {
      var all = [root].concat([].slice.call(root.querySelectorAll('*')));
      var elig = [], list = [], textEls = [];
      var sx = window.scrollX, sy = window.scrollY;

      // pass 1: measure only (no DOM writes → a single layout)
      all.forEach(function (e) {
        var tag = e.tagName.toLowerCase();
        if (tag === 'script' || tag === 'style' || tag === 'br' || tag === 'noscript' || tag === 'template') return;
        if (tag !== 'svg' && e.closest('svg')) return;
        elig.push(e);
        var cs = getComputedStyle(e);
        if (cs.display === 'none') return;
        var r = e.getBoundingClientRect();
        var hasText = [].some.call(e.childNodes, function (n) { return n.nodeType === 3 && /\S/.test(n.nodeValue); });
        if (hasText) textEls.push(e);
        if (r.width < 1 && r.height < 1) return;

        var isImg = (tag === 'img' || tag === 'svg' || tag === 'canvas' || tag === 'video' || tag === 'picture');
        var bgImg = cs.backgroundImage !== 'none';
        var box = alphaOf(cs.backgroundColor) > 0.04 || bgImg || borderVisible(cs) || cs.boxShadow !== 'none';
        var line = box && !isImg && ((r.height <= 3 && r.width >= 24) || (r.width <= 3 && r.height >= 24));
        var kinds = [];
        if (line) kinds.push('line');
        else if (isImg || bgImg) kinds.push('media');
        else if (box) kinds.push('box');
        if (hasText) kinds.push('text');
        if (!kinds.length) return;
        list.push({
          el: e, tag: tag, kinds: kinds,
          rect: { x: r.left + sx, y: r.top + sy, w: r.width, h: r.height },
          op: parseFloat(cs.opacity) || 1,
          parent: null, sub: 0, taken: false, done: false, drawn: false, dupOf: null, spans: []
        });
      });

      // parent links
      var jobOf = new Map();
      list.forEach(function (j) { jobOf.set(j.el, j); });
      list.forEach(function (j) {
        var p = j.el.parentElement;
        while (p && !jobOf.has(p)) p = p.parentElement;
        j.parent = p ? jobOf.get(p) : null;
      });

      // duplicates: 2nd, 3rd… sibling with the same class is an ⌥-dragged copy of the first
      var gid = new Map(), first = {};
      list.forEach(function (j) {
        var pe = j.el.parentElement;
        var cn = typeof j.el.className === 'string' ? j.el.className.trim() : '';
        if (!pe || !cn || j.kinds.indexOf('line') >= 0) return;
        if (!gid.has(pe)) gid.set(pe, gid.size + 1);
        var key = gid.get(pe) + '|' + j.tag + '|' + cn;
        if (!first[key]) first[key] = j; else j.dupOf = first[key];
      });
      list = list.filter(function (j) {
        for (var p = j.parent; p; p = p.parent) if (p.dupOf) return false;
        return true;
      });
      if (list.length > CFG.maxJobs) list = list.slice(0, CFG.maxJobs);
      list.forEach(function (j) { for (var p = j.parent; p; p = p.parent) p.sub++; });

      // pass 2: wrap text into per-character spans, then hide everything
      var textMap = new Map();
      textEls.forEach(function (e) { textMap.set(e, wrapOwn(e)); });
      list.forEach(function (j) { j.spans = textMap.get(j.el) || []; });
      elig.forEach(function (e) {
        saved.push([e, e.style.visibility, e.style.opacity, e.style.transition, e.style.clipPath]);
        e.style.visibility = 'hidden';
      });
      return list;
    }

    function restoreDom() {
      wraps.forEach(function (w) {
        var first = w.spans[0];
        if (first && first.parentNode) first.parentNode.insertBefore(w.node, first);
        w.spans.forEach(detach);
      });
      saved.forEach(function (a) {
        var e = a[0];
        e.style.visibility = a[1]; e.style.opacity = a[2]; e.style.transition = a[3]; e.style.clipPath = a[4];
      });
      saved = []; wraps = [];
    }

    /* ───────── cursors ───────── */
    function makeCursor(i) {
      var c = { i: i, x: 0, y: 0, name: CFG.names[i % CFG.names.length], color: CFG.colors[i % CFG.colors.length] };
      var d = mk('div', 'sr-cur', CUR_SVG + '<span class="sr-badge">⌥ Alt</span><span class="sr-name"></span>');
      d.querySelector('.sr-name').textContent = c.name;
      d.style.setProperty('--c', c.color);
      d.setAttribute('data-t', 'arrow');
      c.el = d;
      add(d);
      return c;
    }
    function cset(c, x, y) {
      c.x = x; c.y = y;
      c.el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    }
    function ctool(c, t) { c.el.setAttribute('data-t', t); }
    async function moveTo(c, x, y, ms) {
      var x0 = c.x, y0 = c.y, dx = x - x0, dy = y - y0, d = Math.hypot(dx, dy);
      if (d < 2) { cset(c, x, y); return; }
      var nx = -dy / d, ny = dx / d, off = (Math.random() - 0.5) * d * 0.35;
      var cx = (x0 + x) / 2 + nx * off, cy = (y0 + y) / 2 + ny * off;
      await T(ms || clamp(120 + d * 0.45, 120, 520), function (e) {
        var u = 1 - e;
        cset(c, u * u * x0 + 2 * u * e * cx + e * e * x, u * u * y0 + 2 * u * e * cy + e * e * y);
      }, easeInOut);
    }

    /* ───────── overlay pieces ───────── */
    function mkSel(c, dash) {
      var d = mk('div', 'sr-sel' + (dash ? ' dash' : ''), '<i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i><b class="sr-dim"></b>');
      d.style.setProperty('--c', c.color);
      return add(d);
    }
    function setBox(d, x, y, w, h, label) {
      d.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      d.style.width = Math.max(w, 0) + 'px';
      d.style.height = Math.max(h, 0) + 'px';
      if (label !== undefined) d.lastChild.textContent = label;
    }
    function kill(d, ms) {
      d.classList.add('out');
      later(function () { detach(d); }, ms || 320);
    }
    function mkGuides(c) {
      var g = [];
      ['h', 'h', 'v', 'v'].forEach(function (k) {
        var d = mk('div', 'sr-g ' + k);
        d.style.setProperty('--c', c.color);
        add(d); g.push(d);
      });
      return g;
    }
    function setGuides(g, x, y, w, h) {
      g[0].style.transform = 'translate3d(0,' + y + 'px,0)';
      g[1].style.transform = 'translate3d(0,' + (y + h) + 'px,0)';
      g[2].style.transform = 'translate3d(' + x + 'px,0,0)';
      g[3].style.transform = 'translate3d(' + (x + w) + 'px,0,0)';
    }
    function killGuides(g, ms) {
      g.forEach(function (d) { d.style.opacity = '0'; });
      later(function () { g.forEach(detach); }, ms || 320);
    }
    function mkAnchor(c, x, y) {
      var d = mk('div', 'sr-anchor');
      d.style.setProperty('--c', c.color);
      d.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      return add(d);
    }

    /* ───────── reveal helpers ───────── */
    function fadeIn(j, ms) {
      var e = j.el;
      e.style.transition = 'none'; e.style.opacity = '0'; e.style.visibility = 'visible';
      return T(ms, function (p) { e.style.opacity = String(p * j.op); }, lin).then(function () {
        if (dead) return;
        e.style.opacity = ''; e.style.transition = '';
      });
    }
    function wipeIn(e, ms) {
      e.style.clipPath = 'inset(0 0 100% 0)'; e.style.visibility = 'visible';
      return T(ms, function (p) { e.style.clipPath = 'inset(0 0 ' + ((1 - p) * 100) + '% 0)'; }, easeOut).then(function () {
        if (!dead) e.style.clipPath = '';
      });
    }

    /* ───────── actions ───────── */
    async function doBox(c, j, kind) {
      var r = j.rect, big = r.w * r.h > 5000;
      await moveTo(c, r.x, r.y); if (dead) return;
      ctool(c, 'cross');
      var sel = mkSel(c), gd = big ? mkGuides(c) : null;
      sfx.down(c.i, c.x);
      var dragMs = clamp(220 + Math.hypot(r.w, r.h) * 0.25, 220, 520);
      await T(dragMs, function (e) {
        var w = r.w * e, h = r.h * e;
        setBox(sel, r.x, r.y, w, h, Math.round(w) + ' × ' + Math.round(h));
        if (gd) setGuides(gd, r.x, r.y, w, h);
        cset(c, r.x + w, r.y + h);
      }, easeOut);
      if (dead) return;
      sfx.up(c.i, c.x);
      if (kind === 'media' && (j.tag === 'img' || j.tag === 'svg')) wipeIn(j.el, 380); else fadeIn(j, kind === 'media' ? 300 : 160);
      kill(sel, 420);
      if (gd) killGuides(gd, 260);
      ctool(c, 'arrow');
    }

    async function doLine(c, j) {
      var r = j.rect, horiz = r.w >= r.h, len = horiz ? r.w : r.h;
      var x0 = r.x, y0 = horiz ? r.y + r.h / 2 : r.y;
      await moveTo(c, x0, y0); if (dead) return;
      ctool(c, 'pen'); sfx.pen(c.i, x0);
      var a1 = mkAnchor(c, x0, y0);
      var path = mk('div', 'sr-pen'); path.style.setProperty('--c', c.color); add(path);
      var e = j.el;
      e.style.visibility = 'visible';
      e.style.clipPath = horiz ? 'inset(0 100% 0 0)' : 'inset(0 0 100% 0)';
      sfx.zip(x0, Math.min(0.6, len * 0.001 + 0.2));
      await T(clamp(len * 0.9, 220, 650), function (p) {
        var L = len * p;
        if (horiz) { setBox(path, x0, y0 - 0.75, L, 1.5); cset(c, x0 + L, y0); }
        else { setBox(path, x0 - 0.75, y0, 1.5, L); cset(c, x0, y0 + L); }
        e.style.clipPath = horiz ? 'inset(0 ' + ((1 - p) * 100) + '% 0 0)' : 'inset(0 0 ' + ((1 - p) * 100) + '% 0)';
      }, easeInOut);
      if (dead) return;
      e.style.clipPath = '';
      var a2 = mkAnchor(c, horiz ? x0 + len : x0, horiz ? y0 : y0 + len);
      sfx.pen(c.i, c.x);
      later(function () { [a1, a2, path].forEach(function (n) { n.style.opacity = '0'; }); }, 250);
      later(function () { [a1, a2, path].forEach(detach); }, 600);
      ctool(c, 'arrow');
    }

    async function doText(c, j) {
      var spans = j.spans;
      if (!spans.length) return;
      var rects = spans.map(function (s) {
        var b = s.getBoundingClientRect();
        return (b.width === 0 && b.height === 0) ? null : { x: b.left + window.scrollX, y: b.top + window.scrollY, w: b.width, h: b.height };
      });
      var minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
      rects.forEach(function (r) {
        if (!r) return;
        minX = Math.min(minX, r.x); minY = Math.min(minY, r.y);
        maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h);
      });
      if (maxX < 0) { spans.forEach(function (s) { s.style.visibility = 'visible'; }); return; }
      var u = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };

      // ruler guide: drag a red guide out of the left ruler, text snaps onto it
      if (guideBudget > 0 && u.w > 100 && u.x > 40) {
        guideBudget--;
        await moveTo(c, Math.max(window.scrollX + 8, 8), u.y + u.h / 2); if (dead) return;
        ctool(c, 'arrow');
        var rl = mk('div', 'sr-ruler l'); rl.style.transform = 'translate3d(-16px,0,0)';
        rl.style.height = layerH + 'px'; add(rl);
        var gl = mk('div', 'sr-g v sr-red'); gl.style.transform = 'translate3d(8px,0,0)'; add(gl);
        var lab = mk('div', 'sr-redlab'); add(lab);
        later(function () { rl.style.transform = 'translate3d(0,0,0)'; }, 10);
        sfx.down(c.i, c.x);
        var gx0 = c.x;
        await T(360, function (p) {
          var x = gx0 + (u.x - gx0) * p;
          gl.style.transform = 'translate3d(' + x + 'px,0,0)';
          lab.style.transform = 'translate3d(' + (x + 8) + 'px,' + (c.y - 24) + 'px,0)';
          lab.textContent = Math.round(x);
          cset(c, x, c.y);
        }, easeOut);
        if (dead) return;
        sfx.snap(c.x);
        later(function () { gl.style.opacity = '0'; lab.classList.add('out'); rl.style.transform = 'translate3d(-16px,0,0)'; }, 520);
        later(function () { detach(gl); detach(lab); detach(rl); }, 1000);
      }

      await moveTo(c, u.x, u.y); if (dead) return;
      ctool(c, 'cross');
      var box = mkSel(c, true);
      sfx.down(c.i, c.x);
      var padx = 3, pady = 2;
      await T(200, function (e) {
        setBox(box, u.x - padx, u.y - pady, (u.w + padx * 2) * e, (u.h + pady * 2) * e);
        cset(c, u.x + u.w * e, u.y + u.h * e);
      }, easeOut);
      if (dead) return;
      ctool(c, 'text');
      var caret = mk('div', 'sr-caret'); caret.style.setProperty('--c', c.color); add(caret);
      var n = spans.length, shown = 0;
      function caretAt(k) { // last measurable rect at or before k
        for (var q = Math.min(k, n - 1); q >= 0; q--) if (rects[q]) return rects[q];
        return rects.find(function (r) { return r; });
      }
      var first = caretAt(0) || u;
      caret.style.height = first.h + 'px';
      caret.style.transform = 'translate3d(' + first.x + 'px,' + first.y + 'px,0)';
      await T(clamp(n * 22, 260, 1500), function (p) {
        var target = Math.round(p * n);
        while (shown < target) {
          spans[shown].style.visibility = 'visible';
          shown++;
          if (shown % 2 === 0) sfx.key(c.x);
        }
        var r = caretAt(shown - 1);
        if (r) {
          caret.style.height = r.h + 'px';
          caret.style.transform = 'translate3d(' + (shown ? r.x + r.w : r.x) + 'px,' + r.y + 'px,0)';
          cset(c, (shown ? r.x + r.w : r.x) + 7, r.y + r.h * 0.6);
        }
      }, lin);
      spans.forEach(function (s) { s.style.visibility = 'visible'; });
      kill(caret, 150); kill(box, 380);
      if (!dead) ctool(c, 'arrow');
    }

    function revealSubtree(j) {
      var e = j.el;
      [e].concat([].slice.call(e.querySelectorAll('*'))).forEach(function (n) {
        if (n.classList && n.classList.contains('sr-ch')) return;
        if (n.tagName.toLowerCase() !== 'svg' && n.closest('svg')) return;
        n.style.visibility = 'visible';
      });
      e.style.transition = 'none'; e.style.opacity = '0';
      T(220, function (p) { e.style.opacity = String(p * j.op); }, lin).then(function () {
        if (!dead) { e.style.opacity = ''; e.style.transition = ''; }
      });
      var chars = [].slice.call(e.querySelectorAll('.sr-ch')), shown = 0;
      return T(clamp(160 + chars.length * 2.2, 200, 650), function (p) {
        var t = Math.floor(p * chars.length);
        if (t > shown) { sfx.key(chars[Math.min(t, chars.length) - 1].getBoundingClientRect().left + window.scrollX); }
        while (shown < t) { chars[shown].style.visibility = 'visible'; shown++; }
      }, lin).then(function () { chars.forEach(function (s) { s.style.visibility = 'visible'; }); });
    }

    async function doDup(c, j) {
      var s = j.dupOf.rect, t = j.rect;
      var ox = Math.min(s.w * 0.5, 60), oy = Math.min(s.h * 0.4, 40);
      await moveTo(c, s.x + ox, s.y + oy); if (dead) return;
      ctool(c, 'arrow');
      c.el.setAttribute('data-alt', '1');
      sfx.down(c.i, c.x);
      var g = mk('div', 'sr-ghost'); g.style.setProperty('--c', c.color); g.style.setProperty('--a', hexA(c.color, 0.1)); add(g);
      setBox(g, s.x, s.y, s.w, s.h);
      sfx.whoosh(c.x, 0.3);
      var dist = Math.hypot(t.x - s.x, t.y - s.y);
      await T(clamp(260 + dist * 0.35, 320, 760), function (p) {
        var x = s.x + (t.x - s.x) * p, y = s.y + (t.y - s.y) * p - Math.sin(Math.PI * p) * Math.min(40, dist * 0.1);
        var w = s.w + (t.w - s.w) * p, h = s.h + (t.h - s.h) * p;
        setBox(g, x, y, w, h);
        cset(c, x + ox * (w / s.w), y + oy * (h / s.h));
      }, easeInOut);
      if (dead) return;
      sfx.up(c.i, c.x);
      var lab = mk('div', 'sr-redlab'); lab.textContent = '+' + Math.round(t.x - s.x) + ', ' + Math.round(t.y - s.y);
      lab.style.transform = 'translate3d(' + (t.x + t.w / 2 - 30) + 'px,' + (t.y - 22) + 'px,0)'; add(lab);
      later(function () { lab.classList.add('out'); }, 450); later(function () { detach(lab); }, 800);
      kill(g, 260);
      c.el.removeAttribute('data-alt');
      await revealSubtree(j);
    }

    async function perform(c, j) {
      if (j.dupOf) { await doDup(c, j); return; }
      for (var k = 0; k < j.kinds.length; k++) {
        if (dead) return;
        var kind = j.kinds[k];
        if (kind === 'box' || kind === 'media') { await doBox(c, j, kind); if (j.kinds.indexOf('text') < 0) j.drawn = true; }
        else if (kind === 'line') { await doLine(c, j); j.drawn = true; }
        else if (kind === 'text') { await doText(c, j); j.drawn = true; }
      }
    }

    /* ───────── scheduling ───────── */
    function pick(c) {
      while (head < jobs.length && jobs[head].taken) head++;
      var best = null, bs = 1e12, seen = 0;
      for (var i = head; i < jobs.length && seen < 14; i++) {
        var j = jobs[i];
        if (j.taken) continue;
        seen++;
        if (j.parent && !j.parent.drawn) continue;                               // children wait for their parent box
        if (j.dupOf && !(j.dupOf.done && j.dupOf.sub === 0)) continue;            // copies wait for the master
        var s = Math.hypot(j.rect.x - c.x, j.rect.y - c.y) + (i - head) * 30;
        if (s < bs) { bs = s; best = j; }
      }
      return best;
    }

    function hudText() {
      hudT.textContent = ncur + ' cursors · /' + pageId + ' · ' + Math.round(completed / Math.max(jobs.length, 1) * 100) + '%';
    }

    async function worker(c, delay) {
      await Tn(delay);
      if (dead) return;
      c.el.classList.add('in');
      sfx.join(c.i, c.x);
      while (!dead) {
        var j = pick(c);
        if (!j) {
          while (head < jobs.length && jobs[head].taken) head++;
          if (head >= jobs.length) break;
          await Tn(45);
          continue;
        }
        j.taken = true; lead = c;
        try { await perform(c, j); } catch (err) { /* keep going */ }
        if (dead) return;
        j.done = true; j.drawn = true;
        for (var p = j.parent; p; p = p.parent) p.sub--;
        completed++; hudText();
      }
    }

    /* ───────── finish / abort ───────── */
    async function finish() {
      if (dead) return;
      sfx.done();
      // finale: the swarm flocks to your mouse, then fades
      var mx = (mouse.has ? mouse.x : window.innerWidth / 2) + window.scrollX;
      var my = (mouse.has ? mouse.y : window.innerHeight / 2) + window.scrollY;
      cursors.forEach(function (c, i) {
        ctool(c, 'arrow');
        var a = (i / cursors.length) * 6.283, tx = mx + Math.cos(a) * 46, ty = my + Math.sin(a) * 46;
        moveTo(c, tx, ty, 520);
      });
      await Tn(700);
      if (dead) return;
      cursors.forEach(function (c) { c.el.classList.remove('in'); });
      restoreDom();
      hud.style.display = 'none'; bSkip.style.display = 'none';
      grid.classList.remove('on');
      later(function () { detach(layer); }, 500);
      if (current === api) current = null;
      dead = true;
    }

    function abort() {
      if (dead) return;
      dead = true;
      flush(owner);
      restoreDom();
      detach(layer);
      hud.style.display = 'none'; bSkip.style.display = 'none';
      grid.classList.remove('on');
      stopBus();
      if (current === api) current = null;
    }

    function follow(now) {
      if (dead || !lead || now - lastUser < 1800) return;
      var vh = window.innerHeight, top = window.scrollY, y = lead.y;
      if (y < top + 100 || y > top + vh - 100) {
        var target = clamp(y - vh * 0.45, 0, Math.max(0, layerH - vh));
        window.scrollTo(0, top + (target - top) * 0.14);
      }
    }

    var api = { abort: abort, follow: follow };

    /* ───────── go ───────── */
    jobs = prepare();
    if (!jobs.length) { restoreDom(); detach(layer); return null; }

    ncur = Math.min(NCUR, Math.max(1, Math.ceil(jobs.length / 3)));
    var est = 0;
    jobs.forEach(function (j) {
      if (j.dupOf) { est += 1000; return; }
      j.kinds.forEach(function (k) {
        if (k === 'text') est += 300 + clamp(j.spans.length * 22, 260, 1500) + 80;
        else if (k === 'line') est += 300 + clamp(Math.max(j.rect.w, j.rect.h) * 0.9, 220, 650);
        else est += 300 + clamp(220 + Math.hypot(j.rect.w, j.rect.h) * 0.25, 220, 520) + 60;
      });
    });
    est = est / ncur * 1.6;
    K = clamp(est / (CFG.targetSeconds * 1000), 1, 4) * SPEEDS[speedIdx];

    grid.classList.add('on');
    hud.style.display = 'flex'; bSkip.style.display = 'block';
    hudText();
    sfx.wipe();

    // cursors burst out of the nav button you clicked (or the screen edge)
    for (var i = 0; i < ncur; i++) {
      var c = makeCursor(i);
      var sx0, sy0;
      if (spawn) { sx0 = spawn.x + window.scrollX + (Math.random() - 0.5) * 30; sy0 = spawn.y + window.scrollY + (Math.random() - 0.5) * 20; }
      else { sx0 = Math.random() * window.innerWidth; sy0 = window.scrollY - 40; }
      cset(c, sx0, sy0);
      cursors.push(c);
    }
    var workers = cursors.map(function (c, i) { return worker(c, 90 + i * 120); });
    Promise.all(workers).then(finish);
    return api;
  }

  /* ═════════════ glue: hook into the site ═════════════ */
  function activePage() {
    var a = document.querySelector('.page.active');
    return a ? a.id.replace('page-', '') : 'home';
  }

  function rebuild(pageId, opts) {
    opts = opts || {};
    if (current) current.abort();
    if (!enabled) return;
    var root = document.getElementById('page-' + pageId);
    if (!root) return;
    if (opts.sound !== false && soundOn && audioInit()) newBus();
    else if (opts.sound === false) stopBus();
    var spawn = null;
    if (opts.spawn && mouse.has) spawn = { x: mouse.x, y: mouse.y };
    current = startRun(root, pageId, spawn);
  }

  // The site's nav buttons call goTo(page, btn). Wrap it so every page change
  // also wipes + rebuilds the new page. It keeps working on every page.
  if (typeof window.goTo === 'function') {
    var origGoTo = window.goTo;
    window.goTo = function (page) {
      var out = origGoTo.apply(this, arguments);
      rebuild(page, { spawn: true });
      return out;
    };
  }

  bToggle.addEventListener('click', function () {
    enabled = !enabled;
    store.set('axel-swarm', enabled ? '1' : '0');
    if (!enabled && current) current.abort();
    syncButtons();
  });
  bSound.addEventListener('click', function () {
    soundOn = !soundOn;
    store.set('axel-swarm-sound', soundOn ? '1' : '0');
    if (!soundOn) stopBus();
    else if (audioInit() && !bus) newBus();
    syncButtons();
  });
  bSpeed.addEventListener('click', function () {
    speedIdx = (speedIdx + 1) % SPEEDS.length;
    store.set('axel-swarm-speed', String(speedIdx));
    syncButtons();
  });
  bReplay.addEventListener('click', function () {
    if (!enabled) { enabled = true; store.set('axel-swarm', '1'); syncButtons(); }
    window.scrollTo(0, 0);
    rebuild(activePage(), { spawn: false });
  });
  bSkip.addEventListener('click', function () { if (current) current.abort(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && current) current.abort();
    if ((e.key === 'm' || e.key === 'M') && !/INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) bSound.click();
  });
  var lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    if (window.innerWidth !== lastW) { lastW = window.innerWidth; if (current) current.abort(); }
  });

  syncButtons();
  if (CFG.introOnLoad && enabled) {
    window.addEventListener('load', function () { rebuild(activePage(), { sound: false, spawn: false }); });
  }

  // handy: swarmRebuild('about')
  window.swarmRebuild = function (p) { rebuild(p || activePage(), { spawn: false }); };
})();