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
    /* Stagger is an authoritative interrupt. A pattern queued before the
       threshold must not resume inside the earned grip/throw punish window. */
    b.aiState = "STAGGERED"; b.tell = 0; b.atkPhase = 3;
    b.telegraphT = 0; b.activeT = 0; b.recoverT = 0; b.atkHitMask = 0;
  }
  function addStag(b, n) {
    /* Only B4's crane-cab armor gates stagger. resetEnt initializes the
       shared cabBroken field to false on every entity, so checking the field
       alone accidentally disabled the stagger system for all five bosses. */
    if (!b || (b.archetype === "B4" && b.cabBroken === false)) return;
    b.stag = (b.stag || 0) + n; b.stagIdleT = 0;
    if (b.stag >= stagMax(b)) enterStagger(b);
  }
  function livingAdds(s, boss, arch) {
    var es = ents(s, "enemies"), i, e, n = 0;
    for (i = 0; i < es.length; i++) {
      e = es[i];
      if (!e || !e.alive || e === boss || e.boss) continue;
      if (!arch || e.archetype === arch) n++;
    }
    return n;
  }
  function ensureAdds(s, boss, arch, count, cooldown) {
    var S = G("PSim"), n, side;
    boss.addCdT = (boss.addCdT || 0) - 1;
    if (boss.addCdT > 0 || !S || !S.spawnEnemy) return;
    n = livingAdds(s, boss, arch);
    while (n < count) {
      side = n & 1;
      if (!S.spawnEnemy(s, {
        archetype: arch,
        x: side ? 420 : 60,
        d: side ? 42 : 18,
        facing: side ? -1 : 1,
        waveId: boss.waveId || "boss"
      })) break;
      n++;
    }
    boss.addCdT = cooldown;
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
    var max, st = b.combatState;
    if (st === "STAGGERED" || st === "GRIPPED" || st === "THROWN_FLIGHT" ||
        st === "KNOCKDOWN" || st === "GETUP" || st === "HITSTUN" || st === "GRIP_BROKEN") {
      /* combat.js is the single owner of staggeredT countdown. */
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
    tel = Math.round(tel * (b.telegraphMul || 1));
    b.telegraphT = tel < tt(24) ? tt(24) : tel; b.telegraphMax = b.telegraphT;
    b.activeT = act; b.activeMax = act; b.recoverT = rec; b.recoverMax = rec;
    b.atkHitMask = 0;
  }
  /* Pattern damage (PRD §4.11 boss tables). Radial patterns hit regardless
     of facing; pound/spin have extended reach (shockwave / whip radius). */
  var PAT_DMG = {
    charge: 18, pound: 14, lash: 15, spin: 12, grab: 16,
    duel: 20, stance: 22, tunnel: 18, hammer: 20, combo: 12, enrage: 14
  };
  var PAT_REACH = { pound: 100, spin: 140, lash: 90, tunnel: 60 };
  var PAT_RADIAL = { pound: 1, spin: 1 };
  /* Apply pattern damage to living heroes in reach during the active phase,
     once per hero per pattern, via the public combat API (respects iFrames). */
  function hitHeroes(s, b, dmg, reach, radial) {
    var P = G("PCombat"), H = G("PCombatHit"), hs = heroes(s), tol = (C().DEPTH_HIT || 10) + 4;
    var i, h, bit, dx, rx, dealt;
    if (!P || !P.applyDamage || !(dmg > 0)) return;
    for (i = 0; i < hs.length; i++) {
      h = hs[i];
      bit = 1 << (h.playerIndex || 0);
      if (b.atkHitMask & bit) continue;
      if (h.combatState === "THROWN_FLIGHT" || h.combatState === "DOWN") continue;
      if (Math.abs((h.d || 0) - (b.d || 0)) > tol) continue;
      dx = h.x - b.x;
      rx = reach != null ? reach : ((b.w || 44) + (h.w || 34)) * 0.5 + 16;
      if (Math.abs(dx) > rx) continue;
      if (!radial && dx * (b.facing || 1) < -(b.w || 44) * 0.5) continue;
      b.atkHitMask |= bit;
      dealt = P.applyDamage(s, h, dmg, b, {});
      if (dealt > 0) {
        if (H && H.enterHitstun) H.enterHitstun(h, 14);
        h.vx = (b.facing || 1) * 170;
      }
    }
  }
  function stepPat(s, b) {
    if (b.telegraphT > 0) { b.telegraphT--; b.tell = 1; b.atkPhase = 0; return "tel"; }
    b.tell = 0;
    if (b.activeT > 0) {
      b.activeT--; b.atkPhase = 1;
      hitHeroes(s, b, (PAT_DMG[b.patternName] || 14) * (b.damageMul || 1), PAT_REACH[b.patternName], !!PAT_RADIAL[b.patternName]);
      return "act";
    }
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
    ensureAdds(s, b, "E1", 2, 8 * hz());
    if (b.chainCdT <= 0 && live.length) {
      n = live[R(s).int(live.length)]; n.chainedT = 4 * hz(); n.chainX = n.x; n.chainD = n.d;
      b.chainCdT = 8 * hz();
    }
    if (b.aiState === "ATTACK") {
      if (stepPat(s, b) === "act" && h) { b.facing = h.x >= b.x ? 1 : -1; if (b.patternName === "charge") b.vx = b.facing * 240; }
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
      ensureAdds(s, b, "E6", 2, 15 * hz());
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
    if (b.aiState === "ATTACK") { if (stepPat(s, b) === "done") b.aiState = "IDLE"; return; }
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
      if (b.aiState === "ATTACK" && stepPat(s, b) === "done") b.tunnelPhase = "dark";
      return;
    }
    s.tunnelDarkT = 0;
    if (b.tunnelCdT <= 0) {
      b.tunnelDarkT = 3 * hz(); b.tunnelD = h ? h.d : (R(s).next() * 60);
      b.tunnelPhase = "tel"; b.tunnelCdT = 8 * hz(); b.tell = 1;
      return;
    }
    if (b.aiState === "ATTACK") { if (stepPat(s, b) === "done") b.aiState = "IDLE"; return; }
    if (!h) return;
    b.facing = h.x >= b.x ? 1 : -1;
    b.patCdT = (b.patCdT || 0) - 1;
    if (b.patCdT <= 0) { startPat(b, tt(28), tt(6), tt(26), b.phase >= 2 ? "stance" : "duel"); b.patCdT = 1.5 * hz(); }
  }
  function tickB4(s, b, h) {
    var hit;
    if (b.cabBroken == null) b.cabBroken = false;
    if (!b.cabBroken) {
      ensureAdds(s, b, "E8", 2, 15 * hz());
      b.invuln = true; b.iFrames = Math.max(b.iFrames || 0, 2);
      hit = thrownHits(s, b, null);
      if (hit || b.cabHit) { b.cabBroken = true; b.invuln = false; b.cabHit = 0; }
    }
    b.dropCdT = (b.dropCdT || 0) - 1;
    if (b.dropTelT > 0) {
      b.dropTelT--; b.tell = 1;
      if (b.dropTelT === 0) {
        b.containerDrop = 1; b.tell = 0;
        /* container impact: damage heroes standing in the telegraphed spot */
        (function () {
          var P = G("PCombat"), H = G("PCombatHit"), hs = heroes(s), i, hh, dealt;
          if (!P || !P.applyDamage) return;
          for (i = 0; i < hs.length; i++) {
            hh = hs[i];
            if (Math.abs(hh.x - b.dropX) > 32 || Math.abs((hh.d || 0) - (b.dropD || 0)) > 14) continue;
            dealt = P.applyDamage(s, hh, 20, b, {});
            if (dealt > 0 && H && H.enterHitstun) H.enterHitstun(hh, 14);
          }
        })();
      }
    } else if (b.dropCdT <= 0) {
      b.dropTelT = tt(40); b.dropX = h ? h.x : b.x; b.dropD = h ? h.d : b.d; b.dropCdT = 7 * hz();
    }
    if (b.aiState === "ATTACK") { if (stepPat(s, b) === "done") b.aiState = "IDLE"; return; }
    if (h && b.cabBroken) {
      b.facing = h.x >= b.x ? 1 : -1;
      b.patCdT = (b.patCdT || 0) - 1;
      if (b.patCdT <= 0) { startPat(b, tt(36), tt(6), tt(34), "hammer"); b.patCdT = 3.4 * hz(); }
    }
  }
  function tickB5(s, b, h) {
    var cage, cad, i, hs, hh, edge, near, P, H, dealt;
    b.fightT = (b.fightT || 0) + 1;
    if (b.fightT >= (s.bossEnrageS || 240) * hz()) { b.enrage = true; b.enrageMul = 1.3; }
    cage = s.cage || { walls: [0, 0, 0, 0], shoveT: 0, shoveTel: 0, elecT: 0 };
    s.cage = cage;
    cad = b.enrage ? 3 : (b.phase >= 3 ? 4 : 6);
    if (b.phase >= 2) {
      cage.shoveT++;
      if (cage.shoveTel > 0) {
        cage.shoveTel--;
        if (cage.shoveTel === 0) {
          cage.shove = 1; cage.shoveDmg = 14; edge = cage.edge | 0;
          hs = heroes(s); P = G("PCombat"); H = G("PCombatHit");
          for (i = 0; i < hs.length; i++) {
            hh = hs[i];
            near = edge === 0 ? hh.x < 80 : edge === 1 ? hh.x > 400 : edge === 2 ? hh.d < 14 : hh.d > 46;
            if (!near) continue;
            dealt = P && P.applyDamage ? P.applyDamage(s, hh, cage.shoveDmg, b, {}) : cage.shoveDmg;
            if (!P || !P.applyDamage) hh.hp = Math.max(0, hh.hp - dealt);
            if (dealt > 0 && H && H.enterKnockdown) H.enterKnockdown(hh);
            if (edge < 2) {
              hh.x += edge === 0 ? 32 : -32;
              hh.vx = edge === 0 ? 260 : -260;
            } else {
              hh.d += edge === 2 ? 14 : -14;
              hh.vd = edge === 2 ? 180 : -180;
            }
          }
        }
      } else if (cage.shoveT >= cad * hz()) {
        cage.shoveT = 0; cage.shoveTel = 0.5 * hz(); cage.shove = 0; cage.edge = R(s).int(4);
      }
    } else { cage.shoveT = 0; cage.shoveTel = 0; cage.shove = 0; }
    cage.elecT = (cage.elecT || 0) + 1;
    if (b.phase >= 3) cage.walls = (cage.elecT % (5 * hz()) < 1.5 * hz()) ? [1, 1, 1, 1] : [0, 0, 0, 0];
    else { i = ((cage.elecT / (8 * hz())) | 0) % 2; cage.walls = i ? [1, 1, 0, 0] : [0, 0, 1, 1]; }
    if (cage.weightImpactT > 0) cage.weightImpactT--;
    if (b.phase >= 2) {
      cage.weightT = (cage.weightT || 0) + 1;
      if (cage.weightTel > 0) {
        cage.weightTel--;
        if (cage.weightTel === 0) {
          cage.weightImpactT = tt(12); hs = heroes(s); P = G("PCombat"); H = G("PCombatHit");
          for (i = 0; i < hs.length; i++) {
            hh = hs[i];
            if (Math.abs(hh.x - cage.weightX) > 28 || Math.abs(hh.d - cage.weightD) > 14) continue;
            dealt = P && P.applyDamage ? P.applyDamage(s, hh, 24, b, {}) : 24;
            if (!P || !P.applyDamage) hh.hp = Math.max(0, hh.hp - dealt);
            if (dealt > 0 && H && H.enterKnockdown) H.enterKnockdown(hh);
          }
        }
      } else if (cage.weightT >= 10 * hz()) {
        cage.weightT = 0; cage.weightTel = Math.round(0.7 * hz());
        cage.weightX = 40 + R(s).next() * 400;
        cage.weightD = 8 + R(s).next() * 44;
      }
    } else { cage.weightT = 0; cage.weightTel = 0; cage.weightImpactT = 0; }
    if (b.counterStanceT > 0) return;
    /* Rex directs one finite Gold Jacket wave before personally entering the
       phase-one clean fight; phase three replenishes throwable E8 ammo. */
    if (b.phase === 1 && !b.directingDone) {
      if (!b.directingStarted) { b.directingStarted = true; ensureAdds(s, b, "E8", 2, 15 * hz()); }
      if (livingAdds(s, b, "E8") > 0) { b.invuln = true; b.aiState = "IDLE"; return; }
      b.directingDone = true; b.invuln = false; b.addCdT = 0;
    }
    if (b.phase >= 3) ensureAdds(s, b, "E8", 2, 15 * hz());
    if (b.aiState === "ATTACK") { if (stepPat(s, b) === "done") b.aiState = "IDLE"; return; }
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
    /* Cab-break is a collision result, not an AI action. Consume it even if
       that same collision put B4 into hitstun/knockdown. */
    if (b.archetype === "B4" && b.cabHit && !b.cabBroken) {
      b.cabBroken = true; b.invuln = false; b.cabHit = 0;
    }
    tickPhase(s, b, def);
    stunned = tickStagger(b);
    h = nearest(b, heroes(s));
    g = b.gimmick || def.gimmick;
    if (stunned) {
      b.vx = 0; b.vd = 0; b.grippable = canGripBoss(b);
      return;
    }
    if (g === "chain") tickB1(s, b, h);
    else if (g === "awning") tickB2(s, b, h);
    else if (g === "tunnel") tickB3(s, b, def, h);
    else if (g === "crane") tickB4(s, b, h);
    else if (g === "cage") tickB5(s, b, h);
    b.grippable = canGripBoss(b);
  }
  var api = { tick: tick, addStag: addStag, canGripBoss: canGripBoss, forceStagger: forceStagger, setB5Phase3: setB5Phase3 };
  if (typeof window !== "undefined") window.PAIBoss = api;
  if (typeof global !== "undefined") global.PAIBoss = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
