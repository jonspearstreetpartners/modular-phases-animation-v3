// Master timeline composer. Calls each stage function with its start time.
//
// Stage order (11 stages, ~62 sec total):
//   1. Floor system & module base       (0.0 → 5.5)
//   2. Floor MEP rough-in               (5.5 → 9.0)
//   3. Subfloor deck                    (9.0 → 12.0)
//   4. Subfloor MEP & fixtures          (12.0 → 16.0)
//   5. Wall framing (HERO)              (16.0 → 22.5)   [partition + exterior with drywall pre-installed]
//   6. MEP rough-in (in-wall)           (22.5 → 27.5)
//   7. Insulation                       (27.5 → 31.5)
//   8. Roof framing                     (31.5 → 37.0)
//   9. Windows, exterior finish & roof  (37.0 → 42.0)
//  10. Interior reveal + combine/separate (42.0 → 52.0)
//  11. Transport: hinge roofs + trucks   (52.0 → 62.0)  [roofs lower, trucks haul away]
//
// Modules are SEPARATED throughout (built/transported separately).
// Stage 10 briefly slides them together for the combined-home demo.
// Stage 11 lowers the hinged roofs flat for transport, then trucks pull modules away.

import gsap from 'gsap';
import {
  stageFloor, stageFloorMEP, stageSubfloor, stageMEPStubs, stageWalls,
  stageMEPRoughIn, stageInsulationDrywall, stageRoof,
  stageExterior, stageInteriorComplete, stageTransport, stageSiteStacking,
} from './stages.js';
import { buildCameraAnimation } from './camera.js';

export const STAGE_TIMES = {
  s1:  0.0,
  s2:  5.5,
  s3:  9.0,
  s4: 12.0,
  s5: 16.0,
  s6: 22.5,
  s7: 27.5,
  s8: 31.5,
  s9: 37.0,
  s10: 42.0,
  s11: 47.0,    // v3: shortened Stage 10 from 10s -> 5s (no roof lift, no combine/separate)
  s12: 57.0,    // v3: site stacking + porch (~21s)
  end: 78.0,
};

export function buildTimeline(refs, { paused = true } = {}) {
  const tl = gsap.timeline({ paused, defaults: { overwrite: 'auto' } });

  stageFloor(             tl, refs, STAGE_TIMES.s1);
  stageFloorMEP(          tl, refs, STAGE_TIMES.s2);
  stageSubfloor(          tl, refs, STAGE_TIMES.s3);
  stageMEPStubs(          tl, refs, STAGE_TIMES.s4);
  stageWalls(             tl, refs, STAGE_TIMES.s5);
  stageMEPRoughIn(        tl, refs, STAGE_TIMES.s6);
  stageInsulationDrywall( tl, refs, STAGE_TIMES.s7);
  stageRoof(              tl, refs, STAGE_TIMES.s8);
  stageExterior(          tl, refs, STAGE_TIMES.s9);
  stageInteriorComplete(  tl, refs, STAGE_TIMES.s10);
  stageTransport(         tl, refs, STAGE_TIMES.s11);
  stageSiteStacking(      tl, refs, STAGE_TIMES.s12);

  // Phase 4 — camera choreography (orbit + push-in + pull-back) registered last
  // so its tweens layer on top of the geometry timeline.
  if (refs.camera) buildCameraAnimation(tl, refs.camera, refs.renderer);

  // Hold a beat at the end
  tl.to({}, { duration: 1.5 }, STAGE_TIMES.end);

  return tl;
}
