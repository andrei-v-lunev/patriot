"use strict";

var assert = require("assert");
global.window = global;
global.PUI = { S: function (key) {
  var s = { W3: "НОЧНОЙ ПОЕЗД", W3L2: "По крышам вагонов", NO_DAMAGE: "БЕЗ УРОНА",
    YES: "ДА", NO: "НЕТ", RANK: "РАНГ", VS: "ПРОТИВ", IDRIS: "ИДРИС", STAGE_CLEAR: "УРОВЕНЬ ПРОЙДЕН",
    VICTORY: "ПОБЕДА", IPPON: "ИППОН!", RETURNING: "ПАТРИОТ ВЕРНЁТСЯ." };
  return s[key] || key;
} };
var drawn = [];
global.PFont = {
  measure: function (s, scale) { return String(s).length * 6 * (scale || 1); },
  draw: function (ctx, s) { drawn.push(String(s)); }
};
global.PSprites = { heroId: function () { return "idris"; }, portrait: function () { return null; } };
global.PAnim = { frameAt: function () { return null; } };
var P = require("../js/ui.presentation.js");
var ctx = { fillStyle: "", fillRect: function () {}, drawImage: function () {} };
var state = { levelId: "w3l2", heroes: [{ heroId: "idris" }], score: 900,
  ippon: { score: 100, total: 2 }, tick: 14400, results: { rank: "A", noHit: true }, vs: { id: "B3" } };

assert.deepStrictEqual(P.levelInfo(state), {
  id: "w3l2", world: 3, level: 2, name: "По крышам вагонов", worldName: "НОЧНОЙ ПОЕЗД"
}, "level intro derives canonical campaign identity");
assert.deepStrictEqual(P.resultRows(state), [
  ["ОЧКИ", 1000], ["ИППОНОВ", 2], ["ВРЕМЯ", "120 С"], ["БЕЗ УРОНА", "ДА"]
], "results derive score, ippons, time and no-hit rows");

drawn.length = 0; P.drawIntro(ctx, state, 24);
assert(drawn.indexOf("По крышам вагонов".toUpperCase()) >= 0, "level intro draws the Russian level name");
drawn.length = 0; P.drawVs(ctx, state, 24);
assert(drawn.indexOf("B3") >= 0 && drawn.indexOf("ПРОТИВ") >= 0,
  "VS card draws the boss identity and localized versus label");
drawn.length = 0; P.drawResults(ctx, state, 310);
assert(drawn.indexOf("РАНГ A") >= 0 && drawn.indexOf("1000") >= 0, "results ceremony reveals total and rank");
drawn.length = 0; P.drawPostCredit(ctx, 180);
assert(drawn.indexOf("ПАТРИОТ ВЕРНЁТСЯ.") >= 0, "post-credit gag reaches the return caption");

delete global.window;
console.log("ok presentation beats");
