// Tiny procedural sound engine (WebAudio). No asset files needed.
Game.Audio = (function () {
  let ac = null, master = null, mus = null, on = true, vary = 1;
  try { on = localStorage.getItem('fa_mute') !== '1'; } catch (e) {}
  function init() { if (ac) { if (ac.state === 'suspended') ac.resume(); return; } try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = on ? .5 : 0; master.connect(ac.destination); mus = ac.createGain(); mus.gain.value = .5; mus.connect(master); } catch (e) { ac = null; } }
  function noise(dur, f0, f1, vol, type, q) {
    if (!ac || !on) return; f0 *= vary; f1 *= vary; const n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ac.createBufferSource(); s.buffer = b; const fl = ac.createBiquadFilter(); fl.type = type || 'bandpass'; fl.Q.value = q || 1;
    const t = ac.currentTime; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(fl); fl.connect(g); g.connect(master); s.start();
  }
  function tone(f0, f1, dur, vol, type) {
    if (!ac || !on) return; f0 *= vary; f1 *= vary; const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.type = type || 'sine';
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
    ready: () => { tone(880, 1320, .12, .22, 'triangle'); setTimeout(() => tone(1320, 1760, .16, .2, 'triangle'), 90); },
    combo: n => tone(420 + Math.min(n, 14) * 55, 560 + Math.min(n, 14) * 55, .09, .14, 'square'),
    whoosh: () => noise(.22, 400, 2400, .14, 'bandpass', 2),
    win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, f, .22, .22, 'square'), i * 120)),
    ui: () => tone(660, 880, .07, .15, 'square'), clash: () => { noise(.12, 3000, 800, .4); tone(700, 300, .12, .2, 'square'); }
  };
  // ------------------------------------------------------------------ procedural fight music (step sequencer, no asset files)
  const SONGS = [
    { bpm: 118, root: 110, sc: [0, 3, 5, 7, 10], bass: [0, -1, 0, -1, 0, 2, 0, -1, 0, -1, 0, 3, 2, -1, 1, -1], arp: [0, 2, 4, 2, 3, 2, 4, 2], lead: 'triangle' },   // dojo: minor pentatonic, taiko feel
    { bpm: 132, root: 98, sc: [0, 2, 3, 7, 8], bass: [0, 0, -1, 0, 0, -1, 2, -1, 0, 0, -1, 0, 3, -1, 2, -1], arp: [0, 1, 2, 4, 3, 2, 1, 4], lead: 'sawtooth' },     // neon: synthwave
    { bpm: 104, root: 123, sc: [0, 2, 4, 7, 9], bass: [0, -1, -1, 0, -1, -1, 2, -1, 0, -1, -1, 0, -1, 3, -1, -1], arp: [0, 2, 1, 3, 2, 4, 3, 2], lead: 'triangle' }  // temple: slow + heavy
  ];
  let noiseBuf = null, mTimer = 0, mStep = 0, mNext = 0, mSong = null, mIntensity = 0, duck = 1;
  const nb = () => { if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return noiseBuf; };
  function mTone(t, f, dur, vol, type, lp) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); let n = g;
    if (lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); fl.connect(g); } else o.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur); g.connect(mus); o.start(t); o.stop(t + dur + .02);
  }
  function mKick(t) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .14); g.gain.setValueAtTime(.55, t); g.gain.exponentialRampToValueAtTime(.001, t + .2); o.connect(g); g.connect(mus); o.start(t); o.stop(t + .22); }
  function mNoise(t, dur, hz, vol, type) { const s = ac.createBufferSource(); s.buffer = nb(); const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = hz; const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(fl); fl.connect(g); g.connect(mus); s.start(t, Math.random() * .5, dur + .02); }
  function schedule() {
    if (!ac || !mSong) return; const S = mSong, sd = 60 / S.bpm / 4;
    while (mNext < ac.currentTime + .25) {
      const i = mStep % 16, t = mNext, hz = k => S.root * Math.pow(2, k / 12), deg = d => S.sc[((d % 5) + 5) % 5] + 12 * Math.floor(d / 5);
      if (i % 4 === 0) mKick(t); else if (i === 10 && mIntensity) mKick(t);
      if (i === 4 || i === 12) mNoise(t, .14, 1800, .22, 'bandpass');
      if (i % 2 === 0) mNoise(t, .04, 7000, i % 4 === 2 ? .1 : .05, 'highpass');
      const b = S.bass[i]; if (b >= 0) mTone(t, hz(deg(b) - 12), sd * 1.8, .22, 'square', 420);
      if (mIntensity) { const a = S.arp[i % 8]; mTone(t, hz(deg(a) + 12), sd * .9, .07, S.lead, 2400); }
      else if (i % 8 === 6) mTone(t, hz(deg(S.arp[(i >> 1) % 8]) + 12), sd * 3, .05, S.lead, 1800);
      mNext += sd; mStep++;
    }
  }
  function music(stage) {
    if (!ac) return; musicStop(); mSong = SONGS[(stage || 0) % SONGS.length]; mStep = 0; mNext = ac.currentTime + .1; mIntensity = 0; mus.gain.setTargetAtTime(.5 * duck, ac.currentTime, .05);
    mTimer = setInterval(schedule, 50);
  }
  function musicStop() { if (mTimer) clearInterval(mTimer); mTimer = 0; mSong = null; }
  function setMute(v) { on = !v; if (master) master.gain.setTargetAtTime(on ? .5 : 0, ac.currentTime, .02); try { localStorage.setItem('fa_mute', on ? '0' : '1'); } catch (e) {} return on; }
  return { init, play(n, a) { vary = .94 + Math.random() * .12; if (S[n]) S[n](a); vary = 1; }, music, musicStop, intensity(v) { mIntensity = v ? 1 : 0; }, duck(v) { duck = v ? .25 : 1; if (mus) mus.gain.setTargetAtTime(.5 * duck, ac.currentTime, .15); }, toggle() { return setMute(on); }, get on() { return on; }, get musicOn() { return !!mSong; } };
})();
