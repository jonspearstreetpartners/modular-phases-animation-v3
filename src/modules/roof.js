// Roof framing — half-pitch trusses for one module.
// When module A and module B are joined at the marriage wall, their two half-pitches
// form a complete gabled roof. Each truss = bottom chord + sloped rafter + vertical
// web at the marriage-wall end.
//
// Truss local space:
//   - Plane: XY (depth = trussDepth in Z)
//   - Bottom chord centered on local origin (so x: -W/2..+W/2)
//   - Local Y=0 is the underside of the bottom chord (which sits on the wall top plate)

import * as THREE from 'three';
import { COLORS } from '../utils/colors.js';
import { matte, shared, shingle } from '../utils/materials.js';
import { MODULE } from '../utils/dimensions.js';

const framingMat = () => shared('framing', () => matte(COLORS.framing));

/**
 * Build one half-pitch truss spanning the module width.
 * @param {object} opts
 * @param {number} [opts.width]  module width (= chord length)
 * @param {'A'|'B'} [opts.side]  which module — controls which side rises to the marriage wall.
 *                                 A: marriage wall at +X (right), so rafter rises left→right
 *                                 B: marriage wall at -X (left),  so rafter rises right→left
 */
export function buildHalfTruss({ width = MODULE.width, side = 'A' } = {}) {
  const group = new THREE.Group();
  group.name = `HalfTruss_${side}`;

  const chordH = MODULE.trussChordHeight;
  const dep    = MODULE.trussDepth;
  const rise   = width * MODULE.roofPitch;        // 4:12 over `width` -> width*4/12

  const marriageSign = side === 'A' ? +1 : -1;    // which X-side is the high end

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

  // --- Rafter (sloped top) ---
  // From low end at outer wall to high end at marriage wall.
  const lowX  = -marriageSign * (width / 2);
  const highX =  marriageSign * (width / 2);
  const lowY  = chordH;
  const highY = chordH + rise;

  const dx = highX - lowX;
  const dy = highY - lowY;
  const rafterLen = Math.sqrt(dx * dx + dy * dy);
  const rafterAngle = Math.atan2(dy, dx);

  // Offset the rafter perpendicular to its length so its bottom edge sits ON the slope line
  // rather than the rafter being centered on the line. Perp-up = (-sin, cos).
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
  rafter.name = 'rafter';
  group.add(rafter);

  // --- Vertical web at the marriage-wall end (the tall end) ---
  const webH = rise;
  const webX = highX - marriageSign * (chordH / 2);  // inset slightly from the very edge
  const web = new THREE.Mesh(
    new THREE.BoxGeometry(chordH, webH, dep),
    framingMat(),
  );
  web.position.set(webX, chordH + webH / 2, 0);
  web.castShadow = true;
  web.receiveShadow = true;
  web.name = 'web_marriage';
  group.add(web);

  group.userData.side = side;
  group.userData.rise = rise;
  return group;
}

/**
 * Build all roof trusses + shingle slab for ONE module, wrapped in a HINGE
 * GROUP whose origin sits at the OUTER WALL TOP EDGE (the eave). Rotating the
 * hinge group around its local Z axis lowers the roof — used in Stage 11 outro
 * to fold the roof flat for transport.
 *
 * Hierarchy:
 *   Roof_<side>                  (group at module-local origin, kept for compat)
 *     Roof_<side>_hinge          (group at the eave — animate rotation.z to lower)
 *       truss_<side>_0..N        (each half-truss positioned along Z)
 *       roof_slab                (the shingle slab, hinges with the trusses)
 */
export function buildModuleRoof({ side = 'A' } = {}) {
  const group = new THREE.Group();
  group.name = `Roof_${side}`;
  group.userData.side = side;

  const L  = MODULE.length;
  const W  = MODULE.width;
  const sp = MODULE.trussSpacing;
  const y0 = MODULE.joistHeight + MODULE.subfloorThickness + MODULE.wallHeight;

  // Hinge sits at the OUTER wall edge of this module (opposite the marriage wall).
  // Module A's outer is -X; Module B's outer is +X.
  const hingeSign = side === 'A' ? -1 : +1;
  const hingeX    = hingeSign * (W / 2);
  const hingeY    = y0;

  const hinge = new THREE.Group();
  hinge.name = `Roof_${side}_hinge`;
  hinge.userData.side      = side;
  hinge.userData.hingeSign = hingeSign;     // rotation sign that lowers the roof
  hinge.position.set(hingeX, hingeY, 0);
  group.add(hinge);

  // ---- Trusses, positioned in hinge-relative coordinates ----
  // Original module-local position: (0, y0, z). Hinge-relative = (-hingeX, 0, z).
  const innerL   = L - MODULE.studDepth * 2;
  const intervals = Math.round(innerL / sp);
  const actualSp  = innerL / intervals;
  for (let i = 0; i <= intervals; i++) {
    const z = -innerL / 2 + i * actualSp;
    const truss = buildHalfTruss({ width: W, side });
    truss.position.set(-hingeX, 0, z);
    truss.name = `truss_${side}_${i}`;
    hinge.add(truss);
  }

  // ---- Shingle slab on top of the rafters (moved here from exterior.js so it
  //      hinges with the trusses). Slope from low (outer eave) to high (marriage).
  const marriageSign = side === 'A' ? +1 : -1;
  const rise = W * MODULE.roofPitch;
  const lowX  = -marriageSign * (W / 2);
  const highX =  marriageSign * (W / 2);
  const slopeLen = Math.sqrt(W * W + rise * rise);
  const slopeAngle = Math.atan2(rise, W * marriageSign);
  // Slab center in module-local coords; offset perpendicular so its bottom face
  // sits flush on the rafter top.
  const midXmod = (lowX + highX) / 2 - 0.05 * Math.sin(slopeAngle);
  const midYmod = y0 + rise / 2 + 0.05 * Math.cos(slopeAngle);
  // Convert to hinge-relative
  const slabX = midXmod - hingeX;
  const slabY = midYmod - hingeY;

  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(slopeLen, 0.08, L * 1.04),
    shingle(),
  );
  slab.position.set(slabX, slabY, 0);
  slab.rotation.z = slopeAngle;
  slab.castShadow = true;
  slab.receiveShadow = true;
  slab.name = 'roof_slab';
  hinge.add(slab);

  return group;
}
