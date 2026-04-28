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
const LABEL_TOP_FRAC_MID       = 0.42;
const LABEL_TOP_FRAC_BOTTOM    = 0.85;
const MOBILE_BREAKPOINT_PX     = 768;

const isMobile = (w) => w <= MOBILE_BREAKPOINT_PX;

// Wrapped versions of the longer callouts, used only when the viewport is
// below the mobile breakpoint. Each entry is an array of lines that will
// render stacked (line height ~ 1.15em) via SVG <tspan>.
const WRAPPED_TEXT = {
  'callout-modules':   ['Two Modules', 'for One House'],
  'callout-codes':     ['Constructed to State', 'Building Codes'],
  'callout-utilities': ['Connect water, sewer,', 'gas and electric'],
  // 'callout-foundation' is short ("Permanent Foundation") — fits on one
  // line at any size, no entry needed.
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

function placeLabel(textEl, w, h, topFrac) {
  const mobile = isMobile(w);
  const rightFrac = mobile ? LABEL_RIGHT_FRAC_MOBILE : LABEL_RIGHT_FRAC_DESKTOP;
  const textX = w * rightFrac;
  const textY = h * topFrac;
  textEl.setAttribute('text-anchor', 'end');
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
  try { bbox = textEl.getBBox(); } catch { bbox = { x: textX - 280, y: textY - 18, width: 280, height: 22 }; }

  return {
    mobile,
    leftEdgeX: bbox.x,
    midY:      bbox.y + bbox.height / 2,
    topY:      bbox.y + 4,
    botY:      bbox.y + bbox.height - 2,
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
function updateCalloutGroupSingle(group, topFrac, target, camera, w, h, yOffset = 1.0) {
  if (!group || !target) return;

  target.getWorldPosition(_world);
  _world.y += yOffset;
  const p = projectToScreen(_world, camera, w, h);

  const text = group.querySelector('text');
  const place = placeLabel(text, w, h, topFrac);

  const line = group.querySelector('line');
  const dot  = group.querySelector('circle');
  line.setAttribute('x1', place.leftEdgeX - 6);
  line.setAttribute('y1', place.midY);
  line.setAttribute('x2', p.x);
  line.setAttribute('y2', p.y);
  dot.setAttribute('cx', p.x);
  dot.setAttribute('cy', p.y);
}

let _modulesEl    = null;
let _codesEl      = null;
let _foundationEl = null;
let _utilitiesEl  = null;

export function updateCallouts(refs, camera, _renderer) {
  if (!_modulesEl)    _modulesEl    = document.getElementById('callout-modules');
  if (!_codesEl)      _codesEl      = document.getElementById('callout-codes');
  if (!_foundationEl) _foundationEl = document.getElementById('callout-foundation');
  if (!_utilitiesEl)  _utilitiesEl  = document.getElementById('callout-utilities');

  // Skip work entirely when all groups are invisible — getBBox on SVG and
  // matrix multiplies aren't free, and these callouts are only on screen
  // for short windows during the animation.
  const mVisible = _modulesEl    && +getComputedStyle(_modulesEl).opacity    > 0.001;
  const cVisible = _codesEl      && +getComputedStyle(_codesEl).opacity      > 0.001;
  const fVisible = _foundationEl && +getComputedStyle(_foundationEl).opacity > 0.001;
  const uVisible = _utilitiesEl  && +getComputedStyle(_utilitiesEl).opacity  > 0.001;
  if (!mVisible && !cVisible && !fVisible && !uVisible) return;

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
  // Utilities callout: late Stage 12, points at the assembled home (lower
  // module is the visible mass at SITE_X by the time this fires). Aim a
  // few feet up the side wall so the dot lands on the house, not the slab.
  if (uVisible) updateCalloutGroupSingle(_utilitiesEl,  LABEL_TOP_FRAC_MID,    refs.moduleA,   camera, w, h, 5.0);
}
