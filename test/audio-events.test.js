"use strict";

var assert = require("assert");
var calls = [];
global.PAudio = { playEvent: function (name) { calls.push(name); } };
delete require.cache[require.resolve("../js/audio.events.js")];
var events = require("../js/audio.events.js");

function state(level) {
  return { levelId: level, tick: 1, heroes: [{ id: 1, alive: true, hp: 100, grounded: true, vx: 80, vd: 0 }],
    enemies: [], projectiles: [] };
}

events.reset();
var s = state("w4l2"); events.update(s);
assert(calls.indexOf("step_shipdeck") >= 0, "W4 movement uses wet ship-deck footsteps");
s.tick = 2; s.heroes[0].grounded = false; s.heroes[0].vz = 200; events.update(s);
assert(calls.indexOf("jump") >= 0, "grounded-to-airborne hero transition cues jump");
s.tick = 3; s.heroes[0].grounded = true; s.heroes[0].vz = 0; events.update(s);
assert(calls.indexOf("land") >= 0, "airborne-to-grounded hero transition cues landing");
s.tick = 25; events.update(s);
assert.strictEqual(calls.filter(function (x) { return x === "step_shipdeck"; }).length, 2,
  "moving hero repeats footsteps at the authored cadence");
s.tick = 4; s.enemies.push({ id: 8, alive: true, hp: 24, grounded: true }); events.update(s);
assert(calls.indexOf("enemy_alert") >= 0, "new live enemy cues alert");
s.tick = 5; s.projectiles.push({ id: 3, alive: true, kind: "melon" }); events.update(s);
assert(calls.indexOf("melon_whoosh") >= 0, "new melon projectile cues its whoosh");
s.tick = 6; s.projectiles.length = 0; events.update(s);
assert(calls.indexOf("melon_splat") >= 0, "removed melon projectile cues its impact");
s.tick = 7; s.enemies.length = 0; events.update(s);
s.tick = 8; s.enemies.push({ id: 8, alive: true, hp: 24, grounded: true }); events.update(s);
assert.strictEqual(calls.filter(function (x) { return x === "enemy_alert"; }).length, 2,
  "despawned pooled enemy IDs alert again when reused");
assert.strictEqual(events.surface("w2l1"), "stone");
assert.strictEqual(events.surface("w3l2"), "metal");
assert.strictEqual(events.surface("w5l1"), "casino");
console.log("ok render-side audio event routing");
