/* World state + tick dispatch.
   // PRD-DEVIATION: axes are x / z=height / d=depth (Part 6), not Part 2 Y-as-depth.
   // PRD-DEVIATION: RNG is mulberry32 (Part 6 tech) not xorshift128 (Part 2). */
(function () {
  var PConst = (typeof window !== "undefined" && window.PConst) || (typeof global !== "undefined" && global.PConst) || (typeof require !== "undefined" ? require("./constants") : null);
  var PRng = (typeof window !== "undefined" && window.PRng) || (typeof global !== "undefined" && global.PRng) || (typeof require !== "undefined" ? require("./rng") : null);
  var PPools = (typeof window !== "undefined" && window.PPools) || (typeof global !== "undefined" && global.PPools) || (typeof require !== "undefined" ? require("./pools") : null);
  var PData = (typeof window !== "undefined" && window.PData) || (typeof global !== "undefined" && global.PData) || (typeof require !== "undefined" ? require("./data") : null);
  var PSimPlat = (typeof window !== "undefined" && window.PSimPlat) || (typeof global !== "undefined" && global.PSimPlat) || (typeof require !== "undefined" ? require("./sim.plat") : null);
  var PSimBelt = (typeof window !== "undefined" && window.PSimBelt) || (typeof global !== "undefined" && global.PSimBelt) || (typeof require !== "undefined" ? require("./sim.belt") : null);
  var PSimWaves = (typeof window !== "undefined" && window.PSimWaves) || (typeof global !== "undefined" && global.PSimWaves) || (typeof require !== "undefined" ? require("./sim.waves") : null);
  var PSimCam = (typeof window !== "undefined" && window.PSimCam) || (typeof global !== "undefined" && global.PSimCam) || (typeof require !== "undefined" ? require("./sim.camera") : null);
  function optReq(p) {
    try { return typeof require !== "undefined" ? require(p) : null; } catch (err) { return null; }
  }
  var PCombat = (typeof window !== "undefined" && window.PCombat) || (typeof global !== "undefined" && global.PCombat) || optReq("./combat");
  var PAI = (typeof window !== "undefined" && window.PAI) || (typeof global !== "undefined" && global.PAI) || optReq("./ai");
  var PTag = (typeof window !== "undefined" && window.PTag) || (typeof global !== "undefined" && global.PTag) || optReq("./sim.tag");
  var PPickups = (typeof window !== "undefined" && window.PPickups) || (typeof global !== "undefined" && global.PPickups) || optReq("./sim.pickups");
  var ZERO = "vx,vz,vd,stateT,iFrames,recoveryT,coyoteT,jumpBufT,apexT,gripTier,gripTimerT,juggleCount,moveT,hitN,throwBaseDmg,throwHits,bounceN,counterStanceT,stagger,staggerMax,staggeredT,lastStagTick,phase,chainedT,reviveHold,mashPts,dropT,palette,chipFloor".split(",");
  var FALS = "unlaunchable,unthrowableFront,aerialOnly,boss,cabBroken,airborneGimmick,downed,otgUsed,frozen,walkIn,reversal,counterStance".split(",");
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
  function spawnEnemy(state, spec) {
    var e = state.pools.enemies.alloc(), arch;
    if (!e) return null;
    spec = spec || {};
    resetEnt(e);
    arch = PData && PData.getEnemy ? PData.getEnemy(spec.archetype) : null;
    e.kind = "enemy"; e.team = "enemy"; e.archetype = spec.archetype || "";
    if (arch) {
      e.w = arch.w; e.h = arch.h; e.dw = arch.dw; e.hp = e.maxHp = arch.hp;
      e.unlaunchable = !!arch.unlaunchable; e.unthrowableFront = !!arch.unthrowableFront;
      e.aerialOnly = !!arch.aerialOnly; e.reversal = !!arch.reversal; e.boss = !!arch.boss; e.counterStance = !!arch.counterStance;
      e.gimmick = arch.gimmick || ""; e.staggerMax = arch.staggerMax || 0;
      e.grippable = arch.boss ? false : arch.grippable !== false;
      if (arch.boss) e.phase = 1;
      if (arch.chipFloor != null) e.chipFloor = arch.chipFloor;
      e.stats = defStats(arch.speed || 80);
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
    state.solids = seg.solids || []; state.hazards = seg.hazards || []; state.props = seg.props || [];
    state.dLock = seg.dLock != null ? seg.dLock : 24;
    state.width = seg.width || (seg.arena ? seg.arena.xMax : 2000);
    state.go.active = false; state.go.opened = false; state.go.openT = 0;
    if (seg.arena) {
      state.dMin = seg.arena.dMin || 0; state.dMax = seg.arena.dMax || 60;
      if (PSimBelt && PSimBelt.onEnter) PSimBelt.onEnter(state, seg);
    } else { state.xMin = 0; state.xMax = state.width; state.cam.locked = false; }
    for (i = 0; i < state.heroes.length; i++) {
      e = state.heroes[i]; e.mode = state.mode;
      if (state.mode === "plat") { e.d = state.dLock; e.vd = 0; }
    }
    if (PSimWaves && PSimWaves.init) PSimWaves.init(state, seg);
    sps = seg.spawns || [];
    for (i = 0; i < sps.length; i++) spawnEnemy(state, sps[i]);
  }
  function loadLevel(state, levelId) {
    var lv = PData && PData.getLevel ? PData.getLevel(levelId) : null;
    if (!lv) return;
    state.level = lv;
    state.levelId = levelId;
    state.worldName = lv.worldName || "";
    state.name = lv.name || "";
    applySegment(state, 0);
  }
  function createGame(seed, opts) {
    var mode, players, heroId, other, tok, state, same;
    opts = opts || {};
    mode = opts.mode || "plat";
    players = opts.players === 2 ? 2 : 1;
    heroId = opts.hero || "idris";
    other = heroId === "idris" ? "otajon" : "idris";
    tok = players === 2 ? ((PConst && PConst.TOKENS_2P) || 3) : ((PConst && PConst.TOKENS_1P) || 2);
    state = {
      tick: 0, hitstop: 0, events: [], score: 0, meter: 0, lives: (PConst && PConst.LIVES) || 3,
      ippon: { chain: 0, timer: 0, paused: false },
      tag: { cooldownT: 0, active: 0, benchHp: 0, benchMax: 0 },
      attackTokens: tok, attackTokensMax: tok,
      cam: { x: 0, targetX: 0, z: 0, locked: false },
      go: { active: false, opened: false, openT: 0 },
      mode: mode, segment: null, segIndex: 0, solids: [], hazards: [], props: [],
      enemies: [], heroes: [], projectiles: [], pickups: [], frozen: [],
      pools: PPools.create(), rng: PRng.create(seed == null ? 1337 : seed), rngState: 0,
      level: null, levelId: opts.levelId || "", worldName: "", name: "",
      paused: false, players: players, pendingSeg: -1, airSwapT: 0,
      dMin: 0, dMax: 60, dLock: 24, xMin: 0, xMax: 1e9, width: 2000
    };
    state.rngState = state.rng.getState();
    if (opts.empty) {
      state.solids = [{ x: 0, z: 0, w: 2000, h: 16, type: "solid" }];
      state.segment = { id: "empty", mode: mode, width: 2000, dLock: 24, solids: state.solids, arena: mode === "belt" ? { camX: 0, xMin: 0, xMax: 2000, dMin: 0, dMax: 60 } : null };
      if (mode === "belt" && PSimBelt && PSimBelt.onEnter) PSimBelt.onEnter(state, state.segment);
    } else if (opts.levelId) loadLevel(state, opts.levelId);
    else state.solids = [{ x: 0, z: 0, w: 2000, h: 16, type: "solid" }];
    spawnHero(state, { hero: heroId, x: 80, z: 16, d: 24, playerIndex: 0 });
    if (players === 2) {
      same = (opts.hero2 || other) === heroId;
      spawnHero(state, { hero: opts.hero2 || other, x: 80, z: 16, d: 32, playerIndex: 1, palette: same ? 1 : 0 });
    }
    state.tag.benchHp = state.tag.benchMax = heroTable(other).hp;
    return state;
  }
  function applyIntent(state, e, intent) {
    e.intent = intent;
    if (intent.gripPressed && e.combatState === "FREE" && !(PCombat && PCombat.tick)) {
      e.combatState = "APPROACH";
      e.stateT = 0;
    }
    if (intent.tagPressed && PTag && PTag.trySwap && state.players !== 2) {
      PTag.trySwap(state, e.playerIndex || 0, intent);
    }
  }
  function startMove(state, ent, id) {
    var def, total;
    if (PCombat && PCombat.startMove) return PCombat.startMove(state, ent, id);
    if (id === "sweep_idris" || id === "sweep_otajon") {
      if (PCombat && PCombat.startSweep) return PCombat.startSweep(state, ent);
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
    if (e.mode === "belt" && PSimBelt) PSimBelt.integrate(state, e, intent);
    else if (PSimPlat) PSimPlat.integrate(state, e, intent);
  }
  function deathSweep(state) {
    function sweep(arr, pool) {
      var dead = [], i, n = 0;
      for (i = 0; i < arr.length; i++) { if (arr[i].hp <= 0) arr[i].alive = false; if (!arr[i].alive) dead.push(arr[i]); }
      dead.sort(function (a, b) { return a.id - b.id; });
      for (i = 0; i < dead.length; i++) { if (dead[i].kind === "enemy" && dead[i].scoreVal) state.score += dead[i].scoreVal; pool.release(dead[i]); }
      for (i = 0; i < arr.length; i++) if (arr[i].alive) arr[n++] = arr[i];
      arr.length = n;
    }
    sweep(state.enemies, state.pools.enemies);
    sweep(state.heroes, state.pools.heroes);
  }
  function hashWorld(state) {
    var parts = [String(state.tick), String(state.rngState)];
    var list = [], i, e, s, h;
    for (i = 0; i < state.heroes.length; i++) list.push(state.heroes[i]);
    for (i = 0; i < state.enemies.length; i++) list.push(state.enemies[i]);
    list.sort(function (a, b) { return a.kind === b.kind ? a.id - b.id : a.kind < b.kind ? -1 : 1; });
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (!e.alive) continue;
      parts.push(e.x + "," + e.z + "," + e.d + "," + e.hp + "," + e.combatState + "," + e.vx + "," + e.vz + "," + e.vd);
    }
    parts.push(String(state.ippon.chain), String(state.score));
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
    if (pair[0].pausePressed) state.paused = !state.paused;
    if (state.paused) return state;
    for (i = 0; i < state.heroes.length; i++) {
      e = state.heroes[i];
      if (!e.alive) continue;
      applyIntent(state, e, pair[e.playerIndex] || pair[0]);
    }
    if (PAI && PAI.think) PAI.think(state);
    if (PCombat && PCombat.tick) PCombat.tick(state);
    for (i = 0; i < state.heroes.length; i++) {
      e = state.heroes[i];
      if (!e.alive || (state.hitstop > 0 && e.frozen)) continue;
      if (e.combatState === "THROWN_FLIGHT" || e.combatState === "GRIPPED" || e.combatState === "THROWING") continue;
      integrate(state, e, pair[e.playerIndex] || pair[0]);
    }
    for (i = 0; i < state.enemies.length; i++) {
      e = state.enemies[i];
      if (!e.alive || (state.hitstop > 0 && e.frozen)) continue;
      if (e.combatState === "THROWN_FLIGHT" || e.combatState === "GRIPPED") continue;
      integrate(state, e, e.intent || DUMMY);
    }
    if (PSimBelt && PSimBelt.pushBodies) PSimBelt.pushBodies(state);
    deathSweep(state);
    if (PTag && PTag.tick) PTag.tick(state, pair);
    if (PPickups && PPickups.tick) PPickups.tick(state);
    if (PSimWaves && PSimWaves.step) PSimWaves.step(state);
    if (PSimCam && PSimCam.step) PSimCam.step(state);
    if (PSimBelt && PSimBelt.tick) PSimBelt.tick(state);
    state.rngState = state.rng.getState();
    state.tick++;
    return state;
  }
  var api = {
    createGame: createGame, step: step, hashWorld: hashWorld, blankIntent: blankIntent,
    spawnEnemy: spawnEnemy, spawnHero: spawnHero, loadLevel: loadLevel, toTicks: toTicks,
    depthOk: depthOk, applySegment: applySegment, startMove: startMove
  };
  if (typeof window !== "undefined") window.PSim = api;
  if (typeof global !== "undefined") global.PSim = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
