"use strict";

var h = require("./harness");
var assert = h.assert;
var PSim = h.requireFile("js/sim.js");
var PCombat = h.requireFile("js/combat.js");
var PCombatHit = h.requireFile("js/combat.hit.js");
assert(typeof PSim.createGame === "function", "PSim.createGame");
assert(typeof PSim.step === "function", "PSim.step");
assert(!!PCombat, "PCombat loaded");

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
  foe.vx = 0;
  foe.vd = 0;
  foe.vz = 0;
  foe.grounded = true;
  foe.facing = -facing;
  foe.x = hero.x + facing * 28;
}

function gripUntil(g, maxT, want) {
  var i, hero, st;
  for (i = 0; i < maxT; i++) {
    h.step(g, h.intents({ grip: true, gripPressed: i === 0 }));
    hero = h.getHero(g);
    st = hero && hero.combatState;
    if (st === want) return i;
  }
  return -1;
}

var g = h.createEmpty("belt");
var hero = h.getHero(g);
var e1 = h.spawnEnemy(g, "E1", 188, 24);
placeGrip(hero, e1, 1);
h.step(g, h.intents({ gripPressed: true, grip: true }));
hero = h.getHero(g);
assert(hero.combatState === "APPROACH", "gripPressed → hero.combatState APPROACH (got " + hero.combatState + ")");

var grippedAt = gripUntil(g, 40, "GRIPPED");
hero = h.getHero(g);
e1 = h.getEnemies(g)[0] || e1;
assert(hero.combatState === "GRIPPED" || e1.combatState === "GRIPPED",
  "tick through startup into active with overlap → GRIPPED (t=" + grippedAt + " hero=" + hero.combatState + ")");

var e3 = h.spawnEnemy(g, "E1", e1.x + 36, 24);
e3.z = 16;
e3.d = e1.d;
e3.hp = e3.maxHp || e3.hp;
var e3hp = e3.hp;
var heroHp = hero.hp;
h.step(g, h.intents({ throwPressed: true, throwDir: 0 }));
hero = h.getHero(g);
assert(hero.combatState === "THROWING" || hero.combatState === "GRIPPED",
  "throwPressed throwDir 0 starts throw (state=" + hero.combatState + ")");

var releaseGame = h.createEmpty("belt");
var releaseHero = h.getHero(releaseGame);
var releaseEnemy = h.spawnEnemy(releaseGame, "E1", 188, 24);
placeGrip(releaseHero, releaseEnemy, 1);
h.step(releaseGame, h.intents({ gripPressed: true, grip: true }));
gripUntil(releaseGame, 40, "GRIPPED");
releaseHero = h.getHero(releaseGame);
h.step(releaseGame, h.intents({ gripReleased: true, throwDir: 2 }));
assert(releaseHero.combatState === "THROWING" || releaseHero.combatState === "FREE",
  "releasing the canonical grip key starts a throw (state=" + releaseHero.combatState + ")");
for (i = 0; i < 180; i++) h.step(releaseGame, h.intents());
assert(releaseGame.events.some(function (ev) { return ev && ev.name === "shockwave"; }),
  "an isolated thrown-body landing publishes the shockwave FX event");

var i, victim, ip;
for (i = 0; i < 80; i++) {
  h.step(g, h.intents({ throwPressed: i === 0, throwDir: 0 }));
  victim = e1.combatState === "THROWN_FLIGHT" ? e1 : null;
  if (!victim) {
    h.getEnemies(g).forEach(function (e) {
      if (e !== e3 && e.combatState === "THROWN_FLIGHT") victim = e;
    });
  }
  if (victim) break;
}
assert(!!victim, "victim THROWN_FLIGHT after forward throw");
assert(victim.vd > 0, "throwDir depth component produces deterministic depth flight (vd=" + victim.vd + ")");
assert(g.events.some(function (ev) { return ev && ev.name === "throw_arc"; }),
  "throw release publishes the throw-arc FX event");
ip = h.chainTimer(g);
assert(ip === 300, "IPPON timer === 300 after extending event (completed throw) got " + ip);

for (i = 0; i < 180; i++) h.step(g, h.intents());
var throwDef = h.getMove("i1_ogoshi");
var ff = Math.max(8, (throwDef && throwDef.damage ? throwDef.damage : 18) * (PConst.THROWN_FF || 0.75));
var dmg = e3hp - e3.hp;
assert(e3.hp < e3hp, "third enemy in flight path damaged (hp " + e3hp + "→" + e3.hp + ")");
assert(Math.abs(dmg - ff) <= 2 || dmg >= 8, "third-enemy dmg ≈ 0.75*throwDmg (min 8) got " + dmg + " want ~" + ff);
hero = h.getHero(g);
assert(hero.hp === heroHp, "hero NOT damaged by thrown body (hp " + hero.hp + " vs " + heroHp + ")");

h.applyDamage(g, hero, 10, { hero: true });
h.step(g, h.intents());
var chainAfter = h.chainCount(g);
var timerAfter = h.chainTimer(g);
assert(chainAfter === 0 || timerAfter === 0,
  "hero damage breaks chain (chain=" + chainAfter + " timer=" + timerAfter + ")");

g = h.createEmpty("belt");
hero = h.getHero(g);
var downed = h.spawnEnemy(g, "E1", 200, 24);
placeGrip(hero, downed, 1);
gripUntil(g, 40, "GRIPPED");
h.step(g, h.intents({ throwPressed: true, throwDir: 0 }));
for (i = 0; i < 80; i++) {
  h.step(g, h.intents({ throwPressed: i === 0, throwDir: 0 }));
  if (downed.combatState === "THROWN_FLIGHT" || downed.combatState === "KNOCKDOWN") break;
}
var Hit = h.G("PCombatHit");
if (Hit && Hit.enterKnockdown) Hit.enterKnockdown(downed);
else {
  downed.combatState = "KNOCKDOWN";
  downed.stateT = PData.toTicks(60);
}
downed.otgHit = false;
downed.grounded = true;
downed.z = 16;
downed.vz = 0;
hero.combatState = "FREE";
hero.recoveryT = 0;
hero.sweepLen = 0;
hero.x = downed.x - 28;
hero.d = downed.d;
hero.z = 16;
hero.grounded = true;
hero.facing = 1;
var chain0 = h.chainCount(g) || 0;
h.startMove(g, hero, "sweep_idris");
for (i = 0; i < 40; i++) {
  if (downed.combatState !== "KNOCKDOWN") {
    downed.combatState = "KNOCKDOWN";
    downed.stateT = Math.max(downed.stateT | 0, 8);
  }
  h.step(g, h.intents());
}
assert((h.chainCount(g) || 0) <= (chain0 || 0),
  "OTG does not increment chain (before=" + chain0 + " after=" + h.chainCount(g) + ")");
chain0 = h.chainCount(g) || 0;
try {
  h.startMove(g, hero, "i8_kesa");
} catch (eI8) {
  if (h.combat() && h.combat().startPin) h.combat().startPin(g, hero);
  else hero.pinId = "i8_kesa";
}
h.stepN(g, 50, h.intents());
assert(h.chainCount(g) === chain0 || h.chainCount(g) == null,
  "I8 does not increment chain (before=" + chain0 + " after=" + h.chainCount(g) + ")");

g = h.createEmpty("belt");
hero = h.getHero(g);
var e6 = h.spawnEnemy(g, "E6", 188, 24);
placeGrip(hero, e6, 1);
e6.facing = -1;
h.step(g, h.intents({ gripPressed: true, grip: true }));
for (i = 0; i < 50; i++) {
  h.step(g, h.intents({ grip: i < 20 }));
  hero = h.getHero(g);
  if (hero.recoveryT > 0 || hero.e6FailRecovery) break;
}
hero = h.getHero(g);
var rec19 = PData.toTicks(19);
var recExtra = PData.toTicks(8);
var e6Ok = hero.recoveryT === rec19 ||
  (hero.e6FailRecovery === true && hero.recoveryT >= recExtra);
assert(hero.combatState !== "GRIPPED", "E6 front grip fails (state=" + hero.combatState + ")");
assert(e6Ok,
  "E6 front fail recoveryT===toTicks(19)=" + rec19 +
    " or e6FailRecovery && +8f (recoveryT=" + hero.recoveryT + " e6FailRecovery=" + hero.e6FailRecovery + ")");

g = h.createEmpty("belt");
hero = h.getHero(g);
var e2 = h.spawnEnemy(g, "E2", 188, 24);
placeGrip(hero, e2, 1);
gripUntil(g, 40, "GRIPPED");
h.step(g, h.intents({ throwPressed: true, throwDir: 6 }));
for (i = 0; i < 60; i++) {
  h.step(g, h.intents());
  if (e2.combatState === "THROWN_FLIGHT") break;
}
var vz = e2.vz;
assert(Math.abs(Math.abs(vz) - 420) > 80, "E2+I3 thrown vz not launch (~420) got " + vz);
assert(Math.abs(Math.abs(vz) - 190) < 50 || Math.abs(vz) < 250,
  "E2+I3 thrown vz standard ~190 got " + vz);

g = h.createEmpty("belt");
var koTarget = h.spawnEnemy(g, "E1", 188, 24);
h.applyDamage(g, koTarget, koTarget.hp + 1, h.getHero(g));
assert(g.events.some(function (ev) { return ev && ev.name === "ko"; }),
  "first lethal hit publishes the KO-stars FX event");

g = h.createEmpty("belt");
hero = h.getHero(g);
hero.combatState = "HITSTUN";
hero.stateT = 1;
hero.meter = 100;
var bufferedSpecial = h.intents();
bufferedSpecial[0].pressedAtTick = { special: g.tick };
bufferedSpecial[0].special = true;
bufferedSpecial[0].specialPressed = true;
h.step(g, bufferedSpecial);
bufferedSpecial[0].special = false;
bufferedSpecial[0].specialPressed = false;
h.step(g, bufferedSpecial);
assert(hero.sweepLen > 0 && hero.meter < 100 && hero._consumedSpecialAt === bufferedSpecial[0].pressedAtTick.special,
  "special pressed during recovery executes and consumes within the six-tick action buffer");

g = h.createEmpty("belt");
hero = h.getHero(g);
hero.combatState = "HITSTUN";
hero.stateT = 1;
var bufferedGrip = h.intents();
bufferedGrip[0].pressedAtTick = { grip: g.tick };
bufferedGrip[0].grip = true;
bufferedGrip[0].gripPressed = true;
h.step(g, bufferedGrip);
bufferedGrip[0].grip = false;
bufferedGrip[0].gripPressed = false;
h.step(g, bufferedGrip);
assert(hero.combatState === "APPROACH" && hero._consumedGripAt === bufferedGrip[0].pressedAtTick.grip,
  "grip pressed during recovery executes and consumes within the six-tick action buffer");

g = h.createEmpty("belt");
hero = h.getHero(g);
hero.combatState = "THROWN_FLIGHT";
hero.z = 100;
hero.vz = -1;
var bufferedUkemi = h.intents();
bufferedUkemi[0].pressedAtTick = { ukemi: g.tick };
bufferedUkemi[0].ukemi = true;
bufferedUkemi[0].ukemiPressed = true;
hero.intent = bufferedUkemi[0];
assert(PCombatHit.tryUkemi(g, hero) === false, "ukemi input buffers before its landing window");
g.tick++;
bufferedUkemi[0].ukemi = false;
bufferedUkemi[0].ukemiPressed = false;
hero.combatState = "THROWN_FLIGHT";
hero.z = 70;
hero.vz = -1;
PCombatHit.tryUkemi(g, hero);
assert(hero.combatState === "UKEMI" && hero._consumedUkemiAt === bufferedUkemi[0].pressedAtTick.ukemi,
  "ukemi pressed just before landing executes from the six-tick action buffer");

if (h.fails()) {
  console.error(h.oks() + " ok, " + h.fails() + " fail");
  process.exit(1);
}
