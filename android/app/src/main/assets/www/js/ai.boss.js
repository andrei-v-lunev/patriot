/* THE PATRIOT — boss brains B1–B5. Stagger, phases, gimmicks. */
(function () {
  function G(n) {
    if (typeof window !== "undefined" && window[n]) return window[n];
    if (typeof global !== "undefined" && global[n]) return global[n];
    return null;
  }
  function C() { return G("PConst") || {}; }
  function hz() { return C().SIM_HZ || 120; }
  function tt(f) { var d = G("PData"); return d && d.toTicks ? d.toTicks(f) : (f | 0) * 2; }
  function ents(s, n) { return (s.pools && s.pools[n] && s.pools[n].all) || s[n] || []; }
  function R(s) {
    return s.rng || { next: function () { return 0.5; }, chance: function () { return false; }, int: function () { return 0; } };
  }
  function defOf(b) { var d = G("PData"); return b.def || (d && d.getEnemy && d.getEnemy(b.archetype)) || {}; }
  function heroes(s) {
    var hs = ents(s, "heroes"), o = [], i, h;
    for (i = 0; i < hs.length; i++) {
      h = hs[i];
      if (h && h.alive && h.hp > 0 && !h.benched && h.combatState !== "DOWN") o.push(h);
    }
    return o;
  }
  function nearest(b, hs) {
    var best = null, bd = 1e9, i, h, d;
    for (i = 0; i < hs.length; i++) {
      h = hs[i]; d = (h.x - b.x) * (h.x - b.x) + (h.d - b.d) * (h.d - b.d);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  }
  function thrownHits(s, b, arch) {
    var es = ents(s, "enemies"), i, e, st, dw;
    for (i = 0; i < es.length; i++) {
      e = es[i];
      if (!e || !e.alive || e === b) continue;
      if (arch && e.archetype !== arch) continue;
      st = e.combatState;
      if (st !== "THROWN" && st !== "THROWN_FLIGHT") continue;
      if (Math.abs((e.d || 0) - (b.d || 0)) > (C().DEPTH_THROWN || 14)) continue;
      dw = ((e.w || 20) + (b.w || 40)) * 0.5;
      if (Math.abs(e.x - b.x) <= dw) return e;
    }
    return null;
  }
  function stagMax(b) { return b.staggerMax || b.stagMax || defOf(b).staggerMax || 100; }
  function enterStagger(b) {
    b.combatState = "STAGGERED";
    b.staggeredT = (C().STAGGER_S || 2) * hz();
    b.stag = 0; b.throwMul = C().BOSS_THROW_MUL || 1.35;
  }
  function addStag(b, n) {
    if (!b || b.cabBroken === false) return;
    b.stag = (b.stag || 0) + n; b.stagIdleT = 0;
    if (b.stag >= stagMax(b)) enterStagger(b);
  }
  function forceStagger(b) { if (b) { b.stag = stagMax(b); enterStagger(b); } }
  function canGripBoss(b) {
    if (!b) return false;
    if (b.archetype === "B2" && !b.b2Landed) return false;
    if (b.archetype === "B4" && !b.cabBroken) return false;
    return !!(b.staggeredT > 0 || b.combatState === "STAGGERED");
  }
  function setB5Phase3(b) { if (b) { b.phase = 3; b.chipFloor = true; } }
  function tickStagger(b) {
    var max;
    if (b.combatState === "STAGGERED") {
      b.staggeredT--;
      if (b.staggeredT <= 0) { b.combatState = "FREE"; b.throwMul = 1; b.staggeredT = 0; }
      return true;
    }
    b.stagIdleT = (b.stagIdleT || 0) + 1;
    if (b.stagIdleT >= (C().STAG_DELAY || 3) * hz() && (b.stag || 0) > 0) {
      max = stagMax(b);
      b.stag -= max * (C().STAG_DECAY || 0.08) / hz();
      if (b.stag < 0) b.stag = 0;
    }
    return false;
  }
  function tickPhase(s, b, def) {
    var phases = def.phases || [], ratio, want = 1, i;
    if (!b.maxHp) b.maxHp = def.hp || b.hp || 1;
    ratio = b.hp / b.maxHp;
    for (i = 0; i < phases.length; i++) if (ratio <= phases[i].hp) want = i + 1;
    if (b.phase == null) b.phase = 1;
    if (want > b.phase) {
      b.phase = want; b.phaseIframesT = hz(); b.iFrames = Math.max(b.iFrames || 0, hz());
      s.ipponPauseT = Math.max(s.ipponPauseT || 0, hz()); s.ipponPaused = true;
      b.enrageStacks = Math.min(2, (b.enrageStacks || 0) + 1);
      b.pattern = phases[want - 1] ? phases[want - 1].pattern : b.pattern;
    }
    if (b.phaseIframesT > 0) {
      b.phaseIframesT--; b.iFrames = Math.max(b.iFrames || 0, b.phaseIframesT);
    }
    if ((s.ipponPauseT || 0) > 0) { s.ipponPauseT--; if (s.ipponPauseT <= 0) s.ipponPaused = false; }
    if (b.archetype === "B5" && ratio <= 0.35) setB5Phase3(b);
  }
  function startPat(b, tel, act, rec, name) {
    b.aiState = "ATTACK"; b.patternName = name; b.tell = 1; b.atkPhase = 0;
    b.telegraphT = tel < tt(24) ? tt(24) : tel; b.activeT = act; b.recoverT = rec;
  }
  function stepPat(b) {
    if (b.telegraphT > 0) { b.telegraphT--; b.tell = 1; b.atkPhase = 0; return "tel"; }
    b.tell = 0;
    if (b.activeT > 0) { b.activeT--; b.atkPhase = 1; return "act"; }
    if (b.recoverT > 0) { b.recoverT--; b.atkPhase = 2; return "rec"; }
    b.atkPhase = 3; if (b.combatState === "ATTACK") b.combatState = "FREE";
    return "done";
  }
  function tickB1(s, b, h) {
    var hs = ents(s, "heroes"), live = heroes(s), i, ch, n;
    if (thrownHits(s, b, "E1")) for (i = 0; i < hs.length; i++) hs[i].chainedT = 0;
    for (i = 0; i < hs.length; i++) {
      ch = hs[i]; if (!ch || !(ch.chainedT > 0)) continue;
      ch.chainedT--; if (ch.chainX == null) ch.chainX = ch.x;
      if (ch.x > ch.chainX + 48) ch.x = ch.chainX + 48;
      if (ch.x < ch.chainX - 48) ch.x = ch.chainX - 48;
    }
    b.chainCdT = (b.chainCdT || 0) - 1;
    if (b.chainCdT <= 0 && live.length) {
      n = live[R(s).int(live.length)]; n.chainedT = 4 * hz(); n.chainX = n.x; n.chainD = n.d;
      b.chainCdT = 8 * hz();
    }
    if (b.aiState === "ATTACK") {
      if (stepPat(b) === "act" && h) { b.facing = h.x >= b.x ? 1 : -1; if (b.patternName === "charge") b.vx = b.facing * 240; }
      if (b.atkPhase === 3) {
        if (b.phase >= 3 && (b.chargeN || 0) < 3) { b.chargeN = (b.chargeN || 1) + 1; startPat(b, tt(20), tt(12), tt(20), "charge"); }
        else { b.aiState = "IDLE"; b.chargeN = 0; b.vx = 0; }
      }
      return;
    }
    b.patCdT = (b.patCdT || 0) - 1;
    if (b.patCdT > 0 || !h) return;
    b.facing = h.x >= b.x ? 1 : -1;
    if (b.phase === 2) startPat(b, tt(34), tt(6), tt(34), "pound");
    else { if (b.phase >= 3) b.chargeN = 1; startPat(b, tt(30), tt(12), tt(40), "charge"); }
    b.patCdT = 3 * hz();
  }
  function tickB2(s, b, h) {
    var props = s.props || [], i, p, picks, hit;
    if (!b.b2Init) { b.b2Init = 1; b.z = 80; b.grounded = false; b.b2Landed = false; b.grippable = false; }
    if (!b.b2Landed) {
      for (i = 0; i < props.length; i++) {
        p = props[i];
        if (p && p.type === "awning" && (p.hp <= 0 || p.alive === false)) b.b2Landed = true;
      }
      if (b.b2Landed) { b.grounded = true; b.z = 0; } else { b.grounded = false; if (b.z < 60) b.z = 80; }
    }
    picks = ents(s, "pickups");
    for (i = 0; i < picks.length; i++) {
      hit = picks[i];
      if (!hit || !hit.alive) continue;
      if (Math.abs(hit.x - b.x) < 24 && Math.abs((hit.d || 0) - (b.d || 0)) <= 14) {
        hit.alive = false;
        if (s.pools && s.pools.pickups && s.pools.pickups.release) s.pools.pickups.release(hit);
        b.stolen = hit.kind;
      }
    }
    if (b.aiState === "ATTACK") { if (stepPat(b) === "done") b.aiState = "IDLE"; return; }
    if (h) b.facing = h.x >= b.x ? 1 : -1;
    b.patCdT = (b.patCdT || 0) - 1;
    if (b.patCdT > 0) return;
    if (b.phase >= 3) startPat(b, tt(44), tt(6), tt(44), "grab");
    else if (b.phase === 2) startPat(b, tt(40), tt(22), tt(36), "spin");
    else startPat(b, tt(34), tt(5), tt(30), "lash");
    b.patCdT = 3.2 * hz();
  }
  function tickB3(s, b, def, h) {
    b.canGripHero = true;
    b.tunnelCdT = (b.tunnelCdT || 0) - 1;
    if (b.tunnelDarkT > 0) {
      b.tunnelDarkT--; s.tunnelDarkT = b.tunnelDarkT;
      if (b.tunnelPhase === "tel" && b.tunnelDarkT < 2.4 * hz()) {
        b.tunnelPhase = "charge"; startPat(b, tt(24), tt(18), tt(28), "tunnel");
      }
      if (b.tunnelPhase === "charge") {
        b.d = b.tunnelD;
        if (h) { b.facing = h.x >= b.x ? 1 : -1; b.vx = b.facing * ((def.speed || 64) * 2.4); }
      }
      if (b.aiState === "ATTACK" && stepPat(b) === "done") b.tunnelPhase = "dark";
      return;
    }
    s.tunnelDarkT = 0;
    if (b.tunnelCdT <= 0) {
      b.tunnelDarkT = 3 * hz(); b.tunnelD = h ? h.d : (R(s).next() * 60);
      b.tunnelPhase = "tel"; b.tunnelCdT = 8 * hz(); b.tell = 1;
      return;
    }
    if (b.aiState === "ATTACK") { if (stepPat(b) === "done") b.aiState = "IDLE"; return; }
    if (!h) return;
    b.facing = h.x >= b.x ? 1 : -1;
    b.patCdT = (b.patCdT || 0) - 1;
    if (b.patCdT <= 0) { startPat(b, tt(28), tt(6), tt(26), b.phase >= 2 ? "stance" : "duel"); b.patCdT = 1.5 * hz(); }
  }
  function tickB4(s, b, h) {
    var hit;
    if (b.cabBroken == null) b.cabBroken = false;
    if (!b.cabBroken) {
      b.invuln = true; b.iFrames = Math.max(b.iFrames || 0, 2);
      hit = thrownHits(s, b, null);
      if (hit || b.cabHit) { b.cabBroken = true; b.invuln = false; b.cabHit = 0; }
    }
    b.dropCdT = (b.dropCdT || 0) - 1;
    if (b.dropTelT > 0) {
      b.dropTelT--; b.tell = 1;
      if (b.dropTelT === 0) { b.containerDrop = 1; b.tell = 0; }
    } else if (b.dropCdT <= 0) {
      b.dropTelT = tt(40); b.dropX = h ? h.x : b.x; b.dropD = h ? h.d : b.d; b.dropCdT = 7 * hz();
    }
    if (b.aiState === "ATTACK") { if (stepPat(b) === "done") b.aiState = "IDLE"; return; }
    if (h && b.cabBroken) {
      b.facing = h.x >= b.x ? 1 : -1;
      b.patCdT = (b.patCdT || 0) - 1;
      if (b.patCdT <= 0) { startPat(b, tt(36), tt(6), tt(34), "hammer"); b.patCdT = 3.4 * hz(); }
    }
  }
  function tickB5(s, b, h) {
    var cage, cad, i;
    b.fightT = (b.fightT || 0) + 1;
    if (b.fightT >= 240 * hz()) { b.enrage = true; b.enrageMul = 1.3; }
    cage = s.cage || { walls: [0, 0, 0, 0], shoveT: 0, shoveTel: 0, elecT: 0 };
    s.cage = cage;
    cad = b.enrage ? 3 : (b.phase >= 3 ? 4 : 6);
    cage.shoveT++;
    if (cage.shoveTel > 0) { cage.shoveTel--; if (cage.shoveTel === 0) { cage.shove = 1; cage.shoveDmg = 14; } }
    else if (cage.shoveT >= cad * hz()) { cage.shoveT = 0; cage.shoveTel = 0.5 * hz(); cage.shove = 0; cage.edge = R(s).int(4); }
    cage.elecT = (cage.elecT || 0) + 1;
    if (b.phase >= 3) cage.walls = (cage.elecT % (5 * hz()) < 1.5 * hz()) ? [1, 1, 1, 1] : [0, 0, 0, 0];
    else { i = ((cage.elecT / (8 * hz())) | 0) % 2; cage.walls = i ? [1, 1, 0, 0] : [0, 0, 1, 1]; }
    if (b.counterStanceT > 0) { b.counterStanceT--; if (b.counterStanceT <= 0) b.aiState = "IDLE"; return; }
    if (b.aiState === "ATTACK") { if (stepPat(b) === "done") b.aiState = "IDLE"; return; }
    if (!h) return;
    b.facing = h.x >= b.x ? 1 : -1;
    b.patCdT = (b.patCdT || 0) - 1;
    if (b.patCdT <= 0) {
      if (b.phase >= 3 && R(s).chance(0.3)) { b.counterStanceT = tt(C().E8_STANCE_F || 30); b.aiState = "COUNTER_STANCE"; }
      else startPat(b, tt(26), tt(4), tt(14), b.phase >= 3 ? "enrage" : "combo");
      b.patCdT = 2.4 * hz();
    }
  }
  function tick(s, b) {
    var def, h, g, stunned;
    if (!s || !b || !b.alive) return;
    def = defOf(b);
    if (b.staggerMax == null) b.staggerMax = def.staggerMax || 100;
    if (b.gimmick == null) b.gimmick = def.gimmick;
    if (b.maxHp == null) b.maxHp = def.hp || b.hp;
    tickPhase(s, b, def);
    stunned = tickStagger(b);
    h = nearest(b, heroes(s));
    g = b.gimmick || def.gimmick;
    if (g === "chain") tickB1(s, b, h);
    else if (g === "awning") tickB2(s, b, h);
    else if (g === "tunnel") tickB3(s, b, def, h);
    else if (g === "crane") tickB4(s, b, h);
    else if (g === "cage") tickB5(s, b, h);
    if (stunned) { b.vx = 0; b.vd = 0; }
    b.grippable = canGripBoss(b);
  }
  var api = { tick: tick, addStag: addStag, canGripBoss: canGripBoss, forceStagger: forceStagger, setB5Phase3: setB5Phase3 };
  if (typeof window !== "undefined") window.PAIBoss = api;
  if (typeof global !== "undefined") global.PAIBoss = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
