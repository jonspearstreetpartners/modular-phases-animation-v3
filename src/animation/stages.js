// Stage animation functions. Each stage takes the master timeline + a refs object
// (containing references to the geometry groups it animates) + a start time.
//
// Convention:
//   - Geometry is built at REST POSITION in main.js. Stages 2..9 are HIDDEN at startup.
//   - Each stage uses tl.set(...visible: true...) at its start time, then GSAP `from()`
//     tweens that animate FROM an offset/initial-state TO the rest position.
//   - Stages may also drive UI via setRaw(...) callbacks at their start times.

import * as THREE from 'three';
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
// SECTION SW1 — Sewer / water site work (~6.6 sec)
// ============================================================================
// Plays at master time 5.9 → 12.5 (BEFORE the factory phases) — fits in the
// new 'Site Work Construction' window between the intro title and the
// Modular Construction Factory Process title.
//
// For each utility (sewer + water):
//   t+0.0 → t+0.7     trench scales open (dig)
//   t+0.7 → t+1.5     pipe slides in along its length (lay)
//   t+1.7 → t+2.5     dirt cover scales up to bury the trench (fill)
//
// Sewer runs first (slightly larger pipe, leftmost trench), water follows
// with a 0.5 s stagger so the eye reads them as two distinct trenches.
export function stageSiteWork(tl, refs, t0) {
  const sitework = refs.sitework;
  if (!sitework) return;

  // No announce() — the persistent #phase-label at the top already reads
  // "Site Work Construction ~ 20-30 days" through both site-work sections.

  tl.set(sitework, { visible: true }, t0);

  const stagger = { sewer: 0.0, water: 0.5 };
  for (const tag of ['sewer', 'water']) {
    const off = stagger[tag];
    const trench = findByName(sitework, `${tag}_trench`);
    const pipe   = findByName(sitework, `${tag}_pipe`);
    const cover  = findByName(sitework, `${tag}_cover`);

    if (trench) {
      tl.set(trench.scale, { y: 0.001 }, t0);
      tl.to (trench.scale, { y: 1, duration: 0.7, ease: 'power2.out' }, t0 + off);
    }
    if (pipe) {
      tl.set(pipe.scale, { x: 0.001 }, t0);
      tl.to (pipe.scale, { x: 1, duration: 0.8, ease: 'power2.out' }, t0 + off + 0.7);
    }
    if (cover) {
      tl.set(cover.scale, { y: 0.001 }, t0);
      tl.to (cover.scale, { y: 1, duration: 0.8, ease: 'power2.out' }, t0 + off + 1.7);
    }
  }
}

// ============================================================================
// SECTION SW2 — Foundation excavation + perimeter walls (~7.0 sec)
// ============================================================================
// Plays at master time 12.5 → 19.5. Builds the same crawl-space foundation
// the modules later land on in Stage 12, but does it staged so the viewer
// reads:
//   t+0.0 → t+1.2   Inner dirt floor scales up (excavation read-out)
//   t+1.2 → t+3.0   4 perimeter walls scale up one at a time
//   t+3.0 → t+4.0   Interior bearing-wall footing scales up
// Then the foundation is hidden again (~ t+5.5) so it doesn't sit visible
// during the factory phases — it'll be re-shown without animation when
// Stage 12 starts.
export function stageFoundationConstruction(tl, refs, t0) {
  const foundation = refs.foundation;
  if (!foundation) return;

  // No announce() — phase label covers it.

  tl.set(foundation, { visible: true }, t0);

  const dirtNorth = findByName(foundation, 'foundation_dirt_north');
  const dirtSouth = findByName(foundation, 'foundation_dirt_south');
  const wallN     = findByName(foundation, 'foundation_wall_north');
  const wallS     = findByName(foundation, 'foundation_wall_south');
  const wallE     = findByName(foundation, 'foundation_wall_east');
  const wallW     = findByName(foundation, 'foundation_wall_west');
  const footing   = findByName(foundation, 'foundation_bearing_footing');

  // Initial: everything collapsed on its Y axis
  for (const piece of [dirtNorth, dirtSouth, wallN, wallS, wallE, wallW, footing]) {
    if (piece) tl.set(piece.scale, { y: 0.001 }, t0);
  }

  // 1) Excavation — dirt floor halves scale up (reads as ground levelled)
  for (const dirt of [dirtNorth, dirtSouth]) {
    if (dirt) tl.to(dirt.scale, { y: 1, duration: 1.2, ease: 'power2.out' }, t0 + 0.0);
  }

  // 2) Perimeter walls rise — west, east, north, south, staggered
  const wallOrder = [wallW, wallE, wallN, wallS];
  wallOrder.forEach((w, i) => {
    if (w) tl.to(w.scale, { y: 1, duration: 0.6, ease: 'power2.out' }, t0 + 1.2 + i * 0.4);
  });

  // 3) Interior bearing-wall footing
  if (footing) {
    tl.to(footing.scale, { y: 1, duration: 0.8, ease: 'power2.out' }, t0 + 3.0);
  }

  // 4) Hide the foundation at the end of this section so it doesn't sit
  //    visible during the factory phases. Stage 12 will re-show it
  //    without animation (sw2 already animated the construction).
  //    Aligned with the Site Work phase-label fade-out at master 19.5
  //    (= SITEWORK_TIMES.sw_end). t0 = sw2 = 12.5, so 7.0 s in = 19.5.
  tl.set(foundation, { visible: false }, t0 + 7.0);

  // Also hide the sitework geometry — its job is done.
  if (refs.sitework) {
    tl.set(refs.sitework, { visible: false }, t0 + 7.0);
  }
}

// ============================================================================
// STAGE 1 — Floor system & module base (5.5 sec)
// ============================================================================
export function stageFloor(tl, refs, t0) {
  announce(tl, t0, 2, 'Floor system & module base');
  // Stage 1 — same body as before

  for (const m of [refs.moduleA, refs.moduleB]) {
    const frame = findByName(m, 'FloorFrame');
    if (!frame) continue;

    // Show the frame group (children control their own visibility for staging)
    tl.set(frame, { visible: true }, t0);

    // (v3: carrier beams removed — no more steel chassis under the floor.)

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
  announce(tl, t0, 3, 'Floor MEP rough-in');

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
  announce(tl, t0, 4, 'Subfloor deck');

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
  announce(tl, t0, 5, 'Subfloor MEP & floor-mounted fixtures');

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
  announce(tl, t0, 6, 'Wall framing');

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
  announce(tl, t0, 7, 'MEP rough-in');

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
// STAGE 8 — Roof drop-in + decking + shingles (5.5 sec)
// (Per user request: the entire truss assembly is pre-fabricated WITH the
//  ceiling drywall already attached and the whole unit lowers as one piece.
//  AFTER it lands, the roof decking — plywood/OSB on top of the rafters —
//  drops into place, and finally the shingle slabs drop on top of the
//  decking. The full roof system (framing → deck → shingles) is finished
//  here, so Stage 9 only handles the exterior WALL envelope.)
// ============================================================================
export function stageRoof(tl, refs, t0) {
  announce(tl, t0, 8, 'Roof & ceiling drop-in');

  const DROP_HEIGHT      = 22;     // ft above rest position when offstage
  const DROP_DURATION    = 1.6;    // truss assembly fall duration
  const DROP_DELAY       = 0.3;    // small pause after the stage label appears

  // Decking timing: starts shortly after the trusses settle, with a small
  // west→east stagger so the install reads as sequential.
  const DECK_DROP_AT_BASE = DROP_DELAY + DROP_DURATION + 0.2;     // ≈ 2.1 s
  const DECK_DROP_HEIGHT  = 12;
  const DECK_DROP_DUR     = 0.9;
  const DECK_STAGGER      = 0.25;

  // Shingle timing: drops onto the freshly-laid deck. Latest-deck-lands at
  // DECK_DROP_AT_BASE + (n-1)*DECK_STAGGER + DECK_DROP_DUR; we add ~0.3 s
  // so the deck visibly settles before shingles arrive.
  const SHINGLE_AT_BASE   = DECK_DROP_AT_BASE + DECK_STAGGER + DECK_DROP_DUR + 0.3;  // ≈ 3.65 s
  const SHINGLE_HEIGHT    = 25;
  const SHINGLE_DROP_DUR  = 0.9;
  const SHINGLE_STAGGER   = 0.15;

  for (const m of [refs.moduleA, refs.moduleB]) {
    const roof = findByName(m, 'Roof');
    if (!roof) continue;

    // 1) Lift the whole roof group (trusses + ceiling drywall + hinges +
    //    decks + slabs) up by DROP_HEIGHT, reveal it, then ease the entire
    //    unit straight down to rest. Position-based animation keeps every
    //    child — hinge pivots, slab anchors, rafter angles — perfectly
    //    aligned on the way down.
    const restY = roof.position.y;
    tl.set(roof.position, { y: restY + DROP_HEIGHT }, t0);
    tl.set(roof,          { visible: true }, t0 + DROP_DELAY);
    tl.to (roof.position, {
      y: restY,
      duration: DROP_DURATION,
      ease: 'power2.out',
    }, t0 + DROP_DELAY);

    // 2) Decking + shingle slabs are children of the hinges, so they ride
    //    DOWN with the truss drop. Hide both at t0; each becomes visible
    //    when its own drop tween fires.
    const decks = [];
    const slabs = [];
    roof.traverse((o) => {
      if (!o.name) return;
      if (o.name.startsWith('roof_deck')) decks.push(o);
      if (o.name.startsWith('roof_slab')) slabs.push(o);
    });

    [...decks, ...slabs].forEach((o) => {
      tl.set(o, { visible: false }, t0);
    });

    // 3) Decks drop from above onto the rafters, west then east. Local Y
    //    sits at chordH; we lift each by DECK_DROP_HEIGHT (in hinge-local
    //    coords, which inherit the rafter slope) and ease back down.
    decks.forEach((deck, i) => {
      const restLocalY = deck.position.y;
      tl.set(deck.position, { y: restLocalY + DECK_DROP_HEIGHT }, t0);
      const at = t0 + DECK_DROP_AT_BASE + i * DECK_STAGGER;
      tl.set(deck,          { visible: true }, at);
      tl.to (deck.position, {
        y: restLocalY,
        duration: DECK_DROP_DUR,
        ease: 'power2.in',
      }, at);
    });

    // 4) Shingle slabs drop on top of the decking. Each side handled the
    //    same way as the decks — lift, reveal, ease back down.
    slabs.forEach((slab, i) => {
      const restLocalY = slab.position.y;
      tl.set(slab.position, { y: restLocalY + SHINGLE_HEIGHT }, t0);
      const at = t0 + SHINGLE_AT_BASE + i * SHINGLE_STAGGER;
      tl.set(slab,          { visible: true }, at);
      tl.to (slab.position, {
        y: restLocalY,
        duration: SHINGLE_DROP_DUR,
        ease: 'power2.in',
      }, at);
    });

    // 5) Once the shingles are fully placed, hide everything they cover so
    //    the roof reads as a clean shingled surface from every camera angle.
    //    - Truss FRAMING (chords, king-posts, rafters) — would peek through
    //      from the gable angle.
    //    - DECKING — was bleeding tan through the shingles at edge / coincident
    //      faces despite a SLAB_GAP offset; once the shingles are in place
    //      the deck is fully covered from above anyway, so just hide it.
    //    Ceiling drywall stays visible (it's the room ceiling). Per-mesh by
    //    name so the ceiling drywall isn't caught up in the visibility kill.
    const slabFinishedAt = t0 + SHINGLE_AT_BASE + Math.max(0, slabs.length - 1) * SHINGLE_STAGGER + SHINGLE_DROP_DUR;
    m.traverse((o) => {
      if (!o.name) return;
      if (o.name.startsWith('chord_') ||
          o.name.startsWith('kingpost_') ||
          o.name.startsWith('rafter_west_') ||
          o.name.startsWith('rafter_east_') ||
          o.name.startsWith('roof_deck')) {
        tl.set(o, { visible: false }, slabFinishedAt);
      }
    });

    // 6) Gable-end siding fills are NOT revealed here. They get installed
    //    in Stage 12 (site assembly) after stacking, because if they
    //    appeared during Stage 8 they would block the rafter hinges from
    //    folding flat in Stage 11 for transport.
    m.traverse((o) => {
      if (o.name && o.name.startsWith('gable_')) {
        tl.set(o, { visible: false }, t0);
      }
    });
  }
}

// ============================================================================
// STAGE 7 — (Eliminated)
// ============================================================================
// Insulation now ships pre-installed inside each exterior wall (see
// walls.js / addInsulationToWall). It's visible from the moment the wall
// slides into Stage 5, so there's no longer any "Insulation" reveal.
//
// The function is kept (as a no-op) so the timeline composer can still
// reference it without conditional logic. The 4-s slot it used to occupy
// is now a quiet camera-only beat between MEP rough-in (Stage 6) and the
// roof drop-in (Stage 8).
export function stageInsulationDrywall(_tl, _refs, _t0) {
  // intentionally empty
}

// ============================================================================
// STAGE 9 — Exterior envelope (5 sec)
// ============================================================================
export function stageExterior(tl, refs, t0) {
  announce(tl, t0, 9, 'Windows & exterior finish');

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

    // (Shingle slabs and the post-shingles framing-hide pass moved to
    //  Stage 8 — the full roof system now finishes there.)
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
        duration: 1.0,                    // sped up: was 1.6
        ease: 'power2.inOut',
      }, t0 + 0.1);
    }

    m.traverse((o) => {
      if (o.name && o.name.startsWith('kingpost_')) {
        tl.to(o.scale, {
          x: 0.001, y: 0.001, z: 0.001,
          duration: 0.8,                  // sped up: was 1.2
          ease: 'power2.inOut',
        }, t0 + 0.2);
      }
    });
  }

  // ---- 2) Trucks slide in from +Z (1.2 → 2.4s) — sped up ----
  const TRUCK_OFF_SCREEN_Z = 130;
  const TRUCK_LOAD_Z       = 0;
  const SLIDE_IN_AT  = t0 + 1.2;
  const SLIDE_IN_DUR = 1.2;               // sped up: was 1.7
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

  // ---- 3) (no hold; transition straight to drive-away) ----

  // ---- 4) Trucks + modules drive away in -Z (2.6 → 6.0s) — sped up ----
  const DRIVE_AT  = t0 + 2.6;
  const DRIVE_DUR = 3.0;                  // sped up: was 5.0
  const DRIVE_DZ  = -150;

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

// ============================================================================
// STAGE 12 — Site stacking + porch (~19 sec)
//
// Approach: modules are animated DIRECTLY in world space via tl.to on their
// own .position. The crane's hook is animated separately to "track" the load
// visually (cables stretch via the per-frame updateCraneCables). This avoids
// the parent/attach() bugs in the previous version where reparenting modules
// to the rotated hook caused teleports and frame-mismatched roof unfolds.
//
//   1) 0.0 → 3.0  Trucks + modules drive BACK from -Z to z=0 (factory X)
//   2) 0.3 → 1.1  Foundation appears at SITE_X (early so it precedes the
//                 "Permanent Foundation" callout fade-in at +0.5)
//   3) 3.0 → 5.0  TRUCKS drive away to -Z (modules are now sitting alone)
//   4) 5.0 → 7.0  Crane drives in from far -X
//   5) 7.0 → 11.0 Crane lifts LOWER module → translates EAST to SITE_X →
//                 lowers onto foundation. Hook tracks module height.
//   6) 11.0 → 14.5 Crane lifts UPPER module → translates west toward SITE_X →
//                  lowers onto top of LOWER. Roof rafter hinges UNFOLD back
//                  to 0 during the descent. Hook tracks.
//   7) 14.5 → 16.5 Crane drives away in -X.
//   8) 16.5 → 19.0 Porch reveal piece-by-piece at SITE_X.
// ============================================================================
export function stageSiteStacking(tl, refs, t0) {
  announce(tl, t0, 12, 'Site assembly');

  const truckA  = refs.truckA;
  const truckB  = refs.truckB;
  const moduleA = refs.moduleA;     // lower
  const moduleB = refs.moduleB;     // upper
  const crane   = refs.crane;
  const hook    = crane?.userData?.hook;
  const SITE_X  = refs.siteX ?? 30;

  // World-space references
  const FOUNDATION_TOP = 0.8;
  // No ceilingThickness in STACK_Y — that constant was reserved space for a
  // floor-to-floor sandwich we never modelled, and it was producing a visible
  // air gap between the lower module's wall top and the upper module's floor
  // frame bottom. Stacking the upper module's local origin (= floor frame
  // bottom) directly on top of the lower module's wall plate eliminates the gap.
  const LOWER_HEIGHT =
    MODULE.joistHeight + MODULE.subfloorThickness + MODULE.wallHeight;
  const STACK_Y      = FOUNDATION_TOP + LOWER_HEIGHT;
  const LIFT_HOVER   = 25;

  // Crane parks at a FIXED world X far west of every module + the foundation.
  // The previous parking spot (SITE_X - 22 = +8) sat between the upper module
  // (x=+9.59) and the lower module (x=-9.59), so the crane was driving
  // through the upper module on its way in. -25 keeps it permanently west.
  const CRANE_PARK_X = -25;

  // Hook lives in CRANE-local frame. With crane fixed at world (CRANE_PARK_X,
  // 0, 0), world X to hook-local X is:
  //   hookLocalX = worldX - CRANE_PARK_X
  const worldToHookLocalX = (worldX) => worldX - CRANE_PARK_X;

  // ===== STEP 1 (0 → 3) — Trucks + modules drive back into frame =====
  // From z=-150 (left over from Stage 11) up to z=0. They keep their factory X.
  for (const obj of [truckA, truckB, moduleA, moduleB]) {
    if (obj) tl.to(obj.position, { z: 0, duration: 3.0, ease: 'power2.out' }, t0);
  }

  // ===== STEP 2 (0.3) — Foundation re-appears =====
  // Foundation construction was animated in Section SW2 at the START of
  // the timeline. We hid it after that so it didn't sit visible during the
  // factory phases. Just re-show it here (no scale animation — it's been
  // built already). Each child also needs scale.y = 1 in case GSAP's
  // overwrite-auto reset state doesn't restore it cleanly across replays.
  const foundation = refs.foundation;
  if (foundation) {
    tl.set(foundation, { visible: true }, t0 + 0.3);
    foundation.children.forEach((c) => {
      tl.set(c.scale, { y: 1 }, t0 + 0.3);
    });
  }

  // ===== STEP 3 (3.0 → 5.0) — Trucks drive AWAY in +Z =====
  // Trucks exit to +Z (north — the OPPOSITE direction from the modules they
  // are leaving behind). Previously they drove to -Z which routed them
  // straight through the modules — visible bug.
  for (const truck of [truckA, truckB]) {
    if (truck) tl.to(truck.position, { z: 200, duration: 2.0, ease: 'power1.in' }, t0 + 3.0);
  }

  // ===== STEP 4 (5.0 → 7.0) — Crane drives in to fixed parking + hook positions over LOWER =====
  // Crane parks at world x = CRANE_PARK_X (= -25), permanently clear of all
  // modules and the foundation. After this point it doesn't move again until
  // step 7 when it drives away. Hook does all the work between.
  //
  // KEY FIX: while the crane is driving in, the hook simultaneously slides
  // INWARD (in crane-local) so it ends up over the LOWER module's world X
  // by the time the crane parks. Without this, the hook starts at its
  // boom-tip rest (which puts it at world ~ 0, between the modules) and
  // its first move sweeps EAST across the upper module on the way back to
  // the lower — looks wrong.
  if (crane) {
    tl.set(crane,          { visible: true }, t0 + 5.0);
    tl.set(crane.position, { x: CRANE_PARK_X - 60 }, t0 + 5.0);
    tl.to (crane.position, { x: CRANE_PARK_X, duration: 2.0, ease: 'power2.out' }, t0 + 5.0);

    if (hook && moduleA) {
      // Snap hook elevation up so it doesn't drag through the truck/module on
      // the way in, then slide its X to be over the lower module.
      tl.set(hook.position, { y: 30 }, t0 + 5.0);
      tl.to (hook.position, {
        x: moduleA.position.x - CRANE_PARK_X,    // = worldToHookLocalX(moduleA.x)
        duration: 2.0,
        ease: 'power2.out',
      }, t0 + 5.0);
    }
  }

  // Helper: animate the hook to a given WORLD x and a given y (in crane-local
  // y, which equals world y because crane is on the ground at y=0).
  const moveHook = (worldX, y, atTime, duration, ease = 'power2.inOut') => {
    if (!hook) return;
    tl.to(hook.position, {
      x: worldToHookLocalX(worldX),
      y: y,
      duration,
      ease,
    }, atTime);
  };

  // Hook is always placed WELL ABOVE the module's TOP. Increased from 4 ft
  // because, from the isometric Stage 12 camera angle, a smaller clearance
  // made the hook block + cables visually appear to penetrate the open-top
  // module. With ~16 ft of clearance + only 4 ft of cable above the hook,
  // the rigging reads as a hint of an off-camera lift, never overlapping
  // the load.
  const MODULE_TOP_OFFSET = MODULE.joistHeight + MODULE.subfloorThickness + MODULE.wallHeight; // floor frame bottom -> wall plate top
  const HOOK_CLEAR_ABOVE_TOP = 16;    // ft above module top where the hook sits

  // ===== STEP 5 (7.0 → 11.0) — Crane picks up LOWER, places on foundation =====
  // Hook is ALREADY over the lower module's X from step 4. We SNAP it up to
  // the high "above module" position rather than tweening a descent — the
  // cables/hook should never read as dropping onto the load.
  if (moduleA && hook) {
    const lowerStartX = moduleA.position.x;
    const moduleTopY = () => moduleA.position.y + MODULE_TOP_OFFSET;

    // Phase A (7.0) — snap hook high above the lower module (no descent)
    tl.set(hook.position, {
      x: worldToHookLocalX(lowerStartX),
      y: moduleA.position.y + MODULE_TOP_OFFSET + HOOK_CLEAR_ABOVE_TOP,
    }, t0 + 7.0);

    // Phase B (8.0 → 9.0) — module + hook rise straight up (hook stays above module top)
    tl.to(moduleA.position, {
      y: LIFT_HOVER, duration: 1.0, ease: 'power2.out',
    }, t0 + 8.0);
    moveHook(lowerStartX, LIFT_HOVER + MODULE_TOP_OFFSET + HOOK_CLEAR_ABOVE_TOP,
      t0 + 8.0, 1.0);

    // Phase C (9.0 → 10.0) — module + hook translate east to SITE_X (hook still above)
    tl.to(moduleA.position, {
      x: SITE_X, duration: 1.0, ease: 'power2.inOut',
    }, t0 + 9.0);
    moveHook(SITE_X, LIFT_HOVER + MODULE_TOP_OFFSET + HOOK_CLEAR_ABOVE_TOP,
      t0 + 9.0, 1.0);

    // Phase D (10.0 → 11.0) — module + hook descend onto foundation
    tl.to(moduleA.position, {
      y: FOUNDATION_TOP, duration: 1.0, ease: 'power2.in',
    }, t0 + 10.0);
    moveHook(SITE_X, FOUNDATION_TOP + MODULE_TOP_OFFSET + HOOK_CLEAR_ABOVE_TOP,
      t0 + 10.0, 1.0);
  }

  // ===== STEP 6 (11.0 → 14.5) — Crane picks up UPPER, stacks on top =====
  if (moduleB && hook) {
    const upperStartX = moduleB.position.x;
    const moduleTopY = () => moduleB.position.y + MODULE_TOP_OFFSET;

    // Phase A (11.0 → 12.0) — hook slides horizontally over upper module
    // (no descent — stays high above the module so cables/hook never read
    // as dropping onto the load).
    tl.to(hook.position, {
      x: worldToHookLocalX(upperStartX),
      y: moduleB.position.y + MODULE_TOP_OFFSET + HOOK_CLEAR_ABOVE_TOP,
      duration: 1.0,
      ease: 'power2.inOut',
    }, t0 + 11.0);

    // Phase B (12.0 → 13.0) — upper rises straight up + hook tracks above
    tl.to(moduleB.position, {
      y: STACK_Y + LIFT_HOVER, duration: 1.0, ease: 'power2.out',
    }, t0 + 12.0);
    moveHook(upperStartX,
      STACK_Y + LIFT_HOVER + MODULE_TOP_OFFSET + HOOK_CLEAR_ABOVE_TOP,
      t0 + 12.0, 1.0);

    // Phase C (13.0 → 14.0) — upper translates west to SITE_X over the lower
    tl.to(moduleB.position, {
      x: SITE_X, duration: 1.0, ease: 'power2.inOut',
    }, t0 + 13.0);
    moveHook(SITE_X,
      STACK_Y + LIFT_HOVER + MODULE_TOP_OFFSET + HOOK_CLEAR_ABOVE_TOP,
      t0 + 13.0, 1.0);

    moduleB.traverse((o) => {
      if (o.name === 'Roof_hinge_west' || o.name === 'Roof_hinge_east') {
        tl.to(o.rotation, {
          z: 0, duration: 1.5, ease: 'power2.inOut',
        }, t0 + 13.0);
      }
    });

    // Phase D (14.0 → 14.5) — upper descends onto stacked position; hook tracks above
    tl.to(moduleB.position, {
      y: STACK_Y, duration: 0.8, ease: 'power2.in',
    }, t0 + 14.0);
    moveHook(SITE_X, STACK_Y + MODULE_TOP_OFFSET + HOOK_CLEAR_ABOVE_TOP,
      t0 + 14.0, 0.8);
  }

  // ===== STEP 7 (14.5 → 16.5) — Crane drives away in -X =====
  if (crane) {
    moveHook(CRANE_PARK_X + 5, 35, t0 + 14.5, 0.5);
    tl.to(crane.position, { x: CRANE_PARK_X - 80, duration: 2.0, ease: 'power1.in' }, t0 + 15.0);
  }

  // ===== STEP 7.5 (15.5) — Reveal gable-end siding fills =====
  // The two triangular gable wall fills install AFTER stacking + after the
  // crane has cleared. Hidden during stages 8-11 so they don't block the
  // rafter hinges from folding flat for transport.
  for (const m of [refs.moduleA, refs.moduleB]) {
    m.traverse((o) => {
      if (o.name && o.name.startsWith('gable_')) {
        tl.set(o.scale, { x: 0.001, y: 0.001, z: 0.001 }, t0 + 15.5);
        tl.set(o,       { visible: true                 }, t0 + 15.5);
        tl.to (o.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(1.4)' }, t0 + 15.5);
      }
    });
  }

  // ===== STEP 8 (16.5 → 19.0) — Porch reveal piece-by-piece =====
  const porch = refs.porch;
  if (porch) {
    tl.set(porch, { visible: true }, t0 + 16.5);
    const tiers = new Map();
    porch.traverse((o) => {
      const idx = o.userData?.assemblyOrder;
      if (idx === undefined) return;
      if (!tiers.has(idx)) tiers.set(idx, []);
      tiers.get(idx).push(o);
    });
    const orders = [...tiers.keys()].sort((a, b) => a - b);
    orders.forEach((ord, i) => {
      const meshes = tiers.get(ord);
      meshes.forEach((mesh) => {
        tl.set(mesh.scale, { x: 0.001, y: 0.001, z: 0.001 }, t0 + 16.5);
        tl.to (mesh.scale, {
          x: 1, y: 1, z: 1,
          duration: 0.45, ease: 'back.out(1.4)',
        }, t0 + 16.5 + i * 0.35);
      });
    });
  }

  // ===== STEP 9 (19.5 → 22.5) — Landscape grows out of the ground =====
  // After the porch finishes, lawn appears, then bushes + grass clumps grow
  // up from y=0 (their geometry is bottom-anchored so scale.y from 0 reads
  // as a plant rising out of the ground). Tiered by userData.assemblyOrder
  // so the lawn lays down first, then shrubs, then grass, then corner bushes.
  const landscape = refs.landscape;
  if (landscape) {
    tl.set(landscape, { visible: true }, t0 + 19.5);
    const lTiers = new Map();
    landscape.traverse((o) => {
      const idx = o.userData?.assemblyOrder;
      if (idx === undefined) return;
      if (!lTiers.has(idx)) lTiers.set(idx, []);
      lTiers.get(idx).push(o);
    });
    const lOrders = [...lTiers.keys()].sort((a, b) => a - b);
    lOrders.forEach((ord, i) => {
      const meshes = lTiers.get(ord);
      meshes.forEach((mesh) => {
        tl.set(mesh.scale, { x: 0.001, y: 0.001, z: 0.001 }, t0 + 19.5);
        tl.to (mesh.scale, {
          x: 1, y: 1, z: 1,
          duration: 0.5, ease: 'back.out(1.6)',
        }, t0 + 19.5 + i * 0.35);
      });
    });
  }
}
