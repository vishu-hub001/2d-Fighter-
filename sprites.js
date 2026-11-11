// Procedural skeletal sprites: IK limbs, outlined + shaded, per-character costumes.
// Pose vector: [hipX, hipY, torsoLean, headTilt, frontHand(x,y), backHand(x,y), frontFoot(x,y), backFoot(x,y)]   (local space, +x = facing, y negative = up)
(function () {
  const G = Game, OUT = '#0b0d17';
  let FLASH = false, CUR_T = 0, CUR_SEED = 0;   // set per draw(): white-flash mode, anim clock, per-fighter blink offset
  const L1A = 27, L2A = 27, L1L = 38, L2L = 38, TORSO = 44, HEAD_R = 13;

  // ------------------------------------------------------------------ colour helpers
  function rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgba(h, a) { const c = rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function shade(h, a) { const c = rgb(h); const f = a < 0 ? 0 : 255, k = Math.abs(a); return 'rgb(' + c.map(v => Math.round(v + (f - v) * k)).join(',') + ')'; }
  const lerp = (a, b, u) => a + (b - a) * u, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = u => u * u * (3 - 2 * u), easeOut = u => 1 - (1 - u) * (1 - u);
  const mix = (A, B, u) => A.map((v, i) => lerp(v, B[i], u));

  // ------------------------------------------------------------------ poses
  const P = {
    stand:   [-3, -66, .10, 0,   28, -112, 14, -106,  22, 0,  -22, 0],
    guard:   [-6, -66, .16, .05, 26, -126, 19, -112,  20, 0,  -22, 0],
    crouch:  [-6, -42, .28, .05, 28, -88,  14, -82,   28, 0,  -18, 0],
    cguard:  [-8, -42, .34, .08, 24, -100, 16, -90,   26, 0,  -18, 0],
    prejump: [-6, -50, .30, 0,   24, -98,  10, -92,   26, 0,  -20, 0],
    jumpUp:  [-2, -74, .05, 0,   26, -120, 10, -112,  24, -38, -16, -30],
    jumpDn:  [-2, -70, .02, 0,   30, -126, 14, -116,  20, -10, -14, -18],
    dashF:   [8, -60, .52, .06,  36, -98,  8, -92,    42, -3,  -34, -14],
    dashB:   [-14, -64, -.14, -.1, 22, -110, 8, -104, 6, -16,   -32, 0],
    hit:     [-14, -66, -.30, -.35, 4, -100, -10, -96, 22, 0,  -22, 0],
    chit:    [-14, -42, .02, -.35, 6, -72, -6, -66,   28, 0,  -18, 0],
    airhit:  [0, -72, -.2, -.4,  -20, -118, -10, -102, 14, -40, -20, -22],
    lying:   [0, -66, 0, 0,      14, -70, -10, -66,   14, -6,  -14, 0],
    win:     [-2, -66, .05, .1,  30, -178, 12, -110,  24, 0,   -22, 0],
    grabbed: [0, -62, -.35, -.3, -14, -104, -6, -98,  16, -30, -14, -24],
    // ---- attacks: {c: chamber, e: extend}
    jab:      { c: [-6, -66, .04, 0, 6, -104, 16, -108, 22, 0, -22, 0],        e: [2, -66, .20, 0, 66, -108, 14, -110, 24, 0, -24, 0] },
    jab2:     { c: [-6, -66, .02, 0, 28, -112, 4, -102, 22, 0, -22, 0],        e: [4, -66, .26, 0, 22, -112, 66, -106, 26, 0, -24, 0] },
    cross:    { c: [-10, -66, -.04, 0, 26, -114, 0, -100, 26, 0, -24, 0],      e: [10, -64, .34, .06, 22, -112, 74, -104, 32, 0, -28, 0] },
    lowkick:  { c: [-8, -66, .0, 0, 26, -114, 12, -108, 30, -34, -22, 0],      e: [-6, -66, -.12, -.04, 26, -114, 12, -108, 82, -62, -20, 0] },
    roundhouse: { c: [-12, -66, -.1, 0, 22, -114, 8, -104, 30, -50, -22, 0],   e: [14, -62, -.34, -.12, 18, -114, 0, -98, 90, -104, -22, 0] },
    overhead: { c: [-8, -68, -.14, 0, 20, -176, 8, -170, 22, 0, -22, 0],       e: [14, -60, .46, .16, 66, -78, 52, -86, 32, 0, -26, 0] },
    hammer:   { c: [-12, -68, -.22, 0, -6, -172, 4, -178, 22, 0, -24, 0],      e: [18, -58, .56, .2, 74, -72, 62, -80, 34, 0, -26, 0] },
    sidekick: { c: [-4, -66, .0, 0, 22, -114, 8, -106, 26, -56, -20, 0],       e: [12, -64, -.28, -.04, 16, -114, 0, -104, 92, -68, -18, 0] },
    uppercut: { c: [-6, -54, .38, .16, 14, -62, 6, -72, 30, 0, -26, 0],        e: [8, -72, -.12, -.2, 40, -176, 6, -102, 28, -4, -22, 0] },
    cjab:     { c: [-6, -42, .24, .05, 12, -84, 14, -80, 28, 0, -18, 0],       e: [-2, -42, .34, .05, 70, -84, 14, -80, 28, 0, -18, 0] },
    cuppercut: { c: [-6, -38, .36, .12, 12, -66, 8, -76, 28, 0, -18, 0],       e: [2, -56, .0, -.2, 38, -172, 12, -92, 28, 0, -20, 0] },
    clow:     { c: [-10, -42, .22, .05, 26, -88, 12, -82, 40, -14, -18, 0],    e: [-12, -36, -.2, .05, 26, -86, 12, -80, 90, -10, -16, 0] },
    sweep:    { c: [-8, -34, .05, .05, 22, -80, -10, -70, 40, -6, -20, 0],     e: [26, -28, -.55, .1, 12, -66, -26, -72, 104, -3, -20, 0] },
    jpunch:   { c: [0, -80, .1, 0, 20, -110, 12, -108, 26, -42, -10, -52],     e: [2, -80, .22, 0, 66, -106, 14, -108, 26, -42, -10, -52] },
    jpunch2:  { c: [0, -78, .0, 0, 10, -130, 8, -128, 26, -40, -12, -48],      e: [6, -76, .34, .1, 72, -92, 56, -98, 24, -36, -14, -46] },
    jkick:    { c: [-4, -76, -.1, 0, 24, -114, 8, -106, 30, -50, -12, -30],    e: [-6, -76, -.2, -.1, 24, -114, 8, -106, 84, -54, -12, -30] },
    jkick2:   { c: [-4, -76, -.1, 0, 24, -114, 8, -106, 30, -56, -12, -30],    e: [-8, -80, -.34, -.1, 22, -112, 4, -108, 84, -22, -16, -52] },
    grab:     { c: [0, -64, .2, .05, 30, -100, 18, -96, 26, 0, -24, 0],        e: [8, -60, .42, .1, 58, -92, 48, -84, 32, 0, -26, 0] },
    castfwd:  { c: [-8, -66, .0, 0, 4, -102, -4, -106, 22, 0, -24, 0],         e: [8, -64, .2, 0, 60, -104, 52, -98, 28, 0, -26, 0] },
    risingstrike: { c: [-2, -56, .3, .1, 14, -80, 8, -86, 28, 0, -22, 0],      e: [2, -86, -.14, -.2, 34, -184, 6, -108, 18, -52, -14, -10] },
    lunge:    { c: [-10, -56, .3, .05, 20, -100, 4, -100, 28, 0, -30, 0],      e: [22, -58, .52, .1, 78, -98, 10, -100, 42, 0, -34, -4] },
    throwkunai: { c: [-6, -66, -.1, 0, 20, -112, -26, -122, 22, 0, -22, 0],    e: [4, -66, .2, 0, 58, -106, -4, -100, 26, 0, -24, 0] },
    shoulder: { c: [-4, -58, .4, .1, 20, -96, 6, -90, 34, 0, -26, 0],          e: [22, -56, .64, .2, 48, -92, 30, -86, 42, 0, -30, -4] },
    superbolt: { c: [-2, -66, -.04, 0, 22, -130, 6, -128, 22, 0, -22, 0],      e: [0, -68, -.14, -.16, 30, -184, 8, -182, 24, 0, -24, 0] },
    superbeam: { c: [-6, -64, .0, 0, 10, -106, 6, -104, 26, 0, -26, 0],        e: [8, -60, .3, 0, 76, -108, 64, -104, 34, 0, -30, 0] },
    knee:     { c: [-4, -68, .0, 0, 24, -114, 8, -108, 26, -34, -22, 0],        e: [8, -72, .14, 0, 28, -118, 8, -112, 30, -72, -18, 0] },
    spinkick: { c: [-6, -66, -.1, -.1, 10, -110, -8, -104, 22, -20, -22, 0],    e: [-10, -66, -.24, -.2, -12, -110, -22, -104, 90, -70, -18, 0] },
    axekick:  { c: [-8, -70, -.2, 0, 20, -114, 6, -106, 36, -150, -20, 0],      e: [8, -64, .12, 0, 24, -112, 8, -104, 64, -28, -20, 0] },
    headbutt: { c: [-8, -62, .1, 0, 20, -100, 8, -96, 30, 0, -26, 0],           e: [12, -60, .62, .3, 20, -92, 6, -90, 32, 0, -28, 0] },
    clothes:  { c: [-4, -64, .05, 0, 20, -112, -10, -108, 28, 0, -28, 0],        e: [4, -64, .12, 0, 82, -114, -52, -112, 28, 0, -28, 0] },
    superdash: { c: [-12, -56, .34, .05, 20, -100, 2, -100, 30, 0, -32, 0],    e: [26, -56, .6, .12, 84, -92, 20, -96, 46, 0, -36, -4] }
  };
  const DEF = { c: null, e: P.jab.e };
  // each fighting style has its own idle stance
  const STANCE = {
    prank:   [-4, -62, .06, 0,  30, -106, 16, -100,  28, 0, -26, 0],      // wide, loose, bouncy
    pirate:  [-4, -66, .10, 0,  42, -120, 12, -100,  24, 0, -24, 0],      // blade out front
    kick:    [-4, -66, .14, .04, 24, -122, 18, -116, 20, 0, -26, 0],      // tight kickboxing guard
    monk:    [-4, -62, .08, 0,  32, -108, 16, -100,  28, 0, -26, 0],      // wide, rooted, palms forward
    frost:   [-4, -67, .08, 0,  26, -118, 12, -112,  18, 0, -20, 0]       // light, elegant, narrow
  };
  const stanceOf = f => STANCE[f.def.look] || P.stand;

  // ------------------------------------------------------------------ pose selection per fighter state
  function poseOf(f, T) {
    const bz = f.def.bounce || 1, S0 = stanceOf(f), st = f.st, br = Math.sin(T * 3.2 * (bz > 1 ? 1.8 : 1) + f.idx * 1.7), out = { v: S0, rot: 0, off: [0, 0], face: 'n' };
    const breathe = v => { const w = v.slice(); w[1] += br * 1.1 * bz; w[4] += br * .8 * bz; w[5] += br * .8 * bz; w[6] += br * .6 * bz; w[2] += br * .012 * bz; if (bz > 1.5) { w[8] += br * 3; w[10] -= br * 3; } return w; };
    switch (st) {
      case 'intro': out.v = breathe(S0); out.v[2] += .05; break;
      case 'stand':
        if (f.guard === 1) out.v = P.guard;
        else if (f.wd) {
          const ph = f.wd > 0 ? f.anim : -f.anim, v = S0.slice(), s1 = Math.sin(ph), s2 = Math.sin(ph + Math.PI);
          v[8] = 6 + 22 * s1; v[9] = -9 * Math.max(0, Math.cos(ph)); v[10] = 6 + 22 * s2; v[11] = -9 * Math.max(0, Math.cos(ph + Math.PI));
          v[1] += Math.abs(Math.sin(ph)) * 3 - 1; v[2] += f.wd > 0 ? .04 : -.02; out.v = v;
        } else out.v = breathe(S0);
        break;
      case 'crouch': out.v = f.guard === 2 ? P.cguard : P.crouch; break;
      case 'prejump': out.v = P.prejump; break;
      case 'land': out.v = mix(P.prejump, S0, clamp(f.sf / 6, 0, 1)); break;
      case 'air': out.v = f.vy < -2 ? P.jumpUp : mix(P.jumpUp, P.jumpDn, clamp((f.vy + 2) / 8, 0, 1)); break;
      case 'dash': { const u = clamp(f.sf / 6, 0, 1); out.v = mix(P.stand, f.wd >= 0 ? P.dashF : P.dashB, easeOut(u)); out.dashing = true; break; }
      case 'block': { const k = f.sf < 4 ? (1 - f.sf / 4) : 0; out.v = (f.crouchHit ? P.cguard : P.guard).slice(); out.v[0] -= 5 * k; out.v[2] -= .06 * k; out.v[4] -= 4 * k; out.face = 'b'; break; }
      case 'hit': { const k = clamp(1 - f.sf / 14, .35, 1), b = f.crouchHit ? P.chit : P.hit; out.v = mix(f.crouchHit ? P.crouch : P.stand, b, k); out.v = out.v.slice(); out.v[0] += (f.sf < 3 ? -3 : 0); out.face = 'h'; break; }
      case 'launch': {
        out.v = P.airhit; out.face = 'h';
        const up = f.vy < 0, spin = f.tb ? 3.0 : clamp(f.sf * .085, 0, 1.5);
        out.rot = -(up ? Math.min(spin, 1.0) : Math.min(.9 + (f.sf - 10) * .05, 1.57)); if (f.tb) out.rot = -clamp(f.sf * .22, 0, 1.4);
        break;
      }
      case 'down': case 'ko': out.v = P.lying; out.rot = -1.5708; out.off = [-6, 52]; out.face = 'k'; break;
      case 'wake': { const u = clamp(f.sf / 16, 0, 1); out.v = mix(P.lying, P.crouch, ease(u)); out.rot = -1.5708 * (1 - ease(u)); out.off = [-6 * (1 - u), 52 * (1 - ease(u))]; break; }
      case 'grab': { const u = clamp(f.sf / 12, 0, 1); out.v = P.grabbed; out.rot = -.5; out.off = [0, -22 * Math.sin(Math.PI * u) - 6]; out.face = 'h'; break; }
      case 'win': { const u = clamp(f.sf / 10, 0, 1); out.v = mix(S0, P.win, easeOut(u)); out.v = out.v.slice(); out.v[1] += Math.sin(T * 5) * 1.2; break; }
      case 'atk': return attackPose(f, out);
    }
    return out;
  }
  function attackPose(f, out) {
    const a = f.atk, m = a.m, t = a.t, A = P[m.pose] || DEF;
    const base = f.st === 'atk' && m.stance === 'crouch' ? P.crouch : m.air || f.y < G.GROUND - 4 ? P.jumpUp : stanceOf(f);
    const total = m.st + m.ac + m.rc; out.face = 'a';
    if (a.grabT >= 0) { out.v = A.e; return out; }
    if (t <= m.st) {
      const u = clamp(t / Math.max(1, m.st), 0, 1);
      out.v = A.c ? (u < .62 ? mix(base, A.c, ease(u / .62)) : mix(A.c, A.e, easeOut((u - .62) / .38))) : mix(base, A.e, easeOut(u));
    } else if (t <= m.st + m.ac) {
      const u = (t - m.st) / Math.max(1, m.ac); out.v = A.e.slice(); out.v[0] += Math.sin(u * 3) * .6; out.striking = true;
    } else {
      const u = clamp((t - m.st - m.ac) / Math.max(1, m.rc), 0, 1); out.v = mix(A.e, base, ease(u));
    }
    return out;
  }

  // ------------------------------------------------------------------ rig maths
  function ik(ax, ay, tx, ty, l1, l2, bend) {
    let dx = tx - ax, dy = ty - ay, d = Math.hypot(dx, dy) || 1e-3; const mx = l1 + l2 - .01;
    if (d > mx) { const k = mx / d; dx *= k; dy *= k; d = mx; }
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    return { j: [ax + dx * a / d - bend * h * dy / d, ay + dy * a / d + bend * h * dx / d], t: [ax + dx, ay + dy] };
  }
  function solve(v, rot, off, ld) {
    const hip = [v[0], v[1]], lean = v[2], u = [Math.sin(lean), -Math.cos(lean)];
    const S = [hip[0] + u[0] * TORSO, hip[1] + u[1] * TORSO];
    const ha = lean + v[3], Hc = [S[0] + Math.sin(ha) * 24, S[1] - Math.cos(ha) * 24];
    const sh = [S[0] - 2 * Math.cos(lean), S[1] - 2 * Math.sin(lean)];
    const aF = ik(sh[0], sh[1], v[4], v[5], ld.arm[0], ld.arm[1], 1), aB = ik(sh[0], sh[1], v[6], v[7], ld.arm[0], ld.arm[1], 1);
    const hipF = [hip[0] + 3, hip[1]], hipB = [hip[0] - 3, hip[1]];
    const lF = ik(hipF[0], hipF[1], v[8], v[9], L1L, L2L, -1), lB = ik(hipB[0], hipB[1], v[10], v[11], L1L, L2L, -1);
    const J = { hip, S, Hc, ha, lean, sh, eF: aF.j, hF: aF.t, eB: aB.j, hB: aB.t, kF: lF.j, fF: lF.t, kB: lB.j, fB: lB.t };
    if (rot) { const c = Math.cos(rot), s = Math.sin(rot); for (const k of ['S', 'Hc', 'sh', 'eF', 'hF', 'eB', 'hB', 'kF', 'fF', 'kB', 'fB']) { const p = J[k], x = p[0] - hip[0], y = p[1] - hip[1]; J[k] = [hip[0] + x * c - y * s, hip[1] + x * s + y * c]; } J.ha += rot; J.lean += rot; }
    if (off[0] || off[1]) for (const k of ['hip', 'S', 'Hc', 'sh', 'eF', 'hF', 'eB', 'hB', 'kF', 'fF', 'kB', 'fB']) J[k] = [J[k][0] + off[0], J[k][1] + off[1]];
    return J;
  }

  // ------------------------------------------------------------------ primitives
  function taper(ctx, a, b, w1, w2, fill, outline) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    const path = (e) => {
      ctx.beginPath();
      ctx.moveTo(a[0] + nx * (w1 / 2 + e), a[1] + ny * (w1 / 2 + e)); ctx.lineTo(b[0] + nx * (w2 / 2 + e), b[1] + ny * (w2 / 2 + e));
      ctx.arc(b[0], b[1], w2 / 2 + e, Math.atan2(ny, nx), Math.atan2(-ny, -nx), true);
      ctx.lineTo(a[0] - nx * (w1 / 2 + e), a[1] - ny * (w1 / 2 + e));
      ctx.arc(a[0], a[1], w1 / 2 + e, Math.atan2(-ny, -nx), Math.atan2(ny, nx), true); ctx.closePath();
    };
    if (outline !== false) { path(1.6); ctx.fillStyle = OUT; ctx.fill(); }
    path(0); ctx.fillStyle = fill; ctx.fill();
    // rim light on the upper side
    let ox = nx, oy = ny; if (oy > 0) { ox = -ox; oy = -oy; }
    // soft form-shading: light from above, shadow underneath
    if (!FLASH && Math.min(w1, w2) > 4) {
      ctx.save(); path(0); ctx.clip();
      const gg = ctx.createLinearGradient(a[0] + ox * w1 * .5, a[1] + oy * w1 * .5, a[0] - ox * w1 * .5, a[1] - oy * w1 * .5);
      gg.addColorStop(0, 'rgba(255,255,255,.22)'); gg.addColorStop(.45, 'rgba(255,255,255,0)'); gg.addColorStop(1, 'rgba(0,0,0,.34)');
      ctx.fillStyle = gg; const m = Math.max(w1, w2);
      ctx.fillRect(Math.min(a[0], b[0]) - m, Math.min(a[1], b[1]) - m, Math.abs(b[0] - a[0]) + m * 2, Math.abs(b[1] - a[1]) + m * 2); ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = Math.max(1.2, Math.min(w1, w2) * .16); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a[0] + ox * w1 * .27, a[1] + oy * w1 * .27); ctx.lineTo(b[0] + ox * w2 * .27, b[1] + oy * w2 * .27); ctx.stroke();
    // shadow on the lower side
    ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.moveTo(a[0] - ox * w1 * .3, a[1] - oy * w1 * .3); ctx.lineTo(b[0] - ox * w2 * .3, b[1] - oy * w2 * .3); ctx.stroke();
  }
  function ball(ctx, p, r, fill) { ctx.beginPath(); ctx.arc(p[0], p[1], r + 1.5, 0, 7); ctx.fillStyle = OUT; ctx.fill(); ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.fillStyle = fill; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.arc(p[0] - r * .3, p[1] - r * .35, r * .45, 0, 7); ctx.fill(); }
  function poly(ctx, pts, fill, stroke) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke !== false) { ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.stroke(); } }
  const add = (p, q, k) => [p[0] + q[0] * (k === undefined ? 1 : k), p[1] + q[1] * (k === undefined ? 1 : k)];
  // little additive flame licks (Blaze) - drawn upright in local space
  function flame(ctx, p, T, sz, c1, c2, seed) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(p[0], p[1]);
    for (let i = 0; i < 3; i++) { const o = (i - 1) * sz * .5, h = sz * (1.2 + .55 * Math.sin(T * 17 + i * 2.1 + seed)); ctx.fillStyle = i === 1 ? c1 : c2; ctx.beginPath(); ctx.moveTo(o - sz * .38, 2); ctx.quadraticCurveTo(o - sz * .25, -h * .55, o + Math.sin(T * 13 + i) * sz * .25, -h); ctx.quadraticCurveTo(o + sz * .3, -h * .5, o + sz * .38, 2); ctx.fill(); }
    ctx.restore();
  }
  const along = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

  // ------------------------------------------------------------------ look definitions
  // arm/leg: colour keys resolve against the character def.  w = [upper, lower, hand] / [thigh, shin, foot]
  const LOOKS = {
    thunder: { arm: [27, 27], aw: [13, 11, 9], leg: { thigh: 'dark', shin: 'dark', foot: '#2a2f4a' }, armCol: ['suit', 'skin', 'skin'], lw: [16, 12.5], torsoW: [30, 25] },
    knight:  { arm: [27, 27], aw: [14, 13, 12], leg: { thigh: 'suit', shin: 'suit', foot: 'accent' }, armCol: ['suit', 'suit', 'accent'], lw: [17, 13.5], torsoW: [34, 27] },
    ninja:   { arm: [27, 27], aw: [11, 9.5, 8], leg: { thigh: 'suit', shin: 'dark', foot: '#15102a' }, armCol: ['suit', 'suit', 'skin'], lw: [14, 11], torsoW: [27, 22] },
    prank:   { arm: [27, 27], aw: [15, 13, 12], leg: { thigh: 'suit', shin: 'suit', foot: '#f4f4f4' }, armCol: ['suit', 'suit', 'skin'], lw: [18, 14], torsoW: [38, 36] },
    pirate:  { arm: [27, 27], aw: [12, 10.5, 9], leg: { thigh: 'dark', shin: '#5a3a22', foot: '#3a2514' }, armCol: ['suit', 'suit', 'skin'], lw: [16, 12.5], torsoW: [34, 28], blade: 74 },
    kick:    { arm: [27, 27], aw: [13, 11.5, 11], leg: { thigh: 'suit', shin: 'skin', foot: 'accent' }, armCol: ['skin', 'skin', 'accent'], lw: [17, 13], torsoW: [34, 28] },
    monk:    { arm: [27, 27], aw: [14, 12.5, 11], leg: { thigh: 'dark', shin: 'dark', foot: '#c2410c' }, armCol: ['skin', 'skin', 'accent'], lw: [17, 13.5], torsoW: [36, 30] },
    frost:   { arm: [27, 27], aw: [11, 9.5, 8.5], leg: { thigh: 'dark', shin: 'dark', foot: '#eaf8ff' }, armCol: ['suit', 'skin', 'accent'], lw: [15, 12], torsoW: [28, 23] },
    brawler: { arm: [28, 28], aw: [17, 14.5, 14], leg: { thigh: 'suit', shin: 'suit', foot: '#2a1a12' }, armCol: ['skin', 'skin', '#d6491f'], lw: [20, 15.5], torsoW: [40, 31] }
  };

  function draw(ctx, f, T, opt) {
    opt = opt || {};
    const d = f.def, look = LOOKS[d.look] || LOOKS.thunder, sc = d.scale, fl = f.flash > 0 && !opt.noFlash;
    const pz = poseOf(f, T), J = solve(pz.v, pz.rot, pz.off, look);
    const C = c => fl ? '#fff' : (d[c] || c);
    FLASH = fl; CUR_T = T; CUR_SEED = f.idx * 1.9 + ((d.hp || 0) % 7) * .31;
    // squash & stretch around the feet
    let sx = 1, sy = 1; const fs = f.st;
    if (fs === 'air' || fs === 'launch') { const k = clamp(Math.abs(f.vy) / 16, 0, 1); sy = 1 + .06 * k; sx = 1 - .045 * k; }
    else if (fs === 'land') { const k = 1 - clamp(f.sf / 6, 0, 1); sy = 1 - .09 * k; sx = 1 + .07 * k; }
    else if (fs === 'prejump') { sy = .94; sx = 1.04; }
    else if (fs === 'hit') { const k = clamp(1 - f.sf / 8, 0, 1); sy = 1 - .05 * k; sx = 1 + .05 * k; }
    else if (pz.striking) { sx = 1.04; sy = .99; }
    ctx.save(); ctx.translate(f.x + (opt.ox || 0), f.y + (opt.oy || 0)); ctx.scale(f.facing * sc * sx, sc * sy);
    if (opt.alpha !== undefined) ctx.globalAlpha = opt.alpha;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // ground shadow
    if (!opt.noShadow) { const h = Math.max(0, (G.GROUND - f.y)); ctx.save(); ctx.scale(1 / f.facing / sc, 1 / sc); ctx.translate(0, h * sc); ctx.fillStyle = 'rgba(0,0,0,' + (0.32 * Math.max(.3, 1 - h / 260)) + ')'; ctx.beginPath(); ctx.ellipse(0, 0, 34 * sc * Math.max(.5, 1 - h / 400), 7 * sc, 0, 0, 7); ctx.fill(); ctx.restore(); }
    // SUPER-ready glow (pulsing, additive, in the fighter's accent colour)
    if (f.meter >= 100 && !opt.noFx && !opt.noShadow && d.accent) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const cx = J.hip[0], cy = J.hip[1] - 36, rg = ctx.createRadialGradient(0, 0, 6, 0, 0, 100), pu = .24 + .1 * Math.sin(T * 8); rg.addColorStop(0, rgba(d.accent, pu)); rg.addColorStop(.6, rgba(d.accent, pu * .35)); rg.addColorStop(1, rgba(d.accent, 0)); ctx.translate(cx, cy); ctx.scale(.75, 1.1); ctx.fillStyle = rg; ctx.fillRect(-102, -102, 204, 204); ctx.restore(); }
    // rage aura
    if (f.rage && !opt.noFx) { ctx.save(); ctx.globalAlpha = .16 + .1 * Math.sin(T * 14); ctx.fillStyle = '#ff2a2a'; ctx.beginPath(); ctx.ellipse(J.hip[0], J.hip[1] - 30, 42, 80, 0, 0, 7); ctx.fill(); ctx.restore(); }
    const ctxo = { ctx, J, d, look, C, T, f, pz };
    const H = HOOKS[d.look] || HOOKS.thunder;
    if (H.back) H.back(ctxo);
    // ----- back limbs
    drawArm(ctxo, J.sh, J.eB, J.hB, true);
    drawLeg(ctxo, J, J.kB, J.fB, true);
    // ----- torso + head
    H.torso(ctxo);
    H.head(ctxo);
    // ----- front limbs
    drawLeg(ctxo, J, J.kF, J.fF, false);
    drawArm(ctxo, J.sh, J.eF, J.hF, false);
    if (H.front) H.front(ctxo);
    if (d.weapon) drawWeapon(ctxo);
    ctx.restore();
    // world-space tips for trails
    const wx = p => f.x + f.facing * p[0] * sc * sx, wy = p => f.y + p[1] * sc * sy;
    let tipF = J.hF; if (look.blade) { let dx = J.hF[0] - J.eF[0], dy = J.hF[1] - J.eF[1]; const dd = Math.hypot(dx, dy) || 1; tipF = [J.hF[0] + dx / dd * look.blade, J.hF[1] + dy / dd * look.blade]; }
    return { striking: !!pz.striking, hand: [wx(tipF), wy(tipF)], hand2: [wx(J.hB), wy(J.hB)], foot: [wx(J.fF), wy(J.fF)], head: [wx(J.Hc), wy(J.Hc)], chest: [wx(add(J.hip, [0, -30])), wy(add(J.hip, [0, -30]))], dashing: !!pz.dashing, rot: pz.rot };
  }

  function drawArm(c, s, e, h, back) {
    const { ctx, look, d, C } = c, cols = look.armCol.map(k => C(k)), w = look.aw, dark = back ? .18 : 0;
    const col = i => back ? shade(cols[i].startsWith('rgb') || cols[i].startsWith('#fff') ? cols[i] : cols[i], -dark) : cols[i];
    taper(ctx, s, e, w[0], w[1], col(0));
    taper(ctx, e, h, w[1], w[2] * .85, col(1));
    ball(ctx, e, w[1] * .46, col(0));
    if (HOOKS[d.look].armDeco) HOOKS[d.look].armDeco(c, s, e, h, back);
    ball(ctx, h, w[2] * .55 + 1.5, col(2));
  }
  function drawLeg(c, J, k, f, back) {
    const { ctx, look, d, C } = c, lw = look.lw, lg = look.leg, tone = back ? -.2 : 0;
    const col = key => { const v = lg[key]; const base = d[v] ? C(v) : (c.f.flash > 0 ? '#fff' : v); return tone ? shade(base, tone) : base; };
    const hip = back ? [J.hip[0] - 3, J.hip[1]] : [J.hip[0] + 3, J.hip[1]];
    taper(ctx, hip, k, lw[0], lw[1] * .96, col('thigh'));
    taper(ctx, k, f, lw[1] * .96, lw[1] * .66, col('shin'));
    if (HOOKS[d.look].legDeco) HOOKS[d.look].legDeco(c, hip, k, f, back);
    // foot: boot pointing forward
    const dx = f[0] - k[0], dy = f[1] - k[1], len = Math.hypot(dx, dy) || 1;
    const toe = [f[0] + 11, f[1] + 1 + Math.max(0, -dy / len) * 0], heel = [f[0] - 3, f[1] + 1];
    taper(ctx, [f[0] - 1, f[1] - 1], [f[0] + 10, f[1] + 1.5], lw[1] * .56, lw[1] * .42, col('foot'));
  }

  // ------------------------------------------------------------------ face helper
  function face(ctx, face, o) {
    // o: eye colour, eyeY, brow thickness, skin
    const ex = 5.5, ey = -1.5;
    if (face === 'k') { ctx.strokeStyle = '#111'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ex - 2.5, ey - 2.5); ctx.lineTo(ex + 2.5, ey + 2.5); ctx.moveTo(ex + 2.5, ey - 2.5); ctx.lineTo(ex - 2.5, ey + 2.5); ctx.stroke(); }
    else if (face === 'h') { ctx.strokeStyle = '#111'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(ex - 3, ey - 1); ctx.lineTo(ex + 2, ey + 1.5); ctx.moveTo(ex - 3, ey + 3); ctx.lineTo(ex + 2, ey + 1.5); ctx.stroke(); }
    else if (!o.noEye) { if (face === 'n' && ((CUR_T + CUR_SEED) % 3.7) > 3.58) { ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ex - 3, ey + .8); ctx.lineTo(ex + 3, ey + .8); ctx.stroke(); } else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, 3.3, 2.6, 0, 0, 7); ctx.fill(); ctx.fillStyle = o.eye || '#2a5fa8'; ctx.beginPath(); ctx.arc(ex + 1.1, ey + .2, 1.9, 0, 7); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex + 1.4, ey + .2, 1, 0, 7); ctx.fill(); } }
    // brow
    if (!o.noBrow) { ctx.strokeStyle = o.brow || '#2b1b0e'; ctx.lineWidth = 2; ctx.beginPath(); const a = face === 'a' ? -1.8 : face === 'h' ? 1.5 : -.4; ctx.moveTo(ex - 4, ey - 4.2 - a * -.6); ctx.lineTo(ex + 4.4, ey - 4.2 + a * .9); ctx.stroke(); }
    // mouth
    if (!o.noMouth) { ctx.strokeStyle = '#5a2a1e'; ctx.fillStyle = '#4a1510'; ctx.lineWidth = 1.4; const my = 7;
      if (face === 'a' || face === 'h') { ctx.beginPath(); ctx.ellipse(ex + 2.5, my, 2.4, face === 'h' ? 3 : 2.2, 0, 0, 7); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(ex, my); ctx.lineTo(ex + 5, my - .5); ctx.stroke(); } }
  }
  function headBase(c, skin, jaw) {
    const { ctx, J } = c; ctx.save(); ctx.translate(J.Hc[0], J.Hc[1]); ctx.rotate(J.ha);
    // neck
    taper(ctx, [0, 14], [0, 24], 9, 9, shade(skin, -.12), true);
    ctx.beginPath(); ctx.ellipse(0, 0, HEAD_R - .5, HEAD_R, 0, 0, 7); ctx.fillStyle = OUT; ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, HEAD_R - 1.8, HEAD_R - 1.4, 0, 0, 7); ctx.fillStyle = skin; ctx.fill();
    if (jaw) { ctx.beginPath(); ctx.moveTo(-4, 8); ctx.quadraticCurveTo(4, 16, 11, 6); ctx.lineTo(8, 2); ctx.lineTo(-4, 2); ctx.fillStyle = skin; ctx.fill(); }
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(-3, 3, 9, 9, 0, 0, 7); ctx.fill();
    return ctx;
  }
  function torsoShape(c, wTop, wBot, fill, chestBulge) {
    const { ctx, J } = c, hip = J.hip, ax = [Math.sin(J.lean), -Math.cos(J.lean)], px = [Math.cos(J.lean), Math.sin(J.lean)];
    const at = (u, w) => [hip[0] + ax[0] * TORSO * u + px[0] * w, hip[1] + ax[1] * TORSO * u + px[1] * w];
    const pts = [at(0, -wBot / 2 - 1), at(0, wBot / 2), at(.35, wBot / 2 + 1 + (chestBulge || 0) * .4), at(.72, wTop / 2 + (chestBulge || 0)), at(1.0, wTop / 2 - 3), at(1.06, 0), at(1.0, -wTop / 2 + 2), at(.7, -wTop / 2 - 1), at(.32, -wBot / 2 - 2)];
    poly(ctx, pts, fill);
    if (!FLASH) {
      ctx.save(); ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.clip();
      const A = at(.5, -wTop / 2), B = at(.5, wTop / 2 + 4), gg = ctx.createLinearGradient(A[0], A[1], B[0], B[1]);
      gg.addColorStop(0, 'rgba(0,0,0,.32)'); gg.addColorStop(.35, 'rgba(0,0,0,.04)'); gg.addColorStop(.78, 'rgba(255,255,255,.15)'); gg.addColorStop(1, 'rgba(255,255,255,.03)');
      ctx.fillStyle = gg; ctx.fillRect(hip[0] - 60, hip[1] - 100, 120, 130);
      // soft ambient-occlusion at the waist
      const wg = ctx.createLinearGradient(hip[0], hip[1], hip[0] + ax[0] * TORSO * .35, hip[1] + ax[1] * TORSO * .35); wg.addColorStop(0, 'rgba(0,0,0,.22)'); wg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = wg; ctx.fillRect(hip[0] - 60, hip[1] - 100, 120, 130);
      ctx.restore();
    }
    return { at, ax, px };
  }

  // ------------------------------------------------------------------ per-character costume hooks
  const HOOKS = {
    thunder: {
      back(c) { cape(c, c.d.cape, '#8f1a21', 54); },
      torso(c) {
        const { ctx, d, C, J } = c, t = torsoShape(c, 32, 26, C('suit'), 3);
        // chest emblem + belt + gradient sheen
        const e = t.at(.62, 6); ctx.fillStyle = C('accent'); poly(ctx, [add(e, [-5, -7]), add(e, [3, -7]), add(e, [-1, -1]), add(e, [5, -1]), add(e, [-5, 9]), add(e, [-2, 1]), add(e, [-6, 1])], C('accent'), false);
        const b0 = t.at(.02, -13), b1 = t.at(.02, 13), b2 = t.at(.16, 13), b3 = t.at(.16, -13); poly(ctx, [b0, b1, b2, b3], C('accent'));
        ctx.fillStyle = C('dark'); const bk = t.at(.09, 0); ctx.beginPath(); ctx.arc(bk[0], bk[1], 3.2, 0, 7); ctx.fill();
        const s1 = t.at(.95, -12), s2 = t.at(.4, -11); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s1[0], s1[1]); ctx.lineTo(s2[0], s2[1]); ctx.stroke();
      },
      head(c) {
        const { d, C, f, pz } = c; const ctx = headBase(c, C('skin'), true);
        // long swept-back hair
        ctx.fillStyle = C('hair'); ctx.beginPath(); ctx.moveTo(-1, -14); ctx.bezierCurveTo(12, -15, 15, -4, 10, -2); ctx.lineTo(6, -7); ctx.lineTo(0, -6); ctx.lineTo(-6, 4); ctx.bezierCurveTo(-8, 12, -20, 16, -26, 12);
        ctx.bezierCurveTo(-18, 6, -18, -8, -8, -14); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.strokeStyle = shade(d.hair, -.25); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, -10); ctx.quadraticCurveTo(-12, -4, -19, 8); ctx.moveTo(1, -11); ctx.quadraticCurveTo(-8, -6, -14, 6); ctx.stroke();
        // gold circlet
        ctx.strokeStyle = C('accent'); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, HEAD_R - 2, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke();
        face(ctx, pz.face, { eye: '#3b7bd6', brow: '#8a6a1c' });
        ctx.restore();
      }
    },
    knight: {
      torso(c) {
        const { ctx, d, C, J } = c, t = torsoShape(c, 36, 28, C('suit'), 4);
        // armour plate lines, gold trim, reactor
        ctx.strokeStyle = C('accent'); ctx.lineWidth = 2; const a = t.at(.08, 14), b = t.at(.08, -14); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        const bt0 = t.at(0, -14), bt1 = t.at(0, 14), bt2 = t.at(.14, 14), bt3 = t.at(.14, -14); poly(ctx, [bt0, bt1, bt2, bt3], C('accent'));
        const r = t.at(.6, 6); ctx.fillStyle = 'rgba(120,230,255,.28)'; ctx.beginPath(); ctx.arc(r[0], r[1], 11, 0, 7); ctx.fill();
        ctx.fillStyle = c.f.flash > 0 ? '#fff' : '#c8f8ff'; ctx.beginPath(); ctx.arc(r[0], r[1], 5.6, 0, 7); ctx.fill(); ctx.strokeStyle = C('accent'); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(r[0], r[1], 7.6, 0, 7); ctx.stroke();
        const p1 = t.at(.95, 12), p2 = t.at(.3, 15); ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
        // tasset (hip skirt)
        const s0 = t.at(0, -14), s1 = t.at(0, 15); poly(ctx, [s0, s1, add(s1, [9, 14]), add(s0, [-7, 16])], C('suit'));
      },
      armDeco(c, s, e, h, back) { if (back) return; const { ctx, C } = c; ball(ctx, s, 10.5, C('suit')); ctx.strokeStyle = C('accent'); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s[0], s[1], 9, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); },
      legDeco(c, hip, k, f, back) { const { ctx, C } = c; ball(ctx, k, 8, back ? shade(c.d.accent, -.3) : C('accent')); },
      head(c) {
        const { d, C, pz } = c, ctx = headBase(c, C('suit'), false);
        // helmet
        ctx.fillStyle = C('suit'); ctx.beginPath(); ctx.ellipse(0, -1, HEAD_R + 1.5, HEAD_R + 1, 0, 0, 7); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.stroke();
        // gold faceplate
        ctx.fillStyle = C('accent'); ctx.beginPath(); ctx.moveTo(2, -10); ctx.lineTo(12, -6); ctx.lineTo(12, 7); ctx.quadraticCurveTo(6, 14, -2, 10); ctx.lineTo(-1, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
        // eye slits
        const glow = pz.face === 'k' ? '#555' : '#b9f6ff'; ctx.fillStyle = c.f.flash > 0 ? '#fff' : glow; ctx.shadowColor = '#7be6ff'; ctx.shadowBlur = c.f.flash > 0 ? 0 : 6;
        ctx.beginPath(); ctx.moveTo(2, -4); ctx.lineTo(11, -3); ctx.lineTo(10, -.2); ctx.lineTo(3, -.6); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(11, 4.5); ctx.moveTo(4, 7); ctx.lineTo(10, 7.3); ctx.stroke();
        // crest
        ctx.fillStyle = C('cape') || '#c0272d'; ctx.fillStyle = c.f.flash > 0 ? '#fff' : '#e8c53a'; ctx.beginPath(); ctx.moveTo(-8, -13); ctx.quadraticCurveTo(0, -24, 12, -10); ctx.lineTo(4, -12); ctx.quadraticCurveTo(-2, -16, -8, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    },
    ninja: {
      back(c) {
        const { ctx, J, T, f, d, C } = c, w = f.wd ? 1 : 0, S = J.S;
        // long scarf
        const n = 7; let prev = [J.Hc[0] - 6, J.Hc[1] + 12]; ctx.lineJoin = 'round';
        const pts = [], pts2 = [];
        for (let i = 0; i <= n; i++) { const u = i / n; const x = prev[0] - 6.5 - Math.abs(w) * 2 + 0, y = J.Hc[1] + 12 + Math.sin(T * 7 + i * .9) * (2 + i * .9) + u * 8 - (f.st === 'air' ? u * 10 * (f.vy > 0 ? 1.5 : -.5) : 0);
          pts.push([x, y - 4]); pts2.push([x, y + 4 + u * 2]); prev = [x, y]; }
        poly(ctx, pts.concat(pts2.reverse()), C('accent'));
      },
      torso(c) {
        const { ctx, d, C, J } = c, t = torsoShape(c, 28, 22, C('suit'), 2);
        ctx.strokeStyle = shade(d.suit, .25); ctx.lineWidth = 1.6; const a = t.at(.95, -9), b = t.at(.12, 10); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        const a2 = t.at(.95, 10), b2 = t.at(.12, -10); ctx.beginPath(); ctx.moveTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke();
        const s0 = t.at(0, -12), s1 = t.at(0, 12), s2 = t.at(.18, 12), s3 = t.at(.18, -12); poly(ctx, [s0, s1, s2, s3], C('accent'));
        const k = t.at(.1, 10); poly(ctx, [k, add(k, [4, 20]), add(k, [9, 18]), add(k, [8, 2])], C('accent'));
        ctx.fillStyle = 'rgba(176,80,255,.9)'; const g = t.at(.62, 4); ctx.beginPath(); ctx.arc(g[0], g[1], 2.2, 0, 7); ctx.fill();
      },
      armDeco(c, s, e, h) { const { ctx, C } = c; taper(ctx, along(e, h, .25), along(e, h, .75), 10.5, 9.5, shade(c.d.accent, -.1), true); },
      legDeco(c, hip, k, f) { const { ctx } = c; taper(ctx, along(k, f, .15), along(k, f, .55), 11, 10, shade(c.d.accent, -.2), true); },
      head(c) {
        const { d, C, pz, T, J } = c, ctx = headBase(c, C('suit'), false);
        // hood
        ctx.fillStyle = C('suit'); ctx.beginPath(); ctx.ellipse(0, -.5, HEAD_R + .8, HEAD_R + .6, 0, 0, 7); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.stroke();
        // face opening (skin band over eyes) + mask
        ctx.fillStyle = C('skin'); ctx.beginPath(); ctx.moveTo(2, -6.5); ctx.lineTo(13, -5); ctx.lineTo(13, 2.5); ctx.lineTo(2, 3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = C('dark'); ctx.beginPath(); ctx.moveTo(1, 3); ctx.lineTo(13.5, 2.5); ctx.lineTo(12, 12); ctx.quadraticCurveTo(5, 15, -1, 9); ctx.closePath(); ctx.fill();
        face(ctx, pz.face, { eye: '#b050ff', noMouth: true, brow: '#111' });
        // headband
        ctx.fillStyle = C('accent'); ctx.beginPath(); ctx.moveTo(-12, -6); ctx.lineTo(12.5, -8.5); ctx.lineTo(12.5, -5.5); ctx.lineTo(-12, -2.5); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.stroke();
        // band tails
        const sw = Math.sin(T * 8) * 3; poly(ctx, [[-12, -5], [-26, -9 + sw], [-34, -1 + sw * 1.4], [-24, -1 + sw], [-12, -1]], C('accent'));
        ctx.restore();
      }
    },

    prank: {
      torso(c) {
        const { ctx, C } = c, t = torsoShape(c, 38, 38, C('suit'), 8);
        ctx.strokeStyle = C('accent'); ctx.lineWidth = 4; ctx.lineCap = 'round'; const a = t.at(.96, -14), b = t.at(.06, -15); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        const z0 = t.at(.92, 6), z1 = t.at(.1, 8); ctx.strokeStyle = C('dark'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(z0[0], z0[1]); ctx.lineTo(z1[0], z1[1]); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.14)'; const bl = t.at(.4, 12); ctx.beginPath(); ctx.ellipse(bl[0], bl[1], 8, 12, c.J.lean, 0, 7); ctx.fill();
        const w0 = t.at(.03, -17), w1 = t.at(.03, 19), w2 = t.at(.13, 19), w3 = t.at(.13, -17); poly(ctx, [w0, w1, w2, w3], C('accent'));
      },
      head(c) {
        const { C, pz } = c, ctx = headBase(c, C('skin'), true);
        ctx.fillStyle = C('hair'); ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(-8, -20); ctx.lineTo(-3, -12); ctx.lineTo(0, -24); ctx.lineTo(4, -12); ctx.lineTo(9, -21); ctx.lineTo(9, -8); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.fillStyle = 'rgba(255,90,90,.35)'; ctx.beginPath(); ctx.arc(3, 5, 3.4, 0, 7); ctx.fill();
        face(ctx, pz.face, { eye: '#222', brow: '#1a6f6f', noMouth: true });
        if (pz.face === 'n' || pz.face === 'a') { ctx.fillStyle = '#4a1510'; ctx.beginPath(); ctx.arc(7, 5.5, 5.4, 0.05, Math.PI - .05); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(3.2, 5.8, 8, 1.8); }
        else { ctx.fillStyle = '#4a1510'; ctx.beginPath(); ctx.ellipse(7, 8, 2.4, 3, 0, 0, 7); ctx.fill(); }
        ctx.restore();
      }
    },
    pirate: {
      back(c) {
        const { ctx, J, C, T } = c, h = J.hip, sw = Math.sin(T * 5) * 2;
        poly(ctx, [[h[0] - 4, h[1] - 6], [h[0] - 26 + sw, h[1] + 36], [h[0] - 14, h[1] + 40], [h[0] + 2, h[1] + 30], [h[0] + 4, h[1] - 4]], shade(c.d.suit, -.2));
      },
      torso(c) {
        const { ctx, C, J } = c, t = torsoShape(c, 34, 28, C('suit'), 3);
        poly(ctx, [t.at(.98, 10), t.at(.98, -4), t.at(.5, 4)], C('#f1ece0'), false);
        ctx.fillStyle = C('accent'); for (let i = 0; i < 3; i++) { const b = t.at(.2 + i * .15, 11); ctx.beginPath(); ctx.arc(b[0], b[1], 2, 0, 7); ctx.fill(); }
        const b0 = t.at(.02, -15), b1 = t.at(.02, 15), b2 = t.at(.13, 15), b3 = t.at(.13, -15); poly(ctx, [b0, b1, b2, b3], C('#5a3a22'));
        const bk = t.at(.075, 8); ctx.fillStyle = C('accent'); ctx.fillRect(bk[0] - 3, bk[1] - 3, 6, 6);
        ctx.strokeStyle = C('accent'); ctx.lineWidth = 2; const l0 = t.at(.95, -13), l1 = t.at(.3, -14); ctx.beginPath(); ctx.moveTo(l0[0], l0[1]); ctx.lineTo(l1[0], l1[1]); ctx.stroke();
      },
      armDeco(c, s, e, h) { taper(c.ctx, along(e, h, .55), along(e, h, .85), 11, 10, '#f1ece0', true); },
      head(c) {
        const { C, pz } = c, ctx = headBase(c, C('skin'), true);
        ctx.fillStyle = C('hair'); ctx.beginPath(); ctx.moveTo(-12, -2); ctx.lineTo(-13, 8); ctx.lineTo(-7, 3); ctx.lineTo(-6, -6); ctx.closePath(); ctx.fill();
        face(ctx, pz.face, { eye: '#2a1a12', brow: '#111', noMouth: false, noEye: true });
        // eyepatch + strap
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-12, -6); ctx.lineTo(8.5, -2.5); ctx.stroke(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(5.5, -1.5, 3.8, 3.4, 0, 0, 7); ctx.fill();
        // goatee
        ctx.fillStyle = C('hair'); ctx.beginPath(); ctx.moveTo(4, 10); ctx.lineTo(11, 8); ctx.lineTo(8, 17); ctx.closePath(); ctx.fill();
        // tricorn hat
        ctx.fillStyle = C('#15151f'); ctx.beginPath(); ctx.moveTo(-17, -6); ctx.lineTo(-7, -22); ctx.lineTo(9, -22); ctx.lineTo(19, -7); ctx.quadraticCurveTo(6, -11, -6, -9); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.strokeStyle = C('accent'); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-15, -7); ctx.quadraticCurveTo(2, -12, 17, -8); ctx.stroke();
        ctx.fillStyle = C('#c0272d'); ctx.beginPath(); ctx.arc(-2, -16, 2.4, 0, 7); ctx.fill();
        ctx.restore();
      },
      front(c) {
        const { ctx, J } = c, e = J.eF, h = J.hF; let dx = h[0] - e[0], dy = h[1] - e[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d; const nx = -dy, ny = dx;
        const b = add(h, [dx, dy], 4), tip = add(h, [dx, dy], 76);
        ctx.strokeStyle = OUT; ctx.lineWidth = 5.4; ctx.beginPath(); ctx.moveTo(b[0] - nx * 8, b[1] - ny * 8); ctx.lineTo(b[0] + nx * 8, b[1] + ny * 8); ctx.stroke(); ctx.strokeStyle = c.C('accent'); ctx.lineWidth = 3; ctx.stroke();
        poly(ctx, [add(b, [nx, ny], 3.4), add(tip, [dx, dy], 2), add(b, [nx, ny], -3.4)], c.f.flash > 0 ? '#fff' : '#e4ecf6');
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(b[0] + dx * 6, b[1] + dy * 6); ctx.lineTo(tip[0] - dx * 6, tip[1] - dy * 6); ctx.stroke();
      }
    },
    kick: {
      torso(c) {
        const { ctx, C } = c, t = torsoShape(c, 34, 28, C('top'), 3);
        ctx.fillStyle = 'rgba(0,0,0,.18)'; const n = t.at(.92, 3); ctx.beginPath(); ctx.ellipse(n[0], n[1], 6, 4, 0, 0, 7); ctx.fill();
        const w0 = t.at(-.02, -14), w1 = t.at(-.02, 15), w2 = t.at(.12, 15), w3 = t.at(.12, -14); poly(ctx, [w0, w1, w2, w3], C('suit'));
        ctx.strokeStyle = C('accent'); ctx.lineWidth = 3; const a = t.at(.12, -14), b = t.at(.12, 15); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        const s1 = t.at(.95, 10), s2 = t.at(.3, 12); ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s1[0], s1[1]); ctx.lineTo(s2[0], s2[1]); ctx.stroke();
      },
      armDeco(c, s, e, h) { taper(c.ctx, along(e, h, .1), along(e, h, .8), 12.5, 12, c.C('accent'), true); },
      legDeco(c, hip, k, f) { taper(c.ctx, along(k, f, .15), along(k, f, .75), 12, 8.5, c.C('accent'), true); },
      head(c) {
        const { C, pz } = c, ctx = headBase(c, C('skin'), true);
        ctx.fillStyle = C('hair'); ctx.beginPath(); ctx.moveTo(-12, 2); ctx.lineTo(-13, -8); ctx.lineTo(-7, -14); ctx.lineTo(-1, -20); ctx.lineTo(4, -13); ctx.lineTo(10, -15); ctx.lineTo(12, -8); ctx.lineTo(5, -7); ctx.lineTo(-4, -4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.4; ctx.stroke();
        face(ctx, pz.face, { eye: '#2a5a3a', brow: '#3a2414' });
        ctx.fillStyle = 'rgba(60,40,20,.35)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(2 + i * 1.8, 9 + (i % 2) * 2, .8, 0, 7); ctx.fill(); }
        ctx.restore();
      }
    },
    brawler: {
      torso(c) {
        const { ctx, d, C, J } = c, t = torsoShape(c, 42, 32, C('skin'), 5);
        // pecs / abs shading
        ctx.strokeStyle = 'rgba(70,30,10,.55)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        const p1 = t.at(.62, 8), p2 = t.at(.62, -2), p3 = t.at(.78, 14);
        ctx.beginPath(); ctx.moveTo(t.at(.8, 4)[0], t.at(.8, 4)[1]); ctx.quadraticCurveTo(p1[0] + 4, p1[1] + 2, t.at(.5, 12)[0], t.at(.5, 12)[1]); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(t.at(.82, 0)[0], t.at(.82, 0)[1]); ctx.lineTo(t.at(.22, 3)[0], t.at(.22, 3)[1]); ctx.stroke();
        for (let i = 0; i < 3; i++) { const a = t.at(.3 + i * .14, 3), b = t.at(.3 + i * .14, 12); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
        // trousers waist + sash
        const w0 = t.at(-.12, -17), w1 = t.at(-.12, 18), w2 = t.at(.2, 17), w3 = t.at(.2, -17); poly(ctx, [w0, w1, w2, w3], C('suit'));
        const s0 = t.at(.12, -17), s1 = t.at(.12, 18), s2 = t.at(.24, 17), s3 = t.at(.24, -17); poly(ctx, [s0, s1, s2, s3], C('accent'));
        const k = t.at(.16, 14); poly(ctx, [k, add(k, [3, 22]), add(k, [9, 20]), add(k, [9, 2])], C('accent'));
      },
      armDeco(c, s, e, h) { const { ctx, C } = c; taper(ctx, along(e, h, .1), along(e, h, .6), 14, 13.5, '#ece0c0', true); },
      legDeco(c, hip, k, f) {},
      head(c) {
        const { d, C, pz, T } = c, ctx = headBase(c, C('skin'), true);
        // spiky black hair
        ctx.fillStyle = C('hair'); ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-17, -9); ctx.lineTo(-9, -8); ctx.lineTo(-10, -18); ctx.lineTo(-2, -13); ctx.lineTo(2, -21); ctx.lineTo(6, -13); ctx.lineTo(13, -15); ctx.lineTo(11, -7); ctx.lineTo(6, -6); ctx.lineTo(-4, -5); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.4; ctx.stroke();
        // headband
        ctx.fillStyle = C('accent'); ctx.beginPath(); ctx.moveTo(-12.5, -6.5); ctx.lineTo(12.5, -8); ctx.lineTo(12.5, -4.6); ctx.lineTo(-12.5, -3.2); ctx.closePath(); ctx.fill(); ctx.stroke();
        const sw = Math.sin(T * 8) * 3; poly(ctx, [[-12, -5], [-24, -7 + sw], [-30, 1 + sw], [-21, 0 + sw], [-12, -2]], C('accent'));
        face(ctx, pz.face, { eye: '#3a2a1a', brow: '#111' });
        // scar
        ctx.strokeStyle = 'rgba(120,40,30,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(8, -5); ctx.lineTo(11, 3); ctx.stroke();
        ctx.restore();
      }
    },
    monk: {
      back(c) {
        const { ctx, J, T, f, C } = c, h = J.hip, sw = Math.sin(T * 6 + f.idx) * 3, wv = f.wd > 0 ? -4 : 0;
        poly(ctx, [[h[0] - 3, h[1] - 8], [h[0] - 22 + sw + wv, h[1] + 12], [h[0] - 32 + sw * 1.3 + wv, h[1] + 32], [h[0] - 18 + wv, h[1] + 26], [h[0] - 4, h[1] + 2]], C('accent'));
        poly(ctx, [[h[0] - 1, h[1] - 6], [h[0] - 12, h[1] + 18 + sw], [h[0] - 4, h[1] + 36], [h[0] + 3, h[1] + 14]], c.f.flash > 0 ? '#fff' : shade(c.d.accent, -.25));
      },
      torso(c) {
        const { ctx, d, C, J } = c, t = torsoShape(c, 40, 32, C('skin'), 5);
        ctx.lineCap = 'round';
        // open crimson vest
        poly(ctx, [t.at(.96, 7), t.at(.96, 16.5), t.at(.1, 15), t.at(.1, 6)], C('suit'));
        poly(ctx, [t.at(.96, -16.5), t.at(.96, -7), t.at(.1, -6), t.at(.1, -15)], C('suit'));
        ctx.strokeStyle = 'rgba(70,30,10,.5)'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) { const a = t.at(.28 + i * .15, -1), b = t.at(.28 + i * .15, 7); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
        const m0 = t.at(.78, 1), m1 = t.at(.2, 2); ctx.beginPath(); ctx.moveTo(m0[0], m0[1]); ctx.lineTo(m1[0], m1[1]); ctx.stroke();
        // trousers waistband + gold sash
        poly(ctx, [t.at(-.1, -17), t.at(-.1, 18), t.at(.1, 17), t.at(.1, -17)], C('dark'));
        poly(ctx, [t.at(.08, -17), t.at(.08, 18), t.at(.22, 17), t.at(.22, -17)], C('accent'));
        // prayer beads
        const a = t.at(.99, -6), b = t.at(.99, 10), m = t.at(.42, 5);
        for (let i = 0; i <= 8; i++) { const u = i / 8, x = (1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * m[0] + u * u * b[0], y = (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * m[1] + u * u * b[1]; ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); ctx.fillStyle = i % 4 === 2 ? C('accent') : C('#7a3b12'); ctx.beginPath(); ctx.arc(x, y, 2.1, 0, 7); ctx.fill(); }
      },
      armDeco(c, s, e, h, back) { const { ctx, C } = c; taper(ctx, along(e, h, .12), along(e, h, .78), 13.5, 12.5, back ? shade(c.d.accent, -.25) : C('accent'), true); },
      legDeco(c, hip, k, f, back) { const { ctx, C } = c; taper(ctx, along(k, f, .5), along(k, f, .88), 13.5, 11.5, back ? shade(c.d.accent, -.3) : C('accent'), true); },
      head(c) {
        const { d, C, pz, T, f } = c, ctx = headBase(c, C('skin'), true);
        // flame topknot
        const fl = Math.sin(T * 11 + f.idx), fl2 = Math.sin(T * 15 + 1.3);
        ctx.fillStyle = C('hair'); ctx.beginPath(); ctx.moveTo(-6, -11); ctx.quadraticCurveTo(-10, -22, -2 + fl, -31 - fl2 * 2); ctx.quadraticCurveTo(1, -22, 5 + fl2, -28); ctx.quadraticCurveTo(10, -19, 7, -11); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.3; ctx.stroke();
        ctx.fillStyle = c.f.flash > 0 ? '#fff' : '#ffe27a'; ctx.beginPath(); ctx.moveTo(-3, -12); ctx.quadraticCurveTo(-4, -19, 0 + fl * .6, -23); ctx.quadraticCurveTo(3, -18, 3, -12); ctx.fill();
        // forehead marks + cheek flame tattoo
        ctx.fillStyle = 'rgba(190,40,25,.85)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-1 + i * 4.4, -8.5 + (i === 1 ? -1 : 0), 1.4, 0, 7); ctx.fill(); }
        ctx.beginPath(); ctx.moveTo(6, 4); ctx.lineTo(9, -1); ctx.lineTo(10, 5); ctx.lineTo(8, 8); ctx.closePath(); ctx.fill();
        face(ctx, pz.face, { eye: '#c2410c', brow: '#1a0f08' });
        // thick brow ridge + short beard
        ctx.fillStyle = 'rgba(40,20,10,.55)'; ctx.beginPath(); ctx.moveTo(4, 9); ctx.quadraticCurveTo(8, 16, 12, 8); ctx.lineTo(10, 8); ctx.quadraticCurveTo(8, 12, 5, 8); ctx.fill();
        ctx.restore();
      },
      front(c) {
        const { ctx, J, T, f, pz } = c, atk = f.st === 'atk' && pz.face === 'a', s = atk ? 12 : 5;
        flame(ctx, J.hF, T, s, '#ffd23f', '#ff6a1a', 0); flame(ctx, J.hB, T, s * .8, '#ffd23f', '#ff6a1a', 2);
        if (atk) flame(ctx, J.fF, T, 11, '#ffd23f', '#ff6a1a', 4);
      }
    },
    frost: {
      back(c) {
        const { ctx, J, T, f, C } = c; ctx.save(); ctx.translate(J.Hc[0], J.Hc[1]); ctx.rotate(J.ha);
        const air = f.st === 'air' || f.st === 'launch', lift = air ? (f.vy > 0 ? -10 : 8) : 0, run = f.wd > 0 ? 8 : 0, n = 7, top = [], bot = [];
        for (let i = 0; i <= n; i++) { const u = i / n, wave = Math.sin(T * 4.5 + i * .8 + f.idx) * (1 + u * 3.5); const x = -7 - u * (26 + run) - wave * .4, y = -2 + u * (36 - lift) + wave; top.push([x, y - 8 * (1 - u * .55)]); bot.push([x + 5, y + 9 * (1 - u * .4)]); }
        poly(ctx, [[-3, -12]].concat(top, bot.reverse(), [[5, 6]]), C('hair'));
        ctx.strokeStyle = 'rgba(80,110,190,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(top[1][0], top[1][1] + 6); ctx.lineTo(top[n][0] + 2, top[n][1] + 8); ctx.stroke();
        ctx.restore();
      },
      torso(c) {
        const { ctx, d, C, J, T, f } = c, t = torsoShape(c, 30, 24, C('suit'), 2), h = J.hip, sw = Math.sin(T * 4 + f.idx) * 2.5;
        // skirt
        poly(ctx, [[h[0] - 13, h[1] - 6], [h[0] + 15, h[1] - 6], [h[0] + 24 + sw, h[1] + 30], [h[0] + 8, h[1] + 37 + sw * .4], [h[0] - 8, h[1] + 35], [h[0] - 22 - sw, h[1] + 28]], C('suit'));
        ctx.strokeStyle = C('dark'); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(h[0] - 22 - sw, h[1] + 28); ctx.lineTo(h[0] - 8, h[1] + 35); ctx.lineTo(h[0] + 8, h[1] + 37 + sw * .4); ctx.lineTo(h[0] + 24 + sw, h[1] + 30); ctx.stroke();
        // waist sash + bow
        poly(ctx, [t.at(.02, -13), t.at(.02, 13), t.at(.16, 13), t.at(.16, -13)], C('dark'));
        const bw = t.at(.09, -13); poly(ctx, [bw, add(bw, [-12, -3 + sw]), add(bw, [-16, 10 + sw]), add(bw, [-5, 6])], C('accent'));
        // fur collar
        const col = t.at(.96, 0); ctx.fillStyle = C('#ffffff'); ctx.beginPath(); ctx.ellipse(col[0], col[1], 17, 6, J.lean, 0, 7); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.stroke();
        // snowflake emblem
        const e = t.at(.58, 5); ctx.strokeStyle = C('accent'); ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3 + .3; ctx.beginPath(); ctx.moveTo(e[0] - Math.cos(a) * 6, e[1] - Math.sin(a) * 6); ctx.lineTo(e[0] + Math.cos(a) * 6, e[1] + Math.sin(a) * 6); ctx.stroke(); }
      },
      armDeco(c, s, e, h) { taper(c.ctx, along(e, h, .12), along(e, h, .6), 11, 10, c.C('accent'), true); },
      legDeco(c, hip, k, f) { taper(c.ctx, along(k, f, .62), along(k, f, .92), 12.5, 12, c.C('#eaf8ff'), true); },
      head(c) {
        const { C, pz, T, f } = c, ctx = headBase(c, C('skin'), true);
        // hair cap + side-swept bangs
        ctx.fillStyle = C('hair'); ctx.beginPath(); ctx.moveTo(-12, 4); ctx.lineTo(-13.5, -6); ctx.bezierCurveTo(-12, -17, 6, -19, 12, -8); ctx.lineTo(12.5, -3); ctx.lineTo(8, -7); ctx.lineTo(5.5, -1); ctx.lineTo(2, -8); ctx.lineTo(-3, -3); ctx.lineTo(-6, 5); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.4; ctx.stroke();
        // ice-crystal tiara
        const cc = c.f.flash > 0 ? '#fff' : '#8ff0ff'; ctx.fillStyle = cc; ctx.strokeStyle = OUT; ctx.lineWidth = 1;
        for (const [x, h] of [[-5, 8], [0, 13], [5, 9]]) { ctx.beginPath(); ctx.moveTo(x - 2.4, -15); ctx.lineTo(x, -15 - h); ctx.lineTo(x + 2.4, -15); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        face(ctx, pz.face, { eye: '#52c8ff', brow: '#6a7fb0' });
        // lip + cold blush
        ctx.fillStyle = 'rgba(120,200,255,.28)'; ctx.beginPath(); ctx.arc(3, 5, 3.2, 0, 7); ctx.fill();
        ctx.restore();
      }
    },
  };
  // ------------------------------------------------------------------ CLASS LOOKS (classes.js): samurai / warlord / ranger / arcanist
  LOOKS.samurai  = { arm: [27, 27], aw: [13, 11, 9], leg: { thigh: 'dark', shin: 'dark', foot: '#2a1a12' }, armCol: ['suit', 'suit', 'skin'], lw: [16, 12.5], torsoW: [34, 28], blade: 90 };
  LOOKS.warlord  = { arm: [27, 27], aw: [15, 13.5, 12.5], leg: { thigh: 'dark', shin: 'suit', foot: 'dark' }, armCol: ['suit', 'suit', 'accent'], lw: [18, 14], torsoW: [40, 32], blade: 106 };
  LOOKS.ranger   = { arm: [27, 27], aw: [11, 9.5, 8.5], leg: { thigh: 'dark', shin: 'suit', foot: '#3a2514' }, armCol: ['suit', 'skin', 'skin'], lw: [14.5, 11.5], torsoW: [28, 23] };
  LOOKS.arcanist = { arm: [27, 27], aw: [12, 10, 9], leg: { thigh: 'dark', shin: 'dark', foot: '#2a2040' }, armCol: ['suit', 'suit', 'skin'], lw: [15, 12], torsoW: [28, 23] };
  STANCE.samurai  = [-4, -66, .10, 0, 40, -116, 14, -100, 26, 0, -24, 0];     // blade up and forward
  STANCE.warlord  = [-3, -64, .08, 0, 36, -112, 14, -104, 28, 0, -26, 0];     // wide, heavy guard
  STANCE.ranger   = [-5, -66, .10, 0, 34, -104, 12, -102, 22, 0, -22, 0];     // bow arm out
  STANCE.arcanist = [-4, -67, .08, 0, 28, -116, 12, -108, 18, 0, -20, 0];     // staff held high

  HOOKS.samurai = {
    back(c) { const { ctx, J } = c, h = J.hip; taper(ctx, [h[0] - 6, h[1] - 12], [h[0] - 36, h[1] + 24], 5.5, 4.5, '#2a1a12', true); taper(ctx, [h[0] - 6, h[1] - 12], [h[0] - 12, h[1] - 6], 6.5, 6, c.C('accent'), true); },   // scabbard
    torso(c) {
      const { ctx, C } = c, t = torsoShape(c, 34, 28, C('suit'), 3);
      poly(ctx, [t.at(.98, 11), t.at(.98, -4), t.at(.5, 5)], C('#f1ece0'), false);                              // inner collar
      poly(ctx, [t.at(.02, -15), t.at(.02, 15), t.at(.14, 15), t.at(.14, -15)], C('dark'));                     // obi sash
      const k = t.at(.08, 9); ctx.fillStyle = C('accent'); ctx.fillRect(k[0] - 3, k[1] - 3, 6, 6);
      const e = t.at(.62, -7); ctx.fillStyle = C('accent'); ctx.beginPath(); ctx.arc(e[0], e[1], 3.2, 0, 7); ctx.fill();   // clan crest
    },
    armDeco(c, s, e, h) { taper(c.ctx, along(e, h, .08), along(e, h, .5), 16, 13, c.C('dark'), true); },        // wide sleeve
    legDeco(c, hip, k, f) { taper(c.ctx, along(hip, k, .08), along(k, f, .5), 22, 17, c.C('suit'), true); },    // hakama
    head(c) {
      const { C, pz, T, f } = c, ctx = headBase(c, C('skin'), true), sw = Math.sin(T * 5 + f.idx) * 2;
      ctx.fillStyle = C('hair'); ctx.beginPath(); ctx.moveTo(-12, 4); ctx.lineTo(-13.5, -6); ctx.bezierCurveTo(-12, -17, 6, -19, 12, -8); ctx.lineTo(10, -5); ctx.lineTo(4, -9); ctx.lineTo(-3, -4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-9, -16, 5.5, 4.5, -.3, 0, 7); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.stroke();   // top-knot
      face(ctx, pz.face, { eye: '#2a1a12', brow: '#111' });
      ctx.strokeStyle = C('accent'); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-13, -6); ctx.lineTo(12.5, -8); ctx.stroke();      // headband
      poly(ctx, [[-13, -6], [-24 + sw, -3], [-21 + sw, 3], [-12, -3]], C('accent'));
      ctx.restore();
    }
  };

  HOOKS.warlord = {
    back(c) { cape(c, c.d.cape, '#4a1010', 58); },
    torso(c) {
      const { ctx, C } = c, t = torsoShape(c, 40, 32, C('suit'), 5);
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.6; ctx.beginPath();
      for (const u of [.3, .64]) { const a = t.at(u, -14), b = t.at(u, 14); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.stroke();   // plate seams
      poly(ctx, [t.at(.02, -17), t.at(.02, 17), t.at(.13, 17), t.at(.13, -17)], C('dark'));
      const bk = t.at(.075, 6); ctx.fillStyle = C('accent'); ctx.fillRect(bk[0] - 4, bk[1] - 4, 8, 8);
      const em = t.at(.7, 4); ctx.fillStyle = C('accent'); ctx.beginPath(); ctx.arc(em[0], em[1], 4.5, 0, 7); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.stroke();
    },
    armDeco(c, s, e, h) { const { ctx } = c; ball(ctx, s, 12.5, c.C('dark')); ball(ctx, s, 8, c.C('accent')); taper(ctx, along(e, h, .1), along(e, h, .72), 15.5, 13.5, c.C('suit'), true); },   // pauldron + gauntlet
    legDeco(c, hip, k, f) { const { ctx } = c; taper(ctx, along(k, f, .05), along(k, f, .85), 14.5, 12, c.C('suit'), true); ball(ctx, k, 8.5, c.C('accent')); },                          // greave + knee guard
    head(c) {
      const { C, T, f } = c, ctx = headBase(c, C('skin'), false), sw = Math.sin(T * 6 + f.idx) * 3;
      poly(ctx, [[-4, -17], [-14 + sw, -30], [-26 + sw, -22 + sw * .4], [-16, -12]], C('#c0272d'));              // plume
      ctx.fillStyle = C('suit'); ctx.beginPath(); ctx.ellipse(0, -1, 14.5, 15.5, 0, 0, 7); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.stroke();   // great helm
      ctx.fillStyle = C('dark'); ctx.fillRect(-1, -6, 15, 5);                                                     // visor slit
      ctx.fillStyle = f.flash > 0 ? '#fff' : '#ff6a3a'; ctx.fillRect(3, -5, 8, 2.6);
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(9, -1); ctx.lineTo(9, 13); ctx.moveTo(1, 3); ctx.lineTo(1, 14); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.ellipse(-4, -8, 6, 4, -.5, 0, 7); ctx.fill();
      ctx.restore();
    }
  };

  HOOKS.ranger = {
    back(c) {
      const { ctx, J, C } = c, S = J.S; cape(c, c.d.cape, '#173022', 36);
      taper(ctx, [S[0] - 6, S[1] + 4], [S[0] - 20, S[1] - 26], 8.5, 7.5, '#5a3a22', true);                      // quiver
      ctx.strokeStyle = C('accent'); ctx.lineWidth = 2; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(S[0] - 20 + i * 3, S[1] - 27); ctx.lineTo(S[0] - 24 + i * 4, S[1] - 36); ctx.stroke(); }
    },
    torso(c) {
      const { ctx, C } = c, t = torsoShape(c, 30, 24, C('suit'), 2);
      poly(ctx, [t.at(.02, -13), t.at(.02, 13), t.at(.14, 13), t.at(.14, -13)], C('#5a3a22'));
      const bk = t.at(.08, 0); ctx.fillStyle = C('accent'); ctx.fillRect(bk[0] - 3, bk[1] - 3, 6, 6);
      ctx.strokeStyle = C('#5a3a22'); ctx.lineWidth = 3.2; const a = t.at(.96, -12), b = t.at(.12, 11); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();   // quiver strap
    },
    armDeco(c, s, e, h) { taper(c.ctx, along(e, h, .35), along(e, h, .9), 10.5, 9.5, c.C('#5a3a22'), true); },    // bracer
    legDeco(c, hip, k, f) { taper(c.ctx, along(k, f, .5), along(k, f, .96), 12.5, 11.5, c.C('#5a3a22'), true); },  // boots
    head(c) {
      const { C, pz, T, f } = c, ctx = headBase(c, C('skin'), true), sw = Math.sin(T * 5 + f.idx) * 2.5;
      taper(ctx, [-9, 0], [-24 + sw, 20 + sw], 5, 3.5, C('hair'), true);                                         // braid
      ctx.fillStyle = C('hair'); ctx.beginPath(); ctx.moveTo(-11, 5); ctx.lineTo(-12, -4); ctx.bezierCurveTo(-8, -12, 4, -13, 11, -6); ctx.lineTo(9, -4); ctx.lineTo(3, -7); ctx.lineTo(-3, -3); ctx.closePath(); ctx.fill();
      face(ctx, pz.face, { eye: '#2f9a58', brow: '#7a3a14' });
      ctx.fillStyle = C('suit'); ctx.beginPath(); ctx.moveTo(-15, 9); ctx.bezierCurveTo(-20, -18, 2, -26, 14, -9); ctx.lineTo(10, -6); ctx.quadraticCurveTo(0, -12, -6, -3); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();   // hood
      ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.ellipse(-3, -14, 6, 3, -.3, 0, 7); ctx.fill();
      ctx.restore();
    }
  };

  HOOKS.arcanist = {
    back(c) { const { ctx, J, T, f, C } = c, h = J.hip, sw = Math.sin(T * 4 + f.idx) * 2.5; poly(ctx, [[h[0] - 4, h[1] - 34], [h[0] - 30 + sw, h[1] + 38], [h[0] - 4, h[1] + 42], [h[0] + 4, h[1] - 20]], C('dark')); },
    torso(c) {
      const { ctx, C, J, T, f } = c, t = torsoShape(c, 30, 26, C('suit'), 2), h = J.hip, sw = Math.sin(T * 4 + f.idx) * 2.5;
      poly(ctx, [[h[0] - 14, h[1] - 6], [h[0] + 16, h[1] - 6], [h[0] + 24 + sw, h[1] + 34], [h[0] + 6, h[1] + 40 + sw * .4], [h[0] - 8, h[1] + 38], [h[0] - 22 - sw, h[1] + 32]], C('suit'));   // robe
      ctx.strokeStyle = C('accent'); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(h[0] - 22 - sw, h[1] + 32); ctx.lineTo(h[0] - 8, h[1] + 38); ctx.lineTo(h[0] + 6, h[1] + 40 + sw * .4); ctx.lineTo(h[0] + 24 + sw, h[1] + 34); ctx.stroke();
      poly(ctx, [t.at(.02, -13), t.at(.02, 13), t.at(.13, 13), t.at(.13, -13)], C('accent'));
      const e = t.at(.6, 4); ctx.fillStyle = C('accent'); ctx.beginPath();                                       // star emblem
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 2.6 : 6, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(e[0] + Math.cos(a) * r, e[1] + Math.sin(a) * r); } ctx.closePath(); ctx.fill();
    },
    armDeco(c, s, e, h) { taper(c.ctx, along(e, h, .05), along(e, h, .65), 17, 12.5, c.C('suit'), true); taper(c.ctx, along(e, h, .6), along(e, h, .78), 13.5, 13, c.C('accent'), true); },   // wide sleeve + cuff
    head(c) {
      const { C, pz, T, f } = c, ctx = headBase(c, C('skin'), true), sw = Math.sin(T * 5 + f.idx) * 2;
      ctx.fillStyle = C('hair'); ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(-15, 22 + sw); ctx.lineTo(-6, 18); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.stroke();
      face(ctx, pz.face, { eye: f.flash > 0 ? '#fff' : '#7cf3ff', brow: '#8a90b0' });
      ctx.fillStyle = C('suit'); ctx.beginPath(); ctx.moveTo(-17, -9); ctx.quadraticCurveTo(-4, -4, 17, -9); ctx.lineTo(10, -14); ctx.quadraticCurveTo(6, -30, -4 + sw, -46 + sw * .5); ctx.quadraticCurveTo(-8, -26, -10, -14); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();   // wizard hat
      ctx.strokeStyle = C('accent'); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-10.5, -13); ctx.quadraticCurveTo(0, -10, 10.5, -13); ctx.stroke();
      ctx.fillStyle = C('accent'); ctx.beginPath(); ctx.arc(-4 + sw, -46 + sw * .5, 2.4, 0, 7); ctx.fill();
      ctx.restore();
    }
  };

  // ------------------------------------------------------------------ HELD WEAPONS (d.weapon): drawn on the front hand, pointing along the forearm
  function drawWeapon(c) {
    const { ctx, J, d, f, T } = c, wp = d.weapon, h = J.hF, e = J.eF, fl = f.flash > 0;
    let dx = h[0] - e[0], dy = h[1] - e[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    const nx = -dy, ny = dx, P = (u, v) => [h[0] + dx * u + nx * v, h[1] + dy * u + ny * v];
    const steel = fl ? '#fff' : '#e4ecf5', steelD = fl ? '#fff' : '#9fb0c4', wood = fl ? '#fff' : '#6b4526', gold = fl ? '#fff' : (d.accent || '#d9a93a');
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const blade = (len, w0, w1, curve, u0) => {
      poly(ctx, [P(u0, -w0 / 2), P(len * .9, -w1 / 2 + curve * .6), P(len + 5, curve), P(len * .9, w1 / 2 + curve * .6), P(u0, w0 / 2)], steel);
      const a = P(u0 + 4, w0 * .2), b = P(len * .9, w1 * .15 + curve * .6); ctx.strokeStyle = steelD; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    };
    if (wp === 'long' || wp === 'short' || wp === 'heavy') {
      const heavy = wp === 'heavy', gl = heavy ? 15 : wp === 'long' ? 8 : 6, g0 = heavy ? 10 : 7;
      taper(ctx, P(heavy ? -20 : -16, 0), P(g0, 0), 4.2, 4.2, wood, true);                                       // grip
      if (wp === 'long') blade(90, 5.5, 3.6, 5, 8); else if (wp === 'short') blade(46, 7, 5, 1, 6);
      else { blade(106, 14, 10, 0, 10); ctx.strokeStyle = steelD; ctx.lineWidth = 2.4; const a = P(16, 0), b = P(94, 0); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      taper(ctx, P(g0, -gl), P(g0, gl), heavy ? 5 : 3.4, heavy ? 5 : 3.4, gold, true);                           // cross-guard
      ball(ctx, P(heavy ? -22 : -17, 0), heavy ? 4.2 : 3.2, gold);                                                // pommel
    } else if (wp === 'bow') {
      const tl = .1, ux = Math.sin(tl), uy = -Math.cos(tl), fx = Math.cos(tl), fy = Math.sin(tl);
      const B = (s, b) => [h[0] + ux * s * 40 + fx * b, h[1] + uy * s * 40 + fy * b];
      const top = B(1, -8), bot = B(-1, -8), ctl = B(0, 34);
      const pull = f.st === 'atk' && f.atk && f.atk.m && f.atk.m.proj && f.atk.t <= f.atk.m.st + 3, nock = pull ? B(0, -30) : B(0, -8);
      ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.quadraticCurveTo(ctl[0], ctl[1], bot[0], bot[1]); ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = fl ? '#fff' : '#8a5a2b'; ctx.lineWidth = 3.6; ctx.stroke();
      ctx.strokeStyle = fl ? '#fff' : '#f4f0d8'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(nock[0], nock[1]); ctx.lineTo(bot[0], bot[1]); ctx.stroke();
      if (pull) { const tip = [nock[0] + fx * 46, nock[1] + fy * 46]; ctx.strokeStyle = fl ? '#fff' : '#a77a4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(nock[0], nock[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke(); ctx.fillStyle = steel; ctx.beginPath(); ctx.arc(tip[0], tip[1], 2.6, 0, 7); ctx.fill(); }
    } else if (wp === 'staff') {
      const top = P(84, 0), mf = d.mana ? clamp(f.mana / d.mana, 0, 1) : 1, col = fl ? '#fff' : (d.accent || '#7cf3ff');
      taper(ctx, P(-26, 0), top, 3.6, 3.6, wood, true); ball(ctx, P(68, 0), 3.4, gold);
      taper(ctx, P(76, -3), P(93, -10), 2.6, 1.8, gold, true); taper(ctx, P(76, 3), P(93, 10), 2.6, 1.8, gold, true);   // prongs
      const R = 11 + Math.sin(T * 6) * 1.5; ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(top[0], top[1], 1, top[0], top[1], R * 2.2); g.addColorStop(0, rgba(col, .75 * (.35 + .65 * mf))); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(top[0], top[1], R * 2.2, 0, 7); ctx.fill(); ctx.restore();   // glow = how much mana is left
      ball(ctx, top, 6.5, col); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(top[0] - 1.6, top[1] - 1.6, 2.2, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  // flowing cape (Thunder Lord)
  function cape(c, col, colDark, len) {
    const { ctx, J, T, f, C } = c; if (!col) return;
    const sh = J.S, wind = f.wd > 0 || (f.st === 'dash' && f.wd > 0) ? 1 : f.wd < 0 ? -.5 : 0, air = f.st === 'air' || f.st === 'launch';
    const lift = air ? (f.vy > 0 ? -1 : .6) : 0, n = 6, top = [], bot = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, wave = Math.sin(T * 6 + i * .8 + f.idx) * (1.5 + u * 3.5);
      const x = sh[0] - 8 - u * (len * (.55 + wind * .35)) + wave * .4, y = sh[1] + 6 + u * len * (.8 - wind * .25 - lift * .7) + wave * (air ? 2 : 1) - (air && lift < 0 ? u * u * 40 : 0);
      top.push([x, y - (3 + u * 5)]); bot.push([x - 5 + u * 2, y + 4 + u * 6]);
    }
    const pts = [[sh[0] - 2, sh[1] + 2]].concat(top, bot.reverse(), [[sh[0] - 12, sh[1] - 4]]);
    poly(c.ctx, pts, C(col)); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(top[1][0], top[1][1]); ctx.lineTo(top[n][0] - 3, top[n][1] + 6); ctx.stroke();
  }

  // ------------------------------------------------------------------ portrait (HUD / select screen)
  function portrait(ctx, def, x, y, r, T) {
    FLASH = false; CUR_T = T || 0; CUR_SEED = 0;
    const look = LOOKS[def.look] || LOOKS.thunder;
    const f = { def, idx: 0, x: 0, y: 0, facing: 1, st: 'stand', sf: 0, atk: null, guard: 0, wd: 0, anim: 0, flash: 0, rage: 0, vy: 0, tb: 0, crouchHit: 0 };
    const pz = { v: P.stand, rot: 0, off: [0, 0], face: 'n' }, J = solve(pz.v, 0, [0, 0], look);
    ctx.save(); ctx.translate(x, y); const k = r / 15; ctx.scale(k, k); ctx.translate(-J.Hc[0], -J.Hc[1] - 2);
    const o = { ctx, J, d: def, look, C: c => def[c] || c, T: T || 0, f, pz }; (HOOKS[def.look] || HOOKS.thunder).head(o); ctx.restore();
  }

  G.Sprites = { draw, portrait, poseOf, P, solve, LOOKS };
})();
