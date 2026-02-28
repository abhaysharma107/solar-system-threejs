# Abhay's System

An interactive 3D portfolio built as a solar system — companies as inner planets, skills as outer planets, and moons as key deliverables.

## Overview

My professional universe, visualized. The Sun represents me; each planet is a company I've worked at or a skill domain I've explored. Moons orbit their parent planets as key deliverables and technologies. Real NASA Keplerian orbital elements drive the motion.

## Features

- **Portfolio as a Solar System** — Companies, skills, and achievements mapped to celestial bodies
- **Real Orbital Mechanics** — NASA JPL Keplerian elements for authentic planet positions
- **Interactive Camera** — Orbit, zoom, and pan to explore the system
- **Speed Controls** — Pause, Gentle, Normal, Brisk, Fast simulation speeds
- **Click to Explore** — Click any body to see detailed info panels
- **Social Beacons** — GitHub, LinkedIn, and Email floating near the Sun
- **Loading Screen** — Smooth progress bar while assets load
- **Saturn's Rings, Asteroid Belt, Milky Way** — Full atmospheric scene

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
| Focus body | Click planet name or body (top-left) |

## Architecture

```
src/
  main.js              # Entry point — scene, animation loop
  camera/              # Camera transitions & tracking
  data/                # Planet & portfolio data
  objects/             # 3D factories — planets, stars, rings, beacons
  physics/             # NASA JPL ephemeris calculations
  ui/                  # Speed controls, info panel, sim clock
index.html             # HTML shell + UI overlay + loading screen
```

## Inspiration

- [bruno-simon.com](https://bruno-simon.com/) — interactive 3D portfolio
- [NASA Solar System Data](https://nssdc.gsfc.nasa.gov/planetary/factsheet/)
