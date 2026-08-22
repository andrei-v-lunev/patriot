/* HUD: hearts, score, meter, world name. Bitmap font only. */
(function () {
  function S(key) {
    if (window.PData && PData.getString) return PData.getString(key);
    if (window.PDataRaw && PDataRaw.strings && PDataRaw.strings[key] != null) return PDataRaw.strings[key];
    return key;
  }

  function list(x) {
    if (!x) return [];
    return x.all || x;
  }

  function text(ctx, str, x, y, face, color) {
    if (!window.PFont) return 0;
    var scale = face === "font_10x14" || face === 2 ? 2 : 1;
    return PFont.draw(ctx, str, x, y, scale, color || "#FFFFFF");
  }

  function heart(ctx, x, y, on) {
    ctx.fillStyle = on ? "#E03B3B" : "#3D3455";
    ctx.fillRect(x + 1, y, 2, 1);
    ctx.fillRect(x + 5, y, 2, 1);
    ctx.fillRect(x, y + 1, 8, 2);
    ctx.fillRect(x + 1, y + 3, 6, 2);
    ctx.fillRect(x + 3, y + 5, 2, 2);
  }

  function bar(ctx, x, y, w, h, t, col, bg) {
    ctx.fillStyle = bg || "#241E33";
    ctx.fillRect(x, y, w, h);
    var f = t < 0 ? 0 : t > 1 ? 1 : t;
    ctx.fillStyle = col;
    ctx.fillRect(x, y, (w * f) | 0, h);
    ctx.fillStyle = "#14121C";
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
  }

  /* --- HUD portrait chips: prefer 64px hud chips, fall back to 192 portraits. --- */
  var chipImgs = {};
  function chipImg(id) {
    var src = "assets/ui/hud-" + id + "-64.png";
    var img = chipImgs[src];
    if (img === undefined && typeof Image !== "undefined") {
      img = new Image();
      img.src = src;
      chipImgs[src] = img;
    }
    if (img && img.complete && img.naturalWidth > 0) return img;
    return window.PSprites && PSprites.portrait ? PSprites.portrait(id) : null;
  }

  /* Rounded dark frame (1px light edge, cut corners) + 32x32 portrait. */
  function portraitChip(ctx, x, y, id) {
    var s = 32;
    ctx.fillStyle = "#14121C";
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = "#8A7FA6";
    ctx.fillRect(x + 1, y, s - 2, 1);
    ctx.fillRect(x + 1, y + s - 1, s - 2, 1);
    ctx.fillRect(x, y + 1, 1, s - 2);
    ctx.fillRect(x + s - 1, y + 1, 1, s - 2);
    ctx.fillStyle = "#241E33";
    ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
    var img = chipImg(id);
    if (img) {
      var prev = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, x + 1, y + 1, s - 2, s - 2);
      ctx.imageSmoothingEnabled = prev;
    }
  }

  /* --- Health-bar chase ghost: render-side only, paced off state.tick. --- */
  var chase = [{ hp: -1, ghost: 0, hold: 0 }, { hp: -1, ghost: 0, hold: 0 }];
  var chaseTick = -1;
  function chaseT(slot, t, tick) {
    var c = chase[slot];
    if (c.hp < 0 || t > c.ghost) c.ghost = t;
    if (c.hp >= 0 && t < c.hp - 0.0001) c.hold = tick + 24;
    c.hp = t;
    if (c.ghost > t && tick >= c.hold) {
      var dt = chaseTick < 0 ? 1 : Math.min(4, Math.max(0, tick - chaseTick));
      c.ghost = Math.max(t, c.ghost - 0.006 * dt);
    }
    return c.ghost;
  }

  function hpBar(ctx, x, y, w, h, t, ghost) {
    ctx.fillStyle = "#241E33";
    ctx.fillRect(x, y, w, h);
    var g = ghost < 0 ? 0 : ghost > 1 ? 1 : ghost;
    var f = t < 0 ? 0 : t > 1 ? 1 : t;
    ctx.fillStyle = "#8E1D24";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x, y, (w * g) | 0, h);
    ctx.fillStyle = "#5FD16A";
    ctx.fillRect(x, y, (w * f) | 0, h);
    if (h > 3 && f > 0) {
      ctx.fillStyle = "#8FE79A";
      ctx.fillRect(x, y + 1, (w * f) | 0, 1);
    }
    ctx.fillStyle = "#14121C";
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
  }

  function playing() {
    var s = window.PScreens && PScreens.get ? PScreens.get() : "PLAY";
    return s === "PLAY" || s === "PAUSE" || s === "VS";
  }

  function hud(ctx, state) {
    if (!ctx || !playing()) return;
    var all = list(state && state.heroes);
    /* Panels track ACTIVE heroes: the solo tag bench (e.benched, §4.9.1)
       stays hidden, and after a swap the P1 panel follows the fighter. */
    var hs = [];
    for (var hi = 0; hi < all.length; hi++) if (all[hi] && !all[hi].benched) hs.push(all[hi]);
    if (!hs.length) hs = all;
    var h0 = hs[0];
    /* Lives are sim-owned (state.lives), shared across heroes; per-hero
       h0.lives only survives as a fallback for the legacy dummy state. */
    var lives = state && state.lives != null ? state.lives
      : (h0 && h0.lives != null ? h0.lives : 3);
    var hp = h0 ? h0.hp : 0;
    var maxHp = (h0 && h0.maxHp) || 120;
    var meter = (h0 && (h0.meter != null ? h0.meter : h0.special)) || 0;
    var tick = (state && state.tick) | 0;
    var id0 = "idris";
    var name = "ИДРИС";
    if (h0 && window.PSprites) {
      id0 = PSprites.heroId(h0);
      name = id0 === "otajon" ? S("OTAJON") : S("IDRIS");
    } else if (h0 && h0.name) name = h0.name;
    portraitChip(ctx, 8, 8, id0);
    var t0 = maxHp ? hp / maxHp : 0;
    hpBar(ctx, 44, 10, 116, 8, t0, chaseT(0, t0, tick));
    text(ctx, name, 44, 22, 1, "#FFE9A8");
    var nw = window.PFont ? PFont.measure(name, 1) : name.length * 6;
    var i;
    for (i = 0; i < 3; i++) heart(ctx, 44 + nw + 6 + i * 10, 22, i < lives);
    bar(ctx, 44, 32, 116, 4, (meter > 1 ? meter / 100 : meter), "#F2C14E", "#241E33");

    /* Total score = base + IPPON/throw score (accumulated separately). */
    var score = (((state && state.score) || 0) +
      ((state && state.ippon && state.ippon.score) || 0)) | 0;
    var sc = S("SCORE") + " " + score;
    var sw = window.PFont ? PFont.measure(sc, 1) : sc.length * 6;
    text(ctx, sc, (480 - sw) >> 1, 6, 1, "#F2C14E");

    var world = "";
    if (state && state.level) {
      world = state.level.worldName || "";
      if (!world && state.level.world) world = S("W" + state.level.world);
      if (!world && state.level.id) world = S((state.level.id + "").toUpperCase());
    }
    if (!world) world = S("W1");
    /* P2 panel only for a real second player — the solo bench hero
       (e.benched, parked off-screen for tag §4.9.1) must not show. */
    var p2 = state && state.players === 2 && hs[1] && !hs[1].benched;
    var ww = window.PFont ? PFont.measure(world, 1) : world.length * 6;
    text(ctx, world, p2 ? ((480 - ww) >> 1) : 472 - ww, p2 ? 22 : 6, 1, "#FFFFFF");

    if (p2) {
      var h1 = hs[1];
      var id1 = window.PSprites ? PSprites.heroId(h1) : "otajon";
      portraitChip(ctx, 440, 8, id1);
      var t1 = h1.maxHp ? h1.hp / h1.maxHp : 0;
      hpBar(ctx, 320, 10, 116, 8, t1, chaseT(1, t1, tick));
      var n2 = id1 === "idris" ? S("IDRIS") : S("OTAJON");
      var w2 = window.PFont ? PFont.measure(n2, 1) : 36;
      text(ctx, n2, 436 - w2, 22, 1, h1.alive === false ? "#8A7FA6" : "#FFE9A8");
      var livesB = state.lives2 == null ? 3 : state.lives2;
      for (i = 0; i < 3; i++) heart(ctx, 320 + i * 10, 22, i < livesB);
      if (h1.alive === false && h1._outOfLives) text(ctx, S("OUT"), 320, 32, 1, "#E03B3B");
    }
    chaseTick = tick;
  }

  var api = { text: text, hud: hud, S: S, heart: heart, bar: bar };
  if (typeof window !== "undefined") window.PUI = api;
  if (typeof global !== "undefined") global.PUI = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
