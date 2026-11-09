// Global namespace + constants. Loaded by BOTH the browser and the Node server.
(typeof window !== 'undefined' ? window : globalThis).Game = {
  W: 800, H: 450, GROUND: 390,
  GRAVITY: 0.7,
  ROUND_SECONDS: 60,
  WINS_NEEDED: 2,
  CHARACTERS: []
};
