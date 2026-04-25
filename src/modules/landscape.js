// Stage 12 outro — landscaping that grows out of the ground after the porch
// finishes assembling. Per the rendering: small ornamental grass clumps and
// rounded shrubs in front of the porch, framing the walkway.
//
// Geometry is kept low-poly for speed: bushes are spheres, grass clumps are
// short cylinders. Each item is anchored at its BOTTOM (geometry translated
// up by half its height) so animating scale.y from 0 → 1 visibly grows the
// plant up from the ground.

import * as THREE from 'three';
import { matte, shared } from '../utils/materials.js';
import { MODULE } from '../utils/dimensions.js';

const bushMat   = () => shared('bush_green',   () => matte('#3F6E3A', { roughness: 0.9 }));
const grassMat  = () => shared('grass_clump',  () => matte('#7E9E4B', { roughness: 0.95 }));
const lawnMat   = () => shared('lawn',         () => matte('#5C8A3F', { roughness: 1.0 }));

/**
 * Build a flat lawn patch + a handful of plants (mix of round shrubs and
 * vertical grass clumps) framing the porch and walkway.
 *
 * Local origin: same as the home (module-local 0,0,0), so this group placed
 * at world (SITE_X, 0, 0) lines up with the lower module above it.
 */
export function buildLandscape() {
  const group = new THREE.Group();
  group.name = 'Landscape';

  const W = MODULE.width;
  const L = MODULE.length;
  const PORCH_DEPTH = 8;            // matches porch.js
  const porchFrontZ = L / 2 + PORCH_DEPTH;
  const walkLen = 12;
  const walkEndZ = porchFrontZ + walkLen;

  // ---- Lawn patch (flat green plane around the home + walkway) ----
  // Sits just above the world ground at y = 0.02 to avoid z-fighting.
  const lawn = new THREE.Mesh(
    new THREE.BoxGeometry(W + 30, 0.05, walkLen + 16),
    lawnMat(),
  );
  lawn.position.set(0, 0.025, (porchFrontZ + walkEndZ) / 2);
  lawn.receiveShadow = true;
  lawn.userData.assemblyOrder = 0;     // grows first (gives a green ground)
  lawn.name = 'lawn_patch';
  group.add(lawn);

  // Helper: build a bottom-anchored item. Animating scale.y from 0 grows up.
  const addItem = (mesh, x, z, order) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.assemblyOrder = order;
    mesh.position.set(x, 0, z);   // y=0; geometry already anchored at bottom
    group.add(mesh);
    return mesh;
  };

  // Helper: round shrub (sphere stretched a bit, anchored at bottom)
  const bush = (radius) => {
    const geo = new THREE.SphereGeometry(radius, 10, 8);
    geo.scale(1, 1.1, 1);
    geo.translate(0, radius * 1.0, 0);
    const m = new THREE.Mesh(geo, bushMat());
    m.name = 'bush';
    return m;
  };

  // Helper: grass clump (small upright cylinder, narrower top)
  const grass = (radius, height) => {
    const geo = new THREE.CylinderGeometry(radius * 0.5, radius, height, 8);
    geo.translate(0, height / 2, 0);
    const m = new THREE.Mesh(geo, grassMat());
    m.name = 'grass';
    return m;
  };

  // ---- Plant placement ----
  // Group plants in clusters near the porch front and along the walkway sides,
  // matching the rendering. Order indices control the staggered grow reveal.
  const PORCH_FRONT_Z = porchFrontZ + 0.3;     // just outboard of porch deck

  // Three round shrubs along the porch front, left side
  addItem(bush(1.4), -W * 0.30, PORCH_FRONT_Z + 0.5, 1);
  addItem(bush(1.6), -W * 0.45, PORCH_FRONT_Z + 1.4, 1);
  addItem(bush(1.2), -W * 0.55, PORCH_FRONT_Z + 0.6, 2);

  // Round shrubs along the porch front, right side (porch wraps the door)
  addItem(bush(1.5),  W * 0.40, PORCH_FRONT_Z + 0.5, 1);
  addItem(bush(1.3),  W * 0.55, PORCH_FRONT_Z + 1.2, 2);

  // Grass clumps in the bed in front of the porch
  for (let i = 0; i < 8; i++) {
    const x = -W * 0.50 + (i / 7) * W * 1.05;
    const z = PORCH_FRONT_Z + 0.2 + (i % 2) * 0.4;
    // Skip if too close to a shrub
    addItem(grass(0.5 + Math.random() * 0.2, 1.0 + Math.random() * 0.4), x, z, 3);
  }

  // Walkway-side grass clumps
  for (const sx of [-1, +1]) {
    for (let i = 0; i < 4; i++) {
      const z = porchFrontZ + 1.5 + i * 2.5;
      const x = sx * (1.7 + Math.random() * 0.4);
      addItem(grass(0.5, 0.9 + Math.random() * 0.3), x, z, 4);
    }
  }

  // A larger shrub anchoring each far corner of the lawn patch
  addItem(bush(1.8), -W * 0.7, PORCH_FRONT_Z + 6, 5);
  addItem(bush(2.0),  W * 0.7, PORCH_FRONT_Z + 6, 5);

  return group;
}
