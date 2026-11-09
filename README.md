# Fight Arena 🥊
Mobile-friendly 2D fighting game: **play vs bots** or **online with friends via room code**.

## Controls
Phone: ◀ ▶ ▲ move/jump • 👊 punch • 🦵 kick • ⚡ special • hold back = block.
PC: A/D/W, J punch, K kick, L special.

## How online works
Server-authoritative: phones send inputs, the Node server (`server/`) runs the match at 60Hz and broadcasts state.
Host taps **CREATE ROOM** → gets a 4-letter code → friend taps **JOIN ROOM** and enters it → both pick fighters → fight.

## Deploy on Render (phone only)
1. Upload ALL files to the root of a GitHub repo (no folders needed; Add file → Upload files).
2. Render → New → **Web Service** (NOT Static Site) → pick repo.
3. Runtime Node • Build: `npm install` • Start: `npm start` • Free plan OK. (`render.yaml` has this too.)
4. Open the URL on two phones. Free tier sleeps after inactivity: first load can take ~30–60s.

## Files (all in one folder)
- `index.html`, `style.css` – page + touch buttons
- `config.js`, `characters.js` (add fighters here), `fighter.js`, `match.js` – shared by browser and server
- `ai.js` bots • `input.js` controls • `net.js` WebSocket client • `main.js` screens
- `server.js` HTTP+WebSocket • `rooms.js` rooms + match loop
- `package.json`, `render.yaml`

## Adding a character
Add an object in `characters.js` + a `look` branch in `Fighter.drawLook()`. Server and clients pick it up automatically (both must run the same version).

## Notes
Fighters are original placeholders — only use art you have rights to.
## TODO
Sound, sprites, client-side prediction, more stages, spectators, public matchmaking.
