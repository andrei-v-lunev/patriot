/* WebAudio oscillator SFX from data/audio.json. Dummy looping stems. */
(function () {
  var ctx = null;
  var unlocked = false;
  var map = {};
  var master = 0.8;
  var musicVol = 0.5;
  var stems = [];
  var stemName = "";

  function AC() {
    return window.AudioContext || window.webkitAudioContext;
  }

  function ensure() {
    if (ctx) return ctx;
    var C = AC();
    if (!C) return null;
    try {
      ctx = new C();
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function unlock() {
    if (unlocked) return;
    try {
      var c = ensure();
      if (!c) {
        unlocked = true;
        return;
      }
      if (c.resume) c.resume();
      var buf = c.createBuffer(1, 1, 22050);
      var src = c.createBufferSource();
      src.buffer = buf;
      src.connect(c.destination);
      src.start(0);
      unlocked = true;
    } catch (e) {
      unlocked = true;
    }
  }

  function beep(freq, vol, dur) {
    if (!unlocked) return;
    var c = ensure();
    if (!c) return;
    try {
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = "square";
      o.frequency.value = freq || 440;
      g.gain.value = (vol == null ? 0.5 : vol) * master;
      o.connect(g);
      g.connect(c.destination);
      o.start();
      var t = c.currentTime;
      g.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.09));
      o.stop(t + (dur || 0.1));
    } catch (e) {}
  }

  function playEvent(name) {
    var def = map[name];
    if (!def) {
      if (name === "hit_light") beep(420, 0.6);
      return;
    }
    beep(def.freq || 440, def.vol == null ? 0.6 : def.vol);
  }

  function consume(events) {
    if (!events) return;
    var i, e, name, seen, n;
    seen = {};
    function one(nm) {
      if (!nm) return;
      n = (seen[nm] || 0) + 1;
      seen[nm] = n;
      if (n > 3) return;
      var def = map[nm];
      var vol = def && def.vol != null ? def.vol : 0.6;
      if (n >= 3) vol *= 1.26;
      if (def) beep(def.freq || 440, vol);
      else beep(330, vol * 0.4);
    }
    if (events.all) {
      for (i = 0; i < events.all.length; i++) {
        e = events.all[i];
        if (e && e.alive && e.name) one(e.name);
        if (e) {
          e.alive = false;
          e.name = "";
        }
      }
      return;
    }
    if (events.length != null) {
      for (i = 0; i < events.length && i < 32; i++) {
        e = events[i];
        name = typeof e === "string" ? e : (e && (e.name || e.type));
        one(name);
      }
      events.length = 0;
    }
  }

  function stopStem() {
    var i;
    for (i = 0; i < stems.length; i++) {
      try { stems[i].stop(); } catch (e) {}
    }
    stems = [];
    stemName = "";
  }

  function oscLoop(freq, type, vol, detune) {
    var c = ensure();
    if (!c) return null;
    try {
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = type || "triangle";
      o.frequency.value = freq;
      if (detune) o.detune.value = detune;
      g.gain.value = vol * musicVol * master;
      o.connect(g);
      g.connect(c.destination);
      o.start();
      stems.push(o);
      return g;
    } catch (e) {
      return null;
    }
  }

  function playStem(name) {
    if (stemName === name && stems.length) return;
    stopStem();
    stemName = name || "w1";
    if (!unlocked) return;
    oscLoop(110, "triangle", 0.12, 0);
    oscLoop(220, "square", 0.04, 6);
  }

  function init(audio) {
    var ev, k;
    audio = audio || (window.PData && PData.ready && PData.ready() && PData.ready().audio) || (window.PDataRaw && PDataRaw.audio);
    if (audio && audio.events) {
      ev = audio.events;
      for (k in ev) {
        if (Object.prototype.hasOwnProperty.call(ev, k)) map[k] = ev[k];
      }
    }
    window.addEventListener("pointerdown", unlock, false);
    window.addEventListener("keydown", unlock, false);
    window.addEventListener("gamepadconnected", unlock, false);
  }

  function duck(on) {
    master = on ? 0.2 : 0.8;
  }

  var api = {
    init: init,
    unlock: unlock,
    consume: consume,
    playEvent: playEvent,
    playStem: playStem,
    stopStem: stopStem,
    preloadWorld: function () {},
    duck: duck,
    load: function () {}
  };
  if (typeof window !== "undefined") window.PAudio = api;
  if (typeof global !== "undefined") global.PAudio = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
