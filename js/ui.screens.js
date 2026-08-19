/* BOOT PRELOAD TITLE ATTRACT MODE CHAR PLAY PAUSE CONTINUE RESULTS GAME_OVER VS */
(function () {
  var screen = "BOOT";
  var prev = "BOOT";
  var mode = "ARCADE";
  var hero = "idris";
  var cursor = 0;
  var idleAt = 0;
  var attractT = 0;
  var flash = 0;
  var hold = 0;
  var continueN = 10;
  var onPlay = null;

  var MODES = ["ARCADE", "COOP_SHORT", "DOJO"];
  var MODE_IDS = ["ARCADE", "COOP", "DOJO"];
  var HEROES = ["IDRIS", "OTAJON"];
  var HERO_IDS = ["idris", "otajon"];
  var PAUSE_ITEMS = ["RESUME", "CHECKPOINT", "SETTINGS", "QUIT_MAP"];

  function S(key) {
    if (window.PUI && PUI.S) return PUI.S(key);
    if (window.PData && PData.getString) return PData.getString(key);
    return key;
  }

  function set(s) {
    prev = screen;
    screen = s;
    cursor = 0;
    flash = 0;
    hold = 0;
    if (s === "TITLE") idleAt = now();
    if (s === "ATTRACT") attractT = now();
    if (s === "CONTINUE") continueN = 10;
  }

  function now() {
    return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  }

  function get() { return screen; }
  function isPlay() { return screen === "PLAY"; }
  function isPause() { return screen === "PAUSE"; }

  function center(ctx, str, y, scale, col) {
    if (!window.PFont) return;
    var w = PFont.measure(str, scale || 1);
    PFont.draw(ctx, str, (480 - w) >> 1, y, scale || 1, col || "#FFFFFF");
  }

  function dim(ctx, a) {
    ctx.fillStyle = "rgba(0,0,0," + (a == null ? 0.55 : a) + ")";
    ctx.fillRect(0, 0, 480, 270);
  }

  function confirm(it) {
    return it && (it.startPressed || it.jumpPressed || it.gripPressed);
  }

  function back(it) {
    return it && it.pausePressed && !it.startPressed;
  }

  function stick(it) {
    if (!it) return 0;
    if (it.moveD > 0.4 || it.moveX < -0.4) return -1;
    if (it.moveD < -0.4 || it.moveX > 0.4) return 1;
    return 0;
  }

  function nav(it, n) {
    var d = stick(it);
    if (!d) return;
    if (it._navLock) return;
    cursor = (cursor + d + n) % n;
    if (cursor < 0) cursor += n;
    it._navLock = true;
  }

  function unlockNav(it) {
    if (it && Math.abs(it.moveD) < 0.3 && Math.abs(it.moveX) < 0.3) it._navLock = false;
  }

  function startPlay() {
    if (onPlay) onPlay({ mode: MODE_IDS[modeIndex()], hero: hero });
    else set("PLAY");
  }

  function modeIndex() {
    for (var i = 0; i < MODE_IDS.length; i++) if (MODE_IDS[i] === mode) return i;
    return 0;
  }

  function update(intents, state) {
    var it = intents && intents[0];
    flash++;
    unlockNav(it);
    if (screen === "BOOT" || screen === "PRELOAD") return;
    if (screen === "TITLE") {
      if (confirm(it)) { set("MODE"); return; }
      if (now() - idleAt > 20000) set("ATTRACT");
      return;
    }
    if (screen === "ATTRACT") {
      var mag = it ? Math.sqrt((it.moveX || 0) * (it.moveX || 0) + (it.moveD || 0) * (it.moveD || 0)) : 0;
      if (confirm(it) || (it && (it.pausePressed || it.jumpPressed || it.gripPressed)) || mag > 0.5) {
        set("TITLE");
        return;
      }
      if (now() - attractT > 38000) set("TITLE");
      return;
    }
    if (screen === "MODE") {
      nav(it, 3);
      mode = MODE_IDS[cursor];
      if (confirm(it)) { set("CHAR"); return; }
      if (it && it.pausePressed) { set("TITLE"); return; }
      return;
    }
    if (screen === "CHAR") {
      nav(it, 2);
      hero = HERO_IDS[cursor];
      if (confirm(it)) { startPlay(); return; }
      if (it && it.pausePressed) { set("MODE"); return; }
      return;
    }
    if (screen === "PLAY") {
      if (it && it.pausePressed) { set("PAUSE"); return; }
      if (state && state.gameOver) set("GAME_OVER");
      else if (state && (state.continueScreen || state.needContinue)) set("CONTINUE");
      else if (state && state.results) set("RESULTS");
      else if (state && state.vs && !state.vs.done) set("VS");
      return;
    }
    if (screen === "PAUSE") {
      nav(it, 4);
      if (it && it.pausePressed) { set("PLAY"); return; }
      if (confirm(it)) {
        if (cursor === 0) set("PLAY");
        else if (cursor === 3) set("TITLE");
        else set("PLAY");
      }
      return;
    }
    if (screen === "VS") {
      if (confirm(it) || flash > 160) set("PLAY");
      return;
    }
    if (screen === "CONTINUE") {
      if (flash > 0 && flash % 60 === 0 && continueN > 0) continueN--;
      if (confirm(it)) { set("PLAY"); return; }
      if (continueN <= 0) set("GAME_OVER");
      return;
    }
    if (screen === "RESULTS") {
      if (confirm(it) || flash > 400) set("TITLE");
      return;
    }
    if (screen === "GAME_OVER") {
      if (flash > 180 && (confirm(it) || flash > 240)) set("TITLE");
      return;
    }
  }

  function blink() {
    return ((flash / 30) | 0) % 2 === 0;
  }

  function drawTitle(ctx) {
    if (window.PUITitle && PUITitle.drawTitle) { PUITitle.drawTitle(ctx, flash); return; }
    center(ctx, S("TITLE"), 88, 2, "#F2C14E");
    if (blink()) center(ctx, S("PRESS_START"), 170, 1, "#FFFFFF");
  }

  function drawAttract(ctx) {
    var t = now() - attractT;
    if (t < 30000) {
      center(ctx, S("TITLE"), 80, 2, "#F2C14E");
      center(ctx, S("DEMO"), 10, 1, "#FFE9A8");
      center(ctx, S("PRESS_START"), 200, 1, "#FFFFFF");
    } else {
      dim(ctx, 0.4);
      center(ctx, S("BEST"), 40, 1, "#F2C14E");
      center(ctx, S("PLACE") + "  " + S("NAME") + "  " + S("SCORE"), 80, 1, "#FFFFFF");
      center(ctx, "1  ---  0", 100, 1, "#FFE9A8");
      center(ctx, "2  ---  0", 116, 1, "#FFE9A8");
      center(ctx, "3  ---  0", 132, 1, "#FFE9A8");
    }
  }

  function drawMode(ctx) {
    dim(ctx, 0.35);
    center(ctx, S("TITLE"), 40, 2, "#F2C14E");
    var i, lab, col;
    for (i = 0; i < 3; i++) {
      lab = S(MODES[i]);
      col = i === cursor ? "#F2C14E" : "#FFFFFF";
      if (i === cursor) lab = "> " + lab + " <";
      center(ctx, lab, 110 + i * 22, 1, col);
    }
  }

  function drawChar(ctx) {
    if (window.PUITitle && PUITitle.drawChar) { PUITitle.drawChar(ctx, flash, null, cursor); return; }
    dim(ctx, 0.35);
    center(ctx, S("CHOOSE_FIGHTER"), 28, 1, "#F2C14E");
    var i, id, img, x;
    for (i = 0; i < 2; i++) {
      id = HERO_IDS[i];
      x = 80 + i * 200;
      ctx.fillStyle = i === cursor ? "#F2C14E" : "#3D3455";
      ctx.fillRect(x, 60, 120, 140);
      ctx.fillStyle = "#14121C";
      ctx.fillRect(x + 2, 62, 116, 136);
      img = window.PSprites && PSprites.portrait(id);
      if (img) ctx.drawImage(img, x + 12, 72, 96, 96);
      else {
        ctx.fillStyle = id === "otajon" ? "#3A6EA5" : "#F4F0E6";
        ctx.fillRect(x + 30, 80, 60, 80);
      }
      var nm = S(HEROES[i]);
      var nw = window.PFont ? PFont.measure(nm, 1) : 36;
      if (window.PFont) PFont.draw(ctx, nm, x + ((120 - nw) >> 1), 210, 1, i === cursor ? "#F2C14E" : "#FFFFFF");
    }
  }

  function drawPause(ctx) {
    dim(ctx, 0.6);
    center(ctx, S("PAUSE"), 72, 2, "#F2C14E");
    var i, lab, col;
    for (i = 0; i < 4; i++) {
      lab = S(PAUSE_ITEMS[i]);
      col = i === cursor ? "#F2C14E" : "#FFFFFF";
      if (i === cursor) lab = "> " + lab + " <";
      center(ctx, lab, 110 + i * 16, 1, col);
    }
  }

  function drawVs(ctx) {
    dim(ctx, 0.45);
    center(ctx, S("VS"), 120, 2, "#F2C14E");
  }

  function drawContinue(ctx) {
    dim(ctx, 0.55);
    center(ctx, S("CONTINUE"), 62, 2, "#E03B3B");
    center(ctx, String(continueN), 110, 2, "#FFFFFF");
    center(ctx, S("PRESS_START"), 166, 1, "#FFE9A8");
  }

  function drawResults(ctx) {
    dim(ctx, 0.5);
    center(ctx, S("RESULTS"), 44, 2, "#F2C14E");
    center(ctx, S("SCORE"), 100, 1, "#FFFFFF");
  }

  function drawOver(ctx) {
    dim(ctx, 0.65);
    center(ctx, S("GAME_OVER"), 120, 2, "#E03B3B");
  }

  function drawPreload(ctx, p) {
    dim(ctx, 0.3);
    center(ctx, S("LOADING"), 120, 1, "#FFFFFF");
    var w = 160;
    var x = (480 - w) >> 1;
    ctx.fillStyle = "#241E33";
    ctx.fillRect(x, 150, w, 8);
    ctx.fillStyle = "#F2C14E";
    ctx.fillRect(x, 150, (w * (p || 0)) | 0, 8);
  }

  function draw(ctx, state) {
    if (!ctx) return;
    if (screen === "BOOT" || screen === "PRELOAD") drawPreload(ctx, window.PBoot && PBoot.progress ? PBoot.progress() : 0);
    else if (screen === "TITLE") drawTitle(ctx);
    else if (screen === "ATTRACT") drawAttract(ctx);
    else if (screen === "MODE") drawMode(ctx);
    else if (screen === "CHAR") drawChar(ctx);
    else if (screen === "PAUSE") drawPause(ctx);
    else if (screen === "VS") drawVs(ctx);
    else if (screen === "CONTINUE") drawContinue(ctx);
    else if (screen === "RESULTS") drawResults(ctx);
    else if (screen === "GAME_OVER") drawOver(ctx);
  }

  var api = {
    set: set,
    get: get,
    update: update,
    draw: draw,
    isPlay: isPlay,
    isPause: isPause,
    modeId: function () { return mode; },
    heroId: function () { return hero; },
    onPlay: function (fn) { onPlay = fn; }
  };
  if (typeof window !== "undefined") window.PScreens = api;
  if (typeof global !== "undefined") global.PScreens = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
