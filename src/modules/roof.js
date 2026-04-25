// Roof framing — FULL gable spanning module width, with the peak running along
// the LENGTH (Z axis). Gable end faces forward (matches the v3 rendering's
// front-facing gable).
//
// v3 STRUCTURE: the roof is split into THREE groups so the two pitch faces
// can fold INDIVIDUALLY for transport (matches real modular factory practice
// where each rafter is hinged at the eave and folds down onto the bottom
// chord, rather than the entire roof tipping to one side):
//
//   Roof
//     Roof_static       — bottom chords (one per truss spacing) + king posts.
//                         Stays bolted to the wall plate; doesn't move.
//     Roof_hinge_west   — pivots at the -X eave. Contains west rafters + west
//                         shingle slab. Rotating around its local Z axis folds
//                         the west pitch DOWN inward onto the static chords.
//     Roof_hinge_east   — pivots at the +X eave. Contains east rafters + east
//                         shingle slab. Folds DOWN inward in the opposite
//                         direction.
//
// To fold flat for transport:
//   Roof_hinge_west.rotation.z = -rafterAngle   (slope up→horizontal inward)
//   Roof_hinge_east.rotation.z = +rafterAngle
//
// rafterAngle = atan2(rise, W/2), where rise = (W/2) * MODULE.roofPitch.

import * as THREE from 'three';
import { COLORS } from '../utils/colors.js';
import { matte, shared, shingle } from '../utils/materials.js';
import { MODULE } from '../utils/dimensions.js';

const framingMat = () => shared('framing', () => matte(COLORS.framing));

/**
 * Build all roof framing + shingle slabs for the module, split across the
 * three groups described above so two rafter hinges can fold independently.
 *
 * @param {object} opts
 * @param {string} [opts.side]  retained for v1 compat; unused in v3 (single
 *                              full-gable roof, no marriage wall).
 */
export function buildModuleRoof({ side = 'roof' } = {}) {
  const root = new THREE.Group();
  root.name = 'Roof';
  root.userData.side = side;

  const L  = MODULE.length;
  const W  = MODULE.width;
  const sp = MODULE.trussSpacing;
  const y0 = MODULE.joistHeight + MODULE.subfloorThickness + MODULE.wallHeight;

  const chordH   = MODULE.trussChordHeight;
  const trussDep = MODULE.trussDepth;
  const rise        = (W / 2) * MODULE.roofPitch;
  const rafterLen   = Math.sqrt((W / 2) * (W / 2) + rise * rise);
  const rafterAngle = Math.atan2(rise, W / 2);     // angle of the SLOPE off horizontal

  // --- Three sub-groups ---------------------------------------------------
  const staticGroup = new THREE.Group();
  staticGroup.name = 'Roof_static';
  root.add(staticGroup);

  const hingeWest = new THREE.Group();
  hingeWest.name = 'Roof_hinge_west';
  hingeWest.userData.foldSign = -1;                // rotation.z to fold flat
  hingeWest.userData.foldAngle = rafterAngle;
  hingeWest.position.set(-W / 2, y0, 0);            // pivot at the -X eave
  root.add(hingeWest);

  const hingeEast = new THREE.Group();
  hingeEast.name = 'Roof_hinge_east';
  hingeEast.userData.foldSign = +1;
  hingeEast.userData.foldAngle = rafterAngle;
  hingeEast.position.set(+W / 2, y0, 0);            // pivot at the +X eave
  root.add(hingeEast);

  // --- Per-truss spacing along Z ------------------------------------------
  const innerL    = L - MODULE.studDepth * 2;
  const intervals = Math.round(innerL / sp);
  const actualSp  = innerL / intervals;

  for (let i = 0; i <= intervals; i++) {
    const z = -innerL / 2 + i * actualSp;

    // ---- Bottom chord (full width, sits on wall plate) → STATIC ----
    const chord = new THREE.Mesh(
      new THREE.BoxGeometry(W, chordH, trussDep),
      framingMat(),
    );
    chord.position.set(0, y0 + chordH / 2, z);
    chord.castShadow = chord.receiveShadow = true;
    chord.name = `chord_${i}`;
    chord.userData.trussIndex = i;
    staticGroup.add(chord);

    // ---- King-post web (vertical center post) → STATIC ----
    const web = new THREE.Mesh(
      new THREE.BoxGeometry(chordH, rise, trussDep),
      framingMat(),
    );
    web.position.set(0, y0 + chordH + rise / 2, z);
    web.castShadow = web.receiveShadow = true;
    web.name = `kingpost_${i}`;
    web.userData.trussIndex = i;
    staticGroup.add(web);

    // ---- West rafter → WEST HINGE (hinge-local coords) ----
    // In the west hinge's local frame: pivot at (0, 0), rafter slopes up and
    // to the right ending at peak (W/2, rise). Build the rafter as a
    // horizontal box, anchor its origin at the -X end via geometry translate,
    // then rotate by +rafterAngle so it points up-the-slope.
    {
      const geo = new THREE.BoxGeometry(rafterLen, chordH, trussDep);
      geo.translate(rafterLen / 2, 0, 0);   // pivot at -X end
      // Offset perpendicular so the rafter's bottom face sits flush on the
      // chord/peak line (rather than centered on it).
      geo.translate(0, chordH / 2, 0);

      const m = new THREE.Mesh(geo, framingMat());
      m.position.set(0, chordH, z);          // sit atop the chord
      m.rotation.z = +rafterAngle;
      m.castShadow = m.receiveShadow = true;
      m.name = `rafter_west_${i}`;
      m.userData.trussIndex = i;
      hingeWest.add(m);
    }

    // ---- East rafter → EAST HINGE (hinge-local coords) ----
    // East hinge pivot at (+W/2, y0). Local +X is still world +X. The rafter
    // extends from pivot toward -X (inward) and up. Build as horizontal box
    // anchored at -X end via geometry translate, then rotate by π - rafterAngle.
    {
      const geo = new THREE.BoxGeometry(rafterLen, chordH, trussDep);
      geo.translate(rafterLen / 2, 0, 0);
      geo.translate(0, chordH / 2, 0);

      const m = new THREE.Mesh(geo, framingMat());
      m.position.set(0, chordH, z);
      m.rotation.z = Math.PI - rafterAngle;
      m.castShadow = m.receiveShadow = true;
      m.name = `rafter_east_${i}`;
      m.userData.trussIndex = i;
      hingeEast.add(m);
    }
  }

  // --- Two shingle slabs, one per pitch face, attached to matching hinge --
  // Each slab covers from peak down to one eave. We build it once in the same
  // local-frame convention used for the rafters (anchored at eave end, sloping
  // up to peak via rotation.z).
  const slabMat = shared('shingle', () => shingle());

  // West slab → WEST HINGE
  {
    const geo = new THREE.BoxGeometry(rafterLen, 0.08, L * 1.04);
    geo.translate(rafterLen / 2, 0, 0);              // anchor at -X end
    geo.translate(0, chordH + 0.08 / 2, 0);          // sit on top of rafter
    const slab = new THREE.Mesh(geo, slabMat);
    slab.position.set(0, chordH, 0);
    slab.rotation.z = +rafterAngle;
    slab.castShadow = slab.receiveShadow = true;
    slab.name = 'roof_slab_west';
    hingeWest.add(slab);
  }

  // East slab → EAST HINGE
  {
    const geo = new THREE.BoxGeometry(rafterLen, 0.08, L * 1.04);
    geo.translate(rafterLen / 2, 0, 0);
    geo.translate(0, chordH + 0.08 / 2, 0);
    const slab = new THREE.Mesh(geo, slabMat);
    slab.position.set(0, chordH, 0);
    slab.rotation.z = Math.PI - rafterAngle;
    slab.castShadow = slab.receiveShadow = true;
    slab.name = 'roof_slab_east';
    hingeEast.add(slab);
  }

  return root;
}
