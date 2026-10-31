/* VOLVE Launch Pooja — the diya, the blessings and the keepsake. Uses shared/core.js (window.Volve). */
(function () {
  "use strict";
  var V = window.Volve, C = window.VOLVE_CONFIG, $ = V.$, $$ = V.$$;
  var EV = "pooja";
  var html = document.documentElement, body = document.body;

  var BLESSINGS = {
    peace:   { en: "Peace",   hi: "शांति",    note: 138.59, msg: "May you always find a quiet centre, and a place to return to it." },
    joy:     { en: "Joy",     hi: "आनंद",     note: 174.61, msg: "May joy find you often: in music, in movement, and in the people beside you." },
    harmony: { en: "Harmony", hi: "सामंजस्य", note: 207.65, msg: "May your mind, your heart and your body learn to keep the same rhythm." },
    growth:  { en: "Growth",  hi: "उन्नति",   note: 277.18,  msg: "May every small step carry you further than you imagined." },
  };
  var GENERAL = { en: "Blessings", hi: "शुभ आरंभ", msg: "Every meaningful beginning starts with gratitude. Thank you for being part of ours." };
  var chosen = null;

  V.fillDetails(EV);
  V.wireActions(EV, "You’re invited to the Launch Pooja of VOLVE, " + V.dateLong(C.events[EV].date) + " at " + V.time12(C.events[EV].start) + ".");
  V.initMotionToggle();
  var TRACK = (C.sound && C.sound.pooja) || "pooja-bilawal";
  V.initSoundToggle(function (auto) {
    if (!auto) V.sound.bell(277.18, .1); // the diya's own bell rings on a first tap there
    V.sound.music(true, TRACK);
  });
  V.showInAppHint();

  /* ---------- greeting ---------- */
  function greet() {
    var n = V.getName();
    $("#greeting").textContent = n ? "Dear " + n + "," : "Dear friend,";
    $("#keep-name").value = n;
  }
  greet();
  document.addEventListener("volve:name", greet);

  /* ---------- top bar gains a backing once the page scrolls ---------- */
  var bar = $(".topbar");
  function onScroll() { bar.classList.toggle("stuck", window.scrollY > 70); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ---------- opening animation ---------- */
  function playOpening() {
    if (V.reducedMotion()) return;
    html.classList.remove("anim"); void html.offsetWidth; html.classList.add("anim");
  }
  playOpening();

  /* ---------- scrolling to the invitation ---------- */
  function goInvite(focus) {
    var t = $("#invitation");
    t.scrollIntoView({ behavior: V.reducedMotion() ? "auto" : "smooth", block: "start" });
    revealCard();
    if (focus) setTimeout(function () { t.focus({ preventScroll: true }); }, V.reducedMotion() ? 0 : 650);
  }
  $$("[data-go=invitation]").forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); goInvite(true); });
  });

  var revealed = false;
  function revealCard() {
    if (revealed || V.reducedMotion()) return;
    revealed = true;
    var c = $("#card"); c.classList.remove("reveal"); void c.offsetWidth; c.classList.add("reveal");
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { revealCard(); io.disconnect(); } });
    }, { threshold: 0.25 });
    io.observe($("#card"));
  }

  /* ---------- light the diya ---------- */
  var diya = $("#diya"), cue = $("#diya-cue"), step = $("#name-step");
  function light() {
    if (body.classList.contains("lit")) {
      // Already lit: tapping again simply brightens the glow for a moment.
      diya.animate && !V.reducedMotion() && diya.animate([{ filter: "brightness(1)" }, { filter: "brightness(1.15)" }, { filter: "brightness(1)" }], { duration: 900 });
      return;
    }
    body.classList.add("lit");
    diya.setAttribute("aria-pressed", "true");
    $("#diya-label").textContent = "The diya is lit";
    cue.textContent = "The lamp is lit. Welcome.";
    setTimeout(function () { var m = $(".morning-light"); m && m.classList.add("settled"); }, 2800);
    V.sound.bell(277.18, .18);
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
    setTimeout(function () {
      var n = V.getName();
      $("#name-input").value = n;
      $("#name-q").textContent = n ? "Welcome, " + n + ". Shall we continue?" : "Welcome. May we greet you by name?";
      step.hidden = false;
      $(".view-link").hidden = true;
    }, V.reducedMotion() ? 0 : 900);
  }
  diya.addEventListener("click", light);

  step.addEventListener("submit", function (e) {
    e.preventDefault();
    var n = V.cleanName($("#name-input").value);
    if (n) V.setName(n);
    step.hidden = true; $(".view-link").hidden = false;
    goInvite(true);
  });
  $("#name-skip").addEventListener("click", function () {
    step.hidden = true; $(".view-link").hidden = false;
    goInvite(true);
  });

  /* ---------- blessings ---------- */
  $$(".bless").forEach(function (b) {
    b.addEventListener("click", function () {
      var k = b.getAttribute("data-b");
      chosen = k;
      $$(".bless").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      $$(".v").forEach(function (v) { v.classList.remove("on"); });
      var v = $(".v-" + k); void v.getBoundingClientRect(); v.classList.add("on");
      var msg = $("#bless-msg");
      msg.textContent = BLESSINGS[k].msg;
      if (msg.animate && !V.reducedMotion()) msg.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 600, easing: "ease-out" });
      $("#keep-bless-note").textContent = "Your card will carry the blessing of " + BLESSINGS[k].en.toLowerCase() + ".";
      V.sound.bell(BLESSINGS[k].note * 2, .1);
    });
  });

  /* ---------- keepsake (drawn on the guest's phone; nothing is uploaded) ---------- */
  var keepBlob = null;
  function diyaImage() {
    var svg = $("#diya svg").cloneNode(true);
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", "400"); svg.setAttribute("height", "340");
    var fw = svg.querySelector(".flame-wrap"); fw.removeAttribute("class"); fw.setAttribute("style", "opacity:1");
    var halo = svg.querySelector(".halo"); halo.removeAttribute("class");
    halo.setAttribute("transform", "translate(100 58) scale(1.3) translate(-100 -58)");
    var src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    return V.loadImage(src);
  }
  function drawKeepsake(name) {
    var b = chosen ? BLESSINGS[chosen] : GENERAL;
    var W = 1080, H = 1350;
    var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var x = cv.getContext("2d");
    return Promise.all([
      V.fontsReady(['500 110px "Lora"', 'italic 400 46px "Lora"', '500 26px "Poppins"', '400 64px "Tiro Deva"']),
      V.loadImage(V.asset("/assets/brand/volve-logo-bronze.svg")),
      diyaImage(),
    ]).then(function (r) {
      var logo = r[1], d = r[2];
      // ground and morning light
      x.fillStyle = "#FBF6EC"; x.fillRect(0, 0, W, H);
      var g = x.createRadialGradient(W / 2, 330, 20, W / 2, 330, 640);
      g.addColorStop(0, "rgba(255,214,140,.55)"); g.addColorStop(.5, "rgba(255,228,180,.18)"); g.addColorStop(1, "rgba(255,240,215,0)");
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      // frame
      x.strokeStyle = "rgba(169,121,44,.7)"; x.lineWidth = 3; x.strokeRect(44, 44, W - 88, H - 88);
      x.strokeStyle = "rgba(169,121,44,.4)"; x.lineWidth = 1.5; x.strokeRect(62, 62, W - 124, H - 124);
      [[44, 44], [W - 44, 44], [44, H - 44], [W - 44, H - 44]].forEach(function (p) {
        x.fillStyle = "#FBF6EC"; x.beginPath(); x.arc(p[0], p[1], 20, 0, 7); x.fill();
        x.strokeStyle = "#E2A43A"; x.lineWidth = 3; x.beginPath(); x.arc(p[0], p[1], 13, 0, 7); x.stroke();
        x.fillStyle = "#DE7F27"; x.beginPath(); x.arc(p[0], p[1], 6, 0, 7); x.fill();
      });
      x.textAlign = "center"; x.textBaseline = "alphabetic";
      // om and lit diya
      x.fillStyle = "#C96A1A"; x.font = '400 64px "Tiro Deva", serif'; x.fillText("ॐ", W / 2, 168);
      x.drawImage(d, W / 2 - 200, 170, 400, 340);
      // name
      x.fillStyle = "#6A4E2F"; x.font = 'italic 400 44px "Lora", Georgia, serif';
      x.fillText(name ? "A blessing for " + name : "A blessing for you", W / 2, 590);
      // blessing word
      x.fillStyle = "#34200D"; x.font = '500 112px "Lora", Georgia, serif'; x.fillText(b.en, W / 2, 716);
      x.fillStyle = "#C96A1A"; x.font = '400 62px "Tiro Deva", serif'; x.fillText(b.hi, W / 2, 806);
      // rule
      x.strokeStyle = "#A9792C"; x.lineWidth = 2;
      x.beginPath(); x.moveTo(W / 2 - 120, 856); x.lineTo(W / 2 - 18, 856); x.moveTo(W / 2 + 18, 856); x.lineTo(W / 2 + 120, 856); x.stroke();
      x.save(); x.translate(W / 2, 856); x.rotate(Math.PI / 4); x.fillStyle = "#A9792C"; x.fillRect(-7, -7, 14, 14); x.restore();
      // message
      x.fillStyle = "#45301A"; x.font = 'italic 400 46px "Lora", Georgia, serif';
      V.wrapText(x, b.msg, 780).forEach(function (l, i) { x.fillText(l, W / 2, 940 + i * 64); });
      // brand and occasion (no personal details beyond the optional first name)
      var lw = 330, lh = lw * 456 / 1428;
      x.drawImage(logo, W / 2 - lw / 2, 1112, lw, lh);
      x.fillStyle = "#86601F"; x.font = '500 24px "Poppins", Arial, sans-serif';
      if (x.letterSpacing !== undefined) x.letterSpacing = "6px";
      x.fillText(("Launch Pooja · " + V.dateShort(C.events[EV].date)).toUpperCase(), W / 2, 1262);
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
      img.alt = "Your blessing card" + (n ? " for " + n : "") + ": " + (chosen ? BLESSINGS[chosen].en : GENERAL.en);
      $("#keep-out").hidden = false;
      btn.disabled = false; btn.textContent = "Create it again";
      $("#keep-out").scrollIntoView({ behavior: V.reducedMotion() ? "auto" : "smooth", block: "nearest" });
    }).catch(function () {
      btn.disabled = false; btn.textContent = "Create my blessing card";
      V.toast("The card couldn’t be drawn on this device. The invitation image above can still be saved.");
    });
  });
  function keepName() { return "VOLVE_Blessing" + (chosen ? "_" + BLESSINGS[chosen].en : "") + ".png"; }
  $("#keep-save").addEventListener("click", function () { if (keepBlob) V.saveImage(keepBlob, keepName(), "Your blessing card"); });
  var shareBtn = $("#keep-share");
  shareBtn.addEventListener("click", function () {
    if (!keepBlob) return;
    var f; try { f = new File([keepBlob], keepName(), { type: "image/png" }); } catch (e) {}
    if (f && navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f] }).catch(function () {});
    else V.saveImage(keepBlob, keepName(), "Your blessing card");
  });

  /* ---------- replay ---------- */
  $("#replay").addEventListener("click", function () {
    body.classList.remove("lit"); var ml = $(".morning-light"); ml && ml.classList.remove("settled");
    diya.setAttribute("aria-pressed", "false");
    $("#diya-label").textContent = "Light the diya";
    cue.textContent = "Tap the diya to light the welcome";
    step.hidden = true; $(".view-link").hidden = false;
    V.sound.stopDrone();
    chosen = null;
    $$(".bless").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
    $$(".v").forEach(function (v) { v.classList.remove("on"); });
    $("#bless-msg").textContent = GENERAL.msg.split(". ")[0] + ".";
    revealed = false;
    window.scrollTo({ top: 0, behavior: V.reducedMotion() ? "auto" : "smooth" });
    setTimeout(function () { playOpening(); diya.focus({ preventScroll: true }); }, V.reducedMotion() ? 0 : 500);
  });
})();
