// Screens: menu / lobby / select / fight. Modes: 'bot' (local) and 'online' (server-authoritative rooms).
(function () {
  const G = Game, W = G.W, H = G.H, N = G.CHARACTERS.length;
  const cv = document.getElementById('game'), ctx = cv.getContext('2d'), controls = document.getElementById('controls');
  cv.width = W; cv.height = H;
  function resize() { const s = Math.min(innerWidth / W, innerHeight / H); cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px'; }
  addEventListener('resize', resize); resize();
  const setCtl = on => controls.style.display = on ? 'flex' : 'none'; setCtl(false);

  let screen = 'menu', mode = 'bot', slot = 0, code = '', picked = -1, notice = '', match = null, view = null, fighters = null, lastSent = '';
  const previews = G.CHARACTERS.map(c => new G.Fighter(c, 0, 1));
  const CW = Math.min(180, (W - 60 - (N - 1) * 20) / N), cardX = i => (W - (N * CW + (N - 1) * 20)) / 2 + i * (CW + 20);
  const MENU = [{ y: 140, label: 'PLAY VS BOT', a: 'bot' }, { y: 205, label: 'CREATE ROOM', a: 'create' }, { y: 270, label: 'JOIN ROOM', a: 'join' }];
  const BACK = { x: 10, y: 10, w: 80, h: 32 };
  const inR = (x, y, r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;

  function toMenu(msg) { G.Net.close(); screen = 'menu'; notice = msg || ''; match = null; view = null; setCtl(false); }
  function initFighters(c) { fighters = c.map((ci, k) => new G.Fighter(G.CHARACTERS[ci], k ? 600 : 200, k ? -1 : 1)); }
  function startBot(i) {
    mode = 'bot'; slot = 0; match = new G.Match(i, (i + 1) % N); G.AI.state = { t: 0, block: 0 };
    initFighters(match.c); screen = 'fight'; setCtl(true);
  }
  function online(first) {
    mode = 'online'; notice = 'Connecting… (server may take ~30s to wake up)';
    G.Net.onmsg = onNet; G.Net.onclose = () => { if (mode === 'online' && screen !== 'menu') toMenu('Disconnected'); else notice = 'Could not connect'; };
    G.Net.connect(() => { notice = ''; G.Net.send(first); });
  }
  function onNet(m) {
    if (m.t === 'room') { slot = m.slot; code = m.code; screen = 'lobby'; }
    else if (m.t === 'joined') { screen = 'select'; picked = -1; view = null; match = null; setCtl(false); }
    else if (m.t === 'start') { initFighters(m.c); view = null; screen = 'fight'; setCtl(true); }
    else if (m.t === 's') view = m.s;
    else if (m.t === 'left') toMenu('Friend left the room');
    else if (m.t === 'err') toMenu(m.msg);
  }

  cv.addEventListener('pointerdown', e => {
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
    if (screen === 'menu') {
      MENU.forEach(b => { if (inR(x, y, { x: 250, y: b.y, w: 300, h: 50 })) {
        if (b.a === 'bot') { mode = 'bot'; notice = ''; screen = 'select'; }
        else if (b.a === 'create') online({ t: 'create' });
        else { const c = prompt('Enter room code'); if (c) online({ t: 'join', code: c }); }
      } });
    } else if (screen === 'lobby') {
      if (inR(x, y, BACK)) toMenu();
      else { try { navigator.clipboard.writeText(code); notice = 'Code copied!'; } catch (_) {} }
    } else if (screen === 'select') {
      if (inR(x, y, BACK)) return toMenu();
      for (let i = 0; i < N; i++) if (inR(x, y, { x: cardX(i), y: 120, w: CW, h: 240 })) {
        if (mode === 'bot') startBot(i); else { picked = i; G.Net.send({ t: 'pick', i }); }
      }
    } else if (screen === 'fight') {
      if (inR(x, y, { x: W / 2 - 30, y: 72, w: 60, h: 24 })) return toMenu();
      if (view && view.ph === 'matchEnd' && view.e <= 0) { if (mode === 'bot') toMenu(); else { G.Net.send({ t: 'rematch' }); notice = 'Waiting for friend…'; } }
    }
  });

  function sendInput() {
    const i = G.input, m = { t: 'in', l: +i.left, r: +i.right, u: +i.up, p: +i.punch, k: +i.kick, s: +i.special }, key = JSON.stringify(m);
    if (key !== lastSent || m.p || m.k || m.s) { G.Net.send(m); lastSent = key; }
    G.clearEdges();
  }
  function update() {
    if (screen !== 'fight') return;
    if (mode === 'bot') { match.step(G.input, G.AI.think(match.f[1], match.f[0])); G.clearEdges(); view = match.serialize(); }
    else sendInput();
    if (view) view.f.forEach((s, i) => fighters[i].applyState(s));
  }

  // ---------- drawing ----------
  function text(s, x, y, size, color, align) { ctx.font = `bold ${size}px system-ui,sans-serif`; ctx.textAlign = align || 'center'; ctx.fillStyle = color || '#fff'; ctx.fillText(s, x, y); }
  function button(x, y, w, h, label, fs) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h); text(label, x + w / 2, y + h / 2 + (fs || 20) / 3, fs || 20); }
  function bg() {
    const g = ctx.createLinearGradient(0, 0, 0, G.GROUND); g.addColorStop(0, '#1b2a5a'); g.addColorStop(1, '#d9825b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2a2f4a'; ctx.beginPath(); ctx.moveTo(0, G.GROUND); ctx.lineTo(120, 250); ctx.lineTo(260, G.GROUND); ctx.lineTo(420, 230); ctx.lineTo(580, G.GROUND); ctx.lineTo(700, 270); ctx.lineTo(800, G.GROUND); ctx.fill();
    ctx.fillStyle = '#3b3326'; ctx.fillRect(0, G.GROUND, W, H - G.GROUND);
  }
  function bar(x, w, f, color, right) {
    ctx.fillStyle = '#000'; ctx.fillRect(x - 2, 18, w + 4, 22); ctx.fillStyle = '#444'; ctx.fillRect(x, 20, w, 18);
    ctx.fillStyle = color; const fw = w * Math.max(0, f); ctx.fillRect(right ? x + w - fw : x, 20, fw, 18);
  }
  function hud() {
    [[fighters[0], 30, false], [fighters[1], 450, true]].forEach(([p, x, r]) => {
      bar(x, 320, p.hp / p.maxHp, p.hp / p.maxHp > 0.3 ? '#4be06b' : '#e84b4b', r);
      text(p.def.name, r ? x + 320 : x, 58, 14, '#fff', r ? 'right' : 'left');
      const sx = r ? x + 200 : x; ctx.fillStyle = '#222'; ctx.fillRect(sx, 66, 120, 6); ctx.fillStyle = p.cd ? '#667' : '#8fdcff'; ctx.fillRect(sx, 66, 120 * (1 - p.cd / p.def.special.cool), 6);
    });
    const w = view ? view.w : [0, 0];
    text(String(view ? Math.max(0, Math.ceil(view.t / 60)) : G.ROUND_SECONDS), W / 2, 44, 32);
    for (let k = 0; k < G.WINS_NEEDED; k++) {
      ctx.fillStyle = k < w[0] ? '#ffd23f' : '#333'; ctx.beginPath(); ctx.arc(W / 2 - 40 - k * 16, 60, 5, 0, 7); ctx.fill();
      ctx.fillStyle = k < w[1] ? '#ffd23f' : '#333'; ctx.beginPath(); ctx.arc(W / 2 + 40 + k * 16, 60, 5, 0, 7); ctx.fill();
    }
    text('quit', W / 2, 90, 11, 'rgba(255,255,255,.5)');
  }
  function cards() {
    G.CHARACTERS.forEach((c, i) => {
      const x = cardX(i); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x, 120, CW, 240);
      ctx.strokeStyle = picked === i ? '#ffd23f' : c.suit; ctx.lineWidth = picked === i ? 5 : 3; ctx.strokeRect(x, 120, CW, 240);
      const f = previews[i]; f.x = x + CW / 2; f.y = 300; f.draw(ctx);
      text(c.name, x + CW / 2, 335, 15); text('⚡ ' + c.special.name, x + CW / 2, 352, 12, '#8fdcff');
    });
  }
  function draw() {
    bg();
    if (screen === 'menu') {
      text('FIGHT ARENA', W / 2, 90, 48, '#ffd23f');
      MENU.forEach(b => button(250, b.y, 300, 50, b.label));
      if (notice) text(notice, W / 2, 355, 16, '#ffb', 'center');
      text('Play with bots or with friends online', W / 2, 410, 14, '#ccc');
    } else if (screen === 'lobby') {
      button(BACK.x, BACK.y, BACK.w, BACK.h, '✕ Back', 14);
      text('ROOM CODE', W / 2, 130, 24, '#ddd'); text(code, W / 2, 230, 96, '#ffd23f');
      text('Tap code to copy • share it with your friend', W / 2, 280, 16, '#ddd'); text('Waiting for friend to join…', W / 2, 330, 22);
      if (notice) text(notice, W / 2, 380, 16, '#ffb');
    } else if (screen === 'select') {
      button(BACK.x, BACK.y, BACK.w, BACK.h, '✕ Back', 14);
      text(mode === 'online' ? (picked < 0 ? 'Pick your fighter' : 'Waiting for opponent to pick…') : 'Tap a fighter', W / 2, 90, 30, '#ffd23f');
      cards();
      text('Left: move/jump • Right: punch / kick / special • Hold back = block', W / 2, 415, 14, '#ccc');
    } else {
      fighters.forEach(f => f.draw(ctx));
      if (mode === 'online') text('▼ YOU', fighters[slot].x, fighters[slot].y - 145, 14, '#ffd23f');
      if (view) {
        view.s.forEach(s => { ctx.fillStyle = s.c; ctx.shadowColor = s.c; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(s.x, s.y, 10, 0, 7); ctx.fill(); ctx.shadowBlur = 0; });
        if (view.ph === 'fight' && view.i > 0) text(view.i > 40 ? 'ROUND READY' : 'FIGHT!', W / 2, 200, 52, '#ffd23f');
        if (view.ph === 'roundEnd') text(view.m, W / 2, 200, 40, '#ffd23f');
        if (view.ph === 'matchEnd') {
          ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, H);
          text(view.win === slot ? 'YOU WIN!' : 'YOU LOSE', W / 2, 200, 56, '#ffd23f');
          if (view.e <= 0) text(mode === 'bot' ? 'Tap to continue' : (notice || 'Tap for rematch'), W / 2, 250, 22);
        }
      }
      hud();
    }
  }
  (function loop() { update(); draw(); requestAnimationFrame(loop); })();
})();
