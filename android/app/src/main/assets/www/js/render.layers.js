/* Six-layer world renderer: painted sky/far/mid, collision-aligned floor,
   deterministic foreground dressing and atmosphere. Procedural art remains a
   graceful fallback while image files load or when a build omits a world. */
(function () {
  var W = 480;
  var H = 270;
  var FLOOR_BASE = 246;
  var baked = {};
  var palettes = {
    1: { sky: ["#2A3B63", "#4C5F8C", "#B9805E", "#F0B87C"], far: "#414B70", mid: "#6E708C", snow: "#DCE4F2", floor: "#C8A46A", floorDk: "#8A6242", floorInk: "#4E3A2C", fore: "#3A2A22" },
    2: { sky: ["#3FC4D6", "#7EDCE4", "#CFF2EE", "#F7DCA6"], far: "#1B6570", mid: "#2E9EA8", snow: "#F4E3C2", floor: "#E0B573", floorDk: "#B07F47", floorInk: "#7A5229", fore: "#D2543F" },
    3: { sky: ["#0E1130", "#1E2450", "#232A55", "#2E3866"], far: "#16203A", mid: "#2E3866", snow: "#8E9CC8", floor: "#454B5C", floorDk: "#262A38", floorInk: "#0E1130", fore: "#16203A" },
    4: { sky: ["#2A3344", "#4A5568", "#6A7384", "#8A92A0"], far: "#3A4454", mid: "#5A6574", snow: "#C8D0D8", floor: "#6C5A48", floorDk: "#4A3C30", floorInk: "#2A221C", fore: "#2A3344" },
    5: { sky: ["#120818", "#2A1038", "#4A1858", "#1A0A28"], far: "#3A1050", mid: "#6A2080", snow: "#F2C14E", floor: "#241E33", floorDk: "#14121C", floorInk: "#F2C14E", fore: "#8E1D24" }
  };

  function pal(world) {
    return palettes[world] || palettes[1];
  }

  /* --- image-backed background (world 1) --- */
  var imgs = {};

  function loadImg(src) {
    var resolve;
    var o = { img: new Image(), ok: false };
    o.promise = new Promise(function (done) { resolve = done; });
    o.img.onload = function () { o.ok = true; resolve(true); };
    o.img.onerror = function () { o.ok = false; resolve(false); };
    o.img.src = src;
    return o;
  }

  function ensureImgs(world) {
    world = world || 1;
    if (imgs[world]) return imgs[world];
    if (typeof Image === "undefined") return null;
    var prefix = "assets/bg/w" + world + "-";
    imgs[world] = {
      sky: loadImg(prefix + "sky.png"),
      far: loadImg(prefix + "far.png"),
      mid: loadImg(prefix + "mid.png"),
      ground: loadImg(prefix + "ground.png"),
      dawn: world === 1 ? loadImg("assets/bg/w1-dawn.png") : null,
      dojo: world === 1 ? loadImg("assets/bg/w1-dojo.png") : null
    };
    return imgs[world];
  }

  function ready(o) {
    return !!(o && o.ok && o.img.naturalWidth > 0);
  }

  function preload(worlds) {
    if (typeof Image === "undefined") return Promise.resolve(false);
    if (!Array.isArray(worlds)) worlds = [worlds || 1];
    var promises = [];
    worlds.forEach(function (world) {
      var im = ensureImgs(world);
      Object.keys(im || {}).forEach(function (key) { if (im[key] && im[key].promise) promises.push(im[key].promise); });
    });
    return Promise.all(promises).then(function (rows) { return rows.every(Boolean); });
  }

  /* Tile a source crop horizontally at a parallax factor, integer-snapped. */
  function drawBand(ctx, img, sx, sy, sw, sh, dy, dw, dh, camx, factor) {
    var off = ((camx * factor) | 0) % dw;
    if (off < 0) off += dw;
    var x;
    for (x = -off; x < W; x += dw) {
      ctx.drawImage(img, sx, sy, sw, sh, x | 0, dy | 0, dw, dh);
    }
  }

  /* Sliced layer files (preferred). */
  function drawSliced(ctx, camx, im) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im.sky.img, 0, 0);
    if (ready(im.far)) {
      var fw = im.far.img.naturalWidth, fh = im.far.img.naturalHeight;
      drawBand(ctx, im.far.img, 0, 0, fw, fh, 168 - fh, fw, fh, camx, 0.25);
    }
    if (ready(im.mid)) {
      var mw = im.mid.img.naturalWidth, mh = im.mid.img.naturalHeight;
      drawBand(ctx, im.mid.img, 0, 0, mw, mh, 190 - mh, mw, mh, camx, 0.55);
    }
  }

  /* Parallax crops of the full 1280x720 painting (fallback). */
  function drawDawn(ctx, camx, img) {
    ctx.imageSmoothingEnabled = false;
    /* sky + snowy peaks */
    drawBand(ctx, img, 0, 0, 1280, 310, 0, 480, 116, camx, 0.06);
    /* brown foothills */
    drawBand(ctx, img, 0, 215, 1280, 170, 104, 480, 64, camx, 0.25);
    /* village rooftops skyline */
    drawBand(ctx, img, 0, 330, 1280, 160, 126, 480, 60, camx, 0.55);
  }

  function fillSky(ctx, p) {
    var i, y0, y1;
    for (i = 0; i < 4; i++) {
      y0 = (i * 42) | 0;
      y1 = ((i + 1) * 42) | 0;
      ctx.fillStyle = p.sky[i];
      ctx.fillRect(0, y0, W, y1 - y0 + 8);
    }
    ctx.fillStyle = p.sky[3];
    ctx.fillRect(0, 160, W, 40);
  }

  function bakeSky(world) {
    if (baked[world]) return baked[world];
    if (typeof document === "undefined" || !document.createElement) return null;
    var c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    var g = c.getContext("2d");
    if (!g) return null;
    g.imageSmoothingEnabled = false;
    fillSky(g, pal(world));
    baked[world] = c;
    return c;
  }

  function hash(n) {
    n = (n ^ 0x5bd1e995) >>> 0;
    n = Math.imul(n, 2246822519) >>> 0;
    return (n ^ (n >>> 15)) >>> 0;
  }

  function ridge(x, seed, amp, base) {
    var a = hash((x >> 4) + seed * 17);
    var b = hash(((x >> 4) + 1) + seed * 17);
    var t = (x & 15) / 15;
    var h = (a % 100) / 100 * (1 - t) + (b % 100) / 100 * t;
    return base - (h * amp) | 0;
  }

  function drawRidge(ctx, camx, factor, color, snow, seed, amp, base) {
    var x, y, px;
    ctx.fillStyle = color;
    for (x = 0; x < W; x++) {
      px = x + ((camx * factor) | 0);
      y = ridge(px, seed, amp, base);
      ctx.fillRect(x, y, 1, H - y);
    }
    if (snow) {
      ctx.fillStyle = snow;
      for (x = 0; x < W; x++) {
        px = x + ((camx * factor) | 0);
        y = ridge(px, seed, amp, base);
        if ((hash(px + seed) & 3) === 0) ctx.fillRect(x, y, 1, 2);
      }
    }
  }

  function drawFloor(ctx, camx, p, imgBg, ground) {
    var y, x, stripe;
    if (ground && ready(ground)) {
      /* Painted tileable ground strip at camera speed 1.0 (belt zone). */
      var gw = ground.img.naturalWidth, gh = ground.img.naturalHeight;
      drawBand(ctx, ground.img, 0, 0, gw, gh, FLOOR_BASE - gh, gw, gh, camx, 1);
      /* darker transition row blending into the mid parallax band above */
      ctx.fillStyle = "rgba(46,32,28,0.4)";
      ctx.fillRect(0, FLOOR_BASE - gh, W, 3);
      ctx.fillStyle = p.floorInk;
      ctx.fillRect(0, FLOOR_BASE, W, H - FLOOR_BASE);
      return;
    }
    if (!imgBg) {
      ctx.fillStyle = p.floorDk;
      ctx.fillRect(0, 150, W, H - 150);
    }
    ctx.fillStyle = p.floor;
    ctx.fillRect(0, 186, W, 60);
    ctx.fillStyle = p.floorInk;
    for (y = 186; y < 246; y += 6) {
      ctx.fillRect(0, y, W, 1);
    }
    stripe = ((camx) | 0) % 16;
    ctx.fillStyle = p.floorDk;
    for (x = -stripe; x < W; x += 16) ctx.fillRect(x, 186, 1, 60);
    ctx.fillStyle = p.floorInk;
    ctx.fillRect(0, 246, W, H - 246);
  }

  function drawFore(ctx, camx, p) {
    var x, px, h;
    ctx.fillStyle = p.fore;
    for (x = 0; x < W; x += 48) {
      px = x - ((camx * 1.25) | 0) % 96;
      h = 20 + (hash(x + 9) % 18);
      ctx.fillRect(px, H - h - 8, 10, h);
    }
  }

  function drawLight(ctx, world) {
    ctx.fillStyle = world === 3 || world === 5 ? "rgba(10,8,24,0.18)" : "rgba(255,220,160,0.06)";
    ctx.fillRect(0, 0, W, H);
  }

  function dressing() {
    if (typeof window !== "undefined" && window.PDressing) return window.PDressing;
    if (typeof global !== "undefined" && global.PDressing) return global.PDressing;
    return null;
  }

  function drawTrain(ctx, camx, backdrop) {
    var x, off = (camx | 0) % 64;
    if (backdrop === "roof") {
      ctx.fillStyle = "#202A42";
      ctx.fillRect(0, 174, W, 72);
      ctx.fillStyle = "#59647A";
      for (x = -off; x < W; x += 64) ctx.fillRect(x, 178, 3, 68);
      ctx.fillStyle = "#AAB4C7";
      ctx.fillRect(0, 184, W, 3);
      ctx.fillRect(0, 240, W, 3);
    } else if (backdrop === "freight") {
      ctx.fillStyle = "#3B2630";
      ctx.fillRect(0, 116, W, 130);
      ctx.fillStyle = "#70404A";
      for (x = -off; x < W; x += 64) {
        ctx.fillRect(x, 120, 3, 122);
        ctx.fillRect(x + 8, 132, 48, 3);
        ctx.fillRect(x + 8, 222, 48, 3);
      }
      ctx.fillStyle = "#B88957";
      ctx.fillRect(0, 184, W, 3);
    }
  }

  function draw(ctx, cam, world, backdrop, opts) {
    world = world || 1;
    opts = opts || {};
    var p = pal(world);
    var camx = (cam && cam.bgX != null ? cam.bgX : cam && cam.x) || 0;
    var imgBg = false, dojoBg = false;
    var im = null;
    im = ensureImgs(world);
    if (im) {
      if (opts.levelId === "w1l1" && ready(im.dojo)) {
        ctx.imageSmoothingEnabled = false; ctx.drawImage(im.dojo.img, 0, 0); imgBg = dojoBg = true;
      } else if (im && ready(im.sky)) {
        drawSliced(ctx, camx, im);
        imgBg = true;
      } else if (world === 1 && ready(im.dawn)) {
        drawDawn(ctx, camx, im.dawn.img);
        imgBg = true;
      }
    }
    if (!imgBg) {
      var sky = bakeSky(world);
      if (sky) ctx.drawImage(sky, 0, 0);
      else fillSky(ctx, p);
      drawRidge(ctx, camx, 0.25, p.far, p.snow, 3, 50, 130);
      drawRidge(ctx, camx, 0.55, p.mid, null, 7, 36, 150);
    }
    if (!dojoBg) {
      drawFloor(ctx, camx, p, imgBg, im && im.ground);
      if (world === 3) drawTrain(ctx, camx, backdrop);
      var dress = dressing();
      if (dress && dress.draw) dress.draw(ctx, camx, world, opts.levelId || "", opts.tick || 0, !!opts.reducedMotion);
      drawFore(ctx, camx, p);
      drawLight(ctx, world);
    }
  }

  function floorY(d) {
    return FLOOR_BASE - (d || 0);
  }

  var api = { draw: draw, preload: preload, floorY: floorY, FLOOR_BASE: FLOOR_BASE, pal: pal, bakeSky: bakeSky };
  if (typeof window !== "undefined") window.PLayers = api;
  if (typeof global !== "undefined") global.PLayers = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
