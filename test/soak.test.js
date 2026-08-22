"use strict";

var assert = require("assert");
var soak = require("../tools/soak");
var a = soak.run(12000, 9001);
var b = soak.run(12000, 9001);
assert(soak.stable(a, b), "short soak replays identically");
assert(a.ticksPerSecond > 1000, "short soak maintains simulation budget");
console.log("ok deterministic pool-integrity soak harness");
