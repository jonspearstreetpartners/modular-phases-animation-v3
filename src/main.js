// Spear Partners — Modular Factory Assembly Animation
// Entry point. Phase 3: stage animations on a master GSAP timeline.
//
// Toggle ?debug=1 in the URL to enable OrbitControls for development.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';

import { buildLighting } from './scene/lighting.js';
import { buildOrthoCamera, updateOrthoFrustum } from './scene/camera.js';
import { buildGround } from './scene/ground.js';
import { configureRenderer } from './scene/environment.js';
import { setRaw, show as showStage } from './ui/stageLabel.js';

import { MODULE_A, MODULE_B } from './utils/dimensions.js';
import { buildModuleFloorFrame, buildModuleSubfloor } from './modules/floor.js';
import { buildModuleWalls } from './modules/walls.js';
import { buildModuleRoof } from './modules/roof.js';
import { buildModuleFloorMEP, buildModuleStubs, buildModuleRoughIn } from './modules/mep.js';
import { buildModuleInsulation } from './modules/insulation.js';
import { buildModuleExterior } from './modules/exterior.js';
import { buildModuleInterior } from './modules/interior.js';
import { buildTruckAndTrailer } from './modules/truck.js';

import { buildTimeline, STAGE_TIMES } from './animation/timeline.js';

// ---------- Debug flag ----------
const DEBUG = new URLSearchParams(location.search).has('debug');

// ---------- Renderer ----------
const canvas = document.getElementById('scene-canvas');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
configureRenderer(renderer);

// ---------- Scene ----------
const scene = new THREE.Scene();

// ---------- Camera ----------
// Phase 3 baseline: frustumSize 70 (camera animation in Phase 4 will adjust this).
const camera = buildOrthoCamera(window.innerWidth, window.innerHeight, 70);

// ---------- Lighting + ground ----------
buildLighting(scene);
buildGround(scene);

// ---------- Build both modules ----------
function buildModule({ side, centerX }) {
  const group = new THREE.Group();
  group.name = `Module_${side}`;
  group.userData.side = side;

  // Stage 1
  group.add(buildModuleFloorFrame());
  // Stage 2 (NEW) — in-floor-cavity MEP rough-in
  group.add(buildModuleFloorMEP({ side }));
  // Stage 3
  group.add(buildModuleSubfloor());
  // Stage 4
  group.add(buildModuleStubs({ side }));
  // Stage 5
  group.add(buildModuleWalls());
  // Stage 6
  group.add(buildModuleRoughIn({ side }));
  // Stage 7 — insulation only (drywall is pre-installed on the walls in Stage 5)
  group.add(buildModuleInsulation());
  // Stage 8 (moved down)
  group.add(buildModuleRoof({ side }));
  // Stage 9
  group.add(buildModuleExterior({ side }));
  // Stage 10
  group.add(buildModuleInterior({ side }));

  group.position.set(centerX, 0, 0);
  return group;
}

const moduleA = buildModule(MODULE_A);
const moduleB = buildModule(MODULE_B);
scene.add(moduleA);
scene.add(moduleB);

// ---------- Build trucks (Stage 11 transport) ----------
// Each truck assembly is positioned at its module's centerX with its trailer
// centered on Z=0 in scene space. The Stage 11 animation slides them in/away.
const truckA = buildTruckAndTrailer({ side: 'A' });
truckA.position.set(MODULE_A.centerX, 0, 0);
truckA.visible = false;
scene.add(truckA);

const truckB = buildTruckAndTrailer({ side: 'B' });
truckB.position.set(MODULE_B.centerX, 0, 0);
truckB.visible = false;
scene.add(truckB);

// ---------- Hide all stage geometry at startup ----------
// Stages set things visible at their start time. Stage 1 (FloorFrame) needs to be
// visible at t=0 so we hide everything except FloorFrame.
const STAGE_GROUP_NAMES = [
  'FloorFrame',          // Stage 1 — kept visible from t=0
  'MEP_FloorRough',      // Stage 2 (new)
  'Subfloor',            // Stage 3
  'MEP_Stubs',           // Stage 4
  'Walls',               // Stage 5
  'MEP_RoughIn',         // Stage 6
  'Insulation',          // Stage 7
  // Roof_A / Roof_B are side-specific (handled below) — Stage 8
  'Exterior',            // Stage 9
  'Interior',            // Stage 10
];

for (const m of [moduleA, moduleB]) {
  for (const name of STAGE_GROUP_NAMES) {
    if (name === 'FloorFrame') continue;        // visible from t=0
    const g = m.getObjectByName(name);
    if (g) g.visible = false;
  }
  // Roof groups are named per side
  const roof = m.getObjectByName(`Roof_${m.userData.side}`);
  if (roof) roof.visible = false;

  // The shingle slab now lives INSIDE the roof hinge group (so it can be
  // hinged together with the trusses for transport). Hide it independently so
  // Stage 9's drop reveal still plays — Stage 8 only reveals the trusses.
  const slab = m.getObjectByName('roof_slab');
  if (slab) slab.visible = false;
}

// Stage 1's floor frame children need their initial transforms before the timeline
// starts. The timeline uses tl.from(...) which records the rest position at the
// time the tween fires — so on first play the original positions are captured.
// To make a manual reset work later, we'll snapshot in the reset handler.

// ---------- Build master timeline ----------
const refs = { scene, moduleA, moduleB, truckA, truckB, camera, renderer };
const tl = buildTimeline(refs, { paused: true });

// ---------- Debug controls ----------
let controls = null;
if (DEBUG) {
  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 6, 0);
  setRaw('<span class="stage-num">DEBUG</span> · OrbitControls active');
} else {
  setRaw('<span class="stage-num">Phase 3</span> · Timeline ready');
}

// Reveal UI overlays
gsap.to('#stage-indicator', { opacity: 1, duration: 0.6, delay: 0.2 });
gsap.to('#brand-tag',       { opacity: 1, duration: 0.6, delay: 0.5 });
gsap.to('#stage-chips',     { opacity: 1, duration: 0.6, delay: 0.7 });
gsap.to('#controls',        { opacity: 1, duration: 0.6, delay: 0.8 });
showStage();

// ---------- Logo transparency (mobile-safe) ----------
// CSS mix-blend-mode is unreliable on mobile when the element sits over a
// WebGL canvas (Safari iOS in particular often refuses to composite blend
// modes across canvas layers). Instead, load the logo into an off-screen
// canvas, set every near-white pixel to alpha=0, and swap the img.src for
// the resulting data URL. The PNG ends up genuinely transparent — works
// on every browser, no blend-mode dependency.
(function transparentizeLogo() {
  const img = document.querySelector('#brand-tag img');
  if (!img) return;
  const loader = new Image();
  loader.crossOrigin = 'anonymous';
  loader.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width  = loader.naturalWidth;
      canvas.height = loader.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(loader, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const px = data.data;
      // Threshold: any pixel with all RGB ≥ 240 becomes transparent. This
      // catches the white PNG background while preserving the navy logo art.
      for (let i = 0; i < px.length; i += 4) {
        if (px[i] > 240 && px[i + 1] > 240 && px[i + 2] > 240) {
          px[i + 3] = 0;
        }
      }
      ctx.putImageData(data, 0, 0);
      img.src = canvas.toDataURL('image/png');
    } catch (e) {
      console.warn('Logo transparentize failed:', e);
    }
  };
  loader.src = img.src;
})();

// ---------- UI: PLAY / RESET, scrubbable progress bar, stage chips ----------
const btnPlay      = document.getElementById('btn-play');
const btnReset     = document.getElementById('btn-reset');
const progressFill = document.getElementById('progress-fill');
const progressWrap = document.getElementById('progress-wrap');
const progressThumb = document.getElementById('progress-thumb');
const timeOut     = document.getElementById('time-display');
const chipsHost   = document.getElementById('stage-chips');

function fmt(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Stage definitions for chips — labels match the in-animation announcements
// so users can recognize them. Sorted by start time.
const STAGE_CHIPS = [
  { time: STAGE_TIMES.s1,  num: 1,  label: 'Floor' },
  { time: STAGE_TIMES.s2,  num: 2,  label: 'Floor MEP' },
  { time: STAGE_TIMES.s3,  num: 3,  label: 'Subfloor' },
  { time: STAGE_TIMES.s4,  num: 4,  label: 'Fixtures' },
  { time: STAGE_TIMES.s5,  num: 5,  label: 'Walls' },
  { time: STAGE_TIMES.s6,  num: 6,  label: 'MEP Rough-in' },
  { time: STAGE_TIMES.s7,  num: 7,  label: 'Insulation' },
  { time: STAGE_TIMES.s8,  num: 8,  label: 'Roof' },
  { time: STAGE_TIMES.s9,  num: 9,  label: 'Exterior' },
  { time: STAGE_TIMES.s10, num: 10, label: 'Interior' },
  { time: STAGE_TIMES.s11, num: 11, label: 'Transport' },
];

// Build chip buttons. Each click pauses and seeks to that stage's start time.
const chipEls = STAGE_CHIPS.map(({ time, num, label }) => {
  const btn = document.createElement('button');
  btn.className = 'stage-chip';
  btn.textContent = `${num}. ${label}`;
  btn.title = `Jump to Stage ${num}: ${label}`;
  btn.dataset.time = String(time);
  btn.addEventListener('click', () => {
    seekTo(time, { pause: true });
  });
  chipsHost?.appendChild(btn);
  return btn;
});

// ----- Seek + UI sync -----
function seekTo(time, { pause = false } = {}) {
  const dur = tl.duration();
  const t = Math.max(0, Math.min(time, dur));
  if (pause) tl.pause();
  tl.time(t);
  setBtnLabel();
  updateTimeUI();
}

function updateTimeUI() {
  const cur = tl.time();
  const dur = tl.duration();
  if (dur > 0) {
    const pct = (cur / dur) * 100;
    if (progressFill)  progressFill.style.width = `${pct}%`;
    if (progressThumb) progressThumb.style.left = `${pct}%`;
  }
  if (timeOut) timeOut.textContent = `${fmt(cur)} / ${fmt(dur)}`;

  // Highlight the chip for the current stage (last chip whose time <= cur)
  let activeIdx = -1;
  for (let i = 0; i < STAGE_CHIPS.length; i++) {
    if (STAGE_CHIPS[i].time <= cur + 0.01) activeIdx = i;
  }
  for (let i = 0; i < chipEls.length; i++) {
    chipEls[i].classList.toggle('active', i === activeIdx);
  }
}

function setBtnLabel() {
  if (!btnPlay) return;
  if (tl.progress() >= 1)        btnPlay.textContent = 'REPLAY';
  else if (tl.paused())          btnPlay.textContent = 'PLAY';
  else                           btnPlay.textContent = 'PAUSE';
}

btnPlay?.addEventListener('click', () => {
  if (tl.progress() >= 1) {
    tl.restart();
  } else if (tl.paused()) {
    tl.play();
  } else {
    tl.pause();
  }
  setBtnLabel();
});

btnReset?.addEventListener('click', () => {
  tl.pause(0);
  setBtnLabel();
  updateTimeUI();
});

// ----- Progress bar scrubbing (click + drag) -----
// Pointer events handle mouse + touch + pen uniformly. We pause on grab and
// restore play state on release if the user wasn't already paused.
let scrubbing = false;
let resumeAfterScrub = false;

function timeAtClientX(clientX) {
  if (!progressWrap) return 0;
  const rect = progressWrap.getBoundingClientRect();
  const ratio = (clientX - rect.left) / rect.width;
  return Math.max(0, Math.min(1, ratio)) * tl.duration();
}

progressWrap?.addEventListener('pointerdown', (e) => {
  scrubbing = true;
  resumeAfterScrub = !tl.paused();
  tl.pause();
  progressWrap.classList.add('scrubbing');
  progressWrap.setPointerCapture(e.pointerId);
  seekTo(timeAtClientX(e.clientX));
});

progressWrap?.addEventListener('pointermove', (e) => {
  if (!scrubbing) return;
  seekTo(timeAtClientX(e.clientX));
});

function endScrub(e) {
  if (!scrubbing) return;
  scrubbing = false;
  progressWrap.classList.remove('scrubbing');
  if (e?.pointerId !== undefined && progressWrap.hasPointerCapture(e.pointerId)) {
    progressWrap.releasePointerCapture(e.pointerId);
  }
  if (resumeAfterScrub && tl.progress() < 1) tl.play();
  setBtnLabel();
}

progressWrap?.addEventListener('pointerup', endScrub);
progressWrap?.addEventListener('pointercancel', endScrub);

// ----- Keyboard shortcuts -----
//  Space  → play / pause
//  R      → reset to start
//  ←/→    → jump back / forward by 2s
//  1-9    → jump to that stage (1..9). 0 = stage 10. Shift+0 = stage 11.
window.addEventListener('keydown', (e) => {
  // Don't hijack typing into form fields
  const target = e.target;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

  if (e.code === 'Space') {
    e.preventDefault();
    btnPlay?.click();
  } else if (e.key === 'r' || e.key === 'R') {
    btnReset?.click();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    seekTo(tl.time() - 2, { pause: tl.paused() });
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    seekTo(tl.time() + 2, { pause: tl.paused() });
  } else if (e.key >= '1' && e.key <= '9') {
    const i = parseInt(e.key, 10) - 1;
    if (STAGE_CHIPS[i]) seekTo(STAGE_CHIPS[i].time, { pause: true });
  } else if (e.key === '0' && !e.shiftKey) {
    if (STAGE_CHIPS[9]) seekTo(STAGE_CHIPS[9].time, { pause: true });
  } else if (e.key === '0' && e.shiftKey) {
    if (STAGE_CHIPS[10]) seekTo(STAGE_CHIPS[10].time, { pause: true });
  }
});

// ============================================================================
// MP4 / WebM export pipeline
// ----------------------------------------------------------------------------
// Approach: temporarily resize the WebGL canvas to a target export resolution
// (e.g. 1920×1080), play the timeline from t=0, capture canvas.captureStream
// via MediaRecorder, download the resulting blob. UI overlays (chips, bottom
// controls) are hidden via `body.recording` so the recording is clean. Stage
// indicator + brand tag are kept visible — useful for explainer-style videos.
//
// Codec preference: MP4 (H.264/AVC) when supported (Safari, recent Chrome on
// some platforms), falling back to WebM (VP9 → VP8) on browsers that won't
// encode MP4 in MediaRecorder. The user can convert WebM→MP4 with ffmpeg
// after the fact if needed.
// ============================================================================

const exportModal       = document.getElementById('export-modal');
const btnExport         = document.getElementById('btn-export');
const btnExportStart    = document.getElementById('btn-export-start');
const btnExportCancel   = document.getElementById('btn-export-cancel');
const recOverlay        = document.getElementById('recording-overlay');
const recProgressFill   = recOverlay?.querySelector('.rec-progress-fill');
const recTimeDisplay    = document.getElementById('rec-time');

function pickRecorderMimeType() {
  const candidates = [
    'video/mp4;codecs=avc1.42E01E', // H.264 baseline — Safari + recent Chrome
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c;
  }
  return ''; // empty string lets MediaRecorder pick its default
}

btnExport?.addEventListener('click', () => {
  if (!exportModal) return;
  if (typeof MediaRecorder === 'undefined') {
    alert('Your browser does not support MediaRecorder. Try Chrome, Edge, or Safari.');
    return;
  }
  exportModal.classList.add('open');
});

btnExportCancel?.addEventListener('click', () => {
  exportModal?.classList.remove('open');
});

btnExportStart?.addEventListener('click', async () => {
  exportModal?.classList.remove('open');
  const checked = document.querySelector('input[name="res"]:checked');
  const choice = checked ? parseInt(checked.value, 10) : 1080;
  const aspect = 16 / 9;
  const targetH = choice;
  const targetW = Math.round(targetH * aspect);
  await runExport(targetW, targetH);
});

async function runExport(targetW, targetH) {
  // ----- Save state to restore after recording -----
  const savedSize = renderer.getSize(new THREE.Vector2()).clone();
  const savedPixelRatio = renderer.getPixelRatio();
  const wasPaused = tl.paused();

  // ----- Configure renderer for export -----
  // Pixel ratio = 1 so the canvas backing store matches target dims exactly.
  renderer.setPixelRatio(1);
  renderer.setSize(targetW, targetH, false); // false = don't change CSS size
  if (camera.isOrthographicCamera) {
    updateOrthoFrustum(camera, targetW, targetH, camera.userData.frustumSize ?? 70);
  } else {
    camera.aspect = targetW / targetH;
    camera.updateProjectionMatrix();
  }

  // ----- Setup MediaRecorder -----
  // Stream the canvas at 60fps. Bitrate scales with resolution so 4K isn't
  // starved and 720p doesn't waste bandwidth.
  const stream = canvas.captureStream(60);
  const mimeType = pickRecorderMimeType();
  const bitsPerPixel = 0.12;
  const videoBitsPerSecond = Math.round(targetW * targetH * 60 * bitsPerPixel);
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond } : { videoBitsPerSecond });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const stopped = new Promise((resolve) => {
    recorder.onstop = () => {
      const blobType = recorder.mimeType || mimeType || 'video/webm';
      const blob = new Blob(chunks, { type: blobType });
      const ext = blobType.startsWith('video/mp4') ? 'mp4' : 'webm';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spear-modular-${targetH}p.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve();
    };
  });

  // ----- Show recording overlay, hide chrome -----
  document.body.classList.add('recording');

  // ----- Reset timeline to 0 and start recording -----
  tl.pause(0);
  recorder.start();
  // Small lead-in so the first frame isn't black, then play.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  tl.play();

  // ----- Wait for the timeline to finish, updating recording UI as we go -----
  await new Promise((resolve) => {
    const check = () => {
      const cur = tl.time();
      const dur = tl.duration();
      if (recProgressFill && dur > 0) recProgressFill.style.width = `${(cur / dur) * 100}%`;
      if (recTimeDisplay) recTimeDisplay.textContent = `${fmt(cur)} / ${fmt(dur)}`;
      if (tl.progress() >= 1) resolve();
      else requestAnimationFrame(check);
    };
    check();
  });

  // ----- Tail buffer: capture the final hold frame, then stop -----
  await new Promise((r) => setTimeout(r, 250));
  recorder.stop();
  await stopped;

  // ----- Restore renderer + UI state -----
  document.body.classList.remove('recording');
  renderer.setPixelRatio(savedPixelRatio);
  renderer.setSize(savedSize.x, savedSize.y, true);
  if (camera.isOrthographicCamera) {
    updateOrthoFrustum(camera, savedSize.x, savedSize.y, camera.userData.frustumSize ?? 70);
  } else {
    camera.aspect = savedSize.x / savedSize.y;
    camera.updateProjectionMatrix();
  }
  if (wasPaused) tl.pause();
  setBtnLabel();
  updateTimeUI();
}

// ---------- Resize ----------
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  if (camera.isOrthographicCamera) {
    updateOrthoFrustum(camera, w, h, camera.userData.frustumSize ?? 70);
  } else {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
});

// ---------- Render loop ----------
function tick() {
  if (controls) controls.update();
  renderer.render(scene, camera);
  updateTimeUI();
  setBtnLabel();
  requestAnimationFrame(tick);
}
tick();

// ---------- Auto-play after a short beat ----------
gsap.delayedCall(1.0, () => tl.play());

// ---------- Console banner ----------
console.log(
  `%cSpear Partners — Modular Factory 3D %c\nPhase 3: timeline (${tl.duration().toFixed(1)}s). ` +
  (DEBUG ? 'Debug ON.' : 'Add ?debug=1 for OrbitControls.'),
  'color: #1A4A7A; font-weight: 600; font-size: 13px;',
  'color: #6B6B68; font-size: 11px;',
);
console.log('Stage start times:', STAGE_TIMES);
