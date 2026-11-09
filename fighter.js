// Fighter: physics, attacks, drawing.
Game.Fighter = class {
  constructor(def, x, facing) {
    this.def = def; this.x = x; this.y = Game.GROUND; this.facing = facing;
    this.vx = 0; this.vy = 0; this.hp = def.hp; this.maxHp = def.hp;
    this.atk = null; this.stun = 0; this.flash = 0; this.cd = 0;
    this.anim = 0; this.moving = false; this.blocking = false; this.w = 40;
  }
  get onGround() { return this.y >= Game.GROUND; }

  update(inp, opp, shots) {
    const d = this.def, G = Game;
    if (this.cd > 0) this.cd--;
    if (this.flash > 0) this.flash--;
    this.moving = false; this.blocking = false;

    if (this.stun > 0) {
      this.stun--; this.vx *= 0.88;
    } else if (!this.atk) {
      if (this.onGround) this.facing = opp.x >= this.x ? 1 : -1;
      const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      this.vx = dir * d.speed; this.moving = dir !== 0;
      this.blocking = this.onGround && dir !== 0 && dir === -this.facing;
      if (inp.up && this.onGround) this.vy = d.jump;
      if (inp.punch) this.startAtk('punch');
      else if (inp.kick) this.startAtk('kick');
      else if (inp.special && this.cd === 0) this.startAtk('special');
    }

    if (this.atk) this.runAtk(opp, shots);

    this.vy += G.GRAVITY; this.x += this.vx; this.y += this.vy;
    if (this.y >= G.GROUND) { this.y = G.GROUND; this.vy = 0; }
    this.x = Math.max(30, Math.min(G.W - 30, this.x));
    if (this.moving) this.anim += 0.25;
  }

  startAtk(type) {
    const m = this.def[type];
    this.atk = { type, t: 0, hit: false, f: m.frames, m };
    if (this.onGround) this.vx = 0;
    if (type === 'special') this.cd = m.cool;
  }

  runAtk(opp, shots) {
    const a = this.atk, [s, ac, r] = a.f;
    a.t++;
    if (a.type === 'special') {
      if (a.t === s) shots.push({ x: this.x + this.facing * 40, y: this.y - 80, vx: this.facing * a.m.speed, dmg: a.m.dmg, owner: this, color: a.m.color });
    } else if (a.t > s && a.t <= s + ac && !a.hit) {
      const dx = (opp.x - this.x) * this.facing;
      if (dx > -10 && dx < a.m.range + 20 && Math.abs(opp.y - this.y) < 70) { a.hit = true; opp.hurt(a.m.dmg, this.facing); }
    }
    if (a.t >= s + ac + r) this.atk = null;
  }

  hurt(dmg, dir) {
    const blocked = this.blocking;
    this.hp = Math.max(0, this.hp - (blocked ? Math.ceil(dmg * 0.2) : dmg));
    this.stun = blocked ? 6 : 16; this.vx = dir * (blocked ? 3 : 6);
    if (!blocked) { this.vy = -4; this.atk = null; }
    this.flash = 6;
  }

  // --- network helpers (server serialises, clients apply) ---
  serialize() {
    const a = this.atk;
    return { x: +this.x.toFixed(1), y: +this.y.toFixed(1), f: this.facing, hp: this.hp, cd: this.cd, fl: this.flash,
      m: this.moving ? 1 : 0, b: this.blocking ? 1 : 0, a: a ? [a.type, a.t, a.f[0], a.f[1], a.f[2]] : 0 };
  }
  applyState(s) {
    this.x = s.x; this.y = s.y; this.facing = s.f; this.hp = s.hp; this.cd = s.cd; this.flash = s.fl;
    this.moving = !!s.m; this.blocking = !!s.b;
    this.atk = s.a ? { type: s.a[0], t: s.a[1], f: [s.a[2], s.a[3], s.a[4]] } : null;
    if (this.moving) this.anim += 0.25;
  }

  phase() { const a = this.atk; if (!a) return null; return a.t <= a.f[0] ? 'start' : a.t <= a.f[0] + a.f[1] ? 'active' : 'recover'; }

  draw(ctx) {
    const d = this.def, p = this.phase(), t = this.atk && this.atk.type;
    const col = c => this.flash > 0 ? '#fff' : c;
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const sw = this.moving ? Math.sin(this.anim) * 10 : 0;
    const air = !this.onGround;
    ctx.save(); ctx.translate(this.x, this.y); ctx.scale(this.facing, 1);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 0, 30, 6, 0, 0, 7); ctx.fill();
    ctx.translate(0, air ? Math.min(0, (this.y - Game.GROUND)) * 0 : 0);
    // cape
    if (d.cape) { ctx.fillStyle = col(d.cape); ctx.beginPath(); ctx.moveTo(-8, -98); ctx.lineTo(-36 - Math.abs(sw), -28); ctx.lineTo(-4, -38); ctx.fill(); }
    // back leg + front leg
    R(-14 - sw, -52, 13, 52, col(d.dark));
    if (t === 'kick' && p === 'active') R(0, -66, 70, 13, col(d.suit)); else R(2 + sw, -52, 13, 52, col(d.dark));
    // back arm
    R(-24, -96, 10, 40, col(d.skin));
    // torso
    R(-18, -100, 36, 52, col(d.suit)); R(-18, -52, 36, 6, col(d.accent));
    this.drawLook(ctx, R, col);
    // front arm
    if ((t === 'punch' || t === 'special') && p !== null) {
      const len = p === 'active' ? 62 : p === 'start' ? 22 : 30;
      R(10, -94, len, 11, col(d.suit)); ctx.fillStyle = col(d.skin); ctx.beginPath(); ctx.arc(10 + len, -88, 8, 0, 7); ctx.fill();
    } else R(14, -96, 10, 40, col(d.skin));
    if (this.blocking) { ctx.fillStyle = 'rgba(120,200,255,.35)'; ctx.fillRect(18, -105, 12, 85); }
    ctx.restore();
  }

  drawLook(ctx, R, col) {
    const d = this.def;
    ctx.fillStyle = col(d.skin); ctx.beginPath(); ctx.arc(0, -116, 15, 0, 7); ctx.fill();
    if (d.look === 'thunder') {            // blond hair, hammer-god vibe
      ctx.fillStyle = col('#f4d35e'); ctx.beginPath(); ctx.arc(0, -120, 15, Math.PI, 0); ctx.fill();
      R(-18, -120, 6, 18, col('#f4d35e'));
    } else if (d.look === 'knight') {      // armored helmet + chest reactor
      ctx.fillStyle = col(d.suit); ctx.beginPath(); ctx.arc(0, -116, 16, 0, 7); ctx.fill();
      R(2, -124, 14, 14, col(d.accent));
      ctx.fillStyle = '#bff6ff'; ctx.beginPath(); ctx.arc(0, -78, 6, 0, 7); ctx.fill();
    }
  }
};
