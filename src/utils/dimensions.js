// Dimension constants — single source of truth.
// 1 unit = 1 foot. Inches converted via INCH multiplier.

export const FT = 1;
export const INCH = 1 / 12;

export const MODULE = {
  // Overall envelope (single module)
  width:  14,    // X axis (short edge)
  length: 44,    // Z axis (long edge — production line direction)
  height: 13.5,  // Y axis (top of roof from floor frame top)

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
  wallHeight:        9,             // floor-to-top-plate
  studWidth:         2 * INCH,      // 2x6 nominal
  studDepth:         6 * INCH,
  studSpacing:      16 * INCH,
  bottomPlateHeight: 1.5 * INCH,
  topPlateHeight:    1.5 * INCH,    // single thickness; double top = 2 of these

  // Roof
  roofPitch:        4 / 12,         // 4:12 — modest, looks clean from iso angle
  trussSpacing:    24 * INCH,
  trussDepth:       1.5 * INCH,     // 2x lumber laid flat
  trussChordHeight: 3.5 * INCH,     // 2x4 chord/rafter member
};

// Module placement in world space.
// Two modules built separately and transported separately — they sit with a
// MODULE_GAP between their inner long walls during all factory stages.
// In Stage 10 they animate TOGETHER briefly to demonstrate the assembled home,
// then slide back APART for the final transport-ready state.
//
// With MODULE_GAP = 4 ft:
//   Module A: world x = -16..-2, center at x = -9 (inner wall edge at x = -2)
//   Module B: world x =  +2..+16, center at x = +9 (inner wall edge at x = +2)
//   Marriage line = midline of the gap (x = 0).
export const MODULE_GAP = 4;
export const COMBINE_OFFSET = MODULE_GAP / 2;   // each module slides this far inward to combine

export const MODULE_A = {
  side: 'A',
  centerX: -(MODULE.width / 2) - COMBINE_OFFSET,   // -9 with default gap
  // For module A, the marriage wall is at +X (right side from module's POV)
  marriageSign: +1,
};
export const MODULE_B = {
  side: 'B',
  centerX: +(MODULE.width / 2) + COMBINE_OFFSET,   // +9 with default gap
  // For module B, the marriage wall is at -X (left side)
  marriageSign: -1,
};
