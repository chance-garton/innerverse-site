/* Carried over from the Squarespace Code Injection block iv-home (live 2026-10-28). Path read through ivPath(). */

(function () {
  'use strict';
  /* ============================================================
     IV HOME (release one, 2026-09-22; phone layout 2026-09-23b; desktop search 2026-09-23c). Draws the homepage around
     the H1, hook and identity paragraph that the Squarespace code
     block serves as real HTML inside #iv-home-root. Runs only on a
     page carrying that root, on the paths in HOME_PATHS. Reads the
     innerverse-data static files only; never Airtable.
     Member state: html.iv-plus-member (precheck + nav live check).
     Doc: claude/iv-home.md
     ============================================================ */
  if (window.__ivHomeStarted) return;
  var HOME_PATHS = ['/', '/home-2026'];
  var path = (ivPath().replace(/\/+$/, '') || '/').toLowerCase();
  if (HOME_PATHS.indexOf(path) === -1) return;
  var root = document.getElementById('iv-home-root');
  if (!root) return;
  window.__ivHomeStarted = true;

  var DATA = 'https://raw.githubusercontent.com/chance-garton/innerverse-data/main/';
  var CDN = 'https://images.squarespace-cdn.com/content/5987d897cf81e0278ec5322e/';
  var PORTRAIT_DESKTOP = CDN + '9c1dfacf-dd4d-4987-95d7-3a2a1a57d65d/Chance-Garton-hero-circular-feather-Portrait.png?format=750w';
  var PORTRAIT_PHONE = CDN + '0d1c6b4a-baa8-46a6-8e7a-7b5ad8f90fd5/Chance-Garton-hero-Portrait.png?format=500w';
  var HOST_IMG = 'https://images.squarespace-cdn.com/content/v1/5987d897cf81e0278ec5322e/7a926674-e13c-4827-ac2a-8d4cf8964ab0/CHANCE+GARTON+ABOUT+PAGE+INNERVERSE.png?format=750w';
  var PLUS_LOGO = CDN + 'c3607ade-e087-4b27-af0f-e0913f4dc3d0/plus+asset.png?format=300w&content-type=image%2Fpng';
  var CHECKOUT_TRIAL = 'https://innerverseplus.memberful.com/checkout?plan=149343';
  var ABOUT_URL = '/about';
  var GUEST_SHOW = 'Chance Guest Spots';
  var SHOW_LABEL = { 'Chance Guest Spots': 'Chance on Other Podcasts' };
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  var PLAY = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>';
  var PLAY_LG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>';
  var ARROW = '<svg class="ivh-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>';
  var SEARCH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>';
  var LOCK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>';
  var SPARK = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"></path><circle cx="12" cy="12" r="2.2"></circle></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* No em or en dashes ever reach the page, whatever the data says. */
  function clean(s) { return String(s == null ? '' : s).replace(/\s*[\u2013\u2014]\s*/g, ', '); }
  function $(sel, ctx) { return (ctx || root).querySelector(sel); }
  function relUrl(u) {
    try { var x = new URL(u, location.origin); return x.pathname + x.search; } catch (e) { return u || '/episodes'; }
  }
  function epHref(e) { return e.url ? relUrl(e.url) : '/episodes/' + encodeURIComponent(e.slug); }
  /* Sizing lives in the iv-img HEADER block now, so every page asks the CDN
     the same way. The fallback keeps this block working on its own. */
  function sized(u, w) {
    if (window.ivImg) return window.ivImg(u, w);
    return u || '';
  }
  function showOf(e) { var s = (e.shows || [])[0] || 'InnerVerse'; return SHOW_LABEL[s] || s; }
  function monthYear(d) {
    var p = String(d || '').split('-');
    return p.length >= 2 && MONTHS[+p[1] - 1] ? MONTHS[+p[1] - 1] + ' ' + p[0] : '';
  }
  function plusTitle(t) { return clean(String(t || '').replace(/\s*\(PLUS\)\s*$/i, '')); }
  function byDateDesc(list) {
    return list.map(function (e, i) { return [e, i]; }).sort(function (a, b) {
      var x = a[0].date || '', y = b[0].date || '';
      return x < y ? 1 : x > y ? -1 : a[1] - b[1];
    }).map(function (p) { return p[0]; });
  }
  function getJSON(file) {
    return fetch(DATA + file).then(function (r) { if (!r.ok) throw new Error(file + ' ' + r.status); return r.json(); });
  }
  function thumbHtml(src, cls, playCls, eager) {
    return '<div class="ivh-thumb' + (src ? '' : ' ivh-thumb-empty') + (cls ? ' ' + cls : '') + '">' +
      (src ? '<img src="' + esc(src) + '" alt="" ' + (eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"') + ' decoding="async">' : '') +
      (playCls === 'none' ? '' : '<div class="ivh-play' + (playCls ? ' ' + playCls : '') + '">' + (playCls === 'ivh-play-hero' ? PLAY_LG : PLAY) + '</div>') + '</div>';
  }

  /* ---------------- build (synchronously, before first paint) ---------------- */
  var hero = $('.ivh-hero');
  var heroText = $('.ivh-hero-text');
  var identity = $('.ivh-identity');
  if (!hero || !heroText) return;
  var nameLink = $('.ivh-namelink');
  if (nameLink) nameLink.setAttribute('href', ABOUT_URL);

  var heroExtra = document.createElement('div');
  heroExtra.className = 'ivh-hero-extra';
  heroExtra.style.display = 'contents';
  heroExtra.innerHTML =
    '<div class="ivh-btns">' +
      '<a class="ivh-btn ivh-btn-primary" id="ivh-watch-latest" href="/episodes">Watch the latest</a>' +
      '<a class="ivh-btn ivh-btn-secondary" href="/episodes">Explore the archive</a>' +
    '</div>' +
    '<div class="ivh-cred">Independently produced since 2015</div>';
  heroText.appendChild(heroExtra);

  var art = document.createElement('div');
  art.className = 'ivh-art';
  art.innerHTML =
    '<div class="ivh-art-stage">' +
      '<div class="ivh-art-glow"></div><div class="ivh-art-ring"></div>' +
      '<picture class="ivh-portrait">' +
        '<source media="(max-width: 1024px)" srcset="' + PORTRAIT_PHONE + '">' +
        '<img src="' + PORTRAIT_DESKTOP + '" alt="Chance Garton, host of InnerVerse" loading="eager" fetchpriority="high" decoding="async">' +
      '</picture>' +
    '</div>' +
    '<div class="ivh-latest-wrap">' +
      '<div class="ivh-label ivh-latest-eyebrow">New episode</div>' +
      '<a class="ivh-latest" id="ivh-latest" href="/episodes">' +
        thumbHtml('', '', 'none', true) +
        '<div class="ivh-latest-body"><div class="ivh-label-sm">Latest</div>' +
        '<div class="ivh-latest-title"><span class="ivh-skel" style="width:90%"></span></div></div>' +
      '</a>' +
    '</div>';
  hero.appendChild(art);

  var skelCards = '';
  for (var i = 0; i < 6; i++) {
    skelCards += '<a class="ivh-card" href="/episodes">' + thumbHtml('', '', 'none') +
      '<div class="ivh-card-body"><div class="ivh-label-sm">&nbsp;</div><div class="ivh-card-title"><span class="ivh-skel" style="width:85%"></span></div></div></a>';
  }

  var rest = document.createElement('div');
  rest.className = 'ivh-rest';
  rest.innerHTML =
    /* Explore */
    '<section class="ivh-explore" aria-labelledby="ivh-explore-h"><div class="ivh-wrap">' +
      '<div class="ivh-head-text" style="gap:8px"><div class="ivh-label">Explore InnerVerse</div>' +
      '<h2 class="ivh-h2" id="ivh-explore-h">What are you curious about?</h2></div>' +
      '<div class="ivh-search" id="ivh-search">' +
        '<label class="ivh-field">' + SEARCH +
          '<input class="ivh-input" id="iv-home-q" type="search" autocomplete="off" spellcheck="false" placeholder="a topic, a guest, a feeling" aria-label="Search episodes" role="combobox" aria-expanded="false" aria-controls="ivh-drop" aria-autocomplete="list">' +
          '<button type="button" class="ivh-find" id="ivh-find">Find</button>' +
        '</label>' +
        '<div class="ivh-drop" id="ivh-drop" role="listbox"></div>' +
      '</div>' +
    '</div></section>' +

    /* New this month */
    '<section class="ivh-sec ivh-new" aria-labelledby="ivh-new-h"><div class="ivh-wrap">' +
      '<div class="ivh-head"><div class="ivh-head-text"><div class="ivh-label">Latest</div>' +
      '<h2 class="ivh-h2" id="ivh-new-h">New this month</h2></div>' +
      '<a class="ivh-btn ivh-btn-secondary ivh-btn-sm" href="/episodes">View all episodes' + ARROW + '</a></div>' +
      '<div class="ivh-grid" id="ivh-grid">' + skelCards + '</div>' +
      '<div class="ivh-new-foot"><a class="ivh-btn ivh-btn-secondary ivh-btn-sm" href="/episodes">View all episodes' + ARROW + '</a></div>' +
    '</div></section>' +

    /* Plus+ */
    '<section class="ivh-plus" id="ivh-plus" aria-labelledby="ivh-plus-h"><div class="ivh-wrap">' +
      '<div class="ivh-plus-visitor">' +
        '<div class="ivh-plus-text">' +
          '<div class="ivh-plus-brand"><img class="ivh-plus-logo" src="' + sized(PLUS_LOGO, 300) + '" alt="" loading="lazy" width="52" height="52"><div class="ivh-label">InnerVerse Plus+</div></div>' +
          '<h2 class="ivh-h2 ivh-h2-lg" id="ivh-plus-h">Go deeper.</h2>' +
          '<p class="ivh-plus-line">The free show begins the journey.<br><em>Plus+ is your initiation.</em></p>' +
          '<ul class="ivh-perks">' +
            '<li>The full, extended version of every episode</li>' +
            '<li>The complete Plus+ archive</li>' +
            '<li>A private podcast feed for your app</li>' +
            '<li>The Inner Circle, our members\' chat with Chance</li>' +
          '</ul>' +
          '<div class="ivh-plus-cta"><div class="ivh-btns">' +
            '<a class="ivh-btn ivh-btn-gold" href="' + CHECKOUT_TRIAL + '">Start your 7-day free trial</a>' +
            '<a class="ivh-btn ivh-btn-secondary ivh-btn-md" id="ivh-plus-login" href="/plus">Already a member? Log in</a>' +
          '</div><div class="ivh-small">Then $9 a month. Cancel any time. Every full episode, unlocked.</div></div>' +
        '</div>' +
        '<div class="ivh-plus-art"><a id="ivh-plus-art" href="/plus">' +
          '<div class="ivh-plus-frame"><div class="ivh-play ivh-play-gold">' + PLAY_LG + '</div></div>' +
          '<div class="ivh-plus-meta"><div class="ivh-label-sm" id="ivh-plus-art-label">Full episode</div>' +
          '<span class="ivh-badge">' + LOCK + 'Plus+</span></div>' +
        '</a></div>' +
      '</div>' +
      '<div class="ivh-plus-member">' +
        '<div class="ivh-member-head"><img class="ivh-plus-logo" src="' + sized(PLUS_LOGO, 300) + '" alt="" loading="lazy" width="52" height="52">' +
          '<div class="ivh-member-head-text"><div class="ivh-label">InnerVerse Plus+ &middot; Member</div>' +
          '<h2 class="ivh-h2" id="ivh-welcome">Welcome back.</h2></div></div>' +
        '<div class="ivh-tiles">' +
          '<a class="ivh-tile" id="ivh-tile-new" href="/plus">' + thumbHtml('', '', 'ivh-play-gold') +
            '<div class="ivh-label-sm">New for Plus+</div><div class="ivh-tile-title">&nbsp;</div></a>' +
          '<a class="ivh-tile" id="ivh-tile-recent" href="/plus">' + thumbHtml('', '', 'ivh-play-gold') +
            '<div class="ivh-label-sm">Recently added</div><div class="ivh-tile-title">&nbsp;</div></a>' +
          '<a class="ivh-tile" href="https://circle.innerversepodcast.com/"><div class="ivh-soon">' + SPARK + '<span class="ivh-label-sm">Live now</span></div>' +
            '<div class="ivh-label-sm">Inner Circle</div><div class="ivh-tile-title">Join the members\' chat</div></a>' +
          '<a class="ivh-tile" href="/plus"><div class="ivh-mosaic" id="ivh-mosaic"><span></span><span></span><span></span><span></span></div>' +
            '<div class="ivh-label-sm">The archive</div><div class="ivh-tile-title">Browse every Plus+ episode</div></a>' +
        '</div>' +
      '</div>' +
    '</div></section>' +

    /* Host */
    '<section class="ivh-sec ivh-host" aria-labelledby="ivh-host-h"><div class="ivh-wrap">' +
      '<img class="ivh-host-img" src="' + HOST_IMG + '" alt="Chance Garton" loading="lazy" decoding="async">' +
      '<div class="ivh-host-text">' +
        '<div class="ivh-label">The host</div>' +
        '<h2 class="ivh-h2" id="ivh-host-h">Chance Garton</h2>' +
        '<p class="ivh-host-p">Creator, host, editor and producer of InnerVerse since 2015.</p>' +
        '<p class="ivh-host-p ivh-host-p2">A mythologist, philologist, and energy medicine specialist, with hundreds of remote sessions behind him. The show began as one question: how do you build a life around work that means something?</p>' +
        '<div class="ivh-btns">' +
          '<a class="ivh-btn ivh-btn-secondary" href="' + ABOUT_URL + '">About InnerVerse</a>' +
          '<a class="ivh-btn ivh-btn-secondary" href="/episodes?show=' + encodeURIComponent(GUEST_SHOW) + '">Chance on other shows</a>' +
        '</div>' +
      '</div>' +
    '</div></section>' +

    /* Get Tuned */
    '<section class="ivh-sec ivh-tuned" aria-labelledby="ivh-tuned-h"><div class="ivh-wrap">' +
      '<div class="ivh-head"><div class="ivh-head-text"><div class="ivh-label">Get Tuned</div>' +
      '<h2 class="ivh-h2" id="ivh-tuned-h">Work with Chance</h2></div></div>' +
      '<div class="ivh-offers">' +
        '<div class="ivh-offer"><div class="ivh-label">Transformative energy work</div>' +
          '<h3 class="ivh-offer-title">Biofield Tuning</h3>' +
          '<p class="ivh-offer-p">A sound-based practice that works with the field around your body. Tuning forks find where energy is stuck and bring it back into flow. Sessions over Zoom, recorded for you to keep.</p>' +
          '<div><a class="ivh-btn ivh-btn-primary ivh-btn-md" href="/biofield-tuning">Learn more</a></div></div>' +
        '<div class="ivh-offer"><div class="ivh-label">Natal Charts, Tarot Cards, &amp; I Ching Readings</div>' +
          '<h3 class="ivh-offer-title">30 Minute Consultations</h3>' +
          '<p class="ivh-offer-p">Have something you want to look at with me, or looking for guidance? We can consult oracular tools, read your chart, or just have a conversation about whatever you choose.</p>' +
          '<div><a class="ivh-btn ivh-btn-primary ivh-btn-md" href="/biofield-tuning">Learn more</a></div></div>' +
      '</div>' +
    '</div></section>';
  root.appendChild(rest);

  /* ---------------- phone: the latest episode and the search on screen 1 ----------------
     Phones (up to 700px) get a separate layout (claude/iv-home.md, "Phone layout").
     The CSS reorders the served pieces; this adds the phone-only latest block
     and the spacer, fits the teaser to the fold, and rotates try terms in the search placeholder. */
  var PHONE_MQ = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  var TRY_TERMS = ['astrotheology', 'biofield tuning', 'tartaria', 'gematria', 'etymology', 'sound healing',
    'gnosticism', 'atlantis', 'sacred geometry', 'terrain theory', 'chakras', 'synchronicity', 'plant medicine',
    'oera linda', 'mud flood', 'simulation theory', 'Dylan Saccoccio', 'Mario Garza', 'Marty Leeds',
    'Eileen McKusick', 'Kyle Denton', 'Jason Quitt', 'Steven Young', 'Topher Gardner',
    'grief', 'fear', 'dreams', 'trauma', 'initiation', 'purpose', 'death', 'healing', 'sleep'];
  var mlatest = document.createElement('a');
  mlatest.className = 'ivh-mlatest';
  mlatest.setAttribute('href', '/episodes');
  mlatest.innerHTML = '<div class="ivh-mlatest-thumb"></div><div class="ivh-mlatest-meta">Latest</div>' +
    '<div class="ivh-mlatest-guest"></div><div class="ivh-mlatest-title"><span class="ivh-skel" style="width:80%"></span></div><p class="ivh-mlatest-desc"></p>';
  root.insertBefore(mlatest, root.firstChild);
  var mspacer = document.createElement('div');
  mspacer.className = 'ivh-mspacer';
  mspacer.setAttribute('aria-hidden', 'true');
  root.appendChild(mspacer);

  function norm(s) { return String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function nameMatches(tail, name) {
    var t = ' ' + norm(tail) + ' ';
    var parts = String(name || '').split(/[()]/).map(norm).filter(Boolean);
    return parts.some(function (p) { return p.length >= 3 && t.indexOf(' ' + p + ' ') !== -1; });
  }
  /* Drop a trailing " | X", " with X", " ft. X" when X names a guest or the show. */
  function trimTitle(title, e) {
    var t = clean(title);
    if ((e.shows || []).indexOf(GUEST_SHOW) !== -1) return t;
    var m = t.match(/^(.*\S)\s+(\||with|ft\.|feat\.|featuring)\s+([^|]+)$/i);
    if (!m || m[1].length < 20) return t;
    var tail = m[3], names = (e.guests || []).concat(e.shows || []);
    return names.some(function (n) { return nameMatches(tail, n); }) ? m[1] : t;
  }
  function guestLine(e) {
    if ((e.shows || []).indexOf(GUEST_SHOW) !== -1) return '';
    var g = (e.guests || []).map(clean).filter(function (n) { return n && n !== 'Chance Garton'; });
    if (!g.length) return '';
    if (g.length <= 3) return g.length === 1 ? g[0] : g.slice(0, -1).join(', ') + ' and ' + g[g.length - 1];
    return g[0] + ', ' + g[1] + ' and others';
  }
  function sentences(p) {
    var out = [], re = /[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g, m;
    p = clean(p).replace(/\s+/g, ' ').trim();
    while ((m = re.exec(p)) !== null) { if (m[0].trim()) out.push(m[0].trim()); if (!m[0].length) break; }
    return out;
  }
  var teaser = [], explore = $('.ivh-explore'), descEl = $('.ivh-mlatest-desc'), fitTimer = null;
  function fold() { return window.innerHeight; }
  function exploreBottom() { return explore.getBoundingClientRect().bottom + window.pageYOffset; }
  function fitScreenOne() {
    if (!PHONE_MQ.matches || !explore) return;
    var limit = fold() - 40, n = 0;
    descEl.style.removeProperty('--ivh-desc-lines');
    descEl.textContent = teaser.length ? teaser[0] : '';
    n = teaser.length ? 1 : 0;
    while (n < teaser.length && exploreBottom() <= limit) {
      descEl.textContent = teaser.slice(0, n + 1).join(' ');
      if (exploreBottom() > limit) { descEl.textContent = teaser.slice(0, n).join(' '); break; }
      n++;
    }
    if (n === 1 && exploreBottom() > limit) {
      var lh = parseFloat(getComputedStyle(descEl).lineHeight) || 24;
      var over = exploreBottom() - limit, lines = Math.round(descEl.getBoundingClientRect().height / lh);
      descEl.style.setProperty('--ivh-desc-lines', String(Math.max(1, lines - Math.ceil(over / lh))));
    }
    var gap = Math.max(40, Math.round(fold() - exploreBottom()));
    mspacer.style.setProperty('--ivh-gap1', gap + 'px');
  }
  function scheduleFit() { clearTimeout(fitTimer); fitTimer = setTimeout(fitScreenOne, 60); }
  window.addEventListener('resize', scheduleFit);
  window.addEventListener('orientationchange', scheduleFit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleFit);
  setTimeout(scheduleFit, 1500);

  function fillPhoneLatest(top) {
    mlatest.setAttribute('href', epHref(top));
    mlatest.setAttribute('aria-label', 'Watch the latest episode: ' + clean(top.title));
    $('.ivh-mlatest-thumb', mlatest).innerHTML = top.thumb ? '<img src="' + esc(sized(top.thumb, 500)) + '" alt="" loading="eager" fetchpriority="high" decoding="async">' : '';
    $('.ivh-mlatest-meta', mlatest).innerHTML = 'Latest &middot; ' + esc(showOf(top)) + (top.duration ? ' &middot; ' + esc(top.duration) : '');
    $('.ivh-mlatest-guest', mlatest).textContent = guestLine(top);
    $('.ivh-mlatest-title', mlatest).textContent = trimTitle(top.title, top);
    scheduleFit();
    if (!PHONE_MQ.matches) return;
    getJSON('episodes/' + encodeURIComponent(top.slug) + '.json').then(function (d) {
      var f = (d && d.fields) || {};
      teaser = sentences(f['Intro Paragraph 1'] || f['Intro Paragraph'] || '');
      fitScreenOne();
    })['catch'](function () {});
  }
  if (PHONE_MQ.matches) {
    var newLabel = $('.ivh-new .ivh-label');
    if (newLabel) newLabel.textContent = 'Episodes';
  }

  /* Try terms (every width since 2026-09-23c): the placeholder reads "a topic, a guest, a feeling" for
     5 s, then becomes try "term", a new term every 3.5 s, shuffled once. Paused
     while the field is focused or holds text. FIND on an empty field searches
     the term showing at that moment. */
  var PH_REST = 'a topic, a guest, a feeling';
  var order = TRY_TERMS.slice(), ti = -1, tryTimer = null, phTerm = '';
  for (var k = order.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)); var tmp = order[k]; order[k] = order[j]; order[j] = tmp; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setPh(text) {
    if (reduce) { input.setAttribute('placeholder', text); return; }
    input.classList.add('ivh-ph-fade');
    setTimeout(function () { input.setAttribute('placeholder', text); input.classList.remove('ivh-ph-fade'); }, 260);
  }
  function nextTerm() {
    if (document.hidden || document.activeElement === input || input.value.trim()) return;
    ti++;
    phTerm = order[ti % order.length];
    setPh('try \u201c' + phTerm + '\u201d');
  }
  /* Squarespace's own WebSite JSON-LD (name "INNERVERSE PODCAST") would sit
     beside the graph in the code block; keep one WebSite node in the
     rendered page. */
  try {
    Array.prototype.forEach.call(document.querySelectorAll('script[type="application/ld+json"]'), function (s) {
      if (root.contains(s)) return;
      var d = JSON.parse(s.textContent || 'null');
      if (d && d['@type'] === 'WebSite' && !d['@id']) s.parentNode.removeChild(s);
    });
  } catch (e) {}

  /* ---------------- member swap ---------------- */
  var plusSec = document.getElementById('ivh-plus');
  function firstName() {
    try { return String(localStorage.getItem('iv_plus_name') || '').trim().split(/\s+/)[0] || ''; } catch (e) { return ''; }
  }
  function syncMember() {
    var member = document.documentElement.classList.contains('iv-plus-member');
    plusSec.classList.toggle('ivh-member', member);
    var fn = member ? firstName() : '';
    var w = document.getElementById('ivh-welcome');
    if (w) w.textContent = fn ? 'Welcome back, ' + clean(fn) + '.' : 'Welcome back.';
  }
  syncMember();
  if (window.MutationObserver) {
    new MutationObserver(syncMember).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
  var loginBtn = document.getElementById('ivh-plus-login');
  loginBtn.addEventListener('click', function (ev) {
    if (window.ivMembership && window.ivMembership.loginUrl) {
      ev.preventDefault();
      location.href = window.ivMembership.loginUrl();
    }
  });

  /* ---------------- data ---------------- */
  var episodes = [];
  var extra = null;

  function cardHtml(e) {
    return '<a class="ivh-card" href="' + esc(epHref(e)) + '">' + thumbHtml(sized(e.thumb, 500), '', 'none') +
      '<div class="ivh-card-body"><div class="ivh-label-sm">' + esc(showOf(e)) + (e.duration ? ' &middot; ' + esc(e.duration) : '') + '</div>' +
      '<div class="ivh-card-title">' + esc(clean(e.title)) + '</div></div></a>';
  }

  getJSON('episodes-index.json').then(function (d) {
    episodes = byDateDesc((d && d.episodes) || []);
    if (!episodes.length) return;
    var top = episodes[0];
    var latest = document.getElementById('ivh-latest');
    latest.setAttribute('href', epHref(top));
    latest.innerHTML = thumbHtml(sized(top.thumb, 500), '', 'none', true) +
      '<div class="ivh-latest-body"><div class="ivh-label-sm">Latest &middot; ' + esc(showOf(top)) + (top.duration ? ' &middot; ' + esc(top.duration) : '') + '</div>' +
      '<div class="ivh-latest-title">' + esc(clean(top.title)) + '</div></div>';
    document.getElementById('ivh-watch-latest').setAttribute('href', epHref(top));
    fillPhoneLatest(top);
    document.getElementById('ivh-grid').innerHTML = episodes.slice(1, 7).map(cardHtml).join('');
    if (pendingQuery) runSearch();
  })['catch'](function () {});

  getJSON('episodes/_manifest.json').then(function (m) {
    var np = m && m.newestPlus;
    if (!np || !np.slug) return;
    var href = '/plus/' + encodeURIComponent(np.slug);
    var a = document.getElementById('ivh-plus-art');
    a.setAttribute('href', href);
    a.setAttribute('aria-label', 'Plus+ full episode: ' + plusTitle(np.title));
    var frame = a.querySelector('.ivh-plus-frame');
    if (np.thumb) {
      var img = document.createElement('img');
      img.src = sized(np.thumb, 750); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      frame.insertBefore(img, frame.firstChild);
    }
    document.getElementById('ivh-plus-art-label').innerHTML = 'Full episode' + (np.duration ? ' &middot; ' + esc(np.duration) : '');
    var t1 = document.getElementById('ivh-tile-new');
    t1.setAttribute('href', href);
    t1.innerHTML = thumbHtml(sized(np.thumb, 500), '', 'ivh-play-gold') +
      '<div class="ivh-label-sm">New for Plus+</div><div class="ivh-tile-title">' + esc(plusTitle(np.title)) + '</div>';
    return getJSON('plus-index.json').then(function (p) {
      /* Members' pages first: plus-index also lists free shows cross-listed
         into /plus browsing (REDIRECTS), which live under /episodes. */
      var all = byDateDesc((p && p.episodes) || []).filter(function (e) { return e.slug !== np.slug; });
      var list = all.filter(function (e) { return /\/plus\//.test(e.url || ''); });
      if (list.length < 5) list = all;
      var r = list[0];
      if (r) {
        var t2 = document.getElementById('ivh-tile-recent');
        t2.setAttribute('href', relUrl(r.url || ('/plus/' + r.slug)));
        t2.innerHTML = thumbHtml(sized(r.thumb, 500), '', 'ivh-play-gold') +
          '<div class="ivh-label-sm">Recently added</div><div class="ivh-tile-title">' + esc(plusTitle(r.title)) + '</div>';
      }
      document.getElementById('ivh-mosaic').innerHTML = list.slice(1, 5).map(function (e) {
        return e.thumb ? '<img src="' + esc(sized(e.thumb, 300)) + '" alt="" loading="lazy" decoding="async">' : '<span></span>';
      }).join('');
    });
  })['catch'](function () {});

  /* ---------------- search ---------------- */
  var box = document.getElementById('ivh-search');
  var input = document.getElementById('iv-home-q');
  var drop = document.getElementById('ivh-drop');
  var hl = -1, rows = [], timer = null, pendingQuery = false;

  function loadExtra() {
    if (extra !== null) return;
    extra = {};
    getJSON('episodes-extra.json').then(function (d) {
      extra = (d && d.extra) || {};
      if (input.value.trim().length >= 2) runSearch();
    })['catch'](function () {});
  }
  /* Same matching and ordering as the /episodes search (shared function
     lives in iv-episodes-search). The local copy is only a fallback. */
  function find(q) {
    if (window.ivEpisodeSearch && window.ivEpisodeSearch.filter) {
      return window.ivEpisodeSearch.filter(episodes, extra || {}, q, {}, '', true);
    }
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return episodes.filter(function (e) {
      var h = (e.title + ' ' + (e.guests || []).join(' ') + ' ' + (e.topics || []).join(' ') + ' ' +
        (e.shows || []).join(' ') + ' ' + (e.tags || []).join(' ') + ' ' + ((extra || {})[e.slug] || '')).toLowerCase();
      return terms.every(function (t) { return h.indexOf(t) !== -1; });
    });
  }
  function why(e, q) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    function all(s) { s = String(s || '').toLowerCase(); return terms.every(function (t) { return s.indexOf(t) !== -1; }); }
    function any(s) { s = String(s || '').toLowerCase(); return terms.some(function (t) { return s.indexOf(t) !== -1; }); }
    if (all(e.title)) return 'title match';
    var g = (e.guests || []).filter(any)[0]; if (g) return 'guest: ' + g;
    var t = (e.tags || []).filter(any)[0]; if (t) return 'tag: ' + t;
    var tp = (e.topics || []).filter(any)[0]; if (tp) return 'topic: ' + tp.replace(/,\s*&/g, ' &').replace(/,/g, '');
    if (any(e.title)) return 'title match';
    return 'episode notes';
  }
  function allHref(q) { return '/episodes?q=' + encodeURIComponent(q); }
  function close() {
    box.classList.remove('ivh-open');
    input.setAttribute('aria-expanded', 'false');
    hl = -1;
  }
  function setHl(i) {
    hl = i;
    rows.forEach(function (r, k) { r.classList.toggle('ivh-hl', k === i); r.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
  }
  function runSearch() {
    var q = input.value.trim();
    if (q.length < 2) { drop.innerHTML = ''; rows = []; close(); return; }
    if (!episodes.length) { pendingQuery = true; return; }
    pendingQuery = false;
    var found = find(q);
    var html = found.slice(0, 4).map(function (e) {
      var img = e.thumb ? '<img src="' + esc(sized(e.thumb, 300)) + '" alt="" loading="lazy">' : '<span class="ivh-row-noimg"></span>';
      return '<a class="ivh-row" role="option" href="' + esc(epHref(e)) + '">' + img +
        '<div class="ivh-row-text"><div class="ivh-row-title">' + esc(clean(e.title)) + '</div>' +
        '<div class="ivh-row-meta">' + esc([showOf(e), monthYear(e.date), why(e, q)].filter(Boolean).join(' · ')) + '</div></div></a>';
    }).join('');
    if (!found.length) html = '<div class="ivh-none">Nothing matched yet. Try a guest, a subject or a single word.</div>';
    html += '<a class="ivh-all" role="option" href="' + esc(allHref(q)) + '">' +
      (found.length ? 'See all ' + found.length + ' result' + (found.length === 1 ? '' : 's') + ' in the archive' : 'Search the full archive') + ARROW + '</a>';
    drop.innerHTML = html;
    rows = Array.prototype.slice.call(drop.querySelectorAll('a'));
    hl = -1;
    box.classList.add('ivh-open');
    input.setAttribute('aria-expanded', 'true');
  }
  input.addEventListener('focus', function () { loadExtra(); if (input.value.trim().length >= 2) runSearch(); });
  input.addEventListener('input', function () {
    loadExtra();
    clearTimeout(timer);
    timer = setTimeout(runSearch, 120);
  });
  input.addEventListener('keydown', function (ev) {
    var k = ev.key;
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      if (!rows.length) return;
      ev.preventDefault();
      if (!box.classList.contains('ivh-open')) { box.classList.add('ivh-open'); }
      var n = k === 'ArrowDown' ? (hl + 1) % rows.length : (hl <= 0 ? rows.length - 1 : hl - 1);
      setHl(n);
    } else if (k === 'Enter') {
      ev.preventDefault();
      var q = input.value.trim();
      if (hl >= 0 && rows[hl]) { location.href = rows[hl].getAttribute('href'); return; }
      location.href = q ? allHref(q) : '/episodes';
    } else if (k === 'Escape') {
      close();
    }
  });
  document.addEventListener('click', function (ev) { if (!box.contains(ev.target)) close(); });
  var findBtn = document.getElementById('ivh-find');
  findBtn.addEventListener('click', function (ev) {
    ev.preventDefault(); ev.stopPropagation();
    var q = input.value.trim() || phTerm;
    location.href = q ? allHref(q) : '/episodes';
  });
  input.setAttribute('placeholder', PH_REST);
  setTimeout(function () {
    nextTerm();
    if (!reduce) tryTimer = setInterval(nextTerm, 3500);
  }, 5000);
})();

