/* Versioned, defensive localStorage persistence. */
(function () {
  var VERSION = 1;
  var KEY = "patriot.save.v1";
  var TEMP_SUFFIX = ".tmp";
  var MAX_CHARS = 262144;
  var RANKS = ["S", "A", "B", "C", "D"];

  function own(o, k) {
    return Object.prototype.hasOwnProperty.call(o, k);
  }

  function object(v) {
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  }

  function number(v, fallback, lo, hi) {
    v = typeof v === "number" && isFinite(v) ? v : fallback;
    return Math.max(lo, Math.min(hi, v));
  }

  function strings(v) {
    var seen = Object.create(null), out = [], i, s;
    if (!Array.isArray(v)) return out;
    for (i = 0; i < v.length && out.length < 128; i++) {
      s = typeof v[i] === "string" ? v[i].slice(0, 64) : "";
      if (!s || own(seen, s)) continue;
      seen[s] = true;
      out.push(s);
    }
    return out.sort();
  }

  function binding(v) {
    var src = object(v), out = {}, keys = Object.keys(src).sort(), i, k, x;
    if (v == null) return null;
    if (typeof v === "string" || typeof v === "number") return v;
    for (i = 0; i < keys.length && i < 32; i++) {
      k = keys[i].slice(0, 32);
      x = src[keys[i]];
      if (x == null || typeof x === "string" || typeof x === "number" || typeof x === "boolean") out[k] = x;
    }
    return out;
  }

  function settings(v) {
    v = object(v);
    var modern = (typeof window !== "undefined" && window.PSettings) ||
      (typeof global !== "undefined" && global.PSettings);
    if (modern && modern.validate && modern.validate(v).length === 0) {
      return JSON.parse(JSON.stringify(v));
    }
    var b = object(v.bindings);
    return {
      masterVol: number(v.masterVol, 0.8, 0, 1),
      musicVol: number(v.musicVol, 0.65, 0, 1),
      sfxVol: number(v.sfxVol, 0.8, 0, 1),
      voVol: number(v.voVol, 0.9, 0, 1),
      crt: v.crt === true,
      scaleMode: v.scaleMode === "fit" ? "fit" : "integer",
      screenShake: number(v.screenShake, 1, 0, 1),
      lang: v.lang === "en" ? "en" : "ru",
      showGlyphs: v.showGlyphs === false ? false : v.showGlyphs === true ? true : "auto",
      bindings: { p1: binding(b.p1), p2: binding(b.p2) }
    };
  }

  function recordValue(v) {
    v = object(v);
    return {
      best: Math.floor(number(v.best, 0, 0, 999999999)),
      bestTimeFrames: Math.floor(number(v.bestTimeFrames, 0, 0, 999999999)),
      rank: RANKS.indexOf(v.rank) >= 0 ? v.rank : "D",
      noHit: v.noHit === true
    };
  }

  function records(v) {
    v = object(v);
    var out = {}, keys = Object.keys(v).sort(), i, k;
    for (i = 0; i < keys.length && i < 128; i++) {
      k = keys[i].slice(0, 64);
      if (k && k !== "__proto__" && k !== "constructor" && k !== "prototype") out[k] = recordValue(v[keys[i]]);
    }
    return out;
  }

  function defaults() {
    return normalize({ v: VERSION });
  }

  function normalize(v) {
    v = object(v);
    var c = object(v.campaign);
    var onboarding = object(v.onboarding);
    var current = typeof c.currentLevel === "string" && c.currentLevel ? c.currentLevel.slice(0, 64) : "w1l1";
    var complete = strings(c.completedLevels);
    var unlocked = strings(Array.isArray(c.unlockedLevels) ? c.unlockedLevels : []);
    unlocked = strings(unlocked.concat(complete, [current, "w1l1"]));
    return {
      v: VERSION,
      campaign: { currentLevel: current, unlockedLevels: unlocked, completedLevels: complete },
      records: records(v.records),
      onboarding: { seenHints: strings(onboarding.seenHints) },
      settings: settings(v.settings)
    };
  }

  function migrate(v) {
    v = object(v);
    if (v.v === VERSION) return normalize(v);
    if (v.v == null || v.v === 0) {
      var p = object(v.progress);
      return normalize({
        campaign: {
          currentLevel: p.level || v.currentLevel,
          unlockedLevels: p.unlockedLevels || v.unlockedLevels,
          completedLevels: p.levelsCleared || v.completedLevels
        },
        records: v.scores || v.records,
        onboarding: v.onboarding,
        settings: v.settings
      });
    }
    return defaults();
  }

  function rankBetter(a, b) {
    var ai = RANKS.indexOf(a), bi = RANKS.indexOf(b);
    return ai >= 0 && (bi < 0 || ai < bi);
  }

  function record(save, levelId, score, rank, timeFrames, noHit) {
    var out = normalize(save), id = typeof levelId === "string" ? levelId.slice(0, 64) : "";
    if (!id) return out;
    var prev = out.records[id] || recordValue({});
    var next = recordValue(prev);
    score = Math.floor(number(score, 0, 0, 999999999));
    if (score > next.best) next.best = score;
    if (rankBetter(rank, next.rank)) next.rank = rank;
    timeFrames = Math.floor(number(timeFrames, 0, 0, 999999999));
    if (timeFrames > 0 && (!next.bestTimeFrames || timeFrames < next.bestTimeFrames)) next.bestTimeFrames = timeFrames;
    if (noHit === true) next.noHit = true;
    out.records[id] = next;
    return normalize(out);
  }

  function completeLevel(save, levelId, nextId) {
    var out = normalize(save);
    var done = out.campaign.completedLevels.concat(typeof levelId === "string" ? [levelId] : []);
    var unlocked = out.campaign.unlockedLevels.concat(done, typeof nextId === "string" ? [nextId] : []);
    out.campaign.completedLevels = strings(done);
    out.campaign.unlockedLevels = strings(unlocked);
    if (typeof nextId === "string" && nextId) out.campaign.currentLevel = nextId.slice(0, 64);
    return normalize(out);
  }

  function markHint(save, hintId) {
    var out = normalize(save);
    if (typeof hintId !== "string" || !hintId) return out;
    out.onboarding.seenHints = strings(out.onboarding.seenHints.concat(hintId.slice(0, 64)));
    return normalize(out);
  }

  function decode(text) {
    if (typeof text !== "string" || text.length > MAX_CHARS) return { ok: false, reason: "invalid" };
    try {
      var raw = JSON.parse(text);
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, reason: "invalid" };
      if (raw.v != null && raw.v !== 0 && raw.v !== VERSION) return { ok: false, reason: "version" };
      return { ok: true, value: migrate(raw) };
    } catch (e) { return { ok: false, reason: "invalid" }; }
  }

  function browserStorage() {
    try { return typeof window !== "undefined" ? window.localStorage : null; } catch (e) { return null; }
  }

  function createAdapter(storage, key) {
    storage = storage || browserStorage();
    key = key || KEY;
    var temp = key + TEMP_SUFFIX;
    function get(k) { try { return storage && storage.getItem(k); } catch (e) { return null; } }
    function remove(k) { try { if (storage) storage.removeItem(k); } catch (e) {} }
    return {
      load: function () {
        var primary = decode(get(key));
        if (primary.reason === "version") { remove(temp); return defaults(); }
        var pending = decode(get(temp));
        if (pending.ok) return pending.value;
        if (primary.ok) { remove(temp); return primary.value; }
        return defaults();
      },
      save: function (value) {
        var text = JSON.stringify(normalize(value));
        if (!storage || text.length > MAX_CHARS) return false;
        try {
          storage.setItem(temp, text);
          if (storage.getItem(temp) !== text) return false;
          storage.setItem(key, text);
          if (storage.getItem(key) !== text) return false;
          storage.removeItem(temp);
          return true;
        } catch (e) { return false; }
      },
      clear: function () { remove(temp); remove(key); }
    };
  }

  var adapters = {};
  var activeSlot = 1;
  function slotNumber(slot) { slot = Number(slot == null ? activeSlot : slot) | 0; return slot >= 1 && slot <= 3 ? slot : 1; }
  function slotKey(slot) { slot = slotNumber(slot); return slot === 1 ? KEY : KEY + ".slot" + slot; }
  function defaultAdapter(slot) {
    slot = slotNumber(slot);
    if (!adapters[slot]) adapters[slot] = createAdapter(null, slotKey(slot));
    return adapters[slot];
  }
  var api = {
    VERSION: VERSION, KEY: KEY, MAX_CHARS: MAX_CHARS,
    defaults: defaults, normalize: normalize, migrate: migrate,
    record: record, completeLevel: completeLevel, markHint: markHint, createAdapter: createAdapter,
    load: function (slot) { return defaultAdapter(slot).load(); },
    save: function (v, slot) { return defaultAdapter(slot).save(v); },
    clear: function (slot) { return defaultAdapter(slot).clear(); },
    selectSlot: function (slot) { activeSlot = slotNumber(slot); return activeSlot; },
    activeSlot: function () { return activeSlot; },
    slotKey: slotKey,
    slots: function () { return [api.load(1), api.load(2), api.load(3)]; }
  };
  if (typeof window !== "undefined") window.PSave = api;
  if (typeof global !== "undefined") global.PSave = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
