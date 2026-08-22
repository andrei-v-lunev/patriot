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

function rearArc(hero, enemy) {
  var f = enemy.facing >= 0 ? 1 : -1, dx = hero.x - enemy.x, dd = (hero.d || 0) - (enemy.d || 0);
  var len = Math.sqrt(dx * dx + dd * dd);
  return len > 0.001 && dx * -f / len >= 0.5;
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
  if (st === "THROWN_FLIGHT" || st === "HITSTUN" || st === "KNOCKDOWN") {
    extra.ukemi = true;
    extra.ukemiPressed = true;
    return intents(extra);
  }
  if (st === "GRIPPED") {
    if (hero.gripTarget) {
      var held = hero.gripTarget, goal = null, goals, gi;
      if (held.archetype === "E6") {
        goals = g.props || [];
        for (gi = 0; gi < goals.length; gi++) if (goals[gi] && goals[gi].type === "awning" && goals[gi].alive !== false && goals[gi].hp > 0) {
          if (!goal || Math.abs(goals[gi].d - held.d) < Math.abs(goal.d - held.d)) goal = goals[gi];
        }
      } else if (held.archetype === "E8") {
        goals = enemiesOf(g).filter(function (en) { return en.boss && (en.invuln || en.hp <= en.maxHp * 0.1); });
        goal = goals[0] || null;
      }
      extra.throwPressed = true;
      if (g.tutorial && g.tutorial.phase === 3) extra.throwDir = g.tutorial.forward ? 6 : 2;
      else extra.throwDir = goal && goal.d < held.d ? 4 : 0;
      extra.moveX = hero.facing || 1;
    } else {
      extra.moveX = ((g.tick / 4) | 0) % 2 ? 1 : -1;
    }
    return intents(extra);
  }
  if (st === "THROWING") {
    extra.moveX = hero.facing || 1;
    return intents(extra);
  }
  if (g.tutorial && !g.tutorial.done && g.levelId === "w1l1") {
    var tp = g.tutorial.phase | 0, tdummy, tdx, tdd;
    if (tp === 0) { extra.moveX = 1; return intents(extra); }
    if (tp >= 1 && tp <= 3) {
      tdummy = enemiesOf(g).filter(function (en) { return en.archetype === "DUMMY"; })[0];
      if (!tdummy) return intents(extra);
      tdx = tdummy.x - hero.x; tdd = (tdummy.d || 0) - (hero.d || 0);
      extra.moveX = tdx > 4 ? 1 : tdx < -4 ? -1 : 0;
      extra.moveD = tdd > 2 ? 1 : tdd < -2 ? -1 : 0;
      if (Math.abs(tdx) < 60 && Math.abs(tdd) < 10 && st === "FREE" && !(hero.recoveryT > 0)) {
        extra.grip = true; extra.gripPressed = true; extra.moveX = tdx >= 0 ? 1 : -1;
      }
      return intents(extra);
    }
    if (tp === 5) { extra.tag = true; extra.tagPressed = true; return intents(extra); }
    return intents(extra);
  }
  var candidates = enemiesOf(g).filter(function (en) {
    return en.archetype !== "DUMMY" &&
      en.combatState !== "THROWN_FLIGHT" && en.combatState !== "KNOCKDOWN" && en.combatState !== "GETUP";
  });
  var bosses = candidates.filter(function (en) { return en.boss; });
  var adds = candidates.filter(function (en) { return !en.boss; });
  if (hero.hp < hero.maxHp * 0.35 && (g.tagCd | 0) <= 0 && g.players !== 2) {
    extra.tag = true; extra.tagPressed = true;
    return intents(extra);
  }
  var invBoss = bosses.filter(function (b) { return b.invuln; })[0] || null;
  var ammoBoss = bosses.filter(function (b) { return b.archetype === "B5" && b.hp <= b.maxHp * 0.1; })[0] || null;
  var e = nearest(hero, (invBoss || ammoBoss) && adds.length ? adds : candidates);
  var rex = bosses.filter(function (b) { return b.archetype === "B5"; })[0] || null;
  if (rex && g.cage && (g.cage.shoveTel | 0) > 0) {
    if ((g.cage.edge | 0) === 0) extra.moveX = 1;
    else if ((g.cage.edge | 0) === 1) extra.moveX = -1;
    else if ((g.cage.edge | 0) === 2) extra.moveD = 1;
    else extra.moveD = -1;
    return intents(extra);
  }
  if (rex && g.cage && (g.cage.weightTel | 0) > 0 &&
      Math.abs(hero.x - g.cage.weightX) < 42 && Math.abs(hero.d - g.cage.weightD) < 20) {
    extra.moveX = hero.x <= g.cage.weightX ? -1 : 1;
    extra.moveD = hero.d <= g.cage.weightD ? -1 : 1;
    return intents(extra);
  }
  if (rex && ((rex.telegraphT | 0) > 0 || (rex.activeT | 0) > 0)) {
    extra.moveX = rex.facing >= 0 ? -1 : 1;
    extra.moveD = hero.d < 16 ? 1 : hero.d > 44 ? -1 : 0;
    return intents(extra);
  }
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
  if (g.mode === "plat") {
    extra.moveX = 1;
    if (hero.x > (g.width || 480) - 120) { extra.jump = true; extra.jumpPressed = !!hero.grounded; }
    return intents(extra);
  }
  if (!e) {
    extra.moveX = 1;
    extra.jump = overPit || !hero.grounded;
    extra.jumpPressed = !!(hero.grounded && overPit);
    return intents(extra);
  }
  if (ammoBoss && !adds.length) {
    extra.jump = true;
    extra.jumpPressed = !!hero.grounded;
    extra.moveX = hero.x < 100 ? 1 : hero.x > 380 ? -1 : 0;
    extra.moveD = hero.d < 16 ? 1 : hero.d > 44 ? -1 : 0;
    return intents(extra);
  }
  var dx = e.x - hero.x;
  var dd = (e.d || 0) - (hero.d || 0);
  if (invBoss && invBoss.archetype === "B2" && e.archetype === "E6" && !rearArc(hero, e)) {
    var ef = e.facing >= 0 ? 1 : -1;
    var bx = e.x - ef * 34;
    var bd = e.d + (e.d <= 30 ? 13 : -13);
    extra.moveX = bx > hero.x + 3 ? 1 : bx < hero.x - 3 ? -1 : 0;
    extra.moveD = bd > hero.d + 2 ? 1 : bd < hero.d - 2 ? -1 : 0;
    return intents(extra);
  }
  var throwBoss = invBoss && invBoss.archetype === "B4" ? invBoss : ammoBoss;
  if (throwBoss && e.archetype === "E8" && (e.counterStanceT > 0 || e.aiState === "COUNTER_STANCE")) {
    return intents(extra);
  }
  if (throwBoss && e.archetype === "E8") {
    var td = throwBoss.x >= e.x ? 1 : -1;
    var tx = e.x - td * 28;
    if (Math.abs(hero.x - tx) > 7 || Math.abs(hero.d - e.d) > 7) {
      extra.moveX = tx > hero.x + 2 ? 1 : tx < hero.x - 2 ? -1 : 0;
      extra.moveD = e.d > hero.d + 2 ? 1 : e.d < hero.d - 2 ? -1 : 0;
      return intents(extra);
    }
  }
  if (g.mode === "plat" && e.x + 40 < hero.x) {
    extra.moveX = 1;
    extra.jumpPressed = hero.grounded && hero.x > 360 && hero.x < 500;
    return intents(extra);
  }
  extra.moveX = dx > 4 ? 1 : dx < -4 ? -1 : 0;
  extra.moveD = dd > 2 ? 1 : dd < -2 ? -1 : 0;
  if (Math.abs(dx) < 70 && Math.abs(dd) < 12 && (st === "FREE" || st === "APPROACH") && !(hero.recoveryT > 0)) {
    if (e.archetype === "E6" && !rearArc(hero, e)) {
      extra.moveX = hero.x < e.x ? 1 : -1; extra.moveD = hero.d <= e.d ? 1 : -1;
      return intents(extra);
    }
    var strikeOnly = (e.boss && !(e.staggeredT > 0 || e.combatState === "STAGGERED")) ||
      (e.archetype === "E8" && (e.counterStanceT > 0 || e.aiState === "COUNTER_STANCE")) || e.invuln;
    if ((hero.meter || 0) >= 100 && !invBoss && !ammoBoss && st === "FREE") {
      extra.special = true; extra.specialPressed = true;
    } else if (strikeOnly) extra.throwPressed = st === "FREE";
    else { extra.grip = true; extra.gripPressed = st === "FREE"; }
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

function runLevel(levelId, maxTicks, seed) {
  var g = null, ticks = 0, continues = 0, error = "", inp, hr;
  try {
    if (!PSim || typeof PSim.createGame !== "function") throw new Error("PSim.createGame missing");
    g = PSim.createGame(seed || 1337, { levelId: levelId, difficulty: "easy" });
    for (ticks = 0; ticks < (maxTicks || 36000); ticks++) {
      if (g.lifeState === "continue") { if (!PSim.useContinue(g)) break; continues++; }
      if (g.lifeState === "gameover") break;
      inp = botIntent(g); hr = heroOf(g); g.intents = inp;
      if (hr) { hr.intent = inp[0]; hr.player = hr.playerIndex || 0; }
      PSim.step(g, inp);
      if (g.results) { ticks++; break; }
    }
  } catch (err) { error = err && err.stack ? err.stack : String(err); }
  hr = heroOf(g);
  return { level: levelId, cleared: !!(g && g.results), ticks: ticks, continues: continues,
    heroAlive: !!heroOf(g), poolOk: !!(g && poolOk(g)), hash: g && PSim.hashWorld ? PSim.hashWorld(g) : "", error: error,
    diagnostic: g ? { mode: g.mode, segIndex: g.segIndex, pendingSeg: g.pendingSeg, airSwapT: g.airSwapT, x: hr && hr.x, d: hr && hr.d, z: hr && hr.z,
      vx: hr && hr.vx, facing: hr && hr.facing, recoveryT: hr && hr.recoveryT, sweepLen: hr && hr.sweepLen,
      combatState: hr && hr.combatState, live: enemiesOf(g).map(function (e) { return { a: e.archetype, hp: e.hp, x: e.x, d: e.d, facing: e.facing, state: e.combatState, ai: e.aiState, stagger: e.stagger, staggeredT: e.staggeredT, inv: e.invuln }; }), go: g.go,
      props: (g.props || []).map(function (p) { return { type: p.type, hp: p.hp, alive: p.alive, x: p.x, d: p.d }; }), tutorial: g.tutorial, lifeState: g.lifeState } : null };
}

function main() {
  var campaign = load("data/campaign.json"), ids = [], rows, ok;
  (campaign.worlds || []).forEach(function (world) { (world.levels || []).forEach(function (level) { ids.push(level.id); }); });
  rows = ids.map(function (id) { return runLevel(id, Number(process.env.PATRIOT_BOT_MAX) || 36000, 2); });
  rows.forEach(function (row) { console.log("level=" + row.level + " cleared=" + row.cleared + " hero_alive=" + row.heroAlive + " ticks=" + row.ticks + " continues=" + row.continues + " pool_ok=" + row.poolOk + (!row.cleared ? " diag=" + JSON.stringify(row.diagnostic) : "") + (row.error ? " err=" + row.error.split("\n")[0] : "")); });
  ok = rows.every(function (row) { return row.cleared && row.poolOk && !row.error; });
  console.log("campaign_bot=" + (ok ? "PASS" : "FAIL") + " cleared=" + rows.filter(function (row) { return row.cleared; }).length + "/" + rows.length);
  process.exitCode = ok ? 0 : 1;
}

module.exports = { botIntent: botIntent, runLevel: runLevel };
if (require.main === module) main();
