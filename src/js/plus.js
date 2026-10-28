/* Carried over from the Squarespace Code Injection blocks iv-plus-index, iv-plus-feed-card and iv-plus-membership (its /plus hero and /support card; the membership core is in site.js) (live 2026-10-28). Path read through ivPath(). */

/* ============================================================
   INNERVERSE - THE /plus ARCHIVE (Lapis Library, 2026-09-25)

   The members' archive, drawn the way the /episodes page is drawn
   (same sections, same iva-* classes, same ranked search), in gold.
   The head block hides the native post list from the first frame
   and sets html.iv-archive-2026 (the shared stylesheet and the v2
   nav) plus html.iv-plus-archive (the gold recolour).

   Page order: the existing /plus hero (drawn by iv-plus-membership,
   left in place), then EITHER the centred search area (members:
   eyebrow, heading, one line, the 600px pill, five filter pills) OR
   the perks section (everyone else: what a member gets, in detail,
   with the trial button), then Good first episodes (hidden the moment
   a search or filter applies; a one-at-a-time carousel on phones),
   then All episodes, 24 at a time. Both the search area and the perks
   are built; html.iv-plus-member decides which one shows (a CSS rule
   in the HEADER block), so a member whose cached answer lands after
   first paint flips without a rebuild.

   THE SEARCH IS RANKED by the same scorer as /episodes and the
   homepage: window.ivSubjects (defined by the iv-episodes-search
   FOOTER block on every page). If that block is ever removed, a
   plain substring filter in date order takes over below.

   Data. plus-index.json is the only file that covers the whole
   members' catalogue (Squarespace categories, no Airtable), so it is
   the list. Each entry is then joined to the free side for the
   fields the scorer ranks on: episodes-index.json (guests, subjects),
   episodes/_corpus.json (Topic Line, show categories) and
   episodes-extra.json (chapter, theme and quote mentions). The join
   is by slug first (the same slug on both sides, or the free slug in
   a REDIRECTS entry's url), then by title for the rows whose Plus
   Slug differs from their Slug (the corpus does not carry Plus Slug
   yet; when the build adds it, or adds these fields to
   plus-index.json itself, the title step stops being needed and
   nothing here changes).
   ============================================================ */
(function () {
  'use strict';

  var DATA = 'https://raw.githubusercontent.com/chance-garton/innerverse-data/main/';
  var PLUS_URL = DATA + 'plus-index.json';
  var INDEX_URL = DATA + 'episodes-index.json';
  var CORPUS_URL = DATA + 'episodes/_corpus.json';
  var EXTRA_URL = DATA + 'episodes-extra.json';
  var IV_PLUS_ARCHIVE_BUILD = '2026-09-25b-plusgate';
  var CHECKOUT_TRIAL = 'https://innerverseplus.memberful.com/checkout?plan=149343';

  var PAGE = 24;

  /* Good first episodes, Chance's five in his order (2026-09-24), named by
     their free slug and resolved to the members' page of the same row. */
  var FIRST = ['astrotheology-101', 'chris-crutchfield', 'marizelle-arce-terrain-doctor', 'inner-whirled-25', 'keys-to-the-tarot'];

  /* What a member gets, for the signed-out page. Title, one paragraph, and an
     optional chip. Copy follows the homepage's Plus+ section. */
  var PERKS = [
    ['The full, extended episodes', 'Every conversation keeps going after the free version ends: the second hour, the tangents, the questions that only arrive once the recording relaxes.'],
    ['The whole archive, open', 'Every full episode across InnerVerse and Inner Whirled, searchable by subject, guest, chapter and quote, with new ones landing every week.'],
    ['A private podcast feed', 'One link for your podcast app. Every full episode arrives the day it releases, in Apple Podcasts, Overcast, Pocket Casts or whatever you already use.'],
    ['Chapters on every full episode', 'Jump straight to the part you came for. Members\' chapters run the whole runtime, on the site and in your feed.'],
    ['Uncut and ad free', 'Nothing between you and the conversation: no ads, no trimming for time, no algorithm deciding what you see.'],
    ['The Inner Circle', 'Our members-only chat with Chance and the people who listen the way you do: a lounge that is always open, a room for every episode, on the site and in the InnerVerse app.']
  ];

  /* Squarespace category spellings are the matching keys and are never
     edited; these are display names only. Case is folded on load because a
     re-tagged post once split a show in two with one stray capital. */
  var SHOW_CANON = { 'innerverse': 'InnerVerse', 'inner whirled': 'Inner Whirled', 'vibe rant': 'Vibe Rant', 'astro-herbalism': 'Astro-Herbalism' };
  var SHOW_ORDER = ['InnerVerse', 'Inner Whirled', 'Vibe Rant', 'Astro-Herbalism'];
  var THEME_LABEL = { 'Myth-Symbolism-Language': 'Myth, Symbolism & Language', 'Consciousness And Reality': 'Consciousness & Reality' };
  var GUEST_HIDE = ['Chance Garton'];
  var MIN_TAG = 2, MIN_GUEST = 2;

  var FILTERS = [
    { key: 'topics', label: 'Theme', min: 1 },
    { key: 'shows',  label: 'Show',  min: 1, fixed: SHOW_ORDER },
    { key: 'guests', label: 'Guest', min: MIN_GUEST, hide: GUEST_HIDE, find: 'Find a guest', note: 'Guests with two or more episodes, busiest first' },
    { key: 'tags',   label: 'Subject', min: MIN_TAG, find: 'Find a subject', note: 'Subjects on two or more episodes, busiest first' },
    { key: 'year',   label: 'Year',  min: 1 }
  ];
  var URL_KEY = { topics: 'theme', shows: 'show', guests: 'guest', tags: 'tag', year: 'year' };

  var PH_REST = 'a topic, a guest, a feeling';
  var TRY_TERMS = ['astrotheology', 'biofield tuning', 'tartaria', 'gematria', 'etymology', 'sound healing',
    'gnosticism', 'atlantis', 'sacred geometry', 'terrain theory', 'chakras', 'synchronicity', 'plant medicine',
    'oera linda', 'mud flood', 'simulation theory', 'Dylan Saccoccio', 'Mario Garza', 'Marty Leeds',
    'Eileen McKusick', 'Kyle Denton', 'Jason Quitt', 'Steven Young', 'Topher Gardner',
    'grief', 'fear', 'dreams', 'trauma', 'initiation', 'purpose', 'death', 'healing', 'sleep'];

  var SVG = {
    search: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>',
    searchSm: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>',
    chev: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>',
    x: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>',
    sort: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"></path></svg>',
    tick: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"></path></svg>',
    prev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg>',
    next: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>'
  };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ---------------- state ---------------- */
  var episodes = [], bySlug = {}, byFree = {};
  var extra = {};          // plus slug -> the free row's extra (string today, structured later)
  var query = '', year = '', sort = 'newest', shown = PAGE;
  var picked = { topics: '', shows: '', guests: '', tags: '' };
  var els = {}, openPanel = null, refreshers = [];
  var tryTerms = null;

  function onPlusIndex() {
    return ivPath().replace(/\/+$/, '').toLowerCase() === '/plus';
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function clean(s) { return String(s || '').replace(/—|–/g, ', '); }
  /* Most stored /plus titles end in "(PLUS)"; on a page that is entirely Plus
     that suffix is noise, so it comes off for display. */
  function cleanTitle(t) { return clean(t).replace(/\s*\(\s*PLUS\s*\)\s*$/i, '').trim(); }
  function normTitle(t) {
    return String(t || '').toLowerCase().replace(/\s*\(\s*plus\s*\)\s*$/i, '').replace(/\*?preview\*?/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function termsOf(q) {
    if (window.ivSubjects && window.ivSubjects.prepare) return window.ivSubjects.prepare(q).terms;
    return String(q || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(function (t) { return t.length >= 2; });
  }
  function labelFor(key, value) {
    if (key === 'topics') return THEME_LABEL[value] || value;
    return value;
  }
  function showOf(e) {
    var shows = e.shows || [];
    if (shows.indexOf('Astro-Herbalism') >= 0) return 'Astro-Herbalism';
    return shows[0] || 'InnerVerse';
  }
  function whenOf(e) {
    var p = String(e.date || '').split('-');
    if (p.length < 2) return '';
    var m = MONTHS[parseInt(p[1], 10) - 1];
    return m ? m + ' ' + p[0] : '';
  }
  function guestLine(e) {
    var g = (e.guests || []).filter(function (n) { return n !== 'Chance Garton'; });
    var names = g.length > 2 ? g.slice(0, 2).join(', ') + ' +' + (g.length - 2) : g.join(', ');
    var when = whenOf(e);
    return names ? (names + (when ? ' · ' + when : '')) : when;
  }
  function img(url, w) { return (window.ivImg ? window.ivImg(url, w) : url); }

  /* ---------------- the list and its join to the free side ---------------- */
  function canonShows(list) {
    var out = [];
    (list || []).forEach(function (v) {
      var c = SHOW_CANON[String(v).toLowerCase()] || v;
      if (out.indexOf(c) < 0) out.push(c);
    });
    return out;
  }
  function freeSlugOf(p) {
    if (p.freeSlug) return p.freeSlug;
    var m = String(p.url || '').match(/\/episodes\/([^\/?#]+)/);
    return m ? decodeURIComponent(m[1]) : p.slug;
  }
  function makeEpisode(p) {
    var e = {
      slug: p.slug, freeSlug: freeSlugOf(p), title: cleanTitle(p.title), url: p.url, thumb: p.thumb,
      shows: canonShows(p.shows), topics: (p.themes || []).slice(), date: p.date || '',
      year: parseInt(String(p.date || '').slice(0, 4), 10) || '',
      guests: [], tags: [], topicLine: '', plusDuration: p.plusDuration || p.duration || ''
    };
    if (p.guests && p.guests.length) e.guests = p.guests.slice();
    if (p.tags && p.tags.length) e.tags = p.tags.slice();
    if (p.topicLine) e.topicLine = p.topicLine;
    return e;
  }
  /* The free index gives guests and subjects; the corpus gives the Topic Line
     and the full show list. Inner Whirled is always Chance and Dylan, so a row
     with no guest data still finds its co-host. */
  function joinFree(freeList, corpusRecs) {
    var free = {}, freeTitle = {}, corp = {}, corpTitle = {};
    (freeList || []).forEach(function (f) { free[f.slug] = f; var t = normTitle(f.title); if (t && !freeTitle[t]) freeTitle[t] = f; });
    (corpusRecs || []).forEach(function (r) {
      var f = r.fields || {};
      if (!f.Slug) return;
      corp[f.Slug] = f;
      var t = normTitle(f.Title); if (t && !corpTitle[t]) corpTitle[t] = f;
    });
    episodes.forEach(function (e) {
      var t = normTitle(e.title);
      var f = free[e.slug] || free[e.freeSlug] || null;
      var c = corp[e.slug] || corp[e.freeSlug] || null;
      if (!c && corpTitle[t]) c = corpTitle[t];
      if (!f && c && free[c.Slug]) f = free[c.Slug];
      if (!f && freeTitle[t]) f = freeTitle[t];
      if (f) {
        e.freeSlug = f.slug;
        if (!e.guests.length && f.guests) e.guests = f.guests.slice();
        if (!e.tags.length && f.tags) e.tags = f.tags.slice();
        e.shows = canonShows(e.shows.concat(f.shows || []));
      }
      if (c) {
        if (!e.topicLine && c['Topic Line']) e.topicLine = c['Topic Line'];
        e.shows = canonShows(e.shows.concat(c['Show Categories'] || []));
        if (!f && c.Slug) e.freeSlug = c.Slug;
      }
      if (!e.guests.length && e.shows.indexOf('Inner Whirled') >= 0) e.guests = ['Dylan Saccoccio'];
      e.shows = e.shows.filter(function (s) { return SHOW_ORDER.indexOf(s) >= 0; });
      if (!e.shows.length) e.shows = ['InnerVerse'];
      byFree[e.freeSlug] = e;
      delete e.__doc;
    });
  }

  /* ---------------- ranking ---------------- */
  function matches() {
    var list = episodes, s = window.ivSubjects;
    if (s && s.filter) return s.filter(list, extra, query, picked, year, sort);
    /* fallback: substring AND in date order */
    var terms = termsOf(query);
    var base = list.filter(function (e) {
      for (var k in picked) { if (picked[k] && (e[k] || []).indexOf(picked[k]) === -1) return false; }
      if (year && String(e.year) !== String(year)) return false;
      if (!terms.length) return true;
      var hay = (e.title + ' ' + e.guests.join(' ') + ' ' + e.tags.join(' ') + ' ' + e.topicLine + ' ' + e.shows.join(' ')).toLowerCase();
      for (var i = 0; i < terms.length; i++) { if (hay.indexOf(terms[i]) < 0) return false; }
      return true;
    });
    base.sort(function (a, b) { return sort === 'oldest' ? (a.date > b.date ? 1 : -1) : (a.date < b.date ? 1 : -1); });
    base.forEach(function (e) { e.__why = ''; e.__close = false; });
    return base;
  }
  function filtering() {
    return !!(termsOf(query).length || year || picked.shows || picked.tags || picked.guests || picked.topics);
  }
  function isMember() { return document.documentElement.classList.contains('iv-plus-member'); }

  function readUrlState() {
    var p;
    try { p = new URLSearchParams(window.location.search); } catch (e) { return; }
    Object.keys(URL_KEY).forEach(function (key) {
      var v = p.get(URL_KEY[key]);
      if (!v) return;
      if (key === 'year') { if (/^\d{4}$/.test(v)) year = v; return; }
      var hitV = null;
      episodes.forEach(function (e) {
        (e[key] || []).forEach(function (x) { if (!hitV && (x.toLowerCase() === v.toLowerCase() || labelFor(key, x).toLowerCase() === v.toLowerCase())) hitV = x; });
      });
      if (hitV) picked[key] = hitV;
    });
    var q = p.get('q');
    if (q) query = q;
    var s = p.get('sort');
    if (s === 'oldest' || s === 'newest' || s === 'best') sort = s;
    else sort = termsOf(query).length ? 'best' : 'newest';
  }
  function writeUrlState() {
    if (!window.history || !history.replaceState) return;
    var p = new URLSearchParams();
    if (termsOf(query).length) p.set('q', query.trim());
    Object.keys(URL_KEY).forEach(function (key) {
      var v = key === 'year' ? year : picked[key];
      if (v) p.set(URL_KEY[key], v);
    });
    var defaultSort = termsOf(query).length ? 'best' : 'newest';
    if (sort !== defaultSort) p.set('sort', sort);
    var qs = p.toString();
    try { history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '')); } catch (e) {}
  }

  function counts(key) {
    var c = {};
    episodes.forEach(function (e) {
      if (key === 'year') { if (e.year) c[e.year] = (c[e.year] || 0) + 1; return; }
      (e[key] || []).forEach(function (v) { c[v] = (c[v] || 0) + 1; });
    });
    return c;
  }
  function valuesFor(f) {
    var c = counts(f.key), hide = f.hide || [], vals;
    if (f.fixed) {
      vals = f.fixed.filter(function (v) { return c[v] && hide.indexOf(v) === -1; });
    } else if (f.key === 'year') {
      vals = Object.keys(c).sort(function (a, b) { return b - a; });
    } else {
      vals = Object.keys(c).filter(function (v) { return c[v] >= f.min && hide.indexOf(v) === -1; });
      vals.sort(function (a, b) { return c[b] - c[a] || a.localeCompare(b); });
    }
    return vals.map(function (v) { return { value: v, n: c[v] }; });
  }
  function pickedOf(key) { return key === 'year' ? year : picked[key]; }
  function setPicked(key, v) { if (key === 'year') year = v; else picked[key] = v; }

  /* ---------------- cards ---------------- */
  function metaHtml(e) {
    return esc(showOf(e)) + (e.plusDuration ? ' &middot; ' + esc(e.plusDuration) : '');
  }
  function cardHtml(e, w, why) {
    return '<a class="iva-card" href="' + esc(e.url) + '">' +
      '<div class="iva-thumb">' + (e.thumb ? '<img src="' + esc(img(e.thumb, w)) + '" alt="" loading="lazy">' : '') + '</div>' +
      '<div class="iva-card-body">' +
        '<div class="iva-meta">' + metaHtml(e) + '</div>' +
        '<div class="iva-title">' + esc(e.title) + '</div>' +
        '<div class="iva-line">' + esc(guestLine(e)) + '</div>' +
        (why ? '<div class="iva-why">' + SVG.tick + '<span>' + esc(why) + '</span></div>' : '') +
      '</div></a>';
  }

  /* ---------------- render ---------------- */
  function render() {
    var found = matches();
    var q = query.trim(), hasQ = termsOf(q).length > 0, isFiltering = filtering();

    if (isFiltering) {
      var n = found.filter(function (e) { return !e.__close; }).length;
      var what = hasQ ? ' about <em>“' + esc(q) + '”</em>' : (picked.guests ? ' with ' + esc(picked.guests) : picked.shows ? ' on ' + esc(picked.shows) : picked.tags ? ' about ' + esc(picked.tags) : picked.topics ? ' in ' + esc(labelFor('topics', picked.topics)) : year ? ' from ' + esc(year) : '');
      els.h1.innerHTML = '<span class="iva-n">' + n + '</span> ' + (n === 1 ? 'episode' : 'episodes') + what;
      els.sub.textContent = hasQ ? 'Best matches first: the episodes that are about it, then the ones that mention it.' : 'Newest first. Add a word or another filter to narrow it.';
      els.clear.style.display = '';
      els.resultsEyebrow.textContent = 'Results';
      els.resultsH2.textContent = hasQ ? 'Matches' : 'Episodes';
    } else {
      els.h1.textContent = 'What makes you curious today?';
      els.sub.textContent = 'Every full, extended episode in one place. A subject, a guest, a question; chapters and quotes are searchable too.';
      els.clear.style.display = 'none';
      els.resultsEyebrow.textContent = isMember() ? 'Plus+ episodes' : 'Inside Plus+';
      els.resultsH2.textContent = isMember() ? 'All episodes' : 'Every full episode';
    }
    els.first.classList.toggle('iva-hidden', isFiltering || !els.firstCount);

    var sortLabel = sort === 'best' ? 'Best match' : sort === 'newest' ? 'Newest first' : 'Oldest first';
    els.sort.innerHTML = SVG.sort + esc(sortLabel);
    els.sort.style.display = (found.length || isFiltering) ? '' : 'none';

    els.narrow.innerHTML = '';
    if (hasQ && found.length) {
      var tc = {}, qWords = termsOf(q);
      found.forEach(function (e) { (e.tags || []).forEach(function (t) { tc[t] = (tc[t] || 0) + 1; }); });
      var tags = Object.keys(tc).filter(function (t) {
        if (picked.tags === t) return false;
        var nt = t.toLowerCase();
        return !qWords.some(function (w) { return nt === w || nt.indexOf(w) >= 0; }) && tc[t] >= 2;
      }).sort(function (a, b) { return tc[b] - tc[a] || a.localeCompare(b); }).slice(0, 6);
      if (tags.length) {
        els.narrow.appendChild(el('span', 'iva-narrow-label', 'Narrow it down'));
        tags.forEach(function (t) {
          var c = el('button', 'iva-chip');
          c.type = 'button';
          c.innerHTML = esc(t) + '<span class="iva-pill-n">' + tc[t] + '</span>';
          c.addEventListener('click', function () { picked.tags = t; refreshers.forEach(function (f) { f(); }); reset(); });
          els.narrow.appendChild(c);
        });
      }
    }
    els.narrow.style.display = els.narrow.children.length ? '' : 'none';

    els.grid.innerHTML = '';
    els.empty.style.display = 'none';
    els.more.style.display = 'none';
    if (!found.length) {
      els.emptyH.textContent = hasQ ? 'Nothing matched “' + q + '”.' : 'Nothing matched that combination.';
      els.empty.style.display = '';
      return;
    }
    var frag = document.createDocumentFragment(), dividerDone = false;
    found.slice(0, shown).forEach(function (e) {
      if (e.__close && !dividerDone) { dividerDone = true; frag.appendChild(el('li', 'iva-divider', 'Close matches')); }
      var li = document.createElement('li');
      li.innerHTML = cardHtml(e, 500, hasQ ? e.__why : '');
      frag.appendChild(li);
    });
    els.grid.appendChild(frag);
    if (found.length > shown) {
      els.more.textContent = hasQ ? 'Show more results' : 'Show more episodes';
      els.more.style.display = '';
    }
  }
  function reset() { shown = PAGE; closePanels(); writeUrlState(); render(); }

  /* ---------------- filters ---------------- */
  function closePanels() {
    if (!openPanel) return;
    openPanel.panel.className = 'iva-panel';
    openPanel.btn.classList.remove('iva-open');
    openPanel.btn.setAttribute('aria-expanded', 'false');
    openPanel = null;
  }
  function buildFilter(f, host) {
    var btn = el('button', 'iva-fbtn');
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    var lbl = el('span', 'iva-flabel');
    var caret = el('span', 'iva-fcaret'); caret.innerHTML = SVG.chev;
    var clearBtn = el('span', 'iva-fclear'); clearBtn.innerHTML = SVG.x; clearBtn.setAttribute('aria-label', 'Clear ' + f.label);
    btn.appendChild(lbl); btn.appendChild(caret);

    var panel = el('div', 'iva-panel');
    var inner = el('div', 'iva-panel-inner');
    var top = el('div', 'iva-panel-top');
    var findInput = null;
    if (f.find) {
      var findBox = el('label', 'iva-panel-find');
      findBox.innerHTML = SVG.searchSm;
      findInput = document.createElement('input');
      findInput.type = 'text';
      findInput.placeholder = f.find;
      findInput.setAttribute('aria-label', f.find);
      findBox.appendChild(findInput);
      top.appendChild(findBox);
    }
    if (f.note) top.appendChild(el('div', 'iva-panel-note', f.note));
    if (top.children.length) inner.appendChild(top);
    var list = el('ul', 'iva-pills');
    var pills = [];
    valuesFor(f).forEach(function (item) {
      var li = document.createElement('li');
      var pill = el('button', 'iva-pill');
      pill.type = 'button';
      pill.setAttribute('data-value', item.value);
      pill.innerHTML = esc(labelFor(f.key, item.value)) + '<span class="iva-pill-n">' + item.n + '</span>';
      pill.addEventListener('click', function () {
        setPicked(f.key, pickedOf(f.key) === item.value ? '' : item.value);
        refresh();
        reset();
      });
      li.appendChild(pill);
      list.appendChild(li);
      pills.push({ li: li, pill: pill, value: item.value, label: labelFor(f.key, item.value).toLowerCase() });
    });
    inner.appendChild(list);
    panel.appendChild(inner);
    if (findInput) {
      findInput.addEventListener('input', function () {
        var v = findInput.value.trim().toLowerCase();
        pills.forEach(function (p) { p.li.classList.toggle('iva-hidden', !!v && p.label.indexOf(v) === -1); });
      });
    }
    function refresh() {
      var v = pickedOf(f.key);
      lbl.innerHTML = v ? '<span class="iva-fkey">' + esc(f.label) + ':</span> ' + esc(labelFor(f.key, v)) : esc(f.label);
      btn.classList.toggle('iva-active', !!v);
      if (v) { if (caret.parentNode) btn.removeChild(caret); if (!clearBtn.parentNode) btn.appendChild(clearBtn); }
      else { if (clearBtn.parentNode) btn.removeChild(clearBtn); if (!caret.parentNode) btn.appendChild(caret); }
      pills.forEach(function (p) { p.pill.classList.toggle('iva-on', p.value === v); });
    }
    refreshers.push(refresh);
    btn.addEventListener('click', function (ev) {
      if (clearBtn.parentNode && (ev.target === clearBtn || clearBtn.contains(ev.target))) {
        setPicked(f.key, '');
        refresh();
        reset();
        return;
      }
      var isOpen = openPanel && openPanel.key === f.key;
      closePanels();
      if (!isOpen) {
        panel.className = 'iva-panel iva-open';
        btn.classList.add('iva-open');
        btn.setAttribute('aria-expanded', 'true');
        openPanel = { key: f.key, panel: panel, btn: btn };
        if (findInput && window.innerWidth > 700) { try { findInput.focus(); } catch (e) {} }
      }
    });
    if (!pills.length) return;
    host.btns.appendChild(btn);
    host.panels.appendChild(panel);
    refresh();
  }

  /* ---------------- the try-term placeholder (as on /episodes) ----------------
     Only terms that find something in the members' archive are offered. */
  function liveTryTerms() {
    if (tryTerms) return tryTerms;
    var s = window.ivSubjects;
    var pool = TRY_TERMS.filter(function (t) {
      if (!s || !s.rank) return true;
      try { return s.rank(episodes, t).hits.length > 0; } catch (e) { return true; }
    });
    if (pool.length < 5) pool = TRY_TERMS.slice();
    for (var k = pool.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)); var tmp = pool[k]; pool[k] = pool[j]; pool[j] = tmp; }
    tryTerms = pool;
    return pool;
  }
  function startTry(input) {
    var ti = -1, timer = null, phTerm = '';
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function setPh(text) {
      if (reduce) { input.setAttribute('placeholder', text); return; }
      input.classList.add('iva-ph-fade');
      setTimeout(function () { input.setAttribute('placeholder', text); input.classList.remove('iva-ph-fade'); }, 260);
    }
    function nextTerm() {
      if (document.hidden || document.activeElement === input || input.value.trim()) return;
      var order = liveTryTerms();
      ti++;
      phTerm = order[ti % order.length];
      setPh('try “' + phTerm + '”');
    }
    setTimeout(function () {
      nextTerm();
      if (!reduce) timer = setInterval(nextTerm, 3500);
    }, 5000);
    input.addEventListener('focus', function () { input.setAttribute('placeholder', PH_REST); });
    return function currentTerm() { return phTerm; };
  }

  /* ---------------- the phone carousel ---------------- */
  function buildCarousel(list) {
    var car = el('div', 'iva-car');
    var track = el('div', 'iva-car-track');
    track.setAttribute('aria-label', 'Good first episodes');
    list.forEach(function (e) { track.insertAdjacentHTML('beforeend', cardHtml(e, 750, '')); });
    var ctl = el('div', 'iva-car-ctl');
    var prev = el('button', 'iva-car-arrow'); prev.type = 'button'; prev.setAttribute('aria-label', 'Previous episode'); prev.innerHTML = SVG.prev;
    var next = el('button', 'iva-car-arrow'); next.type = 'button'; next.setAttribute('aria-label', 'Next episode'); next.innerHTML = SVG.next;
    var mid = el('div', 'iva-car-mid');
    var dots = el('div', 'iva-car-dots');
    list.forEach(function () { dots.appendChild(el('span', 'iva-car-dot')); });
    var count = el('div', 'iva-car-count', '1 of ' + list.length);
    mid.appendChild(dots); mid.appendChild(count);
    ctl.appendChild(prev); ctl.appendChild(mid); ctl.appendChild(next);
    car.appendChild(track); car.appendChild(ctl);

    var n = list.length, cur = 0, timer = null, visible = true, touching = false;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function cardAt(i) { return track.children[i]; }
    function paint() {
      [].forEach.call(dots.children, function (d, i) { d.classList.toggle('iva-on', i === cur); });
      count.textContent = (cur + 1) + ' of ' + n;
    }
    function goTo(i, smooth) {
      cur = (i + n) % n;
      var c = cardAt(cur);
      if (!c) return;
      try { track.scrollTo({ left: c.offsetLeft - 20, behavior: smooth && !reduce ? 'smooth' : 'auto' }); }
      catch (e) { track.scrollLeft = c.offsetLeft - 20; }
      paint();
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function start() {
      stop();
      if (reduce || !visible || touching || document.hidden || !track.offsetWidth) return;
      timer = setInterval(function () { goTo(cur + 1, true); }, 6000);
    }
    prev.addEventListener('click', function () { goTo(cur - 1, true); start(); });
    next.addEventListener('click', function () { goTo(cur + 1, true); start(); });
    track.addEventListener('touchstart', function () { touching = true; stop(); }, { passive: true });
    track.addEventListener('touchend', function () { touching = false; start(); }, { passive: true });
    var st = null;
    track.addEventListener('scroll', function () {
      clearTimeout(st);
      st = setTimeout(function () {
        var best = 0, bestD = Infinity;
        for (var i = 0; i < n; i++) {
          var d = Math.abs(cardAt(i).offsetLeft - 20 - track.scrollLeft);
          if (d < bestD) { bestD = d; best = i; }
        }
        if (best !== cur) { cur = best; paint(); }
      }, 80);
    }, { passive: true });
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start(); else stop();
      }, { threshold: 0.4 }).observe(car);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    paint();
    setTimeout(start, 400);
    return car;
  }

  /* ---------------- build ---------------- */
  function build() {
    // 1. the search area
    var hero = el('section', 'iva-hero');
    hero.setAttribute('aria-label', 'Search the Plus+ archive');
    var hw = el('div', 'iva-wrap');
    var head = el('div', 'iva-head');
    head.appendChild(el('div', 'iva-eyebrow', 'Explore InnerVerse Plus+'));
    var h1row = el('div', 'iva-h1row');
    var h1 = el('h1', 'iva-h1');
    var clearBtn = el('button', 'iva-clear');
    clearBtn.type = 'button';
    clearBtn.setAttribute('aria-label', 'Clear search and filters');
    clearBtn.innerHTML = SVG.x + '<span>Clear</span>';
    clearBtn.style.display = 'none';
    h1row.appendChild(h1); h1row.appendChild(clearBtn);
    head.appendChild(h1row);
    var sub = el('p', 'iva-sub');
    head.appendChild(sub);
    hw.appendChild(head);

    var form = el('form', 'iva-search');
    form.setAttribute('role', 'search');
    var field = el('label', 'iva-field');
    field.innerHTML = SVG.search;
    var input = document.createElement('input');
    input.type = 'search';
    input.className = 'iva-input';
    input.id = 'iva-q';
    input.placeholder = PH_REST;
    input.setAttribute('aria-label', 'Search the Plus+ archive');
    input.setAttribute('autocomplete', 'off');
    if (query) input.value = query;
    field.appendChild(input);
    var find = el('button', 'iva-find', 'Find');
    find.type = 'submit';
    field.appendChild(find);
    form.appendChild(field);
    hw.appendChild(form);

    var btns = el('div', 'iva-filters');
    var panels = el('div', 'iva-panels');
    hw.appendChild(btns);
    hw.appendChild(panels);
    FILTERS.forEach(function (f) { buildFilter(f, { btns: btns, panels: panels }); });
    var narrow = el('div', 'iva-narrow');
    narrow.style.display = 'none';
    hw.appendChild(narrow);
    hero.appendChild(hw);

    var currentTerm = startTry(input);
    var t = null;
    input.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var was = termsOf(query).length > 0, now = termsOf(input.value).length > 0;
        query = input.value;
        if (was !== now) sort = now ? 'best' : 'newest';
        reset();
      }, 140);
    });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      clearTimeout(t);
      if (!input.value.trim() && currentTerm()) input.value = currentTerm();
      var now = termsOf(input.value).length > 0;
      if ((termsOf(query).length > 0) !== now) sort = now ? 'best' : 'newest';
      query = input.value;
      reset();
      try { input.blur(); } catch (e) {}
    });
    clearBtn.addEventListener('click', function () {
      query = ''; year = ''; input.value = '';
      Object.keys(picked).forEach(function (k) { picked[k] = ''; });
      sort = 'newest';
      refreshers.forEach(function (f) { f(); });
      reset();
    });

    // 1b. the perks section, shown instead of the search area to anyone who
    //     is not a confirmed member (the HEADER rule decides which shows)
    var perks = el('section', 'ivp-perks');
    perks.setAttribute('aria-label', 'What Plus+ members get');
    var loginHref = (window.ivMembership && window.ivMembership.loginUrl) ? window.ivMembership.loginUrl() : '/plus';
    perks.innerHTML = '<div class="iva-wrap">' +
      '<div class="ivp-perks-head"><div class="iva-eyebrow">Inside Plus+</div>' +
        '<h2 class="iva-h2">What members get.</h2>' +
        '<p class="iva-sub">The free show begins the journey. <em>Plus+ is your initiation.</em></p></div>' +
      '<ul class="ivp-perk-grid">' +
        PERKS.map(function (p) {
          return '<li class="ivp-perk"><span class="ivp-perk-mark">' + SVG.tick + '</span>' +
            '<div class="ivp-perk-title">' + esc(p[0]) + (p[2] ? '<span class="ivp-soon">' + esc(p[2]) + '</span>' : '') + '</div>' +
            '<p class="ivp-perk-body">' + esc(p[1]) + '</p></li>';
        }).join('') +
      '</ul>' +
      '<div class="ivp-perks-cta"><div class="ivp-perks-btns">' +
        '<a class="iva-btn iva-btn-gold iva-btn-lg" href="' + CHECKOUT_TRIAL + '">Start your 7-day free trial</a>' +
        '<a class="iva-btn iva-btn-outline iva-btn-lg" href="' + esc(loginHref) + '">Already a member? Log in</a>' +
      '</div><div class="ivp-perks-small">Then $9 a month. Cancel any time. Every full episode, unlocked.</div></div>' +
    '</div>';

    // 2. Good first episodes (the five, on their members' pages)
    var first = el('section', 'iva-first');
    first.setAttribute('aria-label', 'Good first episodes');
    var fw = el('div', 'iva-wrap');
    var fhead = el('div', 'iva-first-head');
    var fh = el('div');
    fh.appendChild(el('div', 'iva-eyebrow', 'New here?'));
    fh.appendChild(el('h2', 'iva-h2', 'Good first episodes'));
    fhead.appendChild(fh);
    fhead.appendChild(el('div', 'iva-note', 'Hand-picked. Disappears once you search or filter.'));
    fw.appendChild(fhead);
    var picks = FIRST.map(function (s) { return byFree[s] || bySlug[s]; }).filter(Boolean);
    var fgrid = el('ul', 'iva-first-grid');
    picks.forEach(function (e) { var li = document.createElement('li'); li.innerHTML = cardHtml(e, 500, ''); fgrid.appendChild(li); });
    fw.appendChild(fgrid);
    if (picks.length) fw.appendChild(buildCarousel(picks));
    first.appendChild(fw);

    // 3. results
    var results = el('section', 'iva-results');
    results.setAttribute('aria-label', 'All Plus+ episodes');
    var rw = el('div', 'iva-wrap');
    var rhead = el('div', 'iva-results-head');
    var rh = el('div');
    var resultsEyebrow = el('div', 'iva-eyebrow', 'Plus+ episodes');
    var resultsH2 = el('h2', 'iva-h2', 'All episodes');
    rh.appendChild(resultsEyebrow); rh.appendChild(resultsH2);
    rhead.appendChild(rh);
    var sortBtn = el('button', 'iva-sort');
    sortBtn.type = 'button';
    sortBtn.addEventListener('click', function () {
      var hasQ = termsOf(query).length > 0;
      if (hasQ) sort = sort === 'best' ? 'newest' : sort === 'newest' ? 'oldest' : 'best';
      else sort = sort === 'newest' ? 'oldest' : 'newest';
      reset();
    });
    rhead.appendChild(sortBtn);
    rw.appendChild(rhead);
    var grid = el('ul', 'iva-grid');
    rw.appendChild(grid);
    var empty = el('div', 'iva-empty');
    var emptyH = el('h2', 'iva-h2');
    empty.appendChild(emptyH);
    empty.appendChild(el('p', null, 'Try one word instead of two, a guest’s name, or start from a subject and follow it from there.'));
    var emptyChips = el('div', 'iva-empty-chips');
    var tagCounts = counts('tags');
    Object.keys(tagCounts).sort(function (a, b) { return tagCounts[b] - tagCounts[a] || a.localeCompare(b); }).slice(0, 10).forEach(function (tg) {
      var c = el('button', 'iva-chip', tg);
      c.type = 'button';
      c.addEventListener('click', function () {
        query = ''; input.value = ''; year = '';
        Object.keys(picked).forEach(function (k) { picked[k] = ''; });
        picked.tags = tg; sort = 'newest';
        refreshers.forEach(function (f) { f(); });
        reset();
      });
      emptyChips.appendChild(c);
    });
    empty.appendChild(emptyChips);
    var emptyClear = el('button', 'iva-btn iva-btn-outline', 'Clear the search');
    emptyClear.type = 'button';
    emptyClear.addEventListener('click', function () { clearBtn.click(); });
    empty.appendChild(emptyClear);
    empty.style.display = 'none';
    rw.appendChild(empty);
    var moreWrap = el('div', 'iva-more-wrap');
    var more = el('button', 'iva-btn iva-btn-outline iva-btn-lg', 'Show more episodes');
    more.type = 'button';
    more.style.display = 'none';
    more.addEventListener('click', function () { shown += PAGE; render(); });
    moreWrap.appendChild(more);
    rw.appendChild(moreWrap);
    results.appendChild(rw);

    els = { h1: h1, sub: sub, clear: clearBtn, input: input, narrow: narrow, first: first, firstCount: picks.length,
      resultsEyebrow: resultsEyebrow, resultsH2: resultsH2, sort: sortBtn, grid: grid, empty: empty, emptyH: emptyH, more: more };
    return [hero, perks, first, results];
  }

  /* The five hand-built category buttons are hidden by id in the stylesheet
     for a flash-free hide; this sweep is the durable half. */
  function hideOldCategoryButtons() {
    [].forEach.call(document.querySelectorAll('a[href*="/plus/category/"]'), function (a) {
      if (a.closest && a.closest('.collection-content-wrapper')) return;
      var cell = a.closest ? a.closest('[class*="fe-block"]') : null;
      if (cell) cell.style.display = 'none';
    });
  }

  function mount() {
    var host = document.querySelector('.blog-basic-grid.collection-content-wrapper, .collection-content-wrapper');
    if (!host || !host.parentNode) return false;
    readUrlState();
    var parts = build();
    parts.forEach(function (p) { host.parentNode.insertBefore(p, host); });
    hideOldCategoryButtons();
    render();
    if (termsOf(query).length) { try { els.input.focus(); } catch (e) {} }
    document.addEventListener('click', function (ev) {
      if (!openPanel) return;
      if (openPanel.panel.contains(ev.target) || openPanel.btn.contains(ev.target)) return;
      closePanels();
    });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closePanels(); });
    /* The HEADER rule swaps the search area and the perks by class; the
       results heading copy follows here. */
    if (window.MutationObserver) {
      var wasMember = isMember();
      new MutationObserver(function () {
        var now = isMember();
        if (now !== wasMember) { wasMember = now; render(); }
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
    return true;
  }

  function getJSON(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); });
  }
  /* Everything after the list itself arrives in the background and re-draws. */
  function loadLater() {
    var extraRaw = null;
    function applyExtra() {
      if (!extraRaw) return;
      var m = {};
      episodes.forEach(function (e) { var x = extraRaw[e.freeSlug] || extraRaw[e.slug]; if (x) m[e.slug] = x; delete e.__doc; });
      extra = m;
      if (window.ivSubjects && window.ivSubjects.setExtra) window.ivSubjects.setExtra(extra);
    }
    var go = function () {
      Promise.all([
        getJSON(INDEX_URL)['catch'](function () { return null; }),
        getJSON(CORPUS_URL)['catch'](function () { return null; })
      ]).then(function (r) {
        var freeList = (r[0] && r[0].episodes) || [];
        var recs = (r[1] && r[1].records) || [];
        if (!freeList.length && !recs.length) return;
        joinFree(freeList, recs);
        applyExtra();
        tryTerms = null;
        rebuildFilters();
        render();
      });
      getJSON(EXTRA_URL).then(function (d) {
        if (d && d.extra) { extraRaw = d.extra; applyExtra(); if (termsOf(query).length) render(); }
      })['catch'](function () {});
    };
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 2000 }); else setTimeout(go, 600);
  }
  /* The Guest and Subject panels only have values once the join has run, so
     the filter row is rebuilt then (URL picks re-read so ?guest= still lands). */
  function rebuildFilters() {
    var hero = document.querySelector('.iva-hero');
    if (!hero) return;
    var btns = hero.querySelector('.iva-filters'), panels = hero.querySelector('.iva-panels');
    if (!btns || !panels) return;
    var keep = {};
    Object.keys(picked).forEach(function (k) { keep[k] = picked[k]; });
    var keepYear = year;
    readUrlState();
    Object.keys(keep).forEach(function (k) { if (keep[k]) picked[k] = keep[k]; });
    if (keepYear) year = keepYear;
    btns.innerHTML = ''; panels.innerHTML = '';
    refreshers = []; openPanel = null;
    FILTERS.forEach(function (f) { buildFilter(f, { btns: btns, panels: panels }); });
    if (els.first && els.firstCount === 0) {
      var picks = FIRST.map(function (s) { return byFree[s] || bySlug[s]; }).filter(Boolean);
      if (picks.length) {
        var fgrid = els.first.querySelector('.iva-first-grid');
        picks.forEach(function (e) { var li = document.createElement('li'); li.innerHTML = cardHtml(e, 500, ''); fgrid.appendChild(li); });
        fgrid.parentNode.appendChild(buildCarousel(picks));
        els.firstCount = picks.length;
      }
    }
    /* the empty-state subject chips */
    if (els.empty) {
      var chips = els.empty.querySelector('.iva-empty-chips');
      if (chips && !chips.children.length) {
        var tagCounts = counts('tags');
        Object.keys(tagCounts).sort(function (a, b) { return tagCounts[b] - tagCounts[a] || a.localeCompare(b); }).slice(0, 10).forEach(function (tg) {
          var c = el('button', 'iva-chip', tg);
          c.type = 'button';
          c.addEventListener('click', function () {
            query = ''; els.input.value = ''; year = '';
            Object.keys(picked).forEach(function (k) { picked[k] = ''; });
            picked.tags = tg; sort = 'newest';
            refreshers.forEach(function (f) { f(); });
            reset();
          });
          chips.appendChild(c);
        });
      }
    }
  }

  function start() {
    if (!onPlusIndex()) return;
    if (document.querySelector('.iva-hero')) return;
    window.IV_PLUS_ARCHIVE_BUILD = IV_PLUS_ARCHIVE_BUILD;
    getJSON(PLUS_URL).then(function (d) {
      var list = (d && d.episodes) || [];
      if (!list.length) throw new Error('empty index');
      episodes = list.map(makeEpisode);
      episodes.forEach(function (e) { bySlug[e.slug] = e; byFree[e.freeSlug] = e; });
      if (!mount()) {
        var tries = 0;
        var timer = setInterval(function () { tries++; if (mount() || tries > 60) clearInterval(timer); }, 125);
      }
      loadLater();
    })['catch'](function () {
      /* If the index cannot be fetched, un-hide the native list so the page
         is never left with nothing at all. */
      document.documentElement.className = document.documentElement.className
        .replace(/\biv-plus-page\b/g, '').replace(/\biv-archive-2026\b/g, '').replace(/\biv-plus-archive\b/g, '');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

;

(function () {
  var WORKER = "https://innerverse-plus.chance-5da.workers.dev";
  var path = ivPath().replace(/\/+$/, "");
  if (path !== "/plus") return;
  if (window.__ivFeedCard) return;
  window.__ivFeedCard = true;

  function token() {
    try {
      if (window.ivMembership && typeof window.ivMembership.getToken === "function") return window.ivMembership.getToken();
      return localStorage.getItem("iv_session_token");
    } catch (e) { return null; }
  }
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    for (var k in (attrs || {})) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function anchor() {
    // 2026-10-23: the /plus redesign (iva-* classes) removed the old anchors, so the card never drew.
    // It now sits at the top of the members' section, right under the hero.
    return document.querySelector(".iva-hero") ||
      document.querySelector(".iv-search") ||
      document.querySelector(".iv-search-head") ||
      document.querySelector(".iv-results-grid");
  }
  function isAndroid() { return /Android/i.test(navigator.userAgent); }
  function isApple() { return /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent); }

  function build(data) {
    var card = el("section", { "class": "iv-feedcard", "aria-label": "Your private Plus+ podcast feed" });
    var top = el("div", { "class": "iv-feedcard-top" });
    var art = el("div", { "class": "iv-feedcard-art", "aria-hidden": "true" });
    art.style.backgroundImage = "url(" + WORKER + "/feed-cover.jpg?v=2)";
    var copy = el("div", { "class": "iv-feedcard-copy" });
    copy.appendChild(el("div", { "class": "iv-feedcard-eyebrow" }, "Members only"));
    copy.appendChild(el("h3", null, "Listen to Plus+ in your podcast app"));
    copy.appendChild(el("p", null, "Every extended members' cut, delivered to the app you already use. This link is yours alone, so please keep it private."));
    top.appendChild(art); top.appendChild(copy);
    card.appendChild(top);

    var apps = el("div", { "class": "iv-feedcard-apps" });
    var list = [
      { k: "apple", label: "Apple Podcasts", show: !isAndroid() },
      { k: "overcast", label: "Overcast", show: !isAndroid() },
      { k: "pocketcasts", label: "Pocket Casts", show: true },
      { k: "castro", label: "Castro", show: isApple() },
      { k: "podcastaddict", label: "Podcast Addict", show: isAndroid() }
    ];
    var copyBtn = el("button", { "class": "iv-feedcard-btn is-primary", type: "button" }, "Copy my feed link");
    apps.appendChild(copyBtn);
    list.forEach(function (a) {
      if (!a.show || !data[a.k]) return;
      var link = el("a", { "class": "iv-feedcard-btn", href: data[a.k], rel: "nofollow" }, a.label);
      apps.appendChild(link);
    });
    card.appendChild(apps);

    var url = el("div", { "class": "iv-feedcard-url" }, data.url);
    card.appendChild(url);

    copyBtn.addEventListener("click", function () {
      card.classList.add("is-open");
      var done = function () { copyBtn.textContent = "Copied!"; setTimeout(function () { copyBtn.textContent = "Copy my feed link"; }, 2200); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(data.url).then(done, function () { selectText(url); });
      } else { selectText(url); }
    });

    var toggle = el("button", { "class": "iv-feedcard-toggle", type: "button", "aria-expanded": "false" }, "How do I add it?");
    var help = el("div", { "class": "iv-feedcard-help" });
    help.innerHTML =
      "<b>On iPhone or Mac:</b> tap Apple Podcasts or Overcast above and the show opens ready to follow. " +
      "<b>On Android:</b> tap Pocket Casts or Podcast Addict, or copy the link and paste it into your app's " +
      "&ldquo;Add podcast by URL&rdquo; option (AntennaPod, Podbean and most others have one). " +
      "<b>Anywhere else:</b> copy the link and add it by URL. " +
      "<b>Spotify and YouTube Music</b> do not support private feeds, so use one of the apps above. " +
      "If you ever stop being a member the feed simply pauses, and it picks back up when you rejoin.";
    toggle.addEventListener("click", function () {
      var open = help.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    card.appendChild(toggle);
    card.appendChild(help);
    return card;
  }
  function selectText(node) {
    try { var r = document.createRange(); r.selectNodeContents(node); var s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {}
  }

  function mount(data) {
    var tries = 0;
    (function place() {
      if (document.querySelector(".iv-feedcard-wrap")) return;
      var a = anchor();
      if (a && a.parentNode) {
        var wrap = el("div", { "class": "iv-feedcard-wrap" });
        wrap.appendChild(build(data));
        a.parentNode.insertBefore(wrap, a);
        // Match the search section's side padding so the card lines up with it at every width.
        var sync = function () {
          var cs = getComputedStyle(a.querySelector(".iva-wrap") || a);
          wrap.style.paddingLeft = cs.paddingLeft;
          wrap.style.paddingRight = cs.paddingRight;
        };
        sync();
        window.addEventListener("resize", sync);
        return;
      }
      if (++tries < 40) setTimeout(place, 250);
    })();
  }

  function run() {
    var t = token();
    if (!t) return;
    fetch(WORKER + "/feed-link", { headers: { Authorization: "Bearer " + t } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.url) mount(d); })
      .catch(function () {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();

;

(function () {
  'use strict';

  var IV_WORKER_ORIGIN = 'https://innerverse-plus.chance-5da.workers.dev';
  var IV_SESSION_KEY = 'iv_session_token';
  var CHECKOUT_TRIAL = 'https://innerverseplus.memberful.com/checkout?plan=149343';
  var CHECKOUT_MONTHLY = 'https://innerverseplus.memberful.com/checkout?plan=149341';
  var CHECKOUT_YEARLY = 'https://innerverseplus.memberful.com/checkout?plan=149342';
  var PLUS_LOGO_URL = 'https://images.squarespace-cdn.com/content/5987d897cf81e0278ec5322e/c3607ade-e087-4b27-af0f-e0913f4dc3d0/plus+asset.png?format=300w&content-type=image%2Fpng';
  var PLUS_INDEX_URL = 'https://raw.githubusercontent.com/chance-garton/innerverse-data/main/plus-index.json';

  /* Per-episode static files built daily from Airtable (build-index.yml).
     Replaced the client-side Airtable token on 2026-09-21. */
  var EPISODE_FILE_BASE = 'https://raw.githubusercontent.com/chance-garton/innerverse-data/main/episodes/';

  var LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10.5" rx="2.2"></rect><path d="M8.2 10.5V7.6a3.8 3.8 0 0 1 7.6 0v2.9"></path></svg>';
  var PLAY_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6L19.2 12z"></path></svg>';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---- core module: capture the login token, ask the Worker who this is ---- */

  function captureSessionFragment() {
    if (window.location.hash && window.location.hash.indexOf('#iv_session=') === 0) {
      var token = window.location.hash.slice('#iv_session='.length);
      try { window.localStorage.setItem(IV_SESSION_KEY, token); } catch (e) {}
      var cleanUrl = window.location.pathname + window.location.search;
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', cleanUrl);
      }
    }
  }

  function getToken() {
    try { return window.localStorage.getItem(IV_SESSION_KEY); } catch (e) { return null; }
  }

  function loginUrl(returnTo) {
    return IV_WORKER_ORIGIN + '/auth/choose?return_to=' + encodeURIComponent(returnTo || window.location.href);
  }

  function checkStatus(cb) {
    var token = getToken();
    if (!token) { cb({ signedIn: false, entitled: false }); return; }
    fetch(IV_WORKER_ORIGIN + '/auth/status', { headers: { Authorization: 'Bearer ' + token } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.signedIn) { try { window.localStorage.removeItem(IV_SESSION_KEY); } catch (e) {} }
        /* An older 7-day sign-in comes back with a lasting one (renew, innerverse-plus build 2026-10-19-livemembership); keep it so the member is never logged out again (2026-10-20). */
        if (data && data.signedIn && typeof data.renew === 'string' && data.renew && getToken() === token) { try { window.localStorage.setItem(IV_SESSION_KEY, data.renew); } catch (e) {} }
        /* Cache the answer so iv-nav-plus-precheck (HEADER) can paint the
           gold nav from the first frame on the NEXT page, instead of
           everyone waiting on this same live check every single time. */
        try {
          if (data && data.entitled) { window.localStorage.setItem('iv_plus_entitled', 'yes'); }
          else { window.localStorage.removeItem('iv_plus_entitled'); }
        } catch (e) {}
        try {
          if (data && data.email) { window.localStorage.setItem('iv_plus_email', data.email); }
          if (data && data.name) { window.localStorage.setItem('iv_plus_name', data.name); }
          if (data && data.source) { window.localStorage.setItem('iv_plus_source', data.source); }
        } catch (e) {}
        cb(data);
      })
      .catch(function () { cb({ signedIn: false, entitled: false }); });
  }

  function logout() {
    try { window.localStorage.removeItem(IV_SESSION_KEY); } catch (e) {}
    try { window.localStorage.removeItem('iv_plus_entitled'); } catch (e) {}
    try { window.localStorage.removeItem('iv_plus_email'); } catch (e) {}
    try { window.localStorage.removeItem('iv_plus_name'); } catch (e) {}
    try { window.localStorage.removeItem('iv_plus_source'); } catch (e) {}
  }

  captureSessionFragment();
  /* window.ivMembership comes from site.js on the new site. */

  /* ---- the newest Plus episode, for the /plus hero ----
     plus-index.json is the only source that covers the whole members'
     catalogue, so the newest post is read from there and its members'
     runtime read from that episode's static file. Both are best effort: a hero
     with no runtime line still sells, a hero that never renders does not. */

  function newestPlusEpisode() {
    return fetch(PLUS_INDEX_URL)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var eps = (d && d.episodes) || [];
        if (!eps.length) return null;
        var newest = eps.slice().sort(function (a, b) {
          return String(b.date || '').localeCompare(String(a.date || ''));
        })[0];
        if (!newest) return null;
        return fetch(EPISODE_FILE_BASE + encodeURIComponent(newest.slug) + '.json')
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (a) {
            var f = (a && a.fields) || {};
            newest.duration = f['Plus Duration'] || f['Duration'] || '';
            newest.topicLine = f['Topic Line'] || '';
            return newest;
          })['catch'](function () { return newest; });
      })['catch'](function () { return null; });
  }

  function cleanTitle(t) {
    return String(t || '').replace(/\s*\(\s*PLUS\s*\)\s*$/i, '').trim();
  }

  function latestPanel(ep, unlocked) {
    if (!ep) return '';
    var art = ep.thumb ? '<img class="iv-lock-thumb" src="' + esc(ivImg(ep.thumb, 750)) + '" alt="">' : '';
    var runtime = ep.duration
      ? (unlocked ? 'Watch the <strong>' + esc(ep.duration) + '</strong> episode.'
                  : 'Unlock the <strong>' + esc(ep.duration) + '</strong> episode.')
      : (unlocked ? 'Watch the newest episode.' : 'Unlock the newest episode.');
    var inner =
      '<p class="iv-plus-hero-latest-eyebrow">Newest Plus episode</p>' +
      '<div class="iv-lock-player">' + art +
        '<div class="iv-lock-veil"></div>' +
        '<div class="iv-lock-orb">' + (unlocked ? PLAY_SVG : LOCK_SVG) + '</div>' +
      '</div>' +
      '<p class="iv-lock-runtime">' + runtime + '</p>' +
      '<p class="iv-plus-hero-latest-title">' + esc(cleanTitle(ep.title)) + '</p>';
    return unlocked
      ? '<a class="iv-plus-hero-latest" style="text-decoration:none" href="/plus/' + esc(ep.slug) + '">' + inner + '</a>'
      : '<div class="iv-plus-hero-latest">' + inner + '</div>';
  }

  function offerPanel(status) {
    if (status.entitled) {
      var firstName = (status.name || '').split(' ')[0];
      return (
        '<div class="iv-plus-hero-offer">' +
          '<div class="iv-lock-brand">' +
            '<img class="iv-lock-logo" src="' + PLUS_LOGO_URL + '" alt="InnerVerse Plus">' +
            '<div><div class="iv-lock-eyebrow">InnerVerse Plus</div>' +
            '<div class="iv-lock-sub">Member access active</div></div>' +
          '</div>' +
          '<h2 class="iv-lock-headline">Welcome back' + (firstName ? ', ' + esc(firstName) : '') + '.</h2>' +
          '<p class="iv-lock-copy">The whole members’ archive is open to you. Filter it by show or theme below, or pick up with the newest release.</p>' +
          '<div class="iv-lock-buttons">' +
            '<a class="iv-lock-btn iv-lock-btn-primary" href="' + window.ivMembership.accountUrl + '">Manage your membership</a>' +
          '</div>' +
        '</div>'
      );
    }

    var lapsed = status.signedIn;
    return (
      '<div class="iv-plus-hero-offer">' +
        '<div class="iv-lock-brand">' +
          '<img class="iv-lock-logo" src="' + PLUS_LOGO_URL + '" alt="InnerVerse Plus">' +
          '<div><div class="iv-lock-eyebrow">InnerVerse Plus</div>' +
          '<div class="iv-lock-sub">' + (lapsed ? 'Your membership is not active' : 'Members only') + '</div></div>' +
        '</div>' +
        '<h2 class="iv-lock-headline">' + (lapsed ? 'Pick the archive back up.' : 'Unlock the whole members’ archive.') + '</h2>' +
        '<p class="iv-lock-copy">Every Plus episode across InnerVerse and Inner Whirled, uncut and ad free, with new ones landing every week. Cancel any time.</p>' +
        '<div class="iv-lock-buttons">' +
          (lapsed ? '' :
            '<a class="iv-lock-btn iv-lock-btn-primary" href="' + CHECKOUT_TRIAL + '">Start 7-day free trial<span>then $9 / month</span></a>') +
          '<a class="iv-lock-btn' + (lapsed ? ' iv-lock-btn-primary' : '') + '" href="' + CHECKOUT_MONTHLY + '">' +
            (lapsed ? 'Reactivate for $9 / month' : 'Join for $9 / month') + '</a>' +
          '<a class="iv-lock-btn" href="' + CHECKOUT_YEARLY + '">' +
            (lapsed ? 'Reactivate for $100 / year' : 'Join for $100 / year') + '<span>save $8</span></a>' +
        '</div>' +
        (lapsed ? '' : '<a class="iv-lock-login" href="' + loginUrl() + '">Already a member? Log in</a>') +
      '</div>'
    );
  }

  /* ---- /plus: one wide hero in place of the old pricing card ---- */

  function mountPlusHero() {
    var slot = document.querySelector('.iv-plus-hero-slot');
    if (!slot) return;
    if (document.querySelector('.iv-plus-hero')) return;

    var hero = document.createElement('div');
    hero.className = 'iv-plus-hero';
    slot.appendChild(hero);

    var state = { status: null, latest: null, drawn: false };
    function draw() {
      if (!state.status) return;
      hero.innerHTML = offerPanel(state.status) + latestPanel(state.latest, !!state.status.entitled);
      state.drawn = true;
    }

    checkStatus(function (status) { state.status = status; draw(); });
    newestPlusEpisode().then(function (ep) { state.latest = ep; if (state.status) draw(); });
  }

  /* ---- /support: the compact card, unchanged in shape, with the trial
     added and the same three prices as everywhere else ---- */

  function buildSupportCta(status) {
    if (status.entitled) {
      var firstName = (status.name || '').split(' ')[0];
      return (
        '<div class="iv-plus-content">' +
          '<p class="iv-plus-blurb">You’re signed in' + (firstName ? ' as ' + esc(firstName) : '') + ', thank you for being a Plus member.</p>' +
          '<a class="iv-plus-btn" href="/plus">Browse the Plus Archive</a>' +
        '</div>'
      );
    }
    if (status.signedIn) {
      return (
        '<div class="iv-plus-content">' +
          '<p class="iv-plus-blurb">Your membership isn’t currently active.</p>' +
          '<a class="iv-plus-btn" href="' + CHECKOUT_MONTHLY + '">Reactivate for $9/mo</a>' +
          '<div class="iv-plus-alt">' +
            '<div class="iv-plus-alt-row"><a class="iv-pill" href="' + CHECKOUT_YEARLY + '">$100 / year</a></div>' +
          '</div>' +
        '</div>'
      );
    }
    return (
      '<div class="iv-plus-content">' +
        '<div class="iv-plus-price-line"><span class="iv-plus-price-num">$9</span><span class="iv-plus-price-unit">/ month</span></div>' +
        '<p class="iv-plus-blurb">Unlock every Plus episode across InnerVerse and Inner Whirled.</p>' +
        '<a class="iv-plus-btn" href="' + CHECKOUT_TRIAL + '">Start 7-day free trial</a>' +
        '<div class="iv-plus-alt">' +
          '<div class="iv-plus-alt-label">OR</div>' +
          '<div class="iv-plus-alt-row">' +
            '<a class="iv-pill" href="' + CHECKOUT_MONTHLY + '">$9 / month</a>' +
            '<a class="iv-pill" href="' + CHECKOUT_YEARLY + '">$100 / year</a>' +
            '<a class="iv-pill" href="' + loginUrl() + '">Already a member? Log in</a>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function mountSupportCta() {
    var blocks = document.querySelectorAll('.sqs-block-pricing-plan');
    if (!blocks.length) return;
    checkStatus(function (status) {
      blocks.forEach(function (block) {
        block.style.display = 'none';
        var card = document.createElement('div');
        card.className = 'iv-plus-cta iv-plus-signup-cta';
        card.style.maxWidth = '420px';
        card.style.margin = '24px auto';
        card.innerHTML = buildSupportCta(status);
        block.parentNode.insertBefore(card, block.nextSibling);
      });
    });
  }

  var segs = ivPath().split('/').filter(Boolean);
  var isPlusRoot = segs.length === 1 && segs[0] === 'plus';
  var isSupport = segs.length === 1 && segs[0] === 'support';

  if (isPlusRoot || isSupport) {
    var go = isPlusRoot ? mountPlusHero : mountSupportCta;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', go);
    } else {
      go();
    }
  }
})();
