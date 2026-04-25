// 3-point lighting per spec §3 — hemisphere fill + directional key + opposite fill.
import * as THREE from 'three';

export function buildLighting(scene) {
  // Hemisphere ambient
  const hemi = new THREE.HemisphereLight(0xFFFFFF, 0xE8E8E8, 0.6);
  hemi.position.set(0, 100, 0);
  scene.add(hemi);

  // Directional key light w/ soft shadows
  const key = new THREE.DirectionalLight(0xFFFFFF, 1.2);
  key.position.set(50, 80, 30);
  key.castShadow = true;
  // Halve shadow-map resolution on small/mobile screens to keep mobile GPUs happy.
  const shadowRes = window.matchMedia('(max-width: 768px)').matches ? 1024 : 2048;
  key.shadow.mapSize.set(shadowRes, shadowRes);
  key.shadow.camera.left = -50;
  key.shadow.camera.right = 50;
  key.shadow.camera.top = 50;
  key.shadow.camera.bottom = -50;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 200;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  // Opposite fill, no shadow
  const fill = new THREE.DirectionalLight(0xFFFFFF, 0.3);
  fill.position.set(-40, 40, -20);
  scene.add(fill);

  return { hemi, key, fill };
}
