// In-app capture — uses getDisplayMedia + MediaRecorder to record the
// browser tab as a .webm file. The tab capture pulls in BOTH the WebGL
// canvas AND every DOM overlay (titles, callouts, phase labels, brand-tag,
// the photoreal cross-fade) at the visible resolution, plus the soundtrack
// audio (when the user checks "Share tab audio" in the picker).
//
// Output is .webm — most browsers' MediaRecorder doesn't ship an MP4
// muxer. Convert to .mp4 afterward with ffmpeg if needed:
//   ffmpeg -i modular-construction.webm -c copy modular-construction.mp4
// (or with a full re-encode for max compatibility:
//   ffmpeg -i modular-construction.webm -c:v libx264 -c:a aac out.mp4 )

/**
 * Pick a MediaRecorder mimeType the current browser actually supports.
 * VP9 + Opus is preferred (best quality / size on Chrome); we fall back
 * down the list if not.
 */
function pickMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';      // empty string = let the browser pick its default
}

/**
 * Trigger a download of a Blob with the given filename. Creates a
 * short-lived object URL and clicks an anchor.
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Ask the user (via the browser's screen-share picker) to share this
 * tab + audio, then start a MediaRecorder against the resulting stream.
 *
 * Returns a promise that resolves to a `controller` object:
 *   controller.stop()      — manual stop + download trigger
 *   controller.stopped     — promise that resolves once the file has
 *                             been downloaded (so the caller can clean up
 *                             after a one-shot record)
 *
 * If the user cancels the share dialog, the promise resolves to `null`.
 */
export async function startTabRecording({ filename = 'modular-construction.webm' } = {}) {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    alert('Your browser does not support tab recording. Try Chrome or Edge.');
    return null;
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'browser', frameRate: 60 },
      audio: true,
      // Chrome-only hint: pre-selects the current tab in the picker so
      // the user just has to click "Share". Other browsers ignore it.
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
    });
  } catch (err) {
    if (err?.name !== 'NotAllowedError') {
      console.error('Recording cancelled', err);
    }
    return null;
  }

  if (stream.getAudioTracks().length === 0) {
    console.warn('Tab recording started without audio. The user can re-share with the "Share tab audio" checkbox checked to capture the soundtrack.');
  }

  const recorder = new MediaRecorder(stream, {
    mimeType: pickMimeType(),
    videoBitsPerSecond: 8_000_000,    // 8 Mbps — plenty for 1080p output
  });

  const chunks = [];
  recorder.addEventListener('dataavailable', (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  });

  // Stop cleanly when the user clicks "Stop sharing" in the browser
  // toolbar (this happens via the video track's "ended" event).
  stream.getVideoTracks()[0].addEventListener('ended', () => {
    if (recorder.state !== 'inactive') recorder.stop();
  });

  let resolveStopped;
  const stopped = new Promise((res) => { resolveStopped = res; });

  recorder.addEventListener('stop', () => {
    stream.getTracks().forEach((t) => t.stop());
    if (chunks.length === 0) {
      console.warn('Recording produced no data.');
      resolveStopped();
      return;
    }
    const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
    downloadBlob(blob, filename);
    resolveStopped();
  });

  recorder.start(1000);     // request data every 1 s so chunks accumulate

  return {
    stop() { if (recorder.state !== 'inactive') recorder.stop(); },
    stopped,
  };
}
