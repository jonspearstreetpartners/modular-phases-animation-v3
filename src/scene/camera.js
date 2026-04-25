// Orthographic stylized-isometric camera per spec §3.
// Perspective alternative is exposed for later swap.
import * as THREE from 'three';

export function buildOrthoCamera(width, height, frustumSize = 60) {
  const aspect = width / height;
  const cam = new THREE.OrthographicCamera(
    (-frustumSize * aspect) / 2,
    ( frustumSize * aspect) / 2,
      frustumSize / 2,
     -frustumSize / 2,
    0.1,
    500,
  );
  cam.position.set(40, 35, 40);
  cam.lookAt(0, 0, 0);
  cam.userData.frustumSize = frustumSize;
  return cam;
}

export function buildPerspectiveCamera(width, height, fov = 28) {
  const cam = new THREE.PerspectiveCamera(fov, width / height, 0.1, 500);
  cam.position.set(60, 50, 60);
  cam.lookAt(0, 0, 0);
  return cam;
}

// Minimum horizontal extent (world units) required to fit the duplex module pair
// (~28 ft wide) plus margin. On narrow/portrait screens, frustum scales UP so
// horizontal extent stays at MIN — keeps the choreography intact while ensuring
// geometry never clips off-screen.
const MIN_HORIZONTAL_EXTENT = 50;

// Re-apply ortho frustum after a resize OR a frustumSize change (camera animation).
export function updateOrthoFrustum(cam, width, height, frustumSize) {
  const aspect = width / height;
  let effective = frustumSize;
  if (frustumSize * aspect < MIN_HORIZONTAL_EXTENT) {
    effective = MIN_HORIZONTAL_EXTENT / aspect;
  }
  cam.left   = (-effective * aspect) / 2;
  cam.right  = ( effective * aspect) / 2;
  cam.top    =   effective / 2;
  cam.bottom =  -effective / 2;
  // Store the AUTHORED frustumSize (not effective) so camera animation
  // continues to interpolate in the original choreographed range.
  cam.userData.frustumSize = frustumSize;
  cam.updateProjectionMatrix();
}
