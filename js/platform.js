/* Browser/Yandex host lifecycle. Optional SDK; local and other hosts stay standalone. */
(function () {
  var sdk = null;
  var initialized = false;
  var gameReady = false;
  var playing = false;
  var externalPaused = false;

  function audioPause() {
    if (window.PAudio && PAudio.suspend) PAudio.suspend();
  }
  function audioResume() {
    if (window.PAudio && PAudio.resume) PAudio.resume();
  }
  function gameplay(active) {
    active = !!active;
    if (playing === active) return;
    playing = active;
    var api = sdk && sdk.features && sdk.features.GameplayAPI;
    if (!api) return;
    try {
      if (active && api.start) api.start();
      else if (!active && api.stop) api.stop();
    } catch (e) {}
  }
  function pauseExternal() {
    if (externalPaused) return;
    externalPaused = true;
    audioPause();
    gameplay(false);
    if (window.PScreens && PScreens.get && PScreens.get() === "PLAY") PScreens.set("PAUSE");
  }
  function resumeExternal() {
    if (!externalPaused) return;
    externalPaused = false;
    audioResume();
    if (window.PScreens && PScreens.get && PScreens.get() === "PAUSE") PScreens.set("PLAY");
    gameplay(window.PScreens && PScreens.get && PScreens.get() === "PLAY");
  }
  function attach(next) {
    sdk = next || null;
    if (!sdk) return false;
    try {
      if (sdk.on) {
        sdk.on("game_api_pause", pauseExternal);
        sdk.on("game_api_resume", resumeExternal);
      }
    } catch (e) {}
    if (gameReady) ready();
    return true;
  }
  function initYandex() {
    if (!window.YaGames || !window.YaGames.init) return Promise.resolve(false);
    return window.YaGames.init().then(function (next) { attach(next); return true; }, function () { return false; });
  }
  function yandexHost() {
    var host = window.location && window.location.hostname || "";
    return /(^|\.)yandex\.(net|com|ru)$/.test(host) || /games\.s3\.yandex\.net$/.test(host);
  }
  function loadYandex() {
    if (window.YaGames) return initYandex();
    if (!yandexHost() || !document.createElement) return Promise.resolve(false);
    return new Promise(function (resolve) {
      var script = document.createElement("script");
      script.src = "/sdk.js"; script.async = true;
      script.onload = function () { initYandex().then(resolve); };
      script.onerror = function () { resolve(false); };
      (document.head || document.body).appendChild(script);
    });
  }
  function init() {
    if (initialized) return;
    initialized = true;
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) pauseExternal(); else resumeExternal();
    });
    window.addEventListener("pagehide", pauseExternal);
    window.addEventListener("pageshow", resumeExternal);
    loadYandex();
  }
  function ready() {
    gameReady = true;
    var api = sdk && sdk.features && sdk.features.LoadingAPI;
    try { if (api && api.ready) api.ready(); } catch (e) {}
  }
  function screen(name) {
    gameplay(name === "PLAY" && !externalPaused);
  }

  var api = {
    init: init, ready: ready, screen: screen, gameplay: gameplay,
    pause: pauseExternal, resume: resumeExternal, attach: attach,
    isYandex: function () { return !!sdk; }, isPaused: function () { return externalPaused; }
  };
  if (typeof window !== "undefined") window.PPlatform = api;
  if (typeof global !== "undefined") global.PPlatform = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
}());
