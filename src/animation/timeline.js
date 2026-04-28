// Master timeline composer. Calls each stage function with its start time.
//
// v3 timeline order (times shown are RELATIVE to construction-start; add
// INTRO_DURATION for absolute master-timeline times):
//   0a. Spear logo intro                  (-6.0 → -3.5)
//   0b. Process title                     (-3.5 →  0.0)
//   1. Floor system & module base         ( 0.0 →  5.5)
//   2. Floor MEP rough-in                 ( 5.5 →  9.0)
//   3. Subfloor deck                      ( 9.0 → 12.0)
//   4. Subfloor MEP & fixtures            (12.0 → 16.0)
//   5. Wall framing (HERO)                (16.0 → 22.5)
//   6. MEP rough-in (in-wall)             (22.5 → 27.5)
//   (eliminated — insulation now ships pre-installed in the walls;
//   this 4-s slot is a quiet camera-only beat between Stages 6 and 8)
//   8. Roof framing                       (31.5 → 37.0)
//   9. Windows, exterior finish & roof    (37.0 → 42.0)
//  10. Interior reveal                    (42.0 → 47.0)
//  11. Transport (compressed)             (47.0 → 53.0)
//  11b. Transport title (fade in/out)    (53.0 → 56.5)
//  12. Site stacking + porch              (56.5 → 77.5)

import gsap from 'gsap';
import {
  stageFloor, stageFloorMEP, stageSubfloor, stageMEPStubs, stageWalls,
  stageMEPRoughIn, stageInsulationDrywall, stageRoof,
  stageExterior, stageInteriorComplete, stageTransport, stageSiteStacking,
} from './stages.js';
import { buildCameraAnimation } from './camera.js';

// All construction stages shift right by INTRO_DURATION so the intro plays first.
// Intro = Spear logo (0 → 2.5) + process title (2.5 → 6.0).
export const INTRO_DURATION = 6.0;

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
  // 3.5 s gap between transport (s11 ends ~53) and site assembly (s12)
  // for the transport-title fade in/hold/fade-out. Site assembly stage
  // therefore starts 3.5 s later than before; everything downstream
  // (head-on shot, cross-fade, end marker) shifts by the same amount.
  s12: INTRO_DURATION + 56.5,
  // Stage 12 effectively completes ~21 s in (porch reveal ends). End is
  // pushed past that to accommodate (a) the head-on hold (~3 s),
  // (b) the cross-fade to the photoreal rendering, and (c) the audio
  // fade-out which now starts at s12 + 27.5 and runs 4 s.
  end: INTRO_DURATION + 89.5,
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

/**
 * Process title (2.5 → 6.0):
 *   - 2.5 → 3.0  Fade in centered, large
 *   - 3.0 → 4.5  Hold (read it)
 *   - 4.5 → 5.5  Shrink + travel up to top of viewport
 *   - Stays small at top for the rest of the animation
 *
 * Same transform-origin trick as #intro-logo: rest position is top:50%
 * left:50% with translate(-50%, -50%); GSAP animates xPercent/yPercent +
 * scale on top. Final y is computed from viewport size each frame.
 */
function buildProcessTitle(tl) {
  // GSAP owns the centering via xPercent/yPercent so the CSS
  // `transform: translate(-50%, -50%)` baseline is replaced by an explicit
  // value (otherwise GSAP's transform composition can drift on mobile,
  // especially when the text wraps onto two lines).
  tl.set('#process-title', {
    opacity: 0,
    scale: 1,
    xPercent: -50,
    yPercent: -50,
    top: '50%',
    left: '50%',
  }, 0);

  // Fade in centered + large
  tl.to('#process-title', {
    opacity: 1,
    duration: 0.5,
    ease: 'power2.out',
  }, 2.5);

  // Hold (3.0 → 4.5)

  // Shrink + travel to top of viewport (4.5 → 5.5).
  // Animate top: 50% -> 20px and yPercent: -50 -> 0, so the element's TOP
  // edge ends at 20 px regardless of viewport size or text wrapping. This
  // is more robust than computing a one-shot pixel translation, which
  // becomes wrong if the mobile URL bar collapses mid-animation.
  tl.to('#process-title', {
    duration: 1.0,
    ease: 'power2.inOut',
    scale: 0.32,
    top: '20px',
    yPercent: 0,
  }, 4.5);

  // Fade out at the start of Stage 11 (Transport) — the title is no longer
  // thematically accurate once we leave the factory, and the user wants
  // the small top-of-screen text gone for the rest of the animation.
  tl.to('#process-title', {
    opacity: 0,
    duration: 0.7,
    ease: 'power2.in',
  }, STAGE_TIMES.s11);
}

/**
 * Transport title — fades in between Stage 11 (transport) and Stage 12
 * (site assembly), explaining what's happening. Same large centered
 * style as the process title; this one stays put (no travel) and fades
 * away again before the trucks arrive on site.
 *
 *   atStart + 0.0 → 0.6   fade in
 *   atStart + 0.6 → 2.7   hold (read it)
 *   atStart + 2.7 → 3.3   fade out
 *
 * Total budget: 3.3 s. The 3.5 s gap baked into STAGE_TIMES.s12 leaves
 * a 0.2 s buffer before site assembly begins.
 */
function buildTransportTitle(tl, atStart) {
  tl.set('#transport-title', { opacity: 0 }, 0);

  tl.to('#transport-title', {
    opacity: 1,
    duration: 0.6,
    ease: 'power2.out',
  }, atStart);

  tl.to('#transport-title', {
    opacity: 0,
    duration: 0.6,
    ease: 'power2.in',
  }, atStart + 2.7);
}

/**
 * Floor-stage callouts — two SVG label groups in #callouts that point at
 * the two factory modules with leader lines. Visibility is opacity only;
 * positions are recomputed each frame in main.js tick() via updateCallouts.
 *
 *   "Two Modules for One House"        fades in mid-Stage 1 (floor frame),
 *                                       fades out at the start of Stage 2.
 *   "Constructed to State Building Codes"
 *                                       fades in early Stage 3 (subfloor),
 *                                       holds through most of Stage 4
 *                                       (subfloor MEP / fixtures), fades
 *                                       out late in Stage 4.
 *
 * Hardcoded fade durations (0.7 s) match the rest of the title transitions
 * for visual consistency.
 */
function buildFloorCallouts(tl) {
  tl.set('#callout-modules',    { opacity: 0 }, 0);
  tl.set('#callout-codes',      { opacity: 0 }, 0);
  tl.set('#callout-foundation', { opacity: 0 }, 0);
  tl.set('#callout-utilities',  { opacity: 0 }, 0);
  tl.set('#callout-walls',      { opacity: 0 }, 0);
  tl.set('#callout-roof',       { opacity: 0 }, 0);
  tl.set('#callout-driveway',   { opacity: 0 }, 0);

  // "Two Modules for One House"
  tl.to('#callout-modules', {
    opacity: 1, duration: 0.7, ease: 'power2.out',
  }, STAGE_TIMES.s1 + 1.0);
  tl.to('#callout-modules', {
    opacity: 0, duration: 0.7, ease: 'power2.in',
  }, STAGE_TIMES.s2 + 0.3);

  // "Constructed to State Building Codes"
  tl.to('#callout-codes', {
    opacity: 1, duration: 0.7, ease: 'power2.out',
  }, STAGE_TIMES.s3 + 0.3);
  tl.to('#callout-codes', {
    opacity: 0, duration: 0.7, ease: 'power2.in',
  }, STAGE_TIMES.s4 + 2.5);

  // "Permanent Foundation" — Stage 12. Fades in early (foundation is fully
  // exposed before the lower module descends onto it ~t0+11), then fades
  // out well before the cross-fade to the photoreal rendering at s12+26.
  tl.to('#callout-foundation', {
    opacity: 1, duration: 0.7, ease: 'power2.out',
  }, STAGE_TIMES.s12 + 0.5);
  tl.to('#callout-foundation', {
    opacity: 0, duration: 0.7, ease: 'power2.in',
  }, STAGE_TIMES.s12 + 8.0);

  // "Connect water, sewer, gas and electric" — late Stage 12, after the
  // upper module is stacked and the crane has driven away (~s12 + 16.5).
  // Holds through the porch reveal and fades out before the walkway-
  // driveway callout takes the same screen position.
  tl.to('#callout-utilities', {
    opacity: 1, duration: 0.7, ease: 'power2.out',
  }, STAGE_TIMES.s12 + 16.5);
  tl.to('#callout-utilities', {
    opacity: 0, duration: 0.7, ease: 'power2.in',
  }, STAGE_TIMES.s12 + 19.5);

  // "Insulation and Drywall Pre-installed" — Stage 5 (Walls). Walls slide
  // in 0 → 2.7 s into the stage; fade in once a couple are settled.
  tl.to('#callout-walls', {
    opacity: 1, duration: 0.7, ease: 'power2.out',
  }, STAGE_TIMES.s5 + 1.5);
  tl.to('#callout-walls', {
    opacity: 0, duration: 0.7, ease: 'power2.in',
  }, STAGE_TIMES.s5 + 5.5);

  // "Roof Trusses Pre-Assembled and Ceiling Drywall Pre-Installed" —
  // Stage 8 (Roof). Truss assembly drops 0.3 → 1.9 s, deck 2.1 → 3.25 s,
  // shingles 3.65 → 4.6 s. Show the callout while the trusses are
  // settling and through the deck install.
  tl.to('#callout-roof', {
    opacity: 1, duration: 0.7, ease: 'power2.out',
  }, STAGE_TIMES.s8 + 0.7);
  tl.to('#callout-roof', {
    opacity: 0, duration: 0.7, ease: 'power2.in',
  }, STAGE_TIMES.s8 + 4.7);

  // "Pour a driveway" — late Stage 12. Walkway mesh appears at the tail
  // of the porch reveal (~s12 + 18.6, six tiers in at 0.35 s each from
  // s12 + 16.5). Fade in slightly before that and hold for ~2 s.
  tl.to('#callout-driveway', {
    opacity: 1, duration: 0.7, ease: 'power2.out',
  }, STAGE_TIMES.s12 + 18.0);
  tl.to('#callout-driveway', {
    opacity: 0, duration: 0.7, ease: 'power2.in',
  }, STAGE_TIMES.s12 + 21.0);
}

export function buildTimeline(refs, { paused = true } = {}) {
  const tl = gsap.timeline({ paused, defaults: { overwrite: 'auto' } });

  // Intro overlay (0 → INTRO_DURATION)
  buildIntro(tl);
  buildProcessTitle(tl);

  // Transport title — fades in/out in the 3.5 s gap between s11 and s12.
  // Master-timeline start time = INTRO_DURATION + 53.0 (= end of transport).
  buildTransportTitle(tl, INTRO_DURATION + 53.0);

  // Floor-stage callouts (two SVG groups with leader lines, see #callouts)
  buildFloorCallouts(tl);

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
  // Hold on the head-on close shot for several seconds before fading to the
  // photoreal rendering. Head-on shot lands around s12 + 22.5 (camera move
  // ends INTRO + 78 = s12 + 25 actually — but porch + landscape are still
  // populating until ~s12 + 23). Starting the fade at s12 + 26 gives the
  // viewer a clean ~3 s read of the finished 3D scene first, then fades.
  const fadeInAt = STAGE_TIMES.s12 + 26.0;
  tl.set('#final-rendering-wrap', { opacity: 0 }, 0);
  tl.to ('#final-rendering-wrap', {
    opacity: 1,
    duration: 2.75,                  // 0.75 s faster than before
    ease: 'power2.inOut',
  }, fadeInAt);

  tl.to({}, { duration: 1.5 }, STAGE_TIMES.end);

  return tl;
}
