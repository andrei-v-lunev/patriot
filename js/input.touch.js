/* Contextual mobile controls: viewport rails + semantic action controls. */
(function () {
  var origin = null, stickId = -1, canvas = null, overlay = null, overlayCtx = null, visible = false, releasedAt = 0;
  var knob = { x: 0, y: 0 }, hist = [], active = {}, down = {};
  var hold = { action: false, jump: false, tag: false, special: false };
  var was = { grip: false, throw: false, jump: false, tag: false, special: false };
  var btnIds = { action: -1, jump: -1, tag: -1, special: -1 };
  var queued = { jumpPressed: false, jumpReleased: false, tagPressed: false, tagReleased: false,
    specialPressed: false, specialReleased: false, actionPressed: "", actionReleased: "" };
  var actionRole = "";
  var pending = { gripRelease: false, throwDir: -1, ukemi: false, pause: false };

  var PAD = { x: 66, y: 204, arm: 16, reach: 42 };
  var BASE = [
    { id: "action", x: 431, y: 198, r: 24, hit: 31 },
    { id: "jump", x: 355, y: 224, r: 22, hit: 29 },
    { id: "tag", x: 365, y: 165, r: 18, hit: 25 },
    { id: "special", x: 410, y: 135, r: 18, hit: 25 }
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
  function viewport() {
    var vv = typeof window !== "undefined" && window.visualViewport;
    var r = canvas && canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: 480, height: 270 };
    return { x: vv && vv.offsetLeft || 0, y: vv && vv.offsetTop || 0,
      w: vv && vv.width || window.innerWidth || r.width || 480,
      h: vv && vv.height || window.innerHeight || r.height || 270, game: r };
  }
  function layout() {
    var cfg = settings().touch || { layout: "right", scale: 1 }, scale = cfg.scale || 1, v = viewport(), i, b;
    var rail = Math.max(0, (v.w - v.game.width) * 0.5), right = v.w - 24, bottom = v.h - 24;
    var useRails = rail >= 54;
    for (i = 0; i < BTNS.length; i++) {
      b = BTNS[i]; b.r = BASE[i].r * scale; b.hit = BASE[i].hit * scale;
      if (useRails) {
        b.x = i === 0 ? right - 50 * scale : i === 1 ? right - 116 * scale : i === 2 ? right - 108 * scale : right - 48 * scale;
        b.y = i === 0 ? bottom - 50 * scale : i === 1 ? bottom - 24 * scale : i === 2 ? bottom - 105 * scale : bottom - 124 * scale;
      } else {
        b.x = v.game.left + v.game.width * (480 - (480 - BASE[i].x) * scale) / 480;
        b.y = v.game.top + v.game.height * (270 - (270 - BASE[i].y) * scale) / 270;
        b.r *= v.game.height / 270; b.hit *= v.game.height / 270;
      }
      if (cfg.layout === "mirrored") b.x = v.w - b.x;
    }
    cfg._viewport = v; cfg._rails = useRails; return cfg;
  }
  function pad(cfg) {
    var v = cfg._viewport || viewport(), scale = cfg.scale || 1, rail = Math.max(0, (v.w - v.game.width) * 0.5);
    var k = cfg._rails ? 1 : v.game.height / 270;
    var x = cfg._rails ? 24 + 50 * scale : v.game.left + v.game.width * (PAD.x * scale) / 480;
    var y = cfg._rails ? v.h - 24 - 50 * scale : v.game.top + v.game.height * (270 - (270 - PAD.y) * scale) / 270;
    return { x: cfg.layout === "mirrored" ? v.w - x : x, y: y,
      arm: PAD.arm * scale * k, reach: PAD.reach * scale * k, rail: rail };
  }
  function logical(e) {
    var v = viewport(); return { x: e.clientX - v.x, y: e.clientY - v.y };
  }
  function hitBtn(x, y) {
    var i, b, dx, dy; layout();
    for (i = BTNS.length - 1; i >= 0; i--) {
      b = BTNS[i]; if (!available(b)) continue;
      dx = x - b.x; dy = y - b.y;
      if (dx * dx + dy * dy <= b.hit * b.hit) return b.id;
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
    if (which && btnIds[which] < 0) {
      hold[which] = true; btnIds[which] = id; buzz(8);
      if (which === "action") {
        var h = hero(), gripping = h && (h.combatState === "GRIPPED" || h.combatState === "THROWING");
        actionRole = gripping || h && nearGrip(h) ? "grip" : "throw";
        queued.actionPressed = actionRole;
      } else queued[which + "Pressed"] = true;
    } else if (which) down[id].button = null;
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
    var special = hold.special && specialReady();
    edge(intent, "grip", grip, was.grip, queued.actionPressed === "grip", queued.actionReleased === "grip");
    edge(intent, "throw", strike, was.throw, queued.actionPressed === "throw", queued.actionReleased === "throw");
    edge(intent, "jump", hold.jump, was.jump, queued.jumpPressed, queued.jumpReleased);
    edge(intent, "tag", hold.tag, was.tag, queued.tagPressed, queued.tagReleased);
    edge(intent, "special", special, was.special, queued.specialPressed && specialReady(), queued.specialReleased);
    if (pending.gripRelease) { intent.gripReleased = true; intent.throwDir = pending.throwDir; pending.gripRelease = false; }
    if (pending.ukemi) { intent.ukemi = true; intent.ukemiPressed = true; if (intent.pressedAtTick) intent.pressedAtTick.ukemi = tick | 0; pending.ukemi = false; }
    if (pending.pause) { intent.pause = true; intent.pausePressed = true; pending.pause = false; }
    was.grip = grip; was.throw = strike; was.jump = hold.jump; was.tag = hold.tag; was.special = special;
    queued = { jumpPressed: false, jumpReleased: false, tagPressed: false, tagReleased: false,
      specialPressed: false, specialReleased: false, actionPressed: "", actionReleased: "" };
    if (hold.action || hold.jump || hold.tag || hold.special || origin) if (window.PInput && window.PInput.setLastDevice) window.PInput.setLastDevice("touch");
  }

  function roundButton(ctx, b, on, color) {
    if (on) {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(242,193,78,.3)"; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = on ? color : "rgba(17,16,22,.62)"; ctx.fill();
    ctx.strokeStyle = on ? "#FFE8B0" : "rgba(255,243,213,.72)"; ctx.lineWidth = 2; ctx.stroke();
  }
  function text(ctx, str, x, y, color, scale) {
    if (window.PFont && PFont.measure && PFont.draw) {
      var w = PFont.measure(str, scale || 1);
      PFont.draw(ctx, str, (x - w * 0.5) | 0, y | 0, scale || 1, color);
    } else { ctx.fillStyle = color; ctx.fillRect(x - 4, y, 8, 5); }
  }
  function actionCaption(b) {
    if (hold.action && actionRole === "grip") return "ЗАХВАТ";
    if (hold.action && actionRole === "throw") return "ПРИЁМ";
    var h = hero(), gripping = h && (h.combatState === "GRIPPED" || h.combatState === "THROWING");
    return gripping ? "БРОСОК" : h && nearGrip(h) ? "ЗАХВАТ" : "ПРИЁМ";
  }
  function glyph(ctx, b) {
    ctx.strokeStyle = "#FFF3D5"; ctx.fillStyle = "#FFF3D5"; ctx.lineWidth = 2;
    if (b.id === "jump") {
      ctx.beginPath(); ctx.moveTo(b.x - 8, b.y + 5); ctx.lineTo(b.x, b.y - 7); ctx.lineTo(b.x + 8, b.y + 5); ctx.stroke();
      ctx.fillRect(b.x - 6, b.y + 8, 12, 2);
    } else if (b.id === "action") {
      ctx.fillRect(b.x - 9, b.y - 3, 13, 10); ctx.fillRect(b.x - 6, b.y - 10, 4, 8);
      ctx.fillRect(b.x - 1, b.y - 11, 4, 9); ctx.fillRect(b.x + 4, b.y - 9, 4, 9);
    } else if (b.id === "tag") {
      ctx.beginPath(); ctx.moveTo(b.x - 9, b.y - 4); ctx.lineTo(b.x + 7, b.y - 4); ctx.lineTo(b.x + 3, b.y - 8);
      ctx.moveTo(b.x + 9, b.y + 4); ctx.lineTo(b.x - 7, b.y + 4); ctx.lineTo(b.x - 3, b.y + 8); ctx.stroke();
    } else {
      ctx.beginPath();
      for (var i = 0; i < 8; i++) {
        var a = i * Math.PI / 4, r = i % 2 ? 5 : 10;
        if (!i) ctx.moveTo(b.x + r, b.y); else ctx.lineTo(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
    }
  }
  function auxButton(ctx, b, on) {
    var w = 42, h = 22;
    ctx.fillStyle = on ? "#C83B5C" : "rgba(17,16,22,.62)";
    ctx.fillRect((b.x - w / 2) | 0, (b.y - h / 2) | 0, w, h);
    ctx.strokeStyle = on ? "#FFE8B0" : "rgba(255,243,213,.72)"; ctx.lineWidth = 2;
    ctx.strokeRect((b.x - w / 2) | 0, (b.y - h / 2) | 0, w, h);
    glyph(ctx, b);
  }
  function drawPad(ctx, p) {
    var dx = origin ? knob.x - origin.x : 0, dy = origin ? knob.y - origin.y : 0;
    ctx.fillStyle = "rgba(17,16,22,.54)";
    ctx.fillRect(p.x - p.reach, p.y - p.arm, p.reach * 2, p.arm * 2);
    ctx.fillRect(p.x - p.arm, p.y - p.reach, p.arm * 2, p.reach * 2);
    ctx.strokeStyle = "rgba(255,243,213,.64)"; ctx.lineWidth = 2;
    ctx.strokeRect(p.x - p.reach, p.y - p.arm, p.reach * 2, p.arm * 2);
    ctx.strokeRect(p.x - p.arm, p.y - p.reach, p.arm * 2, p.reach * 2);
    ctx.fillStyle = "rgba(200,59,92,.82)";
    if (dx < -5) ctx.fillRect(p.x - p.reach + 3, p.y - p.arm + 3, p.reach - p.arm - 3, p.arm * 2 - 6);
    if (dx > 5) ctx.fillRect(p.x + p.arm, p.y - p.arm + 3, p.reach - p.arm - 3, p.arm * 2 - 6);
    if (dy < -5) ctx.fillRect(p.x - p.arm + 3, p.y - p.reach + 3, p.arm * 2 - 6, p.reach - p.arm - 3);
    if (dy > 5) ctx.fillRect(p.x - p.arm + 3, p.y + p.arm, p.arm * 2 - 6, p.reach - p.arm - 3);
    ctx.fillStyle = "rgba(17,16,22,.9)"; ctx.fillRect(p.x - 8, p.y - 8, 16, 16);
  }
  function draw(ctx) {
    var screen = window.PScreens && PScreens.get ? PScreens.get() : "PLAY";
    if (overlayCtx) {
      overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
      ctx = overlayCtx;
    }
    if (!visible || !ctx || screen !== "PLAY") return;
    var cfg = layout(), dpad = pad(cfg), i, b;
    drawPad(ctx, dpad);
    for (i = 0; i < BTNS.length; i++) {
      b = BTNS[i]; if (!available(b)) continue;
      if (b.id === "action" || b.id === "jump") {
        roundButton(ctx, b, hold[b.id], b.id === "action" ? "#C83B5C" : "#3A78A8"); glyph(ctx, b);
      }
      else auxButton(ctx, b, hold[b.id]);
    }
    if (!cfg._rails) {
      text(ctx, "ПРЫГ", BTNS[1].x, BTNS[1].y + BTNS[1].r + 5, "#FFF3D5", 1);
      text(ctx, actionCaption(BTNS[0]), BTNS[0].x, BTNS[0].y + BTNS[0].r + 5, "#FFF3D5", 1);
    }
  }
  function fitOverlay() {
    if (!overlay) return;
    var v = viewport(), dpr = window.devicePixelRatio || 1;
    overlay.width = Math.max(1, Math.round(v.w * dpr)); overlay.height = Math.max(1, Math.round(v.h * dpr));
    overlay.style.left = v.x + "px"; overlay.style.top = v.y + "px";
    overlay.style.width = v.w + "px"; overlay.style.height = v.h + "px";
    overlayCtx = overlay.getContext("2d"); overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0); overlayCtx.imageSmoothingEnabled = false;
  }
  function init(el) {
    canvas = el || document.getElementById("game"); if (!canvas || canvas._ptouch) return; canvas._ptouch = true;
    if (document.createElement && document.body) {
      overlay = document.createElement("canvas"); overlay.id = "touch-controls"; overlay.setAttribute("aria-hidden", "true");
      document.body.appendChild(overlay); fitOverlay();
      window.addEventListener("resize", fitOverlay); if (window.visualViewport) window.visualViewport.addEventListener("resize", fitOverlay);
    }
    window.addEventListener("pointerdown", onDown, { passive: false });
    window.addEventListener("pointermove", onMove, { passive: false }); window.addEventListener("pointerup", onUp, { passive: false }); window.addEventListener("pointercancel", onCancel, { passive: false });
  }
  function reset() {
    origin = null; stickId = -1; active = {}; down = {}; actionRole = "";
    Object.keys(hold).forEach(function (k) { hold[k] = false; }); Object.keys(was).forEach(function (k) { was[k] = false; });
    Object.keys(btnIds).forEach(function (k) { btnIds[k] = -1; });
    queued = { jumpPressed: false, jumpReleased: false, tagPressed: false, tagReleased: false,
      specialPressed: false, specialReleased: false, actionPressed: "", actionReleased: "" };
    pending = { gripRelease: false, throwDir: -1, ukemi: false, pause: false };
  }

  function geometry() { var cfg = layout(); return { rails: cfg._rails, pad: pad(cfg), buttons: BTNS.map(function (b) {
    return { id: b.id, x: b.x, y: b.y, r: b.r, hit: b.hit };
  }) }; }
  var api = { init: init, poll: poll, draw: draw, buttons: BTNS, reset: reset, _geometry: geometry,
    _down: onDown, _move: onMove, _up: onUp, _cancel: onCancel };
  if (typeof window !== "undefined") window.PInputTouch = api;
  if (typeof global !== "undefined") global.PInputTouch = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
}());
