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

// Callout label position on screen — right side, ~mid-height, matching the
// yellow-circle reference position the user supplied. text-anchor="end"
// means the position is the RIGHT edge of the text, so the text grows
// leftward and we don't risk overflowing the viewport at any width.
const LABEL_RIGHT_FRAC = 0.97;     // right edge of text, % from left
const LABEL_TOP_FRAC   = 0.42;     // baseline Y, % from top

// Returns { textX, textY, leftEdgeX, topY, botY } for placing the label and
// figuring out where leader lines should emerge from. textPosX is the
// position fed to text@x with text-anchor="end".
function placeLabel(textEl, w, h) {
  const textX = w * LABEL_RIGHT_FRAC;
  const textY = h * LABEL_TOP_FRAC;
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

function updateCalloutGroup(group, _unused, moduleA, moduleB, camera, w, h) {
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
  const place = placeLabel(text, w, h);

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
function updateCalloutGroupSingle(group, _unused, target, camera, w, h, yOffset = 1.0) {
  if (!group || !target) return;

  target.getWorldPosition(_world);
  _world.y += yOffset;
  const p = projectToScreen(_world, camera, w, h);

  const text = group.querySelector('text');
  const place = placeLabel(text, w, h);

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

  if (mVisible) updateCalloutGroup(_modulesEl, h * 0.16, refs.moduleA, refs.moduleB, camera, w, h);
  if (cVisible) updateCalloutGroup(_codesEl,   h * 0.16, refs.moduleA, refs.moduleB, camera, w, h);
  // Foundation is a flat pad — aim a bit higher on the y axis so the dot
  // lands on TOP of the slab rather than under it. Label sits a bit lower
  // (h * 0.22) so it doesn't compete with the brand-tag in the top-right.
  if (fVisible) updateCalloutGroupSingle(_foundationEl, h * 0.22, refs.foundation, camera, w, h, 0.5);
}
