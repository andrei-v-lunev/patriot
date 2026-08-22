"use strict";
var assert = require("assert");

global.performance = { now: function () { return 1000; } };
global.PUI = { S: function (key) { return key; } };
global.PAudio = { playEvent: function () {} };
global.window = { PUI: global.PUI, PAudio: global.PAudio };
delete require.cache[require.resolve("../js/ui.screens.js")];
var Screens = require("../js/ui.screens.js");

function intent(values) {
  var out = { moveX: 0, moveD: 0, startPressed: false, gripPressed: false, pausePressed: false };
  Object.keys(values || {}).forEach(function (key) { out[key] = values[key]; });
  return out;
}
function update(values) { Screens.update([intent(values)], null); }

Screens.set("MODE");
update({ moveD: -1 });
update({ moveD: 0 });
assert.strictEqual(Screens.modeId(), "COOP", "mode navigation selects co-op");
update({ startPressed: true });
assert.strictEqual(Screens.get(), "CHAR", "co-op enters character selection");
assert.strictEqual(Screens.charPlayer(), 0, "P1 selects first");

update({ startPressed: true });
assert.strictEqual(Screens.get(), "CHAR", "P1 confirm advances to P2 instead of leaving selection");
assert.strictEqual(Screens.charPlayer(), 1, "P2 receives an independent selection step");
assert.strictEqual(Screens.heroId(), "idris", "P1 selection is retained");
assert.strictEqual(Screens.hero2Id(), "otajon", "P2 defaults to the other hero");

update({ moveX: -1 });
update({ moveX: 0 });
assert.strictEqual(Screens.hero2Id(), "idris", "P2 can independently select the same hero");
update({ startPressed: true });
assert.strictEqual(Screens.get(), "DIFFICULTY", "P2 confirm completes character selection");
assert.strictEqual(Screens.heroId(), "idris");
assert.strictEqual(Screens.hero2Id(), "idris", "duplicate co-op picks remain explicit");
console.log("ok independent co-op character selection and duplicate picks");
