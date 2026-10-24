# ORRERY — Solar System Playground (Prototype 01)

This is an isolated, experimental 3D solar-system prototype for the Project Henry repository. It is intentionally **not integrated into the production site**.

## Play locally

1. Open `prototypes/solar-system/index.html` in a modern browser while connected to the internet.
2. The prototype loads Three.js and OrbitControls from jsDelivr, so those scripts require an internet connection.
3. If your browser blocks local-file scripts, run a tiny local server from the repository root:
   - Windows with Python installed: `py -m http.server 8000`
   - Then visit `http://localhost:8000/prototypes/solar-system/`

## Controls

- Drag to orbit the camera; scroll or pinch to zoom.
- Tap/click a planet or use the planet selector to inspect it.
- Pause/play orbital motion, change simulation speed, toggle labels and orbit guides, reset the camera, or choose a surprise destination.
- The layout adapts to desktop and phone screens.

## Prototype status and limitations

- This is a first playable visual prototype, not a scientifically precise orbital simulator.
- Planet sizes and orbital distances are compressed for visibility; the on-screen orbits are illustrative.
- Planet surfaces are procedurally generated stylized textures. They are not yet high-resolution NASA imagery or physically simulated solar plasma.
- Planet/moon counts and fact cards should be checked against current authoritative sources before public release.
- Performance depends on the device and browser; test on low-powered phones before adding more effects.

## Development rules

- Work on `prototype/solar-system-playground`.
- Keep `main` and the live Project Henry site untouched until the prototype is reviewed and explicitly approved.
- Do not configure production deployment from this prototype branch.
- Next iterations: improve the Sun shader/corona, use properly licensed high-resolution planetary textures, add moons, improve camera transitions and accessibility, then optimize mobile performance.
