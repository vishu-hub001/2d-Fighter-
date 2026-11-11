// Input: keyboard, gamepad and touch (8-way d-pad + 7 buttons). Game.input.take() -> {l,r,u,d,b,p} for the match.
Game.input = (function () {
  const B = Game.BTN, st = { k: 0, b: 0, p: 0, onchange: null };
  const KEYS = { ArrowLeft: 1, a: 1, ArrowRight: 2, d: 2, ArrowUp: 4, w: 4, ArrowDown: 8, s: 8 };
  const BTNS = { j: B.lp, u: B.hp, k: B.lk, i: B.hk, l: B.sp, h: B.th, ';': B.su, ' ': B.su };
  const keyDown = {}; let pad = 0, touchK = 0, touchB = 0, kbK = 0, kbB = 0;
  function recompute() {
    const k = kbK | touchK | (pad & 15), b = kbB | touchB | (pad >> 4);
    if (k !== st.k || b !== st.b) { st.p |= b & ~st.b; st.k = k; st.b = b; st.onchange && st.onchange(); }
  }
  addEventListener('keydown', e => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (keyDown[key]) return; keyDown[key] = 1;
    if (KEYS[key]) kbK |= KEYS[key]; if (BTNS[key]) kbB |= BTNS[key]; if (KEYS[key] || BTNS[key]) e.preventDefault(); recompute();
  });
  addEventListener('keyup', e => { const key = e.key.length === 1 ? e.key.toLowerCase() : e.key; keyDown[key] = 0; if (KEYS[key]) kbK &= ~KEYS[key]; if (BTNS[key]) kbB &= ~BTNS[key]; recompute(); });
  addEventListener('blur', () => { kbK = kbB = 0; recompute(); });

  function pollPad() {
    const gp = (navigator.getGamepads && navigator.getGamepads() || [])[0]; if (!gp) { if (pad) { pad = 0; recompute(); } return; }
    const x = gp.axes[0] || 0, y = gp.axes[1] || 0, bt = i => gp.buttons[i] && gp.buttons[i].pressed;
    let k = 0, b = 0;
    if (x < -.5 || bt(14)) k |= 1; if (x > .5 || bt(15)) k |= 2; if (y < -.5 || bt(12)) k |= 4; if (y > .5 || bt(13)) k |= 8;
    if (bt(2)) b |= B.lp; if (bt(3)) b |= B.hp; if (bt(0)) b |= B.lk; if (bt(1)) b |= B.hk; if (bt(5)) b |= B.sp; if (bt(4)) b |= B.th; if (bt(7) || bt(6)) b |= B.su;
    const v = k | (b << 4); if (v !== pad) { pad = v; recompute(); }
  }

  // ---- touch widgets (wired once the DOM exists)
  function bindTouch() {
    const dp = document.getElementById('dpad');
    if (dp) {
      const ids = new Set(), upd = e => {
        const r = dp.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2);
        let k = 0; if (Math.hypot(dx, dy) > .2) { if (dx < -.38) k |= 1; if (dx > .38) k |= 2; if (dy < -.38) k |= 4; if (dy > .38) k |= 8; }
        touchK = k; dp.dataset.k = k; recompute();
      };
      dp.addEventListener('pointerdown', e => { e.preventDefault(); dp.setPointerCapture(e.pointerId); ids.add(e.pointerId); upd(e); });
      dp.addEventListener('pointermove', e => { if (ids.has(e.pointerId)) upd(e); });
      const up = e => { ids.delete(e.pointerId); touchK = 0; dp.dataset.k = 0; recompute(); };
      dp.addEventListener('pointerup', up); dp.addEventListener('pointercancel', up);
    }
    document.querySelectorAll('#btns button').forEach(el => {
      const bit = B[el.dataset.b];
      const dn = e => { e.preventDefault(); el.setPointerCapture(e.pointerId); touchB |= bit; el.classList.add('on'); recompute(); };
      const up = () => { touchB &= ~bit; el.classList.remove('on'); recompute(); };
      el.addEventListener('pointerdown', dn); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    });
  }
  if (document.readyState !== 'loading') bindTouch(); else document.addEventListener('DOMContentLoaded', bindTouch);
  st.take = () => { const o = { l: st.k & 1, r: (st.k >> 1) & 1, u: (st.k >> 2) & 1, d: (st.k >> 3) & 1, b: st.b, p: st.p }; st.p = 0; return o; };
  st.pollPad = pollPad;
  st.reset = () => { st.p = 0; };
  return st;
})();
