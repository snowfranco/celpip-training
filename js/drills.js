/* ============ Pronunciation Drills ============
   Read-aloud scoring: the learner reads a known target, the Web Speech API
   transcribes what it actually heard, and we align the two word-by-word.
   Misheard/missing words = pronunciation gaps. All local, nothing uploaded. */
(function () {
  'use strict';

  const DRILLS = () => window.CELPIP_DRILLS;
  const app = document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const CAT_ICONS = { pairs: '👂', words: '🔤', phrases: '💬', shadow: '🗣️' };

  /* ---------- persistence ---------- */
  const SCORE_KEY = 'celpipTrainer.drillScores.v1';
  const TROUBLE_KEY = 'celpipTrainer.troubleWords.v1';
  const loadJSON = (k) => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } };
  const saveJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  function recordTrouble(word, bad) {
    if (!/^[a-z][a-z'-]+$/.test(word)) return;
    const t = loadJSON(TROUBLE_KEY);
    const e = t[word] || { miss: 0, ts: 0 };
    e.miss += bad ? 1 : -1;
    e.ts = Date.now();
    if (e.miss <= 0) delete t[word]; else t[word] = e;
    saveJSON(TROUBLE_KEY, t);
  }
  const troubleWords = () => Object.entries(loadJSON(TROUBLE_KEY))
    .sort((a, b) => b[1].miss - a[1].miss || b[1].ts - a[1].ts).slice(0, 12).map(([w]) => w);

  /* ---------- text normalization ---------- */
  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const ORDINALS = { '1st': 'first', '2nd': 'second', '3rd': 'third', '4th': 'fourth', '5th': 'fifth', '6th': 'sixth', '7th': 'seventh', '8th': 'eighth', '9th': 'ninth', '10th': 'tenth' };
  function numToWords(n) {
    if (n < 20) return ONES[n];
    if (n < 100) { const t = Math.floor(n / 10), r = n % 10; return r ? TENS[t] + ' ' + ONES[r] : TENS[t]; }
    return String(n);
  }
  function preprocessHeard(text) {
    return text.toLowerCase()
      .replace(/[$%°]/g, ' ')
      .replace(/\b(\d+)(st|nd|rd|th)\b/g, (m) => ORDINALS[m] || m)
      .replace(/\b\d+\b/g, (m) => { const n = parseInt(m, 10); return n <= 99 ? numToWords(n) : m; });
  }

  const HOMOPHONES = [
    ['their', 'there', "they're"], ['to', 'too', 'two'], ['for', 'four', 'fore'], ['one', 'won'],
    ['right', 'write'], ['know', 'no'], ['hear', 'here'], ['by', 'buy', 'bye'], ['weather', 'whether'],
    ['wear', 'where'], ['sea', 'see'], ['son', 'sun'], ['our', 'hour'], ['its', "it's"],
    ['your', "you're"], ['week', 'weak'], ['meet', 'meat'], ['would', 'wood'], ['knew', 'new'],
    ['past', 'passed'], ['brake', 'break'], ['plain', 'plane'], ['whole', 'hole'], ['piece', 'peace'],
    ['allowed', 'aloud'], ['board', 'bored'], ['weight', 'wait'], ['cell', 'sell'], ['flour', 'flower'],
    ['aisle', 'isle', "i'll"], ['ate', 'eight'], ['blue', 'blew'], ['sale', 'sail'], ['made', 'maid'],
  ];
  const HOMO_MAP = {};
  HOMOPHONES.forEach(g => g.forEach(w => HOMO_MAP[w] = g[0]));

  const canon = (w) => {
    const x = w.toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z']/g, '');
    return HOMO_MAP[x] || x;
  };
  function lightStem(w) {
    w = w.replace(/'s$/, '').replace(/'/g, '');
    if (w.length > 4) w = w.replace(/(ing|ed|es|ly)$/, '');
    if (w.length > 3) w = w.replace(/s$/, '');
    if (w.length > 3) w = w.replace(/e$/, '');
    return w;
  }
  const tokenizeTarget = (text) => (text.toLowerCase().replace(/[‘’]/g, "'").match(/[a-z][a-z']*/g)) || [];
  const tokenizeHeard = (text) => (preprocessHeard(text).replace(/[‘’]/g, "'").match(/[a-z][a-z']*/g)) || [];

  /* ---------- word alignment (edit-distance with traceback) ---------- */
  function alignWords(targetTokens, heardTokens) {
    const T = targetTokens.map(canon), H = heardTokens.map(canon);
    const m = T.length, n = H.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    const costOf = (i, j) => {
      if (T[i] === H[j]) return 0;
      return lightStem(T[i]) === lightStem(H[j]) ? 0.4 : 1;
    };
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i][j] = Math.min(dp[i - 1][j - 1] + costOf(i - 1, j - 1), dp[i - 1][j] + 1, dp[i][j - 1] + 1);
    const out = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && Math.abs(dp[i][j] - (dp[i - 1][j - 1] + costOf(i - 1, j - 1))) < 1e-9) {
        const same = T[i - 1] === H[j - 1];
        const close = !same && lightStem(T[i - 1]) === lightStem(H[j - 1]);
        out.unshift({ word: targetTokens[i - 1], status: same ? 'ok' : close ? 'close' : 'sub', heard: heardTokens[j - 1] });
        i--; j--;
      } else if (i > 0 && (j === 0 || Math.abs(dp[i][j] - (dp[i - 1][j] + 1)) < 1e-9)) {
        out.unshift({ word: targetTokens[i - 1], status: 'miss' });
        i--;
      } else j--;
    }
    return out;
  }

  function scoreAttempt(targetText, candidates) {
    const targetTokens = tokenizeTarget(targetText);
    let best = null;
    (candidates.length ? candidates : ['']).forEach(c => {
      const words = alignWords(targetTokens, tokenizeHeard(c));
      const ok = words.filter(w => w.status === 'ok').length;
      const close = words.filter(w => w.status === 'close').length;
      const score = targetTokens.length ? Math.round(100 * (ok + 0.5 * close) / targetTokens.length) : 0;
      if (!best || score > best.score) best = { score, words, heard: c };
    });
    return best;
  }

  /* ---------- speech ---------- */
  function speak(text, rate) {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-CA'; u.rate = rate || 0.95;
      const v = speechSynthesis.getVoices().find(v => /en[-_](CA|US|GB)/i.test(v.lang));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch { }
  }

  const rec = { recog: null, watchdog: null, active: false };
  function stopRecognition() {
    rec.active = false;
    if (rec.watchdog) { clearInterval(rec.watchdog); rec.watchdog = null; }
    if (rec.recog) { try { rec.recog.stop(); } catch { } rec.recog = null; }
  }

  /* Listen for one attempt; resolves {candidates, confidence} */
  function listenOnce({ capMs, onInterim }) {
    return new Promise((resolve) => {
      if (!SR) return resolve(null);
      stopRecognition();
      const r = new SR();
      rec.recog = r; rec.active = true;
      r.continuous = true; r.interimResults = true; r.maxAlternatives = 5; r.lang = 'en-CA';
      const finals = [];        // best transcript per final segment
      const altSets = [];       // alternatives per final segment
      const confs = [];
      let lastActivity = Date.now();
      const started = Date.now();
      let settled = false;

      const finish = () => {
        if (settled) return; settled = true;
        stopRecognition();
        const primary = finals.join(' ').trim();
        const candidates = new Set();
        if (primary) candidates.add(primary);
        if (altSets.length === 1) altSets[0].forEach(a => candidates.add(a));
        else if (altSets.length > 1) {
          // swap each segment's alternatives into the primary, one segment at a time
          altSets.forEach((alts, idx) => alts.forEach(a => {
            const combo = finals.map((f, k) => k === idx ? a : f).join(' ').trim();
            candidates.add(combo);
          }));
        }
        resolve({ candidates: [...candidates], confidence: confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null });
      };

      r.onresult = (e) => {
        lastActivity = Date.now();
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) {
            finals.push(res[0].transcript.trim());
            const alts = [];
            for (let k = 0; k < res.length; k++) alts.push(res[k].transcript.trim());
            altSets.push(alts);
            if (typeof res[0].confidence === 'number' && res[0].confidence > 0) confs.push(res[0].confidence);
          } else interim += res[0].transcript;
        }
        onInterim && onInterim(finals.join(' ') + ' ' + interim);
      };
      r.onend = () => { if (rec.active && !settled) { finish(); } };
      r.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { settled = true; stopRecognition(); resolve(null); } };
      rec.watchdog = setInterval(() => {
        const heardSomething = finals.length > 0;
        const silentMs = Date.now() - lastActivity;
        if ((heardSomething && silentMs > 2000) || Date.now() - started > capMs) finish();
      }, 250);
      try { r.start(); } catch { resolve(null); }
    });
  }

  /* ---------- views ---------- */
  let session = null; // {items:[{...item, category}], pos, results:{id:{score,words,heard}}, title, setId}

  function cleanup() { stopRecognition(); try { speechSynthesis.cancel(); } catch { } session = null; }

  function bestBadge(setId) {
    const s = loadJSON(SCORE_KEY)[setId];
    if (!s) return '<span class="muted" style="font-size:.78rem">Not tried</span>';
    const cls = s.best >= 85 ? 'pill-green' : s.best >= 60 ? 'pill-yellow' : 'pill-red';
    return `<span class="pill ${cls}">Best ${s.best}%</span>`;
  }

  function renderHome() {
    cleanup();
    const D = DRILLS();
    const trouble = troubleWords();
    app.innerHTML = `
    <div class="container">
      <section class="hero" style="padding:30px 40px">
        <div>
          <h1>🗣️ Pronunciation Drills</h1>
          <p>Read the target out loud — the speech recognizer shows exactly which words it heard.
          Words it can't recognize are the words a CELPIP rater strains to catch. Green means clear,
          red means drill it again.</p>
          ${!SR ? `<p style="background:rgba(0,0,0,.25);border-radius:10px;padding:10px 14px;margin-top:12px">⚠️ This browser has no speech recognition — open the app in <b>Google Chrome</b> or <b>Edge</b> to use drills.</p>` : ''}
        </div>
      </section>

      ${trouble.length ? `
      <h2 class="section-title">🔥 Your trouble words</h2>
      <div class="card">
        <div class="phrase-chips">${trouble.map(w => `<span class="phrase-chip" style="background:#fde3e5;color:#a1121f">${esc(w)}</span>`).join('')}</div>
        <div style="margin-top:14px"><button class="btn btn-red btn-sm" id="btn-trouble">🎯 Drill these words now</button>
        <span class="muted" style="font-size:.85rem;margin-left:10px">Words leave this list once you nail them.</span></div>
      </div>` : ''}

      ${D.categories.map(cat => `
        <h2 class="section-title">${CAT_ICONS[cat.key] || '🎓'} ${esc(cat.title)}</h2>
        <p class="muted" style="margin:-6px 0 12px">${esc(cat.description)}</p>
        <div class="task-grid">
          ${cat.sets.map(set => `
            <div class="task-card">
              <h3 style="min-height:auto">${esc(set.title)}</h3>
              <div class="t-meta"><span>${esc(set.focus)}</span></div>
              <div class="t-foot">
                ${bestBadge(set.setId)}
                <button class="btn btn-blue btn-sm" data-drillset="${esc(set.setId)}" ${!SR ? 'disabled' : ''}>Start · ${set.items.length}</button>
              </div>
            </div>`).join('')}
        </div>`).join('')}
    </div>`;

    $$('[data-drillset]').forEach(b => b.onclick = () => {
      const setId = b.dataset.drillset;
      for (const cat of DRILLS().categories) {
        const set = cat.sets.find(s => s.setId === setId);
        if (set) return startSession(cat, set);
      }
    });
    const tb = $('#btn-trouble');
    if (tb) tb.onclick = () => startSession(
      { key: 'trouble', title: 'Trouble Words' },
      {
        setId: 'trouble-' + Date.now(), transient: true, title: 'Your trouble words', focus: 'Words the recognizer missed before',
        items: troubleWords().map((w, i) => ({ id: 'trouble-i' + i, target: w, tip: 'Say it slowly once, then again at natural speed. Stress the strongest syllable clearly.' })),
      });
  }

  function startSession(cat, set) {
    session = { cat, set, pos: 0, results: {}, attempts: 0 };
    renderItem();
  }

  function renderItem(state) {
    const { cat, set, pos } = session;
    const item = set.items[pos];
    const res = session.results[item.id];
    const isShadow = cat.key === 'shadow';
    const st = state || (res ? 'result' : 'ready');
    const pct = Math.round(100 * pos / set.items.length);

    app.innerHTML = `
    <div class="container" style="max-width:860px">
      <a href="#" class="fb-back" id="drill-exit">← Exit drill</a>
      <div class="card" style="padding:28px 32px">
        <div class="p-head" style="margin-bottom:2px">
          <h2 style="font-size:1.25rem">${CAT_ICONS[cat.key] || '🎯'} ${esc(set.title)}</h2>
          <span class="step-note">${pos + 1} / ${set.items.length}</span>
        </div>
        <div class="drill-progress"><i style="width:${pct}%"></i></div>
        <div class="muted" style="font-size:.88rem;margin:10px 0 4px">${esc(set.focus)}${isShadow ? ' — listen first, then repeat it' : ''}</div>

        <div class="drill-target" id="drill-target">${res && st === 'result'
        ? res.words.map(w => `<span class="word-chip wc-${w.status}" data-say="${esc(w.word)}" title="${w.status === 'sub' ? 'We heard: ' + esc(w.heard || '') : w.status === 'miss' ? 'Not heard' : w.status === 'close' ? 'Check the ending — we heard: ' + esc(w.heard || '') : 'Clear!'}">${esc(w.word)}</span>`).join(' ')
        : esc(item.display || item.target)}</div>

        ${st === 'recording' ? `<div class="live-transcript" id="drill-live" style="min-height:56px"><span class="interim">Listening — speak now…</span></div>` : ''}

        ${st === 'result' && res ? `
          <div class="drill-result-row">
            <div class="score-bubble ${res.score >= 85 ? 'sb-green' : res.score >= 60 ? 'sb-yellow' : 'sb-red'}">${res.score}%</div>
            <div>
              <div style="font-weight:800">${res.score >= 85 ? 'Crystal clear! 🎉' : res.score >= 60 ? 'Almost — polish the red words.' : "Let's try that again, slowly."}</div>
              <div class="muted" style="font-size:.88rem;margin-top:2px">We heard: “${esc(res.heard || '—')}”${res.confidence != null ? ` · clarity ${Math.round(res.confidence * 100)}%` : ''}</div>
              <div class="muted" style="font-size:.8rem;margin-top:4px">Legend: <span class="word-chip wc-ok" style="font-size:.75rem">clear</span> <span class="word-chip wc-close" style="font-size:.75rem">ending?</span> <span class="word-chip wc-sub" style="font-size:.75rem">misheard</span> <span class="word-chip wc-miss" style="font-size:.75rem">not heard</span> — click any word to hear it slowly.</div>
            </div>
          </div>` : ''}

        <div class="tips-box" style="margin-top:18px"><h4>💡 Coach's tip</h4><p style="font-size:.95rem;line-height:1.6">${esc(item.tip)}</p></div>

        <div class="stage-actions">
          <button class="btn btn-grey" id="drill-listen">🔊 ${isShadow ? 'Play the model' : 'Listen'}</button>
          ${st === 'recording'
        ? `<button class="btn btn-red" id="drill-stop">⏹ Stop</button>`
        : `<button class="btn btn-green" id="drill-say" ${!SR ? 'disabled' : ''}>🎙️ ${res ? 'Try again' : 'Say it'}</button>`}
          ${res ? `<button class="btn btn-blue" id="drill-next">${pos < set.items.length - 1 ? 'Next →' : 'Finish ✔'}</button>` : `<button class="link-more" id="drill-skip">Skip →</button>`}
        </div>
      </div>
    </div>`;

    $('#drill-exit').onclick = (e) => { e.preventDefault(); finishSession(true); };
    $('#drill-listen').onclick = () => speak(item.target, isShadow ? 0.92 : 0.85);
    $$('[data-say]').forEach(c => c.onclick = () => speak(c.dataset.say, 0.6));
    const skip = $('#drill-skip');
    if (skip) skip.onclick = () => nextItem();
    const next = $('#drill-next');
    if (next) next.onclick = () => nextItem();
    const stop = $('#drill-stop');
    if (stop) stop.onclick = () => stopRecognition(); // watchdog onend path resolves the attempt
    const say = $('#drill-say');
    if (say) say.onclick = async () => {
      renderItem('recording');
      const cap = isShadow ? 30000 : 15000;
      const heard = await listenOnce({
        capMs: cap,
        onInterim: (t) => { const el = $('#drill-live'); if (el) el.textContent = t; },
      });
      if (!session) return; // exited mid-listen
      if (!heard) {
        renderItem('ready');
        const t = document.createElement('div'); t.className = 'toast';
        t.textContent = 'Microphone unavailable — allow mic access in Chrome to use drills.';
        document.getElementById('toast-root').appendChild(t); setTimeout(() => t.remove(), 3500);
        return;
      }
      const attempt = scoreAttempt(item.target, heard.candidates);
      attempt.confidence = heard.confidence;
      const prev = session.results[item.id];
      if (!prev || attempt.score >= prev.score) session.results[item.id] = attempt;
      // trouble-word bookkeeping on every attempt
      attempt.words.forEach(w => recordTrouble(w.word, w.status === 'sub' || w.status === 'miss'));
      renderItem('result');
    };
  }

  function nextItem() {
    if (session.pos < session.set.items.length - 1) { session.pos++; renderItem(); }
    else finishSession(false);
  }

  function finishSession(aborted) {
    stopRecognition();
    const { set, cat, results } = session || {};
    if (!set) return renderHome();
    const scored = set.items.map(it => ({ it, r: results[it.id] })).filter(x => x.r);
    if (aborted && !scored.length) { session = null; return renderHome(); }
    const avg = scored.length ? Math.round(scored.reduce((s, x) => s + x.r.score, 0) / scored.length) : 0;
    if (!set.transient && scored.length) {
      const all = loadJSON(SCORE_KEY);
      if (!all[set.setId] || avg > all[set.setId].best) all[set.setId] = { best: avg, ts: Date.now() };
      saveJSON(SCORE_KEY, all);
    }
    const worst = scored.filter(x => x.r.score < 85).sort((a, b) => a.r.score - b.r.score);

    app.innerHTML = `
    <div class="container" style="max-width:860px">
      <a href="#" class="fb-back" id="drill-exit">← Back to drills</a>
      <div class="card" style="padding:32px;text-align:center">
        <div class="score-bubble ${avg >= 85 ? 'sb-green' : avg >= 60 ? 'sb-yellow' : 'sb-red'}" style="width:110px;height:110px;font-size:2rem;margin:0 auto 14px">${avg}%</div>
        <h2 style="font-size:1.5rem;margin-bottom:4px">${esc(set.title)} — ${aborted ? 'partial run' : 'complete!'}</h2>
        <p class="muted">${scored.length} of ${set.items.length} items scored · ${avg >= 85 ? 'Excellent clarity — a rater would follow every word. 🏅' : avg >= 60 ? 'Good base — repeat the items below until they turn green.' : 'Slow down and exaggerate the mouth movements, then retry.'}</p>
      </div>
      ${worst.length ? `
      <h2 class="section-title">🔁 Repeat these</h2>
      <div class="card">
        ${worst.map(x => `
          <div class="drill-review-row">
            <span class="pill ${x.r.score >= 60 ? 'pill-yellow' : 'pill-red'}">${x.r.score}%</span>
            <span style="flex:1">${esc(x.it.display || x.it.target)}</span>
            <span class="muted" style="font-size:.82rem">heard: “${esc(x.r.heard || '—')}”</span>
          </div>`).join('')}
      </div>` : ''}
      <div class="stage-actions" style="justify-content:center;margin-top:22px">
        <button class="btn btn-green" id="drill-retry">🔁 Run this set again</button>
        <button class="btn btn-grey" id="drill-home">All drills</button>
      </div>
    </div>`;
    $('#drill-exit').onclick = (e) => { e.preventDefault(); renderHome(); };
    $('#drill-retry').onclick = () => startSession(cat, set);
    $('#drill-home').onclick = () => renderHome();
    session = null;
  }

  /* debug/test hook: score the current item as if recognition heard `text` */
  function _simulate(text) {
    if (!session) return 'no active drill session';
    const item = session.set.items[session.pos];
    const attempt = scoreAttempt(item.target, [text]);
    const prev = session.results[item.id];
    if (!prev || attempt.score >= prev.score) session.results[item.id] = attempt;
    attempt.words.forEach(w => recordTrouble(w.word, w.status === 'sub' || w.status === 'miss'));
    renderItem('result');
    return attempt;
  }

  window.CelpipDrills = { renderHome, cleanup, _simulate, _score: scoreAttempt };
})();
