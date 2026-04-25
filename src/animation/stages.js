// Stage animation functions. Each stage takes the master timeline + a refs object
// (containing references to the geometry groups it animates) + a start time.
//
// Convention:
//   - Geometry is built at REST POSITION in main.js. Stages 2..9 are HIDDEN at startup.
//   - Each stage uses tl.set(...visible: true...) at its start time, then GSAP `from()`
//     tweens that animate FROM an offset/initial-state TO the rest position.
//   - Stages may also drive UI via setRaw(...) callbacks at their start times.

import gsap from 'gsap';
import { setRaw } from '../ui/stageLabel.js';

// ---------- Helpers ----------

/** Update the stage indicator at time `t`. */
function announce(tl, t, num, name) {
  tl.call(() => setRaw(`<span class="stage-num">Stage ${num}</span> · ${name}`), null, t);
}

/** Find first descendant by exact name. */
function findByName(root, name) {
  let hit = null;
  root.traverse((o) => { if (!hit && o.name === name) hit = o; });
  return hit;
}

/** Collect all descendants whose name starts with prefix. */
function findByPrefix(root, prefix) {
  const list = [];
  root.traverse((o) => { if (o.name && o.name.startsWith(prefix)) list.push(o); });
  return list;
}

// ============================================================================
// STAGE 1 — Floor system & module base (5.5 sec)
// ============================================================================
export function stageFloor(tl, refs, t0) {
  announce(tl, t0, 1, 'Floor system & module base');
  // Stage 1 — same body as before

  for (const m of [refs.moduleA, refs.moduleB]) {
    const frame = findByName(m, 'FloorFrame');
    if (!frame) continue;

    // Show the frame group (children control their own visibility for staging)
    tl.set(frame, { visible: true }, t0);

    // Carrier beams: slide UP from below the camera frame (Y -20 → original)
    const beams = findByPrefix(frame, 'carrier_');
    beams.forEach((b, i) => {
      tl.from(b.position, {
        y: b.position.y - 20,
        duration: 0.7,
        ease: 'power2.out',
      }, t0 + i * 0.05);
    });

    // Rim joists: drop in from above
    const rims = findByPrefix(frame, 'rim_');
    rims.forEach((r, i) => {
      tl.from(r.position, {
        y: r.position.y + 14,
        duration: 0.5,
        ease: 'back.out(1.4)',
      }, t0 + 0.7 + i * 0.06);
    });

    // Floor joists: rapid stagger drop with bounce settle
    const joists = findByPrefix(frame, 'joist_');
    joists.forEach((j, i) => {
      tl.from(j.position, {
        y: j.position.y + 12,
        duration: 0.45,
        ease: 'back.out(1.4)',
      }, t0 + 1.1 + i * 0.05);
    });
  }
}

// ============================================================================
// STAGE 2 — Floor MEP rough-in (3.5 sec)
// In-cavity plumbing/electrical/HVAC runs through the floor frame, before the
// subfloor covers them. Each run is end-anchored along its axis; animate the
// matching scale[axis] from 0 → 1 to "draw" the run from one end.
// ============================================================================
export function stageFloorMEP(tl, refs, t0) {
  announce(tl, t0, 2, 'Floor MEP rough-in');

  for (const m of [refs.moduleA, refs.moduleB]) {
    const rough = findByName(m, 'MEP_FloorRough');
    if (!rough) continue;
    tl.set(rough, { visible: true }, t0);

    // Cascade by type: electrical → HVAC → plumbing
    const byType = {
      electrical: rough.children.filter(r => r.userData.mepType === 'electrical'),
      hvac:       rough.children.filter(r => r.userData.mepType === 'hvac'),
      plumbing:   rough.children.filter(r => r.userData.mepType === 'plumbing'),
    };
    const typeOffset = { electrical: 0.0, hvac: 0.9, plumbing: 1.7 };

    for (const type of ['electrical', 'hvac', 'plumbing']) {
      const offsetT = typeOffset[type];
      byType[type].forEach((r, i) => {
        const axis = r.userData.runAxis;
        tl.set(r.scale, { [axis]: 0.001 }, t0);
        tl.to(r.scale, {
          [axis]: 1,
          duration: 0.6,
          ease: 'power2.out',
        }, t0 + offsetT + i * 0.12);
      });
    }
  }
}

// ============================================================================
// STAGE 3 — Subfloor deck (3 sec)
// ============================================================================
export function stageSubfloor(tl, refs, t0) {
  announce(tl, t0, 3, 'Subfloor deck');

  for (const m of [refs.moduleA, refs.moduleB]) {
    const sf = findByName(m, 'Subfloor');
    if (!sf) continue;
    tl.set(sf, { visible: true }, t0);

    const panels = findByPrefix(sf, 'subfloor_');
    panels.forEach((p, i) => {
      tl.from(p.position, {
        y: p.position.y + 15,
        duration: 0.55,
        ease: 'power2.out',
      }, t0 + i * 0.08);
    });

    // Once the subfloor is down, hide the in-floor MEP rough-in — those runs are
    // now covered (and would otherwise still be visible underneath in some camera
    // angles). Removes MEP graphics after their phase is complete.
    const floorRough = findByName(m, 'MEP_FloorRough');
    if (floorRough) tl.set(floorRough, { visible: false }, t0 + 3.0);
  }
}

// ============================================================================
// STAGE 4 — Subfloor MEP & floor-mounted fixtures (4 sec)
// ============================================================================
export function stageMEPStubs(tl, refs, t0) {
  announce(tl, t0, 4, 'Subfloor MEP & floor-mounted fixtures');

  for (const m of [refs.moduleA, refs.moduleB]) {
    const stubs = findByName(m, 'MEP_Stubs');
    if (!stubs) continue;
    tl.set(stubs, { visible: true }, t0);

    // Each stub's geometry has origin at bottom — animate scale.y 0 → 1 to grow up
    const stubMeshes = stubs.children;
    stubMeshes.forEach((s, i) => {
      // Initial state via .set then animate
      tl.set(s.scale, { y: 0.001 }, t0);
      tl.to(s.scale, {
        y: 1,
        duration: 0.55,
        ease: 'back.out(1.4)',
      }, t0 + 0.2 + i * 0.1);
    });
  }
}

// ============================================================================
// STAGE 5 — Wall framing (6.5 sec) — HERO
// Walls slide in horizontally from each module's outboard side. Module A's
// walls approach from the west (-X); Module B's from the east (+X). They
// converge at the marriage wall (world x=0), stitching the duplex pair together.
// (Replaces earlier flop-up-from-floor animation per user request.)
// ============================================================================
export function stageWalls(tl, refs, t0) {
  announce(tl, t0, 5, 'Wall framing');

  const SLIDE_DISTANCE = 50;        // feet of horizontal travel before arriving at rest

  const slideInWall = (placer, atTime, dur, moduleSign, ease = 'power2.out') => {
    // Walk parent chain up to the module, setting visibility at the start time.
    // (Walls group is hidden at startup; this reveals it for stage 5.)
    let p = placer;
    while (p) {
      tl.set(p, { visible: true }, atTime);
      p = p.parent;
      if (p?.name === 'Module_A' || p?.name === 'Module_B') break;
    }
    tl.from(placer.position, {
      x: placer.position.x + moduleSign * SLIDE_DISTANCE,
      duration: dur,
      ease,
    }, atTime);
  };

  for (let mi = 0; mi < 2; mi++) {
    const m = mi === 0 ? refs.moduleA : refs.moduleB;
    const tStart = t0 + mi * 0.3;          // Module B begins 0.3s into A's slide
    const moduleSign = mi === 0 ? -1 : +1; // A from -X, B from +X

    // Order per user request: interior partition (smaller wall framing) goes
    // in FIRST, then exterior walls (long + short) follow.

    // 1) Interior partition: arrives first, 0.6s
    const partPlacer = findByName(m, 'wall_place_partition_1');
    if (partPlacer) slideInWall(partPlacer, tStart, 0.6, moduleSign);

    // 2) Long exterior walls: simultaneous slide in, 1.0s
    const longPlacers = ['longWest', 'longEast'].map(n => findByName(m, `wall_place_${n}`));
    longPlacers.forEach(p => p && slideInWall(p, tStart + 0.7, 1.0, moduleSign));

    // 3) Short exterior walls: 0.8s, slight stagger between north/south
    const shortPlacers = ['shortNorth', 'shortSouth'].map(n => findByName(m, `wall_place_${n}`));
    shortPlacers.forEach((p, i) => p && slideInWall(p, tStart + 1.9 + i * 0.1, 0.8, moduleSign));
  }
}

// ============================================================================
// STAGE 6 — MEP rough-in (in-wall) (5 sec)
// ============================================================================
export function stageMEPRoughIn(tl, refs, t0) {
  announce(tl, t0, 6, 'MEP rough-in');

  for (const m of [refs.moduleA, refs.moduleB]) {
    const rough = findByName(m, 'MEP_RoughIn');
    if (!rough) continue;
    tl.set(rough, { visible: true }, t0);

    // Cascade by type: electrical → HVAC → plumbing
    const byType = {
      electrical: rough.children.filter(r => r.userData.mepType === 'electrical'),
      hvac:       rough.children.filter(r => r.userData.mepType === 'hvac'),
      plumbing:   rough.children.filter(r => r.userData.mepType === 'plumbing'),
    };
    const typeOffset = { electrical: 0.0, hvac: 1.4, plumbing: 2.8 };

    for (const type of ['electrical', 'hvac', 'plumbing']) {
      const offsetT = typeOffset[type];
      byType[type].forEach((r, i) => {
        // Geometry built end-anchored along its run axis (cylinder geometry was rotated
        // so its length is along the named axis). Scale that exact axis from 0 → 1 to
        // grow the run from one end.
        const axis = r.userData.runAxis;          // 'x' or 'z'
        tl.set(r.scale, { [axis]: 0.001 }, t0);
        tl.to(r.scale, {
          [axis]: 1,
          duration: 0.7,
          ease: 'power2.out',
        }, t0 + offsetT + i * 0.15);
      });
    }

    // Hide the in-wall MEP runs at the END of Stage 6 — the next stage covers
    // them with insulation + drywall and they'd otherwise show through cavities
    // in some camera angles.
    tl.set(rough, { visible: false }, t0 + 5.0);
  }
}

// ============================================================================
// STAGE 8 — Roof framing (5.5 sec)
// (Now placed AFTER insulation/drywall per user reorder.)
// ============================================================================
export function stageRoof(tl, refs, t0) {
  announce(tl, t0, 8, 'Ceiling, roof framing & marriage wall prep');

  for (const m of [refs.moduleA, refs.moduleB]) {
    const roof = findByName(m, "Roof");
    if (!roof) continue;
    tl.set(roof, { visible: true }, t0);

    // v3 roof is split across 3 sub-groups (Roof_static + Roof_hinge_west +
    // Roof_hinge_east). For the truss-drop animation we want individual truss
    // members to drop, grouped by trussIndex so the chord, king-post, and the
    // two rafters of one truss arrive together. Hinges themselves don't move
    // here — only their CHILD positions (which are in hinge-local coords)
    // animate, so the eave pivots stay put.
    const byIndex = new Map();
    roof.traverse((o) => {
      const idx = o.userData?.trussIndex;
      if (idx === undefined) return;
      if (o.name && o.name.startsWith('roof_slab')) return;     // slabs handled in Stage 9
      if (!byIndex.has(idx)) byIndex.set(idx, []);
      byIndex.get(idx).push(o);
    });

    const indices = [...byIndex.keys()].sort((a, b) => a - b);
    indices.forEach((idx, order) => {
      const members = byIndex.get(idx);
      members.forEach((mesh) => {
        const restY = mesh.position.y;
        tl.set(mesh.position,    { y: restY + 25 }, t0);
        tl.set(mesh,             { visible: false }, t0);
        tl.set(mesh,             { visible: true  }, t0 + 0.2 + order * 0.15);
        tl.to (mesh.position,    { y: restY, duration: 0.8, ease: 'power2.out' },
                                                       t0 + 0.2 + order * 0.15);
      });
    });
  }
}

// ============================================================================
// STAGE 7 — Insulation & drywall (4 sec)
// (Now placed BEFORE roof framing per user reorder.)
// ============================================================================
export function stageInsulationDrywall(tl, refs, t0) {
  announce(tl, t0, 7, 'Insulation');

  for (const m of [refs.moduleA, refs.moduleB]) {
    const insulation = findByName(m, 'Insulation');

    // INSULATION: fade in with subtle scale-up, staggered
    // (Drywall is no longer animated here — it ships pre-installed with the
    // walls in Stage 5 per user request.)
    if (insulation) {
      tl.set(insulation, { visible: true }, t0);
      const batts = insulation.children;
      batts.forEach((b, i) => {
        tl.set(b.scale,    { x: 0.92, y: 0.92, z: 0.92 }, t0);
        tl.set(b.material, { opacity: 0 }, t0);
        tl.to(b.material, { opacity: 1.0, duration: 0.4 }, t0 + 0.1 + i * 0.04);
        tl.to(b.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: 'power1.out' },
          t0 + 0.1 + i * 0.04);
      });
    }
  }
}

// ============================================================================
// STAGE 9 — Exterior envelope (5 sec)
// ============================================================================
export function stageExterior(tl, refs, t0) {
  announce(tl, t0, 9, 'Windows, exterior finish & roofing');

  for (const m of [refs.moduleA, refs.moduleB]) {
    const ext = findByName(m, 'Exterior');
    if (!ext) continue;
    tl.set(ext, { visible: true }, t0);

    const sheathing = findByName(ext, 'sheathing');
    const housewrap = findByName(ext, 'housewrap');
    const windows   = findByName(ext, 'windows');
    const siding    = findByName(ext, 'siding');

    // 0) PLYWOOD SHEATHING goes on FIRST — covers the studs from outside.
    //    User-requested layer between studs (with insulation) and housewrap.
    if (sheathing) {
      sheathing.children.forEach((p, i) => {
        const axis = p.userData.sweepAxis;
        tl.set(p.scale, { [axis]: 0.001 }, t0);
        tl.to(p.scale, { [axis]: 1, duration: 0.7, ease: 'power2.out' }, t0 + i * 0.1);
      });
    }

    // 1) Housewrap sweeps over the plywood (starts after plywood is mostly down)
    if (housewrap) {
      housewrap.children.forEach((h, i) => {
        const axis = h.userData.sweepAxis;
        tl.set(h.scale, { [axis]: 0.001 }, t0);
        tl.to(h.scale, { [axis]: 1, duration: 0.7, ease: 'power2.out' }, t0 + 0.7 + i * 0.1);
      });
    }

    // 2) Windows fade/scale in
    if (windows) {
      windows.children.forEach((w, i) => {
        tl.set(w.scale, { x: 0.001, y: 0.001, z: 0.001 }, t0);
        tl.to(w.scale, {
          x: 1, y: 1, z: 1,
          duration: 0.4,
          ease: 'back.out(1.6)',
        }, t0 + 1.5 + i * 0.12);
      });
    }

    // 3) Siding bottom-to-top horizontal courses (~1.5s)
    if (siding) {
      const courses = siding.children;
      courses.sort((a, b) => (a.userData.courseIndex ?? 0) - (b.userData.courseIndex ?? 0));
      const total = courses.length;
      courses.forEach((c, i) => {
        tl.set(c.scale, { y: 0.001 }, t0);
        tl.to(c.scale, {
          y: 1,
          duration: 0.4,
          ease: 'power2.out',
        }, t0 + 2.0 + (i / Math.max(1, total - 1)) * 1.4);
      });
    }

    // 4) Roofing slabs drop from above. v3 has TWO slabs (one per pitch face),
    //    each living inside its own hinge group. Find any descendant mesh whose
    //    name starts with 'roof_slab' and animate them together.
    const slabs = [];
    m.traverse((o) => { if (o.name && o.name.startsWith('roof_slab')) slabs.push(o); });
    slabs.forEach((slab, i) => {
      const restY = slab.position.y;
      tl.set(slab,          { visible: false                  }, t0);
      tl.set(slab.position, { y: restY + 25                   }, t0);
      tl.set(slab,          { visible: true                   }, t0 + 3.5 + i * 0.1);
      tl.to (slab.position, { y: restY, duration: 1.0, ease: 'power2.in' }, t0 + 3.5 + i * 0.1);
    });

    // 5) Once the slabs are fully placed, hide the underlying truss framing
    //    (Roof_static = chords + king-posts) and the rafters. The shingles are
    //    the visible finish from now on — exposed framing through them looks
    //    wrong from the iso angle. Both must be re-hidden at this point even
    //    if the fold animation runs later (the slabs are what fold visibly).
    const slabFinishedAt = t0 + 3.5 + Math.max(0, slabs.length - 1) * 0.1 + 1.0;
    const trussStatic = findByName(m, 'Roof_static');
    if (trussStatic) tl.set(trussStatic, { visible: false }, slabFinishedAt);
    m.traverse((o) => {
      if (o.name && (o.name.startsWith('rafter_west_') || o.name.startsWith('rafter_east_'))) {
        tl.set(o, { visible: false }, slabFinishedAt);
      }
    });
  }
}

// ============================================================================
// STAGE 10 — Interior finish (v3)
//   * Stagger-reveal interior items.
//   * NO roof lift — the lower module is open-topped (no roof) and lifting the
//     upper module's roof would just expose the inside of the lower module
//     through it. Interior reveals fine under the existing roof; user can see
//     into the upper through windows / open doorways.
//   * NO combine/separate — modules stay in their factory positions; stacking
//     happens at the site stage (added in a later commit).
// ============================================================================
import { MODULE } from '../utils/dimensions.js';

export function stageInteriorComplete(tl, refs, t0) {
  announce(tl, t0, 10, 'Interior finish');

  for (const m of [refs.moduleA, refs.moduleB]) {
    const inter = findByName(m, 'Interior');
    if (!inter) continue;
    tl.set(inter, { visible: true }, t0);

    inter.children.forEach((c, i) => {
      tl.set(c.scale, { x: 0.001, y: 0.001, z: 0.001 }, t0);
      tl.to(c.scale, {
        x: 1, y: 1, z: 1,
        duration: 0.55,
        ease: 'back.out(1.4)',
      }, t0 + 0.5 + i * 0.06);
    });
  }
}

// ============================================================================
// STAGE 11 — Transport (10 sec)
//   1. Roofs hinge DOWN (fold flat for lower transport profile)
//   2. Trucks slide in from +Z, position trailers under modules
//   3. Hold briefly (loaded)
//   4. Trucks + modules + trailers drive away in -Z together
// ============================================================================
export function stageTransport(tl, refs, t0) {
  announce(tl, t0, 11, 'Transport');

  // ---- 1) Fold rafter hinges DOWN inward (0.0 → 1.8s) ----
  // v3 roof: TWO hinges per module roof (Roof_hinge_west and Roof_hinge_east),
  // each carrying one rafter per truss + one shingle slab. Folding rotates
  // each hinge around its eave pivot so the rafter+slab swings inward and
  // lays flat onto the static bottom chords. Each hinge has userData.foldSign
  // (-1 for west, +1 for east) and userData.foldAngle (the rafter slope).
  // foldSign × foldAngle gives the rotation.z that brings the rafter to
  // horizontal pointing inward.
  for (const m of [refs.moduleA, refs.moduleB]) {
    for (const hingeName of ['Roof_hinge_west', 'Roof_hinge_east']) {
      const hinge = findByName(m, hingeName);
      if (!hinge) continue;
      const finalZ = hinge.userData.foldSign * hinge.userData.foldAngle;
      tl.to(hinge.rotation, {
        z: finalZ,
        duration: 1.6,
        ease: 'power2.inOut',
      }, t0 + 0.2);
    }

    // King-posts (vertical center webs in Roof_static) would otherwise stick
    // straight up after the fold. Stage 9 already hides Roof_static, but in
    // case a viewer scrubs back to a state where it's visible, scale the
    // king-posts to zero on the same timing as the fold so they collapse with
    // the fold rather than remain standing.
    m.traverse((o) => {
      if (o.name && o.name.startsWith('kingpost_')) {
        tl.to(o.scale, {
          x: 0.001, y: 0.001, z: 0.001,
          duration: 1.2,
          ease: 'power2.inOut',
        }, t0 + 0.4);
      }
    });
  }

  // ---- 2) Trucks slide in from +Z (2.0 → 3.7s) ----
  // Trucks start far +Z (off-screen), drive to the loading position where the
  // trailer is centered under its module.
  const TRUCK_OFF_SCREEN_Z = 130;     // far +Z starting point
  const TRUCK_LOAD_Z       = 0;       // trailer centered on module (z=0)
  const SLIDE_IN_AT  = t0 + 2.0;
  const SLIDE_IN_DUR = 1.7;
  for (const t of [refs.truckA, refs.truckB]) {
    if (!t) continue;
    tl.set(t, { visible: true }, SLIDE_IN_AT);
    tl.set(t.position, { z: TRUCK_OFF_SCREEN_Z }, SLIDE_IN_AT);
    tl.to (t.position, {
      z: TRUCK_LOAD_Z,
      duration: SLIDE_IN_DUR,
      ease: 'power2.out',
    }, SLIDE_IN_AT);
  }

  // ---- 3) Hold loaded (3.7 → 4.3s) ----

  // ---- 4) Trucks + modules + trailers drive away in -Z (4.3 → 9.5s) ----
  // Drive far enough to exit the camera frustum. Animate truck.position.z and
  // module.position.z together so they move as a unit.
  const DRIVE_AT  = t0 + 4.3;
  const DRIVE_DUR = 5.0;
  const DRIVE_DZ  = -150;             // travel 150 ft -Z (past the far edge)

  if (refs.truckA && refs.moduleA) {
    tl.to([refs.truckA.position, refs.moduleA.position],
      { z: '+=' + DRIVE_DZ, duration: DRIVE_DUR, ease: 'power1.in' },
      DRIVE_AT);
  }
  if (refs.truckB && refs.moduleB) {
    tl.to([refs.truckB.position, refs.moduleB.position],
      { z: '+=' + DRIVE_DZ, duration: DRIVE_DUR, ease: 'power1.in' },
      DRIVE_AT);
  }
}
