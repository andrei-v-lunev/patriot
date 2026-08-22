"use strict";

var fs = require("fs");
var manifest = JSON.parse(fs.readFileSync("tools/asset-manifest.json", "utf8"));
var atlas = JSON.parse(fs.readFileSync("assets/atlas/atlas.json", "utf8"));
var rejected = JSON.parse(fs.readFileSync("tools/rejected-assets.json", "utf8"));
var ids = {}, atlasIds = {}, ok = 0, fail = 0;

function assert(cond, msg) {
  if (cond) { console.log("ok " + msg); ok++; }
  else { console.error("FAIL " + msg); fail++; }
}

(manifest.entries || []).forEach(function (a) { ids[a.id] = true; });
Object.keys(atlas.frames || atlas).forEach(function (id) { atlasIds[id] = true; });

assert(rejected.schema === 1 && rejected.decisions.length === 11,
  "rejected generation registry records all eleven deliberate decisions");
rejected.decisions.forEach(function (d) {
  assert(!ids[d.id], d.id + " is not advertised as a publishable generated asset");
  if (d.kind === "alias") assert(!!atlasIds[d.target], d.id + " alias target " + d.target + " is published");
  else assert(d.kind === "code-native" && d.consumer === "js/fx.js", d.id + " has a named code-native consumer");
});

global.window = global;
global.PGame = { state: { tick: 24 } };
global.PLayers = { floorY: function () { return 226; } };
var requested = [];
function fr(id, index) {
  requested.push(id);
  return { id: id, index: index || 0, img: {}, sx: 0, sy: 0, sw: 32, sh: 32 };
}
global.PAnim = {
  ready: function () { return true; },
  load: function () {},
  meta: function (id) { return atlasIds[id] ? (atlas.frames || atlas)[id] : null; },
  frame: function (id) { return fr(id, 0); },
  frameAt: function (id, i) { return fr(id, i); },
  frameOnce: function (id, i) { return fr(id, i); }
};
var PSprites = require("../js/render.sprites.js");
var ctx = {
  save: function () {}, restore: function () {}, translate: function () {}, scale: function () {},
  rotate: function () {}, drawImage: function () {}, fillRect: function () {}, globalAlpha: 1,
  imageSmoothingEnabled: false, fillStyle: ""
};
function route(archetype, pattern, phase) {
  requested.length = 0;
  PSprites.drawEntity(ctx, {
    id: 1, kind: "enemy", team: "enemy", alive: true, archetype: archetype,
    x: 120, d: 20, z: 0, w: 32, h: 60, facing: 1, grounded: true,
    combatState: pattern ? "ATTACK" : "FREE", aiState: pattern ? "ATTACK" : "IDLE",
    patternName: pattern, atkPhase: pattern ? 1 : 3, activeMax: 24, activeT: 12,
    recoverMax: 12, recoverT: 12, phase: phase || 2, cabBroken: true
  }, { x: 0, z: 0 }, 0);
  return requested[0];
}

assert(route("B1", "pound") === "b1-charge", "B1 pound uses accepted animated charge alias");
assert(route("B2", "grab") === "b2-lash", "B2 grab uses accepted animated lash alias");
assert(route("B3", "duel") === "b3-tunnel", "B3 duel uses accepted animated tunnel alias");
assert(route("B3", "stance") === "b3-telegraph", "B3 stance uses accepted animated telegraph alias");
assert(route("B5", "combo", 2) === "b5-counter", "B5 combo uses accepted animated counter alias");
assert(route("B5", "enrage", 3) === "b5-telegraph", "B5 enrage uses accepted animated telegraph alias");
assert(route("B5", null, 1) === "b5-telegraph", "B5 directing loop uses accepted theatrical telegraph poses");

requested.length = 0;
PSprites.drawEntity(ctx, {
  id: 2, kind: "hero", team: "hero", alive: true, archetype: "idris", heroId: "idris",
  x: 80, d: 20, z: 0, w: 34, h: 62, facing: 1, grounded: true,
  combatState: "FREE", sweepLen: 30, sweepT: 9
}, { x: 0, z: 0 }, 0);
assert(requested[0] === "idris-throw", "protected hero strike reuses the approved dynamic hero sheet");

delete global.window;
if (fail) process.exit(1);
console.log(ok + " ok, 0 fail");
