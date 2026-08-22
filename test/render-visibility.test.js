"use strict";

var assert = require("assert");
global.window = global;
delete require.cache[require.resolve("../js/render.js")];
var Render = require("../js/render.js");

var outgoing = { id: 1, alive: true, benched: true, x: 120, d: 24 };
var incoming = { id: 2, alive: true, benched: false, x: 120, d: 24 };
var state = { heroes: [outgoing, incoming], enemies: [], pickups: [], projectiles: [] };
assert.strictEqual(Render._collect(state), 1,
  "solo tag renders the incoming fighter once and excludes the alive bench partner");

outgoing.benched = false;
assert.strictEqual(Render._collect(state), 2, "COOP still renders both active fighters");
delete global.window;
console.log("ok render excludes solo bench heroes without hiding COOP partners");
