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
      lk:  { pose: 'lowkick',lvl: 'h', dmg: 50,  st: 7,  ac: 3, rc: 10, adv: 1,  advB: -3, hit: { x: 14, y: 62, w: 74, h: 24 }, push: 4, pushB: 4, hs: 7, chain: { hp: 'hp', hk: 'hk' }, sc: true, snd: 'k1' },
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

  G.STAGES = ['dojo', 'neon', 'temple'];
})();
