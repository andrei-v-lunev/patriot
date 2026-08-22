/* Device → per-player intent. Mutated 2-slot array. Quantize 1/8. */
(function () {
  var BUFFER = 6;
  var DZ = 0.25;
  var intents = [makeIntent(), makeIntent()];
  var prevBtn = [blankBtn(), blankBtn()];
  var keys = {};
  var lastDev = "keyboard";
  var tick = 0;
  var extTick = false;
  var padSlot = [null, null];
  var padGrace = [0, 0];
  var padPresent = false;
  var inited = false;

  function makeIntent() {
    return {
      moveX: 0,
      moveD: 0,
      jump: false,
      jumpPressed: false,
      grip: false,
      gripPressed: false,
      gripReleased: false,
      throwPressed: false,
      throwDir: -1,
      tag: false,
      tagPressed: false,
      special: false,
      specialPressed: false,
      ukemi: false,
      ukemiPressed: false,
      pause: false,
      pausePressed: false,
      start: false,
      startPressed: false,
      pressedAtTick: {
        jump: -9999,
        grip: -9999,
        throw: -9999,
        tag: -9999,
        special: -9999,
        ukemi: -9999,
        pause: -9999,
        start: -9999
      }
    };
  }

  function blankBtn() {
    return {
      jump: false,
      grip: false,
      throw: false,
      tag: false,
      special: false,
      ukemi: false,
      pause: false,
      start: false
    };
  }

  function quant(v) {
    if (v > 1) v = 1;
    if (v < -1) v = -1;
    return Math.round(v * 8) / 8;
  }

  function octant(x, d) {
    if (x === 0 && d === 0) return -1;
    var ang = Math.atan2(d, x) * 180 / Math.PI;
    if (ang < 0) ang += 360;
    var idx = Math.round(ang / 45) % 8;
    return [2, 1, 0, 7, 6, 5, 4, 3][idx];
  }

  function deadzone(x, y) {
    var len = Math.sqrt(x * x + y * y);
    if (len < DZ) return { x: 0, y: 0 };
    var s = (len - DZ) / (1 - DZ);
    if (s > 1) s = 1;
    return { x: (x / len) * s, y: (y / len) * s };
  }

  function edge(p, name, held) {
    var it = intents[p];
    var pr = prevBtn[p];
    it[name + "Released"] = !held && !!pr[name];
    it[name] = held;
    it[name + "Pressed"] = held && !pr[name];
    if (it[name + "Pressed"]) {
      it.pressedAtTick[name] = tick;
      pr[name] = true;
    } else if (!held) {
      pr[name] = false;
    }
  }

  function note(dev) {
    lastDev = dev;
  }

  function onKey(e, down) {
    var c = e.code || e.key;
    keys[c] = down;
    if (down) note("keyboard");
    if (isGameKey(c)) {
      if (e.preventDefault) e.preventDefault();
    }
  }

  function isGameKey(c) {
    return (
      c === "KeyW" || c === "KeyA" || c === "KeyS" || c === "KeyD" ||
      c === "Space" || c === "KeyJ" || c === "KeyK" || c === "KeyL" ||
      c === "KeyU" || c === "KeyP" || c === "Escape" ||
      c === "KeyZ" || c === "KeyX" || c === "KeyC" || c === "KeyV" ||
      c === "KeyB" || c === "KeyN" || c === "KeyO" || c === "KeyI" ||
      c === "Period" || c === "Slash" || c === "Semicolon" || c === "Quote" || c === "Comma" ||
      c === "ShiftLeft" || c === "ShiftRight" ||
      c === "Enter" || c === "NumpadEnter" ||
      c === "ArrowUp" || c === "ArrowDown" || c === "ArrowLeft" || c === "ArrowRight" ||
      (c && c.indexOf("Numpad") === 0)
    );
  }

  /* Part 5 §5.3.2: P1's alt keys (arrows as alt-move, Z/X/C/V/B/N alt actions
     implied by the alt columns) are only "live" in solo. In 2P keyboard
     fallback (COOP with <2 pads) arrows must belong to P2 with zero overlap.
     Looked up lazily (not cached at load time) since PScreens loads after
     input.js in index.html's script order. */
  function coopKeyboard() {
    return !!(window.PScreens && PScreens.modeId && PScreens.get &&
      PScreens.get() === "PLAY" && PScreens.modeId() === "COOP");
  }

  function kbdAxis(up, down, left, right) {
    var mx = (keys[right] ? 1 : 0) - (keys[left] ? 1 : 0);
    var md = (keys[up] ? 1 : 0) - (keys[down] ? 1 : 0);
    return { x: mx, d: md };
  }

  function configured(p, action, fallback) {
    var ps = window.PSettings;
    var cfg = ps && ps.get ? ps.get() : null;
    var who = p === 1 ? "p2" : "p1";
    var list = cfg && cfg.bindings && cfg.bindings[who] && cfg.bindings[who].keyboard && cfg.bindings[who].keyboard[action];
    return Array.isArray(list) && list.length ? list : fallback;
  }

  function configuredPad(p, action, fallback) {
    var ps = window.PSettings;
    var cfg = ps && ps.get ? ps.get() : null;
    var who = p === 1 ? "p2" : "p1";
    var list = cfg && cfg.bindings && cfg.bindings[who] && cfg.bindings[who].gamepad && cfg.bindings[who].gamepad[action];
    return Array.isArray(list) && list.length ? list : fallback;
  }

  function padHeld(buttons, list) {
    var i, m, n;
    for (i = 0; i < list.length; i++) {
      m = /^Button([0-9]+)$/.exec(list[i]);
      if (m) { n = Number(m[1]); if (buttons[n] && buttons[n].pressed) return true; }
    }
    return false;
  }

  function padBindingHeld(gp, list) {
    var i, m, n, v, buttons = gp.buttons || [], axes = gp.axes || [];
    if (padHeld(buttons, list)) return true;
    for (i = 0; i < list.length; i++) {
      m = /^Axis([0-9]+)([+-])$/.exec(list[i]);
      if (!m) continue;
      n = Number(m[1]); v = axes[n] || 0;
      if ((m[2] === "+" && v > DZ) || (m[2] === "-" && v < -DZ)) return true;
    }
    return false;
  }

  function padDirectionValue(gp, list) {
    var i, m, n, v, best = 0, buttons = gp.buttons || [], axes = gp.axes || [];
    for (i = 0; i < list.length; i++) {
      m = /^Button([0-9]+)$/.exec(list[i]);
      if (m && buttons[Number(m[1])] && buttons[Number(m[1])].pressed) best = 1;
      m = /^Axis([0-9]+)([+-])$/.exec(list[i]);
      if (m) {
        n = Number(m[1]); v = axes[n] || 0;
        v = m[2] === "+" ? Math.max(0, v) : Math.max(0, -v);
        if (v > best) best = v;
      }
    }
    return best;
  }

  function held(list, coop, p) {
    var i, code;
    for (i = 0; i < list.length; i++) {
      code = list[i];
      if (coop && p === 0 && code.indexOf("Arrow") === 0) continue;
      if (keys[code]) return true;
    }
    return false;
  }

  function configuredAxis(p, coop, fallback) {
    var up = configured(p, "up", [fallback[0]]);
    var down = configured(p, "down", [fallback[1]]);
    var left = configured(p, "left", [fallback[2]]);
    var right = configured(p, "right", [fallback[3]]);
    return { x: (held(right, coop, p) ? 1 : 0) - (held(left, coop, p) ? 1 : 0),
      d: (held(up, coop, p) ? 1 : 0) - (held(down, coop, p) ? 1 : 0) };
  }

  function applyMove(p, mx, md) {
    intents[p].moveX = quant(mx);
    intents[p].moveD = quant(md);
  }

  function pollKeyboard() {
    var coop = coopKeyboard();
    var w = configuredAxis(0, coop, ["KeyW", "KeyS", "KeyA", "KeyD"]);
    var arrows = configuredAxis(1, false, ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
    var mx = w.x, md = w.d;
    if (!coop) {
      /* P1 solo: arrows are alt-move (Part 5 §5.3.2), live alongside WASD. */
      mx += arrows.x; md += arrows.d;
      if (mx > 1) mx = 1; else if (mx < -1) mx = -1;
      if (md > 1) md = 1; else if (md < -1) md = -1;
    }
    applyMove(0, mx, md);
    /* P1 (solo & 2P-coop, identical per Part 5 §5.3.2 — zero overlap with P2 below). */
    edge(0, "throw", held(configured(0, "strike", ["KeyJ", "KeyZ"]), coop, 0));
    edge(0, "jump", held(configured(0, "jump", ["KeyK", "KeyX", "Space"]), coop, 0));
    edge(0, "grip", held(configured(0, "grip", ["KeyL", "KeyC"]), coop, 0));
    edge(0, "special", held(configured(0, "special", ["KeyU", "KeyV"]), coop, 0));
    edge(0, "tag", held(configured(0, "tag", ["KeyI", "KeyB"]), coop, 0));
    edge(0, "ukemi", held(configured(0, "ukemi", ["KeyO", "KeyN"]), coop, 0));
    edge(0, "pause", held(configured(0, "pause", ["Escape", "KeyP"]), coop, 0));
    edge(0, "start", !!(keys.Enter || keys.NumpadEnter));
    intents[0].throwDir = octant(intents[0].moveX, intents[0].moveD);

    /* P2 — 2P keyboard fallback (Part 5 §5.3.2), zero overlap with P1 map. */
    applyMove(1, arrows.x, arrows.d);
    edge(1, "throw", held(configured(1, "strike", ["Numpad1", "Period"]), false, 1));
    edge(1, "jump", held(configured(1, "jump", ["Numpad2", "Slash"]), false, 1));
    edge(1, "grip", held(configured(1, "grip", ["Numpad3", "ShiftRight"]), false, 1));
    edge(1, "special", held(configured(1, "special", ["Numpad5", "Semicolon"]), false, 1));
    edge(1, "tag", held(configured(1, "tag", ["Numpad6", "Quote"]), false, 1));
    edge(1, "ukemi", held(configured(1, "ukemi", ["Numpad0", "Comma"]), false, 1));
    edge(1, "pause", held(configured(1, "pause", ["Escape", "KeyP"]), false, 1));
    edge(1, "start", !!(keys.Enter || keys.NumpadEnter));
    intents[1].throwDir = octant(intents[1].moveX, intents[1].moveD);
  }

  function pollPad(p, gp) {
    if (!gp || !gp.buttons) return;
    var bx = padDirectionValue(gp, configuredPad(p, "right", ["Axis0+", "Button15"])) -
      padDirectionValue(gp, configuredPad(p, "left", ["Axis0-", "Button14"]));
    var by = padDirectionValue(gp, configuredPad(p, "down", ["Axis1+", "Button13"])) -
      padDirectionValue(gp, configuredPad(p, "up", ["Axis1-", "Button12"]));
    var dz = deadzone(bx, by);
    applyMove(p, dz.x, -dz.y);
    var b = gp.buttons;
    function pressed(i) { return b[i] && b[i].pressed; }
    edge(p, "jump", padHeld(b, configuredPad(p, "jump", ["Button0"])));
    edge(p, "grip", padHeld(b, configuredPad(p, "grip", ["Button2"])));
    edge(p, "special", padHeld(b, configuredPad(p, "special", ["Button1"])));
    edge(p, "tag", padHeld(b, configuredPad(p, "tag", ["Button3"])));
    edge(p, "ukemi", padHeld(b, configuredPad(p, "ukemi", ["Button4", "Button5"])));
    edge(p, "pause", padHeld(b, configuredPad(p, "pause", ["Button9"])));
    edge(p, "start", pressed(9) || pressed(0));
    edge(p, "throw", padHeld(b, configuredPad(p, "strike", ["Button7", "Button6"])));
    intents[p].throwDir = octant(intents[p].moveX, intents[p].moveD);
    if (pressed(0) || pressed(1) || pressed(2) || pressed(3) || pressed(9)) note("pad");
  }

  function pollPads() {
    var list = [];
    try {
      if (navigator.getGamepads) list = navigator.getGamepads() || [];
    } catch (e) {
      list = [];
    }
    var i, gp, p;
    padPresent = false;
    for (i = 0; i < list.length; i++) {
      gp = list[i];
      if (!gp) continue;
      padPresent = true;
      p = -1;
      if (padSlot[0] === gp.index) p = 0;
      else if (padSlot[1] === gp.index) p = 1;
      else if (padSlot[0] == null) {
        padSlot[0] = gp.index;
        p = 0;
      } else if (padSlot[1] == null) {
        padSlot[1] = gp.index;
        p = 1;
      }
      if (p >= 0) {
        padGrace[p] = 30;
        pollPad(p, gp);
      }
    }
    for (p = 0; p < 2; p++) {
      if (padGrace[p] > 0) padGrace[p]--;
      if (padGrace[p] === 0) padSlot[p] = null;
    }
  }

  function init() {
    if (inited) return;
    inited = true;
    window.addEventListener("keydown", function (e) { onKey(e, true); });
    window.addEventListener("keyup", function (e) { onKey(e, false); });
    window.addEventListener("blur", function () { keys = {}; });
    window.addEventListener("gamepadconnected", function () { note("pad"); });
  }

  function poll() {
    if (!inited) init();
    if (!extTick) tick++;
    pollKeyboard();
    pollPads();
    intents[0].padDetected = padPresent;
    if (window.PInputTouch && PInputTouch.poll) PInputTouch.poll(intents[0], tick);
  }

  function setTick(t) {
    tick = t | 0;
    extTick = true;
  }

  function pressedAtTick(p, name) {
    return intents[p] && intents[p].pressedAtTick[name];
  }

  function consumePress(p, name) {
    if (intents[p]) intents[p].pressedAtTick[name] = -9999;
  }

  function buffered(p, name, simTick) {
    var at = pressedAtTick(p, name);
    return simTick - at <= BUFFER && simTick - at >= 0;
  }

  var api = {
    init: init,
    poll: poll,
    intents: function () { return intents; },
    lastDevice: function () { return lastDev; },
    setLastDevice: function (d) { lastDev = d; },
    setTick: setTick,
    tick: function () { return tick; },
    pressedAtTick: pressedAtTick,
    consumePress: consumePress,
    consume: consumePress,
    buffered: buffered,
    BUFFER: BUFFER
  };
  if (typeof window !== "undefined") window.PInput = api;
  if (typeof global !== "undefined") global.PInput = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
