/* Belt depth, gates, GO advance, mode swap. */
(function () {
  var PConst = (typeof window !== "undefined" && window.PConst) || (typeof global !== "undefined" && global.PConst) || (typeof require !== "undefined" ? require("./constants") : null);
  var PData = (typeof window !== "undefined" && window.PData) || (typeof global !== "undefined" && global.PData) || (typeof require !== "undefined" ? require("./data") : null);
  var PSimPlat = (typeof window !== "undefined" && window.PSimPlat) || (typeof global !== "undefined" && global.PSimPlat) || (typeof require !== "undefined" ? require("./sim.plat") : null);

  function dt() {
    return PConst && PConst.SIM_DT ? PConst.SIM_DT : 1 / 120;
  }
  function toTicks(f) {
    return PData && PData.toTicks ? PData.toTicks(f) : (f | 0) * 2;
  }
  function ps() {
    return (typeof window !== "undefined" && window.PSim) || (typeof global !== "undefined" && global.PSim) || null;
  }
  function band(state) {
    var a = state.segment && state.segment.arena;
    return {
      dMin: a && a.dMin != null ? a.dMin : state.dMin != null ? state.dMin : 0,
      dMax: a && a.dMax != null ? a.dMax : state.dMax != null ? state.dMax : 60
    };
  }

  function moveD(state, e, intent, t) {
    var st = e.stats || {};
    var md = intent.moveD || 0;
    var mx = intent.moveX || 0;
    var ratio = PConst && PConst.DEPTH_RATIO != null ? PConst.DEPTH_RATIO : 0.6;
    var diag = PConst && PConst.DIAG != null ? PConst.DIAG : 0.894;
    var cap = (st.runMax || 150) * ratio;
    var a, f, b;
    if (mx && md) cap *= diag;
    if (!e.grounded) {
      e.vd = 0;
    } else if (md) {
      a = st.groundAccel || 1200;
      if (e.vd && (md > 0) !== (e.vd > 0)) a *= st.turnMul || 2;
      e.vd += a * md * t;
      if (e.vd > cap) e.vd = cap;
      if (e.vd < -cap) e.vd = -cap;
    } else {
      f = (st.groundFric || 1800) * t;
      if (e.vd > f) e.vd -= f;
      else if (e.vd < -f) e.vd += f;
      else e.vd = 0;
    }
    if (e.grounded) e.d += e.vd * t;
    b = band(state);
    if (e.d < b.dMin) {
      e.d = b.dMin;
      e.vd = 0;
    }
    if (e.d > b.dMax) {
      e.d = b.dMax;
      e.vd = 0;
    }
  }

  function clampGates(state, e) {
    var a = state.segment && state.segment.arena;
    var hw, lo, hi;
    if (!a) return;
    if (e.kind === "hero" && !state.cam.locked && !(state.go && state.go.active)) return;
    hw = e.w * 0.5;
    lo = a.xMin;
    hi = a.xMax;
    if (e.kind === "hero" && state.go && state.go.active) hi = a.xMax + 1e6;
    if (e.x - hw < lo) {
      e.x = lo + hw;
      if (e.vx < 0) e.vx = 0;
    }
    if (e.x + hw > hi) {
      e.x = hi - hw;
      if (e.vx > 0) e.vx = 0;
    }
  }

  function integrate(state, e, intent) {
    var t = dt();
    if (!intent) intent = { moveX: 0, moveD: 0, jump: false, jumpPressed: false };
    if (PSimPlat) PSimPlat.integrate(state, e, intent);
    moveD(state, e, intent, t);
    clampGates(state, e);
  }

  function overlapXz(a, b) {
    var ah = a.w * 0.5, bh = b.w * 0.5;
    return a.x - ah < b.x + bh && a.x + ah > b.x - bh && a.z < b.z + b.h && a.z + a.h > b.z;
  }

  function pushBodies(state) {
    var all = [], i, j, a, b, push, tol, spd;
    for (i = 0; i < state.heroes.length; i++) if (state.heroes[i].alive && !state.heroes[i].benched) all.push(state.heroes[i]);
    for (i = 0; i < state.enemies.length; i++) if (state.enemies[i].alive) all.push(state.enemies[i]);
    spd = PConst && PConst.PUSH_SPEED != null ? PConst.PUSH_SPEED : 40;
    tol = PConst && PConst.DEPTH_HIT != null ? PConst.DEPTH_HIT : 10;
    push = spd * dt();
    for (i = 0; i < all.length; i++) {
      a = all[i];
      for (j = i + 1; j < all.length; j++) {
        b = all[j];
        if (a.team !== b.team) continue;
        if (Math.abs(a.d - b.d) > tol) continue;
        if (!overlapXz(a, b)) continue;
        if (a.x <= b.x) {
          a.x -= push;
          b.x += push;
        } else {
          a.x += push;
          b.x -= push;
        }
      }
    }
  }

  function releaseGrips(state) {
    var rec = toTicks(6);
    var i, e, lists = [state.heroes, state.enemies];
    var li, arr;
    for (li = 0; li < 2; li++) {
      arr = lists[li];
      for (i = 0; i < arr.length; i++) {
        e = arr[i];
        if (e.combatState === "GRIPPED" || e.combatState === "APPROACH" || e.gripId >= 0) {
          e.combatState = "FREE";
          e.gripId = -1;
          e.recoveryT = rec;
        }
      }
    }
  }

  function beginSwap(state, idx) {
    var air = false, i, e;
    if (state.pendingSeg >= 0) return;
    releaseGrips(state);
    for (i = 0; i < state.heroes.length; i++) {
      e = state.heroes[i];
      if (e.alive && !e.grounded) air = true;
    }
    if (air) {
      state.pendingSeg = idx;
      state.airSwapT = toTicks(PConst && PConst.AIR_SWAP_GRACE_F != null ? PConst.AIR_SWAP_GRACE_F : 30);
    } else {
      state.pendingSeg = -1;
      if (ps() && ps().applySegment) ps().applySegment(state, idx);
    }
  }

  function tryModeSwap(state) {
    var ready = true, i;
    if (state.pendingSeg < 0) return;
    for (i = 0; i < state.heroes.length; i++) {
      if (state.heroes[i].alive && !state.heroes[i].grounded) ready = false;
    }
    state.airSwapT--;
    if (ready || state.airSwapT <= 0) {
      if (ps() && ps().applySegment) ps().applySegment(state, state.pendingSeg);
      state.pendingSeg = -1;
    }
  }

  function tryAdvance(state) {
    var a = state.segment && state.segment.arena;
    var zone, i, e, living = 0, inZ = 0, next;
    if (!a || !state.go || !state.go.active || !state.go.opened) return;
    zone = a.xMax - ((PConst && PConst.GO_ZONE) || 180);
    for (i = 0; i < state.heroes.length; i++) {
      e = state.heroes[i];
      if (!e.alive || e.downed || e.benched) continue;
      living++;
      if (e.x >= zone) inZ++;
    }
    state.go.blocked = !(living && inZ === living);
    state.go.canAdvance = living > 0 && inZ === living;
    if (living && inZ === living) {
      next = state.segIndex + 1;
      if (state.level && state.level.segments && next < state.level.segments.length) beginSwap(state, next);
      else {
        state.go.opened = true;
        /* Last segment cleared+exited: emit level completion for the UI. */
        if (!state.results) state.results = { score: state.score, levelId: state.levelId };
      }
    }
  }

  function platExit(state) {
    var w, i, e, next;
    if (state.mode !== "plat" || !state.level) return;
    if (state.levelId === "w1l1" && state.tutorial && !state.tutorial.done) return;
    w = state.width || 0;
    for (i = 0; i < state.heroes.length; i++) {
      e = state.heroes[i];
      if (e.alive && !e.benched && e.x > w - 24) {
        next = state.segIndex + 1;
        if (state.level.segments && next < state.level.segments.length) beginSwap(state, next);
        else if (!state.results) state.results = { score: state.score, levelId: state.levelId };
        return;
      }
    }
  }

  function tick(state) {
    var openN = toTicks(PConst && PConst.GATE_DESPAWN_F != null ? PConst.GATE_DESPAWN_F : 10);
    if (state.go && state.go.active) {
      state.go.openT = (state.go.openT || 0) + 1;
      if (state.go.openT >= openN) state.go.opened = true;
      tryAdvance(state);
    }
    platExit(state);
    tryModeSwap(state);
  }

  function onEnter(state, seg) {
    if (!seg || !seg.arena) return;
    state.cam.x = seg.arena.camX || 0;
    state.cam.targetX = state.cam.x;
    state.cam.bgX = 0;
    state.cam.locked = true;
    state.xMin = seg.arena.xMin;
    state.xMax = seg.arena.xMax;
  }

  var api = {
    integrate: integrate,
    pushBodies: pushBodies,
    tick: tick,
    onEnter: onEnter,
    beginSwap: beginSwap
  };
  if (typeof window !== "undefined") window.PSimBelt = api;
  if (typeof global !== "undefined") global.PSimBelt = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
