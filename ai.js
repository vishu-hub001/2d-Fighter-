// Very simple CPU opponent. Returns an input object each frame.
Game.AI = {
  state: { t: 0, block: 0 },
  think(me, foe) {
    const s = this.state, i = { left: 0, right: 0, up: 0, punch: 0, kick: 0, special: 0 };
    const dx = foe.x - me.x, d = Math.abs(dx), toward = dx > 0 ? 'right' : 'left', away = dx > 0 ? 'left' : 'right';
    s.t--; if (s.block > 0) s.block--;
    if (foe.atk && d < 120 && s.block === 0 && Math.random() < 0.03) s.block = 25;
    if (s.block > 0) { i[away] = 1; return i; }
    if (d > 95) {
      i[toward] = 1;
      if (d > 240 && me.cd === 0 && Math.random() < 0.02) i.special = 1;
      if (Math.random() < 0.008) i.up = 1;
    } else if (s.t <= 0) {
      const r = Math.random();
      if (r < 0.4) i.punch = 1; else if (r < 0.65) i.kick = 1; else if (r < 0.75) s.block = 20; else i[away] = 1;
      s.t = 18 + Math.random() * 30;
    }
    return i;
  }
};
