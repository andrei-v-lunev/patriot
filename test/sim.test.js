"use strict";

var h = require("./harness");
var assert = h.assert;

assert(typeof PData !== "undefined" && PData.toTicks(12) === 24, "PData.toTicks(12)===24");
var test12 = h.getMove("test_12f");
assert(!!test12, "test_12f exists in moves.json");
assert(test12.startup + test12.active + test12.recovery === 12, "test_12f startup+active+recovery=12");

var PSim = h.requireFile("js/sim.js");
assert(typeof PSim.createGame === "function", "PSim.createGame");
assert(typeof PSim.step === "function", "PSim.step");

var g = h.createEmpty("plat");
var hero = h.getHero(g);
assert(!!hero, "empty plat has a hero");
var dur12 = (test12.startupT || PData.toTicks(test12.startup)) +
  (test12.activeT || PData.toTicks(test12.active)) +
  (test12.recoveryT || PData.toTicks(test12.recovery));
assert(dur12 === 24, "12f move from start to done is 24 ticks (converted " + dur12 + ")");
h.startMove(g, hero, "test_12f");
h.stepN(g, 24, h.intents());
hero = h.getHero(g);
var mv = h.findMove(g, hero);
var done = !mv || !mv.alive || mv.phase === 3 || mv.phase === "done" ||
  (hero && (hero.combatState === "FREE" || hero.combatState === "IDLE" || hero.moveDone));
assert(done, "12f live move done after 24 ticks (state=" + (hero && hero.combatState) + " moveT=" + (hero && hero.moveT) + ")");

g = h.createEmpty("plat");
hero = h.getHero(g);
assert(!!hero, "Idris empty plat");
hero.vx = 0;
hero.grounded = true;
h.stepN(g, 15, h.intents({ moveX: 1 }));
hero = h.getHero(g);
assert(hero.vx >= 149.5 && hero.vx <= 150.5, "Idris moveX=1 for 15 ticks vx in [149.5,150.5] got " + hero.vx);

g = h.createEmpty("belt");
hero = h.getHero(g);
assert(!!hero, "Idris empty belt");
hero.vd = 0;
hero.vx = 0;
h.stepN(g, 30, h.intents({ moveD: 1, moveX: 0 }));
hero = h.getHero(g);
var wantVd = (PConst.heroes.idris.runMax) * (PConst.DEPTH_RATIO || 0.6);
assert(Math.abs(Math.abs(hero.vd) - wantVd) < 0.01 || Math.abs(hero.vd) === 90,
  "belt moveD=1 |vd|===runMax*0.6 (90) got " + hero.vd);

var easy = h.createEmpty("belt", { difficulty: "easy" });
var hard = h.createEmpty("belt", { difficulty: "hard" });
var easyFoe = h.spawnEnemy(easy, "E1", 220, 24);
var hardFoe = h.spawnEnemy(hard, "E1", 220, 24);
assert(easy.lives === 5 && easy.maxAlive === 4 && easy.attackTokensMax === 2,
  "Easy applies 5 lives, maxAlive 4, and 2 attack tokens");
assert(hard.lives === 2 && hard.maxAlive === 7 && hard.attackTokensMax === 3,
  "Hard applies 2 lives, maxAlive 7, and 3 attack tokens");
assert(easyFoe.hp === Math.ceil(24 * 0.75) && hardFoe.hp === Math.ceil(24 * 1.30),
  "difficulty scales enemy HP (easy=" + easyFoe.hp + " hard=" + hardFoe.hp + ")");
assert(easyFoe.damageMul === 0.70 && hardFoe.damageMul === 1.35 &&
  easyFoe.telegraphMul === 1.30 && hardFoe.telegraphMul === 0.85,
  "difficulty attaches damage and telegraph multipliers to spawned enemies");
assert(easy.bossEnrageS === 360 && hard.bossEnrageS === 180 &&
  easy.meterGainMul === 1.25 && hard.scoreMul === 1.25,
  "difficulty applies enrage, meter, and score multipliers");
var dojo = h.createGame(1337, { levelId: "w1l1", training: true });
assert(dojo.training === true && dojo.levelId === "w1l1",
  "DOJO creates a distinct non-campaign training run on the authored dojo level");
var invalidLevel = h.createGame(1337, { levelId: "💥/../\\0" });
assert(invalidLevel.level && invalidLevel.levelId === "w1l1" && invalidLevel.segment,
  "invalid nonempty level ids fall back to the canonical first level instead of a blank softlock");

var a = { d: 20 };
var b = { d: 30 };
var c = { d: 31 };
assert(h.depthOk(a, b, 10) === true, "depthOk d=20 vs d=30 tol 10 true");
assert(h.depthOk(a, c, 10) === false, "depthOk d=20 vs d=31 tol 10 false");

function intentAt(tick) {
  return h.intents({
    moveX: (tick % 80) < 40 ? 1 : -1,
    jump: (tick % 200) < 12,
    jumpPressed: tick % 200 === 0,
    grip: (tick % 90) >= 8 && (tick % 90) < 20,
    gripPressed: tick % 90 === 8
  });
}

function runLog(seed, ticks) {
  var state = h.createEmpty("plat", { seed: seed });
  var log = [];
  var i, inp;
  for (i = 0; i < ticks; i++) {
    inp = intentAt(i);
    log.push(inp);
    h.step(state, inp);
  }
  return { state: state, log: log, hash: h.hashWorld(state) };
}

var runA = runLog(1337, 600);
var g2 = h.createEmpty("plat", { seed: 1337 });
var t;
for (t = 0; t < runA.log.length; t++) h.step(g2, runA.log[t]);
assert(h.hashWorld(g2) === runA.hash, "same seed+intent log 600 ticks identical hashWorld");

g = h.createEmpty("belt");
var duplicateEnemy = h.spawnEnemy(g, "E1", 180, 24);
duplicateEnemy.scoreVal = 100;
g.enemies.push(duplicateEnemy);
duplicateEnemy.hp = 0;
h.step(g, h.intents());
assert(g.score === 100, "duplicate enemy references award score exactly once");
var reuseA = h.spawnEnemy(g, "E1", 180, 24);
var reuseB = h.spawnEnemy(g, "E1", 220, 24);
assert(reuseA && reuseB && reuseA !== reuseB && g.pools.enemies.inUse() === 2,
  "duplicate release cannot poison the enemy pool or alias later allocations");

if (h.fails()) {
  console.error(h.oks() + " ok, " + h.fails() + " fail");
  process.exit(1);
}
