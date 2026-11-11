// Camera, stages (parallax backgrounds), projectiles and all visual effects. Client only.
Game.World = (function () {
  const G = Game, W = G.W, H = G.H, GR = G.GROUND;
  const cam = { x: G.STAGE_W / 2, zoom: 1.15, tx: G.STAGE_W / 2, tz: 1.15 };
  let parts = [], texts = [], shake = 0, flash = null, sup = null, T = 0, trails = [[], []], zoomPunch = 0, kick = 0, cracks = [], conf = [], burst = null;
  const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), pick = a => a[Math.floor(Math.random() * a.length)];

  // ---------------------------------------------------------------- camera
  function updateCam(fs, snap) {
    const mid = (fs[0].x + fs[1].x) / 2, dist = Math.abs(fs[0].x - fs[1].x);
    cam.tz = clamp(690 / (dist + 250), 1, 1.32) + zoomPunch; cam.tx = mid;
    const k = snap ? 1 : .14; cam.zoom += (cam.tz - cam.zoom) * k;
    const half = W / 2 / cam.zoom; cam.tx = clamp(cam.tx, half, G.STAGE_W - half); cam.x += (cam.tx - cam.x) * k;
    zoomPunch *= .9;
  }
  function begin(ctx) {
    ctx.save(); const sx = shake > .3 ? (Math.random() - .5) * shake : 0, sy = shake > .3 ? (Math.random() - .5) * shake : 0;
    ctx.translate(W / 2 + sx, GR + sy); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-(cam.x + kick), -GR);
  }
  function end(ctx) { ctx.restore(); }

  // ---------------------------------------------------------------- stages
  const STAGE = {
    dojo(ctx, p, t) {
      const g = ctx.createLinearGradient(0, 0, 0, GR); g.addColorStop(0, '#2b1f4e'); g.addColorStop(.5, '#c4566b'); g.addColorStop(1, '#ffb36b'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      p(.05, () => { const r = ctx.createRadialGradient(560, 240, 10, 560, 240, 200); r.addColorStop(0, 'rgba(255,236,170,1)'); r.addColorStop(.25, 'rgba(255,200,120,.9)'); r.addColorStop(1, 'rgba(255,150,100,0)'); ctx.fillStyle = r; ctx.fillRect(300, 0, 500, 450); });
      p(.12, () => { ctx.fillStyle = '#5a3a63'; mount(ctx, [[-100, GR], [80, 230], [220, 290], [380, 200], [560, 300], [720, 220], [900, 290], [1100, GR]]); });
      p(.25, () => { ctx.fillStyle = '#3a2548'; mount(ctx, [[-100, GR], [60, 300], [200, 340], [300, 270], [460, 350], [620, 280], [800, 340], [1000, GR]]);
        // pagoda
        ctx.fillStyle = '#25162f'; for (let i = 0; i < 4; i++) { const w = 120 - i * 22, y = 300 - i * 34; ctx.fillRect(250 - w / 4, y, w / 2, 30); ctx.beginPath(); ctx.moveTo(250 - w / 2 - 14, y); ctx.lineTo(250, y - 18); ctx.lineTo(250 + w / 2 + 14, y); ctx.fill(); }
        ctx.fillRect(247, 150, 6, 30); });
      p(.5, () => { // dojo wall + lanterns
        ctx.fillStyle = '#4a2a1e'; ctx.fillRect(-200, 330, 1400, 70); ctx.fillStyle = '#6b3d28'; for (let x = -200; x < 1200; x += 110) ctx.fillRect(x, 300, 14, 100);
        ctx.fillStyle = '#35201a'; ctx.fillRect(-200, 296, 1400, 10);
        for (let x = 60; x < 1100; x += 220) { const sw = Math.sin(t * 1.5 + x) * 3; ctx.strokeStyle = '#222'; ctx.beginPath(); ctx.moveTo(x, 306); ctx.lineTo(x + sw, 326); ctx.stroke(); const rg = ctx.createRadialGradient(x + sw, 340, 2, x + sw, 340, 36); rg.addColorStop(0, 'rgba(255,170,60,.55)'); rg.addColorStop(1, 'rgba(255,170,60,0)'); ctx.fillStyle = rg; ctx.fillRect(x - 40, 300, 90, 80); ctx.fillStyle = '#e0452f'; ctx.beginPath(); ctx.ellipse(x + sw, 340, 11, 15, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ffd37a'; ctx.fillRect(x + sw - 6, 336, 12, 3); } });
    },
    neon(ctx, p, t) {
      const g = ctx.createLinearGradient(0, 0, 0, GR); g.addColorStop(0, '#070514'); g.addColorStop(.6, '#2a1050'); g.addColorStop(1, '#6a1f7a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      p(.04, () => { ctx.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { const x = (i * 97) % 900 - 50, y = (i * 53) % 200; ctx.globalAlpha = .3 + .4 * Math.abs(Math.sin(t + i)); ctx.fillRect(x, y, 2, 2); } ctx.globalAlpha = 1; });
      p(.15, () => { for (let i = 0; i < 11; i++) { const x = i * 90 - 60, h = 140 + (i * 67) % 120; ctx.fillStyle = '#150a30'; ctx.fillRect(x, GR - h, 70, h); for (let y = GR - h + 10; y < GR - 10; y += 16) for (let xx = x + 8; xx < x + 62; xx += 14) if ((xx * y + i) % 7 > 2) { ctx.fillStyle = (xx + y) % 5 ? 'rgba(120,200,255,.5)' : 'rgba(255,120,200,.5)'; ctx.fillRect(xx, y, 6, 8); } } });
      p(.4, () => { for (let i = 0; i < 7; i++) { const x = i * 170 - 80, h = 200 + (i * 41) % 90; ctx.fillStyle = '#0b0620'; ctx.fillRect(x, GR - h, 120, h);
        const col = ['#ff3bd4', '#3be8ff', '#ffe03b'][i % 3], fl = Math.sin(t * 6 + i * 2) > -.7 ? 1 : .35; ctx.shadowColor = col; ctx.shadowBlur = 18 * fl; ctx.fillStyle = col; ctx.globalAlpha = fl; ctx.fillRect(x + 20, GR - h + 30 + (i % 3) * 30, 80, 8); ctx.fillRect(x + 20, GR - h + 60 + (i % 3) * 30, 8, 40); ctx.globalAlpha = 1; ctx.shadowBlur = 0; } });
    },
    temple(ctx, p, t) {
      const g = ctx.createLinearGradient(0, 0, 0, GR); g.addColorStop(0, '#14264a'); g.addColorStop(.7, '#4f6fa0'); g.addColorStop(1, '#c9b8a0'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      p(.05, () => { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(150, 90, 30, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(20,38,74,.25)'; ctx.beginPath(); ctx.arc(160, 84, 28, 0, 7); ctx.fill(); });
      p(.1, () => { ctx.fillStyle = '#3a4f78'; mount(ctx, [[-100, GR], [100, 200], [260, 270], [420, 170], [600, 260], [780, 190], [1000, GR]]); });
      p(.25, () => { ctx.fillStyle = '#26365a'; mount(ctx, [[-100, GR], [120, 280], [300, 320], [500, 260], [700, 320], [1000, GR]]); });
      p(.5, () => { ctx.fillStyle = '#7d6f63'; ctx.fillRect(-200, 300, 1500, 100); for (let x = -100; x < 1100; x += 200) { ctx.fillStyle = '#9a8a7a'; ctx.fillRect(x, 120, 36, 280); ctx.fillStyle = '#6a5c50'; ctx.fillRect(x - 6, 120, 48, 14); ctx.fillRect(x - 6, 386, 48, 14); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x + 26, 134, 10, 252); }
        ctx.fillStyle = '#5a4c42'; ctx.fillRect(-200, 100, 1500, 28);
        for (let x = 0; x < 1100; x += 400) { ctx.fillStyle = '#333'; ctx.fillRect(x + 90, 250, 6, 50); const f = 8 + Math.sin(t * 12 + x) * 3, fg = ctx.createRadialGradient(x + 93, 244, 2, x + 93, 244, 38); fg.addColorStop(0, 'rgba(255,200,90,.7)'); fg.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = fg; ctx.fillRect(x + 50, 200, 90, 90); ctx.fillStyle = '#ff9a2f'; ctx.beginPath(); ctx.ellipse(x + 93, 244, 6, f + 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ffe28a'; ctx.beginPath(); ctx.ellipse(x + 93, 247, 3, f * .6, 0, 0, 7); ctx.fill(); } });
    }
  };
  function mount(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); }
  const FLOOR = { dojo: ['#7a4a2a', '#5e3820', 'rgba(255,220,160,.08)'], neon: ['#1c1236', '#120a26', 'rgba(255,80,220,.25)'], temple: ['#8d8072', '#6f6458', 'rgba(255,255,255,.07)'] };
  const NAMES = ['dojo', 'neon', 'temple'];

  function drawStage(ctx, si, t) {
    const name = NAMES[si % 3]; T = t;
    const p = (par, fn) => { ctx.save(); const z = 1 + (cam.zoom - 1) * par * 1.3, off = -(cam.x - G.STAGE_W / 2) * par; ctx.translate(W / 2 + off, GR); ctx.scale(z, z); ctx.translate(-W / 2, -GR); fn(); ctx.restore(); };
    STAGE[name](ctx, p, t);
  }
  function drawFloor(ctx, si, t) {
    const name = NAMES[si % 3], c = FLOOR[name], x0 = cam.x - W / cam.zoom, x1 = cam.x + W / cam.zoom;
    const g = ctx.createLinearGradient(0, GR, 0, GR + 90); g.addColorStop(0, c[0]); g.addColorStop(1, c[1]); ctx.fillStyle = g; ctx.fillRect(x0, GR, x1 - x0, 140);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x0, GR, x1 - x0, 3);
    ctx.strokeStyle = c[2]; ctx.lineWidth = 2;
    if (name === 'dojo') for (let i = 0; i < 5; i++) { const y = GR + 6 + i * i * 3 + i * 6; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
    if (name === 'dojo') for (let x = Math.floor(x0 / 90) * 90; x < x1; x += 90) { ctx.beginPath(); ctx.moveTo(x, GR); ctx.lineTo(x + (x - cam.x) * .45, GR + 120); ctx.stroke(); }
    if (name === 'temple') for (let x = Math.floor(x0 / 100) * 100; x < x1; x += 100) { ctx.beginPath(); ctx.moveTo(x, GR); ctx.lineTo(x + (x - cam.x) * .5, GR + 120); ctx.stroke(); for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x0, GR + i * i * 6); ctx.lineTo(x1, GR + i * i * 6); ctx.stroke(); } }
    if (name === 'neon') { for (let i = 0; i < 3; i++) { ctx.strokeStyle = ['rgba(255,60,210,.35)', 'rgba(60,232,255,.3)', 'rgba(255,224,60,.25)'][i]; ctx.lineWidth = 3; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(x0, GR + 10 + i * 18); ctx.lineTo(x1, GR + 10 + i * 18); ctx.stroke(); } ctx.shadowBlur = 0;
      // reflected glow puddles
      for (let x = Math.floor(x0 / 300) * 300; x < x1; x += 300) { const rg = ctx.createRadialGradient(x + 120, GR + 38, 2, x + 120, GR + 38, 90); rg.addColorStop(0, 'rgba(255,80,220,.25)'); rg.addColorStop(1, 'rgba(255,80,220,0)'); ctx.fillStyle = rg; ctx.fillRect(x + 20, GR + 8, 200, 60); } }
  }
  function drawForeground(ctx, si, t) {
    const name = NAMES[si % 3];
    ctx.save();
    if (name === 'dojo') { ctx.fillStyle = 'rgba(255,190,205,.9)'; for (let i = 0; i < 18; i++) { const x = ((i * 137 + t * 28 * (1 + i % 3 * .3)) % (W + 80)) - 40, y = ((i * 71 + t * 36) % (H + 40)) - 20; ctx.save(); ctx.translate(x, y); ctx.rotate(t + i); ctx.beginPath(); ctx.ellipse(0, 0, 4, 2.2, 0, 0, 7); ctx.fill(); ctx.restore(); } }
    else if (name === 'neon') { ctx.strokeStyle = 'rgba(180,200,255,.25)'; ctx.lineWidth = 1; for (let i = 0; i < 60; i++) { const x = (i * 47 + t * 60) % (W + 40) - 20, y = (i * 83 + t * 500) % (H + 60) - 30; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 16); ctx.stroke(); } }
    else { ctx.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 5; i++) { const x = ((i * 220 + t * 14) % (W + 300)) - 150; ctx.beginPath(); ctx.ellipse(x, GR - 10 + Math.sin(t + i) * 6, 170, 26, 0, 0, 7); ctx.fill(); } }
    ctx.restore();
  }

  // ---------------------------------------------------------------- projectiles
  function drawShots(ctx, shots, t) {
    for (const s of shots) {
      const y = GR - s.y, d = s.d; ctx.save(); ctx.translate(s.x, y); ctx.scale(d, 1);
      if (s.st === 'bolt') { ctx.shadowColor = s.c; ctx.shadowBlur = 20; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-s.w, 0); for (let i = 1; i <= 6; i++) ctx.lineTo(-s.w + i * s.w / 3.2, (Math.random() - .5) * s.h * .9); ctx.stroke(); ctx.strokeStyle = s.c; ctx.lineWidth = 7; ctx.globalAlpha = .45; ctx.stroke(); ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(8, 0, 9, 0, 7); ctx.fill(); }
      else if (s.st === 'orb') { const r = ctx.createRadialGradient(0, 0, 2, 0, 0, s.w * .8); r.addColorStop(0, '#fff'); r.addColorStop(.4, s.c); r.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = r; ctx.beginPath(); ctx.arc(0, 0, s.w * .8, 0, 7); ctx.fill(); const tg = ctx.createLinearGradient(-60, 0, 0, 0); tg.addColorStop(0, 'rgba(255,230,120,0)'); tg.addColorStop(1, 'rgba(255,230,120,.7)'); ctx.fillStyle = tg; ctx.fillRect(-60, -s.h / 3, 60, s.h * .66); }
      else if (s.st === 'bomb') { const sp = Math.sin(t * 30); ctx.rotate(t * 6); ctx.fillStyle = '#1d1d26'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, s.w * .45, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(-4, -4, 4, 0, 7); ctx.fill(); ctx.strokeStyle = '#a77'; ctx.beginPath(); ctx.moveTo(0, -s.w * .45); ctx.lineTo(4, -s.w * .45 - 8); ctx.stroke(); ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(4, -s.w * .45 - 9, 3 + sp, 0, 7); ctx.fill(); }
      else if (s.st === 'crescent') { ctx.shadowColor = s.c; ctx.shadowBlur = 16; ctx.fillStyle = s.c; ctx.beginPath(); ctx.moveTo(-6, -s.h / 2); ctx.quadraticCurveTo(s.w * .8, 0, -6, s.h / 2); ctx.quadraticCurveTo(s.w * .25, 0, -6, -s.h / 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.globalAlpha = .8; ctx.beginPath(); ctx.moveTo(-2, -s.h * .3); ctx.quadraticCurveTo(s.w * .4, 0, -2, s.h * .3); ctx.quadraticCurveTo(s.w * .12, 0, -2, -s.h * .3); ctx.fill(); }
      else if (s.st === 'bullet') { ctx.fillStyle = 'rgba(255,224,138,.5)'; ctx.fillRect(-46, -2, 46, 4); ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 3.5, 0, 0, 7); ctx.fill(); }
      else if (s.st === 'kunai') { ctx.fillStyle = 'rgba(190,150,255,.35)'; ctx.fillRect(-50, -2, 50, 4); ctx.rotate(t * 20); ctx.fillStyle = '#e6dcff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(0, -5); ctx.lineTo(-10, 0); ctx.lineTo(0, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      else if (s.st === 'flame') { ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = s.c; ctx.shadowBlur = 22; const R = s.w * .5;
        for (let i = 0; i < 4; i++) { const L = R * (2.3 + i * .55) + Math.sin(t * 30 + i * 2) * 4, wv = R * (.95 - i * .16); ctx.fillStyle = i % 2 ? '#ffd23f' : s.c; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(4, -wv); ctx.quadraticCurveTo(-L * .5, -wv * 1.3 + Math.sin(t * 25 + i) * 3, -L, Math.sin(t * 20 + i * 3) * 5); ctx.quadraticCurveTo(-L * .5, wv * 1.3, 4, wv); ctx.closePath(); ctx.fill(); }
        ctx.globalAlpha = 1; const g = ctx.createRadialGradient(0, 0, 2, 0, 0, R); g.addColorStop(0, '#fff'); g.addColorStop(.45, '#ffe27a'); g.addColorStop(1, s.c); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(2, 0, R, 0, 7); ctx.fill(); }
      else if (s.st === 'shard') { ctx.shadowColor = s.c; ctx.shadowBlur = 16; const w = s.w, h = s.h, tg = ctx.createLinearGradient(-w * 2.2, 0, 0, 0); tg.addColorStop(0, 'rgba(155,233,255,0)'); tg.addColorStop(1, 'rgba(155,233,255,.55)'); ctx.fillStyle = tg; ctx.fillRect(-w * 2.2, -h * .2, w * 2.2, h * .4);
        ctx.fillStyle = '#e8fbff'; ctx.strokeStyle = s.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w * .7, 0); ctx.lineTo(-w * .1, -h * .5); ctx.lineTo(-w * .55, 0); ctx.lineTo(-w * .1, h * .5); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.moveTo(w * .5, 0); ctx.lineTo(0, -h * .22); ctx.lineTo(-w * .2, 0); ctx.closePath(); ctx.fill(); }
      else if (s.st === 'snow') { ctx.shadowColor = s.c; ctx.shadowBlur = 18; const R = s.w * .42; ctx.rotate(t * 5); const g = ctx.createRadialGradient(-R * .3, -R * .3, 2, 0, 0, R); g.addColorStop(0, '#fff'); g.addColorStop(1, '#8fd8ff'); ctx.fillStyle = g; ctx.strokeStyle = '#cfefff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#fff'; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 1.4, Math.sin(a) * R * 1.4); ctx.lineTo(-Math.cos(a) * R * 1.4, -Math.sin(a) * R * 1.4); ctx.stroke(); } }
      else if (s.st === 'beam') { const g = ctx.createLinearGradient(-s.w, 0, 0, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.6, s.c); g.addColorStop(1, '#fff'); ctx.shadowColor = s.c; ctx.shadowBlur = 30; ctx.fillStyle = g; const hh = s.h / 2 * (.85 + .15 * Math.sin(t * 40)); ctx.beginPath(); ctx.moveTo(-s.w, 0); ctx.lineTo(-s.w * .2, -hh); ctx.quadraticCurveTo(20, -hh * 1.1, 24, 0); ctx.quadraticCurveTo(20, hh * 1.1, -s.w * .2, hh); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.globalAlpha = .8; ctx.fillRect(-s.w * .6, -hh * .28, s.w * .6, hh * .56); }
      else { ctx.fillStyle = s.c; ctx.shadowColor = s.c; ctx.shadowBlur = 14; ctx.beginPath(); ctx.moveTo(-18, 10); ctx.quadraticCurveTo(-4, -26 - Math.sin(t * 15) * 4, 22, 10); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(-8, 10); ctx.quadraticCurveTo(0, -12, 10, 10); ctx.fill(); }
      ctx.restore();
      if (Math.random() < .6) part(s.x - d * 12, y + rnd(-s.h / 3, s.h / 3), -d * rnd(.5, 2), rnd(-1, 1), 14, 3, s.c, s.st === 'flame' ? 'ember' : (s.st === 'snow' || s.st === 'shard') ? 'snow' : 'dot');
    }
  }

  // ---------------------------------------------------------------- particles / events
  function part(x, y, vx, vy, life, size, color, type, extra) { if (parts.length < 600) parts.push(Object.assign({ x, y, vx, vy, life, max: life, size, color, type }, extra || {})); }
  function sparks(x, y, n, color, sp, dir) { for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), v = rnd(sp * .4, sp); part(x, y, Math.cos(a) * v + (dir || 0) * sp * .4, Math.sin(a) * v, rnd(8, 18), rnd(2, 4.5), color, 'line'); } }
  function addText(x, y, txt, col, size, extra) { texts.push(Object.assign({ x, y, txt, col, t: 0, size: size || 20, life: 50, vx: 0, rise: .6, rot: 0, pop: 0, italic: true }, extra || {})); }
  function crack(x) { const segs = []; for (const sd of [-1, 1]) { let cx = x, cy = GR + 3; for (let j = 0; j < 5; j++) { const nx = cx + sd * rnd(10, 24), ny = clamp(cy + rnd(-4, 9), GR + 3, GR + 24); segs.push([cx, cy, nx, ny]); if (Math.random() < .4) segs.push([nx, ny, nx + sd * rnd(6, 14), ny + rnd(3, 9)]); cx = nx; cy = ny; } } cracks.push({ segs, t: 0 }); if (cracks.length > 4) cracks.shift(); }

  function event(e, fs, A) {
    const play = A && A.play ? n => A.play(n) : () => {};
    switch (e.t) {
      case 'hit': {
        const k = e.k, big = k >= 3, att = fs && fs[e.by], ac = att ? att.def.accent : '#fff', c = e.c ? '#ffb347' : k >= 2 ? '#fff2a0' : '#ffffff';
        sparks(e.x, e.y, 6 + k * 5, c, 5 + k * 2.2, e.d); sparks(e.x, e.y, 3 + k * 2, ac, 4 + k * 1.6, e.d);
        part(e.x, e.y, 0, 0, 9 + k * 2, 18 + k * 12, c, 'star'); part(e.x, e.y, 0, 0, 12, 10, c, 'ring', { grow: 3 + k * 1.2 }); if (big) part(e.x, e.y, 0, 0, 16, 6, ac, 'ring', { grow: 5 + k });
        shake = Math.max(shake, 2 + k * 3.5); kick = clamp(kick + e.d * (1.5 + k * 2.2), -14, 14);
        if (big) { flash = { a: .35 + k * .05, col: '#fff', t: 5 }; zoomPunch = .05; }
        if (e.dmg > 0) { const dm = Math.round(e.dmg); addText(e.x + e.d * 20 + rnd(-8, 8), e.y - 14, '' + dm, dm >= 90 ? '#ffb347' : '#ffffff', clamp(13 + dm / 9, 14, 30), { rise: .9, life: 38, pop: .6, vx: e.d * .35 }); }
        if (e.c) addText(e.x, e.y - 44, 'COUNTER!', '#ffb347', 18);
        if (big && !texts.some(t => t.word)) addText(e.x - e.d * 46 + rnd(-10, 10), e.y - 62 + rnd(-8, 8), pick(['POW!', 'WHAM!', 'CRACK!', 'BAM!', 'SMASH!']), pick(['#ffe14a', '#ff7a3a', '#ff5a8a']), 22 + k * 4, { rot: rnd(-.3, .3), life: 24, pop: .55, rise: .3, word: true });
        play('hit' + Math.min(4, k)); break; }
      case 'blk': sparks(e.x, e.y, 5, '#9fd8ff', 4, e.d); part(e.x, e.y, 0, 0, 8, 22, '#9fd8ff', 'ring', { grow: 2.2 }); shake = Math.max(shake, 1.2); play('block'); break;
      case 'swing': play(e.s || 'p1'); break;
      case 'dust': { const n = e.k === 'slam' ? 12 : e.k === 'land' ? 6 : 4; for (let i = 0; i < n; i++) part(e.x + rnd(-10, 10), GR - 2, rnd(-2, 2) * (e.k === 'slam' ? 2 : 1) - (e.k === 'dash' ? e.d * 2 : 0), rnd(-1.4, -.2), rnd(14, 26), rnd(5, 11), 'rgba(235,225,210,.5)', 'smoke'); play(e.k === 'jump' ? 'jump' : e.k === 'dash' ? 'dash' : 'land'); if (e.k === 'slam') { shake = Math.max(shake, 6); crack(e.x); } break; }
      case 'cast': { const col = e.c || '#fff'; for (let i = 0; i < 14; i++) { const a = rnd(0, 6.28); part(e.x + e.d * 40 + Math.cos(a) * 30, GR - 85 + Math.sin(a) * 30, -Math.cos(a) * 1.8, -Math.sin(a) * 1.8, 14, 3, col, 'dot'); } part(e.x + e.d * 40, GR - 88, 0, 0, 10, 30, col, 'ring', { grow: -2 }); play('cast'); break; }
      case 'super': sup = { t: 44, i: e.i, n: e.n, col: (fs && fs[e.i] && fs[e.i].def.accent) || '#fff', def: fs && fs[e.i] && fs[e.i].def }; flash = { a: .6, col: '#fff', t: 6 }; zoomPunch = .09; shake = Math.max(shake, 5); play('super'); break;
      case 'slam': sparks(e.x, GR - 20, 18, '#ffe9a0', 8); crack(e.x); part(e.x, GR - 6, 0, 0, 18, 10, '#ffe9a0', 'ring', { grow: 6 }); shake = Math.max(shake, 10); flash = { a: .5, col: '#fff', t: 4 }; play('slam'); break;
      case 'grab': play('grab'); break;
      case 'tech': sparks(e.x, e.y, 14, '#8cff9e', 6); part(e.x, e.y, 0, 0, 14, 20, '#8cff9e', 'ring', { grow: 3 }); addText(e.x, e.y - 40, 'BREAK!', '#8cff9e', 20); play('tech'); break;
      case 'clash': sparks(e.x, e.y, 14, '#fff', 6); play('clash'); break;
      case 'ko': flash = { a: .9, col: '#fff', t: 12 }; burst = { t: 30 }; shake = 16; zoomPunch = .12; crack(e.x); kick = 0; for (let i = 0; i < 24; i++) part(e.x, GR - 70, rnd(-8, 8), rnd(-8, 2), 30, rnd(3, 6), '#ffd23f', 'line'); play('ko'); break;
      case 'shot': break;
    }
  }

  function update(frozen) {
    shake *= .85; kick *= .8; if (burst && --burst.t <= 0) burst = null; for (const c of cracks) c.t++; cracks = cracks.filter(c => c.t < 150);
    for (const c of conf) { c.x += c.vx + Math.sin(c.y * .03 + c.r) * .8; c.y += c.vy; c.r += c.vr; } conf = conf.filter(c => c.y < H + 20);
    if (sup) { sup.t--; if (sup.t <= 0) sup = null; }
    if (flash) { flash.t--; if (flash.t <= 0) flash = null; }
    if (frozen) return;
    for (const p of parts) { p.x += p.vx; p.y += p.vy; p.life--; if (p.type === 'smoke') { p.vx *= .94; p.size += .3; } else if (p.type === 'ember') { p.vy -= .035; p.vx = p.vx * .97 + Math.sin(p.life * .5 + p.x) * .08; } else if (p.type === 'snow') { p.vx = p.vx * .97 + Math.sin(p.life * .3 + p.y) * .06; p.vy += .004; } else if (p.type === 'line' || p.type === 'dot') { p.vy += .12; p.vx *= .93; } if (p.grow) p.size += p.grow; }
    parts = parts.filter(p => p.life > 0);
    for (const t of texts) t.t++; texts = texts.filter(t => t.t < t.life);
  }
  function drawFx(ctx) {
    for (const p of parts) {
      const a = Math.max(0, p.life / p.max); ctx.globalAlpha = a;
      if (p.type === 'line') { ctx.strokeStyle = p.color; ctx.lineWidth = p.size * .6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); ctx.stroke(); }
      else if (p.type === 'dot') { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a + .5, 0, 7); ctx.fill(); }
      else if (p.type === 'smoke') { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill(); }
      else if (p.type === 'ring') { ctx.strokeStyle = p.color; ctx.lineWidth = 3 * a + 1; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, p.size), 0, 7); ctx.stroke(); }
      else if (p.type === 'ember') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a + .4, 0, 7); ctx.fill(); ctx.globalAlpha = a * .35; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a * 2.2 + .8, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
      else if (p.type === 'snow') { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (.5 + a * .5), 0, 7); ctx.fill(); ctx.globalAlpha = a * .3; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2, 0, 7); ctx.fill(); }
      else if (p.type === 'star') { ctx.fillStyle = p.color; ctx.beginPath(); const R = p.size * (1.2 - a * .4), n = 8; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? R * .38 : R, an = i * Math.PI / n + p.x; ctx.lineTo(p.x + Math.cos(an) * r, p.y + Math.sin(an) * r); } ctx.closePath(); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    for (const c of cracks) { ctx.globalAlpha = Math.min(.55, (150 - c.t) / 80); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); for (const sg of c.segs) { const u = Math.min(1, c.t / 5); ctx.moveTo(sg[0], sg[1]); ctx.lineTo(sg[0] + (sg[2] - sg[0]) * u, sg[1] + (sg[3] - sg[1]) * u); } ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (const t of texts) { const k = t.t / t.life, sc = 1 + Math.max(0, (6 - t.t) / 6) * t.pop; ctx.save(); ctx.globalAlpha = k < .6 ? 1 : 1 - (k - .6) / .4; ctx.translate(t.x + t.vx * t.t, t.y - t.t * t.rise); ctx.rotate(t.rot); ctx.scale(sc, sc);
      ctx.font = (t.italic ? 'italic ' : '') + '900 ' + t.size + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, t.size / 5); ctx.strokeStyle = '#000'; ctx.strokeText(t.txt, 0, 0); ctx.fillStyle = t.col; ctx.fillText(t.txt, 0, 0); ctx.restore(); }
    ctx.globalAlpha = 1;
  }
  // attack streaks following the striking limb
  function trail(ctx, i, tip, active, color) {
    const h = trails[i]; h.unshift(active ? tip : null); if (h.length > 10) h.pop();
    ctx.save(); ctx.lineCap = 'round';
    for (let k = 0; k < h.length - 1; k++) { const a = h[k], b = h[k + 1]; if (!a || !b) continue; const u = 1 - k / h.length; ctx.strokeStyle = color; ctx.globalAlpha = .55 * u; ctx.lineWidth = 14 * u; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.globalAlpha = .9 * u; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4 * u; ctx.stroke(); }
    ctx.restore();
  }
  function overlay(ctx) { // screen-space: flash + super cut-in
    if (flash) { ctx.globalAlpha = flash.a * (flash.t / 8 > 1 ? 1 : flash.t / 8); ctx.fillStyle = flash.col; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (sup) { const u = sup.t / 44, e = Math.min(1, (1 - u) * 6), o = Math.min(1, u * 5);
      ctx.fillStyle = 'rgba(0,0,10,' + .55 * Math.min(e, o) + ')'; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalAlpha = Math.min(e, o); ctx.translate(W / 2, H / 2 - 20); ctx.rotate(-.06); ctx.fillStyle = sup.col; ctx.fillRect(-W, -34, W * 2, 68); ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(-W, -28, W * 2, 56);
      ctx.font = 'italic 900 44px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.shadowColor = sup.col; ctx.shadowBlur = 20; ctx.fillText(sup.n, (1 - e) * (sup.i ? 300 : -300), 15); ctx.restore(); ctx.shadowBlur = 0;
      if (sup.def) { const px = sup.i ? W - 118 : 118, sl = (1 - e) * (sup.i ? 280 : -280), py = H / 2 - 22; ctx.save(); ctx.globalAlpha = Math.min(e, o); ctx.translate(sl, 0); ctx.beginPath(); ctx.arc(px, py, 62, 0, 7); ctx.fillStyle = 'rgba(8,8,24,.85)'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = sup.col; ctx.stroke(); ctx.save(); ctx.clip(); G.Sprites.portrait(ctx, sup.def, px, py + 14, 40, T); ctx.restore(); ctx.restore(); }
      ctx.strokeStyle = sup.col; ctx.globalAlpha = .35 * Math.min(e, o); ctx.lineWidth = 2; for (let i = 0; i < 30; i++) { const a = i / 30 * 6.28 + sup.t * .02; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * 140, H / 2 + Math.sin(a) * 90); ctx.lineTo(W / 2 + Math.cos(a) * 700, H / 2 + Math.sin(a) * 500); ctx.stroke(); } ctx.globalAlpha = 1; }
  }
  function overlayTop(ctx) { // KO speed-line burst + confetti (screen space, drawn above the HUD)
    if (burst) { const u = burst.t / 30; ctx.save(); ctx.globalAlpha = u * .9; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; for (let i = 0; i < 44; i++) { const a = i / 44 * 6.283 + (i % 3) * .07, r0 = 60 + (1 - u) * 260, r1 = r0 + 80 + (i % 5) * 40; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0 * .7); ctx.lineTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1 * .7); ctx.stroke(); } ctx.restore(); }
    for (const c of conf) { ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); ctx.scale(1, Math.abs(Math.sin(c.r * 2)) * .8 + .2); ctx.fillStyle = c.col; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); ctx.restore(); }
  }
  function celebrate() { for (let i = 0; i < 140; i++) conf.push({ x: rnd(0, W), y: rnd(-260, -10), vx: rnd(-1, 1), vy: rnd(1.4, 4), r: rnd(0, 6), vr: rnd(-.2, .2), w: rnd(5, 10), h: rnd(3, 6), col: pick(['#ffd23f', '#ff5a5a', '#59b8ff', '#6dff9a', '#c47bff']) }); }
  // per-step ambient particles: Blaze embers, Frost snow, and a sparkle halo while a fighter's SUPER is ready
  function ambient(fs) {
    for (let i = 0; i < 2; i++) { const f = fs[i], d = f.def, sc = d.scale || 1; if (f.st === 'ko' || f.st === 'down') continue;
      if (d.aura === 'fire' && Math.random() < .5) part(f.x + rnd(-16, 16), f.y - rnd(10, 100) * sc, rnd(-.4, .4), -rnd(.6, 1.6), rnd(16, 26), rnd(2, 4), Math.random() < .5 ? '#ff8a1a' : '#ffd23f', 'ember');
      if (d.aura === 'snow' && Math.random() < .4) part(f.x + rnd(-32, 32), f.y - rnd(0, 120) * sc, rnd(-.3, .3), rnd(.1, .5), rnd(24, 40), rnd(1.5, 3), '#e8fbff', 'snow');
      if (f.meter >= 100 && Math.random() < .35) part(f.x + rnd(-24, 24), f.y - rnd(0, 110) * sc, rnd(-.3, .3), -rnd(.8, 1.8), rnd(14, 22), rnd(1.5, 3), d.accent, 'ember'); }
  }
  function burstAt(x, y, col) { for (let i = 0; i < 26; i++) { const a = rnd(0, 6.28), v = rnd(2, 6); part(x, y, Math.cos(a) * v, Math.sin(a) * v - 1, rnd(16, 26), rnd(2, 4), col, 'ember'); } part(x, y, 0, 0, 16, 10, col, 'ring', { grow: 4 }); }
  function reset() { kick = 0; cracks = []; conf = []; burst = null; parts = []; texts = []; shake = 0; flash = null; sup = null; trails = [[], []]; zoomPunch = 0; }
  return { cam, updateCam, begin, end, drawStage, drawFloor, drawForeground, drawShots, event, update, drawFx, trail, overlay, overlayTop, celebrate, ambient, burstAt, reset, get superActive() { return !!sup; }, hitFlash() {} };
})();
