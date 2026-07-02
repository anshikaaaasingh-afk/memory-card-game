/* modules/audio.js
   All sound is synthesized with the Web Audio API so the project ships
   with zero binary audio assets. Keep it lightweight: short beeps for
   feedback, an optional soft ambient pad loop for "music". */

let ctx = null;
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function beep({ freq = 440, duration = 0.12, type = 'sine', gain = 0.15, sweepTo = null }) {
  const c = getCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, c.currentTime + duration);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(g); g.connect(c.destination);
  osc.start(); osc.stop(c.currentTime + duration);
}

export const SFX = {
  flip:    () => beep({ freq: 320, duration: 0.08, type: 'triangle', gain: 0.12 }),
  match:   () => { beep({ freq: 523, duration: 0.1, type: 'sine', gain: 0.15 }); setTimeout(()=>beep({ freq: 784, duration: 0.14, type: 'sine', gain: 0.15 }), 90); },
  mismatch:() => beep({ freq: 180, duration: 0.18, type: 'sawtooth', gain: 0.1, sweepTo: 110 }),
  win:     () => { [523,659,784,1046].forEach((f,i)=>setTimeout(()=>beep({freq:f, duration:0.18, type:'sine', gain:0.16}), i*110)); },
  lose:    () => { [392,330,262].forEach((f,i)=>setTimeout(()=>beep({freq:f, duration:0.22, type:'sawtooth', gain:0.12}), i*130)); },
  click:   () => beep({ freq: 600, duration: 0.05, type: 'square', gain: 0.06 }),
  powerup: () => { beep({ freq: 440, duration: 0.1, type:'triangle', gain:0.14, sweepTo: 880 }); },
};

let musicNodes = null;
export function startAmbientMusic() {
  if (musicNodes) return;
  const c = getCtx();
  const osc1 = c.createOscillator(), osc2 = c.createOscillator();
  const g = c.createGain();
  osc1.type = 'sine'; osc2.type = 'sine';
  osc1.frequency.value = 130.8; // C3
  osc2.frequency.value = 164.8; // E3
  g.gain.value = 0.0;
  osc1.connect(g); osc2.connect(g); g.connect(c.destination);
  osc1.start(); osc2.start();
  g.gain.linearRampToValueAtTime(0.025, c.currentTime + 1.5);
  musicNodes = { osc1, osc2, g };
}
export function stopAmbientMusic() {
  if (!musicNodes) return;
  const c = getCtx();
  musicNodes.g.gain.linearRampToValueAtTime(0, c.currentTime + 0.6);
  const nodes = musicNodes;
  setTimeout(() => { nodes.osc1.stop(); nodes.osc2.stop(); }, 700);
  musicNodes = null;
}

export function playSfx(name, enabled) {
  if (!enabled) return;
  try { SFX[name] && SFX[name](); } catch (e) { /* audio may be blocked before first user gesture */ }
}
