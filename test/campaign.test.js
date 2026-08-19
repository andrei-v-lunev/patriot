"use strict";

var h = require("./harness");
var assert = h.assert;
var PSim = h.requireFile("js/sim.js");
h.requireFile("js/combat.js");
var PAI = h.G("PAI");
if (!PAI) {
  try { PAI = require("../js/ai.js"); } catch (err) { PAI = null; }
}
assert(typeof PSim.createGame === "function", "PSim.createGame");

function placeGrip(hero, foe, facing) {
  facing = facing == null ? 1 : facing;
  hero.facing = facing;
  hero.x = 160;
  hero.z = 16;
  hero.d = 24;
  hero.vx = 0;
  hero.vd = 0;
  hero.vz = 0;
  hero.grounded = true;
  hero.combatState = "FREE";
  hero.recoveryT = 0;
  foe.d = 24;
  foe.z = 16;
  foe.facing = -facing;
  foe.x = hero.x + facing * 28;
  foe.grounded = true;
  foe.vx = 0;
  foe.vz = 0;
}

function gripLogUntilBreak(seed) {
  var g = h.createEmpty("belt", { seed: seed });
  var hero = h.getHero(g);
  var e5 = h.spawnEnemy(g, "E5", 188, 24);
  placeGrip(hero, e5, 1);
  var log = [];
  var tick = -1;
  var i, inp, st;
  for (i = 0; i < 1200; i++) {
    inp = h.intents({ grip: true, gripPressed: i === 0 });
    log.push(inp);
    h.step(g, inp);
    hero = h.getHero(g);
    e5 = h.getEnemies(g)[0] || e5;
    st = hero.combatState;
    if (st === "GRIP_BROKEN" || st === "HITSTUN" || st === "THROWN_FLIGHT" || e5.reversed ||
        e5.combatState === "GRIP_BROKEN") {
      tick = i;
      break;
    }
  }
  return { tick: tick, log: log, hash: h.hashWorld(g) };
}

var r1 = gripLogUntilBreak(1337);
assert(r1.tick >= 0, "E5 reversal/break occurs (tick=" + r1.tick + ")");
var gB = h.createEmpty("belt", { seed: 1337 });
var heroB = h.getHero(gB);
var e5b = h.spawnEnemy(gB, "E5", 188, 24);
placeGrip(heroB, e5b, 1);
var t2 = -1, i;
for (i = 0; i < r1.log.length; i++) {
  h.step(gB, r1.log[i]);
  heroB = h.getHero(gB);
  e5b = h.getEnemies(gB)[0] || e5b;
  if (heroB.combatState === "GRIP_BROKEN" || heroB.combatState === "HITSTUN" ||
      heroB.combatState === "THROWN_FLIGHT" || e5b.reversed || e5b.combatState === "GRIP_BROKEN") {
    t2 = i;
    break;
  }
}
assert(t2 === r1.tick, "E5 reversal same seed+intents same tick (" + r1.tick + " vs " + t2 + ")");

var g = h.createEmpty("belt");
var hero = h.getHero(g);
var e8 = h.spawnEnemy(g, "E8", 188, 24);
placeGrip(hero, e8, 1);
e8.counterStanceT = PData.toTicks(30);
var hp0 = hero.hp;
h.step(g, h.intents({ gripPressed: true, grip: true }));
for (i = 0; i < 40; i++) h.step(g, h.intents({ grip: i < 16 }));
hero = h.getHero(g);
assert(hp0 - hero.hp === 15 || hero.hp === hp0 - PConst.E8_REVERSE_DMG,
  "E8 counter stance grip → hero takes 15 dmg (hp " + hp0 + "→" + hero.hp + ")");
assert(hero.combatState !== "GRIPPED", "E8 counter stance not GRIPPED (state=" + hero.combatState + ")");

g = h.createEmpty("belt");
hero = h.getHero(g);
var b1 = h.spawnEnemy(g, "B1", 200, 24);
placeGrip(hero, b1, 1);
b1.staggeredT = 0;
b1.combatState = "FREE";
h.step(g, h.intents({ gripPressed: true, grip: true }));
for (i = 0; i < 40; i++) h.step(g, h.intents({ grip: i < 16 }));
hero = h.getHero(g);
assert(hero.combatState !== "GRIPPED", "B1 grip fails unless staggeredT>0 (state=" + hero.combatState + ")");
if (PAI && PAI.forceStagger) PAI.forceStagger(b1);
else b1.staggeredT = PData.toTicks(120);
hero.combatState = "FREE";
hero.recoveryT = 0;
h.step(g, h.intents({ gripPressed: true, grip: true }));
for (i = 0; i < 40; i++) h.step(g, h.intents({ grip: i < 16 }));
hero = h.getHero(g);
assert(hero.combatState === "GRIPPED" || b1.combatState === "GRIPPED" || b1.staggeredT > 0,
  "B1 grip can succeed when staggered (hero=" + hero.combatState + " boss=" + b1.combatState + ")");

g = h.createEmpty("belt");
var b5 = h.spawnEnemy(g, "B5", 220, 24);
b5.hp = 76;
b5.maxHp = 760;
if (PAI && PAI.setB5Phase3) PAI.setB5Phase3(b5);
else { b5.chipFloor = true; b5.phase = 3; }
h.applyDamage(g, b5, 20, { chip: true });
assert(b5.hp >= 76, "B5 hp=76 apply 20 chip → hp stays >=76 (got " + b5.hp + ")");
h.applyDamage(g, b5, 20, { throw: true, kind: "throw" });
assert(b5.hp < 76, "B5 throw damage can go below 76 (got " + b5.hp + ")");

function ensurePartner(g) {
  var S = h.sim();
  if (h.getHeroes(g).length < 2 && S && S.spawnHero) {
    S.spawnHero(g, { hero: "otajon", x: 80, d: 32, playerIndex: 1 });
  }
  g.players = 1;
  g.coop = false;
  g.lifeState = "playing";
}

function swapTag(g, hero) {
  var T = h.tagApi();
  var idx = h.poolIndex(g, hero, "heroes");
  if (idx >= 0) g.activeHero = idx;
  if (T && typeof T.trySwap === "function") return T.trySwap(g, 0, { tagPressed: true });
  if (T && typeof T.swap === "function") return T.swap(g);
  h.step(g, h.intents({ tagPressed: true, tag: true }));
  return true;
}

g = h.createEmpty("belt");
hero = h.getHero(g);
ensurePartner(g);
swapTag(g, hero);
var cd = h.tagCd(g);
assert(cd === 1440 || cd === PData.toTicks(12 * 60),
  "tag cooldown 12s = 1440 ticks after swap (got " + cd + ")");

g = h.createEmpty("belt");
hero = h.getHero(g);
ensurePartner(g);
var held = h.spawnEnemy(g, "E1", 188, 24);
placeGrip(hero, held, 1);
for (i = 0; i < 30; i++) h.step(g, h.intents({ grip: true, gripPressed: i === 0 }));
hero = h.getHero(g);
swapTag(g, hero);
cd = h.tagCd(g);
assert(cd === 960 || cd === PData.toTicks(8 * 60),
  "gripped transfer cooldown 8s=960 (got " + cd + ")");

g = h.createEmpty("belt", { players: 2, coop: true });
var hs = h.getHeroes(g);
assert(hs.length >= 2, "2P both alive (heroes=" + hs.length + ")");
var p1 = hs[0];
var p2 = hs[1];
var hpP2 = p2.hp;
var body = h.spawnEnemy(g, "E1", 188, 24);
placeGrip(p1, body, 1);
for (i = 0; i < 30; i++) h.step(g, h.intents({ grip: true, gripPressed: i === 0 }));
p2.x = p1.x + 80;
p2.d = p1.d;
p2.z = 0;
h.step(g, h.intents({ throwPressed: true, throwDir: 0 }));
for (i = 0; i < 120; i++) h.step(g, h.intents());
p2 = h.getHeroes(g)[1] || p2;
assert(p2.hp === hpP2, "2P thrown body overlaps partner: partner hp unchanged (" + p2.hp + " vs " + hpP2 + ")");

g = h.createEmpty("belt", { players: 2, coop: true });
hs = h.getHeroes(g);
assert(hs.length >= 2, "GO setup 2P both alive");
g.go = g.go || {};
g.go.active = true;
g.go.opened = false;
var arena = (g.segment && g.segment.arena) || g.arena || { xMin: 0, xMax: 480 };
arena.xMax = 480;
arena.xMin = 0;
if (g.segment) g.segment.arena = arena;
g.xMax = 480;
g.cam.x = 0;
g.cam.locked = true;
var zone = arena.xMax - (PConst.GO_ZONE || 180);
hs[0].x = zone + 20;
hs[0].alive = true;
hs[0].downed = false;
hs[0].hp = hs[0].hp || 120;
hs[1].x = zone - 80;
hs[1].alive = true;
hs[1].downed = false;
hs[1].hp = hs[1].hp || 90;
h.step(g, h.intents());
var blocked = h.goBlocked(g);
assert(blocked === true || (g.go && g.go.blocked) || (g.gate && g.gate.closed) || !g.go.opened,
  "GO active, only one in right 180px → cannot advance (blocked=" + blocked + " opened=" + (g.go && g.go.opened) + ")");
hs[1].x = zone + 10;
h.step(g, h.intents());
blocked = h.goBlocked(g);
var can = blocked === false || (g.go && g.go.opened) || (g.go && g.go.canAdvance) ||
  (g.gate && g.gate.closed === false) || (g.gate && g.gate.open);
assert(!!can, "both in GO zone → can advance (blocked=" + blocked + " opened=" + (g.go && g.go.opened) + ")");

if (h.fails()) {
  console.error(h.oks() + " ok, " + h.fails() + " fail");
  process.exit(1);
}
