// Floor system — carrier beams (steel), rim joists, floor joists, subfloor panels.
// All builders return groups anchored at module local origin (X-center, Y at floor frame
// bottom = 0, Z-center). Caller positions the module via group.position.set(centerX, 0, 0).

import * as THREE from 'three';
import { COLORS } from '../utils/colors.js';
import { matte, shared } from '../utils/materials.js';
import { MODULE } from '../utils/dimensions.js';

const framingMat = () => shared('framing', () => matte(COLORS.framing));
const subfloorMat = () => shared('subfloor', () => matte(COLORS.subfloor));
// Steel beams: darker, slightly more reflective than wood
const steelMat = () => shared('steel', () => matte('#5A5F66', { roughness: 0.55, metalness: 0.5 }));

/**
 * Floor FRAME for one module: carrier beams + rim joists + floor joists.
 * Joists run the SHORT direction (X), spaced at 16" O.C. along Z.
 * Beams run the LONG direction (Z), 2 per module, inset from outer walls.
 *
 * Coordinate convention:
 *   - Module local origin at the geometric center of the floor (X-center, Z-center).
 *   - Floor joist tops are at y = MODULE.joistHeight (so the floor frame's top sits on y).
 *   - Carrier beams sit BELOW the joists (negative Y), as they're temporary transport.
 */
export function buildModuleFloorFrame() {
  const group = new THREE.Group();
  group.name = 'FloorFrame';

  const W = MODULE.width;
  const L = MODULE.length;
  const cbW = MODULE.carrierBeamWidth;
  const cbH = MODULE.carrierBeamHeight;
  const rjW = MODULE.rimJoistWidth;
  const rjH = MODULE.rimJoistHeight;
  const jW  = MODULE.joistWidth;
  const jH  = MODULE.joistHeight;
  const jSp = MODULE.joistSpacing;

  // --- Carrier beams (2, parallel to length axis, inset from outer walls) ---
  const beamCenterY = -cbH / 2; // sits with its top just below y=0
  for (const sign of [-1, 1]) {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(cbW, cbH, L + 2),  // overhang at both ends, transport-style
      steelMat(),
    );
    beam.position.set(sign * (W / 2 - MODULE.carrierBeamInset), beamCenterY, 0);
    beam.castShadow = true;
    beam.receiveShadow = true;
    beam.name = `carrier_${sign > 0 ? 'east' : 'west'}`;
    group.add(beam);
  }

  // --- Rim joists (perimeter rectangle, top at y = jH) ---
  const rimY = jH / 2;

  // Long sides (parallel to Z, at +/- W/2)
  for (const sign of [-1, 1]) {
    const long = new THREE.Mesh(
      new THREE.BoxGeometry(rjW, rjH, L),
      framingMat(),
    );
    long.position.set(sign * (W / 2 - rjW / 2), rimY, 0);
    long.castShadow = true;
    long.receiveShadow = true;
    long.name = `rim_${sign > 0 ? 'east' : 'west'}`;
    group.add(long);
  }

  // Short sides (parallel to X, at +/- L/2; tucked between the long rim joists)
  for (const sign of [-1, 1]) {
    const short = new THREE.Mesh(
      new THREE.BoxGeometry(W - 2 * rjW, rjH, rjW),
      framingMat(),
    );
    short.position.set(0, rimY, sign * (L / 2 - rjW / 2));
    short.castShadow = true;
    short.receiveShadow = true;
    short.name = `rim_${sign > 0 ? 'south' : 'north'}`;
    group.add(short);
  }

  // --- Floor joists (run in X, spaced at 16" O.C. along Z) ---
  const joistLen = W - 2 * rjW;     // between the two long rim joists
  const innerL  = L - 2 * rjW;      // available Z length between short rim joists
  const intervals = Math.round(innerL / jSp);
  const actualSp  = innerL / intervals;
  for (let i = 0; i <= intervals; i++) {
    const z = -innerL / 2 + i * actualSp;
    const joist = new THREE.Mesh(
      new THREE.BoxGeometry(joistLen, jH, jW),
      framingMat(),
    );
    joist.position.set(0, jH / 2, z);
    joist.castShadow = true;
    joist.receiveShadow = true;
    joist.name = `joist_${i}`;
    group.add(joist);
  }

  return group;
}

/**
 * Subfloor — 4'x8' OSB panels covering the floor frame.
 * Panels sit just above the joists (y = jH + thickness/2).
 * Layout: tile across X×Z, clipping panel sizes at module edges so coverage is exact.
 */
export function buildModuleSubfloor() {
  const group = new THREE.Group();
  group.name = 'Subfloor';

  const W = MODULE.width;
  const L = MODULE.length;
  const t = MODULE.subfloorThickness;
  const yTop = MODULE.joistHeight + t / 2;

  const panelW = 4;   // OSB panel: 4' across short axis
  const panelL = 8;   // OSB panel: 8' along long axis

  const cols = Math.ceil(W / panelW);
  const rows = Math.ceil(L / panelL);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Panel bounds in module-local space
      const x0 = -W / 2 + c * panelW;
      const z0 = -L / 2 + r * panelL;
      const x1 = Math.min(x0 + panelW, W / 2);
      const z1 = Math.min(z0 + panelL, L / 2);
      const w  = x1 - x0;
      const l  = z1 - z0;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;

      // Slight inset (1%) reads as panel seams under iso lighting
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.99, t, l * 0.99),
        subfloorMat(),
      );
      panel.position.set(cx, yTop, cz);
      panel.castShadow = true;
      panel.receiveShadow = true;
      panel.name = `subfloor_${r}_${c}`;
      group.add(panel);
    }
  }

  return group;
}
