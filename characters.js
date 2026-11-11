// ADD NEW CHARACTERS HERE. Each entry is plain data.
// Move fields:  lvl: h(igh) m(id) l(ow) a(ir)   dmg   st/ac/rc = startup/active/recovery frames
//   adv = frame advantage on hit, advB = on block      hit = hitbox {x,y,w,h} (x forward from body centre, y = height of box bottom)
//   fx: hit | launch | knock     chain: {btn: nextMove} usable after the move connects (Tekken-style strings)
//   sc: true = can be cancelled into a special on hit/block      mvf: [{t, vx, vy}] movement keyframes
//   pose: animation id used by sprites.js         push/pushB: knock-back on hit / block
(function () {
  const G = Game;

  // ---- shared base move set (every fighter starts from this, then overrides) ----
  function base() {
    return {
      lp:  { pose: 'jab',    lvl: 'h', dmg: 40,  st: 5,  ac: 2, rc: 8,  adv: 2,  advB: -1, hit: { x: 14, y: 96, w: 58, h: 22 }, push: 3, pushB: 3, hs: 6, chain: { lp: 'lp2', hp: 'hp', lk: 'lk' }, sc: true, snd: 'p1' },
      lp2: { pose: 'jab2',   lvl: 'h', dmg: 45,  st: 5,  ac: 2, rc: 9,  adv: 2,  advB: -2, hit: { x: 14, y: 96, w: 60, h: 22 }, push: 3, pushB: 3, hs: 6, chain: { hp: 'hp', hk: 'hk', lk: 'lk3' }, sc: true, snd: 'p1' },
      hp:  { pose: 'cross',  lvl: 'm', dmg: 75,  st: 9,  ac: 3, rc: 14, adv: 3,  advB: -5, hit: { x: 14, y: 90, w: 70, h: 26 }, push: 5, pushB: 4, hs: 9, chain: { hk: 'hk' }, sc: true, snd: 'p2' },
      lk:  { pose: 'lowkick',lvl: 'h', dmg: 50,  st: 7,  ac: 3, rc: 10, adv: 1,  advB: -3, hit: { x: 14, y: 62, w: 74, h: 24 }, push: 4, pushB: 4, hs: 7, chain: { lk: 'lk2', hp: 'hp', hk: 'hk' }, sc: true, snd: 'k1' },
      lk2: { pose: 'sidekick', lvl: 'm', dmg: 60, st: 8, ac: 3, rc: 12, adv: 0, advB: -5, hit: { x: 14, y: 60, w: 84, h: 26 }, push: 5, pushB: 4, hs: 8, chain: { hk: 'hk', hp: 'hp' }, sc: true, snd: 'k1' },
      lk3: { pose: 'lowkick',lvl: 'l', dmg: 55,  st: 8,  ac: 3, rc: 12, adv: -2, advB: -8, hit: { x: 14, y: 0,  w: 78, h: 30 }, push: 4, pushB: 4, hs: 8, snd: 'k1' },
      hk:  { pose: 'roundhouse', lvl: 'h', dmg: 90, st: 12, ac: 4, rc: 18, adv: 5, advB: -9, hit: { x: 10, y: 92, w: 92, h: 28 }, push: 8, pushB: 6, hs: 11, fx: 'hit', snd: 'k2', mvf: [{ t: 8, vx: 2.5 }] },
      // forward + HP : overhead smash (mid) - beats crouch-blockers' lazy defence, must be blocked standing
      ovh: { pose: 'overhead', lvl: 'm', dmg: 85, st: 16, ac: 3, rc: 20, adv: 4, advB: -10, hit: { x: 14, y: 70, w: 72, h: 60 }, push: 6, pushB: 5, hs: 11, snd: 'p2', mvf: [{ t: 10, vx: 3.2 }] },
      // forward + HK : long mid kick
      fk:  { pose: 'sidekick', lvl: 'm', dmg: 80, st: 13, ac: 4, rc: 17, adv: 1, advB: -8, hit: { x: 16, y: 64, w: 100, h: 28 }, push: 9, pushB: 7, hs: 10, snd: 'k2', mvf: [{ t: 9, vx: 3.5 }] },
      // down-forward + HP : launcher (the Tekken "df+2")
      launcher: { pose: 'uppercut', lvl: 'm', dmg: 80, st: 14, ac: 4, rc: 24, adv: 0, advB: -14, hit: { x: 6, y: 50, w: 64, h: 86 }, push: 3, pushB: 3, hs: 12, fx: 'launch', launch: 14.5, kb: 2, hitRecov: 7, snd: 'p3', mvf: [{ t: 9, vx: 2 }], jchain: { lp: 'lp', hp: 'hp', lk: 'lk', hk: 'hk' } },
      clp: { pose: 'cjab',   lvl: 'm', dmg: 30,  st: 6,  ac: 2, rc: 8,  adv: 3,  advB: 0,  hit: { x: 12, y: 50, w: 56, h: 22 }, push: 3, pushB: 3, hs: 5, stance: 'crouch', chain: { clp: 'clp' }, sc: true, snd: 'p1' },
      chp: { pose: 'cuppercut', lvl: 'm', dmg: 70, st: 10, ac: 4, rc: 16, adv: 0, advB: -8, hit: { x: 6, y: 50, w: 52, h: 90 }, push: 2, pushB: 3, hs: 9, stance: 'crouch', fx: 'launch', launch: 11, kb: 1.5, hitRecov: 8, sc: true, snd: 'p3', jchain: { lp: 'lp', hp: 'hp', lk: 'lk', hk: 'hk' } },
      clk: { pose: 'clow',   lvl: 'l', dmg: 35,  st: 7,  ac: 2, rc: 9,  adv: 0,  advB: -3, hit: { x: 12, y: 0, w: 70, h: 26 }, push: 3, pushB: 3, hs: 6, stance: 'crouch', chain: { clk: 'clk' }, sc: true, snd: 'k1' },
      chk: { pose: 'sweep',  lvl: 'l', dmg: 75,  st: 14, ac: 4, rc: 22, adv: -3, advB: -14, hit: { x: 10, y: 0, w: 112, h: 24 }, push: 6, pushB: 4, hs: 10, stance: 'crouch', fx: 'knock', launch: 7, kb: 5, snd: 'k2' },
      // jumping attacks (blockable high or low = lvl 'a')
      jlp: { pose: 'jpunch', lvl: 'a', dmg: 45, st: 5, ac: 8, rc: 8, adv: 6, advB: 2, hit: { x: 10, y: 55, w: 60, h: 40 }, push: 4, pushB: 3, hs: 6, air: true, snd: 'p1' },
      jhp: { pose: 'jpunch2', lvl: 'a', dmg: 70, st: 8, ac: 8, rc: 8, adv: 8, advB: 3, hit: { x: 6, y: 45, w: 70, h: 55 }, push: 5, pushB: 4, hs: 9, air: true, snd: 'p2' },
      jlk: { pose: 'jkick',  lvl: 'a', dmg: 50, st: 5, ac: 9, rc: 8, adv: 6, advB: 2, hit: { x: 8, y: 20, w: 70, h: 45 }, push: 4, pushB: 3, hs: 6, air: true, snd: 'k1' },
      jhk: { pose: 'jkick2', lvl: 'a', dmg: 80, st: 8, ac: 10, rc: 8, adv: 8, advB: 3, hit: { x: 8, y: 10, w: 84, h: 52 }, push: 6, pushB: 4, hs: 10, air: true, snd: 'k2' },
      // throw (unblockable, can be broken by pressing GRAB in time)
      throw: { pose: 'grab', throw: true, dmg: 120, st: 7, ac: 2, rc: 26, hit: { x: 0, y: 20, w: 64, h: 100 }, hs: 0, snd: 'p1' }
    };
  }
  G.baseMoves = base;

  // merge helper: char-specific overrides on top of base moves
  function moves(over) {
    const m = base();
    for (const k in over) m[k] = Object.assign({}, m[k] || {}, over[k]);
    for (const k in m) m[k].id = k;
    return m;
  }

  // =====================================================================
  G.CHARACTERS.push(
    // ---------- THUNDER LORD: all-rounder / zoner, lightning ----------
    {
      id: 'thunder', name: 'THUNDER LORD', look: 'thunder', title: 'All-rounder',
      skin: '#f0bf8a', suit: '#2b55d6', dark: '#1a2f86', accent: '#f2c744', cape: '#c4262e', hair: '#f4d35e',
      hp: 1000, walkF: 3.2, walkB: 2.5, jumpV: 15.5, jumpX: 4.2, w: 44, scale: 1.0,
      dashF: { dist: 120, frames: 17 }, dashB: { dist: 95, frames: 18 },
      moves: moves({
        lp2: { chain: { hp: 'hp3', hk: 'hk', lk: 'lk3' } },
        hp3: { pose: 'hammer', lvl: 'm', dmg: 95, st: 11, ac: 3, rc: 22, adv: -2, advB: -12, hit: { x: 12, y: 60, w: 80, h: 70 }, push: 8, pushB: 6, hs: 12, fx: 'knock', launch: 7, kb: 6, snd: 'p3' },
        sp1: { pose: 'castfwd', name: 'Lightning Bolt', proj: { speed: 10, dmg: 70, w: 38, h: 30, color: '#9fe2ff', style: 'bolt', y: 88, stunH: 20, stunB: 12, life: 90, fx: 'hit', hs: 9 }, st: 13, ac: 1, rc: 22, snd: 'cast', fxName: 'charge' },
        sp2: { pose: 'risingstrike', name: 'Thunder Uppercut', lvl: 'm', dmg: 110, st: 4, ac: 7, rc: 34, adv: -20, advB: -34, hit: { x: 0, y: 20, w: 58, h: 130 }, push: 3, pushB: 3, hs: 12, fx: 'launch', launch: 15, kb: 2.5, hitRecov: 14, inv: [1, 9], air: true, landLag: 14, chip: 0.1,
               mvf: [{ t: 3, vx: 2.5, vy: -13 }], snd: 'p3', sc: false },
        sp3: { pose: 'lunge', name: 'Storm Rush', lvl: 'm', dmg: 85, st: 16, ac: 8, rc: 18, adv: 0, advB: -8, hit: { x: 10, y: 40, w: 70, h: 80 }, push: 7, pushB: 5, hs: 11, fx: 'knock', launch: 7, kb: 6, mvf: [{ t: 14, vx: 12 }], fric: 0.9, chip: 0.1, snd: 'p3' },
        super: { pose: 'superbolt', name: 'THUNDERSTORM', super: true, lvl: 'a', st: 16, ac: 1, rc: 30, snd: 'super',
                 proj: { speed: 16, dmg: 52, w: 120, h: 90, color: '#bfeaff', style: 'beam', y: 80, stunH: 14, stunB: 12, life: 70, fx: 'launch', launch: 12, hs: 6, n: 5, gap: 5, kb: 3, noScale: true, chip: 0.25 } }
      }),
      cmds: [
        { seq: [2, 3, 6], btn: 'p', move: 'sp1' }, { seq: [6, 2, 3], btn: 'p', move: 'sp2' }, { seq: [2, 1, 4], btn: 'k', move: 'sp3' }
      ],
      spMap: { 5: 'sp1', 2: 'sp2', 6: 'sp3' }
    },

    // ---------- IRON KNIGHT: heavy armour, big damage, beam ----------
    {
      id: 'ironknight', name: 'IRON KNIGHT', look: 'knight', title: 'Power fighter',
      skin: '#e8c53a', suit: '#b3202a', dark: '#6c1219', accent: '#f0cd52', cape: null, hair: '#e8c53a',
      hp: 1050, walkF: 2.8, walkB: 2.2, jumpV: 14.8, jumpX: 3.6, w: 48, scale: 1.08,
      dashF: { dist: 105, frames: 18 }, dashB: { dist: 85, frames: 19 },
      moves: moves({
        lp: { dmg: 45, st: 6 }, hp: { dmg: 85, st: 10 }, hk: { dmg: 100 }, launcher: { dmg: 90 },
        hp3: { pose: 'hammer', lvl: 'm', dmg: 100, st: 12, ac: 3, rc: 22, adv: -3, advB: -12, hit: { x: 12, y: 60, w: 80, h: 70 }, push: 8, pushB: 6, hs: 12, fx: 'knock', launch: 7, kb: 6, snd: 'p3' },
        lp2: { chain: { hp: 'hp3', hk: 'hk' } },
        sp1: { pose: 'castfwd', name: 'Repulsor', proj: { speed: 13, dmg: 60, w: 30, h: 24, color: '#fff2a6', style: 'orb', y: 92, stunH: 18, stunB: 11, life: 80, fx: 'hit', hs: 8 }, st: 11, ac: 1, rc: 19, snd: 'cast', fxName: 'charge' },
        sp2: { pose: 'risingstrike', name: 'Rocket Fist', lvl: 'm', dmg: 120, st: 5, ac: 7, rc: 32, adv: -18, advB: -32, hit: { x: 0, y: 20, w: 58, h: 135 }, push: 3, pushB: 3, hs: 12, fx: 'launch', launch: 14, kb: 2.5, hitRecov: 14, inv: [1, 9], air: true, landLag: 14, chip: 0.1, mvf: [{ t: 4, vx: 2.5, vy: -12.5 }], snd: 'p3' },
        sp3: { pose: 'shoulder', name: 'Shoulder Charge', lvl: 'm', dmg: 95, st: 18, ac: 9, rc: 22, adv: -2, advB: -9, hit: { x: 6, y: 25, w: 66, h: 100 }, push: 8, pushB: 6, hs: 12, fx: 'knock', launch: 8, kb: 7, mvf: [{ t: 16, vx: 10 }], fric: 0.92, chip: 0.1, snd: 'p3' },
        super: { pose: 'superbeam', name: 'UNIBEAM', super: true, lvl: 'a', st: 20, ac: 1, rc: 34, snd: 'super',
                 proj: { speed: 20, dmg: 60, w: 260, h: 70, color: '#fff7b0', style: 'beam', y: 86, stunH: 14, stunB: 12, life: 50, fx: 'launch', launch: 12, hs: 6, n: 5, gap: 5, kb: 3, noScale: true, chip: 0.25 } }
      }),
      cmds: [
        { seq: [2, 3, 6], btn: 'p', move: 'sp1' }, { seq: [6, 2, 3], btn: 'p', move: 'sp2' }, { seq: [2, 1, 4], btn: 'k', move: 'sp3' }
      ],
      spMap: { 5: 'sp1', 2: 'sp2', 6: 'sp3' }
    },

    // ---------- KAGE: fast ninja, low-profile mix-ups ----------
    {
      id: 'kage', name: 'KAGE', look: 'ninja', title: 'Speed / mix-ups',
      skin: '#e6b88a', suit: '#33274f', dark: '#1a1230', accent: '#b050ff', cape: null, hair: '#201a30',
      hp: 920, walkF: 3.9, walkB: 3.0, jumpV: 16.5, jumpX: 5.0, w: 40, scale: 0.97,
      dashF: { dist: 150, frames: 15 }, dashB: { dist: 110, frames: 16 },
      moves: moves({
        lp: { st: 4, adv: 3, dmg: 35 }, lp2: { st: 4, dmg: 40, chain: { lp: 'lp3', hp: 'hp', hk: 'hk', lk: 'lk3' } },
        lp3: { pose: 'jab', lvl: 'h', dmg: 45, st: 5, ac: 2, rc: 10, adv: 1, advB: -2, hit: { x: 14, y: 96, w: 60, h: 22 }, push: 3, pushB: 3, hs: 6, chain: { hk: 'hk', lk: 'lk3', hp: 'ovh' }, sc: true, snd: 'p1' },
        hp: { dmg: 65, st: 8 }, hk: { st: 11 }, lk: { st: 6, adv: 3 },
        // fast low that leads into mix-ups
        clk: { st: 6, adv: 1 }, chk: { st: 13 },
        sp1: { pose: 'throwkunai', name: 'Kunai', proj: { speed: 15, dmg: 45, w: 26, h: 14, color: '#d9c7ff', style: 'kunai', y: 96, stunH: 16, stunB: 9, life: 60, fx: 'hit', hs: 7 }, st: 9, ac: 1, rc: 16, snd: 'cast', fxName: 'puff' },
        sp2: { pose: 'risingstrike', name: 'Rising Talon', lvl: 'm', dmg: 100, st: 4, ac: 7, rc: 30, adv: -18, advB: -30, hit: { x: 0, y: 20, w: 56, h: 130 }, push: 3, pushB: 3, hs: 12, fx: 'launch', launch: 15.5, kb: 2, hitRecov: 14, inv: [1, 9], air: true, landLag: 12, chip: 0.1, mvf: [{ t: 3, vx: 2.2, vy: -13.5 }], snd: 'p3' },
        sp3: { pose: 'lunge', name: 'Shadow Dash', lvl: 'm', dmg: 70, st: 12, ac: 7, rc: 16, adv: 1, advB: -6, hit: { x: 10, y: 50, w: 64, h: 70 }, push: 6, pushB: 5, hs: 10, fx: 'hit', mvf: [{ t: 10, vx: 15 }], fric: 0.88, inv: [1, 14], chip: 0.1, snd: 'k2' },
        super: { pose: 'superdash', name: 'SHADOW BARRAGE', super: true, lvl: 'm', dmg: 40, st: 18, ac: 24, rc: 30, adv: 0, advB: 0, hit: { x: 0, y: 10, w: 80, h: 130 }, push: 2, pushB: 2, hs: 5, fx: 'launch', launch: 12, kb: 4, snd: 'super', mvf: [{ t: 16, vx: 12 }], fric: 0.9, inv: [1, 40], multi: { n: 6, gap: 4 }, noScale: true, chip: 0.25 }
      }),
      cmds: [
        { seq: [2, 3, 6], btn: 'p', move: 'sp1' }, { seq: [6, 2, 3], btn: 'p', move: 'sp2' }, { seq: [2, 1, 4], btn: 'k', move: 'sp3' }
      ],
      spMap: { 5: 'sp1', 2: 'sp2', 6: 'sp3' }
    },

    // ---------- BRUTUS: big grappler / bruiser ----------
    {
      id: 'brutus', name: 'BRUTUS', look: 'brawler', title: 'Grappler',
      skin: '#c98a5e', suit: '#d6491f', dark: '#7a2410', accent: '#f5e9c8', cape: null, hair: '#2a1a12',
      hp: 1150, walkF: 2.6, walkB: 2.0, jumpV: 14.2, jumpX: 3.2, w: 54, scale: 1.2,
      dashF: { dist: 95, frames: 18 }, dashB: { dist: 75, frames: 20 },
      moves: moves({
        lp: { dmg: 50, st: 6 }, lp2: { dmg: 55, st: 6, chain: { hp: 'hp3', hk: 'hk' } },
        hp: { dmg: 95, st: 11, rc: 16 }, hk: { dmg: 110, st: 14, rc: 20 }, ovh: { dmg: 100 }, launcher: { dmg: 95, st: 15 },
        hp3: { pose: 'hammer', lvl: 'm', dmg: 120, st: 13, ac: 3, rc: 24, adv: -3, advB: -13, hit: { x: 12, y: 60, w: 84, h: 70 }, push: 9, pushB: 7, hs: 13, fx: 'knock', launch: 7, kb: 7, snd: 'p3' },
        throw: { dmg: 170, st: 6, hit: { x: 0, y: 20, w: 76, h: 100 } },
        sp1: { pose: 'castfwd', name: 'Shockwave', proj: { speed: 7, dmg: 80, w: 40, h: 34, color: '#ffb35a', style: 'wave', y: 20, stunH: 24, stunB: 14, life: 100, fx: 'knock', launch: 7, kb: 5, hs: 10, lvl: 'l' }, st: 18, ac: 1, rc: 26, snd: 'cast', fxName: 'quake' },
        sp2: { pose: 'risingstrike', name: 'Gorilla Upper', lvl: 'm', dmg: 130, st: 6, ac: 7, rc: 34, adv: -20, advB: -34, hit: { x: 0, y: 20, w: 62, h: 140 }, push: 3, pushB: 3, hs: 13, fx: 'launch', launch: 14, kb: 2, hitRecov: 14, inv: [1, 10], air: true, landLag: 16, chip: 0.1, mvf: [{ t: 5, vx: 2, vy: -12 }], snd: 'p3' },
        // command grab - the grappler's trademark
        sp3: { pose: 'grab', name: 'Bear Hug', throw: true, dmg: 200, st: 9, ac: 2, rc: 30, hit: { x: 0, y: 20, w: 74, h: 100 }, hs: 0, snd: 'p2', throwKind: 'slam' },
        super: { pose: 'grab', name: 'TITAN SLAM', super: true, throw: true, dmg: 420, st: 14, ac: 2, rc: 36, hit: { x: 0, y: 10, w: 90, h: 120 }, hs: 0, snd: 'super', throwKind: 'super', noTech: true, inv: [1, 16] }
      }),
      cmds: [
        { seq: [2, 3, 6], btn: 'p', move: 'sp1' }, { seq: [6, 2, 3], btn: 'p', move: 'sp2' }, { seq: [6, 3, 2, 1, 4], btn: 'p', move: 'sp3' }
      ],
      spMap: { 5: 'sp1', 2: 'sp2', 6: 'sp3' }
    }
  );

  // ---------- extra specials for the original four ----------
  const X = o => Object.assign({ lvl: 'm', adv: 0, advB: -8, push: 6, pushB: 5, hs: 10, chip: 0.1, snd: 'p3', fx: 'hit', ac: 4 }, o);
  const DP = (name, dmg, o) => X(Object.assign({ pose: 'risingstrike', name, dmg, st: 4, ac: 7, rc: 34, adv: -20, advB: -34, hit: { x: 0, y: 20, w: 58, h: 130 }, push: 3, pushB: 3, hs: 12, fx: 'launch', launch: 15, kb: 2.5, hitRecov: 14, inv: [1, 9], air: true, landLag: 14, mvf: [{ t: 3, vx: 2.5, vy: -13 }] }, o || {}));
  const RUSH = (name, pose, dmg, st, ac, rc, vx, o) => X(Object.assign({ pose, name, dmg, st, ac, rc, hit: { x: 10, y: 40, w: 70, h: 80 }, mvf: [{ t: st - 2, vx }], fric: 0.9, fx: 'knock', launch: 7, kb: 6, adv: -2, advB: -9 }, o || {}));
  const SHOT = (name, pose, st, rc, p, o) => Object.assign({ pose, name, st, ac: 1, rc, snd: 'cast', fxName: 'charge', proj: Object.assign({ fx: 'hit', hs: 8, stunH: 20, stunB: 12, life: 80 }, p) }, o || {});
  const BEAM = (name, pose, color, y) => ({ pose, name, super: true, lvl: 'a', st: 20, ac: 1, rc: 34, snd: 'super', proj: { speed: 20, dmg: 58, w: 260, h: 80, color, style: 'beam', y, stunH: 14, stunB: 12, life: 50, fx: 'launch', launch: 12, hs: 6, n: 5, gap: 5, kb: 3, noScale: true, chip: 0.25 } });
  const MSUPER = (name, pose, dmg, st) => X({ pose, name, super: true, dmg, st, ac: 24, rc: 30, hit: { x: 0, y: 10, w: 84, h: 130 }, push: 2, pushB: 2, hs: 5, fx: 'launch', launch: 12, kb: 4, snd: 'super', mvf: [{ t: st - 2, vx: 12 }], fric: 0.9, inv: [1, 40], multi: { n: 6, gap: 4 }, noScale: true, chip: 0.25 });
  const C = id => G.CHARACTERS.find(c => c.id === id);
  const STD = [{ seq: [2, 3, 6], btn: 'p', move: 'sp1' }, { seq: [6, 2, 3], btn: 'p', move: 'sp2' }, { seq: [2, 1, 4], btn: 'k', move: 'sp3' }, { seq: [2, 1, 4], btn: 'p', move: 'sp4' }, { seq: [2, 3, 6], btn: 'k', move: 'sp5' }];
  const MAP = { 5: 'sp1', 2: 'sp2', 6: 'sp3', 4: 'sp4', 3: 'sp5' };
  function extend(id, mv, cmds) {
    const c = C(id); for (const k in mv) { c.moves[k] = Object.assign({ id: k }, mv[k]); }
    c.cmds = (cmds || STD).slice(); c.spMap = MAP;
  }
  extend('thunder', { sp4: X({ pose: 'hammer', name: 'Hammer Smash', st: 12, ac: 3, rc: 26, dmg: 105, adv: -4, advB: -16, hit: { x: 10, y: 40, w: 84, h: 90 }, launch: 7, kb: 6, fx: 'knock', mvf: [{ t: 10, vx: 3 }] }),
    sp5: X({ pose: 'sidekick', name: 'Volt Kick', st: 14, ac: 5, rc: 22, dmg: 90, hit: { x: 10, y: 40, w: 100, h: 50 }, fx: 'launch', launch: 11, kb: 3, hitRecov: 8, mvf: [{ t: 12, vx: 9 }], fric: 0.9, jchain: { lp: 'lp', hp: 'hp', lk: 'lk', hk: 'hk' } }) });
  extend('ironknight', { sp4: SHOT('Mortar Shell', 'throwkunai', 14, 26, { speed: 7, dmg: 90, w: 34, h: 34, color: '#ffcf6a', style: 'bomb', y: 150, vy: 4, g: 0.35, stunH: 24, stunB: 14, life: 90, fx: 'knock', launch: 8, kb: 5, hs: 10 }),
    sp5: RUSH('Jet Dash', 'shoulder', 100, 16, 10, 24, 14, { hit: { x: 6, y: 25, w: 66, h: 100 }, fric: 0.93 }) });
  extend('kage', { sp4: RUSH('Shadow Slide', 'clow', 70, 10, 10, 20, 13, { lvl: 'l', hit: { x: 10, y: 0, w: 80, h: 34 }, launch: 6, kb: 5, stance: 'crouch' }),
    sp5: X({ pose: 'roundhouse', name: 'Crescent Kicks', st: 10, ac: 12, rc: 24, dmg: 55, hit: { x: 10, y: 60, w: 90, h: 60 }, fx: 'launch', launch: 10, kb: 3, multi: { n: 2, gap: 6 }, mvf: [{ t: 8, vx: 4 }] }) });
  extend('brutus', { sp4: X({ pose: 'headbutt', name: 'Headbutt', st: 8, ac: 3, rc: 20, dmg: 100, hit: { x: 6, y: 60, w: 60, h: 70 }, fx: 'knock', launch: 7, kb: 6, mvf: [{ t: 6, vx: 4 }] }),
    sp5: RUSH('Clothesline', 'clothes', 75, 14, 14, 24, 8, { hit: { x: 0, y: 50, w: 90, h: 50 }, fx: 'launch', launch: 11, kb: 3, multi: { n: 2, gap: 8 } }) },
    [{ seq: [6, 3, 2, 1, 4], btn: 'p', move: 'sp3' }, { seq: [2, 3, 6], btn: 'p', move: 'sp1' }, { seq: [6, 2, 3], btn: 'p', move: 'sp2' }, { seq: [2, 1, 4], btn: 'p', move: 'sp4' }, { seq: [2, 3, 6], btn: 'k', move: 'sp5' }]);

  // =====================================================================
  G.CHARACTERS.push(
    // ---------- OGGY: trickster / drunken-style, bombs + rolls ----------
    { id: 'oggy', name: 'OGGY', look: 'prank', title: 'Trickster', skin: '#f2b27c', suit: '#2ea043', dark: '#1b6b2c', accent: '#ffd23f', hair: '#27c4c4', cape: null,
      hp: 1080, walkF: 2.9, walkB: 2.4, jumpV: 15, jumpX: 4.4, w: 50, scale: 1.05, bounce: 1.6,
      dashF: { dist: 110, frames: 17 }, dashB: { dist: 90, frames: 18 },
      moves: moves({
        lp2: { chain: { hp: 'hp3', hk: 'hk', lk: 'lk3' } },
        hp: { dmg: 80, st: 10, pose: 'cross' },
        hp3: { pose: 'shoulder', lvl: 'm', dmg: 90, st: 10, ac: 3, rc: 20, adv: -2, advB: -11, hit: { x: 8, y: 30, w: 66, h: 90 }, push: 8, pushB: 6, hs: 11, fx: 'knock', launch: 7, kb: 6, snd: 'p3', mvf: [{ t: 8, vx: 3 }] },
        sp1: SHOT('Party Bomb', 'throwkunai', 12, 24, { speed: 8, dmg: 85, w: 36, h: 36, color: '#ff8a3a', style: 'bomb', y: 140, vy: 2, g: 0.4, stunH: 24, stunB: 14, life: 70, fx: 'knock', launch: 8, kb: 5, hs: 10 }),
        sp2: DP('Spin Cyclone', 115),
        sp3: RUSH('Belly Flop', 'shoulder', 100, 18, 10, 26, 11, { hit: { x: 6, y: 20, w: 76, h: 100 } }),
        sp4: RUSH('Drunken Roll', 'clow', 70, 10, 10, 22, 13, { lvl: 'l', hit: { x: 10, y: 0, w: 80, h: 34 }, launch: 6, kb: 5, stance: 'crouch' }),
        sp5: X({ pose: 'lunge', name: 'Cannon Fist', st: 15, ac: 4, rc: 24, dmg: 110, adv: -4, advB: -12, hit: { x: 10, y: 70, w: 118, h: 40 }, fx: 'launch', launch: 12, kb: 3, hitRecov: 8, mvf: [{ t: 13, vx: 12 }], fric: 0.9 }),
        super: MSUPER('GRAND PRANK', 'superdash', 45, 20)
      }), cmds: STD, spMap: MAP },

    // ---------- JACK: saber swordsman, long reach ----------
    { id: 'jack', name: 'JACK', look: 'pirate', title: 'Swordsman', skin: '#e8b58a', suit: '#1f2f5a', dark: '#2b2b3a', accent: '#d4a73a', hair: '#2a1a12', cape: null,
      hp: 980, walkF: 3.3, walkB: 2.6, jumpV: 15.8, jumpX: 4.6, w: 44, scale: 1.02,
      dashF: { dist: 125, frames: 16 }, dashB: { dist: 100, frames: 17 },
      moves: moves({
        lp: { hit: { x: 14, y: 96, w: 80, h: 24 }, dmg: 42 }, lp2: { hit: { x: 14, y: 90, w: 84, h: 28 }, chain: { hp: 'hp3', hk: 'hk', lk: 'lk3' } },
        hp: { name: 'Cutlass Slash', dmg: 82, hit: { x: 14, y: 80, w: 100, h: 40 } },
        hp3: { pose: 'cross', lvl: 'm', dmg: 100, st: 10, ac: 4, rc: 22, adv: -3, advB: -12, hit: { x: 14, y: 70, w: 106, h: 56 }, push: 9, pushB: 6, hs: 12, fx: 'knock', launch: 7, kb: 6, snd: 'p3' },
        hk: { hit: { x: 10, y: 80, w: 104, h: 36 } }, ovh: { name: 'Overhead Cleave', dmg: 95, hit: { x: 14, y: 50, w: 90, h: 80 } }, launcher: { name: 'Rising Slash', dmg: 90, hit: { x: 6, y: 40, w: 80, h: 100 } },
        sp1: SHOT('Wave Slash', 'cross', 12, 22, { speed: 11, dmg: 75, w: 34, h: 60, color: '#bfe4ff', style: 'crescent', y: 80, stunH: 20, stunB: 12 }),
        sp2: DP('Cutlass Rise', 115),
        sp3: RUSH('Lunge Thrust', 'lunge', 90, 14, 6, 20, 14, { hit: { x: 10, y: 70, w: 120, h: 36 }, adv: 0 }),
        sp4: SHOT('Pistol Shot', 'throwkunai', 8, 16, { speed: 20, dmg: 55, w: 16, h: 10, color: '#ffe08a', style: 'bullet', y: 100, stunH: 16, stunB: 10, life: 40, hs: 6 }),
        sp5: X({ pose: 'clothes', name: 'Whirlwind', st: 12, ac: 12, rc: 26, dmg: 45, hit: { x: 0, y: 30, w: 110, h: 90 }, fx: 'launch', launch: 11, kb: 3, multi: { n: 3, gap: 4 }, mvf: [{ t: 10, vx: 5 }] }),
        super: BEAM('KRAKEN STRIKE', 'superbeam', '#6fd6ff', 90)
      }), cmds: STD, spMap: MAP },

    // ---------- STEVE: Muay Thai kickboxer, knees + kicks ----------
    { id: 'steve', name: 'STEVE', look: 'kick', title: 'Kickboxer', skin: '#e9b98f', suit: '#1c8fa5', dark: '#12525f', accent: '#f3f3f3', top: '#8c93a8', hair: '#5a3a22', cape: null,
      hp: 1000, walkF: 3.5, walkB: 2.8, jumpV: 16, jumpX: 4.8, w: 44, scale: 1.04, bounce: 2.2,
      dashF: { dist: 130, frames: 16 }, dashB: { dist: 100, frames: 17 },
      moves: moves({
        lp: { st: 4, dmg: 38, adv: 3 }, lk: { st: 6, adv: 2 }, hk: { dmg: 95, st: 11 },
        lp2: { chain: { hp: 'hp3', hk: 'hk', lk: 'lk2' } }, lk2: { dmg: 62, chain: { hk: 'hk', lk: 'lk3', hp: 'hp3' } },
        hp3: { pose: 'cross', lvl: 'm', dmg: 85, st: 9, ac: 3, rc: 18, adv: -1, advB: -9, hit: { x: 12, y: 80, w: 74, h: 34 }, push: 7, pushB: 5, hs: 10, fx: 'knock', launch: 7, kb: 5, snd: 'p2' },
        flk: { pose: 'knee', lvl: 'm', dmg: 70, st: 10, ac: 3, rc: 15, adv: 2, advB: -5, hit: { x: 10, y: 40, w: 60, h: 62 }, push: 4, pushB: 4, hs: 9, snd: 'k1', mvf: [{ t: 8, vx: 3.5 }], chain: { hk: 'hk', hp: 'hp3', lk: 'lk3' }, sc: true },
        sp1: SHOT('Air Slash', 'lowkick', 12, 22, { speed: 12, dmg: 70, w: 30, h: 50, color: '#7dffd8', style: 'crescent', y: 70, stunH: 20, stunB: 12 }),
        sp2: DP('Flying Knee Rise', 110),
        sp3: RUSH('Dash Knee', 'knee', 85, 13, 7, 20, 13, { hit: { x: 10, y: 50, w: 70, h: 70 }, fx: 'launch', launch: 12, kb: 3, hitRecov: 8, jchain: { lp: 'lp', hp: 'hp', lk: 'lk', hk: 'hk' } }),
        sp4: X({ pose: 'spinkick', name: 'Spin Back Kick', st: 11, ac: 4, rc: 24, dmg: 100, hit: { x: 10, y: 50, w: 104, h: 52 }, fx: 'knock', launch: 7, kb: 6, mvf: [{ t: 9, vx: 3 }] }),
        sp5: X({ pose: 'axekick', name: 'Axe Kick', st: 20, ac: 4, rc: 22, dmg: 95, adv: -3, advB: -13, hit: { x: 20, y: 20, w: 70, h: 110 }, fx: 'knock', launch: 6, kb: 5, mvf: [{ t: 16, vx: 3 }] }),
        super: MSUPER('THUNDER LEGS', 'roundhouse', 42, 18)
      }), cmds: STD, spMap: MAP }
  );

  G.STAGES = ['dojo', 'neon', 'temple'];
})();
