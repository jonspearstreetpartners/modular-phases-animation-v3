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

import { MODULE_LOWER, MODULE_UPPER } from './utils/dimensions.js';
import { buildModuleFloorFrame, buildModuleSubfloor } from './modules/floor.js';
import { buildModuleWalls } from './modules/walls.js';
import { buildModuleRoof } from './modules/roof.js';
import { buildModuleFloorMEP, buildModuleStubs, buildModuleRoughIn } from './modules/mep.js';
import { buildModuleInsulation } from './modules/insulation.js';
import { buildModuleExterior } from './modules/exterior.js';
import { buildModuleInterior } from './modules/interior.js';
import { buildTruckAndTrailer } from './modules/truck.js';
import { buildFoundation } from './modules/foundation.js';
import { buildCrane, updateCraneCables } from './modules/crane.js';
import { buildPorch } from './modules/porch.js';
import { buildLandscape } from './modules/landscape.js';

import { buildTimeline, STAGE_TIMES } from './animation/timeline.js';

// ---------- Debug flag ----------
const DEBUG = new URLSearchParams(location.search).has('debug');

// ---------- Renderer ----------
// Mobile: antialias is expensive on tile-based mobile GPUs, and at small
// screen pixel sizes the difference is barely perceptible. Skip it on phones
// to keep the frame rate up.
const _isPhone = window.matchMedia('(max-width: 768px)').matches;
const canvas = document.getElementById('scene-canvas');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !_isPhone,
  alpha: true,
});
// Pixel ratio cap: 2 on desktop/laptop, 1.5 on small screens. Phones routinely
// report DPR=3 which would render 9× the pixels of DPR=1 — way too much for
// mobile GPUs paired with shadows + IBL.
renderer.setPixelRatio(Math.min(
  window.devicePixelRatio,
  window.matchMedia('(max-width: 768px)').matches ? 1.5 : 2,
));
renderer.setSize(window.innerWidth, window.innerHeight);
configureRenderer(renderer);

// ---------- Scene ----------
const scene = new THREE.Scene();

// ---------- Camera ----------
// Phase 3 baseline: frustumSize 70 (camera animation in Phase 4 will adjust this).
const camera = buildOrthoCamera(window.innerWidth, window.innerHeight, 70);

// ---------- Lighting + ground ----------
const lights = buildLighting(scene);
buildGround(scene);

// ---------- Build both modules ----------
// v3: Two modules built IN PARALLEL during stages 1-9, side-by-side on the
// factory floor. They represent the LOWER-floor and UPPER-floor of one
// two-story home (vs v1's duplex pair). Stacking happens at the site stage.
// Internally we keep `side='A'` and `side='B'` so the existing per-side
// helpers in mep.js / interior.js etc. continue to produce sensible
// geometry until split into per-floor variants in a later commit.
// `withRoof` — only the UPPER module gets the gable roof framing + shingle slabs.
// The LOWER module gets a flat ceiling/roof at the site stage when the upper
// is stacked on top (which acts as its lid). For now, lower has no roof at all.
function buildModule({ name, side, factoryX, withRoof = false }) {
  const group = new THREE.Group();
  group.name = name;
  group.userData.side = side;
  group.userData.withRoof = withRoof;

  group.add(buildModuleFloorFrame());                 // Stage 1
  group.add(buildModuleFloorMEP({ side }));           // Stage 2
  group.add(buildModuleSubfloor());                   // Stage 3
  group.add(buildModuleStubs({ side }));              // Stage 4
  group.add(buildModuleWalls());                      // Stage 5
  group.add(buildModuleRoughIn({ side }));            // Stage 6
  group.add(buildModuleInsulation());                 // Stage 7
  if (withRoof) group.add(buildModuleRoof({ side })); // Stage 8 — UPPER only
  group.add(buildModuleExterior({ side }));           // Stage 9
  group.add(buildModuleInterior({ side }));           // Stage 10

  group.position.set(factoryX, 0, 0);
  return group;
}

const moduleLower = buildModule({ name: 'Module_lower', side: 'A', factoryX: MODULE_LOWER.factoryX, withRoof: false });
const moduleUpper = buildModule({ name: 'Module_upper', side: 'B', factoryX: MODULE_UPPER.factoryX, withRoof: true  });
scene.add(moduleLower);
scene.add(moduleUpper);

// ---------- Build trucks (Stage 11 transport) ----------
const truckLower = buildTruckAndTrailer({ side: 'A' });
truckLower.position.set(MODULE_LOWER.factoryX, 0, 0);
truckLower.visible = false;
scene.add(truckLower);

const truckUpper = buildTruckAndTrailer({ side: 'B' });
truckUpper.position.set(MODULE_UPPER.factoryX, 0, 0);
truckUpper.visible = false;
scene.add(truckUpper);

// ---------- Build site assets (Stage 12 — stacking) ----------
// v3: foundation sits to the RIGHT of both factory module positions.
// Lower module factory X = -9.59, upper factory X = +9.59. Foundation lives
// at x=+30 so it reads as "across from where the modules were built."
const SITE_X = 30;

const foundation = buildFoundation();
foundation.position.set(SITE_X, 0, 0);
foundation.visible = false;
scene.add(foundation);

const crane = buildCrane();
crane.position.set(SITE_X - 22, 0, 0);    // 22 ft west of site, rest position
crane.visible = false;
scene.add(crane);

const porch = buildPorch();
porch.position.set(SITE_X, 0.8, 0);       // sits at the stacked home's location
porch.visible = false;
scene.add(porch);

const landscape = buildLandscape();
landscape.position.set(SITE_X, 0, 0);
landscape.visible = false;
scene.add(landscape);


// ---------- Hide all stage geometry at startup ----------
// In v3 we hide EVERYTHING (including FloorFrame) so the scene is empty
// during the intro overlay. Stage 1 (stageFloor) sets FloorFrame visible
// at the timeline's INTRO_DURATION mark.
const STAGE_GROUP_NAMES = [
  'FloorFrame',          // Stage 1
  'MEP_FloorRough',      // Stage 2
  'Subfloor',            // Stage 3
  'MEP_Stubs',           // Stage 4
  'Walls',               // Stage 5
  'MEP_RoughIn',         // Stage 6
  'Insulation',          // Stage 7
  'Exterior',            // Stage 9
  'Interior',            // Stage 10
];

for (const m of [moduleLower, moduleUpper]) {
  for (const name of STAGE_GROUP_NAMES) {
    const g = m.getObjectByName(name);
    if (g) g.visible = false;
  }
  const roof = m.getObjectByName('Roof');
  if (roof) roof.visible = false;
  m.traverse((o) => {
    if (o.name && o.name.startsWith('roof_slab')) o.visible = false;
  });
}

// Stage 1's floor frame children need their initial transforms before the timeline
// starts. The timeline uses tl.from(...) which records the rest position at the
// time the tween fires — so on first play the original positions are captured.
// To make a manual reset work later, we'll snapshot in the reset handler.

// ---------- Build master timeline ----------
// v3 refs: lower + upper modules each map to v1's A / B compat names so the
// existing stage code (which iterates over [moduleA, moduleB]) just works.
const refs = {
  scene,
  moduleLower, moduleUpper,
  truckLower,  truckUpper,
  // Compat aliases for v1 stage code
  moduleA: moduleLower, moduleB: moduleUpper,
  truckA:  truckLower,  truckB:  truckUpper,
  // v3 site stage assets
  foundation, crane, porch, landscape,
  siteX: SITE_X,
  lights,
  camera,
  renderer,
};
const tl = buildTimeline(refs, { paused: true });

// ---------- Soundtrack fade-out at the end ----------
// Music plays at full volume through ALL of Stage 12 (Site Assembly,
// stage runs ~21 s). Then fades over 4 s starting 4 s after the stage's
// last animation completes — the porch reveal finishes around s12 + 21
// so the fade begins at s12 + 25. Tween lives on the master timeline so
// it scrubs correctly when the user drags the progress bar.
//
// Belt & suspenders: also tl.set() volume to 0 a moment after the fade
// completes (some mobile browsers do not commit the final tween frame
// when the timeline ends), and pause the element on tl complete so it
// definitely stops on every device.
{
  const audioEl = document.getElementById('soundtrack');
  if (audioEl) {
    tl.set(audioEl, { volume: 1.0 }, 0);
    tl.to (audioEl, { volume: 0.0, duration: 4.0, ease: 'power1.out' }, STAGE_TIMES.s12 + 27.5);
    // Hard-set volume to 0 right at the fade's nominal end (mobile insurance).
    tl.set(audioEl, { volume: 0.0 }, STAGE_TIMES.s12 + 31.5);
  }
}

// On master timeline complete: fully pause + reset audio so nothing keeps
// playing on devices where the volume tween's final frame doesn't commit
// (seen on mobile Safari + Chrome). DOM lookup at runtime to avoid the
// temporal-dead-zone with the `soundtrack` const declared further down.
tl.eventCallback('onComplete', () => {
  const audioEl = document.getElementById('soundtrack');
  if (audioEl) {
    try {
      audioEl.volume = 0;
      audioEl.pause();
    } catch (_) {}
  }
});

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
(function transparentizeLogos() {
  const imgs = [
    document.querySelector('#brand-tag img'),
    document.querySelector('#intro-logo img'),
  ].filter(Boolean);
  if (imgs.length === 0) return;

  // Process the source PNG once into a transparent data URL, then assign to
  // every <img> that needs it.
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
      for (let i = 0; i < px.length; i += 4) {
        if (px[i] > 240 && px[i + 1] > 240 && px[i + 2] > 240) {
          px[i + 3] = 0;
        }
      }
      ctx.putImageData(data, 0, 0);
      const url = canvas.toDataURL('image/png');
      imgs.forEach((img) => { img.src = url; });
    } catch (e) {
      console.warn('Logo transparentize failed:', e);
    }
  };
  loader.src = imgs[0].src;
})();

// ---------- Strip Champion Homes / York NE branding from final rendering ----------
// The source PNG has client branding in the upper-right portion of the
// image. Per Spear Partners' delivery, the rendering should appear without
// it. Approach: load the PNG into an off-screen canvas, paint over the
// branding region with a solid sky-blue that matches the surrounding sky
// (sampled from a known-clean column on the left of the image), export the
// canvas back to a data URL, and assign it to the <img id="final-rendering">.
//
// All client-side; no native dependencies; identical behavior on Vercel.
(function stripRenderingBranding() {
  const img = document.querySelector('#final-rendering');
  if (!img) return;

  const loader = new Image();
  loader.crossOrigin = 'anonymous';
  loader.onload = () => {
    try {
      const W = loader.naturalWidth;
      const H = loader.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(loader, 0, 0);

      // Sample a clean sky pixel. Avg over a small region near the very top
      // of the image, slightly right-of-center, where the rendering shows
      // pure sky between the home's roof peak and the right tree canopy.
      // Single-pixel sampling at the upper-left was hitting tree leaves and
      // producing a green fill. Averaging 5 sample points scattered along
      // the top edge inside the trunk-of-sky band gives a robust sky color.
      const samples = [
        ctx.getImageData(W * 0.50, H * 0.02, 1, 1).data,
        ctx.getImageData(W * 0.55, H * 0.02, 1, 1).data,
        ctx.getImageData(W * 0.45, H * 0.03, 1, 1).data,
        ctx.getImageData(W * 0.50, H * 0.04, 1, 1).data,
        ctx.getImageData(W * 0.42, H * 0.02, 1, 1).data,
      ];
      let r = 0, g = 0, b = 0;
      for (const s of samples) { r += s[0]; g += s[1]; b += s[2]; }
      r = Math.round(r / samples.length);
      g = Math.round(g / samples.length);
      b = Math.round(b / samples.length);
      const sky = `rgb(${r}, ${g}, ${b})`;

      // Paint over the branding region: roughly the right 65% of the top 14%
      // of the image. Slight margin in from the edge so we don't paint a
      // visible rectangle on the very right edge.
      ctx.fillStyle = sky;
      ctx.fillRect(W * 0.35, 0, W * 0.65, H * 0.14);

      // Soften the bottom edge of the painted rectangle with a vertical
      // gradient so there's no hard line where the fill meets the original
      // image. The gradient goes from solid sky at the top to transparent
      // at the bottom of a 6% feather band.
      const featherTop = H * 0.14;
      const featherH   = H * 0.06;
      const grad = ctx.createLinearGradient(0, featherTop, 0, featherTop + featherH);
      grad.addColorStop(0, sky);
      grad.addColorStop(1, sky.replace('rgb(', 'rgba(').replace(')', ', 0)'));
      ctx.fillStyle = grad;
      ctx.fillRect(W * 0.35, featherTop, W * 0.65, featherH);

      img.src = canvas.toDataURL('image/png');
    } catch (e) {
      console.warn('Final rendering branding strip failed:', e);
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
  { time: STAGE_TIMES.s12, num: 12, label: 'Site Assembly' },
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

// ===== Soundtrack: synced to master timeline =====
// audio.currentTime is set on every seek; play()/pause() mirror tl state.
// MUTE toggle just sets audio.muted (allows UI control without affecting
// MP4 export, which always wants audio captured).
const soundtrack = document.getElementById('soundtrack');
const btnMute    = document.getElementById('btn-mute');
let userMuted = false;             // user explicitly clicked mute
let audioBlocked = false;          // browser blocked autoplay (no user gesture yet)

function syncAudioToTimeline() {
  if (!soundtrack) return;
  const t = tl.time();
  // Seek if drift is more than 0.15 s (avoids constant micro-seeks during play).
  if (Math.abs((soundtrack.currentTime || 0) - t) > 0.15) {
    try { soundtrack.currentTime = Math.max(0, t); } catch (_) {}
  }
}

function playAudio() {
  if (!soundtrack || userMuted) return;
  syncAudioToTimeline();
  const p = soundtrack.play();
  if (p && p.catch) {
    p.catch((err) => {
      audioBlocked = true;
      console.log('Audio autoplay blocked — will retry on first user gesture.', err?.name);
      // Visual hint: flip button label so user knows to click
      if (btnMute) btnMute.textContent = 'TAP TO PLAY';
    });
  } else {
    audioBlocked = false;
  }
  // Also clear the "blocked" state on success — play() returns a Promise that
  // resolves when playback actually starts.
  if (p && p.then) p.then(() => {
    audioBlocked = false;
    if (btnMute && btnMute.textContent === 'TAP TO PLAY') {
      btnMute.textContent = 'MUTE';
    }
  }, () => {});
}

function pauseAudio() {
  if (!soundtrack) return;
  soundtrack.pause();
}

btnMute?.addEventListener('click', () => {
  userMuted = !userMuted;
  if (soundtrack) soundtrack.muted = userMuted;
  btnMute.textContent = userMuted ? 'MUTED' : 'MUTE';
  // If user un-mutes during playback, kick off audio
  if (!userMuted && !tl.paused()) playAudio();
  if (userMuted) pauseAudio();
});

// ----- Seek + UI sync -----
function seekTo(time, { pause = false } = {}) {
  const dur = tl.duration();
  const t = Math.max(0, Math.min(time, dur));
  if (pause) tl.pause();
  tl.time(t);
  setBtnLabel();
  updateTimeUI();
  syncAudioToTimeline();
  if (pause) pauseAudio();
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
    // REPLAY: timeline ran to completion which paused + zeroed the audio.
    // Restore volume to 1 BEFORE the timeline's tl.set(volume,1) at t=0
    // takes over so playback is audible from the first frame again.
    if (soundtrack) { try { soundtrack.volume = 1.0; } catch (_) {} }
    tl.restart();
    playAudio();
  } else if (tl.paused()) {
    tl.play();
    playAudio();
  } else {
    tl.pause();
    pauseAudio();
  }
  setBtnLabel();
});

btnReset?.addEventListener('click', () => {
  tl.pause(0);
  if (soundtrack) {
    pauseAudio();
    try {
      soundtrack.currentTime = 0;
      soundtrack.volume = 1.0;     // restore volume in case the fade-out had zeroed it
    } catch (_) {}
  }
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
  if (resumeAfterScrub && tl.progress() < 1) {
    tl.play();
    playAudio();
  }
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
  const videoStream = canvas.captureStream(60);
  const mimeType = pickRecorderMimeType();
  const bitsPerPixel = 0.12;
  const videoBitsPerSecond = Math.round(targetW * targetH * 60 * bitsPerPixel);
  const audioBitsPerSecond = 192000;

  // Capture the soundtrack audio into the same MediaRecorder via a Web Audio
  // graph. createMediaElementSource() taps the <audio> element; createDestination()
  // gives a MediaStream we can merge with the canvas video stream.
  let mergedStream = videoStream;
  let audioContext = null;
  let exportAudioPlaybackRestore = null;     // function to restore the user's audio state after export
  if (soundtrack) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      // We can only call createMediaElementSource ONCE per element per page. To
      // avoid breaking later exports, we cache the source on a global flag.
      if (!soundtrack._mediaSource) {
        soundtrack._mediaSource = audioContext.createMediaElementSource(soundtrack);
      } else {
        // Reusing existing source — must use its existing audioContext
        audioContext = soundtrack._mediaSource.context;
      }
      const dest = audioContext.createMediaStreamDestination();
      // Route audio to BOTH the speakers AND the recorder destination. The
      // existing connection to ctx.destination handles speakers; the new
      // connection routes to the recording stream too.
      try { soundtrack._mediaSource.connect(audioContext.destination); } catch (_) {}
      soundtrack._mediaSource.connect(dest);

      // Force-unmute the audio element for the duration of the export so the
      // soundtrack is captured even if the user clicked SOUND -> MUTED on the UI.
      const wasMuted = soundtrack.muted;
      soundtrack.muted = false;
      exportAudioPlaybackRestore = () => { soundtrack.muted = wasMuted; };

      // Combine video tracks + audio tracks into one stream.
      mergedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);
    } catch (e) {
      console.warn('Audio capture for export failed; recording silent video.', e);
    }
  }

  const recorder = new MediaRecorder(mergedStream, mimeType
    ? { mimeType, videoBitsPerSecond, audioBitsPerSecond }
    : { videoBitsPerSecond, audioBitsPerSecond });
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
  // v3: keep crane lift cables stretched to the boom tip every frame while
  // the hook is animating. updateCraneCables is a no-op when crane is hidden.
  updateCraneCables(crane);
  renderer.render(scene, camera);
  updateTimeUI();
  setBtnLabel();
  requestAnimationFrame(tick);
}
tick();

// ---------- Start-with-sound overlay ----------
// Browser autoplay policy blocks audio playback until the user interacts.
// Show a fullscreen overlay with a PLAY button — clicking it satisfies the
// autoplay policy AND starts the timeline + audio together. After the click,
// the overlay fades out and the animation runs with full sound from t=0.
const startOverlay = document.getElementById('start-overlay');

function dismissStartOverlay() {
  if (!startOverlay) return;
  startOverlay.classList.add('hide');
  setTimeout(() => startOverlay.remove(), 500);
}

if (startOverlay) {
  startOverlay.addEventListener('click', () => {
    // First gesture — both browser autoplay policy is satisfied AND the
    // user has expressed intent to start. Reset both clocks to t=0 (timeline
    // is already paused at 0) and start them in lockstep.
    tl.pause(0);
    if (soundtrack) {
      try { soundtrack.currentTime = 0; } catch (_) {}
    }
    tl.play();
    playAudio();
    dismissStartOverlay();
  }, { once: true });
} else {
  // Fallback: if the overlay element is missing for any reason, fall back
  // to the previous auto-play timer + first-gesture-unmute behavior.
  gsap.delayedCall(1.0, () => { tl.play(); playAudio(); });
}

// First-user-gesture fallback: if autoplay was blocked, the next user
// interaction (click, tap, or keypress) anywhere on the page kicks off the
// soundtrack. Listens on document with capture so it fires before any other
// click handlers might cancel propagation.
function onFirstGesture() {
  if (userMuted) return;
  if (!audioBlocked && !soundtrack?.paused) return;
  // Force a play attempt even if we previously thought it succeeded.
  // Browsers will allow it now since this handler runs inside a user gesture.
  if (soundtrack && soundtrack.paused && !tl.paused()) {
    audioBlocked = false;
    soundtrack.play().then(() => {
      if (btnMute && btnMute.textContent === 'TAP TO PLAY') btnMute.textContent = 'MUTE';
    }, () => {});
  }
}
document.addEventListener('pointerdown', onFirstGesture, true);
document.addEventListener('click',        onFirstGesture, true);
document.addEventListener('keydown',      onFirstGesture, true);

// ---------- Console banner ----------
console.log(
  `%cSpear Partners — Modular Factory 3D %c\nPhase 3: timeline (${tl.duration().toFixed(1)}s). ` +
  (DEBUG ? 'Debug ON.' : 'Add ?debug=1 for OrbitControls.'),
  'color: #1A4A7A; font-weight: 600; font-size: 13px;',
  'color: #6B6B68; font-size: 11px;',
);
console.log('Stage start times:', STAGE_TIMES);
