// Stage 12 — Mobile boom-truck crane for the site stacking sequence.
//
// Layout (in the crane's local frame, before placement):
//   - Truck cab + chassis + outriggers along Z, length ~22 ft
//   - Vertical mast rising from the chassis
//   - Diagonal boom angled up from the mast top, reaching out in +X
//   - Hook block + 4 cables descending from the boom tip
//
// World placement: Crane sits at world (-22, 0, 0) — to the WEST of the site,
// boom reaching east to lift modules onto the foundation. Hidden until Stage 12.
//
// The hook is exposed via crane.userData.hook (a Group). To grab a module:
//   1) translate the hook to the module's position (cables + hook will follow)
//   2) parent the module to crane.userData.hook (so it follows when moved)
//   3) animate hook to lift / swing / lower
//   4) re-parent the module to the scene at the final position

import * as THREE from 'three';
import { matte, shared } from '../utils/materials.js';
import { COLORS } from '../utils/colors.js';

const cabMat       = () => shared('craneCab',     () => matte('#D8A03A', { roughness: 0.4, metalness: 0.4 }));   // safety yellow
const chassisMat   = () => shared('craneChassis', () => matte('#3A3A3E', { roughness: 0.55, metalness: 0.55 }));
const boomMat      = () => shared('craneBoom',    () => matte('#D8A03A', { roughness: 0.5, metalness: 0.4 }));
const hookMat      = () => shared('craneHook',    () => matte('#222222', { roughness: 0.4, metalness: 0.7 }));
const cableMat     = () => shared('craneCable',   () => matte('#222222', { roughness: 0.95 }));
const tireMat      = () => shared('tire',         () => matte('#1A1A1A', { roughness: 0.85 }));
const windowMat    = () => shared('cabWindow',    () => matte('#1A1F26', { roughness: 0.15, metalness: 0.7 }));

function wheel(radius = 1.5, width = 1.0) {
  const geo = new THREE.CylinderGeometry(radius, radius, width, 18);
  geo.rotateZ(Math.PI / 2);
  const m = new THREE.Mesh(geo, tireMat());
  m.castShadow = true;
  return m;
}

export function buildCrane() {
  const group = new THREE.Group();
  group.name = 'Crane';

  // ---- Chassis (long flatbed) ----
  const chassisLen = 22;
  const chassisW   = 8.5;
  const chassisH   = 1.5;
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(chassisW, chassisH, chassisLen),
    chassisMat(),
  );
  chassis.position.set(0, 1.5 + chassisH / 2, 0);
  chassis.castShadow = chassis.receiveShadow = true;
  chassis.name = 'crane_chassis';
  group.add(chassis);

  // ---- Outriggers (4 stabilizing pads at the corners) ----
  for (const sx of [-1, +1]) {
    for (const sz of [-1, +1]) {
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.3, 2.5),
        chassisMat(),
      );
      pad.position.set(sx * (chassisW / 2 + 1), 0.15, sz * (chassisLen / 2 - 2));
      pad.receiveShadow = true;
      pad.name = `crane_outrigger_${sx > 0 ? 'east' : 'west'}_${sz > 0 ? 'south' : 'north'}`;
      group.add(pad);
    }
  }

  // ---- Wheels (4 axles) ----
  const wheelY = 1.5;
  const axleZs = [-chassisLen / 2 + 3, -chassisLen / 2 + 6.5, chassisLen / 2 - 6.5, chassisLen / 2 - 3];
  for (const z of axleZs) {
    for (const sx of [-1, +1]) {
      const w = wheel();
      w.position.set(sx * (chassisW / 2 - 0.3), wheelY, z);
      group.add(w);
    }
  }

  // ---- Cab (front of chassis, +Z end) ----
  const cabLen = 8;
  const cabH   = 7;
  const cabZ   = chassisLen / 2 + cabLen / 2 - 1;
  const cabBody = new THREE.Mesh(
    new THREE.BoxGeometry(chassisW * 0.95, cabH, cabLen),
    cabMat(),
  );
  cabBody.position.set(0, 1.5 + chassisH + cabH / 2, cabZ);
  cabBody.castShadow = cabBody.receiveShadow = true;
  cabBody.name = 'crane_cab';
  group.add(cabBody);

  // Windshield + side windows
  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(chassisW * 0.85, cabH * 0.45, 0.15),
    windowMat(),
  );
  windshield.position.set(0, 1.5 + chassisH + cabH * 0.65, cabZ + cabLen / 2 + 0.08);
  group.add(windshield);
  for (const sx of [-1, +1]) {
    const sw = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, cabH * 0.4, cabLen * 0.5),
      windowMat(),
    );
    sw.position.set(sx * (chassisW / 2 + 0.08), 1.5 + chassisH + cabH * 0.6, cabZ - cabLen * 0.05);
    group.add(sw);
  }

  // ---- Vertical mast (rises from chassis center) ----
  const mastH = 28;
  const mastTop = 1.5 + chassisH + mastH;
  const mast = new THREE.Mesh(
    new THREE.BoxGeometry(2, mastH, 2),
    boomMat(),
  );
  mast.position.set(0, 1.5 + chassisH + mastH / 2, 0);
  mast.castShadow = mast.receiveShadow = true;
  mast.name = 'crane_mast';
  group.add(mast);

  // ---- Boom pivot (group at the mast top; boom hangs off +X end) ----
  // The boom rotates around this pivot so its tip rises/falls following the
  // hook's elevation. updateCraneCables() computes the angle each frame from
  // the current hook position so the boom always points at the load.
  const boomLen = 32;
  const boomPivot = new THREE.Group();
  boomPivot.name = 'crane_boom_pivot';
  boomPivot.position.set(0, mastTop, 0);
  group.add(boomPivot);

  const boom = new THREE.Mesh(
    new THREE.BoxGeometry(boomLen, 1.4, 1.4),
    boomMat(),
  );
  // Place the boom so its left edge sits at the pivot (x=0 in pivot-local).
  // Box geometry is centered on its origin, so push x by +boomLen/2.
  boom.position.set(boomLen / 2, 0, 0);
  boom.castShadow = boom.receiveShadow = true;
  boom.name = 'crane_boom';
  boomPivot.add(boom);

  // Initial rest angle (~26° below horizontal from the mast top).
  const initialBoomAngle = -Math.PI / 7;
  boomPivot.rotation.z = initialBoomAngle;

  // ---- Hook + 4 cables (descend from boom tip) ----
  // Hook starts at rest dangling 12 ft below the boom tip.
  const initialBoomTipX = boomLen * Math.cos(initialBoomAngle);
  const initialBoomTipY = mastTop + boomLen * Math.sin(initialBoomAngle);

  const hook = new THREE.Group();
  hook.name = 'crane_hook';
  // boomTipX/Y are RUNTIME values updated each frame by updateCraneCables.
  // They're used by the cable-length tracker (and by stages.js to know where
  // the hook should be in pivot-relative space).
  hook.userData.boomTipX = initialBoomTipX;
  hook.userData.boomTipY = initialBoomTipY;
  hook.userData.mastTop  = mastTop;     // for boom-angle math each frame
  hook.userData.boomLen  = boomLen;
  hook.position.set(initialBoomTipX, initialBoomTipY - 12, 0);
  group.add(hook);

  // Hook block (small dark box at the bottom of the hook group)
  const hookBlock = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.2, 1.6),
    hookMat(),
  );
  hookBlock.position.set(0, 0, 0);
  hookBlock.castShadow = true;
  hookBlock.name = 'crane_hookblock';
  hook.add(hookBlock);

  // Lift cables — 4 at the corners of an imaginary spreader bar, going UP to
  // the boom tip. Built as cylinders parented to the hook so they move with
  // the hook AND scale up to the (changing) distance to the boom tip via
  // userData.cableNeedsUpdate. The crane stage will call updateCableLengths
  // each frame.
  const cableSpread = 4;            // square half-width of the cable spread
  const cables = [];
  for (const dx of [-1, +1]) {
    for (const dz of [-1, +1]) {
      // Cable length 12 at rest (above the hook block toward the boom tip).
      const len = 12;
      const geo = new THREE.CylinderGeometry(0.07, 0.07, len, 6);
      geo.translate(0, len / 2, 0);   // anchor at -Y (hook end)
      const c = new THREE.Mesh(geo, cableMat());
      c.position.set(dx * cableSpread, 0.6, dz * cableSpread);
      c.userData.cornerX = dx * cableSpread;
      c.userData.cornerZ = dz * cableSpread;
      c.name = `crane_cable_${dx > 0 ? 'e' : 'w'}_${dz > 0 ? 's' : 'n'}`;
      hook.add(c);
      cables.push(c);
    }
  }

  group.userData.hook = hook;
  group.userData.cables = cables;
  group.userData.boomPivot = boomPivot;
  return group;
}

/**
 * Update boom rotation + cable lengths each frame.
 *  - Boom rotates around the mast top so its tip points at the hook's X
 *    position. As the hook lowers to grab a module, the boom angles down;
 *    as the hook rises during the cruise, the boom angles back up. The
 *    overall effect is a boom that follows the load instead of clipping
 *    through it.
 *  - The 4 lift cables stretch vertically from the hook to the new boom-tip
 *    Y. We approximate cables as straight-up lines (good enough at the iso
 *    angle, since hookX stays close to boomTipX in the choreography).
 *
 * Called every frame from main.js's render loop while the crane is visible.
 */
export function updateCraneCables(crane) {
  if (!crane || !crane.userData.cables) return;
  const hook = crane.userData.hook;
  const boomPivot = crane.userData.boomPivot;
  if (!hook) return;

  // ---- Boom rotation: aim boom tip at the current hook X ----
  if (boomPivot) {
    const mastTop = hook.userData.mastTop;
    const boomLen = hook.userData.boomLen;
    const hookX = hook.position.x;
    const hookY = hook.position.y;

    // The boom tip should sit slightly ABOVE the hook (the hook hangs from
    // cables). Aim at (hookX, hookY + targetCableLen).
    const targetCableLen = 8;
    const aimY = hookY + targetCableLen;
    const dx = hookX;
    const dy = aimY - mastTop;

    // Boom angle = atan of the line from mast top to aim point.
    let angle = Math.atan2(dy, Math.max(0.5, dx));
    // Clamp so the boom doesn't flip backward or stand straight up.
    angle = Math.max(-Math.PI / 3, Math.min(Math.PI / 6, angle));
    boomPivot.rotation.z = angle;

    // Update cached boom tip position for the cable length math below.
    const tipX = boomLen * Math.cos(angle);
    const tipY = mastTop + boomLen * Math.sin(angle);
    hook.userData.boomTipX = tipX;
    hook.userData.boomTipY = tipY;
  }

  // ---- Cable length update ----
  const tipY = hook.userData.boomTipY;
  const hookY = hook.position.y;
  const len = Math.max(0.5, tipY - hookY);
  for (const c of crane.userData.cables) {
    c.scale.y = len / 12;
  }
}
