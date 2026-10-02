# RETCON — Comic Puzzle Platformer

A comic-book puzzle platformer built for a game jam featuring the themes **COMIC + TWIST + LIGHT**.

## Concept
Every level features a narrator caption box at the top (e.g. *"The sky was [NIGHT] and the bridge was [BROKEN]. Ed [WALKED] to the door."*). Clicking bracketed words rewrites physical reality live while Ed "The Editor" runs, leaps, floats, and stomps toward the EXIT door.

## Features
- **Hero Verb Words**: Change Ed's movement style live (`WALKED`, `FLOATED`, `STOMPED`, `SPRINTED`) to interact with cracked floors, heavy switches, and environmental hazards.
- **Narrator Personality**: Typewriter caption voice with 45+ contextual dialogue lines, dynamic reactions to edits, sarcastic retorts after repeated deaths, and idle hints.
- **Fourth Wall Breaks**: Solid walkable caption boxes, pushable comic speech bubbles, and off-panel border transitions.
- **Star Rating System**: Complete levels within edit par limits to earn up to 3 stars, saved locally.
- **Night Lighting**: Ethereal radial illumination and moonlit atmosphere with glowing predator eyes.
- **100% Zero-Dependency**: Pure HTML5 Canvas 2D + Web Audio API. No external CDNs, bundlers, or npm packages required.

## How to Play
Open `index.html` directly in any modern web browser or serve via a local static server:
```bash
python -m http.server 8080
```
Then visit `http://localhost:8080/index.html`.

### Controls
- **A / D** or **Left / Right Arrows**: Move
- **Space** or **W** or **Up Arrow**: Jump (variable jump height)
- **Mouse Left Click**: Click bracketed words in the caption box to cycle story states
- **R**: Restart current level
- **M**: Mute / Unmute procedural audio
- **Esc**: Pause / Open Level Select
