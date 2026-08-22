"use strict";

var assert = require("assert");
var cfg = { vibration: "off", reducedMotion: false, touch: { layout: "right", scale: 1 } };
var game = { levelId: "w1l1", activeHero: 0, meter: 0,
  heroes: [{ id: 0, alive: true, x: 80, d: 20, combatState: "FREE", meter: 0 }], enemies: [] };
var canvas = { _handlers: {}, addEventListener: function (name, fn) { this._handlers[name] = fn; },
  getBoundingClientRect: function () { return { left: 0, top: 0, width: 480, height: 270 }; } };
Object.defineProperty(global, "navigator", { value: { vibrate: function () {} }, configurable: true });
global.performance = { now: function () { return 1000; } };
global.document = { getElementById: function () { return canvas; } };
global.window = { PSettings: { get: function () { return cfg; } }, PGame: { state: game },
  PInput: { setLastDevice: function () {}, tick: function () { return 40; } },
  addEventListener: function () {} };

delete require.cache[require.resolve("../js/input.touch.js")];
var Touch = require("../js/input.touch.js");
function ev(id, x, y, t) { return { pointerId: id, pointerType: "touch", clientX: x, clientY: y,
  timeStamp: t, preventDefault: function () {} }; }
function intent() { return { pressedAtTick: {} }; }

Touch.init(canvas);
Touch._down(ev(90, 104, 210, 0));
var move = intent(); Touch.poll(move, 39);
assert(move.moveX > 0.9 && move.moveD === 0, "fixed D-pad right arm publishes full right movement");
Touch._move(ev(90, 66, 168, 20)); move = intent(); Touch.poll(move, 40);
assert(move.moveD > 0.9, "fixed D-pad supports sliding from right to up");
Touch._up(ev(90, 66, 168, 40)); Touch.reset();
Touch._down(ev(1, 432, 222, 0));
var it = intent(); Touch.poll(it, 40);
assert(it.throwPressed && !it.gripPressed, "ACTION taps strike when no enemy is in grip range");
it = intent(); Touch.poll(it, 41);
assert(!it.throwPressed, "held ACTION does not retrigger every input poll");
Touch._up(ev(1, 432, 222, 100)); Touch.poll(intent(), 42);

Touch.reset(); game.enemies = [{ id: 2, alive: true, x: 120, d: 20 }];
Touch._down(ev(2, 432, 222, 200)); it = intent(); Touch.poll(it, 43);
assert(it.gripPressed && !it.throwPressed, "ACTION becomes grip in proximity");
Touch._move(ev(2, 490, 222, 270)); Touch._up(ev(2, 490, 222, 300)); it = intent(); Touch.poll(it, 44);
assert(it.gripReleased && it.throwDir === 2, "ACTION flick release selects a directional throw");

Touch.reset(); game.enemies = []; game.meter = 0;
Touch._down(ev(3, 386, 177, 400)); it = intent(); Touch.poll(it, 45);
assert(!it.specialPressed, "SPECIAL hit target stays hidden until meter is full");
Touch._up(ev(3, 386, 177, 420)); Touch.reset(); game.meter = 100; game.heroes[0].meter = 100;
Touch._down(ev(4, 386, 177, 500)); it = intent(); Touch.poll(it, 46);
assert(it.specialPressed, "meter-full SPECIAL is reachable by touch");

Touch.reset(); Touch._down(ev(5, 300, 100, 600)); Touch._up(ev(5, 300, 150, 730)); it = intent(); Touch.poll(it, 47);
assert(it.ukemiPressed, "fast right-half downward swipe publishes ukemi");
Touch.reset(); Touch._down(ev(6, 260, 30, 800)); Touch._down(ev(7, 330, 30, 820)); it = intent(); Touch.poll(it, 48);
assert(it.pausePressed, "deliberate two-finger top-zone touch publishes pause");

Touch.reset(); Touch._down(ev(60, 104, 210, 830)); Touch._down(ev(61, 430, 218, 840)); it = intent(); Touch.poll(it, 49);
assert(it.moveX > 0.9 && it.throwPressed && !it.pausePressed, "movement plus ACTION never pauses ordinary play");
Touch._up(ev(61, 430, 218, 850)); Touch._up(ev(60, 104, 210, 860));

Touch.reset(); Touch._down(ev(62, 375, 228, 870)); Touch._up(ev(62, 375, 228, 875)); it = intent(); Touch.poll(it, 50);
assert(it.jumpPressed && it.jumpReleased, "short JUMP tap between polls preserves both edges");
Touch.reset(); game.meter = 100; game.heroes[0].meter = 100;
Touch._down(ev(63, 378, 170, 880)); Touch._up(ev(63, 378, 170, 885)); it = intent(); Touch.poll(it, 51);
assert(it.specialPressed && it.specialReleased, "short SPECIAL tap between polls is not lost");

Touch.reset(); game.enemies = [{ id: 3, alive: true, x: 110, d: 20 }];
Touch._down(ev(64, 430, 218, 890)); Touch._move(ev(64, 470, 218, 895)); Touch._cancel(ev(64, 470, 218, 900)); it = intent(); Touch.poll(it, 52);
assert(!it.gripReleased && it.throwDir == null, "pointer cancellation clears ACTION without throwing");

cfg.touch.layout = "mirrored"; cfg.touch.scale = 0.8;
Touch._down(ev(91, 380, 210, 910)); it = intent(); Touch.poll(it, 53);
assert(it.moveX < -0.9, "left-handed layout mirrors the fixed D-pad");
Touch._move(ev(91, 414, 250, 920)); Touch._up(ev(91, 414, 250, 930)); it = intent(); Touch.poll(it, 54);
assert(!it.ukemiPressed, "mirrored D-pad release cannot leak into the swipe-ukemi gesture");
Touch.draw({ beginPath: function () {}, arc: function () {}, fill: function () {}, stroke: function () {},
  fillRect: function () {}, moveTo: function () {}, lineTo: function () {}, closePath: function () {} });
assert.strictEqual(Touch.buttons[0].x, 50, "left-handed layout mirrors ACTION");
assert(Touch.buttons[2].r * 2 + 12 >= 36, "smallest 80% touch target remains at least 72 UI pixels");
console.log("ok contextual mirrored touch controls and gestures");
