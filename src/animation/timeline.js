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
  stageSiteWork, stageFoundationConstruction,
} from './stages.js';
import { buildCameraAnimation } from './camera.js';

// MASTER TIMELINE LAYOUT
//   0.0  → 2.5   Spear logo intro
//   2.5  → 5.0   "How to Build a House in 35-60 days" (headline)
//                centered, fades in/out
//   5.0  → 7.5   "Construction Process for a Modular House"
//                centered, fades in/out
//   7.5  → 7.9   Site Work phase label fades in at top
//   7.9  → 11.5  Section sw1 — sewer / water / drainage trenches (~3.6 s)
//  11.5  → 18.5  Section sw2 — foundation excavation + walls   (~7.0 s)
//  18.5  → 18.9  Site Work phase label fades out
//  18.9  → 21.5  "Modular Construction Factory Process ~ 1-3 days"
//                fades in centered, holds, travels to top
//  21.5  → ...   Factory stages s1–s10 (existing choreography)
//
// All construction stages shift right by INTRO_DURATION = 21.5. The +2 s
// addition vs. the previous 19.5 makes room for the new "How to Build a
// House in 35-60 days" headline that plays before the Construction Process
// intro title.
export const INTRO_DURATION = 21.5;

// Site-work section start times (inside the intro window — NOT offset by
// INTRO_DURATION).
export const SITEWORK_TIMES = {
  sw1: 7.9,    // sewer / water trenches
  sw2: 11.5,   // foundation excavation + walls
  sw_end: 18.5,
};

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
 * Headline title (2.5 → 5.0): "How to Build a House in 35-60 days" —
 * fires immediately after the Spear logo settles. Sets the umbrella
 * promise of the whole animation; the Construction Process title that
 * follows names the specific process being documented.
 */
function buildHeadlineTitle(tl) {
  tl.set('#intro-headline', { opacity: 0 }, 0);
  tl.to('#intro-headline', {
    opacity: 1, duration: 0.5, ease: 'power2.out',
  }, 2.5);
  tl.to('#intro-headline', {
    opacity: 0, duration: 0.5, ease: 'power2.in',
  }, 4.5);
}

/**
 * Intro title (5.0 → 7.5): "Construction Process for a Modular House" —
 * appears centered after the headline fades out, holds briefly, then
 * fades out without travelling. Names the process documented by the
 * site-work + factory sequence that follows.
 */
function buildIntroTitle(tl) {
  tl.set('#intro-title', { opacity: 0 }, 0);
  tl.to('#intro-title', {
    opacity: 1, duration: 0.5, ease: 'power2.out',
  }, 5.0);
  tl.to('#intro-title', {
    opacity: 0, duration: 0.5, ease: 'power2.in',
  }, 7.0);
}

/**
 * Phase label (top-of-viewport persistent banner). Text content is set
 * via tl.call so it can be swapped between phases:
 *   Site Work       — "Site Work Construction ~ 20-30 days · Weather
 *                     Dependent" during sw1 + sw2 (5.5 → sw_end)
 *   House Setting   — "House Setting ~ 1-2 days" during the early Stage
 *                     12 work (s12 + 0.5 → s12 + 15)
 *   Utilities/Drive — "Utilities and Driveway ~ 10-25 days · Weather
 *                     Dependent" during the late Stage 12 work
 *                     (s12 + 15.5 → s12 + 22)
 */
function buildPhaseLabel(tl) {
  const setText = (text) => () => { document.getElementById('phase-label').textContent = text; };

  tl.set('#phase-label', { opacity: 0 }, 0);

  // -- Site Work ----------------------------------------------------------
  tl.call(setText('Site Work Construction ~ 20-30 days · Weather Dependent'), null, 7.4);
  tl.to('#phase-label', { opacity: 1, duration: 0.4, ease: 'power2.out' }, 7.5);
  tl.to('#phase-label', { opacity: 0, duration: 0.4, ease: 'power2.in' }, SITEWORK_TIMES.sw_end);
  tl.call(setText(''), null, SITEWORK_TIMES.sw_end + 0.5);

  // -- House Setting (Stage 12 first half) -------------------------------
  tl.call(setText('House Setting ~ 1-2 days'), null, STAGE_TIMES.s12 + 0.4);
  tl.to('#phase-label', { opacity: 1, duration: 0.4, ease: 'power2.out' }, STAGE_TIMES.s12 + 0.5);
  tl.to('#phase-label', { opacity: 0, duration: 0.4, ease: 'power2.in' }, STAGE_TIMES.s12 + 15.0);
  tl.call(setText(''), null, STAGE_TIMES.s12 + 15.4);

  // -- Utilities + Driveway (Stage 12 second half) ----------------------
  tl.call(setText('Utilities and Driveway ~ 10-25 days · Weather Dependent'), null, STAGE_TIMES.s12 + 15.4);
  tl.to('#phase-label', { opacity: 1, duration: 0.4, ease: 'power2.out' }, STAGE_TIMES.s12 + 15.5);
  tl.to('#phase-label', { opacity: 0, duration: 0.4, ease: 'power2.in' }, STAGE_TIMES.s12 + 22.0);
  tl.call(setText(''), null, STAGE_TIMES.s12 + 22.5);
}

/**
 * Process title — used to be at 2.5 (right after Spear). Now appears
 * AFTER the site-work sections (~ master time 19.9) as the lead-in to
 * the factory phases:
 *   - 19.9 → 20.4  Fade in centered, large
 *   - 20.4 → 21.5  Hold (read it)
 *   - 21.5 → 22.5  Shrink + travel up to top of viewport
 *   - Stays small at top through factory stages
 *   - Fades out at start of Stage 11 (Transport)
 */
const PROCESS_TITLE_START = 18.9;       // master-time fade-in time
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
  }, PROCESS_TITLE_START);

  // Hold

  // Shrink + travel to top of viewport. Bumped up from scale 0.32 / top
  // 20 px so the small banner is more legible AND has enough margin
  // above it that the wrapped first line never clips the top edge of
  // the screen.
  tl.to('#process-title', {
    duration: 1.0,
    ease: 'power2.inOut',
    scale: 0.55,
    top: '50px',
    yPercent: 0,
  }, PROCESS_TITLE_START + 1.6);

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
  tl.set('#callout-modules',           { opacity: 0 }, 0);
  tl.set('#callout-codes',             { opacity: 0 }, 0);
  tl.set('#callout-foundation',        { opacity: 0 }, 0);
  tl.set('#callout-utilities',         { opacity: 0 }, 0);
  tl.set('#callout-walls',             { opacity: 0 }, 0);
  tl.set('#callout-roof',              { opacity: 0 }, 0);
  tl.set('#callout-driveway',          { opacity: 0 }, 0);
  tl.set('#callout-sewer-water',       { opacity: 0 }, 0);
  tl.set('#callout-foundation-build',  { opacity: 0 }, 0);
  tl.set('#callout-roof-fold',         { opacity: 0 }, 0);
  tl.set('#callout-house-set',         { opacity: 0 }, 0);

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
  // Tightened end time so the bottom-right slot is free by s12 + 18.5
  // for the "Pour a driveway" callout to take it.
  tl.to('#callout-utilities', {
    opacity: 1, duration: 0.7, ease: 'power2.out',
  }, STAGE_TIMES.s12 + 16.5);
  tl.to('#callout-utilities', {
    opacity: 0, duration: 0.7, ease: 'power2.in',
  }, STAGE_TIMES.s12 + 18.5);

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

  // "Pour a driveway" — fires AFTER the utilities callout has finished
  // its fade-out (utilities fade-out completes at s12 + 19.2). Driveway
  // and utilities now both share the bottom-right slot but are temporally
  // disjoint, so the user reads each in turn.
  tl.to('#callout-driveway', {
    opacity: 1, duration: 0.7, ease: 'power2.out',
  }, STAGE_TIMES.s12 + 19.4);
  tl.to('#callout-driveway', {
    opacity: 0, duration: 0.7, ease: 'power2.in',
  }, STAGE_TIMES.s12 + 21.5);

  // "Sewer and Water Connection to Main" — Section SW1 (master 5.9 → 12.5).
  // Fade in once the sewer trench has dug + pipe is going in, hold past
  // the dirt-cover fill, fade out before the foundation construction
  // (Section SW2) starts.
  tl.to('#callout-sewer-water', {
    opacity: 1, duration: 0.7, ease: 'power2.out',
  }, SITEWORK_TIMES.sw1 + 0.8);
  tl.to('#callout-sewer-water', {
    opacity: 0, duration: 0.7, ease: 'power2.in',
  }, SITEWORK_TIMES.sw2 - 1.0);

  // "Permanent Foundation with Concrete Perimeter Wall" — Section SW2
  // (master 12.5 → 19.5). Fade in once the perimeter walls start rising
  // (sw2 + ~1.5), hold through the bearing footing, fade out just
  // before the foundation hides at the end of the section.
  tl.to('#callout-foundation-build', {
    opacity: 1, duration: 0.7, ease: 'power2.out',
  }, SITEWORK_TIMES.sw2 + 1.5);
  tl.to('#callout-foundation-build', {
    opacity: 0, duration: 0.7, ease: 'power2.in',
  }, SITEWORK_TIMES.sw_end - 1.5);

  // "Hinged Roof lowers for Transport" — Stage 11 (Transport). Roof
  // hinges fold from t0 + 0.1 → t0 + 1.1 (1 s ease-in-out). Fade the
  // callout in just before the fold starts and out after it completes.
  tl.to('#callout-roof-fold', {
    opacity: 1, duration: 0.6, ease: 'power2.out',
  }, STAGE_TIMES.s11);
  tl.to('#callout-roof-fold', {
    opacity: 0, duration: 0.6, ease: 'power2.in',
  }, STAGE_TIMES.s11 + 2.2);

  // "House Set on Foundation by Crane" — text-only HEADER for Stage 12
  // site assembly. Visible while the LOWER module is being placed on
  // the foundation: fades in as the crane drives onto the site
  // (~s12 + 5) and back out before the upper module starts descending
  // onto the lower (Phase D for the upper begins at s12 + 14, so we
  // fade out at s12 + 13 — fully gone by s12 + 13.7).
  tl.to('#callout-house-set', {
    opacity: 1, duration: 0.7, ease: 'power2.out',
  }, STAGE_TIMES.s12 + 5.0);
  tl.to('#callout-house-set', {
    opacity: 0, duration: 0.7, ease: 'power2.in',
  }, STAGE_TIMES.s12 + 13.0);
}

export function buildTimeline(refs, { paused = true } = {}) {
  const tl = gsap.timeline({ paused, defaults: { overwrite: 'auto' } });

  // Intro overlay (0 → INTRO_DURATION)
  buildIntro(tl);
  buildHeadlineTitle(tl);
  buildIntroTitle(tl);
  buildPhaseLabel(tl);
  buildProcessTitle(tl);

  // Site-work sections (between intro and factory)
  stageSiteWork(              tl, refs, SITEWORK_TIMES.sw1);
  stageFoundationConstruction(tl, refs, SITEWORK_TIMES.sw2);

  // Transport title — fades in/out in the 3.5 s gap between s11 and s12.
  // Master-timeline start time = INTRO_DURATION + 53.0 (= end of transport).
  buildTransportTitle(tl, INTRO_DURATION + 53.0);

  // Floor-stage callouts (two SVG groups with leader lines, see #callouts)
  buildFloorCallouts(tl);

  // Fade in the #stage-indicator just before the first factory stage's
  // announce fires (it was kept hidden through the intro so the empty
  // "Phase 3 · Timeline ready" box never appears).
  tl.to('#stage-indicator', {
    opacity: 1, duration: 0.6, ease: 'power2.out',
  }, STAGE_TIMES.s1 - 0.2);

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
