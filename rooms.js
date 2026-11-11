// Room logic + authoritative 60Hz match loop. No dependency on 'ws' (just needs sockets with send()).
require('./config.js'); require('./characters.js'); require('./fighter.js'); require('./match.js');
const rooms = new Map();
const blank = () => ({ l: 0, r: 0, u: 0, d: 0, b: 0, p: 0 });   // b = buttons held, p = buttons newly pressed since last tick

function makeCode() {
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ'; let c;
  do { c = Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join(''); } while (rooms.has(c));
  return c;
}
function send(ws, o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
const bcast = (r, o) => r.p.forEach(w => send(w, o));

function leave(ws) {
  const r = ws.room; if (!r) return;
  ws.room = null; rooms.delete(r.code);
  r.p.forEach(w => { if (w && w !== ws) { w.room = null; send(w, { t: 'left' }); } });
}

function handle(ws, m) {
  const t = m && m.t;
  if (t === 'create') {
    leave(ws);
    const r = { code: makeCode(), p: [ws, null], picks: [null, null], rematch: [false, false], match: null, inp: [blank(), blank()] };
    rooms.set(r.code, r); ws.room = r; ws.slot = 0; send(ws, { t: 'room', code: r.code, slot: 0 });
  } else if (t === 'join') {
    leave(ws);
    const r = rooms.get(String(m.code || '').toUpperCase().trim());
    if (!r) return send(ws, { t: 'err', msg: 'Room not found' });
    if (r.p[1]) return send(ws, { t: 'err', msg: 'Room is full' });
    r.p[1] = ws; ws.room = r; ws.slot = 1; send(ws, { t: 'room', code: r.code, slot: 1 }); bcast(r, { t: 'joined' });
  } else if (ws.room) {
    const r = ws.room, s = ws.slot;
    if (t === 'pick' && !r.match && Number.isInteger(m.i) && m.i >= 0 && m.i < Game.CHARACTERS.length) {
      r.picks[s] = m.i;
      if (r.picks[0] !== null && r.picks[1] !== null) {
        r.match = new Game.Match(r.picks[0], r.picks[1]); r.inp = [blank(), blank()]; r.rematch = [false, false];
        bcast(r, { t: 'start', c: r.picks });
      }
    } else if (t === 'in' && r.match) {
      const i = r.inp[s], k = m.k | 0, b = (m.b | 0) & 127;
      i.l = k & 1 ? 1 : 0; i.r = k & 2 ? 1 : 0; i.u = k & 4 ? 1 : 0; i.d = k & 8 ? 1 : 0;
      i.p |= b & ~i.b; i.b = b;
    } else if (t === 'rematch' && r.match && r.match.ph === 'matchEnd') {
      r.rematch[s] = true;
      if (r.rematch[0] && r.rematch[1]) { r.match = null; r.picks = [null, null]; r.rematch = [false, false]; bcast(r, { t: 'joined' }); }
    }
  }
}

function tick() {
  for (const r of rooms.values()) {
    if (!r.match) continue;
    r.match.step(r.inp[0], r.inp[1]);
    r.inp.forEach(i => { i.p = 0; });
    bcast(r, { t: 's', s: r.match.serialize() });
  }
}
setInterval(tick, 1000 / 60);

module.exports = { handle, leave, rooms };
