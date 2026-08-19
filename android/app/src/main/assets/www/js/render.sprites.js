/* Heroes as chunky pixel rects + optional portraits/ref sprites. */
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
    "assets/heroes/idris-idle.png",
    "assets/heroes/otajon-idle.png",
    "assets/heroes/e1-clipboard.png",
    "assets/heroes/e2-barrel.png",
    "assets/bg/w1-dawn.png"
  ];

  function load(done) {
    var n = 0;
    var t = PATHS.length;
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

  function blitFlip(ctx, img, fx, fy, w, h, facing) {
    if (!img) return false;
    var dw = w, dh = h;
    if (facing < 0) {
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, fx + dw, fy, -dw, dh);
    } else {
      ctx.drawImage(img, fx, fy, dw, dh);
    }
    return true;
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
    var arch = e.archetype || e.kind || "E1";
    var img = null;
    if (arch === "E1") img = pick("assets/heroes/e1-clipboard.png");
    if (arch === "E2") img = pick("assets/heroes/e2-barrel.png");
    if (img && blitFlip(ctx, img, fx, top, w, h, facing)) return;
    var pal = enemyPal(arch);
    var cx = fx + (w >> 1);
    rect(ctx, fx + 2, top + 12, w - 4, h - 12, pal[0]);
    rect(ctx, cx - 6, top, 12, 12, "#D2A07A");
    rect(ctx, cx - 6, top, 12, 4, pal[1]);
    rect(ctx, fx + 2, top + h - 4, w - 4, 4, pal[1]);
  }

  function drawHero(ctx, e, fx, top, w, h, facing) {
    var id = heroId(e);
    var img = id === "otajon"
      ? pick("assets/heroes/otajon-idle.png", "assets/ref/otajon-pixel-base.png")
      : pick("assets/heroes/idris-idle.png", "assets/ref/idris-pixel-base.png");
    if (img && blitFlip(ctx, img, fx, top, w, h, facing)) return;
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
