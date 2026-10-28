/* Carried over from the Squarespace Code Injection blocks iv-episodes-search and iv-archive-extras (live 2026-10-28). Path read through ivPath(). */

/* ============================================================
   INNERVERSE - THE /episodes PAGE (Lapis Library, 2026-09-24)

   Replaces the native Squarespace post list on /episodes with a
   ranked search over the pre-built index. The head block hides the
   native list from the first frame and sets html.iv-archive-2026,
   which switches on the styles and the v2 nav.

   Page order: centred search area (eyebrow, heading, one line, a
   600px pill, five filter pills), the thin Plus+ strip (hidden for
   members), Good first episodes (five hand-picked, hidden the
   moment a search or filter applies; a one-at-a-time carousel on
   phones), then All episodes, 24 at a time.

   THE SEARCH IS RANKED. A query is scored per episode against the
   title, topic line, subjects (tags), guests, show, then chapter
   titles, core themes and quotes, so the episode that is ABOUT a
   word comes before the one that mentions it. Every result says
   why it matched. window.ivSubjects exposes the scorer; the legacy
   window.ivEpisodeSearch.filter (the homepage dropdown) now returns
   the same ranked order when a query is present.

   Data: static files rebuilt daily by a GitHub Action. The page
   reads today's shapes AND the planned ones (topicLine in the
   index, a structured episodes-extra.json, subjects.json), so the
   build can gain them without a page change.
   ============================================================ */
(function () {
  'use strict';

  var DATA = 'https://raw.githubusercontent.com/chance-garton/innerverse-data/main/';
  var INDEX_URL = DATA + 'episodes-index.json';
  var EXTRA_URL = DATA + 'episodes-extra.json';
  var CORPUS_URL = DATA + 'episodes/_corpus.json';
  var PLUS_URL = DATA + 'plus-index.json';
  var SUBJECTS_URL = DATA + 'subjects.json';
  var IV_ARCHIVE_BUILD = '2026-09-24f-archive';

  var PAGE = 24;
  var CHECKOUT_TRIAL = 'https://innerverseplus.memberful.com/checkout?plan=149343';
  var PLUS_LOGO = 'https://images.squarespace-cdn.com/content/5987d897cf81e0278ec5322e/c3607ade-e087-4b27-af0f-e0913f4dc3d0/plus+asset.png?format=300w&content-type=image%2Fpng';

  /* Good first episodes, Chance's five in his order (2026-09-24). */
  var FIRST = ['astrotheology-101', 'chris-crutchfield', 'marizelle-arce-terrain-doctor', 'inner-whirled-25', 'keys-to-the-tarot'];

  var SHOW_ORDER = ['InnerVerse', 'Inner Whirled', 'Vibe Rant', 'Marvelous Demystifiers', 'Astro-Herbalism', 'Chance Guest Spots'];
  var SHOW_LABEL = { 'Chance Guest Spots': 'Chance on Other Podcasts' };
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

  /* Starter alias table. subjects.json in the data repo overrides it when it
     exists; each group is one subject and the words people type for it. */
  var ALIASES = [
    ['greek', 'greek mythology', 'hellenic', 'argonauts', 'homer', 'olympus'],
    ['tartaria', 'tartarian', 'old world reset', 'mud flood'],
    ['germs', 'germ theory', 'terrain medicine', 'terrain theory', 'pleomorphism', 'virology', 'virus'],
    ['astrology', 'zodiac', 'natal chart', 'horoscope', 'planets'],
    ['bible', 'scripture', 'old testament', 'new testament', 'gospel', 'genesis', 'revelation'],
    ['egypt', 'egyptian', 'pharaoh', 'kemet', 'hieroglyphs'],
    ['sound healing', 'biofield', 'biofield tuning', 'tuning forks', 'frequency', 'vibration'],
    ['herbs', 'herbalism', 'herbal', 'plant medicine', 'astro-herbalism'],
    ['tarot', 'tarot cards', 'major arcana', 'divination', 'oracle'],
    ['gematria', 'numerology', 'cipher', 'sacred geometry'],
    ['flat earth', 'level plane', 'globe', 'cosmology'],
    ['jesus', 'christ', 'christianity', 'christian'],
    ['norse', 'viking', 'odin', 'phoenician', 'phoenicians'],
    ['language', 'etymology', 'philology', 'alphabet', 'words'],
    ['dreams', 'dreaming', 'lucid', 'sleep'],
    ['health', 'holistic health', 'alternative medicine', 'healing', 'medicine'],
    ['consciousness', 'awareness', 'perception', 'mind'],
    ['history', 'alternative history', 'historical investigations', 'ancient'],
    ['myth', 'mythology', 'myths', 'mythological'],
    ['gnostic', 'gnosticism', 'gnosis']
  ];

  var SVG = {
    search: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>',
    searchSm: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>',
    chev: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>',
    x: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>',
    sort: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"></path></svg>',
    lock: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>',
    tick: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"></path></svg>',
    prev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg>',
    next: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>'
  };

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ---------------- state ---------------- */
  var episodes = [], bySlug = {};
  var extra = {};          // slug -> string (today) or {chapters, themes, quotes}
  var topicLines = {};     // slug -> Topic Line (from the corpus until the index carries it)
  var plusSlugs = null;    // Set of slugs with a /plus page
  var aliasGroups = ALIASES;
  var query = '', year = '', sort = 'newest', shown = PAGE;
  var picked = { topics: '', shows: '', guests: '', tags: '' };
  var els = {}, openPanel = null, refreshers = [];

  function onEpisodesIndex() {
    return ivPath().replace(/\/$/, '').toLowerCase() === '/episodes';
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
  function labelFor(key, value) {
    if (key === 'shows') return SHOW_LABEL[value] || value;
    if (key === 'topics') return String(value).replace(/,\s*&/g, ' &').replace(/,/g, '');
    return value;
  }
  function showOf(e) {
    var shows = e.shows || [];
    if (shows.indexOf('Astro-Herbalism') >= 0) return 'Astro-Herbalism';
    return labelFor('shows', shows[0] || 'InnerVerse');
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
  function img(url, w) {
    return (window.ivImg ? window.ivImg(url, w) : url);
  }

  /* ============================================================
     THE SCORER (window.ivSubjects)
     ============================================================ */
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[‘’']/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function termsOf(q) {
    return norm(q).split(' ').filter(function (t) { return t.length >= 2; });
  }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* One prepared query: each term with its regexes and its aliases. */
  function prepare(q) {
    var terms = termsOf(q);
    var phrase = terms.join(' ');
    var prepared = terms.map(function (t) {
      var words = [{ w: t, weight: 1 }];
      aliasGroups.forEach(function (group) {
        var g = group.map(norm);
        if (g.indexOf(t) >= 0 || g.indexOf(t + 's') >= 0 || (t.length > 3 && /s$/.test(t) && g.indexOf(t.slice(0, -1)) >= 0)) {
          g.forEach(function (x) { if (x !== t && !words.some(function (y) { return y.w === x; })) words.push({ w: x, weight: 0.8 }); });
        }
      });
      return words.map(function (x) {
        return {
          w: x.w, weight: x.weight,
          whole: new RegExp('(^|[^a-z0-9])' + escRe(x.w) + '($|[^a-z0-9])'),
          prefix: x.w.length >= 4 ? new RegExp('(^|[^a-z0-9])' + escRe(x.w)) : null
        };
      });
    });
    return { terms: terms, phrase: phrase, prepared: prepared };
  }

  /* Field-level hit test: 2 = whole word, 1 = prefix, 0 = none. */
  function hit(word, text) {
    if (!text) return 0;
    if (word.whole.test(text)) return 2;
    if (word.prefix && word.prefix.test(text)) return 1;
    return 0;
  }
  function countHits(word, texts) {
    var n = 0, first = '';
    for (var i = 0; i < texts.length; i++) {
      var h = hit(word, texts[i].n);
      if (h) { n++; if (!first) first = texts[i].raw; }
    }
    return { n: n, first: first };
  }

  /* Per-episode text bundle, built once and cached on the episode. */
  function docOf(e) {
    if (e.__doc && e.__doc.extraKey === extraKeyOf(e)) return e.__doc;
    var ex = extra[e.slug];
    var chapters = [], themes = [], quotes = [], flat = '';
    if (ex && typeof ex === 'object') {
      chapters = (ex.chapters || []).map(function (t) { return { raw: t, n: norm(t) }; });
      themes = (ex.themes || []).map(function (t) { return { raw: t, n: norm(t) }; });
      quotes = (ex.quotes || []).map(function (t) { return { raw: t, n: norm(t) }; });
    } else if (typeof ex === 'string') {
      flat = norm(ex);
    }
    var d = {
      extraKey: extraKeyOf(e),
      title: norm(e.title),
      topic: norm(e.topicLine || topicLines[e.slug] || ''),
      topicRaw: e.topicLine || topicLines[e.slug] || '',
      tags: (e.tags || []).map(function (t) { return { raw: t, n: norm(t) }; }),
      guests: (e.guests || []).map(function (t) { return { raw: t, n: norm(t) }; }),
      shows: (e.shows || []).map(function (t) { return { raw: labelFor('shows', t), n: norm(t) + ' ' + norm(labelFor('shows', t)) }; }),
      chapters: chapters, themes: themes, quotes: quotes, flat: flat,
      structured: !!(ex && typeof ex === 'object')
    };
    e.__doc = d;
    return d;
  }
  function extraKeyOf(e) {
    var ex = extra[e.slug];
    return (ex ? (typeof ex === 'string' ? 's' + ex.length : 'o') : '-') + '|' + (e.topicLine || topicLines[e.slug] || '');
  }

  /* Score one episode for a prepared query. Returns null when a term is
     missing (AND), else { score, why, orScore }. */
  function scoreEpisode(e, pq) {
    var d = docOf(e);
    var total = 0, missing = 0, best = { pts: 0, why: '' }, mention = null;
    for (var i = 0; i < pq.prepared.length; i++) {
      var words = pq.prepared[i];
      var termBest = 0, termWhy = '', termMention = 0, termMentionWhy = '';
      for (var j = 0; j < words.length; j++) {
        var w = words[j], k = w.weight, h, c, pts;
        h = hit(w, d.title);
        if (h) { pts = (h === 2 ? 10 : 6) * k; if (pts > termBest) { termBest = pts; termWhy = 'In the title'; } }
        h = hit(w, d.topic);
        if (h) { pts = (h === 2 ? 8 : 5) * k; if (pts > termBest) { termBest = pts; termWhy = 'Topic: ' + clean(d.topicRaw); } }
        c = countHits(w, d.tags);
        if (c.n) { pts = (hit(w, norm(c.first)) === 2 ? 7 : 5) * k; if (pts > termBest) { termBest = pts; termWhy = 'Subject: ' + c.first; } }
        c = countHits(w, d.guests);
        if (c.n) { pts = (hit(w, norm(c.first)) === 2 ? 7 : 5) * k; if (pts > termBest) { termBest = pts; termWhy = 'Guest: ' + c.first; } }
        c = countHits(w, d.shows);
        if (c.n) { pts = 6 * k; if (pts > termBest) { termBest = pts; termWhy = 'Show: ' + c.first; } }
        var m = 0, mw = '';
        if (d.structured) {
          var ch = countHits(w, d.chapters), th = countHits(w, d.themes), qu = countHits(w, d.quotes);
          m = Math.min(6, 3 * ch.n) + Math.min(3, 1.5 * th.n) + Math.min(2, qu.n);
          if (ch.n) mw = 'Chapter: ' + clean(ch.first);
          else if (th.n) mw = 'Theme: ' + clean(th.first);
          else if (qu.n) mw = 'Mentioned in ' + qu.n + (qu.n === 1 ? ' quote' : ' quotes');
        } else if (d.flat) {
          var n = 0, re = w.prefix || w.whole, idx = 0, s = d.flat;
          var g = new RegExp(re.source, 'g');
          while (g.exec(s) && n < 40) { n++; }
          if (n) { m = Math.min(4, 1 + 0.5 * n); mw = 'Mentioned ' + (n === 1 ? 'once' : n + ' times') + ' in chapters and quotes'; }
        }
        m *= k;
        if (m > termMention) { termMention = m; termMentionWhy = mw; }
      }
      if (!termBest && !termMention) { missing++; continue; }
      total += termBest + termMention;
      if (termBest > best.pts) best = { pts: termBest, why: termWhy };
      if (termMention && (!mention || termMention > mention.pts)) mention = { pts: termMention, why: termMentionWhy };
    }
    if (pq.terms.length >= 2 && pq.phrase) {
      if (d.title.indexOf(pq.phrase) >= 0 || (d.topic && d.topic.indexOf(pq.phrase) >= 0)) total += 6;
    }
    var yr = parseInt(e.year || String(e.date || '').slice(0, 4), 10);
    if (yr) total += Math.max(0, Math.min(0.5, (yr - 2020) / 12));
    var why = best.why;
    if (mention && mention.why) why = why ? (why + ' · ' + mention.why) : mention.why;
    if (!total) return null;
    return { score: total, why: why, missing: missing };
  }

  /* Rank a list for a query. Returns { hits: [...episodes with __score/__why], close: [...] } */
  function rank(list, q) {
    var pq = prepare(q);
    if (!pq.terms.length) return { hits: list.slice(), close: [], pq: pq };
    var hits = [], close = [];
    list.forEach(function (e) {
      var r = scoreEpisode(e, pq);
      if (!r) return;
      e.__score = r.score; e.__why = r.why;
      if (r.missing === 0) hits.push(e); else close.push(e);
    });
    var byScore = function (a, b) { return (b.__score - a.__score) || String(b.date || '').localeCompare(String(a.date || '')); };
    hits.sort(byScore); close.sort(byScore);
    if (hits.length >= 3 || pq.terms.length < 2) close = [];
    return { hits: hits, close: close, pq: pq };
  }

  function passesFilters(e, pick, yr) {
    for (var k in pick) {
      if (pick[k] && (e[k] || []).indexOf(pick[k]) === -1) return false;
    }
    if (yr && String(e.year || String(e.date || '').slice(0, 4)) !== String(yr)) return false;
    return true;
  }
  function byDate(newest) {
    return function (a, b) {
      var x = a.date || '', y2 = b.date || '';
      return newest ? (x < y2 ? 1 : x > y2 ? -1 : 0) : (x > y2 ? 1 : x < y2 ? -1 : 0);
    };
  }

  /* The shared entry point. sortMode: 'best' | 'newest' | 'oldest'; the
     legacy boolean (true = newest) from older callers means "best when a
     query is present, newest otherwise", which upgrades the homepage
     dropdown to the ranked order without touching it. */
  function filterEpisodes(list, ex, q, pick, yr, sortMode) {
    if (ex && ex !== extra) extra = ex;
    var mode = sortMode === 'oldest' ? 'oldest' : sortMode === 'newest' ? 'newest' : sortMode === 'best' ? 'best' : (sortMode === false ? 'oldest' : 'auto');
    var base = (list || []).filter(function (e) { return passesFilters(e, pick || {}, yr); });
    var hasQ = termsOf(q).length > 0;
    if (!hasQ) {
      base.sort(byDate(mode !== 'oldest'));
      base.forEach(function (e) { e.__why = ''; e.__close = false; });
      return base;
    }
    var r = rank(base, q);
    var out;
    if (mode === 'newest' || mode === 'oldest') {
      out = r.hits.slice().sort(byDate(mode === 'newest'));
      var c = r.close.slice().sort(byDate(mode === 'newest'));
      out.forEach(function (e) { e.__close = false; });
      c.forEach(function (e) { e.__close = true; });
      out = out.concat(c);
    } else {
      r.hits.forEach(function (e) { e.__close = false; });
      r.close.forEach(function (e) { e.__close = true; });
      out = r.hits.concat(r.close);
    }
    return out;
  }
  function haystackOf(e, ex) {
    return (e.title + ' ' + (e.guests || []).join(' ') + ' ' + (e.topics || []).join(' ') + ' ' + (e.shows || []).join(' ') + ' ' + (e.tags || []).join(' ') + ' ' + (typeof (ex || {})[e.slug] === 'string' ? ex[e.slug] : '')).toLowerCase();
  }
  window.ivEpisodeSearch = { haystack: haystackOf, filter: filterEpisodes };
  window.ivSubjects = {
    build: IV_ARCHIVE_BUILD, prepare: prepare, score: scoreEpisode, rank: rank, filter: filterEpisodes,
    setAliases: function (groups) { if (groups && groups.length) aliasGroups = groups; },
    setExtra: function (ex) { extra = ex || {}; },
    setTopicLines: function (t) { topicLines = t || {}; }
  };

  /* ============================================================
     PAGE
     ============================================================ */
  function matches() {
    return filterEpisodes(episodes, extra, query, picked, year, sort);
  }
  function filtering() {
    return !!(termsOf(query).length || year || picked.shows || picked.tags || picked.guests || picked.topics);
  }

  function readUrlState() {
    var p;
    try { p = new URLSearchParams(window.location.search); } catch (e) { return; }
    Object.keys(URL_KEY).forEach(function (key) {
      var v = p.get(URL_KEY[key]);
      if (!v) return;
      if (key === 'year') { if (/^\d{4}$/.test(v)) year = v; return; }
      var hitV = null;
      episodes.forEach(function (e) {
        (e[key] || []).forEach(function (x) { if (!hitV && x.toLowerCase() === v.toLowerCase()) hitV = x; });
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
    var url = window.location.pathname + (qs ? '?' + qs : '');
    try { history.replaceState(null, '', url); } catch (e) {}
  }

  function counts(key) {
    var c = {};
    episodes.forEach(function (e) {
      if (key === 'year') { var y = e.year || String(e.date || '').slice(0, 4); if (y) c[y] = (c[y] || 0) + 1; return; }
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
    var s = esc(showOf(e)) + (e.duration ? ' &middot; ' + esc(e.duration) : '');
    if (plusSlugs && plusSlugs[e.slug]) s += ' &middot; <span class="iva-plusmark">' + SVG.lock + 'Plus+</span>';
    return s;
  }
  function cardHtml(e, w, why) {
    return '<a class="iva-card" href="' + esc(e.url) + '">' +
      '<div class="iva-thumb">' + (e.thumb ? '<img src="' + esc(img(e.thumb, w)) + '" alt="" loading="lazy">' : '') + '</div>' +
      '<div class="iva-card-body">' +
        '<div class="iva-meta">' + metaHtml(e) + '</div>' +
        '<div class="iva-title">' + esc(clean(e.title)) + '</div>' +
        '<div class="iva-line">' + esc(guestLine(e)) + '</div>' +
        (why ? '<div class="iva-why">' + SVG.tick + '<span>' + esc(why) + '</span></div>' : '') +
      '</div></a>';
  }

  /* ---------------- render ---------------- */
  function render() {
    var found = matches();
    var q = query.trim(), hasQ = termsOf(q).length > 0, isFiltering = filtering();

    // heading state
    if (isFiltering) {
      var n = found.filter(function (e) { return !e.__close; }).length;
      var what = hasQ ? ' about <em>“' + esc(q) + '”</em>' : (picked.guests ? ' with ' + esc(picked.guests) : picked.shows ? ' on ' + esc(labelFor('shows', picked.shows)) : picked.tags ? ' about ' + esc(picked.tags) : picked.topics ? ' in ' + esc(labelFor('topics', picked.topics)) : year ? ' from ' + esc(year) : '');
      els.h1.innerHTML = '<span class="iva-n">' + n + '</span> ' + (n === 1 ? 'episode' : 'episodes') + what;
      els.sub.textContent = hasQ ? 'Best matches first: the episodes that are about it, then the ones that mention it.' : 'Newest first. Add a word or another filter to narrow it.';
      els.clear.style.display = '';
      els.resultsEyebrow.textContent = 'Results';
      els.resultsH2.textContent = hasQ ? 'Matches' : 'Episodes';
    } else {
      els.h1.textContent = 'What makes you curious today?';
      els.sub.textContent = 'A subject, a guest, a question. Chapters and quotes are searchable too.';
      els.clear.style.display = 'none';
      els.resultsEyebrow.textContent = 'Episodes';
      els.resultsH2.textContent = 'All episodes';
    }
    els.first.classList.toggle('iva-hidden', isFiltering);
    els.plus.classList.toggle('iva-hidden', isFiltering && hasQ);

    // sort label
    var sortLabel = sort === 'best' ? 'Best match' : sort === 'newest' ? 'Newest first' : 'Oldest first';
    els.sort.innerHTML = SVG.sort + esc(sortLabel);
    els.sort.style.display = (found.length || isFiltering) ? '' : 'none';

    // narrow it down chips (query state only)
    els.narrow.innerHTML = '';
    if (hasQ && found.length) {
      var tc = {}, qWords = termsOf(q);
      found.forEach(function (e) { (e.tags || []).forEach(function (t) { tc[t] = (tc[t] || 0) + 1; }); });
      var tags = Object.keys(tc).filter(function (t) {
        if (picked.tags === t) return false;
        var nt = norm(t);
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

    // the grid
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
    host.btns.appendChild(btn);
    host.panels.appendChild(panel);
    refresh();
  }

  /* ---------------- the try-term placeholder (as on the homepage) ---------------- */
  function startTry(input) {
    var order = TRY_TERMS.slice(), ti = -1, timer = null, phTerm = '';
    for (var k = order.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)); var tmp = order[k]; order[k] = order[j]; order[j] = tmp; }
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function setPh(text) {
      if (reduce) { input.setAttribute('placeholder', text); return; }
      input.classList.add('iva-ph-fade');
      setTimeout(function () { input.setAttribute('placeholder', text); input.classList.remove('iva-ph-fade'); }, 260);
    }
    function nextTerm() {
      if (document.hidden || document.activeElement === input || input.value.trim()) return;
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
    hero.setAttribute('aria-label', 'Search episodes');
    var hw = el('div', 'iva-wrap');
    var head = el('div', 'iva-head');
    head.appendChild(el('div', 'iva-eyebrow', 'Explore the InnerVerse'));
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
    input.setAttribute('aria-label', 'Search episodes');
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

    // 2. the Plus+ strip
    var plus = el('section', 'iva-plus');
    plus.setAttribute('aria-label', 'InnerVerse Plus+');
    plus.innerHTML = '<div class="iva-wrap"><div class="iva-plus-left"><img class="iva-plus-logo" src="' + PLUS_LOGO + '" alt="" width="44" height="44" loading="lazy">' +
      '<div class="iva-plus-copy"><div class="iva-plus-line"><div class="iva-eyebrow">InnerVerse Plus+</div><div class="iva-plus-h">Go further than the free version.</div></div>' +
      '<p class="iva-plus-p">Every full, extended episode plus a private podcast feed. Seven days free, then $9 a month.</p></div></div>' +
      '<div class="iva-plus-btns"><a class="iva-btn iva-btn-gold" href="' + CHECKOUT_TRIAL + '">Start your 7-day free trial</a><a class="iva-btn iva-btn-outline" href="/plus">What is in Plus+</a></div></div>';

    // 3. Good first episodes
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
    var picks = FIRST.map(function (s) { return bySlug[s]; }).filter(Boolean);
    var fgrid = el('ul', 'iva-first-grid');
    picks.forEach(function (e) { var li = document.createElement('li'); li.innerHTML = cardHtml(e, 500, ''); fgrid.appendChild(li); });
    fw.appendChild(fgrid);
    fw.appendChild(buildCarousel(picks));
    first.appendChild(fw);
    if (!picks.length) first.classList.add('iva-hidden');

    // 4. results
    var results = el('section', 'iva-results');
    results.setAttribute('aria-label', 'All episodes');
    var rw = el('div', 'iva-wrap');
    var rhead = el('div', 'iva-results-head');
    var rh = el('div');
    var resultsEyebrow = el('div', 'iva-eyebrow', 'Episodes');
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
    var emptyP = el('p', null, 'Try one word instead of two, a guest’s name, or start from a subject and follow it from there.');
    empty.appendChild(emptyP);
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

    els = { h1: h1, sub: sub, clear: clearBtn, input: input, narrow: narrow, plus: plus, first: first,
      resultsEyebrow: resultsEyebrow, resultsH2: resultsH2, sort: sortBtn, grid: grid, empty: empty, emptyH: emptyH, more: more };
    return [hero, plus, first, results];
  }

  function mount() {
    var host = document.querySelector('.blog-basic-grid.collection-content-wrapper, .collection-content-wrapper');
    if (!host || !host.parentNode) return false;
    readUrlState();
    var parts = build();
    parts.forEach(function (p) { host.parentNode.insertBefore(p, host); });
    render();
    if (termsOf(query).length) { try { els.input.focus(); } catch (e) {} }
    document.addEventListener('click', function (ev) {
      if (!openPanel) return;
      if (openPanel.panel.contains(ev.target) || openPanel.btn.contains(ev.target)) return;
      closePanels();
    });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closePanels(); });
    loadLater();
    return true;
  }

  /* The heavier files arrive after first paint and simply re-render. */
  function getJSON(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); });
  }
  function loadLater() {
    var go = function () {
      getJSON(EXTRA_URL).then(function (d) {
        if (d && d.extra) { extra = d.extra; if (termsOf(query).length) render(); }
      })['catch'](function () {});
      var needTopic = !episodes.some(function (e) { return e.topicLine; });
      if (needTopic) {
        getJSON(CORPUS_URL).then(function (d) {
          var recs = (d && d.records) || [];
          var t = {};
          recs.forEach(function (r) { var f = r.fields || {}; if (f.Slug && f['Topic Line']) t[f.Slug] = f['Topic Line']; });
          topicLines = t;
          if (termsOf(query).length) render();
        })['catch'](function () {});
      }
      getJSON(PLUS_URL).then(function (d) {
        var list = d && (d.episodes || d.items || d) || [];
        if (!list.length) return;
        var set = {};
        list.forEach(function (p) {
          var u = String(p.url || '');
          var m = u.match(/\/plus\/([^\/?#]+)/);
          if (m) set[decodeURIComponent(m[1])] = true;
          if (p.slug && /\/plus\//.test(u)) set[p.slug] = true;
        });
        plusSlugs = set;
        render();
        if (els.first) {
          [].forEach.call(els.first.querySelectorAll('.iva-card'), function (a) {
            var slug = String(a.getAttribute('href') || '').split('/').pop();
            var e = bySlug[slug];
            var m = a.querySelector('.iva-meta');
            if (e && m) m.innerHTML = metaHtml(e);
          });
        }
      })['catch'](function () {});
      getJSON(SUBJECTS_URL).then(function (d) {
        var groups = [];
        if (d && typeof d === 'object' && !Array.isArray(d)) {
          Object.keys(d).forEach(function (k) { groups.push([k].concat(d[k] || [])); });
        } else if (Array.isArray(d)) groups = d;
        if (groups.length) { aliasGroups = groups; if (termsOf(query).length) render(); }
      })['catch'](function () {});
    };
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 2500 }); else setTimeout(go, 800);
  }

  function start() {
    if (!onEpisodesIndex()) return;
    if (document.querySelector('.iva-hero')) return;
    getJSON(INDEX_URL).then(function (d) {
      episodes = (d && d.episodes) || [];
      if (!episodes.length) throw new Error('empty index');
      episodes.forEach(function (e) { bySlug[e.slug] = e; });
      if (!mount()) {
        var tries = 0;
        var timer = setInterval(function () { tries++; if (mount() || tries > 60) clearInterval(timer); }, 125);
      }
    })['catch'](function () {
      document.documentElement.className = document.documentElement.className.replace(/\biv-search-page\b/g, '').replace(/\biv-archive-2026\b/g, '');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

;

(function () {
  'use strict';
  var DATA = 'https://raw.githubusercontent.com/chance-garton/innerverse-data/main/';
  var SKIP_SHOWS = ['Chance Guest Spots'];
  var SHOW_LABEL = { 'Chance Guest Spots': 'Chance on Other Podcasts' };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var SHOWS = [
    { value: 'InnerVerse', cls: 'ivx-show-iv', logo: 'https://images.squarespace-cdn.com/content/5987d897cf81e0278ec5322e/9a710a85-f780-4b67-a4c7-2b45690b6006/2025-Electric-Logo-2026.png',
      line: 'The flagship podcast running ten years strong. Consciousness, health, and everything esoteric with guests from all walks of life.' },
    { value: 'Inner Whirled', cls: 'ivx-show-iw', logo: 'https://images.squarespace-cdn.com/content/5987d897cf81e0278ec5322e/5f54aa66-6f0f-473b-91ca-6fcb9d07373f/InnerVerse+Inner+Whirled+Podcast+Patreon.png',
      line: 'Chance and Dylan Saccoccio dig through myth, language and hidden history.' },
    { value: 'Vibe Rant', cls: 'ivx-show-vr', logo: 'https://images.squarespace-cdn.com/content/5987d897cf81e0278ec5322e/b8217739-ae93-4527-bd8a-37d690f4296b/VIBRANT_LOGO.png',
      line: 'Chance and Slick Dissident, loose and live, covering some of the wildest ideas ever discussed on the internet.' }
  ];
  var PLAY = '<svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"></path></svg>';

  function path() { return ivPath().replace(/\/$/, '').toLowerCase(); }
  function img(u, w) { return window.ivImg ? window.ivImg(u, w) : u; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function clean(s) { return String(s || '').replace(/\u2014|\u2013/g, ', '); }
  function getJSON(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function whenThere(sel, fn) {
    var tries = 0;
    (function look() {
      var n = document.querySelector(sel);
      if (n) return fn(n);
      if (++tries < 120) setTimeout(look, 125);
    })();
  }
  function ytId(u) {
    var m = String(u || '').match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
  }
  function niceDate(d) {
    var m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? MONTHS[+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1] : '';
  }

  /* ---------------- /episodes: the newest episode ---------------- */
  function guestHtml(guests) {
    if (!guests.length) return '';
    if (guests.length === 1) {
      var g = guests[0];
      return '<div class="ivx-guest"><div class="ivx-guest-solo">' +
        (g.portrait ? '<img src="' + esc(img(g.portrait, 300)) + '" alt="' + esc(g.name) + '" loading="lazy">' : '') +
        '<div class="ivx-gbody"><div class="ivx-gname">' + esc(g.name) + '</div>' +
        (g.role ? '<div class="ivx-grole">' + esc(clean(g.role)) + '</div>' : '') +
        (g.bio ? '<p class="ivx-gbio">' + esc(clean(g.bio)) + '</p>' : '') + '</div></div></div>';
    }
    return '<div class="ivx-guest"><div class="ivx-guest-tabs">' + guests.map(function (g, i) {
      return '<button type="button" class="ivx-gtab' + (i === 0 ? ' ivx-on' : '') + '" data-i="' + i + '" aria-label="' + esc(g.name) + '">' +
        '<img src="' + esc(img(g.portrait, 300)) + '" alt="' + esc(g.name) + '" loading="lazy"></button>';
    }).join('') + '</div><div class="ivx-gbody" data-ivx-gbody></div></div>';
  }
  function fillGuest(card, guests, i) {
    var g = guests[i], body = card.querySelector('[data-ivx-gbody]');
    if (!body) return;
    body.innerHTML = '<div class="ivx-gname">' + esc(g.name) + '</div>' +
      (g.role ? '<div class="ivx-grole">' + esc(clean(g.role)) + '</div>' : '') +
      (g.bio ? '<p class="ivx-gbio">' + esc(clean(g.bio)) + '</p>' : '');
    [].forEach.call(card.querySelectorAll('.ivx-gtab'), function (b) { b.classList.toggle('ivx-on', +b.getAttribute('data-i') === i); });
  }

  function buildNewest(hero, e, d) {
    var f = (d && d.fields) || {};
    var gById = (d && d._guestsById) || {};
    var guests = (f.Guests || []).map(function (id) {
      var g = gById[id] || {};
      return { name: g.Name || '', portrait: g['Portrait URL'] || '', role: g.Role || '', bio: g.Bio || '' };
    }).filter(function (g) { return g.name; });
    var href = '/episodes/' + e.slug;
    var title = clean(f.Title || e.title);
    var thumb = f['Thumbnail URL'] || e.thumb;
    var vid = ytId(f['Video URL']);
    var show = (e.shows || []).indexOf('Astro-Herbalism') >= 0 ? 'Astro-Herbalism' : (SHOW_LABEL[(e.shows || [])[0]] || (e.shows || [])[0] || 'InnerVerse');
    var meta = [show, f.Duration || e.duration, niceDate(e.date)].filter(Boolean).join(' · ');
    var blurb = clean(f['Intro Paragraph 1'] || '');

    var sec = el('section', 'ivx-new');
    sec.setAttribute('aria-label', 'Newest episode');
    sec.innerHTML = '<div class="iva-wrap">' +
      '<div class="iva-eyebrow">Newest episode</div>' +
      '<div class="ivx-new-grid">' +
        '<div class="ivx-player">' + (thumb ? '<img src="' + esc(img(thumb, 1000)) + '" alt="" loading="lazy">' : '') +
          (vid ? '<button type="button" class="ivx-play" aria-label="Play ' + esc(title) + '"><span class="ivx-play-disc">' + PLAY + '</span></button>'
               : '<a class="ivx-play" href="' + esc(href) + '" aria-label="Open ' + esc(title) + '"><span class="ivx-play-disc">' + PLAY + '</span></a>') +
        '</div>' +
        '<div class="ivx-copy">' +
          '<div class="iva-meta">' + esc(meta) + '</div>' +
          '<h2 class="ivx-title"><a href="' + esc(href) + '">' + esc(title) + '</a></h2>' +
          (blurb ? '<p class="ivx-blurb">' + esc(blurb) + '</p>' : '') +
          guestHtml(guests) +
          '<div class="ivx-btns"><a class="iva-btn ivx-btn-lapis" href="' + esc(href) + '">Open the episode</a></div>' +
        '</div>' +
      '</div></div>';

    var playBtn = sec.querySelector('button.ivx-play');
    if (playBtn) playBtn.addEventListener('click', function () {
      var box = sec.querySelector('.ivx-player');
      box.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + vid + '?autoplay=1&rel=0&modestbranding=1" title="' + esc(title) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    });
    var card = sec.querySelector('.ivx-guest');
    if (card && guests.length > 1) {
      fillGuest(card, guests, 0);
      [].forEach.call(card.querySelectorAll('.ivx-gtab'), function (b) {
        b.addEventListener('click', function () { fillGuest(card, guests, +b.getAttribute('data-i')); });
      });
    }
    hero.parentNode.insertBefore(sec, hero.nextSibling);

    /* hide it whenever Good first episodes hides (a search or filter is on) */
    var first = document.querySelector('section.iva-first');
    function sync() { sec.classList.toggle('iva-hidden', !!(first && first.classList.contains('iva-hidden'))); }
    sync();
    if (first && window.MutationObserver) new MutationObserver(sync).observe(first, { attributes: true, attributeFilter: ['class'] });
  }

  function startEpisodes() {
    whenThere('section.iva-hero', function (hero) {
      if (document.querySelector('section.ivx-new')) return;
      getJSON(DATA + 'episodes-index.json').then(function (d) {
        var list = ((d && d.episodes) || []).filter(function (e) {
          return !(e.shows || []).some(function (s) { return SKIP_SHOWS.indexOf(s) >= 0; });
        }).sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
        var top = list[0];
        if (!top) return;
        return getJSON(DATA + 'episodes/' + encodeURIComponent(top.slug) + '.json')
          .then(function (ep) { buildNewest(hero, top, ep); }, function () { buildNewest(hero, top, null); });
      })['catch'](function () {});
    });
  }

  /* ---------------- /plus: the three main shows ---------------- */
  function showPill(value) {
    var all = document.querySelectorAll('.iva-pill[data-value]');
    for (var i = 0; i < all.length; i++) if (all[i].getAttribute('data-value') === value) return all[i];
    return null;
  }
  function startPlus() {
    whenThere('section.iva-first', function (first) {
      if (document.querySelector('section.ivx-shows')) return;
      var sec = el('section', 'ivx-shows');
      sec.setAttribute('aria-label', 'Our shows');
      sec.innerHTML = '<div class="iva-wrap"><div class="iva-first-head"><div><div class="iva-eyebrow">Our shows</div><h2 class="iva-h2">Browse by show</h2></div>' +
        '<div class="iva-note">Pick one to see only its episodes. Pick it again to see them all.</div></div>' +
        '<ul class="ivx-shows-grid">' + SHOWS.map(function (s) {
          return '<li><button type="button" class="ivx-show ' + s.cls + '" data-show="' + esc(s.value) + '" aria-pressed="false">' +
            '<span class="ivx-show-art"><img src="' + esc(img(s.logo, 500)) + '" alt="" loading="lazy"></span>' +
            '<span class="ivx-show-body"><span class="ivx-show-name">' + esc(s.value) + '</span>' +
            '<span class="ivx-show-line">' + esc(s.line) + '</span><span class="ivx-show-state"></span></span></button></li>';
        }).join('') + '</ul></div>';
      first.parentNode.insertBefore(sec, first);

      var btns = sec.querySelectorAll('.ivx-show');
      var grid = sec.querySelector('.ivx-shows-grid');
      function sync() {
        var any = false;
        [].forEach.call(btns, function (b) {
          var p = showPill(b.getAttribute('data-show'));
          var on = !!(p && p.classList.contains('iva-on'));
          b.classList.toggle('ivx-on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
          b.querySelector('.ivx-show-state').textContent = on ? 'Showing' : '';
          if (on) any = true;
        });
        grid.classList.toggle('ivx-picking', any);
      }
      [].forEach.call(btns, function (b) {
        b.addEventListener('click', function () {
          var p = showPill(b.getAttribute('data-show'));
          if (!p) return;
          p.click();
          sync();
          var res = document.querySelector('section.iva-results');
          if (res && b.classList.contains('ivx-on')) {
            var y = res.getBoundingClientRect().top + window.pageYOffset - 96;
            try { window.scrollTo({ top: y, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, y); }
          }
        });
      });
      if (window.MutationObserver) {
        var panels = document.querySelector('.iva-panels') || document.body;
        new MutationObserver(sync).observe(panels, { attributes: true, attributeFilter: ['class'], subtree: true });
      }
      sync();
    });
  }

  function start() {
    var p = path();
    if (p === '/episodes') startEpisodes();
    else if (p === '/plus') startPlus();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
