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
const doorMat      = () => shared('front_door', () => matte(COLORS.doorWood, { roughness: 0.55 }));

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

  // --- WINDOWS — 3 on the existing outer long wall + 2 on the OPPOSITE
  //     long wall (the side facing the camera in iso view, per user
  //     request). Both sets share the same construction (back, glass,
  //     picture-frame trim); only the long-wall sign + window Z positions
  //     differ.
  const windowsGroup = new THREE.Group();
  windowsGroup.name = 'windows';

  const winW = 3.0;
  const winH = 4.0;
  const winY = subfloorTop + 4.0; // sill ~4 ft above floor

  const buildSideWindow = (longSign, wz, idName) => {
    const winGroup = new THREE.Group();
    winGroup.name = idName;

    // Backing plane (sits flush in the wall opening, behind glass + trim)
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, winH, winW),
      frameMat(),
    );
    back.position.set(0, 0, 0);
    back.castShadow = true;
    winGroup.add(back);

    // Glass pane (slightly outboard of backing)
    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, winH * 0.85, winW * 0.85),
      glassMat(),
    );
    pane.position.set(longSign * 0.04, 0, 0);
    winGroup.add(pane);

    // Picture-frame TRIM around the window — 4 thicker white casing strips
    // standing proud of the siding so the window reads as recessed inside
    // a substantial trim frame (matches the rendering's chunky white casings).
    // Trim is ~3" wide, projects 1" outboard of the siding face.
    const trimW = 0.25;            // casing width (perpendicular to opening edge)
    const trimT = 0.12;             // how far it stands proud (along wall normal X)
    const trimX = longSign * (TOTAL_OFF * 0.6 + trimT / 2);
    // Top + bottom (run along Z, full width including corners)
    for (const sy of [-1, +1]) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(trimT, trimW, winW + 2 * trimW),
        frameMat(),
      );
      strip.position.set(trimX, sy * (winH / 2 + trimW / 2), 0);
      strip.castShadow = true;
      strip.name = `${idName}_trim_${sy > 0 ? 'top' : 'bot'}`;
      winGroup.add(strip);
    }
    // Left + right (run along Y, between the top/bottom strips)
    for (const sz of [-1, +1]) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(trimT, winH, trimW),
        frameMat(),
      );
      strip.position.set(trimX, 0, sz * (winW / 2 + trimW / 2));
      strip.castShadow = true;
      strip.name = `${idName}_trim_${sz > 0 ? 'right' : 'left'}`;
      winGroup.add(strip);
    }

    const winXOut = longSign * (W / 2 + TOTAL_OFF + 0.02);
    winGroup.position.set(winXOut, winY, wz);
    windowsGroup.add(winGroup);
  };

  // Existing 3 windows on outerLongSign (-X) wall.
  const windowZs = [-L * 0.32, 0, L * 0.32];
  windowZs.forEach((wz, i) => buildSideWindow(outerLongSign, wz, `window_${i}`));

  // 2 NEW windows on the OPPOSITE long wall (+X, the side facing the
  // camera in iso view). Spaced symmetrically along the module length.
  const screenSideZs = [-L * 0.22, +L * 0.22];
  screenSideZs.forEach((wz, i) => buildSideWindow(-outerLongSign, wz, `window_screen_${i}`));

  // --- UPPER-MODULE FRONT WINDOWS ---
  // Two tall vertical windows on the +Z gable end, side-by-side, spaced
  // symmetrically left + right of center. Matches the rendering: they sit
  // directly above where the porch goes on the lower module. White trim,
  // dark glass identical to the side windows.
  if (side === 'B') {
    const frontWinW = 2.6;
    const frontWinH = 4.5;
    const frontSpacing = W * 0.32;        // half-distance between window centers
    const frontWinY = subfloorTop + 4.5;  // sill higher up the wall, matches rendering
    const frontWinZ = L / 2 + TOTAL_OFF + 0.02;

    for (const sx of [-1, +1]) {
      const winGroup = new THREE.Group();
      winGroup.name = `front_window_${sx > 0 ? 'east' : 'west'}`;

      // White trim frame (oriented for a +Z-facing wall — width along X, depth along Z)
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(frontWinW, frontWinH, 0.08),
        frameMat(),
      );
      frame.castShadow = true;
      winGroup.add(frame);

      // Dark glass pane, slightly inset behind the trim
      const pane = new THREE.Mesh(
        new THREE.BoxGeometry(frontWinW * 0.85, frontWinH * 0.88, 0.04),
        glassMat(),
      );
      pane.position.set(0, 0, -0.04);
      winGroup.add(pane);

      // Slim horizontal muntin near the middle, matches the side windows
      const muntin = new THREE.Mesh(
        new THREE.BoxGeometry(frontWinW * 0.85, 0.08, 0.05),
        frameMat(),
      );
      muntin.position.set(0, 0, 0.005);
      winGroup.add(muntin);

      // Vertical muntin
      const vMuntin = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, frontWinH * 0.88, 0.05),
        frameMat(),
      );
      vMuntin.position.set(0, 0, 0.005);
      winGroup.add(vMuntin);

      // Picture-frame TRIM (chunky white casing standing proud of the wall)
      const trimW = 0.25;
      const trimT = 0.12;
      const trimZ = trimT / 2 + 0.04;
      // Top + bottom strips
      for (const sy of [-1, +1]) {
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(frontWinW + 2 * trimW, trimW, trimT),
          frameMat(),
        );
        strip.position.set(0, sy * (frontWinH / 2 + trimW / 2), trimZ);
        strip.castShadow = true;
        strip.name = `front_trim_${sx > 0 ? 'east' : 'west'}_${sy > 0 ? 'top' : 'bot'}`;
        winGroup.add(strip);
      }
      // Left + right strips
      for (const sxx of [-1, +1]) {
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(trimW, frontWinH, trimT),
          frameMat(),
        );
        strip.position.set(sxx * (frontWinW / 2 + trimW / 2), 0, trimZ);
        strip.castShadow = true;
        strip.name = `front_trim_${sx > 0 ? 'east' : 'west'}_${sxx > 0 ? 'right' : 'left'}`;
        winGroup.add(strip);
      }

      winGroup.position.set(sx * frontSpacing, frontWinY, frontWinZ);
      windowsGroup.add(winGroup);
    }
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

  // --- FRONT DOOR (lower module only) ---
  // Styled to match the Champion 05-S30 rendering:
  //   - Warm saddle/cinnamon wood
  //   - TALL vertical glass panel (~60% of door height) — three-light style
  //   - Slim white horizontal muntin dividing the glass area
  //   - Small bronze handle on the right side
  // Sits OUTBOARD of the siding on the +Z gable end. Lower module is side='A'.
  if (side === 'A') {
    const doorGroup = new THREE.Group();
    doorGroup.name = 'front_door';

    const doorH = 6.8;
    const doorW = 3.0;
    const doorThickness = 0.18;
    const doorZ = L / 2 + SIDING_CTR_OFF + doorThickness / 2 + 0.01;
    const doorY = subfloorTop + doorH / 2;
    const doorX = W * 0.15;       // slightly right of center, matches rendering

    // Door slab
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(doorW, doorH, doorThickness),
      doorMat(),
    );
    door.position.set(doorX, doorY, doorZ);
    door.castShadow = true;
    door.name = 'front_door_slab';
    doorGroup.add(door);

    // Tall glass panel — top 60% of the door, inset from edges
    const glassW = doorW * 0.65;
    const glassH = doorH * 0.55;
    const glassY = subfloorTop + doorH * 0.65;       // centered in upper portion
    const glassZ = doorZ + doorThickness / 2 + 0.005;
    const tallGlass = new THREE.Mesh(
      new THREE.BoxGeometry(glassW, glassH, 0.03),
      glassMat(),
    );
    tallGlass.position.set(doorX, glassY, glassZ);
    tallGlass.castShadow = false;
    tallGlass.name = 'front_door_glass';
    doorGroup.add(tallGlass);

    // White horizontal muntin across the middle of the glass
    const muntin = new THREE.Mesh(
      new THREE.BoxGeometry(glassW + 0.03, 0.10, 0.04),
      frameMat(),
    );
    muntin.position.set(doorX, glassY, glassZ + 0.005);
    muntin.castShadow = false;
    muntin.name = 'front_door_muntin';
    doorGroup.add(muntin);

    // Bronze handle on the right side, vertical bar style
    const handleMat = shared('door_handle', () => matte('#5A3A1F', { roughness: 0.4, metalness: 0.7 }));
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.45, 0.10),
      handleMat,
    );
    handle.position.set(doorX + doorW * 0.38, subfloorTop + doorH * 0.42, doorZ + doorThickness / 2 + 0.05);
    handle.castShadow = true;
    handle.name = 'front_door_handle';
    doorGroup.add(handle);

    group.add(doorGroup);
  }

  // --- FLOOR-FRAME SKIRT (upper module only) ---
  // When the upper module stacks on top of the lower, its floor frame (rim
  // joists + floor joists, all warm-tan "framing" color) is exposed as a
  // band of brown around the perimeter at the seam between modules. Cover
  // it with a thin band of siding so the cladding reads as continuous.
  if (side === 'B') {
    const skirtGroup = new THREE.Group();
    skirtGroup.name = 'skirt';

    const skirtH = MODULE.joistHeight + MODULE.subfloorThickness; // band height
    const skirtY = skirtH / 2;                                    // sits at module-local 0..skirtH

    // Both long walls
    for (const longSign of [-1, +1]) {
      const xS = longSign * (W / 2 + SIDING_CTR_OFF);
      const skirt = new THREE.Mesh(
        new THREE.BoxGeometry(SIDING_THICK, skirtH, L),
        sidingMat(),
      );
      skirt.position.set(xS, skirtY, 0);
      skirt.castShadow = true;
      skirt.receiveShadow = true;
      skirt.name = `skirt_long_${longSign > 0 ? 'east' : 'west'}`;
      skirtGroup.add(skirt);
    }
    // Both short walls
    for (const sign of [-1, +1]) {
      const zS = sign * (L / 2 + SIDING_CTR_OFF);
      const skirt = new THREE.Mesh(
        new THREE.BoxGeometry(W, skirtH, SIDING_THICK),
        sidingMat(),
      );
      skirt.position.set(0, skirtY, zS);
      skirt.castShadow = true;
      skirt.receiveShadow = true;
      skirt.name = `skirt_short_${sign > 0 ? 'south' : 'north'}`;
      skirtGroup.add(skirt);
    }

    group.add(skirtGroup);
  }

  // (Shingle slab moved to roof.js so it sits inside the hinge group and
  //  rotates with the trusses when the roof is lowered for transport.)

  return group;
}
