// Tiny procedural sound engine (WebAudio). No asset files needed.
Game.Audio = (function () {
  let ac = null, master = null, on = true;
  function init() { if (ac) { if (ac.state === 'suspended') ac.resume(); return; } try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = .5; master.connect(ac.destination); } catch (e) { ac = null; } }
  function noise(dur, f0, f1, vol, type, q) {
    if (!ac || !on) return; const n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ac.createBufferSource(); s.buffer = b; const fl = ac.createBiquadFilter(); fl.type = type || 'bandpass'; fl.Q.value = q || 1;
    const t = ac.currentTime; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(fl); fl.connect(g); g.connect(master); s.start();
  }
  function tone(f0, f1, dur, vol, type) {
    if (!ac || !on) return; const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(master); o.start(); o.stop(t + dur);
  }
  const S = {
    p1: () => noise(.12, 1800, 700, .18), p2: () => noise(.16, 1400, 500, .24), p3: () => noise(.22, 1000, 300, .3),
    k1: () => noise(.14, 1200, 500, .22), k2: () => noise(.2, 1000, 280, .3),
    hit0: () => { noise(.1, 2500, 600, .45); tone(180, 70, .1, .3, 'square'); }, hit1: () => { noise(.14, 2000, 400, .55); tone(140, 50, .14, .4, 'square'); },
    hit2: () => { noise(.2, 1800, 250, .7); tone(110, 40, .22, .55, 'sawtooth'); }, hit3: () => { noise(.3, 1500, 150, .8); tone(90, 30, .35, .7, 'sawtooth'); },
    hit4: () => { noise(.5, 1500, 100, .9); tone(70, 25, .5, .8, 'sawtooth'); },
    block: () => { noise(.08, 4000, 2000, .3, 'highpass'); tone(520, 300, .1, .15, 'triangle'); },
    cast: () => { tone(300, 900, .25, .18, 'sawtooth'); noise(.25, 500, 3000, .15); },
    super: () => { tone(120, 900, .7, .3, 'sawtooth'); noise(.7, 300, 4000, .3); },
    land: () => tone(90, 40, .12, .25, 'sine'), jump: () => noise(.1, 600, 1500, .1), dash: () => noise(.18, 800, 300, .16),
    slam: () => { tone(80, 25, .3, .7, 'sine'); noise(.3, 800, 100, .5); }, grab: () => noise(.08, 1000, 500, .3),
    tech: () => { tone(900, 500, .12, .3, 'triangle'); noise(.08, 3000, 1500, .25, 'highpass'); },
    ko: () => { tone(200, 30, 1.0, .8, 'sawtooth'); noise(.9, 2000, 80, .9); }, round: () => { tone(440, 440, .25, .25, 'square'); }, fight: () => { tone(330, 660, .3, .3, 'square'); noise(.2, 1000, 3000, .2); },
    ui: () => tone(660, 880, .07, .15, 'square'), clash: () => { noise(.12, 3000, 800, .4); tone(700, 300, .12, .2, 'square'); }
  };
  return { init, play(n) { if (S[n]) S[n](); }, toggle() { on = !on; return on; }, get on() { return on; } };
})();
