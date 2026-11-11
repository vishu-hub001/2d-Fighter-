// Fighter: input buffer, state machine, attacks, hit reactions. Pure logic (shared by browser + server).
// Drawing lives in sprites.js.
(function () {
  const G = Game, B = G.BTN, ATK = B.lp | B.hp | B.lk | B.hk;
  const PRIO = [['hk', B.hk], ['hp', B.hp], ['lk', B.lk], ['lp', B.lp]];
  const BOUND = 60;

  G.Fighter = class {
    constructor(def, x, facing, idx) {
      this.def = def; this.idx = idx || 0; this.M = null; this.opp = null;
      this.x = x; this.y = G.GROUND; this.facing = facing; this.vx = 0; this.vy = 0;
      this.hp = def.hp; this.maxHp = def.hp; this.meter = 0; this.mana = def.mana || 0;
      this.st = 'stand'; this.sf = 0; this.atk = null; this.stun = 0; this.lag = 0; this.inv = 0; this.flash = 0;
      this.guard = 0; this.wd = 0; this.rage = 0; this.crouchHit = 0; this.blockCrouch = 0; this.buf = [];
      this.juggle = 0; this.gravMul = 1; this.noJuggle = false; this.bounced = false; this.tb = 0;
      this.inCombo = false; this.comboHits = 0; this.comboOwner = null; this.cmbN = 0; this.cmbDmg = 0; this.cmbT = 0;
      this.jumpRel = 0; this.dashDir = 0; this.dashFrames = 1; this.dashDist = 0; this.grabber = null; this.anim = 0; this.hs = 0;
    }
    get onGround() { return this.y >= G.GROUND; }
    ev(o) { if (this.M) this.M.events.push(o); }

    // ------------------------------------------------------------ input buffer
    push(inp, frozen) {
      const f = this.facing, fwd = f === 1 ? inp.r : inp.l, back = f === 1 ? inp.l : inp.r;
      const h = fwd && !back ? 1 : back && !fwd ? -1 : 0, v = inp.u && !inp.d ? 1 : inp.d && !inp.u ? -1 : 0;
      const d = v > 0 ? (h < 0 ? 7 : h > 0 ? 9 : 8) : v < 0 ? (h < 0 ? 1 : h > 0 ? 3 : 2) : (h < 0 ? 4 : h > 0 ? 6 : 5);
      if (frozen && this.buf.length) { const e = this.buf[this.buf.length - 1]; e.p |= inp.p | 0; e.b = inp.b | 0; e.d = d; return; }   // hitstop: buffer time stands still
      this.buf.push({ d, p: inp.p | 0, b: inp.b | 0 }); if (this.buf.length > 40) this.buf.shift();
    }
    curDir() { const e = this.buf[this.buf.length - 1]; return e ? e.d : 5; }
    pressed(mask, win) {
      win = win || 7; const n = this.buf.length;
      for (let i = n - 1; i >= 0 && i >= n - win; i--) if (this.buf[i].p & mask) return true;
      return false;
    }
    consume(mask) { for (let i = Math.max(0, this.buf.length - 12); i < this.buf.length; i++) this.buf[i].p &= ~mask; }
    motion(seq, win) {
      win = win || 24; const b = this.buf, n = b.length, L = seq.length;
      let k = 0, last = -1;
      for (let i = Math.max(0, n - win); i < n && k < L; i++) {
        const d = b[i].d, want = seq[k];
        if (d === want || (k > 0 && ((want === 3 && d === 6 && seq[k - 1] === 2) || (want === 1 && d === 4 && seq[k - 1] === 2)))) { k++; last = i; }
      }
      if (k < L) return false;
      while (last + 1 < n && b[last + 1].d === seq[L - 1]) last++;
      return n - 1 - last <= 12;
    }
    doubleTap(n) {
      const b = this.buf, L = b.length;
      if (L < 3 || b[L - 1].d !== n || b[L - 2].d === n) return false;
      let i = L - 2, gap = 0;
      while (i >= 0 && b[i].d !== n && gap < 10) { i--; gap++; }
      if (i < 0 || b[i].d !== n) return false;
      for (let j = L - 1; j >= Math.max(0, L - 16); j--) if (b[j].d === n) b[j].d = 5;
      return true;
    }

    // ------------------------------------------------------------ boxes
    ducking() { return this.st === 'crouch' || (this.st === 'block' && this.blockCrouch) || (this.st === 'atk' && this.atk && this.atk.m.stance === 'crouch'); }
    hurtBox(lvl) {
      if (this.inv > 0 || this.st === 'down' || this.st === 'wake' || this.st === 'ko' || this.st === 'grab' || this.st === 'intro' || this.st === 'win') return null;
      const hh = G.GROUND - this.y, sc = this.def.scale, w = this.def.w;
      let H = Math.round(132 * sc);
      if (this.ducking() && lvl === 'a') H = Math.round(88 * sc);
      if (this.st === 'launch') H = Math.round(110 * sc);
      return { x0: this.x - w / 2, x1: this.x + w / 2, y0: hh, y1: hh + H };
    }
    activeBox() {
      const a = this.atk; if (this.st !== 'atk' || !a || a.hit || a.grab) return null;
      const m = a.m; if (m.proj || a.t <= m.st || a.t > m.st + m.ac) return null;
      const h = m.hit, f = this.facing, hh = G.GROUND - this.y, x0 = f > 0 ? this.x + h.x : this.x - h.x - h.w;
      return { x0, x1: x0 + h.w, y0: hh + h.y, y1: hh + h.y + h.h };
    }
    guardNow(lvl) {
      if (this.st !== 'stand' && this.st !== 'crouch' && this.st !== 'block') return false;
      const bd = this.curDir(), g = bd === 4 ? 1 : bd === 1 ? 2 : 0;
      if (!g) return false;
      if (lvl === 'h' || lvl === 'a') return true;
      if (lvl === 'm') return g === 1;
      if (lvl === 'l') return g === 2;
      return false;
    }

    // ------------------------------------------------------------ main update
    update(opp) {
      const d = this.def; this.opp = opp;
      if (this.flash > 0) this.flash--;
      if (this.inv > 0) this.inv--;
      if (this.cmbT > 0) this.cmbT--;
      this.sf++; this.wd = 0; this.guard = 0;
      this.rage = this.hp > 0 && this.hp < this.maxHp * 0.25 ? 1 : 0;
      // mana (casters only): slow regen, 2.5x faster while crouching
      if (d.mana && this.hp > 0) this.mana = Math.min(d.mana, this.mana + (d.manaRegen || 0.1) * (this.st === 'crouch' ? 2.5 : 1));
      const bd = this.curDir();
      switch (this.st) {
        case 'stand': case 'crouch': this.doActionable(opp, bd); break;
        case 'dash': this.doDash(opp, bd); break;
        case 'prejump':
          this.vx = 0; this.facing = opp.x >= this.x ? 1 : -1;
          if (this.sf >= 3) { this.vy = -d.jumpV; this.vx = this.jumpRel * this.facing * d.jumpX; this.st = 'air'; this.sf = 0; this.ev({ t: 'dust', x: this.x, k: 'jump', d: this.facing }); }
          break;
        case 'air': { const mv = this.pickAirMove(); if (mv) this.startMove(mv); break; }
        case 'atk': this.runAtk(opp, bd); break;
        case 'hit': case 'block':
          if (this.st === 'block') this.guard = this.blockCrouch ? 2 : 1;
          this.vx *= 0.86;
          if (--this.stun <= 0) this.becomeFree(bd <= 3 ? 'crouch' : 'stand');
          break;
        case 'launch': break;
        case 'down': this.vx *= 0.8; if (--this.stun <= 0) { this.st = 'wake'; this.sf = 0; this.stun = 16; this.inv = 16; this.endCombo(); } break;
        case 'wake': if (--this.stun <= 0) this.becomeFree('stand'); break;
        case 'land': this.vx = 0; if (--this.lag <= 0) this.becomeFree(bd <= 3 ? 'crouch' : 'stand'); break;
        case 'grab': {
          this.vx = 0; const g = this.grabber;
          if (!g || !g.atk || !g.atk.grab || g.atk.grab.vic !== this) this.release();
          break;
        }
        case 'ko': this.vx *= 0.8; break;
        default: this.vx = 0; // intro / win
      }
      // physics
      const wasAir = this.y < G.GROUND;
      if (wasAir || this.vy < 0) this.vy += G.GRAVITY * this.gravMul;
      this.x += this.vx; this.y += this.vy;
      if (this.y >= G.GROUND) { const sp = this.vy; this.y = G.GROUND; this.vy = 0; if (wasAir || sp > 0) this.land(sp); }
      this.x = Math.max(BOUND, Math.min(G.STAGE_W - BOUND, this.x));
    }

    endCombo() {
      if (this.inCombo) { this.inCombo = false; this.comboHits = 0; if (this.comboOwner) this.comboOwner.cmbT = 100; this.comboOwner = null; }
    }
    becomeFree(st) { this.st = st; this.sf = 0; this.endCombo(); this.gravMul = 1; this.noJuggle = false; this.juggle = 0; }
    release() { this.st = 'stand'; this.sf = 0; this.grabber = null; }

    land(sp) {
      const x = this.x;
      switch (this.st) {
        case 'air': this.st = 'land'; this.lag = 3; this.sf = 0; this.vx = 0; this.ev({ t: 'dust', x, k: 'land', d: this.facing }); break;
        case 'atk':
          if (this.atk.m.air) { const m = this.atk.m; this.atk = null; this.st = 'land'; this.lag = m.landLag || 4; this.sf = 0; this.vx = 0; this.ev({ t: 'dust', x, k: 'land', d: this.facing }); }
          break;
        case 'launch':
          if (!this.bounced && sp > 9) { this.vy = -4.2; this.bounced = true; this.vx *= 0.55; this.ev({ t: 'dust', x, k: 'slam', d: this.facing }); }
          else {
            this.vx *= 0.3; this.sf = 0; this.ev({ t: 'dust', x, k: 'land', d: this.facing });
            if (this.hp <= 0) this.st = 'ko'; else { this.st = 'down'; this.stun = 38; }
          }
          break;
      }
    }

    // ------------------------------------------------------------ grounded control
    doActionable(opp, bd) {
      const d = this.def;
      this.facing = opp.x >= this.x ? 1 : -1;
      this.guard = bd === 4 ? 1 : bd === 1 ? 2 : 0;
      const mv = this.pickMove(bd);
      if (mv && this.startMove(mv)) return;
      if (this.doubleTap(6)) return this.startDash(1);
      if (this.doubleTap(4)) return this.startDash(-1);
      if (bd >= 7) { this.st = 'prejump'; this.sf = 0; this.jumpRel = bd === 9 ? 1 : bd === 7 ? -1 : 0; this.vx = 0; return; }
      if (bd <= 3) { if (this.st !== 'crouch') { this.st = 'crouch'; this.sf = 0; } this.vx = 0; return; }
      if (this.st !== 'stand') { this.st = 'stand'; this.sf = 0; }
      const dir = bd === 6 ? 1 : bd === 4 ? -1 : 0;
      this.vx = dir === 1 ? this.facing * d.walkF : dir === -1 ? -this.facing * d.walkB : 0;
      this.wd = dir;
    }
    startDash(dir) {
      const d = this.def, c = dir > 0 ? d.dashF : d.dashB;
      this.st = 'dash'; this.sf = 0; this.dashDir = dir; this.dashFrames = c.frames; this.dashDist = c.dist;
      if (dir < 0) this.inv = Math.max(this.inv, 6);
      this.ev({ t: 'dust', x: this.x, k: 'dash', d: this.facing * dir });
    }
    doDash(opp, bd) {
      const F = this.dashFrames, t = this.sf;
      this.facing = opp.x >= this.x ? 1 : -1;
      this.vx = this.dashDir * this.facing * Math.max(0, 2 * this.dashDist / F * (1 - t / F)); this.wd = this.dashDir;
      if (t >= F) { this.vx = 0; this.becomeFree('stand'); return; }
      if (t >= Math.floor(F * 0.45)) { const mv = this.pickMove(bd); if (mv && this.startMove(mv)) return; }
    }

    trySpecial(bd) {
      const d = this.def;
      if (this.pressed(B.su, 7) && this.meter >= G.METER_MAX) { this.consume(B.su); return 'super'; }
      const P = B.lp | B.hp, K = B.lk | B.hk;
      for (const c of d.cmds || []) {
        const mask = c.btn === 'p' ? P : K;
        if (this.pressed(mask, 6) && this.motion(c.seq)) { this.consume(mask); return c.move; }
      }
      if (this.pressed(B.sp, 7)) { this.consume(B.sp); return d.spMap[bd === 3 ? 3 : bd <= 2 ? 2 : bd === 6 || bd === 9 ? 6 : bd === 4 || bd === 7 ? 4 : 5]; }
      return null;
    }
    pressedAttack() {
      const L = this.buf.length; let idx = -1;
      for (let i = L - 1; i >= Math.max(0, L - 7); i--) if (this.buf[i].p & ATK) { idx = i; break; }
      if (idx < 0) return 0;
      let agg = 0; for (let i = Math.max(0, idx - 2); i <= idx; i++) agg |= this.buf[i].p;
      return agg & ATK;
    }
    pickMove(bd) {
      const sp = this.trySpecial(bd); if (sp) return sp;
      if (this.pressed(B.th, 7)) { this.consume(B.th); return 'throw'; }
      const agg = this.pressedAttack(); if (!agg) return null;
      this.consume(ATK);
      if ((agg & B.lp) && (agg & B.lk)) return 'throw';
      let key = 'lp'; for (const [k, bit] of PRIO) if (agg & bit) { key = k; break; }
      if (key === 'hp' && bd === 3) return 'launcher';
      if (bd <= 3) return 'c' + key;
      { const pre = bd === 6 ? 'f' : bd === 4 ? 'b' : ''; if (pre && this.def.moves[pre + key]) return pre + key; }
      if (bd === 6 && key === 'hp') return 'ovh';
      if (bd === 6 && key === 'hk') return 'fk';
      return key;
    }
    pickAirMove() {
      const agg = this.pressedAttack(); if (!agg) return null;
      this.consume(ATK);
      let key = 'lp'; for (const [k, bit] of PRIO) if (agg & bit) { key = k; break; }
      return 'j' + key;
    }

    // ------------------------------------------------------------ attacks
    startMove(id) {
      const m = this.def.moves[id]; if (!m) return false;
      if (m.proj && !m.super && this.M && this.M.shotsOf(this.idx) > 0) return false;
      if (m.mana && this.mana < m.mana) { this.ev({ t: 'nomana', i: this.idx, x: this.x }); return false; }
      if (m.super) {
        if (this.meter < G.METER_MAX) return false;
        this.meter = 0; this.ev({ t: 'super', i: this.idx, n: m.name, x: this.x });
        if (this.M) this.M.hitstop = Math.max(this.M.hitstop, 44);
      }
      if (this.opp && this.onGround) this.facing = this.opp.x >= this.x ? 1 : -1;
      if (m.mana) this.mana -= m.mana;
      this.atk = { id, m, t: 0, hit: false, conn: false, n: 0, rearm: 0, grab: null };
      this.st = 'atk'; this.sf = 0;
      if (this.onGround) this.vx = 0;
      return true;
    }
    // a cancelled string/special keeps the opponent stuck long enough for the next move to connect
    lockStun() {
      const o = this.opp, m = this.atk && this.atk.m; if (!o || !m || (o.st !== 'hit' && o.st !== 'block')) return;
      o.stun = Math.max(o.stun, m.st + (m.proj ? 8 : 4));
    }
    endAtk() {
      const m = this.atk.m; this.atk = null; this.sf = 0;
      this.st = !this.onGround ? 'air' : m.stance === 'crouch' ? 'crouch' : 'stand';
    }
    runAtk(opp, bd) {
      const a = this.atk, m = a.m, total = m.st + m.ac + m.rc;
      if (a.grab) { this.tickGrab(a); return; }
      a.t++;
      if (m.mvf) for (const k of m.mvf) if (k.t === a.t) { this.vx = this.facing * k.vx; if (k.vy !== undefined) this.vy = k.vy; if (k.vy !== undefined && this.onGround) this.y -= 1; }
      if (m.inv && a.t >= m.inv[0] && a.t <= m.inv[1]) this.inv = Math.max(this.inv, 1);
      if (m.heal && a.t === m.st) { this.hp = Math.min(this.maxHp, this.hp + m.heal); this.ev({ t: 'heal', i: this.idx, x: this.x, c: m.fxColor || '#7dff9a' }); }
      if (m.tele && a.t === m.tele.t && this.opp) {
        const ox = this.x, o = this.opp; let nx = o.x + this.facing * m.tele.d;
        if (nx < BOUND || nx > G.STAGE_W - BOUND) nx = o.x - this.facing * m.tele.d; else this.facing = -this.facing;   // wall behind them: blink to the near side instead
        this.x = Math.max(BOUND, Math.min(G.STAGE_W - BOUND, nx)); this.vx = 0; this.ev({ t: 'blink', i: this.idx, x: this.x, ox });
      }
      if (m.manaGain && a.t === m.st) { this.mana = Math.min(this.def.mana || 0, this.mana + m.manaGain); this.ev({ t: 'heal', i: this.idx, x: this.x, c: '#6fb4ff' }); }
      if (!m.air && this.onGround) this.vx *= m.fric !== undefined ? m.fric : 0.82;
      if (a.t === m.st + 1 && !m.proj && !m.throw) this.ev({ t: 'swing', i: this.idx, x: this.x, d: this.facing, p: m.pose, s: m.snd });
      if (m.proj && a.t === m.st) { this.M.spawnShot(this, m); this.ev({ t: 'cast', i: this.idx, x: this.x, d: this.facing, c: m.proj.color, f: m.fxName || 'charge' }); }
      if (m.multi && a.hit && a.n < m.multi.n && a.t > m.st && a.t <= m.st + m.ac) { if (--a.rearm <= 0) a.hit = false; }
      if (a.conn && !m.super && a.t > m.st && a.t <= total - 3) {
        if (m.chain) for (const key in m.chain) if (this.pressed(B[key], 8)) { this.consume(B[key]); if (this.startMove(m.chain[key])) { this.lockStun(); return; } }
        if (m.jchain && this.opp && this.opp.st === 'launch') for (const key in m.jchain) if (this.pressed(B[key], 8)) { this.consume(B[key]); if (this.startMove(m.jchain[key])) return; }
        if (m.sc) { const sm = this.trySpecial(bd); if (sm && this.startMove(sm)) { this.lockStun(); return; } }
      }
      if (a.t >= total) this.endAtk();
    }

    // ------------------------------------------------------------ throws
    startGrab(vic) {
      const a = this.atk, m = a.m;
      a.hit = true; a.conn = true; a.grab = { vic, t: 0, win: m.noTech ? 22 : 14 };
      if (vic.atk && vic.atk.grab) vic.atk.grab.vic.release();
      vic.atk = null; vic.st = 'grab'; vic.sf = 0; vic.grabber = this; vic.vx = 0; vic.vy = 0; vic.facing = -this.facing;
      vic.x = Math.max(BOUND, Math.min(G.STAGE_W - BOUND, this.x + this.facing * 34));
      this.ev({ t: 'grab', x: vic.x, y: G.GROUND - 70, i: this.idx });
    }
    tickGrab(a) {
      const g = a.grab, v = g.vic, m = a.m; g.t++; this.vx = 0;
      if (v.st !== 'grab') { a.grab = null; return; }
      v.x = Math.max(BOUND, Math.min(G.STAGE_W - BOUND, this.x + this.facing * 34)); v.y = G.GROUND;
      if (!m.noTech && v.pressed(B.th, 3)) { v.consume(B.th); this.M.techBreak(this, v); return; }
      if (g.t >= g.win) { v.takeThrow(this, m); a.grab = null; a.t = m.st + m.ac; }
    }
    takeThrow(att, m) {
      const dmg = Math.round(m.dmg * ((att.def.power || 1) / (this.def.defense || 1)) * (att.rage ? 1.15 : 1));
      this.hp = Math.max(0, this.hp - dmg);
      this.inCombo = true; this.comboOwner = att; this.comboHits = 3; att.cmbN = 1; att.cmbDmg = dmg;
      this.st = 'launch'; this.sf = 0; this.juggle = 0; this.gravMul = 1; this.bounced = false; this.noJuggle = true; this.tb = 0;
      this.grabber = null; this.facing = -att.facing; this.crouchHit = 0;
      const slam = m.throwKind === 'slam' || m.throwKind === 'super';
      this.vy = slam ? -6 : -9.5; this.vx = att.facing * (slam ? 1.6 : 4.2);
      if (this.hp <= 0) { this.vy = -10; this.vx = att.facing * 6; }
      this.flash = 6; this.meter = Math.min(G.METER_MAX, this.meter + dmg / 8); if (!m.super) att.meter = Math.min(G.METER_MAX, att.meter + dmg / 12);
      att.ev({ t: 'slam', x: this.x, y: G.GROUND - 40, k: m.throwKind === 'super' ? 4 : 3, d: att.facing });
      if (this.M) this.M.hitstop = Math.max(this.M.hitstop, m.throwKind === 'super' ? 30 : 12);
    }

    // ------------------------------------------------------------ being hit
    receive(att, o) {
      const m = o.m, dir = o.dir;
      const K = (att.def.power || 1) / (this.def.defense || 1);        // class stats: attacker power / defender defense
      if (this.atk && this.atk.grab) this.atk.grab.vic.release();
      if (o.blocked) {
        const chip = Math.floor(o.dmg * (m.chip || 0) * K); if (chip) this.hp = Math.max(1, this.hp - chip);
        const stun = Math.max(6, o.kind === 'shot' ? o.stunB : o.rem + o.advB);
        this.blockCrouch = this.st === 'crouch' || (this.st === 'block' && this.blockCrouch) ? 1 : 0;
        this.st = 'block'; this.sf = 0; this.stun = stun; this.atk = null;
        this.vx = dir * (m.pushB !== undefined ? m.pushB : 3.5); this.flash = 2;
        this.meter = Math.min(G.METER_MAX, this.meter + 2); att.meter = Math.min(G.METER_MAX, att.meter + 1.5);
        return { r: 'block', dmg: chip };
      }
      const wasAtk = this.st === 'atk', airborne = this.y < G.GROUND - 1;
      const crouching = this.st === 'crouch' || (wasAtk && this.atk && this.atk.m.stance === 'crouch');
      const sc = m.noScale ? 1 : Math.max(0.35, 1 - 0.12 * this.comboHits);
      const dmg = Math.round(o.dmg * sc * K * (att.rage ? 1.15 : 1) * (o.ctr ? 1.25 : 1));
      // POISE (heavy weapons): armoured frames soak the hit at reduced damage and keep swinging
      const am = wasAtk && this.atk && this.atk.m.armor, red = am ? Math.round(o.dmg * K * (att.rage ? 1.15 : 1) * am) : 0;
      if (am && !this.atk.m.throw && this.atk.t >= (this.atk.m.armorFrom || 1) && this.atk.t <= this.atk.m.st + this.atk.m.ac && !m.throw && this.hp - red > 0) {
        this.hp -= red; this.flash = 4; this.meter = Math.min(G.METER_MAX, this.meter + red / 8); if (!m.super) att.meter = Math.min(G.METER_MAX, att.meter + red / 12);
        this.ev({ t: 'poise', x: this.x, i: this.idx });
        return { r: 'hit', dmg: red, ko: false, fx: 'hit' };
      }
      this.hp = Math.max(0, this.hp - dmg);
      if (att.def.mana && att.def.manaOnHit) att.mana = Math.min(att.def.mana, att.mana + dmg * att.def.manaOnHit);
      if (this.inCombo && this.comboOwner === att) { att.cmbN++; att.cmbDmg += dmg; }
      else { att.cmbN = 1; att.cmbDmg = dmg; this.inCombo = true; this.comboOwner = att; this.comboHits = 0; }
      att.cmbT = 0; this.comboHits++;
      const ko = this.hp <= 0; let fx = ko ? 'knock' : (m.fx || 'hit');
      this.atk = null; this.flash = 6; this.crouchHit = 0;
      if (this.st === 'launch') {                                   // ---- juggle
        this.juggle++; this.sf = 0;
        if (this.noJuggle || this.juggle >= 4 || fx === 'knock' || ko) { this.noJuggle = true; this.vy = -5.5; this.vx = dir * (ko ? 6 : 5); }
        else { this.vy = -(m.jug || 9) * Math.max(0.6, 1 - 0.12 * this.juggle); this.vx = dir * (m.kb || 2.5); this.gravMul = 1 + 0.1 * this.juggle; }
      } else if (airborne || fx === 'launch' || fx === 'knock') {
        const air = airborne && fx === 'hit';
        this.st = 'launch'; this.sf = 0; this.juggle = 0; this.gravMul = 1; this.bounced = false; this.noJuggle = !air && (fx === 'knock' || ko);
        this.vy = air ? -6 : -(m.launch || (fx === 'knock' ? 7 : 12)); this.vx = dir * (air ? 3.5 : (m.kb || 3));
        this.tb = m.pose === 'sweep' ? 1 : 0;
        if (ko) { this.vy = -9.5; this.vx = dir * 7; this.noJuggle = true; }
      } else {
        this.crouchHit = crouching ? 1 : 0;
        this.st = 'hit'; this.sf = 0; this.gravMul = 1;
        this.stun = Math.max(8, o.kind === 'shot' ? o.stunH : o.rem + o.adv);
        this.vx = dir * (m.push !== undefined ? m.push : 4); this.vy = 0;
      }
      this.meter = Math.min(G.METER_MAX, this.meter + dmg / 8);
      if (!m.super) att.meter = Math.min(G.METER_MAX, att.meter + dmg / 12);
      return { r: 'hit', dmg, ko, fx: this.st === 'launch' ? 'launch' : 'hit' };
    }

    // ------------------------------------------------------------ network helpers
    serialize() {
      const a = this.atk;
      return { x: +this.x.toFixed(1), y: +this.y.toFixed(1), f: this.facing, hp: this.hp, mt: +this.meter.toFixed(1), mn: Math.round(this.mana), st: this.st, sf: this.sf,
        mv: a ? a.id : 0, at: a ? a.t : 0, gt: a && a.grab ? a.grab.t : -1, g: this.guard, wd: this.wd, fl: this.flash, rg: this.rage, vy: +this.vy.toFixed(1),
        cr: this.st === 'block' ? this.blockCrouch : this.crouchHit, tb: this.tb, iv: this.inv > 0 ? 1 : 0, cn: this.cmbN, cd: this.cmbDmg, ct: this.cmbT, jg: this.juggle };
    }
    applyState(s) {
      this.x = s.x; this.y = s.y; this.facing = s.f; this.hp = s.hp; this.meter = s.mt; this.mana = s.mn || 0; this.st = s.st; this.sf = s.sf;
      this.atk = s.mv ? { id: s.mv, t: s.at, m: this.def.moves[s.mv], grabT: s.gt } : null;
      this.guard = s.g; this.wd = s.wd; this.flash = s.fl; this.rage = s.rg; this.vy = s.vy; this.crouchHit = s.cr; this.tb = s.tb; this.inv = s.iv;
      this.cmbN = s.cn; this.cmbDmg = s.cd; this.cmbT = s.ct; this.juggle = s.jg; this.cl = s.cl;
      if (this.wd) this.anim += 0.2;
    }
  };
})();
