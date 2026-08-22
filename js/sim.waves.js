/* Wave triggers, delayed spawns, off_train hazard. */
(function () {
  var PData = (typeof window !== "undefined" && window.PData) || (typeof global !== "undefined" && global.PData) || (typeof require !== "undefined" ? require("./data") : null);

  function toTicks(f) {
    return PData && PData.toTicks ? PData.toTicks(f) : (f | 0) * 2;
  }
  function ps() {
    return (typeof window !== "undefined" && window.PSim) || (typeof global !== "undefined" && global.PSim) || null;
  }
  function pickups() {
    return (typeof window !== "undefined" && window.PPickups) || (typeof global !== "undefined" && global.PPickups) || null;
  }
  function G(n) {
    if (typeof window !== "undefined" && window[n]) return window[n];
    if (typeof global !== "undefined" && global[n]) return global[n];
    return null;
  }
  function emit(state, name, a, b) {
    var ev;
    if (state.pools && state.pools.events) {
      ev = state.pools.events.alloc();
      if (ev) {
        ev.name = name;
        ev.a = a;
        ev.b = b;
        state.events.push(ev);
        return;
      }
    }
    state.events.push({ name: name, a: a || 0, b: b || 0, alive: true });
  }

  function init(state, seg) {
    state.wave = {
      defs: (seg && seg.waves) || [],
      started: {},
      cleared: {},
      clearedAt: {},
      pending: [],
      enterTick: state.tick,
      goFired: false,
      allCleared: false
    };
  }

  function heroPast(state, x) {
    var i, e;
    for (i = 0; i < state.heroes.length; i++) {
      e = state.heroes[i];
      if (e.alive && e.x >= x) return true;
    }
    return false;
  }

  function canTrigger(state, w, tr) {
    if (!tr || tr.type === "enter") return heroPast(state, state.xMin != null ? state.xMin : 0);
    if (tr.type === "cleared") {
      if (!w.cleared[tr.of]) return false;
      return state.tick >= (w.clearedAt[tr.of] || 0) + toTicks(tr.delayFrames || 0);
    }
    if (tr.type === "xpast") return heroPast(state, tr.x || 0);
    if (tr.type === "timer") return state.tick >= w.enterTick + toTicks(tr.frames || 0);
    return false;
  }

  function startWave(state, def) {
    var w = state.wave;
    var sps = def.spawns || [];
    var i, c, n, sp;
    w.started[def.id] = true;
    for (i = 0; i < sps.length; i++) {
      sp = sps[i];
      n = sp.count || 1;
      for (c = 0; c < n; c++) {
        w.pending.push({
          waveId: def.id,
          boss: !!def.boss,
          spec: sp,
          atTick: state.tick + toTicks(sp.delayFrames || 0)
        });
      }
    }
  }

  function flushPending(state) {
    var w = state.wave;
    var keep = [];
    var i, item, spec, e, arena, S, liveN;
    arena = state.segment && state.segment.arena;
    S = ps();
    for (i = 0; i < w.pending.length; i++) {
      item = w.pending[i];
      if (state.tick < item.atTick) {
        keep.push(item);
        continue;
      }
      liveN = 0;
      state.enemies.forEach(function (foe) { if (foe && foe.alive) liveN++; });
      if (liveN >= (state.maxAlive || 6)) { keep.push(item); continue; }
      spec = {
        archetype: item.spec.archetype,
        x: item.spec.x,
        d: item.spec.d,
        facing: item.spec.facing,
        waveId: item.waveId
      };
      if (!item.boss && arena && spec.x >= arena.xMin && spec.x <= arena.xMax) spec.z = 120;
      e = S && S.spawnEnemy ? S.spawnEnemy(state, spec) : null;
      if (!e) {
        keep.push(item);
        continue;
      }
      if (spec.z === 120) e.grounded = false;
      if (arena && (item.spec.x < arena.xMin || item.spec.x > arena.xMax)) {
        e.walkIn = true;
        e.facing = item.spec.x < arena.xMin ? 1 : -1;
      }
    }
    w.pending = keep;
  }

  function walkIn(state) {
    var arena = state.segment && state.segment.arena;
    var t = 1 / 120;
    var i, e, spd, pad;
    if (!arena) return;
    pad = 16;
    for (i = 0; i < state.enemies.length; i++) {
      e = state.enemies[i];
      if (!e.alive || !e.walkIn) continue;
      spd = (e.stats && e.stats.runMax) || 80;
      if (e.x < arena.xMin + pad) {
        e.x += spd * t;
        e.facing = 1;
      } else if (e.x > arena.xMax - pad) {
        e.x -= spd * t;
        e.facing = -1;
      } else e.walkIn = false;
    }
  }

  function fireGo(state) {
    state.go.active = true;
    state.go.opened = false;
    state.go.openT = 0;
    state.cam.locked = false;
    emit(state, "GO", 0, 0);
  }

  function checkCleared(state) {
    var w = state.wave;
    var live = {};
    var pend = {};
    var i, e, def, id, left = false;
    for (i = 0; i < state.enemies.length; i++) {
      e = state.enemies[i];
      if (e.alive && e.waveId) live[e.waveId] = 1;
    }
    for (i = 0; i < w.pending.length; i++) pend[w.pending[i].waveId] = 1;
    for (i = 0; i < w.defs.length; i++) {
      def = w.defs[i];
      id = def.id;
      if (!w.started[id]) {
        left = true;
        continue;
      }
      if (w.cleared[id]) continue;
      if (!live[id] && !pend[id]) {
        w.cleared[id] = true;
        w.clearedAt[id] = state.tick;
        emit(state, "wave_cleared", id, 0);
        /* PRD §4.12: the last enemy of a wave drops one tea when the active
           hero is below 40% HP (maximum one drop per wave). */
        (function () {
          var hs = state.heroes || [], hi, hero = null, death = state.lastEnemyDeath, P = pickups();
          if (!P || !P.spawn || w.pickupDropped && w.pickupDropped[id]) return;
          for (hi = 0; hi < hs.length; hi++) {
            if (hs[hi].alive && !hs[hi].benched && hs[hi].hp > 0) { hero = hs[hi]; break; }
          }
          if (!hero || hero.hp >= hero.maxHp * 0.4) return;
          if (!w.pickupDropped) w.pickupDropped = {};
          if (P.spawn(state, {
            kind: "tea",
            x: death && death.waveId === id ? death.x : hero.x,
            d: death && death.waveId === id ? death.d : hero.d,
            z: 0
          })) w.pickupDropped[id] = true;
        })();
        if (state.ippon && !state.ippon.paused) {
          state.ippon.chain = 0;
          state.ippon.timer = 0;
        }
      } else left = true;
    }
    if (!left && w.defs.length && !w.goFired) {
      w.goFired = true;
      w.allCleared = true;
      fireGo(state);
    }
  }

  function tickHazards(state) {
    var hz = state.hazards || [];
    var i, h, j, e, lists, li, arr, hit, cp, it, liveWall, hasTunnel = false, tunnelWarn = 0, tunnelDark = 0;
    function hurt(ent, hazard, amount) {
      var P, H;
      if ((ent.hazardIF | 0) > 0) return;
      ent.hazardIF = 90;
      P = G("PCombat"); H = G("PCombatHit");
      if (P && P.applyDamage) P.applyDamage(state, ent, amount, hazard, {});
      else ent.hp = Math.max(0, ent.hp - amount);
      if (H && H.enterKnockdown) H.enterKnockdown(ent);
    }
    /* P1-6: per-hero hazard i-frames tick down every step */
    for (j = 0; j < state.heroes.length; j++) {
      e = state.heroes[j];
      if ((e.pitRespawnT | 0) > 0) {
        e.pitRespawnT--;
        if (e.pitRespawnT === 0) {
          e.x = e.pitRespawnX;
          e.d = e.pitRespawnD;
          e.z = 16;
          e.vx = e.vz = e.vd = 0;
          e.grounded = true;
          e.alive = true;
          e.combatState = "FREE";
          e.hazardIF = 90;
        }
      }
      if ((e.hazardIF | 0) > 0) e.hazardIF--;
    }
    for (i = 0; i < hz.length; i++) {
      h = hz[i];
      if (h.type === "tunnel") {
        hasTunnel = true;
        if (h.triggerT == null && heroPast(state, h.x - 450)) h.triggerT = toTicks(h.telegraphFrames || 180);
        if (h.triggerT > 0) { h.triggerT--; tunnelWarn = Math.max(tunnelWarn, h.triggerT); }
        else if (h.triggerT === 0 && h.activeT == null) h.activeT = toTicks(60);
        if (h.activeT > 0) {
          h.activeT--; tunnelDark = Math.max(tunnelDark, h.activeT);
          for (j = 0; j < state.heroes.length; j++) {
            e = state.heroes[j]; it = state.intents && state.intents[e.playerIndex || 0];
            if (e.alive && !e.benched && e.x > h.x && e.x < h.x + h.w && !(it && it.moveD < -0.5)) hurt(e, h, 18);
          }
        }
        continue;
      }
      if (h.type === "container") {
        if (h.triggerT == null && heroPast(state, h.x - 200)) h.triggerT = toTicks(h.telegraphFrames || 18);
        if (h.triggerT > 0) h.triggerT--;
        else if (h.triggerT === 0 && !h.dropped) {
          h.dropped = true;
          for (j = 0; j < state.heroes.length; j++) {
            e = state.heroes[j];
            if (e.alive && !e.benched && Math.abs(e.x - h.x) < (h.w || 48) * 0.75) hurt(e, h, 24);
          }
        }
        continue;
      }
      if (h.type === "cage_wall") {
        liveWall = !state.cage || !state.cage.walls || state.cage.walls[h.wallIndex == null ? (h.x < 100 ? 0 : 1) : h.wallIndex];
        if (liveWall) for (j = 0; j < state.heroes.length; j++) {
          e = state.heroes[j];
          hit = h.d != null ?
            e.d + (e.depth || 10) * 0.5 > h.d && e.d - (e.depth || 10) * 0.5 < h.d + (h.depth || 8) :
            e.x + e.w * 0.5 > h.x && e.x - e.w * 0.5 < h.x + h.w;
          if (e.alive && !e.benched && hit) hurt(e, h, h.damage || 12);
        }
        continue;
      }
      if (h.type !== "off_train" && h.type !== "pit") continue;
      lists = h.type === "off_train" ? [state.heroes, state.enemies] : [state.heroes];
      for (li = 0; li < lists.length; li++) {
        arr = lists[li];
        for (j = 0; j < arr.length; j++) {
          e = arr[j];
          if (!e.alive || e.benched) continue;
          if (h.type === "off_train") {
            hit = e.x + e.w * 0.5 > h.x && e.x - e.w * 0.5 < h.x + h.w && e.z <= 16;
            if (!hit) continue;
            emit(state, h.announce || "С ПОЕЗДА!", e.id, 0);
            if (li === 0 && G("PTag") && G("PTag").fallLife) G("PTag").fallLife(state, e);
            else { e.hp = 0; e.alive = false; }
          } else {
            /* P1-6: genuine fall-in only — hero CENTER inside the pit span
               and actually fallen below the floor plane (airborne, z < 0),
               not mere edge-overlap while walking past. hazardIF (~90 ticks)
               prevents repeat damage+teleport every tick afterwards. */
            if ((e.hazardIF | 0) > 0) continue;
            hit = e.x > h.x && e.x < h.x + h.w && !e.grounded && e.z < 0;
            if (!hit) continue;
            e.hazardIF = 90;
            e.hp -= h.damage || 18;
            if (e.hp <= 0) {
              e.hp = 0;
            } else {
              cp = state.currentCheckpoint || (state.segment && state.segment.checkpoints && state.segment.checkpoints[0]);
              e.pitRespawnX = cp ? cp.x : h.x - e.w * 0.5 - 2;
              e.pitRespawnD = cp ? cp.d : e.d;
              e.pitRespawnT = toTicks(45);
              e.alive = false;
              e.combatState = "PIT_FALL";
              e.grounded = false;
              e.vx = e.vz = e.vd = 0;
            }
          }
        }
      }
    }
    if (hasTunnel) { state.tunnelWarnT = tunnelWarn; state.tunnelDarkT = tunnelDark; }
  }

  function step(state) {
    var w = state.wave;
    var i, def;
    tickHazards(state);
    if (!w || !w.defs.length) return;
    for (i = 0; i < w.defs.length; i++) {
      def = w.defs[i];
      if (!w.started[def.id] && canTrigger(state, w, def.trigger)) startWave(state, def);
    }
    flushPending(state);
    walkIn(state);
    checkCleared(state);
  }

  function restartCurrent(state) {
    var w = state.wave, id = null, i, def, e, n = 0;
    if (!w) return false;
    for (i = w.defs.length - 1; i >= 0; i--) {
      def = w.defs[i];
      if (w.started[def.id] && !w.cleared[def.id]) { id = def.id; break; }
    }
    if (!id) return false;
    for (i = 0; i < state.enemies.length; i++) {
      e = state.enemies[i];
      if (e.waveId === id) {
        e.alive = false;
        if (state.pools && state.pools.enemies) state.pools.enemies.release(e);
      } else state.enemies[n++] = e;
    }
    state.enemies.length = n;
    w.pending = w.pending.filter(function (p) { return p.waveId !== id; });
    delete w.started[id]; delete w.cleared[id]; delete w.clearedAt[id];
    if (w.pickupDropped) delete w.pickupDropped[id];
    w.goFired = false; w.allCleared = false;
    state.go.active = false; state.go.opened = false; state.go.openT = 0;
    state.props = [];
    for (i = 0; i < ((state.segment && state.segment.props) || []).length; i++) {
      def = state.segment.props[i];
      state.props.push({ type: def.type, x: def.x, d: def.d, z: def.z, w: def.w, hp: def.hp, alive: def.alive, throwable: def.throwable });
    }
    return true;
  }

  var api = { init: init, step: step, emit: emit, restartCurrent: restartCurrent };
  if (typeof window !== "undefined") window.PSimWaves = api;
  if (typeof global !== "undefined") global.PSimWaves = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
