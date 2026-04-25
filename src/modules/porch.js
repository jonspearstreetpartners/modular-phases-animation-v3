// Stage 12 — Front porch for the v3 home, attached to the lower module's
// front gable end after stacking is complete.
//
// Per the rendering: white-painted deck + 2 white square columns + flat shed
// roof (slight forward slope) + low railings on the open side and front. Wood
// front door is part of the lower module's exterior; the porch wraps around it.
//
// Layout in module-local frame (origin at module center, like the rest of the
// home):
//   - Porch sits on the +Z gable end (front) of the lower module
//   - Width: same as module width (15'-2") minus a small inset
//   - Depth: ~8 ft projection forward
//   - Top of porch roof: just below upper module's floor line

import * as THREE from 'three';
import { matte, shared, glass } from '../utils/materials.js';
import { COLORS } from '../utils/colors.js';
import { MODULE } from '../utils/dimensions.js';

const trimWhite      = () => shared('trim_white',  () => matte(0xFFFFFF, { roughness: 0.7 }));
const railingWhite   = () => shared('railing',     () => matte(0xFFFFFF, { roughness: 0.65 }));
const porchRoofMat   = () => shared('porch_roof',  () => matte(COLORS.roofShingle, { roughness: 0.85 }));
const porchDeckMat   = () => shared('porch_deck',  () => matte(0xE8E2D6, { roughness: 0.7 }));
const doorMat        = () => shared('front_door',  () => matte(COLORS.doorWood, { roughness: 0.55 }));
const doorGlassMat   = () => shared('door_glass',  () => glass());

export function buildPorch() {
  const group = new THREE.Group();
  group.name = 'Porch';

  const W = MODULE.width;       // 15.17
  const subfloorTop = MODULE.joistHeight + MODULE.subfloorThickness;

  // Porch dimensions
  const porchW       = W * 0.85;      // slightly inset from module's full width
  const porchDepth   = 8;             // 8 ft forward projection
  const deckH        = 0.5;
  const deckY        = subfloorTop + 0.1;       // top of deck flush with module floor (small step)
  // Porch sits in front of the +Z gable end:
  const porchCenterZ = MODULE.length / 2 + porchDepth / 2;

  // ---- Deck (the floor of the porch) ----
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(porchW, deckH, porchDepth),
    porchDeckMat(),
  );
  deck.position.set(0, deckY - deckH / 2, porchCenterZ);
  deck.receiveShadow = true;
  deck.castShadow = true;
  deck.name = 'porch_deck';
  group.add(deck);

  // ---- Two white square columns (front corners of the porch) ----
  const colSize = 0.7;
  const colH = MODULE.wallHeight - 0.5;       // a bit shorter than the module wall
  for (const sx of [-1, +1]) {
    const col = new THREE.Mesh(
      new THREE.BoxGeometry(colSize, colH, colSize),
      trimWhite(),
    );
    col.position.set(
      sx * (porchW / 2 - colSize / 2),
      deckY + colH / 2,
      MODULE.length / 2 + porchDepth - colSize / 2 - 0.2,    // near front of porch
    );
    col.castShadow = col.receiveShadow = true;
    col.name = `porch_column_${sx > 0 ? 'east' : 'west'}`;
    group.add(col);
  }

  // ---- Porch roof (flat shed-style, slight forward overhang) ----
  const roofThickness = 0.4;
  const roofY = deckY + colH + roofThickness / 2;
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(porchW * 1.05, roofThickness, porchDepth * 1.05),
    porchRoofMat(),
  );
  roof.position.set(0, roofY, porchCenterZ);
  roof.castShadow = roof.receiveShadow = true;
  roof.name = 'porch_roof';
  group.add(roof);

  // ---- Railing along the open sides (front + two side returns) ----
  const railH = 3;
  const railRunY = deckY + railH / 2;
  const balRadius = 0.06;
  const balSpacing = 0.5;

  // FRONT railing (along porch's +Z edge), in two pieces split by the centered
  // entry where the walkway approaches. We'll put railings only on the WEST
  // half of the front (matching the rendering's asymmetric layout — wide
  // window-facing porch on the left, steps in the center).
  const frontRailZ = MODULE.length / 2 + porchDepth - 0.05;
  const frontRailLen = porchW * 0.4;        // half-width of front, on the west side
  const frontRailX = -porchW / 2 + frontRailLen / 2 + colSize;

  // Top rail
  const topRail = new THREE.Mesh(
    new THREE.BoxGeometry(frontRailLen, 0.15, 0.15),
    railingWhite(),
  );
  topRail.position.set(frontRailX, deckY + railH, frontRailZ);
  topRail.castShadow = true;
  topRail.name = 'porch_railing_top';
  group.add(topRail);

  // Bottom rail
  const botRail = new THREE.Mesh(
    new THREE.BoxGeometry(frontRailLen, 0.1, 0.1),
    railingWhite(),
  );
  botRail.position.set(frontRailX, deckY + 0.5, frontRailZ);
  botRail.receiveShadow = true;
  botRail.name = 'porch_railing_bot';
  group.add(botRail);

  // Balusters (vertical posts between top and bottom rails)
  const balusterCount = Math.max(2, Math.round(frontRailLen / balSpacing));
  for (let i = 0; i < balusterCount; i++) {
    const bal = new THREE.Mesh(
      new THREE.CylinderGeometry(balRadius, balRadius, railH - 0.15, 6),
      railingWhite(),
    );
    const t = (i + 0.5) / balusterCount;
    bal.position.set(
      frontRailX - frontRailLen / 2 + t * frontRailLen,
      railRunY,
      frontRailZ,
    );
    bal.castShadow = true;
    bal.name = `porch_baluster_${i}`;
    group.add(bal);
  }

  // (Front door + door glass removed from porch.js — they now live on the
  //  lower module's exterior.js so the door is visible during transport and
  //  doesn't appear out of nowhere when the porch assembles in Stage 12.)

  // ---- Walkway (concrete strip leading to the porch) ----
  const walkLen = 12;
  const walk = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.05, walkLen),
    porchDeckMat(),
  );
  walk.position.set(0, 0.05, MODULE.length / 2 + porchDepth + walkLen / 2);
  walk.receiveShadow = true;
  walk.name = 'porch_walkway';
  group.add(walk);

  // Tag children with an assembly order index for the staggered reveal.
  const order = ['porch_deck', 'porch_column_west', 'porch_column_east',
                 'porch_roof', 'porch_railing_top', 'porch_railing_bot',
                 'porch_walkway'];
  group.traverse((o) => {
    if (!o.name) return;
    const idx = order.indexOf(o.name);
    if (idx >= 0) o.userData.assemblyOrder = idx;
    else if (o.name.startsWith('porch_baluster_')) o.userData.assemblyOrder = 5;  // with railing
  });

  return group;
}
