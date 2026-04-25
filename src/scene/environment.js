// Background only (renderer clear color). Body has the actual gradient.
// Three's clear color sits behind the canvas; we keep it transparent so the
// body's CSS gradient shows through.
import * as THREE from 'three';

export function configureRenderer(renderer) {
  renderer.setClearColor(0x000000, 0); // transparent — let CSS gradient show
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
}
