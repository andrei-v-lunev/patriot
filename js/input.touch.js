/* Contextual mobile controls: drift stick + ACTION/JUMP/TAG and gated SPECIAL. */
(function () {
  var origin = null, stickId = -1, canvas = null, visible = false, releasedAt = 0;
  var knob = { x: 0, y: 0 }, hist = [], active = {}, down = {};
  var hold = { action: false, jump: false, tag: false, special: false };
  var was = { action: false, jump: false, tag: false, special: false };
  var btnIds = { action: -1, jump: -1, tag: -1, special: -1 };
  var pending = { gripRelease: false, throwDir: -1, ukemi: false, pause: false };

  /* PRD coordinates are on the 960×540 UI layer; these are half-scale world units. */
  var BASE = [
    { id: "action", x: 430, y: 220, r: 30 },
    { id: "jump", x: 368, y: 230, r: 24 },
    { id: "tag", x: 432, y: 164, r: 21 },
    { id: "special", x: 374, y: 172, r: 25 }
  ];
  var BTNS = BASE.map(function (b) { return { id: b.id, x: b.x, y: b.y, r: b.r }; });

  function settings() {
    var p = window.PSettings && window.PSettings.get ? window.PSettings.get() : null;
    return p || { vibration: "full", reducedMotion: false, touch: { layout: "right", scale: 1 } };
  }
  function state() { return window.PGame && window.PGame.state || null; }
  function hero() {
    var s = state(), hs = s && s.heroes || [], i = s && s.activeHero | 0;
    return hs[i] && !hs[i].benched ? hs[i] : hs.filter(function (h) { return h && h.alive && !h.benched; })[0];
  }
  function specialReady() {
    var s = state(), h = hero(), meter = h && h.meter;
    if (meter == null && s) meter = typeof s.meter === "number" ? s.meter : 0;
    return (meter || 0) >= 100;
  }
  function available(b) {
    var s = state();
    if (b.id === "special" && !specialReady()) return false;
    if (b.id === "tag" && s && (s.players | 0) === 2) return false;
    return true;
  }
  function layout() {
    var cfg = settings().touch || { layout: "right", scale: 1 }, scale = cfg.scale || 1, i, b;
    for (i = 0; i < BTNS.length; i++) {
      b = BTNS[i]; b.x = BASE[i].x; b.y = BASE[i].y; b.r = BASE[i].r * scale;
      if (cfg.layout === "mirrored") b.x = 480 - b.x;
    }
    return cfg;
  }
  function logical(e) {
    var el = canvas || (window.PBoot && window.PBoot.canvas) || document.getElementById("game");
    if (!el) return { x: 0, y: 0 };
    var r = el.getBoundingClientRect();
    return { x: (e.clientX - r.left) * 480 / (r.width || 1), y: (e.clientY - r.top) * 270 / (r.height || 1) };
  }
  function hitBtn(x, y) {
    var i, b, dx, dy; layout();
    for (i = BTNS.length - 1; i >= 0; i--) {
      b = BTNS[i]; if (!available(b)) continue;
      dx = x - b.x; dy = y - b.y;
      if (dx * dx + dy * dy <= (b.r + 6) * (b.r + 6)) return b.id;
    }
    return null;
  }
  function buzz(ms) {
    var cfg = settings();
    if (cfg.reducedMotion || cfg.vibration === "off" || !navigator.vibrate) return;
    navigator.vibrate(cfg.vibration === "weak" ? Math.max(4, ms * 0.5) : ms);
  }
  function onDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    var p = logical(e), id = e.pointerId, cfg = layout(), which = hitBtn(p.x, p.y), now = e.timeStamp || 0;
    visible = true; active[id] = true; down[id] = { x: p.x, y: p.y, t: now, button: which };
    if (Object.keys(active).length === 2) pending.pause = true;
    if (window.PInput && window.PInput.setLastDevice) window.PInput.setLastDevice("touch");
    if (which) { hold[which] = true; btnIds[which] = id; buzz(8); }
    else if ((cfg.layout === "mirrored" ? p.x > 264 : p.x < 216) && stickId < 0) {
      stickId = id; origin = { x: p.x, y: p.y }; knob.x = p.x; knob.y = p.y;
      hist = [{ x: p.x, y: p.y, t: now }];
    }
    if (e.preventDefault) e.preventDefault();
  }
  function onMove(e) {
    var p = logical(e), now = e.timeStamp || 0, dx, dy, len;
    if (e.pointerId === stickId && origin) {
      dx = p.x - origin.x; dy = p.y - origin.y; len = Math.sqrt(dx * dx + dy * dy);
      if (len > 32) { origin.x = p.x - dx / len * 32; origin.y = p.y - dy / len * 32; }
      knob.x = p.x; knob.y = p.y; hist.push({ x: p.x, y: p.y, t: now });
      while (hist.length && hist[0].t < now - 100) hist.shift();
    }
    if (down[e.pointerId]) { down[e.pointerId].lastX = p.x; down[e.pointerId].lastY = p.y; }
    if (e.preventDefault) e.preventDefault();
  }
  function octant(x, d) {
    if (!x && !d) return -1;
    var a = Math.atan2(d, x) * 180 / Math.PI; if (a < 0) a += 360;
    return [2, 1, 0, 7, 6, 5, 4, 3][Math.round(a / 45) % 8];
  }
  function onUp(e) {
    var id = e.pointerId, rec = down[id], p = logical(e), now = e.timeStamp || 0, dx, dy, dur;
    if (id === stickId) { stickId = -1; origin = null; hist = []; releasedAt = performance.now(); }
    if (rec) {
      dx = p.x - rec.x; dy = p.y - rec.y; dur = now - rec.t;
      if (rec.button === "action") {
        pending.gripRelease = true;
        pending.throwDir = Math.sqrt(dx * dx + dy * dy) >= 28 && dur <= 220 ? octant(dx, -dy) : -1;
      } else if (!rec.button && rec.x > 240 && dy >= 24 && dur <= 200) pending.ukemi = true;
    }
    Object.keys(btnIds).forEach(function (k) { if (btnIds[k] === id) { hold[k] = false; btnIds[k] = -1; } });
    delete active[id]; delete down[id];
  }
  function nearGrip(h) {
    var s = state(), list = s && s.enemies || [], i, e;
    for (i = 0; i < list.length; i++) {
      e = list[i]; if (!e || !e.alive) continue;
      if (Math.abs((h.x || 0) - (e.x || 0)) <= 62 && Math.abs((h.d || 0) - (e.d || 0)) <= 14) return true;
    }
    return false;
  }
  function edge(intent, name, held, previous) {
    intent[name] = held; intent[name + "Pressed"] = held && !previous;
    intent[name + "Released"] = !held && previous;
    if (intent[name + "Pressed"] && intent.pressedAtTick) intent.pressedAtTick[name] = window.PInput && window.PInput.tick ? window.PInput.tick() : 0;
  }
  function poll(intent, tick) {
    if (!intent) return;
    var dx = origin ? knob.x - origin.x : 0, dy = origin ? knob.y - origin.y : 0;
    if (origin) { intent.moveX = Math.round(Math.max(-1, Math.min(1, dx / 24)) * 8) / 8; intent.moveD = Math.round(Math.max(-1, Math.min(1, -dy / 24)) * 8) / 8; }
    var h = hero(), gripping = h && (h.combatState === "GRIPPED" || h.combatState === "THROWING");
    var grip = hold.action && (gripping || (h && nearGrip(h))), strike = hold.action && !grip;
    edge(intent, "grip", grip, was.action && !strike); edge(intent, "throw", strike, was.action && !grip);
    edge(intent, "jump", hold.jump, was.jump); edge(intent, "tag", hold.tag, was.tag);
    edge(intent, "special", hold.special && specialReady(), was.special);
    if (pending.gripRelease) { intent.gripReleased = true; intent.throwDir = pending.throwDir; pending.gripRelease = false; }
    if (pending.ukemi) { intent.ukemi = true; intent.ukemiPressed = true; if (intent.pressedAtTick) intent.pressedAtTick.ukemi = tick | 0; pending.ukemi = false; }
    if (pending.pause) { intent.pause = true; intent.pausePressed = true; pending.pause = false; }
    was.action = hold.action; was.jump = hold.jump; was.tag = hold.tag; was.special = hold.special;
    if (hold.action || hold.jump || hold.tag || hold.special || origin) if (window.PInput && window.PInput.setLastDevice) window.PInput.setLastDevice("touch");
  }

  function circle(ctx, b, on) {
    var colors = { action: "#F2C14E", jump: "#8FD3FF", tag: "#8FE79A", special: "#FF7AA8" };
    ctx.beginPath(); ctx.arc(b.x + 2, b.y + 3, b.r + 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fill();
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = on ? colors[b.id] : "rgba(20,18,28,.82)"; ctx.fill();
    ctx.strokeStyle = colors[b.id]; ctx.lineWidth = on ? 3 : 2; ctx.stroke();
  }
  function label(ctx, b, on) {
    var h = hero(), gripping = h && (h.combatState === "GRIPPED" || h.combatState === "THROWING");
    var names = { jump: "ПРЫГ", tag: "СМЕНА", special: "СУПЕР" };
    var str = b.id === "action" ? (gripping ? "БРОСОК" : h && nearGrip(h) ? "ЗАХВАТ" : "ПРИЁМ") : names[b.id];
    if (window.PFont && PFont.measure && PFont.draw) {
      var w = PFont.measure(str, 1);
      PFont.draw(ctx, str, (b.x - w * 0.5) | 0, b.y - 3, 1, on ? "#14121C" : "#FFFFFF");
    } else {
      ctx.fillStyle = on ? "#14121C" : "#FFFFFF";
      ctx.fillRect(b.x - 7, b.y - 3, 14, 6);
    }
  }
  function draw(ctx) {
    if (!visible || !ctx) return; layout();
    var fade = origin ? 1 : Math.max(0, 1 - (performance.now() - releasedAt - 500) / 200), i, b;
    if (fade > 0 && origin) {
      ctx.globalAlpha = fade; ctx.beginPath(); ctx.arc(origin.x + 2, origin.y + 3, 35, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fill();
      ctx.beginPath(); ctx.arc(origin.x, origin.y, 32, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(20,18,28,.7)"; ctx.fill(); ctx.strokeStyle = "#F2C14E"; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(knob.x, knob.y, 10, 0, Math.PI * 2); ctx.fillStyle = "#F2C14E"; ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (i = 0; i < BTNS.length; i++) { b = BTNS[i]; if (!available(b)) continue; circle(ctx, b, hold[b.id]); label(ctx, b, hold[b.id]); }
  }
  function init(el) {
    canvas = el || document.getElementById("game"); if (!canvas || canvas._ptouch) return; canvas._ptouch = true;
    canvas.addEventListener("pointerdown", onDown, { passive: false });
    window.addEventListener("pointermove", onMove, { passive: false }); window.addEventListener("pointerup", onUp, { passive: false }); window.addEventListener("pointercancel", onUp, { passive: false });
  }
  function reset() { origin = null; stickId = -1; active = {}; down = {}; Object.keys(hold).forEach(function (k) { hold[k] = was[k] = false; }); pending = { gripRelease: false, throwDir: -1, ukemi: false, pause: false }; }

  var api = { init: init, poll: poll, draw: draw, buttons: BTNS, reset: reset, _down: onDown, _move: onMove, _up: onUp };
  if (typeof window !== "undefined") window.PInputTouch = api;
  if (typeof global !== "undefined") global.PInputTouch = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
}());
