/* Browser/Yandex host lifecycle. Optional SDK; local and other hosts stay standalone. */
(function () {
  var sdk = null;
  var initialized = false;
  var gameReady = false;
  var playing = false;
  var externalPaused = false;
  var nativeFullscreenTried = false;
  var sdkFullscreenTried = false;

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
  function iosWebKit() {
    var ua = window.navigator && window.navigator.userAgent || "";
    return /iPhone|iPad|iPod/.test(ua) && /WebKit/.test(ua) && !(window.navigator && window.navigator.standalone);
  }
  function collapseChrome() {
    if (!iosWebKit()) return;
    if (document.documentElement && document.documentElement.classList) document.documentElement.classList.add("ios-web-game");
    try { window.scrollTo(0, 1); } catch (e) {}
    setTimeout(function () { try { window.scrollTo(0, 1); } catch (e) {} }, 80);
  }
  function requestLandscape() {
    var orientation = window.screen && window.screen.orientation;
    if (!orientation || !orientation.lock) return;
    try { Promise.resolve(orientation.lock("landscape")).catch(function () {}); } catch (e) {}
  }
  function requestFullscreen() {
    var full = sdk && sdk.screen && sdk.screen.fullscreen;
    var root = document.documentElement;
    var nativeRequest = root && (root.requestFullscreen || root.webkitRequestFullscreen);
    collapseChrome();
    requestLandscape();
    if (full && full.request && !sdkFullscreenTried) {
      sdkFullscreenTried = true;
      try { return Promise.resolve(full.request()).catch(function () { sdkFullscreenTried = false; return false; }); }
      catch (e) { sdkFullscreenTried = false; return Promise.resolve(false); }
    }
    if (nativeRequest && !nativeFullscreenTried) {
      nativeFullscreenTried = true;
      try { return Promise.resolve(nativeRequest.call(root)).catch(function () { nativeFullscreenTried = false; return false; }); }
      catch (e2) { nativeFullscreenTried = false; return Promise.resolve(false); }
    }
    return Promise.resolve(false);
  }
  function firstGesture(e) {
    if (e && e.type === "keydown" && e.code !== "Enter" && e.code !== "Space") return;
    requestFullscreen();
  }
  function initYandex() {
    if (!window.YaGames || !window.YaGames.init) return Promise.resolve(false);
    return window.YaGames.init().then(function (next) { attach(next); return true; }, function () { return false; });
  }
  function yandexHost() {
    var host = window.location && window.location.hostname || "";
    return /(^|\.)yandex\.(net|com|ru)$/.test(host) || /games\.s3\.yandex\.net$/.test(host);
  }
  function yandexContext() {
    var ref = document.referrer || "";
    return yandexHost() || /^https?:\/\/([^/]+\.)?yandex\.(net|com|ru)(\/|$)/.test(ref);
  }
  function loadYandex() {
    if (window.YaGames) return initYandex();
    if (!yandexContext() || !document.createElement) return Promise.resolve(false);
    return new Promise(function (resolve) {
      var script = document.createElement("script");
      script.src = yandexHost() ? "/sdk.js" : "https://sdk.games.s3.yandex.net/sdk.js"; script.async = true;
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
    document.addEventListener("pointerdown", firstGesture, { passive: true });
    document.addEventListener("keydown", firstGesture, { passive: true });
    document.addEventListener("fullscreenchange", function () {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) nativeFullscreenTried = false;
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
    init: init, ready: ready, screen: screen, gameplay: gameplay, fullscreen: requestFullscreen,
    pause: pauseExternal, resume: resumeExternal, attach: attach,
    isYandex: function () { return !!sdk; }, isPaused: function () { return externalPaused; }
  };
  if (typeof window !== "undefined") window.PPlatform = api;
  if (typeof global !== "undefined") global.PPlatform = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
}());
