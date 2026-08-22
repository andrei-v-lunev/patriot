#!/usr/bin/env node
"use strict";

var campaign = require("../data/campaign.json");
var bot = require("./botfight");
var PSim = require("../js/sim");
var IDS = [];
campaign.worlds.forEach(function (world) { world.levels.forEach(function (level) { IDS.push(level.id); }); });

function poolAudit(state, maxUse) {
  var names = ["heroes", "enemies", "moves", "projectiles", "fx", "events", "pickups"], i, p, used, j;
  for (i = 0; i < names.length; i++) {
    p = state.pools && state.pools[names[i]];
    if (!p) continue;
    used = typeof p.inUse === "function" ? p.inUse() : p.size - p.free.length;
    if (used < 0 || used > p.size) throw new Error(names[i] + " pool use " + used + "/" + p.size);
    maxUse[names[i]] = Math.max(maxUse[names[i]] || 0, used);
    for (j = 0; j < p.free.length; j++) if (p.free.indexOf(p.free[j]) !== j) throw new Error(names[i] + " pool has duplicate free reference");
  }
}

function run(ticks, seed) {
  var levelI = 0, state = PSim.createGame(seed, { levelId: IDS[0], difficulty: "easy" });
  var i, inp, clears = 0, continues = 0, maxUse = {}, heap0 = process.memoryUsage().heapUsed;
  var heapMax = heap0, started = process.hrtime.bigint();
  for (i = 0; i < ticks; i++) {
    if (state.lifeState === "continue") { if (!PSim.useContinue(state)) throw new Error("Continue rejected"); continues++; }
    inp = bot.botIntent(state);
    state.intents = inp;
    PSim.step(state, inp);
    if ((i % 120) === 0) {
      poolAudit(state, maxUse);
      heapMax = Math.max(heapMax, process.memoryUsage().heapUsed);
    }
    if (state.results) {
      clears++; levelI = (levelI + 1) % IDS.length;
      state = PSim.createGame(seed, { levelId: IDS[levelI], difficulty: "easy" });
    }
  }
  poolAudit(state, maxUse);
  var seconds = Number(process.hrtime.bigint() - started) / 1e9;
  return { ticks: ticks, clears: clears, continues: continues, level: IDS[levelI],
    hash: PSim.hashWorld(state), maxUse: maxUse, heapGrowth: heapMax - heap0,
    seconds: seconds, ticksPerSecond: ticks / seconds };
}

function stable(a, b) {
  return a.ticks === b.ticks && a.clears === b.clears && a.continues === b.continues &&
    a.level === b.level && a.hash === b.hash && JSON.stringify(a.maxUse) === JSON.stringify(b.maxUse);
}

function main() {
  var ticks = Number(process.env.PATRIOT_SOAK_TICKS) || 30 * 60 * 120;
  var a = run(ticks, 2), b = run(ticks, 2), errors = [];
  if (!stable(a, b)) errors.push("replay summary/hash differs");
  if (a.ticksPerSecond < 1000 || b.ticksPerSecond < 1000) errors.push("simulation throughput below 1000 ticks/s");
  if (a.heapGrowth > 128 * 1024 * 1024 || b.heapGrowth > 128 * 1024 * 1024) errors.push("heap growth exceeded 128 MiB");
  if (a.clears < 15) errors.push("soak did not clear at least one full campaign");
  console.log("soak: " + ticks + " ticks x2 (" + (ticks / 120 / 60).toFixed(1) + " simulated min/run), " +
    a.clears + " clears, " + a.continues + " continues, " + a.ticksPerSecond.toFixed(0) + "/" +
    b.ticksPerSecond.toFixed(0) + " ticks/s, heap peak delta " + (Math.max(a.heapGrowth, b.heapGrowth) / 1048576).toFixed(1) + " MiB");
  errors.forEach(function (error) { console.error("soak error: " + error); });
  if (errors.length) process.exitCode = 1;
}

if (require.main === module) main();
module.exports = { run: run, stable: stable };
