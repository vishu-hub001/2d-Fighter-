// ADD NEW CHARACTERS HERE. Each entry is plain data.
// look: picks the drawing style in fighter.js (add new looks in drawLook()).
// moves frames = [startup, active, recovery]
Game.CHARACTERS.push(
  {
    id: 'thunder', name: 'THUNDER LORD', look: 'thunder',
    skin: '#f1c27d', suit: '#2b4cc4', dark: '#1d3390', accent: '#e8c53a', cape: '#c0272d',
    hp: 100, speed: 3.4, jump: -14,
    punch: { dmg: 6, range: 62, frames: [4, 3, 9] },
    kick: { dmg: 10, range: 78, frames: [7, 4, 15] },
    special: { name: 'Lightning', dmg: 13, speed: 9, color: '#8fdcff', cool: 120, frames: [10, 2, 16] }
  },
  {
    id: 'ironknight', name: 'IRON KNIGHT', look: 'knight',
    skin: '#e8c53a', suit: '#b3202a', dark: '#7d151c', accent: '#e8c53a', cape: null,
    hp: 105, speed: 3.0, jump: -13,
    punch: { dmg: 7, range: 60, frames: [5, 3, 10] },
    kick: { dmg: 9, range: 74, frames: [7, 4, 14] },
    special: { name: 'Repulsor', dmg: 11, speed: 12, color: '#fff6a0', cool: 90, frames: [8, 2, 14] }
  }
);
