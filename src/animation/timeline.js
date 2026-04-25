// Master timeline composer. Calls each stage function with its start time.
//
// v3 timeline order (~76.5 s total, includes intro):
//   0. Intro overlay                      (0.0 → 2.5)   large logo shrinks to top-right
//   1. Floor system & module base         (2.5 → 8.0)
//   2. Floor MEP rough-in                 (8.0 → 11.5)
//   3. Subfloor deck                      (11.5 → 14.5)
//   4. Subfloor MEP & fixtures            (14.5 → 18.5)
//   5. Wall framing (HERO)                (18.5 → 25.0)
//   6. MEP rough-in (in-wall)             (25.0 → 30.0)
//   7. Insulation                         (30.0 → 34.0)
//   8. Roof framing                       (34.0 → 39.5)
//   9. Windows, exterior finish & roof    (39.5 → 44.5)
//  10. Interior reveal                    (44.5 → 49.5)
//  11. Transport (compressed)             (49.5 → 55.5)
//  12. Site stacking + porch              (55.5 → 76.5)

import gsap from 'gsap';
import {
  stageFloor, stageFloorMEP, stageSubfloor, stageMEPStubs, stageWalls,
  stageMEPRoughIn, stageInsulationDrywall, stageRoof,
  stageExterior, stageInteriorComplete, stageTransport, stageSiteStacking,
} from './stages.js';
import { buildCameraAnimation } from './camera.js';

// All construction stages shift right by INTRO_DURATION so the intro plays first.
export const INTRO_DURATION = 2.5;

export const STAGE_TIMES = {
  s1:  INTRO_DURATION + 0.0,
  s2:  INTRO_DURATION + 5.5,
  s3:  INTRO_DURATION + 9.0,
  s4:  INTRO_DURATION + 12.0,
  s5:  INTRO_DURATION + 16.0,
  s6:  INTRO_DURATION + 22.5,
  s7:  INTRO_DURATION + 27.5,
  s8:  INTRO_DURATION + 31.5,
  s9:  INTRO_DURATION + 37.0,
  s10: INTRO_DURATION + 42.0,
  s11: INTRO_DURATION + 47.0,
  s12: INTRO_DURATION + 53.0,
  // Stage 12 effectively completes ~21 s in (porch reveal ends). End is
  // pushed past that by 8 s so the audio fade-out has room to run AFTER
  // Stage 12 is complete (fade starts s12 + 25, runs 4 s).
  end: INTRO_DURATION + 82.0,
};

/**
 * Intro animation (0 → INTRO_DURATION):
 *   - 0.0 → 0.4  Large centered logo fades in at full size
 *   - 0.4 → 1.4  Hold (read the brand)
 *   - 1.4 → 2.3  Logo shrinks + translates to brand-tag's corner position
 *                while the persistent #brand-tag fades in beneath/behind.
 *   - 2.3 → 2.5  Intro overlay fades out, brand-tag is fully revealed.
 *
 * The transform-origin trick: GSAP animates xPercent/yPercent + scale on the
 * #intro-logo div whose CSS rest position is `top: 50%; left: 50%` with a
 * `translate(-50%, -50%)` baseline. We override transform during the tween
 * to slide it to the brand-tag corner (top-right) and shrink to ~0.23x
 * (matching the corner logo's size relative to the centered one).
 */
function buildIntro(tl) {
  // Initial state: visible, full size, centered.
  tl.set('#intro-logo', { opacity: 0 }, 0);
  tl.set('#brand-tag',  { opacity: 0 }, 0);

  // Fade in centered logo
  tl.to('#intro-logo', {
    opacity: 1,
    duration: 0.4,
    ease: 'power2.out',
  }, 0.0);

  // Hold (intentional empty time — keeps timeline aligned)

  // Shrink + move to top-right corner. Computed in CSS pixels:
  //   - Initial transform: translate(-50%, -50%) at top:50% left:50%
  //   - Target: top:20px right:20px (brand-tag's position)
  //   - We slide via x / y in CSS pixel offsets relative to the centered start
  //
  // Since the viewport size is unknown at module load, we use a function-based
  // tween value that reads window.innerWidth/Height each frame.
  tl.to('#intro-logo', {
    duration: 0.9,
    ease: 'power2.inOut',
    scale: 0.23,
    x: () => (window.innerWidth  / 2 - 20 - 84 / 2),   // half-width minus right margin minus half corner-logo width
    y: () => -(window.innerHeight / 2 - 20 - 84 / 2),  // negative = up
  }, 1.4);

  // Fade out the intro overlay just before stage 1 starts; brand-tag fades in.
  tl.to('#intro-logo', {
    opacity: 0,
    duration: 0.2,
    ease: 'power2.out',
  }, 2.3);
  tl.to('#brand-tag', {
    opacity: 1,
    duration: 0.4,
    ease: 'power2.out',
  }, 2.1);
}

export function buildTimeline(refs, { paused = true } = {}) {
  const tl = gsap.timeline({ paused, defaults: { overwrite: 'auto' } });

  // Intro overlay (0 → INTRO_DURATION)
  buildIntro(tl);

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

  // Camera choreography offset by INTRO_DURATION so its tween times align
  // with the construction stages (camera was authored against t=0 = stage 1).
  if (refs.camera) buildCameraAnimation(tl, refs.camera, refs.renderer, INTRO_DURATION, refs.lights);

  // (Outro logo regrow removed per user request — the persistent top-right
  //  brand-tag stays visible throughout, no separate logo flourish at end.)

  // ----- FADE FROM 3D CLOSE-IN SHOT INTO PHOTOREAL RENDERING -----
  // The camera lands on a front-on close-in shot of the home at master
  // time = INTRO + 75 + ~3s = ~80.5 s. We start the cross-fade ~1.5 s
  // after the camera lands (so the viewer registers the 3D shot first),
  // then fade the photoreal rendering in over 2 s. Champion Homes
  // branding on the top of the rendering is hidden by a CSS clip-path,
  // so only the home + trees + lawn appear.
  // Cross-fade starts slightly earlier and runs longer than before so the
  // transition is smoother — overlaps with the tail of the porch reveal /
  // landscape grow rather than landing as a discrete switch.
  const fadeInAt = STAGE_TIMES.s12 + 22.5;
  tl.set('#final-rendering-wrap', { opacity: 0 }, 0);
  tl.to ('#final-rendering-wrap', {
    opacity: 1,
    duration: 3.5,
    ease: 'power2.inOut',
  }, fadeInAt);

  tl.to({}, { duration: 1.5 }, STAGE_TIMES.end);

  return tl;
}
