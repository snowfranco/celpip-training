/* ============ CELPIP Speaking Trainer — app ============ */
(function () {
  'use strict';

  const DATA = window.CELPIP_DATA;
  const A = window.CelpipAnalysis;
  const app = document.getElementById('app');

  /* ---------- tiny helpers ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`;

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.getElementById('toast-root').appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  function openModal(html) {
    const root = document.getElementById('modal-root');
    root.innerHTML = `<div class="modal-overlay"><div class="modal"><button class="modal-close">✕</button>${html}</div></div>`;
    $('.modal-close', root).onclick = closeModal;
    $('.modal-overlay', root).addEventListener('click', (e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); });
  }
  function closeModal() { document.getElementById('modal-root').innerHTML = ''; }

  /* ---------- persistence ---------- */
  const STORE_KEY = 'celpipTrainer.history.v1';
  function loadHistory() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; } }
  function saveAttempt(entry) {
    const h = loadHistory();
    h.unshift(entry);
    localStorage.setItem(STORE_KEY, JSON.stringify(h.slice(0, 100)));
  }
  const bestLevelForTask = (taskNumber) => {
    const h = loadHistory().filter(e => e.taskNumber === taskNumber);
    return h.length ? h.reduce((m, e) => Math.max(m, e.result.levelNum), 0) : null;
  };

  /* ---------- test centre noise (setting + control UI) ---------- */
  const NOISE_KEY = 'celpipTrainer.noiseLevel.v1';
  const NOISE_LABELS = { quiet: 'Quiet', medium: 'Busy Lab', high: 'Full Chaos' };
  const NOISE_ICONS = { quiet: '🔇', medium: '🔉', high: '🔊' };
  const noiseLevel = () => { const v = localStorage.getItem(NOISE_KEY); return NOISE_LABELS[v] ? v : 'quiet'; };
  const setNoiseLevel = (v) => localStorage.setItem(NOISE_KEY, v);
  const ambience = () => window.CelpipAmbience;

  function noiseControl(compact) {
    const cur = noiseLevel();
    return `<div class="noise-panel${compact ? ' compact' : ''}">
      <div class="noise-head">🎧 Test Centre Noise</div>
      ${compact ? '' : `<p class="noise-why">In the real exam, every candidate around you speaks at the same time. Practise with the noise on so it can't shake you on test day — click a level to hear a five-second preview; during the task it starts with your prep timer. <b>Wear headphones:</b> without them, your microphone records the noise too, which can garble your transcript and unfairly lower your score.</p>`}
      <div class="set-pills" style="margin:0" role="group" aria-label="Test centre noise level">
        ${Object.keys(NOISE_LABELS).map(k =>
      `<button class="set-pill noise-pill ${k === cur ? 'active' : ''}" aria-pressed="${k === cur}" data-noise="${k}">${NOISE_ICONS[k]} ${NOISE_LABELS[k]}</button>`).join('')}
      </div>
      ${compact ? `<span class="noise-hint" id="noise-hint" style="display:${cur === 'quiet' ? 'none' : ''}">🎧 Headphones keep the noise out of your mic</span>` : ''}
    </div>`;
  }
  let noisePreviewTimer = null;
  let noisePreviewActive = false; // lets intro re-renders (question switching) keep a preview alive
  function bindNoiseControl(live) {
    $$('[data-noise]').forEach(b => b.onclick = () => {
      setNoiseLevel(b.dataset.noise);
      $$('[data-noise]').forEach(x => {
        x.classList.toggle('active', x === b);
        x.setAttribute('aria-pressed', String(x === b));
      });
      const hint = $('#noise-hint');
      if (hint) hint.style.display = b.dataset.noise === 'quiet' ? 'none' : '';
      if (!ambience()) return;
      if (live) { ambience().setLevel(b.dataset.noise); return; }
      // intro screen: play a 5-second preview of the chosen level
      clearTimeout(noisePreviewTimer);
      ambience().setLevel(b.dataset.noise);
      noisePreviewActive = b.dataset.noise !== 'quiet';
      if (noisePreviewActive) {
        noisePreviewTimer = setTimeout(() => {
          noisePreviewActive = false;
          const inTimedStage = session && (session.stage === 'prep' || session.stage === 'recording');
          if (!inTimedStage) ambience().stop(); // never cut noise that a started task now owns
        }, 5000);
      }
    });
  }

  /* ---------- recording storage (IndexedDB — reports keep their playback) ---------- */
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('celpipTrainer', 1);
      req.onupgradeneeded = () => { req.result.createObjectStore('recordings', { keyPath: 'id' }); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function saveRecording(id, blob, isVideo) {
    try {
      const db = await openDB();
      await new Promise((res, rej) => {
        const tx = db.transaction('recordings', 'readwrite');
        tx.objectStore('recordings').put({ id, blob, isVideo, ts: Date.now() });
        tx.oncomplete = res; tx.onerror = () => rej(tx.error);
      });
      const keys = await new Promise((res, rej) => {
        const rq = db.transaction('recordings', 'readonly').objectStore('recordings').getAllKeys();
        rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
      });
      if (keys.length > 20) {
        const tx = db.transaction('recordings', 'readwrite');
        keys.sort().slice(0, keys.length - 20).forEach(k => tx.objectStore('recordings').delete(k));
      }
    } catch { /* storage unavailable — the report still saves without playback */ }
  }
  async function loadRecording(id) {
    try {
      const db = await openDB();
      return await new Promise((res, rej) => {
        const rq = db.transaction('recordings', 'readonly').objectStore('recordings').get(id);
        rq.onsuccess = () => res(rq.result || null); rq.onerror = () => rej(rq.error);
      });
    } catch { return null; }
  }

  /* ---------- data accessors ---------- */
  const taskByNumber = (n) => DATA.tasks.find(t => t.taskNumber === n);
  const promptOf = (task, setIdx) => task.prompts[setIdx % task.prompts.length];
  const sceneSvgFor = (prompt) => prompt.svg ? prompt.svg : (prompt.sceneId && DATA.scenes[prompt.sceneId] ? DATA.scenes[prompt.sceneId].svg : null);
  const guideFor = (key) => DATA.rubric.metricGuides.find(g => g.metricKey === key) || { title: key, why: '', target: '', improveTips: [] };
  const levelInfo = (level) => DATA.rubric.levels.find(l => l.level === String(level)) || { label: '', descriptor: '' };

  /* ---------- text-to-speech (examiner voice) ---------- */
  function speak(text) {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-CA'; u.rate = 0.98;
      const v = speechSynthesis.getVoices().find(v => /en[-_](CA|US|GB)/i.test(v.lang));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch { /* no TTS available */ }
  }

  function beep(freq, ms) {
    try {
      const ctx = beep.ctx || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)());
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.12, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
      o.start(); o.stop(ctx.currentTime + ms / 1000);
    } catch { /* silent */ }
  }

  /* ---------- media manager ---------- */
  const media = {
    stream: null, videoOn: true, recorder: null, chunks: [], blobUrl: null, blobIsVideo: true,
    recog: null, recogActive: false, transcript: '', interim: '',
    audioCtx: null, analyser: null, meterTimer: null, volumeSamples: [],
    startTs: 0, durationSec: 0, srSupported: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  };

  async function ensureStream() {
    if (media.stream && media.stream.active) return media.stream;
    try {
      media.stream = await navigator.mediaDevices.getUserMedia({ video: media.videoOn, audio: true });
      media.blobIsVideo = media.stream.getVideoTracks().length > 0;
    } catch (e1) {
      try {
        media.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        media.blobIsVideo = false;
        toast('Camera unavailable — recording audio only.');
      } catch (e2) {
        media.stream = null;
        toast('Microphone unavailable — practice with timers, then type your answer for analysis.');
      }
    }
    return media.stream;
  }

  function startRecordingMedia(onTranscriptUpdate) {
    media.chunks = []; media.transcript = ''; media.interim = ''; media.volumeSamples = [];
    media.startTs = Date.now();
    if (media.blobUrl) { URL.revokeObjectURL(media.blobUrl); media.blobUrl = null; }

    if (media.stream) {
      try {
        media.recorder = new MediaRecorder(media.stream);
        media.recorder.ondataavailable = (e) => { if (e.data.size) media.chunks.push(e.data); };
        media.recorder.start(1000);
      } catch { media.recorder = null; }

      try {
        media.audioCtx = media.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const src = media.audioCtx.createMediaStreamSource(media.stream);
        media.analyser = media.audioCtx.createAnalyser();
        media.analyser.fftSize = 512;
        src.connect(media.analyser);
        const buf = new Uint8Array(media.analyser.fftSize);
        media.meterTimer = setInterval(() => {
          media.analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) { const d = (buf[i] - 128) / 128; sum += d * d; }
          const rms = Math.sqrt(sum / buf.length);
          media.volumeSamples.push(rms);
          const bar = $('#vu-fill');
          if (bar) bar.style.width = Math.min(100, rms * 600) + '%';
        }, 100);
      } catch { /* no meter */ }
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      media.recog = new SR();
      media.recog.continuous = true;
      media.recog.interimResults = true;
      media.recog.lang = 'en-CA';
      media.recogActive = true;
      media.recog.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) media.transcript += r[0].transcript + ' ';
          else interim += r[0].transcript;
        }
        media.interim = interim;
        onTranscriptUpdate && onTranscriptUpdate();
      };
      media.recog.onend = () => { if (media.recogActive) { try { media.recog.start(); } catch { } } };
      media.recog.onerror = () => { /* keep going via onend restart */ };
      try { media.recog.start(); } catch { }
    }
  }

  function stopRecordingMedia() {
    return new Promise((resolve) => {
      media.durationSec = (Date.now() - media.startTs) / 1000;
      media.recogActive = false;
      if (media.recog) { try { media.recog.stop(); } catch { } media.recog = null; }
      if (media.meterTimer) { clearInterval(media.meterTimer); media.meterTimer = null; }
      if (media.recorder && media.recorder.state !== 'inactive') {
        media.recorder.onstop = () => {
          const blob = new Blob(media.chunks, { type: media.recorder.mimeType || 'video/webm' });
          media.lastBlob = blob;
          media.blobUrl = URL.createObjectURL(blob);
          resolve();
        };
        try { media.recorder.stop(); } catch { resolve(); }
      } else { media.lastBlob = null; resolve(); }
    });
  }

  function releaseStream() {
    if (media.stream) { media.stream.getTracks().forEach(t => t.stop()); media.stream = null; }
  }

  /* ---------- countdown ---------- */
  const activeTimers = [];
  function clearTimers() { activeTimers.forEach(clearInterval); activeTimers.length = 0; }
  function countdown(total, onTick, onDone) {
    let remaining = total;
    onTick(remaining);
    const id = setInterval(() => {
      remaining--;
      if (remaining <= 0) { clearInterval(id); onTick(0); onDone && onDone(); }
      else onTick(remaining);
    }, 1000);
    activeTimers.push(id);
    return () => clearInterval(id);
  }

  function ringSVG(id, size) {
    const r = (size - 14) / 2, c = 2 * Math.PI * r;
    return `<svg id="${id}" class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}"></circle>
      <circle class="arc" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="0"></circle>
    </svg>`;
  }
  function setRing(id, remaining, total) {
    const svg = document.getElementById(id);
    if (!svg) return;
    const arc = $('.arc', svg);
    const c = parseFloat(arc.getAttribute('stroke-dasharray'));
    arc.style.strokeDashoffset = c * (1 - remaining / total);
  }

  /* ---------- navigation ---------- */
  function setNav(name) {
    $$('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.nav === name));
  }
  $$('.nav-link').forEach(a => a.addEventListener('click', (e) => {
    e.preventDefault();
    const n = a.dataset.nav;
    if (window.CelpipDrills) window.CelpipDrills.cleanup();
    if (n === 'dashboard') renderDashboard();
    else if (n === 'mock') startPractice('mock', 0, nextMockSet());
    else if (n === 'progress') renderProgress();
    else if (n === 'drills') { leaveMediaViews(); releaseStream(); setNav('drills'); window.CelpipDrills.renderHome(); }
  }));
  $('.brand').addEventListener('click', renderDashboard);

  function leaveMediaViews() {
    clearTimers();
    media.recogActive = false;
    if (media.recog) { try { media.recog.stop(); } catch { } }
    if (media.recorder && media.recorder.state !== 'inactive') { try { media.recorder.stop(); } catch { } }
    media.recorder = null;
    if (media.meterTimer) { clearInterval(media.meterTimer); media.meterTimer = null; }
    speechSynthesis && speechSynthesis.cancel();
    clearTimeout(noisePreviewTimer);
    noisePreviewActive = false;
    if (ambience()) ambience().stop();
  }
  function nextMockSet() { return loadHistory().filter(e => e.mode === 'mock' && e.taskNumber === 1).length % 5; }

  /* ================= DASHBOARD ================= */
  function renderDashboard() {
    leaveMediaViews(); releaseStream(); setNav('dashboard');
    const hist = loadHistory();
    const attempts = hist.length;
    const best = attempts ? Math.max(...hist.map(e => e.result.levelNum)) : null;
    const recent = hist.slice(0, 6);
    const avg = attempts ? (hist.slice(0, 10).reduce((s, e) => s + e.result.levelNum, 0) / Math.min(attempts, 10)).toFixed(1) : '—';
    const tasksTried = new Set(hist.map(e => e.taskNumber)).size;

    app.innerHTML = `
    <div class="container">
      <section class="hero">
        <div>
          <h1>CELPIP Speaking Trainer</h1>
          <p>Practice all 8 speaking tasks under real test timing, get instant AI-style feedback on pace, fillers,
          vocabulary and task fulfillment — and close the gap to <b>Level 10+</b>.</p>
          <div class="hero-actions">
            <button class="btn btn-white" id="btn-mock">▶ &nbsp;Start Full Mock Test</button>
            <button class="btn btn-ghost" id="btn-drills">🗣️ Pronunciation Drills</button>
            <button class="btn btn-ghost" id="btn-demo">See a sample report</button>
          </div>
        </div>
      </section>

      <div class="stat-strip">
        <div class="stat-box"><div class="num">${attempts}</div><div class="lbl">Answers recorded</div></div>
        <div class="stat-box"><div class="num">${best === null ? '—' : (best <= 3 ? 'M' : best)}</div><div class="lbl">Best level</div></div>
        <div class="stat-box"><div class="num">${avg}</div><div class="lbl">Avg level (last 10)</div></div>
        <div class="stat-box"><div class="num">${tasksTried}/8</div><div class="lbl">Task types tried</div></div>
      </div>

      <h2 class="section-title">🎯 Practice by task</h2>
      <div class="task-grid">
        ${DATA.tasks.map((t, i) => {
      const b = bestLevelForTask(t.taskNumber);
      return `<div class="task-card">
            <div class="t-num">${t.taskNumber}</div>
            <h3>${esc(t.title)}</h3>
            <div class="t-meta"><span>🕐 Prep ${t.prepSeconds}s</span><span>🎙️ Speak ${t.speakSeconds}s</span></div>
            <div class="t-foot">
              <span class="best-chip ${b ? (b >= 10 ? 'pill pill-green' : 'pill pill-yellow') : 'muted'}">${b ? 'Best: ' + (b <= 3 ? 'M' : b) : 'Not tried yet'}</span>
              <button class="btn btn-blue btn-sm" data-practice="${i}">Practice</button>
            </div>
          </div>`;
    }).join('')}
      </div>

      <h2 class="section-title">🕓 Recent sessions</h2>
      <div class="card">
        ${recent.length ? `<table class="history-table">
          <thead><tr><th>Date</th><th>Task</th><th>Question</th><th>Level</th><th>Pace</th><th></th></tr></thead>
          <tbody>${recent.map((e, i) => historyRow(e, i)).join('')}</tbody>
        </table>` : `<div class="empty-note">No practice sessions yet — hit “Start Full Mock Test” or pick a task above. Your target: Level 10+ on every task. 💪</div>`}
      </div>
    </div>`;

    $('#btn-mock').onclick = () => startPractice('mock', 0, nextMockSet());
    $('#btn-demo').onclick = showDemoReport;
    $('#btn-drills').onclick = () => { setNav('drills'); window.CelpipDrills.renderHome(); };
    $$('[data-practice]').forEach(b => b.onclick = () => startPractice('single', +b.dataset.practice, Math.floor(Math.random() * 5)));
    bindHistoryRows();
  }

  function historyRow(e, i) {
    const t = taskByNumber(e.taskNumber);
    const lvl = e.result.level;
    const cls = e.result.levelNum >= 10 ? 'lb-gold' : e.result.levelNum >= 8 ? 'lb-silver' : e.result.levelNum >= 6 ? 'lb-bronze' : 'lb-none';
    return `<tr>
      <td>${new Date(e.ts).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} ${new Date(e.ts).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}</td>
      <td>Task ${e.taskNumber} · ${esc(t ? t.title : '')}${e.noiseLevel && e.noiseLevel !== 'quiet' ? ` <span title="Test-centre noise: ${NOISE_LABELS[e.noiseLevel]}">🎧</span>` : ''}</td>
      <td class="muted">${esc((e.promptText || '').slice(0, 60))}${(e.promptText || '').length > 60 ? '…' : ''}</td>
      <td><span class="level-badge ${cls}">${lvl}</span></td>
      <td>${e.result.metrics.pace.value} wpm</td>
      <td><button class="link-more" data-report="${e.id}">View report →</button></td>
    </tr>`;
  }
  function bindHistoryRows() {
    $$('[data-report]').forEach(b => b.onclick = () => {
      const e = loadHistory().find(x => x.id === b.dataset.report);
      if (!e) return;
      const task = taskByNumber(e.taskNumber);
      const prompt = task.prompts.find(p => p.id === e.promptId) || task.prompts[0];
      const ctx = { result: e.result, task, prompt, transcript: e.transcript, blobUrl: null, fromHistory: true, noiseLevel: e.noiseLevel };
      renderFeedback(ctx);
      loadRecording(e.id).then(rec => {
        if (!rec || fb !== ctx) return; // user navigated away meanwhile
        ctx.blobUrl = URL.createObjectURL(rec.blob);
        ctx.blobIsVideo = rec.isVideo;
        const slot = $('#fb-media-slot');
        if (slot) slot.innerHTML = rec.isVideo
          ? `<video src="${ctx.blobUrl}" controls playsinline></video>`
          : `<audio src="${ctx.blobUrl}" controls></audio>`;
      });
    });
  }

  function showDemoReport() {
    const task = taskByNumber(1), prompt = task.prompts[0];
    const demo = A.analyze({ transcript: prompt.modelAnswer, durationSec: task.speakSeconds * 0.94, task, prompt, volumeSamples: null });
    renderFeedback({ result: demo, task, prompt, transcript: prompt.modelAnswer, blobUrl: null, isDemo: true });
    toast('This sample report analyzes the Level 10+ model answer for Task 1.');
  }

  /* ================= PROGRESS ================= */
  function renderProgress() {
    leaveMediaViews(); releaseStream(); setNav('progress');
    const hist = loadHistory().slice().reverse(); // oldest first
    const pts = hist.map(e => e.result.levelNum);
    app.innerHTML = `
    <div class="container">
      <h2 class="section-title">📈 Level over time</h2>
      <div class="card chart-wrap">${pts.length >= 2 ? progressChart(pts) : '<div class="empty-note">Record at least two answers to see your trend line.</div>'}</div>
      <h2 class="section-title">🗂️ All attempts</h2>
      <div class="card">
        ${hist.length ? `<table class="history-table">
          <thead><tr><th>Date</th><th>Task</th><th>Question</th><th>Level</th><th>Pace</th><th></th></tr></thead>
          <tbody>${hist.slice().reverse().map((e, i) => historyRow(e, i)).join('')}</tbody></table>`
        : '<div class="empty-note">Nothing here yet — go practice!</div>'}
      </div>
    </div>`;
    bindHistoryRows();
  }

  function progressChart(pts) {
    const W = 1080, H = 260, padL = 40, padB = 30, padT = 16;
    const x = (i) => padL + (W - padL - 20) * (pts.length === 1 ? 0.5 : i / (pts.length - 1));
    const y = (v) => padT + (H - padT - padB) * (1 - (v - 3) / 9);
    const line = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const grid = [4, 6, 8, 10, 12].map(v =>
      `<line x1="${padL}" y1="${y(v)}" x2="${W - 14}" y2="${y(v)}" stroke="#e6e9f2" stroke-width="1"/>
       <text x="${padL - 10}" y="${y(v) + 4}" font-size="12" fill="#5a6486" text-anchor="end" font-weight="700">${v}</text>`).join('');
    const target = `<line x1="${padL}" y1="${y(10)}" x2="${W - 14}" y2="${y(10)}" stroke="#13a05c" stroke-width="2" stroke-dasharray="6 5"/>
      <text x="${W - 16}" y="${y(10) - 7}" font-size="12" fill="#13a05c" text-anchor="end" font-weight="800">TARGET 10</text>`;
    const dots = pts.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="5" fill="${v >= 10 ? '#13a05c' : '#7b5be8'}"/>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-height:280px">${grid}${target}
      <path d="${line}" fill="none" stroke="#7b5be8" stroke-width="3" stroke-linejoin="round"/>${dots}</svg>`;
  }

  /* ================= PRACTICE ================= */
  let session = null;

  function startPractice(mode, taskIdx, setIdx) {
    leaveMediaViews();
    session = {
      mode, setIdx: setIdx || 0,
      order: mode === 'mock' ? DATA.tasks.map((_, i) => i) : [taskIdx],
      pos: 0, stage: 'intro', done: {},
    };
    setNav(mode === 'mock' ? 'mock' : 'dashboard');
    renderPractice();
  }

  const curTask = () => DATA.tasks[session.order[session.pos]];
  const curPrompt = () => promptOf(curTask(), session.setIdx);

  function renderPractice() {
    clearTimers();
    const task = curTask(), prompt = curPrompt();
    const stepLabel = session.mode === 'mock' ? `Step ${session.pos + 1} of 8` : `Question ${(session.setIdx % 5) + 1} of 5`;
    const doneCount = Object.keys(session.done).length;

    app.innerHTML = `
    <div class="practice-layout">
      <aside class="p-sidebar">
        <div class="p-side-head">
          <a href="#" class="p-back" id="p-back">← Back to dashboard</a>
          <svg class="p-progress-ring" width="86" height="86" viewBox="0 0 86 86">
            <circle cx="43" cy="43" r="36" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="7"/>
            <circle cx="43" cy="43" r="36" fill="none" stroke="#5fe39a" stroke-width="7" stroke-linecap="round"
              stroke-dasharray="${2 * Math.PI * 36}" stroke-dashoffset="${2 * Math.PI * 36 * (1 - doneCount / session.order.length)}"
              transform="rotate(-90 43 43)"/>
            <text x="43" y="49" text-anchor="middle" fill="#fff" font-size="19" font-weight="800">${doneCount}/${session.order.length}</text>
          </svg>
          <div class="p-side-title">${session.mode === 'mock' ? 'CELPIP Mock Test' : 'Task Practice'}</div>
        </div>
        <ul class="p-tasklist">
          ${session.order.map((ti, i) => {
      const t = DATA.tasks[ti];
      const done = session.done[t.taskNumber];
      return `<li class="p-taskitem ${i === session.pos ? 'active' : ''}" data-jump="${i}">
              <span class="st-icon ${done ? 'st-done' : 'st-todo'}">${done ? '✓' : ''}</span>
              <span>${t.taskNumber}. ${esc(t.title)}</span>
              ${done ? `<span class="ai-chip">AI ${done.result.level}</span>` : ''}
            </li>`;
    }).join('')}
        </ul>
      </aside>
      <div class="p-main"><div class="p-stage-card" id="stage-card"></div></div>
    </div>`;

    $('#p-back').onclick = (e) => { e.preventDefault(); releaseStream(); renderDashboard(); };
    $$('[data-jump]').forEach(li => li.onclick = () => {
      if (+li.dataset.jump === session.pos) return;
      leaveMediaViews(); session.pos = +li.dataset.jump; session.stage = 'intro'; renderPractice();
    });

    // noise plays only while the clock is running: prep + recording
    // (exception: an intro re-render — e.g. switching question pills — must not cut a running preview)
    if (ambience()) {
      const timed = session.stage === 'prep' || session.stage === 'recording';
      if (timed) ambience().setLevel(noiseLevel());
      else if (!(session.stage === 'intro' && noisePreviewActive)) ambience().setLevel('quiet');
    }

    const stage = { intro: renderIntro, prep: renderPrep, recording: renderRecording, analyzing: renderAnalyzing, nospeech: renderNoSpeech }[session.stage];
    stage($('#stage-card'), task, prompt, stepLabel);
  }

  function promptBlock(task, prompt) {
    const svg = sceneSvgFor(prompt);
    return `
      ${svg ? `<div class="scene-frame">${svg}</div>` : ''}
      <div class="prompt-card">
        <b>${esc(prompt.prompt)}</b>
        ${prompt.context && prompt.context !== prompt.prompt ? `<div class="ctx">${esc(prompt.context)}</div>` : ''}
      </div>`;
  }

  /* ----- stage: intro ----- */
  function renderIntro(card, task, prompt, stepLabel) {
    card.innerHTML = `
      <div class="p-head">
        <h2>Task ${task.taskNumber}: ${esc(task.title)}</h2>
        <span class="step-note">${stepLabel}</span>
      </div>
      <div class="p-task-tag">${esc(task.objective)}</div>
      ${session.mode === 'single' ? `<div class="set-pills">${task.prompts.map((p, i) =>
      `<button class="set-pill ${i === session.setIdx % task.prompts.length ? 'active' : ''}" data-set="${i}">Question ${i + 1}</button>`).join('')}</div>` : ''}
      ${promptBlock(task, prompt)}
      <div class="time-chips">
        <span class="time-chip">🕐 Preparation: <span>${task.prepSeconds}s</span></span>
        <span class="time-chip">🎙️ Speaking: <span>${task.speakSeconds}s</span></span>
        <button class="link-more" id="btn-hear">🔊 Hear the question</button>
      </div>
      ${noiseControl(false)}
      <div class="stage-actions">
        <button class="btn btn-green" id="btn-start">Start preparation (${task.prepSeconds}s)</button>
        <button class="btn btn-grey" id="btn-skip-prep">Skip prep — record now</button>
        <button class="link-more" id="btn-tips">💡 Tips &amp; structure</button>
      </div>
      <div id="tips-area" style="display:none">
        <div class="tips-box">
          <h4>💡 How to score 10+ on this task</h4>
          <ul>${task.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
          <div class="structure-strip">${task.structure.map((s, i) => `<span class="structure-step">${i + 1}. ${esc(s)}</span>`).join('')}</div>
          <div class="phrase-chips">${task.powerPhrases.slice(0, 10).map(p => `<span class="phrase-chip">${esc(p)}</span>`).join('')}</div>
        </div>
      </div>`;
    $('#btn-hear').onclick = () => speak(prompt.prompt);
    bindNoiseControl(false);
    $('#btn-tips').onclick = () => { const a = $('#tips-area'); a.style.display = a.style.display === 'none' ? 'block' : 'none'; };
    // guard: if the user navigates away while the mic-permission prompt is pending,
    // the button is no longer in the DOM — don't resurrect the practice view
    $('#btn-start').onclick = async (e) => { const b = e.currentTarget; await ensureStream(); if (!document.contains(b)) return; session.stage = 'prep'; renderPractice(); };
    $('#btn-skip-prep').onclick = async (e) => { const b = e.currentTarget; await ensureStream(); if (!document.contains(b)) return; session.stage = 'recording'; renderPractice(); };
    $$('[data-set]').forEach(b => b.onclick = () => { session.setIdx = +b.dataset.set; renderPractice(); });
  }

  /* ----- stage: prep ----- */
  function renderPrep(card, task, prompt, stepLabel) {
    card.innerHTML = `
      <div class="p-head"><h2>Task ${task.taskNumber}: ${esc(task.title)}</h2><span class="step-note">${stepLabel}</span></div>
      ${promptBlock(task, prompt)}
      <div class="timer-wrap">
        ${ringSVG('prep-ring', 170)}
        <div class="timer-num" id="prep-num" style="margin-top:-118px">${task.prepSeconds}</div>
        <div style="height:52px"></div>
        <div class="timer-label">Preparation time — plan your answer</div>
        <div class="structure-strip">${task.structure.map((s, i) => `<span class="structure-step">${i + 1}. ${esc(s)}</span>`).join('')}</div>
      </div>
      <div class="stage-actions" style="justify-content:center">
        <button class="btn btn-green" id="btn-record-now">🎙️ I'm ready — start speaking</button>
      </div>
      ${noiseControl(true)}`;
    bindNoiseControl(true);
    const cancel = countdown(task.prepSeconds, (r) => {
      const n = $('#prep-num'); if (n) n.textContent = r;
      setRing('prep-ring', r, task.prepSeconds);
      if (r === 5) beep(660, 120);
    }, () => { beep(880, 250); session.stage = 'recording'; renderPractice(); });
    $('#btn-record-now').onclick = () => { cancel(); session.stage = 'recording'; renderPractice(); };
  }

  /* ----- stage: recording ----- */
  function renderRecording(card, task, prompt, stepLabel) {
    card.innerHTML = `
      <div class="p-head"><h2>Task ${task.taskNumber}: ${esc(task.title)}</h2><span class="step-note">${stepLabel}</span></div>
      <div class="prompt-card" style="padding:12px 16px;font-size:.95rem"><b>${esc(prompt.prompt)}</b></div>
      <div class="rec-grid">
        <div class="rec-left">
          <div class="video-box">
            <video id="preview" autoplay muted playsinline></video>
            ${!media.stream || !media.blobIsVideo ? `<div class="audio-only-note"><span class="mic-ico">🎙️</span>${media.stream ? 'Audio-only recording' : 'No microphone — speak out loud anyway!'}</div>` : ''}
            <span class="rec-dot"><i></i> REC</span>
          </div>
          <div class="vu-bar"><i id="vu-fill"></i></div>
          ${media.srSupported ? `<div class="lt-label">Live transcript</div><div class="live-transcript" id="live-transcript"><span class="interim">Listening…</span></div>`
        : `<div class="no-sr-warn">⚠️ Live speech-to-text isn't supported in this browser — use <b>Google Chrome</b> for automatic transcription, or type your answer afterwards.</div>`}
        </div>
        <div>
          <div class="timer-wrap" style="padding-top:6px">
            ${ringSVG('rec-ring', 150)}
            <div class="timer-num" id="rec-num" style="margin-top:-106px;font-size:2rem">${fmtTime(task.speakSeconds)}</div>
            <div style="height:44px"></div>
            <div class="timer-label">Recording time left</div>
          </div>
          <div class="stage-actions" style="justify-content:center">
            <button class="btn btn-red" id="btn-stop">⏹ Stop recording</button>
          </div>
          ${noiseControl(true)}
        </div>
      </div>`;
    $('#rec-ring').classList.add('rec');
    bindNoiseControl(true);

    if (media.stream && media.blobIsVideo) $('#preview').srcObject = media.stream;

    startRecordingMedia(() => {
      const lt = $('#live-transcript');
      if (lt) {
        lt.innerHTML = esc(media.transcript) + `<span class="interim">${esc(media.interim)}</span>`;
        lt.scrollTop = lt.scrollHeight;
      }
    });

    let stopped = false;
    const finish = async () => {
      if (stopped) return; stopped = true;
      cancel();
      beep(520, 300);
      await stopRecordingMedia();
      session.stage = 'analyzing';
      renderPractice();
    };
    const cancel = countdown(task.speakSeconds, (r) => {
      const n = $('#rec-num'); if (n) n.textContent = fmtTime(r);
      setRing('rec-ring', r, task.speakSeconds);
      if (r === 10) beep(660, 120);
    }, finish);
    $('#btn-stop').onclick = finish;
  }

  /* ----- stage: analyzing (feedback starts automatically after recording) ----- */
  function renderAnalyzing(card, task, prompt, stepLabel) {
    card.innerHTML = `
      <div class="p-head"><h2>Task ${task.taskNumber}: ${esc(task.title)} <span style="color:var(--green)">✓</span></h2><span class="step-note">${stepLabel}</span></div>
      <div class="p-task-tag">Recorded ${fmtTime(media.durationSec)} of ${fmtTime(task.speakSeconds)}</div>
      <div class="analyzing-wrap">
        <div class="spinner"></div>
        <h3 style="font-size:1.35rem">A.I. Feedback in progress…</h3>
        <p class="muted" style="max-width:480px;text-align:center">Evaluating your recording against the CELPIP criteria: Content &amp; Coherence, Vocabulary, Listenability, and Task Fulfillment.</p>
      </div>`;
    const stamp = (session.analyzeStamp = (session.analyzeStamp || 0) + 1);
    // brief hold lets the speech recognizer flush its final results before scoring
    const tid = setTimeout(() => {
      if (!session || session.stage !== 'analyzing' || session.analyzeStamp !== stamp) return;
      const transcript = media.transcript.trim();
      if (!transcript) { session.stage = 'nospeech'; renderPractice(); return; }
      generateFeedback(task, prompt, transcript);
    }, 1700);
    activeTimers.push(tid);
  }

  function generateFeedback(task, prompt, transcript) {
    const durationSec = Math.max(media.durationSec, 5);
    const result = A.analyze({ transcript, durationSec, task, prompt, volumeSamples: media.volumeSamples.length ? media.volumeSamples : null });
    const entry = {
      id: 'a' + Date.now(), ts: Date.now(), mode: session.mode, taskNumber: task.taskNumber,
      promptId: prompt.id, promptText: prompt.prompt, setIdx: session.setIdx, transcript, result,
      noiseLevel: noiseLevel(),
    };
    saveAttempt(entry);
    if (media.lastBlob) saveRecording(entry.id, media.lastBlob, media.blobIsVideo);
    session.done[task.taskNumber] = { result };
    session.stage = 'intro'; // so "Back to practice" lands on the task screen, not a re-run of the analysis
    renderFeedback({ result, task, prompt, transcript, blobUrl: media.blobUrl, blobIsVideo: media.blobIsVideo, inSession: true, noiseLevel: entry.noiseLevel });
  }

  /* ----- stage: no speech detected ----- */
  function renderNoSpeech(card, task, prompt, stepLabel) {
    card.innerHTML = `
      <div class="p-head"><h2>Task ${task.taskNumber}: ${esc(task.title)}</h2><span class="step-note">${stepLabel}</span></div>
      <div class="analyzing-wrap">
        <div style="font-size:3rem">🎤</div>
        <h3 style="font-size:1.35rem">We couldn't detect any speech in that recording</h3>
        <p class="muted" style="max-width:520px;text-align:center">
          ${media.srSupported
        ? 'Check that your microphone is allowed and working, speak clearly toward it, and record again.'
        : 'This browser has no speech recognition, so the AI cannot evaluate your recording — please open the app in <b>Google Chrome</b> or <b>Edge</b>.'}
        </p>
        ${media.blobUrl ? (media.blobIsVideo
        ? `<video src="${media.blobUrl}" controls playsinline style="max-width:420px;width:100%;border-radius:12px"></video>`
        : `<audio src="${media.blobUrl}" controls></audio>`) : ''}
      </div>
      <div class="stage-actions" style="justify-content:center">
        <button class="btn btn-green" id="btn-rerecord">🔁 Re-record</button>
        ${session.mode === 'mock' && session.pos < session.order.length - 1 ? `<button class="btn btn-grey" id="btn-skip">Skip to next task →</button>` : ''}
      </div>`;
    $('#btn-rerecord').onclick = () => { session.stage = 'prep'; renderPractice(); };
    const skip = $('#btn-skip');
    if (skip) skip.onclick = () => { session.pos++; session.stage = 'intro'; renderPractice(); };
  }

  /* ================= FEEDBACK ================= */
  let fb = null; // current feedback context

  function renderFeedback(ctx) {
    leaveMediaViews();
    fb = ctx; fb.tab = 'feedback';
    const { result, task, prompt } = ctx;
    const lvl = result.level, num = result.levelNum;
    const medal = num >= 10 ? ['GOLD', 'linear-gradient(135deg,#f6c343,#dd8f0a)', '#fdf3d1;color:#8a6d00'] :
      num >= 8 ? ['SILVER', 'linear-gradient(135deg,#9fb0c3,#67788e)', '#eef1f6;color:#4c5a6e'] :
        num >= 6 ? ['BRONZE', 'linear-gradient(135deg,#d29a71,#a05f33)', '#f7e8dd;color:#7c4a24'] :
          ['KEEP GOING', 'linear-gradient(135deg,#8b93b8,#5d6488)', '#e9ebf5;color:#4a5273'];
    const noisy = ctx.noiseLevel && ctx.noiseLevel !== 'quiet';
    const blurb = num >= 10
      ? `According to our AI, you hit your target — this answer performs at <b>CELPIP Level ${lvl}</b>.${noisy ? ` And you did it with <b>${NOISE_LABELS[ctx.noiseLevel]}</b> noise in your ears — the real test centre will feel familiar.` : ' Review the breakdown to keep it consistent across every task.'}`
      : num >= 8 ? `Solid answer at an estimated <b>Level ${lvl}</b> — you're close to your 10+ target. The Action Plan shows exactly which two or three metrics to fix first.`
        : `This answer lands around <b>Level ${lvl}</b>. Don't worry — the Action Plan pinpoints what's holding the score down, and the Model Answer tab shows what 10+ sounds like.`;

    app.innerHTML = `
    <div class="container">
      <div class="fb-head">
        <div class="fb-head-left">
          <a href="#" class="fb-back" id="fb-back">← ${ctx.inSession ? 'Back to practice' : 'Go back'}</a>
          <h1>${esc(prompt.prompt.length > 140 ? prompt.prompt.slice(0, 140) + '…' : prompt.prompt)}</h1>
          <div class="fb-sub">Task ${task.taskNumber}: ${esc(task.title)} ${ctx.isDemo ? '· <span class="pill pill-violet">SAMPLE REPORT</span>' : ''} ${noisy ? `· <span class="pill pill-violet">🎧 ${NOISE_LABELS[ctx.noiseLevel]} noise</span>` : ''}</div>
          <div class="fb-badge-row">
            <div class="medal">
              <div class="medal-circle" style="background:${medal[1]}">${lvl}</div>
              <span class="medal-label" style="background:${medal[2].split(';')[0]};${medal[2].split(';')[1] || ''}">${medal[0]}</span>
            </div>
            <p class="fb-blurb">${blurb}<br><span class="muted" style="font-size:.85rem">Estimated level: <b>${lvl}</b>${levelInfo(lvl).label ? ' (' + esc(levelInfo(lvl).label) + ')' : ''} · Target: <b>10+</b> · Heuristic practice estimate — not an official CELPIP score.</span></p>
          </div>
        </div>
        <div class="fb-video">
          <div id="fb-media-slot">${ctx.blobUrl ? ((ctx.blobIsVideo ?? media.blobIsVideo) ? `<video src="${ctx.blobUrl}" controls playsinline></video>` : `<audio src="${ctx.blobUrl}" controls></audio>`) : ''}</div>
          ${ctx.inSession && session && session.mode === 'mock' && session.pos < session.order.length - 1
        ? `<button class="btn btn-green" id="fb-next">Next question →</button>` : ''}
          <button class="btn ${ctx.inSession ? 'btn-outline' : 'btn-green'}" id="fb-again">⟳ Record Again</button>
          ${ctx.inSession ? `<div class="muted" style="font-size:.8rem;text-align:center;margin-top:10px">💾 Report and recording saved — find them under <b>My Progress</b>.</div>` : ''}
        </div>
      </div>

      <div class="fb-tabs">
        <button class="fb-tab active" data-tab="feedback">A.I. Feedback</button>
        <button class="fb-tab" data-tab="plan">Action Plan</button>
        <button class="fb-tab" data-tab="model">Model Answer</button>
      </div>
      <div id="fb-body"></div>
    </div>`;

    $('#fb-back').onclick = (e) => { e.preventDefault(); ctx.inSession ? renderPractice() : renderDashboard(); };
    $('#fb-again').onclick = () => {
      const ti = DATA.tasks.indexOf(task);
      if (ctx.inSession && session) { session.stage = 'prep'; renderPractice(); }
      else startPractice('single', ti, task.prompts.indexOf(prompt));
    };
    const nx = $('#fb-next');
    if (nx) nx.onclick = () => { session.pos++; session.stage = 'intro'; renderPractice(); };
    $$('.fb-tab').forEach(b => b.onclick = () => {
      $$('.fb-tab').forEach(x => x.classList.toggle('active', x === b));
      fb.tab = b.dataset.tab; renderFbBody();
    });
    renderFbBody();
  }

  function renderFbBody() {
    const body = $('#fb-body');
    if (fb.tab === 'feedback') body.innerHTML = metricGrid(fb.result);
    else if (fb.tab === 'plan') body.innerHTML = actionPlan(fb.result);
    else body.innerHTML = modelAnswerTab(fb);
    bindFbBody();
  }

  const STATUS_COLOR = { good: 'var(--green)', warn: 'var(--yellow)', bad: 'var(--red)' };
  const statusIcon = (s) => s === 'good' ? '✓' : '!';

  /* ----- metric cards ----- */
  function metricGrid(r) {
    const m = r.metrics;
    const cards = [
      card('overall', 'Overall Performance', `
        <div class="big-circle bc-fill-green" style="background:${r.passed ? 'var(--green)' : r.levelNum >= 8 ? 'var(--yellow)' : 'var(--red)'}">${r.level}</div>
        <div class="mc-caption">${r.passed ? 'TARGET REACHED' : 'ESTIMATED CELPIP LEVEL'}</div>`,
        r.passed ? `You performed at your target level. Keep this consistency across all 8 tasks.`
          : `You need ${10 - r.levelNum} more level${10 - r.levelNum > 1 ? 's' : ''} to reach your target of 10. Focus on the red and yellow cards first.`),

      card('taskFulfillment', 'Task Fulfillment', `
        <div class="big-circle bc-outline-${m.taskFulfillment.status === 'good' ? 'green' : m.taskFulfillment.status === 'warn' ? 'yellow' : 'red'}">${m.taskFulfillment.value}</div>
        <div class="mc-caption">Topic coverage</div>`,
        m.taskFulfillment.status === 'good' ? 'You addressed the question with relevant, on-topic detail.'
          : `Your answer only partially covered the topic. Expected ideas you didn't mention: <i>${m.taskFulfillment.missedKeywords.slice(0, 4).join(', ')}</i>.`),

      card('pace', 'Pace of Speech', gaugeSVG(m.pace.value, 60, 220, 105, 165) + `<div class="mc-caption">${m.pace.value} words / min</div>`,
        m.pace.status === 'good' ? `Your rate of ${m.pace.value} wpm falls within the natural, engaging range (100–165).`
          : m.pace.value < 100 ? `At ${m.pace.value} wpm you're speaking slowly — likely long thinking gaps. Practice with the prep-time structure.`
            : `At ${m.pace.value} wpm you're rushing. Slow down — clarity beats speed on Listenability.`),

      card('um', 'Um Counter', `
        <div class="big-circle bc-outline-${m.um.status === 'good' ? 'green' : m.um.status === 'warn' ? 'yellow' : 'red'}">${m.um.value}</div>
        <div class="mc-caption">Disfluencies / 100 words</div>`,
        m.um.status === 'good' ? `Excellent — only ${m.um.count} um/uh in the whole answer.`
          : `You used ${m.um.count} um/uh sounds. Replace them with silent micro-pauses — silence sounds more confident.`),

      card('vocabulary', 'Vocabulary', vocabSlider(m.vocabulary.position),
        m.vocabulary.status === 'good' ? 'You strike a good balance between smart and accessible language.'
          : m.vocabulary.position < 40 ? 'Your word choice is on the simple side. Work in more precise nouns and varied verbs.'
            : 'Careful — overly complex wording can hurt Listenability. Aim for smart but natural.'),

      card('connectors', 'Power Connectors', `
        <div class="big-circle bc-outline-${m.connectors.status === 'good' ? 'green' : m.connectors.status === 'warn' ? 'yellow' : 'red'}">${m.connectors.variety}</div>
        <div class="mc-caption">Distinct transitions used</div>`,
        m.connectors.variety ? `You used: ${m.connectors.used.slice(0, 5).map(c => `“${c}”`).join(', ')}${m.connectors.used.length > 5 ? '…' : ''}. ${m.connectors.status === 'good' ? 'Great variety!' : 'Aim for 5+ distinct transitions.'}`
          : 'No transition phrases detected — connectors are the fastest way to raise Content &amp; Coherence.'),

      card('filler', 'Filler Words', `
        <div class="big-circle bc-outline-${m.filler.status === 'good' ? 'green' : m.filler.status === 'warn' ? 'yellow' : 'red'}">${m.filler.value}</div>
        <div class="mc-caption">Filler words / 100 words</div>`,
        m.filler.status === 'good' ? 'Clean delivery — almost no “like / you know / basically”.'
          : `${m.filler.count} filler words detected. Swap them for connectors like “moreover” or a brief pause.`),

      card('pauses', 'Pause Counter', `
        <div class="big-circle bc-outline-${m.pauses.status === 'good' ? 'green' : m.pauses.status === 'warn' ? 'yellow' : 'red'}">${m.pauses.count}</div>
        <div class="mc-caption">Long pauses (&gt;1.5s)</div>`,
        m.pauses.status === 'good' ? 'Your pauses sound natural and conversational.'
          : 'Several long silences detected — use your prep time to outline 2 points + a conclusion so you never stall.'),

      card('coherence', 'Structure & Coherence', `
        <div class="big-circle bc-outline-${m.coherence.status === 'good' ? 'green' : m.coherence.status === 'warn' ? 'yellow' : 'red'}">${m.coherence.score}</div>
        <div class="mc-caption">Structure score</div>`,
        `${m.coherence.hasOpening ? '✓ Clear opening.' : '✗ No clear opening.'} ${m.coherence.hasClosing ? '✓ Clear conclusion.' : '✗ Missing a concluding sentence.'} ${m.coherence.seqCount >= 2 ? `✓ ${m.coherence.seqCount} sequence markers.` : '✗ Add “firstly / on top of that / finally”.'}`),

      card('length', 'Length', `
        <div class="big-circle" style="background:${STATUS_COLOR[m.length.status]};color:#fff;font-size:1.5rem">${fmtTime(r.durationSec)}</div>
        <div class="mc-caption">${m.length.usedPct}% of allowed time</div>`,
        m.length.status === 'good' ? 'Nice job finding the sweet spot — you used your speaking time well.'
          : m.length.usedPct < 75 ? `You only used ${m.length.usedPct}% of your time. Under-length answers cap Task Fulfillment — add one more supporting detail.`
            : 'You ran out of time — plan a shorter middle so your conclusion fits.'),

      card('negativeTone', 'Negative Tone', `
        <div class="big-circle bc-outline-${m.negativeTone.status === 'good' ? 'green' : m.negativeTone.status === 'warn' ? 'yellow' : 'red'}">${m.negativeTone.count}</div>
        <div class="mc-caption">Negative expressions</div>`,
        m.negativeTone.count === 0 ? "Positively positive! We didn't flag any negative terms in your answer."
          : 'Negative wording detected — CELPIP raters reward constructive framing: pair every problem with a solution.'),

      card('volume', 'Volume', `
        <div class="big-circle" style="background:${m.volume.level === 'unknown' ? '#c3c9da' : STATUS_COLOR[m.volume.status]};color:#fff;font-size:1.8rem">🔊</div>
        <div class="mc-caption">${m.volume.level === 'unknown' ? 'Not measured' : 'Level: ' + m.volume.level}</div>`,
        m.volume.level === 'unknown' ? 'Volume is measured from your microphone during recording.'
          : m.volume.status === 'good' ? 'Your volume level is good — clear and steady into the microphone.'
            : 'Your voice came through quietly — sit closer to the mic and project a little more.'),
    ];
    return `<div class="metric-grid">${cards.join('')}</div>`;
  }

  function card(key, title, visual, text) {
    const status = key === 'overall' ? (fb.result.passed ? 'good' : fb.result.levelNum >= 8 ? 'warn' : 'bad') : (fb.result.metrics[key] || {}).status || 'good';
    return `<div class="metric-card">
      <div class="mc-title">${title}</div>
      <div class="mc-visual">${visual}</div>
      <div class="mc-text">${text}</div>
      <div class="mc-foot"><button class="link-more" data-learn="${key}">${status === 'good' ? 'Learn More' : 'Improve Now'} →</button></div>
    </div>`;
  }

  function gaugeSVG(value, min, max, lo, hi) {
    const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const ang = Math.PI * (1 - pct);
    const cx = 70, cy = 66, R = 52;
    const nx = cx + R * 0.72 * Math.cos(ang), ny = cy - R * 0.72 * Math.sin(ang);
    const arc = (a1, a2, color) => {
      const x1 = cx + R * Math.cos(Math.PI * (1 - a1)), y1 = cy - R * Math.sin(Math.PI * (1 - a1));
      const x2 = cx + R * Math.cos(Math.PI * (1 - a2)), y2 = cy - R * Math.sin(Math.PI * (1 - a2));
      return `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 0 1 ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round"/>`;
    };
    const p = (v) => (v - min) / (max - min);
    return `<svg class="gauge-svg" width="140" height="84" viewBox="0 0 140 84">
      ${arc(0.02, p(lo), '#eab308')}${arc(p(lo), p(hi), '#13a05c')}${arc(p(hi), 0.98, '#e02d3c')}
      <circle cx="${cx}" cy="${cy}" r="5" fill="#263159"/>
      <line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="#263159" stroke-width="3.5" stroke-linecap="round"/>
      <text x="8" y="80" font-size="10" fill="#5a6486" font-weight="700">LOW</text>
      <text x="112" y="80" font-size="10" fill="#5a6486" font-weight="700">HIGH</text>
    </svg>`;
  }

  function vocabSlider(pos) {
    return `<div class="slider-scale">
      <div class="slider-track"><div class="slider-fill" style="height:${pos}%"></div></div>
      <div class="slider-labels"><span>Sophisticated</span><span class="slider-current">${pos >= 32 && pos <= 85 ? 'Smart<br>Accessible<br>Language' : pos > 85 ? 'Very<br>Complex' : 'Simple'}</span><span>Simple</span></div>
    </div>`;
  }

  /* ----- action plan ----- */
  const AP_KEYS = ['overall', 'taskFulfillment', 'coherence', 'pace', 'um', 'filler', 'vocabulary', 'connectors', 'pauses', 'length', 'negativeTone', 'volume'];

  function actionPlan(r, activeKey) {
    fb.apKey = activeKey || fb.apKey || 'overall';
    const items = AP_KEYS.map(k => {
      const st = k === 'overall' ? (r.passed ? 'good' : 'warn') : (r.metrics[k] || {}).status || 'good';
      const g = guideFor(k);
      return `<div class="ap-item ${k === fb.apKey ? 'active' : ''}" data-ap="${k}">
        <span>${esc(g.title)}</span>
        <span class="ap-status ${st === 'good' ? 'aps-good' : 'aps-warn'}">${st === 'good' ? '✓' : '!'}</span>
      </div>`;
    }).join('');
    return `<div class="ap-layout">
      <div class="ap-sidebar">${items}</div>
      <div class="ap-panel">${apPanel(r, fb.apKey)}</div>
    </div>`;
  }

  function apPanel(r, key) {
    const g = guideFor(key);
    if (key === 'overall') {
      const dims = DATA.rubric.dimensions;
      const worst = AP_KEYS.slice(1).map(k => ({ k, m: r.metrics[k] })).filter(x => x.m && x.m.status !== 'good')
        .sort((a, b) => a.m.score - b.m.score).slice(0, 3);
      return `<h2>Overall Performance</h2>
        <div class="fb-badge-row" style="margin-top:0">
          <div class="medal"><div class="medal-circle" style="background:${r.passed ? 'linear-gradient(135deg,#f6c343,#dd8f0a)' : 'linear-gradient(135deg,#9fb0c3,#67788e)'}">${r.level}</div>
          <span class="medal-label" style="background:#eef1f6">${r.passed ? 'PASSED' : 'IN PROGRESS'}</span></div>
          <p class="fb-blurb">${esc(levelInfo(r.level).descriptor)}</p>
        </div>
        ${dims.map(d => {
        const score = r.dim[d.key] ?? 0;
        const good = score >= 75;
        return `<div class="ap-block ${good ? 'good' : 'warn'}">
            <h4>${good ? '🏅' : '🎯'} ${esc(d.name)} — ${score}/100</h4>
            <p>${esc(d.description)}</p>
            ${good ? '' : `<ul>${d.tipsForTen.slice(0, 3).map(t => `<li>${esc(t)}</li>`).join('')}</ul>`}
          </div>`;
      }).join('')}
        ${worst.length ? `<div class="ap-block warn"><h4>🔥 Fix these first</h4><ul>
          ${worst.map(x => `<li><b>${esc(guideFor(x.k).title)}</b> — ${esc(guideFor(x.k).target)}</li>`).join('')}
        </ul></div>` : `<div class="ap-block good"><h4>🏅 All metrics green</h4><p>Now make it consistent: repeat this performance on a different question set and under full mock-test pressure.</p></div>`}`;
    }
    const m = r.metrics[key];
    const good = m.status === 'good';
    const evidence = {
      taskFulfillment: `You covered ${m.value || ''} of the expected topic ideas.${m.missedKeywords && m.missedKeywords.length ? ' Not mentioned: ' + m.missedKeywords.slice(0, 5).join(', ') + '.' : ''}`,
      coherence: `${m.hasOpening ? 'Clear opening detected. ' : 'No recognizable opening line. '}${m.hasClosing ? 'Clear conclusion detected. ' : 'No concluding sentence detected. '}${m.seqCount} sequence markers used.`,
      pace: `You spoke at ${m.value} words per minute.`,
      um: `${m.count} um/uh disfluencies (${m.value} per 100 words).`,
      filler: `${m.count} filler words (${m.value} per 100 words).`,
      vocabulary: `Your vocabulary register sits at ${m.position}/100 on the simple→sophisticated scale.`,
      connectors: `${m.variety} distinct transition phrases detected${m.used && m.used.length ? ': ' + m.used.slice(0, 6).join(', ') : ''}.`,
      pauses: `${m.count} long pauses (over 1.5 seconds) detected.`,
      length: `You used ${m.usedPct}% of the allowed speaking time (${m.words} words).`,
      negativeTone: `${m.count} negative expressions detected.`,
      volume: m.level === 'unknown' ? 'Volume was not measured (no microphone data).' : `Microphone level: ${m.level}.`,
    }[key] || '';
    return `<h2>${esc(g.title)}</h2>
      <span class="m-target" style="display:inline-block;background:#e4edfd;color:var(--blue);font-weight:800;border-radius:8px;padding:5px 12px;margin-bottom:14px">🎯 Target: ${esc(g.target)}</span>
      <div class="ap-block ${good ? 'good' : 'warn'}">
        <h4>${good ? '💪 Strengths' : '📊 What we measured'}</h4>
        <p>${esc(evidence)}</p>
        <p>${esc(g.why)}</p>
      </div>
      ${good ? `<div class="ap-block good"><h4>✅ Keep doing this</h4><ul>${g.improveTips.slice(0, 2).map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`
        : `<div class="ap-block warn"><h4>🔧 Improvements</h4><ul>${g.improveTips.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`}`;
  }

  /* ----- model answer tab ----- */
  function modelAnswerTab(ctx) {
    const { prompt, task, transcript, result } = ctx;
    const hits = (result.metrics.taskFulfillment.hitKeywords || []);
    const highlight = (text) => esc(text).replace(/[A-Za-z][A-Za-z'-]*/g, (w) => {
      const hit = hits.some(k => A.matchesKeyword(w.toLowerCase(), k));
      return hit ? `<span class="kw-hit">${w}</span>` : w;
    });
    return `
      <div class="ma-card">
        <h3>💬 Level 10+ Model Answer <button class="link-more" id="ma-speak">🔊 Listen</button></h3>
        <div class="ma-model">${esc(prompt.modelAnswer)}</div>
        <div class="phrase-chips">${task.powerPhrases.slice(0, 8).map(p => `<span class="phrase-chip">${esc(p)}</span>`).join('')}</div>
        <p class="muted" style="margin-top:12px;font-size:.9rem">💡 ${esc(prompt.proTip || '')}</p>
        <div class="ma-user">
          <span class="ma-label">Your Answer:</span> ${transcript ? highlight(transcript) : '<i>No transcript captured for this attempt.</i>'}
          ${result.metrics.taskFulfillment.missedKeywords.length ? `<p style="margin-top:10px"><b>Ideas the examiners expected that you didn't mention:</b> ${result.metrics.taskFulfillment.missedKeywords.join(', ')}</p>` : ''}
        </div>
      </div>
      <div class="ma-card">
        <h3>🧭 Recommended structure for ${esc(task.title)}</h3>
        <div class="structure-strip">${task.structure.map((s, i) => `<span class="structure-step">${i + 1}. ${esc(s)}</span>`).join('')}</div>
        <ul style="margin-top:14px;padding-left:20px;line-height:1.8">${task.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      </div>`;
  }

  function bindFbBody() {
    $$('[data-learn]').forEach(b => b.onclick = () => {
      const g = guideFor(b.dataset.learn);
      openModal(`<h3>${esc(g.title)}</h3>
        <span class="m-target">🎯 Target: ${esc(g.target)}</span>
        <p>${esc(g.why)}</p>
        <p><b>How to improve:</b></p>
        <ul>${g.improveTips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`);
    });
    $$('[data-ap]').forEach(b => b.onclick = () => {
      fb.apKey = b.dataset.ap;
      $('#fb-body').innerHTML = actionPlan(fb.result, fb.apKey);
      bindFbBody();
    });
    const sp = $('#ma-speak');
    if (sp) sp.onclick = () => speak(fb.prompt.modelAnswer);
  }

  window.__celpipDebug = { media }; // test hook: inject a transcript when no mic is available

  /* ---------- boot ---------- */
  if (!DATA || !DATA.tasks || !DATA.tasks.length) {
    app.innerHTML = '<div class="container"><div class="card empty-note">Content data missing — js/data.js failed to load.</div></div>';
  } else {
    if ('speechSynthesis' in window) speechSynthesis.getVoices();
    renderDashboard();
  }
})();
