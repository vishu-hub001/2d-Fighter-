// Bot opponent. Plays by pressing buttons through the same input format as a human (so it uses buffers, strings, specials...).
Game.AI = (function () {
  const B = Game.BTN, DIFF = { easy: { react: 16, block: .3, aa: .15, aggr: .55 }, normal: { react: 9, block: .6, aa: .45, aggr: .8 }, hard: { react: 4, block: .85, aa: .8, aggr: 1 } };
  const none = () => ({ l: 0, r: 0, u: 0, d: 0, b: 0, p: 0 });
  const free = f => f.st === 'stand' || f.st === 'crouch' || f.st === 'dash';
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function mk() { return { q: [], wait: 0, guardT: 0, guardLow: false, lvl: 'normal', mode: 'bot', dummy: 'stand', seen: null }; }
  function dirs(me, spec) { // spec like 'f','b','d','df','db','u','uf'
    const o = none(), fw = me.facing === 1; const F = fw ? 'r' : 'l', Bk = fw ? 'l' : 'r';
    for (const c of spec) { if (c === 'f') o[F] = 1; if (c === 'b') o[Bk] = 1; if (c === 'd') o.d = 1; if (c === 'u') o.u = 1; } return o;
  }
  // script = [[frames, dirSpec, buttonMask], ...]
  function enqueue(s, me, script) {
    s.q = []; for (const [n, d, m] of script) for (let i = 0; i < n; i++) { const o = dirs(me, d); o.b = m || 0; o.p = i === 0 ? (m || 0) : 0; s.q.push(o); }
  }
  function think(s, me, foe, M) {
    if (s.mode === 'dummy') { const o = none(); if (s.dummy !== 'stand') { const r = me.facing === 1 ? 'l' : 'r'; o[r] = 1; if (s.dummy === 'crouch') o.d = 1; } return o; }
    const D = DIFF[s.lvl], dist = Math.abs(foe.x - me.x);
    if (me.st === 'grab') { const o = none(); if (Math.random() < .12) { o.b = B.th; o.p = B.th; } return o; }
    if (s.q.length) { if (free(me)) return s.q.shift(); s.q = []; }
    const o = none(); const back = dirs(me, s.guardLow ? 'bd' : 'b');
    // ---- defence
    const fa = foe.atk, atkNow = foe.st === 'atk' && fa && fa.m && !fa.m.proj && fa.t <= fa.m.st + fa.m.ac + 2 && dist < 170;
    const shot = M && M.shots.find(x => x.o !== me.idx && Math.abs(x.x - me.x) < 150 && Math.sign(x.vx) === Math.sign(me.x - x.x));
    if ((atkNow || shot) && s.guardT <= 0 && free(me) && Math.random() < D.block) { s.guardT = 22; s.guardLow = atkNow && fa.m.lvl === 'l'; }
    if (s.guardT > 0 && me.st !== 'atk') { s.guardT--; return dirs(me, s.guardLow ? 'bd' : 'b'); }
    if (!free(me)) return (me.st === 'block') ? back : o;
    if (s.wait > 0) { s.wait--; return o; }
    s.wait = Math.max(1, Math.round(D.react * (.6 + Math.random() * .8)));
    // ---- super
    if (me.meter >= 100 && dist < 330 && (foe.st === 'hit' || foe.st === 'block' || dist < 200) && Math.random() < .5) { enqueue(s, me, [[1, '', B.su]]); return o; }
    // ---- anti air
    if (foe.st === 'air' && dist < 170 && Math.random() < D.aa) { enqueue(s, me, [[1, 'd', B.sp]]); return o; }
    // ---- punish recovery
    if (foe.st === 'atk' && fa && fa.m && fa.t > fa.m.st + fa.m.ac && dist < 110 && Math.random() < D.aggr) { enqueue(s, me, pick([[[1, '', B.lp], [6, '', 0], [1, '', B.lp]], [[1, 'df', B.hp], [16, '', 0], [1, '', B.lp], [5, '', 0], [1, '', B.lp]]])); return o; }
    if (foe.st === 'down' || foe.st === 'wake') { return dist > 90 ? dirs(me, 'f') : o; }
    const r = Math.random();
    if (dist > 230) {
      if (r < .1 && M && M.shotsOf(me.idx) === 0) enqueue(s, me, [[1, '', B.sp]]);
      else if (r < .2) enqueue(s, me, [[2, 'f', 0], [3, '', 0], [2, 'f', 0], [14, 'f', 0]]);
      else if (r < .26) enqueue(s, me, [[3, 'uf', 0], [24, '', 0], [1, '', B.hk]]);
      else return Math.random() < D.aggr ? dirs(me, 'f') : o;
    } else if (dist > 120) {
      if (r < .2) enqueue(s, me, [[1, 'f', B.hk]]);
      else if (r < .32) enqueue(s, me, [[1, 'd', B.hk]]);
      else if (r < .42) enqueue(s, me, [[2, 'f', 0], [3, '', 0], [2, 'f', 0], [10, '', 0]]);
      else if (r < .5 && M && M.shotsOf(me.idx) === 0) enqueue(s, me, [[1, '', B.sp]]);
      else return Math.random() < D.aggr ? dirs(me, 'f') : o;
    } else {
      if (r < .24) enqueue(s, me, [[1, '', B.lp], [6, '', 0], [1, '', B.lp], [7, '', 0], [1, '', B.hp]]);
      else if (r < .34) enqueue(s, me, [[1, '', B.th]]);
      else if (r < .45) enqueue(s, me, [[1, 'df', B.hp], [16, '', 0], [1, '', B.lp], [5, '', 0], [1, '', B.lp]]);
      else if (r < .57) enqueue(s, me, [[1, 'd', B.lk], [7, 'd', 0], [1, '', B.lp]]);
      else if (r < .66) enqueue(s, me, [[1, 'f', B.hp]]);
      else if (r < .74) enqueue(s, me, [[1, '', B.hk]]);
      else if (r < .8) enqueue(s, me, [[1, pick(['d', 'b', 'df', 'f']), B.sp]]);
      else if (r < .9) { s.guardT = 25; s.guardLow = Math.random() < .4; }
      else return dirs(me, 'b');
    }
    return s.q.length ? s.q.shift() : o;
  }
  return { mk, think, DIFF };
})();
