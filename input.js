// Touch buttons + keyboard -> Game.input (player 1)
Game.input = { left: false, right: false, up: false, punch: false, kick: false, special: false };
(function () {
  const inp = Game.input, EDGE = ['punch', 'kick', 'special'];
  document.querySelectorAll('#controls button').forEach(b => {
    const k = b.dataset.key;
    const down = e => { e.preventDefault(); inp[k] = true; b.classList.add('on'); };
    const up = e => { e.preventDefault(); if (!EDGE.includes(k)) inp[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', down);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, up));
    b.addEventListener('contextmenu', e => e.preventDefault());
  });
  const map = { a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right', w: 'up', arrowup: 'up', j: 'punch', k: 'kick', l: 'special' };
  addEventListener('keydown', e => { const k = map[e.key.toLowerCase()]; if (k && !e.repeat) inp[k] = true; });
  addEventListener('keyup', e => { const k = map[e.key.toLowerCase()]; if (k && !EDGE.includes(k)) inp[k] = false; });
  Game.clearEdges = () => EDGE.forEach(k => inp[k] = false);
})();
