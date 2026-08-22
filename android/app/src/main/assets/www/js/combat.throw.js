/* THE PATRIOT — throw pick, THROWING, THROWN_FLIGHT, friendly fire, bounce, wall. */
(function () {
  function load(g, p) {
    if (typeof window !== "undefined" && window[g]) return window[g];
    if (typeof global !== "undefined" && global[g]) return global[g];
    if (typeof require === "function") {
      try { return require(p); } catch (err) { return null; }
    }
    return null;
  }
  var C = load("PConst", "./constants") || {};
  var D = load("PData", "./data");
  function toTicks(f) { return D && D.toTicks ? D.toTicks(f) : (f | 0) * 2; }
  function isHero(e) { return !!(e && (e.kind === "hero" || e.team === "hero")); }
  function isOta(h) {
    var id = (h && (h.heroId || h.hero || h.charId || h.archetype)) || "";
    return id === "otajon" || (h && h.weight === "LIGHT");
  }
  function mv(id) {
    if (!id || !D) return null;
    var m = D.getMove ? D.getMove(id) : null;
    if (m && m.startup != null) return m;
    var bag = D.ready ? D.ready() : null;
    bag = bag && bag.moves;
    m = bag && bag.moves && bag.moves[id] ? bag.moves[id] : bag && bag[id];
    if (m && D.convertMove && !m._ticks) { m.id = id; D.convertMove(m); }
    return m || null;
  }
  function archOf(e) {
    if (!e) return null;
    if (e.arch && typeof e.arch === "object") return e.arch;
    var id = e.archetype || e.archId;
    return D && D.getEnemy && id ? D.getEnemy(id) : null;
  }
  function flag(e, name) {
    if (e && e[name]) return true;
    var a = archOf(e);
    return !!(a && a[name]);
  }
  function Hit() { return load("PCombatHit", "./combat.hit"); }
  function Ippon() { return load("PCombatIppon", "./combat.ippon"); }
  function Grip() { return load("PCombatGrip", "./combat.grip"); }
  function eachAlive(group, fn) {
    if (!group) return;
    var a = group.all || group, i, e, n = a.length | 0;
    for (i = 0; i < n; i++) { e = a[i]; if (e && e.alive !== false) fn(e); }
  }
  function uid(e) { return (isHero(e) ? 1000 : 2000) + (e.id | 0); }
  function already(e, t) {
    var i, k = uid(t);
    for (i = 0; i < (e.hitN | 0); i++) if (e.hitIds[i] === k) return true;
    return false;
  }
  function mark(e, t) {
    if (!e.hitIds) e.hitIds = [0, 0, 0, 0, 0, 0, 0, 0];
    if ((e.hitN | 0) < 8) { e.hitIds[e.hitN] = uid(t); e.hitN++; }
  }
  function emitFx(state, name, e, z) {
    if (!state || !state.events || state.events.length >= 32 || !e) return;
    state.events.push({ name: name, x: e.x, z: z == null ? (e.z || 0) : z, d: e.d || 0, alive: true });
  }
  function emitAudio(state, name) {
    if (state && state.events && state.events.length < 32) state.events.push({ name: "audio_only", audio: name, alive: true });
  }
  var MIR = [4, 3, 2, 1, 0, 7, 6, 5];
  function relDir(hero, intent) {
    var td = -1;
    if (typeof intent === "number") td = intent;
    else if (intent) td = intent.throwDir != null ? intent.throwDir : (intent.dir != null ? intent.dir : -1);
    if (td < 0) td = 0;
    if (hero && hero.facing < 0) return MIR[td] != null ? MIR[td] : 4;
    return td;
  }
  function pickThrowId(hero, intent) {
    var ota = isOta(hero), rel = relDir(hero, intent), tier = hero && hero.gripTier ? hero.gripTier | 0 : 0;
    if (rel === 2) return ota ? "o2_tai" : "i2_ouchigari";
    if (rel === 6) return ota ? "o3_sumi" : "i3_seoi";
    if (rel === 4) return ota ? "o4_kosoto" : "i4_uranage";
    if (rel === 1 || rel === 7) return ota ? "o5_harai" : (tier >= 1 ? "i5_uchimata" : "i1_ogoshi");
    if (!ota && tier >= 2 && (hero.i6CdT | 0) <= 0) {
      var t = hero.gripTarget;
      if (t && !t.boss && t.maxHp && t.hp <= t.maxHp * 0.25 && hero.mode === "belt") return "i6_seoiotoshi";
    }
    return ota ? "o1_deashi" : "i1_ogoshi";
  }
  function doScreenSlam(state, hero, t, def) {
    var H = Hit(), Ip = Ippon(), dmg = def && def.damage != null ? def.damage : 34;
    if (t.maxHp && t.hp <= t.maxHp * 0.25) t.hp = 0;
    else if (H && H.applyDamage) H.applyDamage(state, t, dmg, hero, { isThrow: true });
    else { t.hp -= dmg; if (t.hp < 0) t.hp = 0; }
    if (Ip && Ip.extendChain) Ip.extendChain(state, 1);
    if (Ip && Ip.addThrowScore) Ip.addThrowScore(state, dmg);
    if (H && H.addMeter) H.addMeter(state, hero, def && def.meterGain != null ? def.meterGain : 10);
    hero.i6CdT = ((C.SIM_HZ || 120) * 8) | 0;
    hero.combatState = "FREE";
    hero.recoveryT = def && def.recoveryT != null ? def.recoveryT : toTicks(def && def.recovery || 30);
    hero.gripTarget = null; t.gripTarget = null;
    if (H && H.enterKnockdown) H.enterKnockdown(t);
    else t.combatState = "KNOCKDOWN";
  }
  function startThrow(state, hero, intent) {
    if (!hero || hero.combatState !== "GRIPPED") return false;
    var t = hero.gripTarget;
    if (!t) return false;
    var id = pickThrowId(hero, intent), def = mv(id);
    hero.throwWorldDir = typeof intent === "number" ? intent :
      (intent && intent.throwDir != null ? intent.throwDir : -1);
    hero.throwId = id; hero.throwDef = def; hero.combatState = "THROWING"; hero.throwT = 0;
    var su = def && def.startupT != null ? def.startupT : toTicks(def && def.startup != null ? def.startup : 12);
    var ac = def && def.activeT != null ? def.activeT : toTicks(def && def.active != null ? def.active : 6);
    hero.throwLen = su + ac;
    hero.throwRec = def && def.recoveryT != null ? def.recoveryT : toTicks(def && def.recovery != null ? def.recovery : 20);
    if (def && def.armored) hero.iFrames = hero.throwLen;
    if (def && def.screenSlam) { doScreenSlam(state, hero, t, def); return true; }
    return true;
  }
  function release(state, hero) {
    var def = hero.throwDef || mv(hero.throwId), t = hero.gripTarget;
    hero.combatState = "FREE"; hero.recoveryT = hero.throwRec || 0; hero.gripTarget = null; hero.iFrames = 0;
    if (!t) return;
    t.gripTarget = null;
    var vx = 340, vz = 190;
    if (def && def.throw) { vx = def.throw.vx; vz = def.throw.vz; }
    var unl = flag(t, "unlaunchable") || t.boss || flag(t, "boss");
    if (def && def.launch && unl) { vx = 340; vz = 190; }
    var f = hero.facing >= 0 ? 1 : -1;
    var td = hero.throwWorldDir | 0, depthDir = 0;
    if (td === 7 || td === 0 || td === 1) depthDir = 1;
    else if (td === 3 || td === 4 || td === 5) depthDir = -1;
    t.vx = vx * f; t.vz = vz;
    t.vd = depthDir * (C.THROW_DEPTH_V || 240);
    t.combatState = "THROWN_FLIGHT";
    t.prevTeam = t.team; t.team = "neutral"; t.thrower = hero;
    t.slam = !!(def && def.slam); t.bounceN = 0; t.ffN = 0; t.hitN = 0; t.ffMeter = 0;
    t.propHits = {};
    if (!t.hitIds) t.hitIds = [0, 0, 0, 0, 0, 0, 0, 0];
    t.flightT = ((C.FLIGHT_LIFE_S || 2.5) * (C.SIM_HZ || 120) + 0.5) | 0;
    t.grounded = false;
    emitFx(state, "throw_arc", hero, (hero.z || 0) + (hero.h || 60) * 0.5);
    var dmg = def && def.damage != null ? def.damage : 18;
    var tm = C.TIER_DMG && C.TIER_DMG[hero.gripTier | 0] != null ? C.TIER_DMG[hero.gripTier | 0] : 1;
    dmg *= tm;
    if (t.boss || flag(t, "boss")) dmg *= C.BOSS_THROW_MUL || 1.35;
    var Ip = Ippon();
    if (Ip && Ip.mul) dmg *= Ip.mul(state);
    t.baseThrowDmg = dmg;
    var H = Hit();
    var heavy = t.boss || flag(t, "boss") || heavyFF(t);
    if (H && H.applyDamage) H.applyDamage(state, t, dmg, hero, { isThrow: true,
      audioEvent: heavy ? "throw_whoosh_hv" : "throw_whoosh_lt" });
    if (!def || def.chain !== false) {
      if (Ip && Ip.extendChain) Ip.extendChain(state, 1);
      if (Ip && Ip.addThrowScore) Ip.addThrowScore(state, def && def.damage != null ? def.damage : dmg);
    }
    if (H && H.addMeter) H.addMeter(state, hero, def && def.meterGain != null ? def.meterGain : 8);
  }
  function tickThrowing(state, hero) {
    var G = Grip();
    if (G && G.hold && hero.gripTarget) G.hold(hero, hero.gripTarget);
    hero.throwT = (hero.throwT | 0) + 1;
    if (hero.throwT >= (hero.throwLen | 0)) release(state, hero);
  }
  function heavyFF(e) {
    return e.archetype === "E2" || e.archetype === "E6" || e.archetype === "E8" ||
      flag(e, "unlaunchable") || flag(e, "unthrowableFront") || flag(e, "counterStance");
  }
  function depth14(a, b) {
    var G = Grip(), tol = C.DEPTH_THROWN || 14;
    if (G && G.depthOk) return G.depthOk(a, b, tol);
    var dd = (a.d || 0) - (b.d || 0); if (dd < 0) dd = -dd; return dd <= tol;
  }
  function ff(state, e) {
    if ((e.ffN | 0) >= 4 || isHero(e)) return;
    var H = Hit(), Ip = Ippon(), ew = e.w || 30, eh = e.h || 40;
    eachAlive(state.enemies, function (o) {
      if (e.combatState !== "THROWN_FLIGHT" || (e.ffN | 0) >= 4) return;
      if (!o || o === e || o === e.thrower || isHero(o) || o.team === "hero") return;
      if (already(e, o) || !depth14(e, o)) return;
      var ow = o.w || 30, oh = o.h || 40;
      if (!(e.x - ew * 0.5 < o.x + ow * 0.5 && o.x - ow * 0.5 < e.x + ew * 0.5 &&
          (e.z || 0) < (o.z || 0) + oh && (o.z || 0) < (e.z || 0) + eh)) return;
      mark(e, o);
      if (o.combatState === "THROWN_FLIGHT") {
        if (H && H.applyDamage) { H.applyDamage(state, o, 10, e, { isThrow: true }); H.applyDamage(state, e, 10, o, { isThrow: true }); }
        if (H && H.enterKnockdown) { H.enterKnockdown(o); H.enterKnockdown(e); }
        if (Ip && Ip.extendChain) Ip.extendChain(state, 1);
        return;
      }
      var scale = C.THROWN_FF || 0.75, i;
      for (i = 0; i < (e.ffN | 0); i++) scale *= C.THROWN_FF || 0.75;
      var dmg = Math.max(C.THROWN_FF_MIN || 8, (e.baseThrowDmg || 18) * scale);
      var a = archOf(o);
      if (a && a.ffMul != null) dmg *= a.ffMul;
      else if (o.ffMul != null) dmg *= o.ffMul;
      if (o.boss || flag(o, "boss")) dmg *= 0.4;
      /* B4's cab solve must be produced at the actual thrown-body collision.
         Sampling it later in the boss AI can miss a one-tick overlap when the
         body takes collision damage and is swept in the same sim step. */
      if (o.archetype === "B4" && !o.cabBroken) o.cabHit = 1;
      if (H && H.applyDamage) { H.applyDamage(state, o, dmg, e, { isThrow: true }); H.applyDamage(state, e, e.ffN ? 4 : 6, e, { isThrow: true }); }
      if (heavyFF(o)) { if (H && H.enterHitstun) H.enterHitstun(o, 12); }
      else if (H && H.enterKnockdown) H.enterKnockdown(o);
      if (H && H.applyHitstop) H.applyHitstop(state, 6, e, o);
      if (Ip && Ip.extendChain) Ip.extendChain(state, 1);
      e.ffN = (e.ffN | 0) + 1;
      if (e.thrower && H && H.addMeter && e.ffMeter < 15) { H.addMeter(state, e.thrower, 5); e.ffMeter += 5; }
      if (o.hp <= 0 && Ip && Ip.addFfKill) Ip.addFfKill(state);
    });
  }
  function wall(state, e) {
    var a = state.arena || state, lo = a.xMin, hi = a.xMax;
    var dLo = a.dMin, dHi = a.dMax, minV = C.WALL_VX || 200;
    var hitX = ((lo != null && e.x <= lo) || (hi != null && e.x >= hi)) && Math.abs(e.vx) >= minV;
    var hitD = ((dLo != null && e.d <= dLo) || (dHi != null && e.d >= dHi)) && Math.abs(e.vd) >= minV;
    if (!hitX && !hitD) return;
    var H = Hit(), Ip = Ippon(), cageI = hitX ? (lo != null && e.x <= lo ? 0 : 1) :
      (dLo != null && e.d <= dLo ? 2 : 3);
    var liveCage = e.archetype === "B5" && state.cage && state.cage.walls && state.cage.walls[cageI];
    if (H && H.applyDamage) H.applyDamage(state, e, C.WALL_BONUS || 14, e,
      { isThrow: true, stagger: liveCage ? 90 : undefined });
    if (e.thrower && H && H.addMeter) H.addMeter(state, e.thrower, 6);
    if (H && H.enterKnockdown) H.enterKnockdown(e);
    if (Ip && Ip.extendChain) Ip.extendChain(state, 1);
    if (Ip && Ip.addWallScore) Ip.addWallScore(state);
    if (lo != null && e.x < lo) e.x = lo;
    if (hi != null && e.x > hi) e.x = hi;
    if (dLo != null && e.d < dLo) e.d = dLo;
    if (dHi != null && e.d > dHi) e.d = dHi;
  }
  function hazard(state, e) {
    var hz = state.hazards; if (!hz || !hz.length) return;
    var i, h, ew = e.w || 30;
    for (i = 0; i < hz.length; i++) {
      h = hz[i]; if (!h) continue;
      if (h.type === "cage_wall") continue;
      if (e.x + ew * 0.5 > h.x && e.x - ew * 0.5 < h.x + (h.w || 16)) {
        var H = Hit(), Ip = Ippon();
        if (H && H.applyDamage) H.applyDamage(state, e, 25, h, { isThrow: true });
        if (H && H.enterKnockdown) H.enterKnockdown(e);
        if (Ip && Ip.extendChain) Ip.extendChain(state, 1);
        return;
      }
    }
  }
  function prop(state, e) {
    var ps = state.props || [], i, p, key, depth, half;
    if (!e.propHits) e.propHits = {};
    for (i = 0; i < ps.length; i++) {
      p = ps[i];
      if (!p || p.alive === false || !(p.hp > 0)) continue;
      key = "p" + i;
      if (e.propHits[key]) continue;
      depth = Math.abs((e.d || 0) - (p.d || 0));
      if (depth > (C.DEPTH_THROWN || 14)) continue;
      half = ((e.w || 30) + (p.w || 48)) * 0.5;
      if (Math.abs(e.x - p.x) > half) continue;
      e.propHits[key] = 1;
      p.hp--;
      if (p.hp <= 0) { p.hp = 0; p.alive = false; }
      var H = Hit(), Ip = Ippon();
      if (H && H.enterKnockdown) H.enterKnockdown(e);
      if (Ip && Ip.extendChain) Ip.extendChain(state, 1);
      return;
    }
  }
  function land(state, e) {
    var H = Hit();
    var level = state && state.levelId || "";
    var slam = level.slice(0, 2) === "w2" ? "throw_slam_stone" :
      (level.slice(0, 2) === "w3" || level.slice(0, 2) === "w4") ? "throw_slam_metal" :
      (e.boss || heavyFF(e)) ? "throw_slam_heavy" : "throw_slam";
    emitAudio(state, slam);
    emitFx(state, "shockwave", e, 0);
    if (e.slam || (e.bounceN | 0) >= (C.BOUNCE_MAX || 2) || Math.abs(e.vz) < (C.BOUNCE_MIN || 120)) {
      if (H && H.enterKnockdown) H.enterKnockdown(e);
      return;
    }
    e.bounceN = (e.bounceN | 0) + 1;
    e.vz = -e.vz * (C.BOUNCE_V || 0.42);
    e.vx *= C.BOUNCE_X || 0.7;
    if (H && H.applyDamage) H.applyDamage(state, e, 4, e, { isThrow: true, isChip: true });
  }
  function tickFlight(state, e) {
    var dt = C.SIM_DT || 1 / 120, H;
    e.flightT = (e.flightT | 0) - 1;
    e.vz -= (C.FLIGHT_G || 1700) * dt;
    if (e.vz < -(C.FLIGHT_MAXFALL || 900)) e.vz = -(C.FLIGHT_MAXFALL || 900);
    /* W4 ice preserves thrown-body momentum so a toss travels farther than
       the same throw on normal ground. Keep the multiplier deterministic. */
    if (((state.tick | 0) % 2) === 0) e.vx *= state.slippery ? 0.995 : (C.FLIGHT_DRAG || 0.985);
    e.x += e.vx * dt; e.d += e.vd * dt; e.z += e.vz * dt; if (e.z < 0) e.z = 0;
    if (!isHero(e) && e.team !== "hero") ff(state, e);
    if (e.combatState !== "THROWN_FLIGHT") return;
    wall(state, e);
    if (e.combatState !== "THROWN_FLIGHT") return;
    prop(state, e);
    if (e.combatState !== "THROWN_FLIGHT") return;
    hazard(state, e);
    if (e.combatState !== "THROWN_FLIGHT") return;
    if ((e.flightT | 0) <= 0) { H = Hit(); if (H && H.enterKnockdown) H.enterKnockdown(e); return; }
    if (e.z <= 0 && e.vz <= 0) land(state, e);
  }

  var api = {
    pickThrowId: pickThrowId, startThrow: startThrow, tickThrowing: tickThrowing,
    tickFlight: tickFlight, release: release, relDir: relDir
  };
  if (typeof window !== "undefined") window.PCombatThrow = api;
  if (typeof global !== "undefined") global.PCombatThrow = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
