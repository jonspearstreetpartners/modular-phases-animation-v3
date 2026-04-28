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
const LABEL_RIGHT_FRAC      = 0.97;
const LABEL_TOP_FRAC_MID    = 0.42;
const LABEL_TOP_FRAC_BOTTOM = 0.85;

function placeLabel(textEl, w, h, topFrac, rightFrac = LABEL_RIGHT_FRAC) {
  const textX = w * rightFrac;
  const textY = h * topFrac;
  textEl.setAttribute('text-anchor', 'end');
  textEl.setAttribute('x', textX);
  textEl.setAttribute('y', textY);

  let bbox;
  try { bbox = textEl.getBBox(); } catch { bbox = { x: textX - 280, y: textY - 18, width: 280, height: 22 }; }

  return {
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
  // lines emerge from the LEFT edge of the text. Fork shape: line to the
  // higher / further module exits from the top-left, line to the closer /
  // lower module exits from the bottom-left. Use Y-screen position to
  // decide which is which (small Y = higher on screen = further away).
  const [upper, lower] = a.y <= b.y ? [a, b] : [b, a];

  const startX = place.leftEdgeX - 6;          // a hair past the text
  const lineA = group.querySelector('.callout-line-a');
  const lineB = group.querySelector('.callout-line-b');
  lineA.setAttribute('x1', startX);
  lineA.setAttribute('y1', place.topY);
  lineA.setAttribute('x2', upper.x);
  lineA.setAttribute('y2', upper.y);
  lineB.setAttribute('x1', startX);
  lineB.setAttribute('y1', place.botY);
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

export function updateCallouts(refs, camera, renderer) {
  if (!_modulesEl)    _modulesEl    = document.getElementById('callout-modules');
  if (!_codesEl)      _codesEl      = document.getElementById('callout-codes');
  if (!_foundationEl) _foundationEl = document.getElementById('callout-foundation');

  // Skip work entirely when all groups are invisible — getBBox on SVG and
  // matrix multiplies aren't free, and these callouts are only on screen
  // for short windows during the animation.
  const mVisible = _modulesEl    && +getComputedStyle(_modulesEl).opacity    > 0.001;
  const cVisible = _codesEl      && +getComputedStyle(_codesEl).opacity      > 0.001;
  const fVisible = _foundationEl && +getComputedStyle(_foundationEl).opacity > 0.001;
  if (!mVisible && !cVisible && !fVisible) return;

  let w = window.innerWidth, h = window.innerHeight;
  if (renderer) {
    const size = renderer.getSize(new THREE.Vector2());
    w = size.x; h = size.y;
  }

  if (mVisible) updateCalloutGroup(_modulesEl, LABEL_TOP_FRAC_MID, refs.moduleA, refs.moduleB, camera, w, h);
  if (cVisible) updateCalloutGroup(_codesEl,   LABEL_TOP_FRAC_MID, refs.moduleA, refs.moduleB, camera, w, h);
  // Foundation callout sits in the bottom-right — empty space below the
  // foundation pad, matching the user-supplied yellow-circle reference.
  if (fVisible) updateCalloutGroupSingle(_foundationEl, LABEL_TOP_FRAC_BOTTOM, refs.foundation, camera, w, h, 0.5);
}
