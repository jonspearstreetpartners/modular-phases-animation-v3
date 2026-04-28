// Callouts overlay — text labels with leader lines pointing to each of the
// two factory modules. The DOM lives in index.html (#callouts SVG); this
// module updates the line endpoints + dot positions every frame by
// projecting each module's world position to screen coordinates.
//
// Visibility (opacity of the .callout-group) is controlled by the master
// timeline in src/animation/timeline.js — this module never touches it.

import * as THREE from 'three';

const _world = new THREE.Vector3();
const _ndc   = new THREE.Vector3();

// Project a Three.js Vector3 in world space to screen-pixel coords using the
// renderer's drawing buffer size (so this stays correct under DPR scaling
// and any future MP4 export at a different resolution).
function projectToScreen(worldPos, camera, w, h) {
  _ndc.copy(worldPos).project(camera);
  return {
    x: ( _ndc.x + 1) * 0.5 * w,
    y: (-_ndc.y + 1) * 0.5 * h,
  };
}

// Callout label position on screen — right side, anchored by viewport
// fractions. text-anchor="end" means the position is the RIGHT edge of the
// text, so the text grows leftward and we don't risk overflowing.
//   - Floor-stage callouts sit at mid-height (matched the first yellow-
//     circle reference).
//   - Foundation callout sits near the BOTTOM-right (matched the second
//     yellow-circle reference).
const LABEL_RIGHT_FRAC_DESKTOP = 0.97;
const LABEL_RIGHT_FRAC_MOBILE  = 0.94;     // a touch more breathing room on phones
const LABEL_LEFT_FRAC_DESKTOP  = 0.03;     // mirror of the right-side margin
const LABEL_LEFT_FRAC_MOBILE   = 0.06;
const LABEL_TOP_FRAC_HIGH      = 0.18;     // upper area, below brand-tag/process title
const LABEL_TOP_FRAC_MID       = 0.42;
const LABEL_TOP_FRAC_BOTTOM    = 0.85;
const MOBILE_BREAKPOINT_PX     = 768;

const isMobile = (w) => w <= MOBILE_BREAKPOINT_PX;

// Wrapped versions of the longer callouts, used only when the viewport is
// below the mobile breakpoint. Each entry is an array of lines that will
// render stacked (line height ~ 1.15em) via SVG <tspan>.
const WRAPPED_TEXT = {
  'callout-modules':           ['Two Modules', 'for One House'],
  'callout-codes':             ['Constructed to State', 'Building Codes'],
  'callout-utilities':         ['Connect water, sewer,', 'gas and electric'],
  'callout-walls':             ['Insulation and', 'Drywall Pre-installed'],
  'callout-roof':              ['Trusses Pre-Assembled', 'Ceiling Drywall Pre-Installed'],
  'callout-sewer-water':       ['Sewer and Water', 'Connection to the Street'],
  'callout-foundation-build':  ['Permanent Foundation with', 'Concrete Perimeter Wall'],
  'callout-roof-fold':         ['Hinged Roof lowers', 'for Transport'],
  // 'callout-foundation' ("Permanent Foundation") and 'callout-driveway'
  // ("Pour a driveway") are short enough to fit on one line at any size.
};

const SVG_NS = 'http://www.w3.org/2000/svg';

// Render a 1- or N-line label inside an SVG <text>. Rebuilds tspan
// children only when the line content changes — frame-to-frame this
// usually short-circuits to a no-op or just rewrites the @x attributes
// (which the user agent may de-dupe internally anyway).
function setLabelText(textEl, lines, x) {
  const key = lines.join('|');
  const sameContent = textEl.dataset.renderedKey === key;

  if (lines.length === 1) {
    if (sameContent) return;
    if (textEl.children.length > 0) textEl.replaceChildren();
    textEl.textContent = lines[0];
    textEl.dataset.renderedKey = key;
    return;
  }

  if (sameContent) {
    // Lines unchanged — just update @x in case the viewport resized.
    for (const ts of textEl.children) ts.setAttribute('x', x);
    return;
  }
  textEl.textContent = '';
  for (let i = 0; i < lines.length; i++) {
    const ts = document.createElementNS(SVG_NS, 'tspan');
    ts.setAttribute('x', x);
    if (i > 0) ts.setAttribute('dy', '1.15em');
    ts.textContent = lines[i];
    textEl.appendChild(ts);
  }
  textEl.dataset.renderedKey = key;
}

function placeLabel(textEl, w, h, topFrac, leftSide = false) {
  const mobile = isMobile(w);
  let textX, anchor;
  if (leftSide) {
    const leftFrac = mobile ? LABEL_LEFT_FRAC_MOBILE : LABEL_LEFT_FRAC_DESKTOP;
    textX  = w * leftFrac;
    anchor = 'start';      // text grows rightward from x
  } else {
    const rightFrac = mobile ? LABEL_RIGHT_FRAC_MOBILE : LABEL_RIGHT_FRAC_DESKTOP;
    textX  = w * rightFrac;
    anchor = 'end';        // text grows leftward from x
  }
  const textY = h * topFrac;
  textEl.setAttribute('text-anchor', anchor);
  textEl.setAttribute('x', textX);
  textEl.setAttribute('y', textY);

  // Choose 1- or 2-line rendering based on viewport width and the parent
  // group's id. Multi-line text is only used on mobile, so on desktop the
  // single-line branch always runs (idempotent — it just writes the same
  // textContent each frame).
  const groupId = textEl.parentElement?.id;
  const wrapped = mobile && WRAPPED_TEXT[groupId];
  const single  = !wrapped && (textEl.dataset.fullText || textEl.textContent);
  if (!textEl.dataset.fullText) textEl.dataset.fullText = single;
  setLabelText(textEl, wrapped || [textEl.dataset.fullText], textX);

  let bbox;
  try { bbox = textEl.getBBox(); } catch {
    const fallbackX = leftSide ? textX : textX - 280;
    bbox = { x: fallbackX, y: textY - 18, width: 280, height: 22 };
  }

  return {
    mobile,
    leftSide,
    leftEdgeX:  bbox.x,
    rightEdgeX: bbox.x + bbox.width,
    midY:       bbox.y + bbox.height / 2,
    topY:       bbox.y + 4,
    botY:       bbox.y + bbox.height - 2,
  };
}

function updateCalloutGroup(group, topFrac, moduleA, moduleB, camera, w, h) {
  if (!group || !moduleA || !moduleB) return;

  // Module world position — we offset slightly upward so the leader-line tip
  // lands on top of the floor frame rather than under it.
  moduleA.getWorldPosition(_world);
  _world.y += 1.5;
  const a = projectToScreen(_world, camera, w, h);

  moduleB.getWorldPosition(_world);
  _world.y += 1.5;
  const b = projectToScreen(_world, camera, w, h);

  const text = group.querySelector('text');
  const place = placeLabel(text, w, h, topFrac);

  // Both modules are to the LEFT of the right-side label, so both leader
  // lines emerge from the LEFT edge of the text. Use Y-screen position to
  // decide which line points where (small Y = higher on screen = further
  // away). On desktop the lines fork from top-left / bottom-left of the
  // text bbox; on mobile (where the bbox is small enough that the fork
  // points overlap) they collapse to a single V-shape origin at the
  // left-middle of the bbox.
  const [upper, lower] = a.y <= b.y ? [a, b] : [b, a];

  const startX = place.leftEdgeX - 6;          // a hair past the text
  const lineA = group.querySelector('.callout-line-a');
  const lineB = group.querySelector('.callout-line-b');
  const startYA = place.mobile ? place.midY : place.topY;
  const startYB = place.mobile ? place.midY : place.botY;
  lineA.setAttribute('x1', startX);
  lineA.setAttribute('y1', startYA);
  lineA.setAttribute('x2', upper.x);
  lineA.setAttribute('y2', upper.y);
  lineB.setAttribute('x1', startX);
  lineB.setAttribute('y1', startYB);
  lineB.setAttribute('x2', lower.x);
  lineB.setAttribute('y2', lower.y);

  const dotA = group.querySelector('.callout-dot-a');
  const dotB = group.querySelector('.callout-dot-b');
  dotA.setAttribute('cx', upper.x);
  dotA.setAttribute('cy', upper.y);
  dotB.setAttribute('cx', lower.x);
  dotB.setAttribute('cy', lower.y);
}

// Single-target callout — one leader line + dot pointing at one Object3D.
// `offset` may be a number (legacy y-offset) OR an {x, y, z} object so the
// caller can nudge the dot off the target's geometric center — useful when
// the leader line would otherwise cut through the visible mass of the
// target (e.g., aiming the utilities dot at the right wall of the home
// rather than its center).
//
// `leftSide` picks which side of the viewport the label sits on (default
// right). Line origin is the bbox edge nearest the dot (left edge of a
// right-aligned label, right edge of a left-aligned one).
function updateCalloutGroupSingle(group, topFrac, target, camera, w, h, offset = 1.0, leftSide = false) {
  if (!group || !target) return;

  target.getWorldPosition(_world);
  if (typeof offset === 'number') {
    _world.y += offset;
  } else {
    _world.x += offset.x ?? 0;
    _world.y += offset.y ?? 0;
    _world.z += offset.z ?? 0;
  }
  const p = projectToScreen(_world, camera, w, h);

  const text = group.querySelector('text');
  const place = placeLabel(text, w, h, topFrac, leftSide);

  const line = group.querySelector('line');
  const dot  = group.querySelector('circle');
  const lineOriginX = leftSide ? place.rightEdgeX + 6 : place.leftEdgeX - 6;
  line.setAttribute('x1', lineOriginX);
  line.setAttribute('y1', place.midY);
  line.setAttribute('x2', p.x);
  line.setAttribute('y2', p.y);
  dot.setAttribute('cx', p.x);
  dot.setAttribute('cy', p.y);
}

let _modulesEl     = null;
let _codesEl       = null;
let _foundationEl  = null;
let _utilitiesEl   = null;
let _wallsEl       = null;
let _roofEl        = null;
let _drivewayEl    = null;
let _sewerWaterEl  = null;
let _foundBuildEl  = null;
let _roofFoldEl    = null;

export function updateCallouts(refs, camera, _renderer) {
  if (!_modulesEl)     _modulesEl     = document.getElementById('callout-modules');
  if (!_codesEl)       _codesEl       = document.getElementById('callout-codes');
  if (!_foundationEl)  _foundationEl  = document.getElementById('callout-foundation');
  if (!_utilitiesEl)   _utilitiesEl   = document.getElementById('callout-utilities');
  if (!_wallsEl)       _wallsEl       = document.getElementById('callout-walls');
  if (!_roofEl)        _roofEl        = document.getElementById('callout-roof');
  if (!_drivewayEl)    _drivewayEl    = document.getElementById('callout-driveway');
  if (!_sewerWaterEl)  _sewerWaterEl  = document.getElementById('callout-sewer-water');
  if (!_foundBuildEl)  _foundBuildEl  = document.getElementById('callout-foundation-build');
  if (!_roofFoldEl)    _roofFoldEl    = document.getElementById('callout-roof-fold');

  // Skip work entirely when all groups are invisible — getBBox on SVG and
  // matrix multiplies aren't free, and these callouts are only on screen
  // for short windows during the animation.
  const mVisible  = _modulesEl     && +getComputedStyle(_modulesEl).opacity     > 0.001;
  const cVisible  = _codesEl       && +getComputedStyle(_codesEl).opacity       > 0.001;
  const fVisible  = _foundationEl  && +getComputedStyle(_foundationEl).opacity  > 0.001;
  const uVisible  = _utilitiesEl   && +getComputedStyle(_utilitiesEl).opacity   > 0.001;
  const wVisible  = _wallsEl       && +getComputedStyle(_wallsEl).opacity       > 0.001;
  const rVisible  = _roofEl        && +getComputedStyle(_roofEl).opacity        > 0.001;
  const dVisible  = _drivewayEl    && +getComputedStyle(_drivewayEl).opacity    > 0.001;
  const swVisible = _sewerWaterEl  && +getComputedStyle(_sewerWaterEl).opacity  > 0.001;
  const fbVisible = _foundBuildEl  && +getComputedStyle(_foundBuildEl).opacity  > 0.001;
  const rfVisible = _roofFoldEl    && +getComputedStyle(_roofFoldEl).opacity    > 0.001;
  if (!mVisible && !cVisible && !fVisible && !uVisible &&
      !wVisible && !rVisible && !dVisible && !swVisible && !fbVisible && !rfVisible) return;

  // SVG overlay uses CSS pixels (no viewBox, width/height = 100%) so we map
  // NDC -> pixels with the CSS viewport size, NOT the renderer's drawing
  // buffer (which scales by devicePixelRatio on mobile).
  const w = window.innerWidth;
  const h = window.innerHeight;

  if (mVisible) updateCalloutGroup(_modulesEl, LABEL_TOP_FRAC_MID, refs.moduleA, refs.moduleB, camera, w, h);
  if (cVisible) updateCalloutGroup(_codesEl,   LABEL_TOP_FRAC_MID, refs.moduleA, refs.moduleB, camera, w, h);
  // Foundation callout sits in the bottom-right — empty space below the
  // foundation pad, matching the user-supplied yellow-circle reference.
  if (fVisible) updateCalloutGroupSingle(_foundationEl, LABEL_TOP_FRAC_BOTTOM, refs.foundation, camera, w, h, 0.5);
  // Utilities callout: late Stage 12. Label moved to the BOTTOM-right
  // (foundation callout is gone by then) and the dot pushed far past
  // the east wall (offset.x = +14) so the leader line doesn't cut
  // through the home body. Long callout text pushed the upper-right
  // version into the module footprint.
  if (uVisible) updateCalloutGroupSingle(_utilitiesEl,  LABEL_TOP_FRAC_BOTTOM, refs.moduleA,   camera, w, h,
                                         { x: 14, y: 4, z: 0 });
  // Walls callout: Stage 5. Aim the dot at the EAST exterior wall of
  // module B (the RIGHT module from the iso camera angle, factoryX
  // = +9.59 + W/2 ≈ +16.6). Putting the dot on the right module
  // keeps both text label and dot on the same side of the screen,
  // so the leader line never has to fly across the top of either
  // module to connect them.
  if (wVisible) updateCalloutGroupSingle(_wallsEl,      LABEL_TOP_FRAC_MID,    refs.moduleB,   camera, w, h,
                                         { x: 7, y: 5, z: 0 });
  // Roof callout: Stage 8. Label moved UP to LABEL_TOP_FRAC_HIGH (~18%
  // from top, just below the brand-tag / process-title) so the text no
  // longer overlaps the module body, plus dot pushed far to the right
  // of module B so the leader line stays clear of the trusses.
  if (rVisible) updateCalloutGroupSingle(_roofEl,       LABEL_TOP_FRAC_HIGH,   refs.moduleB,   camera, w, h,
                                         { x: 14, y: 13, z: 0 });
  // Driveway callout: late Stage 12. Per user request, moved BACK to the
  // RIGHT side (closer to the house, which sits in the right half of the
  // screen). Timing in timeline.js is staggered so this only fires AFTER
  // the utilities callout has faded out — both can share the bottom-right
  // slot without temporal overlap.
  if (dVisible) {
    const walkway = refs.porch?.getObjectByName('porch_walkway') ?? refs.porch;
    updateCalloutGroupSingle(_drivewayEl, LABEL_TOP_FRAC_BOTTOM, walkway, camera, w, h,
                             { x: 0, y: 0.1, z: 0 });
  }
  // Sewer + water callout: Section SW1. The trenches sit slightly LEFT of
  // camera center (camera centerX = 30 = SITE_X, trenches at SITE_X - 10).
  // Place the label MID-LEFT (leftSide = true at LABEL_TOP_FRAC_MID) so
  // the text sits in the empty band ABOVE the trenches and the leader
  // line drops a short distance down to the parallel-pipe area below.
  if (swVisible) {
    const trench = refs.sitework?.getObjectByName('sewer_trench') ?? refs.sitework;
    updateCalloutGroupSingle(_sewerWaterEl, LABEL_TOP_FRAC_MID, trench, camera, w, h,
                             { x: 0, y: 0.5, z: 0 }, /* leftSide */ true);
  }
  // Foundation construction callout: Section SW2. Aim at the perimeter of
  // the foundation, top of wall (~ 0.8 ft = wallH).
  if (fbVisible) {
    updateCalloutGroupSingle(_foundBuildEl, LABEL_TOP_FRAC_MID, refs.foundation, camera, w, h,
                             { x: 0, y: 0.8, z: 0 });
  }
  // Roof-fold callout: Stage 11 (Transport). Points at module B's roof
  // peak as the rafter hinges fold flat. Label sits in the upper-right
  // band so the leader line drops down to the roof from above.
  if (rfVisible) {
    updateCalloutGroupSingle(_roofFoldEl, LABEL_TOP_FRAC_HIGH, refs.moduleB, camera, w, h,
                             { x: 0, y: 12, z: 0 });
  }
}
