// Stage 11 outro — semi tractor + flatbed trailer per module.
// One assembly per module, oriented along the module's long axis (Z), so the
// trailer slides under the module from the +Z end and pulls the module away
// in the -Z direction (toward the back of the scene).
//
// Each truck is one Group containing:
//   - flatbed deck (long, low rectangle)
//   - axle assemblies / wheels (cylinders) on trailer
//   - semi tractor cab (taller box)
//   - cab windows (dark thin panel on the front)
//   - tractor wheels (cylinders)

import * as THREE from 'three';
import { COLORS } from '../utils/colors.js';
import { matte, shared } from '../utils/materials.js';
import { MODULE } from '../utils/dimensions.js';

const TRAILER_LEN = 50;        // ft  (long enough to carry 44-ft module + overhang)
const TRAILER_W   = 8.5;
const TRAILER_T   = 0.5;       // deck thickness
const TRAILER_Y   = -0.3;      // deck center y (trailer sits just under the module's carrier beams)

const CAB_LEN  = 11;
const CAB_W    = 8;
const CAB_H    = 11;
const CAB_GAP  = 1;            // gap between cab and trailer

const WHEEL_R  = 1.5;
const WHEEL_W  = 1.0;

const trailerMat = () => shared('trailerSteel', () => matte('#3A3A3E', { roughness: 0.55, metalness: 0.55 }));
const cabMat     = () => shared('cabPaint',     () => matte(COLORS.spearAccent, { roughness: 0.4, metalness: 0.5 }));
const windowMat  = () => shared('cabWindow',    () => matte('#1A1F26', { roughness: 0.15, metalness: 0.7 }));
const tireMat    = () => shared('tire',         () => matte('#1A1A1A', { roughness: 0.85 }));
const grilleMat  = () => shared('grille',       () => matte('#222222', { roughness: 0.5, metalness: 0.6 }));

/**
 * Build a wheel cylinder oriented with axle along world X.
 * (CylinderGeometry default axis is Y; we rotate Z by 90° so the cylinder
 * lies on its side.)
 */
function wheel() {
  const geo = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_W, 18);
  geo.rotateZ(Math.PI / 2);
  const m = new THREE.Mesh(geo, tireMat());
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * Build a complete truck-trailer rig for one module. Returned group's local
 * origin sits at the module's centerX, with cab forward (+Z end) and trailer
 * extending back along Z. Caller positions the rig in world space.
 */
export function buildTruckAndTrailer({ side = 'A' } = {}) {
  const group = new THREE.Group();
  group.name = `Truck_${side}`;
  group.userData.side = side;

  // ---- Flatbed deck (centered on Z=0 in local frame) ----
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(TRAILER_W, TRAILER_T, TRAILER_LEN),
    trailerMat(),
  );
  deck.position.set(0, TRAILER_Y, 0);
  deck.castShadow = true;
  deck.receiveShadow = true;
  deck.name = 'trailer_deck';
  group.add(deck);

  // (Trailer side rails removed — per user request the trailer reads as
  //  a flat-deck rig, just the solid deck + wheels with no edge rails.)

  // Trailer wheels — 3 axle pairs near the back, 1 near the front kingpin.
  // Axle Y = WHEEL_R places the wheel BOTTOM at the ground plane (Y=0)
  // and the top at Y = 2*WHEEL_R = 3 ft, so the lower half of each wheel
  // is visible below the module's floor frame (where joists live but
  // there's no continuous siding) while the upper half stays inside the
  // module's wall area. Earlier formula derived from TRAILER_Y put wheels
  // at Y = -1.95 — entirely below the ground plane and invisible.
  const trailerWheelY = WHEEL_R;
  const wheelOffsetX = TRAILER_W / 2 - 0.2;
  // Rear tridem (3 axles)
  for (let i = 0; i < 3; i++) {
    const z = -TRAILER_LEN / 2 + 6 + i * 4;        // 6, 10, 14 ft from back
    for (const xs of [-1, 1]) {
      const w = wheel();
      w.position.set(xs * wheelOffsetX, trailerWheelY, z);
      w.name = `trailer_wheel_${i}_${xs > 0 ? 'east' : 'west'}`;
      group.add(w);
    }
  }

  // ---- Semi tractor (cab) — sits at +Z end, in front of trailer ----
  // CAB_LIFT raises the entire cab so its bottom face sits at the wheel-
  // top height (= 2*WHEEL_R). Without this lift the cab body would extend
  // from Y=0 down through the now-visible wheels.
  const CAB_LIFT = 2 * WHEEL_R;
  const cabZ = TRAILER_LEN / 2 + CAB_GAP + CAB_LEN / 2;

  // Hood / lower cab (long box)
  const cabBody = new THREE.Mesh(
    new THREE.BoxGeometry(CAB_W, CAB_H * 0.7, CAB_LEN),
    cabMat(),
  );
  cabBody.position.set(0, CAB_LIFT + CAB_H * 0.35, cabZ);
  cabBody.castShadow = true;
  cabBody.receiveShadow = true;
  cabBody.name = 'cab_body';
  group.add(cabBody);

  // Sleeper — taller block on the back portion of cab (the section nearest the trailer)
  const sleeper = new THREE.Mesh(
    new THREE.BoxGeometry(CAB_W * 0.95, CAB_H * 0.3, CAB_LEN * 0.55),
    cabMat(),
  );
  sleeper.position.set(0, CAB_LIFT + CAB_H * 0.85, cabZ - CAB_LEN * 0.20);
  sleeper.castShadow = true;
  sleeper.name = 'cab_sleeper';
  group.add(sleeper);

  // Windshield — thin dark panel at the front of the cab body
  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(CAB_W * 0.85, CAB_H * 0.32, 0.15),
    windowMat(),
  );
  windshield.position.set(0, CAB_LIFT + CAB_H * 0.55, cabZ + CAB_LEN / 2 + 0.08);
  windshield.name = 'cab_windshield';
  group.add(windshield);

  // Side windows (one per side)
  for (const xs of [-1, 1]) {
    const sw = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, CAB_H * 0.28, CAB_LEN * 0.5),
      windowMat(),
    );
    sw.position.set(xs * (CAB_W / 2 + 0.08), CAB_LIFT + CAB_H * 0.55, cabZ - CAB_LEN * 0.05);
    sw.name = `cab_window_${xs > 0 ? 'east' : 'west'}`;
    group.add(sw);
  }

  // Grille at the front
  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(CAB_W * 0.7, CAB_H * 0.25, 0.2),
    grilleMat(),
  );
  grille.position.set(0, CAB_LIFT + CAB_H * 0.22, cabZ + CAB_LEN / 2 + 0.1);
  grille.name = 'cab_grille';
  group.add(grille);

  // Cab wheels — 2 axles, simple. Same trailerWheelY so all 10 wheels
  // sit at the same ground level.
  const cabWheelY = trailerWheelY;
  const cabWheelOffsets = [cabZ - CAB_LEN * 0.35, cabZ + CAB_LEN * 0.30];
  for (let i = 0; i < cabWheelOffsets.length; i++) {
    const z = cabWheelOffsets[i];
    for (const xs of [-1, 1]) {
      const w = wheel();
      w.position.set(xs * (CAB_W / 2 - 0.1), cabWheelY, z);
      w.name = `cab_wheel_${i}_${xs > 0 ? 'east' : 'west'}`;
      group.add(w);
    }
  }

  return group;
}
