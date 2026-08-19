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

  function createPlay(opts) {
    opts = opts || {};
    if (window.PSim && PSim.createGame) {
      try {
        return PSim.createGame(1337, opts);
      } catch (e) {
        try { return PSim.createGame(1337); } catch (e2) {}
      }
    }
    return dummyState(opts);
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

    var playing = window.PScreens ? PScreens.isPlay() : true;
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

    if (window.PAudio && state) PAudio.consume(state.events);

    if (window.PRender && PRender.draw) {
      PRender.draw(state, playing && !paused ? acc / SIM_DT : 0);
    } else {
      paintTitleFallback();
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
        if (window.PAudio && PAudio.playStem) PAudio.playStem("w1");
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
    get state() { return state; },
    SIM_HZ: SIM_HZ,
    SIM_DT: SIM_DT
  };
  if (typeof window !== "undefined") window.PGame = api;
  if (typeof global !== "undefined") global.PGame = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
