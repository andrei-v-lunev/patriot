/* Pointer-events stick (left 45%) + GRIP/JUMP/THROW/TAG (right). */
(function () {
  var origin = null;
  var stickId = -1;
  var knob = { x: 0, y: 0 };
  var hold = { jump: false, grip: false, throw: false, tag: false };
  var btnIds = { jump: -1, grip: -1, throw: -1, tag: -1 };
  var hist = [];
  var visible = false;
  var canvas = null;

  var BTNS = [
    { id: "jump", x: 404, y: 148, w: 68, h: 36 },
    { id: "throw", x: 328, y: 190, w: 68, h: 36 },
    { id: "grip", x: 404, y: 190, w: 68, h: 36 },
    { id: "tag", x: 404, y: 232, w: 68, h: 36 }
  ];

  function logical(e) {
    var el = canvas || (window.PBoot && PBoot.canvas) || document.getElementById("game");
    if (!el) return { x: 0, y: 0 };
    var r = el.getBoundingClientRect();
    var w = r.width || 1;
    var h = r.height || 1;
    return {
      x: (e.clientX - r.left) * 480 / w,
      y: (e.clientY - r.top) * 270 / h
    };
  }

  function hitBtn(lx, ly) {
    var i, b;
    for (i = 0; i < BTNS.length; i++) {
      b = BTNS[i];
      if (lx >= b.x && lx <= b.x + b.w && ly >= b.y && ly <= b.y + b.h) return b.id;
    }
    return null;
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function onDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    visible = true;
    if (window.PInput && PInput.setLastDevice) PInput.setLastDevice("touch");
    var p = logical(e);
    var id = e.pointerId;
    var which = hitBtn(p.x, p.y);
    if (which) {
      hold[which] = true;
      btnIds[which] = id;
    } else if (p.x < 480 * 0.45 && stickId < 0) {
      stickId = id;
      origin = { x: p.x, y: p.y };
      knob.x = p.x;
      knob.y = p.y;
      hist = [{ x: p.x, y: p.y, t: e.timeStamp || 0 }];
    }
    if (e.preventDefault) e.preventDefault();
  }

  function onMove(e) {
    var p = logical(e);
    if (e.pointerId === stickId && origin) {
      var dx = p.x - origin.x;
      var dy = p.y - origin.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len > 40) {
        origin.x = p.x - (dx / len) * 40;
        origin.y = p.y - (dy / len) * 40;
        dx = p.x - origin.x;
        dy = p.y - origin.y;
      }
      knob.x = p.x;
      knob.y = p.y;
      hist.push({ x: p.x, y: p.y, t: e.timeStamp || 0 });
      var cut = (e.timeStamp || 0) - 100;
      while (hist.length && hist[0].t < cut) hist.shift();
    }
    if (e.preventDefault) e.preventDefault();
  }

  function onUp(e) {
    var id = e.pointerId;
    var k;
    if (id === stickId) {
      stickId = -1;
      origin = null;
      hist = [];
    }
    for (k in btnIds) {
      if (btnIds[k] === id) {
        hold[k] = false;
        btnIds[k] = -1;
      }
    }
  }

  function octant(x, d) {
    if (x === 0 && d === 0) return -1;
    var ang = Math.atan2(d, x) * 180 / Math.PI;
    if (ang < 0) ang += 360;
    return [2, 1, 0, 7, 6, 5, 4, 3][Math.round(ang / 45) % 8];
  }

  function stickAxes() {
    if (!origin) return { x: 0, d: 0 };
    var dx = knob.x - origin.x;
    var dy = knob.y - origin.y;
    return {
      x: clamp(dx / 40, -1, 1),
      d: clamp(-dy / 40, -1, 1)
    };
  }

  function poll(intent, tick) {
    if (!intent) return;
    var ax = stickAxes();
    if (origin) {
      intent.moveX = Math.round(ax.x * 8) / 8;
      intent.moveD = Math.round(ax.d * 8) / 8;
    }
    var names = ["jump", "grip", "throw", "tag"];
    var i, n, held, was;
    for (i = 0; i < names.length; i++) {
      n = names[i];
      held = hold[n];
      if (!held) continue;
      was = intent[n];
      intent[n] = true;
      intent[n + "Pressed"] = !was;
      if (intent[n + "Pressed"] && intent.pressedAtTick) {
        intent.pressedAtTick[n] = tick || (window.PInput && PInput.tick ? PInput.tick() : 0);
      }
    }
    intent.throwDir = octant(intent.moveX, intent.moveD);
    if (hold.jump || hold.grip || hold.throw || hold.tag || origin) {
      if (window.PInput && PInput.setLastDevice) PInput.setLastDevice("touch");
    }
  }

  function draw(ctx) {
    if (!visible || !ctx) return;
    var str = window.PData && PData.getString ? function (k) { return PData.getString(k); } : function (k) { return k; };
    var labels = { jump: str("JUMP"), grip: str("GRIP"), throw: str("THROW"), tag: str("TAG") };
    var i, b, on;
    if (origin) {
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(knob.x - 4, knob.y - 4, 8, 8);
    }
    for (i = 0; i < BTNS.length; i++) {
      b = BTNS[i];
      on = hold[b.id];
      ctx.fillStyle = on ? "rgba(242,193,78,0.55)" : "rgba(36,30,51,0.55)";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = "#F2C14E";
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      if (window.PFont) PFont.draw(ctx, labels[b.id] || b.id, b.x + 4, b.y + 14, 1, "#FFE9A8");
    }
  }

  function init(el) {
    canvas = el || document.getElementById("game");
    if (!canvas || canvas._ptouch) return;
    canvas._ptouch = true;
    canvas.addEventListener("pointerdown", onDown, { passive: false });
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp, { passive: false });
    window.addEventListener("pointercancel", onUp, { passive: false });
  }

  var api = { init: init, poll: poll, draw: draw, buttons: BTNS };
  if (typeof window !== "undefined") window.PInputTouch = api;
  if (typeof global !== "undefined") global.PInputTouch = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
