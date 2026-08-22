"use strict";

var h = require("./harness");
var assert = h.assert;
h.requireFile("js/sim.js");

function intentAt(tick) {
  var walk = (tick % 240) < 120;
  return h.intents({
    moveX: walk ? 1 : -1,
    moveD: (tick % 60) < 20 ? 1 : 0,
    jump: (tick % 180) < 18,
    jumpPressed: tick % 180 === 0,
    grip: (tick % 90) >= 10 && (tick % 90) < 28,
    gripPressed: tick % 90 === 10
  });
}

function play(seed, ticks, log) {
  var g;
  try {
    g = h.createGame(seed, { levelId: "w1l1" });
  } catch (err) {
    g = h.createEmpty("belt", { seed: seed });
  }
  var i, inp;
  var recorded = log || [];
  for (i = 0; i < ticks; i++) {
    inp = log ? log[i] : intentAt(i);
    if (!log) recorded.push(inp);
    h.step(g, inp);
  }
  return { hash: h.hashWorld(g), log: recorded, tick: g.tick != null ? g.tick : ticks };
}

var a = play(1337, 36000);
var b = play(1337, 36000, a.log);
assert(a.hash === b.hash, "seed 1337, 36000 ticks recorded intents identical full-world hash");
assert(typeof a.hash === "string" || typeof a.hash === "number", "hashWorld returns a value");

var phaseGame = h.createEmpty("belt", { seed: 1337 });
var phaseEnemy = h.spawnEnemy(phaseGame, "E1", 180, 24);
var phaseHash = h.hashWorld(phaseGame);
phaseEnemy.recoverT = (phaseEnemy.recoverT || 0) + 1;
assert(h.hashWorld(phaseGame) !== phaseHash, "hashWorld includes the live AI recovery timer");
phaseHash = h.hashWorld(phaseGame);
phaseEnemy.activeMax = (phaseEnemy.activeMax || 0) + 1;
assert(h.hashWorld(phaseGame) !== phaseHash, "hashWorld includes published animation phase maxima");
phaseHash = h.hashWorld(phaseGame);
phaseEnemy._outOfLives = true;
assert(h.hashWorld(phaseGame) !== phaseHash, "hashWorld includes co-op exhaustion state");
phaseHash = h.hashWorld(phaseGame);
phaseGame._consumedTagAt++;
assert(h.hashWorld(phaseGame) !== phaseHash, "hashWorld includes buffered tag consumption state");
phaseHash = h.hashWorld(phaseGame);
phaseGame.heroes[0]._consumedSpecialAt++;
assert(h.hashWorld(phaseGame) !== phaseHash, "hashWorld includes buffered combat consumption state");
phaseHash = h.hashWorld(phaseGame);
phaseGame.tutorial = { phase: 1, done: false, hint: "ХВАТАЙ ЕГО" };
assert(h.hashWorld(phaseGame) !== phaseHash, "hashWorld includes deterministic tutorial progress");

if (h.fails()) {
  console.error(h.oks() + " ok, " + h.fails() + " fail");
  process.exit(1);
}
