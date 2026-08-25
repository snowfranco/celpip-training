/* ============ Test Centre Noise — procedural "walla" ambience engine ============
   Simulates the acoustic chaos of a real CELPIP test centre: a room of
   candidates all speaking at once, plus keyboards, coughs, chairs, room tone.

   Each "candidate" is a small formant synthesizer: a pitched sawtooth (the
   voice source, male or female) shaped by two gliding vowel-formant filters,
   with sentence melody (pitch declination), breath noise, and consonant
   hisses — then everything is placed in a simulated room with reverb.
   The voices speak no real words, so nothing can bleed recognizable text
   into the user's speech-to-text transcript.

   Custom override: if assets/test-centre-noise.mp3 exists in the app folder
   (any royalty-free ambience the owner drops in), it loops instead of the
   synthesizer.

   Levels: 'quiet' (off) · 'medium' (Busy Lab) · 'high' (Full Chaos)      */
(function () {
  'use strict';

  const LEVELS = {
    quiet: null,
    medium: { voices: 5, nearVoice: false, master: 0.10, fileGain: 0.35, eventMinS: 4, eventMaxS: 11 },
    high: { voices: 9, nearVoice: true, master: 0.20, fileGain: 0.7, eventMinS: 2, eventMaxS: 6.5 },
  };

  /* Vowel targets [F1, F2] in Hz (male averages; scaled up for female voices) */
  const VOWELS = [
    [730, 1090], [660, 1720], [530, 1840], [440, 1020],
    [400, 1900], [300, 870], [570, 840], [270, 2290],
  ];

  const S = {
    ctx: null, level: 'quiet', running: false,
    nodes: [], timers: [], voices: [],
    master: null, analyser: null, noiseBuf: null, irBuf: null,
    retiring: [], // graphs fading out: [{nodes, master, timer}]
    customBuf: undefined, // undefined = not checked, null = none, AudioBuffer = use it
  };

  function ctx() {
    if (!S.ctx) S.ctx = new (window.AudioContext || window.webkitAudioContext)();
    return S.ctx;
  }

  const rand = (a, b) => a + Math.random() * (b - a);

  function noiseBuffer() {
    if (S.noiseBuf) return S.noiseBuf;
    const c = ctx();
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    S.noiseBuf = buf;
    return buf;
  }

  /* Synthetic room impulse response for the reverb */
  function irBuffer() {
    if (S.irBuf) return S.irBuf;
    const c = ctx();
    const len = Math.floor(c.sampleRate * 0.45);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    S.irBuf = buf;
    return buf;
  }

  /* Optional real-recording override, checked once per page load */
  function checkCustomFile() {
    if (S.customBuf !== undefined) return;
    S.customBuf = null;
    fetch('assets/test-centre-noise.mp3')
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject()))
      // decode on a throwaway OfflineAudioContext: never touches the live
      // AudioContext before a user gesture (avoids autoplay-policy warnings)
      .then(ab => new OfflineAudioContext(1, 1, 44100).decodeAudioData(ab))
      .then(buf => { S.customBuf = buf; })
      .catch(() => { S.customBuf = null; });
  }

  /* ---------- one synthetic "candidate" ---------- */
  function makeVoice(dest, near) {
    const c = ctx();
    const female = Math.random() < 0.5;
    const f0base = female ? rand(165, 235) : rand(95, 140);
    const fscale = female ? 1.15 : 1.0;

    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = f0base;

    const breathSrc = c.createBufferSource();
    breathSrc.buffer = noiseBuffer(); breathSrc.loop = true;
    breathSrc.playbackRate.value = rand(0.9, 1.1);
    const breathGain = c.createGain();
    breathGain.gain.value = female ? 0.10 : 0.06;

    const input = c.createGain(); input.gain.value = 1;
    osc.connect(input);
    breathSrc.connect(breathGain); breathGain.connect(input);

    // two gliding vowel formants + a fixed upper resonance
    const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = rand(5, 8);
    const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = rand(8, 12);
    const f3 = c.createBiquadFilter(); f3.type = 'bandpass'; f3.frequency.value = 2600 * fscale; f3.Q.value = 8;
    const g1 = c.createGain(); g1.gain.value = 1.0;
    const g2 = c.createGain(); g2.gain.value = 0.55;
    const g3 = c.createGain(); g3.gain.value = 0.12;
    const [F1, F2] = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    f1.frequency.value = F1 * fscale; f2.frequency.value = F2 * fscale;

    // distance: far voices are quieter and muffled, near ones present
    const distLP = c.createBiquadFilter();
    distLP.type = 'lowpass';
    distLP.frequency.value = near ? rand(3200, 3600) : rand(1400, 2400);

    const vGain = c.createGain(); vGain.gain.value = 0.0001;
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    if (pan) pan.pan.value = near ? rand(-0.3, 0.3) : rand(-0.9, 0.9);

    const mix = c.createGain(); mix.gain.value = 1;
    input.connect(f1); f1.connect(g1); g1.connect(mix);
    input.connect(f2); f2.connect(g2); g2.connect(mix);
    input.connect(f3); f3.connect(g3); g3.connect(mix);
    mix.connect(distLP); distLP.connect(vGain);
    if (pan) { vGain.connect(pan); pan.connect(dest); } else vGain.connect(dest);

    osc.start(); breathSrc.start();
    S.nodes.push(osc, breathSrc);

    return {
      osc, f1, f2, vGain, breathGain, fscale,
      f0base, f0phrase: f0base,
      breathBase: breathGain.gain.value,
      base: near ? rand(0.5, 0.7) : rand(0.16, 0.38),
      speaking: Math.random() < 0.65,
      syllablesLeft: 0,
      holdUntil: 0,
    };
  }

  /* Sentence/syllable state machine for every voice, one shared tick. */
  function voiceScheduler() {
    const c = ctx();
    const id = setInterval(() => {
      const now = c.currentTime;
      S.voices.forEach(v => {
        if (now < v.holdUntil) return;
        if (!v.speaking) {
          // start a new "sentence": reset melody, decide its length
          v.speaking = true;
          v.syllablesLeft = 3 + Math.floor(Math.random() * 10);
          v.f0phrase = v.f0base * rand(0.98, 1.12);
          v.holdUntil = now;
          return;
        }
        if (v.syllablesLeft <= 0) {
          // sentence over — trail off and pause like a real speaker
          v.speaking = false;
          v.holdUntil = now + rand(0.4, 3.5);
          v.vGain.gain.setTargetAtTime(0.0001, now, 0.08);
          return;
        }
        // next syllable: glide to a new vowel, step the melody down
        v.syllablesLeft--;
        v.f0phrase *= 0.985; // natural sentence declination
        const [F1, F2] = VOWELS[Math.floor(Math.random() * VOWELS.length)];
        v.f1.frequency.setTargetAtTime(F1 * v.fscale * rand(0.92, 1.08), now, 0.045);
        v.f2.frequency.setTargetAtTime(F2 * v.fscale * rand(0.92, 1.08), now, 0.045);
        v.osc.frequency.setTargetAtTime(v.f0phrase * rand(0.92, 1.14), now, 0.05);
        v.vGain.gain.setTargetAtTime(v.base * rand(0.5, 1), now, 0.035);
        if (Math.random() < 0.3) {
          // consonant: a brief "s/t" hiss riding on the breath channel
          v.breathGain.gain.setTargetAtTime(v.breathBase * 7, now, 0.008);
          v.breathGain.gain.setTargetAtTime(v.breathBase, now + 0.045, 0.02);
        }
        v.holdUntil = now + rand(0.1, 0.26);
      });
    }, 70);
    S.timers.push(id);
  }

  /* ---------- incidental sounds ---------- */
  function burst(dest, { dur, freq, q, gain, type = 'bandpass', rate = 1 }) {
    const c = ctx();
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(); src.playbackRate.value = rate;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = 0.0001;
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    src.connect(f); f.connect(g);
    if (pan) { pan.pan.value = rand(-0.85, 0.85); g.connect(pan); pan.connect(dest); }
    else g.connect(dest);
    const now = c.currentTime;
    g.gain.setTargetAtTime(gain, now, dur * 0.15);
    g.gain.setTargetAtTime(0.0001, now + dur * 0.4, dur * 0.25);
    src.start(now); src.stop(now + dur + 0.4);
  }

  function eventScheduler(dest, cfg) {
    const fire = () => {
      if (!S.running) return;
      const pick = Math.random();
      if (pick < 0.3) {              // cough (two pulses)
        burst(dest, { dur: 0.16, freq: rand(350, 700), q: 1.2, gain: rand(0.08, 0.18) });
        const t2 = setTimeout(() => S.running && burst(dest, { dur: 0.12, freq: rand(350, 700), q: 1.2, gain: rand(0.05, 0.1) }), 260);
        S.timers.push(t2);
      } else if (pick < 0.62) {      // keyboard clatter
        const n = 3 + Math.floor(Math.random() * 6);
        for (let i = 0; i < n; i++) {
          const t = setTimeout(() => S.running && burst(dest, { dur: 0.03, freq: rand(2200, 4200), q: 3, gain: rand(0.03, 0.07), type: 'highpass' }), i * rand(55, 130));
          S.timers.push(t);
        }
      } else if (pick < 0.84) {      // page turn / paper
        burst(dest, { dur: 0.22, freq: 3000, q: 0.7, gain: rand(0.03, 0.07), type: 'lowpass', rate: 1.6 });
      } else {                       // chair scrape
        burst(dest, { dur: 0.3, freq: rand(90, 160), q: 4, gain: rand(0.07, 0.14), rate: 0.5 });
      }
      const next = setTimeout(fire, rand(cfg.eventMinS, cfg.eventMaxS) * 1000);
      S.timers.push(next);
    };
    const first = setTimeout(fire, rand(1, 3) * 1000);
    S.timers.push(first);
  }

  function roomTone(dest) {
    const c = ctx();
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(); src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 110;
    const g = c.createGain(); g.gain.value = 0.35;
    src.connect(lp); lp.connect(g); g.connect(dest);
    src.start();
    S.nodes.push(src);
  }

  /* ---------- graph lifecycle (tracked fades — no orphan timers, no pops) ---------- */
  function killGraph(nodes, master) {
    nodes.forEach(n => { try { n.stop(); } catch { } try { n.disconnect(); } catch { } });
    if (master) { try { master.disconnect(); } catch { } }
  }

  function finishRetire(r) {
    clearTimeout(r.timer);
    killGraph(r.nodes, r.master);
    S.retiring = S.retiring.filter(x => x !== r);
  }

  function retireCurrentGraph(fadeSec) {
    S.timers.forEach(t => { clearInterval(t); clearTimeout(t); });
    S.timers = [];
    const r = { nodes: S.nodes, master: S.master, timer: null };
    S.nodes = []; S.voices = []; S.master = null; S.analyser = null;
    if (!r.master) { killGraph(r.nodes, null); return; }
    const g = r.master.gain, now = ctx().currentTime;
    try { g.cancelScheduledValues(now); } catch { }
    g.setValueAtTime(g.value, now); // kill any pending fade-IN so a young graph can't ramp back up
    g.setTargetAtTime(0.0001, now, fadeSec);
    r.timer = setTimeout(() => finishRetire(r), Math.max(400, fadeSec * 5000));
    S.retiring.push(r);
  }

  function start(level) {
    const cfg = LEVELS[level];
    if (!cfg) { stop(); return; }
    if (S.running && S.level === level) return;
    retireCurrentGraph(0.05); // crossfade the old graph out — no hard-cut pop
    const c = ctx();
    if (c.state === 'suspended') c.resume();
    checkCustomFile();

    const group = c.createGain(); group.gain.value = 1;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -28; comp.ratio.value = 6; comp.knee.value = 18;
    const master = c.createGain();
    master.gain.value = 0.0001;
    const analyser = c.createAnalyser(); analyser.fftSize = 2048;

    if (S.customBuf) {
      // owner-supplied real recording: loop it, skip the synthesizer
      const src = c.createBufferSource();
      src.buffer = S.customBuf; src.loop = true;
      src.connect(group); src.start();
      S.nodes.push(src);
      group.connect(comp);
    } else {
      // synthetic crowd in a simulated room
      const dry = c.createGain(); dry.gain.value = 0.75;
      const wet = c.createGain(); wet.gain.value = 0.4;
      const verb = c.createConvolver(); verb.buffer = irBuffer();
      group.connect(dry); dry.connect(comp);
      group.connect(verb); verb.connect(wet); wet.connect(comp);

      roomTone(group);
      for (let i = 0; i < cfg.voices; i++) S.voices.push(makeVoice(group, false));
      if (cfg.nearVoice) S.voices.push(makeVoice(group, true));
      voiceScheduler();
      eventScheduler(group, cfg);
    }

    comp.connect(master); master.connect(analyser); analyser.connect(c.destination);
    S.master = master; S.analyser = analyser;
    S.running = true;
    S.level = level;
    // fade in gently — sudden onset is startling, gradual onset is realistic
    master.gain.setTargetAtTime(S.customBuf ? cfg.fileGain : cfg.master, c.currentTime + 0.1, 0.9);
  }

  function stop() {
    retireCurrentGraph(0.15);
    S.running = false;
    S.level = 'quiet';
  }

  /* setLevel: the one entry point the app uses. 'quiet' stops everything. */
  function setLevel(level) {
    if (!LEVELS.hasOwnProperty(level)) level = 'quiet';
    if (level === 'quiet') stop(); else start(level);
  }

  /* test hooks */
  function _rms() {
    if (!S.analyser) return 0;
    const buf = new Uint8Array(S.analyser.fftSize);
    S.analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) { const d = (buf[i] - 128) / 128; sum += d * d; }
    return Math.sqrt(sum / buf.length);
  }
  /* spectral flatness 0..1 over the speech band — noise ≈ 0.4+, voiced murmur well below */
  function _flatness() {
    if (!S.analyser) return null;
    const c = ctx();
    const bins = new Float32Array(S.analyser.frequencyBinCount);
    S.analyser.getFloatFrequencyData(bins);
    const hzPerBin = c.sampleRate / 2 / bins.length;
    const lo = Math.floor(100 / hzPerBin), hi = Math.min(bins.length - 1, Math.floor(3500 / hzPerBin));
    let logSum = 0, linSum = 0, n = 0;
    for (let i = lo; i <= hi; i++) {
      const p = Math.pow(10, bins[i] / 10);
      if (!isFinite(p) || p <= 0) continue;
      logSum += Math.log(p); linSum += p; n++;
    }
    if (!n || linSum <= 0) return null;
    return Math.exp(logSum / n) / (linSum / n);
  }

  checkCustomFile();

  window.CelpipAmbience = {
    setLevel, stop,
    isRunning: () => S.running,
    currentLevel: () => (S.running ? S.level : 'quiet'),
    usingCustomFile: () => !!S.customBuf,
    _rms, _flatness,
  };
})();
