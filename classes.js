// =====================================================================
//  CLASSES + WEAPONS  (loaded after characters.js, by the browser AND the Node server)
//
//  CLASS STATS (plain fields on a fighter entry):
//    cls        class name shown in the UI           weapon   key into G.WEAPONS (also draws the weapon in sprites.js)
//    power      damage dealt multiplier (1 = normal) defense  damage taken divisor (1 = normal, 1.2 = tanky, .9 = fragile)
//    mana       max mana (casters only)              manaRegen  mana per frame (x2.5 while crouching)
//    manaOnHit  mana gained per point of damage dealt
//
//  MOVE FIELDS added by this file:
//    mana       cost to cast (move fizzles with "NO MANA" if you can't pay)
//    heal       HP restored when the cast fires      manaGain   mana restored when the cast fires
//    tele       {t, d}  teleport to the far side of the opponent on frame t (d = distance behind them)
//    armor      0..1  POISE: while the move is in startup/active frames, hits are soaked at (armor x damage)
//               and the move keeps going.  armorFrom = first frame the armour is up.
//    proj.volley  fire N arrows in a spread (vsp / vvy = speed / lift step per arrow)
//
//  ADD A NEW WEAPON: add a profile to G.WEAPONS, a look + weapon drawing in sprites.js, then use moves(over, 'weaponKey').
// =====================================================================
(function () {
  const G = Game;

  // ---------------- weapon profiles: they reshape the HAND normals (lp lp2 hp hp3 ovh launcher clp chp) ----------------
  //  dmg = damage multiplier   st / rc = startup / recovery frames added   reach = hitbox length added   blade = trail length
  G.WEAPONS = {
    short: { name: 'Short Sword',  dmg: 0.90, st: -1, rc: -2, reach: 24, blade: 46,  armor: 0,  desc: 'Fastest, short reach, great combos' },
    long:  { name: 'Long Sword',   dmg: 1.05, st: 0,  rc: 0,  reach: 48, blade: 90,  armor: 0,  desc: 'Balanced, long reach, strong specials' },
    heavy: { name: 'Heavy Sword',  dmg: 1.45, st: 4,  rc: 6,  reach: 42, blade: 106, armor: .5, desc: 'Slow, huge damage, poise armour on heavy swings' },
    bow:   { name: 'Longbow',      dmg: 0.80, st: -1, rc: -1, reach: -8, blade: 0,   armor: 0,  desc: 'Weak melee, strong arrows, keeps distance' },
    staff: { name: 'Arcane Staff', dmg: 0.85, st: 1,  rc: 0,  reach: 16, blade: 0,   armor: 0,  desc: 'Casts spells with MANA, weak melee' }
  };
  const HAND = ['lp', 'lp2', 'hp', 'hp3', 'ovh', 'launcher', 'clp', 'chp'];
  const ARMOR_KEYS = ['hp', 'ovh', 'launcher'];

  // merge helper: base moves -> weapon profile -> character overrides
  function moves(over, weapon) {
    const m = G.baseMoves(), w = G.WEAPONS[weapon];
    if (w) for (const k of HAND) {
      const v = m[k]; if (!v) continue;
      v.dmg = Math.round(v.dmg * w.dmg); v.st = Math.max(3, v.st + w.st); v.rc = Math.max(6, v.rc + w.rc);
      v.hit = Object.assign({}, v.hit, { w: Math.max(36, v.hit.w + w.reach) });
      if (w.armor && ARMOR_KEYS.includes(k)) { v.armor = w.armor; v.armorFrom = 3; }
    }
    for (const k in over) m[k] = Object.assign({}, m[k] || {}, over[k]);
    for (const k in m) m[k].id = k;
    return m;
  }

  // ---------------- small move builders (same idea as characters.js) ----------------
  const X = o => Object.assign({ lvl: 'm', adv: 0, advB: -8, push: 6, pushB: 5, hs: 10, chip: 0.1, snd: 'p3', fx: 'hit', ac: 4 }, o);
  const DP = (name, dmg, o) => X(Object.assign({ pose: 'risingstrike', name, dmg, st: 4, ac: 7, rc: 34, adv: -20, advB: -34, hit: { x: 0, y: 20, w: 58, h: 130 }, push: 3, pushB: 3, hs: 12, fx: 'launch', launch: 15, kb: 2.5, hitRecov: 14, inv: [1, 9], air: true, landLag: 14, mvf: [{ t: 3, vx: 2.5, vy: -13 }] }, o || {}));
  const RUSH = (name, pose, dmg, st, ac, rc, vx, o) => X(Object.assign({ pose, name, dmg, st, ac, rc, hit: { x: 10, y: 40, w: 70, h: 80 }, mvf: [{ t: st - 2, vx }], fric: 0.9, fx: 'knock', launch: 7, kb: 6, adv: -2, advB: -9 }, o || {}));
  const SHOT = (name, pose, st, rc, p, o) => Object.assign({ pose, name, st, ac: 1, rc, snd: 'cast', fxName: 'charge', proj: Object.assign({ fx: 'hit', hs: 8, stunH: 20, stunB: 12, life: 80 }, p) }, o || {});
  const BEAM = (name, pose, color, y) => ({ pose, name, super: true, lvl: 'a', st: 20, ac: 1, rc: 34, snd: 'super', proj: { speed: 20, dmg: 58, w: 260, h: 80, color, style: 'beam', y, stunH: 14, stunB: 12, life: 50, fx: 'launch', launch: 12, hs: 6, n: 5, gap: 5, kb: 3, noScale: true, chip: 0.25 } });
  const MSUPER = (name, pose, dmg, st, wide) => X({ pose, name, super: true, dmg, st, ac: 24, rc: 30, hit: { x: 0, y: 10, w: wide || 84, h: 130 }, push: 2, pushB: 2, hs: 5, fx: 'launch', launch: 12, kb: 4, snd: 'super', mvf: [{ t: st - 2, vx: 12 }], fric: 0.9, inv: [1, 40], multi: { n: 6, gap: 4 }, noScale: true, chip: 0.25 });
  const NOHIT = { x: -900, y: -900, w: 1, h: 1 };     // for self-cast spells (heal / meditate): no hitbox
  const STD = [{ seq: [2, 3, 6], btn: 'p', move: 'sp1' }, { seq: [6, 2, 3], btn: 'p', move: 'sp2' }, { seq: [2, 1, 4], btn: 'k', move: 'sp3' }, { seq: [2, 1, 4], btn: 'p', move: 'sp4' }, { seq: [2, 3, 6], btn: 'k', move: 'sp5' }];
  const MAP = { 5: 'sp1', 2: 'sp2', 6: 'sp3', 4: 'sp4', 3: 'sp5' };

  G.CHARACTERS.push(
    // ---------- RONIN: LONG SWORD swordsman. Balanced, huge reach, clean strings ----------
    {
      id: 'ronin', name: 'RONIN', look: 'samurai', weapon: 'long', cls: 'Swordsman', title: 'Long Sword',
      skin: '#e3b48a', suit: '#3b4a6b', dark: '#1d2438', accent: '#e8c14a', hair: '#14121a', cape: null,
      hp: 990, power: 1.0, defense: 1.0, walkF: 3.3, walkB: 2.6, jumpV: 15.8, jumpX: 4.6, w: 44, scale: 1.02,
      dashF: { dist: 125, frames: 16 }, dashB: { dist: 100, frames: 17 },
      moves: moves({
        lp2: { chain: { hp: 'hp3', hk: 'hk', lk: 'lk3' } },
        hp3: { pose: 'cross', name: 'Kesa Cut', lvl: 'm', dmg: 105, st: 10, ac: 4, rc: 21, adv: -2, advB: -11, hit: { x: 14, y: 70, w: 130, h: 56 }, push: 8, pushB: 6, hs: 12, fx: 'knock', launch: 7, kb: 6, snd: 'p3' },
        sp1: X({ pose: 'lunge', name: 'Iaido Draw', st: 8, ac: 3, rc: 22, dmg: 100, adv: -3, advB: -14, hit: { x: 10, y: 70, w: 150, h: 40 }, fx: 'launch', launch: 11, kb: 3, hitRecov: 6, mvf: [{ t: 6, vx: 14 }], fric: 0.88 }),
        sp2: DP('Rising Dragon', 118),
        sp3: SHOT('Wind Cutter', 'cross', 13, 22, { speed: 12, dmg: 66, w: 36, h: 26, color: '#d8f1ff', style: 'crescent', y: 30, stunH: 22, stunB: 12, life: 80, lvl: 'l', fx: 'knock', launch: 6, kb: 5, hs: 9 }),
        sp4: X({ pose: 'clothes', name: 'Blade Flurry', st: 11, ac: 12, rc: 24, dmg: 46, hit: { x: 0, y: 30, w: 140, h: 90 }, fx: 'launch', launch: 10, kb: 3, multi: { n: 3, gap: 4 }, mvf: [{ t: 9, vx: 5 }] }),
        sp5: X({ pose: 'overhead', name: 'Falling Blossom', st: 14, ac: 8, rc: 20, dmg: 118, adv: -6, advB: -18, hit: { x: 10, y: 10, w: 110, h: 125 }, fx: 'knock', launch: 7, kb: 6, air: true, landLag: 16, mvf: [{ t: 8, vx: 5, vy: -11 }] }),
        super: MSUPER('MOONLIGHT SLASH', 'superdash', 46, 18, 150)
      }, 'long'),
      cmds: STD, spMap: MAP
    },

    // ---------- GORATH: HEAVY SWORD knight. Slow, tanky, POISE armour on heavy swings ----------
    {
      id: 'gorath', name: 'GORATH', look: 'warlord', weapon: 'heavy', cls: 'Knight', title: 'Heavy Sword',
      skin: '#c99a73', suit: '#8f9bb0', dark: '#3b4352', accent: '#e0a93a', hair: '#3a2a1a', cape: '#7a1f1f',
      hp: 1180, power: 1.2, defense: 1.15, walkF: 2.5, walkB: 2.0, jumpV: 14, jumpX: 3.1, w: 54, scale: 1.15,
      dashF: { dist: 90, frames: 19 }, dashB: { dist: 72, frames: 21 },
      moves: moves({
        lp2: { chain: { hp: 'hp3', hk: 'hk' } },
        hp3: { pose: 'hammer', name: 'Skull Splitter', lvl: 'm', dmg: 150, st: 14, ac: 4, rc: 26, adv: -4, advB: -16, hit: { x: 14, y: 50, w: 140, h: 90 }, push: 9, pushB: 7, hs: 14, fx: 'knock', launch: 7, kb: 7, snd: 'p3', armor: 0.5, armorFrom: 3 },
        sp1: SHOT('Ground Breaker', 'castfwd', 18, 28, { speed: 6.5, dmg: 90, w: 46, h: 36, color: '#e0a93a', style: 'wave', y: 20, stunH: 24, stunB: 14, life: 100, fx: 'knock', launch: 7, kb: 5, hs: 11, lvl: 'l' }, { fxName: 'quake' }),
        sp2: DP('Titan Rise', 135, { st: 6 }),
        sp3: RUSH('Warlord Charge', 'shoulder', 110, 18, 9, 24, 9, { hit: { x: 6, y: 25, w: 78, h: 105 }, armor: 0.45, armorFrom: 3, fric: 0.93 }),
        sp4: X({ pose: 'hammer', name: 'Executioner', st: 24, ac: 4, rc: 28, dmg: 175, adv: -6, advB: -20, hit: { x: 10, y: 30, w: 135, h: 120 }, fx: 'knock', launch: 8, kb: 7, hs: 14, armor: 0.55, armorFrom: 4, mvf: [{ t: 18, vx: 3 }] }),
        sp5: X({ pose: 'clothes', name: 'Whirlwind Cleave', st: 13, ac: 12, rc: 28, dmg: 70, hit: { x: 0, y: 30, w: 130, h: 90 }, fx: 'launch', launch: 10, kb: 3, multi: { n: 2, gap: 7 }, armor: 0.4, armorFrom: 3, mvf: [{ t: 11, vx: 4 }] }),
        super: MSUPER('RAGNAROK', 'superdash', 62, 20, 140)
      }, 'heavy'),
      cmds: STD, spMap: MAP
    },

    // ---------- SYLVA: LONGBOW archer. Fragile, fast, wins from range ----------
    {
      id: 'sylva', name: 'SYLVA', look: 'ranger', weapon: 'bow', cls: 'Archer', title: 'Archer',
      skin: '#e9bb94', suit: '#2f6b46', dark: '#1c3b2a', accent: '#e8d27a', hair: '#c0561f', cape: '#2a5a3b',
      hp: 900, power: 0.95, defense: 0.9, walkF: 3.8, walkB: 3.1, jumpV: 16.5, jumpX: 5.0, w: 40, scale: 0.98,
      dashF: { dist: 145, frames: 15 }, dashB: { dist: 125, frames: 15 },
      moves: moves({
        lp: { st: 4 }, lk: { st: 6, adv: 2 },
        lp2: { chain: { hp: 'hp', hk: 'hk', lk: 'lk3' } },
        sp1: SHOT('Quick Shot', 'castfwd', 8, 14, { speed: 19, dmg: 58, w: 42, h: 10, color: '#f3e6b0', style: 'arrow', y: 90, stunH: 16, stunB: 9, life: 50, hs: 7 }, { fxName: 'puff' }),
        sp2: DP('Skyward Kick', 100),
        sp3: SHOT('Power Shot', 'castfwd', 24, 28, { speed: 23, dmg: 125, w: 58, h: 12, color: '#9dff9a', style: 'arrow', y: 90, stunH: 26, stunB: 15, life: 50, fx: 'knock', launch: 8, kb: 6, hs: 12 }),
        sp4: SHOT('Arrow Rain', 'throwkunai', 14, 26, { speed: 8.5, dmg: 48, w: 36, h: 10, color: '#f3e6b0', style: 'arrow', y: 150, vy: 5, g: 0.32, stunH: 20, stunB: 12, life: 90, hs: 7, volley: 3, vsp: 1.6, vvy: 1.4 }),
        sp5: Object.assign(SHOT('Evasive Shot', 'castfwd', 13, 20, { speed: 20, dmg: 72, w: 44, h: 10, color: '#f3e6b0', style: 'arrow', y: 85, stunH: 20, stunB: 12, life: 50 }), { air: true, landLag: 8, mvf: [{ t: 2, vx: -7, vy: -9 }] }),
        super: BEAM('DRAGON ARROW', 'superbeam', '#9dff9a', 90)
      }, 'bow'),
      cmds: STD, spMap: MAP
    },

    // ---------- ZEPHYR: ARCANE MAGE. Spells cost MANA. Regens slowly (fast when crouching), refunds mana on hit ----------
    {
      id: 'zephyr', name: 'ZEPHYR', look: 'arcanist', weapon: 'staff', cls: 'Mage', title: 'Mage',
      skin: '#f0cfb2', suit: '#5a2e9a', dark: '#2a1659', accent: '#7cf3ff', hair: '#e6e9ff', cape: null,
      hp: 880, power: 1.1, defense: 0.9, mana: 100, manaRegen: 0.14, manaOnHit: 0.1,
      walkF: 3.2, walkB: 2.8, jumpV: 16, jumpX: 4.6, w: 40, scale: 0.99,
      dashF: { dist: 135, frames: 16 }, dashB: { dist: 110, frames: 17 },
      moves: moves({
        lp2: { chain: { hp: 'hp3', hk: 'hk', lk: 'lk3' } },
        hp3: { pose: 'hammer', name: 'Staff Smash', lvl: 'm', dmg: 85, st: 11, ac: 3, rc: 20, adv: -2, advB: -11, hit: { x: 12, y: 60, w: 96, h: 70 }, push: 7, pushB: 5, hs: 11, fx: 'knock', launch: 7, kb: 5, snd: 'p3' },
        // ---- spells (mana cost in brackets) ----
        sp1: SHOT('Fire Bolt', 'castfwd', 12, 20, { speed: 11, dmg: 72, w: 38, h: 36, color: '#ff9a2f', style: 'flame', y: 90, stunH: 20, stunB: 12, life: 90 }, { mana: 10 }),
        sp2: DP('Arcane Burst', 112, { mana: 20 }),
        sp3: X({ pose: 'cross', name: 'Blink Strike', st: 12, ac: 4, rc: 18, dmg: 78, adv: -2, advB: -10, hit: { x: 10, y: 60, w: 96, h: 60 }, fx: 'knock', launch: 7, kb: 5, mana: 15, inv: [1, 12], tele: { t: 6, d: 78 }, snd: 'cast' }),
        sp4: X({ pose: 'castfwd', name: 'Mend', st: 16, ac: 1, rc: 30, dmg: 0, heal: 90, mana: 30, hit: NOHIT, snd: 'cast' }),
        sp5: X({ pose: 'castfwd', name: 'Meditate', st: 18, ac: 1, rc: 34, dmg: 0, manaGain: 38, hit: NOHIT, snd: 'cast' }),
        super: BEAM('METEOR STORM', 'superbeam', '#ff9a3a', 90)
      }, 'staff'),
      cmds: STD, spMap: MAP
    }
  );
})();
