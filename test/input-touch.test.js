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
Touch._down(ev(90, 104, 204, 0));
var move = intent(); Touch.poll(move, 39);
assert(move.moveX > 0.9 && move.moveD === 0, "fixed D-pad right arm publishes full right movement");
Touch._move(ev(90, 66, 162, 20)); move = intent(); Touch.poll(move, 40);
assert(move.moveD > 0.9, "fixed D-pad supports sliding from right to up");
Touch._up(ev(90, 66, 162, 40)); Touch.reset();
Touch._down(ev(1, 431, 198, 0));
var it = intent(); Touch.poll(it, 40);
assert(it.throwPressed && !it.gripPressed, "ACTION taps strike when no enemy is in grip range");
it = intent(); Touch.poll(it, 41);
assert(!it.throwPressed, "held ACTION does not retrigger every input poll");
Touch._up(ev(1, 432, 222, 100)); Touch.poll(intent(), 42);

Touch.reset(); game.enemies = [{ id: 2, alive: true, x: 120, d: 20 }];
Touch._down(ev(2, 431, 198, 200)); it = intent(); Touch.poll(it, 43);
assert(it.gripPressed && !it.throwPressed, "ACTION becomes grip in proximity");
Touch._move(ev(2, 489, 198, 270)); Touch._up(ev(2, 489, 198, 300)); it = intent(); Touch.poll(it, 44);
assert(it.gripReleased && it.throwDir === 2, "ACTION flick release selects a directional throw");

Touch.reset(); game.enemies = []; game.meter = 0;
Touch._down(ev(3, 410, 135, 400)); it = intent(); Touch.poll(it, 45);
assert(!it.specialPressed, "SPECIAL hit target stays hidden until meter is full");
Touch._up(ev(3, 410, 135, 420)); Touch.reset(); game.meter = 100; game.heroes[0].meter = 100;
Touch._down(ev(4, 410, 135, 500)); it = intent(); Touch.poll(it, 46);
assert(it.specialPressed, "meter-full SPECIAL is reachable by touch");

Touch.reset(); Touch._down(ev(5, 300, 100, 600)); Touch._up(ev(5, 300, 150, 730)); it = intent(); Touch.poll(it, 47);
assert(it.ukemiPressed, "fast right-half downward swipe publishes ukemi");
Touch.reset(); Touch._down(ev(6, 260, 30, 800)); Touch._down(ev(7, 330, 30, 820)); it = intent(); Touch.poll(it, 48);
assert(it.pausePressed, "deliberate two-finger top-zone touch publishes pause");

Touch.reset(); Touch._down(ev(60, 104, 204, 830)); Touch._down(ev(61, 431, 198, 840)); it = intent(); Touch.poll(it, 49);
assert(it.moveX > 0.9 && it.throwPressed && !it.pausePressed, "movement plus ACTION never pauses ordinary play");
Touch._up(ev(61, 431, 198, 850)); Touch._up(ev(60, 104, 204, 860));

Touch.reset(); Touch._down(ev(62, 355, 224, 870)); Touch._up(ev(62, 355, 224, 875)); it = intent(); Touch.poll(it, 50);
assert(it.jumpPressed && it.jumpReleased, "short JUMP tap between polls preserves both edges");
Touch.reset(); game.meter = 100; game.heroes[0].meter = 100;
Touch._down(ev(63, 410, 135, 880)); Touch._up(ev(63, 410, 135, 885)); it = intent(); Touch.poll(it, 51);
assert(it.specialPressed && it.specialReleased, "short SPECIAL tap between polls is not lost");

Touch.reset(); game.enemies = [{ id: 3, alive: true, x: 110, d: 20 }];
Touch._down(ev(64, 431, 198, 890)); Touch._move(ev(64, 471, 198, 895)); Touch._cancel(ev(64, 471, 198, 900)); it = intent(); Touch.poll(it, 52);
assert(!it.gripReleased && it.throwDir == null, "pointer cancellation clears ACTION without throwing");

cfg.touch.layout = "mirrored"; cfg.touch.scale = 0.8;
Touch._down(ev(91, 394, 217, 910)); it = intent(); Touch.poll(it, 53);
assert(it.moveX < -0.9, "left-handed layout mirrors the fixed D-pad");
Touch._move(ev(91, 427, 250, 920)); Touch._up(ev(91, 427, 250, 930)); it = intent(); Touch.poll(it, 54);
assert(!it.ukemiPressed, "mirrored D-pad release cannot leak into the swipe-ukemi gesture");
Touch.draw({ beginPath: function () {}, arc: function () {}, fill: function () {}, stroke: function () {},
  fillRect: function () {}, strokeRect: function () {}, moveTo: function () {}, lineTo: function () {}, closePath: function () {} });
assert(Math.abs(Touch.buttons[0].x - 39.2) < 0.01, "left-handed layout mirrors and corner-anchors ACTION");
assert(Touch.buttons[2].r * 2 + 12 >= 36, "smallest 80% touch target remains at least 72 UI pixels");

cfg.touch.layout = "right"; cfg.touch.scale = 1.3;
var geo = Touch._geometry(), i, j, dx, dy, min;
for (i = 0; i < geo.buttons.length; i++) for (j = i + 1; j < geo.buttons.length; j++) {
  dx = geo.buttons[i].x - geo.buttons[j].x; dy = geo.buttons[i].y - geo.buttons[j].y;
  min = geo.buttons[i].hit + geo.buttons[j].hit;
  assert(dx * dx + dy * dy > min * min, "130% touch hit regions remain separated");
}
window.innerWidth = 844; window.innerHeight = 270;
canvas.getBoundingClientRect = function () { return { left: 182, top: 0, width: 480, height: 270 }; };
cfg.touch.scale = 1; geo = Touch._geometry();
assert(geo.rails, "short Safari layout moves controls into the wide letterbox rails");
assert(geo.pad.x < 182 && geo.buttons[0].x > 662,
  "rail controls stay outside the complete centered playfield");
assert(geo.buttons[0].hit * 2 >= 44 && geo.buttons[1].hit * 2 >= 44,
  "frequent touch targets meet the 44 CSS pixel mobile floor");

window.innerWidth = 480; window.innerHeight = 270;
canvas.getBoundingClientRect = function () { return { left: 0, top: 0, width: 480, height: 270 }; };
cfg.touch.scale = 1; Touch.reset(); game.meter = 0; game.heroes[0].meter = 0; game.enemies = [];
Touch._down(ev(100, 431, 198, 1000)); Touch._down(ev(101, 431, 198, 1002)); it = intent(); Touch.poll(it, 55);
assert(it.throwPressed, "first ACTION pointer owns the button");
Touch._up(ev(100, 431, 198, 1010)); it = intent(); Touch.poll(it, 56);
assert(it.throwReleased, "owner release ends ACTION even when a duplicate finger remains");
Touch._up(ev(101, 431, 198, 1020)); it = intent(); Touch.poll(it, 57);
assert(!it.throwReleased, "duplicate ACTION finger cannot publish a second release");

Touch.reset(); game.meter = 100; game.heroes[0].meter = 100;
Touch._down(ev(102, 410, 135, 1100)); Touch.poll(intent(), 58);
game.meter = 0; game.heroes[0].meter = 0; it = intent(); Touch.poll(it, 59);
assert(it.specialReleased, "SPECIAL releases once if readiness drains while held");
it = intent(); Touch.poll(it, 60);
assert(!it.specialReleased, "drained SPECIAL does not repeat its release edge");
console.log("ok contextual mirrored touch controls and gestures");
