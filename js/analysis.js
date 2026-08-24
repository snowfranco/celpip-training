/* ============ CELPIP Speaking analysis engine ============
   Computes Big-Interview-style metrics + a CELPIP level estimate (M, 4-12)
   from: transcript text, speaking duration, task/prompt data, and
   volume samples collected during recording. All heuristic, all local. */

(function () {
  'use strict';

  const UM_RE = /\b(?:um+|uh+|erm+|er|hmm+|mmm+|ah+)\b/gi;

  const FILLER_PHRASES = [
    'you know', 'i mean', 'kind of', 'sort of', 'or something', 'stuff like that',
    'so yeah', 'and yeah', 'and stuff', 'or whatever', 'you see',
  ];
  const FILLER_WORDS = ['like', 'basically', 'actually', 'literally', 'anyways', 'whatever', 'okay so'];

  const CONNECTORS = [
    'firstly', 'first of all', 'to begin with', 'secondly', 'thirdly', 'finally', 'lastly',
    'in addition', 'additionally', 'moreover', 'furthermore', 'on top of that', 'as well as that',
    'apart from that', 'not only that', 'what is more', "what's more", 'besides that',
    'however', 'nevertheless', 'on the other hand', 'in contrast', 'whereas', 'although',
    'even though', 'despite', 'in spite of', 'while',
    'as a result', 'consequently', 'therefore', 'for this reason', 'thus', 'due to',
    'because of this', 'that is why', "that's why", 'accordingly',
    'in conclusion', 'to sum up', 'overall', 'all things considered', 'in the end', 'ultimately',
    'in my opinion', 'from my perspective', 'i strongly believe', 'i firmly believe', 'personally',
    'for example', 'for instance', 'such as', 'in particular', 'specifically',
    'in the foreground', 'in the background', 'to the left', 'to the right', 'in the middle',
    'next to', 'behind', 'in front of', 'at first glance', 'it looks like', 'it seems',
    'i would suggest', 'i recommend', 'if i were you', 'my advice', 'compared to', 'similarly',
    'more importantly', 'above all', 'in fact', 'of course', 'obviously', 'clearly',
    'i predict', 'most likely', 'probably', 'it appears',
    'at first', 'eventually', 'meanwhile', 'afterwards', 'by the time', 'as soon as',
    'suddenly', 'luckily', 'fortunately', 'unfortunately', 'it turned out', 'in that moment',
    'looking back', 'ever since', 'to this day', 'right away', 'moments later', 'initially',
  ];

  const OPENING_MARKERS = [
    'hi ', 'hey ', 'hello', 'good morning', 'good afternoon', 'thanks for', "i'm calling",
    'i am calling', 'in my opinion', 'i believe', 'i think', 'from my perspective', 'i strongly',
    'i remember', "i'd like to", 'i would like', 'let me tell', 'in this picture', 'in the picture',
    'this picture', 'the picture', 'i can see', 'looking at', "i'd recommend", 'i would recommend',
    'my advice', 'if i were you', 'congratulations', "it's exciting", 'i understand', 'first of all',
    'a memory', 'the experience', 'one experience', 'one trip', 'one time', 'a time', 'the time',
    'years ago', 'months ago', 'last year', 'last summer', 'last winter', 'last month', 'last week',
    'never forget', "you won't believe", "you'll never guess", 'the moment', 'one morning',
    'one day', 'one evening', 'a while back', 'a few years', 'when i was', 'back in',
  ];

  const CLOSING_MARKERS = [
    'in conclusion', 'to sum up', 'overall', 'all things considered', "that's why", 'that is why',
    'therefore', 'ultimately', 'in the end', "i'm confident", 'i am confident', 'good luck',
    'let me know', 'thanks for listening', 'thank you', 'i hope', 'so my advice', "so that's",
    'so i believe', 'so i think', 'as a result', 'for these reasons', 'looking back', 'i really appreciate',
    'my advice', "you won't regret", 'give it a try', "let's talk soon", 'talk to you', 'see you',
    'ever since', 'to this day', 'taught me', 'never forget', 'i still', 'come by', 'could you',
    'can you', 'let me know', 'give me a call', 'call me', "can't wait", "i'd love", 'showed me',
  ];

  const NEGATIVE_WORDS = [
    'hate', 'hated', 'terrible', 'awful', 'horrible', 'disgusting', 'stupid', 'dumb', 'useless',
    'worthless', 'pathetic', 'boring', 'annoying', 'furious', 'worst', 'nightmare', 'disaster',
    'miserable', 'lazy', 'incompetent', 'ridiculous', 'unacceptable', 'sick of', 'fed up',
    "can't stand", 'waste of',
  ];

  const COMMON_WORDS = new Set(('the a an and or but so of to in on at for with from by about into over after under ' +
    'again then once here there all any both each few more most other some such no nor not only own same than too very ' +
    'can will just should now i you he she it we they me him her us them my your his its our their this that these those ' +
    'am is are was were be been being have has had do does did would could may might must shall get got make made go went ' +
    'going come came take took see saw know knew think thought want wanted like liked need needed say said tell told ' +
    'one two three four five first second next last new old good great big small really also well much many lot bit ' +
    'thing things something anything people person time day year way what when where which who how why because if as').split(/\s+/));

  function tokenize(text) {
    return (text.toLowerCase().replace(/[^a-z'\s-]/g, ' ').match(/[a-z][a-z'-]*/g)) || [];
  }

  // light stemmer so "caring" matches keyword "care", "breeds" matches "breed", etc.
  function stemWord(w) {
    w = w.toLowerCase().replace(/'s$/, '').replace(/'/g, '');
    if (w.length > 4) w = w.replace(/(ing|ed|es|ly)$/, '');
    if (w.length > 3) w = w.replace(/s$/, '');
    if (w.length > 3) w = w.replace(/e$/, '');
    return w;
  }
  function matchesKeyword(token, keyword) {
    if (token === keyword) return true;
    const st = stemWord(token), sk = stemWord(keyword);
    return st === sk || (sk.length >= 4 && st.startsWith(sk));
  }

  function countOccurrences(text, phrase) {
    let n = 0, i = 0;
    const t = ' ' + text + ' ', p = phrase;
    while ((i = t.indexOf(p, i)) !== -1) {
      const before = t[i - 1], after = t[i + p.length];
      if (!/[a-z]/.test(before || ' ') && !/[a-z]/.test(after || ' ')) n++;
      i += p.length;
    }
    return n;
  }

  function syllables(word) {
    const m = word.toLowerCase().replace(/e$/, '').match(/[aeiouy]+/g);
    return m ? m.length : 1;
  }

  // score helpers: map value to 0-100 given ideal band [lo, hi] and hard limits
  function bandScore(value, hardLo, lo, hi, hardHi) {
    if (value >= lo && value <= hi) return 100;
    if (value < lo) return value <= hardLo ? 0 : Math.round(100 * (value - hardLo) / (lo - hardLo));
    return value >= hardHi ? 0 : Math.round(100 * (hardHi - value) / (hardHi - hi));
  }
  function lessIsBetter(value, okAt, zeroAt) {
    if (value <= okAt) return 100;
    if (value >= zeroAt) return 0;
    return Math.round(100 * (zeroAt - value) / (zeroAt - okAt));
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function analyze(opts) {
    const { transcript, durationSec, task, prompt, volumeSamples } = opts;
    const text = (transcript || '').trim();
    const lower = ' ' + text.toLowerCase().replace(/\s+/g, ' ') + ' ';
    const tokens = tokenize(text);
    const wordCount = tokens.length;
    const minutes = Math.max(durationSec, 1) / 60;
    const per100 = (n) => wordCount ? +(n * 100 / wordCount).toFixed(1) : 0;

    /* ---- pace ---- */
    const wpm = wordCount ? Math.round(wordCount / minutes) : 0;
    const paceScore = wordCount ? bandScore(wpm, 55, 100, 165, 220) : 0;

    /* ---- um / disfluencies ---- */
    const umCount = (text.match(UM_RE) || []).length;
    const umPer100 = per100(umCount);
    const umScore = lessIsBetter(umPer100, 1, 6);

    /* ---- filler words ---- */
    let fillerCount = 0;
    FILLER_PHRASES.forEach(p => fillerCount += countOccurrences(lower, p));
    FILLER_WORDS.forEach(w => fillerCount += countOccurrences(lower, w));
    const fillerPer100 = per100(fillerCount);
    const fillerScore = lessIsBetter(fillerPer100, 2, 9);

    /* ---- connectors / power phrases ---- */
    const connectorsUsed = [];
    CONNECTORS.forEach(c => { if (countOccurrences(lower, c) > 0) connectorsUsed.push(c); });
    const taskPhrases = (task.powerPhrases || []).filter(p => countOccurrences(lower, p.toLowerCase().replace(/[.,!]/g, '')) > 0);
    const connectorVariety = new Set([...connectorsUsed, ...taskPhrases.map(p => p.toLowerCase())]).size;
    const connectorScore = clamp(Math.round(connectorVariety / 5 * 100), 0, 100);

    /* ---- vocabulary ---- */
    const contentTokens = tokens.filter(t => !COMMON_WORDS.has(t));
    const uniqueRatio = wordCount ? new Set(tokens).size / wordCount : 0;
    const richWords = contentTokens.filter(t => t.length >= 7 || syllables(t) >= 3);
    const richRatio = wordCount ? richWords.length / wordCount : 0;
    // 0 = simple, 100 = sophisticated; sweet spot ~32-85 ("smart accessible language").
    // hardHi sits beyond 100 so dense-but-natural answers are only mildly penalized.
    const vocabPosition = clamp(Math.round(richRatio * 220 + uniqueRatio * 40), 0, 100);
    const vocabScore = wordCount ? bandScore(vocabPosition, 5, 32, 85, 130) : 0;

    /* ---- negative tone ---- */
    let negativeCount = 0;
    NEGATIVE_WORDS.forEach(w => negativeCount += countOccurrences(lower, w));
    const negativeScore = lessIsBetter(negativeCount, 0, 5);

    /* ---- pauses + volume from RMS samples ---- */
    let pauseCount = 0, volumeStatus = 'unknown', volumeScore = 78, avgLevel = 0;
    if (volumeSamples && volumeSamples.length > 10) {
      const sorted = [...volumeSamples].sort((a, b) => a - b);
      const q = (p) => sorted[Math.floor(p * (sorted.length - 1))];
      const noise = q(0.1), speech = q(0.9);
      avgLevel = speech;
      const threshold = noise + Math.max(0.012, (speech - noise) * 0.22);
      let run = 0, started = false;
      const frameSec = durationSec / volumeSamples.length;
      volumeSamples.forEach(v => {
        if (v > threshold) { started = true; if (run * frameSec > 1.6) pauseCount++; run = 0; }
        else if (started) run++;
      });
      if (speech < 0.02) { volumeStatus = 'low'; volumeScore = 35; }
      else if (speech < 0.05) { volumeStatus = 'quiet'; volumeScore = 70; }
      else { volumeStatus = 'good'; volumeScore = 100; }
    }
    const pauseScore = lessIsBetter(pauseCount, 2, 8);

    /* ---- length ---- */
    const usedPct = Math.round(100 * durationSec / task.speakSeconds);
    const expectedWords = Math.round(task.speakSeconds / 60 * 120); // floor of a solid answer
    const lengthScore = Math.round(bandScore(usedPct, 20, 75, 102, 120) * 0.6 +
      bandScore(wordCount, expectedWords * 0.25, expectedWords * 0.8, expectedWords * 1.5, expectedWords * 2) * 0.4);

    /* ---- task fulfillment (keyword coverage) ---- */
    const keywords = prompt.keywords || [];
    const hitKeywords = [], missedKeywords = [];
    keywords.forEach(k => {
      const hit = tokens.some(t => matchesKeyword(t, k));
      (hit ? hitKeywords : missedKeywords).push(k);
    });
    const kwRatio = keywords.length ? hitKeywords.length / keywords.length : 0.5;
    const fulfillScore = wordCount === 0 ? 0 :
      clamp(Math.round(kwRatio * 78 + Math.min(wordCount / expectedWords, 1) * 22), 0, 100);

    /* ---- coherence / structure ---- */
    const first = lower.slice(0, 130), last = lower.slice(-170);
    const hasOpening = OPENING_MARKERS.some(m => first.includes(m));
    const hasClosing = CLOSING_MARKERS.some(m => last.includes(m));
    const seqCount = ['firstly', 'first of all', 'to begin', 'secondly', 'thirdly', 'finally', 'lastly',
      'next', 'then', 'after that', 'another', 'on top of that', 'in addition', 'moreover', 'also',
      'at first', 'eventually', 'suddenly', 'as soon as', 'by the time', 'meanwhile', 'afterwards',
      'moments later', 'right away', 'initially', 'in the end', 'that morning', 'that day']
      .filter(m => lower.includes(' ' + m)).length;
    const coherenceScore = wordCount === 0 ? 0 : clamp(Math.round(
      (hasOpening ? 28 : 8) + (hasClosing ? 28 : 6) + Math.min(seqCount, 4) * 8 + Math.min(connectorVariety, 4) * 3), 0, 100);

    /* ---- CELPIP dimension subscores ---- */
    const dim = {
      content: Math.round(coherenceScore * 0.55 + connectorScore * 0.2 + lengthScore * 0.25),
      vocabulary: Math.round(vocabScore * 0.55 + connectorScore * 0.25 + clamp(uniqueRatio * 160, 0, 100) * 0.2),
      listenability: Math.round(paceScore * 0.3 + umScore * 0.25 + fillerScore * 0.2 + pauseScore * 0.15 + volumeScore * 0.1),
      taskFulfillment: Math.round(fulfillScore * 0.7 + lengthScore * 0.3),
    };
    const overallScore = Math.round((dim.content + dim.vocabulary + dim.listenability + dim.taskFulfillment) / 4);

    const level = overallScore >= 92 ? '12' : overallScore >= 85 ? '11' : overallScore >= 78 ? '10'
      : overallScore >= 70 ? '9' : overallScore >= 62 ? '8' : overallScore >= 54 ? '7'
      : overallScore >= 46 ? '6' : overallScore >= 38 ? '5' : overallScore >= 28 ? '4' : 'M';
    const levelNum = level === 'M' ? 3 : parseInt(level, 10);

    const st = (score) => score >= 75 ? 'good' : score >= 50 ? 'warn' : 'bad';

    return {
      wordCount, durationSec: Math.round(durationSec), overallScore, level, levelNum, dim,
      passed: levelNum >= 10,
      metrics: {
        overall: { score: overallScore, status: levelNum >= 10 ? 'good' : levelNum >= 8 ? 'warn' : 'bad', value: level },
        taskFulfillment: { score: fulfillScore, status: st(fulfillScore), value: Math.round(kwRatio * 100) + '%', hitKeywords, missedKeywords },
        coherence: { score: coherenceScore, status: st(coherenceScore), hasOpening, hasClosing, seqCount },
        pace: { score: paceScore, status: st(paceScore), value: wpm },
        um: { score: umScore, status: umScore >= 75 ? 'good' : umScore >= 45 ? 'warn' : 'bad', value: umPer100, count: umCount },
        filler: { score: fillerScore, status: fillerScore >= 75 ? 'good' : fillerScore >= 45 ? 'warn' : 'bad', value: fillerPer100, count: fillerCount },
        vocabulary: { score: vocabScore, status: st(vocabScore), position: vocabPosition },
        connectors: { score: connectorScore, status: st(connectorScore), variety: connectorVariety, used: [...new Set([...connectorsUsed, ...taskPhrases.map(p => p.toLowerCase())])] },
        pauses: { score: pauseScore, status: st(pauseScore), count: pauseCount },
        length: { score: lengthScore, status: st(lengthScore), usedPct, words: wordCount },
        negativeTone: { score: negativeScore, status: negativeScore >= 75 ? 'good' : negativeScore >= 45 ? 'warn' : 'bad', count: negativeCount },
        volume: { score: volumeScore, status: volumeScore >= 75 ? 'good' : volumeScore >= 45 ? 'warn' : 'bad', level: volumeStatus },
      },
    };
  }

  window.CelpipAnalysis = { analyze, CONNECTORS, matchesKeyword };
})();
