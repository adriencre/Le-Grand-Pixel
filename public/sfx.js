// 8-bit sound effects and lounge music, synthesised with Web Audio (no files).
let ac = null, out = null, musicBus = null, musicTimer = null;

export function initAudio() {
  if (ac) return;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  out = ac.createGain(); out.gain.value = 0.5; out.connect(ac.destination);
  musicBus = ac.createGain(); musicBus.gain.value = 0.35; musicBus.connect(out);
  if (musicPref()) startMusic();
}

function tone(f, dur, { f2 = f, type = 'square', vol = 0.15, at = 0, bus = out } = {}) {
  if (!ac) return;
  const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2 !== f) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t); o.stop(t + dur + 0.02);
}

let noiseBuf = null;
function noise(dur, { freq = 3000, q = 1, vol = 0.2, at = 0, bus = out } = {}) {
  if (!ac) return;
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ac.currentTime + at, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = noiseBuf;
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
}

const NOTE = n => 440 * 2 ** ((n - 69) / 12); // midi -> Hz

export const sfx = {
  click: () => tone(900, 0.03, { vol: 0.06 }),
  card: () => noise(0.07, { freq: 4000, q: 0.7, vol: 0.3 }),
  flip: () => noise(0.05, { freq: 2500, vol: 0.25 }),
  chip: () => { tone(2600, 0.04, { type: 'triangle', vol: 0.15 }); tone(3400, 0.05, { type: 'triangle', vol: 0.1, at: 0.035 }); },
  tick: () => tone(2200, 0.012, { vol: 0.04 }),
  lever: () => { tone(220, 0.25, { f2: 70, type: 'sawtooth', vol: 0.08 }); noise(0.15, { freq: 600, vol: 0.15 }); },
  reel: () => { tone(180, 0.08, { f2: 90, vol: 0.12 }); noise(0.05, { freq: 1200, vol: 0.2 }); },
  gun: () => { noise(0.35, { freq: 900, q: 0.4, vol: 0.6 }); tone(120, 0.2, { f2: 40, type: 'triangle', vol: 0.3 }); },
  gallop: () => { noise(0.05, { freq: 250, vol: 0.25 }); noise(0.05, { freq: 300, vol: 0.18, at: 0.07 }); },
  gulp: () => { for (let i = 0; i < 4; i++) tone(320 - i * 30, 0.07, { f2: 180, type: 'triangle', vol: 0.12, at: 0.25 + i * 0.13 }); tone(2400, 0.05, { type: 'triangle', vol: 0.1 }); tone(3000, 0.06, { type: 'triangle', vol: 0.08, at: 0.05 }); },
  pluck(n) { // street guitar note
    tone(NOTE(n), 0.45, { type: 'triangle', vol: 0.2 });
    tone(NOTE(n) * 1.003, 0.25, { type: 'square', vol: 0.035 });
    noise(0.02, { freq: 3000, vol: 0.08 });
  },
  bass: n => tone(NOTE(n), 0.35, { type: 'triangle', vol: 0.18 }),
  strum: ns => ns.forEach((n, i) => tone(NOTE(n), 0.5, { type: 'triangle', vol: 0.05, at: i * 0.015 })),
  miss: () => { tone(110, 0.12, { f2: 70, type: 'square', vol: 0.06 }); noise(0.06, { freq: 400, vol: 0.12 }); },
  coin: () => { tone(1800, 0.06, { vol: 0.08 }); tone(2700, 0.12, { vol: 0.07, at: 0.06 }); },
  rummage: () => { for (let i = 0; i < 7; i++) noise(0.08, { freq: 600 + (i % 3) * 700, vol: 0.18, at: i * 0.25 }); },
  slam: () => { noise(0.3, { freq: 200, q: 0.5, vol: 0.6 }); tone(70, 0.3, { f2: 40, type: 'triangle', vol: 0.3 }); },
  ding: () => { tone(1318, 0.9, { type: 'sine', vol: 0.15 }); tone(1046, 1.2, { type: 'sine', vol: 0.12, at: 0.25 }); },
  pop: () => tone(500, 0.08, { f2: 1300, vol: 0.1 }),
  blip: () => { tone(1200, 0.04, { vol: 0.06 }); tone(1600, 0.05, { vol: 0.05, at: 0.05 }); },
  win(amount) {
    const big = amount >= 500, notes = big ? [72, 76, 79, 84, 79, 84, 88] : [72, 76, 79, 84];
    notes.forEach((n, i) => tone(NOTE(n), big ? 0.16 : 0.12, { vol: 0.12, at: i * (big ? 0.11 : 0.08) }));
    if (big) for (let i = 0; i < 14; i++) tone(NOTE(96 + (i % 3) * 4), 0.05, { type: 'triangle', vol: 0.05, at: 0.8 + i * 0.05 });
  },
};

// ---------- music: a small ii-V-I-vi lounge loop ----------
const CHORDS = [[62, 65, 69, 72], [55, 59, 62, 65], [60, 64, 67, 71], [57, 60, 64, 67]]; // Dm7 G7 Cmaj7 Am7
const BASS = [[38, 45, 41, 45], [31, 38, 35, 38], [36, 43, 40, 43], [33, 40, 36, 40]];
const ARP = [0, 1, 2, 3, 2, 1, 2, 3];

// VIP floor: slow swing jazz piano (Cmaj9 Am9 Dm9 G13) with a walking bass.
const VIP_CHORDS = [[60, 64, 67, 71, 74], [57, 60, 64, 67, 71], [62, 65, 69, 72, 76], [55, 59, 64, 65, 69]];
const VIP_BASS = [[36, 40, 43, 45], [33, 36, 40, 43], [38, 41, 45, 47], [31, 35, 38, 40]];
const VIP_MELODY = [72, 74, 76, 79, 81, 84];
let mode = 'casino';
export function musicMode(m) { mode = m; }

function vipStep(step, at, eighth) {
  const bar = Math.floor(step / 8) % 4, s = step % 8, swing = s % 2 ? eighth * 0.33 : 0;
  if (s % 2 === 0) tone(NOTE(VIP_BASS[bar][s / 2]), eighth * 1.9, { type: 'sine', vol: 0.3, at, bus: musicBus });
  if (s === 2 || s === 6) VIP_CHORDS[bar].forEach((n, i) => tone(NOTE(n), eighth * 1.4, { type: 'triangle', vol: 0.03, at: at + i * 0.012, bus: musicBus }));
  const r = Math.abs(Math.sin(step * 12.9898) * 43758.5453) % 1;
  if (r > 0.55) tone(NOTE(VIP_MELODY[Math.floor(r * 100) % VIP_MELODY.length]), eighth * 1.2, { type: 'triangle', vol: 0.05, at: at + swing, bus: musicBus });
  noise(0.05, { freq: 5000, q: 0.3, vol: 0.025, at: at + swing, bus: musicBus }); // brushes
}

function startMusic() {
  if (!ac || musicTimer) return;
  let step = 0, next = ac.currentTime + 0.1;
  musicTimer = setInterval(() => {
    while (next < ac.currentTime + 0.3) {
      const eighth = 60 / (mode === 'vip' ? 76 : 96) / 2;
      const bar = Math.floor(step / 8) % 4, s = step % 8, at = next - ac.currentTime;
      if (mode === 'vip') { vipStep(step, at, eighth); next += eighth; step++; continue; }
      if (s % 2 === 0) tone(NOTE(BASS[bar][s / 2]), eighth * 1.8, { type: 'triangle', vol: 0.22, at, bus: musicBus });
      if (Math.floor(step / 32) % 2 || s % 2 === 0) tone(NOTE(CHORDS[bar][ARP[s]] + 12), eighth * 0.9, { vol: 0.035, at, bus: musicBus });
      if (s % 2 === 1) noise(0.03, { freq: 8000, vol: 0.05, at, bus: musicBus });
      next += eighth; step++;
    }
  }, 100);
}
function stopMusic() { clearInterval(musicTimer); musicTimer = null; }

// Outside the casino the lounge music is muffled; while busking it stops.
export function musicVolume(v) { if (musicBus) musicBus.gain.setTargetAtTime(v, ac.currentTime, 0.4); }

function musicPref() { try { return localStorage.getItem('music') !== '0'; } catch { return true; } }
export function toggleMusic() {
  const on = !musicTimer;
  if (on) startMusic(); else stopMusic();
  try { localStorage.setItem('music', on ? '1' : '0'); } catch {}
  return on;
}
