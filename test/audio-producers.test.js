"use strict";

var assert = require("assert");
var Ippon = require("../js/combat.ippon.js");
var Hit = require("../js/combat.hit.js");

var chain = { tick: 1, events: [] };
Ippon.extendChain(chain, 5);
assert.strictEqual(chain.events[0].audio, "wazaari", "WAZA-ARI threshold publishes audio");
Ippon.extendChain(chain, 3);
assert.strictEqual(chain.events[1].audio, "ippon", "IPPON threshold publishes audio");
Ippon.extendChain(chain, 4);
assert.strictEqual(chain.events[2].audio, "ippon_gachi", "IPPON GACHI threshold publishes audio");

var ukemi = { tick: 10, events: [], intents: [{ ukemiPressed: true }] };
var hero = { kind: "hero", team: "hero", player: 0, combatState: "KNOCKDOWN",
  hp: 120, facing: 1, grounded: true, meter: 0 };
assert(Hit.tryUkemi(ukemi, hero), "valid ukemi input executes");
assert.strictEqual(ukemi.events[0].audio, "ukemi", "ukemi publishes its audio cue");

global.PConst = { SIM_HZ: 120, DEPTH_PICKUP: 14, TEA_HP: 30 };
delete require.cache[require.resolve("../js/sim.pickups.js")];
var Pickups = require("../js/sim.pickups.js");
var tea = { id: 0, alive: true, kind: "tea", x: 10, d: 5, life: 20 };
var pickup = { events: [], heroes: [{ id: 0, kind: "hero", alive: true, hp: 50,
  maxHp: 120, x: 10, d: 5 }], pickups: [tea] };
Pickups.tick(pickup);
assert.strictEqual(pickup.events[0].audio, "pickup", "collected pickup publishes its audio cue");
console.log("ok deterministic audio event producers");
