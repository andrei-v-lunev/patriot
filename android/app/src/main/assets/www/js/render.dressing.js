/* Deterministic per-world atmosphere and per-level foreground signatures. */
(function () {
  var W = 480;

  function levelNo(id) {
    var n = parseInt(String(id || "").slice(-1), 10);
    return n >= 1 && n <= 3 ? n : 1;
  }

  function worldFx(ctx, camx, world, tick, reducedMotion) {
    var x, off, pulse, drift = reducedMotion ? 0 : tick;
    if (world === 2) {
      off = ((camx * 1.12) | 0) % 112;
      ctx.fillStyle = "#9D3F35";
      for (x = -off; x < W + 112; x += 112) {
        ctx.fillRect(x + 10, 155, 46, 4);
        ctx.fillStyle = "#E3B85F"; ctx.fillRect(x + 18, 159, 5, 8);
        ctx.fillStyle = "#2A777A"; ctx.fillRect(x + 34, 159, 5, 8);
        ctx.fillStyle = "#9D3F35";
      }
    } else if (world === 3) {
      ctx.fillStyle = "rgba(186,201,224,0.38)";
      for (x = -40; x < W + 40; x += 54) {
        var wx = x + ((drift * 3 + camx) % 54);
        ctx.fillRect(wx, 40 + ((x * 7) & 95), 18, 1);
      }
    } else if (world === 4) {
      ctx.fillStyle = reducedMotion ? "rgba(180,202,218,0.20)" : "rgba(180,202,218,0.36)";
      off = (drift * 3 + (camx | 0)) % 20;
      for (x = -20; x < W + 20; x += 20) ctx.fillRect(x + off, 14 + ((x * 11) & 127), 1, reducedMotion ? 3 : 9);
    } else if (world === 5) {
      pulse = reducedMotion ? 0.55 : 0.38 + 0.22 * (0.5 + 0.5 * Math.sin(tick / 18));
      ctx.fillStyle = "rgba(245,196,74," + pulse + ")";
      ctx.fillRect(58, 112, 3, 42); ctx.fillRect(419, 112, 3, 42);
      ctx.fillStyle = "rgba(63,209,228," + (pulse * 0.55) + ")";
      ctx.fillRect(132, 82, 2, 70); ctx.fillRect(346, 82, 2, 70);
      ctx.fillStyle = "rgba(238,183,62,0.58)";
      off = reducedMotion ? 0 : ((tick / 8) | 0);
      for (x = 8; x < W; x += 16) ctx.fillRect(x, 137 + ((x / 16 + off) & 3), 2, 2);
    }
  }

  function signature(ctx, world, n) {
    if (world === 1) {
      if (n === 1) {
        ctx.fillStyle = "#594536"; ctx.fillRect(52, 153, 72, 2);
        ctx.fillStyle = "#C25A49"; ctx.fillRect(65, 155, 9, 6);
        ctx.fillStyle = "#D8C67A"; ctx.fillRect(92, 155, 11, 5);
      } else if (n === 2) {
        ctx.fillStyle = "#6B5A49"; ctx.fillRect(32, 143, 8, 28); ctx.fillRect(440, 143, 8, 28);
        ctx.fillStyle = "#A8946F"; ctx.fillRect(29, 142, 14, 4); ctx.fillRect(437, 142, 14, 4);
      } else {
        ctx.fillStyle = "#8E1D24"; ctx.fillRect(32, 133, 14, 31); ctx.fillRect(434, 133, 14, 31);
        ctx.fillStyle = "#F2C14E"; ctx.fillRect(36, 139, 6, 6); ctx.fillRect(438, 139, 6, 6);
      }
    } else if (world === 2) {
      if (n === 1) {
        ctx.fillStyle = "#B5463A"; ctx.fillRect(20, 172, 54, 3); ctx.fillRect(406, 172, 54, 3);
      } else if (n === 2) {
        ctx.fillStyle = "#775033"; ctx.fillRect(32, 146, 28, 4); ctx.fillRect(414, 146, 24, 4);
        ctx.fillRect(36, 146, 3, 25); ctx.fillRect(431, 146, 3, 25);
      } else {
        ctx.fillStyle = "#E3B85F"; ctx.fillRect(22, 143, 52, 3); ctx.fillRect(406, 143, 52, 3);
        ctx.fillStyle = "#9D3F35"; ctx.fillRect(24, 146, 8, 12); ctx.fillRect(446, 146, 8, 12);
      }
    } else if (world === 3) {
      if (n === 1) {
        ctx.fillStyle = "#B78342"; ctx.fillRect(38, 132, 3, 32); ctx.fillRect(439, 132, 3, 32);
        ctx.fillStyle = "#D8B05F"; ctx.fillRect(35, 132, 9, 5); ctx.fillRect(436, 132, 9, 5);
      } else if (n === 2) {
        ctx.fillStyle = "#737D91"; ctx.fillRect(34, 155, 30, 7); ctx.fillRect(416, 155, 30, 7);
        ctx.fillStyle = "#252A36"; ctx.fillRect(40, 148, 18, 7); ctx.fillRect(422, 148, 18, 7);
      } else {
        ctx.fillStyle = "#70404A"; ctx.fillRect(18, 127, 4, 43); ctx.fillRect(458, 127, 4, 43);
        ctx.fillRect(18, 127, 44, 3); ctx.fillRect(418, 127, 44, 3);
      }
    } else if (world === 4) {
      if (n === 1) {
        ctx.fillStyle = "#A45B2B"; ctx.fillRect(18, 145, 48, 4); ctx.fillRect(414, 145, 48, 4);
        ctx.fillStyle = "#D6A13B"; ctx.fillRect(18, 149, 4, 18); ctx.fillRect(458, 149, 4, 18);
      } else if (n === 2) {
        ctx.fillStyle = "#D79B37"; ctx.fillRect(350, 151, 66, 3);
        ctx.fillStyle = "#222A33"; ctx.fillRect(381, 151, 4, 26);
      } else {
        ctx.fillStyle = "#E2B644"; ctx.fillRect(28, 135, 3, 35); ctx.fillRect(449, 135, 3, 35);
        ctx.fillRect(28, 135, 44, 3); ctx.fillRect(408, 135, 44, 3);
      }
    } else if (world === 5) {
      if (n === 1) {
        ctx.fillStyle = "#E4B943"; ctx.fillRect(20, 150, 40, 2); ctx.fillRect(420, 150, 40, 2);
        ctx.fillStyle = "#3FD1E4"; ctx.fillRect(38, 143, 4, 7); ctx.fillRect(438, 143, 4, 7);
      } else if (n === 2) {
        ctx.fillStyle = "#9A2745"; ctx.fillRect(32, 143, 5, 28); ctx.fillRect(443, 143, 5, 28);
        ctx.fillStyle = "#E4B943"; ctx.fillRect(29, 142, 11, 4); ctx.fillRect(440, 142, 11, 4);
      } else {
        ctx.fillStyle = "#D2A93C"; ctx.fillRect(0, 151, W, 2);
        ctx.fillRect(16, 116, 3, 54); ctx.fillRect(461, 116, 3, 54);
      }
    }
  }

  function draw(ctx, camx, world, levelId, tick, reducedMotion) {
    if (!ctx) return;
    worldFx(ctx, camx || 0, world || 1, tick || 0, !!reducedMotion);
    signature(ctx, world || 1, levelNo(levelId));
  }

  var api = { draw: draw, levelNo: levelNo };
  if (typeof window !== "undefined") window.PDressing = api;
  if (typeof global !== "undefined") global.PDressing = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
