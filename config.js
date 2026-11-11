// Global namespace + constants. Loaded by BOTH the browser and the Node server.
(typeof window !== 'undefined' ? window : globalThis).Game = {
  W: 800, H: 450, GROUND: 392,          // canvas size + ground line
  STAGE_W: 1300,                        // world width (camera scrolls inside it)
  MAX_DIST: 560,                        // fighters can never be further apart than this
  GRAVITY: 0.8,
  ROUND_SECONDS: 60,
  WINS_NEEDED: 2,
  METER_MAX: 100,
  // button bits (held / pressed masks)
  BTN: { lp: 1, hp: 2, lk: 4, hk: 8, sp: 16, th: 32, su: 64 },
  CHARACTERS: []
};
