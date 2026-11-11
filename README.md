# Fight Arena – Tekken-style 2D fighter (phone + PC, online rooms)

Server-authoritative 60 Hz fighting game. Upload ALL files in this folder (flat, no sub-folders) to your GitHub repo and redeploy on Render.

## What's new
- **Hit levels** (high / mid / low): crouch under highs, crouch-block lows, mids beat crouch-block (overhead, launcher).
- **String combos** (LP,LP,HP …), **launchers + juggles**, counter-hits, combo damage scaling, RAGE mode (<25% HP).
- **Throws** that beat blocking, with a **throw break** (press GRAB in time).
- **Motion inputs** (↓↘→ + P fireball, →↓↘ + P uppercut, ↓↙← + K) with input buffer, **double-tap dash / back-dash**.
  On phone use the **SP** button: SP = projectile, ↓+SP = uppercut, →+SP = rush move.
- **SUPER meter** + cinematic supers, hitstop, screen shake, hit sparks, slow-mo K.O.
- **7 fighters, each with a different fighting style, 5 specials + a super:**
  Thunder Lord (all-rounder), Iron Knight (power / artillery), Kage (speed, mix-ups), Brutus (grappler),
  **Oggy** (trickster: arcing bombs, belly flop, drunken roll), **Jack** (saber swordsman: long reach, wave slash, pistol shot, whirlwind),
  **Steve** (Muay Thai: knees, spin back kick, axe kick, air slash).
- Specials on keyboard/pad: ↓↘→+P, →↓↘+P, ↓↙←+K, ↓↙←+P, ↓↘→+K. On touch: SP, ↓+SP, →+SP, ←+SP, ↘+SP.
- More strings (LK,LK,HK / LP,LP,HP / →+LK knee for Steve) and per-fighter idle stance + animation style.
- Fully rigged procedural **skeletal sprites** (IK limbs, capes/scarves, faces), 3 animated stages, dynamic zoom camera, sound effects.
- Smarter bot with 3 difficulties, **Training mode** (dummy: stand / block / crouch-block).

## Controls
| | Keyboard | Touch |
|---|---|---|
| Move / crouch / jump | WASD or arrows | d-pad (8-way) |
| LP / HP / LK / HK | J / U / K / I | LP HP LK HK |
| Special | L | SP |
| Grab | H (or LP+LK) | GRAB |
| Super | ; or Space | SUPER |
Gamepad is supported too.

Key moves (all fighters): ↘+HP launcher · →+HP overhead · →+HK long kick · ↓+HK sweep · ↓+LK low.

## Files
`config.js` constants · `characters.js` ALL move/frame data (edit here to balance or add fighters) · `fighter.js` combat logic ·
`match.js` rounds/hit resolution · `sprites.js` character art · `world.js` stages + effects · `audio.js` sounds · `ai.js` bot ·
`input.js` controls · `main.js` UI/HUD · `rooms.js`/`server.js`/`net.js` online.

## Run locally
`npm install` then `npm start`, open http://localhost:3000 (or whatever PORT prints).
Only use art/audio you own the rights to if you replace the procedural ones.
