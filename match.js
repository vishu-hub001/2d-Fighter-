// Match = best-of-N rounds between two fighters. Pure logic, no drawing.
// Used by the browser (bot mode) AND the Node server (online rooms).
Game.Match = class {
  constructor(c0, c1, opts) {
    this.training = !!(opts && opts.training); this.c = [c0, c1]; this.wins = [0, 0]; this.win = -1; this.round = 0; this.sid = 0; this.events = [];
    this.stage = Math.floor(Math.random() * Game.STAGES.length);
    this.startRound();
  }
  startRound() {
    const C = Game.CHARACTERS, mid = Game.STAGE_W / 2;
    this.round++;
    this.f = [new Game.Fighter(C[this.c[0]], mid - 140, 1, 0), new Game.Fighter(C[this.c[1]], mid + 140, -1, 1)];
    this.f.forEach(x => { x.M = this; x.st = 'intro'; });
    this.shots = []; this.timer = Game.ROUND_SECONDS * 60; this.intro = 170; this.endT = 0; this.msg = ''; this.ph = 'fight';
    this.hitstop = 0; this.slow = 0; this.events = [];
  }
  shotsOf(i) { let n = 0; for (const s of this.shots) if (s.o === i && s.p.n === undefined) n++; return n; }
  spawnShot(f, m) {
    const p = m.proj;
    this.shots.push({ id: ++this.sid, x: f.x + f.facing * 40, y: p.y, vx: f.facing * p.speed, o: f.idx, p, life: p.life, n: p.n || 1, cd: 0, d: f.facing, vy: p.vy || 0, g: p.g || 0, bn: 0 });
    this.events.push({ t: 'shot', x: f.x + f.facing * 40, y: Game.GROUND - p.y, i: f.idx, c: p.color });
  }
  techBreak(a, b) {
    [a, b].forEach((f, k) => { const o = k ? a : b; f.atk = null; f.st = 'hit'; f.sf = 0; f.stun = 16; f.crouchHit = 0; f.vx = -Math.sign(o.x - f.x || 1) * 4.5; f.grabber = null; });
    this.events.push({ t: 'tech', x: (a.x + b.x) / 2, y: Game.GROUND - 80 });
    this.hitstop = Math.max(this.hitstop, 6);
  }

  step(a, b) {
    this.events = [];
    const G = Game, [p, q] = this.f;
    if (this.slow > 0) { this.slow--; if (this.slow % 3 !== 0) return; }
    if (this.ph === 'fight') {
      if (this.intro > 0) {
        this.intro--;
        if (this.intro === 0) this.f.forEach(x => { x.st = 'stand'; x.sf = 0; });
        return;
      }
      const frozen = this.hitstop > 0;
      p.push(a, frozen); q.push(b, frozen);
      if (frozen) { this.hitstop--; return; }
      p.update(q); q.update(p);
      this.resolve();
      this.updateShots();
      this.pushApart();
      if (this.training) { this.timer = Game.ROUND_SECONDS * 60; this.f.forEach(x => { if (x.hp <= 0 || (x.hp < x.maxHp && !x.inCombo && (x.st === 'stand' || x.st === 'crouch'))) x.hp = Math.min(x.maxHp, Math.max(x.hp, 1) + 8); x.meter = Math.max(x.meter, 100 * (x.idx === 0 ? 1 : 0)); }); }
      else if (--this.timer <= 0 || p.hp <= 0 || q.hp <= 0) this.endRound();
    } else if (this.ph === 'roundEnd') {
      const none = { l: 0, r: 0, u: 0, d: 0, b: 0, p: 0 };
      if (this.hitstop > 0) this.hitstop--;
      else { p.push(none); q.push(none); p.update(q); q.update(p); this.pushApart(); }
      this.pose();
      if (--this.endT <= 0) {
        if (this.wins[0] >= G.WINS_NEEDED || this.wins[1] >= G.WINS_NEEDED) { this.ph = 'matchEnd'; this.endT = 90; this.win = this.wins[0] > this.wins[1] ? 0 : 1; }
        else this.startRound();
      }
    } else if (this.ph === 'matchEnd') {
      if (this.endT > 0) this.endT--;
      const none = { l: 0, r: 0, u: 0, d: 0, b: 0, p: 0 };
      p.push(none); q.push(none); p.update(q); q.update(p);
    }
  }

  // winner strikes a victory pose once the loser is down
  pose() {
    for (let i = 0; i < 2; i++) {
      const w = this.f[i], l = this.f[1 - i];
      if (this.winner === i && w.st !== 'win' && w.y >= Game.GROUND && w.st !== 'launch' && w.st !== 'grab' && (this.timeUp || l.st === 'ko' || l.st === 'down')) {
        w.atk = null; w.st = 'win'; w.sf = 0; w.vx = 0;
      }
    }
  }

  // ---------------------------------------------------------------- hit resolution
  resolve() {
    const G = Game, F = this.f, list = [];
    const ov = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
    for (let i = 0; i < 2; i++) {
      const A = F[i], B = F[1 - i], box = A.activeBox(); if (!box) continue;
      const m = A.atk.m, hb = B.hurtBox(m.lvl); if (!hb) continue;
      if (m.throw) {
        if (!['stand', 'crouch', 'block', 'dash', 'atk', 'land', 'prejump'].includes(B.st) || B.y < G.GROUND - 1) continue;
        if (box.x0 < hb.x1 && box.x1 > hb.x0) list.push({ A, B, box, hb, m, throw: true });
        continue;
      }
      if (m.lvl === 'h' && B.ducking()) continue;
      if (ov(box, hb)) list.push({ A, B, box, hb, m });
    }
    // throws first (and throw-vs-throw = both broken)
    const throws = list.filter(r => r.throw);
    if (throws.length === 2) { throws.forEach(r => { r.A.atk.hit = true; }); this.techBreak(F[0], F[1]); return; }
    for (const r of throws) { if (r.A.st === 'atk' && r.B.st !== 'grab') r.A.startGrab(r.B); }
    let ko = false;
    for (const r of list) {
      if (r.throw) continue;
      const { A, B, m, box, hb } = r;
      if (A.st !== 'atk' || A.atk.m !== m || A.atk.hit || B.st === 'grab' || A.st === 'grab') continue;
      const a = A.atk, rem = m.st + m.ac + m.rc - a.t;
      const blocked = B.guardNow(m.lvl);
      const ctr = !blocked && B.st === 'atk' && B.atk && !B.atk.m.throw && B.atk.t <= B.atk.m.st + B.atk.m.ac;
      const o = { m, dmg: m.dmg, lvl: m.lvl, blocked, rem, adv: m.adv + (ctr ? 3 : 0), advB: m.advB, dir: A.facing, ctr, kind: 'melee' };
      const res = B.receive(A, o);
      a.hit = true; a.conn = true; a.n++; a.rearm = m.multi ? m.multi.gap : 0;
      if (!blocked && m.hitRecov) a.t = Math.max(a.t, m.st + m.ac + m.rc - m.hitRecov);
      this.afterHit(A, B, res, m, o, { x: (Math.max(box.x0, hb.x0) + Math.min(box.x1, hb.x1)) / 2, y: G.GROUND - (Math.max(box.y0, hb.y0) + Math.min(box.y1, hb.y1)) / 2 });
    }
  }
  afterHit(A, B, res, m, o, pt) {
    const G = Game, dir = o.dir, blocked = res.r === 'block';
    let k = m.dmg < 50 ? 0 : m.dmg < 85 ? 1 : 2; if (!blocked && (res.fx === 'launch' || res.ko)) k = 3; if (m.super) k = 4;
    this.events.push({ t: blocked ? 'blk' : 'hit', x: pt.x, y: pt.y, k, c: o.ctr ? 1 : 0, d: dir, by: A.idx, dmg: res.dmg });
    this.hitstop = Math.max(this.hitstop, Math.max(3, (m.hs !== undefined ? m.hs : 8) - (blocked ? 3 : 0)) + (o.ctr ? 3 : 0) + (res.ko ? 14 : 0));
    // corner pressure: attacker is pushed back when the defender has no room
    const cornered = (dir > 0 && B.x > G.STAGE_W - 66) || (dir < 0 && B.x < 66);
    if (cornered && A.onGround) A.vx = -dir * Math.max(2.5, Math.abs(B.vx)) * 0.85;
  }

  updateShots() {
    const G = Game, F = this.f;
    for (const s of this.shots) {
      s.x += s.vx; s.life--; if (s.cd > 0) s.cd--;
      if (s.g) { s.y += s.vy; s.vy -= s.g; if (s.y < 14) { s.y = 14; if (s.bn < 1) { s.vy = Math.abs(s.vy) * .55; s.bn++; this.events.push({ t: 'dust', x: s.x, k: 'land', d: 1 }); } else { s.dead = true; this.events.push({ t: 'clash', x: s.x, y: Game.GROUND - 14 }); continue; } } }
      if (s.life <= 0 || s.x < -60 || s.x > G.STAGE_W + 60) { s.dead = true; continue; }
      const B = F[1 - s.o], A = F[s.o], p = s.p, lvl = p.lvl || 'a';
      if (s.cd > 0) continue;
      const hb = B.hurtBox(lvl); if (!hb) continue;
      const bx = { x0: s.x - p.w / 2, x1: s.x + p.w / 2, y0: s.y - p.h / 2, y1: s.y + p.h / 2 };
      if (!(bx.x0 < hb.x1 && bx.x1 > hb.x0 && bx.y0 < hb.y1 && bx.y1 > hb.y0)) continue;
      if (B.st === 'grab') continue;
      const blocked = B.guardNow(lvl);
      const ctr = !blocked && B.st === 'atk' && B.atk && B.atk.t <= B.atk.m.st + B.atk.m.ac;
      const dir = Math.sign(s.vx) || 1;
      const o = { m: p, dmg: p.dmg, lvl, blocked, stunH: p.stunH, stunB: p.stunB, dir, ctr, kind: 'shot' };
      const res = B.receive(A, o);
      this.afterHit(A, B, res, p, o, { x: Math.min(Math.max(s.x, hb.x0), hb.x1), y: G.GROUND - s.y });
      s.n--; s.cd = p.gap || 0; if (s.n <= 0) s.dead = true;
    }
    // projectile clash
    for (let i = 0; i < this.shots.length; i++) for (let j = i + 1; j < this.shots.length; j++) {
      const a = this.shots[i], b = this.shots[j];
      if (a.dead || b.dead || a.o === b.o || a.p.n || b.p.n) continue;
      if (Math.abs(a.x - b.x) < (a.p.w + b.p.w) / 2 && Math.abs(a.y - b.y) < 40) { a.dead = b.dead = true; this.events.push({ t: 'clash', x: (a.x + b.x) / 2, y: G.GROUND - a.y }); }
    }
    this.shots = this.shots.filter(s => !s.dead);
  }

  pushApart() {
    const G = Game, [p, q] = this.f, min = 60, max = G.STAGE_W - 60;
    const solid = f => f.st !== 'down' && f.st !== 'ko' && f.st !== 'grab' && f.y >= G.GROUND - 80;
    if (solid(p) && solid(q) && Math.abs(p.y - q.y) < 70) {
      const dx = q.x - p.x, md = (p.def.w + q.def.w) / 2 * 0.92;
      if (Math.abs(dx) < md) {
        const sg = dx === 0 ? (p.facing || 1) : Math.sign(dx), push = (md - Math.abs(dx)) / 2;
        p.x -= push * sg; q.x += push * sg;
        if (p.x < min) { q.x += min - p.x; p.x = min; } if (p.x > max) { q.x -= p.x - max; p.x = max; }
        if (q.x < min) { p.x += min - q.x; q.x = min; } if (q.x > max) { p.x -= q.x - max; q.x = max; }
      }
    }
    // never let the fighters get further apart than the screen allows
    const dist = q.x - p.x, ad = Math.abs(dist);
    if (ad > G.MAX_DIST) { const ex = (ad - G.MAX_DIST) / 2, sg = Math.sign(dist); p.x += ex * sg; q.x -= ex * sg; }
  }

  endRound() {
    const [p, q] = this.f, G = Game;
    const pk = p.hp <= 0, qk = q.hp <= 0; this.timeUp = this.timer <= 0 && !pk && !qk;
    let who = pk && qk ? -1 : pk ? 1 : qk ? 0 : p.hp > q.hp ? 0 : q.hp > p.hp ? 1 : -1;
    this.winner = who;
    if (who >= 0) this.wins[who]++;
    this.msg = who < 0 ? (pk && qk ? 'DOUBLE K.O.' : 'DRAW') : (this.timeUp ? 'TIME UP' : 'K.O.');
    this.sub = who >= 0 ? this.f[who].def.name + ' wins' : '';
    this.ph = 'roundEnd'; this.endT = 190;
    if (!this.timeUp) { this.slow = 80; this.events.push({ t: 'ko', x: (pk ? p : q).x, i: pk ? 0 : 1 }); }
    else this.events.push({ t: 'time' });
    this.f.forEach(x => { x.atk && x.atk.grab && x.atk.grab.vic.release(); });
  }

  serialize() {
    const f = this.f.map((x, i) => { const s = x.serialize(); s.cl = this.f[1 - i].inCombo ? 1 : 0; return s; });
    return { ph: this.ph, t: this.timer, i: this.intro, e: this.endT, w: this.wins, m: this.msg, sub: this.sub || '', win: this.win, rd: this.round, hs: this.hitstop, sl: this.slow, sg: this.stage,
      f, s: this.shots.map(s => ({ id: s.id, x: +s.x.toFixed(1), y: s.y, c: s.p.color, st: s.p.style, w: s.p.w, h: s.p.h, d: s.d })), ev: this.events };
  }
};
if (typeof module !== 'undefined') module.exports = Game.Match;
