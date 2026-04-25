// Stage 10 — Interior finish.
// Per-module: light-wood flooring, full kitchen (cabinets/counter/sink/island),
// full bathroom (toilet/vanity/shower), bedroom (bed/headboard), living
// (sofa/coffee table), and an interior door. All anchored at module-local origin
// so the same builder works for both A and B (just mirrored via `inboard`).

import * as THREE from 'three';
import { matte, shared } from '../utils/materials.js';
import { MODULE } from '../utils/dimensions.js';

const cabinetMat   = () => shared('cabinet',   () => matte('#7A6650', { roughness: 0.7 }));   // walnut
const counterMat   = () => shared('counter',   () => matte('#D8D6CE', { roughness: 0.4 }));   // light stone
const fixtureMat   = () => shared('fixture',   () => matte('#A8A8A2', { roughness: 0.5, metalness: 0.3 }));
const doorMat      = () => shared('intDoor',   () => matte('#E8E0CC', { roughness: 0.7 }));
const flooringMat  = () => shared('flooring',  () => matte('#C4A881', { roughness: 0.6 }));   // light oak
const islandMat    = () => shared('island',    () => matte('#3A3A38', { roughness: 0.5 }));   // dark wood
const fabricMat    = () => shared('fabric',    () => matte('#5A6E78', { roughness: 0.85 }));  // muted blue
const beddingMat   = () => shared('bedding',   () => matte('#E8E0D0', { roughness: 0.85 }));  // cream linen
const porcelainMat = () => shared('porcelain', () => matte('#F8F8F4', { roughness: 0.4 }));   // toilet/sink white
const tileMat      = () => shared('tile',      () => matte('#B8B8B2', { roughness: 0.4 }));   // bath tile

const subfloorTop = MODULE.joistHeight + MODULE.subfloorThickness;

export function buildModuleInterior({ side = 'A' } = {}) {
  const group = new THREE.Group();
  group.name = 'Interior';

  const inboard = side === 'A' ? +1 : -1;
  const W = MODULE.width;
  const L = MODULE.length;

  const add = (mesh, name) => {
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // ---------- INTERIOR FLOORING ----------
  // Thin light-oak plane covering the module footprint (slightly inset from walls)
  const flooring = new THREE.Mesh(
    new THREE.BoxGeometry(W - 1.2, 0.08, L - 1.2),
    flooringMat(),
  );
  flooring.position.set(0, subfloorTop + 0.04, 0);
  flooring.receiveShadow = true;
  add(flooring, 'flooring');

  // ---------- KITCHEN (mid-Z, inboard side) ----------
  // Cabinet run along inboard wall
  add(new THREE.Mesh(new THREE.BoxGeometry(2, 3, 8), cabinetMat()),
      'cabinet_run').position.set(inboard * 5.7, subfloorTop + 1.5, -L * 0.18);

  // Countertop slab over cabinets
  add(new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.15, 8.3), counterMat()),
      'counter_slab').position.set(inboard * 5.7, subfloorTop + 3.075, -L * 0.18);

  // Sink (in counter)
  add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 1.0), porcelainMat()),
      'sink').position.set(inboard * 5.7, subfloorTop + 3.0, -L * 0.18);

  // Kitchen island (dark base + stone top)
  add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 3, 5.5), islandMat()),
      'island').position.set(inboard * 1.5, subfloorTop + 1.5, -L * 0.18);
  add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.15, 5.9), counterMat()),
      'island_top').position.set(inboard * 1.5, subfloorTop + 3.075, -L * 0.18);
  // Two pendant boxes (representing pendant lights over island)
  for (let i = 0; i < 2; i++) {
    const z = -L * 0.18 + (i === 0 ? -1.5 : 1.5);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), fixtureMat()),
        `pendant_${i}`).position.set(inboard * 1.5, subfloorTop + 7.5, z);
  }

  // ---------- BATHROOM (south end, +Z side) ----------
  // Toilet (cylinder + tank)
  const toilet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 1.4, 16),
    porcelainMat(),
  );
  toilet.position.set(inboard * 4.8, subfloorTop + 0.7, L * 0.42);
  add(toilet, 'toilet');
  add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.5), porcelainMat()),
      'toilet_tank').position.set(inboard * 5.5, subfloorTop + 2.2, L * 0.42);

  // Vanity (cabinet + counter + sink)
  add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.5, 1.6), cabinetMat()),
      'vanity').position.set(inboard * 5.7, subfloorTop + 1.25, L * 0.30);
  add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.8), counterMat()),
      'vanity_top').position.set(inboard * 5.7, subfloorTop + 2.56, L * 0.30);
  add(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 0.7), porcelainMat()),
      'vanity_sink').position.set(inboard * 5.7, subfloorTop + 2.7, L * 0.30);
  // Bathroom mirror (thin tall plane on the wall)
  add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.4, 1.8), fixtureMat()),
      'bath_mirror').position.set(inboard * 6.6, subfloorTop + 4.5, L * 0.30);

  // Shower stall (low base + 3-wall enclosure approximation)
  add(new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 4), tileMat()),
      'shower_base').position.set(-inboard * 4, subfloorTop + 0.15, L * 0.42);
  // Two glass-ish walls (semi-transparent tile color)
  const showerWallMat = () => {
    const m = matte('#C8DCE0', { transparent: true, opacity: 0.35, roughness: 0.05 });
    return m;
  };
  add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 6, 4), showerWallMat()),
      'shower_glass_x').position.set(-inboard * 2, subfloorTop + 3, L * 0.42);
  add(new THREE.Mesh(new THREE.BoxGeometry(4, 6, 0.1), showerWallMat()),
      'shower_glass_z').position.set(-inboard * 4, subfloorTop + 3, L * 0.42 - 2);
  // Shower head (small box on wall)
  add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.3), fixtureMat()),
      'shower_head').position.set(-inboard * 5.5, subfloorTop + 6.5, L * 0.42);

  // ---------- LIVING AREA (mid, outboard side) ----------
  // Sofa: base + backrest + arm rests
  add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 6.5), fabricMat()),
      'sofa_base').position.set(-inboard * 4, subfloorTop + 0.7, -L * 0.05);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 6.5), fabricMat()),
      'sofa_back').position.set(-inboard * 5.0, subfloorTop + 1.8, -L * 0.05);

  // Coffee table
  add(new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.15, 1.8), counterMat()),
      'coffee_table').position.set(-inboard * 1.5, subfloorTop + 1.4, -L * 0.05);
  // Coffee table legs (4 thin posts)
  for (let i = 0; i < 4; i++) {
    const dx = (i % 2 === 0 ? -1 : 1) * 1.5;
    const dz = (i < 2 ? -1 : 1) * 0.7;
    add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.3, 0.15), counterMat()),
        `coffee_leg_${i}`).position.set(-inboard * 1.5 + dx, subfloorTop + 0.65, -L * 0.05 + dz);
  }

  // ---------- BEDROOM (north end, -Z side) ----------
  // Bed frame
  add(new THREE.Mesh(new THREE.BoxGeometry(8, 1.0, 6), cabinetMat()),
      'bed_frame').position.set(0, subfloorTop + 0.5, -L * 0.32);
  // Mattress + bedding stack
  add(new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.6, 5.6), beddingMat()),
      'mattress').position.set(0, subfloorTop + 1.3, -L * 0.32);
  // Pillows (two small stacks)
  add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 1.4), beddingMat()),
      'pillow_l').position.set(-1.2, subfloorTop + 1.75, -L * 0.32 - 1.8);
  add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 1.4), beddingMat()),
      'pillow_r').position.set(+1.2, subfloorTop + 1.75, -L * 0.32 - 1.8);
  // Headboard
  add(new THREE.Mesh(new THREE.BoxGeometry(8.5, 4, 0.4), cabinetMat()),
      'headboard').position.set(0, subfloorTop + 2.5, -L * 0.32 - 3.1);
  // Nightstand
  add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1.8), cabinetMat()),
      'nightstand').position.set(inboard * 5, subfloorTop + 1, -L * 0.32 - 0.5);
  // Lamp (small box on nightstand)
  add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.5, 0.6), beddingMat()),
      'lamp').position.set(inboard * 5, subfloorTop + 2.75, -L * 0.32 - 0.5);

  // ---------- INTERIOR DOOR (between bedroom and living, in partition) ----------
  add(new THREE.Mesh(new THREE.BoxGeometry(2.8, 6.8, 0.15), doorMat()),
      'int_door').position.set(inboard * -3, subfloorTop + 3.4, -L / 4);

  return group;
}
