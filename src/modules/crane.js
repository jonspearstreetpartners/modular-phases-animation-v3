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

  // ---- Boom (diagonal arm reaching east, +X) ----
  const boomLen   = 32;
  const boomAngle = -Math.PI / 7;       // ~26° below horizontal from the mast top, downward toward the load
  const boomCenterX = (boomLen / 2) * Math.cos(boomAngle);
  const boomCenterY = mastTop + (boomLen / 2) * Math.sin(boomAngle);

  const boom = new THREE.Mesh(
    new THREE.BoxGeometry(boomLen, 1.4, 1.4),
    boomMat(),
  );
  boom.position.set(boomCenterX, boomCenterY, 0);
  boom.rotation.z = boomAngle;
  boom.castShadow = boom.receiveShadow = true;
  boom.name = 'crane_boom';
  group.add(boom);

  // ---- Hook + 4 cables (descend from boom tip) ----
  // Hook tip world position when at REST: cantilevered to +X, hanging below boom
  const boomTipX = boomLen * Math.cos(boomAngle);
  const boomTipY = mastTop + boomLen * Math.sin(boomAngle);

  // The hook is its own group so we can reparent modules into it during the lift.
  const hook = new THREE.Group();
  hook.name = 'crane_hook';
  hook.userData.boomTipX = boomTipX;
  hook.userData.boomTipY = boomTipY;
  hook.position.set(boomTipX, boomTipY - 12, 0);    // initial rest dangle, 12 ft below tip
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
  return group;
}

/**
 * Update the 4 lift-cable cylinders so they always reach from the hook
 * spreader corners up to the boom tip. Called from the render loop while
 * the hook is animating during Stage 12. The hook is a child of the crane,
 * so cables compute their length in the crane's local frame.
 *
 * We approximate: each cable points straight UP (no XY shear). Length =
 * boomTipY - hookY. Since the hook stays roughly under the boom tip during
 * the lift this looks fine; if the hook swings far in X we'd need to angle
 * the cables but the choreography keeps the hook close.
 */
export function updateCraneCables(crane) {
  if (!crane || !crane.userData.cables) return;
  const hook = crane.userData.hook;
  if (!hook) return;
  const tipY = hook.userData.boomTipY;
  const hookY = hook.position.y;
  const len = Math.max(0.5, tipY - hookY);
  for (const c of crane.userData.cables) {
    c.scale.y = len / 12;        // base geometry is 12 ft, scale.y ratios it
  }
}
