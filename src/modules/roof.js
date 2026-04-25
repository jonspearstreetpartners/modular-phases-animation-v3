// Roof framing — FULL gable spanning module width, with the peak running along
// the LENGTH (Z axis). Gable end faces forward (matches the v3 rendering's
// front-facing gable). Each truss is a triangle: bottom chord + two rafters
// meeting at a peak above the module centerline + king-post web.
//
// Truss local space:
//   - Plane: XY (depth = trussDepth in Z)
//   - Bottom chord centered on local origin (so x: -W/2..+W/2)
//   - Local Y=0 is the underside of the bottom chord (sits on wall top plate)
//   - Peak at local x=0, y=chordH+rise
//
// v3 NOTE: roof attaches only to the UPPER stacked module. The lower module
// has a flat ceiling assembly instead (see floor.js).

import * as THREE from 'three';
import { COLORS } from '../utils/colors.js';
import { matte, shared, shingle } from '../utils/materials.js';
import { MODULE } from '../utils/dimensions.js';

const framingMat = () => shared('framing', () => matte(COLORS.framing));

/**
 * Build one full gable truss — bottom chord + two sloped rafters meeting at the
 * centerline peak + king-post web at the centerline.
 */
export function buildGableTruss({ width = MODULE.width } = {}) {
  const group = new THREE.Group();
  group.name = 'GableTruss';

  const chordH = MODULE.trussChordHeight;
  const dep    = MODULE.trussDepth;
  const rise   = (width / 2) * MODULE.roofPitch;     // pitch over the run (half-width)

  // --- Bottom chord (horizontal, full width) ---
  const bottomChord = new THREE.Mesh(
    new THREE.BoxGeometry(width, chordH, dep),
    framingMat(),
  );
  bottomChord.position.set(0, chordH / 2, 0);
  bottomChord.castShadow = true;
  bottomChord.receiveShadow = true;
  bottomChord.name = 'bottomChord';
  group.add(bottomChord);

  // --- Two sloped rafters meeting at the centerline peak ---
  // Rafter geometry: build a horizontal box of length = slopeLen and rotate around Z.
  for (const sign of [-1, +1]) {
    const lowX  = sign * (width / 2);
    const highX = 0;
    const lowY  = chordH;
    const highY = chordH + rise;

    const dx = highX - lowX;
    const dy = highY - lowY;
    const rafterLen = Math.sqrt(dx * dx + dy * dy);
    const rafterAngle = Math.atan2(dy, dx);

    // Offset the rafter perpendicular to its length so its BOTTOM face sits
    // flush on the chord/peak line rather than centered on it.
    const perpX = -Math.sin(rafterAngle);
    const perpY =  Math.cos(rafterAngle);
    const midX = (lowX + highX) / 2 + (chordH / 2) * perpX;
    const midY = (lowY + highY) / 2 + (chordH / 2) * perpY;

    const rafter = new THREE.Mesh(
      new THREE.BoxGeometry(rafterLen, chordH, dep),
      framingMat(),
    );
    rafter.position.set(midX, midY, 0);
    rafter.rotation.z = rafterAngle;
    rafter.castShadow = true;
    rafter.receiveShadow = true;
    rafter.name = `rafter_${sign > 0 ? 'east' : 'west'}`;
    group.add(rafter);
  }

  // --- King-post web at the centerline (vertical post from chord to peak) ---
  const webH = rise;
  const web = new THREE.Mesh(
    new THREE.BoxGeometry(chordH, webH, dep),
    framingMat(),
  );
  web.position.set(0, chordH + webH / 2, 0);
  web.castShadow = true;
  web.receiveShadow = true;
  web.name = 'web_kingpost';
  group.add(web);

  group.userData.rise = rise;
  return group;
}

/**
 * Build all gable trusses + two roofing slabs for ONE module, wrapped in a
 * HINGE GROUP whose origin sits at one EAVE (the long edge of the module on
 * the -X side). Rotating the hinge group around its Z axis lowers the entire
 * roof flat for transport (Stage 11 in v1; will be reused in v3 transport stage).
 *
 * Hierarchy:
 *   Roof                          (module-local container)
 *     Roof_hinge                  (origin at the -X eave; rotates Z to fold roof)
 *       truss_<i>                 (gable trusses along the length)
 *       roof_slab_west / east     (the two shingle slabs, hinge with the trusses)
 *
 * v3: side parameter retained for future per-module customization but is
 * unused in the geometry — single-module home, no marriage wall.
 */
export function buildModuleRoof({ side = 'roof' } = {}) {
  const group = new THREE.Group();
  group.name = 'Roof';
  group.userData.side = side;

  const L  = MODULE.length;
  const W  = MODULE.width;
  const sp = MODULE.trussSpacing;
  const y0 = MODULE.joistHeight + MODULE.subfloorThickness + MODULE.wallHeight;

  // Hinge sits at one eave (the -X long edge). When the hinge rotates around
  // its local Z axis by +PITCH_ANGLE the entire roof flops flat in the +X
  // direction (good for transport). Animation stays the same as v1's hinge.
  const hingeSign = -1;
  const hingeX    = hingeSign * (W / 2);
  const hingeY    = y0;

  const hinge = new THREE.Group();
  hinge.name = 'Roof_hinge';
  hinge.userData.hingeSign = hingeSign;
  hinge.position.set(hingeX, hingeY, 0);
  group.add(hinge);

  // ---- Trusses along the length (Z axis), positioned in hinge-relative coords ----
  const innerL   = L - MODULE.studDepth * 2;
  const intervals = Math.round(innerL / sp);
  const actualSp  = innerL / intervals;
  for (let i = 0; i <= intervals; i++) {
    const z = -innerL / 2 + i * actualSp;
    const truss = buildGableTruss({ width: W });
    truss.position.set(-hingeX, 0, z);
    truss.name = `truss_${i}`;
    hinge.add(truss);
  }

  // ---- Two roofing slabs (one per pitched face). Each slab covers half the
  //      gable: from centerline-peak down to one eave. Slab `west` covers the
  //      -X face; slab `east` covers the +X face.
  const rise = (W / 2) * MODULE.roofPitch;
  const slopeLen = Math.sqrt((W / 2) * (W / 2) + rise * rise);

  for (const sign of [-1, +1]) {
    // Slope angle: from peak (high) at x=0 down to eave (low) at x=±W/2.
    // For sign=+1 (east face): slope runs +X downward, so dx>0, dy<0 → angle<0.
    // For sign=-1 (west face): slope runs -X downward, so dx<0, dy<0 → angle>π/2.
    const lowX  = sign * (W / 2);
    const highX = 0;
    const lowY  = MODULE.trussChordHeight;
    const highY = MODULE.trussChordHeight + rise;
    const angle = Math.atan2(highY - lowY, highX - lowX);

    // Slab center in module-local coords (at chord-top origin), offset perpendicular
    // so the slab's bottom face sits flush on the rafter top edge.
    const perpX = -Math.sin(angle);
    const perpY =  Math.cos(angle);
    const localMidX = (lowX + highX) / 2 + (MODULE.trussChordHeight / 2) * perpX;
    const localMidY = (lowY + highY) / 2 + (MODULE.trussChordHeight / 2) * perpY;

    // Module-local → hinge-local conversion (hinge is at (hingeX, y0))
    const slabX = localMidX - hingeX;
    const slabY = localMidY + (y0 - y0);    // y0 cancels because both are at chord-base

    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(slopeLen, 0.08, L * 1.04),
      shared('shingle', () => shingle()),
    );
    slab.position.set(slabX, slabY, 0);
    slab.rotation.z = angle;
    slab.castShadow = true;
    slab.receiveShadow = true;
    slab.name = `roof_slab_${sign > 0 ? 'east' : 'west'}`;
    hinge.add(slab);
  }

  // ---- Two GABLE-END walls (closing off the open Z ends of the gable).
  //      These are simple triangular plates filling the trussed-out gable shape.
  //      Built as box geometries with vertices manipulated, but simpler: use
  //      a long thin box approximating the wedge. For this pass, use a flat
  //      vertical wall slab on each end with the gable triangle painted on by
  //      virtue of its shape — actually we'll skip this for commit 1 and add
  //      proper gable-end framing in a later pass.

  return group;
}
