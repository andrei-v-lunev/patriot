"use strict";

var path = require("path");
var fs = require("fs");
var ROOT = path.join(__dirname, "..");

function load(rel) {
  var p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return null;
  return require(p);
}

load("js/constants.js");
load("js/rng.js");
load("js/pools.js");
load("js/data.js");
var PSim = load("js/sim.js");
load("js/combat.js");
load("js/ai.js");

function blankIntent(extra) {
  var i = {
    moveX: 0, moveD: 0,
    jump: false, jumpPressed: false,
    grip: false, gripPressed: false,
    throwPressed: false, throwDir: -1,
    tag: false, tagPressed: false,
    special: false, specialPressed: false,
    ukemi: false, ukemiPressed: false,
    pause: false, pausePressed: false
  };
  var k;
  if (extra) for (k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) i[k] = extra[k];
  return i;
}

function intents(a) { return [blankIntent(a), blankIntent()]; }

function poolList(g, name) {
  if (g.pools && g.pools[name] && g.pools[name].all) return g.pools[name].all;
  if (Array.isArray(g[name])) return g[name];
  return [];
}

function heroOf(g) {
  var hs = Array.isArray(g.heroes) ? g.heroes : poolList(g, "heroes");
  var i, h;
  for (i = 0; i < hs.length; i++) {
    h = hs[i];
    if (h && h.alive && h.hp > 0 && !h.benched) return h;
  }
  return g.hero && g.hero.alive ? g.hero : null;
}

function enemiesOf(g) {
  var es = poolList(g, "enemies");
  var out = [];
  var i;
  for (i = 0; i < es.length; i++) if (es[i] && es[i].alive && es[i].hp > 0) out.push(es[i]);
  return out;
}

function nearest(hero, es) {
  var best = null, bd = 1e15, i, e, dx, dd, d2;
  for (i = 0; i < es.length; i++) {
    e = es[i];
    dx = e.x - hero.x;
    dd = (e.d || 0) - (hero.d || 0);
    d2 = dx * dx + dd * dd;
    if (d2 < bd) { bd = d2; best = e; }
  }
  return best;
}

function centerX(g) {
  var a = g.arena || (g.seg && g.seg.arena);
  if (a && a.xMin != null && a.xMax != null) return (a.xMin + a.xMax) / 2;
  return 240;
}

function botIntent(g) {
  var hero = heroOf(g);
  var extra = {};
  if (!hero) return intents(extra);
  var st = hero.combatState;
  if (st === "THROWN_FLIGHT" || st === "HITSTUN") {
    extra.ukemi = true;
    extra.ukemiPressed = true;
    return intents(extra);
  }
  if (st === "GRIPPED") {
    extra.throwPressed = true;
    extra.throwDir = 0;
    extra.moveX = 1;
    return intents(extra);
  }
  if (st === "THROWING") {
    extra.moveX = hero.facing || 1;
    return intents(extra);
  }
  var e = nearest(hero, enemiesOf(g).filter(function (en) {
    return en.archetype !== "DUMMY" &&
      en.combatState !== "THROWN_FLIGHT" && en.combatState !== "KNOCKDOWN" && en.combatState !== "GETUP";
  }));
  var pits = g.hazards || [];
  var p, pi;
  if (st !== "GRIPPED" && st !== "THROWING") {
    for (pi = 0; pi < pits.length; pi++) {
      p = pits[pi];
      if (p && p.type === "pit" && hero.x > p.x - 30 && hero.x < p.x + (p.w || 40) + 20) {
        extra.jump = true;
        extra.jumpPressed = !!hero.grounded;
        extra.moveX = 1;
      }
    }
  }
  var overPit = hero.x > 375 && hero.x < 455;
  if (!e) {
    extra.moveX = 1;
    extra.jump = overPit || !hero.grounded;
    extra.jumpPressed = !!(hero.grounded && overPit);
    return intents(extra);
  }
  var dx = e.x - hero.x;
  var dd = (e.d || 0) - (hero.d || 0);
  if (g.mode === "plat" && e.x + 40 < hero.x) {
    extra.moveX = 1;
    extra.jumpPressed = hero.grounded && hero.x > 360 && hero.x < 500;
    return intents(extra);
  }
  extra.moveX = dx > 4 ? 1 : dx < -4 ? -1 : 0;
  extra.moveD = dd > 2 ? 1 : dd < -2 ? -1 : 0;
  if (Math.abs(dx) < 70 && Math.abs(dd) < 12 && (st === "FREE" || st === "APPROACH") && !(hero.recoveryT > 0)) {
    extra.grip = true;
    extra.gripPressed = st === "FREE";
    extra.moveX = dx >= 0 ? 1 : -1;
  }
  extra.jump = extra.jump || overPit || !hero.grounded;
  extra.jumpPressed = extra.jumpPressed || !!(hero.grounded && overPit);
  return intents(extra);
}

function poolOk(g) {
  var names = ["heroes", "enemies", "moves", "projectiles", "fx", "events", "pickups"];
  var i, p, n;
  if (!g.pools) return true;
  for (i = 0; i < names.length; i++) {
    p = g.pools[names[i]];
    if (!p) continue;
    n = typeof p.inUse === "function" ? p.inUse() : (p.size - (p.free ? p.free.length : 0));
    if (p.size != null && n > p.size) return false;
    if (g.poolExhausted) return false;
  }
  return g.poolOk !== false;
}

function waveCleared(g) {
  if (g.waveCleared) return true;
  if (g.waves && (g.waves.cleared || g.waves.allCleared)) return true;
  if (g.wave && g.wave.allCleared) return true;
  if (g.go && (g.go.active || g.go.opened) && enemiesOf(g).length === 0) return true;
  var ev = poolList(g, "events");
  var i;
  for (i = 0; i < ev.length; i++) {
    if (ev[i] && ev[i].alive && /wave_cleared|allWavesCleared|WAVE_CLEAR/i.test(ev[i].name || "")) return true;
  }
  return false;
}

var exceptions = 0;
var lastErr = "";
var g = null;
var ticks = 0;
var kills = 0;
var prevAlive = 0;
var MAX = 7200;

try {
  if (!PSim || typeof PSim.createGame !== "function") throw new Error("PSim.createGame missing");
  if (typeof PSim.createGame === "function") {
    g = PSim.createGame(1337, { levelId: "w1l1" });
  }
  if (g && typeof PSim.loadLevel === "function" && !g.level) PSim.loadLevel(g, "w1l1");
  if (g && !g.lifeState) g.lifeState = "playing";
  prevAlive = enemiesOf(g).length;
  for (ticks = 0; ticks < MAX; ticks++) {
    var inp = botIntent(g);
    var hr = heroOf(g);
    g.intents = inp;
    if (hr) {
      hr.intent = inp[0];
      hr.player = hr.playerIndex || 0;
    }
    PSim.step(g, inp);
    var now = enemiesOf(g).length;
    if (now < prevAlive) kills += prevAlive - now;
    prevAlive = now;
    if (waveCleared(g)) {
      ticks += 1;
      break;
    }
  }
} catch (err) {
  exceptions += 1;
  lastErr = err && err.stack ? err.stack : String(err);
}

var hero = g ? heroOf(g) : null;
var heroAlive = !!(hero && hero.alive && hero.hp > 0);
var cleared = g ? waveCleared(g) : false;
var okPool = g ? poolOk(g) : false;

console.log(
  "level=w1l1 wave_cleared=" + cleared +
    " hero_alive=" + heroAlive +
    " ticks=" + ticks +
    " pool_ok=" + okPool +
    " exceptions=" + exceptions +
    (lastErr ? " err=" + lastErr.split("\n")[0] : "")
);

var g2 = null, ticks2 = 0, cleared2 = false, alive2 = false, exc2 = 0;
try {
  g2 = PSim.createGame(1337, { levelId: "w2l1" });
  for (ticks2 = 0; ticks2 < MAX; ticks2++) {
    var inp2 = botIntent(g2);
    var hr2 = heroOf(g2);
    g2.intents = inp2;
    if (hr2) hr2.intent = inp2[0];
    PSim.step(g2, inp2);
    if (waveCleared(g2)) { ticks2 += 1; break; }
  }
  hr2 = heroOf(g2);
  alive2 = !!(hr2 && hr2.alive && hr2.hp > 0);
  cleared2 = waveCleared(g2);
} catch (err2) {
  exc2 = 1;
}
console.log("level=w2l1 wave_cleared=" + cleared2 + " hero_alive=" + alive2 + " ticks=" + ticks2 + " exceptions=" + exc2);

var pass = (cleared && heroAlive && exceptions === 0) || (cleared2 && alive2 && exc2 === 0);
process.exit(pass ? 0 : 1);
