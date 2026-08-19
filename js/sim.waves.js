/* Wave triggers, delayed spawns, off_train hazard. */
(function () {
  var PData = (typeof window !== "undefined" && window.PData) || (typeof global !== "undefined" && global.PData) || (typeof require !== "undefined" ? require("./data") : null);

  function toTicks(f) {
    return PData && PData.toTicks ? PData.toTicks(f) : (f | 0) * 2;
  }
  function ps() {
    return (typeof window !== "undefined" && window.PSim) || (typeof global !== "undefined" && global.PSim) || null;
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
          spec: sp,
          atTick: state.tick + toTicks(sp.delayFrames || 0)
        });
      }
    }
  }

  function flushPending(state) {
    var w = state.wave;
    var keep = [];
    var i, item, spec, e, arena, S;
    arena = state.segment && state.segment.arena;
    S = ps();
    for (i = 0; i < w.pending.length; i++) {
      item = w.pending[i];
      if (state.tick < item.atTick) {
        keep.push(item);
        continue;
      }
      spec = {
        archetype: item.spec.archetype,
        x: item.spec.x,
        d: item.spec.d,
        facing: item.spec.facing,
        waveId: item.waveId
      };
      if (arena && spec.x >= arena.xMin && spec.x <= arena.xMax) spec.z = 120;
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
    var i, h, j, e, lists, li, arr, hit;
    for (i = 0; i < hz.length; i++) {
      h = hz[i];
      if (h.type !== "off_train" && h.type !== "pit") continue;
      lists = h.type === "off_train" ? [state.heroes, state.enemies] : [state.heroes];
      for (li = 0; li < lists.length; li++) {
        arr = lists[li];
        for (j = 0; j < arr.length; j++) {
          e = arr[j];
          if (!e.alive) continue;
          hit = e.x + e.w * 0.5 > h.x && e.x - e.w * 0.5 < h.x + h.w && e.z <= 16;
          if (!hit) continue;
          if (h.type === "off_train") {
            e.hp = 0;
            e.alive = false;
            emit(state, h.announce || "С ПОЕЗДА!", e.id, 0);
          } else {
            e.hp -= h.damage || 18;
            if (e.hp <= 0) {
              e.hp = 0;
              e.alive = false;
            } else if (state.segment && state.segment.checkpoints && state.segment.checkpoints[0]) {
              e.x = state.segment.checkpoints[0].x;
              e.d = state.segment.checkpoints[0].d;
              e.z = 16;
              e.vx = e.vz = e.vd = 0;
            }
          }
        }
      }
    }
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

  var api = { init: init, step: step, emit: emit };
  if (typeof window !== "undefined") window.PSimWaves = api;
  if (typeof global !== "undefined") global.PSimWaves = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
