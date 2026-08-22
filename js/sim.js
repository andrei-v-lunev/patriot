/* World state + tick dispatch.
   // PRD-DEVIATION: axes are x / z=height / d=depth (Part 6), not Part 2 Y-as-depth.
   // PRD-DEVIATION: RNG is mulberry32 (Part 6 tech) not xorshift128 (Part 2). */
(function () {
  var PConst = (typeof window !== "undefined" && window.PConst) || (typeof global !== "undefined" && global.PConst) || (typeof require !== "undefined" ? require("./constants") : null);
  var PRng = (typeof window !== "undefined" && window.PRng) || (typeof global !== "undefined" && global.PRng) || (typeof require !== "undefined" ? require("./rng") : null);
  var PPools = (typeof window !== "undefined" && window.PPools) || (typeof global !== "undefined" && global.PPools) || (typeof require !== "undefined" ? require("./pools") : null);
  var PData = (typeof window !== "undefined" && window.PData) || (typeof global !== "undefined" && global.PData) || (typeof require !== "undefined" ? require("./data") : null);
  function optReq(p) {
    try { return typeof require !== "undefined" ? require(p) : null; } catch (err) { return null; }
  }
  /* Lazy lookups (not cached at load time): in the browser <script> order,
     sim.js loads BEFORE sim.plat.js/sim.belt.js/sim.waves.js/sim.camera.js/
     combat.js/ai.js/sim.tag.js/sim.pickups.js (see index.html), so caching
     these in top-level vars at IIFE-eval time froze them at null/undefined
     forever and silently no-op'd every sim delegate call (movement, combat,
     tagging, waves, camera...). Resolve at call time instead, same pattern
     already used by sim.belt.js's ps(). */
  function simPlat() { return (typeof window !== "undefined" && window.PSimPlat) || (typeof global !== "undefined" && global.PSimPlat) || optReq("./sim.plat"); }
  function simBelt() { return (typeof window !== "undefined" && window.PSimBelt) || (typeof global !== "undefined" && global.PSimBelt) || optReq("./sim.belt"); }
  function simWaves() { return (typeof window !== "undefined" && window.PSimWaves) || (typeof global !== "undefined" && global.PSimWaves) || optReq("./sim.waves"); }
  function simCam() { return (typeof window !== "undefined" && window.PSimCam) || (typeof global !== "undefined" && global.PSimCam) || optReq("./sim.camera"); }
  function combat() { return (typeof window !== "undefined" && window.PCombat) || (typeof global !== "undefined" && global.PCombat) || optReq("./combat"); }
  function ai() { return (typeof window !== "undefined" && window.PAI) || (typeof global !== "undefined" && global.PAI) || optReq("./ai"); }
  function tag() { return (typeof window !== "undefined" && window.PTag) || (typeof global !== "undefined" && global.PTag) || optReq("./sim.tag"); }
  function pickups() { return (typeof window !== "undefined" && window.PPickups) || (typeof global !== "undefined" && global.PPickups) || optReq("./sim.pickups"); }
  function tutorial() { return (typeof window !== "undefined" && window.PTutorialSim) || (typeof global !== "undefined" && global.PTutorialSim) || optReq("./sim.tutorial"); }
  var ZERO = "vx,vz,vd,stateT,iFrames,recoveryT,coyoteT,jumpBufT,apexT,gripTier,gripTimerT,juggleCount,moveT,hitN,throwBaseDmg,throwHits,bounceN,counterStanceT,stagger,staggerMax,staggeredT,lastStagTick,phase,chainedT,reviveHold,mashPts,dropT,palette,chipFloor,hazardIF,pitRespawnT,pitRespawnX,pitRespawnD".split(",");
  var FALS = "unlaunchable,unthrowableFront,aerialOnly,boss,cabBroken,airborneGimmick,downed,otgUsed,frozen,walkIn,reversal,counterStance,benched,tutorialGripOnly,_tutorialFlightSeen".split(",");
  var DUMMY = null;

  function toTicks(f) {
    return PData && PData.toTicks ? PData.toTicks(f) : (f | 0) * 2;
  }
  function copy(src) {
    var o = {}, k;
    if (!src) return o;
    for (k in src) if (Object.prototype.hasOwnProperty.call(src, k)) o[k] = src[k];
    return o;
  }
  function copyList(src) {
    var out = [], i;
    src = src || [];
    for (i = 0; i < src.length; i++) out.push(copy(src[i]));
    return out;
  }
  function blankIntent() {
    return {
      moveX: 0, moveD: 0, jump: false, jumpPressed: false, grip: false, gripPressed: false,
      throwDir: -1, throwPressed: false, tag: false, tagPressed: false, special: false,
      specialPressed: false, ukemi: false, ukemiPressed: false, pause: false, pausePressed: false
    };
  }
  function q8(v) {
    if (typeof v !== "number" || v !== v) return 0;
    if (v > 1) v = 1;
    if (v < -1) v = -1;
    return Math.round(v * 8) / 8;
  }
  function resetEnt(e) {
    var i;
    for (i = 0; i < ZERO.length; i++) e[ZERO[i]] = 0;
    for (i = 0; i < FALS.length; i++) e[FALS[i]] = false;
    e.combatState = "FREE";
    e._consumedGripAt = e._consumedSpecialAt = e._consumedUkemiAt = -9999;
    e.moveId = e.gimmick = e.waveId = "";
    e.gripId = e.dropId = e.playerIndex = -1;
    e.grounded = e.grippable = true;
    e.facing = 1;
    if (!e.hitIds) e.hitIds = [0, 0, 0, 0, 0, 0, 0, 0];
    else for (i = 0; i < 8; i++) e.hitIds[i] = 0;
  }
  function heroTable(id) {
    var t = PConst && PConst.heroes && PConst.heroes[id];
    return t || (PConst && PConst.heroes && PConst.heroes.idris) || { id: id || "idris", hp: 120, w: 34, h: 62, dw: 14, runMax: 150, groundAccel: 1200, groundFric: 1800, turnMul: 2, airAccel: 600, airDrag: 240, airMax: 150, riseG: 1500, cutG: 2900, apexG: 1050, fallG: 1900, jumpV: 470, maxFall: 760, coyote: 0.1, jumpBuf: 0.117, landSoft: 4, beltJumpV: 400, beltJumpG: 2100, gripStartup: 7 };
  }
  function spawnHero(state, spec) {
    var e = state.pools.heroes.alloc(), t, hid;
    if (!e) return null;
    spec = spec || {};
    resetEnt(e);
    hid = spec.hero || spec.archetype || "idris";
    t = heroTable(hid);
    e.kind = "hero"; e.team = "hero"; e.archetype = hid; e.stats = copy(t);
    e.w = t.w; e.h = t.h; e.dw = t.dw; e.hp = e.maxHp = t.hp;
    e.x = spec.x != null ? spec.x : 80; e.z = spec.z != null ? spec.z : 16;
    e.d = spec.d != null ? spec.d : 24; e.facing = spec.facing != null ? spec.facing : 1;
    e.mode = state.mode || "plat"; e.playerIndex = spec.playerIndex != null ? spec.playerIndex : 0;
    e.palette = spec.palette || 0; state.heroes.push(e); return e;
  }
  function defStats(spd) {
    return { runMax: spd, groundAccel: 800, groundFric: 1000, turnMul: 2, airAccel: 400, airDrag: 200, airMax: spd, riseG: 1500, cutG: 2900, apexG: 1050, fallG: 1900, jumpV: 400, maxFall: 760, beltJumpV: 400, beltJumpG: 2100 };
  }
  function difficulty(id) {
    if (id === "easy") return { id: id, hp: 0.75, damage: 0.70, speed: 0.90, telegraph: 1.30, tokens: 2, mash: 0.75, maxAlive: 4, lives: 5, meter: 1.25, score: 0.80, enrageS: 360 };
    if (id === "hard") return { id: id, hp: 1.30, damage: 1.35, speed: 1.12, telegraph: 0.85, tokens: 3, mash: 1.30, maxAlive: 7, lives: 2, meter: 0.85, score: 1.25, enrageS: 180 };
    return { id: "normal", hp: 1, damage: 1, speed: 1, telegraph: 1, tokens: 2, mash: 1, maxAlive: 6, lives: 3, meter: 1, score: 1, enrageS: 240 };
  }
  function spawnEnemy(state, spec) {
    var e = state.pools.enemies.alloc(), arch;
    if (!e) return null;
    spec = spec || {};
    resetEnt(e);
    arch = PData && PData.getEnemy ? PData.getEnemy(spec.archetype) : null;
    e.kind = "enemy"; e.team = "enemy"; e.archetype = spec.archetype || "";
    if (arch) {
      e.w = arch.w; e.h = arch.h; e.dw = arch.dw;
      e.hp = e.maxHp = Math.ceil(arch.hp * (state.enemyHpMul || 1));
      e.unlaunchable = !!arch.unlaunchable; e.unthrowableFront = !!arch.unthrowableFront;
      e.aerialOnly = !!arch.aerialOnly; e.reversal = !!arch.reversal; e.boss = !!arch.boss; e.counterStance = !!arch.counterStance;
      e.gimmick = arch.gimmick || ""; e.staggerMax = arch.staggerMax || 0;
      e.grippable = arch.boss ? false : arch.grippable !== false;
      if (arch.boss) e.phase = 1;
      if (arch.chipFloor != null) e.chipFloor = arch.chipFloor;
      e.stats = defStats((arch.speed || 80) * (state.enemySpeedMul || 1));
      e.moveMul = state.enemySpeedMul || 1;
      e.damageMul = state.enemyDamageMul || 1;
      e.telegraphMul = state.enemyTelegraphMul || 1;
      if (arch.attack && arch.attack.jumpV) e.stats.jumpV = arch.attack.jumpV;
      e.scoreVal = arch.score || 0; e.tokenCost = arch.tokenCost || 1;
    } else { e.w = 30; e.h = 40; e.dw = 12; e.hp = e.maxHp = 20; e.stats = defStats(80); }
    e.x = spec.x != null ? spec.x : 400; e.d = spec.d != null ? spec.d : 24;
    e.z = spec.z != null ? spec.z : 16; e.facing = spec.facing != null ? spec.facing : -1;
    e.mode = state.mode || "plat"; e.waveId = spec.waveId || "";
    if (e.aerialOnly) { if (spec.z == null) e.z = 80; e.grounded = false; }
    state.enemies.push(e); return e;
  }
  function applySegment(state, idx) {
    var lv = state.level, seg, i, e, sps;
    if (!lv || !lv.segments || !lv.segments[idx]) return;
    for (i = 0; i < state.enemies.length; i++) { state.enemies[i].alive = false; state.pools.enemies.release(state.enemies[i]); }
    state.enemies.length = 0;
    seg = lv.segments[idx];
    state.segIndex = idx; state.segment = seg; state.mode = seg.mode || "plat";
    state.solids = copyList(seg.solids); state.hazards = copyList(seg.hazards); state.props = copyList(seg.props);
    /* Arena segments commonly have no checkpoint of their own. Preserve the
       latest platform checkpoint across that seam so Continue resumes the
       level's retained progress instead of silently falling back to x=80. */
    if (seg.checkpoints && seg.checkpoints.length) {
      state.checkpointIndex = 0;
      state.currentCheckpoint = copy(seg.checkpoints[0]);
    }
    state.dLock = seg.dLock != null ? seg.dLock : 24;
    state.wind = state.level.wind || seg.wind || 0;
    state.autoScroll = state.level.autoScroll || seg.autoScroll || 0;
    state.chase = !!(state.level.chase || seg.chase);
    state.slippery = !!(state.level.slippery || seg.slippery);
    state.scrollX = 0;
    state.width = seg.width || (seg.arena ? seg.arena.xMax : 2000);
    state.go.active = false; state.go.opened = false; state.go.openT = 0;
    if (seg.arena) {
      state.dMin = seg.arena.dMin || 0; state.dMax = seg.arena.dMax || 60;
      if (!state.solids.length) {
        state.solids = [{ x: -2000, z: 0, w: 8000, h: 16, type: "solid" }];
      }
      if (simBelt() && simBelt().onEnter) simBelt().onEnter(state, seg);
    } else { state.xMin = 0; state.xMax = state.width; state.cam.locked = false; }
    for (i = 0; i < state.heroes.length; i++) {
      e = state.heroes[i]; e.mode = state.mode;
      if (state.mode === "plat") { e.d = state.dLock; e.vd = 0; }
    }
    if (simWaves() && simWaves().init) simWaves().init(state, seg);
    sps = seg.spawns || [];
    for (i = 0; i < sps.length; i++) spawnEnemy(state, sps[i]);
    if (tutorial() && tutorial().init) tutorial().init(state);
  }
  function loadLevel(state, levelId) {
    var lv = PData && PData.getLevel ? PData.getLevel(levelId) : null;
    if (!lv) return false;
    state.level = lv;
    state.levelId = levelId;
    state.worldName = lv.worldName || "";
    state.name = lv.name || "";
    /* Boss levels declare "vs" (e.g. w1l3 "vs":"B1"): flag it at level START
       so the UI can show the VS screen. Cleared on non-boss levels. */
    state.vs = lv.vs ? { id: lv.vs, done: false } : null;
    state.results = null;
    applySegment(state, 0);
    return true;
  }
  function createGame(seed, opts) {
    var mode, players, heroId, other, tok, state, same, bench, diff;
    opts = opts || {};
    /* BUGFIX: callers upstream (js/game.js) pass the UI screen's mode id
       verbatim ("ARCADE"/"COOP"/"DOJO"), not a sim mode. Left unnormalized,
       state.mode never equals "plat" or "belt", which silently breaks every
       mode-gated system: sim.belt.js's platExit() (segment/level exit),
       sim.camera.js's belt-vs-plat branch, and per-entity e.mode checks in
       integrate(). Only "belt" is ever a meaningful non-default sim mode;
       anything else (including unrecognized UI ids) must fall back to "plat". */
    mode = opts.mode === "belt" ? "belt" : "plat";
    players = opts.players === 2 ? 2 : 1;
    diff = difficulty(typeof opts.difficulty === "string" ? opts.difficulty : "normal");
    heroId = opts.hero || "idris";
    other = heroId === "idris" ? "otajon" : "idris";
    tok = players === 2 ? ((PConst && PConst.TOKENS_2P) || 3) : diff.tokens;
    state = {
      tick: 0, hitstop: 0, events: [], score: 0, meter: 0, lives: diff.lives,
      ippon: { chain: 0, timer: 0, paused: false },
      tag: { cooldownT: 0, active: 0, benchHp: 0, benchMax: 0 },
      attackTokens: tok, attackTokensMax: tok,
      difficulty: diff.id,
      enemyHpMul: diff.hp * (players === 2 ? 1.35 : 1), enemyDamageMul: diff.damage,
      enemySpeedMul: diff.speed, enemyTelegraphMul: diff.telegraph,
      meterGainMul: diff.meter, scoreMul: diff.score, bossEnrageS: diff.enrageS,
      maxAlive: players === 2 ? 8 : diff.maxAlive,
      cam: { x: 0, targetX: 0, z: 0, locked: false },
      go: { active: false, opened: false, openT: 0 },
      mode: mode, segment: null, segIndex: 0, solids: [], hazards: [], props: [],
      enemies: [], heroes: [], projectiles: [], pickups: [], frozen: [],
      pools: PPools.create(), rng: PRng.create(seed == null ? 1337 : seed), rngState: 0,
      level: null, levelId: opts.levelId || "", worldName: "", name: "",
      players: players, pendingSeg: -1, airSwapT: 0,
      training: !!opts.training,
      lifeState: "playing", continueT: 0, activeHero: 0, _consumedTagAt: -9999,
      /* Browser default is unlimited continues (PRD §4.10.3); non-negative
         values opt into a finite/purist pool. -1 is the deterministic
         unlimited sentinel. */
      continues: opts.continues != null ? opts.continues : -1,
      /* P1-13: numeric multiplier for combat.grip's mash-rate read. UI passes
         string ids ("easy"/"normal"/"hard") — map per PRD §4.10.4 grip-break
         mash rate; a raw numeric opts.difficulty is honored as-is. */
      difficultyMul: typeof opts.difficulty === "number" ? opts.difficulty : diff.mash,
      results: null, vs: null,
      dMin: 0, dMax: 60, dLock: 24, xMin: 0, xMax: 1e9, width: 2000
    };
    state.rngState = state.rng.getState();
    if (opts.empty) {
      state.solids = [{ x: 0, z: 0, w: 2000, h: 16, type: "solid" }];
      state.segment = { id: "empty", mode: mode, width: 2000, dLock: 24, solids: state.solids, arena: mode === "belt" ? { camX: 0, xMin: 0, xMax: 2000, dMin: 0, dMax: 60 } : null };
      if (mode === "belt" && simBelt() && simBelt().onEnter) simBelt().onEnter(state, state.segment);
    } else {
      /* BUGFIX: callers upstream (js/game.js) never passed opts.levelId at
         all, so createGame silently fell through to a bare single-solid
         sandbox with no segment, no wave defs, no spawns — nothing ever
         appeared. Default to the campaign's first level, same id already
         used elsewhere (js/game.js dummyState/titleState) as the game's
         canonical starting level, so real play always has a level loaded. */
      if (!loadLevel(state, opts.levelId || "w1l1")) loadLevel(state, "w1l1");
      if (!state.level) state.solids = [{ x: 0, z: 0, w: 2000, h: 16, type: "solid" }];
    }
    spawnHero(state, { hero: heroId, x: 80, z: 16, d: 24, playerIndex: 0 });
    if (players === 2) {
      same = (opts.hero2 || other) === heroId;
      spawnHero(state, { hero: opts.hero2 || other, x: 80, z: 16, d: 32, playerIndex: 1, palette: same ? 1 : 0 });
    } else {
      /* P1-2: solo play still gets the tag partner as a real bench entity so
         PTag.trySwap (KeyI, PRD §4.9.1) has something to swap in. Parked
         off-screen, benched, driven by P1's intents once it swaps in. */
      bench = spawnHero(state, { hero: other, x: -9999, z: 16, d: 24, playerIndex: 0 });
      if (bench) bench.benched = true;
    }
    state.tag.benchHp = state.tag.benchMax = heroTable(other).hp;
    return state;
  }
  function applyIntent(state, e, intent) {
    e.intent = intent;
    if (intent.gripPressed && e.combatState === "FREE" && !(combat() && combat().tick)) {
      e.combatState = "APPROACH";
      e.stateT = 0;
    }
    if (intent.tagPressed && tag() && tag().trySwap && state.players !== 2) {
      tag().trySwap(state, e.playerIndex || 0, intent);
    }
  }
  function startMove(state, ent, id) {
    var def, total;
    if (combat() && combat().startMove) return combat().startMove(state, ent, id);
    if (id === "sweep_idris" || id === "sweep_otajon") {
      if (combat() && combat().startSweep) return combat().startSweep(state, ent);
    }
    def = PData && PData.getMove ? PData.getMove(id) : null;
    total = def ? ((def.startup || 0) + (def.active || 0) + (def.recovery || 0)) : 12;
    ent.moveId = id;
    ent.moveT = 0;
    ent.moveLen = toTicks(total);
    ent.stateT = ent.moveLen;
    ent.combatState = "SPECIAL";
    ent.moveDone = false;
    return true;
  }
  function integrate(state, e, intent) {
    if (e.mode === "belt" && simBelt()) simBelt().integrate(state, e, intent);
    else if (simPlat()) simPlat().integrate(state, e, intent);
  }
  function deathSweep(state) {
    function sweep(arr, pool) {
      var dead = [], live = [], seen = [], i, ent;
      for (i = 0; i < arr.length; i++) {
        ent = arr[i];
        if (!ent || seen.indexOf(ent) >= 0) continue;
        seen.push(ent);
        if (ent.hp <= 0) ent.alive = false;
        if (!ent.alive) dead.push(ent);
        else live.push(ent);
      }
      dead.sort(function (a, b) { return a.id - b.id; });
      for (i = 0; i < dead.length; i++) {
        if (dead[i].kind === "enemy") {
          if (dead[i].scoreVal) state.score += Math.round(dead[i].scoreVal * (state.scoreMul || 1));
          state.lastEnemyDeath = {
            waveId: dead[i].waveId || "",
            x: dead[i].x,
            d: dead[i].d,
            tick: state.tick
          };
        }
        pool.release(dead[i]);
      }
      arr.length = 0;
      for (i = 0; i < live.length; i++) arr.push(live[i]);
    }
    sweep(state.enemies, state.pools.enemies);
    /* P0-3: heroes are NOT swept. Releasing a 0-hp hero to the pool here ran
       before PTag's death handling ever saw it, leaving a hero-less world
       ticking forever with lives never decrementing. Hero death/lives/continue
       flow is owned by sim.tag.js (death1P/downed/loseLife) + useContinue. */
  }
  function tickProjectiles(state) {
    var t = (PConst && PConst.SIM_DT) || 1 / 120;
    var tol = (PConst && PConst.DEPTH_HIT) || 10;
    var arr = state.projectiles, camX = state.cam ? state.cam.x : 0;
    var i, j, n = 0, p, h, gone, dealt, cmb, hitApi;
    if (!arr || !arr.length) return;
    for (i = 0; i < arr.length; i++) {
      p = arr[i];
      if (!p.alive) continue;
      p.x += p.vx * t;
      p.z += (p.vz || 0) * t;
      p.life = (p.life || 0) - 1;
      gone = false;
      for (j = 0; j < state.heroes.length; j++) {
        h = state.heroes[j];
        if (!h.alive || h.benched || h.hp <= 0) continue;
        if (h.combatState === "THROWN_FLIGHT" || h.combatState === "DOWN") continue;
        if (Math.abs((p.d || 0) - h.d) > tol) continue;
        if (Math.abs(p.x - h.x) > ((p.w || 12) + h.w) * 0.5) continue;
        if (p.z + (p.h || 12) * 0.5 < (h.z || 0) || p.z - (p.h || 12) * 0.5 > (h.z || 0) + h.h) continue;
        cmb = combat();
        dealt = cmb && cmb.applyDamage ? cmb.applyDamage(state, h, p.dmg || 10, p, {}) : 0;
        if (dealt > 0) {
          hitApi = (typeof window !== "undefined" && window.PCombatHit) || (typeof global !== "undefined" && global.PCombatHit) || optReq("./combat.hit");
          if (hitApi && hitApi.enterHitstun) hitApi.enterHitstun(h, 12);
          h.vx = (p.vx >= 0 ? 1 : -1) * 120;
        }
        gone = true;
        break;
      }
      if (gone || p.life <= 0 || p.x < camX - 240 || p.x > camX + 1200 || p.z < -40) {
        state.pools.projectiles.release(p);
        continue;
      }
      arr[n++] = p;
    }
    arr.length = n;
  }
  function useContinue(state) {
    var cp, i, h, active;
    if (!state || state.lifeState !== "continue") return false;
    if (state.continues == null) state.continues = -1;
    if (state.continues === 0) { state.lifeState = "gameover"; return false; }
    if (state.continues > 0) state.continues--;
    cp = state.currentCheckpoint || (state.segment && state.segment.checkpoints && state.segment.checkpoints[0]);
    if (simWaves() && simWaves().restartCurrent) simWaves().restartCurrent(state);
    active = state.activeHero;
    if ((active | 0) !== active || active < 0 || active >= state.heroes.length || !state.heroes[active]) {
      active = 0;
      for (i = 0; i < state.heroes.length; i++) {
        if (state.heroes[i] && !state.heroes[i].benched) { active = i; break; }
      }
      state.activeHero = active;
    }
    for (i = 0; i < state.heroes.length; i++) {
      h = state.heroes[i];
      h.alive = true;
      h._outOfLives = false;
      h.hp = h.maxHp;
      h.combatState = "FREE";
      h.iFrames = toTicks(120);
      h.downT = 0; h.respawnT = 0; h.reviveHoldT = 0;
      h.vx = h.vz = h.vd = 0;
      h.z = 16;
      h.x = cp ? cp.x : 80;
      h.d = cp ? cp.d : (state.dLock || 24);
      h.benched = state.players !== 2 && i !== active;
      if (h.benched) h.x = -9999;
    }
    state.lives = difficulty(state.difficulty).lives;
    if (state.players === 2) state.lives2 = state.lives;
    state.continueT = 0;
    state.lifeState = "playing";
    state.score = Math.floor((state.score || 0) * 0.8);
    if (state.ippon) state.ippon.score = Math.floor((state.ippon.score || 0) * 0.8);
    state.continuePenalty = (state.continuePenalty || 0) + 1;
    return true;
  }
  function hashWorld(state) {
    var parts = [String(state.tick), String(state.rngState), String(state.levelId), String(state.segmentIndex),
      String(state.lives), String(state.lives2), String(state.continues), String(state.lifeState),
      String(state.activeHero), String(state._consumedTagAt), String(state.hitstop),
      String(state.maxAlive), String(state.difficulty)];
    var list = [], i, e, s, h;
    for (i = 0; i < state.heroes.length; i++) list.push(state.heroes[i]);
    for (i = 0; i < state.enemies.length; i++) list.push(state.enemies[i]);
    for (i = 0; i < (state.projectiles || []).length; i++) list.push(state.projectiles[i]);
    for (i = 0; i < (state.pickups || []).length; i++) list.push(state.pickups[i]);
    list.sort(function (a, b) { return a.kind === b.kind ? a.id - b.id : a.kind < b.kind ? -1 : 1; });
    for (i = 0; i < list.length; i++) {
      e = list[i];
      parts.push([e.kind, e.id, e.alive, e.archetype, e.x, e.z, e.d, e.hp, e.combatState,
        e.aiState, e.atkPhase, e.patternName, e.telegraphT, e.telegraphMax,
        e.activeT, e.activeMax, e.recoverT, e.recoverMax,
        e.staggeredT, e.stag, e.phase, e._outOfLives, e.vx, e.vz, e.vd, e.flightT, e.bounceN,
        e.ffN, e.lifeT, e.pitRespawnT, e.pitRespawnX, e.pitRespawnD,
        e._consumedGripAt, e._consumedSpecialAt, e._consumedUkemiAt,
        e.owner && e.owner.id].join(","));
    }
    parts.push(String(state.ippon.chain), String(state.ippon.timer), String(state.ippon.score), String(state.score));
    parts.push(JSON.stringify(state.wave && {
      started: state.wave.started, cleared: state.wave.cleared, clearedAt: state.wave.clearedAt,
      pending: state.wave.pending, goFired: state.wave.goFired, allCleared: state.wave.allCleared
    }));
    parts.push(JSON.stringify(state.go), JSON.stringify(state.currentCheckpoint), JSON.stringify(state.cage),
      JSON.stringify(state.tutorial));
    s = parts.join("|");
    h = 2166136261;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16);
  }
  function depthOk(a, b, tol) {
    if (tol == null) tol = (PConst && PConst.DEPTH_HIT) || 10;
    return Math.abs(a.d - b.d) <= tol;
  }
  function step(state, intents) {
    var pair, i, e, a, b;
    if (!DUMMY) DUMMY = blankIntent();
    if (!intents) pair = [DUMMY, DUMMY];
    else if (intents.length) {
      a = intents[0] || DUMMY; b = intents[1] || DUMMY;
      a.moveX = q8(a.moveX); a.moveD = q8(a.moveD); b.moveX = q8(b.moveX); b.moveD = q8(b.moveD);
      pair = [a, b];
    } else { intents.moveX = q8(intents.moveX); intents.moveD = q8(intents.moveD); pair = [intents, DUMMY]; }
    state.intents = pair;
    /* P0-5: no sim-internal pause. PScreens/game.js is the single pause
       authority — game.js stops calling step() while paused. */
    for (i = 0; i < state.heroes.length; i++) {
      e = state.heroes[i];
      if (!e.alive || e.benched) continue;
      applyIntent(state, e, pair[e.playerIndex] || pair[0]);
    }
    if (ai() && ai().think) ai().think(state);
    if (combat() && combat().tick) combat().tick(state);
    for (i = 0; i < state.heroes.length; i++) {
      e = state.heroes[i];
      if (!e.alive || e.benched || (state.hitstop > 0 && e.frozen)) continue;
      if (e.combatState === "THROWN_FLIGHT" || e.combatState === "GRIPPED" || e.combatState === "THROWING") continue;
      integrate(state, e, pair[e.playerIndex] || pair[0]);
    }
    for (i = 0; i < state.enemies.length; i++) {
      e = state.enemies[i];
      if (!e.alive || (state.hitstop > 0 && e.frozen)) continue;
      if (e.combatState === "THROWN_FLIGHT" || e.combatState === "GRIPPED") continue;
      integrate(state, e, e.intent || DUMMY);
    }
    tickProjectiles(state);
    if (simBelt() && simBelt().pushBodies) simBelt().pushBodies(state);
    if (tutorial() && tutorial().tick) tutorial().tick(state, pair);
    deathSweep(state);
    if (tag() && tag().tick) tag().tick(state, pair);
    /* Continue countdown (lifeState="continue" → continueT-- → "gameover")
       is ticked by sim.pickups.js tickLives(), called below. */
    if (pickups() && pickups().tick) pickups().tick(state);
    if (simWaves() && simWaves().step) simWaves().step(state);
    if (simCam() && simCam().step) simCam().step(state);
    if (simBelt() && simBelt().tick) simBelt().tick(state);
    state.rngState = state.rng.getState();
    state.tick++;
    return state;
  }
  var api = {
    createGame: createGame, step: step, hashWorld: hashWorld, blankIntent: blankIntent,
    spawnEnemy: spawnEnemy, spawnHero: spawnHero, loadLevel: loadLevel, toTicks: toTicks,
    depthOk: depthOk, applySegment: applySegment, startMove: startMove,
    useContinue: useContinue
  };
  if (typeof window !== "undefined") window.PSim = api;
  if (typeof global !== "undefined") global.PSim = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
