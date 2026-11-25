/* music.js
   InnerVerse Music (/music), 2026-11-25. The page arrives with every song already in it
   (build/music.py); this script makes it play. One audio element, a bar along the bottom once a
   song is chosen, Play all and Shuffle as in the app, lock screen controls, and a link per song
   (/music?song=<id>). It asks for the app's live song list once, so a song added since the last
   site build still shows. A Plus+ member gets a heart on each song and on the bar, kept in the same
   library the app uses (key "s:<id>", through library-client.js), so a song saved here is saved
   there, and a Saved view of the list with its own Play saved.

   The same script plays the saved songs on /library (the data block says mode "library"): there the
   list holds only the member's saved songs, newest save first, and the address is left alone. */
(function () {
  'use strict';
  var root = document.getElementById('iv-music') || document.getElementById('iv-library'), blob = document.getElementById('ivm-data');
  if (!root || !blob) return;
  var data; try { data = JSON.parse(blob.textContent || '{}'); } catch (e) { return; }
  var songs = data.songs || [], dates = data.dates || {}, AUDIO = data.audio || '';
  var listEl = document.getElementById('ivm-list');
  var LIBMODE = data.mode === 'library', lib = window.ivLib || null;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var I_PLAY = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z"></path></svg>';
  var I_PLAY_L = I_PLAY.replace('width="18" height="18"', 'class="ivm-i-play" width="22" height="22"');
  var I_PAUSE = '<svg class="ivm-i-pause" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.2"></rect><rect x="13.8" y="5" width="4.2" height="14" rx="1.2"></rect></svg>';
  var I_PREV = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M6 5h2v14H6zM20 6.2v11.6a1 1 0 0 1-1.55.83L9.6 12.83a1 1 0 0 1 0-1.66l8.85-5.8A1 1 0 0 1 20 6.2z"></path></svg>';
  var I_NEXT = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M16 5h2v14h-2zM4 6.2v11.6a1 1 0 0 0 1.55.83l8.85-5.8a1 1 0 0 0 0-1.66l-8.85-5.8A1 1 0 0 0 4 6.2z"></path></svg>';
  var I_SHUFFLE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5"></path><path d="M4 20 21 3"></path><path d="M21 16v5h-5"></path><path d="m15 15 6 6"></path><path d="m4 4 5 5"></path></svg>';
  var I_LINK = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"></path><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"></path></svg>';
  var I_HEART = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21.5l8.8-8.8a5 5 0 0 0 0-7.1z"></path></svg>';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function img(u, w) { return u ? (window.ivImg ? window.ivImg(u, w) : u) : ''; }
  function clock(sec) { sec = Math.max(0, Math.floor(sec || 0)); var s = sec % 60; return Math.floor(sec / 60) + ':' + (s < 10 ? '0' : '') + s; }
  function monthYear(d) { var p = String(d || '').split('-'); return p.length >= 2 && MONTHS[+p[1] - 1] ? MONTHS[+p[1] - 1] + ' ' + p[0] : ''; }
  function byId(id) { for (var i = 0; i < songs.length; i++) if (songs[i].id === id) return songs[i]; return null; }
  function rowOf(id) { return listEl.querySelector('.ivm-row[data-id="' + String(id).replace(/"/g, '') + '"]'); }
  function member() { return !!(lib && lib.member()); }

  /* ---------------- a small notice ---------------- */
  var toastEl = document.createElement('div'); toastEl.className = 'ivm-toast'; toastEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(toastEl);
  var statusEl = document.getElementById('ivm-status'), toastT = null;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    if (statusEl) statusEl.textContent = msg;
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  }

  /* ---------------- the bar ---------------- */
  var bar = document.createElement('div');
  bar.className = 'ivm-bar'; bar.id = 'ivm-bar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Music player');
  bar.innerHTML =
    '<div class="ivm-bar-in">' +
      '<div class="ivm-bar-now"><img alt="" width="52" height="52"><div class="ivm-bar-txt"><span class="ivm-bar-t"></span><a class="ivm-bar-e" href="#"></a></div></div>' +
      '<div class="ivm-bar-ctl"><button type="button" class="ivm-bar-skip ivm-prev" aria-label="Previous song">' + I_PREV + '</button>' +
        '<button type="button" class="ivm-bar-pp" aria-label="Play">' + I_PLAY_L + I_PAUSE + '</button>' +
        '<button type="button" class="ivm-bar-skip ivm-next" aria-label="Next song">' + I_NEXT + '</button></div>' +
      '<div class="ivm-bar-seek"><span class="ivm-bar-time ivm-t-now">0:00</span>' +
        '<input type="range" class="ivm-range" min="0" max="100" step="1" value="0" aria-label="Position in the song">' +
        '<span class="ivm-bar-time ivm-t-all">0:00</span></div>' +
      '<div class="ivm-bar-end"><button type="button" class="ivm-bar-heart" aria-pressed="false" aria-label="Save this song to My library">' + I_HEART.replace('width="17" height="17"', 'width="19" height="19"') + '</button>' +
        '<button type="button" class="ivm-bar-shuf" aria-pressed="false" aria-label="Shuffle">' + I_SHUFFLE + '</button></div>' +
    '</div>';
  document.body.appendChild(bar);
  var bImg = bar.querySelector('.ivm-bar-now img'), bTitle = bar.querySelector('.ivm-bar-t'), bEp = bar.querySelector('.ivm-bar-e');
  var bPP = bar.querySelector('.ivm-bar-pp'), bRange = bar.querySelector('.ivm-range');
  var bNow = bar.querySelector('.ivm-t-now'), bAll = bar.querySelector('.ivm-t-all'), bShuf = bar.querySelector('.ivm-bar-shuf'), bHeart = bar.querySelector('.ivm-bar-heart');
  var heroImg = document.getElementById('ivm-hero-img'), heroK = document.getElementById('ivm-hero-k'), heroT = document.getElementById('ivm-hero-t');
  var shuffleBtn = document.getElementById('ivm-shuffle'), playAllBtn = document.getElementById('ivm-playall');

  /* ---------------- playing ---------------- */
  var audio = new Audio(); audio.preload = 'none';
  var cur = null, shuffleOn = false, order = null, dragging = false;

  /* what plays next is whatever the list is showing: every song, or the saved ones */
  function showing() {
    var ids = [];
    listEl.querySelectorAll('.ivm-row').forEach(function (r) { if (!r.hidden) ids.push(r.getAttribute('data-id')); });
    return ids;
  }
  function makeOrder(firstId) {
    var ids = showing();
    for (var i = ids.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = ids[i]; ids[i] = ids[j]; ids[j] = t; }
    if (firstId && ids.indexOf(firstId) > -1) { ids.splice(ids.indexOf(firstId), 1); ids.unshift(firstId); }
    order = ids;
  }
  function queue() {
    var ids = showing();
    if (!shuffleOn) return ids;
    var stale = !order || order.length !== ids.length || order.some(function (id) { return ids.indexOf(id) < 0; });
    if (stale) makeOrder(cur && cur.id);
    return order;
  }
  function setShuffle(on, quiet) {
    shuffleOn = !!on;
    if (shuffleOn) makeOrder(cur && cur.id); else order = null;
    bShuf.setAttribute('aria-pressed', shuffleOn ? 'true' : 'false');
    if (!quiet) toast(shuffleOn ? 'Shuffle is on.' : 'Shuffle is off.');
  }
  function paintRows() {
    var playing = !audio.paused && !audio.ended;
    listEl.querySelectorAll('.ivm-row').forEach(function (r) {
      var on = !!cur && r.getAttribute('data-id') === cur.id;
      r.classList.toggle('is-current', on);
      r.classList.toggle('is-playing', on && playing);
      var b = r.querySelector('.ivm-play'), s = byId(r.getAttribute('data-id'));
      if (b && s) b.setAttribute('aria-label', (on && playing ? 'Pause ' : 'Play ') + s.title);
    });
    bar.classList.toggle('is-playing', playing);
    bPP.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    if (heroK && cur) heroK.textContent = playing ? 'Now playing' : 'Up next';
  }
  function select(song, play) {
    if (!song) return;
    var same = cur && cur.id === song.id;
    cur = song;
    if (!same) {
      audio.src = AUDIO + encodeURIComponent(song.file || (song.id + '.mp3'));
      bRange.value = 0; bRange.max = song.seconds || 100; bRange.style.setProperty('--p', '0%');
      bNow.textContent = '0:00'; bAll.textContent = clock(song.seconds);
      bTitle.textContent = song.title || '';
      bEp.textContent = song.episodeTitle || ''; bEp.href = '/episodes/' + encodeURIComponent(song.episode || '');
      bImg.src = img(song.art, 300);
      if (heroImg && song.art) heroImg.src = img(song.art, 750);
      if (heroT) heroT.textContent = song.title || '';
      address();
      session(song);
    }
    paintHearts();
    bar.classList.add('is-on');
    document.documentElement.classList.add('ivm-has-bar');
    if (play) { var p = audio.play(); if (p && p['catch']) p['catch'](function () {}); }
    paintRows();
  }
  function step(dir, auto) {
    var q = queue(); if (!q.length) return;
    var i = cur ? q.indexOf(cur.id) : -1, n = i + dir;
    if (n >= q.length) { if (auto) { paintRows(); return; } n = 0; }   /* the list ends quietly; Next wraps round */
    if (n < 0) n = q.length - 1;
    select(byId(q[n]), true);
  }
  function toggle() {
    if (!cur) { select(byId(queue()[0]), true); return; }
    if (audio.paused) { var p = audio.play(); if (p && p['catch']) p['catch'](function () {}); } else audio.pause();
  }
  function session(song) {
    if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: song.title || '', artist: 'InnerVerse', album: 'InnerVerse Music',
        artwork: song.art ? [{ src: img(song.art, 750), sizes: '750x750' }] : []
      });
    } catch (e) {}
  }
  if ('mediaSession' in navigator) {
    [['play', function () { toggle(); }], ['pause', function () { audio.pause(); }],
     ['previoustrack', function () { prev(); }], ['nexttrack', function () { step(1); }],
     ['seekto', function (d) { if (d && d.seekTime != null) audio.currentTime = d.seekTime; }]].forEach(function (h) {
      try { navigator.mediaSession.setActionHandler(h[0], h[1]); } catch (e) {}
    });
  }
  function prev() { if (audio.currentTime > 3) { audio.currentTime = 0; return; } step(-1); }

  audio.addEventListener('play', paintRows);
  audio.addEventListener('pause', paintRows);
  audio.addEventListener('ended', function () { step(1, true); });
  audio.addEventListener('error', function () { if (cur) { toast('That song could not load. Check your connection.'); paintRows(); } });
  audio.addEventListener('loadedmetadata', function () {
    if (isFinite(audio.duration) && audio.duration > 0) { bRange.max = Math.floor(audio.duration); bAll.textContent = clock(audio.duration); }
  });
  audio.addEventListener('timeupdate', function () {
    if (dragging) return;
    var t = audio.currentTime || 0, d = +bRange.max || 1;
    bRange.value = t; bRange.style.setProperty('--p', Math.min(100, t / d * 100) + '%');
    bNow.textContent = clock(t);
  });
  bRange.addEventListener('input', function () {
    dragging = true;
    bRange.style.setProperty('--p', Math.min(100, bRange.value / (+bRange.max || 1) * 100) + '%');
    bNow.textContent = clock(bRange.value);
  });
  bRange.addEventListener('change', function () { dragging = false; try { audio.currentTime = +bRange.value; } catch (e) {} });

  bPP.addEventListener('click', toggle);
  bar.querySelector('.ivm-next').addEventListener('click', function () { step(1); });
  bar.querySelector('.ivm-prev').addEventListener('click', prev);
  bShuf.addEventListener('click', function () { setShuffle(!shuffleOn); });
  function playAll() {
    setShuffle(false, true);
    var q = queue();
    if (q.length) select(byId(q[0]), true); else if (view === 'saved') toast('No saved songs yet.');
  }
  if (playAllBtn) playAllBtn.addEventListener('click', playAll);
  if (shuffleBtn) shuffleBtn.addEventListener('click', function () {
    shuffleOn = true; makeOrder(null); bShuf.setAttribute('aria-pressed', 'true');
    if (!order.length) { if (view === 'saved') toast('No saved songs yet.'); return; }
    select(byId(order[0]), true); toast('Shuffle is on.');
  });
  bHeart.addEventListener('click', function () { if (cur) heart(cur); });

  /* ---------------- a link to one song ---------------- */
  function linkFor(song) { return window.location.origin + '/music?song=' + encodeURIComponent(song.id); }
  function share(song) {
    var u = linkFor(song);
    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      navigator.share({ title: song.title + ' | InnerVerse Music', url: u })['catch'](function () {});
      return;
    }
    var done = function () { toast('Link copied.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(done, function () { fallbackCopy(u, done); });
    else fallbackCopy(u, done);
  }
  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-999px;top:0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('Could not copy the link.'); }
    document.body.removeChild(ta);
  }

  /* ---------------- hearts (Plus+ members; the app's own library) ---------------- */
  /* Every row carries its heart from the start (CSS shows it to a Plus+ member only), so nothing
     shifts when the library answers. */
  function isSaved(id) { var x = lib && lib.get('s:' + id); return !!(x && x.saved); }
  function savedIds() { return songs.filter(function (s) { return isSaved(s.id); }).map(function (s) { return s.id; }); }
  function paintHeart(h, s) {
    var on = isSaved(s.id);
    h.classList.toggle('is-on', on);
    h.setAttribute('aria-pressed', on ? 'true' : 'false');
    h.setAttribute('aria-label', (on ? 'Remove ' : 'Save ') + s.title + (on ? ' from My library' : ' to My library'));
  }
  function paintHearts() {
    listEl.querySelectorAll('.ivm-row').forEach(function (r) {
      var s = byId(r.getAttribute('data-id')), h = r.querySelector('.ivm-heart');
      if (s && h) paintHeart(h, s);
    });
    if (cur) paintHeart(bHeart, cur);
    var n = savedIds().length, c = document.getElementById('ivm-saved-n');
    if (c) { c.textContent = n ? String(n) : ''; c.hidden = !n; }
  }
  function heart(song) {
    if (!member()) return;
    var on = !isSaved(song.id);
    if (on && shown) shown[song.id] = true;
    lib.put('s:' + song.id, { saved: on }).then(function () { toast(on ? 'Saved to My library.' : 'Removed from My library.'); },
      function () { toast('Not saved. Check your connection.'); });
  }
  if (lib) lib.on(function (key) { if (/^s:/.test(key)) { paintHearts(); announce(); } });

  /* ---------------- All songs and Saved ---------------- */
  /* In the Saved view a song whose heart is taken off stays in place until the view is opened
     again, so a slip of the finger is one tap to undo. */
  var view = 'all', shown = null, query = '';
  var tabs = document.getElementById('ivm-tabs'), emptyEl = document.getElementById('ivm-empty'), playAllLabel = playAllBtn && playAllBtn.querySelector('span');
  function matches(s) {
    if (!query) return true;
    var hay = ((s.title || '') + ' ' + (s.episodeTitle || '')).toLowerCase();
    return query.split(/\s+/).every(function (t) { return !t || hay.indexOf(t) > -1; });
  }
  function address() {
    if (LIBMODE) return;
    var q = [];
    if (view === 'saved') q.push('view=saved');
    if (cur) q.push('song=' + encodeURIComponent(cur.id));
    try { window.history.replaceState(null, '', '/music' + (q.length ? '?' + q.join('&') : '')); } catch (e) {}
  }
  function announce() {
    try { document.dispatchEvent(new CustomEvent('ivm:view', { detail: { showing: showing().length, saved: savedIds().length } })); } catch (e) {}
  }
  function paintView() {
    if (LIBMODE) {
      /* only the saved songs are in the list, newest save first */
      var at = function (s) { var x = lib && lib.get('s:' + s.id); return (x && x.savedAt) || 0; };
      var mine = songs.filter(function (s) { return shown && shown[s.id]; }).sort(function (a, b) { return at(b) - at(a); });
      listEl.innerHTML = mine.map(function (s, i) { return rowHtml(s, i + 1); }).join('');
    }
    var n = 0;
    listEl.querySelectorAll('.ivm-row').forEach(function (r) {
      var s = byId(r.getAttribute('data-id'));
      var on = !!s && (view === 'all' || !!(shown && shown[s.id])) && matches(s);
      r.hidden = !on;
      if (on) { n += 1; var num = r.querySelector('.ivm-num'); if (num) num.textContent = String(n); }
    });
    if (tabs) tabs.querySelectorAll('.ivm-tab').forEach(function (t) {
      var on = t.getAttribute('data-view') === view;
      t.classList.toggle('is-on', on); t.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (playAllLabel) playAllLabel.textContent = view === 'saved' ? 'Play saved' : 'Play all';
    if (emptyEl) emptyEl.hidden = !(view === 'saved' && n === 0);
    root.classList.toggle('ivm-view-saved', view === 'saved');
    order = null;
    paintHearts(); paintRows(); announce();
  }
  function setView(next) {
    if (next === 'saved') {
      if (!member()) return;
      lib.load().then(function () {
        view = 'saved'; shown = {};
        savedIds().forEach(function (id) { shown[id] = true; });
        paintView(); address();
      }, function () { toast('Your library could not load. Check your connection.'); });
      return;
    }
    view = 'all'; shown = null;
    paintView(); address();
  }
  if (tabs) tabs.addEventListener('click', function (e) {
    var t = e.target.closest('.ivm-tab'); if (!t) return;
    setView(t.getAttribute('data-view'));
  });
  if (emptyEl) emptyEl.addEventListener('click', function (e) { if (e.target.closest('[data-view]')) setView('all'); });

  var started = false;
  function startLibrary() {
    if (started || !member() || !window.fetch) return;
    started = true;
    lib.load().then(function () {
      if (LIBMODE || wantSaved) { wantSaved = false; setView('saved'); } else paintHearts();
    }, function () { started = false; });
  }
  var wantSaved = false;
  try { wantSaved = !LIBMODE && new URLSearchParams(window.location.search).get('view') === 'saved'; } catch (e) {}
  startLibrary();
  if (window.MutationObserver) new MutationObserver(startLibrary).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  window.ivMusic = {
    setQuery: function (q) { query = String(q || '').toLowerCase().trim(); paintView(); },
    playAll: playAll, toast: toast
  };

  /* ---------------- the list ---------------- */
  listEl.addEventListener('click', function (e) {
    var row = e.target.closest('.ivm-row'); if (!row) return;
    var song = byId(row.getAttribute('data-id')); if (!song) return;
    if (e.target.closest('a')) return;                                   /* the episode link goes to the episode */
    if (e.target.closest('.ivm-share')) { share(song); return; }
    if (e.target.closest('.ivm-heart')) { heart(song); return; }
    if (cur && cur.id === song.id) toggle(); else select(song, true);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== ' ' || !cur || e.defaultPrevented) return;
    var t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName || ''))) return;
    e.preventDefault(); toggle();
  });

  function rowHtml(s, n) {
    var art = img(s.art, 300);
    return '<li class="ivm-row" data-id="' + esc(s.id) + '">' +
      '<button type="button" class="ivm-play" aria-label="Play ' + esc(s.title) + '"><span class="ivm-num">' + n + '</span><span class="ivm-ico">' + I_PLAY + '</span><span class="ivm-eq" aria-hidden="true"><i></i><i></i><i></i></span></button>' +
      (art ? '<img class="ivm-cover" src="' + esc(art) + '" alt="" width="56" height="56" loading="lazy" decoding="async">' : '<span class="ivm-cover ivm-cover-none"></span>') +
      '<div class="ivm-main"><span class="ivm-title">' + esc(s.title) + '</span><a class="ivm-ep" href="/episodes/' + encodeURIComponent(s.episode || '') + '">' + esc(s.episodeTitle) + '</a></div>' +
      '<span class="ivm-date">' + esc(monthYear(dates[s.episode])) + '</span>' +
      '<span class="ivm-acts"><button type="button" class="ivm-act ivm-share" aria-label="Copy a link to ' + esc(s.title) + '">' + I_LINK + '</button>' +
        '<button type="button" class="ivm-act ivm-heart" aria-pressed="false" aria-label="Save ' + esc(s.title) + ' to My library">' + I_HEART + '</button></span>' +
      '<span class="ivm-len">' + clock(s.seconds) + '</span></li>';
  }
  function sig(list) { return list.map(function (s) { return [s.id, s.title, s.seconds, s.art, s.episodeTitle].join('|'); }).join('\n'); }
  function totals() {
    var sec = songs.reduce(function (a, s) { return a + (parseInt(s.seconds, 10) || 0); }, 0), h = Math.floor(sec / 3600), m = Math.round(sec % 3600 / 60);
    if (m === 60) { h += 1; m = 0; }
    var c = document.getElementById('ivm-count'), r = document.getElementById('ivm-run');
    if (c) c.textContent = songs.length + (songs.length === 1 ? ' song' : ' songs');
    if (r) r.textContent = (h ? h + ' hr ' : '') + m + ' min';
  }

  /* ---------------- a song named in the address ---------------- */
  function fromAddress() {
    if (LIBMODE) return;
    var id = ''; try { id = new URLSearchParams(window.location.search).get('song') || ''; } catch (e) {}
    var s = id && byId(id); if (!s) return;
    select(s, false);
    var r = rowOf(s.id);
    if (r) { r.classList.add('is-linked'); try { r.scrollIntoView({ block: 'center' }); } catch (e) { r.scrollIntoView(); } }
  }
  fromAddress();

  /* ---------------- the live list (a song added since the last build) ---------------- */
  if (data.live && window.fetch) {
    fetch(data.live).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      var live = d && d.songs;
      if (!live || !live.length || sig(live) === sig(songs)) return;
      var hadSong = !!cur;
      songs = live; order = null;
      if (!LIBMODE) listEl.innerHTML = songs.map(function (s, i) { return rowHtml(s, i + 1); }).join('');
      totals(); paintView();
      if (!hadSong) fromAddress();
    })['catch'](function () {});
  }
})();
