"use strict";

/* Tests for js/input.js — PRD Part 5 §5.3.2 binding-table conformance.

   js/input.js is not written to be require()'d headless (it calls
   window.addEventListener / navigator.getGamepads from init()/poll()), so
   this file installs a light `window`/`navigator` shim before requiring it
   — the same spirit as test/harness.js's G()/blankIntent() shims for other
   modules — instead of changing input.js itself. Key presses are simulated
   by invoking the exact handlers input.js registered via
   window.addEventListener("keydown"/"keyup", ...). */

var path = require("path");

var ROOT = path.join(__dirname, "..");
var INPUT_PATH = require.resolve(path.join(ROOT, "js", "input.js"));

var fails = 0;
var oks = 0;

function ok(cond, msg) {
  if (cond) {
    console.log("ok", msg);
    oks++;
  } else {
    console.error("FAIL", msg);
    process.exitCode = 1;
    fails++;
  }
}

function makeWindow() {
  var handlers = {};
  return {
    _handlers: handlers,
    addEventListener: function (type, fn) {
      handlers[type] = handlers[type] || [];
      handlers[type].push(fn);
    },
    PScreens: null
  };
}

function freshInput(win) {
  delete require.cache[INPUT_PATH];
  global.window = win;
  try {
    global.navigator = {};
  } catch (e) {
    // Newer Node exposes a read-only global.navigator; input.js only reads
    // navigator.getGamepads inside a try/catch, so leaving it as-is is fine.
  }
  var mod = require(INPUT_PATH);
  mod.init();
  return mod;
}

function fireKey(win, type, code) {
  var hs = win._handlers[type] || [];
  for (var i = 0; i < hs.length; i++) hs[i]({ code: code });
}

function readIntent(PInput, p) {
  var it = PInput.intents()[p];
  return {
    moveX: it.moveX,
    moveD: it.moveD,
    throw: it.throw,
    jump: it.jump,
    grip: it.grip,
    special: it.special,
    tag: it.tag,
    ukemi: it.ukemi
  };
}

/* Press `codes`, poll once (so held-state is live), snapshot both players'
   intents, then release and poll again to leave state clean. */
function pressAndRead(win, PInput, codes) {
  var i;
  for (i = 0; i < codes.length; i++) fireKey(win, "keydown", codes[i]);
  PInput.poll();
  var snapshot = [readIntent(PInput, 0), readIntent(PInput, 1)];
  for (i = 0; i < codes.length; i++) fireKey(win, "keyup", codes[i]);
  PInput.poll();
  return snapshot;
}

var ACTIONS = ["throw", "jump", "grip", "special", "tag", "ukemi"];

/* ---- PRD §5.3.2 P1 primary bindings: KeyJ/K/L/I/O ---- */

(function p1PrimaryBindings() {
  var win = makeWindow();
  var PInput = freshInput(win);

  var P1_PRIMARY = { KeyJ: "throw", KeyK: "jump", KeyL: "grip", KeyI: "tag", KeyO: "ukemi" };

  Object.keys(P1_PRIMARY).forEach(function (code) {
    var want = P1_PRIMARY[code];
    var snap = pressAndRead(win, PInput, [code])[0];
    ok(snap[want] === true, code + " -> P1." + want + " === true");
    ACTIONS.forEach(function (act) {
      if (act !== want) ok(snap[act] === false, code + " does not also fire P1." + act);
    });
  });
})();

(function gripReleaseEdge() {
  var win = makeWindow();
  var PInput = freshInput(win);
  fireKey(win, "keydown", "KeyL");
  PInput.poll();
  fireKey(win, "keyup", "KeyL");
  PInput.poll();
  ok(PInput.intents()[0].gripReleased === true, "KeyL release emits the contextual throw edge");
})();

/* ---- No P1 key among the PRD action set is bound to two actions ---- */

(function p1NoDoubleBinding() {
  var win = makeWindow();
  var PInput = freshInput(win);

  var P1_KEYS = ["KeyJ", "KeyZ", "KeyK", "KeyX", "KeyL", "KeyC", "KeyU", "KeyV", "KeyI", "KeyB", "KeyO", "KeyN"];
  P1_KEYS.forEach(function (code) {
    var snap = pressAndRead(win, PInput, [code])[0];
    var fired = ACTIONS.filter(function (a) { return snap[a] === true; });
    ok(fired.length === 1, "P1 key " + code + " fires exactly one action, got [" + fired.join(",") + "]");
  });
})();

/* ---- No P2 key among the PRD action set is bound to two actions ---- */

(function p2NoDoubleBinding() {
  var win = makeWindow();
  var PInput = freshInput(win);

  var P2_KEYS = ["Numpad1", "Period", "Numpad2", "Slash", "Numpad3", "ShiftRight", "Numpad5", "Semicolon", "Numpad6", "Quote", "Numpad0", "Comma"];
  P2_KEYS.forEach(function (code) {
    var snap = pressAndRead(win, PInput, [code])[1];
    var fired = ACTIONS.filter(function (a) { return snap[a] === true; });
    ok(fired.length === 1, "P2 key " + code + " fires exactly one action, got [" + fired.join(",") + "]");
  });
})();

/* ---- Arrows drive P1 outside COOP, and always populate P2 ---- */

(function arrowsNonCoop() {
  var win = makeWindow();
  var PInput = freshInput(win);
  win.PScreens = null; // not COOP

  var snap = pressAndRead(win, PInput, ["ArrowRight"]);
  ok(snap[0].moveX > 0, "non-COOP: ArrowRight drives P1.moveX");
  ok(snap[1].moveX > 0, "arrows always populate P2.moveX regardless of mode");
})();

/* ---- Arrows drive P2 (not P1) once mode is COOP ---- */

(function arrowsCoop() {
  var win = makeWindow();
  var PInput = freshInput(win);
  // input.js is non-strict and reads the bare identifier `PScreens` (an
  // implied global lookup) alongside window.PScreens — in a real browser
  // `window` IS the global object so the two are the same thing; our
  // window shim is a separate object, so both must be set here.
  var screens = { modeId: function () { return "COOP"; }, get: function () { return "PLAY"; } };
  win.PScreens = screens;
  global.PScreens = screens;

  var snap = pressAndRead(win, PInput, ["ArrowRight"]);
  ok(snap[0].moveX === 0, "COOP: ArrowRight does not drive P1.moveX (P1 is WASD-only)");
  ok(snap[1].moveX > 0, "COOP: ArrowRight drives P2.moveX");

  // WASD still drives P1 in COOP.
  var snap2 = pressAndRead(win, PInput, ["KeyD"]);
  ok(snap2[0].moveX > 0, "COOP: KeyD (WASD) still drives P1.moveX");

  delete global.PScreens;

  screens = { modeId: function () { return "COOP"; }, get: function () { return "MODE"; } };
  win.PScreens = screens;
  global.PScreens = screens;
  var menuSnap = pressAndRead(win, PInput, ["ArrowUp"]);
  ok(menuSnap[0].moveD > 0, "COOP selection menu: arrows remain on P1 for navigation");
  delete global.PScreens;
})();

(function configuredBindingsReachRuntime() {
  var win = makeWindow();
  var settings = require(path.join(ROOT, "js", "settings.js"));
  var cfg = settings.defaults();
  var changed = settings.remap(cfg, "p1", "keyboard", "strike", "KeyQ");
  ok(changed.ok, "conflict-safe remap accepts a new P1 strike key");
  settings.use(changed.settings);
  win.PSettings = settings;
  var PInput = freshInput(win);
  var snap = pressAndRead(win, PInput, ["KeyQ"]);
  ok(snap[0].throw === true, "configured P1 strike key reaches the live input intent");
  var old = pressAndRead(win, PInput, ["KeyJ"]);
  ok(old[0].throw === false, "replaced P1 strike key is no longer active");
})();

console.log(oks + " ok, " + fails + " fail");
if (fails) process.exitCode = 1;
