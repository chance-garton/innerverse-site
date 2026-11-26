/* listen.js
   Continue listening (2026-11-26, stage 2 of claude/HANDOFF-site-listening-and-library.md). Loaded on
   every page straight after site.js, so the players can tell it what is playing.

   As in the app, what was playing is kept on this device only (localStorage "iv_listen"), never on the
   server and never as a signed link:
     cur     the last thing played (an episode key "e:<free slug>" / "p:<plus slug>", or a song "s:<id>")
     items   per key: {t, d, at, mode, m}  t and d in seconds on the AUDIO clock (a free episode's audio is
             its video time plus Audio Offset Seconds; members' audio runs on the members' video clock),
             mode "audio" or "video", m what is needed to show and play it again:
             {title, thumb, show, href, src (public audio) or pk (members' audio key), off, plus, song, sub}
   A song keeps no place (it starts again, as in the app). An episode within 45 seconds of its end counts
   as finished and is dropped.

   What a visitor sees:
     - a small card in the corner of every page (along the bottom on a phone) offering one tap to pick up
       the last thing played. Nothing plays until it is tapped. It stays off /music and /library (their
       own player bar), off the page of the very thing it would resume (that page's player opens at the
       saved moment instead), and off a members' episode for anyone who is not a Plus+ member. Where the
       card would sit on top of an episode page's player it shrinks to a round button beside it.
     - for a Plus+ member, a "Continue listening" row on the home page and on /library (ivListen.row).

     ivListen.start(key, m, mode)   something began to play on a page player: remember it
     ivListen.save(key, t, d, mode) its place (every few seconds and on pause)
     ivListen.done(key)             it reached the end
     ivListen.song(song)            a song began to play on /music or /library
     ivListen.get(key) / cur()      the saved place / the last thing played
     ivListen.claim(who)            a player is about to make sound; the others stop ("page", "music", "bar")
     ivListen.on(fn)                fn(type, detail): "claim" and "change"
     ivListen.row(el, opts)         draw the Continue listening row into el (Plus+ members only) */
(function () {
  'use strict';
  if (window.ivListen) return;
  var KEY = 'iv_listen', MAX = 30, END_GAP = 45, BAR_MIN = 20, ROW_MIN = 60;
  var WORKER = 'https://innerverse-plus.chance-5da.workers.dev';
  var docEl = document.documentElement;
  var heard = [];

  /* ---------------- the record on this device ---------------- */
  function read() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (!s.items || typeof s.items !== 'object') s.items = {};
    return s;
  }
  function write(s) {
    var keys = Object.keys(s.items);
    if (keys.length > MAX) {
      keys.sort(function (a, b) { return (s.items[b].at || 0) - (s.items[a].at || 0); });
      keys.slice(MAX).forEach(function (k) { if (k !== s.cur) delete s.items[k]; });
    }
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    tell('change', null);
  }
  function tell(type, detail) { heard.slice().forEach(function (fn) { try { fn(type, detail); } catch (e) {} }); }
  function clean(m) {
    var out = {};
    ['title', 'thumb', 'show', 'href', 'src', 'pk', 'sub'].forEach(function (k) { if (m && m[k]) out[k] = String(m[k]); });
    if (m && m.off) out.off = Number(m.off) || 0;
    if (m && m.plus) out.plus = 1;
    if (m && m.song) out.song = 1;
    return out;
  }

  var api = {
    get: function (key) { return read().items[key] || null; },
    cur: function () { var s = read(); return s.cur && s.items[s.cur] ? { key: s.cur, item: s.items[s.cur] } : null; },
    start: function (key, m, mode) {
      if (!key) return;
      var s = read(), it = s.items[key] || { t: 0, d: 0 };
      if (m) it.m = clean(m);
      if (mode) it.mode = mode;
      it.at = Date.now();
      s.items[key] = it; s.cur = key;
      write(s);
    },
    save: function (key, t, d, mode) {
      if (!key) return;
      t = Number(t) || 0; d = Number(d) || 0;
      var s = read(), it = s.items[key];
      if (!it) return;                                  /* start() first */
      if (d && t > d - END_GAP) { api.done(key); return; }
      it.t = Math.round(t); if (d) it.d = Math.round(d);
      if (mode) it.mode = mode;
      it.at = Date.now();
      write(s);
    },
    done: function (key) {
      var s = read();
      delete s.items[key];
      if (s.cur === key) s.cur = null;
      write(s);
    },
    song: function (song) {
      if (!song || !song.id) return;
      api.start('s:' + song.id, {
        title: song.title, thumb: song.art, show: 'InnerVerse Music', sub: song.episodeTitle,
        href: '/music?song=' + encodeURIComponent(song.id), src: song.src, song: 1
      }, 'audio');
    },
    claim: function (who) { tell('claim', who); },
    on: function (fn) { heard.push(fn); }
  };
  window.ivListen = api;

  /* ---------------- small helpers ---------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function img(u, w) { return u ? (window.ivImg ? window.ivImg(u, w) : u) : ''; }
  function clock(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function left(it) {
    if (!it || !it.d) return '';
    var m = Math.max(1, Math.ceil((it.d - it.t) / 60));
    if (m >= 60) { var h = Math.floor(m / 60), r = m % 60; return h + ' hr' + (r ? ' ' + r + ' min' : '') + ' left'; }
    return m + ' min left';
  }
  function member() { return docEl.classList.contains('iv-plus-member'); }
  /* classList.add and remove rewrite the attribute even when nothing changes, which wakes every class
     watcher on the page (this one included): only touch the page's classes when they really change. */
  function setCls(el, c, on) { if (el.classList.contains(c) !== !!on) el.classList.toggle(c, !!on); }
  /* the page's class list changes for many reasons; only a change of member state matters here */
  function onMemberChange(fn) {
    if (!window.MutationObserver) return;
    var was = member();
    new MutationObserver(function () { var now = member(); if (now === was) return; was = now; fn(); }).observe(docEl, { attributes: true, attributeFilter: ['class'] });
  }
  function token() { try { return localStorage.getItem('iv_session_token') || ''; } catch (e) { return ''; } }
  function path() { return ((window.ivPath ? window.ivPath() : location.pathname).replace(/\/+$/, '') || '/').toLowerCase(); }
  function sameHref(h) { return !!h && (h.split('?')[0].replace(/\/+$/, '').toLowerCase() === path()); }
  function playable(key, it) {
    if (!it || !it.m) return false;
    if (it.m.plus && !(member() && token())) return false;
    if (it.m.song) return !!it.m.src;
    return !!(it.m.src || it.m.pk) && (it.t || 0) >= BAR_MIN;
  }

  /* ---------------- the Continue listening row (home, /library) ---------------- */
  function list(limit) {
    var s = read();
    return Object.keys(s.items).map(function (k) { return { key: k, it: s.items[k] }; })
      .filter(function (x) { return !/^s:/.test(x.key) && x.it.m && x.it.m.href && x.it.t > ROW_MIN && !(x.it.m.plus && !member()); })
      .sort(function (a, b) { return (b.it.at || 0) - (a.it.at || 0); })
      .slice(0, limit || 10);
  }
  api.list = list;
  api.row = function (el, opts) {
    if (!el) return;
    opts = opts || {};
    function draw() {
      var xs = member() ? list(opts.limit || 8) : [];
      el.hidden = !xs.length;
      if (!xs.length) { el.innerHTML = ''; return; }
      el.innerHTML = '<div class="ivcl-row-head"><h2 class="ivcl-row-h">Continue listening</h2></div>' +
        '<div class="ivcl-row-list">' + xs.map(function (x) {
          var it = x.it, m = it.m, pct = it.d ? Math.min(100, Math.round(it.t / it.d * 100)) : 0;
          return '<a class="ivcl-tile' + (m.plus ? ' ivcl-plus' : '') + '" href="' + esc(m.href) + '">' +
            '<span class="ivcl-tile-art"><img src="' + esc(img(m.thumb, 500)) + '" alt="" loading="lazy" decoding="async">' +
            '<span class="ivcl-tile-bar"><i style="width:' + pct + '%"></i></span></span>' +
            '<span class="ivcl-tile-k">' + esc(m.show || 'InnerVerse') + (left(it) ? ' &middot; ' + esc(left(it)) : '') + '</span>' +
            '<span class="ivcl-tile-t">' + esc(m.title) + '</span></a>';
        }).join('') + '</div>';
    }
    draw();
    api.on(function (type) { if (type === 'change') draw(); });
    onMemberChange(draw);
    window.addEventListener('storage', function (e) { if (e.key === KEY) draw(); });
  };

  /* ---------------- the card ---------------- */
  var HIDE_ON = /^\/(music|library|player)$/;
  var I_PLAY = '<svg class="ivcl-i-play" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z"></path></svg>';
  var I_PAUSE = '<svg class="ivcl-i-pause" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.2"></rect><rect x="13.8" y="5" width="4.2" height="14" rx="1.2"></rect></svg>';
  var I_BACK = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v5h5"></path><text x="12" y="15.6" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" stroke="none" font-family="Manrope,Arial,sans-serif">15</text></svg>';
  var I_X = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>';

  var bar = null, aud = null, nowKey = null, nowIt = null, lastSave = 0, pendingSeek = null, mini = false, wanted = false;

  function silent() {
    /* a quarter second of silence, so a tap can wake the audio while a members' link is fetched */
    var n = 2000, b = new Uint8Array(44 + n), dv = new DataView(b.buffer);
    function str(o, s) { for (var i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); }
    str(0, 'RIFF'); dv.setUint32(4, 36 + n, true); str(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
    dv.setUint16(22, 1, true); dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
    str(36, 'data'); dv.setUint32(40, n, true); for (var i = 44; i < b.length; i++) b[i] = 128;
    var bin = ''; for (i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
    return 'data:audio/wav;base64,' + btoa(bin);
  }
  var SILENT = null;

  function build() {
    if (bar) return;
    bar = document.createElement('div');
    bar.className = 'ivcl'; bar.id = 'ivcl'; bar.hidden = true;
    bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Continue listening');
    bar.innerHTML =
      '<div class="ivcl-card">' +
        '<a class="ivcl-art" href="#" tabindex="-1" aria-hidden="true"><img alt="" width="52" height="52"></a>' +
        '<div class="ivcl-txt"><span class="ivcl-k"></span><a class="ivcl-t" href="#"></a><span class="ivcl-s"></span></div>' +
        '<div class="ivcl-ctl"><button type="button" class="ivcl-back" aria-label="Back 15 seconds">' + I_BACK + '</button>' +
          '<button type="button" class="ivcl-pp" aria-label="Play">' + I_PLAY + I_PAUSE + '</button></div>' +
        '<button type="button" class="ivcl-x" aria-label="Close">' + I_X + '</button>' +
        '<div class="ivcl-line" aria-hidden="true"><i></i></div>' +
      '</div>' +
      '<button type="button" class="ivcl-disc" aria-label="Play"><img alt="" width="56" height="56"><span class="ivcl-disc-ring"></span><span class="ivcl-disc-i">' + I_PLAY + I_PAUSE + '</span></button>';
    document.body.appendChild(bar);
    bar.querySelector('.ivcl-pp').addEventListener('click', toggle);
    bar.querySelector('.ivcl-disc').addEventListener('click', toggle);
    bar.querySelector('.ivcl-back').addEventListener('click', function () { if (aud && aud.src) { try { aud.currentTime = Math.max(0, aud.currentTime - 15); } catch (e) {} } });
    bar.querySelector('.ivcl-x').addEventListener('click', close);
    bar.querySelector('.ivcl-line').addEventListener('click', function (e) {
      if (!aud || !aud.src || !isFinite(aud.duration) || !aud.duration) return;
      var r = this.getBoundingClientRect();
      try { aud.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * aud.duration; } catch (err) {}
    });
  }

  function audio() {
    if (aud) return aud;
    aud = new Audio(); aud.preload = 'none';
    aud.addEventListener('loadedmetadata', function () {
      if (pendingSeek != null) { try { aud.currentTime = pendingSeek; } catch (e) {} pendingSeek = null; }
    });
    aud.addEventListener('play', function () { if (isSilentSrc()) return; paint(); media(); });
    aud.addEventListener('pause', function () { if (isSilentSrc()) return; keep(true); paint(); });
    aud.addEventListener('timeupdate', function () {
      if (isSilentSrc() || !nowKey) return;
      var n = Date.now();
      if (n - lastSave > 5000) { lastSave = n; keep(false); }
      paintTime();
    });
    aud.addEventListener('ended', function () {
      if (isSilentSrc() || !nowKey) return;
      if (nowIt && nowIt.m && nowIt.m.song) { paint(); return; }
      api.done(nowKey); nowKey = null; nowIt = null; refresh();
    });
    aud.addEventListener('error', function () {
      if (isSilentSrc() || !nowKey || !aud.getAttribute('src')) return;
      /* a members' link that ran out: one fresh one, from the same moment */
      if (nowIt && nowIt.m && nowIt.m.pk && !aud.__retried) {
        aud.__retried = true;
        var at = aud.currentTime || (nowIt.t || 0);
        mint(nowIt.m.pk).then(function (u) { if (!u) return; pendingSeek = at; aud.src = u; aud.play()['catch'](function () {}); });
        return;
      }
      toast('That episode could not load. Check your connection.');
      paint();
    });
    return aud;
  }
  function isSilentSrc() { return !!(aud && SILENT && aud.src === SILENT); }
  function keep(force) {
    if (!aud || !nowKey || !nowIt || isSilentSrc()) return;
    if (nowIt.m && nowIt.m.song) return;
    var t = aud.currentTime || 0;
    if (!force && t < 1) return;
    api.save(nowKey, t, (isFinite(aud.duration) && aud.duration) || nowIt.d, 'audio');
  }
  function mint(pk) {
    var tok = token();
    if (!tok || !window.fetch) return Promise.resolve(null);
    return fetch(WORKER + '/audio-link/' + encodeURIComponent(pk), { headers: { Authorization: 'Bearer ' + tok } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && j.url ? j.url : null; })['catch'](function () { return null; });
  }

  /* The tap: on iPhone play() has to be called inside it, then the seek. */
  function toggle() {
    var a = audio();
    if (!nowKey) return;
    if (a.getAttribute('src') && !isSilentSrc()) {
      if (a.paused) { api.claim('bar'); var p = a.play(); if (p && p['catch']) p['catch'](function () {}); }
      else a.pause();
      return;
    }
    var it = nowIt, m = it.m, at = m.song ? 0 : (it.t || 0);
    api.claim('bar');
    api.start(nowKey, m, 'audio');
    if (m.pk) {
      if (!SILENT) SILENT = silent();
      a.src = SILENT;
      var w = a.play(); if (w && w['catch']) w['catch'](function () {});
      bar.classList.add('is-busy');
      mint(m.pk).then(function (u) {
        bar.classList.remove('is-busy');
        if (!u) { a.pause(); a.removeAttribute('src'); toast('Log in again to keep listening.'); paint(); return; }
        a.__retried = false;
        pendingSeek = at; a.src = u;
        var p2 = a.play(); if (p2 && p2['catch']) p2['catch'](function () {});
      });
    } else {
      pendingSeek = at; a.src = m.src;
      var p3 = a.play(); if (p3 && p3['catch']) p3['catch'](function () {});
    }
    paint();
  }
  function close() {
    keep(true);
    if (aud) { try { aud.pause(); aud.removeAttribute('src'); aud.load(); } catch (e) {} }
    var s = read(); s.cur = null; write(s);
    nowKey = null; nowIt = null;
    try { if ('mediaSession' in navigator) navigator.mediaSession.metadata = null; } catch (e) {}
    refresh();
  }
  function media() {
    if (!('mediaSession' in navigator) || !window.MediaMetadata || !nowIt) return;
    var m = nowIt.m;
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: m.title || '', artist: m.song ? 'InnerVerse' : (m.show || 'InnerVerse'), album: m.song ? 'InnerVerse Music' : 'InnerVerse',
        artwork: m.thumb ? [{ src: img(m.thumb, 750), sizes: '750x750' }] : []
      });
      [['play', function () { if (aud.paused) toggle(); }], ['pause', function () { aud.pause(); }],
       ['seekbackward', function () { aud.currentTime = Math.max(0, aud.currentTime - 15); }],
       ['seekforward', function () { aud.currentTime = aud.currentTime + 30; }],
       ['seekto', function (d) { if (d && d.seekTime != null) aud.currentTime = d.seekTime; }]].forEach(function (h) {
        try { navigator.mediaSession.setActionHandler(h[0], h[1]); } catch (e) {}
      });
    } catch (e) {}
  }

  var toastT = null;
  function toast(msg) {
    if (!bar) return;
    var s = bar.querySelector('.ivcl-s');
    s.textContent = msg; bar.classList.add('is-note');
    clearTimeout(toastT); toastT = setTimeout(function () { bar.classList.remove('is-note'); paintTime(); }, 3200);
  }

  function playing() { return !!(aud && !aud.paused && !aud.ended && !isSilentSrc()); }
  function paint() {
    if (!bar || !nowIt) return;
    var m = nowIt.m, on = playing() || bar.classList.contains('is-busy');
    bar.classList.toggle('is-playing', on);
    bar.classList.toggle('is-started', !!(aud && aud.getAttribute('src')));
    bar.classList.toggle('ivcl-plus', !!m.plus || member());
    bar.querySelector('.ivcl-k').textContent = on ? (m.song ? 'InnerVerse Music' : (m.show || 'InnerVerse')) : 'Continue listening';
    var label = (on ? 'Pause ' : (aud && aud.getAttribute('src') ? 'Play ' : 'Continue ')) + (m.title || '');
    bar.querySelector('.ivcl-pp').setAttribute('aria-label', label);
    bar.querySelector('.ivcl-disc').setAttribute('aria-label', label);
    paintTime();
  }
  function paintTime() {
    if (!bar || !nowIt || bar.classList.contains('is-note')) return;
    var m = nowIt.m, s = bar.querySelector('.ivcl-s'), started = aud && aud.getAttribute('src') && !isSilentSrc();
    var t = started ? (aud.currentTime || 0) : (m.song ? 0 : nowIt.t || 0);
    var d = (started && isFinite(aud.duration) && aud.duration) || nowIt.d || 0;
    if (m.song) s.textContent = started ? clock(t) + (d ? ' / ' + clock(d) : '') : (m.sub || 'Play it again');
    else s.textContent = started ? clock(t) + (d ? ' / ' + clock(d) : '') : (left({ t: t, d: d }) || clock(t));
    var pct = d ? Math.min(100, t / d * 100) : 0;
    bar.querySelector('.ivcl-line i').style.width = pct + '%';
    bar.querySelector('.ivcl-disc-ring').style.setProperty('--p', pct + '%');
  }
  function fill() {
    var m = nowIt.m, href = m.href || '#';
    bar.querySelector('.ivcl-art').href = href;
    bar.querySelector('.ivcl-art img').src = img(m.thumb, 300);
    bar.querySelector('.ivcl-disc img').src = img(m.thumb, 300);
    var t = bar.querySelector('.ivcl-t'); t.textContent = m.title || ''; t.href = href;
    bar.classList.toggle('ivcl-song', !!m.song);
    paint();
  }

  /* Never on top of an episode page's player: where the card would cover it, a round button takes its
     place in the corner, and the card comes back once the player has scrolled out of its way. */
  function player() {
    var el = document.querySelector('.iv-media-toggle') || document.querySelector('.blog-item-content .sqs-block-video');
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return r.width && r.height ? r : null;
  }
  function cardRect() {
    var W = window.innerWidth, H = window.innerHeight, phone = W < 700;
    var w = phone ? W - 16 : Math.min(372, W - 32), h = phone ? 66 : 78, gap = phone ? 8 : 16;
    return { left: W - gap - w, right: W - gap, top: H - gap - h, bottom: H - gap };
  }
  function overlaps(a, b) { return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom); }
  var raf = 0;
  function place() {
    raf = 0;
    if (!bar || bar.hidden) return;
    var p = player();
    var next = !!(p && overlaps(cardRect(), { left: p.left - 8, right: p.right + 8, top: p.top - 8, bottom: p.bottom + 8 }));
    if (next !== mini) { mini = next; setCls(bar, 'is-mini', mini); }
    setCls(docEl, 'ivcl-has-card', !mini);
  }
  function placeSoon() { if (!raf) raf = window.requestAnimationFrame(place); }

  function refresh() {
    var c = api.cur();
    if (playing() && nowKey) { show(true); return; }        /* what the card is playing stays put */
    if (!c || HIDE_ON.test(path()) || sameHref(c.item.m && c.item.m.href) || !playable(c.key, c.item)) {
      if (aud && aud.getAttribute('src') && nowKey && c && c.key === nowKey) { show(true); return; }
      show(false); return;
    }
    if (c.key !== nowKey) {
      if (aud && aud.getAttribute('src')) { try { aud.pause(); aud.removeAttribute('src'); aud.load(); } catch (e) {} }
      nowKey = c.key;
    }
    nowIt = c.item;
    build(); fill(); show(true);
  }
  function show(on) {
    wanted = on;
    if (!bar) { if (!on) return; build(); }
    if (on && nowIt) fill();
    bar.hidden = !on;
    setCls(docEl, 'ivcl-on', on);
    if (!on) { setCls(docEl, 'ivcl-has-card', false); mini = false; setCls(bar, 'is-mini', false); return; }
    place();
  }

  /* Someone else is about to make sound: stop and step aside. */
  api.on(function (type, who) {
    if (type !== 'claim' || who === 'bar') return;
    if (aud && !aud.paused) aud.pause();
  });
  api.on(function (type) { if (type === 'change' && !playing()) setTimeout(refresh, 0); });
  window.addEventListener('storage', function (e) { if (e.key === KEY && !playing()) refresh(); });
  window.addEventListener('scroll', placeSoon, { passive: true });
  window.addEventListener('resize', placeSoon);
  window.addEventListener('pagehide', function () { keep(true); });
  onMemberChange(function () { if (!playing()) refresh(); });

  function boot() {
    refresh();
    /* a members' episode page draws its player late: check the corner again once it is there */
    [600, 1500, 3000].forEach(function (ms) { setTimeout(placeSoon, ms); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
