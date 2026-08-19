"use strict";

var path = require("path");
require(path.join(__dirname, "..", "js", "constants.js"));
var PData = require(path.join(__dirname, "..", "js", "data.js"));

function innerData(raw) {
  var r = raw || PData.ready();
  var moves = r.moves;
  var id, mv;
  if (moves && moves.moves) moves = moves.moves;
  var clean = {};
  if (moves) {
    for (id in moves) {
      if (!Object.prototype.hasOwnProperty.call(moves, id)) continue;
      if (id === "id" || id === "_ticks" || id === "schema") continue;
      mv = moves[id];
      if (!mv || typeof mv !== "object") continue;
      if (!mv._ticks && PData.convertMove) PData.convertMove(mv);
      clean[id] = mv;
    }
  }
  return { moves: clean, enemies: r.enemies, levels: r.levels };
}

var rawErrs = PData.validate();
var errs = PData.validate(innerData());
var i;
function onlyWrapper(list) {
  if (!list || !list.length) return true;
  var j, e;
  for (j = 0; j < list.length; j++) {
    e = list[j];
    if (e !== "schema: empty timing" && e !== "moves: empty timing") return false;
  }
  return true;
}
if (rawErrs && rawErrs.length && !onlyWrapper(rawErrs)) {
  console.error("PData.validate() " + rawErrs.length + " errors:");
  for (i = 0; i < rawErrs.length; i++) console.error("  " + rawErrs[i]);
}
if (!errs || !errs.length) {
  console.log("ok PData.validate() 0 errors");
} else {
  console.error("PData.validate() " + errs.length + " errors:");
  for (i = 0; i < errs.length; i++) console.error("  " + errs[i]);
  process.exitCode = 1;
}

function reject13SpawnWave() {
  var data = {
    moves: { jab: { startup: 1, active: 1, recovery: 1 } },
    enemies: { archetypes: { E1: { hp: 24 } } },
    levels: {
      syn13: {
        segments: [{
          mode: "belt",
          arena: { xMin: 0, xMax: 480, dMin: 0, dMax: 60 },
          waves: [{
            id: "w13",
            spawns: [{ archetype: "E1", count: 13 }]
          }]
        }]
      }
    }
  };
  var syn = PData.validate(data);
  var hit = false;
  var j;
  for (j = 0; j < syn.length; j++) {
    if (/13/.test(syn[j]) || /w13/.test(syn[j]) || /spawn/i.test(syn[j])) hit = true;
  }
  if (!hit) {
    console.error("FAIL synthetic 13-spawn wave was not rejected", syn);
    process.exitCode = 1;
  } else {
    console.log("ok rejected 13-spawn wave");
  }
  return syn;
}

reject13SpawnWave();

if (process.exitCode) process.exit(process.exitCode);
