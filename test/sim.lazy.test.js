"use strict";

/* Regression test for today's root-cause fix in js/sim.js.

   In the browser, index.html loads <script src="js/sim.js"> BEFORE
   js/sim.plat.js (and sim.belt/sim.waves/sim.camera/combat/ai/sim.tag/
   sim.pickups). The old code cached those dependency lookups in a
   top-level var at IIFE-eval time, so they froze at null/undefined
   forever and every sim delegate call (movement, combat, tagging...)
   silently no-op'd. The fix resolves them lazily, inside a function,
   at *call* time instead of *load* time.

   This test reproduces that load order in Node: it makes js/sim.plat.js
   unavailable (via both globals and require) while js/sim.js is required,
   steps the sim once to confirm movement really is a no-op in that state
   (proving the simulated failure is real, not a no-op test), then makes
   sim.plat.js available afterwards — exactly like the dependent <script>
   tag attaching window.PSimPlat after sim.js has already run — and
   confirms sim.js picks it up on the very next step() with no reload. */

var path = require("path");

var ROOT = path.join(__dirname, "..");
function p(rel) { return path.join(ROOT, rel); }

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

// Base deps sim.js requires eagerly (not part of the lazy-resolution bug).
require(p("js/constants.js"));
require(p("js/rng.js"));
require(p("js/pools.js"));
require(p("js/data.js"));

// Simulate "sim.plat.js hasn't loaded on the page yet": fake its require.cache
// entry so require("./sim.plat") from inside sim.js resolves to null, and make
// sure it never attached to global either.
var simPlatPath = require.resolve(p("js/sim.plat.js"));
delete global.PSimPlat;
require.cache[simPlatPath] = {
  id: simPlatPath,
  filename: simPlatPath,
  loaded: true,
  exports: null
};

var PSim = require(p("js/sim.js"));

var g = PSim.createGame(1337, { mode: "plat", empty: true, hero: "idris" });
var hero = g.heroes[0];
ok(!!hero, "createGame spawns a hero even with sim.plat.js unavailable");
hero.grounded = true;
hero.vx = 0;
var x0 = hero.x;

var moveIntent = PSim.blankIntent();
moveIntent.moveX = 1;

for (var i = 0; i < 15; i++) PSim.step(g, [moveIntent, PSim.blankIntent()]);

ok(hero.vx === 0 && hero.x === x0,
  "sanity check: with PSimPlat truly unavailable, plat integrate is a no-op " +
  "(x=" + hero.x + " vx=" + hero.vx + ") — proves the simulated failure is real");

// Now the dependent module "attaches to global" after sim.js has already
// loaded — this is the exact regression scenario for the fix.
delete require.cache[simPlatPath];
delete global.PSimPlat;
require(p("js/sim.plat.js")); // side effect: sets global.PSimPlat, like a late <script> tag
ok(!!global.PSimPlat, "sim.plat.js attaching after sim.js loads sets global.PSimPlat");

for (var j = 0; j < 15; j++) PSim.step(g, [moveIntent, PSim.blankIntent()]);

ok(hero.vx > 100,
  "sim.js resolves PSimPlat lazily on the next step() once it becomes available, " +
  "without reloading sim.js: vx=" + hero.vx);
ok(hero.x > x0,
  "hero actually moved given a move intent, once the dependency became available: " +
  "x=" + hero.x + " > " + x0);

// Same story for the belt-mode delegate (sim.belt.js), spawning it fresh so we
// exercise the belt integrate path too, not just plat.
var simBeltPath = require.resolve(p("js/sim.belt.js"));
delete global.PSimBelt;
require.cache[simBeltPath] = {
  id: simBeltPath,
  filename: simBeltPath,
  loaded: true,
  exports: null
};

var g2 = PSim.createGame(1338, { mode: "belt", empty: true, hero: "idris" });
var hero2 = g2.heroes[0];
hero2.vd = 0;
hero2.vx = 0;
var d0 = hero2.d;
var beltIntent = PSim.blankIntent();
beltIntent.moveD = 1;
for (var k = 0; k < 15; k++) PSim.step(g2, [beltIntent, PSim.blankIntent()]);
ok(hero2.vd === 0, "sanity: belt integrate is also a no-op while PSimBelt is unavailable (vd=" + hero2.vd + ")");

delete require.cache[simBeltPath];
delete global.PSimBelt;
require(p("js/sim.belt.js"));
ok(!!global.PSimBelt, "sim.belt.js attaching after sim.js loads sets global.PSimBelt");

for (var m = 0; m < 15; m++) PSim.step(g2, [beltIntent, PSim.blankIntent()]);
ok(Math.abs(hero2.vd) > 0, "belt integrate resumes lazily once PSimBelt becomes available: vd=" + hero2.vd);

console.log(oks + " ok, " + fails + " fail");
if (fails) process.exitCode = 1;
