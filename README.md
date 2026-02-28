# Three.js Solar System

An interactive 3D solar system visualization built with Three.js and Vite.

## Features

- **All Planets** — Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune + Pluto
- **Earth's Moon** — Orbiting Earth with realistic period
- **Saturn's Rings** — Procedurally generated with band patterns and Cassini-like gaps
- **Asteroid Belt** — 1,500 particles between Mars and Jupiter
- **Star Field** — 2,000 background stars with color variation
- **Orbital Mechanics** — Keplerian orbital periods (artistically scaled)
- **Interactive Camera** — OrbitControls (drag to orbit, scroll to zoom, right-drag to pan)
- **Speed Controls** — Pause, ¼×, 1×, 3×, 10× simulation speed
- **Planet Focus** — Click any planet name to fly the camera there
- **Glowing Sun** — Additive-blending sprite with pulsing glow
- **Planet Labels** — Canvas-texture sprites rendered in 3D space
- **Dashed Orbit Lines** — Color-coded for each planet

## Sources & Inspiration

- [Official Three.js scenegraph-sun-earth-moon example](https://threejs.org/manual/#en/scenegraph)
- [sanderblue/solar-system-threejs](https://github.com/sanderblue/solar-system-threejs) (398★)
- [NASA Solar System Data](https://nssdc.gsfc.nasa.gov/planetary/factsheet/)

> **Note:** NASA's "Eyes on the Solar System" (eyes.nasa.gov) is proprietary, not open-source. This is an open-source recreation using real NASA data.

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
| Focus planet | Click planet name (top-left) |

## Architecture

```
main.js           # Complete solar system (~450 lines)
index.html        # HTML shell + UI overlay
vite.config.js    # Vite configuration
package.json      # Dependencies: three, vite
```

## Tech stack

- [Three.js](https://threejs.org/) — 3D rendering
- [Vite](https://vitejs.dev/) — build tool & dev server
