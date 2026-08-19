"use strict";

/* Tests for js/render.anim.js — PAnim frame math.
   Phase 1: require the module with no window/Image/fetch present at all
   (the plain `node test/anim.test.js` environment) and confirm it degrades
   gracefully instead of throwing.
   Phase 2: install a light fetch+Image shim (no mocking of PAnim itself,
   just standing in for the DOM/network APIs PAnim.load() needs) so the
   real frame/frameOnce/frameAt math can be exercised against a real atlas
   object, the same way test/harness.js shims things for other modules. */

var path = require("path");
var assert = require("assert");

var ROOT = path.join(__dirname, "..");
var ANIM_PATH = path.join(ROOT, "js", "render.anim.js");

var fails = 0;
var oks = 0;

function ok(cond, msg) {
  if (cond) {
    console.log("ok", msg);
    oks++;
  } else {
    console.error("FAIL", msg);
    process.exitCode = 1;
    fails++;
  }
}

/* ---- Phase 1: atlas absent (no window/Image/fetch in this process yet) ---- */

(function absentAtlasPhase() {
  delete require.cache[require.resolve(ANIM_PATH)];
  var PAnim = require(ANIM_PATH);

  ok(typeof PAnim.frame === "function", "PAnim.frame is exported");
  ok(PAnim.ready() === false, "ready() is false before load() is called");

  var doneCalled = false;
  PAnim.load(function () { doneCalled = true; });

  ok(doneCalled === true, "load() done callback fires synchronously when window/Image/fetch are absent");
  ok(PAnim.ready() === true, "ready() becomes true in Node with no DOM present");
  ok(PAnim.frame("walk10", 12) === null, "frame() returns null when atlas never loaded");
  ok(PAnim.frameOnce("walk10", 12) === null, "frameOnce() returns null when atlas never loaded");
  ok(PAnim.frameAt("walk10", 0) === null, "frameAt() returns null when atlas never loaded");
  ok(PAnim.has("walk10") === false, "has() is false when atlas never loaded");
  ok(PAnim.meta("walk10") === null, "meta() is null when atlas never loaded");

  /* load() again after readyFlag is already true: done callback still fires,
     without re-entering the fetch branch. */
  var doneCalledAgain = false;
  PAnim.load(function () { doneCalledAgain = true; });
  ok(doneCalledAgain === true, "load() done callback still fires on a second call once already ready");
})();

/* ---- Phase 2: light fetch + Image shim, real atlas, real frame math ---- */

var ATLAS = {
  walk10: { path: "walk10.png", fw: 8, fh: 16, fps: 10, frames: 8 },
  walk12: { path: "walk12.png", fw: 8, fh: 16, fps: 12, frames: 6 },
  walk15: { path: "walk15.png", fw: 8, fh: 16, fps: 15, frames: 4 },
  walk20: { path: "walk20.png", fw: 8, fh: 16, fps: 20, frames: 5 },
  onceMove: { path: "once.png", fw: 8, fh: 16, fps: 10, frames: 5 }
};

function installShims() {
  global.window = {};
  global.Image = function FakeImage() {
    var self = this;
    var src;
    Object.defineProperty(self, "src", {
      get: function () { return src; },
      set: function (v) {
        src = v;
        /* Resolve "load" asynchronously, like a real <img>. */
        setTimeout(function () {
          self.naturalWidth = 64;
          self.naturalHeight = 16;
          self.width = 64;
          self.height = 16;
          if (self.onload) self.onload();
        }, 0);
      }
    });
  };
  global.fetch = function (url) {
    ok(url === "assets/atlas/atlas.json", "fetch() requests the expected atlas.json path");
    return Promise.resolve({
      ok: true,
      json: function () { return Promise.resolve(ATLAS); }
    });
  };
}

installShims();
delete require.cache[require.resolve(ANIM_PATH)];
var PAnim2 = require(ANIM_PATH);

PAnim2.load(function () {
  ok(PAnim2.ready() === true, "ready() true after real load() completes");
  ok(PAnim2.has("walk10") === true, "has() true for a loaded sheet id");
  ok(PAnim2.has("nope") === false, "has() false for a missing id");
  ok(PAnim2.meta("nope") === null, "meta() null for a missing id");
  var m10 = PAnim2.meta("walk10");
  ok(!!m10 && m10.fps === 10 && m10.frames === 8, "meta() returns the atlas entry for a known id");

  /* --- frame(): looping correctness at various fps, 60Hz tick base --- */

  function expectFrame(id, fps, n, tick) {
    var want = Math.floor(((tick | 0) * fps) / 60) % n;
    var got = PAnim2.frame(id, tick);
    ok(!!got, "frame(" + id + "," + tick + ") is non-null");
    ok(got.sx === want * 8, "frame(" + id + "," + tick + ") step=" + want + " (fps=" + fps + ",n=" + n + ") sx=" + (got.sx) + " want " + (want * 8));
  }

  // fps=10, n=8 -> 6 ticks/frame, wraps at tick 48
  expectFrame("walk10", 10, 8, 0);
  expectFrame("walk10", 10, 8, 5);
  expectFrame("walk10", 10, 8, 6);
  expectFrame("walk10", 10, 8, 47); // last frame before wrap
  ok(PAnim2.frame("walk10", 48).sx === 0, "walk10 loops back to frame 0 at tick 48");

  // fps=12, n=6 -> 5 ticks/frame, wraps at tick 30
  expectFrame("walk12", 12, 6, 29);
  ok(PAnim2.frame("walk12", 30).sx === 0, "walk12 loops back to frame 0 at tick 30");

  // fps=15, n=4 -> 4 ticks/frame, wraps at tick 16
  expectFrame("walk15", 15, 4, 15);
  ok(PAnim2.frame("walk15", 16).sx === 0, "walk15 loops back to frame 0 at tick 16");

  // fps=20, n=5 -> 3 ticks/frame, wraps at tick 15
  expectFrame("walk20", 20, 5, 14);
  ok(PAnim2.frame("walk20", 15).sx === 0, "walk20 loops back to frame 0 at tick 15");

  // Negative/garbage tick never yields a negative step.
  var negFrame = PAnim2.frame("walk10", -3);
  ok(negFrame.sx === 0, "frame() with a negative tick clamps to step 0, got sx=" + negFrame.sx);

  /* --- frameOnce(): steps then clamps on the last frame --- */

  ok(PAnim2.frameOnce("onceMove", 0).sx === 0, "frameOnce() starts at frame 0");
  ok(PAnim2.frameOnce("onceMove", 6).sx === 8, "frameOnce() advances one frame after 6 ticks at fps 10");
  ok(PAnim2.frameOnce("onceMove", 24).sx === 4 * 8, "frameOnce() reaches the last frame (index 4) at tick 24");
  ok(PAnim2.frameOnce("onceMove", 1000).sx === 4 * 8, "frameOnce() clamps to the last frame far past the end");
  ok(PAnim2.frameOnce("onceMove", -5).sx === 0, "frameOnce() with a negative ticksSinceStart clamps to step 0");

  /* --- frameAt(): explicit index, clamped --- */

  ok(PAnim2.frameAt("walk10", 0).sx === 0, "frameAt() index 0");
  ok(PAnim2.frameAt("walk10", 3).sx === 3 * 8, "frameAt() returns the requested index");
  ok(PAnim2.frameAt("walk10", 7).sx === 7 * 8, "frameAt() at the last valid index (n-1)");
  ok(PAnim2.frameAt("walk10", 999).sx === 7 * 8, "frameAt() clamps an out-of-range index to n-1");
  ok(PAnim2.frameAt("walk10", -50).sx === 0, "frameAt() clamps a negative index to 0");

  console.log((oks) + " ok, " + fails + " fail");
  if (fails) process.exitCode = 1;
});
