/* Sprite-sheet atlas loader + deterministic frame picker.
   Sheets are horizontal strips, transparent bg, content faces RIGHT,
   anchored bottom-center per cell. All timing derives from the sim
   tick counter (120Hz) — never wall-clock. */
(function () {
  var atlas = null;
  var sheets = {};
  var loading = false;
  var pending = 0;
  var readyFlag = false;
  var doneCb = null;

  function magentaish(r, g, b, a) {
    return a > 0 && r > 200 && b > 200 && g < 90;
  }

  /* Chroma-key safety net: if the top-left pixel is magenta-ish
     (#FF00FF +-), key all magenta-ish pixels to transparent once. */
  function chromaKey(img) {
    if (typeof document === "undefined") return img;
    var w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) return img;
    var cv, cx, id, px, i;
    try {
      cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      cx = cv.getContext("2d");
      cx.imageSmoothingEnabled = false;
      cx.drawImage(img, 0, 0);
      id = cx.getImageData(0, 0, 1, 1).data;
      if (!magentaish(id[0], id[1], id[2], id[3])) return img;
      px = cx.getImageData(0, 0, w, h);
      for (i = 0; i < px.data.length; i += 4) {
        if (magentaish(px.data[i], px.data[i + 1], px.data[i + 2], px.data[i + 3])) {
          px.data[i + 3] = 0;
        }
      }
      cx.putImageData(px, 0, 0);
      return cv;
    } catch (err) {
      return img;
    }
  }

  function oneDone() {
    pending--;
    if (pending <= 0) {
      readyFlag = true;
      if (doneCb) doneCb();
      doneCb = null;
    }
  }

  function loadSheet(id, meta) {
    var img = new Image();
    pending++;
    img.onload = function () {
      sheets[id] = chromaKey(img);
      oneDone();
    };
    img.onerror = oneDone;
    img.src = meta.path;
  }

  function loadImages() {
    var id, n = 0;
    for (id in atlas) {
      if (!Object.prototype.hasOwnProperty.call(atlas, id)) continue;
      if (!atlas[id] || !atlas[id].path) continue;
      loadSheet(id, atlas[id]);
      n++;
    }
    if (!n) {
      readyFlag = true;
      if (doneCb) doneCb();
      doneCb = null;
    }
  }

  function load(done) {
    if (done) doneCb = done;
    if (readyFlag) {
      if (doneCb) doneCb();
      doneCb = null;
      return;
    }
    if (loading) return;
    loading = true;
    if (typeof window === "undefined" || typeof Image === "undefined" || typeof fetch === "undefined") {
      readyFlag = true;
      if (doneCb) doneCb();
      doneCb = null;
      return;
    }
    fetch("assets/atlas/atlas.json").then(function (r) {
      if (!r.ok) throw new Error("atlas " + r.status);
      return r.json();
    }).then(function (json) {
      atlas = json || {};
      loadImages();
    }).catch(function () {
      atlas = null;
      readyFlag = true;
      if (doneCb) doneCb();
      doneCb = null;
    });
  }

  function ready() {
    return readyFlag;
  }

  function has(id) {
    var m = atlas && atlas[id];
    var img = sheets[id];
    return !!(m && img && (img.width || img.naturalWidth));
  }

  function pack(id, step) {
    var m = atlas[id];
    return { img: sheets[id], sx: step * m.fw, sy: 0, sw: m.fw, sh: m.fh };
  }

  function simHz() {
    var c = (typeof window !== "undefined" && window.PConst) ||
      (typeof global !== "undefined" && global.PConst) || null;
    return c && c.SIM_HZ ? c.SIM_HZ : 120;
  }

  /* Looping frame from the deterministic simulation tick (120Hz). */
  function frame(id, tick) {
    if (!has(id)) return null;
    var m = atlas[id];
    var fps = m.fps || 8;
    var n = m.frames || 1;
    var step = Math.floor(((tick | 0) * fps) / simHz()) % n;
    if (step < 0) step = 0;
    return pack(id, step);
  }

  /* Non-looping frame: steps at the sheet fps, clamps on the last frame.
     ticksSinceStart is a sim-tick count since the action began. */
  function frameOnce(id, ticksSinceStart) {
    if (!has(id)) return null;
    var m = atlas[id];
    var fps = m.fps || 8;
    var n = m.frames || 1;
    var step = Math.floor(((ticksSinceStart | 0) * fps) / simHz());
    if (step < 0) step = 0;
    if (step >= n) step = n - 1;
    return pack(id, step);
  }

  /* Explicit frame index, clamped. */
  function frameAt(id, index) {
    if (!has(id)) return null;
    var m = atlas[id];
    var n = m.frames || 1;
    var step = index | 0;
    if (step < 0) step = 0;
    if (step >= n) step = n - 1;
    return pack(id, step);
  }

  function meta(id) {
    return (atlas && atlas[id]) || null;
  }

  var api = {
    load: load,
    ready: ready,
    has: has,
    frame: frame,
    frameOnce: frameOnce,
    frameAt: frameAt,
    meta: meta
  };
  if (typeof window !== "undefined") window.PAnim = api;
  if (typeof global !== "undefined") global.PAnim = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
