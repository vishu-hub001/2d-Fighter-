// Match = best-of-N rounds between two fighters. Pure logic, no drawing.
// Used by the browser (bot mode) AND the Node server (online rooms).
Game.Match = class {
  constructor(c0, c1) {
    this.c = [c0, c1]; this.wins = [0, 0]; this.win = -1; this.startRound();
  }
  startRound() {
    const C = Game.CHARACTERS;
    this.f = [new Game.Fighter(C[this.c[0]], 200, 1), new Game.Fighter(C[this.c[1]], 600, -1)];
    this.shots = []; this.timer = Game.ROUND_SECONDS * 60; this.intro = 100; this.endT = 0; this.msg = ''; this.ph = 'fight';
  }
  step(a, b) {
    const [p, q] = this.f, G = Game;
    if (this.ph === 'fight') {
      if (this.intro > 0) { this.intro--; return; }
      p.update(a, q, this.shots); q.update(b, p, this.shots);
      const dx = q.x - p.x;
      if (Math.abs(dx) < 36 && p.onGround && q.onGround) { const push = (36 - Math.abs(dx)) / 2 * Math.sign(dx || 1); p.x -= push; q.x += push; }
      for (const s of this.shots) {
        s.x += s.vx; const t = s.owner === p ? q : p;
        if (Math.abs(s.x - t.x) < 28 && s.y > t.y - 115 && s.y < t.y) { t.hurt(s.dmg, Math.sign(s.vx)); s.dead = true; }
        if (s.x < -20 || s.x > G.W + 20) s.dead = true;
      }
      this.shots = this.shots.filter(s => !s.dead);
      if (--this.timer <= 0 || p.hp <= 0 || q.hp <= 0) this.endRound();
    } else if (this.ph === 'roundEnd') {
      if (--this.endT <= 0) {
        if (this.wins[0] >= G.WINS_NEEDED || this.wins[1] >= G.WINS_NEEDED) { this.ph = 'matchEnd'; this.endT = 60; this.win = this.wins[0] > this.wins[1] ? 0 : 1; }
        else this.startRound();
      }
    } else if (this.ph === 'matchEnd' && this.endT > 0) this.endT--;
  }
  endRound() {
    const [p, q] = this.f, who = p.hp > q.hp ? 0 : q.hp > p.hp ? 1 : -1;
    if (who >= 0) this.wins[who]++;
    this.msg = who < 0 ? 'DRAW' : (this.timer <= 0 ? 'TIME!  ' : 'K.O.  ') + this.f[who].def.name + ' wins';
    this.ph = 'roundEnd'; this.endT = 130;
  }
  serialize() {
    return { ph: this.ph, t: this.timer, i: this.intro, e: this.endT, w: this.wins, m: this.msg, win: this.win,
      f: this.f.map(x => x.serialize()), s: this.shots.map(s => ({ x: +s.x.toFixed(1), y: s.y, c: s.color })) };
  }
};
if (typeof module !== 'undefined') module.exports = Game.Match;
