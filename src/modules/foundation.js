// Stage 12 — Crawl-space foundation for the site stage.
// Sits at world (0, 0, 0). The lower module is craned onto the perimeter
// walls (and bears on the interior footing); the upper module then stacks
// onto the lower.
//
// Per user reference schematic, the foundation reads as a true crawl space:
//   - Unbroken concrete perimeter wall around the full footprint.
//   - Interior bearing-wall footing across the middle of the long axis,
//     supporting the home's interior bearing wall.
//   - Dirt floor inside the perimeter (no slab).

import * as THREE from 'three';
import { matte, shared } from '../utils/materials.js';
import { MODULE } from '../utils/dimensions.js';

const concreteMat = () => shared('concrete', () => matte('#B8B8B0', { roughness: 0.95 }));
const dirtMat     = () => shared('dirt',     () => matte('#7E6F5A', { roughness: 1.0  }));

export function buildFoundation() {
  const group = new THREE.Group();
  group.name = 'Foundation';

  const W = MODULE.width;
  const L = MODULE.length;

  const overhang   = 0.5;   // 6" exposed concrete past each module edge
  const wallH      = 0.8;   // perimeter / footing wall height (= FOUNDATION_TOP)
  const wallT      = 0.67;  // ~8" wall thickness

  const totalW = W + 2 * overhang;
  const totalL = L + 2 * overhang;

  // ----- Perimeter walls (4) ------------------------------------------------
  // North + South walls run the full totalW; East + West fit between them so
  // the four walls form a single closed rectangle when viewed from above.
  for (const sign of [-1, +1]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(totalW, wallH, wallT),
      concreteMat(),
    );
    wall.position.set(0, wallH / 2, sign * (totalL / 2 - wallT / 2));
    wall.receiveShadow = true;
    wall.castShadow = true;
    wall.name = `foundation_wall_${sign > 0 ? 'south' : 'north'}`;
    group.add(wall);
  }
  const sideWallL = totalL - 2 * wallT;
  for (const sign of [-1, +1]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(wallT, wallH, sideWallL),
      concreteMat(),
    );
    wall.position.set(sign * (totalW / 2 - wallT / 2), wallH / 2, 0);
    wall.receiveShadow = true;
    wall.castShadow = true;
    wall.name = `foundation_wall_${sign > 0 ? 'east' : 'west'}`;
    group.add(wall);
  }

  // ----- Interior bearing-wall footing -------------------------------------
  // Runs across the short (X) direction at the midpoint of the long (Z) axis.
  // Same height as the perimeter so the lower module's interior bearing wall
  // can rest on it just like the perimeter walls support the exterior walls.
  const innerW = totalW - 2 * wallT;
  const innerL = totalL - 2 * wallT;
  {
    const footing = new THREE.Mesh(
      new THREE.BoxGeometry(innerW, wallH, wallT),
      concreteMat(),
    );
    footing.position.set(0, wallH / 2, 0);
    footing.receiveShadow = true;
    footing.castShadow = true;
    footing.name = 'foundation_bearing_footing';
    group.add(footing);
  }

  // ----- Dirt floor inside the perimeter -----------------------------------
  // Thin layer raised a hair above ground (y=0) so the bottom face doesn't
  // Z-fight with the ground plane underneath. Split into two halves so the
  // bearing-wall footing visually divides them, matching the schematic.
  const dirtH = 0.05;
  const dirtY = 0.025 + 0.005;     // small lift above ground plane
  const halfL = (innerL - wallT) / 2;
  for (const sign of [-1, +1]) {
    const dirt = new THREE.Mesh(
      new THREE.BoxGeometry(innerW, dirtH, halfL),
      dirtMat(),
    );
    dirt.position.set(0, dirtY, sign * (wallT / 2 + halfL / 2));
    dirt.receiveShadow = true;
    dirt.name = `foundation_dirt_${sign > 0 ? 'south' : 'north'}`;
    group.add(dirt);
  }

  return group;
}
