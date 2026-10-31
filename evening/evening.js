/* VOLVE Evening Launch — the point of light, the four pillars, your constellation and the keepsake.
   Uses shared/core.js (window.Volve). */
(function () {
  "use strict";
  var V = window.Volve, C = window.VOLVE_CONFIG, $ = V.$, $$ = V.$$;
  var EV = "evening";
  var html = document.documentElement;
  html.classList.add("js");

  var ORDER = ["arts", "movement", "community", "transformation"];
  var P = {
    arts: {
      name: "Arts", color: "#FADEA0", note: 587.33, line: "Room to express.",
      msg: "Bring the idea you’ve been carrying around. Here it gets space, light and a mirror.",
      human: "For the performer in you, and the one who has never tried.",
      mark: "Then bring what you’ve been wanting to make. There is room for it here.",
    },
    movement: {
      name: "Movement", color: "#F0C078", note: 659.25, line: "Freedom to discover.",
      msg: "Many styles under one roof, and a floor that’s yours to explore.",
      human: "Come curious. Your body already knows more than you think.",
      mark: "Then come as you are, and let’s find out where you go.",
    },
    community: {
      name: "Community", color: "#F2A953", note: 739.99, line: "People to belong with.",
      msg: "The friend you meet in the back row. The applause after a first performance.",
      human: "Here, nobody moves alone.",
      mark: "Then you already belong. Come and meet the rest of us.",
    },
    transformation: {
      name: "Transformation", color: "#D9893A", note: 880, line: "Space to become.",
      msg: "Not overnight. One class, one breath, one rehearsal at a time.",
      human: "Then one day you notice how far you’ve come.",
      mark: "Then this is a beginning for both of us. We’re glad to share it with you.",
    },
  };
  var MARK_KEY = "volve.invite.evening.mark";
  var mine = V.store.get(MARK_KEY);
  if (!P[mine]) mine = null;

  V.fillDetails(EV);
  V.wireActions(EV, "You’re invited to the Evening Launch of VOLVE, " + V.dateLong(C.events[EV].date) + " at " + V.time12(C.events[EV].start) + ".");
  V.initMotionToggle();
  var TRACK = (C.sound && C.sound.evening) || "evening-pulse";
  V.initSoundToggle(function (auto) { if (!auto) V.sound.chime(587.33, .08); V.sound.music(true, TRACK); });
  V.showInAppHint();

  /* ---------- top bar ---------- */
  var bar = $(".topbar");
  function onScroll() { bar.classList.toggle("stuck", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ---------- greeting and name ---------- */
  function greet() {
    var n = V.getName();
    $("#greeting").textContent = n ? "Dear " + n + "," : "Dear friend,";
    $("#keep-name").value = n;
    if (mine) renderMine(false);
  }
  document.addEventListener("volve:name", greet);

  /* ---------- 1 · point of light ---------- */
  var lockup = $("#lockup"), spark = $("#spark"), cue = $("#spark-cue"), intro = $("#top");
  function wake() {
    if (lockup.classList.contains("awake")) return;
    lockup.classList.add("awake"); intro.classList.add("woke");
    cue.textContent = "Welcome to VOLVE";
    [587.33, 739.99, 880].forEach(function (f, i) { setTimeout(function () { V.sound.chime(f, .08); }, i * 220); });
  }
  spark.insertAdjacentHTML("beforeend", '<span class="ripple" aria-hidden="true"></span>');
  spark.addEventListener("click", wake);
  $("#spark-cta").addEventListener("click", wake);
  lockup.addEventListener("click", wake); // the dimmed logo itself is also a target
  if (V.reducedMotion()) { lockup.classList.add("awake"); intro.classList.add("woke"); cue.textContent = ""; }

  /* ---------- scrolling ---------- */
  function go(id, focus) {
    var t = $("#" + id);
    t.scrollIntoView({ behavior: V.reducedMotion() ? "auto" : "smooth", block: "start" });
    if (id === "invitation") revealCard();
    if (focus) setTimeout(function () { t.setAttribute("tabindex", "-1"); t.focus({ preventScroll: true }); }, V.reducedMotion() ? 0 : 650);
  }
  $$("[data-go]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      if (a.getAttribute("data-go") !== "invitation") wake();
      go(a.getAttribute("data-go"), true);
    });
  });
  var revealed = false;
  function revealCard() {
    if (revealed || V.reducedMotion()) return;
    revealed = true;
    var c = $("#card"); c.classList.remove("reveal"); void c.offsetWidth; c.classList.add("reveal");
    if (mine) V.sound.chime(P[mine].note / 2, .08);
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { revealCard(); io.disconnect(); } }); }, { threshold: .3 });
    io.observe($("#card"));
  }

  /* ---------- 2 · the constellation ---------- */
  var seen = {};
  var art = $("#pillar-art"), actx = art.getContext("2d"), artPillar = null, artStart = 0, raf = 0;
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16); return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }
  function glowDot(ctx, x, y, r, col, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, rgba(col, a)); g.addColorStop(.25, rgba(col, a * .5)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, 7); ctx.fill();
    ctx.fillStyle = rgba("#FFF6DE", Math.min(1, a + .1)); ctx.beginPath(); ctx.arc(x, y, r * .6, 0, 7); ctx.fill();
  }
  // Each pillar's visual expression, drawn at time t (seconds). Kept to a few hundred strokes per frame.
  var DRAW = {
    arts: function (c, t, W, H, col) {
      // a brushstroke drawn across the frame, with sparks lifting off it
      var p = Math.min(1, t / 1.6), N = 70;
      c.lineCap = "round";
      for (var i = 0; i < N * p; i++) {
        var u = i / N, x = 60 + u * (W - 120), y = H * .62 - Math.sin(u * Math.PI) * H * .32 + Math.sin(u * 9) * 4;
        var w = 3 + Math.sin(u * Math.PI) * 14;
        c.strokeStyle = rgba(col, .55 + .35 * Math.sin(u * Math.PI)); c.lineWidth = w;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + 6, y - 1); c.stroke();
      }
      for (var k = 0; k < 9; k++) {
        var ph = (t * .6 + k * .37) % 1, sx = 90 + ((k * 71) % (W - 180)), sy = H * .5 - ph * H * .4 - (k % 3) * 10;
        if (p > k / 9) glowDot(c, sx, sy, 2.2, "#FADEA0", .9 * (1 - ph));
      }
    },
    movement: function (c, t, W, H, col) {
      // three phrases of movement flowing past each other
      for (var j = 0; j < 3; j++) {
        c.beginPath();
        for (var x = 20; x <= W - 20; x += 6) {
          var y = H / 2 + Math.sin(x / (70 + j * 18) + t * (1.4 + j * .35) + j) * (34 - j * 8) * Math.min(1, t / 1.2);
          x === 20 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        c.strokeStyle = rgba(col, .85 - j * .22); c.lineWidth = 2.6 - j * .6; c.stroke();
      }
      var lx = 20 + ((t * 120) % (W - 40));
      glowDot(c, lx, H / 2 + Math.sin(lx / 70 + t * 1.4) * 34 * Math.min(1, t / 1.2), 3, "#FADEA0", .95);
    },
    community: function (c, t, W, H, col) {
      // people arriving and joining a circle
      var n = 9, cx = W / 2, cy = H / 2, R = H * .34, p = Math.min(1, t / 1.8), pts = [];
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + i * 2 * Math.PI / n, arrive = Math.min(1, Math.max(0, p * n - i * .7));
        var far = 1 + (1 - arrive) * 1.6;
        pts.push([cx + Math.cos(a) * R * far * 1.6, cy + Math.sin(a) * R * far, arrive]);
      }
      c.strokeStyle = rgba(col, .45); c.lineWidth = 1.2; c.beginPath();
      pts.forEach(function (q, i) { var r = pts[(i + 1) % n]; if (q[2] > .99 && r[2] > .99) { c.moveTo(q[0], q[1]); c.lineTo(r[0], r[1]); } });
      c.stroke();
      pts.forEach(function (q, i) {
        var pulse = .65 + .35 * Math.sin(t * 2.2 - i * .7);
        glowDot(c, q[0], q[1], 3.2, col, (.4 + .5 * q[2]) * pulse);
      });
      if (p >= 1) glowDot(c, cx, cy, 3.6, "#FADEA0", .5 + .3 * Math.sin(t * 1.5));
    },
    transformation: function (c, t, W, H, col) {
      // an enso closing slowly; a seed of light becomes a diamond
      var cx = W / 2, cy = H / 2, R = H * .36, p = Math.min(1, t / 2.2);
      c.lineCap = "round";
      for (var i = 0; i < 120 * p; i++) {
        var a = -Math.PI * .6 + (i / 120) * Math.PI * 1.88;
        c.strokeStyle = rgba(col, .25 + .6 * Math.sin((i / 120) * Math.PI)); c.lineWidth = 2 + 6 * Math.sin((i / 120) * Math.PI);
        c.beginPath(); c.arc(cx, cy, R, a, a + .03); c.stroke();
      }
      var s = 4 + 10 * Math.max(0, (t - 1.4) / 1.4); s = Math.min(s, 14);
      c.save(); c.translate(cx, cy); c.rotate(Math.PI / 4 + Math.min(1, t / 3) * Math.PI / 2);
      c.strokeStyle = rgba("#FADEA0", .9); c.lineWidth = 1.6; c.strokeRect(-s, -s, s * 2, s * 2); c.restore();
      glowDot(c, cx, cy, 2.6, "#FADEA0", .8);
    },
  };
  function drawArt(now) {
    var W = art.width, H = art.height;
    actx.clearRect(0, 0, W, H);
    if (!artPillar) return;
    var t = V.reducedMotion() ? 6 : (now - artStart) / 1000;
    DRAW[artPillar](actx, t, W, H, P[artPillar].color);
    if (!V.reducedMotion() && document.visibilityState !== "hidden" && t < 40) raf = requestAnimationFrame(drawArt);
  }
  function showPillar(k, fromStar) {
    var p = P[k];
    seen[k] = true;
    $$(".star").forEach(function (s) {
      var on = s.getAttribute("data-p") === k;
      s.setAttribute("aria-pressed", on ? "true" : "false");
      if (seen[s.getAttribute("data-p")]) s.classList.add("seen");
    });
    // join neighbouring stars once both have been explored
    ORDER.forEach(function (a, i) { var b = ORDER[(i + 1) % 4]; if (seen[a] && seen[b]) $("#edge-" + i).classList.add("on"); });
    var all = ORDER.every(function (o) { return seen[o]; });
    $("#sky").classList.toggle("complete", all);
    var next = ORDER[(ORDER.indexOf(k) + 1) % 4];
    var pt = $("#panel-text");
    pt.style.setProperty("--c", p.color);
    pt.innerHTML = "<h3>" + p.name + "</h3>" +
      '<p class="line">' + p.line + "</p>" +
      '<p class="msg">' + p.msg + "</p>" +
      '<p class="human">' + p.human + "</p>" +
      (all
        ? '<a class="btn btn-primary next" href="#mark" id="to-mark">Now choose yours</a>'
        : '<button type="button" class="btn next" id="next-pillar">Next: ' + P[next].name + "</button>");
    var nb = $("#next-pillar");
    if (nb) nb.addEventListener("click", function () { showPillar(next); var s = $('.star[data-p="' + next + '"]'); s && s.focus({ preventScroll: true }); });
    var tm = $("#to-mark");
    if (tm) tm.addEventListener("click", function (e) { e.preventDefault(); go("mark", false); setTimeout(function () { $(".mark-btn").focus({ preventScroll: true }); }, 600); });
    cancelAnimationFrame(raf); artPillar = k; artStart = performance.now(); raf = requestAnimationFrame(drawArt);
    V.sound.chime(p.note, .12);
    if (!fromStar && $("#panel").getBoundingClientRect().top > window.innerHeight * .7) {
      $("#panel").scrollIntoView({ behavior: V.reducedMotion() ? "auto" : "smooth", block: "nearest" });
    }
  }
  $$(".star").forEach(function (s) { s.addEventListener("click", function () { showPillar(s.getAttribute("data-p"), true); }); });
  $$("[data-start]").forEach(function (b) { b.addEventListener("click", function () { showPillar(b.getAttribute("data-start")); }); });
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible" && artPillar) { cancelAnimationFrame(raf); raf = requestAnimationFrame(drawArt); } });

  /* ---------- 3 · your constellation ---------- */
  // A small seeded generator, so the same name and pillar always give the same sky.
  function seeded(str) {
    var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h += 0x6D2B79F5; var t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // Points in a unit square; each pillar has its own figure.
  function figure(k, rnd) {
    var pts = [], j = function (a) { return (rnd() - .5) * a; };
    if (k === "arts") { for (var i = 0; i < 9; i++) { var u = i / 8; pts.push([.14 + u * .72 + j(.03), .66 - Math.sin(u * Math.PI) * .36 + j(.05)]); } }
    if (k === "movement") { for (var i2 = 0; i2 < 10; i2++) { var u2 = i2 / 9; pts.push([.1 + u2 * .8, .5 + Math.sin(u2 * Math.PI * 2.2 + .4) * .2 + j(.04)]); } }
    if (k === "community") { for (var i3 = 0; i3 < 8; i3++) { var a = -Math.PI / 2 + i3 * Math.PI / 4 + j(.15); var r = .3 + j(.05); pts.push([.5 + Math.cos(a) * r, .5 + Math.sin(a) * r]); } }
    if (k === "transformation") { for (var i4 = 0; i4 < 11; i4++) { var a4 = i4 * .78 + 1, r4 = .04 + i4 * .034 + j(.01); pts.push([.5 + Math.cos(a4) * r4, .5 + Math.sin(a4) * r4]); } }
    return pts;
  }
  function edgesFor(k, n) {
    var e = []; for (var i = 0; i < n - 1; i++) e.push([i, i + 1]);
    if (k === "community") { e.push([n - 1, 0]); }
    return e;
  }
  V.drawSky = function (ctx, S, k, name, progress, opts) {
    opts = opts || {};
    var rnd = seeded((name || "volve").toLowerCase() + "·" + k);
    var col = P[k].color, pts = figure(k, rnd), edges = edgesFor(k, pts.length);
    var pad = S * (opts.pad || .1), size = S - pad * 2, ox = opts.x || 0, oy = opts.y || 0;
    function X(p) { return ox + pad + p[0] * size; } function Y(p) { return oy + pad + p[1] * size; }
    // background dust, fixed per name
    for (var d = 0; d < 70; d++) {
      var dx = ox + rnd() * S, dy = oy + rnd() * S, dr = rnd() * 1.4 + .3;
      var cxs = ox + S / 2, cys = oy + S / 2;
      if (opts.round && Math.hypot(dx - cxs, dy - cys) > S * .48) continue;
      ctx.fillStyle = rgba("#FADEA0", .12 + rnd() * .35); ctx.beginPath(); ctx.arc(dx, dy, dr * S / 360, 0, 7); ctx.fill();
    }
    var shown = Math.max(0, Math.min(edges.length, progress * edges.length));
    ctx.lineCap = "round"; ctx.strokeStyle = rgba(col, .6); ctx.lineWidth = Math.max(1, S / 300);
    edges.forEach(function (e, i) {
      if (i >= shown) return;
      var f = Math.min(1, shown - i), a = pts[e[0]], b = pts[e[1]];
      ctx.beginPath(); ctx.moveTo(X(a), Y(a)); ctx.lineTo(X(a) + (X(b) - X(a)) * f, Y(a) + (Y(b) - Y(a)) * f); ctx.stroke();
    });
    pts.forEach(function (p, i) {
      if (i > shown + 1) return;
      var big = (k === "transformation" && i === pts.length - 1) || (k === "community" && i === 0) || (k === "arts" && i === 4) || (k === "movement" && i === 0);
      glowDot(ctx, X(p), Y(p), (big ? 5 : 3) * S / 360, big ? "#FADEA0" : col, big ? 1 : .85);
    });
  };
  var myCanvas = $("#my-canvas"), myRaf = 0;
  function renderMine(animate) {
    var k = mine; if (!k) return;
    var name = V.getName();
    var ctx = myCanvas.getContext("2d"), S = myCanvas.width, start = performance.now();
    $("#my-sky").hidden = false;
    $("#my-title").textContent = (name ? name + " · " : "Your constellation · ") + P[k].name;
    $("#my-response").textContent = P[k].mark;
    myCanvas.setAttribute("aria-label", "A constellation drawn for " + (name || "you") + " in the shape of " + P[k].name.toLowerCase());
    cancelAnimationFrame(myRaf);
    (function frame(now) {
      var pr = (!animate || V.reducedMotion()) ? 1 : Math.min(1, (now - start) / 1800);
      ctx.clearRect(0, 0, S, S);
      V.drawSky(ctx, S, k, name, pr, { round: true, pad: .14 });
      if (pr < 1) myRaf = requestAnimationFrame(frame);
    })(start);
    var yp = $("#your-pillar");
    yp.innerHTML = "Your pillar: <b>" + P[k].name + "</b> · " + P[k].line;
    yp.hidden = false;
    $("#keep-note").textContent = "Your keepsake will carry your " + P[k].name.toLowerCase() + " constellation.";
  }
  var step = $("#name-step");
  $$(".mark-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      mine = b.getAttribute("data-m"); V.store.set(MARK_KEY, mine);
      $$(".mark-btn").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      V.sound.chime(P[mine].note, .12); setTimeout(function () { V.sound.chime(P[mine].note * 1.5, .07); }, 260);
      if (!V.getName() && !V.store.get("volve.invite.nameSkipped")) {
        step.hidden = false; $("#my-sky").hidden = true; $("#name-input").focus({ preventScroll: true });
      } else { renderMine(true); }
    });
  });
  step.addEventListener("submit", function (e) {
    e.preventDefault();
    var n = V.cleanName($("#name-input").value);
    if (n) V.setName(n); else V.store.set("volve.invite.nameSkipped", true);
    step.hidden = true; renderMine(true);
    setTimeout(function () { $("#my-sky").scrollIntoView({ behavior: V.reducedMotion() ? "auto" : "smooth", block: "center" }); }, 60);
  });
  $("#name-skip").addEventListener("click", function () {
    V.store.set("volve.invite.nameSkipped", true);
    step.hidden = true; renderMine(true);
    setTimeout(function () { $("#my-sky").scrollIntoView({ behavior: V.reducedMotion() ? "auto" : "smooth", block: "center" }); }, 60);
  });
  if (mine) { $('.mark-btn[data-m="' + mine + '"]').setAttribute("aria-pressed", "true"); }
  greet();

  /* ---------- 5 · keepsake ---------- */
  var keepBlob = null;
  function drawKeepsake(name) {
    var W = 1080, H = 1350, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var x = cv.getContext("2d");
    return Promise.all([
      V.fontsReady(['500 92px "Lora"', 'italic 400 44px "Lora"', '500 24px "Poppins"']),
      V.loadImage(V.asset("/assets/brand/volve-logo-gold.svg")),
    ]).then(function (r) {
      var logo = r[1];
      x.fillStyle = "#000"; x.fillRect(0, 0, W, H);
      var g = x.createRadialGradient(W / 2, 560, 40, W / 2, 560, 620);
      g.addColorStop(0, "rgba(192,120,48,.22)"); g.addColorStop(1, "rgba(192,120,48,0)");
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.strokeStyle = "rgba(209,157,84,.45)"; x.lineWidth = 2; x.strokeRect(46, 46, W - 92, H - 92);
      var lw = 520, lh = lw * 456 / 1428; x.drawImage(logo, W / 2 - lw / 2, 96, lw, lh);
      // constellation
      if (mine) V.drawSky(x, 660, mine, name, 1, { x: W / 2 - 330, y: 270, pad: .08, round: true });
      else ORDER.forEach(function (k, i) { V.drawSky(x, 300, k, name, 1, { x: W / 2 - 300 + (i % 2) * 300, y: 300 + Math.floor(i / 2) * 300, pad: .14, round: true }); });
      x.textAlign = "center";
      x.fillStyle = "#D19D54"; x.font = '500 24px "Poppins", Arial, sans-serif';
      if (x.letterSpacing !== undefined) x.letterSpacing = "7px";
      x.fillText((mine ? P[mine].name : "Arts · Movement · Community · Transformation").toUpperCase(), W / 2, 950);
      if (x.letterSpacing !== undefined) x.letterSpacing = "0px";
      x.fillStyle = "#FADEA0"; x.font = '500 76px "Lora", Georgia, serif';
      x.fillText(name ? "Welcome, " + name + "." : "Welcome to VOLVE.", W / 2, 1046);
      x.fillStyle = "#F0C078"; x.font = 'italic 400 40px "Lora", Georgia, serif';
      var msg = mine ? P[mine].line + " It’s waiting for you at VOLVE." : "A new home for arts, movement and community.";
      V.wrapText(x, msg, 820).forEach(function (l, i) { x.fillText(l, W / 2, 1116 + i * 54); });
      x.fillStyle = "#B08A50"; x.font = '500 22px "Poppins", Arial, sans-serif';
      if (x.letterSpacing !== undefined) x.letterSpacing = "6px";
      x.fillText(("Evening Launch · " + V.dateShort(C.events[EV].date)).toUpperCase(), W / 2, 1258);
      return V.canvasBlob(cv);
    });
  }
  $("#keep-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var n = V.cleanName($("#keep-name").value);
    if (n !== V.getName()) V.setName(n);
    var btn = $("#keep-make"); btn.disabled = true; btn.textContent = "Creating…";
    drawKeepsake(n).then(function (blob) {
      keepBlob = blob;
      var img = $("#keep-img");
      if (img.src && img.src.indexOf("blob:") === 0) URL.revokeObjectURL(img.src);
      img.src = URL.createObjectURL(blob);
      img.alt = "Your VOLVE keepsake" + (n ? " for " + n : "") + (mine ? ", " + P[mine].name : "");
      $("#keep-out").hidden = false; btn.disabled = false; btn.textContent = "Create it again";
      $("#keep-out").scrollIntoView({ behavior: V.reducedMotion() ? "auto" : "smooth", block: "nearest" });
    }).catch(function () {
      btn.disabled = false; btn.textContent = "Create my keepsake";
      V.toast("The keepsake couldn’t be drawn on this device. The invitation image above can still be saved.");
    });
  });
  function keepName() { return "VOLVE_Keepsake" + (mine ? "_" + P[mine].name : "") + ".png"; }
  $("#keep-save").addEventListener("click", function () { if (keepBlob) V.saveImage(keepBlob, keepName(), "Your VOLVE keepsake"); });
  $("#keep-share").addEventListener("click", function () {
    if (!keepBlob) return;
    var f; try { f = new File([keepBlob], keepName(), { type: "image/png" }); } catch (e) {}
    if (f && navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f] }).catch(function () {});
    else V.saveImage(keepBlob, keepName(), "Your VOLVE keepsake");
  });

  /* ---------- replay ---------- */
  $("#replay").addEventListener("click", function () {
    lockup.classList.remove("awake"); intro.classList.remove("woke"); cue.textContent = "";
    V.sound.stopDrone();
    seen = {}; artPillar = null; cancelAnimationFrame(raf); actx.clearRect(0, 0, art.width, art.height);
    $$(".star").forEach(function (s) { s.setAttribute("aria-pressed", "false"); s.classList.remove("seen"); });
    $$(".edge").forEach(function (e) { e.classList.remove("on"); }); $("#sky").classList.remove("complete");
    $("#panel-text").innerHTML = '<p class="panel-hint">Choose a star above, or start with <button type="button" class="inline-btn" data-start="arts">Arts</button>.</p>';
    $("[data-start]").addEventListener("click", function () { showPillar("arts"); });
    revealed = false;
    window.scrollTo({ top: 0, behavior: V.reducedMotion() ? "auto" : "smooth" });
    setTimeout(function () { if (V.reducedMotion()) lockup.classList.add("awake"); spark.focus({ preventScroll: true }); }, V.reducedMotion() ? 0 : 500);
  });
})();
