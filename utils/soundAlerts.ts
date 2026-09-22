// utils/soundAlerts.ts
// Comprehensive Theme Park Operational Audio & Notification Alert System
// Supports Web Audio API synthesized alert chimes, pre-cached HTMLAudioElement fallbacks,
// mobile hardware vibration, browser Web Notifications, and user preference controls.

let sharedAudioCtx: AudioContext | null = null;
let isAudioUnlocked = false;
let pendingAlertTimestamp = 0;

// Pre-cached Audio elements for instant HTML5 playback
let cachedReportedAudio: HTMLAudioElement | null = null;
let cachedSolvedAudio: HTMLAudioElement | null = null;

/**
 * Generate high-fidelity PCM WAV Data URI with clean amplitude envelope
 */
function createWavDataUri(tones: Array<{ freq: number; duration: number; type?: 'sine' | 'square' | 'triangle' }>, volume: number = 0.85): string {
  try {
    const sampleRate = 22050;
    const totalDuration = tones.reduce((acc, t) => acc + t.duration, 0);
    const numSamples = Math.floor(sampleRate * totalDuration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + numSamples * 2, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"

    // fmt sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, 1, true); // NumChannels (1 mono)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample

    // data sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, numSamples * 2, true);

    const offset = 44;
    let currentSampleIndex = 0;

    for (const tone of tones) {
      const toneSamples = Math.floor(sampleRate * tone.duration);
      for (let i = 0; i < toneSamples; i++) {
        const t = i / sampleRate;
        // Fast 4ms attack, smooth 18ms decay to prevent speaker pop
        const attack = Math.min(1, (i / (sampleRate * 0.004)));
        const decay = Math.max(0, 1 - (i / toneSamples));
        const envelope = attack * Math.pow(decay, 1.1);

        // Rich harmonic tone for loud mobile speakers (fundamental + harmonic)
        const sample1 = Math.sin(2 * Math.PI * tone.freq * t);
        const sample2 = Math.sin(2 * Math.PI * (tone.freq * 2) * t) * 0.25;
        const raw = (sample1 + sample2) * envelope * volume;

        const intSample = Math.max(-32768, Math.min(32767, Math.floor(raw * 32767)));
        view.setInt16(offset + currentSampleIndex * 2, intSample, true);
        currentSampleIndex++;
      }
    }

    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'data:audio/wav;base64,' + btoa(binary);
  } catch (e) {
    return '';
  }
}

// 1. Loud, Piercing Theme Park Operational Issue Alert (880Hz -> 1175Hz -> 880Hz -> 1175Hz)
// Specifically tuned so everyone in a noisy attraction or control counter hears it clearly
const REPORTED_ISSUE_WAV = createWavDataUri([
  { freq: 880.00, duration: 0.16 }, // A5
  { freq: 1174.66, duration: 0.18 }, // D6
  { freq: 880.00, duration: 0.16 }, // A5
  { freq: 1174.66, duration: 0.35 }  // D6 prolonged decay
], 0.90);

// 2. Clear Pleasant Solved Notification Chime (C5 523.25Hz -> G5 783.99Hz -> C6 1046.50Hz)
const SOLVED_ISSUE_WAV = createWavDataUri([
  { freq: 523.25, duration: 0.12 },
  { freq: 783.99, duration: 0.14 },
  { freq: 1046.50, duration: 0.35 }
], 0.85);

// Pre-initialize cached HTMLAudioElement instances
if (typeof window !== 'undefined') {
  try {
    if (REPORTED_ISSUE_WAV) {
      cachedReportedAudio = new Audio(REPORTED_ISSUE_WAV);
      cachedReportedAudio.volume = 1.0;
      cachedReportedAudio.preload = 'auto';
    }
    if (SOLVED_ISSUE_WAV) {
      cachedSolvedAudio = new Audio(SOLVED_ISSUE_WAV);
      cachedSolvedAudio.volume = 1.0;
      cachedSolvedAudio.preload = 'auto';
    }
  } catch (_) {}
}

/**
 * Get or initialize the global AudioContext instance
 */
export function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
    }
    return sharedAudioCtx;
  } catch (e) {
    return null;
  }
}

/**
 * Check if the audio engine is unlocked and ready to play
 */
export function isAudioReady(): boolean {
  if (isAudioUnlocked) return true;
  if (sharedAudioCtx && sharedAudioCtx.state === 'running') {
    isAudioUnlocked = true;
    return true;
  }
  return false;
}

/**
 * Unlock audio on any user gesture (click, tap, touch, keypress)
 */
export function unlockAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          isAudioUnlocked = true;
          checkPendingAlerts();
        }).catch(() => {});
      } else if (ctx.state === 'running') {
        isAudioUnlocked = true;
        checkPendingAlerts();
      }
    }

    // Also prime cached HTML audio elements
    if (cachedReportedAudio) {
      cachedReportedAudio.load();
    }
    if (cachedSolvedAudio) {
      cachedSolvedAudio.load();
    }

    // Request notification permission if supported
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  } catch (e) {}
}

function checkPendingAlerts() {
  if (pendingAlertTimestamp > 0 && Date.now() - pendingAlertTimestamp < 45000) {
    pendingAlertTimestamp = 0;
    playReportedIssueSound();
  }
}

// Proactively listen for first user interactions across window & document
if (typeof window !== 'undefined') {
  const onUserInteraction = () => {
    unlockAudio();
    // Keep unlock active and flush pending sounds
    if (sharedAudioCtx && sharedAudioCtx.state === 'running') {
      window.removeEventListener('click', onUserInteraction);
      window.removeEventListener('touchstart', onUserInteraction);
      window.removeEventListener('keydown', onUserInteraction);
      window.removeEventListener('pointerdown', onUserInteraction);
    }
  };

  window.addEventListener('click', onUserInteraction, { passive: true });
  window.addEventListener('touchstart', onUserInteraction, { passive: true });
  window.addEventListener('keydown', onUserInteraction, { passive: true });
  window.addEventListener('pointerdown', onUserInteraction, { passive: true });

  // When tab becomes visible again, check pending alerts
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      unlockAudio();
    }
  });
}

/**
 * User preference for sound enabled
 */
export function isSoundMuted(): boolean {
  try {
    return localStorage.getItem('TFW_SOUND_MUTED') === 'true';
  } catch (_) {
    return false;
  }
}

export function setSoundMuted(muted: boolean) {
  try {
    localStorage.setItem('TFW_SOUND_MUTED', muted ? 'true' : 'false');
  } catch (_) {}
}

/**
 * Play sound via HTMLAudioElement fallback
 */
function playAudioFallback(audioInstance: HTMLAudioElement | null, fallbackUri: string): boolean {
  try {
    const audio = audioInstance || (fallbackUri ? new Audio(fallbackUri) : null);
    if (!audio) return false;
    audio.currentTime = 0;
    audio.volume = 1.0;
    const p = audio.play();
    if (p !== undefined) {
      p.catch(() => {
        // Autoplay policy blocked; store pending alert timestamp
        pendingAlertTimestamp = Date.now();
      });
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Vibrate device if hardware supports Vibration API (mobile phones, tablets)
 */
function triggerDeviceVibration(pattern: number[] = [400, 150, 400, 150, 700]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (_) {}
}

let originalTitle = typeof document !== 'undefined' ? document.title : '';
let titleBlinkTimer: any = null;

function blinkDocumentTitle(alertMsg: string) {
  if (typeof document === 'undefined') return;
  if (!originalTitle) originalTitle = document.title;
  if (titleBlinkTimer) clearInterval(titleBlinkTimer);

  let state = false;
  let count = 0;
  titleBlinkTimer = setInterval(() => {
    document.title = state ? `🚨 ${alertMsg}` : `⚠️ TOGGI FUN WORLD ALERT`;
    state = !state;
    count++;
    if (count > 40) {
      clearInterval(titleBlinkTimer);
      titleBlinkTimer = null;
      document.title = originalTitle;
    }
  }, 500);

  const resetOnActive = () => {
    if (titleBlinkTimer) {
      clearInterval(titleBlinkTimer);
      titleBlinkTimer = null;
      document.title = originalTitle;
    }
    window.removeEventListener('focus', resetOnActive);
    window.removeEventListener('click', resetOnActive);
  };
  window.addEventListener('focus', resetOnActive, { passive: true });
  window.addEventListener('click', resetOnActive, { passive: true });
}

// Cross-tab broadcast channel for synchronized alerts
let alertBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    alertBroadcastChannel = new BroadcastChannel('tfw-sound-alerts');
  } catch (_) {}
}

/**
 * Register Service Worker for background system push notifications on mobile & desktop
 */
export function initAlertsServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('[TFW Alerts] Service Worker active:', reg.scope);
    }).catch((err) => {
      console.warn('[TFW Alerts] Service Worker registration skipped:', err);
    });
  }
}

// Auto-init service worker
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    initAlertsServiceWorker();
  } else {
    window.addEventListener('load', initAlertsServiceWorker);
  }
}

/**
 * Request notification permissions and register service worker for mobile & desktop
 */
export async function requestAlertNotificationPermissions(): Promise<boolean> {
  unlockAudio();
  initAlertsServiceWorker();
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        try {
          localStorage.setItem('TFW_NOTIFICATIONS_ENABLED', 'true');
        } catch (_) {}
        return true;
      }
    }
  } catch (_) {}
  return false;
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission;
  }
  return 'unsupported';
}

/**
 * Fire browser Web Notification banner even if tab is in background or minimized
 */
function showSystemNotification(title: string, body: string) {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const notif = new Notification(title, {
          body,
          icon: '/tbg-logo.svg',
          badge: '/tbg-logo.svg',
          tag: 'tfw-maintenance-alert',
          silent: false,
          requireInteraction: true
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            const notif = new Notification(title, {
              body,
              icon: '/tbg-logo.svg',
              badge: '/tbg-logo.svg',
              tag: 'tfw-maintenance-alert',
              requireInteraction: true
            });
            notif.onclick = () => {
              window.focus();
              notif.close();
            };
          }
        }).catch(() => {});
      }
    }
  } catch (_) {}
}

/**
 * Manually arm/unlock audio & request notification permissions (e.g. from banner or test button)
 */
export function armAlertAudio(): boolean {
  unlockAudio();
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
  return isAudioReady();
}

/**
 * Play synthesizer tones via Web Audio API with full volume envelope
 */
function playWebAudioSequence(ctx: AudioContext, tones: Array<{ freq: number; duration: number }>, volume: number = 0.95) {
  try {
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, now);
    masterGain.connect(ctx.destination);

    let toneStartTime = now;
    for (let i = 0; i < tones.length; i++) {
      const tone = tones[i];
      const osc = ctx.createOscillator();
      const toneGain = ctx.createGain();

      // Triangle wave has strong punchy fundamentals without harsh square buzz
      osc.type = i % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(tone.freq, toneStartTime);

      // Fast attack & decay envelope
      toneGain.gain.setValueAtTime(0.001, toneStartTime);
      toneGain.gain.linearRampToValueAtTime(1.0, toneStartTime + 0.008);
      toneGain.gain.exponentialRampToValueAtTime(0.001, toneStartTime + tone.duration);

      osc.connect(toneGain);
      toneGain.connect(masterGain);

      osc.start(toneStartTime);
      osc.stop(toneStartTime + tone.duration);

      toneStartTime += tone.duration;
    }
    return true;
  } catch (e) {
    return false;
  }
}

// Compatibility helpers
export function isAlarmActive(): boolean {
  return false;
}

export function getActiveAlarmTicket() {
  return null;
}

export function stopActiveAlarm() {
  if (typeof document !== 'undefined' && originalTitle) {
    document.title = originalTitle;
  }
}

/**
 * Play a vibrant, loud operational alert chime whenever an issue is reported to Maintenance
 * Audible 4-tone sequence: A5 (880Hz) -> D6 (1175Hz) -> A5 (880Hz) -> D6 (1175Hz)
 * Alerts everyone monitoring the app across mobile phones, tablets, and desktops!
 */
export function playReportedIssueSound(ticketDetails?: { rideName?: string; problem?: string }) {
  if (isSoundMuted()) return;

  // Trigger mobile hardware vibration immediately
  triggerDeviceVibration([500, 150, 500, 150, 800]);

  // Flash browser document title so background tabs & external apps see it
  const alertSummary = ticketDetails?.rideName ? `${ticketDetails.rideName}: ${ticketDetails.problem || 'Issue'}` : 'New Issue Reported!';
  blinkDocumentTitle(alertSummary);

  // Trigger system notification if enabled
  showSystemNotification(
    `🚨 New Issue Reported: ${ticketDetails?.rideName || 'Attraction Issue'}`,
    ticketDetails?.problem || 'New maintenance ticket received. Attention required!'
  );

  // Dispatch window event so screens can show notification
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('tfw-live-issue-alert', { detail: ticketDetails || {} }));
    } catch (_) {}
  }

  const alertTones = [
    { freq: 880.00, duration: 0.16 },
    { freq: 1174.66, duration: 0.18 },
    { freq: 880.00, duration: 0.16 },
    { freq: 1174.66, duration: 0.35 }
  ];

  let webAudioStarted = false;
  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          isAudioUnlocked = true;
          playWebAudioSequence(ctx, alertTones, 0.95);
        }).catch(() => {
          playAudioFallback(cachedReportedAudio, REPORTED_ISSUE_WAV);
        });
      } else {
        isAudioUnlocked = true;
        playWebAudioSequence(ctx, alertTones, 0.95);
        webAudioStarted = true;
      }
    }
  } catch (e) {
    webAudioStarted = false;
  }

  // Always invoke HTML5 audio fallback to guarantee sound output
  playAudioFallback(cachedReportedAudio, REPORTED_ISSUE_WAV);

  // Repeat sound burst after 650ms to ensure it's heard across loud park environments
  setTimeout(() => {
    try {
      const ctx2 = getAudioContext();
      if (ctx2 && ctx2.state === 'running') {
        playWebAudioSequence(ctx2, alertTones, 0.95);
      } else {
        playAudioFallback(cachedReportedAudio, REPORTED_ISSUE_WAV);
      }
    } catch (_) {}
  }, 650);
}

/**
 * Play a pleasant solved chime when maintenance marks an issue as solved
 */
export function playSolvedIssueSound(ticketDetails?: { rideName?: string; technician?: string }) {
  if (isSoundMuted()) return;

  triggerDeviceVibration([250, 100, 400]);

  if (ticketDetails) {
    showSystemNotification(
      `🎉 Issue Solved: ${ticketDetails.rideName || 'Attraction Operational'}`,
      `Verified operational by ${ticketDetails.technician || 'Maintenance'}`
    );
  }

  const solvedTones = [
    { freq: 523.25, duration: 0.12 },
    { freq: 783.99, duration: 0.14 },
    { freq: 1046.50, duration: 0.35 }
  ];

  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          isAudioUnlocked = true;
          playWebAudioSequence(ctx, solvedTones, 0.85);
        }).catch(() => {
          playAudioFallback(cachedSolvedAudio, SOLVED_ISSUE_WAV);
        });
      } else {
        isAudioUnlocked = true;
        playWebAudioSequence(ctx, solvedTones, 0.85);
      }
    }
  } catch (e) {}

  playAudioFallback(cachedSolvedAudio, SOLVED_ISSUE_WAV);
}
