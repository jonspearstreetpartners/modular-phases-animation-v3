// Camera choreography (Phase 4). Animates the orthographic camera's orbit
// angle, elevation, and frustum size along the master timeline.
//
// All transforms route through a small `proxy` object so a single onUpdate
// handler keeps camera.position, lookAt, and ortho frustum in sync. This
// avoids per-property tween coordination problems and keeps the math
// (orbit = polar coordinates around origin) centralized.
//
// Choreography keyed to our 10-stage timing (~48.5 sec total):
//   0.0 – 5.5  Stage 1   slow zoom in: frustum 70 → 60 (wide → medium settle)
//   5.5 – 12   Stages 2–3  slight orbit clockwise + elevation rise (35 → 40)
//  12   – 22.5 Stages 4–5  continue orbit slowly during fixtures + wall framing
//  22.5 – 27.5 Stage 6    PUSH IN — frustum 60 → 50 to read MEP rough-in detail
//  27.5 – 31.5 Stage 7    pull back — frustum 50 → 60, settle elevation
//  31.5 – 37   Stage 8    static — let trusses drop in cleanly
//  37   – 42   Stage 9    orbit clockwise 10° during exterior reveal
//  42   – 48.5 Stage 10   wide hero pull-back: frustum 60 → 70 for the open-up

import * as THREE from 'three';
import { updateOrthoFrustum } from '../scene/camera.js';

/**
 * @param tl       master GSAP timeline
 * @param camera   the orthographic (or perspective) scene camera
 * @param renderer optional WebGLRenderer — when provided, camera frustum
 *                 follows the renderer's drawing-buffer size instead of
 *                 window.innerWidth. Required for MP4 export at a target
 *                 resolution different from the visible window.
 */
export function buildCameraAnimation(tl, camera, renderer = null) {
  // Capture starting state (set by buildOrthoCamera in main.js)
  const startDistance = Math.sqrt(
    camera.position.x ** 2 + camera.position.z ** 2,
  );
  const startAngle = Math.atan2(camera.position.z, camera.position.x);
  const startFrustum = camera.userData.frustumSize ?? 70;

  // Lookat target: ~6 ft above ground (mid-height of the assembled modules)
  const target = { x: 0, y: 6, z: 0 };

  // Proxy object — GSAP animates these scalars; a single onUpdate writes them
  // to the camera each frame.
  const proxy = {
    angle:       startAngle,        // radians, polar around Y
    distance:    startDistance,     // distance from Y axis
    elevation:   camera.position.y, // world Y of the camera
    frustumSize: startFrustum,      // ortho frustum size
  };

  const _size = new THREE.Vector2();
  const applyProxy = () => {
    camera.position.x = proxy.distance * Math.cos(proxy.angle);
    camera.position.z = proxy.distance * Math.sin(proxy.angle);
    camera.position.y = proxy.elevation;
    camera.lookAt(target.x, target.y, target.z);
    if (camera.isOrthographicCamera) {
      // Read render size from the renderer when available so MP4 export at a
      // different resolution doesn't distort the camera frustum.
      let w = window.innerWidth, h = window.innerHeight;
      if (renderer) { renderer.getSize(_size); w = _size.x; h = _size.y; }
      updateOrthoFrustum(camera, w, h, proxy.frustumSize);
    }
  };

  // Helper: register a tween that mutates proxy + reapplies to camera each frame.
  const move = (toState, atTime, duration, ease = 'sine.inOut') => {
    tl.to(proxy, {
      ...toState,
      duration,
      ease,
      onUpdate: applyProxy,
    }, atTime);
  };

  // Choreography
  // 0.0 – 5.5: settle from wide to medium (zoom in)
  move({ frustumSize: 60 }, 0.0, 5.5, 'power1.inOut');

  // 5.5 – 12: slight orbit (CW ~10°) + elevation rise from 35 → 40
  move({
    angle:     startAngle + 0.17,    // ~10° clockwise (in this coord system, +angle moves CW visually)
    elevation: 40,
  }, 5.5, 6.5);

  // 12 – 22.5: continue slow orbit through fixtures + wall framing
  move({ angle: startAngle + 0.26 }, 12.0, 10.5);

  // 22.5 – 27.5: PUSH IN for MEP rough-in detail
  move({ frustumSize: 50 }, 22.5, 5.0, 'power2.inOut');

  // 27.5 – 31.5: pull back, settle elevation
  move({ frustumSize: 60, elevation: 38 }, 27.5, 4.0, 'power2.inOut');

  // 31.5 – 37: static — no tween (let trusses drop cleanly)

  // 37 – 42: orbit clockwise during exterior reveal
  move({ angle: startAngle + 0.43 }, 37.0, 5.0);

  // 42 – 52: wide hero pull-back framing the open-up + combine/separate finale
  move({
    frustumSize: 70,
    elevation:   36,
  }, 42.0, 10.0, 'power1.inOut');
}
