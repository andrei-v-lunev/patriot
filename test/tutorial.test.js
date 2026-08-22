"use strict";

var h = require("./harness");
var assert = h.assert;
var PSim = h.requireFile("js/sim.js");
var Tutorial = h.requireFile("js/sim.tutorial.js");
h.requireFile("js/combat.js");
h.requireFile("js/combat.hit.js");

var g = h.createGame(77, { levelId: "w1l1" });
var hero = h.getHero(g), dummy = h.getEnemies(g).filter(function (e) { return e.archetype === "DUMMY"; })[0];
assert(g.tutorial && g.tutorial.phase === 0 && dummy.tutorialGripOnly, "W1L1 initializes its grip-only dojo lesson");
assert(g.segment.width === 480, "W1L1 dojo is exactly one viewport wide");
hero.x = 340;
var dummyX = dummy.x;
for (var moveT = 0; moveT < 60; moveT++) h.step(g, h.intents({ moveX: 1 }));
assert(g.cam.x === 0, "W1L1 movement never scrolls the viewport-sized dojo plate");
assert(dummy.x === dummyX, "W1L1 camera lock leaves the stationary dummy fixed in the room");
g = h.createGame(77, { levelId: "w1l1" }); hero = h.getHero(g);
dummy = h.getEnemies(g).filter(function (e) { return e.archetype === "DUMMY"; })[0];

hero.x = 170; Tutorial.tick(g, h.intents());
assert(g.tutorial.phase === 1 && g.tutorial.hint === "ХВАТАЙ ЕГО", "walking into the dojo reveals the grip beat");
hero.gripTarget = dummy; dummy.combatState = "GRIPPED"; Tutorial.tick(g, h.intents());
assert(g.tutorial.phase === 2, "first successful dummy grip unlocks the three-throw beat");
hero.gripTarget = null;
for (var i = 0; i < 3; i++) {
  dummy.combatState = "FREE"; Tutorial.tick(g, h.intents());
  dummy.combatState = "THROWN_FLIGHT"; Tutorial.tick(g, h.intents());
}
assert(g.tutorial.phase === 3 && g.tutorial.throws === 3, "three distinct dummy throws unlock directional chalk circles");
dummy.combatState = "FREE"; Tutorial.tick(g, h.intents());
hero.throwWorldDir = 2; dummy.combatState = "THROWN_FLIGHT"; Tutorial.tick(g, h.intents());
dummy.combatState = "FREE"; Tutorial.tick(g, h.intents());
hero.throwWorldDir = 6; dummy.combatState = "THROWN_FLIGHT"; Tutorial.tick(g, h.intents());
assert(g.tutorial.phase === 4 && g.tutorial.forward && g.tutorial.back, "forward and back throws unlock the ukemi beat");

hero.combatState = "UKEMI"; Tutorial.tick(g, h.intents());
assert(g.tutorial.phase === 5, "a clean ukemi unlocks the tag beat");
g.activeHero = 1; Tutorial.tick(g, h.intents());
assert(g.tutorial.phase === 6 && g.tutorial.revealT === 480, "tagging reveals the complete throw chalkboard for four seconds");
g.tutorial.revealT = 1; Tutorial.tick(g, h.intents());
assert(g.tutorial.done, "throw-table reveal completes the dojo gate");
Tutorial.init(g);
assert(g.tutorial.done, "re-entering a segment does not replay a completed once-per-run tutorial");

var coop = h.createGame(79, { levelId: "w1l1", players: 2 });
coop.tutorial.phase = 5; Tutorial.tick(coop, h.intents());
assert(coop.tutorial.phase === 6, "COOP skips the solo-only tag action without softlocking onboarding");

g = h.createGame(88, { levelId: "w1l1" }); hero = h.getHero(g);
dummy = h.getEnemies(g).filter(function (e) { return e.archetype === "DUMMY"; })[0];
hero.x = dummy.x - 25; hero.d = dummy.d; hero.facing = 1;
var hp = dummy.hp, Hit = h.G("PCombatHit"); Hit.startSweep(g, hero);
for (i = 0; i < 80; i++) h.step(g, h.intents());
assert(dummy.hp === hp, "tutorial dummy rejects strikes and remains a grip-only lesson");

function generic(extra) {
  var x = h.createEmpty("belt", extra || {});
  x.levelId = "w2l1";
  Tutorial.init(x);
  return x;
}
function fresh(extra) {
  var x = generic(extra), hh = h.getHero(x);
  return { g: x, hero: hh, t: x.tutorial };
}

var q = fresh({ hintMode: "once", hintsSeen: ["meter-full"] });
q.hero.meter = 100; Tutorial.tick(q.g, h.intents());
assert(q.t.hint === "", "once mode suppresses a hint already seen in this save slot");
q = fresh({ hintMode: "always", hintsSeen: ["meter-full"] });
q.hero.meter = 100; Tutorial.tick(q.g, h.intents());
assert(q.t.currentId === "meter-full" && q.t.hintT === Tutorial.HINT_T, "always mode replays an eligible saved hint with the exact 2.95 second envelope");
q = fresh({ hintMode: "off" }); q.hero.meter = 100; Tutorial.tick(q.g, h.intents());
assert(q.t.hint === "", "off mode suppresses contextual hints in the sim producer");

q = fresh({ hintMode: "once" });
var foe = h.spawnEnemy(q.g, "E1", q.hero.x + 30, q.hero.d);
Tutorial.tick(q.g, h.intents());
assert(q.t.currentId === "grip-range" && q.t.seen.indexOf("grip-range") >= 0, "first grip-range hint is emitted and recorded for the active slot");

q = fresh({ hintMode: "once" }); foe = h.spawnEnemy(q.g, "E1", q.hero.x + 20, q.hero.d);
q.hero.combatState = "GRIPPED"; q.hero.gripTarget = foe;
for (i = 0; i < 49; i++) Tutorial.tick(q.g, h.intents());
assert(q.t.currentId === "grip-held", "holding a grip without direction for over 400 ms teaches the throw flick");

q = fresh({ hintMode: "once" }); q.hero.combatState = "KNOCKDOWN"; Tutorial.tick(q.g, h.intents());
assert(q.t.currentId === "knockdown", "first knockdown teaches ukemi");
q = fresh({ hintMode: "once" }); q.hero.meter = 100; Tutorial.tick(q.g, h.intents());
assert(q.t.currentId === "meter-full", "first full meter announces the special");
q = fresh({ hintMode: "once" });
var partner = q.g.heroes.filter(function (e) { return e !== q.hero; })[0]; partner.hp = partner.maxHp * 0.2;
Tutorial.tick(q.g, h.intents()); assert(q.t.currentId === "partner-low", "low bench health teaches tag-out");

q = fresh({ hintMode: "once" }); q.g.mode = "plat"; q.hero.x = 75; q.hero.z = 16; q.hero.grounded = true;
q.g.solids = [{ x: 0, z: 0, w: 100, h: 16, type: "solid" }]; Tutorial.tick(q.g, h.intents());
assert(q.t.currentId === "ledge", "first drop over 48 px teaches holding jump");
q = fresh({ hintMode: "once" }); foe = h.spawnEnemy(q.g, "E1", 300, 24, { tutorialGuard: true });
Tutorial.tick(q.g, h.intents()); assert(q.t.currentId === "guard", "first guarding enemy teaches the down throw");
q = fresh({ hintMode: "once" }); q.g.wave = { cleared: { w1: true } }; Tutorial.tick(q.g, h.intents());
assert(q.t.currentId === "wave-clear", "first cleared wave tells the player to advance");
q = fresh({ hintMode: "once" }); q.g.lives = 2; Tutorial.tick(q.g, h.intents()); q.g.lives = 1; Tutorial.tick(q.g, h.intents());
assert(q.t.currentId === "second-death", "second death at one checkpoint recommends a throw");
q = fresh({ hintMode: "once" }); Tutorial.tick(q.g, h.intents({ padDetected: true }));
assert(q.t.currentId === "pad-2p", "a detected pad advertises drop-in start");

q = fresh({ hintMode: "once" }); q.hero.meter = 100;
Tutorial.tick(q.g, h.intents({ specialPressed: true }));
assert(q.t.hint === "", "performing the prompted action before evaluation suppresses its hint");

var lesson = h.createGame(909, { levelId: "w1l2", hintMode: "once" });
PSim.applySegment(lesson, 1); h.stepN(lesson, 2, h.intents());
var guard = h.getEnemies(lesson).filter(function (e) { return e.tutorialGuard; })[0];
hero = h.getHero(lesson); hp = guard && guard.hp;
assert(guard && guard.aiState === "COUNTER_STANCE", "W1L2 opens with the authored stationary guarding enemy");
assert(h.applyDamage(lesson, guard, 20, hero, { isThrow: true }) === 0 && guard.hp === hp, "ordinary damage and non-down throws cannot bypass the lesson guard");
hero.combatState = "GRIPPED"; hero.gripTarget = guard; guard.combatState = "GRIPPED"; guard.gripTarget = hero;
h.G("PCombatThrow").startThrow(lesson, hero, { throwDir: 2 });
h.stepN(lesson, 45, h.intents());
assert(!guard.tutorialGuard && guard.hp < hp, "the real down-throw route breaks the W1L2 guard and advances combat");

if (h.fails()) process.exit(1);
