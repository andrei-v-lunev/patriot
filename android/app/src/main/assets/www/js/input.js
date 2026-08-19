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
  var inited = false;

  function makeIntent() {
    return {
      moveX: 0,
      moveD: 0,
      jump: false,
      jumpPressed: false,
      grip: false,
      gripPressed: false,
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
      c === "ShiftLeft" || c === "ShiftRight" ||
      c === "Enter" || c === "NumpadEnter" ||
      c === "ArrowUp" || c === "ArrowDown" || c === "ArrowLeft" || c === "ArrowRight" ||
      (c && c.indexOf("Numpad") === 0)
    );
  }

  function kbdAxis(up, down, left, right) {
    var mx = (keys[right] ? 1 : 0) - (keys[left] ? 1 : 0);
    var md = (keys[up] ? 1 : 0) - (keys[down] ? 1 : 0);
    return { x: mx, d: md };
  }

  function applyMove(p, mx, md) {
    intents[p].moveX = quant(mx);
    intents[p].moveD = quant(md);
  }

  function pollKeyboard() {
    var a = kbdAxis("KeyW", "KeyS", "KeyA", "KeyD");
    applyMove(0, a.x, a.d);
    edge(0, "jump", !!keys.Space);
    edge(0, "grip", !!keys.KeyJ);
    edge(0, "throw", !!keys.KeyK);
    edge(0, "tag", !!keys.KeyL);
    edge(0, "special", !!keys.KeyU);
    edge(0, "ukemi", !!(keys.ShiftLeft || keys.ShiftRight));
    edge(0, "pause", !!(keys.Escape || keys.KeyP));
    edge(0, "start", !!(keys.Enter || keys.NumpadEnter || keys.Space));
    intents[0].throwDir = octant(intents[0].moveX, intents[0].moveD);

    a = kbdAxis("ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight");
    applyMove(1, a.x, a.d);
    edge(1, "jump", !!(keys.Numpad0 || keys.Numpad2));
    edge(1, "grip", !!keys.Numpad1);
    edge(1, "throw", !!keys.Numpad3);
    edge(1, "tag", !!(keys.Numpad4 || keys.Numpad6));
    edge(1, "special", !!keys.Numpad5);
    edge(1, "ukemi", !!(keys.NumpadDecimal || keys.NumpadEnter));
    edge(1, "pause", !!(keys.Escape || keys.KeyP));
    edge(1, "start", !!(keys.Enter || keys.NumpadEnter));
    intents[1].throwDir = octant(intents[1].moveX, intents[1].moveD);
  }

  function pollPad(p, gp) {
    if (!gp || !gp.buttons) return;
    var ax = gp.axes || [];
    var bx = ax[0] || 0;
    var by = ax[1] || 0;
    if (gp.buttons[14] && gp.buttons[14].pressed) bx = -1;
    if (gp.buttons[15] && gp.buttons[15].pressed) bx = 1;
    if (gp.buttons[12] && gp.buttons[12].pressed) by = -1;
    if (gp.buttons[13] && gp.buttons[13].pressed) by = 1;
    var dz = deadzone(bx, by);
    applyMove(p, dz.x, -dz.y);
    var b = gp.buttons;
    function pressed(i) { return b[i] && b[i].pressed; }
    edge(p, "jump", pressed(0));
    edge(p, "grip", pressed(2));
    edge(p, "special", pressed(1));
    edge(p, "tag", pressed(3));
    edge(p, "ukemi", pressed(4) || pressed(5));
    edge(p, "pause", pressed(9));
    edge(p, "start", pressed(9) || pressed(0));
    edge(p, "throw", pressed(7) || pressed(6));
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
    for (i = 0; i < list.length; i++) {
      gp = list[i];
      if (!gp) continue;
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
