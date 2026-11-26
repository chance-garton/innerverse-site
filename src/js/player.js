/* player.js
   The pop-out player (/player), 2026-11-26: stage 3 of claude/HANDOFF-site-listening-and-library.md.
   A small window a desktop listener opens from the Music bar or from an episode page's player, so the
   sound carries on while the main tab browses. Audio only: an episode popped out mid-video carries on as
   audio from the same moment, as the app does.

   What to play arrives from the opening tab in localStorage "iv_pop" (ivListen.pop in listen.js):
     {at, fresh, key, t, play, m, q, shuffle, need}
       key      "e:<free slug>", "p:<plus slug>" or "s:<song id>", as in the Continue listening record
       t        where to start, in seconds on the AUDIO clock
       m        what listen.js keeps for the key (title, thumb, show, href, src or pk, plus, song, sub)
       q        for songs: the list to carry on through, each {id, title, art, episodeTitle, src}
       need     for a time in a member's note on /library, where the page does not know the audio:
                {name, plus, vt (seconds on the VIDEO clock), title, thumb, show, href, iw}; the episode's
                data file is read here for its audio and offset
   "fresh" means the opening tab had to open a new window: a window that was already open leaves that
   one alone. With nothing handed over, the window offers the last thing played on this device.

   The window keeps the same record the pages keep (ivListen.start / save / done), so the Continue
   listening card and row, and an episode page's "Resume from", follow what was heard here. It marks
   itself open in localStorage "iv_pop_live" every two seconds; while it is open the card stays away.
   Sound starting in any tab stops the window, and the window starting stops every tab (ivListen.claim).
   A members' episode asks innerverse-plus for a fresh link each time it starts; no signed link is kept. */
(function () {
  'use strict';
  var root = document.getElementById('ivp'), L = window.ivListen;
  if (!root || !L) return;
  var WORKER = 'https://innerverse-plus.chance-5da.workers.dev';
  var DATA = 'https://raw.githubusercontent.com/chance-garton/innerverse-data/main/episodes/';
  var POP_KEY = 'iv_pop', POP_LIVE = 'iv_pop_live', BASE = window.IV_BASE || '';
  var SPEEDS = [1, 1.25, 1.5, 1.75, 2];
  var born = Date.now(), lastAt = 0, ME = Math.random().toString(36).slice(2);

  function $(id) { return document.getElementById(id); }
  var elImg = $('ivp-img'), elK = $('ivp-k'), elT = $('ivp-t'), elS = $('ivp-s'), elTag = $('ivp-tag');
  var elRange = $('ivp-range'), elNow = $('ivp-now'), elAll = $('ivp-all'), elNote = $('ivp-note');
  var bPP = $('ivp-pp'), bPrev = $('ivp-prev'), bNext = $('ivp-next'), bSpeed = $('ivp-speed'), bShuf = $('ivp-shuf'), bMute = $('ivp-mute');
  var elVol = $('ivp-vol'), elOpen = $('ivp-open'), elOpenT = $('ivp-open-t');

  function img(u, w) { return u ? (window.ivImg ? window.ivImg(u, w) : u) : ''; }
  function clock(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, String(v)); } catch (e) {} }
  function stored(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function token() { return stored('iv_session_token') || ''; }
  function member() { return document.documentElement.classList.contains('iv-plus-member') && !!token(); }

  /* ---------------- what is in the window ---------------- */
  var audio = new Audio(); audio.preload = 'auto';
  var now = null;            /* {key, m} */
  var parked = 0;            /* where it will start, while nothing is loaded */
  var knownD = 0;            /* its length, when the record already knows it */
  var pendingSeek = null, lastSave = 0, dragging = false, retried = false, noAudio = null;
  var queue = null, qi = -1, order = null, shuffleOn = false;

  function started() { return !!audio.getAttribute('src'); }
  function playing() { return started() && !audio.paused && !audio.ended; }
  function isSong() { return !!(now && now.m && now.m.song); }

  var noteT = null;
  function note(msg, stay) {
    elNote.textContent = msg || '';
    clearTimeout(noteT);
    if (msg && !stay) noteT = setTimeout(function () { elNote.textContent = ''; }, 4200);
  }

  function songMeta(s) {
    return { title: s.title || '', thumb: s.art || '', show: 'InnerVerse Music', sub: s.episodeTitle || '', href: '/music?song=' + encodeURIComponent(s.id), src: s.src || '', song: 1 };
  }

  /* ---------------- drawing ---------------- */
  function fill() {
    var m = now.m, song = !!m.song, iw = !!m.iw;
    root.classList.remove('is-empty');
    root.classList.toggle('is-song', song);
    root.classList.toggle('is-iw', iw && !song);
    root.classList.toggle('is-plus', !!m.plus && !iw);
    document.documentElement.classList.toggle('iv-pop-iw', iw && !song);
    var src = img(m.thumb, song ? 500 : 750);
    if (src) elImg.src = src; else elImg.removeAttribute('src');
    elK.textContent = song ? 'InnerVerse Music' : (iw ? 'Inner Whirled' : (/^innerverse$/i.test(m.show || '') || !m.show ? 'InnerVerse' : m.show)) + (m.plus ? ' \u00b7 Full episode' : '');
    elT.textContent = m.title || '';
    elS.textContent = song ? (m.sub || '') : '';
    elTag.textContent = m.plus ? 'Plus+' : 'Player';
    elTag.classList.toggle('is-gold', !!m.plus);
    elOpen.href = BASE + (m.href || '/episodes');
    elOpenT.textContent = song ? 'Open InnerVerse Music' : 'Open the episode page';
    bPrev.setAttribute('aria-label', song ? 'Previous song' : 'Back 15 seconds');
    bNext.setAttribute('aria-label', song ? 'Next song' : 'Forward 15 seconds');
    var lone = song && !(queue && queue.length > 1);
    bPrev.disabled = false; bNext.disabled = lone; bShuf.disabled = lone;
    bShuf.setAttribute('aria-pressed', shuffleOn ? 'true' : 'false');
    paint(); paintTime();
  }
  function paint() {
    var on = playing() || root.classList.contains('is-busy');
    root.classList.toggle('is-playing', on);
    bPP.setAttribute('aria-label', (on ? 'Pause' : 'Play') + (now ? ' ' + (now.m.title || '') : ''));
    try { document.title = (now ? (playing() ? '\u25B6 ' : '') + (now.m.title || 'InnerVerse player') + ' | InnerVerse' : 'InnerVerse player'); } catch (e) {}
  }
  function length() { return (started() && isFinite(audio.duration) && audio.duration > 0) ? audio.duration : knownD; }
  function paintTime() {
    if (!now || dragging) return;
    var t = started() ? (pendingSeek != null ? pendingSeek : audio.currentTime || 0) : parked, d = length();
    elRange.max = d ? Math.floor(d) : 100;
    elRange.value = d ? Math.min(t, d) : 0;
    elRange.style.setProperty('--p', (d ? Math.min(100, t / d * 100) : 0) + '%');
    elNow.textContent = clock(t);
    elAll.textContent = d ? clock(d) : '--:--';
  }
  function empty() {
    now = null; queue = null;
    root.classList.add('is-empty');
    root.classList.remove('is-playing', 'is-busy', 'is-wait', 'is-song', 'is-plus', 'is-iw');
    elT.textContent = 'InnerVerse player';
    elTag.textContent = 'Player'; elTag.classList.remove('is-gold');
    document.documentElement.classList.remove('iv-pop-iw');
    paint();
  }

  /* ---------------- playing ---------------- */
  function keep(force) {
    if (!now || !started() || isSong() || pendingSeek != null) return;
    var t = audio.currentTime || 0;
    if (!force && t < 1) return;
    L.save(now.key, t, length(), 'audio');
  }
  function unload() {
    keep(true);
    try { audio.pause(); audio.removeAttribute('src'); audio.load(); } catch (e) {}
    pendingSeek = null; retried = false; noAudio = null;
    root.classList.remove('is-busy', 'is-wait');
  }
  function mint(pk) {
    var tok = token();
    if (!tok || !window.fetch) return Promise.resolve(null);
    return fetch(WORKER + '/audio-link/' + encodeURIComponent(pk), { headers: { Authorization: 'Bearer ' + tok } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && j.url ? j.url : null; })['catch'](function () { return null; });
  }
  function tryPlay() {
    var p;
    try { p = audio.play(); } catch (e) { p = null; }
    if (p && p['catch']) p['catch'](function (err) {
      /* the browser will not start sound in a window nobody has pressed in yet: ask for one press */
      if (err && err.name === 'NotAllowedError') { root.classList.add('is-wait'); note('Press play to listen here.', true); paint(); }
    });
  }
  function setSrc(u, at) {
    pendingSeek = at > 0 ? at : null;
    audio.src = u;
    setRate();
    tryPlay();
    paint(); paintTime();
  }
  /* start what is showing, from "at" seconds */
  function start(at) {
    if (!now) return;
    var m = now.m, want = now;
    root.classList.remove('is-wait'); note('');
    if (m.pk) {
      root.classList.add('is-busy'); paint();
      mint(m.pk).then(function (u) {
        if (now !== want) return;
        root.classList.remove('is-busy');
        if (!u) { note('Log in on the site again to keep listening.', true); paint(); return; }
        retried = false;
        setSrc(u, at);
      });
    } else if (m.src) setSrc(m.src, at);
    else { note('This one has no audio to play here.', true); paint(); }
  }
  function toggle() {
    if (!now) return;
    if (noAudio) return;
    if (root.classList.contains('is-busy')) return;
    if (!started()) { start(parked); return; }
    if (audio.paused || audio.ended) { root.classList.remove('is-wait'); note(''); tryPlay(); }
    else audio.pause();
  }
  /* show something, and play it or leave it waiting at its place */
  function show(key, m, t, play) {
    unload();
    now = { key: key, m: m };
    var rec = L.get(key);
    knownD = (rec && rec.d) || (m.song && m.seconds) || 0;
    parked = Math.max(0, Number(t) || 0);
    fill(); session();
    if (play) start(parked);
  }

  /* ---------------- songs: the list handed over ---------------- */
  function makeOrder(first) {
    var ids = queue.map(function (_, i) { return i; });
    for (var i = ids.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = ids[i]; ids[i] = ids[j]; ids[j] = x; }
    if (first > -1) { ids.splice(ids.indexOf(first), 1); ids.unshift(first); }
    order = ids;
  }
  function line() { return shuffleOn && order ? order : queue.map(function (_, i) { return i; }); }
  function songAt(i, play) {
    var s = queue[i]; if (!s) return;
    qi = i;
    var m = songMeta(s); m.seconds = s.seconds || 0;
    show('s:' + s.id, m, 0, play);
  }
  function step(dir, auto) {
    if (!queue || queue.length < 2) { if (!auto && started()) { try { audio.currentTime = 0; } catch (e) {} } return; }
    var ln = line(), at = ln.indexOf(qi), n = at + dir;
    if (n >= ln.length) { if (auto) { paint(); return; } n = 0; }      /* the list ends quietly; Next wraps round */
    if (n < 0) n = ln.length - 1;
    songAt(ln[n], true);
  }
  function prev() {
    if (isSong()) { if (started() && audio.currentTime > 3) { try { audio.currentTime = 0; } catch (e) {} return; } step(-1); return; }
    seekBy(-15);
  }
  function next() { if (isSong()) step(1); else seekBy(15); }
  function seekBy(d) {
    if (!now) return;
    if (!started()) { parked = Math.max(0, Math.min(knownD || Infinity, parked + d)); paintTime(); return; }
    try { audio.currentTime = Math.max(0, Math.min((isFinite(audio.duration) && audio.duration) || Infinity, audio.currentTime + d)); } catch (e) {}
  }

  /* ---------------- speed and volume, kept on this device ---------------- */
  var rate = Number(stored('iv_pop_rate')) || 1;
  if (SPEEDS.indexOf(rate) < 0) rate = 1;
  function rateLabel() { return String(rate).replace(/^(\d)$/, '$1') + 'x'; }
  function setRate() {
    var r = isSong() ? 1 : rate;
    try { audio.defaultPlaybackRate = r; audio.playbackRate = r; } catch (e) {}
    bSpeed.textContent = rateLabel();
    bSpeed.setAttribute('aria-label', 'Playback speed, now ' + rateLabel());
  }
  bSpeed.addEventListener('click', function () {
    rate = SPEEDS[(SPEEDS.indexOf(rate) + 1) % SPEEDS.length];
    store('iv_pop_rate', rate); setRate();
  });
  var vol = parseFloat(stored('iv_pop_vol')); if (!(vol >= 0 && vol <= 1)) vol = 1;
  function paintVol() {
    var v = audio.muted ? 0 : audio.volume;
    elVol.value = v; elVol.style.setProperty('--p', v * 100 + '%');
    bMute.setAttribute('aria-pressed', audio.muted || audio.volume === 0 ? 'true' : 'false');
    bMute.setAttribute('aria-label', audio.muted || audio.volume === 0 ? 'Sound on' : 'Mute');
  }
  audio.volume = vol;
  elVol.addEventListener('input', function () { audio.muted = false; audio.volume = parseFloat(elVol.value) || 0; store('iv_pop_vol', audio.volume); paintVol(); });
  bMute.addEventListener('click', function () {
    if (!audio.muted && audio.volume === 0) { audio.volume = 1; store('iv_pop_vol', 1); } else audio.muted = !audio.muted;
    paintVol();
  });
  paintVol(); setRate();

  /* ---------------- the audio ---------------- */
  audio.addEventListener('loadedmetadata', function () {
    if (pendingSeek != null) { var at = pendingSeek; pendingSeek = null; try { audio.currentTime = at; } catch (e) {} }
    setRate(); paintTime();
  });
  audio.addEventListener('play', function () {
    if (!now) return;
    root.classList.remove('is-wait'); if (elNote.textContent === 'Press play to listen here.') note('');
    L.claim('pop');
    L.start(now.key, now.m, 'audio');
    lastSave = Date.now();
    paint(); session();
  });
  audio.addEventListener('pause', function () { if (!audio.ended) keep(true); paint(); });
  audio.addEventListener('timeupdate', function () {
    if (!now) return;
    var n = Date.now();
    if (n - lastSave > 5000 && !audio.paused) { lastSave = n; keep(false); }
    paintTime();
  });
  audio.addEventListener('durationchange', paintTime);
  audio.addEventListener('ended', function () {
    if (!now) return;
    if (isSong()) { step(1, true); paint(); return; }
    var k = now.key;
    try { audio.removeAttribute('src'); audio.load(); } catch (e) {}
    L.done(k);
    parked = 0; paint(); paintTime();
    note('That is the end of the episode.', true);
  });
  audio.addEventListener('error', function () {
    if (!now || !started()) return;
    /* a members' link that ran out: one fresh one, from the same moment */
    if (now.m.pk && !retried) {
      retried = true;
      var at = audio.currentTime || parked, want = now;
      mint(now.m.pk).then(function (u) { if (now !== want) return; if (!u) { note('Log in on the site again to keep listening.', true); paint(); return; } setSrc(u, at); });
      return;
    }
    note(isSong() ? 'That song could not load. Check your connection.' : 'That episode could not load. Check your connection.', true);
    paint();
  });

  bPP.addEventListener('click', toggle);
  bPrev.addEventListener('click', prev);
  bNext.addEventListener('click', next);
  bShuf.addEventListener('click', function () {
    if (!queue || queue.length < 2) return;
    shuffleOn = !shuffleOn;
    if (shuffleOn) makeOrder(qi); else order = null;
    bShuf.setAttribute('aria-pressed', shuffleOn ? 'true' : 'false');
    note(shuffleOn ? 'Shuffle is on.' : 'Shuffle is off.');
  });
  elRange.addEventListener('input', function () {
    dragging = true;
    elRange.style.setProperty('--p', Math.min(100, elRange.value / (+elRange.max || 1) * 100) + '%');
    elNow.textContent = clock(elRange.value);
  });
  elRange.addEventListener('change', function () {
    dragging = false;
    var v = +elRange.value || 0;
    if (!length()) { paintTime(); return; }
    if (started()) { if (pendingSeek != null) pendingSeek = v; else { try { audio.currentTime = v; } catch (e) {} } }
    else parked = v;
    paintTime();
  });
  document.addEventListener('keydown', function (e) {
    if (!now || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target, tag = (t && t.tagName) || '';
    if (e.key === ' ' || e.key === 'k') { if (/^(BUTTON|A)$/.test(tag) && e.key === ' ') return; e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowLeft' && tag !== 'INPUT') { e.preventDefault(); seekBy(isSong() ? -5 : -15); }
    else if (e.key === 'ArrowRight' && tag !== 'INPUT') { e.preventDefault(); seekBy(isSong() ? 5 : 15); }
  });

  /* lock screen and media keys */
  function session() {
    if (!('mediaSession' in navigator) || !window.MediaMetadata || !now) return;
    var m = now.m;
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: m.title || '', artist: m.song ? 'InnerVerse' : (m.show || 'InnerVerse'), album: m.song ? 'InnerVerse Music' : 'InnerVerse',
        artwork: m.thumb ? [{ src: img(m.thumb, 750), sizes: '750x750' }] : []
      });
      var song = !!m.song, many = !!(queue && queue.length > 1);
      [['play', function () { if (!playing()) toggle(); }], ['pause', function () { audio.pause(); }],
       ['seekbackward', song ? null : function () { seekBy(-15); }], ['seekforward', song ? null : function () { seekBy(15); }],
       ['previoustrack', song && many ? prev : null], ['nexttrack', song && many ? next : null],
       ['seekto', function (d) { if (d && d.seekTime != null && started()) audio.currentTime = d.seekTime; }]].forEach(function (h) {
        try { navigator.mediaSession.setActionHandler(h[0], h[1]); } catch (e) {}
      });
    } catch (e) {}
  }

  /* ---------------- a time in a member's note: find the episode's audio ---------------- */
  function getData(name) {
    function one(n) { return fetch(DATA + encodeURIComponent(n) + '.json').then(function (r) { return r.ok ? r.json() : null; })['catch'](function () { return null; }); }
    var base = name.replace(/-[a-z0-9]{5}$/i, '');
    return one(name).then(function (d) { return d || base === name ? d : one(base); });
  }
  function resolve(need) {
    return getData(need.name).then(function (d) {
      var f = d && d.fields; if (!f) return null;
      var m = { title: need.title || f['Title'] || '', thumb: need.thumb || f['Thumbnail URL'] || '', show: need.show || '', href: need.href || '' }, vt = Math.max(0, Number(need.vt) || 0);
      if (need.iw) m.iw = 1;
      if (need.plus) {
        var pa = f['Plus Audio URL'] || ''; if (!pa) return null;
        var pk = pa.indexOf('/audio/') > -1 && /workers\.dev\//.test(pa) ? decodeURIComponent(pa.split('/audio/')[1].split('?')[0]) : '';
        if (pk) m.pk = pk; else m.src = pa;
        m.plus = 1;
        return { m: m, t: vt };                                   /* members' audio runs on the members' video clock */
      }
      var src = f['Acast Audio URL'] || ''; if (!src) return null;
      var off = Number(f['Audio Offset Seconds']) || 0;
      m.src = src; if (off) m.off = off;
      return { m: m, t: Math.max(0, vt + off) };                 /* free audio = video + Audio Offset Seconds */
    });
  }

  /* ---------------- taking what a tab hands over ---------------- */
  function load(r) {
    queue = null; order = null; qi = -1; shuffleOn = false;
    if (r.q && r.q.length && /^s:/.test(r.key || '')) {
      queue = r.q.filter(function (s) { return s && s.id && s.src; });
      var id = r.key.slice(2), at = -1;
      queue.forEach(function (s, i) { if (s.id === id) at = i; });
      if (at < 0) { queue = null; }
      else {
        shuffleOn = !!r.shuffle && queue.length > 1;
        if (shuffleOn) makeOrder(at);
        qi = at;
        var sm = songMeta(queue[at]); sm.seconds = queue[at].seconds || 0;
        show(r.key, sm, r.t, r.play !== false);
        return;
      }
    }
    if (r.need && r.need.name) {
      var nd = r.need, want = {};
      unload();
      now = want; now.key = r.key; now.m = { title: nd.title || '', thumb: nd.thumb || '', show: nd.show || '', href: nd.href || '', plus: nd.plus ? 1 : 0, iw: nd.iw ? 1 : 0 };
      knownD = 0; parked = Math.max(0, Number(nd.vt) || 0);
      fill(); root.classList.add('is-busy'); paint();
      resolve(nd).then(function (res) {
        if (now !== want) return;
        root.classList.remove('is-busy');
        if (!res) {
          noAudio = true;
          elOpen.href = BASE + (nd.href || '/episodes') + '?t=' + Math.floor(parked);
          elOpenT.textContent = 'Open the episode at ' + clock(parked);
          note('This episode has no audio to play here.', true); paint();
          return;
        }
        show(r.key, res.m, res.t, r.play !== false);
      });
      return;
    }
    var m = r.m || ((L.get(r.key) || {}).m);
    if (!r.key || !m) { last(); return; }
    show(r.key, m, r.t, r.play !== false);
  }
  function take() {
    var r = null;
    try { r = JSON.parse(stored(POP_KEY) || 'null'); } catch (e) {}
    if (!r || typeof r !== 'object' || !(r.at > lastAt) || Date.now() - r.at > 30000) return false;
    /* a tab that had to open a new window means that window, not one that was already open */
    if (r.fresh && Date.now() - born > 20000) return false;
    lastAt = r.at;
    load(r);
    return true;
  }
  /* nothing handed over: offer the last thing played on this device, waiting at its place */
  function last() {
    var c = L.cur(), it = c && c.item, m = it && it.m;
    if (!m || !(m.src || m.pk) || (m.plus && !member())) { empty(); return; }
    queue = null;
    show(c.key, m, m.song ? 0 : (it.t || 0), false);
  }

  /* another player is about to make sound, here or in another tab: this one stops */
  L.on(function (type, d) {
    if (type === 'claim') { if (d !== 'pop' && playing()) audio.pause(); return; }
    /* a second window has opened somewhere: one is enough, and the new one has the latest request */
    if (type === 'far' && d && d.type === 'hello' && d.id !== ME) {
      unload(); paint(); paintTime();
      alive = false; store(POP_LIVE, null);
      try { window.close(); } catch (e) {}
      setTimeout(function () { alive = true; beat(); }, 800);        /* a window the browser would not close stays, quiet */
    }
  });
  window.addEventListener('storage', function (e) {
    if (e.key === POP_KEY && e.newValue) take();
    /* signed out, or signed in, in another tab: a members' episode follows */
    if (e.key === 'iv_session_token' && now && now.m.plus && !token()) { unload(); last(); }
  });

  /* the mark that says the window is open */
  var alive = true;
  function beat() { if (alive) store(POP_LIVE, Date.now()); }
  beat(); setInterval(beat, 2000);
  window.addEventListener('pagehide', function () { keep(true); alive = false; store(POP_LIVE, null); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) { alive = true; beat(); } });

  L.say({ type: 'hello', id: ME });
  if (!take()) {
    /* opened by a tab whose request is a moment behind (a video's place takes a beat to read) */
    if (window.opener) setTimeout(function () { if (!now) last(); }, 1200);
    else last();
  }
})();
