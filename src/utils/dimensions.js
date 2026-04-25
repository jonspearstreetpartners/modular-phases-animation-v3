// Dimension constants — single source of truth.
// 1 unit = 1 foot. Inches converted via INCH multiplier.
//
// v3 — Champion Homes 05-S30 MOD: 46'-0" × 15'-2", 3 BD 2 BT, two-story.
// Each story is a single module 15'-2" × 46'. Two modules stack vertically:
// LOWER (living/dining/kitchen) and UPPER (bedrooms/bath).
// No marriage wall — the modules are stacked, not joined side-by-side like v1.

export const FT = 1;
export const INCH = 1 / 12;

export const MODULE = {
  // Overall envelope (one floor / one module)
  width:  15 + (2 / 12),  // 15'-2" — short edge (X axis)
  length: 46,             // long edge / production-line direction (Z axis)
  // Floor-to-floor height is governed by wallHeight + structural depth, see below.

  // Floor system
  carrierBeamWidth:  6 * INCH,
  carrierBeamHeight: 8 * INCH,
  carrierBeamInset:  4,             // distance from outer wall to beam centerline
  rimJoistWidth:     2 * INCH,
  rimJoistHeight:   10 * INCH,
  joistWidth:        2 * INCH,
  joistHeight:      10 * INCH,
  joistSpacing:     16 * INCH,      // 16" O.C.
  subfloorThickness: 0.75 * INCH,

  // Wall framing
  wallHeight:        8.5,           // floor-to-top-plate (residential standard)
  studWidth:         2 * INCH,      // 2x6 nominal
  studDepth:         6 * INCH,
  studSpacing:      16 * INCH,
  bottomPlateHeight: 1.5 * INCH,
  topPlateHeight:    1.5 * INCH,    // single thickness; double top = 2 of these

  // Ceiling system (between floors of the stacked home; also closes off lower
  // module's ceiling so the stair opening can be a hole punched through it)
  ceilingThickness:  10 * INCH,     // floor joists + drywall sandwich

  // Roof — STEEPER, full-width gable. The peak runs LENGTH-wise (Z axis), so the
  // gable end faces forward (the long faces are the eaves). Matches the rendering.
  roofPitch:        9 / 12,         // ~37° — steeper than v1's 4:12
  trussSpacing:    24 * INCH,
  trussDepth:       1.5 * INCH,
  trussChordHeight: 3.5 * INCH,     // 2x4 chord/rafter member
};

// Computed: floor-to-floor stack offset for the upper module.
// Below the upper module's floor frame:
//   - lower module wall height (8.5)
//   - top plates (negligible, baked into wall height)
//   - ceiling assembly (10")
// We treat the lower module's wall plate top as the upper module's floor frame
// bottom, so stackY = subfloorTop_lower + wallHeight + ceilingThickness.
// Computed where used (avoids circular constants).
export function computeUpperStackY() {
  const lowerSubfloorTop = MODULE.joistHeight + MODULE.subfloorThickness;
  return lowerSubfloorTop + MODULE.wallHeight + MODULE.ceilingThickness;
}

// World placement — both modules built IN PARALLEL during stages 1-9, sitting
// side-by-side on the factory floor. Same staging as v1's duplex pair, but for
// v3 these represent lower-floor and upper-floor of a SINGLE two-story home
// that gets stacked together at the site stage.
//
// At factory time:
//   LOWER module: world x = -10..+5.17, center at x = -2.42  (left-of-center)
//   UPPER module: world x = +5.17..+20.34, center at x = +12.76 (right of LOWER)
// Gap of 4 ft between them so they're visibly distinct.
//
// At site time: LOWER stays at x=0, UPPER slides over and is craned ONTO it
// at the same x=0 but elevated by computeUpperStackY().
export const MODULE_GAP = 4;
const _half = MODULE.width / 2;

export const MODULE_LOWER = {
  side: 'lower',
  level: 0,
  factoryX: -(_half + MODULE_GAP / 2),     // sits left of center on factory floor
  // Compat shim so v1 stage code that reads `centerX` finds something sensible
  centerX: -(_half + MODULE_GAP / 2),
  marriageSign: +1,
};
export const MODULE_UPPER = {
  side: 'upper',
  level: 1,
  factoryX: +(_half + MODULE_GAP / 2),     // sits right of center on factory floor
  centerX: +(_half + MODULE_GAP / 2),
  marriageSign: -1,
};

// Half-width offset that v1's COMBINE_OFFSET used during the stage-10
// combine-then-separate moment. v3 doesn't combine on the factory floor (the
// modules stack at the site stage instead) so this is 0 — we keep the export
// for backward-compat with stages.js which still references it.
export const COMBINE_OFFSET = 0;
