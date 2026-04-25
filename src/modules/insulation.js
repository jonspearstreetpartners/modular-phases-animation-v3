// Stage 7 — Batt insulation between studs + drywall planes on inside face of walls.
//
// Insulation: semi-transparent gold boxes inserted in the cavities between studs
// of the two long exterior walls (where most insulation lives in a real module).
// Drywall: thin planes spanning each wall's full length, animated with scaleX
// (anchor at one end) so they "wipe" left-to-right.

import * as THREE from 'three';
import { COLORS } from '../utils/colors.js';
import { matte, shared } from '../utils/materials.js';
import { MODULE, INCH } from '../utils/dimensions.js';

// Each batt gets its OWN material instance — Stage 7 staggers per-batt opacity
// fades, which would conflict if all batts shared one material. Final opacity
// is 1.0 (fully visible) per user request — insulation should clearly show
// between studs of the exterior walls.
const newInsulationMat = () => matte(COLORS.insulation, {
  transparent: true,
  opacity: 1.0,
  roughness: 0.95,
});
const drywallMat    = () => shared('drywall',    () => matte(COLORS.drywall));

const subfloorTop = MODULE.joistHeight + MODULE.subfloorThickness;

/**
 * Build insulation batts for the two long exterior walls of ONE module.
 * Each batt is a slim box that fits between two adjacent studs in the wall cavity.
 */
export function buildModuleInsulation() {
  const group = new THREE.Group();
  group.name = 'Insulation';

  const W = MODULE.width;
  const L = MODULE.length;
  const sW = MODULE.studWidth;
  const sD = MODULE.studDepth;
  const studSp = MODULE.studSpacing;

  // Cavity between studs runs floor-to-ceiling minus plates
  const battH = MODULE.wallHeight - MODULE.bottomPlateHeight - 2 * MODULE.topPlateHeight;
  const battY = subfloorTop + MODULE.bottomPlateHeight + battH / 2;

  // Spacing along the wall length (Z direction for long walls)
  const innerLen = L - sW;
  const intervals = Math.max(1, Math.round(innerLen / studSp));
  const actualSp  = innerLen / intervals;
  const battLen   = actualSp - sW;          // gap between adjacent studs (along Z)
  const battDepth = sD - 0.05;              // sits within the wall cavity

  for (const sign of [-1, 1]) {     // both long walls
    const wallX = sign * (W / 2 - sD / 2);
    for (let i = 0; i < intervals; i++) {
      // Center of each cavity = midway between adjacent stud centers
      const z = -innerLen / 2 + (i + 0.5) * actualSp;
      const batt = new THREE.Mesh(
        new THREE.BoxGeometry(battDepth, battH, battLen),
        newInsulationMat(),
      );
      batt.position.set(wallX, battY, z);
      batt.name = `batt_${sign > 0 ? 'east' : 'west'}_${i}`;
      group.add(batt);
    }
  }

  // SHORT walls — insulation between studs (which run along X). Cavity extents:
  //   X: between adjacent stud centers (shortBattLen)
  //   Y: full wall cavity height (battH)
  //   Z: across the wall thickness (battDepth)
  const shortLen      = W - 2 * sD;
  const shortInnerLen = shortLen - sW;
  const shortIntervals = Math.max(1, Math.round(shortInnerLen / studSp));
  const shortActualSp  = shortInnerLen / shortIntervals;
  const shortBattLen   = shortActualSp - sW;

  for (const sign of [-1, 1]) {     // both short walls
    const wallZ = sign * (L / 2 - sD / 2);
    for (let i = 0; i < shortIntervals; i++) {
      const x = -shortInnerLen / 2 + (i + 0.5) * shortActualSp;
      const batt = new THREE.Mesh(
        new THREE.BoxGeometry(shortBattLen, battH, battDepth),
        newInsulationMat(),
      );
      batt.position.set(x, battY, wallZ);
      batt.name = `batt_${sign > 0 ? 'south' : 'north'}_${i}`;
      group.add(batt);
    }
  }

  return group;
}

/**
 * Build drywall panels covering the INSIDE face of the long exterior walls + the
 * partition wall. Each panel's geometry is anchored so its origin sits at one end
 * along the panel's length axis; animating scale on that axis from 0→1 sweeps the
 * panel into existence from that end.
 *
 * Panels are mesh.userData.sweepAxis = 'z' (or 'x') so the timeline knows which
 * scale to animate.
 */
// buildModuleDrywall removed — drywall on exterior wall interior faces is now
// pre-installed in walls.js (ships with the wall in Stage 5 per user request).
// Partition drywall was also moved to walls.js earlier.
