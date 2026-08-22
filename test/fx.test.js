"use strict";

var ok = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { console.log("ok " + msg); ok++; }
  else { console.error("FAIL " + msg); fail++; }
}

global.window = global;
global.PRng = { create: function () { return { next: function () { return 0.5; } }; } };
global.PLayers = { floorY: function () { return 226; } };
global.PAnim = { has: function () { return false; }, frameOnce: function () { return null; } };

var PFx = require("../js/fx.js");

PFx.particles.length = 0;
PFx.ingest({ events: [{ name: "throw_slam", x: 240, z: 0, d: 20 }] });
assert(PFx.particles.some(function (p) { return p.kind === "impact_large"; }),
  "throw slam routes to the large impact effect");
assert(PFx.particles.some(function (p) { return p.kind === "dust"; }),
  "throw slam still emits its floor dust");

PFx.particles.length = 0;
PFx.ingest({ events: [{ name: "ippon", x: 240, z: 0, d: 20 }] });
assert(PFx.particles.length === 1 && PFx.particles[0].kind === "impact_large",
  "ippon routes to the large impact effect instead of the light spark");

function fallbackRects(kind) {
  var rects = [];
  PFx.particles.length = 0;
  PFx.spawn(kind, 240, 0, 20);
  PFx.draw({
    fillStyle: "",
    fillRect: function (x, y, w, h) { rects.push({ x: x, y: y, w: w, h: h }); },
    drawImage: function () { rects.push({ image: true }); }
  }, { x: 0 });
  return rects;
}

var impact = fallbackRects("impact_large");
assert(impact.length >= 4 && impact.some(function (r) { return r.w >= 5 || r.h >= 5; }),
  "missing impact sheet falls back to a readable multi-part starburst");
var shock = fallbackRects("shockwave");
assert(shock.length >= 3 && shock.some(function (r) { return r.w >= 16; }),
  "missing shockwave sheet falls back to a wide ground-hugging ring");

delete global.window;
if (fail) process.exit(1);
console.log(ok + " ok, 0 fail");
