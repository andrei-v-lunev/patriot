/* THE PATRIOT — sweeps, damage, hitstop, knockdown/getup, ukemi. */
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
  function HitMod(g, p) { return load(g, p); }
  function toTicks(f) { return D && D.toTicks ? D.toTicks(f) : (f | 0) * 2; }
  function isHero(e) { return !!(e && (e.kind === "hero" || e.team === "hero")); }
  function isOta(h) {
    var id = (h && (h.heroId || h.hero || h.charId || h.archetype)) || "";
    return id === "otajon" || (h && h.weight === "LIGHT");
  }
  function hdef(h) {
    var id = (h && (h.heroId || h.hero || h.archetype)) || (isOta(h) ? "otajon" : "idris");
    return (C.heroes && C.heroes[id]) || h || {};
  }
  function mv(id) {
    if (!id || !D) return null;
    var m = D.getMove ? D.getMove(id) : null;
    if (m && (m.startup != null || m.damage != null)) return m;
    var bag = D.ready ? D.ready() : null;
    bag = bag && bag.moves;
    m = bag && bag.moves && bag.moves[id] ? bag.moves[id] : bag && bag[id];
    if (m && D.convertMove && !m._ticks) { m.id = id; D.convertMove(m); }
    return m || null;
  }
  function Ippon() { return HitMod("PCombatIppon", "./combat.ippon"); }
  function Grip() { return HitMod("PCombatGrip", "./combat.grip"); }
  function eachAlive(group, fn) {
    if (!group) return;
    var a = group.all || group, i, e, n = a.length | 0;
    for (i = 0; i < n; i++) { e = a[i]; if (e && e.alive !== false) fn(e); }
  }
  function addMeter(state, h, n) {
    if (h) { h.meter = (h.meter || 0) + n; if (h.meter > 100) h.meter = 100; }
    if (state && state.meter != null) { state.meter += n; if (state.meter > 100) state.meter = 100; }
  }
  function applyHitstop(state, frames, a, b) {
    var t = toTicks(frames);
    if (!state) return;
    if (t > (state.hitstop | 0)) state.hitstop = t;
    if (a) a.frozen = true;
    if (b) b.frozen = true;
  }
  function enterHitstun(e, frames) {
    if (!e) return;
    var f = frames == null ? 12 : frames;
    if (isHero(e)) { var hd = hdef(e); f = f * (hd.hsTaken != null ? hd.hsTaken : 1); }
    e.combatState = "HITSTUN";
    e.stateT = toTicks(f);
    e.hitstunMax = e.stateT;
    e.grounded = true;
  }
  function enterKnockdown(e) {
    if (!e) return;
    if (e.prevTeam) { e.team = e.prevTeam; e.prevTeam = ""; }
    e.combatState = "KNOCKDOWN";
    e.otgHit = false;
    e.vx = 0; e.vz = 0; e.vd = 0; e.z = 0;
    e.grounded = true; e.slam = false; e.frozen = false; e.thrower = null;
    e.stateT = toTicks(isHero(e) ? (C.KNOCKDOWN_H_F || 26) : (C.KNOCKDOWN_E_F || 34));
  }
  function enterGetup(e) {
    if (!e) return;
    e.combatState = "GETUP";
    e.stateT = toTicks(isHero(e) ? (C.GETUP_H_F || 16) : (C.GETUP_E_F || 22));
    e.grounded = true;
  }
  function applyDamage(state, target, amount, src, flags) {
    if (!target) return 0;
    flags = flags || {};
    if ((target.iFrames | 0) > 0 && !flags.isThrow) return 0;
    amount = amount || 0;
    if (amount < 0) amount = 0;
    var b5 = target.archetype === "B5" || target.chipFloor;
    if (!flags.isThrow && b5 && target.maxHp) {
      if ((target.phase | 0) >= 3 || target.hp <= target.maxHp * 0.35) {
        var fl = target.maxHp * (C.B5_CHIP_FLOOR || 0.1);
        if (target.hp - amount < fl) amount = target.hp - fl;
        if (amount < 0) amount = 0;
      }
    }
    target.hp -= amount;
    if (target.hp < 0) target.hp = 0;
    if (!target.lastDmgFlags) target.lastDmgFlags = { isThrow: false, isChip: false, isOTG: false, isI8: false };
    var f = target.lastDmgFlags;
    f.isThrow = !!flags.isThrow;
    f.isChip = !!flags.isChip || !flags.isThrow;
    f.isOTG = !!flags.isOTG;
    f.isI8 = !!flags.isI8;
    if (state) state.lastDmgFlags = f;
    if (isHero(target) && amount > 0) {
      var Ip = Ippon();
      if (Ip && Ip.breakChain) Ip.breakChain(state);
      addMeter(state, target, (amount / 4) | 0);
      if (target.combatState === "GRIPPED") {
        var G = Grip();
        if (G && G.breakGrip) G.breakGrip(state, target, true);
        enterHitstun(target, 12);
      }
    }
    return amount;
  }
  function startSweep(state, hero) {
    if (!hero || (hero.combatState && hero.combatState !== "FREE")) return false;
    if ((hero.recoveryT | 0) > 0 || (hero.sweepLen | 0) > 0) return false;
    var id = isOta(hero) ? "sweep_otajon" : "sweep_idris";
    var def = mv(id);
    hero.sweepId = id; hero.sweepDef = def; hero.sweepT = 0; hero.sweepHitN = 0;
    if (!hero.sweepHits) hero.sweepHits = [0, 0, 0, 0, 0, 0, 0, 0];
    var su = def && def.startupT != null ? def.startupT : toTicks(isOta(hero) ? 6 : 9);
    var ac = def && def.activeT != null ? def.activeT : toTicks(4);
    var rc = def && def.recoveryT != null ? def.recoveryT : toTicks(isOta(hero) ? 12 : 16);
    hero.sweepSu = su; hero.sweepAc = ac; hero.sweepRec = rc;
    hero.sweepLen = su + ac + rc;
    return true;
  }
  /* Special (meter burn): idris_special / otajon_special from data/moves.json.
     Reuses the sweep pipeline — wider AoE box, damage/timing from move data. */
  function startSpecial(state, hero) {
    if (!hero || (hero.combatState && hero.combatState !== "FREE")) return false;
    if ((hero.recoveryT | 0) > 0 || (hero.sweepLen | 0) > 0) return false;
    var id = isOta(hero) ? "otajon_special" : "idris_special";
    var def = mv(id);
    var cost = def && def.meterCost != null ? def.meterCost : 100;
    if ((hero.meter || 0) < cost) return false;
    hero.meter -= cost;
    if (state && state.meter != null) {
      state.meter -= cost;
      if (state.meter < 0) state.meter = 0;
    }
    hero.sweepId = id; hero.sweepDef = def; hero.sweepT = 0; hero.sweepHitN = 0;
    if (!hero.sweepHits) hero.sweepHits = [0, 0, 0, 0, 0, 0, 0, 0];
    var su = def && def.startupT != null ? def.startupT : toTicks(def && def.startup != null ? def.startup : 12);
    var ac = def && def.activeT != null ? def.activeT : toTicks(def && def.active != null ? def.active : 80);
    var rc = def && def.recoveryT != null ? def.recoveryT : toTicks(def && def.recovery != null ? def.recovery : 20);
    hero.sweepSu = su; hero.sweepAc = ac; hero.sweepRec = rc;
    hero.sweepLen = su + ac + rc;
    return true;
  }
  function sweepHit(hero, t) {
    var i, key = (isHero(t) ? 1000 : 2000) + (t.id | 0);
    for (i = 0; i < (hero.sweepHitN | 0); i++) if (hero.sweepHits[i] === key) return true;
    if ((hero.sweepHitN | 0) < 8) { hero.sweepHits[hero.sweepHitN] = key; hero.sweepHitN++; }
    return false;
  }
  function resolveSweep(state, hero) {
    var def = hero.sweepDef || mv(hero.sweepId);
    var special = !!(def && def.special);
    var w = special ? 180 : (isOta(hero) ? 44 : 40), ht = special ? 44 : (isOta(hero) ? 16 : 18);
    var f = hero.facing >= 0 ? 1 : -1, hw = hero.w || 34;
    var x0 = special ? hero.x - w * 0.5 : (f > 0 ? hero.x + hw * 0.5 : hero.x - hw * 0.5 - w);
    var z0 = (hero.z || 0) + 10 - ht * 0.5;
    var dmg = def && def.damage != null ? def.damage : (isOta(hero) ? 5 : 7);
    var otgS = def && def.otgScale != null ? def.otgScale : 0.6;
    var G = Grip();
    var depthOk = G && G.depthOk ? G.depthOk : function (a, b, tol) {
      var dd = (a.d || 0) - (b.d || 0); if (dd < 0) dd = -dd; return dd <= (tol == null ? 10 : tol);
    };
    eachAlive(state.enemies, function (t) {
      if (t === hero || sweepHit(hero, t) || !depthOk(hero, t, C.DEPTH_HIT || 10)) return;
      var tw = t.w || 30, th = t.h || 40, tx = t.x - tw * 0.5, tz = t.z || 0;
      if (!(x0 < tx + tw && tx < x0 + w && z0 < tz + th && tz < z0 + ht)) return;
      if (t.combatState === "KNOCKDOWN") {
        if (t.otgHit) return;
        t.otgHit = true;
        applyDamage(state, t, dmg * otgS, hero, { isOTG: true, isChip: true });
        t.vx = 90 * f;
        applyHitstop(state, (def && def.hitstop) || 4, hero, t);
        return;
      }
      applyDamage(state, t, dmg, hero, { isChip: !special, isThrow: special });
      if (special && def.throw) {
        var td = t.x >= hero.x ? 1 : -1;
        t.vx = (def.throw.vx || 300) * td;
        t.vz = def.throw.vz || 0;
      } else t.vx = 170 * f;
      applyHitstop(state, (def && def.hitstop) || (special ? 6 : 4), hero, t);
      if (!special) addMeter(state, hero, def && def.meterGain != null ? def.meterGain : 3);
      var heavy = t.archetype === "E2" || t.archetype === "E6" || t.archetype === "E8" || t.unlaunchable;
      if (heavy) enterHitstun(t, (def && def.hitstun) || 12);
      else {
        enterKnockdown(t);
        var Ip = Ippon();
        if (Ip && Ip.extendChain) Ip.extendChain(state, 1);
      }
    });
  }
  function tickSweep(state, hero) {
    if ((hero.sweepLen | 0) <= 0) return;
    hero.sweepT = (hero.sweepT | 0) + 1;
    if (hero.sweepT > hero.sweepSu && hero.sweepT <= hero.sweepSu + hero.sweepAc) resolveSweep(state, hero);
    if (hero.sweepT >= hero.sweepLen) { hero.sweepLen = 0; hero.sweepT = 0; }
  }
  function doUkemi(state, e) {
    var hd = hdef(e), short = (e.ukemiCdT | 0) > 0;
    var inn = e.intent || (state.intents && state.intents[e.player | 0]);
    e.combatState = "UKEMI";
    e.stateT = toTicks(C.UKEMI_F || 24);
    e.ukemiMax = e.stateT;
    if (e.prevTeam) { e.team = e.prevTeam; e.prevTeam = ""; }
    var dir = inn && inn.moveX ? (inn.moveX > 0 ? 1 : -1) : (e.facing >= 0 ? -1 : 1);
    e.vx = dir * (56 / ((C.UKEMI_F || 24) / 60));
    e.vz = 0; e.z = 0; e.grounded = true;
    e.iFrames = short ? toTicks(6) : 0;
    e.ukemiCdT = toTicks(hd.ukemiCd || 30);
    addMeter(state, e, 4);
  }
  function tryUkemi(state, e) {
    if (!isHero(e)) return false;
    var inn = e.intent || (state.intents && state.intents[e.player | 0]);
    if (!inn || !inn.ukemiPressed) return false;
    var st = e.combatState, win = false;
    if (st === "HITSTUN") {
      var el = (e.hitstunMax | 0) - (e.stateT | 0);
      if (el >= 0 && el < toTicks(12)) win = true;
    } else if (st === "THROWN_FLIGHT") win = (e.z || 0) < 80 && e.vz <= 0;
    else if (st === "KNOCKDOWN") win = true;
    if (!win) return false;
    doUkemi(state, e);
    return true;
  }
  function tickHitstun(state, e) {
    if (tryUkemi(state, e)) return;
    e.stateT = (e.stateT | 0) - 1;
    if (e.stateT <= 0) { e.combatState = "FREE"; e.stateT = 0; }
  }
  function tickKnockdown(state, e) {
    if (tryUkemi(state, e)) return;
    e.stateT = (e.stateT | 0) - 1;
    if (e.stateT <= 0) enterGetup(e);
  }
  function tickGetup(e) {
    if ((e.stateT | 0) <= toTicks(8)) e.iFrames = Math.max(e.iFrames | 0, e.stateT | 0);
    e.stateT = (e.stateT | 0) - 1;
    if (e.stateT <= 0) { e.combatState = "FREE"; e.iFrames = 0; e.otgHit = false; }
  }
  function tickUkemi(e) {
    var tot = e.ukemiMax | toTicks(C.UKEMI_F || 24);
    var fr = (tot - (e.stateT | 0)) >> 1;
    if (fr >= (C.UKEMI_IF_FROM || 3) && fr <= (C.UKEMI_IF_TO || 14)) e.iFrames = Math.max(e.iFrames | 0, 1);
    e.stateT = (e.stateT | 0) - 1;
    if (e.stateT <= 0) { e.combatState = "FREE"; e.iFrames = 0; e.vx = 0; }
  }
  function tickFree(state, e) { if ((e.sweepLen | 0) > 0) tickSweep(state, e); }

  var api = {
    applyDamage: applyDamage, applyHitstop: applyHitstop, startSweep: startSweep,
    startSpecial: startSpecial,
    tickSweep: tickSweep, tickFree: tickFree, enterHitstun: enterHitstun,
    enterKnockdown: enterKnockdown, enterGetup: enterGetup, tryUkemi: tryUkemi,
    tickHitstun: tickHitstun, tickKnockdown: tickKnockdown, tickGetup: tickGetup,
    tickUkemi: tickUkemi, addMeter: addMeter
  };
  if (typeof window !== "undefined") window.PCombatHit = api;
  if (typeof global !== "undefined") global.PCombatHit = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
