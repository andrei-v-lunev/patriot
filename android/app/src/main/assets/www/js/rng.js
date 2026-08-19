/* mulberry32 — Part 6 §3.3.4. One sim stream; FX uses a separate clock RNG. */
(function () {
  function create(seed) {
    var a = (seed == null ? 1337 : seed) | 0;
    function next() {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return {
      next: next,
      float: next,
      int: function (n) {
        return (next() * n) | 0;
      },
      chance: function (p) {
        return next() < p;
      },
      range: function (lo, hi) {
        return lo + next() * (hi - lo);
      },
      getState: function () {
        return a;
      },
      setState: function (v) {
        a = v | 0;
      }
    };
  }

  var api = { create: create };
  if (typeof window !== "undefined") window.PRng = api;
  if (typeof global !== "undefined") global.PRng = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
