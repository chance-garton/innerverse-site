/* library.js
   My library (/library), 2026-11-25. A Plus+ member's own page, made to match the Library tab of the
   InnerVerse app: saved episodes with their private notes, saved songs (played in place by music.js),
   what they have watched, and the messages they saved in the chat. Everything is read from and
   written to the same store the app uses (library-client.js), so a save here shows there.

   As in the app: a member sees an episode's full version when it has one ("p:<plus slug>"), and a
   save or note written on either version shows on that one row. Marking a full episode watched marks
   its free twin too. A row whose heart or note is taken away stays where it is until the list is
   next drawn, so a slip is one tap to undo.

   Anyone who is not a Plus+ member sees the pitch the page was served with; this script only adds
   the log-in button and the wording for a member whose plan has lapsed. */
(function () {
  'use strict';
  var root = document.getElementById('iv-library');
  if (!root) return;
  var lib = window.ivLib, docEl = document.documentElement;
  var DATA = 'https://raw.githubusercontent.com/chance-garton/innerverse-data/main/';
  var BASE = window.IV_BASE || '';
  var CHAT_SAVED = 'https://circle.innerversepodcast.com/#room=saved';
  var PAGE = 30;
  var TIME_RE = /\b(?:\d{1,2}:)?\d{1,2}:\d{2}\b/;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function svg(d, w, extra) { return '<svg viewBox="0 0 24 24" width="' + w + '" height="' + w + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + d + '</svg>'; }
  var D_HEART = '<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21.5l8.8-8.8a5 5 0 0 0 0-7.1z"></path>';
  var D_CHECK = '<path d="M5 12.5l4.5 4.5L19 7.5"></path>';
  var D_PEN = '<path d="M4 20h4L19 9l-4-4L4 16v4z"></path><path d="M13.5 6.5l4 4"></path>';
  var D_CHAT = '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z"></path>';
  var I_PLAY_S = '<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z"></path></svg>';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function img(u, w) { return u ? (window.ivImg ? window.ivImg(u, w) : u) : ''; }
  function norm(s) {
    s = String(s || '').toLowerCase();
    try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
    return s.replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function toSec(t) { return t.split(':').reduce(function (a, b) { return a * 60 + Number(b); }, 0); }
  function airDate(d) { var p = String(d || '').split('-'); return p.length === 3 && MONTHS[+p[1] - 1] ? MONTHS[+p[1] - 1] + ' ' + (+p[2]) + ', ' + p[0] : ''; }
  function dayOf(ms) { if (!ms) return ''; var d = new Date(ms); return isNaN(d) ? '' : MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }
  function showName(s) { return /^innerverse$/i.test(s) ? 'InnerVerse' : s; }
  function toast(msg) { if (window.ivMusic && window.ivMusic.toast) window.ivMusic.toast(msg); }
  function $(id) { return document.getElementById(id); }

  /* ---------------- not a member: the pitch ---------------- */
  var loginBtn = $('ivl-login');
  if (loginBtn) loginBtn.addEventListener('click', function () {
    var m = window.ivMembership; if (m && m.loginUrl) window.location.href = m.loginUrl();
  });
  var pitchAsked = false;
  function lapsedPitch() {
    var m = window.ivMembership;
    if (pitchAsked || !m || !m.getToken || !m.getToken()) return;
    if (docEl.classList.contains('iv-plus-member') && !root.classList.contains('ivl-locked')) return;
    pitchAsked = true;
    m.checkStatus(function (st) {
      if (!st || !st.signedIn || st.entitled) return;
      var b = $('ivl-join-btns'); if (!b) return;
      $('ivl-join-k').textContent = 'Your membership is not active';
      $('ivl-join-h').textContent = 'Pick your library back up';
      $('ivl-join-p').textContent = 'Everything you saved and wrote is still on your account. Reactivate Plus+ and it is all here again, on the website and in the app.';
      var a = b.querySelectorAll('a');
      if (a.length === 3) {
        b.removeChild(a[0]);
        a[1].classList.add('ivl-join-primary'); a[1].textContent = 'Reactivate for $9 a month';
        a[2].innerHTML = 'Reactivate for $100 a year<span>save $8</span>';
      }
      if (loginBtn) loginBtn.hidden = true;
    });
  }

  /* ---------------- the frame ---------------- */
  var stateEl = $('ivl-state'), bodyEl = $('ivl-body'), chipsEl = $('ivl-chips'), footEl = $('ivl-foot');
  var qEl = $('ivl-q'), qxEl = $('ivl-qx');
  var epSec = $('ivl-eps'), epHead = $('ivl-eps-h'), epList = $('ivl-ep-list'), epMore = $('ivl-ep-more');
  var songSec = $('ivl-songs'), msgSec = $('ivl-msgs'), msgList = $('ivl-msg-list'), msgMore = $('ivl-msg-more');
  var eps = [], byKey = {}, chip = '', query = '', epShown = PAGE, msgShown = PAGE, songsShowing = 0, ready = false, started = false;

  /* ---------------- the episodes a member browses ---------------- */
  function getJSON(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }); }
  function pathOf(u) { var i = String(u || '').indexOf('innerversepodcast.com/'); return i > -1 ? u.slice(i + 'innerversepodcast.com'.length).replace(/\/$/, '') : ''; }
  function makeItems(plusIdx, freeIdx) {
    var out = [], hasFull = {}, seen = {};
    function add(it) {
      if (seen[it.key]) return;
      seen[it.key] = true;
      it.hay = ' ' + norm([it.title, (it.guests || []).join(' '), (it.shows || []).join(' '), it.topicLine || ''].join(' '));
      out.push(it); byKey[it.key] = it;
    }
    var guestsOf = {};
    (freeIdx || []).forEach(function (e) { guestsOf[e.slug] = e.guests || []; });
    (plusIdx || []).forEach(function (e) {
      if (!e || !e.slug || !/\/plus\//.test(e.url || '')) return;
      if (e.freeSlug) hasFull[e.freeSlug] = true;
      add({ key: 'p:' + e.slug, twin: e.freeSlug ? 'e:' + e.freeSlug : '', full: true, href: BASE + '/plus/' + encodeURIComponent(e.slug),
        title: String(e.title || '').replace(/\s*\(PLUS\)\s*$/i, ''), thumb: e.thumb || '', date: e.date || '', duration: e.plusDuration || '',
        shows: (e.shows || []).map(showName), guests: e.guests || guestsOf[e.freeSlug] || [], topicLine: e.topicLine || '' });
    });
    /* an episode with no full version: its free page (as the app does for a member) */
    var frees = (freeIdx && freeIdx.length) ? freeIdx : (plusIdx || []).filter(function (e) { return e && !/\/plus\//.test(e.url || ''); });
    frees.forEach(function (e) {
      if (!e || !e.slug || hasFull[e.slug]) return;
      add({ key: 'e:' + e.slug, twin: '', full: false, href: BASE + (pathOf(e.url) || '/episodes/' + encodeURIComponent(e.slug)),
        title: e.title || '', thumb: e.thumb || '', date: e.date || '', duration: e.duration || '',
        shows: (e.shows || []).map(showName), guests: e.guests || [], topicLine: e.topicLine || '' });
    });
    return out;
  }

  /* the row holding this episode's save or note: its own key, or its free twin's */
  function has(x) { return !!(x && (x.saved || (x.note || '').trim())); }
  function mine(it) { var a = lib.get(it.key), b = it.twin && lib.get(it.twin); return has(a) ? a : has(b) ? b : null; }
  function keyFor(it) { var x = mine(it); return x ? x.key : it.key; }
  function isWatched(it) { var x = lib.get(it.key); return !!(x && x.watched); }
  function setWatched(it, on) {
    var keys = it.full && it.twin ? [it.key, it.twin] : [it.key];
    return Promise.all(keys.filter(function (k) { var x = lib.get(k); return !!(x && x.watched) !== on; }).map(function (k) { return lib.put(k, { watched: on }); }));
  }

  /* ---------------- what the chips and the search leave ---------------- */
  function terms() { return norm(query).split(' ').filter(Boolean); }
  function savedSongCount() { return lib.all().filter(function (x) { return x.saved && /^s:/.test(x.key); }).length; }
  function work() {
    var kept = [], watched = [], c = { saved: 0, notes: 0 };
    eps.forEach(function (it) {
      var x = mine(it);
      if (x) { kept.push(it); if (x.saved) c.saved += 1; if ((x.note || '').trim()) c.notes += 1; }
      if (isWatched(it)) watched.push(it);
    });
    var when = function (it) { var x = mine(it); return x ? Math.max(x.savedAt || 0, x.noteAt || 0) : 0; };
    kept.sort(function (a, b) { return when(b) - when(a); });
    watched.sort(function (a, b) { return ((lib.get(b.key) || {}).watchedAt || 0) - ((lib.get(a.key) || {}).watchedAt || 0); });
    var m = lib.messages(), people = m.people || {};
    var msgs = (m.messages || []).map(function (x) {
      var from = x.fwd && x.fwd.uid ? ((people[x.fwd.uid] && people[x.fwd.uid].name) || 'A member') : 'Your note';
      return { text: String(x.text || '').trim(), from: from, where: (x.fwd && x.fwd.title) || '', when: (x.fwd && x.fwd.created) || x.created || 0, image: !!x.image,
        hay: ' ' + norm([x.text || '', from, (x.fwd && x.fwd.title) || ''].join(' ')) };
    });
    c.watched = watched.length; c.songs = savedSongCount(); c.msgs = msgs.length;
    c.all = kept.length + c.songs + c.msgs;
    var list = chip === 'watched' ? watched : (chip === 'songs' || chip === 'msgs') ? [] : kept;
    if (chip === 'saved') list = list.filter(function (it) { return mine(it).saved; });
    if (chip === 'notes') list = list.filter(function (it) { return (mine(it).note || '').trim(); });
    var t = terms();
    if (t.length) {
      list = list.filter(function (it) {
        var hay = it.hay + ' ' + norm((mine(it) || {}).note || '');
        return t.every(function (w) { return hay.indexOf(w) > -1; });
      });
      msgs = msgs.filter(function (x) { return t.every(function (w) { return x.hay.indexOf(w) > -1; }); });
    }
    if (chip && chip !== 'msgs') msgs = [];
    return { list: list, msgs: msgs, counts: c, terms: t };
  }

  /* ---------------- a note, with its times as links and the search words marked ---------------- */
  function noteHtml(text, t, href) {
    /* a time is a link only where there is an episode to open (a saved message has none) */
    var parts = [href ? '(' + TIME_RE.source + ')' : '($^)'];
    if (t.length) parts.push('(' + t.map(reEsc).join('|') + ')');
    var re = new RegExp(parts.join('|'), 'gi'), out = '', i = 0, m;
    while ((m = re.exec(text))) {
      if (!m[0]) { re.lastIndex++; continue; }
      out += esc(text.slice(i, m.index));
      out += m[1] ? '<a class="ivl-ts" href="' + esc(href + '?t=' + toSec(m[1])) + '" aria-label="Play the episode from ' + esc(m[1]) + '">' + I_PLAY_S + esc(m[1]) + '</a>' : '<mark>' + esc(m[0]) + '</mark>';
      i = m.index + m[0].length;
    }
    return out + esc(text.slice(i));
  }
  /* a window of a long note around the first word that matched */
  function snippet(note, t) {
    var low = note.toLowerCase(), at = -1;
    t.forEach(function (w) { var k = low.indexOf(w); if (k >= 0 && (at < 0 || k < at)) at = k; });
    if (at < 0 || note.length <= 320) return note;
    var a = Math.max(0, at - 110), b = Math.min(note.length, at + 210);
    while (a > 0 && /\S/.test(note.charAt(a - 1))) a--;
    while (b < note.length && /\S/.test(note.charAt(b))) b++;
    return (a > 0 ? '... ' : '') + note.slice(a, b).trim() + (b < note.length ? ' ...' : '');
  }

  /* ---------------- one episode ---------------- */
  function epRow(it, t) {
    var eyebrow = [it.shows && it.shows[0], it.duration].filter(Boolean).map(esc).join('<i></i>');
    var th = img(it.thumb, 500);
    return '<li class="ivl-ep" data-key="' + esc(it.key) + '">' +
      '<a class="ivl-thumb" href="' + esc(it.href) + '" tabindex="-1" aria-hidden="true">' + (th ? '<img src="' + esc(th) + '" alt="" width="320" height="180" loading="lazy" decoding="async">' : '') + '</a>' +
      '<div class="ivl-ep-main">' +
        '<div class="ivl-eyebrow">' + eyebrow + '</div>' +
        '<a class="ivl-title" href="' + esc(it.href) + '">' + esc(it.title) + '</a>' +
        '<div class="ivl-sub"></div>' +
        '<div class="ivl-note" hidden></div>' +
        '<div class="ivl-edit" hidden><label class="ivl-edit-l" for="ivl-n-' + esc(it.key) + '">My notes <span>(private, only you can see them)</span></label>' +
          '<textarea class="ivl-ta" id="ivl-n-' + esc(it.key) + '" maxlength="10000" placeholder="Thoughts, sources to look up, moments to come back to."></textarea></div>' +
        '<div class="ivl-acts">' +
          '<button type="button" class="ivl-act ivl-save" aria-pressed="false"></button>' +
          '<button type="button" class="ivl-act ivl-watch" aria-pressed="false"></button>' +
          '<button type="button" class="ivl-act ivl-noteb" aria-expanded="false"></button>' +
          '<span class="ivl-said" role="status"></span>' +
        '</div>' +
      '</div></li>';
  }
  function paintEp(li, t) {
    var it = byKey[li.getAttribute('data-key')]; if (!it) return;
    t = t || terms();
    var x = mine(it) || {}, note = (x.note || '').trim(), saved = !!x.saved, watched = isWatched(it), editing = li.classList.contains('is-editing');
    var sb = li.querySelector('.ivl-save'), wb = li.querySelector('.ivl-watch'), nb = li.querySelector('.ivl-noteb');
    sb.classList.toggle('is-on', saved); sb.setAttribute('aria-pressed', saved ? 'true' : 'false');
    sb.innerHTML = svg(D_HEART, 15, saved ? ' style="fill:currentColor"' : '') + '<span>' + (saved ? 'Saved' : 'Save<i> episode</i>') + '</span>';
    wb.classList.toggle('is-on', watched); wb.setAttribute('aria-pressed', watched ? 'true' : 'false');
    wb.innerHTML = svg(D_CHECK, 15) + '<span>' + (watched ? 'Watched' : 'Mark as watched') + '</span>';
    nb.classList.toggle('is-on', editing); nb.setAttribute('aria-expanded', editing ? 'true' : 'false');
    nb.innerHTML = svg(D_PEN, 15) + '<span>' + (editing ? 'Done' : note ? 'Edit note' : 'Add a note') + '</span>';
    var inNote = t.length && note && t.some(function (w) { return note.toLowerCase().indexOf(w) > -1; });
    var sub = [airDate(it.date)];
    if (inNote) sub.push('<b>Found in your notes</b>');
    li.querySelector('.ivl-sub').innerHTML = sub.filter(Boolean).join('<i></i>');
    var box = li.querySelector('.ivl-note');
    if (!editing) {
      box.hidden = !note;
      box.classList.remove('is-open');
      box.innerHTML = note ? '<div class="ivl-note-t">' + noteHtml(t.length ? snippet(note, t) : note, t, it.href) + '</div>' : '';
      if (note) clampNote(box);
    }
  }
  /* a long note folds to a few lines with a way to read it all */
  function clampNote(box) {
    var body = box.querySelector('.ivl-note-t');
    if (!body || body.scrollHeight <= body.clientHeight + 4) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'ivl-note-more'; b.textContent = 'Show the whole note';
    b.addEventListener('click', function () { var open = box.classList.toggle('is-open'); b.textContent = open ? 'Show less' : 'Show the whole note'; });
    box.appendChild(b);
  }

  /* ---------------- writing a note in place ---------------- */
  var saveT = null;
  function say(li, msg, back) {
    var s = li.querySelector('.ivl-said'); if (!s) return;
    s.textContent = msg; clearTimeout(s._t);
    if (back) s._t = setTimeout(function () { s.textContent = ''; }, 1800);
  }
  function saveNote(li) {
    clearTimeout(saveT); saveT = null;
    var it = byKey[li.getAttribute('data-key')], ta = li.querySelector('.ivl-ta'); if (!it || !ta) return Promise.resolve();
    var x = mine(it) || {}, v = ta.value;
    if (v === (x.note || '')) return Promise.resolve();
    say(li, 'Saving...');
    return lib.put(keyFor(it), { note: v }).then(function () { say(li, 'Saved', true); }, function () { say(li, 'Not saved yet. Check your connection.'); });
  }
  function openNote(li) {
    var it = byKey[li.getAttribute('data-key')]; if (!it) return;
    var ta = li.querySelector('.ivl-ta'), ed = li.querySelector('.ivl-edit');
    if (li.classList.contains('is-editing')) {          /* Done */
      saveNote(li);
      li.classList.remove('is-editing'); ed.hidden = true;
      paintEp(li); renderChips();
      return;
    }
    li.classList.add('is-editing');
    ta.value = (mine(it) || {}).note || '';
    li.querySelector('.ivl-note').hidden = true; ed.hidden = false;
    paintEp(li);
    grow(ta);
    try { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) {}
  }
  function grow(ta) { ta.style.height = 'auto'; ta.style.height = Math.min(Math.max(ta.scrollHeight + 2, 110), 420) + 'px'; }

  /* A time in a note (2026-11-26): on a desktop it plays on the spot in the pop-out window (listen.js,
     player.js), as the app plays it on the spot. On a phone, with a modifier key held, or when the
     browser blocks the window, the link opens the episode page at that moment, as before. The page does
     not know an episode's audio, so the window is given the episode and the moment on the video clock
     and reads the rest from the episode's data file. */
  function popTime(e, a, it) {
    var P = window.ivListen;
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!P || !P.canPop || !P.canPop()) return;
    var sec = Number((/[?&]t=(\d+)/.exec(a.getAttribute('href') || '') || [])[1]);
    if (!(sec >= 0)) return;
    var tok = P.popOpen(); if (!tok) return;
    e.preventDefault();
    var path = it.href.slice(BASE.length), name = path.split('?')[0].split('/').pop();
    try { name = decodeURIComponent(name); } catch (err) {}
    P.popSend(tok, { key: it.key, play: true, need: { name: name, plus: !!it.full, vt: sec, title: it.title, thumb: it.thumb, show: (it.shows && it.shows[0]) || '', href: path,
      iw: /inner whirled/i.test((it.shows || []).join(' ')) && !/vibe rant/i.test((it.shows || []).join(' ')) } });
  }

  epList.addEventListener('click', function (e) {
    var li = e.target.closest('.ivl-ep'); if (!li) return;
    var it = byKey[li.getAttribute('data-key')]; if (!it) return;
    var ts = e.target.closest('a.ivl-ts');
    if (ts) { popTime(e, ts, it); return; }
    if (e.target.closest('.ivl-save')) {
      var on = !(mine(it) || {}).saved;
      lib.put(keyFor(it), { saved: on }).then(function () { toast(on ? 'Saved to My library.' : 'Removed from My library.'); }, function () { toast('Not saved. Check your connection.'); });
      return;
    }
    if (e.target.closest('.ivl-watch')) {
      var w = !isWatched(it);
      setWatched(it, w).then(function () { toast(w ? 'Marked as watched.' : 'Marked as not watched.'); }, function () { toast('Not saved. Check your connection.'); });
      return;
    }
    if (e.target.closest('.ivl-noteb')) openNote(li);
  });
  epList.addEventListener('input', function (e) {
    var ta = e.target.closest('.ivl-ta'); if (!ta) return;
    var li = ta.closest('.ivl-ep');
    grow(ta);
    clearTimeout(saveT); saveT = setTimeout(function () { saveNote(li); }, 900);
  });
  epList.addEventListener('focusout', function (e) {
    var ta = e.target.closest && e.target.closest('.ivl-ta'); if (ta) saveNote(ta.closest('.ivl-ep'));
  });

  /* ---------------- drawing ---------------- */
  var CHIPS = [['', 'All', 'all'], ['saved', 'Saved', 'saved'], ['songs', 'Songs', 'songs'], ['notes', 'With notes', 'notes'], ['watched', 'Watched', 'watched'], ['msgs', 'Messages', 'msgs']];
  var HEADS = { '': 'Episodes', saved: 'Saved episodes', notes: 'Episodes with notes', watched: 'Watched' };
  function renderChips(counts) {
    counts = counts || work().counts;
    chipsEl.innerHTML = CHIPS.map(function (c) {
      var n = counts[c[2]], on = chip === c[0];
      return '<button type="button" class="ivl-chip' + (on ? ' is-on' : '') + '" data-f="' + c[0] + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + c[1] + (n ? '<span>' + n + '</span>' : '') + '</button>';
    }).join('');
  }
  function msgRow(m, t) {
    var where = m.where ? ' in ' + esc(m.where.replace(/\s*\|\s*(Vibe Rant|Marvelous DeMystifiers|Astro Herbalism|Inner Whirled)[^|]*$/i, '')) : '';
    var shown = t.length ? snippet(m.text, t) : (m.text.length > 400 ? m.text.slice(0, 400).trim() + ' ...' : m.text);
    return '<li class="ivl-msg"><a href="' + CHAT_SAVED + '" target="_blank" rel="noopener">' +
      '<div class="ivl-msg-from">' + svg(D_CHAT, 15) + '<b>' + esc(m.from) + '</b><span>' + where + '</span><time>' + esc(dayOf(m.when)) + '</time></div>' +
      (shown ? '<div class="ivl-msg-t">' + noteHtml(shown, t, '') + '</div>' : '') +
      (m.image ? '<div class="ivl-msg-photo">Photo</div>' : '') + '</a></li>';
  }
  function emptyHtml(counts, t) {
    var heart = svg(D_HEART, 34);
    if (!counts.all && !counts.watched) return '<div class="ivl-empty">' + heart + '<h2>Your library is empty</h2>' +
      '<p>Save any episode or song with its heart, or write a private note on an episode\'s page. Everything you save or write shows up here.</p>' +
      '<div class="ivl-empty-btns"><a class="ivl-btn ivl-btn-gold" href="' + BASE + '/plus">Browse Plus+ Episodes</a><a class="ivl-btn" href="' + BASE + '/music">Browse songs</a></div></div>';
    var msg;
    if (t.length) msg = 'Nothing in your library matches "' + esc(query.trim()) + '".';
    else if (chip === 'saved') msg = 'No saved episodes yet. Choose Save episode on any episode\'s page.';
    else if (chip === 'songs') msg = 'No saved songs yet. Tap the heart on a song to keep it here.';
    else if (chip === 'notes') msg = 'No notes yet. Open an episode and choose Add a note to start one.';
    else if (chip === 'watched') msg = 'Nothing marked watched yet. Episodes you finish are marked for you, or choose Mark as watched on an episode\'s page.';
    else if (chip === 'msgs') msg = 'No saved messages yet. In the chat, press and hold a message and choose Save.';
    else msg = 'Nothing saved yet. Your watched episodes are under Watched.';
    return '<div class="ivl-none"><p>' + msg + '</p>' + (chip === 'songs' && !t.length ? '<a class="ivl-btn" href="' + BASE + '/music">Browse songs</a>' : '') + '</div>';
  }
  function render() {
    if (!ready) return;
    var w = work(), t = w.terms;
    renderChips(w.counts);
    epHead.textContent = HEADS[chip] || 'Episodes';
    epList.innerHTML = w.list.slice(0, epShown).map(function (it) { return epRow(it, t); }).join('');
    epMore.innerHTML = w.list.length > epShown ? '<button type="button" class="ivl-btn">Show more</button>' : '';
    msgList.innerHTML = w.msgs.slice(0, msgShown).map(function (m) { return msgRow(m, t); }).join('');
    msgMore.innerHTML = w.msgs.length > msgShown ? '<button type="button" class="ivl-btn">Show more</button>' : '';
    layout(w);
    /* painted once the section is on show, so a long note can be measured and folded */
    epList.querySelectorAll('.ivl-ep').forEach(function (li) { paintEp(li, t); });
  }
  /* which sections show: whatever has rows drawn in it (a row whose heart was just taken off is
     still there). The songs are drawn by music.js, which says how many it is showing. */
  function layout(w) {
    var songsOn = (chip === '' || chip === 'songs') && songsShowing > 0;
    var epsOn = epList.children.length > 0, msgsOn = msgList.children.length > 0;
    epSec.hidden = !epsOn;
    songSec.hidden = !songsOn;
    msgSec.hidden = !msgsOn;
    var any = epsOn || songsOn || msgsOn;
    bodyEl.hidden = !any;
    stateEl.hidden = !!any;
    if (!any) stateEl.innerHTML = emptyHtml(w.counts, w.terms);
    footEl.hidden = !(w.counts.all || w.counts.watched);
    root.classList.toggle('ivl-is-empty', !w.counts.all && !w.counts.watched);
  }
  document.addEventListener('ivm:view', function (e) { songsShowing = (e.detail && e.detail.showing) || 0; if (ready) { var w = work(); layout(w); renderChips(w.counts); } });

  chipsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.ivl-chip'); if (!b) return;
    chip = b.getAttribute('data-f') || ''; epShown = PAGE; msgShown = PAGE;
    render();
  });
  var qT = null;
  function setQuery(v) {
    query = v; epShown = PAGE; msgShown = PAGE;
    if (window.ivMusic) window.ivMusic.setQuery(norm(v));
    render();
  }
  qEl.addEventListener('input', function () { qxEl.hidden = !qEl.value; clearTimeout(qT); qT = setTimeout(function () { setQuery(qEl.value); }, 140); });
  qEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') qEl.blur(); });
  qxEl.addEventListener('click', function () { qEl.value = ''; qxEl.hidden = true; setQuery(''); qEl.focus(); });
  epMore.addEventListener('click', function (e) { if (e.target.closest('button')) { epShown += PAGE; render(); } });
  msgMore.addEventListener('click', function (e) { if (e.target.closest('button')) { msgShown += PAGE; render(); } });
  var playSongs = $('ivl-playsongs');
  if (playSongs) playSongs.addEventListener('click', function () { if (window.ivMusic) window.ivMusic.playAll(); });

  /* a change made anywhere on the page (a heart on a song, the bar, a row here): the counts follow,
     and the row it belongs to is repainted where it stands */
  if (lib) lib.on(function (key) {
    if (!ready) return;
    renderChips();
    epList.querySelectorAll('.ivl-ep').forEach(function (li) {
      var it = byKey[li.getAttribute('data-key')];
      if (it && (it.key === key || it.twin === key)) paintEp(li);
    });
  });

  /* ---------------- start ---------------- */
  function fail(locked) {
    if (locked) { root.classList.add('ivl-locked'); lapsedPitch(); return; }
    stateEl.hidden = false; bodyEl.hidden = true;
    stateEl.innerHTML = '<div class="ivl-none"><p>Your library could not load. Check your connection and try again.</p><button type="button" class="ivl-btn" id="ivl-retry">Try again</button></div>';
    var r = $('ivl-retry'); if (r) r.addEventListener('click', function () { started = false; stateEl.innerHTML = '<div class="ivl-wait"><span></span><span></span><span></span></div>'; start(); });
  }
  function start() {
    if (started || !lib || !lib.member() || !window.fetch) return;
    started = true;
    var index = Promise.all([getJSON(DATA + 'plus-index.json'), getJSON(DATA + 'episodes-index.json')['catch'](function () { return null; })]);
    Promise.all([lib.load(), index]).then(function (res) {
      byKey = {};
      eps = makeItems((res[1][0] && res[1][0].episodes) || [], (res[1][1] && res[1][1].episodes) || []);
      ready = true;
      render();
    }, function (err) { fail(err && err.status === 401); });
  }
  start();
  /* Continue listening (listen.js, 2026-11-26): what this device was in the middle of, above the search */
  if (window.ivListen) window.ivListen.row($('ivl-continue'), { limit: 8 });
  if (window.MutationObserver) new MutationObserver(function () { start(); lapsedPitch(); }).observe(docEl, { attributes: true, attributeFilter: ['class'] });
  lapsedPitch();
})();
