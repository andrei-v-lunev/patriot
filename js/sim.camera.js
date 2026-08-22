/* Camera: plat look-ahead, belt lock, 2P clamp. */
(function () {
  var PConst = (typeof window !== "undefined" && window.PConst) || (typeof global !== "undefined" && global.PConst) || (typeof require !== "undefined" ? require("./constants") : null);

  function dt() {
    return PConst && PConst.SIM_DT ? PConst.SIM_DT : 1 / 120;
  }
  function livingHeroes(state) {
    var out = [];
    var i, e;
    for (i = 0; i < state.heroes.length; i++) {
      e = state.heroes[i];
      if (e.alive && !e.downed && !e.benched) out.push(e);
    }
    return out;
  }

  function clampHeroes(cam, living) {
    var i, e;
    if (living.length < 2) return;
    for (i = 0; i < living.length; i++) {
      e = living[i];
      if (e.x < cam.x + 8) {
        e.x = cam.x + 8;
        if (e.vx < 0) e.vx = 0;
      }
      if (e.x > cam.x + 472) {
        e.x = cam.x + 472;
        if (e.vx > 0) e.vx = 0;
      }
    }
  }

  function stepBelt(state, cam, living, t) {
    var dead = PConst && PConst.CAM_DEAD != null ? PConst.CAM_DEAD : 64;
    var maxS = PConst && PConst.CAM_MAX != null ? PConst.CAM_MAX : 180;
    var i, hx, focus, target, dx, stepx;
    if (state.autoScroll > 0) {
      state.scrollX = (state.scrollX || 0) + state.autoScroll * t;
      /* Belt arenas stay spatially locked while the moving-vehicle backdrop
         scrolls continuously. render.layers consumes bgX instead of moving
         fighters outside the authored 480 px arena. */
      cam.bgX = state.scrollX;
    } else cam.bgX = cam.x;
    if (cam.locked) return;
    if (living.length === 2) focus = (living[0].x + living[1].x) * 0.5;
    else {
      hx = living[0].x;
      for (i = 1; i < living.length; i++) if (living[i].x > hx) hx = living[i].x;
      focus = hx;
    }
    target = focus - 240;
    dx = target - cam.x;
    if (dx > -dead && dx < dead) target = cam.x;
    stepx = target - cam.x;
    if (stepx > maxS * t) stepx = maxS * t;
    if (stepx < -maxS * t) stepx = -maxS * t;
    if (stepx < 0) stepx = 0;
    cam.x += stepx;
    cam.targetX = target;
  }

  function stepPlat(state, cam, living, t) {
    var look = PConst && PConst.LOOKAHEAD != null ? PConst.LOOKAHEAD : 56;
    var k = 1 - Math.pow(0.001, t);
    var focus, maxX, hz;
    if (living.length === 2) focus = (living[0].x + living[1].x) * 0.5;
    else focus = living[0].x + living[0].facing * look;
    cam.targetX = focus - 240;
    if (state.autoScroll > 0) {
      state.scrollX = (state.scrollX || 0) + state.autoScroll * t;
      if (cam.targetX < state.scrollX) cam.targetX = state.scrollX;
    }
    cam.x += (cam.targetX - cam.x) * k;
    hz = living[0].z;
    if (living[0].grounded || hz > 90) cam.z += (hz - cam.z) * k * 0.5;
    maxX = (state.width || 0) - 480;
    if (maxX < 0) maxX = 0;
    if (cam.x < 0) cam.x = 0;
    if (cam.x > maxX) cam.x = maxX;
    if (state.autoScroll > 0) {
      for (var i = 0; i < living.length; i++) {
        if (living[i].x < cam.x + 8) { living[i].x = cam.x + 8; if (living[i].vx < 0) living[i].vx = 0; }
      }
    }
  }

  function step(state) {
    var cam = state.cam;
    var t = dt();
    var living = livingHeroes(state);
    if (!living.length) return;
    if (state.mode === "belt") stepBelt(state, cam, living, t);
    else stepPlat(state, cam, living, t);
    clampHeroes(cam, living);
  }

  var api = { step: step };
  if (typeof window !== "undefined") window.PSimCam = api;
  if (typeof global !== "undefined") global.PSimCam = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
