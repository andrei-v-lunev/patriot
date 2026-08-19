/* Object pools — never grow after boot. alloc() returns null when exhausted. */
(function () {
  function make(n, factory) {
    var free = [];
    var all = [];
    var i;
    for (i = 0; i < n; i++) {
      var o = factory(i);
      o._pool = true;
      o.alive = false;
      all.push(o);
      free.push(o);
    }
    return {
      size: n,
      all: all,
      free: free,
      alloc: function () {
        if (!free.length) return null;
        var x = free.pop();
        x.alive = true;
        return x;
      },
      release: function (o) {
        if (!o || !o._pool) return;
        o.alive = false;
        free.push(o);
      },
      reset: function () {
        free.length = 0;
        for (i = 0; i < all.length; i++) {
          all[i].alive = false;
          free.push(all[i]);
        }
      },
      inUse: function () {
        return n - free.length;
      }
    };
  }

  function blankEnt(i) {
    return {
      id: i,
      alive: false,
      kind: "",
      team: "",
      archetype: "",
      x: 0,
      z: 0,
      d: 0,
      vx: 0,
      vz: 0,
      vd: 0,
      w: 20,
      h: 40,
      dw: 12,
      mode: "plat",
      grounded: true,
      facing: 1,
      hp: 1,
      maxHp: 1,
      combatState: "FREE",
      stateT: 0,
      iFrames: 0,
      recoveryT: 0
    };
  }

  function create() {
    return {
      heroes: make(2, blankEnt),
      enemies: make(12, blankEnt),
      moves: make(24, function (i) {
        return {
          id: i,
          alive: false,
          defId: "",
          tick: 0,
          phase: 0,
          ownerId: -1,
          hitIds: [0, 0, 0, 0, 0, 0, 0, 0],
          hitN: 0,
          cancelled: false
        };
      }),
      projectiles: make(20, function (i) {
        return {
          id: i,
          alive: false,
          kind: "",
          x: 0,
          z: 0,
          d: 0,
          vx: 0,
          vz: 0,
          w: 12,
          h: 12,
          dmg: 0,
          ownerId: -1,
          hitIds: [0, 0, 0, 0, 0, 0, 0, 0],
          hitN: 0,
          life: 0
        };
      }),
      fx: make(96, function (i) {
        return { id: i, alive: false, kind: "", x: 0, z: 0, d: 0, t: 0 };
      }),
      events: make(32, function (i) {
        return { id: i, alive: false, name: "", a: 0, b: 0 };
      }),
      pickups: make(8, function (i) {
        return { id: i, alive: false, kind: "", x: 0, z: 0, d: 0, life: 0 };
      })
    };
  }

  var api = { create: create, make: make };
  if (typeof window !== "undefined") window.PPools = api;
  if (typeof global !== "undefined") global.PPools = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
