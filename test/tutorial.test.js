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

if (h.fails()) process.exit(1);
