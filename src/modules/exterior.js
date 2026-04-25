// Stage 8 — Exterior envelope: housewrap, windows, siding, roofing.
//
// Layered convention (outward from studs): housewrap → siding → window frames+glass.
// All exterior elements are mesh.userData.sweepAxis-tagged or mesh.userData.fromY-tagged
// so the timeline can drive the layered reveal.

import * as THREE from 'three';
import { COLORS } from '../utils/colors.js';
import { matte, shared, glass, shingle } from '../utils/materials.js';
import { MODULE, INCH } from '../utils/dimensions.js';

const housewrapMat = () => shared('housewrap', () => matte(COLORS.housewrap));
const sidingMat    = () => shared('siding',    () => matte(COLORS.siding));
const frameMat     = () => shared('windowFrame', () => matte(COLORS.windowFrame));
const glassMat     = () => shared('glass',     () => glass());
const roofMat      = () => shared('shingle',   () => shingle());
const sheathingMat = () => shared('sheathing', () => matte('#A88E66', { roughness: 0.9 }));   // exterior OSB/plywood

const subfloorTop = MODULE.joistHeight + MODULE.subfloorThickness;

// Layering on the outboard side of the studs, inner→outer:
//   studs  →  plywood sheathing  →  housewrap  →  siding
const PLY_THICK    = 0.04;
const HW_THICK     = 0.04;
const SIDING_THICK = 0.08;
const SIDING_COURSE = 8 * INCH;
// Cumulative offsets (distance from the stud's outboard face)
const PLY_CTR_OFF    = PLY_THICK / 2;
const HW_CTR_OFF     = PLY_THICK + HW_THICK / 2;
const SIDING_CTR_OFF = PLY_THICK + HW_THICK + SIDING_THICK / 2;
const TOTAL_OFF      = PLY_THICK + HW_THICK + SIDING_THICK;

/**
 * Build all exterior layers for ONE module.
 * Returns a Group with named sub-groups: housewrap, siding, windows, roofing.
 */
export function buildModuleExterior({ side = 'A' } = {}) {
  const group = new THREE.Group();
  group.name = 'Exterior';

  const W = MODULE.width;
  const L = MODULE.length;
  const sD = MODULE.studDepth;
  const wH = MODULE.wallHeight;
  const panelH = wH - MODULE.bottomPlateHeight - 2 * MODULE.topPlateHeight;
  const wallY = subfloorTop + wH / 2;

  // v3: NO marriage wall — the home is a single module, so siding/sheathing/
  // housewrap must wrap ALL FOUR exterior walls. Iterating both long walls
  // (-1 and +1) instead of a single outerLongSign that left one side bare.
  const outerLongSign = -1;   // (retained as window-placement reference; windows
                              // still go on a single front-facing wall)

  // --- PLYWOOD SHEATHING — covers the studs from outside ---
  const sheathing = new THREE.Group();
  sheathing.name = 'sheathing';
  for (const longSign of [-1, +1]) {
    const xOuter = longSign * (W / 2 + PLY_CTR_OFF);
    const g = new THREE.BoxGeometry(PLY_THICK, wH, L);
    g.translate(0, 0, L / 2);
    const ply = new THREE.Mesh(g, sheathingMat());
    ply.position.set(xOuter, subfloorTop + wH / 2, -L / 2);
    ply.userData.sweepAxis = 'z';
    ply.name = `ply_long_${longSign > 0 ? 'east' : 'west'}`;
    sheathing.add(ply);
  }
  for (const sign of [-1, 1]) {
    const zOuter = sign * (L / 2 + PLY_CTR_OFF);
    const sLen = W;
    const g = new THREE.BoxGeometry(sLen, wH, PLY_THICK);
    g.translate(sLen / 2, 0, 0);
    const ply = new THREE.Mesh(g, sheathingMat());
    ply.position.set(-sLen / 2, subfloorTop + wH / 2, zOuter);
    ply.userData.sweepAxis = 'x';
    ply.name = `ply_short_${sign > 0 ? 'south' : 'north'}`;
    sheathing.add(ply);
  }
  group.add(sheathing);

  // --- HOUSEWRAP — thin plane outside the plywood (BOTH long walls + ends) ---
  const housewrap = new THREE.Group();
  housewrap.name = 'housewrap';
  for (const longSign of [-1, +1]) {
    const xOuter = longSign * (W / 2 + HW_CTR_OFF);
    const g = new THREE.BoxGeometry(HW_THICK, wH, L);
    g.translate(0, 0, L / 2);
    const hw = new THREE.Mesh(g, housewrapMat());
    hw.position.set(xOuter, subfloorTop + wH / 2, -L / 2);
    hw.userData.sweepAxis = 'z';
    hw.name = `hw_long_${longSign > 0 ? 'east' : 'west'}`;
    housewrap.add(hw);
  }
  for (const sign of [-1, 1]) {
    const zOuter = sign * (L / 2 + HW_CTR_OFF);
    const sLen = W;
    const g = new THREE.BoxGeometry(sLen, wH, HW_THICK);
    g.translate(sLen / 2, 0, 0);
    const hw = new THREE.Mesh(g, housewrapMat());
    hw.position.set(-sLen / 2, subfloorTop + wH / 2, zOuter);
    hw.userData.sweepAxis = 'x';
    hw.name = `hw_short_${sign > 0 ? 'south' : 'north'}`;
    housewrap.add(hw);
  }
  group.add(housewrap);

  // --- WINDOWS — 3 windows on the outer long wall ---
  const windowsGroup = new THREE.Group();
  windowsGroup.name = 'windows';

  const windowZs = [-L * 0.32, 0, L * 0.32];
  const winW = 3.0;
  const winH = 4.0;
  const winY = subfloorTop + 4.0; // sill ~4 ft above floor
  const winXOut = outerLongSign * (W / 2 + TOTAL_OFF + 0.02);
  for (let i = 0; i < windowZs.length; i++) {
    const wz = windowZs[i];

    const winGroup = new THREE.Group();
    winGroup.name = `window_${i}`;

    // Frame (slightly larger box, hollow visual)
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, winH, winW),
      frameMat(),
    );
    frame.position.set(0, 0, 0);
    frame.castShadow = true;
    winGroup.add(frame);

    // Glass (thinner box inset)
    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, winH * 0.85, winW * 0.85),
      glassMat(),
    );
    pane.position.set(outerLongSign * 0.04, 0, 0);
    winGroup.add(pane);

    winGroup.position.set(winXOut, winY, wz);
    windowsGroup.add(winGroup);
  }
  group.add(windowsGroup);

  // --- SIDING — horizontal courses on BOTH long walls + both short walls ---
  const sidingGroup = new THREE.Group();
  sidingGroup.name = 'siding';

  const courseCount = Math.max(1, Math.round(wH / SIDING_COURSE));
  const courseH = wH / courseCount;

  // Both long walls: stack courses bottom-to-top
  for (const longSign of [-1, +1]) {
    const xS = longSign * (W / 2 + SIDING_CTR_OFF);
    for (let c = 0; c < courseCount; c++) {
      const yC = subfloorTop + (c + 0.5) * courseH;
      const course = new THREE.Mesh(
        new THREE.BoxGeometry(SIDING_THICK, courseH * 0.97, L),
        sidingMat(),
      );
      course.position.set(xS, yC, 0);
      course.userData.courseIndex = c;
      course.userData.totalCourses = courseCount;
      course.name = `siding_long_${longSign > 0 ? 'east' : 'west'}_${c}`;
      sidingGroup.add(course);
    }
  }

  // Short walls: courses on both, full-W length
  for (const sign of [-1, 1]) {
    const zS = sign * (L / 2 + SIDING_CTR_OFF);
    const sLen = W;
    for (let c = 0; c < courseCount; c++) {
      const yC = subfloorTop + (c + 0.5) * courseH;
      const course = new THREE.Mesh(
        new THREE.BoxGeometry(sLen, courseH * 0.97, SIDING_THICK),
        sidingMat(),
      );
      course.position.set(0, yC, zS);
      course.userData.courseIndex = c;
      course.userData.totalCourses = courseCount;
      course.name = `siding_short_${sign > 0 ? 'south' : 'north'}_${c}`;
      sidingGroup.add(course);
    }
  }
  group.add(sidingGroup);

  // (Shingle slab moved to roof.js so it sits inside the hinge group and
  //  rotates with the trusses when the roof is lowered for transport.)

  return group;
}
