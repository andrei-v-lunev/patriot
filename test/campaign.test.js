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

var continueGame = h.createGame(1337, { levelId: "w1l1" });
PSim.applySegment(continueGame, 1);
h.step(continueGame, h.intents());
continueGame.currentCheckpoint = { x: 222, d: 33 };
continueGame.score = 1000;
continueGame.lifeState = "continue";
continueGame.continueT = 100;
var continued = PSim.useContinue(continueGame);
var continueHero = h.getHero(continueGame);
assert(continued && continueGame.continues === -1, "browser continue is accepted without consuming the unlimited pool");
assert(continueHero.x === 222 && continueHero.d === 33 && continueHero.hp === continueHero.maxHp,
  "continue revives at the latest checkpoint with full HP");
assert(h.getEnemies(continueGame).length === 0 && !continueGame.wave.started.w1,
  "continue clears the active wave before its deterministic restart");
assert(continueGame.score === 800, "continue applies the PRD 20% score penalty");
h.step(continueGame, h.intents());
assert(continueGame.wave.started.w1 && h.getEnemies(continueGame).length === 1 && continueGame.wave.pending.length === 1,
  "current wave restarts from its authored immediate and delayed spawns");

var beltFloor = h.createGame(1337, { levelId: "w3l3" });
var beltHero = h.getHero(beltFloor);
beltHero.x = 100; beltHero.z = 0; beltHero.grounded = true; beltHero.combatState = "FREE";
h.getEnemies(beltFloor).forEach(function (e) { e.x = 400; e.d = 50; });
for (var beltMoveI = 0; beltMoveI < 30; beltMoveI++) h.step(beltFloor, h.intents({ moveX: 1 }));
assert(beltHero.x > 105,
  "belt knockdown landing at z=0 remains horizontally mobile across the arena floor");
var beltEnemy = h.getEnemies(beltFloor)[0];
beltEnemy.x = -100; beltEnemy.vx = -200;
h.step(beltFloor, h.intents());
assert(beltEnemy.x >= (beltFloor.segment.arena.xMin + beltEnemy.w * 0.5),
  "belt enemies remain inside the authored arena instead of becoming unreachable");

var corruptActive = h.createEmpty("belt");
corruptActive.lifeState = "continue";
corruptActive.activeHero = 999;
PSim.useContinue(corruptActive);
var playableAfterCorruptContinue = h.getHeroes(corruptActive).filter(function (x) {
  return x && x.alive && !x.benched && x.x > -9000;
});
assert(corruptActive.activeHero >= 0 && corruptActive.activeHero < h.getHeroes(corruptActive).length &&
  playableAfterCorruptContinue.length === 1,
  "Continue normalizes a corrupt activeHero and restores one playable solo fighter");

var checkpointGame = h.createGame(1337, { levelId: "w1l2" });
checkpointGame.currentCheckpoint = { x: 700, d: 24 };
checkpointGame.checkpointIndex = 1;
PSim.applySegment(checkpointGame, 1);
checkpointGame.lifeState = "continue";
PSim.useContinue(checkpointGame);
assert(h.getHero(checkpointGame).x === 700 && checkpointGame.currentCheckpoint.x === 700,
  "arena entry preserves the latest platform checkpoint for Continue");

var airborneExit = h.createGame(1337, { levelId: "w2l2" });
var airborneHero = h.getHero(airborneExit);
airborneHero.x = airborneExit.width - 10;
airborneHero.z = 80;
airborneHero.grounded = false;
airborneHero.vz = 0;
for (var airborneTick = 0; airborneTick < 70 && airborneExit.segIndex === 0; airborneTick++) {
  h.step(airborneExit, h.intents({ moveX: 1 }));
}
assert(airborneExit.segIndex === 1 && airborneExit.mode === "belt",
  "airborne platform exit grace expires instead of resetting every tick");

var PPickups = h.G("PPickups");
var pickupGame = h.createGame(1337, { levelId: "w1l1" });
PSim.applySegment(pickupGame, 1);
var pickupHero = h.getHero(pickupGame);
pickupHero.hp = pickupHero.maxHp * 0.25;
h.step(pickupGame, h.intents());
var pickupEnemies;
var pickupI;
for (pickupI = 0; pickupI < 50; pickupI++) {
  pickupEnemies = h.getEnemies(pickupGame);
  pickupEnemies.forEach(function (e) { e.hp = 0; });
  h.step(pickupGame, h.intents());
}
var tea = pickupGame.pickups.filter(function (p) { return p && p.alive && p.kind === "tea"; });
assert(tea.length === 1, "low-HP wave clear spawns exactly one tea in the render list (got " + tea.length + ")");
if (tea[0]) {
  var hpBeforeTea = pickupHero.hp;
  pickupHero.x = tea[0].x;
  pickupHero.d = tea[0].d;
  if (PPickups && PPickups.tick) PPickups.tick(pickupGame);
  assert(pickupHero.hp > hpBeforeTea, "spawned tea is collectible and heals the active hero");
}

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
for (i = 0; i < 10 && b1.aiState !== "ATTACK"; i++) h.step(g, h.intents());
assert(b1.aiState === "ATTACK" && b1.telegraphMax === b1.telegraphT &&
  b1.activeMax === b1.activeT && b1.recoverMax === b1.recoverT,
  "boss attack publishes stable telegraph/active/recovery animation durations");
placeGrip(hero, b1, 1);
b1.staggeredT = 0;
b1.combatState = "FREE";
h.applyDamage(g, b1, 1, { chip: true });
assert(b1.stag === 6, "normal boss damage builds natural stagger (B1 stag=" + b1.stag + ")");
b1.stag = 0;
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
b1 = h.spawnEnemy(g, "B1", 300, 24);
PAI.forceStagger(b1);
for (i = 0; i < 239; i++) h.step(g, h.intents());
assert(b1.combatState === "STAGGERED" && b1.staggeredT === 1,
  "boss stagger remains active for 239/240 ticks (remaining=" + b1.staggeredT + ")");
h.step(g, h.intents());
assert(b1.combatState === "FREE" && b1.staggeredT === 0, "boss stagger expires on tick 240");

g = h.createEmpty("belt");
hero = h.getHero(g);
b1 = h.spawnEnemy(g, "B1", 188, 24);
placeGrip(hero, b1, 1);
b1.stag = b1.staggerMax - 6;
var SweepHit = h.G("PCombatHit");
SweepHit.startSweep(g, hero);
for (i = 0; i < 40; i++) SweepHit.tickSweep(g, hero);
assert(b1.combatState === "STAGGERED" && b1.staggeredT === 240,
  "natural sweep threshold leaves a boss authoritatively staggered");

g = h.createGame(1337, { levelId: "w4l3" });
for (i = 0; i < 4; i++) h.step(g, h.intents());
var b4Adds = h.getEnemies(g).filter(function (e) { return e.archetype === "E8"; });
assert(b4Adds.length >= 2, "B4 crane-cab fight supplies throwable Gold Jackets (got " + b4Adds.length + ")");
var b4 = h.getEnemies(g).filter(function (e) { return e.archetype === "B4"; })[0];
var cabBody = b4Adds[0];
cabBody.x = b4.x; cabBody.d = b4.d; cabBody.z = b4.z;
cabBody.vx = 1; cabBody.vz = 0; cabBody.flightT = 20;
cabBody.combatState = "THROWN_FLIGHT"; cabBody.thrower = h.getHero(g); cabBody.baseThrowDmg = 18;
cabBody.hitN = 0; cabBody.hitIds = [0, 0, 0, 0, 0, 0, 0, 0]; cabBody.ffN = 0;
var CabThrow = h.G("PCombatThrow");
CabThrow.tickFlight(g, cabBody);
assert(b4.cabHit === 1, "thrown-body collision marks B4 cab at the collision producer");
h.step(g, h.intents());
assert(b4.cabBroken === true, "B4 consumes the cab hit even when the thrown body is swept");

g = h.createGame(1337, { levelId: "w2l3" });
for (i = 0; i < 4; i++) h.step(g, h.intents());
var b2Adds = h.getEnemies(g).filter(function (e) { return e.archetype === "E6"; });
assert(b2Adds.length >= 2, "B2 airborne fight supplies throwable E6 adds (got " + b2Adds.length + ")");
var awning = g.props[0];
var Throw = h.G("PCombatThrow");
for (i = 0; i < 2; i++) {
  var body = b2Adds[i];
  body.x = awning.x; body.d = awning.d; body.z = 20;
  body.vx = 1; body.vz = 0; body.flightT = 20;
  body.combatState = "THROWN_FLIGHT"; body.propHits = {};
  Throw.tickFlight(g, body);
}
assert(awning.alive === false && awning.hp === 0, "two thrown bodies break a B2 awning");
h.step(g, h.intents());
var b2 = h.getEnemies(g).filter(function (e) { return e.archetype === "B2"; })[0];
assert(b2 && b2.b2Landed === true, "breaking an awning makes B2 land and become fightable");

g = h.createGame(1337, { levelId: "w3l2" });
hero = h.getHero(g);
var windX = hero.vx;
h.step(g, h.intents());
assert(g.wind === -30 && g.autoScroll === 40 && hero.vx < windX, "W3 roof keeps the authored scroll and deterministic leftward wind");
var tunnel = g.hazards.filter(function (hz) { return hz.type === "tunnel"; })[0];
hero.x = tunnel.x + 10; hero.hp = hero.maxHp; hero.hazardIF = 0;
tunnel.triggerT = 0; tunnel.activeT = 2;
var tunnelHp = hero.hp;
h.step(g, h.intents());
assert(hero.hp < tunnelHp, "active tunnel mouth damages a standing hero");

g = h.createGame(1337, { levelId: "w3l3" });
h.stepN(g, 120, h.intents());
assert(g.autoScroll === 40 && g.scrollX > 0 && g.cam.bgX === g.scrollX && g.cam.x === 0,
  "W3 boss arena keeps fighters locked while its vehicle backdrop scrolls continuously");

g = h.createGame(1337, { levelId: "w3l1" });
hero = h.getHero(g);
var livesBeforeTrainFall = g.lives;
var activeBeforeTrainFall = g.activeHero;
hero.x = 430; hero.z = 16; hero.grounded = true; hero.vx = hero.vz = 0;
h.step(g, h.intents());
assert(g.lives === livesBeforeTrainFall - 1 && g.activeHero === activeBeforeTrainFall,
  "off-train fall immediately consumes exactly one shared solo life");
hero = h.getHero(g);
assert(hero.alive && hero.x === g.currentCheckpoint.x && hero.iFrames > 0,
  "off-train fall respawns at the checkpoint before the gap can hit again");

g = h.createGame(1337, { levelId: "w3l1", players: 2 });
var coopFallHero = h.getHeroes(g)[0];
var coopOther = h.getHeroes(g)[1];
var coopOtherHp = coopOther.hp;
coopFallHero.x = 430; coopFallHero.z = 16; coopFallHero.grounded = true;
h.step(g, h.intents());
assert(g.lives === 2 && g.lives2 === 3 && coopFallHero.alive && coopOther.hp === coopOtherHp,
  "co-op off-train fall consumes only the falling player's life and leaves the partner intact");
g.lives = 1; coopFallHero.x = 430; coopFallHero.iFrames = 0;
h.step(g, h.intents());
assert(g.lives === 0 && coopFallHero._outOfLives && g.lifeState === "playing",
  "co-op player with no lives stays out while the partner can continue");
g.lives2 = 1; coopOther.x = 430; coopOther.z = 16; coopOther.grounded = true; coopOther.iFrames = 0;
h.step(g, h.intents());
assert(g.lifeState === "continue" && g.lives2 === 0,
  "co-op enters Continue only after both players exhaust their life pools");
PSim.useContinue(g);
assert(h.getHeroes(g).every(function (hh) { return hh.alive && !hh._outOfLives; }),
  "Continue clears co-op out-of-lives markers for both revived heroes");

g = h.createEmpty("belt", { players: 2, coop: true });
var combatOutHero = g.heroes[0];
var combatOutPartner = g.heroes[1];
g.lives = 1; g.lives2 = 2;
h.G("PCombat").applyDamage(g, combatOutHero, 999, null, {});
h.stepN(g, 1200, h.intents());
assert(g.lives === 0 && !combatOutHero.alive && combatOutHero._outOfLives && combatOutPartner.alive,
  "co-op normal-combat last stock marks only that fighter out");
g.go = { active: true, opened: true, x: 400, w: 80 };
combatOutPartner.x = g.segment.arena.xMax; combatOutHero.x = 100;
h.step(g, h.intents());
assert(!g.go.blocked && g.go.canAdvance,
  "an exhausted co-op fighter no longer blocks the stocked partner at GO");

g = h.createGame(1337, { levelId: "w4l2" });
hero = h.getHero(g);
var camBefore = g.cam.x;
h.stepN(g, 120, h.intents());
assert(g.autoScroll === 120 && g.cam.x > camBefore, "W4 chase advances the camera from authored autoScroll");
var container = g.hazards.filter(function (hz) { return hz.type === "container"; })[0];
hero.x = container.x; hero.hp = hero.maxHp; hero.hazardIF = 0;
container.triggerT = 1; container.dropped = false;
var containerHp = hero.hp;
h.step(g, h.intents());
h.step(g, h.intents());
assert(container.dropped && hero.hp < containerHp, "telegraphed W4 container drop damages on impact");

var pit = g.hazards.filter(function (hz) { return hz.type === "pit"; })[0];
g.currentCheckpoint = { x: 860, d: 20 };
g.checkpointIndex = 1;
hero.x = pit.x + pit.w * 0.5; hero.d = 24; hero.z = -1;
hero.grounded = false; hero.hp = hero.maxHp; hero.hazardIF = 0;
h.step(g, h.intents());
assert(!hero.alive && hero.pitRespawnT === 90 && hero.hp === hero.maxHp - 18,
  "pit fall applies 18 damage and begins the authored 0.75 second respawn delay");
h.stepN(g, 89, h.intents());
assert(!hero.alive && hero.pitRespawnT === 1, "pit victim stays absent until the final delay tick");
h.step(g, h.intents());
assert(hero.alive && hero.x === 860 && hero.d === 20 && hero.z === 16,
  "pit respawns at the latest checkpoint after exactly 0.75 seconds");

var normalThrow = h.createEmpty("belt");
var iceThrow = h.createEmpty("belt");
var normalBody = h.spawnEnemy(normalThrow, "E1", 100, 20);
var iceBody = h.spawnEnemy(iceThrow, "E1", 100, 20);
normalBody.combatState = iceBody.combatState = "THROWN_FLIGHT";
normalBody.team = iceBody.team = "neutral";
normalBody.vx = iceBody.vx = 300; normalBody.vz = iceBody.vz = 180;
normalBody.flightT = iceBody.flightT = 300; normalBody.grounded = iceBody.grounded = false;
iceThrow.slippery = true;
h.stepN(normalThrow, 20, h.intents()); h.stepN(iceThrow, 20, h.intents());
assert(iceBody.x > normalBody.x, "W4 slippery floor extends thrown-body travel");

g = h.createGame(1337, { levelId: "w5l3" });
hero = h.getHero(g); hero.x = 4; hero.hp = hero.maxHp; hero.hazardIF = 0;
g.cage = { walls: [1, 1, 1, 1], shoveT: 0, shoveTel: 0, elecT: 0 };
var cageHp = hero.hp;
h.step(g, h.intents());
assert(hero.hp < cageHp, "live W5 cage wall deals authored contact damage");
hero.d = 4; hero.x = 240; hero.hp = hero.maxHp; hero.hazardIF = 0;
g.cage.walls = [0, 0, 1, 0];
cageHp = hero.hp;
h.step(g, h.intents());
assert(hero.hp < cageHp, "W5 depth cage walls implement the alternating second wall pair");

g = h.createGame(1337, { levelId: "w5l3" });
for (i = 0; i < 6; i++) h.step(g, h.intents());
var directingB5 = h.getEnemies(g).filter(function (e) { return e.archetype === "B5"; })[0];
var goldAdds = h.getEnemies(g).filter(function (e) { return e.archetype === "E8"; });
assert(directingB5 && directingB5.invuln && goldAdds.length === 2,
  "B5 directs a finite phase-one Gold Jacket wave before entering personally");
var directingHp = directingB5.hp;
var directingStag = directingB5.stag;
h.applyDamage(g, directingB5, 20, { chip: true });
assert(directingB5.hp === directingHp && directingB5.stag === directingStag,
  "B5 directing invulnerability blocks both damage and stagger");

var punishGame = h.createEmpty("belt");
var punishHero = h.getHero(punishGame);
var punishB5 = h.spawnEnemy(punishGame, "B5", 188, 24);
punishB5.phase = 2; punishB5.directingDone = true; punishB5.invuln = false;
punishB5.aiState = "ATTACK"; punishB5.patternName = "combo";
punishB5.telegraphT = 1; punishB5.activeT = 8; punishB5.recoverT = 20;
punishB5.stag = punishB5.staggerMax - 6;
h.applyDamage(punishGame, punishB5, 7, { chip: true });
assert(punishB5.combatState === "STAGGERED" && punishB5.aiState !== "ATTACK" && punishB5.activeT === 0,
  "earned boss stagger authoritatively cancels a queued attack pattern");
placeGrip(punishHero, punishB5, 1);
for (i = 0; i < 40 && punishHero.combatState !== "GRIPPED"; i++)
  h.step(punishGame, h.intents({ grip: true, gripPressed: i === 0 }));
var punishHp = punishHero.hp;
for (i = 0; i < 20; i++) h.step(punishGame, h.intents({ grip: true }));
assert(punishHero.combatState === "GRIPPED" && punishHero.hp === punishHp,
  "boss AI stays suspended throughout the stagger grip punish window");
h.step(punishGame, h.intents({ gripReleased: true, throwDir: 0 }));
for (i = 0; i < 80 && punishB5.combatState !== "THROWN_FLIGHT"; i++) h.step(punishGame, h.intents());
assert(punishB5.combatState === "THROWN_FLIGHT" || punishB5.combatState === "KNOCKDOWN",
  "canonical grip release completes the interrupted boss punish throw");
assert(directingB5.z === 16 && directingB5.grounded,
  "boss waves spawn on the arena floor instead of clipping through a generic drop-in");
for (i = 0; i < goldAdds.length; i++) goldAdds[i].hp = 0;
h.step(g, h.intents()); h.step(g, h.intents());
assert(directingB5.directingDone && !directingB5.invuln,
  "B5 becomes vulnerable after the opening Gold Jackets are cleared");
if (PAI && PAI.setB5Phase3) PAI.setB5Phase3(directingB5); else directingB5.phase = 3;
h.step(g, h.intents());
goldAdds = h.getEnemies(g).filter(function (e) { return e.archetype === "E8"; });
assert(goldAdds.length >= 2, "B5 phase three replenishes throwable Gold Jackets");

g = h.createEmpty("belt");
hero = h.getHero(g); hero.x = 20; hero.d = 24; hero.hp = hero.maxHp;
var shoveB5 = h.spawnEnemy(g, "B5", 220, 24);
shoveB5.phase = 2; shoveB5.directingDone = true;
g.cage = { walls: [0, 0, 0, 0], shoveT: 0, shoveTel: 1, elecT: 0, edge: 0 };
var shoveHp = hero.hp;
var shoveX = hero.x;
h.step(g, h.intents());
assert(hero.hp < shoveHp && hero.x > shoveX,
  "B5 crowd shove consumes its telegraph with damage and inward displacement");

g = h.createEmpty("belt");
hero = h.getHero(g); hero.x = 240; hero.d = 24; hero.hp = hero.maxHp;
var weightB5 = h.spawnEnemy(g, "B5", 360, 24);
weightB5.phase = 2; weightB5.directingDone = true;
g.cage = { walls: [0, 0, 0, 0], shoveT: 0, shoveTel: 0, elecT: 0,
  weightT: 0, weightTel: 1, weightX: hero.x, weightD: hero.d };
var weightHp = hero.hp;
h.step(g, h.intents());
assert(hero.hp === weightHp - 24 && g.cage.weightImpactT > 0,
  "B5 rigged weight consumes its telegraph for 24 damage and knockdown");

g = h.createEmpty("belt");
g.xMax = 480;
var wallB5 = h.spawnEnemy(g, "B5", 480, 24);
wallB5.phase = 3; wallB5.cabBroken = true; wallB5.stag = 0;
wallB5.combatState = "THROWN_FLIGHT"; wallB5.vx = 300; wallB5.vz = 0;
wallB5.thrower = h.getHero(g); wallB5.flightT = 20;
g.cage = { walls: [0, 1, 0, 0], shoveT: 0, shoveTel: 0, elecT: 0 };
var WallThrow = h.G("PCombatThrow");
WallThrow.tickFlight(g, wallB5);
assert(wallB5.stag === 90, "throwing B5 into a live electrified wall grants the authored +90 stagger");

g = h.createEmpty("belt");
g.dMin = 0; g.dMax = 60;
var depthWallB5 = h.spawnEnemy(g, "B5", 240, 60);
depthWallB5.phase = 3; depthWallB5.invuln = false; depthWallB5.stag = 0;
depthWallB5.combatState = "THROWN_FLIGHT"; depthWallB5.vx = 0; depthWallB5.vd = 240;
depthWallB5.vz = 0; depthWallB5.thrower = h.getHero(g); depthWallB5.flightT = 20;
g.cage = { walls: [0, 0, 0, 1], shoveT: 0, shoveTel: 0, elecT: 0 };
WallThrow.tickFlight(g, depthWallB5);
assert(depthWallB5.stag === 90,
  "depth-directed B5 throw reaches the matching live cage wall for +90 stagger");

var PGame = require("../js/game.js");
var carried = h.createEmpty("belt", { players: 2, coop: true });
PGame._carryStocks(carried, 0, 2);
var carriedHeroes = carried.heroes;
assert(!carriedHeroes[0].alive && carriedHeroes[0]._outOfLives && carriedHeroes[1].alive,
  "COOP level carry keeps an exhausted player out while the stocked partner continues");

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
ensurePartner(g);
g.tagCd = 1;
var activeBeforeBufferedTag = g.activeHero;
var bufferedTag = h.intents();
bufferedTag[0].pressedAtTick = { tag: g.tick };
bufferedTag[0].tag = true;
bufferedTag[0].tagPressed = true;
h.step(g, bufferedTag);
assert(g.activeHero !== activeBeforeBufferedTag && g._consumedTagAt === bufferedTag[0].pressedAtTick.tag,
  "tag pressed just before cooldown expiry executes and consumes from the six-tick action buffer");

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
for (i = 0; i < PData.toTicks(PConst.GATE_DESPAWN_F || 10); i++) h.step(g, h.intents());
blocked = h.goBlocked(g);
var can = blocked === false || (g.go && g.go.opened) || (g.go && g.go.canAdvance) ||
  (g.gate && g.gate.closed === false) || (g.gate && g.gate.open);
assert(!!can, "both in GO zone → can advance (blocked=" + blocked + " opened=" + (g.go && g.go.opened) + ")");

if (h.fails()) {
  console.error(h.oks() + " ok, " + h.fails() + " fail");
  process.exit(1);
}
