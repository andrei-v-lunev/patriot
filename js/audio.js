/* Manifest-driven WebAudio with lazy buffers and oscillator fallbacks. */
(function () {
  var ctx = null;
  var unlocked = false;
  var manifest = { assets: {}, music: {}, worlds: {}, events: {} };
  var cache = {};
  var buses = {};
  var volumes = { master: 0.8, music: 0.65, sfx: 0.8, vo: 0.9 };
  var currentMusic = null;
  var currentMusicId = "";
  var musicRequest = 0;
  var variantCursor = {};
  var currentAmbience = [];
  var currentAmbienceId = "";

  function AC() { return window.AudioContext || window.webkitAudioContext; }
  function clamp(v) { v = Number(v); return isFinite(v) ? Math.max(0, Math.min(1, v)) : 1; }

  function ensure() {
    var C, master, k;
    if (ctx) return ctx;
    C = AC();
    if (!C) return null;
    try {
      ctx = new C();
      master = ctx.createGain();
      master.connect(ctx.destination);
      buses.master = master;
      ["music", "sfx", "vo"].forEach(function (name) {
        buses[name] = ctx.createGain();
        buses[name].connect(master);
      });
      for (k in volumes) applyVolume(k);
    } catch (e) { ctx = null; buses = {}; }
    return ctx;
  }

  function applyVolume(name) {
    if (!buses[name] || !buses[name].gain) return;
    buses[name].gain.value = volumes[name];
  }

  function setVolumes(next) {
    var k;
    next = next || {};
    for (k in volumes) if (next[k] != null) { volumes[k] = clamp(next[k]); applyVolume(k); }
    return getVolumes();
  }

  function getVolumes() {
    return { master: volumes.master, music: volumes.music, sfx: volumes.sfx, vo: volumes.vo };
  }

  function unlock() {
    var c, buf, src;
    if (unlocked) return Promise.resolve(true);
    c = ensure();
    if (!c) { unlocked = true; return Promise.resolve(false); }
    try {
      if (c.resume) c.resume();
      buf = c.createBuffer(1, 1, 22050);
      src = c.createBufferSource();
      src.buffer = buf;
      src.connect(buses.master || c.destination);
      src.start(0);
      unlocked = true;
      return Promise.resolve(true);
    } catch (e) { unlocked = true; return Promise.resolve(false); }
  }

  function decode(arrayBuffer) {
    var c = ensure();
    if (!c) return Promise.reject(new Error("WebAudio unavailable"));
    return new Promise(function (resolve, reject) {
      var settled = false;
      function ok(v) { if (!settled) { settled = true; resolve(v); } }
      function bad(e) { if (!settled) { settled = true; reject(e || new Error("decode failed")); } }
      try {
        var out = c.decodeAudioData(arrayBuffer, ok, bad);
        if (out && out.then) out.then(ok, bad);
      } catch (e) { bad(e); }
    });
  }

  function loadAsset(id) {
    var def = manifest.assets[id];
    if (!def || !Array.isArray(def.files) || !def.files.length) return Promise.reject(new Error("unknown audio " + id));
    return loadFiles(id, def.files);
  }

  function nextAssetFiles(id, def) {
    var variants = def && def.variants;
    var index;
    if (!Array.isArray(variants) || !variants.length) return { key: id, files: def.files };
    index = variantCursor[id] || 0;
    variantCursor[id] = (index + 1) % variants.length;
    return { key: id + ":variant:" + index, files: variants[index] };
  }

  function loadFiles(key, files) {
    if (cache[key]) return cache[key];
    cache[key] = (function tryFile(i) {
      if (i >= files.length) throw new Error("audio unavailable " + key);
      return fetch(files[i]).then(function (res) {
        if (!res || !res.ok) throw new Error("HTTP " + (res && res.status));
        return res.arrayBuffer();
      }).then(decode).catch(function () { return tryFile(i + 1); });
    })(0).catch(function (e) { cache[key] = Promise.reject(e); cache[key].catch(function () {}); throw e; });
    return cache[key];
  }

  function beep(freq, vol, dur) {
    var c, o, g, t;
    if (!unlocked) return false;
    c = ensure();
    if (!c) return false;
    try {
      o = c.createOscillator(); g = c.createGain(); t = c.currentTime;
      o.type = "square"; o.frequency.value = freq || 440;
      g.gain.value = vol == null ? 0.5 : vol;
      o.connect(g); g.connect(buses.sfx || c.destination); o.start();
      g.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.09));
      o.stop(t + (dur || 0.1));
      return true;
    } catch (e) { return false; }
  }

  function startBuffer(id, opts) {
    var def = manifest.assets[id] || {};
    var selected = nextAssetFiles(id, def);
    opts = opts || {};
    return loadFiles(selected.key, selected.files || []).then(function (buffer) {
      var c = ensure();
      var src = c.createBufferSource();
      var gain = c.createGain();
      src.buffer = buffer;
      gain.gain.value = opts.volume == null ? 1 : opts.volume;
      src.connect(gain);
      gain.connect(buses[def.bus || opts.bus || "sfx"] || buses.sfx || c.destination);
      if (opts.loop || def.loop) {
        src.loop = true;
        if (def.loopStart != null) src.loopStart = def.loopStart;
        if (def.loopEnd > 0) src.loopEnd = Math.min(def.loopEnd, buffer.duration || def.loopEnd);
      }
      src.start(0);
      return src;
    });
  }

  function playEvent(name) {
    var def = manifest.events[name];
    var ids;
    if (!unlocked) return Promise.resolve(false);
    if (!def) return Promise.resolve(false);
    ids = (def.layers || []).slice();
    if (def.asset) ids.unshift(def.asset);
    if (!ids.length) { beep(def.freq || 330, def.vol == null ? 0.35 : def.vol); return Promise.resolve(false); }
    return Promise.all(ids.map(function (id) { return startBuffer(id, { volume: def.vol }); })).then(function () { return true; }).catch(function () {
      beep(def.freq || 330, def.vol == null ? 0.35 : def.vol);
      return false;
    });
  }

  function consume(events) {
    var i, e, name, seen = {};
    function one(nm) {
      if (!nm) return;
      if (nm === "С ПОЕЗДА!") nm = "off_train";
      nm = String(nm).toLowerCase();
      seen[nm] = (seen[nm] || 0) + 1;
      if (seen[nm] <= 3) playEvent(nm);
    }
    if (!events) return;
    if (events.all) {
      for (i = 0; i < events.all.length; i++) {
        e = events.all[i]; if (e && e.alive) one(e.audio || e.name);
        if (e) { e.alive = false; e.name = ""; }
      }
    } else if (events.length != null) {
      for (i = 0; i < events.length && i < 32; i++) {
        e = events[i]; name = typeof e === "string" ? e : (e && (e.audio || e.name || e.type)); one(name);
      }
      events.length = 0;
    }
  }

  function stopStem() {
    musicRequest++;
    if (currentMusic) {
      var list = Array.isArray(currentMusic) ? currentMusic : [currentMusic];
      for (var i = 0; i < list.length; i++) try { (list[i].src || list[i]).stop(); } catch (e) {}
    }
    currentMusic = null; currentMusicId = "";
  }

  function startStemPair(id, def) {
    var c = ensure();
    var when = c.currentTime + 0.02;
    return Promise.all([
      loadFiles(id + ":base", def.stems.base),
      loadFiles(id + ":drums", def.stems.drums)
    ]).then(function (buffers) {
      return buffers.map(function (buffer, i) {
        var src = c.createBufferSource(); var gain = c.createGain();
        src.buffer = buffer; src.loop = def.loop !== false;
        if (def.loopStart != null) src.loopStart = def.loopStart;
        if (def.loopEnd > 0) src.loopEnd = Math.min(def.loopEnd, buffer.duration || def.loopEnd);
        gain.gain.value = i ? 0.65 : 1;
        src.connect(gain); gain.connect(buses.music || c.destination); src.start(when);
        return { src: src, gain: gain, role: i ? "drums" : "base" };
      });
    });
  }

  function setMusicIntensity(value) {
    var list = Array.isArray(currentMusic) ? currentMusic : [];
    var v = 0.35 + clamp(value) * 0.65;
    for (var i = 0; i < list.length; i++) if (list[i].role === "drums") list[i].gain.gain.value = v;
  }

  function playStem(name) {
    var id = manifest.worlds[name] || name;
    var def = manifest.music[id];
    var request;
    if (!def) return Promise.resolve(false);
    if (currentMusicId === id && currentMusic) return Promise.resolve(true);
    stopStem(); currentMusicId = id; request = musicRequest;
    if (!unlocked) return Promise.resolve(false);
    var asset = manifest.assets[def.asset] || {};
    var started = asset.stems ? startStemPair(def.asset, asset).catch(function () {
      return startBuffer(def.asset, { loop: def.loop !== false, bus: "music" });
    }) : startBuffer(def.asset, { loop: def.loop !== false, bus: "music" });
    return started.then(function (src) {
      if (request !== musicRequest || currentMusicId !== id) {
        var list = Array.isArray(src) ? src : [src];
        for (var i = 0; i < list.length; i++) try { (list[i].src || list[i]).stop(); } catch (e) {}
        return false;
      }
      currentMusic = src; return true;
    }).catch(function () { if (request === musicRequest) beep(def.freq || 110, 0.08, 0.18); return false; });
  }

  function preloadWorld(name) {
    var id = manifest.worlds[name] || name;
    var def = manifest.music[id];
    if (!def) return Promise.resolve(false);
    var asset = manifest.assets[def.asset] || {};
    var p = asset.stems ? Promise.all([loadFiles(def.asset + ":base", asset.stems.base),
      loadFiles(def.asset + ":drums", asset.stems.drums)]) : loadAsset(def.asset);
    return p.then(function () { return true; }).catch(function () { return false; });
  }

  function stopAmbience() {
    for (var i = 0; i < currentAmbience.length; i++) try { currentAmbience[i].stop(); } catch (e) {}
    currentAmbience = []; currentAmbienceId = "";
  }

  function playAmbience(levelId) {
    var key = String(levelId || "").slice(0, 2);
    var ids = manifest.ambience && (manifest.ambience[levelId] || manifest.ambience[key]) || [];
    if (!Array.isArray(ids)) ids = [ids];
    if (!ids.length || !unlocked) { stopAmbience(); return Promise.resolve(false); }
    if (currentAmbienceId === key && currentAmbience.length) return Promise.resolve(true);
    stopAmbience(); currentAmbienceId = key;
    return Promise.all(ids.map(function (id) { return startBuffer(id, { loop: true, volume: 0.55 }); })).then(function (sources) {
      currentAmbience = sources; return true;
    }).catch(function () { stopAmbience(); return false; });
  }

  function init(audio) {
    audio = audio || (window.PDataRaw && PDataRaw.audio) || {};
    manifest = audio.schema === 2 ? audio : { assets: {}, music: {}, worlds: {}, events: audio.events || {} };
    window.addEventListener("pointerdown", unlock, false);
    window.addEventListener("keydown", unlock, false);
    window.addEventListener("gamepadconnected", unlock, false);
  }

  function duck(on) {
    if (buses.music && buses.music.gain) buses.music.gain.value = volumes.music * (on ? 0.3 : 1);
  }

  var api = { init: init, unlock: unlock, consume: consume, playEvent: playEvent,
    playStem: playStem, stopStem: stopStem, preloadWorld: preloadWorld, duck: duck,
    playAmbience: playAmbience, stopAmbience: stopAmbience,
    setMusicIntensity: setMusicIntensity,
    load: loadAsset, setVolumes: setVolumes, getVolumes: getVolumes,
    _reset: function () { stopStem(); stopAmbience(); cache = {}; variantCursor = {}; manifest = { assets: {}, music: {}, worlds: {}, events: {} }; } };
  if (typeof window !== "undefined") window.PAudio = api;
  if (typeof global !== "undefined") global.PAudio = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
