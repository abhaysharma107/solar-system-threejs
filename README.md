# Abhay's System

An interactive 3D portfolio experience built as a personal solar system. Each planet represents a company or skill domain, and moons represent key deliverables.

## Features

- **Portfolio Solar System** — Sun (Abhay) orbited by companies and skill domains
- **Real Orbital Mechanics** — Positions computed from NASA JPL Keplerian elements
- **Social Link Planets** — GitHub, LinkedIn, and Email as orbiting planets (click to visit)
- **Textured Moons** — Satellites with unique textures for each deliverable
- **Interactive Camera** — Drag to orbit, scroll to zoom, click planets to explore
- **Time Controls** — Pause, Slow, 1×, 3×, Fast, Warp
- **Ambient Sound** — Procedural space audio with click/whoosh effects
- **Loading Screen** — Smooth loading experience with progress bar
- **Saturn's Rings** — Real texture-mapped rings with alpha transparency
- **Asteroid Belt** — 3,000 instanced rocky fragments
- **Milky Way Backdrop** — Equirectangular photo with nebula overlay

## Getting started

```bash
npm install       # Install dependencies
npm run dev       # Start dev server → http://localhost:5173
npm run build     # Production build → dist/
npm run preview   # Preview production build
```

## Controls

| Action | Input |
|--------|-------|
| Orbit | Left-click + drag |
| Zoom | Scroll wheel |
| Pan | Right-click + drag |
| Speed | UI buttons (top-left) |
| Focus planet | Click planet in scene or sidebar |
| Social links | Click GitHub/LinkedIn/Email planet |

## Architecture

```
src/
  main.js              # Entry point — scene setup, animation loop
  audio/
    soundManager.js    # Procedural Web Audio API sfx
  camera/
    cameraManager.js   # Smooth transitions, target tracking
  data/
    planets.js         # Planet data, body info, social links
  objects/
    factories.js       # 3D object factories — sun, planets, rings, stars
  physics/
    ephemeris.js       # NASA JPL orbital mechanics
  ui/
    controls.js        # UI event handlers, info panel
index.html             # HTML shell + UI overlay + loading screen
vite.config.js         # Vite configuration
```

## Inspiration

- [bruno-simon.com](https://bruno-simon.com) — Interactive 3D portfolio
- [NASA JPL Approximate Positions](https://ssd.jpl.nasa.gov/planets/approx_pos.html) — Orbital data

## Contact

- **GitHub**: [github.com/abhaysharma107](https://github.com/abhaysharma107)
- **LinkedIn**: [linkedin.com/in/abhaysharma107](https://www.linkedin.com/in/abhaysharma107/)
- **Email**: [abhay.shar107@gmail.com](mailto:abhay.shar107@gmail.com)
