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
import { MODULE, INCH } from '../utils/dimensions.js';

const framingMat = () => shared('framing', () => matte(COLORS.framing));
const drywallMat = () => shared('drywall', () => matte(COLORS.drywall));
// Roof decking — plywood/OSB sheathing on top of rafters, sandwiched between
// the framing and the shingle slabs. Same color as exterior wall sheathing
// (a warm OSB tan) so the two layers read as the same material.
const deckingMat = () => shared('decking', () => matte('#A88E66', { roughness: 0.9 }));

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

  // Ceiling drywall — a flat panel covering the full module footprint at the
  // top-of-walls plane (y = y0). Per user request, the truss assembly ships
  // pre-finished with ceiling drywall already attached, so the entire
  // roof+ceiling unit lowers as one piece in Stage 8 (no per-truss drop).
  // Sits a hair below the bottom chords so the seam reads as drywall stuck
  // to the underside of the chord.
  {
    const dwT = 0.5 * INCH;
    const ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(W, dwT, L),
      drywallMat(),
    );
    ceiling.position.set(0, y0 - dwT / 2, 0);
    ceiling.receiveShadow = true;
    ceiling.name = 'ceiling_drywall';
    staticGroup.add(ceiling);
  }

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

  // --- Roof decking + shingle slabs, one each per pitch face ----------------
  // Stack from bottom up:   rafters → decking (OSB) → shingle slab.
  // Decking installs in Stage 8 (after the truss assembly settles) and the
  // shingles arrive in Stage 9. Both share the same eave-anchored geometry
  // pattern as the rafters so rotation.z = rafterAngle slopes them up the
  // pitch.
  const slabMat = shared('shingle', () => shingle());
  const deckT   = 0.05;            // ~5/8 in plywood/OSB
  const slabT   = 0.08;            // shingle layer

  const buildDeck = (rotZ, name) => {
    const geo = new THREE.BoxGeometry(rafterLen, deckT, L * 1.04);
    geo.translate(rafterLen / 2, 0, 0);              // anchor at -X end (eave)
    geo.translate(0, chordH + deckT / 2, 0);         // sit just on top of rafter
    const deck = new THREE.Mesh(geo, deckingMat());
    deck.position.set(0, chordH, 0);
    deck.rotation.z = rotZ;
    deck.castShadow = deck.receiveShadow = true;
    deck.name = name;
    return deck;
  };

  // Tiny gap between deck top face and slab bottom face — they otherwise
  // share an identical Y in geometry-local coords and end up coincident
  // after the rotZ rotation, which Z-fights badly and lets the deck's tan
  // show through the shingles. ~1/8 in is enough to win cleanly.
  const SLAB_GAP = 0.01;

  const buildSlab = (rotZ, name) => {
    const geo = new THREE.BoxGeometry(rafterLen, slabT, L * 1.04);
    geo.translate(rafterLen / 2, 0, 0);
    geo.translate(0, chordH + deckT + SLAB_GAP + slabT / 2, 0);
    const slab = new THREE.Mesh(geo, slabMat);
    slab.position.set(0, chordH, 0);
    slab.rotation.z = rotZ;
    slab.castShadow = slab.receiveShadow = true;
    slab.name = name;
    return slab;
  };

  hingeWest.add(buildDeck(+rafterAngle,            'roof_deck_west'));
  hingeWest.add(buildSlab(+rafterAngle,            'roof_slab_west'));
  hingeEast.add(buildDeck(Math.PI - rafterAngle,   'roof_deck_east'));
  hingeEast.add(buildSlab(Math.PI - rafterAngle,   'roof_slab_east'));

  // --- GABLE-END WALLS (triangular fills closing off +Z and -Z gable ends) ---
  // Without these, the front and back of the gable have empty triangles between
  // the wall plate and the roof peak, exposing the interior. Built as
  // ExtrudeGeometry from a 2D triangle, painted with the siding color so they
  // read as continuous wall cladding. They live in their own group (always
  // visible — not part of the truss-hide pass at end of Stage 9, and not
  // part of the rafter hinges that fold during transport).
  const gableMat = shared('gable_siding', () => matte(COLORS.siding, { roughness: 0.65 }));
  const gables = new THREE.Group();
  gables.name = 'Roof_gables';

  const tri = new THREE.Shape();
  tri.moveTo(-W / 2, 0);
  tri.lineTo(+W / 2, 0);
  tri.lineTo(0, rise);
  tri.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.08, bevelEnabled: false });
  gableGeo.translate(0, 0, -0.04);    // center the extrusion's depth on z=0

  for (const sign of [-1, +1]) {
    const fill = new THREE.Mesh(gableGeo.clone(), gableMat);
    fill.position.set(0, y0 + chordH, sign * (L / 2));
    fill.castShadow = fill.receiveShadow = true;
    fill.name = `gable_${sign > 0 ? 'south' : 'north'}`;
    gables.add(fill);
  }
  root.add(gables);

  return root;
}
