/* 480×270 world buffer + 960×540 UI buffer (PRD §4.2.2), integer-scale blit. */
(function () {
  var W = 480;
  var H = 270;
  var UW = 960;
  var UH = 540;
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
      /* Solo tag partners remain alive for bench regen but must not be drawn. */
      if (!ent || ent.alive === false || (kind === "hero" && ent.benched)) return;
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

  function drawBossHazards(ctx, state, cam, reducedMotion) {
    var c = state && state.cage, x, y, edge, i, fy;
    if (!c) return;
    if (c.walls) {
      ctx.fillStyle = reducedMotion ? "#9DEBFF" : (((state.tick >> 2) & 1) ? "#49D7FF" : "#D8FBFF");
      for (i = 0; i < 4; i++) {
        if (!c.walls[i]) continue;
        if (i === 0) ctx.fillRect(0, 186, 4, 60);
        else if (i === 1) ctx.fillRect(W - 4, 186, 4, 60);
        else {
          fy = window.PLayers ? PLayers.floorY(i === 2 ? 0 : 52) : (i === 2 ? 246 : 194);
          ctx.fillRect(0, fy - 8, W, 4);
        }
      }
    }
    if (c.shoveTel > 0) {
      edge = c.edge | 0;
      ctx.fillStyle = "rgba(224,59,59,0.72)";
      /* Match tickB5 exactly: side edges threaten every depth; near/far
         edges cover d<14 and d>46 respectively (floorY = 246-d). */
      if (edge === 0) ctx.fillRect(0, 186, 12, 60);
      else if (edge === 1) ctx.fillRect(W - 12, 186, 12, 60);
      else if (edge === 2) ctx.fillRect(0, 232, W, 14);
      else ctx.fillRect(0, 186, W, 14);
    }
    if (c.weightTel > 0 || c.weightImpactT > 0) {
      x = ((c.weightX || 240) - ((cam && cam.x) || 0)) | 0;
      y = window.PLayers ? PLayers.floorY(c.weightD || 24) : 222;
      if (c.weightTel > 0) {
        ctx.fillStyle = "rgba(224,59,59,0.66)";
        /* Weight damage is x±28 and d±14; show that entire footprint. */
        ctx.fillRect(x - 28, y - 14, 56, 28);
        ctx.fillStyle = "rgba(242,193,78,0.82)";
        ctx.fillRect(x - 20, y - 2, 40, 4);
      } else {
        ctx.fillStyle = "#2A2530"; ctx.fillRect(x - 18, y - 28, 36, 28);
        ctx.fillStyle = "#6C7385"; ctx.fillRect(x - 14, y - 24, 28, 18);
        ctx.fillStyle = "#F2C14E"; ctx.fillRect(x - 2, y - 22, 4, 14);
      }
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

  function nosmooth(c) {
    if (!c) return;
    c.imageSmoothingEnabled = false;
    if (c.webkitImageSmoothingEnabled !== undefined) c.webkitImageSmoothingEnabled = false;
    if (c.mozImageSmoothingEnabled !== undefined) c.mozImageSmoothingEnabled = false;
    if (c.msImageSmoothingEnabled !== undefined) c.msImageSmoothingEnabled = false;
  }

  function overlays(ctx, state) {
    if (window.PUI && PUI.hud) PUI.hud(ctx, state);
    if (window.PScreens && PScreens.draw) PScreens.draw(ctx, state);
    if (window.PInputTouch && PInputTouch.draw && window.PInput && PInput.lastDevice() === "touch") {
      PInputTouch.draw(ctx);
    }
  }

  function blit(state) {
    if (!window.PBoot) return;
    var vis = PBoot.canvas;
    var vctx = PBoot.ctx;
    var buf = PBoot.buffer;
    var ui = PBoot.ui;
    var uctx = PBoot.uictx;
    if (!vis || !vctx || !buf) return;
    nosmooth(vctx);
    vctx.fillStyle = "#000";
    vctx.fillRect(0, 0, vis.width, vis.height);
    if (ui && uctx) {
      nosmooth(uctx);
      uctx.drawImage(buf, 0, 0, W, H, 0, 0, UW, UH);
      uctx.save();
      uctx.scale(2, 2);
      overlays(uctx, state);
      uctx.restore();
      var k = PBoot.uiScale || 1;
      vctx.drawImage(ui, 0, 0, UW, UH, 0, 0, UW * k, UH * k);
    } else {
      var s = PBoot.scale || 1;
      vctx.drawImage(buf, 0, 0, W, H, 0, 0, W * s, H * s);
    }
  }

  function draw(state, alpha) {
    if (alpha == null) alpha = 0;
    var buf = window.PBoot && PBoot.buffer;
    var ctx = window.PBoot && PBoot.bctx;
    if (!buf || !ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#2A3B63";
    ctx.fillRect(0, 0, W, H);
    var sourceCam = camOf(state);
    var cam = { x: sourceCam.x || 0, z: sourceCam.z || 0, bgX: sourceCam.bgX,
      shakeX: sourceCam.shakeX || 0, shakeZ: sourceCam.shakeZ || 0 };
    var prefs = window.PSettings && PSettings.get ? PSettings.get() : null;
    if (prefs && prefs.reducedMotion) { cam.shakeX = 0; cam.shakeZ = 0; }
    else if (window.PFx && PFx.shake) {
      PFx.shake(cam, state);
      var shakeScale = prefs && prefs.video ? prefs.video.screenShake : 1;
      cam.shakeX *= shakeScale == null ? 1 : shakeScale;
      cam.shakeZ *= shakeScale == null ? 1 : shakeScale;
    }
    var world = worldOf(state);
    var seg = state && (state.segment || state.seg);
    var backdrop = seg && seg.arena && seg.arena.backdrop;
    if (window.PLayers) PLayers.draw(ctx, cam, world, backdrop, {
      tick: (state && state.tick) || 0,
      reducedMotion: !!(prefs && prefs.reducedMotion),
      levelId: (state && state.levelId) || (state && state.level && state.level.id) || ""
    });
    else {
      ctx.fillStyle = "#4C5F8C";
      ctx.fillRect(0, 0, W, 160);
      ctx.fillStyle = "#C8A46A";
      ctx.fillRect(0, 160, W, H - 160);
    }
    if (window.PTutorialUI) PTutorialUI.drawWorld(ctx, state, cam);
    drawBossHazards(ctx, state, cam, !!(prefs && (prefs.reducedMotion || prefs.video && prefs.video.flashReduction)));
    drawEntities(ctx, state, alpha);
    if (window.PFx) {
      PFx.ingest(state);
      PFx.step();
      PFx.draw(ctx, cam);
    }
    stamp(ctx, state);
    if (window.PTutorialUI) PTutorialUI.drawOverlay(ctx, state);
    if (!(window.PBoot && PBoot.uictx)) overlays(ctx, state);
    blit(state);
  }

  function init() {}

  var api = { draw: draw, init: init, W: W, H: H, _collect: collect };
  if (typeof window !== "undefined") window.PRender = api;
  if (typeof global !== "undefined") global.PRender = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
