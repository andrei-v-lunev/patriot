/* THE PATRIOT — enemy brains + attack tokens. Delayed snap; no DOM/Date/Math.random. */
(function () {
  var DELAY = 12, RING = 13;
  function G(n) {
    if (typeof window !== "undefined" && window[n]) return window[n];
    if (typeof global !== "undefined" && global[n]) return global[n];
    return null;
  }
  function C() { return G("PConst") || {}; }
  function hz() { return C().SIM_HZ || 120; }
  function tt(f) { var d = G("PData"); return d && d.toTicks ? d.toTicks(f) : (f | 0) * 2; }
  function ents(s, n) { return (s[n] && s[n].length ? s[n] : null) || (s.pools && s.pools[n] && s.pools[n].all) || []; }
  function R(s) {
    return s.rng || { next: function () { return 0.5; }, chance: function () { return false; }, int: function () { return 0; } };
  }
  function defOf(e) { var d = G("PData"); return e.def || (d && d.getEnemy && d.getEnemy(e.archetype)) || {}; }
  function tokN(s) {
    if (s.wave && s.wave.tokens != null) return s.wave.tokens;
    if (s.attackTokens != null) return s.attackTokens;
    var c = C();
    return (s.players === 2 || s.coop || s.p2) ? (c.TOKENS_2P || 3) : (c.TOKENS_1P || 2);
  }
  function heldN(s) {
    var es = ents(s, "enemies"), n = 0, i;
    for (i = 0; i < es.length; i++) if (es[i] && es[i].alive && es[i].tokenHeld) n += es[i].tokenCost || 1;
    return n;
  }
  function living(s) {
    var hs = ents(s, "heroes"), o = [], i, h;
    for (i = 0; i < hs.length; i++) {
      h = hs[i];
      if (h && h.alive && h.hp > 0 && !h.benched && h.combatState !== "DOWN") o.push(h);
    }
    return o;
  }
  function pushSnap(s) {
    var i, slot, hs, h;
    if (!s.aiHist) {
      s.aiHist = [];
      for (i = 0; i < RING; i++) s.aiHist.push({ x0: 0, d0: 0, x1: 0, d1: 0, vx0: 0, vx1: 0, wT: 0 });
      s.aiHistI = 0;
    }
    slot = s.aiHist[s.aiHistI];
    hs = ents(s, "heroes");
    h = hs[0];
    slot.x0 = h ? h.x : 0; slot.d0 = h ? h.d : 0; slot.vx0 = h ? h.vx : 0;
    h = hs[1];
    slot.x1 = h ? h.x : 0; slot.d1 = h ? h.d : 0; slot.vx1 = h ? h.vx : 0;
    slot.wT = s.gripWhiffT > 0 ? 1 : 0;
    for (i = 0; i < hs.length; i++) {
      h = hs[i];
      if (h && (h.gripWhiffT > 0 || h.whiffT > 0)) slot.wT = 1;
    }
    s.aiHistI = (s.aiHistI + 1) % RING;
  }
  function near(e, sn, hs) {
    var best = null, bd = 1e9, i, h, hx, hd, d, u1;
    for (i = 0; i < hs.length; i++) {
      h = hs[i];
      /* BUGFIX: was `h.id === 1 || h === hs[1]`. h.id is the entity POOL's
         global allocation counter (shared across heroes/enemies/everything),
         not a P1/P2 role index — in solo play the lone hero routinely gets
         pool id 1 by coincidence of allocation order, so u1 was true even
         with no second player. That made near() read the never-populated P2
         snapshot slot (sn.x1/d1, always 0,0 in 1P) instead of the hero's
         real position (sn.x0/d0), so every "approach" enemy (E1/E2/E3/E4/E6
         goons via thinkGoons/steer) steered toward x=0,d=0 — i.e. away from
         the hero, not toward it. playerIndex is the stable P1/P2 identifier
         used everywhere else in this codebase (sim.js applyIntent, combat),
         and it lines up with pushSnap()'s hs[0]->x0/hs[1]->x1 slot mapping. */
      u1 = h.playerIndex === 1;
      hx = sn ? (u1 ? sn.x1 : sn.x0) : h.x;
      hd = sn ? (u1 ? sn.d1 : sn.d0) : h.d;
      d = (hx - e.x) * (hx - e.x) + (hd - e.d) * (hd - e.d);
      if (d < bd) { bd = d; best = { h: h, x: hx, d: hd, vx: sn ? (u1 ? sn.vx1 : sn.vx0) : h.vx }; }
    }
    return best;
  }
  function steer(e, tx, td, sp, sd) {
    var dx = tx - e.x, dd = td - e.d;
    sp *= e.moveMul || 1; sd *= e.moveMul || 1;
    e.vx = dx > 4 ? sp : dx < -4 ? -sp : 0;
    e.vd = (dx > 80 || dx < -80) ? 0 : (dd > 2 ? sd : dd < -2 ? -sd : 0);
    if (dx > 2) e.facing = 1; else if (dx < -2) e.facing = -1;
  }
  function release(e) {
    if (!e.tokenHeld) return;
    e.tokenHeld = false; e.tokenHoldT = 0;
    e.tokenCdT = (C().TOKEN_CD_S || 0.6) * hz();
  }
  function claim(s, e, cost) {
    cost = cost == null ? (e.tokenCost || 1) : cost;
    if (e.tokenHeld) return true;
    if ((e.tokenCdT || 0) > 0 || heldN(s) + cost > tokN(s)) return false;
    e.tokenHeld = true; e.tokenCost = cost;
    e.tokenHoldT = (C().TOKEN_HOLD_S || 2.5) * hz();
    return true;
  }
  function busy(e) {
    var st = e.combatState;
    return st === "HITSTUN" || st === "GRIPPED" || st === "THROWN" || st === "THROWN_FLIGHT" ||
      st === "KNOCKDOWN" || st === "GETUP" || st === "STAGGERED" || st === "DOWN";
  }
  function startAtk(e, def) {
    var atk = def.attack || {}, tel = tt(atk.startup != null ? atk.startup : 24), act = tt(atk.active || 4);
    tel = Math.round(tel * (e.telegraphMul || 1));
    if (tel < tt(24)) tel = tt(24);
    e.aiState = "ATTACK"; e.telegraphT = tel; e.telegraphMax = tel;
    e.activeT = act; e.activeMax = act;
    e.recoverT = tt(atk.recovery || 22); e.recoverMax = e.recoverT;
    e.atkDmg = (atk.damage || 8) * (e.damageMul || 1); e.atkPhase = 0; e.tell = 1; e.fired = 0;
    /* melee hit application: reset per-attack hero-hit mask; projectile (E3)
       and grab (E5) attacks resolve elsewhere and never land a melee hit. */
    e.atkHitMask = 0;
    e.atkMelee = !(atk.proj || atk.grab);
    e.dashVx = atk.dash ? atk.dash * hz() / act : 0;
    if (e.combatState === "FREE" || e.combatState === "IDLE" || !e.combatState) e.combatState = "ATTACK";
  }
  /* Apply e.atkDmg to any living hero inside the attack's reach during the
     active phase. Once per hero per attack (atkHitMask). Damage goes through
     the public combat API (PCombat.applyDamage) which already respects hero
     iFrames/ukemi and grip-break rules. */
  function hitHeroes(s, e, dmg, reach, radial) {
    var P = G("PCombat"), H = G("PCombatHit"), hs = living(s), tol = C().DEPTH_HIT || 10;
    var i, h, bit, dx, rx, ez, hz2, dealt;
    if (!P || !P.applyDamage || !(dmg > 0)) return;
    for (i = 0; i < hs.length; i++) {
      h = hs[i];
      bit = 1 << (h.playerIndex || 0);
      if (e.atkHitMask & bit) continue;
      if (h.combatState === "THROWN_FLIGHT" || h.combatState === "DOWN") continue;
      if (Math.abs((h.d || 0) - (e.d || 0)) > tol) continue;
      dx = h.x - e.x;
      rx = reach != null ? reach : ((e.w || 30) + (h.w || 34)) * 0.5 + 8;
      if (Math.abs(dx) > rx) continue;
      if (!radial && dx * (e.facing || 1) < -(e.w || 30) * 0.5) continue;
      ez = e.z || 0; hz2 = h.z || 0;
      if (hz2 >= ez + (e.h || 40) + 12 || ez >= hz2 + (h.h || 62) + 12) continue;
      e.atkHitMask |= bit;
      dealt = P.applyDamage(s, h, dmg, e, {});
      if (dealt > 0) {
        if (H && H.enterHitstun) H.enterHitstun(h, 12);
        h.vx = (e.facing || 1) * 140;
      }
    }
  }
  function stepAtk(s, e) {
    if (e.telegraphT > 0) { e.telegraphT--; e.tell = 1; e.atkPhase = 0; e.vx = 0; e.vd = 0; return "tel"; }
    e.tell = 0;
    if (e.activeT > 0) {
      e.activeT--; e.atkPhase = 1;
      if (e.dashVx) e.vx = (e.facing || 1) * e.dashVx;
      if (e.atkMelee) hitHeroes(s, e, e.atkDmg || 8);
      return "act";
    }
    if (e.recoverT > 0) { e.recoverT--; e.atkPhase = 2; e.vx = 0; e.vd = 0; return "rec"; }
    e.atkPhase = 3; release(e);
    if (e.combatState === "ATTACK") e.combatState = "FREE";
    return "done";
  }
  function circling(s, e, hx, hd, sp, sd) {
    if ((e.circleT || 0) <= 0) {
      e.circleR = 90 + R(s).next() * 60;
      e.circleSign = R(s).chance(0.5) ? 1 : -1;
      e.circleT = 0.5 * hz();
    }
    e.circleT--;
    steer(e, hx + e.circleSign * e.circleR, hd, sp, sd);
  }
  function melee(e, hx, hd) { return Math.abs(e.x - hx) < 42 && Math.abs(e.d - hd) < 20; }
  function fireMelon(s, e, def) {
    var pool = s.pools && s.pools.projectiles, p, atk = def.attack || {};
    if (!pool || !pool.alloc) return;
    p = pool.alloc();
    if (!p) return;
    p.kind = "melon"; p.x = e.x + (e.facing || 1) * 12; p.z = (e.z || 0) + 20; p.d = e.d;
    p.vx = (e.facing || 1) * (atk.projSpeed || 300); p.vz = 0; p.w = 12; p.h = 12;
    p.dmg = atk.damage || 10; p.ownerId = e.id; p.life = (C().FLIGHT_LIFE_S || 2.5) * hz(); p.hitN = 0;
    /* BUGFIX: the melon was allocated from the pool but never entered the
       world — state.projectiles is the list the sim ticks and render draws. */
    if (s.projectiles) s.projectiles.push(p);
  }
  function thinkE3(s, e, def, hx, hd) {
    var dist = Math.abs(e.x - hx), sp = def.speed || 84, sd = def.speedD || 50, r;
    e.facing = hx >= e.x ? 1 : -1;
    if (dist < 90) { e.aiState = "FLEE"; steer(e, e.x - e.facing * 80, hd, sp, sd); return; }
    if (dist < 180) steer(e, e.x - e.facing * 40, hd, sp, sd);
    else if (dist < 220) steer(e, e.x - e.facing * 20, hd, sp * 0.5, sd);
    else if (dist > 320) steer(e, hx - e.facing * 270, hd, sp, sd);
    else { e.vx = 0; e.vd = hd > e.d + 4 ? sd * 0.4 : hd < e.d - 4 ? -sd * 0.4 : 0; }
    if (e.aiState === "ATTACK") {
      r = stepAtk(s, e);
      if (r === "act" && !e.fired) { e.fired = 1; fireMelon(s, e, def); }
      if (r === "done") { e.aiState = "KITE"; e.fireCdT = 1.6 * hz(); }
      return;
    }
    e.fireCdT = (e.fireCdT || 0) - 1;
    if (e.fireCdT <= 0 && dist >= 90 && claim(s, e, def.tokenCost || 1)) startAtk(e, def);
    else e.aiState = "KITE";
  }
  function thinkE5(s, e, def, hx, hd, t) {
    var h = t.h, sp = def.speed || 92;
    e.canGripHero = true;
    if (e.holdingHero && h) {
      e.vx = 0; e.vd = 0; e.holdT = (e.holdT || 0) + 1; e.holdDmgT = (e.holdDmgT || 0) + 1;
      if (e.holdDmgT >= 0.5 * hz()) { e.holdDmgT = 0; h.hp -= 6; if (h.hp < 0) h.hp = 0; }
      if (e.holdT >= 1.4 * hz()) {
        e.holdingHero = 0; e.heldId = -1; e.holdT = 0;
        if (h.combatState === "GRIPPED") h.combatState = "FREE";
        release(e); e.aiState = "IDLE";
      }
      return;
    }
    if (e.aiState === "ATTACK") {
      if (stepAtk(s, e) === "act" && Math.abs(e.x - hx) < 40 && Math.abs(e.d - hd) <= (C().DEPTH_GRIP || 12)) {
        e.holdingHero = 1; e.heldId = h.id; e.holdT = 0; e.holdDmgT = 0;
        h.combatState = "GRIPPED"; h.gripperId = e.id;
      }
      if (e.atkPhase === 3) e.aiState = "IDLE";
      return;
    }
    steer(e, hx + (e.facing || 1) * 28, hd, sp, def.speedD || 55);
    e.aiState = "STALK";
    if (melee(e, hx, hd) && claim(s, e, def.tokenCost || 1)) startAtk(e, def);
  }
  function thinkE6(s, e, def, hx, hd) {
    var rate = 180 / hz(), want = hx >= e.x ? 0 : 180, diff;
    if (e.faceAng == null) e.faceAng = e.facing >= 0 ? 0 : 180;
    diff = want - e.faceAng;
    if (diff > 180) diff -= 360; if (diff < -180) diff += 360;
    if (diff > rate) e.faceAng += rate; else if (diff < -rate) e.faceAng -= rate; else e.faceAng = want;
    if (e.faceAng < 0) e.faceAng += 360; if (e.faceAng >= 360) e.faceAng -= 360;
    e.facing = (e.faceAng < 90 || e.faceAng > 270) ? 1 : -1;
    if (e.aiState === "ATTACK") { if (stepAtk(s, e) === "done") e.aiState = "IDLE"; return; }
    steer(e, hx, hd, def.speed || 66, def.speedD || 40);
    e.aiState = "ADVANCE";
    if (melee(e, hx, hd) && Math.abs(diff) < 25 && claim(s, e, def.tokenCost || 1)) startAtk(e, def);
  }
  function thinkE7(s, e, def, hx, hd) {
    var sp = def.speed || 110, sd = def.speedD || 66, jv = (def.attack || {}).jumpV || 380;
    if (!e._landed) { if (e.grounded) { e._landed = 1; e.aerialOnly = false; } else e.aerialOnly = true; } else e.aerialOnly = false;
    if (e.aiState === "ATTACK") {
      if (e.atkPhase === 0 && e.telegraphT === 1) e.vz = jv;
      if (stepAtk(s, e) === "done") { e.aiState = "IDLE"; e.recoverT = tt(20); }
      return;
    }
    if ((e.hopT || 0) <= 0) { e.hopT = 1.2 * hz(); if (e.grounded) e.vz = jv * 0.45; } else e.hopT--;
    circling(s, e, hx, hd, sp, sd);
    e.aiState = "HOP";
    if (melee(e, hx, hd) && claim(s, e, def.tokenCost || 1)) startAtk(e, def);
  }
  function thinkE8(s, e, def, hx, hd, t, sn) {
    var cost = def.tokenCost || 2, app;
    if (e.counterStanceT > 0) {
      /* combat.js owns the timer; AI only enforces stance behavior. */
      e.vx = 0; e.vd = 0; e.aiState = "COUNTER_STANCE";
      return;
    }
    if (e.aiState === "ATTACK" || e.aiState === "COMBO") { if (stepAtk(s, e) === "done") e.aiState = "IDLE"; return; }
    app = (e.x > hx && t.vx > 8) || (e.x < hx && t.vx < -8);
    if (sn && sn.wT && claim(s, e, cost)) { startAtk(e, def); return; }
    if (app && R(s).chance(0.4)) { e.counterStanceT = tt(C().E8_STANCE_F || 30); e.aiState = "COUNTER_STANCE"; return; }
    steer(e, hx, hd, def.speed || 96, def.speedD || 58);
    if (melee(e, hx, hd) && claim(s, e, cost)) { startAtk(e, def); e.aiState = "COMBO"; }
    else e.aiState = "READ";
  }
  function thinkGoons(s, e, def, hx, hd) {
    var sp = def.speed || 78, sd = def.speedD || 47, arch = e.archetype || def.id;
    if (e.aiState === "ATTACK") {
      if (stepAtk(s, e) === "done") {
        if (arch === "E1" && R(s).chance(0.2)) { e.aiState = "CIRCLE"; e.circleT = hz(); }
        else e.aiState = "IDLE";
      }
      return;
    }
    if (e.aiState === "CIRCLE" && arch !== "E2") { circling(s, e, hx, hd, sp, sd); if ((e.circleT || 0) <= 0) e.aiState = "IDLE"; return; }
    if (arch === "E4") {
      e.dashCdT = (e.dashCdT || 0) - 1;
      steer(e, hx, hd, sp, sd); e.aiState = "CHARGE";
      if (e.dashCdT <= 0 && claim(s, e, def.tokenCost || 1)) { startAtk(e, def); e.dashCdT = 2.2 * hz(); }
      return;
    }
    steer(e, hx, hd, sp, sd); e.aiState = "APPROACH";
    if (melee(e, hx, hd)) {
      if (claim(s, e, def.tokenCost || 1)) startAtk(e, def);
      else if (arch !== "E2") { e.aiState = "CIRCLE"; circling(s, e, hx, hd, sp, sd); }
    }
  }
  function thinkOne(s, e, sn) {
    var def, t, arch, B, st;
    if (!e || !e.alive) return;
    if (e.tokenCdT > 0) e.tokenCdT--;
    if (e.tokenHeld) { e.tokenHoldT--; if (e.tokenHoldT <= 0) release(e); }
    if (e.combatState === "KNOCKDOWN") {
      if (!e.kdDelaySet) { e.kdDelaySet = true; e.getupDelayT = tt(R(s).int(21)); e.stateT = (e.stateT || 0) + e.getupDelayT; }
    } else e.kdDelaySet = false;
    def = defOf(e); arch = e.archetype || def.id || "";
    if (!e._aiInit) {
      e._aiInit = 1; e.tokenCost = def.tokenCost || 1;
      if (def.unlaunchable) e.unlaunchable = true;
      if (def.canGripHero) e.canGripHero = true;
      if (def.aerialOnly) e.aerialOnly = true;
    }
    if (def.boss || arch.charAt(0) === "B") { B = G("PAIBoss"); if (B && B.tick) B.tick(s, e); return; }
    if (busy(e)) {
      st = e.combatState;
      if (st === "HITSTUN" || st === "GRIPPED" || st === "THROWN" || st === "THROWN_FLIGHT") release(e);
      if (st !== "THROWN_FLIGHT") { e.vx = 0; e.vd = 0; }
      return;
    }
    if (e.x < (s.cam ? s.cam.x : 0) - 60) { e.vx = (def.speed || 70) * 1.3; e.vd = 0; e.aiState = "LEASH"; return; }
    if (e.x > (s.cam ? s.cam.x : 0) + 860) { e.vx = -(def.speed || 70) * 1.3; e.vd = 0; e.aiState = "LEASH"; return; }
    if (arch === "DUMMY" || def.dummy) { e.vx = 0; e.vd = 0; e.aiState = "IDLE"; return; }
    t = near(e, sn, living(s));
    if (!t) { e.vx = 0; e.vd = 0; e.aiState = "IDLE"; return; }
    if (arch === "E3") thinkE3(s, e, def, t.x, t.d);
    else if (arch === "E5") thinkE5(s, e, def, t.x, t.d, t);
    else if (arch === "E6") thinkE6(s, e, def, t.x, t.d);
    else if (arch === "E7") thinkE7(s, e, def, t.x, t.d);
    else if (arch === "E8") thinkE8(s, e, def, t.x, t.d, t, sn);
    else thinkGoons(s, e, def, t.x, t.d);
  }
  function think(s) {
    var es, i;
    if (!s) return;
    if (s.attackTokens == null) s.attackTokens = tokN(s);
    pushSnap(s);
    es = ents(s, "enemies");
    for (i = 0; i < es.length; i++) thinkOne(s, es[i], s.aiHist[s.aiHistI]);
    s.tokensInUse = heldN(s);
  }
  function canGripBoss(b) {
    var B = G("PAIBoss");
    if (B && B.canGripBoss) return B.canGripBoss(b);
    return !!(b && (b.staggeredT > 0 || b.combatState === "STAGGERED"));
  }
  function forceStagger(b) {
    var B = G("PAIBoss");
    if (B && B.forceStagger) return B.forceStagger(b);
    if (!b) return;
    b.combatState = "STAGGERED"; b.staggeredT = (C().STAGGER_S || 2) * hz(); b.stag = 0; b.throwMul = C().BOSS_THROW_MUL || 1.35;
  }
  function setB5Phase3(b) {
    var B = G("PAIBoss");
    if (B && B.setB5Phase3) return B.setB5Phase3(b);
    if (b) { b.phase = 3; b.chipFloor = true; }
  }
  if (typeof require === "function") {
    try { require("./ai.boss"); } catch (eBoss) {}
  }
  var api = { think: think, canGripBoss: canGripBoss, forceStagger: forceStagger, setB5Phase3: setB5Phase3 };
  if (typeof window !== "undefined") window.PAI = api;
  if (typeof global !== "undefined") global.PAI = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
