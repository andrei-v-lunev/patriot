/* Contextual mobile controls: fixed 8-way pad + NES-inspired action deck. */
(function () {
  var origin = null, stickId = -1, canvas = null, visible = false, releasedAt = 0;
  var knob = { x: 0, y: 0 }, hist = [], active = {}, down = {};
  var hold = { action: false, jump: false, tag: false, special: false };
  var was = { grip: false, throw: false, jump: false, tag: false, special: false };
  var btnIds = { action: -1, jump: -1, tag: -1, special: -1 };
  var queued = { jumpPressed: false, jumpReleased: false, tagPressed: false, tagReleased: false,
    specialPressed: false, specialReleased: false, actionPressed: "", actionReleased: "" };
  var actionRole = "";
  var pending = { gripRelease: false, throwDir: -1, ukemi: false, pause: false };

  /* Fixed pad/deck supersede the PRD's floating-circle treatment by owner direction. */
  var PAD = { x: 66, y: 210, arm: 15, reach: 43 };
  var BASE = [
    { id: "action", x: 430, y: 218, r: 25 },
    { id: "jump", x: 375, y: 228, r: 23 },
    { id: "tag", x: 431, y: 170, r: 19 },
    { id: "special", x: 378, y: 170, r: 19 }
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
  function pad(cfg) {
    return { x: cfg.layout === "mirrored" ? 480 - PAD.x : PAD.x, y: PAD.y,
      arm: PAD.arm * (cfg.scale || 1), reach: PAD.reach * (cfg.scale || 1) };
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
  function hitPad(x, y, p) {
    var dx = Math.abs(x - p.x), dy = Math.abs(y - p.y), arm = p.arm + 9, reach = p.reach + 8;
    return dx <= reach && dy <= reach && (dx <= arm || dy <= arm || (dx <= reach - 8 && dy <= reach - 8));
  }
  function setKnob(p, c) {
    var dx = p.x - c.x, dy = p.y - c.y, len = Math.sqrt(dx * dx + dy * dy), limit = c.reach - 5;
    if (len > limit) { dx = dx / len * limit; dy = dy / len * limit; }
    knob.x = c.x + dx; knob.y = c.y + dy;
  }
  function buzz(ms) {
    var cfg = settings();
    if (cfg.reducedMotion || cfg.vibration === "off" || !navigator.vibrate) return;
    navigator.vibrate(cfg.vibration === "weak" ? Math.max(4, ms * 0.5) : ms);
  }
  function onDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    var p = logical(e), id = e.pointerId, cfg = layout(), dpad = pad(cfg), which = hitBtn(p.x, p.y), now = e.timeStamp || 0;
    var onPad = !which && hitPad(p.x, p.y, dpad);
    visible = true; active[id] = true;
    down[id] = { x: p.x, y: p.y, t: now, button: which, pad: onPad,
      swipeSide: cfg.layout === "mirrored" ? p.x < 240 : p.x > 240 };
    if (Object.keys(active).length === 2) {
      var ids = Object.keys(active), a = down[ids[0]], b = down[ids[1]];
      if (a && b && !a.button && !b.button && !a.pad && !b.pad && a.y < 54 && b.y < 54) pending.pause = true;
    }
    if (window.PInput && window.PInput.setLastDevice) window.PInput.setLastDevice("touch");
    if (which) {
      hold[which] = true; btnIds[which] = id; buzz(8);
      if (which === "action") {
        var h = hero(), gripping = h && (h.combatState === "GRIPPED" || h.combatState === "THROWING");
        actionRole = gripping || h && nearGrip(h) ? "grip" : "throw";
        queued.actionPressed = actionRole;
      } else queued[which + "Pressed"] = true;
    }
    else if (onPad && stickId < 0) {
      stickId = id; origin = { x: dpad.x, y: dpad.y }; setKnob(p, dpad);
      hist = [{ x: p.x, y: p.y, t: now }];
    }
    if (e.preventDefault) e.preventDefault();
  }
  function onMove(e) {
    var p = logical(e), now = e.timeStamp || 0, cfg = layout(), dpad = pad(cfg);
    if (e.pointerId === stickId && origin) {
      origin.x = dpad.x; origin.y = dpad.y; setKnob(p, dpad); hist.push({ x: p.x, y: p.y, t: now });
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
        queued.actionReleased = actionRole;
        if (actionRole === "grip") {
          pending.gripRelease = true;
          pending.throwDir = Math.sqrt(dx * dx + dy * dy) >= 28 && dur <= 220 ? octant(dx, -dy) : -1;
        }
        actionRole = "";
      } else if (rec.button) queued[rec.button + "Released"] = true;
      else if (!rec.pad && rec.swipeSide && dy >= 24 && dur <= 200) pending.ukemi = true;
    }
    Object.keys(btnIds).forEach(function (k) { if (btnIds[k] === id) { hold[k] = false; btnIds[k] = -1; } });
    delete active[id]; delete down[id];
  }
  function onCancel(e) {
    var id = e.pointerId;
    if (id === stickId) { stickId = -1; origin = null; hist = []; }
    Object.keys(btnIds).forEach(function (k) {
      if (btnIds[k] === id) {
        hold[k] = false; btnIds[k] = -1;
        if (k === "action") {
          actionRole = ""; was.grip = false; was.throw = false;
          queued.actionPressed = queued.actionReleased = "";
        } else {
          was[k] = false; queued[k + "Pressed"] = queued[k + "Released"] = false;
        }
      }
    });
    delete active[id]; delete down[id];
    if (e.preventDefault) e.preventDefault();
  }
  function nearGrip(h) {
    var s = state(), list = s && s.enemies || [], i, e;
    for (i = 0; i < list.length; i++) {
      e = list[i]; if (!e || !e.alive) continue;
      if (Math.abs((h.x || 0) - (e.x || 0)) <= 62 && Math.abs((h.d || 0) - (e.d || 0)) <= 14) return true;
    }
    return false;
  }
  function edge(intent, name, held, previous, pressed, released) {
    intent[name] = held; intent[name + "Pressed"] = held && !previous || !!pressed;
    intent[name + "Released"] = !held && previous || !!released;
    if (intent[name + "Pressed"] && intent.pressedAtTick) intent.pressedAtTick[name] = window.PInput && window.PInput.tick ? window.PInput.tick() : 0;
  }
  function poll(intent, tick) {
    if (!intent) return;
    var dx = origin ? knob.x - origin.x : 0, dy = origin ? knob.y - origin.y : 0;
    if (origin) { intent.moveX = Math.round(Math.max(-1, Math.min(1, dx / 24)) * 8) / 8; intent.moveD = Math.round(Math.max(-1, Math.min(1, -dy / 24)) * 8) / 8; }
    var grip = hold.action && actionRole === "grip", strike = hold.action && actionRole === "throw";
    edge(intent, "grip", grip, was.grip, queued.actionPressed === "grip", queued.actionReleased === "grip");
    edge(intent, "throw", strike, was.throw, queued.actionPressed === "throw", queued.actionReleased === "throw");
    edge(intent, "jump", hold.jump, was.jump, queued.jumpPressed, queued.jumpReleased);
    edge(intent, "tag", hold.tag, was.tag, queued.tagPressed, queued.tagReleased);
    edge(intent, "special", hold.special && specialReady(), was.special, queued.specialPressed && specialReady(), queued.specialReleased);
    if (pending.gripRelease) { intent.gripReleased = true; intent.throwDir = pending.throwDir; pending.gripRelease = false; }
    if (pending.ukemi) { intent.ukemi = true; intent.ukemiPressed = true; if (intent.pressedAtTick) intent.pressedAtTick.ukemi = tick | 0; pending.ukemi = false; }
    if (pending.pause) { intent.pause = true; intent.pausePressed = true; pending.pause = false; }
    was.grip = grip; was.throw = strike; was.jump = hold.jump; was.tag = hold.tag; was.special = hold.special;
    queued = { jumpPressed: false, jumpReleased: false, tagPressed: false, tagReleased: false,
      specialPressed: false, specialReleased: false, actionPressed: "", actionReleased: "" };
    if (hold.action || hold.jump || hold.tag || hold.special || origin) if (window.PInput && window.PInput.setLastDevice) window.PInput.setLastDevice("touch");
  }

  function roundButton(ctx, b, on) {
    ctx.beginPath(); ctx.arc(b.x + 2, b.y + 3, b.r + 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(12,10,16,.72)"; ctx.fill();
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = on ? "#C83B5C" : "#8D2442"; ctx.fill();
    ctx.strokeStyle = on ? "#FFE8B0" : "#321323"; ctx.lineWidth = 3; ctx.stroke();
  }
  function text(ctx, str, x, y, color, scale) {
    if (window.PFont && PFont.measure && PFont.draw) {
      var w = PFont.measure(str, scale || 1);
      PFont.draw(ctx, str, (x - w * 0.5) | 0, y | 0, scale || 1, color);
    } else { ctx.fillStyle = color; ctx.fillRect(x - 4, y, 8, 5); }
  }
  function actionCaption(b) {
    var h = hero(), gripping = h && (h.combatState === "GRIPPED" || h.combatState === "THROWING");
    return gripping ? "БРОСОК" : h && nearGrip(h) ? "ЗАХВАТ" : "ПРИЁМ";
  }
  function auxButton(ctx, b, on) {
    var w = 39, h = 15;
    ctx.fillStyle = "rgba(12,10,16,.72)"; ctx.fillRect(b.x - w / 2 + 2, b.y - h / 2 + 3, w, h);
    ctx.fillStyle = "#B9B3AA"; ctx.fillRect(b.x - w / 2, b.y - h / 2, w, h);
    ctx.fillStyle = on ? "#C83B5C" : "#302D34"; ctx.fillRect(b.x - 14, b.y - 3, 28, 7);
    text(ctx, b.id === "tag" ? "СМЕНА" : "СУПЕР", b.x, b.y - 15, on ? "#FFE8B0" : "#EEE5D2", 1);
  }
  function drawPad(ctx, p) {
    var dx = origin ? knob.x - origin.x : 0, dy = origin ? knob.y - origin.y : 0;
    ctx.fillStyle = "rgba(12,10,16,.72)";
    ctx.fillRect(p.x - p.reach + 3, p.y - p.arm + 4, p.reach * 2, p.arm * 2);
    ctx.fillRect(p.x - p.arm + 3, p.y - p.reach + 4, p.arm * 2, p.reach * 2);
    ctx.fillStyle = "#24232A";
    ctx.fillRect(p.x - p.reach, p.y - p.arm, p.reach * 2, p.arm * 2);
    ctx.fillRect(p.x - p.arm, p.y - p.reach, p.arm * 2, p.reach * 2);
    ctx.fillStyle = "#4A4850";
    if (dx < -5) ctx.fillRect(p.x - p.reach + 3, p.y - p.arm + 3, p.reach - p.arm - 3, p.arm * 2 - 6);
    if (dx > 5) ctx.fillRect(p.x + p.arm, p.y - p.arm + 3, p.reach - p.arm - 3, p.arm * 2 - 6);
    if (dy < -5) ctx.fillRect(p.x - p.arm + 3, p.y - p.reach + 3, p.arm * 2 - 6, p.reach - p.arm - 3);
    if (dy > 5) ctx.fillRect(p.x - p.arm + 3, p.y + p.arm, p.arm * 2 - 6, p.reach - p.arm - 3);
    ctx.fillStyle = "#111016"; ctx.fillRect(p.x - 9, p.y - 9, 18, 18);
    ctx.fillStyle = "#38363F"; ctx.fillRect(p.x - 6, p.y - 6, 12, 12);
  }
  function draw(ctx) {
    if (!visible || !ctx) return;
    var cfg = layout(), dpad = pad(cfg), i, b, minX = Math.min(BTNS[0].x, BTNS[1].x) - 31;
    drawPad(ctx, dpad);
    ctx.fillStyle = "rgba(12,10,16,.7)"; ctx.fillRect(minX + 3, 187, 119, 69);
    ctx.fillStyle = "rgba(185,179,170,.9)"; ctx.fillRect(minX, 184, 119, 69);
    ctx.fillStyle = "#302D34"; ctx.fillRect(minX + 7, 190, 105, 4);
    for (i = 0; i < BTNS.length; i++) {
      b = BTNS[i]; if (!available(b)) continue;
      if (b.id === "action" || b.id === "jump") roundButton(ctx, b, hold[b.id]);
      else auxButton(ctx, b, hold[b.id]);
    }
    text(ctx, "B", BTNS[1].x, BTNS[1].y - 4, "#FFF3D5", 2);
    text(ctx, "A", BTNS[0].x, BTNS[0].y - 4, "#FFF3D5", 2);
    text(ctx, "ПРЫГ", BTNS[1].x, 248, "#302D34", 1);
    text(ctx, actionCaption(BTNS[0]), BTNS[0].x, 248, "#302D34", 1);
  }
  function init(el) {
    canvas = el || document.getElementById("game"); if (!canvas || canvas._ptouch) return; canvas._ptouch = true;
    canvas.addEventListener("pointerdown", onDown, { passive: false });
    window.addEventListener("pointermove", onMove, { passive: false }); window.addEventListener("pointerup", onUp, { passive: false }); window.addEventListener("pointercancel", onCancel, { passive: false });
  }
  function reset() {
    origin = null; stickId = -1; active = {}; down = {}; actionRole = "";
    Object.keys(hold).forEach(function (k) { hold[k] = false; }); Object.keys(was).forEach(function (k) { was[k] = false; });
    queued = { jumpPressed: false, jumpReleased: false, tagPressed: false, tagReleased: false,
      specialPressed: false, specialReleased: false, actionPressed: "", actionReleased: "" };
    pending = { gripRelease: false, throwDir: -1, ukemi: false, pause: false };
  }

  var api = { init: init, poll: poll, draw: draw, buttons: BTNS, reset: reset,
    _down: onDown, _move: onMove, _up: onUp, _cancel: onCancel };
  if (typeof window !== "undefined") window.PInputTouch = api;
  if (typeof global !== "undefined") global.PInputTouch = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
}());
