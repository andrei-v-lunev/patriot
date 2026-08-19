"use strict";

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var fails = 0;
var oks = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exitCode = 1;
    fails++;
  } else {
    console.log("ok", msg);
    oks++;
  }
}

function loadJs(rel) {
  var p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return null;
  return require(p);
}

loadJs("js/constants.js");
loadJs("js/rng.js");
loadJs("js/pools.js");
loadJs("js/data.js");
loadJs("js/sim.plat.js");
loadJs("js/sim.belt.js");
loadJs("js/sim.waves.js");
loadJs("js/sim.camera.js");
loadJs("js/sim.tag.js");
loadJs("js/sim.pickups.js");
loadJs("js/combat.ippon.js");
loadJs("js/combat.hit.js");
loadJs("js/combat.grip.js");
loadJs("js/combat.throw.js");
loadJs("js/combat.js");
loadJs("js/ai.js");
loadJs("js/ai.boss.js");
loadJs("js/sim.js");

function requireFile(rel) {
  var p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) {
    console.error("FAIL", "missing " + rel);
    process.exitCode = 1;
    process.exit(1);
  }
  return require(p);
}

function G(n) {
  if (typeof global !== "undefined" && global[n]) return global[n];
  if (typeof window !== "undefined" && window[n]) return window[n];
  return null;
}

function blankIntent(extra) {
  var i = {
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
    pausePressed: false
  };
  var k;
  if (extra) {
    for (k in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, k)) i[k] = extra[k];
    }
  }
  return i;
}

function intents(a, b) {
  return [blankIntent(a), blankIntent(b)];
}

function sim() {
  return G("PSim");
}

function combat() {
  return G("PCombat");
}

function tagApi() {
  return G("PTag") || (combat() && (combat().tag || combat().PTag)) || (sim() && sim().tag);
}

function bindIntents(g, inp) {
  var i, h, idx;
  g.intents = inp;
  for (i = 0; i < (g.heroes || []).length; i++) {
    h = g.heroes[i];
    idx = h.playerIndex != null ? h.playerIndex : (h.player != null ? h.player : i);
    h.player = idx;
    h.playerIndex = idx;
    h.intent = inp[idx] || inp[0];
  }
}

function step(g, inp) {
  var S = sim();
  if (!S || typeof S.step !== "function") throw new Error("PSim.step missing");
  inp = inp || intents();
  bindIntents(g, inp);
  S.step(g, inp);
}

function stepN(g, n, inp) {
  var i;
  for (i = 0; i < n; i++) step(g, inp);
}

function createGame(seed, opts) {
  var S = sim();
  var g;
  if (!S || typeof S.createGame !== "function") throw new Error("PSim.createGame missing");
  g = S.createGame(seed == null ? 1337 : seed, opts);
  if (g && !g.lifeState) g.lifeState = "playing";
  return g;
}

function createEmpty(mode, extra) {
  var opts = {};
  var k, seed;
  extra = extra || {};
  for (k in extra) {
    if (Object.prototype.hasOwnProperty.call(extra, k) && k !== "seed") opts[k] = extra[k];
  }
  opts.mode = mode;
  opts.empty = true;
  if (!opts.hero) opts.hero = "idris";
  seed = extra.seed == null ? 1337 : extra.seed;
  return createGame(seed, opts);
}

function listPool(g, name) {
  if (g[name] && g[name].all) return g[name].all;
  if (Array.isArray(g[name])) return g[name];
  if (g.pools && g.pools[name] && g.pools[name].all) return g.pools[name].all;
  return [];
}

function getHeroes(g) {
  var all = Array.isArray(g.heroes) ? g.heroes : listPool(g, "heroes");
  var out = [];
  var i, h;
  for (i = 0; i < all.length; i++) {
    h = all[i];
    if (h && h.alive && !h.benched) out.push(h);
  }
  if (out.length) return out;
  if (g.hero) return [g.hero];
  return [];
}

function getHero(g, idx) {
  var hs = getHeroes(g);
  idx = idx || 0;
  if (hs[idx]) return hs[idx];
  return hs[0] || g.hero || null;
}

function getEnemies(g) {
  var all = Array.isArray(g.enemies) ? g.enemies : listPool(g, "enemies");
  var out = [];
  var i, e;
  for (i = 0; i < all.length; i++) {
    e = all[i];
    if (e && e.alive) out.push(e);
  }
  return out;
}

function getMove(id) {
  var m = PData && PData.getMove ? PData.getMove(id) : null;
  if (m && typeof m === "object" && (m.startup != null || m.throw)) return m;
  var r = PData && PData.ready ? PData.ready() : null;
  var inner = r && r.moves && r.moves.moves;
  m = inner && inner[id];
  if (m && !m._ticks && PData.convertMove) PData.convertMove(m);
  return m;
}

function spawnEnemy(g, arch, x, d, extra) {
  var S = sim();
  var spec = extra || {};
  spec.archetype = spec.archetype || arch;
  if (spec.x == null) spec.x = x;
  if (spec.d == null) spec.d = d;
  if (S && typeof S.spawnEnemy === "function") {
    var e = S.spawnEnemy(g, spec);
    if (e) return e;
  }
  throw new Error("spawnEnemy missing (cannot spawn " + arch + ")");
}

function startMove(g, ent, id) {
  var S = sim();
  var C = combat();
  if (S && typeof S.startMove === "function") return S.startMove(g, ent, id);
  if (C && typeof C.startMove === "function") return C.startMove(g, ent, id);
  if ((id === "sweep_idris" || id === "sweep_otajon") && C && C.startSweep) return C.startSweep(g, ent);
  if (id === "i8_kesa" && C && C.startPin) return C.startPin(g, ent);
  throw new Error("startMove missing for " + id);
}

function hashWorld(g) {
  var S = sim();
  if (S && typeof S.hashWorld === "function") return S.hashWorld(g);
  throw new Error("PSim.hashWorld missing");
}

function depthOk(a, b, tol) {
  var S = sim();
  var C = combat();
  var fn = (S && S.depthOk) || (C && C.depthOk);
  if (typeof fn !== "function") throw new Error("depthOk missing");
  if (tol == null) return fn(a, b);
  return fn(a, b, tol);
}

function applyDamage(g, ent, amt, extra) {
  var C = combat();
  var Hit = G("PCombatHit");
  var S = sim();
  var flags = extra || {};
  if (extra && extra.chip) flags = { isThrow: false, isChip: true };
  if (extra && (extra.throw || extra.kind === "throw")) flags = { isThrow: true };
  if (C && typeof C.applyDamage === "function") return C.applyDamage(g, ent, amt, extra && extra.src, flags);
  if (Hit && typeof Hit.applyDamage === "function") return Hit.applyDamage(g, ent, amt, extra && extra.src, flags);
  if (S && typeof S.applyDamage === "function") return S.applyDamage(g, ent, amt, extra);
  throw new Error("applyDamage missing");
}

function chainTimer(g) {
  if (g.ippon && g.ippon.timer != null) return g.ippon.timer;
  if (g.ipponT != null) return g.ipponT;
  if (g.ipponTimer != null) return g.ipponTimer;
  if (g.chainT != null) return g.chainT;
  if (g.chain && g.chain.timer != null) return g.chain.timer;
  return null;
}

function chainCount(g) {
  if (g.ippon && g.ippon.chain != null) return g.ippon.chain;
  if (g.chainCount != null) return g.chainCount;
  if (g.ipponChain != null) return g.ipponChain;
  if (g.chain && g.chain.n != null) return g.chain.n;
  if (g.chain && g.chain.count != null) return g.chain.count;
  return null;
}

function tagCd(g) {
  if (g.tagCd != null) return g.tagCd;
  if (g.tagCdT != null) return g.tagCdT;
  if (g.tag && g.tag.cooldownT != null) return g.tag.cooldownT;
  if (g.tag && g.tag.cd != null) return g.tag.cd;
  return null;
}

function goBlocked(g) {
  if (g.go && g.go.blocked != null) return !!g.go.blocked;
  if (g.go && g.go.canAdvance === false) return true;
  if (g.go && g.go.canAdvance === true) return false;
  if (g.gate && g.gate.closed) return true;
  if (g.gate && g.gate.open === false) return true;
  if (g.go && g.go.active && !g.go.opened) return true;
  if (g.go && g.go.opened) return false;
  return null;
}

function findMove(g, owner) {
  var all = listPool(g, "moves");
  var i, m, oid;
  oid = owner && (owner.id != null ? owner.id : owner);
  for (i = 0; i < all.length; i++) {
    m = all[i];
    if (m && m.alive && (oid == null || m.ownerId === oid)) return m;
  }
  return owner && owner.move ? owner.move : null;
}

function poolIndex(g, ent, name) {
  var all = g.pools && g.pools[name] && g.pools[name].all;
  var i;
  if (!all) return -1;
  for (i = 0; i < all.length; i++) if (all[i] === ent) return i;
  return -1;
}

global.assert = assert;
global.PHarness = {
  ROOT: ROOT,
  assert: assert,
  fails: function () { return fails; },
  oks: function () { return oks; },
  requireFile: requireFile,
  G: G,
  blankIntent: blankIntent,
  intents: intents,
  step: step,
  stepN: stepN,
  createGame: createGame,
  createEmpty: createEmpty,
  getHero: getHero,
  getHeroes: getHeroes,
  getEnemies: getEnemies,
  getMove: getMove,
  spawnEnemy: spawnEnemy,
  startMove: startMove,
  hashWorld: hashWorld,
  depthOk: depthOk,
  applyDamage: applyDamage,
  chainTimer: chainTimer,
  chainCount: chainCount,
  tagCd: tagCd,
  goBlocked: goBlocked,
  findMove: findMove,
  listPool: listPool,
  tagApi: tagApi,
  poolIndex: poolIndex,
  sim: sim,
  combat: combat
};

module.exports = global.PHarness;
