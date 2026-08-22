"use strict";

var assert = require("assert");
var qa = require("../tools/audio-qa");
var out = qa.inspect();
assert.strictEqual(out.errors.length, 0, out.errors.join("\n"));
assert.strictEqual(out.files, 310, "all 310 runtime codec files are decoded");
assert.strictEqual(out.pairs, 170, "all 170 routed OGG/M4A pairs are checked");
console.log("ok decoder-level audio parity, loop and stem QA");
