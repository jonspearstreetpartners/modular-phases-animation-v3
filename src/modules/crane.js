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

  // ---- (Mast + boom removed per user request) ----
  // The crane is now a chassis-only platform. Modules rise via cables that
  // appear to descend from above the camera frame. This sidesteps the
  // boom-rotation timing issues entirely while keeping a believable
  // "crane lift" feel — the cables read as suspending the load and the
  // chassis reads as the operator/source.

  // ---- Hook + 4 cables (short evocative stubs above the hook) ----
  // Cables are short fixed-length segments rising from the hook. They read
  // as "the load is suspended from above" without descending visibly into
  // the module from off-camera. Earlier versions stretched cables all the
  // way up to an ANCHOR_Y=80 off-camera point, which made the cables
  // appear to penetrate the open-top module from this isometric angle.
  const CABLE_LEN = 4;          // cable length in ft (short evocative stub)
  const hook = new THREE.Group();
  hook.name = 'crane_hook';
  hook.position.set(0, 50, 0);             // initial rest dangle high above the scene
  group.add(hook);

  // Hook block — tiny so it never reads as penetrating the module from the
  // isometric Stage 12 camera angle. Earlier sizes (1.6 × 1.2 × 1.6) were
  // large enough that perspective made the block appear to overlap the
  // module roof line.
  const hookBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.4, 0.6),
    hookMat(),
  );
  hookBlock.position.set(0, 0, 0);
  hookBlock.castShadow = true;
  hookBlock.name = 'crane_hookblock';
  hook.add(hookBlock);

  // Lift cables — 4 short stubs at the corners of an imaginary spreader bar,
  // parented to the hook so they follow it. Fixed length so they stay above
  // the hook (and above the module top) without trailing off-camera or
  // appearing to descend into the module from above.
  const cableSpread = 4;            // square half-width of the cable spread
  const cables = [];
  for (const dx of [-1, +1]) {
    for (const dz of [-1, +1]) {
      const geo = new THREE.CylinderGeometry(0.07, 0.07, CABLE_LEN, 6);
      geo.translate(0, CABLE_LEN / 2, 0);   // anchor at -Y (hook end)
      const c = new THREE.Mesh(geo, cableMat());
      c.position.set(dx * cableSpread, 0.6, dz * cableSpread);
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
 * Cables are now fixed-length stubs above the hook, so per-frame updates
 * are unnecessary. Function retained as a no-op for callers in main.js.
 */
export function updateCraneCables(_crane) {
  // intentionally empty
}
