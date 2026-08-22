"use strict";

var assert = require("assert");
var inventory = require("../tools/release-inventory.json");
var checker = require("../tools/check-release-inventory.js");
var result = checker.inspect(inventory);

assert.deepStrictEqual(result.errors, [], "release inventory schema and evidence files stay valid");
assert(inventory.requirements.length >= 30, "full release contract stays enumerated");
assert(result.pending.length > 0, "strict release remains visibly open until production is complete");
assert(result.complete.some(function (r) { return r.id === "core-tests"; }), "green core suite is recorded");
console.log("ok release inventory (" + inventory.requirements.length + " requirements)");
