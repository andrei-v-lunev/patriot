/* rAF shell. Part 6 §3.3.1 — 120 Hz accumulator, no hidden-time bank. */
(function () {
  var SIM_HZ = 120;
  var SIM_DT = 1 / SIM_HZ;
  var MAX_STEPS = 8;
  var acc = 0;
  var last = 0;
  var running = false;
  var state = null;
  var W = 480;
  var H = 270;

  function dummyState(opts) {
    opts = opts || {};
    var hid = opts.hero || "idris";
    var C = window.PConst || {};
    var def = (C.heroes && C.heroes[hid]) || { w: 34, h: 62, hp: 120 };
    var worldName = "ГОРНОЕ СЕЛО";
    if (window.PData && PData.getString) worldName = PData.getString("W1");
    var lv = window.PData && PData.getLevel ? PData.getLevel("w1l1") : null;
    if (lv && lv.worldName) worldName = lv.worldName;
    return {
      tick: 0,
      events: [],
      heroes: [{
        id: 0,
        alive: true,
        kind: "hero",
        team: "hero",
        heroId: hid,
        x: 110,
        z: 0,
        d: 24,
        vx: 0,
        vz: 0,
        w: def.w || 34,
        h: def.h || 62,
        facing: 1,
        hp: def.hp || 120,
        maxHp: def.hp || 120,
        meter: 0,
        lives: (C.LIVES != null ? C.LIVES : 3)
      }],
      enemies: [{
        id: 10,
        alive: true,
        kind: "enemy",
        team: "enemy",
        archetype: "E1",
        x: 300,
        z: 0,
        d: 32,
        w: 30,
        h: 40,
        facing: -1,
        hp: 24,
        maxHp: 24
      }],
      cam: { x: 0, z: 0, shakeX: 0, shakeZ: 0, locked: false },
      ippon: { chain: 0 },
      go: { active: false },
      level: { id: "w1l1", world: 1, worldName: worldName },
      score: 0,
      mode: "belt",
      shake: 0
    };
  }

  function titleState() {
    var st = dummyState({ hero: "idris" });
    st.heroes[0].x = 160;
    st.enemies[0].x = 320;
    return st;
  }

  /* Campaign level order, flattened from data/campaign.json (via PData). */
  function campaignLevels() {
    var r = window.PData && PData.ready ? PData.ready() : null;
    var c = r && r.campaign;
    var out = [], i, j, w;
    if (c && c.worlds) {
      for (i = 0; i < c.worlds.length; i++) {
        w = c.worlds[i];
        for (j = 0; j < (w.levels || []).length; j++) out.push(w.levels[j].id);
      }
    }
    return out.length ? out : ["w1l1"];
  }

  /* Last UI selection, kept so nextLevel() can rebuild sim opts. */
  var lastUI = { mode: "ARCADE", hero: "idris", difficulty: "normal" };

  /* Translate UI screen opts ({mode:"ARCADE"|"COOP"|"DOJO", hero}) into the
     PSim.createGame opts contract ({levelId, players, hero, hero2, difficulty}).
     The UI mode id is NOT a sim mode ("belt"/"plat") — never forward it. */
  function createPlay(opts) {
    opts = opts || {};
    if (opts.mode) lastUI.mode = opts.mode;
    if (opts.hero) lastUI.hero = opts.hero;
    if (opts.difficulty) lastUI.difficulty = opts.difficulty;
    var hero = opts.hero || lastUI.hero || "idris";
    var hints = window.PScreens && PScreens.hintConfig ? PScreens.hintConfig() : { mode: "once", seen: [] };
    var simOpts = {
      levelId: opts.levelId || campaignLevels()[0],
      players: lastUI.mode === "COOP" ? 2 : 1,
      hero: hero,
      hero2: opts.hero2 || (hero === "idris" ? "otajon" : "idris"),
      difficulty: opts.difficulty || lastUI.difficulty || "normal",
      training: lastUI.mode === "DOJO",
      hintMode: hints.mode,
      hintsSeen: hints.seen
    };
    if (window.PSim && PSim.createGame) {
      try {
        return PSim.createGame(1337, simOpts);
      } catch (e) {
        console.error("PSim.createGame failed:", e);
      }
    }
    return dummyState(opts);
  }

  function currentLevelId() {
    if (!state) return "";
    return state.levelId || (state.level && state.level.id) || "";
  }

  function musicForLevel(id) {
    if (/^w1/.test(id)) return "w1";
    if (/^w2/.test(id)) return "w2";
    if (/^w3l2/.test(id)) return "w3roof";
    if (/^w3/.test(id)) return "w3";
    if (/^w4/.test(id)) return "w4";
    if (/^w5l3/.test(id)) return "arena";
    if (/^w5/.test(id)) return "w5";
    return "w1";
  }

  function hasNextLevel() {
    var levels = campaignLevels();
    var idx = levels.indexOf(currentLevelId());
    return idx >= 0 && idx + 1 < levels.length;
  }

  function carryStocks(st, lives, lives2) {
    var i, h, stock;
    if (!st) return st;
    if (lives != null && st.lives != null) st.lives = lives;
    if (lives2 != null) st.lives2 = lives2;
    if ((st.players | 0) !== 2) return st;
    for (i = 0; i < (st.heroes || []).length; i++) {
      h = st.heroes[i];
      stock = (h.playerIndex | 0) === 1 ? st.lives2 : st.lives;
      if (stock > 0) continue;
      h.alive = false; h.hp = 0; h._outOfLives = true;
      h.combatState = "DOWN"; h.vx = 0; h.vz = 0; h.vd = 0;
    }
    return st;
  }

  /* Advance to the next campaign level, carrying score/lives/hero across.
     Returns true if a next level was started, false on the last level. */
  function nextLevel() {
    if (!state || state.training) return false;
    var levels = campaignLevels();
    var idx = levels.indexOf(currentLevelId());
    if (idx < 0 || idx + 1 >= levels.length) return false;
    var score = (state.score || 0) + ((state.ippon && state.ippon.score) || 0);
    var lives = state.lives;
    var lives2 = state.lives2;
    var continues = state.continues;
    var st = createPlay({ levelId: levels[idx + 1] });
    if (!st) return false;
    st.score = score;
    carryStocks(st, lives, lives2);
    if (continues != null) st.continues = continues;
    state = st;
    if (window.PAudio && PAudio.playStem) PAudio.playStem(musicForLevel(levels[idx + 1]));
    if (window.PAudio && PAudio.playAmbience) PAudio.playAmbience(levels[idx + 1]);
    return true;
  }

  function paintTitleFallback() {
    if (!window.PBoot || !PBoot.bctx) return;
    var ctx = PBoot.bctx;
    ctx.fillStyle = "#2A3B63";
    ctx.fillRect(0, 0, W, H);
    if (window.PLayers) PLayers.draw(ctx, { x: 0 }, 1);
    else {
      ctx.fillStyle = "#C8A46A";
      ctx.fillRect(0, 160, W, 110);
    }
    if (window.PFont) {
      var t = "ПАТРИОТ";
      var p = "НАЖМИ СТАРТ";
      if (window.PData && PData.getString) {
        t = PData.getString("TITLE");
        p = PData.getString("PRESS_START");
      }
      var tw = PFont.measure(t, 2);
      PFont.draw(ctx, t, (W - tw) >> 1, 88, 2, "#F2C14E");
      var pw = PFont.measure(p, 1);
      PFont.draw(ctx, p, (W - pw) >> 1, 170, 1, "#FFFFFF");
    }
    if (PBoot.ctx && PBoot.buffer) {
      var s = PBoot.scale || 1;
      PBoot.ctx.imageSmoothingEnabled = false;
      PBoot.ctx.fillStyle = "#000";
      PBoot.ctx.fillRect(0, 0, PBoot.canvas.width, PBoot.canvas.height);
      PBoot.ctx.drawImage(PBoot.buffer, 0, 0, W, H, 0, 0, W * s, H * s);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (typeof document !== "undefined" && document.hidden) {
      last = now;
      acc = 0;
      return;
    }
    if (!last) last = now;
    var dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    acc += dt;

    if (window.PInput && PInput.setTick && state) PInput.setTick(state.tick || 0);
    if (window.PInput && PInput.poll) PInput.poll();

    var scr = window.PScreens && PScreens.get ? PScreens.get() : "PLAY";
    /* CONTINUE also steps the sim: the countdown (state.continueT) is
       sim-owned, so the clock must keep ticking while the screen is up. */
    var playing = window.PScreens ? (PScreens.isPlay() || scr === "CONTINUE") : true;
    var paused = window.PScreens ? PScreens.isPause() : false;
    var intents = (window.PInput && PInput.intents) ? PInput.intents() : [{}, {}];

    if (playing && !paused && window.PSim && PSim.step && state) {
      var steps = 0;
      while (acc >= SIM_DT && steps < MAX_STEPS) {
        PSim.step(state, intents);
        acc -= SIM_DT;
        steps++;
      }
      if (steps === MAX_STEPS) acc = 0;
    } else {
      acc = 0;
    }

    if (window.PScreens) PScreens.update(intents, state);
    if (window.PScreens && PScreens.syncHints) PScreens.syncHints(state);

    if (window.PRender && PRender.draw) {
      PRender.draw(state, playing && !paused ? acc / SIM_DT : 0);
    } else {
      paintTitleFallback();
    }
    /* Render-side FX ingests sim events during draw; audio clears the compact
       queue only afterwards so both consumers see the same frame. */
    if (window.PAudioEvents && state) PAudioEvents.update(state);
    if (window.PAudio && state) PAudio.consume(state.events);
    if (window.PAudio && PAudio.setMusicIntensity && state) {
      PAudio.setMusicIntensity(Math.min(1, ((state.ippon && state.ippon.chain) || 0) / 5));
    }
  }

  function pause() {
    if (window.PScreens && PScreens.isPlay()) PScreens.set("PAUSE");
    else if (window.PScreens && PScreens.isPause()) PScreens.set("PLAY");
  }

  function start() {
    if (running) return;
    running = true;
    if (!state) state = titleState();
    if (window.PScreens) {
      PScreens.onPlay(function (opts) {
        state = createPlay(opts);
        PScreens.set("PLAY");
        if (window.PAudio && PAudio.unlock) PAudio.unlock();
        if (window.PAudio && PAudio.playStem) PAudio.playStem(musicForLevel(opts && opts.levelId || "w1l1"));
        if (window.PAudio && PAudio.playAmbience) PAudio.playAmbience(opts && opts.levelId || "w1l1");
      });
    }
    requestAnimationFrame(frame);
  }

  function boot() {
    if (window.PBoot && PBoot.run) {
      PBoot.run(function () {
        start();
      });
    } else {
      start();
    }
  }

  if (typeof window !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }

  var api = {
    start: start,
    pause: pause,
    nextLevel: nextLevel,
    hasNextLevel: hasNextLevel,
    _carryStocks: carryStocks,
    get state() { return state; },
    SIM_HZ: SIM_HZ,
    SIM_DT: SIM_DT
  };
  if (typeof window !== "undefined") window.PGame = api;
  if (typeof global !== "undefined") global.PGame = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
