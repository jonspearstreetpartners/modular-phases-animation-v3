// MEP — Stage 3 (floor stub-ups + floor-mounted fixtures) and Stage 5 (in-wall rough-in).
//
// Stub-up convention: each stub mesh's geometry is translated so its BOTTOM is at
// the mesh's local origin. So animating mesh.scale.y from 0 → 1 grows it upward.
//
// Rough-in convention: each run is a cylinder oriented along its length axis, with
// geometry translated so one END is at the local origin. Animating scale on that
// axis from 0 → 1 "draws" the line from one end.

import * as THREE from 'three';
import { COLORS } from '../utils/colors.js';
import { matte, shared } from '../utils/materials.js';
import { MODULE, INCH } from '../utils/dimensions.js';

const plumbingMat   = () => shared('plumbing',  () => matte(COLORS.plumbing,   { roughness: 0.5, metalness: 0.15 }));
const electricalMat = () => shared('electrical',() => matte(COLORS.electrical, { roughness: 0.6 }));
const hvacMat       = () => shared('hvac',      () => matte(COLORS.hvac,       { roughness: 0.6 }));
const fixtureMat    = () => shared('fixture',   () => matte('#A8A8A2',         { roughness: 0.5, metalness: 0.3 }));
const tankMat       = () => shared('tank',      () => matte('#C9C9C4',         { roughness: 0.6, metalness: 0.4 }));

const subfloorTop = MODULE.joistHeight + MODULE.subfloorThickness;

// Helper: cylinder with origin at bottom (so scaleY animates upward growth)
function upStub({ radius, height, mat, segs = 14 }) {
  const geo = new THREE.CylinderGeometry(radius, radius, height, segs);
  geo.translate(0, height / 2, 0);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

// Helper: box with origin at bottom
function upBox({ w, h, d, mat }) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, h / 2, 0);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Helper: cylinder oriented along world axis with origin at one END (for "draw" effect)
function endAnchoredRun({ length, radius = 0.08, axis = 'x', mat, segs = 10 }) {
  // CylinderGeometry's natural axis is Y. Build along Y, translate, then rotate to target.
  const geo = new THREE.CylinderGeometry(radius, radius, length, segs);
  geo.translate(0, length / 2, 0);     // origin at bottom end
  if (axis === 'x') geo.rotateZ(-Math.PI / 2);  // bottom end now at -X
  if (axis === 'z') geo.rotateX( Math.PI / 2);  // bottom end now at +Z
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = false;                // thin runs — shadows aren't worth the perf
  m.userData.runAxis = axis;
  m.userData.runLength = length;
  return m;
}

/**
 * Stage 2 — In-FLOOR-CAVITY MEP rough-in for ONE module.
 * Runs of plumbing/electrical/HVAC routed through the floor frame cavity (between
 * joists), at floor-frame mid-height. These get covered by the subfloor in Stage 3.
 *
 * Each run is end-anchored along its length axis (cylinder geometry rotated so
 * the cylinder's length lies along world X or Z, with one end at the local origin).
 * Animate `scale[runAxis]` from 0 → 1 to draw the run from one end.
 */
export function buildModuleFloorMEP({ side = 'A' } = {}) {
  const group = new THREE.Group();
  group.name = 'MEP_FloorRough';

  const L = MODULE.length;
  const W = MODULE.width;
  const inboard = side === 'A' ? +1 : -1;

  // Floor cavity Y: midway between joist bottom and joist top
  const yCavity = MODULE.joistHeight / 2;

  const runs = [
    // Plumbing supply line — long run along the wet wall toward the marriage wall
    { type: 'plumbing',  axis: 'z', length: L * 0.7, radius: 0.13,
      pos: [ inboard * 4.5, yCavity, -L * 0.30 ] },
    // Drain/waste line — larger, runs partial length in a different cavity
    { type: 'plumbing',  axis: 'z', length: L * 0.45, radius: 0.20,
      pos: [ inboard * 3.0, yCavity - 0.1, -L * 0.10 ] },
    // Cross-cavity supply branch (X direction, between two joists)
    { type: 'plumbing',  axis: 'x', length: 9, radius: 0.10,
      pos: [-W / 2 + 0.5, yCavity, -L * 0.05 ] },

    // Main electrical feed along the length
    { type: 'electrical',axis: 'z', length: L * 0.8, radius: 0.05,
      pos: [-inboard * 3, yCavity + 0.15, -L * 0.20 ] },
    // Branch toward outboard wall
    { type: 'electrical',axis: 'x', length: 8, radius: 0.05,
      pos: [-W / 2 + 0.4, yCavity + 0.20,  L * 0.18 ] },

    // HVAC supply trunk — bigger, in the center
    { type: 'hvac',      axis: 'z', length: L * 0.55, radius: 0.32,
      pos: [ 0, yCavity, L * 0.05 ] },
  ];

  const matFor = (type) => ({
    electrical: electricalMat(),
    hvac:       hvacMat(),
    plumbing:   plumbingMat(),
  }[type]);

  for (let i = 0; i < runs.length; i++) {
    const r = runs[i];
    const run = endAnchoredRun({
      length: r.length,
      axis: r.axis,
      radius: r.radius,
      mat: matFor(r.type),
    });
    run.position.set(...r.pos);
    run.name = `floorrun_${r.type}_${i}`;
    run.userData.mepType = r.type;
    group.add(run);
  }

  return group;
}

/**
 * Stage 4 — Floor stub-ups + floor-mounted fixtures for ONE module.
 * Side-aware so plumbing manifolds shift toward the marriage wall (where wet
 * walls back up to each other in the duplex pair).
 */
export function buildModuleStubs({ side = 'A' } = {}) {
  const group = new THREE.Group();
  group.name = 'MEP_Stubs';

  const L = MODULE.length;
  const inboard = side === 'A' ? +1 : -1;   // direction toward marriage wall

  // 4 plumbing stub-ups clustered near the kitchen/bath area
  const plumbHeight = 1.8;
  const plumbR = 0.13;
  const plumbing = [
    [ inboard *  4.5, -L * 0.18 ],   // sink supply
    [ inboard *  4.5, -L * 0.10 ],   // sink drain
    [ inboard *  3.0, -L * 0.14 ],   // dishwasher
    [ inboard *  4.5,  L * 0.05 ],   // bath
  ];
  for (let i = 0; i < plumbing.length; i++) {
    const [x, z] = plumbing[i];
    const stub = upStub({ radius: plumbR, height: plumbHeight, mat: plumbingMat() });
    stub.position.set(x, subfloorTop, z);
    stub.name = `stub_plumb_${i}`;
    group.add(stub);
  }

  // 3 electrical stub-ups (smaller, junction-box style)
  const electrical = [
    [ inboard *  2.0, -L * 0.08 ],
    [ inboard * -2.5,  L * 0.10 ],
    [ inboard *  3.5,  L * 0.30 ],
  ];
  for (let i = 0; i < electrical.length; i++) {
    const [x, z] = electrical[i];
    const stub = upStub({ radius: 0.08, height: 1.2, mat: electricalMat() });
    stub.position.set(x, subfloorTop, z);
    stub.name = `stub_elec_${i}`;
    group.add(stub);
  }

  // 2 HVAC floor registers (rectangular boxes)
  const hvac = [
    [-1.5, -L * 0.30 ],
    [ 1.5,  L * 0.20 ],
  ];
  for (let i = 0; i < hvac.length; i++) {
    const [x, z] = hvac[i];
    const reg = upBox({ w: 1.2, h: 0.8, d: 0.4, mat: hvacMat() });
    reg.position.set(x, subfloorTop, z);
    reg.name = `stub_hvac_${i}`;
    group.add(reg);
  }

  // (Kitchen island silhouette removed — full detailed island lives in Stage 10
  // Interior to avoid double-rendering once interiors reveal.)

  // Hot water heater — Module A only (one heater serves the duplex pair).
  if (side === 'A') {
    const heater = upStub({ radius: 0.8, height: 4.5, mat: tankMat() });
    heater.position.set(inboard * 5.5, subfloorTop, -L * 0.40);
    heater.name = 'fixture_heater';
    group.add(heater);
  }

  return group;
}

/**
 * Stage 5 — In-wall / in-ceiling MEP rough-in for ONE module.
 * Built as a set of straight cylindrical "runs" between key points. Each run is
 * end-anchored so animation can draw it from origin to full length.
 *
 * Runs layered by type so the timeline can cascade them: electrical first
 * (fastest), then HVAC, then plumbing.
 */
export function buildModuleRoughIn({ side = 'A' } = {}) {
  const group = new THREE.Group();
  group.name = 'MEP_RoughIn';

  const W = MODULE.width;
  const L = MODULE.length;
  const inboard = side === 'A' ? +1 : -1;

  // Wall cavity Y-range: from subfloor top to wall top minus a few inches
  const yLow  = subfloorTop + 1.0;
  const yMid  = subfloorTop + MODULE.wallHeight * 0.55;
  const yHigh = subfloorTop + MODULE.wallHeight - 0.6;

  // Per user request: NO MEP rough-in in/near the interior partition. Stage 6 only
  // shows runs that are clearly along EXTERIOR walls or the center ceiling trunk.
  // (Earlier mid-module branch runs were removed — they read as "in the partition.")

  // --- ELECTRICAL — single full-length run along the outer long wall ---
  const elecRuns = [
    { length: L * 0.85, axis: 'z', pos: [-inboard * (W/2 - 0.4), yMid, -L * 0.4], type: 'electrical' },
  ];

  // --- HVAC — main supply trunk in center ceiling (no mid-module branches) ---
  const hvacRuns = [
    { length: L * 0.85, axis: 'z', pos: [0, yHigh, -L * 0.4], type: 'hvac', radius: 0.35 },
  ];

  // --- PLUMBING — supply line along the wet (marriage-wall-side) long wall ---
  const plumbRuns = [
    { length: L * 0.6, axis: 'z', pos: [inboard * (W/2 - 0.5), yLow, -L * 0.25], type: 'plumbing' },
  ];

  const allRuns = [...elecRuns, ...hvacRuns, ...plumbRuns];
  const matFor = (type) => ({
    electrical: electricalMat(),
    hvac:       hvacMat(),
    plumbing:   plumbingMat(),
  }[type]);
  const defaultRadius = (type) => ({
    electrical: 0.05,
    hvac:       0.30,
    plumbing:   0.13,
  }[type]);

  for (let i = 0; i < allRuns.length; i++) {
    const r = allRuns[i];
    const run = endAnchoredRun({
      length: r.length,
      axis: r.axis,
      radius: r.radius ?? defaultRadius(r.type),
      mat: matFor(r.type),
    });
    run.position.set(...r.pos);
    run.name = `run_${r.type}_${i}`;
    run.userData.mepType = r.type;
    group.add(run);
  }

  return group;
}
