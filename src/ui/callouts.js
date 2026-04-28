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

// Compute the (approximate) anchor points on the bottom edge of a callout's
// text label — where the two leader lines emerge. Uses getBBox() on the SVG
// text node so it stays correct as the text wraps or the font scales.
function textAnchorPoints(textEl, w) {
  let bbox;
  try {
    bbox = textEl.getBBox();
  } catch {
    bbox = { width: 280, height: 22 };
  }
  const cx = w / 2;                          // text is anchor="middle" at x=50%
  const halfW = bbox.width / 2;
  const lineY = parseFloat(textEl.getAttribute('y')) + 8;   // slightly below baseline
  return {
    left:  { x: cx - halfW + 16, y: lineY },
    right: { x: cx + halfW - 16, y: lineY },
  };
}

function updateCalloutGroup(group, textY, moduleA, moduleB, camera, w, h) {
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
  text.setAttribute('x', w / 2);
  text.setAttribute('y', textY);

  const anchors = textAnchorPoints(text, w);

  // Two lines: anchor[left] → projected position of whichever module appears
  // on the LEFT half of the screen; anchor[right] → the RIGHT module.
  // (Modules can swap sides slightly under camera orbit, so we sort by x.)
  const [left, right] = a.x <= b.x ? [a, b] : [b, a];

  const lineA = group.querySelector('.callout-line-a');
  const lineB = group.querySelector('.callout-line-b');
  lineA.setAttribute('x1', anchors.left.x);
  lineA.setAttribute('y1', anchors.left.y);
  lineA.setAttribute('x2', left.x);
  lineA.setAttribute('y2', left.y);
  lineB.setAttribute('x1', anchors.right.x);
  lineB.setAttribute('y1', anchors.right.y);
  lineB.setAttribute('x2', right.x);
  lineB.setAttribute('y2', right.y);

  const dotA = group.querySelector('.callout-dot-a');
  const dotB = group.querySelector('.callout-dot-b');
  dotA.setAttribute('cx', left.x);
  dotA.setAttribute('cy', left.y);
  dotB.setAttribute('cx', right.x);
  dotB.setAttribute('cy', right.y);
}

let _modulesEl = null;
let _codesEl   = null;

export function updateCallouts(refs, camera, renderer) {
  if (!_modulesEl) _modulesEl = document.getElementById('callout-modules');
  if (!_codesEl)   _codesEl   = document.getElementById('callout-codes');

  // Skip work entirely when both groups are invisible — getBBox on SVG and
  // matrix multiplies aren't free, and these callouts are only on screen
  // for ~10 s out of an 80 s animation.
  const mVisible = _modulesEl && +getComputedStyle(_modulesEl).opacity > 0.001;
  const cVisible = _codesEl   && +getComputedStyle(_codesEl).opacity   > 0.001;
  if (!mVisible && !cVisible) return;

  let w = window.innerWidth, h = window.innerHeight;
  if (renderer) {
    const size = renderer.getSize(new THREE.Vector2());
    w = size.x; h = size.y;
  }

  if (mVisible) updateCalloutGroup(_modulesEl, h * 0.16, refs.moduleA, refs.moduleB, camera, w, h);
  if (cVisible) updateCalloutGroup(_codesEl,   h * 0.16, refs.moduleA, refs.moduleB, camera, w, h);
}
