/* Platform X/Z integrate. z+ = up. */
(function () {
  var PConst = (typeof window !== "undefined" && window.PConst) || (typeof global !== "undefined" && global.PConst) || (typeof require !== "undefined" ? require("./constants") : null);
  var PData = (typeof window !== "undefined" && window.PData) || (typeof global !== "undefined" && global.PData) || (typeof require !== "undefined" ? require("./data") : null);

  function dt() {
    return PConst && PConst.SIM_DT ? PConst.SIM_DT : 1 / 120;
  }
  function toTicks(f) {
    return PData && PData.toTicks ? PData.toTicks(f) : (f | 0) * 2;
  }
  function apexV() {
    return PConst && PConst.APEX_V != null ? PConst.APEX_V : 40;
  }

  // PRD-DEVIATION: one-way uses Part 6 (vz<=0 && prevBottom >= top-1), not Part 2 prevBottom <= top+2.
  function oneWayBlocks(s, e, prevZ) {
    if (s.type !== "oneway") return true;
    if (e.dropT > 0) return false;
    return e.vz <= 0 && prevZ >= s.z + s.h - 1;
  }

  function supported(state, e) {
    var solids = state.solids || [];
    var hw = e.w * 0.5;
    var i, s, top;
    for (i = 0; i < solids.length; i++) {
      s = solids[i];
      if (s.type === "oneway" && e.dropT > 0) continue;
      top = s.z + s.h;
      if (e.z < top - 1 || e.z > top + 0.51) continue;
      if (e.x - hw < s.x + s.w && e.x + hw > s.x) {
        if (s.type === "oneway" && e.vz > 0) continue;
        return i;
      }
    }
    return -1;
  }

  function accelX(e, intent, t) {
    var st = e.stats || {};
    var mx = intent.moveX || 0;
    var cap = e.grounded ? (st.runMax || 150) : (st.airMax || st.runMax || 150);
    var a, f;
    if (e.mode === "belt" && intent.moveD) cap *= PConst && PConst.DIAG ? PConst.DIAG : 0.894;
    if (e.grounded) {
      if (mx) {
        a = st.groundAccel || 1200;
        if (e.vx && (mx > 0) !== (e.vx > 0)) a *= st.turnMul || 2;
        e.vx += a * mx * t;
      } else {
        f = (st.groundFric || 1800) * t;
        if (e.vx > f) e.vx -= f;
        else if (e.vx < -f) e.vx += f;
        else e.vx = 0;
      }
    } else {
      a = st.airAccel || 600;
      if (e.mode === "belt") a *= 0.75;
      if (mx) e.vx += a * mx * t;
      else {
        f = (st.airDrag || 240) * t;
        if (e.vx > f) e.vx -= f;
        else if (e.vx < -f) e.vx += f;
        else e.vx = 0;
      }
    }
    if (e.vx > cap) e.vx = cap;
    if (e.vx < -cap) e.vx = -cap;
    if (mx > 0) e.facing = 1;
    else if (mx < 0) e.facing = -1;
  }

  function applyJump(state, e, intent) {
    var st = e.stats || {};
    var hz = 120;
    var coy = Math.round((st.coyote || 0.1) * hz);
    var buf = Math.round((st.jumpBuf || 0.117) * hz);
    var dropN = toTicks(PConst && PConst.DROP_F != null ? PConst.DROP_F : 18);
    var onw, want, can;
    if (e.dropT > 0) e.dropT--;
    if (intent.jumpPressed) e.jumpBufT = buf;
    want = intent.jumpPressed || e.jumpBufT > 0;
    can = e.grounded || e.coyoteT > 0;
    if (e.grounded) e.coyoteT = coy;
    else if (e.coyoteT > 0) e.coyoteT--;
    if (e.jumpBufT > 0) e.jumpBufT--;
    if (want && intent.moveD < 0 && e.grounded) {
      onw = supported(state, e);
      if (onw >= 0 && state.solids[onw].type === "oneway") {
        e.dropT = dropN;
        e.dropId = onw;
        e.grounded = false;
        e.coyoteT = 0;
        e.jumpBufT = 0;
        return;
      }
    }
    if (want && can) {
      e.vz = e.mode === "belt" ? (st.beltJumpV || 400) : (st.jumpV || 470);
      e.grounded = false;
      e.coyoteT = 0;
      e.jumpBufT = 0;
    }
  }

  function gravity(e, intent, t) {
    var st = e.stats || {};
    var g, av;
    if (e.grounded) {
      e.vz = 0;
      return;
    }
    av = apexV();
    if (e.mode === "belt") g = st.beltJumpG || 2100;
    else if (Math.abs(e.vz) < av) g = st.apexG || 1050;
    else if (e.vz > 0) g = intent.jump ? (st.riseG || 1500) : (st.cutG || 2900);
    else g = st.fallG || 1900;
    e.vz -= g * t;
    if (e.vz < -(st.maxFall || 760)) e.vz = -(st.maxFall || 760);
  }

  function resolveX(state, e, t) {
    var solids = state.solids || [];
    var hw = e.w * 0.5;
    var nx = e.x + e.vx * t;
    var el = nx - hw, er = nx + hw, eb = e.z, et = e.z + e.h;
    var i, s, hit;
    for (i = 0; i < solids.length; i++) {
      s = solids[i];
      if (s.type === "oneway") continue;
      if (el < s.x + s.w && er > s.x && eb < s.z + s.h && et > s.z) {
        hit = true;
        if (e.vx > 0) nx = s.x - hw;
        else if (e.vx < 0) nx = s.x + s.w + hw;
      }
    }
    if (hit) e.vx = 0;
    e.x = nx;
  }

  function resolveZ(state, e, t) {
    var solids = state.solids || [];
    var hw = e.w * 0.5;
    var prevZ = e.z;
    var nz = e.z + e.vz * t;
    var el = e.x - hw, er = e.x + hw;
    var i, s, eb, et, sup, was = e.grounded;
    e.grounded = false;
    for (i = 0; i < solids.length; i++) {
      s = solids[i];
      if (!oneWayBlocks(s, e, prevZ)) continue;
      eb = nz;
      et = nz + e.h;
      if (!(el < s.x + s.w && er > s.x && eb < s.z + s.h && et > s.z)) continue;
      if (e.vz > 0 && prevZ + e.h <= s.z + 1) {
        nz = s.z - e.h;
        e.vz = 0;
      } else {
        nz = s.z + s.h;
        e.vz = 0;
        e.grounded = true;
      }
    }
    e.z = nz;
    if (!e.grounded && e.vz <= 0) {
      sup = supported(state, e);
      if (sup >= 0) {
        e.grounded = true;
        e.vz = 0;
        e.z = solids[sup].z + solids[sup].h;
      }
    }
    if (e.grounded && !was && e.kind === "hero") {
      e.recoveryT = toTicks(e.mode === "belt" ? 6 : ((e.stats && e.stats.landSoft) || 4));
    }
  }

  function integrate(state, e, intent) {
    var t = dt();
    if (!intent) intent = { moveX: 0, moveD: 0, jump: false, jumpPressed: false };
    if (e.mode === "plat") {
      e.d = state.dLock != null ? state.dLock : 24;
      e.vd = 0;
    }
    applyJump(state, e, intent);
    accelX(e, intent, t);
    resolveX(state, e, t);
    if (e.grounded && supported(state, e) < 0) e.grounded = false;
    gravity(e, intent, t);
    resolveZ(state, e, t);
  }

  var api = { integrate: integrate, supported: supported };
  if (typeof window !== "undefined") window.PSimPlat = api;
  if (typeof global !== "undefined") global.PSimPlat = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
