// Site-work intro section — two parallel utility trenches with pipes
// (sewer + water) running OUT from where the home will sit. Built at the
// site location (SITE_X, 0, 0) so the same camera lookAt that frames the
// foundation in Section 2 frames the trenches in Section 1 too.
//
// Hierarchy (Group "Sitework"):
//   trench_sewer        — recessed dirt trough (BoxGeometry, dark dirt)
//   pipe_sewer          — cylinder running along the trench
//   cover_sewer         — dirt fill that scales up to bury the pipe
//   trench_water        — second parallel trough
//   pipe_water          — second cylinder
//   cover_water         — second fill
//
// Each piece has userData.role = 'trench' | 'pipe' | 'cover' so the
// stageSiteWork animation in stages.js can drive the dig → lay → cover
// sequence in the correct order.

import * as THREE from 'three';
import { matte, shared } from '../utils/materials.js';

// Materials shared with the foundation crawl-space dirt + plumbing pipe
// elsewhere so the colors stay consistent.
const dirtMat        = () => shared('dirt',         () => matte('#7E6F5A', { roughness: 1.0 }));
const dirtFillMat    = () => shared('dirt_fill',    () => matte('#8E7B62', { roughness: 1.0 }));
const sewerPipeMat   = () => shared('pipe_sewer',   () => matte('#3F4046', { roughness: 0.5 }));
const waterPipeMat   = () => shared('pipe_water',   () => matte('#9DB7C9', { roughness: 0.4, metalness: 0.2 }));

export function buildSitework() {
  const group = new THREE.Group();
  group.name = 'Sitework';

  // Trench geometry — runs along the X axis (perpendicular to the
  // foundation's long Z axis), exiting east of the home toward the
  // street where the utility main connections live.
  const TRENCH_LEN     = 22;
  const TRENCH_WIDTH   = 1.6;
  const TRENCH_DEPTH   = 0.6;
  const PIPE_RADIUS_S  = 0.32;     // sewer (larger)
  const PIPE_RADIUS_W  = 0.18;     // water (smaller)
  const PIPE_LEN       = TRENCH_LEN - 1.0;     // pipe is slightly shorter
  const TRENCH_GAP     = 3.0;      // perpendicular spacing between trenches

  // Place trenches on the +X side of the foundation (east), running outward
  // along +X. Sewer trench north (-Z), water trench south (+Z) — but both
  // visible in the iso frame.
  // The TRENCH "x" position is the trench's CENTER along X. Geometry has
  // its long axis along X.
  const TRENCH_CENTER_X = -10;     // center of trench in scene-local X (will
                                   // be offset by Sitework group position)
  const TRENCH_Z_SEWER  = -TRENCH_GAP / 2;
  const TRENCH_Z_WATER  = +TRENCH_GAP / 2;

  // Helper — one trench + pipe + cover triple along z=zOff.
  const buildTrenchTriple = (zOff, pipeMat, pipeRadius, namePrefix) => {
    // 1) Trench (recessed dirt rectangle). Sits with its TOP face at y=0
    //    and bottom at y=-TRENCH_DEPTH so it reads as a hole in the ground.
    //    Animated: scale.y from 0 -> 1 to "dig" the trench down.
    const trenchGeo = new THREE.BoxGeometry(TRENCH_LEN, TRENCH_DEPTH, TRENCH_WIDTH);
    trenchGeo.translate(0, -TRENCH_DEPTH / 2, 0);     // pivot at the top face (ground level)
    const trench = new THREE.Mesh(trenchGeo, dirtMat());
    trench.position.set(TRENCH_CENTER_X, 0.001, zOff);   // hair above ground to avoid Z-fight
    trench.receiveShadow = true;
    trench.userData.role = 'trench';
    trench.name = `${namePrefix}_trench`;
    group.add(trench);

    // 2) Pipe (cylinder, oriented along world X). Sits halfway down the
    //    trench. End-anchored along its X axis so the lay-in animation
    //    can scale.x from 0 -> 1 to draw the pipe into the trench from
    //    one end (the street side).
    const pipeGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, PIPE_LEN, 16);
    pipeGeo.rotateZ(Math.PI / 2);                     // length along world X
    pipeGeo.translate(PIPE_LEN / 2, 0, 0);            // origin at -X end
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    pipe.position.set(TRENCH_CENTER_X - PIPE_LEN / 2, -TRENCH_DEPTH / 2, zOff);
    pipe.castShadow = pipe.receiveShadow = true;
    pipe.userData.role = 'pipe';
    pipe.name = `${namePrefix}_pipe`;
    group.add(pipe);

    // 3) Dirt cover — same footprint as the trench but slightly above
    //    ground so it visibly buries the trench when scaled up. Anchored
    //    at the bottom face so scale.y grows it from y=0 upward (the
    //    "fill" reads as dirt being shoveled in).
    const coverGeo = new THREE.BoxGeometry(TRENCH_LEN, TRENCH_DEPTH * 1.05, TRENCH_WIDTH * 1.02);
    coverGeo.translate(0, TRENCH_DEPTH * 1.05 / 2, 0);    // pivot at bottom face (y=0)
    const cover = new THREE.Mesh(coverGeo, dirtFillMat());
    cover.position.set(TRENCH_CENTER_X, -TRENCH_DEPTH * 1.04, zOff);  // start just below ground; scale.y up to ground
    cover.castShadow = cover.receiveShadow = true;
    cover.userData.role = 'cover';
    cover.name = `${namePrefix}_cover`;
    group.add(cover);
  };

  buildTrenchTriple(TRENCH_Z_SEWER, sewerPipeMat(), PIPE_RADIUS_S, 'sewer');
  buildTrenchTriple(TRENCH_Z_WATER, waterPipeMat(), PIPE_RADIUS_W, 'water');

  return group;
}
