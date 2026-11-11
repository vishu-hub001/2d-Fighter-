# Fight Arena – Tekken-style 2D fighter (phone + PC, online rooms)

Server-authoritative 60 Hz fighting game. Upload ALL files in this folder (flat, no sub-folders) to your GitHub repo and redeploy on Render.

## What's new
- **Hit levels** (high / mid / low): crouch under highs, crouch-block lows, mids beat crouch-block (overhead, launcher).
- **String combos** (LP,LP,HP …), **launchers + juggles**, counter-hits, combo damage scaling, RAGE mode (<25% HP).
- **Throws** that beat blocking, with a **throw break** (press GRAB in time).
- **Motion inputs** (↓↘→ + P fireball, →↓↘ + P uppercut, ↓↙← + K) with input buffer, **double-tap dash / back-dash**.
  On phone use the **SP** button: SP = projectile, ↓+SP = uppercut, →+SP = rush move.
- **SUPER meter** + cinematic supers, hitstop, screen shake, hit sparks, slow-mo K.O.
- **9 fighters, each with a different fighting style, 5 specials + a super:**
  Thunder Lord (all-rounder), Iron Knight (power / artillery), Kage (speed, mix-ups), Brutus (grappler),
  **Oggy** (trickster: arcing bombs, belly flop, drunken roll), **Jack** (saber swordsman: long reach, wave slash, pistol shot, whirlwind),
  **Steve** (Muay Thai: knees, spin back kick, axe kick, air slash),
  **Blaze** (fire monk: fireball, low Ground Flame, Dragon Flame uppercut, Blazing Rush, Inferno Kicks, super PHOENIX FURY),
  **Frost** (ice mage: fast Ice Shard, arcing Snow Bomb, Glacier Rise, Ice Slide (low), Crystal Spin, super ABSOLUTE ZERO).
- Specials on keyboard/pad: ↓↘→+P, →↓↘+P, ↓↙←+K, ↓↙←+P, ↓↘→+K. On touch: SP, ↓+SP, →+SP, ←+SP, ↘+SP.
- More strings (LK,LK,HK / LP,LP,HP / →+LK knee for Steve) and per-fighter idle stance + animation style.
- Fully rigged procedural **skeletal sprites** (IK limbs, capes/scarves, faces), 3 animated stages, dynamic zoom camera, sound effects.
- Smarter bot with 3 difficulties, **Training mode** (dummy: stand / block / crouch-block).

## Juice & polish pass
- **Sprites:** cel-shaded gradients on limbs/torso, blinking eyes, squash & stretch (jump / land / hit), pulsing glow when SUPER is ready, afterimages on rush moves and supers, longer attack trails.
- **Hits:** floating damage numbers, comic words (POW! WHAM! SMASH!), hit-sparks tinted by the attacker's colour, camera kick toward the hit, ground cracks on slams/KO, KO speed-line burst.
- **Combo counter** pops on every hit and shows rank words (NICE / GREAT / AWESOME / UNREAL).
- **Supers:** cut-in now shows the fighter's portrait; camera punches in.
- **Ambient:** Blaze sheds embers, Frost sheds snow; low-HP red heartbeat vignette; VS card in round 1; confetti when you win.
- **Audio:** procedural fight music (different groove per stage, intensifies at low HP / long combos / last 10s), pitch-varied hit sounds, super-ready ping, combo ticks, win jingle. **Mute with the speaker icon or the M key** (remembered).

## Controls
| | Keyboard | Touch |
|---|---|---|
| Move / crouch / jump | WASD or arrows | d-pad (8-way) |
| LP / HP / LK / HK | J / U / K / I | LP HP LK HK |
| Special | L | SP |
| Grab | H (or LP+LK) | GRAB |
| Super | ; or Space | SUPER |
| Mute | M | speaker icon |
Gamepad is supported too.

Key moves (all fighters): ↘+HP launcher · →+HP overhead · →+HK long kick · ↓+HK sweep · ↓+LK low.

## Files
`config.js` constants · `characters.js` ALL move/frame data (edit here to balance or add fighters; `aura: 'fire'|'snow'` adds ambient particles) · `fighter.js` combat logic ·
`match.js` rounds/hit resolution · `sprites.js` character art · `world.js` stages + effects · `audio.js` sounds · `ai.js` bot ·
`input.js` controls · `main.js` UI/HUD · `rooms.js`/`server.js`/`net.js` online.

## Run locally
`npm install` then `npm start`, open http://localhost:3000 (or whatever PORT prints).
Only use art/audio you own the rights to if you replace the procedural ones.
