/* Entity sprites: atlas animation via PAnim, procedural pixel fallback. */
(function () {
  var images = {};
  var PATHS = [
    "assets/portraits/idris-192.png",
    "assets/portraits/otajon-192.png",
    "assets/portraits/idris-preview.png",
    "assets/portraits/otajon-preview.png",
    "assets/ref/idris-pixel-base.png",
    "assets/ref/otajon-pixel-base.png",
    "assets/ref/idris-portrait-192-preview.png",
    "assets/ref/otajon-portrait-192-preview.png",
    "assets/bg/w1-dawn.png"
  ];

  function load(done) {
    var n = 0;
    var t = PATHS.length;
    if (typeof window !== "undefined" && window.PAnim && PAnim.load) PAnim.load(null);
    function one() {
      n++;
      if (n >= t && done) done(images);
    }
    if (typeof Image === "undefined") {
      if (done) done(images);
      return;
    }
    var i, img, src;
    for (i = 0; i < PATHS.length; i++) {
      src = PATHS[i];
      img = new Image();
      images[src] = img;
      img.onload = one;
      img.onerror = one;
      img.src = src;
    }
    if (!t && done) done(images);
  }

  function ready(img) {
    return img && img.complete && img.naturalWidth > 0;
  }

  function pick() {
    var i, src;
    for (i = 0; i < arguments.length; i++) {
      src = arguments[i];
      if (ready(images[src])) return images[src];
    }
    return null;
  }

  function heroId(e) {
    var k = (e && (e.heroId || e.hero || e.kind || e.archetype || e.id || "")) + "";
    k = k.toLowerCase();
    if (k.indexOf("otajon") >= 0 || k === "o") return "otajon";
    if (k.indexOf("idris") >= 0 || k === "i") return "idris";
    if (e && e.slot === 1) return "otajon";
    return "idris";
  }

  function simTick() {
    var g = (typeof window !== "undefined" && window.PGame) ||
      (typeof global !== "undefined" && global.PGame) || null;
    var s = g && g.state;
    return (s && s.tick) | 0;
  }

  function anim() {
    var a = (typeof window !== "undefined" && window.PAnim) ||
      (typeof global !== "undefined" && global.PAnim) || null;
    return a && a.ready && a.ready() ? a : null;
  }

  function moving(e) {
    return e.grounded !== false && (Math.abs(e.vx || 0) + Math.abs(e.vd || 0)) > 10;
  }

  /* Procedural motion polish + pose from sim state. Pure read of sim fields. */
  function pose(e, tick) {
    var st = e.combatState || "FREE";
    var dir = (e.facing || 1) < 0 ? -1 : 1;
    var p = { ox: 0, oy: 0, rot: 0, dim: false };
    if (st === "THROWN_FLIGHT") {
      p.rot = -dir * ((tick % 24) / 24) * Math.PI * 2;
    } else if (st === "KNOCKDOWN") {
      p.rot = -dir * Math.PI / 2;
      p.oy = -4;
    } else if (st === "GETUP" || st === "UKEMI") {
      p.oy = 2;
    } else if (st === "HITSTUN" || st === "GRIP_BROKEN" || st === "STAGGERED") {
      p.ox = ((tick >> 1) & 1) ? 1 : -1;
      p.dim = ((tick >> 2) & 1) === 0;
    } else if (st === "THROWING" || st === "SPECIAL" || st === "ATTACK") {
      p.ox = (st === "ATTACK" && e.tell) ? -dir : dir * 2;
    } else if (moving(e)) {
      p.ox = dir;
      p.oy = -(((tick >> 3) & 1));
    } else {
      p.oy = -(((tick >> 4) & 1));
    }
    if ((e.iFrames | 0) > 0 && st !== "HITSTUN") p.dim = ((tick >> 2) & 1) === 0;
    return p;
  }

  /* Blit one atlas frame anchored bottom-center at (feetX, feetY), flipped
     when facing left (sheets face right). Cell drawn 1:1 in world px. */
  function blitFrame(ctx, fr, feetX, feetY, facing, p) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (p.dim) ctx.globalAlpha = 0.55;
    ctx.translate((feetX + p.ox) | 0, (feetY + p.oy) | 0);
    if (facing < 0) ctx.scale(-1, 1);
    if (p.rot) {
      ctx.translate(0, -(fr.sh >> 1));
      ctx.rotate(p.rot);
      ctx.translate(0, fr.sh >> 1);
    }
    ctx.drawImage(fr.img, fr.sx, fr.sy, fr.sw, fr.sh, -(fr.sw >> 1), -fr.sh, fr.sw, fr.sh);
    ctx.restore();
  }

  /* Anim id + frame for a hero from sim state. */
  function heroFrame(A, e, hid, tick) {
    var st = e.combatState || "FREE";
    if (st === "THROWING") return A.frameOnce(hid + "-throw", e.throwT | 0);
    if (st === "SPECIAL") return A.frameOnce(hid + "-throw", e.moveT | 0);
    if (st === "GRIPPED" && e.gripTarget) return A.frameAt(hid + "-throw", 0);
    if (st === "FREE" || st === "APPROACH" || st === "HITSTUN" || st === "GRIP_BROKEN" ||
      st === "GETUP" || st === "UKEMI" || st === "KNOCKDOWN" || st === "THROWN_FLIGHT" || st === "GRIPPED") {
      if (st === "FREE" || st === "APPROACH") {
        if (e.grounded === false) return A.frameAt(hid + "-walk", 1);
        if (moving(e)) return A.frame(hid + "-walk", tick);
      }
      if (st === "KNOCKDOWN" || st === "THROWN_FLIGHT") return A.frameAt(hid + "-idle", 0);
      return A.frame(hid + "-idle", tick);
    }
    return A.frame(hid + "-idle", tick);
  }

  /* Anim id + frame for an enemy (only e1/e2 sheets exist in the atlas). */
  function enemyFrame(A, e, tick) {
    var arch = (e.archetype || "") + "";
    var base = arch === "E1" ? "e1" : arch === "E2" ? "e2" : null;
    if (!base) return null;
    var st = e.combatState || "FREE";
    var m, n;
    if (st === "ATTACK" || (e.aiState === "ATTACK" && (e.atkPhase | 0) < 3)) {
      m = A.meta(base + "-attack");
      n = (m && m.frames) || 5;
      if (e.telegraphT > 0) return A.frameAt(base + "-attack", ((tick >> 3) & 1));
      if (e.atkPhase === 1) return A.frameAt(base + "-attack", (e.activeT > 1) ? n - 3 : n - 2);
      return A.frameAt(base + "-attack", n - 1);
    }
    if (st === "KNOCKDOWN" || st === "THROWN_FLIGHT") return A.frameAt(base + "-idle", 0);
    if (st === "FREE" && moving(e)) return A.frame(base + "-walk", tick);
    return A.frame(base + "-idle", tick);
  }

  function rect(ctx, x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  }

  function drawIdris(ctx, fx, top, w, h, facing) {
    var dir = facing < 0 ? -1 : 1;
    var cx = fx + (w >> 1);
    var skin = "#D2A07A";
    var gi = "#F4F0E6";
    var ink = "#2A1C14";
    var belt = "#1A1A1A";
    rect(ctx, cx - 7, top + h - 16, 6, 16, gi);
    rect(ctx, cx + 1, top + h - 16, 6, 16, gi);
    rect(ctx, cx - 9, top + 16, 18, 28, gi);
    rect(ctx, cx - 9, top + 36, 18, 4, belt);
    rect(ctx, cx - 8, top + 2, 16, 16, skin);
    rect(ctx, cx - 8, top, 16, 6, ink);
    rect(ctx, cx - 3, top + 8, 6, 3, ink);
    if (dir < 0) rect(ctx, cx - 9, top + 22, 4, 14, gi);
    else rect(ctx, cx + 5, top + 22, 4, 14, gi);
  }

  function drawOtajon(ctx, fx, top, w, h, facing) {
    var dir = facing < 0 ? -1 : 1;
    var cx = fx + (w >> 1);
    var skin = "#C48A62";
    var gi = "#3A6EA5";
    var band = "#F2C14E";
    var bag = "#C4A574";
    var hair = "#1A120C";
    rect(ctx, cx - 6, top + h - 14, 5, 14, gi);
    rect(ctx, cx + 1, top + h - 14, 5, 14, gi);
    rect(ctx, cx - 8, top + 16, 16, 24, gi);
    rect(ctx, cx - 8, top + 32, 16, 3, "#1A1A1A");
    rect(ctx, cx - 7, top + 2, 14, 14, skin);
    rect(ctx, cx - 7, top, 14, 5, hair);
    rect(ctx, cx - 8, top + 4, 16, 3, band);
    rect(ctx, cx + (dir > 0 ? 6 : -10), top + 22, 6, 8, bag);
  }

  function enemyPal(arch) {
    var m = {
      E1: ["#8A6A4A", "#3A2A1E"],
      E2: ["#6B4630", "#3B2A1E"],
      E3: ["#5E9648", "#D2543F"],
      E4: ["#F4F0E6", "#E03B3B"],
      E5: ["#1E2A4A", "#F4F0E6"],
      E6: ["#6C7385", "#F2C14E"],
      E7: ["#3FC4D6", "#F2C14E"],
      E8: ["#C99B34", "#14121C"],
      B1: ["#4A3C30", "#8E1D24"],
      B2: ["#D2543F", "#F2C14E"],
      B3: ["#454B5C", "#262A38"],
      B4: ["#6C7385", "#E03B3B"],
      B5: ["#14121C", "#F2C14E"],
      DUMMY: ["#C8A46A", "#7C6A5C"]
    };
    return m[arch] || ["#6A5344", "#2A1C14"];
  }

  function drawEnemy(ctx, e, fx, top, w, h, facing) {
    var tick = simTick();
    var A = e.kind === "enemy" ? anim() : null;
    var fr = A ? enemyFrame(A, e, tick) : null;
    if (fr) {
      blitFrame(ctx, fr, fx + (w >> 1), top + h, facing, pose(e, tick));
      return;
    }
    var arch = e.archetype || e.kind || "E1";
    var pal = enemyPal(arch);
    var cx = fx + (w >> 1);
    var bob = e.kind === "enemy" ? (((tick >> 4) & 1)) : 0;
    rect(ctx, fx + 2, top + 12 - bob, w - 4, h - 12 + bob, pal[0]);
    rect(ctx, cx - 6, top - bob, 12, 12, "#D2A07A");
    rect(ctx, cx - 6, top - bob, 12, 4, pal[1]);
    rect(ctx, fx + 2, top + h - 4, w - 4, 4, pal[1]);
  }

  function drawHero(ctx, e, fx, top, w, h, facing) {
    var id = heroId(e);
    var tick = simTick();
    var A = anim();
    var fr = A ? heroFrame(A, e, id, tick) : null;
    if (fr) {
      blitFrame(ctx, fr, fx + (w >> 1), top + h, facing, pose(e, tick));
      return;
    }
    if (id === "otajon") drawOtajon(ctx, fx, top, w, h, facing);
    else drawIdris(ctx, fx, top, w, h, facing);
  }

  function portrait(id) {
    if (id === "otajon") return pick("assets/portraits/otajon-192.png", "assets/portraits/otajon-preview.png", "assets/ref/otajon-portrait-192-preview.png");
    return pick("assets/portraits/idris-192.png", "assets/portraits/idris-preview.png", "assets/ref/idris-portrait-192-preview.png");
  }

  function drawEntity(ctx, e, cam, alpha) {
    if (!e || e.alive === false) return;
    var camx = (cam && cam.x) || 0;
    var camz = (cam && cam.z) || 0;
    var shakeX = (cam && cam.shakeX) || 0;
    var shakeZ = (cam && cam.shakeZ) || 0;
    var x = e.x, z = e.z || 0, d = e.d || 0;
    if (alpha && e.vx) x += e.vx * alpha * (1 / 120);
    if (alpha && e.vz) z += e.vz * alpha * (1 / 120);
    var floorY = (window.PLayers && PLayers.floorY) ? PLayers.floorY(d) : 246 - d;
    var sx = (x - camx + shakeX) | 0;
    var sy = (floorY - z - camz + shakeZ) | 0;
    var w = e.w || 28;
    var h = e.h || 48;
    var facing = e.facing == null ? 1 : e.facing;
    var fx = sx - (w >> 1);
    var top = sy - h;
    if (e.team === "hero" || e.kind === "hero" || e.heroId || e.hero || e.slot != null) {
      drawHero(ctx, e, fx, top, w, h, facing);
    } else {
      drawEnemy(ctx, e, fx, top, w, h, facing);
    }
  }

  var api = {
    load: load,
    images: images,
    drawEntity: drawEntity,
    drawHero: drawHero,
    portrait: portrait,
    heroId: heroId,
    pick: pick
  };
  if (typeof window !== "undefined") window.PSprites = api;
  if (typeof global !== "undefined") global.PSprites = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
