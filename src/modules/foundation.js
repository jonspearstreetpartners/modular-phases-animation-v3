// Stage 12 — Concrete perimeter foundation slab for the site stage.
// Sits at world (0, 0, 0). The lower module gets craned onto this; the upper
// gets stacked on top of the lower. Slab covers the full module footprint
// (15'-2" × 46') with a small overhang on each side, plus a slight thickness
// for visual weight.

import * as THREE from 'three';
import { matte, shared } from '../utils/materials.js';
import { MODULE } from '../utils/dimensions.js';

const concreteMat = () => shared('concrete', () => matte('#B8B8B0', { roughness: 0.95 }));
const dirtMat     = () => shared('dirt',     () => matte('#7E6F5A', { roughness: 1.0  }));

export function buildFoundation() {
  const group = new THREE.Group();
  group.name = 'Foundation';

  const W   = MODULE.width;
  const L   = MODULE.length;
  const overhang = 0.5;        // 6" exposed concrete around the module
  const thickness = 0.8;       // ~10" thick perimeter wall

  // Outer slab (concrete-colored top)
  const outer = new THREE.Mesh(
    new THREE.BoxGeometry(W + 2 * overhang, thickness, L + 2 * overhang),
    concreteMat(),
  );
  outer.position.set(0, thickness / 2, 0);
  outer.receiveShadow = true;
  outer.castShadow = true;
  outer.name = 'foundation_slab';
  group.add(outer);

  // Inner crawlspace (dirt) — recessed slightly so the perimeter reads as a wall
  const inner = new THREE.Mesh(
    new THREE.BoxGeometry(W - 2, thickness * 0.6, L - 2),
    dirtMat(),
  );
  inner.position.set(0, thickness * 0.3, 0);
  inner.receiveShadow = true;
  inner.name = 'foundation_crawlspace';
  group.add(inner);

  return group;
}
