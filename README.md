# 🟢 HeroTime — Omnitrix Simulator

An interactive, browser-based Omnitrix simulator inspired by *Ben 10*. Built with Three.js and GSAP, it renders a fully 3D watch that you click to activate, dial through a holographic alien carousel, and slam to transform — complete with synthesised sound effects, a countdown timer, and a cooldown phase.

---

## ✨ Features

- **3D Omnitrix watch** — Fully modelled in Three.js with a rotating dial, faceplate, hourglass symbol, glowing core, and watch band rivets
- **4-phase state machine** — `idle → active → transformed → cooldown`, each with distinct visuals, UI, and audio
- **Cover-flow alien selector** — 10 aliens displayed in a 3D perspective carousel; supports click, arrow keys, scroll wheel, and touch swipe
- **Holographic HUD** — Beam, cone projector, scan line, alien name, species, and power displayed above the watch during selection
- **Procedural Web Audio** — All sounds synthesised in real time using the Web Audio API: activation hum, dial click, slam explosion, countdown beeps, and timeout tone
- **10-second countdown** — SVG arc timer that turns red and accelerates beeping in the final 3 seconds
- **Alien background** — Ghost image of the selected alien fades in on transformation and turns red on timeout
- **Particle field** — 3,000 green ambient particles that shift red during recharge
- **Shockwave burst** — 100 particle points explode outward from the watch on slam
- **Camera follow** — Watch camera subtly tracks mouse position
- **GSAP animations** — Spring-elastic watch intro, faceplate lift/slam, elastic body switch transitions, hologram fade, screen shake
- **Responsive** — Adapts layout and coverflow card size for mobile and narrow screens

---

## 🧬 Alien Roster

| # | Name | Species | Power |
|---|---|---|---|
| 1 | Heatblast | Pyronite | Pyrokinesis |
| 2 | Four Arms | Tetramand | Super Strength |
| 3 | XLR8 | Kineceleran | Hyper Speed |
| 4 | Diamondhead | Petrosapien | Crystal Generation |
| 5 | Upgrade | Galvanic Mechamorph | Tech Possession |
| 6 | Ghostfreak | Ectonurite | Intangibility |
| 7 | Ripjaws | Piscciss Volann | Aquatic Combat |
| 8 | Stinkfly | Lepidopterran | Flight / Toxin |
| 9 | Wildmutt | Vulpimancer | Enhanced Senses |
| 10 | Grey Matter | Galvan | Super Intelligence |

---

## 🕹️ Controls

### Mouse / Touch

| Action | Effect |
|---|---|
| Click watch face / core | Activate Omnitrix (idle → active) |
| Click arrow buttons | Cycle aliens left / right |
| Click a carousel card | Jump to that alien |
| Scroll wheel | Dial through aliens (active phase only) |
| Touch swipe left / right | Cycle aliens (active phase only) |
| Click SLAM button | Transform into selected alien |

### Keyboard

| Key | Action |
|---|---|
| `←` or `A` | Dial left |
| `→` or `D` | Dial right |
| `Enter` or `Space` | Activate (idle) or Slam (active) |

---

## 📁 File Structure

```
├── index.html        # HTML shell — canvas, overlays, hologram, UI panels
├── style.css         # All styles — 4 CSS variables, all phases, responsive
├── script.js         # Everything else — 3D scene, audio, state machine, input
└── image/
    ├── 1.png         # Heatblast
    ├── 2.png         # Four Arms
    ├── ...
    └── 10.png        # Grey Matter
```

> If alien images are missing, each card falls back to showing the alien's name and expected image path in green text.

---

## 🚀 Getting Started

No build step required. Serve the folder with any static file server (required because images load via `fetch`-style paths):

```bash
npx serve .
# or
python -m http.server 8080
```

Then open `http://localhost:8080`.

> Opening `index.html` directly via `file://` may block image loading in some browsers due to CORS restrictions on local files.

---

## 🛠️ How It Works

### State Machine

The app runs through four phases managed by a `phase` variable:

```
idle ──(click watch)──► active ──(slam)──► transformed ──(10s)──► cooldown ──(3s)──► idle
```

- **Idle** — watch pulses gently, faceplate is closed
- **Active** — faceplate lifts, hologram appears, coverflow carousel is shown
- **Transformed** — faceplate slams down, alien background appears, countdown runs
- **Cooldown** — background turns red, watch goes red, 3-second recharge before reset

### Web Audio Synthesis

All audio is generated in real time — no audio files:

| Sound | Method |
|---|---|
| Background hum | LFO-modulated sine oscillator at 55 Hz |
| Activate | Sawtooth sweep + white noise burst + sine ring |
| Dial click | High sine ping + short noise tick |
| Slam | Low sine thump + noise roar + rising sawtooth |
| Countdown beep | Square wave at 1200/2000 Hz |
| Timeout / recharge | Falling sawtooth + dual sine descent + noise |

### 3D Watch (Three.js)

The watch is assembled from primitive geometries:

- **Band** — 4 layered `BoxGeometry` slabs per side with rivet cylinders
- **Body** — `CylinderGeometry` with torus edge rings
- **Dial ring** — `TorusGeometry` with 12 notch boxes and 10 glowing alien-select dots
- **Faceplate** — Flat box with bevelled top edge and corner bracket details
- **Hourglass symbol** — Two `ExtrudeGeometry` triangular shapes
- **Core** — `CylinderGeometry` with emissive green material + `PointLight`

### Coverflow Carousel

Cards are positioned with `translate3d` and `rotateY` using offsets from the active index. GSAP tweens every property on dial change. Cards beyond index ±2 are faded to ~12% opacity and made non-interactive.

---

## 📦 Dependencies

| Library | Version | Purpose |
|---|---|---|
| [Three.js](https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js) | r128 | 3D watch rendering |
| [GSAP](https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js) | 3.12.5 | All animation and transitions |
| [Google Fonts](https://fonts.google.com) | — | Orbitron (UI), Rajdhani (subtitles) |

All loaded via CDN — no `npm install` needed.

---

## 🌐 Browser Support

Requires WebGL and Web Audio API support. Works in all modern browsers (Chrome, Firefox, Safari, Edge). JavaScript must be enabled.
