/*
 * VOLVE background music, generated live in the browser with the Web Audio API.
 * No recordings are used, so there is nothing to license and nothing heavy to download.
 *
 * Pooja: a sitar-like plucked string (Karplus-Strong synthesis with a jawari buzz,
 * sympathetic strings and meend glides) over a tanpura drone, moving through the notes
 * of a morning raga. Evening: warm pads, arpeggios and bells for an uplifting launch.
 *
 * VolveMusic.start(id, ctx, destination) / stop() / render(id, seconds) for testing.
 */
(function () {
  "use strict";
  var M = (window.VolveMusic = {});
  var rnd = Math.random;
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }
  function hz(base, semis) { return base * Math.pow(2, semis / 12); }

  /* ---------------- building blocks ---------------- */
  function reverb(ac, seconds, decay) {
    var len = Math.floor(ac.sampleRate * seconds), b = ac.createBuffer(2, len, ac.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = b.getChannelData(c);
      for (var i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    var cv = ac.createConvolver(); cv.buffer = b; return cv;
  }
  // A bus: dry + reverb send, faded in on start and out on stop.
  function bus(ac, dest, wet, seconds) {
    var out = ac.createGain(); out.gain.value = 0.0001; out.connect(dest);
    var input = ac.createGain(); input.connect(out);
    var rv = reverb(ac, seconds || 3.2, 2.6), send = ac.createGain(); send.gain.value = wet;
    input.connect(send); send.connect(rv); rv.connect(out);
    return { input: input, out: out };
  }
  function echo(ac, dest, time, fb, mix) {
    var inp = ac.createGain(), d = ac.createDelay(2), f = ac.createGain(), lp = ac.createBiquadFilter(), m = ac.createGain();
    d.delayTime.value = time; f.gain.value = fb; lp.type = "lowpass"; lp.frequency.value = 2600; lp.Q.value = 0.5; m.gain.value = mix;
    inp.connect(d); d.connect(lp); lp.connect(f); f.connect(d); lp.connect(m); m.connect(dest);
    inp.connect(dest);
    return inp;
  }

  // Karplus-Strong plucked string, rendered once per pitch and cached per audio context.
  function ksBuffer(ac, f0, dur, bright, damp) {
    var cache = ac.__volveKS || (ac.__volveKS = {});
    var key = [f0.toFixed(2), dur, bright, damp].join(":");
    if (cache[key]) return cache[key];
    var sr = ac.sampleRate, P = Math.max(2, Math.round(sr / f0)), N = Math.floor(sr * dur);
    var b = ac.createBuffer(1, N, sr), d = b.getChannelData(0), ring = new Float32Array(P), prev = 0, i, n, mean = 0;
    for (i = 0; i < P; i++) { prev += bright * ((rnd() * 2 - 1) - prev); ring[i] = prev; mean += prev; }
    mean /= P; for (i = 0; i < P; i++) ring[i] -= mean;
    var idx = 0, pk = 0;
    for (n = 0; n < N; n++) {
      var a = ring[idx], c = ring[idx + 1 === P ? 0 : idx + 1];
      d[n] = a; ring[idx] = damp * 0.5 * (a + c);
      if (++idx === P) idx = 0;
      if (Math.abs(a) > pk) pk = Math.abs(a);
    }
    if (pk > 0) for (n = 0; n < N; n++) d[n] /= pk;
    // fade the tail so loops of long notes never click
    var fade = Math.floor(sr * 0.05); for (n = 0; n < fade; n++) d[N - 1 - n] *= n / fade;
    var res = { buf: b, rate: f0 / (sr / P) }; // playbackRate that corrects the rounded period
    cache[key] = res; return res;
  }
  function pluck(ac, dest, t, f, o) {
    var k = ksBuffer(ac, f, o.dur, o.bright, o.damp);
    var s = ac.createBufferSource(); s.buffer = k.buf;
    var r = k.rate;
    if (o.from) { // meend: glide into the note from a neighbouring one
      s.playbackRate.setValueAtTime(r * o.from / f, t);
      s.playbackRate.linearRampToValueAtTime(r, t + (o.glide || 0.22));
    } else s.playbackRate.setValueAtTime(r, t);
    if (o.to) { // meend away, towards the next note, near the end
      s.playbackRate.setValueAtTime(r, t + o.toAt);
      s.playbackRate.linearRampToValueAtTime(r * o.to / f, t + o.toAt + (o.glide || 0.3));
    }
    var g = ac.createGain();
    g.gain.setValueAtTime(o.gain, t);
    g.gain.setTargetAtTime(0.0001, t + o.hold, o.release || 0.25);
    s.connect(g); g.connect(dest); s.start(t); s.stop(t + o.hold + (o.release || 0.25) * 6);
  }

  // Sitar body: asymmetric soft clip (the buzzing jawari bridge), presence, and sympathetic strings.
  function sitarVoice(ac, dest, sa) {
    var inp = ac.createGain();
    var ws = ac.createWaveShaper(), curve = new Float32Array(1024);
    for (var i = 0; i < 1024; i++) { var x = i / 511.5 - 1; curve[i] = Math.tanh(1.5 * x + 0.22 * x * x) / Math.tanh(1.5); }
    ws.curve = curve; ws.oversample = "2x";
    var hs = ac.createBiquadFilter(); hs.type = "highshelf"; hs.frequency.value = 2400; hs.gain.value = 2;
    var pk = ac.createBiquadFilter(); pk.type = "peaking"; pk.frequency.value = 900; pk.Q.value = 1.2; pk.gain.value = 3;
    var lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4800; lp.Q.value = 0.5;
    var out = ac.createGain(); out.gain.value = 0.9;
    inp.connect(ws); ws.connect(hs); hs.connect(pk); pk.connect(lp); lp.connect(out); out.connect(dest);
    // tarab: sympathetic strings ringing at Sa and Pa
    [sa * 2, sa * 3].forEach(function (f) {
      var d = ac.createDelay(1), fb = ac.createGain(), f2 = ac.createBiquadFilter(), m = ac.createGain();
      d.delayTime.value = 1 / f; fb.gain.value = 0.8; f2.type = "lowpass"; f2.frequency.value = 3200; f2.Q.value = 0.5; m.gain.value = 0.06;
      inp.connect(d); d.connect(f2); f2.connect(fb); fb.connect(d); f2.connect(m); m.connect(dest);
    });
    return inp;
  }
  function tanpuraVoice(ac, dest) {
    var inp = ac.createGain();
    var ws = ac.createWaveShaper(), curve = new Float32Array(512);
    for (var i = 0; i < 512; i++) { var x = i / 255.5 - 1; curve[i] = Math.tanh(1.1 * x + 0.12 * x * x) / Math.tanh(1.1); }
    ws.curve = curve;
    var lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1900; lp.Q.value = 0.5;
    inp.connect(ws); ws.connect(lp); lp.connect(dest);
    return inp;
  }
  function tanpuraCycle(ac, v, t, sa, gain) {
    // Pa (lower), Sa, Sa, Sa (lower octave): the classic four-string cycle
    [sa * 0.75, sa, sa, sa / 2].forEach(function (f, i) {
      pluck(ac, v, t + i * 1.15, f, { dur: 6, bright: 0.32, damp: 0.9996, gain: gain * (i === 3 ? 1.15 : 1), hold: 4.2, release: 0.9 });
    });
    return 4.6 + 0.3; // seconds until the next cycle
  }

  function bell(ac, dest, t, f, gain, long) {
    [[1, 1], [2.01, .42], [2.76, .28], [4.07, .14], [5.43, .07]].forEach(function (p) {
      var o = ac.createOscillator(), g = ac.createGain(); o.type = "sine"; o.frequency.value = f * p[0];
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain * p[1], t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (long || 5) / Math.sqrt(p[0]));
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + (long || 5) + 0.2);
    });
  }
  function fmBell(ac, dest, t, f, gain) {
    var c = ac.createOscillator(), m = ac.createOscillator(), mg = ac.createGain(), g = ac.createGain();
    c.frequency.value = f; m.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(1, t + 1.6);
    m.connect(mg); mg.connect(c.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    c.connect(g); g.connect(dest); c.start(t); m.start(t); c.stop(t + 3); m.stop(t + 3);
  }
  function softPluck(ac, dest, t, f, gain, decay) {
    var o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
    o.type = "triangle"; o.frequency.value = f; o2.type = "sine"; o2.frequency.value = f * 2;
    lp.type = "lowpass"; lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(900, t + (decay || 1.2));
    var g2 = ac.createGain(); g2.gain.value = 0.3;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + (decay || 1.2));
    o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(dest);
    o.start(t); o2.start(t); o.stop(t + (decay || 1.2) + .1); o2.stop(t + (decay || 1.2) + .1);
  }
  function pad(ac, dest, t, freqs, dur, gain, bright) {
    var lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 0.4;
    lp.frequency.setValueAtTime(bright * 0.6, t); lp.frequency.linearRampToValueAtTime(bright, t + dur * 0.6);
    var g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + Math.min(1.6, dur * 0.4));
    g.gain.setValueAtTime(gain, t + dur - 0.2); g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.6);
    lp.connect(g); g.connect(dest);
    freqs.forEach(function (f) {
      [-7, 7].forEach(function (cents) {
        var o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = cents;
        var og = ac.createGain(); og.gain.value = 1 / (freqs.length * 2);
        o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + 1.8);
      });
    });
  }
  function sub(ac, dest, t, f, dur, gain) {
    var o = ac.createOscillator(), g = ac.createGain(); o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.8); g.gain.setValueAtTime(gain, t + dur - 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.8);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 1);
  }
  function heartbeat(ac, dest, t, gain) {
    [[0, 1], [0.22, 0.6]].forEach(function (h) {
      var o = ac.createOscillator(), g = ac.createGain(), s = t + h[0];
      o.frequency.setValueAtTime(110, s); o.frequency.exponentialRampToValueAtTime(42, s + 0.22);
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(gain * h[1], s + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.45);
      o.connect(g); g.connect(dest); o.start(s); o.stop(s + 0.5);
    });
  }

  /* ---------------- raga alaap generator (pooja and fusion) ---------------- */
  // Moves through the notes of a raga scale: mostly stepwise, resting on Sa, Ga or Pa,
  // with meend glides between neighbouring notes and pauses between phrases.
  function alaap(scale, sa, feel) {
    var notes = [];
    for (var oct = -12; oct <= 12; oct += 12) scale.forEach(function (s) { var v = s + oct; if (v >= -5 && v <= 12) notes.push(v); });
    notes.sort(function (a, b) { return a - b; });
    var rests = notes.filter(function (n) { return n === 0 || n === 7 || n === 12 || n === 4; });
    var i = notes.indexOf(0), left = 0, prevF = null, first = true;
    return function next(ac, voice, t) {
      if (left <= 0) { // begin a phrase from a resting note near the middle
        left = 3 + Math.floor(rnd() * 5);
        i = notes.indexOf(pick(first ? [0] : [0, 0, 7, 4].filter(function (n) { return notes.indexOf(n) >= 0; })));
        first = false; prevF = null;
      }
      var target = 0.5 * notes.length;
      var steps = i < target ? [1, 1, 2, -1] : [-1, -1, -2, 1];
      var j = Math.max(0, Math.min(notes.length - 1, i + pick(steps)));
      if (left === 1) { // end the phrase on the nearest resting note
        var best = rests[0]; rests.forEach(function (r) { if (Math.abs(r - notes[j]) < Math.abs(best - notes[j])) best = r; });
        j = notes.indexOf(best);
      }
      var f = hz(sa * 2, notes[j]);
      var dur = (left === 1 ? pick([2.6, 3.0, 3.4]) : pick([0.7, 0.9, 1.1, 1.4, 1.8])) * feel;
      var glide = prevF && Math.abs(notes[j] - notes[i]) <= 2 && rnd() < 0.42;
      pluck(ac, voice, t, f, { dur: 4, bright: 0.72, damp: 0.9985, gain: 0.5, hold: dur * 0.95, release: 0.35, from: glide ? prevF : null, glide: 0.18 + rnd() * 0.15 });
      // an occasional soft grace note (krintan) just before a longer note
      if (!glide && dur > 1.3 && rnd() < 0.25 && j + 1 < notes.length) {
        pluck(ac, voice, t - 0.09, hz(sa * 2, notes[j + 1]), { dur: 1, bright: 0.9, damp: 0.995, gain: 0.22, hold: 0.07, release: 0.04 });
      }
      prevF = f; i = j; left--;
      return dur + (left === 0 ? (1.6 + rnd() * 2.2) * feel : 0);
    };
  }


  /* ---------------- shehnai (mangal vadya) ---------------- */
  // A reed voice: buzzy sawtooth + square source, nasal formant peaks, breath noise,
  // a scoop into each phrase, delayed vibrato, and legato meend between notes.
  function noiseBuf(ac) {
    if (ac.__volveNoise) return ac.__volveNoise;
    var n = ac.sampleRate * 2, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = rnd() * 2 - 1;
    return (ac.__volveNoise = b);
  }
  function shehnaiPhrase(ac, dest, t, notes, gain) {
    // notes: [{f, dur, glide, kan}] played as one breath
    var total = notes.reduce(function (a, n) { return a + n.dur; }, 0);
    var o1 = ac.createOscillator(), o2 = ac.createOscillator(), g2 = ac.createGain();
    o1.type = "sawtooth"; o2.type = "square"; g2.gain.value = 0.45;
    var hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 320; hp.Q.value = 0.5;
    var sum = ac.createGain(); sum.gain.value = 1;
    o1.connect(hp); o2.connect(g2); g2.connect(hp);
    [[1150, 3.2, 1.0], [2350, 4.5, 0.55], [3700, 6, 0.22]].forEach(function (fm) {
      var bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = fm[0]; bp.Q.value = fm[1];
      var g = ac.createGain(); g.gain.value = fm[2] * 2.2; hp.connect(bp); bp.connect(g); g.connect(sum);
    });
    var lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1700; lp.Q.value = 0.5;
    var lg = ac.createGain(); lg.gain.value = 0.35; hp.connect(lp); lp.connect(lg); lg.connect(sum);
    // breath
    var nz = ac.createBufferSource(); nz.buffer = noiseBuf(ac); nz.loop = true;
    var nbp = ac.createBiquadFilter(); nbp.type = "bandpass"; nbp.frequency.value = 1900; nbp.Q.value = 0.9;
    var ng = ac.createGain(); ng.gain.value = 0.05; nz.connect(nbp); nbp.connect(ng); ng.connect(sum);
    // amplitude envelope with a gentle swell and release
    var env = ac.createGain(); sum.connect(env); env.connect(dest);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain * 0.8, t + 0.12);
    env.gain.linearRampToValueAtTime(gain, t + Math.min(1.2, total * 0.3));
    env.gain.setValueAtTime(gain, t + total - 0.35);
    env.gain.exponentialRampToValueAtTime(0.0001, t + total + 0.25);
    // vibrato (cents), arriving after the note settles
    var lfo = ac.createOscillator(), lg2 = ac.createGain(); lfo.frequency.value = 5.4;
    lg2.gain.setValueAtTime(0, t); lg2.gain.linearRampToValueAtTime(16, t + 0.9);
    lfo.connect(lg2); lg2.connect(o1.detune); lg2.connect(o2.detune);
    // scoop into the first note
    [o1, o2].forEach(function (o) { o.detune.setValueAtTime(-80, t); o.detune.linearRampToValueAtTime(0, t + 0.16); });
    // pitch line
    var tt = t;
    notes.forEach(function (n, i) {
      [o1, o2].forEach(function (o) {
        var fp = o.frequency;
        if (i === 0) { fp.setValueAtTime(n.f, tt); return; }
        if (n.kan) { fp.setValueAtTime(n.kan, tt); fp.setTargetAtTime(n.f, tt + 0.06, 0.02); }
        else if (n.glide) { fp.setValueAtTime(notes[i - 1].f, tt); fp.linearRampToValueAtTime(n.f, tt + n.glide); }
        else fp.setTargetAtTime(n.f, tt, 0.018);
      });
      if (i > 0 && !n.glide) { // a light articulation between separate notes
        env.gain.setValueAtTime(gain, tt - 0.03); env.gain.linearRampToValueAtTime(gain * 0.72, tt); env.gain.linearRampToValueAtTime(gain, tt + 0.08);
      }
      tt += n.dur;
    });
    var end = t + total + 0.4;
    [o1, o2, nz, lfo].forEach(function (x) { x.start(t); x.stop(end); });
    return total;
  }
  // Builds one shehnai phrase from a raga scale, moving mostly by step and resting on Sa, Ga or Pa.
  function ragaWalk(scale, lo, hi) {
    var notes = [];
    for (var oct = -12; oct <= 24; oct += 12) scale.forEach(function (s) { var v = s + oct; if (v >= lo && v <= hi) notes.push(v); });
    notes.sort(function (a, b) { return a - b; });
    var i = notes.indexOf(0);
    return {
      notes: notes,
      phrase: function (len, startOn) {
        if (startOn !== undefined && notes.indexOf(startOn) >= 0) i = notes.indexOf(startOn);
        var out = [notes[i]];
        for (var k = 1; k < len; k++) {
          var mid = notes.length * 0.45, steps = i < mid ? [1, 1, 2, -1] : [-1, -1, -2, 1];
          i = Math.max(0, Math.min(notes.length - 1, i + pick(steps)));
          out.push(notes[i]);
        }
        var rest = [0, 4, 7, 12].filter(function (r) { return notes.indexOf(r) >= 0; }), last = out[out.length - 1], best = rest[0];
        rest.forEach(function (r) { if (Math.abs(r - last) < Math.abs(best - last)) best = r; });
        out.push(best); i = notes.indexOf(best);
        return out;
      },
    };
  }
  // Call and response: the shehnai sings a phrase, the sitar answers with its closing notes.
  function mangalTrack(scale, sa) {
    var walk = ragaWalk(scale, -5, 14), turn = 0;
    return function (ac, s, t) {
      var len = 3 + Math.floor(rnd() * 4), semis = walk.phrase(len, turn === 0 ? 0 : undefined);
      var notes = semis.map(function (n, k) {
        var last = k === semis.length - 1;
        var d = last ? pick([2.2, 2.6, 3.0]) : pick([0.55, 0.75, 0.9, 1.2, 1.6]);
        var prev = k > 0 ? semis[k - 1] : null, glide = prev !== null && Math.abs(n - prev) <= 2 && rnd() < 0.5 ? 0.16 + rnd() * 0.2 : 0;
        var kan = !glide && prev !== null && rnd() < 0.22 ? hz(sa * 2, n + 2) : 0;
        return { f: hz(sa * 2, n), dur: d, glide: glide, kan: kan };
      });
      var dur = shehnaiPhrase(ac, s.reed, t, notes, 0.5);
      // the sitar answers with the phrase's last two or three notes, an octave below, after a breath
      var ans = semis.slice(-pick([2, 3])), ta = t + dur + 0.9;
      ans.forEach(function (n, k) {
        var f = hz(sa, n + 12) / 2 * 2; // sitar sits in the same octave as the reed's middle register
        pluck(ac, s.sitar, ta, hz(sa * 2, n), { dur: 4, bright: 0.72, damp: 0.9985, gain: 0.42, hold: k === ans.length - 1 ? 2.4 : 0.8, release: 0.35,
          from: k > 0 && rnd() < 0.35 ? hz(sa * 2, ans[k - 1]) : null, glide: 0.2 });
        ta += k === ans.length - 1 ? 2.6 : pick([0.6, 0.8, 1.0]);
      });
      turn++;
      return (ta - t) + 1.4 + rnd() * 1.6;
    };
  }

  /* ---------------- tracks ---------------- */
  var C_SHARP3 = 138.59, D3 = 146.83;
  var TRACKS = {
    // ---- Pooja ----
    "pooja-shehnai-bhairav": {
      gain: 0.45, event: "pooja", name: "Mangal shehnai · Bhairav", sub: "Shehnai and sitar in call and response over a tanpura, in Raag Bhairav, the devotional raga of dawn. The most traditional and spiritual choice.",
      setup: function (ac, dest) {
        var b = bus(ac, dest, 0.5, 3.8);
        var reed = ac.createGain(); reed.gain.value = 0.55; reed.connect(b.input);
        return { b: b, reed: reed, sitar: sitarVoice(ac, b.input, C_SHARP3), tan: tanpuraVoice(ac, b.input), mel: mangalTrack([0, 1, 4, 5, 7, 8, 11], C_SHARP3), tNext: 0, mNext: 3.2, bNext: 1.2 };
      },
      tick: function (ac, s, t0, t1) {
        while (s.tNext < t1) s.tNext += tanpuraCycle(ac, s.tan, Math.max(s.tNext, t0), C_SHARP3, 0.15);
        while (s.mNext < t1) s.mNext += s.mel(ac, s, Math.max(s.mNext, t0));
        while (s.bNext < t1) { bell(ac, s.b.input, Math.max(s.bNext, t0), C_SHARP3 * 4, 0.035, 6); s.bNext += 40 + rnd() * 20; }
      },
    },
    "pooja-shehnai-bilawal": {
      gain: 0.45, event: "pooja", name: "Mangal shehnai · Bilawal", sub: "The same shehnai and sitar conversation in Raag Bilawal: brighter and more celebratory, closer to the Bright beginning you chose.",
      setup: function (ac, dest) {
        var b = bus(ac, dest, 0.46, 3.4);
        var reed = ac.createGain(); reed.gain.value = 0.55; reed.connect(b.input);
        return { b: b, reed: reed, sitar: sitarVoice(ac, b.input, C_SHARP3), tan: tanpuraVoice(ac, b.input), mel: mangalTrack([0, 2, 4, 5, 7, 9, 11], C_SHARP3), tNext: 0, mNext: 3.0, bNext: 1.2 };
      },
      tick: function (ac, s, t0, t1) {
        while (s.tNext < t1) s.tNext += tanpuraCycle(ac, s.tan, Math.max(s.tNext, t0), C_SHARP3, 0.15);
        while (s.mNext < t1) s.mNext += s.mel(ac, s, Math.max(s.mNext, t0));
        while (s.bNext < t1) { bell(ac, s.b.input, Math.max(s.bNext, t0), C_SHARP3 * 4, 0.035, 6); s.bNext += 40 + rnd() * 20; }
      },
    },
    "pooja-bhairav": {
      gain: 0.6, event: "pooja", name: "Morning alaap", sub: "Sitar and tanpura in the notes of Raag Bhairav, the traditional raga of dawn and devotion",
      setup: function (ac, dest) {
        var b = bus(ac, dest, 0.42, 3.6);
        return { b: b, sitar: sitarVoice(ac, b.input, C_SHARP3), tan: tanpuraVoice(ac, b.input), mel: alaap([0, 1, 4, 5, 7, 8, 11], C_SHARP3, 1.15), tNext: 0, mNext: 2.4 };
      },
      tick: function (ac, s, t0, t1) {
        while (s.tNext < t1) s.tNext += tanpuraCycle(ac, s.tan, Math.max(s.tNext, t0), C_SHARP3, 0.16);
        while (s.mNext < t1) s.mNext += s.mel(ac, s.sitar, Math.max(s.mNext, t0));
      },
    },
    "pooja-bilawal": {
      gain: 0.58, event: "pooja", name: "Bright beginning", sub: "Sitar and tanpura in Raag Bilawal, a late-morning raga that is bright, settled and joyful",
      setup: function (ac, dest) {
        var b = bus(ac, dest, 0.38, 3.2);
        return { b: b, sitar: sitarVoice(ac, b.input, C_SHARP3), tan: tanpuraVoice(ac, b.input), mel: alaap([0, 2, 4, 5, 7, 9, 11], C_SHARP3, 0.95), tNext: 0, mNext: 2.0 };
      },
      tick: function (ac, s, t0, t1) {
        while (s.tNext < t1) s.tNext += tanpuraCycle(ac, s.tan, Math.max(s.tNext, t0), C_SHARP3, 0.15);
        while (s.mNext < t1) s.mNext += s.mel(ac, s.sitar, Math.max(s.mNext, t0));
      },
    },
    "pooja-bells": {
      gain: 0.65, event: "pooja", name: "Tanpura and temple bells", sub: "A still tanpura drone with distant temple bells and a few sitar notes. The quietest choice.",
      setup: function (ac, dest) {
        var b = bus(ac, dest, 0.55, 4.2);
        return { b: b, sitar: sitarVoice(ac, b.input, C_SHARP3), tan: tanpuraVoice(ac, b.input), tNext: 0, bNext: 3, sNext: 7 };
      },
      tick: function (ac, s, t0, t1) {
        while (s.tNext < t1) s.tNext += tanpuraCycle(ac, s.tan, Math.max(s.tNext, t0), C_SHARP3, 0.18);
        while (s.bNext < t1) { bell(ac, s.b.input, Math.max(s.bNext, t0), pick([C_SHARP3 * 4, C_SHARP3 * 6, C_SHARP3 * 8]), 0.05, 6); s.bNext += 7 + rnd() * 6; }
        while (s.sNext < t1) {
          var t = Math.max(s.sNext, t0);
          pluck(ac, s.sitar, t, C_SHARP3 * 2, { dur: 4, bright: .9, damp: .9985, gain: .38, hold: 2.2, release: .4 });
          pluck(ac, s.sitar, t + 2.4, C_SHARP3 * 3, { dur: 4, bright: .9, damp: .9985, gain: .32, hold: 2.6, release: .5, from: C_SHARP3 * 2 * Math.pow(2, 5 / 12), glide: .3 });
          s.sNext += 14 + rnd() * 6;
        }
      },
    },
    // ---- Evening ----
    "evening-rising": {
      gain: 1.26, event: "evening", name: "Rising", sub: "Warm strings and a climbing arpeggio. Hopeful and cinematic, it grows gently as it goes.",
      setup: function (ac, dest) {
        var b = bus(ac, dest, 0.45, 3.4);
        return { b: b, e: echo(ac, b.input, 0.375, 0.32, 0.4), bar: 0, next: 0 };
      },
      tick: function (ac, s, t0, t1) {
        var prog = [[0, 4, 7, 11], [7, 11, 14, 19], [9, 12, 16, 21], [5, 9, 12, 16]], BAR = 4;
        while (s.next < t1) {
          var t = Math.max(s.next, t0), ch = prog[s.bar % 4], layer = Math.floor(s.bar / 4) % 3;
          pad(ac, s.b.input, t, ch.map(function (n) { return hz(D3, n); }), BAR, 0.09, 1500 + layer * 500);
          sub(ac, s.b.input, t, hz(D3 / 2, ch[0]), BAR, 0.07);
          var arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 24, ch[3] + 12, ch[1] + 12, ch[2] + 12];
          arp.forEach(function (n, k) { softPluck(ac, s.e, t + k * 0.5, hz(D3, n), 0.06 + (k === 0 ? 0.02 : 0), 1.1); });
          if (layer >= 1) fmBell(ac, s.b.input, t + 2, hz(D3, ch[3] + 24), 0.035);
          if (layer === 2) fmBell(ac, s.b.input, t + 3, hz(D3, ch[2] + 24), 0.03);
          s.bar++; s.next = t + BAR;
        }
      },
    },
    "evening-constellation": {
      gain: 1.5, event: "evening", name: "Constellation", sub: "Shimmering bells over a slow, glowing pad. Full of wonder, and lighter than Rising.",
      setup: function (ac, dest) {
        var b = bus(ac, dest, 0.6, 4.5);
        return { b: b, e: echo(ac, b.input, 0.5, 0.38, 0.5), bar: 0, next: 0, tw: 0.6 };
      },
      tick: function (ac, s, t0, t1) {
        var prog = [[5, 9, 12, 16], [0, 4, 7, 11], [9, 12, 16, 19], [7, 11, 14, 18]], BAR = 5;
        var penta = [0, 2, 4, 7, 9];
        while (s.next < t1) {
          var t = Math.max(s.next, t0), ch = prog[s.bar % 4];
          pad(ac, s.b.input, t, ch.map(function (n) { return hz(D3, n); }), BAR, 0.075, 1100);
          sub(ac, s.b.input, t, hz(D3 / 2, ch[0]), BAR, 0.05);
          s.bar++; s.next = t + BAR;
        }
        while (s.tw < t1) {
          var tt = Math.max(s.tw, t0);
          fmBell(ac, s.e, tt, hz(D3 * 4, pick(penta) + pick([0, 0, 12])), 0.03 + rnd() * 0.02);
          s.tw += pick([0.5, 0.75, 1, 1.25, 1.5]);
        }
      },
    },
    "evening-pulse": {
      gain: 1.15, event: "evening", name: "Heartbeat", sub: "A soft heartbeat under a bright, moving riff. The most celebratory and modern choice.",
      setup: function (ac, dest) {
        var b = bus(ac, dest, 0.35, 2.8);
        return { b: b, e: echo(ac, b.input, 0.326, 0.28, 0.32), bar: 0, next: 0 };
      },
      tick: function (ac, s, t0, t1) {
        var BEAT = 60 / 92, BAR = BEAT * 4;
        var prog = [[9, 12, 16], [5, 9, 12], [0, 4, 7], [7, 11, 14]];
        while (s.next < t1) {
          var t = Math.max(s.next, t0), ch = prog[s.bar % 4], build = Math.min(3, Math.floor(s.bar / 4));
          pad(ac, s.b.input, t, ch.map(function (n) { return hz(D3, n + 12); }), BAR, 0.065, 1700);
          sub(ac, s.b.input, t, hz(D3 / 2, ch[0]), BAR, 0.08);
          heartbeat(ac, s.b.input, t, 0.22); if (build >= 1) heartbeat(ac, s.b.input, t + BEAT * 2, 0.16);
          var riff = [0, 1, 2, 1, 0, 2, 1, 2];
          if (build >= 0) riff.forEach(function (r, k) { softPluck(ac, s.e, t + k * BEAT / 2, hz(D3, ch[r] + 24), k % 2 ? 0.035 : 0.05, 0.6); });
          if (build >= 2) fmBell(ac, s.b.input, t + BEAT * 3, hz(D3, ch[2] + 36), 0.025);
          s.bar++; s.next = t + BAR;
        }
      },
    },
    "evening-yaman": {
      gain: 0.67, event: "evening", name: "Evening raga", sub: "Sitar in Raag Yaman, the classic evening raga, over a tanpura and warm strings. Brings the Pooja's Indian roots into the night.",
      setup: function (ac, dest) {
        var b = bus(ac, dest, 0.45, 3.6);
        return { b: b, sitar: sitarVoice(ac, b.input, D3), tan: tanpuraVoice(ac, b.input), mel: alaap([0, 2, 4, 6, 7, 9, 11], D3, 1.0), tNext: 0, mNext: 3, pNext: 0, bar: 0 };
      },
      tick: function (ac, s, t0, t1) {
        while (s.tNext < t1) s.tNext += tanpuraCycle(ac, s.tan, Math.max(s.tNext, t0), D3, 0.13);
        while (s.mNext < t1) s.mNext += s.mel(ac, s.sitar, Math.max(s.mNext, t0));
        var prog = [[0, 4, 7, 14], [2, 6, 9, 14], [0, 4, 7, 11], [-3, 2, 6, 9]];
        while (s.pNext < t1) { var t = Math.max(s.pNext, t0); pad(ac, s.b.input, t, prog[s.bar % 4].map(function (n) { return hz(D3, n); }), 6, 0.05, 1100); s.bar++; s.pNext = t + 6; }
      },
    },
  };
  M.tracks = TRACKS;
  M.list = function (event) { return Object.keys(TRACKS).filter(function (k) { return TRACKS[k].event === event; }); };

  /* ---------------- live playback with a look-ahead scheduler ---------------- */
  var live = null;
  M.start = function (id, ac, dest, level) {
    if (!TRACKS[id] || !ac) return;
    if (live && live.id === id) return;
    M.stop(0.8);
    // "ambient" respects the iPhone silent switch, so a phone on silent stays silent.
    if (navigator.audioSession) { try { navigator.audioSession.type = "ambient"; } catch (e) {} }
    var tr = TRACKS[id], st = tr.setup(ac, dest), t0 = ac.currentTime + 0.1;
    // shift the track's own clock to now
    Object.keys(st).forEach(function (k) { if (typeof st[k] === "number" && /next|Next|tw/.test(k)) st[k] += t0; });
    st.b.out.gain.setValueAtTime(0.0001, ac.currentTime);
    st.b.out.gain.exponentialRampToValueAtTime((level || 0.8) * (tr.gain || 1), ac.currentTime + 3);
    var me = { id: id, ac: ac, st: st, timer: 0 };
    function loop() { if (live !== me) return; tr.tick(ac, st, ac.currentTime, ac.currentTime + 0.6); }
    me.timer = setInterval(loop, 150); loop();
    live = me;
  };
  M.stop = function (fade) {
    if (!live) return;
    var me = live, ac = me.ac, g = me.st.b.out.gain; live = null;
    clearInterval(me.timer);
    g.cancelScheduledValues(ac.currentTime); g.setValueAtTime(Math.max(g.value, 0.0001), ac.currentTime);
    g.exponentialRampToValueAtTime(0.0001, ac.currentTime + (fade || 1.5));
    setTimeout(function () { try { me.st.b.out.disconnect(); } catch (e) {} }, ((fade || 1.5) + 8) * 1000);
  };
  M.playing = function () { return live ? live.id : null; };

  /* ---------------- offline render, for testing levels ---------------- */
  M.render = function (id, seconds) {
    var O = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var ac = new O(2, 44100 * seconds, 44100), tr = TRACKS[id], st = tr.setup(ac, ac.destination);
    st.b.out.gain.value = 0.8 * (tr.gain || 1);
    tr.tick(ac, st, 0, seconds - 2);
    return ac.startRendering();
  };
})();
