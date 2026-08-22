/* BOOT PRELOAD TITLE ATTRACT SAVE_SLOT MODE CHAR MAP LEVEL_INTRO PLAY PAUSE SETTINGS CONTINUE RESULTS GAME_OVER VS BOSS_DEFEAT ENDING CREDITS POST_CREDIT */
(function () {
  var screen = "BOOT";
  var prev = "BOOT";
  var mode = "ARCADE";
  var hero = "idris";
  var difficulty = "normal";
  var cursor = 0;
  var idleAt = 0;
  var attractT = 0;
  var flash = 0;
  var hold = 0;
  var continueN = 10;
  var continueLast = 10;
  var onPlay = null;
  var saveState = null;
  var mapModel = null;
  var mapSelected = null;
  var settingsReturn = "MODE";
  var recordedLevel = "";
  var screenAt = 0;
  var skipTick = 0;

  var MODES = ["ARCADE", "COOP_SHORT", "DOJO", "SETTINGS"];
  var MODE_IDS = ["ARCADE", "COOP", "DOJO", "SETTINGS"];
  var HEROES = ["IDRIS", "OTAJON"];
  var HERO_IDS = ["idris", "otajon"];
  var PAUSE_ITEMS = ["RESUME", "SETTINGS", "QUIT_MAP"];
  var DIFFICULTY_IDS = ["easy", "normal", "hard"];
  var DIFFICULTY_LABELS = ["СЁДАН", "НИДАН", "ЁНДАН"];

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
    screenAt = now();
    skipTick = 0;
    if (s === "TITLE") idleAt = now();
    if (s === "ATTRACT") attractT = now();
    if (s === "CONTINUE") { continueN = 10; continueLast = 10; }
  }

  function sound(name) {
    if (window.PAudio && PAudio.playEvent) PAudio.playEvent(name);
  }

  function accept(s) { sound("menu_confirm"); set(s); }

  function now() {
    return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  }

  function screenMs() { return Math.max(0, now() - screenAt); }
  function presentationTick() { return Math.max(skipTick, (screenMs() * 0.06) | 0); }

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

  /* Menu confirm: START + GRIP only (arcade convention). Jump deliberately
     excluded — Space is a legacy jump alias and must not confirm menus.
     (Note: input.js also maps Space onto the "start" edge; that residual
     leak lives in input.js, outside this file's ownership.) */
  function confirm(it) {
    return it && (it.startPressed || it.gripPressed);
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
    sound("menu_move");
  }

  function unlockNav(it) {
    if (it && Math.abs(it.moveD) < 0.3 && Math.abs(it.moveX) < 0.3) it._navLock = false;
  }

  function startPlay() {
    if (onPlay) onPlay({ mode: MODE_IDS[modeIndex()], hero: hero, difficulty: difficulty });
    else set("PLAY");
  }

  function modeIndex() {
    for (var i = 0; i < MODE_IDS.length; i++) if (MODE_IDS[i] === mode) return i;
    return 0;
  }

  function saves() {
    if (!saveState) {
      saveState = window.PSave && PSave.load ? PSave.load() : null;
      if (window.PSettings) {
        if (!saveState || PSettings.validate(saveState.settings || {}).length) {
          if (saveState) saveState.settings = PSettings.defaults();
          PSettings.use(PSettings.defaults());
        } else PSettings.use(saveState.settings);
      }
    }
    return saveState;
  }

  function store() { if (window.PSave && saveState) PSave.save(saveState); }

  function openMap() {
    var save = saves();
    mapModel = window.PMap && PMap.fromData ? PMap.fromData(save) : null;
    mapSelected = mapModel && mapModel.currentId;
    set("MAP");
  }

  function openSettings(ret) {
    settingsReturn = ret || "MODE";
    var save = saves();
    if (window.PSettingsUI) PSettingsUI.open(save && save.settings, function (next) {
      if (saveState) saveState.settings = next;
      store();
    });
    set("SETTINGS");
  }

  function recordResult(state) {
    var id, nodes, i, next = null, score;
    if (!state || !state.results || !window.PSave) return;
    id = state.levelId || (state.level && state.level.id) || "";
    if (!id || recordedLevel === id) return;
    recordedLevel = id; score = ((state.score || 0) + ((state.ippon && state.ippon.score) || 0)) | 0;
    saves(); mapModel = window.PMap && PMap.fromData ? PMap.fromData(saveState) : null;
    nodes = mapModel && mapModel.nodes || [];
    for (i = 0; i < nodes.length; i++) if (nodes[i].id === id && nodes[i + 1]) next = nodes[i + 1].id;
    saveState = PSave.record(saveState, id, score, state.results.rank, state.tick || 0, state.results.noHit);
    saveState = PSave.completeLevel(saveState, id, next);
    store();
  }

  function update(intents, state) {
    var it = intents && intents[0];
    flash++;
    unlockNav(it);
    if (screen === "BOOT" || screen === "PRELOAD") return;
    if (screen === "TITLE") {
      if (confirm(it)) { accept("SAVE_SLOT"); return; }
      if (now() - idleAt > 20000) set("ATTRACT");
      return;
    }
    if (screen === "SAVE_SLOT") {
      nav(it, 3);
      if (confirm(it)) {
        if (window.PSave) PSave.selectSlot(cursor + 1);
        saveState = null; saves(); accept("MODE"); return;
      }
      if (it && it.pausePressed) set("TITLE");
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
      nav(it, 4);
      mode = MODE_IDS[cursor];
      if (confirm(it)) { sound("menu_confirm"); if (mode === "SETTINGS") openSettings("MODE"); else set("CHAR"); return; }
      if (it && it.pausePressed) { set("TITLE"); return; }
      return;
    }
    if (screen === "CHAR") {
      nav(it, 2);
      hero = HERO_IDS[cursor];
      if (confirm(it)) { accept("DIFFICULTY"); cursor = 1; return; }
      if (it && it.pausePressed) { set("MODE"); return; }
      return;
    }
    if (screen === "DIFFICULTY") {
      nav(it, 3);
      difficulty = DIFFICULTY_IDS[cursor];
      if (confirm(it)) { sound("menu_confirm"); if (mode === "DOJO") startPlay(); else openMap(); return; }
      if (it && it.pausePressed) { set("CHAR"); return; }
      return;
    }
    if (screen === "MAP") {
      var key = it && it.moveD > 0.4 ? "up" : it && it.moveD < -0.4 ? "down" : it && it.moveX < -0.4 ? "left" : it && it.moveX > 0.4 ? "right" : "";
      if (!key) { if (it) it._mapLock = false; }
      else if (it && !it._mapLock && window.PMap) { mapSelected = PMap.navigate(mapModel, mapSelected, key); it._mapLock = true; }
      if (confirm(it) && window.PMap) {
        var node = PMap.find(mapModel, mapSelected);
        if (node && !node.locked) {
          sound("menu_confirm");
          if (saveState) saveState.campaign.currentLevel = node.id;
          store(); recordedLevel = "";
          if (onPlay) onPlay({ mode: mode, hero: hero, difficulty: difficulty, levelId: node.id });
          set("LEVEL_INTRO");
        }
      }
      if (it && it.pausePressed) set("DIFFICULTY");
      return;
    }
    if (screen === "LEVEL_INTRO") {
      if ((confirm(it) && screenMs() >= 400) || screenMs() >= 1800) set("PLAY");
      return;
    }
    if (screen === "PLAY") {
      if (it && it.pausePressed) { sound("pause"); set("PAUSE"); return; }
      /* Sim contract: state.lifeState ∈ "playing"|"continue"|"gameover",
         state.results on level complete, state.vs at boss-level start. */
      if (state && state.lifeState === "gameover") set("GAME_OVER");
      else if (state && state.lifeState === "continue") set("CONTINUE");
      else if (state && state.results) {
        recordResult(state);
        if (state.vs) set("BOSS_DEFEAT");
        else set("RESULTS");
      }
      else if (state && state.vs && !state.vs.done) set("VS");
      return;
    }
    if (screen === "PAUSE") {
      nav(it, PAUSE_ITEMS.length);
      if (it && it.pausePressed) { set("PLAY"); return; }
      if (confirm(it)) {
        sound("menu_confirm");
        if (cursor === 1) openSettings("PAUSE");
        else if (cursor === PAUSE_ITEMS.length - 1) openMap();
        else set("PLAY");
      }
      return;
    }
    if (screen === "SETTINGS") {
      if (window.PSettingsUI && PSettingsUI.update(it).done) set(settingsReturn);
      return;
    }
    if (screen === "VS") {
      if ((confirm(it) && screenMs() >= 900) || screenMs() >= 2600) {
        if (state && state.vs) state.vs.done = true;
        set("PLAY");
      }
      return;
    }
    if (screen === "BOSS_DEFEAT") {
      if ((confirm(it) && screenMs() >= 1000) || screenMs() >= 3000) set("RESULTS");
      return;
    }
    if (screen === "CONTINUE") {
      /* Countdown is sim-owned (state.continueT, 120 Hz ticks); the local
         flash timer is only a fallback until the sim exposes it. */
      if (state && state.continueT != null) {
        continueN = Math.max(0, Math.ceil(state.continueT / 120));
      } else if (flash > 0 && flash % 60 === 0 && continueN > 0) continueN--;
      if (continueN !== continueLast) {
        sound(continueN > 0 ? "countdown" : "countdown_final");
        continueLast = continueN;
      }
      if (confirm(it)) {
        if (window.PSim && PSim.useContinue) {
          try { PSim.useContinue(state); } catch (e) { console.error("PSim.useContinue failed:", e); }
        }
        set("PLAY");
        return;
      }
      if (back(it)) { set("GAME_OVER"); return; }
      if (continueN <= 0 || (state && state.lifeState === "gameover")) set("GAME_OVER");
      return;
    }
    if (screen === "RESULTS") {
      if (confirm(it) && presentationTick() < 300) {
        var pt = presentationTick();
        skipTick = pt < 42 ? 42 : pt < 84 ? 84 : pt < 126 ? 126 : pt < 210 ? 210 : 300;
        return;
      }
      if ((confirm(it) && presentationTick() >= 300) || screenMs() >= 7200) {
        if (window.PGame && PGame.hasNextLevel && PGame.hasNextLevel()) openMap();
        else set("ENDING");
      }
      return;
    }
    if (screen === "ENDING") {
      if ((confirm(it) && screenMs() >= 2000) || screenMs() >= 8000) set("CREDITS");
      return;
    }
    if (screen === "CREDITS") {
      if ((confirm(it) && screenMs() >= 2000) || screenMs() >= 12000) set("POST_CREDIT");
      return;
    }
    if (screen === "POST_CREDIT") {
      if ((confirm(it) && screenMs() >= 1500) || screenMs() >= 6000) set("TITLE");
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
    for (i = 0; i < 4; i++) {
      lab = S(MODES[i]);
      col = i === cursor ? "#F2C14E" : "#FFFFFF";
      if (i === cursor) lab = "> " + lab + " <";
      center(ctx, lab, 96 + i * 22, 1, col);
    }
  }

  function drawSlots(ctx) {
    var slots = window.PSave && PSave.slots ? PSave.slots() : [null, null, null];
    dim(ctx, 0.45); center(ctx, "ВЫБЕРИ СЛОТ", 34, 1, "#F2C14E");
    for (var i = 0; i < 3; i++) {
      var x = 36 + i * 146, s = slots[i], current = s && s.campaign && s.campaign.currentLevel || "w1l1";
      ctx.fillStyle = i === cursor ? "#F2C14E" : "#51466B"; ctx.fillRect(x, 72, 116, 118);
      ctx.fillStyle = "#14121C"; ctx.fillRect(x + 2, 74, 112, 114);
      centerSlot(ctx, "СЛОТ " + (i + 1), x, 92, i === cursor ? "#F2C14E" : "#FFFFFF");
      centerSlot(ctx, current.toUpperCase(), x, 124, "#FFE9A8");
      centerSlot(ctx, s && Object.keys(s.records || {}).length ? "РЕКОРДОВ " + Object.keys(s.records).length : S("EMPTY"), x, 154, "#8FD3FF");
    }
  }

  function centerSlot(ctx, str, x, y, col) {
    if (!window.PFont) return;
    PFont.draw(ctx, str, x + ((116 - PFont.measure(str, 1)) >> 1), y, 1, col);
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
    for (i = 0; i < PAUSE_ITEMS.length; i++) {
      lab = S(PAUSE_ITEMS[i]);
      col = i === cursor ? "#F2C14E" : "#FFFFFF";
      if (i === cursor) lab = "> " + lab + " <";
      center(ctx, lab, 110 + i * 16, 1, col);
    }
  }

  function drawDifficulty(ctx) {
    dim(ctx, 0.45);
    center(ctx, "СЛОЖНОСТЬ", 64, 1, "#F2C14E");
    for (var i = 0; i < DIFFICULTY_LABELS.length; i++) {
      var lab = DIFFICULTY_LABELS[i];
      if (i === cursor) lab = "> " + lab + " <";
      center(ctx, lab, 106 + i * 24, 1, i === cursor ? "#F2C14E" : "#FFFFFF");
    }
  }

  function drawVs(ctx, state) {
    if (window.PPresentation) { PPresentation.drawVs(ctx, state, presentationTick()); return; }
    dim(ctx, 0.45); center(ctx, S("VS"), 120, 2, "#F2C14E");
  }

  function drawContinue(ctx) {
    dim(ctx, 0.55);
    center(ctx, S("CONTINUE"), 62, 2, "#E03B3B");
    center(ctx, String(continueN), 110, 2, "#FFFFFF");
    center(ctx, S("PRESS_START"), 166, 1, "#FFE9A8");
  }

  function totalScore(state) {
    if (!state) return 0;
    return ((state.score || 0) + ((state.ippon && state.ippon.score) || 0)) | 0;
  }

  function drawResults(ctx, state) {
    if (window.PPresentation) { PPresentation.drawResults(ctx, state, presentationTick()); return; }
    dim(ctx, 0.5);
    center(ctx, S("RESULTS"), 44, 2, "#F2C14E");
    center(ctx, S("SCORE") + " " + totalScore(state), 100, 1, "#FFFFFF");
    var last = window.PGame && PGame.hasNextLevel && !PGame.hasNextLevel();
    if (last) center(ctx, S("CREDITS"), 140, 1, "#FFE9A8");
    if (blink()) center(ctx, S("PRESS_START"), 180, 1, "#FFE9A8");
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
    else if (screen === "SAVE_SLOT") drawSlots(ctx);
    else if (screen === "MODE") drawMode(ctx);
    else if (screen === "CHAR") drawChar(ctx);
    else if (screen === "DIFFICULTY") drawDifficulty(ctx);
    else if (screen === "MAP" && window.PMap) PMap.draw(ctx, mapModel, mapSelected, flash);
    else if (screen === "LEVEL_INTRO" && window.PPresentation) PPresentation.drawIntro(ctx, state, presentationTick());
    else if (screen === "PAUSE") drawPause(ctx);
    else if (screen === "SETTINGS" && window.PSettingsUI) PSettingsUI.draw(ctx);
    else if (screen === "VS") drawVs(ctx, state);
    else if (screen === "BOSS_DEFEAT" && window.PPresentation) PPresentation.drawBossDefeat(ctx, state, presentationTick());
    else if (screen === "CONTINUE") drawContinue(ctx);
    else if (screen === "RESULTS") drawResults(ctx, state);
    else if (screen === "ENDING" && window.PPresentation) PPresentation.drawEnding(ctx, presentationTick());
    else if (screen === "CREDITS" && window.PPresentation) PPresentation.drawCredits(ctx, presentationTick());
    else if (screen === "POST_CREDIT" && window.PPresentation) PPresentation.drawPostCredit(ctx, presentationTick());
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
    difficultyId: function () { return difficulty; },
    onPlay: function (fn) { onPlay = fn; }
  };
  if (typeof window !== "undefined") window.PScreens = api;
  if (typeof global !== "undefined") global.PScreens = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
