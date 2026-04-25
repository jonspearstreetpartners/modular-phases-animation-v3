// Ground plane + optional architectural grid (toggleable, default on; fades in stage 6 later).
import * as THREE from 'three';
import { COLORS } from '../utils/colors.js';

export function buildGround(scene) {
  const geometry = new THREE.PlaneGeometry(200, 200);
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLORS.ground),
    roughness: 0.95,
    metalness: 0.0,
  });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  // Architectural grid overlay (drafting feel). Slightly above ground to avoid z-fight.
  const grid = new THREE.GridHelper(200, 100, COLORS.groundGrid, COLORS.groundGrid);
  grid.position.y = 0.01;
  grid.material.opacity = 0.35;
  grid.material.transparent = true;
  scene.add(grid);

  return { ground, grid };
}
