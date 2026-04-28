// Wall framing — single-wall builder (`buildStudWall`) plus per-module assembly.
//
// Each placed wall is wrapped in a "tilt" group whose rotation.x animates from a
// flat-on-the-floor pose to vertical (Stage 4). The tilt group's parent handles
// world placement + orientation, so animation only ever touches `tilt.rotation.x`.

import * as THREE from 'three';
import { COLORS } from '../utils/colors.js';
import { matte, shared } from '../utils/materials.js';
import { MODULE, INCH } from '../utils/dimensions.js';

const framingMat = () => shared('framing', () => matte(COLORS.framing));
// Drywall material for pre-installed interior facing of exterior walls AND
// both faces of the interior partition. (Partition no longer carries insulation
// — drywall on both sides hides anything in the cavity.)
const drywallMat = () => shared('drywall', () => matte(COLORS.drywall));
// Insulation lives between studs of each EXTERIOR wall. Each batt gets its
// own material instance — the per-batt fade/scale animation in earlier
// versions of the timeline staggered material.opacity, which would conflict
// if all batts shared one material. Today the walls (and their insulation)
// just slide in as a unit during Stage 5 — no per-batt opacity tweens —
// but keeping unique materials costs nothing and preserves flexibility.
const newInsulationMat = () => matte(COLORS.insulation, {
  transparent: true,
  opacity: 1.0,
  roughness: 0.95,
});

/**
 * Build a single stud wall. Length axis = local X. Bottom of bottom plate at y=0.
 */
export function buildStudWall({ length, height, studSpacing = MODULE.studSpacing }) {
  const group = new THREE.Group();
  group.name = `StudWall_${length.toFixed(1)}x${height.toFixed(1)}`;

  const sW  = MODULE.studWidth;
  const sD  = MODULE.studDepth;
  const bpH = MODULE.bottomPlateHeight;
  const tpH = MODULE.topPlateHeight;

  const bottomPlate = new THREE.Mesh(
    new THREE.BoxGeometry(length, bpH, sD),
    framingMat(),
  );
  bottomPlate.position.set(0, bpH / 2, 0);
  bottomPlate.castShadow = true;
  bottomPlate.receiveShadow = true;
  bottomPlate.name = 'bottomPlate';
  group.add(bottomPlate);

  const studHeight = height - bpH - 2 * tpH;
  const studY = bpH + studHeight / 2;
  const innerLen = length - sW;
  const intervals = Math.max(1, Math.round(innerLen / studSpacing));
  const actualSp  = innerLen / intervals;
  for (let i = 0; i <= intervals; i++) {
    const x = -innerLen / 2 + i * actualSp;
    const stud = new THREE.Mesh(
      new THREE.BoxGeometry(sW, studHeight, sD),
      framingMat(),
    );
    stud.position.set(x, studY, 0);
    stud.castShadow = true;
    stud.receiveShadow = true;
    stud.name = `stud_${i}`;
    group.add(stud);
  }

  for (let p = 0; p < 2; p++) {
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(length, tpH, sD),
      framingMat(),
    );
    plate.position.set(0, height - tpH / 2 - p * tpH, 0);
    plate.castShadow = true;
    plate.receiveShadow = true;
    plate.name = `topPlate_${p}`;
    group.add(plate);
  }

  group.userData.length = length;
  group.userData.height = height;
  return group;
}

/**
 * Attach pre-finished drywall to BOTH faces of the interior partition. The
 * partition ships into Stage 5 already drywalled (matching factory practice).
 * Insulation is intentionally NOT added here — the partition is a non-bearing
 * interior wall and drywall on both sides hides any cavity contents anyway,
 * so insulation would be invisible clutter.
 */
function addDrywallToPartition(wall, length, height) {
  const sD  = MODULE.studDepth;
  const dwT = 0.5 * INCH;
  const panelH = height - MODULE.bottomPlateHeight - 2 * MODULE.topPlateHeight;
  const panelY = MODULE.bottomPlateHeight + panelH / 2;

  for (const sign of [-1, 1]) {
    const dw = new THREE.Mesh(
      new THREE.BoxGeometry(length, panelH, dwT),
      drywallMat(),
    );
    dw.position.set(0, panelY, sign * (sD / 2 + dwT / 2));
    dw.receiveShadow = true;
    dw.name = `partition_drywall_${sign > 0 ? 'south' : 'north'}`;
    wall.add(dw);
  }
}

/**
 * Insert insulation batts between the studs of one exterior wall (built by
 * buildStudWall), using the wall's LOCAL coordinate frame:
 *   - X = wall length axis
 *   - Y = wall height
 *   - Z = wall depth (stud thickness)
 *
 * One batt per cavity (the gap between two adjacent studs). Each batt fits
 * floor-plate-to-top-plate vertically and just inside the stud thickness on Z
 * so it reads as sitting in the cavity. Counts/spacing match buildStudWall's
 * stud layout exactly.
 *
 * Per-user request: insulation ships pre-installed in the wall, so it slides
 * into Stage 5 as part of the wall and is visible from the moment the wall
 * arrives. The previous standalone Insulation group + Stage 7 animation is
 * gone.
 */
function addInsulationToWall(wall, length, height, studSpacing = MODULE.studSpacing) {
  const sW  = MODULE.studWidth;
  const sD  = MODULE.studDepth;
  const battH = height - MODULE.bottomPlateHeight - 2 * MODULE.topPlateHeight;
  const battY = MODULE.bottomPlateHeight + battH / 2;

  const innerLen  = length - sW;
  const intervals = Math.max(1, Math.round(innerLen / studSpacing));
  const actualSp  = innerLen / intervals;
  const battLen   = actualSp - sW;        // gap between adjacent studs (along X)
  const battDepth = sD - 0.05;            // sits within the wall cavity

  for (let i = 0; i < intervals; i++) {
    // Center of each cavity = midway between adjacent stud centers
    const x = -innerLen / 2 + (i + 0.5) * actualSp;
    const batt = new THREE.Mesh(
      new THREE.BoxGeometry(battLen, battH, battDepth),
      newInsulationMat(),
    );
    batt.position.set(x, battY, 0);
    batt.name = `batt_${i}`;
    wall.add(batt);
  }
}

/**
 * Attach a single drywall panel to one Z face of an exterior wall. Used to ship
 * exterior walls into Stage 5 with the interior-facing side already drywalled
 * (factory pre-finishing). The local Z face is selected by `faceSign` (+1 or -1).
 */
function addInteriorDrywall(wall, length, height, faceSign) {
  const sD  = MODULE.studDepth;
  const dwT = 0.5 * INCH;
  const panelH = height - MODULE.bottomPlateHeight - 2 * MODULE.topPlateHeight;
  const panelY = MODULE.bottomPlateHeight + panelH / 2;
  const dwZ    = faceSign * (sD / 2 + dwT / 2);

  const dw = new THREE.Mesh(
    new THREE.BoxGeometry(length, panelH, dwT),
    drywallMat(),
  );
  dw.position.set(0, panelY, dwZ);
  dw.receiveShadow = true;
  dw.name = 'interior_drywall';
  wall.add(dw);
}

/**
 * Wrap a wall in a tilt group. The tilt's local +X axis is the wall's length axis;
 * rotating tilt.rotation.x flops the wall around that length axis.
 *
 * @param wall          a wall built by buildStudWall
 * @param wallName      string ID, also recorded on tilt.userData.wallName
 * @param flopAngle     rotation.x value at which the wall lies flat outward
 * @returns the tilt group (caller adds it to whatever placement parent it wants)
 */
function wrapInTilt(wall, wallName, flopAngle) {
  const tilt = new THREE.Group();
  tilt.name = `wall_tilt_${wallName}`;
  tilt.userData.wallName = wallName;
  tilt.userData.flopAngle = flopAngle;
  tilt.add(wall);
  return tilt;
}

/**
 * Build all stud walls for ONE module. Walls are wrapped in tilt groups (see
 * wrapInTilt) and placed via outer "placer" groups that handle world position
 * and orientation independently of the flop animation.
 *
 * Tilts live in scene with names: wall_tilt_longWest, wall_tilt_longEast,
 * wall_tilt_shortNorth, wall_tilt_shortSouth, wall_tilt_partition_1.
 */
export function buildModuleWalls() {
  const group = new THREE.Group();
  group.name = 'Walls';

  const W   = MODULE.width;
  const L   = MODULE.length;
  const wH  = MODULE.wallHeight;
  const sD  = MODULE.studDepth;
  const y0  = MODULE.joistHeight + MODULE.subfloorThickness;

  // --- Long exterior walls (length = L, run along world Z) ---
  // Placer rotates 90° around Y so wall length aligns with Z.
  // Tilt's flop axis is the wall's length axis (= world Z after placer rotation).
  // Rotating tilt.rotation.x from 0 → +π/2 lays the wall flat such that its top
  // swings toward the placer's local -Z (which after the placer rotation is world -X
  // for the WEST placer, and world +X for the EAST placer). Both flop OUTWARD —
  // perfect, no per-side sign flipping required.
  for (const [sign, name] of [[-1, 'longWest'], [1, 'longEast']]) {
    const wall = buildStudWall({ length: L, height: wH });
    // Pre-installed insulation between studs (visible from the outboard side
    // where there's no interior drywall yet) + drywall on the interior face.
    // After the placer's Y rotation, local +Z maps toward module-center
    // (interior). Both long walls use +1 so studs/insulation remain visible
    // from the outboard / marriage-gap side.
    addInsulationToWall(wall, L, wH);
    addInteriorDrywall(wall, L, wH, +1);
    const tilt = wrapInTilt(wall, name, +Math.PI / 2);
    const placer = new THREE.Group();
    placer.name = `wall_place_${name}`;
    placer.add(tilt);
    placer.rotation.y = sign > 0 ? -Math.PI / 2 : Math.PI / 2;
    placer.position.set(sign * (W / 2 - sD / 2), y0, 0);
    group.add(placer);
  }

  // --- Short exterior walls (length = W - 2*sD, run along world X) ---
  // No placer rotation. Flop axis is world X (= tilt's local X).
  // NORTH (sign=-1, at z=-L/2) flops to -Z (top swings to -Z): rotation.x = -π/2.
  // SOUTH (sign=+1, at z=+L/2) flops to +Z (top swings to +Z): rotation.x = +π/2.
  const shortLen = W - 2 * sD;
  for (const [sign, name] of [[-1, 'shortNorth'], [1, 'shortSouth']]) {
    const wall = buildStudWall({ length: shortLen, height: wH });
    // Pre-installed insulation between studs + interior drywall.
    // Interior face is local +Z for north (sign=-1) and -Z for south (sign=+1)
    addInsulationToWall(wall, shortLen, wH);
    addInteriorDrywall(wall, shortLen, wH, -sign);
    const tilt = wrapInTilt(wall, name, sign * Math.PI / 2);
    const placer = new THREE.Group();
    placer.name = `wall_place_${name}`;
    placer.add(tilt);
    placer.position.set(0, y0, sign * (L / 2 - sD / 2));
    group.add(placer);
  }

  // --- Interior partition (~25% from north end, runs along X like a short wall) ---
  // Pre-finished: framing + insulation between studs + drywall on both faces.
  // Slides into Stage 5 as a complete unit.
  {
    const wall = buildStudWall({ length: shortLen, height: wH });
    addDrywallToPartition(wall, shortLen, wH);
    const tilt = wrapInTilt(wall, 'partition_1', +Math.PI / 2);
    const placer = new THREE.Group();
    placer.name = 'wall_place_partition_1';
    placer.add(tilt);
    placer.position.set(0, y0, -L / 4);
    group.add(placer);
  }

  return group;
}
