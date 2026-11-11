// Screens: menu / difficulty+select / lobby / fight / how-to. Modes: 'bot', 'train' (local) and 'online' (server-authoritative rooms).
(function () {
  const G = Game, W = G.W, H = G.H, N = G.CHARACTERS.length, Wd = G.World, A = G.Audio;
  const cv = document.getElementById('game'), ctx = cv.getContext('2d'), controls = document.getElementById('controls'), suBtn = document.getElementById('b-su');
  cv.width = W; cv.height = H;
  function resize() { const s = Math.min(innerWidth / W, innerHeight / H); cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px'; }
  addEventListener('resize', resize); resize();
  const setCtl = on => controls.style.display = on ? 'flex' : 'none'; setCtl(false);

  let screen = 'menu', mode = 'bot', slot = 0, code = '', picked = -1, notice = '', match = null, view = null, fighters = null, ai = G.AI.mk(), lvl = 'normal';
  let lag = [1, 1], lastRound = 0, tick = 0, shown = [0, 0], fightT = 0, pop = [0, 0], prevMt = [0, 0], prevCn = [0, 0], prevPh = '', musicStage = -1;
  const previews = G.CHARACTERS.map(c => new G.Fighter(c, 0, 1));
  const GAP = N > 8 ? 6 : N > 5 ? 8 : 16, CW = Math.min(172, (W - 24 - (N - 1) * GAP) / N), cardX = i => (W - (N * CW + (N - 1) * GAP)) / 2 + i * (CW + GAP);
  const MENU = [{ label: 'PLAY VS BOT', a: 'bot' }, { label: 'TRAINING', a: 'train' }, { label: 'CREATE ROOM', a: 'create' }, { label: 'JOIN ROOM', a: 'join' }, { label: 'HOW TO PLAY', a: 'how' }];
  const BACK = { x: 10, y: 10, w: 80, h: 32 }, mbY = i => 112 + i * 54;
  const inR = (x, y, r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;
  const spk = () => screen === 'fight' ? { x: W - 44, y: 54, w: 38, h: 28 } : { x: W - 50, y: 8, w: 40, h: 30 };
  addEventListener('keydown', e => { if (e.key === 'm' || e.key === 'M') A.toggle(); });

  // ------------------------------------------------------------ flow
  function toMenu(msg) { G.Net.close(); A.musicStop(); musicStage = -1; screen = 'menu'; notice = msg || ''; match = null; view = null; setCtl(false); Wd.reset(); }
  function initFighters(c) { musicStage = -1; prevMt = [0, 0]; prevCn = [0, 0]; prevPh = ''; fighters = c.map((ci, k) => new G.Fighter(G.CHARACTERS[ci], k ? 700 : 600, k ? -1 : 1, k)); lag = [1, 1]; lastRound = 0; Wd.reset(); }
  function startLocal(i) {
    slot = 0; const foe = (i + 1 + Math.floor(Math.random() * (N - 1))) % N;
    match = new G.Match(i, foe, { training: mode === 'train' }); ai = G.AI.mk(); ai.lvl = lvl; if (mode === 'train') ai.mode = 'dummy';
    initFighters(match.c); view = match.serialize(); screen = 'fight'; setCtl(true); G.input.reset();
  }
  function online(first) {
    mode = 'online'; notice = 'Connecting… (server may take ~30s to wake up)';
    G.Net.onmsg = onNet; G.Net.onclose = () => { if (mode === 'online' && screen !== 'menu') toMenu('Disconnected'); else notice = 'Could not connect'; };
    G.Net.connect(() => { notice = ''; G.Net.send(first); });
  }
  function onNet(m) {
    if (m.t === 'room') { slot = m.slot; code = m.code; screen = 'lobby'; }
    else if (m.t === 'joined') { screen = 'select'; picked = -1; view = null; match = null; setCtl(false); }
    else if (m.t === 'start') { initFighters(m.c); view = null; screen = 'fight'; setCtl(true); sendIn(); }
    else if (m.t === 's') { view = m.s; handleEvents(); }
    else if (m.t === 'left') toMenu('Friend left the room');
    else if (m.t === 'err') toMenu(m.msg);
  }
  const sendIn = () => { if (mode === 'online' && screen === 'fight') G.Net.send({ t: 'in', k: G.input.k, b: G.input.b }); };
  G.input.onchange = sendIn;

  function handleEvents() {
    if (!view || !fighters) return;
    for (const e of view.ev) Wd.event(e, fighters, A);
    if (view.i === 168) A.play('round'); if (view.i === 44) A.play('fight');
  }

  // ------------------------------------------------------------ input (menus)
  cv.addEventListener('pointerdown', e => {
    A.init();
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
    if ((screen === 'fight' || screen === 'menu' || screen === 'select') && inR(x, y, spk())) { A.toggle(); return; }
    if (screen === 'menu') {
      MENU.forEach((b, i) => { if (inR(x, y, { x: 250, y: mbY(i), w: 300, h: 46 })) { A.play('ui');
        if (b.a === 'bot' || b.a === 'train') { mode = b.a; notice = ''; screen = 'select'; }
        else if (b.a === 'create') online({ t: 'create' });
        else if (b.a === 'how') screen = 'how';
        else { const c = prompt('Enter room code'); if (c) online({ t: 'join', code: c }); } } });
    } else if (screen === 'how') { screen = 'menu'; }
    else if (screen === 'lobby') {
      if (inR(x, y, BACK)) toMenu(); else { try { navigator.clipboard.writeText(code); notice = 'Code copied!'; } catch (_) {} }
    } else if (screen === 'select') {
      if (inR(x, y, BACK)) return toMenu();
      if (mode === 'bot') ['easy', 'normal', 'hard'].forEach((d, i) => { if (inR(x, y, { x: 250 + i * 104, y: 372, w: 92, h: 30 })) { lvl = d; A.play('ui'); } });
      for (let i = 0; i < N; i++) if (inR(x, y, { x: cardX(i), y: 96, w: CW, h: 262 })) {
        A.play('ui'); if (mode !== 'online') startLocal(i); else { picked = i; G.Net.send({ t: 'pick', i }); }
      }
    } else if (screen === 'fight') {
      if (inR(x, y, { x: W / 2 - 30, y: 76, w: 60, h: 24 })) return toMenu();
      if (mode === 'train' && inR(x, y, { x: W - 130, y: 76, w: 120, h: 24 })) { ai.dummy = ai.dummy === 'stand' ? 'block' : ai.dummy === 'block' ? 'crouch' : 'stand'; return; }
      if (view && view.ph === 'matchEnd' && view.e <= 0) { if (mode !== 'online') toMenu(); else { G.Net.send({ t: 'rematch' }); notice = 'Waiting for friend…'; } }
    }
  });

  // ------------------------------------------------------------ simulation (fixed 60 Hz)
  function step() {
    tick++;
    if (screen !== 'fight') return;
    G.input.pollPad();
    if (mode !== 'online') {
      match.step(G.input.take(), G.AI.think(ai, match.f[1], match.f[0], match)); view = match.serialize(); handleEvents();
    } else if (tick % 20 === 0) sendIn();
    if (!view) return;
    view.f.forEach((s, i) => fighters[i].applyState(s));
    const frozen = view.hs > 0 || (view.i > 0 && view.ph === 'fight' && false);
    Wd.update(frozen); if (!frozen) Wd.ambient(fighters);
    for (let i = 0; i < 2; i++) { const f = view.f[i];
      if (f.mt >= 100 && prevMt[i] < 100 && view.i === 0 && view.ph === 'fight') { A.play('ready'); Wd.burstAt(fighters[i].x, fighters[i].y - 70, fighters[i].def.accent); }
      if (f.cn >= 2 && f.cn > prevCn[i]) A.play('combo', f.cn);
      prevMt[i] = f.mt; prevCn[i] = f.cn; }
    if (musicStage !== (view.sg || 0)) { musicStage = view.sg || 0; A.music(musicStage); }
    const hot = view.f.some((f, i) => f.hp > 0 && f.hp / fighters[i].maxHp < .25) || (mode !== 'train' && view.t < 600 && view.ph === 'fight') || view.f.some(f => f.cn >= 5);
    A.intensity(hot); A.duck(view.ph === 'matchEnd');
    if (view.ph === 'matchEnd' && prevPh !== 'matchEnd') { if (mode === 'online' ? view.win === slot : view.win === 0) { Wd.celebrate(); A.play('win'); } else A.play('ko'); }
    prevPh = view.ph;
    if (view.i > 160) { lag = [1, 1]; Wd.updateCam(fighters, true); } else Wd.updateCam(fighters);
    for (let i = 0; i < 2; i++) { const f = view.f[i], p = f.hp / fighters[i].maxHp; lag[i] = lag[i] > p ? Math.max(p, lag[i] - .004 - (lag[i] - p) * .03) : p; }
    if (view.ph === 'fight' && view.i === 0) fightT++; else fightT = 0;
    suBtn.classList.toggle('ready', view.f[slot].mt >= 100);
  }

  // ------------------------------------------------------------ drawing helpers
  function txt(s, x, y, size, col, align, stroke) { ctx.font = '900 ' + size + 'px system-ui,sans-serif'; ctx.textAlign = align || 'center'; ctx.textBaseline = 'alphabetic'; if (stroke !== false) { ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); } ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y); }
  function fit(s, x, y, maxW, size, col, align, stroke) { let z = size; ctx.font = '900 ' + z + 'px system-ui,sans-serif'; while (z > 6 && ctx.measureText(s).width > maxW) { z -= .5; ctx.font = '900 ' + z + 'px system-ui,sans-serif'; } txt(s, x, y, z, col, align, stroke); }
  function btn(x, y, w, h, label, active) {
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, active ? '#ffcf4a' : '#39406b'); g.addColorStop(1, active ? '#e08a1a' : '#1f2342'); ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, 10) : ctx.rect(x, y, w, h); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = active ? '#fff3b0' : 'rgba(255,255,255,.35)'; ctx.stroke();
    txt(label, x + w / 2, y + h / 2 + 6, 17, active ? '#2b1600' : '#fff', 'center', false);
  }
  function bgMenu(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#120b2e'); g.addColorStop(1, '#3a1646'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (.15 + .25 * Math.abs(Math.sin(t + i))) + ')'; ctx.fillRect((i * 97) % W, (i * 53) % 300, 2, 2); }
    for (let i = 0; i < 26; i++) { const x = (i * 83 + Math.sin(t * .8 + i) * 18) % W, y = H - ((t * (22 + (i % 4) * 9) + i * 47) % H); ctx.fillStyle = 'rgba(255,' + (140 + (i % 3) * 40) + ',60,' + (.18 + .25 * Math.abs(Math.sin(t + i))) + ')'; ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3), 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,90,60,.12)'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, 320); ctx.lineTo(200, 260); ctx.lineTo(420, 330); ctx.lineTo(640, 250); ctx.lineTo(W, 320); ctx.lineTo(W, H); ctx.fill();
  }

  // ------------------------------------------------------------ HUD
  function bar(side, frac, lagf, name, def, i) {
    const w = 300, y = 18, h = 20, sl = 12, x0 = side === 0 ? 372 - w : 428;   // side 0 = left
    const shape = (xx, ww) => { ctx.beginPath(); if (side === 0) { ctx.moveTo(xx + sl, y); ctx.lineTo(xx + ww + sl, y); ctx.lineTo(xx + ww, y + h); ctx.lineTo(xx, y + h); } else { ctx.moveTo(xx, y); ctx.lineTo(xx + ww, y); ctx.lineTo(xx + ww - sl, y + h); ctx.lineTo(xx - sl, y + h); } ctx.closePath(); };
    ctx.fillStyle = 'rgba(0,0,0,.65)'; shape(x0 - 3, w + 6); ctx.fill();
    const fw = w * lagf, fx = side === 0 ? x0 + w - fw : x0;
    ctx.fillStyle = '#d83a2a'; shape(fx, fw); ctx.fill();
    const cw = w * frac, cx = side === 0 ? x0 + w - cw : x0; const g = ctx.createLinearGradient(0, y, 0, y + h);
    const low = frac < .25; g.addColorStop(0, low ? '#ffb0a0' : '#fff7a8'); g.addColorStop(.5, low ? '#ff4a3a' : '#f2c92b'); g.addColorStop(1, low ? '#b01810' : '#c98d10'); ctx.fillStyle = g; shape(cx, cw); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; shape(cx, cw); ctx.save(); ctx.clip(); ctx.fillRect(cx - 20, y, cw + 40, 6); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; shape(x0 - 3, w + 6); ctx.stroke();
    // portrait
    const px = side === 0 ? 34 : W - 34; ctx.save(); ctx.beginPath(); ctx.arc(px, 30, 21, 0, 7); ctx.fillStyle = '#1a1a33'; ctx.fill(); ctx.clip(); G.Sprites.portrait(ctx, def, px, 31, 20, 0); ctx.restore();
    ctx.strokeStyle = def.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, 30, 21, 0, 7); ctx.stroke();
    txt(name, side === 0 ? 372 : 428, 56, 13, '#fff', side === 0 ? 'right' : 'left');
    // super meter
    const s = view.f[i], mw = 170, mx = side === 0 ? 372 - mw : 428, full = s.mt >= 100;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(mx, 62, mw, 8); ctx.fillStyle = full ? '#ff5a3a' : '#7ad6ff'; if (full) { ctx.shadowColor = '#ff5a3a'; ctx.shadowBlur = 10 + 6 * Math.sin(tick * .3); }
    const mwid = mw * s.mt / 100; ctx.fillRect(side === 0 ? mx + mw - mwid : mx, 62, mwid, 8); ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.strokeRect(mx, 62, mw, 8);
    if (full) txt('SUPER READY', side === 0 ? mx : mx + mw, 81, 11, '#ffb04a', side === 0 ? 'left' : 'right');
    if (s.rg) txt('RAGE', side === 0 ? 372 : 428, 96, 12, '#ff4040', side === 0 ? 'right' : 'left');
  }
  function speaker() {
    const r = spk(), on = A.on, cx = r.x + r.w / 2, cy = r.y + r.h / 2; ctx.save(); ctx.globalAlpha = .85; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 9, cy - 4); ctx.lineTo(cx - 4, cy - 4); ctx.lineTo(cx + 2, cy - 9); ctx.lineTo(cx + 2, cy + 9); ctx.lineTo(cx - 4, cy + 4); ctx.lineTo(cx - 9, cy + 4); ctx.closePath(); ctx.fill();
    if (on) { ctx.beginPath(); ctx.arc(cx + 2, cy, 6, -.9, .9); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + 2, cy, 11, -.9, .9); ctx.stroke(); } else { ctx.strokeStyle = '#ff6b6b'; ctx.beginPath(); ctx.moveTo(cx + 6, cy - 6); ctx.lineTo(cx + 15, cy + 6); ctx.moveTo(cx + 15, cy - 6); ctx.lineTo(cx + 6, cy + 6); ctx.stroke(); }
    ctx.restore();
  }
  function hud() {
    const names = fighters.map(f => f.def.name);
    bar(0, view.f[0].hp / fighters[0].maxHp, lag[0], names[0], fighters[0].def, 0); bar(1, view.f[1].hp / fighters[1].maxHp, lag[1], names[1], fighters[1].def, 1);
    ctx.fillStyle = '#10142e'; ctx.beginPath(); ctx.arc(W / 2, 32, 25, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    const sec = Math.ceil(view.t / 60); txt(mode === 'train' ? '∞' : String(sec), W / 2, 42, 26, sec <= 10 && mode !== 'train' ? '#ff5a5a' : '#fff', 'center', false);
    for (let i = 0; i < 2; i++) for (let k = 0; k < G.WINS_NEEDED; k++) { ctx.fillStyle = k < view.w[i] ? '#ffd23f' : 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(W / 2 + (i ? 1 : -1) * (9 + k * 12), 67, 4, 0, 7); ctx.fill(); }
    // combo counters (pop on every hit, rank words as the combo grows)
    for (let i = 0; i < 2; i++) { const s = view.f[i]; if (s.cn !== shown[i]) pop[i] = 1; pop[i] *= .84;
      if (s.cn >= 2 && (s.cl || s.ct > 0)) { const x = i ? W - 100 : 100, sc = 1 + pop[i] * .55, col = s.cn >= 9 ? '#ff5a3a' : s.cn > 4 ? '#ffd23f' : '#fff', fs = 30 + Math.min(14, s.cn * 2);
        ctx.save(); ctx.translate(x, 150); ctx.rotate((i ? .05 : -.05) * (.4 + pop[i])); ctx.scale(sc, sc); txt(s.cn + ' HITS', 0, 0, fs, col, 'center'); ctx.restore();
        txt(s.cd + ' DMG', x, 174, 16, '#ffb347', 'center');
        const rk = s.cn >= 12 ? 'UNREAL!' : s.cn >= 9 ? 'AWESOME!' : s.cn >= 6 ? 'GREAT!' : s.cn >= 4 ? 'NICE!' : ''; if (rk) txt(rk, x, 198, 15 + Math.min(6, s.cn - 3), col, 'center'); }
      shown[i] = s.cn; }
    ctx.globalAlpha = .8; txt('MENU', W / 2, 92, 12, '#fff', 'center'); ctx.globalAlpha = 1;
    if (mode === 'train') { txt('TRAINING', W / 2, 112, 13, '#8cff9e'); txt('DUMMY: ' + ai.dummy.toUpperCase() + ' ▸', W - 70, 92, 12, '#fff'); }
  }
  function banner() {
    const v = view;
    if (v.ph === 'fight' && v.i > 0) {
      const t = 170 - v.i;
      if (v.i > 55) { const u = Math.min(1, t / 12); ctx.save(); ctx.translate(W / 2, H / 2 - 40); ctx.scale(2 - u, 2 - u); ctx.globalAlpha = u; txt('ROUND ' + v.rd, 0, 0, 56, '#fff'); ctx.restore(); }
      if (v.rd === 1 && v.i > 55) { const u = Math.min(1, (170 - v.i) / 16), e = 1 - Math.pow(1 - u, 3), y = H / 2 + 28; ctx.save(); ctx.globalAlpha = Math.min(1, u * 2) * (v.i < 72 ? (v.i - 55) / 17 : 1); txt(fighters[0].def.name, W / 2 - 40 - (1 - e) * 260, y, 26, fighters[0].def.accent, 'right'); txt('VS', W / 2, y, 30, '#fff'); txt(fighters[1].def.name, W / 2 + 40 + (1 - e) * 260, y, 26, fighters[1].def.accent, 'left'); ctx.restore(); }
      if (v.i <= 55) { const u = Math.min(1, (55 - v.i) / 8); ctx.save(); ctx.translate(W / 2, H / 2 - 40); ctx.scale(.6 + u * .7, .6 + u * .7); txt('FIGHT!', 0, 0, 72, '#ffd23f'); ctx.restore(); }
    } else if (v.ph === 'fight' && fightT > 0 && fightT < 30) { ctx.save(); ctx.globalAlpha = 1 - fightT / 30; ctx.translate(W / 2, H / 2 - 40); ctx.scale(1.3 + fightT * .02, 1.3 + fightT * .02); txt('FIGHT!', 0, 0, 72, '#ffd23f'); ctx.restore(); }
    if (v.ph === 'roundEnd') {
      const t = 190 - v.e, u = Math.min(1, t / 10), big = v.m === 'K.O.' || v.m === 'DOUBLE K.O.';
      ctx.save(); ctx.translate(W / 2, H / 2 - 30); const s = big ? 2.4 - 1.4 * u : 1.6 - .6 * u; ctx.scale(s, s); ctx.rotate(big ? -.05 : 0); txt(v.m, 0, 0, big ? 84 : 54, big ? '#ff4a3a' : '#fff'); ctx.restore();
      if (t > 50 && v.sub) { txt(v.sub, W / 2, H / 2 + 36, 26, '#ffd23f'); const w = v.win; }
      if (t > 50 && v.m === 'K.O.') { const wi = v.f[0].hp > 0 ? 0 : 1; if (v.f[wi].hp >= fighters[wi].maxHp) txt('PERFECT!', W / 2, H / 2 + 66, 22, '#8cff9e'); }
    }
    if (v.ph === 'matchEnd') {
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, H);
      const mine = mode === 'online' ? v.win === slot : v.win === 0;
      txt(mode === 'online' ? (mine ? 'YOU WIN!' : 'YOU LOSE') : (v.win === 0 ? 'YOU WIN!' : 'YOU LOSE'), W / 2, H / 2 - 10, 64, mine ? '#ffd23f' : '#9aa0c8');
      txt(fighters[v.win].def.name + ' is victorious', W / 2, H / 2 + 28, 20, '#fff');
      if (v.e <= 0) txt(mode === 'online' ? (notice || 'Tap for rematch') : 'Tap to continue', W / 2, H / 2 + 70, 18, '#fff');
    }
  }

  // ------------------------------------------------------------ frame render
  function drawFight(t) {
    Wd.drawStage(ctx, view.sg || 0, t);
    Wd.begin(ctx); Wd.drawFloor(ctx, view.sg || 0, t);
    const order = [0, 1]; if (view.f[0].st === 'atk' && view.f[1].st !== 'atk') order.reverse(); if (view.f[0].st === 'launch' || view.f[0].st === 'grab') order.sort((a, b) => b - a);
    const tips = [];
    for (const i of order) {
      const f = fighters[i], s = view.f[i], jit = view.hs > 0 && (f.st === 'hit' || f.st === 'block' || f.st === 'launch') ? (tick % 2 ? 2 : -2) : 0;
      if (s.st === 'dash') for (let g = 2; g >= 1; g--) G.Sprites.draw(ctx, f, t, { ox: -f.facing * (f.wd >= 0 ? 1 : -1) * g * 16, alpha: .18 / g, noShadow: true, noFx: true, noFlash: true });
      { const am = f.atk && f.atk.m; if (s.st === 'atk' && am && (am.super || (am.mvf && am.mvf.some(k => k.vx >= 9))) && f.atk.t >= am.st - 2 && f.atk.t <= am.st + am.ac + 8) for (let g = 3; g >= 1; g--) G.Sprites.draw(ctx, f, t, { ox: -f.facing * g * 18, alpha: .26 / g, noShadow: true, noFx: true, noFlash: true }); }
      tips[i] = G.Sprites.draw(ctx, f, t, { ox: jit });
    }
    Wd.drawShots(ctx, view.s, t);
    for (let i = 0; i < 2; i++) { const f = fighters[i], tp = tips[i]; if (!tp) continue; const m = f.atk && f.atk.m; const isKick = m && /kick|round|sweep|low|clow/.test(m.pose);
      Wd.trail(ctx, i, tp.striking && m ? (isKick ? tp.foot : tp.hand) : null, tp.striking, f.def.accent); }
    Wd.drawFx(ctx);
    Wd.end(ctx);
    Wd.drawForeground(ctx, view.sg || 0, t);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; const v = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 480); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    { const mi = mode === 'online' ? slot : 0, me = view.f[mi]; if (view.ph === 'fight' && me.hp > 0 && me.hp / fighters[mi].maxHp < .25) { const pu = .5 + .5 * Math.sin(tick * .12), g2 = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .85); g2.addColorStop(0, 'rgba(255,0,0,0)'); g2.addColorStop(1, 'rgba(255,20,20,' + (.16 + .22 * pu) + ')'); ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H); } }
    hud(); speaker(); banner(); Wd.overlay(ctx); Wd.overlayTop(ctx);
  }
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    if (screen === 'fight' && view && fighters) return drawFight(t);
    bgMenu(t);
    if (screen === 'menu') {
      ctx.save(); ctx.translate(W / 2, 62 + Math.sin(t * 2) * 2); ctx.rotate(-.03); ctx.shadowColor = '#ff8a1a'; ctx.shadowBlur = 18 + 8 * Math.sin(t * 3); txt('FIGHT ARENA', 0, 0, 52, '#ffd23f'); ctx.restore(); speaker(); txt('TEKKEN-STYLE 2D FIGHTER', W / 2, 90, 13, '#cfd3ff');
      MENU.forEach((b, i) => btn(250, mbY(i), 300, 46, b.label, false));
      if (notice) txt(notice, W / 2, 410, 16, '#ff9a9a');
      txt('Keys: WASD / arrows · J U K I = LP HP LK HK · L special · H grab · ; super · M mute', W / 2, 438, 11, '#9aa0c8');
    } else if (screen === 'how') {
      txt('HOW TO PLAY', W / 2, 44, 34, '#ffd23f');
      const L = ['Hold BACK to block. Hold DOWN+BACK to block low attacks.', 'HIGH hits whiff if you crouch. LOW hits need a crouch-block. MID hits (overhead, launcher) beat crouch-blocking.', 'LP, LP, HP = string combo. Press the next button right as the move lands.', 'DOWN-FORWARD + HP = LAUNCHER. Then hit them with LP/HP while they are airborne (juggle).', 'FORWARD + HP = overhead.  FORWARD + HK = long kick.  DOWN + HK = sweep.', 'GRAB (or LP+LK) beats blocking. Opponent can BREAK it by pressing GRAB fast.', 'Each fighter has 5 specials: SP, ↓+SP, →+SP, ←+SP, ↘+SP (see the card names).', 'PRO: ↓↘→+P, →↓↘+P, ↓↙←+K, ↓↙←+P, ↓↘→+K. Double-tap → or ← to dash. →+LK = knee (Steve).', 'Fill the SUPER bar by fighting, then hit SUPER for a screen-filling move.', 'Under 25% health you enter RAGE: +15% damage.'];
      L.forEach((s, i) => txt(s, W / 2, 84 + i * 31, 14, '#fff', 'center', false)); txt('Tap to go back', W / 2, 425, 14, '#9aa0c8');
    } else if (screen === 'lobby') {
      btn(BACK.x, BACK.y, BACK.w, BACK.h, 'BACK', false); txt('ROOM CODE', W / 2, 150, 22, '#cfd3ff'); txt(code, W / 2, 240, 90, '#ffd23f'); txt('Send this code to your friend (tap to copy)', W / 2, 290, 16, '#fff'); txt(notice || 'Waiting for friend to join…', W / 2, 330, 16, '#9aa0c8');
    } else if (screen === 'select') {
      btn(BACK.x, BACK.y, BACK.w, BACK.h, 'BACK', false); txt('CHOOSE YOUR FIGHTER', W / 2, 52, 30, '#ffd23f'); speaker();
      if (mode === 'online' && picked >= 0) txt('Waiting for friend…', W / 2, 82, 14, '#cfd3ff');
      for (let i = 0; i < N; i++) {
        const c = G.CHARACTERS[i], x = cardX(i), sel = picked === i;
        const g = ctx.createLinearGradient(0, 96, 0, 358); g.addColorStop(0, 'rgba(30,34,70,.9)'); g.addColorStop(1, 'rgba(12,14,34,.95)'); ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, 96, CW, 262, 12) : ctx.rect(x, 96, CW, 262); ctx.fill(); ctx.lineWidth = sel ? 4 : 2; ctx.strokeStyle = sel ? '#ffd23f' : c.accent; ctx.stroke();
        const f = previews[i], cx = x + CW / 2, ps = CW < 100 ? .86 : 1; f.x = cx; f.y = 262; f.st = 'intro'; f.facing = 1; ctx.save(); ctx.translate(cx, 262); ctx.scale(ps, ps); ctx.translate(-cx, -262); G.Sprites.draw(ctx, f, t * 1.0 + i); ctx.restore();
        const nm = CW < 130, words = c.name.split(' ');
        if (nm && words.length > 1) { fit(words[0], cx, 288, CW - 8, 12, '#fff'); fit(words.slice(1).join(' '), cx, 301, CW - 8, 12, '#fff'); fit(c.title, cx, 315, CW - 8, 10, c.accent, 'center', false); }
        else { fit(c.name, cx, 296, CW - 8, nm ? 12 : 15, '#fff'); fit(c.title, cx, 312, CW - 8, nm ? 10 : 11, c.accent, 'center', false); }
        const mv = c.moves; if (!nm) { txt(mv.sp1.name + ' · ' + mv.sp2.name, x + CW / 2, 328, 9, '#cfd3ff', 'center', false); txt(mv.sp3.name + ' · ' + mv.sp4.name, x + CW / 2, 340, 9, '#cfd3ff', 'center', false); txt(mv.sp5.name + ' · ★ ' + mv.super.name, x + CW / 2, 352, 9, '#ffb04a', 'center', false); } else { fit('5 specials', cx, 331, CW - 8, 9, '#cfd3ff', 'center', false); fit('★ ' + mv.super.name, cx, 345, CW - 6, 8, '#ffb04a', 'center', false); }
      }
      if (mode === 'bot') ['easy', 'normal', 'hard'].forEach((d, i) => btn(250 + i * 104, 372, 92, 30, d.toUpperCase(), lvl === d));
      if (mode === 'train') txt('Practice combos on a dummy. Meter is always full.', W / 2, 392, 13, '#8cff9e');
    }
  }

  // ------------------------------------------------------------ main loop
  let last = performance.now(), acc = 0;
  function loop(now) {
    acc += Math.min(100, now - last); last = now;
    while (acc >= 1000 / 60) { step(); acc -= 1000 / 60; }
    draw(now / 1000); requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
