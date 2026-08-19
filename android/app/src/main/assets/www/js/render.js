/* 480×270 offscreen, integer-scale blit. Paints the whole buffer every frame. */
(function () {
  var W = 480;
  var H = 270;
  var sortBuf = [];
  var i;
  for (i = 0; i < 64; i++) sortBuf.push({ d: 0, id: 0, kind: "", ent: null });

  function list(x) {
    if (!x) return [];
    if (x.all) return x.all;
    return x;
  }

  function worldOf(state) {
    if (!state) return 1;
    if (state.level && state.level.world) return state.level.world;
    var id = (state.level && (state.level.id || state.level.worldName)) || "";
    if (id[0] === "w" || id[0] === "W") return parseInt(id[1], 10) || 1;
    return 1;
  }

  function camOf(state) {
    return (state && state.cam) || { x: 0, z: 0, shakeX: 0, shakeZ: 0 };
  }

  function insertSort(n) {
    var a, j, t;
    for (a = 1; a < n; a++) {
      t = sortBuf[a];
      j = a;
      while (
        j > 0 &&
        (sortBuf[j - 1].d < t.d ||
          (sortBuf[j - 1].d === t.d && sortBuf[j - 1].id > t.id))
      ) {
        sortBuf[j] = sortBuf[j - 1];
        j--;
      }
      sortBuf[j] = t;
    }
  }

  function collect(state) {
    var n = 0;
    function add(ent, kind) {
      if (!ent || ent.alive === false) return;
      if (n >= 64) return;
      var slot = sortBuf[n];
      slot.d = ent.d || 0;
      slot.id = ent.id == null ? n : ent.id;
      slot.kind = kind;
      slot.ent = ent;
      n++;
    }
    var hs = list(state && state.heroes);
    var es = list(state && state.enemies);
    var ps = list(state && state.pickups);
    var pr = list(state && state.projectiles);
    var i;
    for (i = 0; i < ps.length; i++) add(ps[i], "pickup");
    for (i = 0; i < es.length; i++) add(es[i], "enemy");
    for (i = 0; i < pr.length; i++) add(pr[i], "proj");
    for (i = 0; i < hs.length; i++) add(hs[i], "hero");
    return n;
  }

  function beltMode(state) {
    if (!state) return true;
    if (state.mode === "plat") return false;
    var seg = state.seg || state.segment;
    if (seg && seg.mode === "plat") return false;
    return true;
  }

  function drawEntities(ctx, state, alpha) {
    var n = collect(state);
    var cam = camOf(state);
    var i;
    if (beltMode(state)) insertSort(n);
    for (i = 0; i < n; i++) {
      if (window.PSprites) PSprites.drawEntity(ctx, sortBuf[i].ent, cam, alpha);
    }
  }

  function stamp(ctx, state) {
    if (!window.PFont) return;
    var ip = state && state.ippon;
    if (ip && (ip.chain >= 8 || ip.stamp || ip.active)) {
      var s = (window.PData && PData.getString) ? PData.getString("IPPON") : "ИППОН!";
      var w = PFont.measure(s, 2);
      PFont.draw(ctx, s, (480 - w) >> 1, 108, 2, "#F2C14E");
    }
    var go = state && state.go;
    if (go && go.active) {
      var g = (window.PData && PData.getString) ? PData.getString("GO") : "ВПЕРЁД ➜";
      var t = (state.tick || 0);
      var bob = ((Math.sin(t / 20) * 4) | 0);
      var a = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t / 12));
      ctx.globalAlpha = a;
      PFont.draw(ctx, g, 360 + bob, 128, 1, "#F2C14E");
      ctx.globalAlpha = 1;
    }
  }

  function blit() {
    if (!window.PBoot) return;
    var vis = PBoot.canvas;
    var vctx = PBoot.ctx;
    var buf = PBoot.buffer;
    var s = PBoot.scale || 1;
    if (!vis || !vctx || !buf) return;
    vctx.imageSmoothingEnabled = false;
    if (vctx.webkitImageSmoothingEnabled !== undefined) vctx.webkitImageSmoothingEnabled = false;
    vctx.fillStyle = "#000";
    vctx.fillRect(0, 0, vis.width, vis.height);
    vctx.drawImage(buf, 0, 0, W, H, 0, 0, W * s, H * s);
  }

  function draw(state, alpha) {
    if (alpha == null) alpha = 0;
    var buf = window.PBoot && PBoot.buffer;
    var ctx = window.PBoot && PBoot.bctx;
    if (!buf || !ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#2A3B63";
    ctx.fillRect(0, 0, W, H);
    var cam = camOf(state);
    if (window.PFx && PFx.shake) PFx.shake(cam, state);
    var world = worldOf(state);
    if (window.PLayers) PLayers.draw(ctx, cam, world);
    else {
      ctx.fillStyle = "#4C5F8C";
      ctx.fillRect(0, 0, W, 160);
      ctx.fillStyle = "#C8A46A";
      ctx.fillRect(0, 160, W, H - 160);
    }
    drawEntities(ctx, state, alpha);
    if (window.PFx) {
      PFx.ingest(state);
      PFx.step();
      PFx.draw(ctx, cam);
    }
    stamp(ctx, state);
    if (window.PUI && PUI.hud) PUI.hud(ctx, state);
    if (window.PScreens && PScreens.draw) PScreens.draw(ctx, state);
    if (window.PInputTouch && PInputTouch.draw && window.PInput && PInput.lastDevice() === "touch") {
      PInputTouch.draw(ctx);
    }
    blit();
  }

  function init() {}

  var api = { draw: draw, init: init, W: W, H: H };
  if (typeof window !== "undefined") window.PRender = api;
  if (typeof global !== "undefined") global.PRender = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
