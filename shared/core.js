/*
 * Shared behaviour for both VOLVE launch invitations:
 * dates, calendar, maps, share and copy, first-name storage (on this device only) and keepsake saving.
 * Nothing a guest enters is sent to any server.
 * Each page adds its own look and signature interaction on top (pooja.js, evening.js).
 */
(function () {
  "use strict";
  var C = window.VOLVE_CONFIG;
  var V = (window.Volve = {});
  var root = document.documentElement.getAttribute("data-root") || "../";

  /* ---------- small helpers ---------- */
  V.$ = function (sel, el) { return (el || document).querySelector(sel); };
  V.$$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  V.reducedMotion = function () {
    return document.documentElement.classList.contains("rm") ||
      (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  };
  V.asset = function (p) {
    // Artifact previews register inlined assets here; deployed pages resolve them relative to the site root.
    if (window.VOLVE_INLINE && window.VOLVE_INLINE[p]) return window.VOLVE_INLINE[p];
    return root + p.replace(/^\//, "");
  };
  var store = {
    get: function (k) { try { var v = window.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del: function (k) { try { window.localStorage.removeItem(k); } catch (e) {} },
  };
  V.store = store;
  V.escape = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  V.uid = function () {
    var a = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  };

  /* ---------- dates ---------- */
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function parts(date) { var p = date.split("-"); return { y: +p[0], m: +p[1], d: +p[2] }; }
  V.weekday = function (date) { var p = parts(date); return DAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()]; };
  V.dateLong = function (date) { var p = parts(date); return V.weekday(date) + ", " + p.d + " " + MONTHS[p.m - 1] + " " + p.y; };
  V.dateShort = function (date) { var p = parts(date); return p.d + " " + MONTHS[p.m - 1] + " " + p.y; };
  V.time12 = function (t) {
    var h = +t.split(":")[0], m = t.split(":")[1];
    var ap = h >= 12 ? "PM" : "AM"; var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ":" + m + " " + ap;
  };
  V.ev = function (id) { return C.events[id]; };

  /* ---------- links ---------- */
  V.pageUrl = function (id) {
    var ev = C.events[id];
    if (C.baseUrl) return C.baseUrl.replace(/\/$/, "") + ev.path;
    return location.href.split("#")[0].split("?")[0];
  };

  /* ---------- calendar ---------- */
  function compact(date, time) { return date.replace(/-/g, "") + "T" + time.replace(":", "") + "00"; }
  function icsEscape(s) { return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
  function fold(line) {
    // RFC 5545: lines over 75 octets are folded. Folding by characters is safe for this ASCII content.
    var out = []; while (line.length > 74) { out.push(line.slice(0, 74)); line = " " + line.slice(74); }
    out.push(line); return out.join("\r\n");
  }
  V.ics = function (id, url) {
    var ev = C.events[id];
    var now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    var lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VOLVE//Launch Invitations//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VTIMEZONE", "TZID:Asia/Kolkata", "BEGIN:STANDARD", "DTSTART:19700101T000000",
      "TZOFFSETFROM:+0530", "TZOFFSETTO:+0530", "TZNAME:IST", "END:STANDARD", "END:VTIMEZONE",
      "BEGIN:VEVENT",
      "UID:volve-" + ev.id + "-" + ev.date + "@myvolve.com",
      "DTSTAMP:" + now,
      "DTSTART;TZID=Asia/Kolkata:" + compact(ev.date, ev.start),
    ];
    // No invented duration: DTEND is written only when an end time is configured.
    if (ev.end) lines.push("DTEND;TZID=Asia/Kolkata:" + compact(ev.date, ev.end));
    lines.push(
      "SUMMARY:" + icsEscape(ev.title),
      "LOCATION:" + icsEscape(C.venue.singleLine),
      C.venue.geo ? "GEO:" + C.venue.geo.lat + ";" + C.venue.geo.lng : "X-VOLVE-NO-GEO:1",
      "DESCRIPTION:" + icsEscape(ev.calendarDescription + (url ? "\n\nInvitation: " + url : "") + "\nDirections: " + C.venue.mapsUrl),
      "URL:" + (url || C.brand.website),
      "END:VEVENT", "END:VCALENDAR"
    );
    return lines.map(fold).join("\r\n") + "\r\n";
  };
  V.googleCalendarUrl = function (id) {
    var ev = C.events[id];
    var s = compact(ev.date, ev.start), e = ev.end ? compact(ev.date, ev.end) : s;
    return "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" + encodeURIComponent(ev.title) +
      "&dates=" + s + "/" + e +
      "&ctz=" + encodeURIComponent(C.timezone) +
      "&location=" + encodeURIComponent(C.venue.singleLine) +
      "&details=" + encodeURIComponent(ev.calendarDescription + "\n\n" + V.pageUrl(id));
  };
  V.isIOS = function () {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  };
  V.inAppBrowser = function () { return /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|; wv\)/i.test(navigator.userAgent); };

  /* ---------- toast ---------- */
  var toastEl, toastT;
  V.toast = function (msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast"; toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("show"); }, 2600);
  };

  /* ---------- copy & share ---------- */
  V.copy = function (text) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta); return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  };
  V.copyLink = function (id) {
    var url = V.pageUrl(id);
    return V.copy(url).then(function (ok) {
      if (ok) V.toast("Link copied");
      else V.showLinkSheet(url);
    });
  };
  V.showLinkSheet = function (url) {
    V.sheet("Copy this link", '<p class="sheet-note">Press and hold the link to copy it.</p><input class="link-field" id="link-field" readonly value="' + V.escape(url) + '" aria-label="Invitation link">', function (el) {
      var f = V.$("#link-field", el); f.focus(); f.select();
    });
  };
  V.share = function (id, text) {
    var ev = C.events[id];
    var url = V.pageUrl(id);
    if (navigator.share) {
      return navigator.share({ title: ev.title, text: text, url: url }).catch(function (e) {
        if (e && e.name === "AbortError") return; // the guest closed the share sheet
        return V.copyLink(id);
      });
    }
    return V.copyLink(id);
  };

  /* ---------- sheet (a simple accessible dialog) ---------- */
  V.sheet = function (title, html, onOpen) {
    var prev = document.activeElement;
    var wrap = document.createElement("div");
    wrap.className = "sheet-wrap";
    wrap.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">' +
      '<div class="sheet-head"><h2 id="sheet-title">' + V.escape(title) + '</h2>' +
      '<button type="button" class="sheet-close" aria-label="Close">Close</button></div>' +
      '<div class="sheet-body">' + html + "</div></div>";
    document.body.appendChild(wrap);
    function close() {
      document.removeEventListener("keydown", onKey);
      wrap.parentNode && wrap.parentNode.removeChild(wrap);
      if (prev && prev.focus) prev.focus();
    }
    function onKey(e) {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        var f = V.$$('button, a[href], input, select, textarea, [tabindex="0"]', wrap);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    }
    document.addEventListener("keydown", onKey);
    wrap.addEventListener("click", function (e) { if (e.target === wrap) close(); });
    V.$(".sheet-close", wrap).addEventListener("click", close);
    requestAnimationFrame(function () { wrap.classList.add("open"); });
    V.$(".sheet-close", wrap).focus();
    if (onOpen) onOpen(wrap, close);
    return close;
  };

  /* ---------- calendar sheet ---------- */
  V.openCalendar = function (id) {
    var ev = C.events[id];
    var timeNote = ev.end ? "" :
      '<p class="sheet-note">Saved with the start time, ' + V.time12(ev.start) + " IST. Some calendars show it as a short entry.</p>";
    V.sheet("Add to your calendar",
      '<div class="sheet-actions">' +
      (window.VOLVE_INLINE
        ? '<p class="sheet-note">The Apple and Outlook calendar file is available on the published page. In this preview, use Google Calendar.</p>'
        : '<a class="btn btn-block" id="cal-ics" href="' + V.asset(ev.ics) + '" download>Apple or Outlook calendar</a>') +
      '<a class="btn btn-block" id="cal-google" href="' + V.googleCalendarUrl(id) + '" target="_blank" rel="noopener">Google Calendar</a>' +
      "</div>" + timeNote +
      (V.inAppBrowser() ? '<p class="sheet-note">' + V.escape(V.openInBrowserText()) + "</p>" : ""),
      function (el) {
        // The deployed page links the static .ics file, which phones open directly in their calendar app.
      });
  };

  /* ---------- saving files (keepsakes, static cards, calendar) ---------- */
  V.saveBlob = function (blob, filename) {
    // Claude artifact preview: use the viewer's download capability when available.
    if (window.claude && window.claude.use) {
      return window.claude.use("downloads").then(function (dl) {
        if (!dl) return V.anchorSave(blob, filename);
        return dl.save({ filename: filename, data: blob }).then(function () { V.toast("Saved"); }, function () {});
      }).catch(function () { return V.anchorSave(blob, filename); });
    }
    return Promise.resolve(V.anchorSave(blob, filename));
  };
  V.anchorSave = function (blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename; a.rel = "noopener";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  };
  // Images: phones in WhatsApp's browser often ignore downloads, so show the picture to press-and-hold,
  // and offer the system share sheet (which includes Save Image on iPhone) when the device supports files.
  V.saveImage = function (blob, filename, label) {
    var file = null;
    try { file = new File([blob], filename, { type: blob.type || "image/png" }); } catch (e) {}
    var canShareFile = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
    var mobile = V.isIOS() || /Android/i.test(navigator.userAgent);
    if (!mobile && !window.claude) { V.anchorSave(blob, filename); V.toast("Saved to your downloads"); return; }
    if (window.claude && !mobile) { V.saveBlob(blob, filename); return; }
    var url = URL.createObjectURL(blob);
    V.sheet(label || "Save your image",
      '<img class="sheet-image" src="' + url + '" alt="' + V.escape(label || "Your image") + '">' +
      '<p class="sheet-note">Press and hold the image, then choose <b>' + (V.isIOS() ? "Save to Photos" : "Download image") + "</b>.</p>" +
      '<div class="sheet-actions">' +
      (canShareFile ? '<button type="button" class="btn btn-block" id="img-share">Share or save</button>' : "") +
      '<button type="button" class="btn btn-ghost btn-block" id="img-dl">Download file</button></div>',
      function (el) {
        var s = V.$("#img-share", el);
        if (s) s.addEventListener("click", function () {
          navigator.share({ files: [file] }).catch(function () {});
        });
        V.$("#img-dl", el).addEventListener("click", function () { V.anchorSave(blob, filename); });
      });
  };
  V.fetchBlob = function (path) {
    return fetch(V.asset(path)).then(function (r) { if (!r.ok) throw new Error("missing"); return r.blob(); });
  };

  /* ---------- first name (kept on this device only) ---------- */
  var NAME_KEY = "volve.invite.firstName";
  V.getName = function () { var n = store.get(NAME_KEY); return n && typeof n === "string" ? n : ""; };
  V.setName = function (n) {
    n = String(n || "").replace(/\s+/g, " ").trim().slice(0, 30);
    if (n) store.set(NAME_KEY, n); else store.del(NAME_KEY);
    document.dispatchEvent(new CustomEvent("volve:name", { detail: n }));
    return n;
  };
  V.cleanName = function (n) {
    n = String(n || "").replace(/\s+/g, " ").trim();
    return n.split(" ")[0].slice(0, 30);
  };

  /* ---------- canvas helpers for keepsakes ---------- */
  V.loadImage = function (src) {
    return new Promise(function (res, rej) {
      var i = new Image(); i.decoding = "async"; i.onload = function () { res(i); }; i.onerror = rej; i.src = src;
    });
  };
  V.fontsReady = function (list) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all(list.map(function (f) { return document.fonts.load(f).catch(function () {}); }))
      .then(function () { return document.fonts.ready; });
  };
  V.wrapText = function (ctx, text, maxWidth) {
    var words = text.split(" "), lines = [], line = "";
    words.forEach(function (w) {
      var t = line ? line + " " + w : w;
      if (ctx.measureText(t).width > maxWidth && line) { lines.push(line); line = w; } else line = t;
    });
    if (line) lines.push(line);
    // Avoid a lonely last word: narrow the measure a little until the last line carries two words.
    if (lines.length > 1 && lines[lines.length - 1].indexOf(" ") < 0 && maxWidth > 300 && !arguments[3]) {
      return V.wrapText(ctx, text, maxWidth - 40, false);
    }
    return lines;
  };
  V.canvasBlob = function (canvas) {
    return new Promise(function (res, rej) {
      if (canvas.toBlob) canvas.toBlob(function (b) { b ? res(b) : rej(new Error("toBlob")); }, "image/png");
      else {
        var d = canvas.toDataURL("image/png"); var bin = atob(d.split(",")[1]); var a = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
        res(new Blob([a], { type: "image/png" }));
      }
    });
  };

  /* ---------- details block (date, time, venue) ---------- */
  V.fillDetails = function (id) {
    var ev = C.events[id];
    V.$$("[data-fill]").forEach(function (el) {
      var k = el.getAttribute("data-fill");
      var map = {
        date: V.dateLong(ev.date), time: V.time12(ev.start) + " IST",
        venueName: C.venue.name, venue1: C.venue.lines[0], venue2: C.venue.lines[1],
        email: C.brand.email, host: C.hostLine,
        dayMonth: V.dateShort(ev.date).replace(/ \d{4}$/, ""),
        weekdayDayMonth: V.weekday(ev.date) + ", " + V.dateShort(ev.date).replace(/ \d{4}$/, ""),
      };
      if (map[k] !== undefined) el.textContent = map[k];
    });
    V.$$("[data-href=maps]").forEach(function (a) { a.href = C.venue.mapsUrl; });
    // Optional embedded map, loaded only on request (it is heavy, and blocked inside some previews).
    V.$$("[data-action=map]").forEach(function (b) {
      if (!C.venue.embedUrl || window.VOLVE_INLINE) { b.hidden = true; return; }
      b.addEventListener("click", function () {
        var box = V.$("#" + b.getAttribute("aria-controls"));
        if (!box.firstChild) {
          var f = document.createElement("iframe");
          f.src = C.venue.embedUrl; f.title = "Map showing VOLVE, Versova"; f.loading = "lazy";
          f.referrerPolicy = "strict-origin-when-cross-origin"; f.setAttribute("allowfullscreen", "");
          box.appendChild(f);
        }
        var open = box.hidden; box.hidden = !open;
        b.setAttribute("aria-expanded", open ? "true" : "false");
        b.textContent = open ? "Hide map" : "Show map";
      });
    });
    V.$$("[data-href=email]").forEach(function (a) { a.href = "mailto:" + C.brand.email; });
    if (!ev.dateConfirmed) document.documentElement.classList.add("date-unconfirmed");
  };

  /* ---------- static invitation download ---------- */
  V.downloadCard = function (id) {
    var ev = C.events[id];
    V.toast("Preparing the invitation…");
    V.fetchBlob(ev.staticCard).then(function (b) {
      V.saveImage(b, ev.staticCard.split("/").pop(), "The " + ev.shortTitle + " invitation");
    }).catch(function () {
      V.toast("The invitation image couldn’t load. Check your connection and try again.");
    });
  };

  /* ---------- wire common buttons ---------- */
  V.wireActions = function (id, shareText) {
    V.$$("[data-action]").forEach(function (b) {
      var a = b.getAttribute("data-action");
      b.addEventListener("click", function (e) {
        if (a === "calendar") { e.preventDefault(); V.openCalendar(id); }
        else if (a === "share") { e.preventDefault(); V.share(id, shareText); }
        else if (a === "copy") { e.preventDefault(); V.copyLink(id); }
        else if (a === "card") { e.preventDefault(); V.downloadCard(id); }
      });
    });
  };


  /* ---------- in-app browsers (Instagram, Facebook, some WhatsApp setups) ---------- */
  V.inAppName = function () {
    var ua = navigator.userAgent;
    if (/Instagram/i.test(ua)) return "Instagram";
    if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook";
    if (/WhatsApp/i.test(ua)) return "WhatsApp";
    if (/; wv\)/.test(ua)) return "this app";
    return "";
  };
  V.openInBrowserText = function () {
    var n = V.inAppName();
    if (!n) return "";
    var how = V.isIOS()
      ? "tap ••• (or the share icon) and choose Open in browser or Open in Safari"
      : "tap ⋮ at the top right and choose Open in browser or Open in Chrome";
    return "If saving or adding to your calendar doesn’t work inside " + n + ", " + how + ".";
  };
  V.showInAppHint = function () {
    var t = V.openInBrowserText();
    V.$$("[data-inapp-hint]").forEach(function (el) { if (t) { el.textContent = t; el.hidden = false; } });
  };

  /* ---------- optional sound: synthesised in the browser, off until the guest turns it on ---------- */
  var ac = null, master = null, soundOn = false, drone = null;
  function ctx() {
    if (!ac) {
      var A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      ac = new A(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  V.sound = {
    audio: function () { return ctx() ? { ac: ac, master: master } : null; },
    // Background music for this page (see shared/music.js); id comes from config.sound.
    music: function (on, id) {
      if (!window.VolveMusic) return;
      if (on && soundOn) { var a = V.sound.audio(); if (a) window.VolveMusic.start(id, a.ac, a.master, 0.9); }
      else window.VolveMusic.stop();
    },
    available: function () { return !!(window.AudioContext || window.webkitAudioContext) && C.sound !== false; },
    on: function () { return soundOn; },
    set: function (on) {
      soundOn = !!on && !!ctx();
      document.dispatchEvent(new CustomEvent("volve:sound", { detail: soundOn }));
      return soundOn;
    },
    // A struck bell: a few inharmonic partials with a long, soft decay.
    bell: function (f, vol) {
      if (!soundOn || !ctx()) return;
      var t = ac.currentTime, v = vol || 0.18;
      [[1, 1], [2.01, .45], [2.76, .3], [4.07, .16], [5.43, .08]].forEach(function (p) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = "sine"; o.frequency.value = f * p[0];
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * p[1], t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6 / Math.sqrt(p[0]));
        o.connect(g); g.connect(master); o.start(t); o.stop(t + 4);
      });
    },
    // A rounded chime for the evening: sine plus a quiet octave, gentle attack.
    chime: function (f, vol) {
      if (!soundOn || !ctx()) return;
      var t = ac.currentTime, v = vol || 0.14;
      [[1, 1], [2, .22], [3, .07]].forEach(function (p) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = "sine"; o.frequency.value = f * p[0];
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * p[1], t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + 2.6);
      });
    },
    // A very quiet sustained drone (two close tones) that fades in and out.
    drone: function (freqs, vol) {
      if (!soundOn || !ctx() || drone) return;
      var g = ac.createGain(); g.gain.value = 0.0001; g.connect(master);
      var lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.connect(g);
      var oscs = freqs.map(function (f, i) {
        var o = ac.createOscillator(); o.type = i % 2 ? "triangle" : "sine"; o.frequency.value = f;
        o.detune.value = i * 4; o.connect(lp); o.start(); return o;
      });
      g.gain.exponentialRampToValueAtTime(vol || 0.05, ac.currentTime + 2.5);
      drone = { g: g, oscs: oscs };
    },
    stopDrone: function () {
      if (!drone || !ac) return;
      var d = drone; drone = null;
      d.g.gain.cancelScheduledValues(ac.currentTime);
      d.g.gain.setValueAtTime(d.g.gain.value, ac.currentTime);
      d.g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.2);
      setTimeout(function () { d.oscs.forEach(function (o) { try { o.stop(); } catch (e) {} }); }, 1400);
    },
  };
  V.initSoundToggle = function (onEnable) {
    V.$$("[data-action=sound]").forEach(function (b) {
      if (!V.sound.available()) { b.hidden = true; return; }
      function sync() {
        var on = V.sound.on();
        b.setAttribute("aria-pressed", on ? "true" : "false");
        b.setAttribute("aria-label", on ? "Turn sound off" : "Turn sound on");
        var l = V.$(".label", b); if (l) l.textContent = on ? "Sound on" : "Sound off";
      }
      sync();
      b.addEventListener("click", function () {
        var on = V.sound.set(!V.sound.on());
        if (!on) { V.sound.stopDrone(); V.sound.music(false); } else if (onEnable) onEnable();
      });
      document.addEventListener("volve:sound", sync);
    });
  };

  /* ---------- motion toggle (in addition to the system setting) ---------- */
  V.initMotionToggle = function () {
    var KEY = "volve.invite.reduceMotion";
    if (store.get(KEY)) document.documentElement.classList.add("rm");
    V.$$("[data-action=motion]").forEach(function (b) {
      function sync() {
        var on = document.documentElement.classList.contains("rm");
        b.setAttribute("aria-pressed", on ? "true" : "false");
        b.textContent = on ? "Turn animation on" : "Reduce animation";
      }
      sync();
      b.addEventListener("click", function () {
        var on = !document.documentElement.classList.contains("rm");
        document.documentElement.classList.toggle("rm", on);
        store.set(KEY, on); sync();
        document.dispatchEvent(new CustomEvent("volve:motion", { detail: on }));
      });
    });
  };
})();
