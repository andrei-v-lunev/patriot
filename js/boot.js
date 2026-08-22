/* Offscreen 480×270 world + 960×540 UI buffer, DPR-aware letterbox, preload. */
(function () {
  var W = 480;
  var H = 270;
  var UW = 960;
  var UH = 540;
  var vis = null;
  var vctx = null;
  var off = null;
  var octx = null;
  var ui = null;
  var uctx = null;
  var scale = 2;
  var uiScale = 1;
  var prog = 0;
  var ready = false;
  var fitRaf = 0;

  function nosmooth(c) {
    if (!c) return;
    c.imageSmoothingEnabled = false;
    if (c.webkitImageSmoothingEnabled !== undefined) c.webkitImageSmoothingEnabled = false;
    if (c.mozImageSmoothingEnabled !== undefined) c.mozImageSmoothingEnabled = false;
    if (c.msImageSmoothingEnabled !== undefined) c.msImageSmoothingEnabled = false;
  }

  function fit() {
    if (!vis) return;
    var vv = window.visualViewport;
    var vw = (vv && vv.width) || window.innerWidth || W;
    var vh = (vv && vv.height) || window.innerHeight || H;
    var dpr = window.devicePixelRatio || 1;
    var fitScale = Math.min(vw / UW, vh / UH);
    var prefs = window.PSettings && window.PSettings.get ? window.PSettings.get() : null;
    var fitMode = prefs && prefs.video && prefs.video.scaleMode === "fit";
    var k = Math.floor(fitScale * dpr);
    var cssScale = fitMode || k <= 0 ? fitScale : k / dpr;
    var backingScale = Math.max(1, fitMode ? Math.ceil(fitScale * dpr) : k);
    uiScale = backingScale;
    scale = backingScale * 2;
    vis.width = UW * backingScale;
    vis.height = UH * backingScale;
    var cssW = UW * cssScale;
    var cssH = UH * cssScale;
    vis.style.width = cssW + "px";
    vis.style.height = cssH + "px";
    vis.style.position = "absolute";
    var left = Math.round(((vw - cssW) / 2) * dpr) / dpr;
    var top = Math.round(((vh - cssH) / 2) * dpr) / dpr;
    if (vv) {
      left += (vv.offsetLeft || 0);
      top += (vv.offsetTop || 0);
    }
    vis.style.left = left + "px";
    vis.style.top = top + "px";
    nosmooth(vctx);
    nosmooth(octx);
    nosmooth(uctx);
    if (api) sync();
  }

  function requestFit() {
    if (fitRaf) return;
    fitRaf = requestAnimationFrame(function () {
      fitRaf = 0;
      fit();
    });
  }

  function initCanvas() {
    vis = document.getElementById("game");
    if (!vis) {
      vis = document.createElement("canvas");
      vis.id = "game";
      document.body.appendChild(vis);
    }
    vctx = vis.getContext("2d");
    off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    octx = off.getContext("2d");
    ui = document.createElement("canvas");
    ui.width = UW;
    ui.height = UH;
    uctx = ui.getContext("2d");
    nosmooth(vctx);
    nosmooth(octx);
    nosmooth(uctx);
    fit();
    sync();
    window.addEventListener("resize", requestFit);
    window.addEventListener("orientationchange", requestFit);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", requestFit);
      window.visualViewport.addEventListener("scroll", requestFit);
    }
  }

  function paintBoot(label, p) {
    if (!octx) return;
    octx.fillStyle = "#0B0A10";
    octx.fillRect(0, 0, W, H);
    if (window.PLayers) PLayers.draw(octx, { x: 0 }, 1);
    else {
      octx.fillStyle = "#2A3B63";
      octx.fillRect(0, 0, W, 160);
      octx.fillStyle = "#C8A46A";
      octx.fillRect(0, 160, W, 110);
    }
    if (window.PFont) {
      var s = label || "ЗАГРУЗКА";
      var w = PFont.measure(s, 1);
      PFont.draw(octx, s, (W - w) >> 1, 120, 1, "#FFFFFF");
    }
    octx.fillStyle = "#241E33";
    octx.fillRect(160, 150, 160, 8);
    octx.fillStyle = "#F2C14E";
    octx.fillRect(160, 150, (160 * (p || 0)) | 0, 8);
    present();
  }

  function present() {
    if (!vctx) return;
    nosmooth(vctx);
    vctx.fillStyle = "#000";
    vctx.fillRect(0, 0, vis.width, vis.height);
    if (uctx) {
      nosmooth(uctx);
      uctx.drawImage(off, 0, 0, W, H, 0, 0, UW, UH);
      vctx.drawImage(ui, 0, 0, UW, UH, 0, 0, UW * uiScale, UH * uiScale);
    } else {
      vctx.drawImage(off, 0, 0, W, H, 0, 0, W * scale, H * scale);
    }
  }

  function run(done) {
    initCanvas();
    paintBoot("ЗАГРУЗКА", 0);
    if (window.PScreens) PScreens.set("PRELOAD");
    if (window.PData && PData.ready) {
      try { PData.ready(); } catch (e) {}
    }
    if (window.PAudio && PAudio.init) {
      PAudio.init(window.PDataRaw && PDataRaw.audio);
    }
    if (window.PSave && window.PSettings) {
      var saved = PSave.load();
      if (saved && PSettings.validate(saved.settings || {}).length === 0) {
        PSettings.use(saved.settings);
        if (window.PAudio && PAudio.setVolumes) PAudio.setVolumes(saved.settings.audio);
      }
    }
    if (window.PInput && PInput.init) PInput.init();
    if (window.PInputTouch && PInputTouch.init) PInputTouch.init(vis);
    var start = (Date.now && Date.now()) || 0;
    function finish() {
      var wait = 600 - (((Date.now && Date.now()) || 0) - start);
      function go() {
        ready = true;
        prog = 1;
        if (window.PScreens) PScreens.set("TITLE");
        if (done) done();
      }
      if (wait > 0) setTimeout(go, wait);
      else go();
    }
    if (window.PSprites && PSprites.load) {
      PSprites.load(function () {
        prog = 1;
        paintBoot("НАЖМИ СТАРТ", 1);
        finish();
      });
    } else {
      prog = 1;
      finish();
    }
  }

  function sync() {
    api.canvas = vis;
    api.ctx = vctx;
    api.buffer = off;
    api.bctx = octx;
    api.ui = ui;
    api.uictx = uctx;
    api.scale = scale;
    api.uiScale = uiScale;
  }

  var api = {
    run: run,
    fit: fit,
    init: initCanvas,
    progress: function () { return prog; },
    ready: function () { return ready; },
    canvas: null,
    ctx: null,
    buffer: null,
    bctx: null,
    ui: null,
    uictx: null,
    scale: 2,
    uiScale: 1
  };
  if (typeof window !== "undefined") window.PBoot = api;
  if (typeof global !== "undefined") global.PBoot = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
