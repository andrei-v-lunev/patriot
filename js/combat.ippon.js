/* THE PATRIOT — IPPON chain. Timer is 60fps frames; decrement every 2 sim ticks. */
(function () {
  var C = typeof PConst !== "undefined" ? PConst : {};
  if (!C.SIM_HZ && typeof require === "function") {
    try {
      C = require("./constants");
    } catch (eC) {
      C = C || {};
    }
  }

  var THRESH = [
    { n: 3, name: "NICE" },
    { n: 5, name: "WAZA-ARI" },
    { n: 8, name: "IPPON" },
    { n: 12, name: "IPPON GACHI" },
    { n: 16, name: "KODOKAN" }
  ];

  function ensure(state) {
    if (!state.ippon) {
      state.ippon = { chain: 0, timer: 0, banner: "", score: 0, mul: 1, throwScore: 0 };
    }
    return state.ippon;
  }

  function bannerOf(n) {
    var i, best = "";
    for (i = 0; i < THRESH.length; i++) {
      if (n >= THRESH[i].n) best = THRESH[i].name;
    }
    return best;
  }

  function mulOf(chain) {
    var m = 1 + 0.04 * (chain > 1 ? chain - 1 : 0);
    if (m > 1.6) m = 1.6;
    return m;
  }

  function extendChain(state, n) {
    if (!state) return 0;
    var p = ensure(state);
    n = n == null ? 1 : n | 0;
    p.chain = (p.chain | 0) + n;
    p.timer = C.IPPON_F || 300;
    p.banner = bannerOf(p.chain);
    p.mul = mulOf(p.chain);
    return p.chain;
  }

  function breakChain(state) {
    if (!state) return;
    var p = ensure(state);
    p.chain = 0;
    p.timer = 0;
    p.banner = "";
    p.mul = 1;
  }

  function mul(state) {
    if (!state || !state.ippon) return 1;
    return state.ippon.mul || 1;
  }

  function addThrowScore(state, baseDmg) {
    if (!state) return 0;
    var p = ensure(state);
    var ts = (baseDmg || 0) * 10;
    var bonus = ts * 0.04 * ((p.chain | 0) > 1 ? (p.chain | 0) - 1 : 0);
    p.throwScore = ts;
    p.score += ts + bonus;
    return ts + bonus;
  }

  function addWallScore(state) {
    var p = ensure(state);
    p.score += 120;
  }

  function addFfKill(state) {
    var p = ensure(state);
    p.score += 150;
  }

  function tick(state) {
    if (!state) return;
    var p = state.ippon;
    if (!p || !p.chain || p.timer <= 0) return;
    if (state.paused) return;
    if (((state.tick | 0) % 2) !== 0) return;
    p.timer -= 1;
    if (p.timer <= 0) breakChain(state);
  }

  var api = {
    THRESH: THRESH,
    extendChain: extendChain,
    breakChain: breakChain,
    mul: mul,
    addThrowScore: addThrowScore,
    addWallScore: addWallScore,
    addFfKill: addFfKill,
    tick: tick,
    bannerOf: bannerOf
  };
  if (typeof window !== "undefined") window.PCombatIppon = api;
  if (typeof global !== "undefined") global.PCombatIppon = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
