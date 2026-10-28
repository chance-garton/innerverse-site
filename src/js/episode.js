/* InnerVerse episode page script (assets/episode.js).
   Carried over from the Squarespace Code Injection block iv-episode-render
   (IV_BUILD 2026-10-04a-shownotes) on 2026-10-19 and changed in three ways:
   the page is built by the generator, so the fetch-and-draw path is gone and
   hydrate() at the end wires the finished markup; the members' page render
   (renderPlus) came back on 2026-10-28 for the /plus/<slug> pages, started by
   ivPlusPage() instead of the Squarespace paywall; and nothing here talks to
   Squarespace any more. */
/* ============================================================
   INNERVERSE EPISODE PAGE - STATIC JSON BUILD
   Build 2026-09-24d-headroom (the Lapis Library on episode pages: html.iv-2026 switch, accordions at every width,
   horizontal Plus and Get Tuned cards, members' chapters card, MEMORABLE quotes; stylesheet iv-episode-2026 in HEADER;
   /plus pages carry the free page's two column layout under a full width player, and the free page's
   Full episode chip opens the members' page; the date and runtime ride in the breadcrumb and the player
   is sized to clear the fold on desktop)
   ============================================================
   THIS IS THE ONLY PLACE THIS CODE LIVES.
   Settings > Advanced > Code Injection > FOOTER, inside the
   markers BEGIN iv-episode-render / END iv-episode-render.
   The matching stylesheet lives in the HEADER field. Nothing is
   installed on individual episode pages.

   HOW A PAGE GETS BUILT
   1. The script runs on every page of the site.
   2. It reads the last segment of the URL as the slug, ignoring the
      five character suffix Squarespace adds to duplicated posts.
   3. It fetches episodes/<slug>.json from the innerverse-data repo
      on GitHub's CDN, rebuilt daily from Airtable. See the
      iv-episode-data block below for why. There is no fallback:
      the page never calls Airtable.
   4. No file and no row, no render. The page is left as it was.
   5. With a row, it renders only if one of three things is true.

   THE THREE WAYS A PAGE OPTS IN
   a) "Use New Template" is ticked on the Airtable row. The post's
      existing blocks are HIDDEN, not deleted, and the new page is
      built in their place. Untick it and the old page returns
      exactly as it was. This is the normal way to migrate a page.
   b) The post body is empty, so there is nothing to replace.
   c) The post carries <div id="iv-episode-root"></div>, which the
      script renders into wherever it sits. If that block landed in a
      half width column the script lifts it out to full width first.

   MIGRATING AN EPISODE
   Tick one checkbox in Airtable. Nothing on the Squarespace post
   needs editing, and nothing is destroyed.

   HAND-BUILT PAGES ARE SAFE
   Untouched unless their own Airtable row opts in, so the Jason and
   the Argonauts reference page stays exactly as it is.

   MARKUP CONTRACT
   Every class, wrapper and nesting order matches the reference
   page. Never add Squarespace's "preFade" class to generated
   nodes: it sets opacity 0 and the reveal observer only ever binds
   blocks present at page load, so injected text stays invisible.
   ============================================================ */
(function () {
  'use strict';

  var IV_BUILD = '2026-10-04a-shownotes';
  window.IV_EPISODE_BUILD = IV_BUILD;
  if (window.__ivEpisodeStarted) return;
  window.__ivEpisodeStarted = true;

  /* ===== BEGIN iv-episode-data (2026-09-20, stage 2 2026-09-21) =====
     The page reads one static file per episode from GitHub's CDN,
     rebuilt daily from Airtable by scripts/build_episode_files.py in
     chance-garton/innerverse-data (build-index.yml, 09:00 UTC or by
     hand). There is NO Airtable fallback any more and no token in this
     script: an episode whose file does not exist yet renders nothing
     until the build runs, so run build-index.yml after publishing.

     The data call is made only on /episodes/<slug> and /plus/<slug>,
     so every other page on the site skips a pointless 404.

     The file is shaped exactly like the Airtable REST record it
     replaced, so every r['Field Name'] read below is untouched.
     ===== */
  var IV_DATA_BASE = 'https://raw.githubusercontent.com/chance-garton/innerverse-data/main/episodes/';


  var LIVE_ORIGIN = 'https://www.innerversepodcast.com';
  var CDN = 'https://images.squarespace-cdn.com/content/5987d897cf81e0278ec5322e/';
  /* The platform icons and logos are 40 to 172 px on the page but their source
     files run from 100 KB to 1.4 MB, so the suffix carries a width. format=
     must come FIRST or the CDN ignores it (see the iv-img HEADER block). */
  var PNG = '.png?format=300w&content-type=image%2Fpng';
  var PNG_BIG = '.png?format=1500w&content-type=image%2Fpng';

  var ICON = {
    plusLogo: CDN + 'c3607ade-e087-4b27-af0f-e0913f4dc3d0/plus+asset' + PNG,
    ivLogo:   CDN + '5d0e8860-e033-455f-a928-ac117245bcd8/InnerVerse+Podcast+Logo' + PNG,
    substack: CDN + '97ea4460-fa59-4cec-aeb7-738c2a811286/SUBSTACK' + PNG,
    patreon:  CDN + 'a71319bb-a7f7-4bc7-934e-227cfea475d7/PATREON' + PNG,
    apple:    CDN + '2d9b38a3-e7fd-48a4-93fc-72391a9e8b41/APPLE' + PNG,
    spotify:  CDN + 'e25969fb-b848-4f61-bdb8-f4fb1953c3f6/SPOTIFY' + PNG,
    rumble:   CDN + '084be10d-b58a-4cce-8e56-0ec65d279c5d/RUMBLE' + PNG,
    share:    CDN + '8b43cf98-5e5a-4d66-b17c-e53003e00ba3/SHARE' + PNG,
    imessage: CDN + 'bec737af-11ac-4d1d-b28c-5c5717a15a94/text' + PNG,
    instagram:CDN + '49f44b8f-7aa0-4f45-87dd-b590e1a74520/INSTA' + PNG,
    telegram: CDN + '3bfe10e1-b999-4d2b-9912-eaef614c6cd2/TELEGRAM' + PNG,
    copy:     CDN + '803e4681-439b-4acd-943a-b7a6d5149626/copy-link' + PNG,
    quoteFrame: CDN + 'd103f353-b80d-4fc1-aa9b-9f55ee195c83/Quote+Card+Frame' + PNG_BIG
  };

  var PLATFORMS = [
    ['Apple',    'https://itunes.apple.com/us/podcast/innerverse-podcast/id1066918535?mt=2', ICON.apple],
    ['Spotify',  'https://open.spotify.com/show/3PtsUrYFJiradha3biNf9Y',                    ICON.spotify],
    ['Rumble',   'https://rumble.com/c/InnerVerse',                                          ICON.rumble],
    ['Substack', 'https://innerversepodcast.substack.com/',                                  ICON.substack],
    ['Patreon',  'https://www.patreon.com/innerverse',                                       ICON.patreon]
  ];

  /* Where the membership pills point when the episode has no Plus
     extension of its own: the platform itself rather than a post that
     does not exist. */
  var PLATFORM_HOME = {
    plus:     LIVE_ORIGIN + '/plus',
    substack: 'https://innerversepodcast.substack.com',
    patreon:  'https://www.patreon.com/innerverse',
    youtube:  'https://www.youtube.com/c/@innerversepodcast/join'
  };

  var SVG = {
    lock:     '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>',
    lockGold: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#D8AA3C" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>',
    play:    '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>',
    listen:  '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 3a9 9 0 00-9 9v7a3 3 0 003 3h3v-8H5v-2a7 7 0 0114 0v2h-4v8h3a3 3 0 003-3v-7a9 9 0 00-9-9z"></path></svg>',
    bigPlay: '<svg viewBox="0 0 24 24" fill="#fff" width="26" height="26"><path d="M8 5v14l11-7z"></path></svg>',
    rowPlay: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>',
    chevron: '<svg class="iv-chevron" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>',
    quoteShare: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 .09 2.31L8.9 9.5a3 3 0 1 0 0 5l6.19 3.19A3 3 0 1 0 18 16a2.98 2.98 0 0 0-1.09.21L10.9 13.1a3.01 3.01 0 0 0 0-2.2l6.01-3.11A3 3 0 0 0 18 8z"></path></svg>'
  };

  var slug = window.location.pathname.split('/').filter(Boolean).pop();
  if (!slug) return;

  /* /plus/<slug> is the members' copy of an episode and gets its own,
     much smaller render. The branch is taken at the BOTTOM of this
     function, not here: an early return would skip every remaining var
     assignment in the file, and renderPlus reads several of them. */
  var IS_PLUS = ((window.ivPath ? window.ivPath() : window.location.pathname).split('/').filter(Boolean)[0] || '').toLowerCase() === 'plus';

  /* ---------------- the Lapis Library switch (2026-09-24) ----------------
     html.iv-2026 turns on the iv-episode-2026 stylesheet in HEADER and the
     v2 nav (iv-site-nav reads it) on every /episodes/<slug> and
     /plus/<slug> page. Set synchronously, before the nav script runs, so
     the nav is built once in the right shape. Remove this line to put
     every episode page back on the old stylesheet and nav. */
  (function () {
    var seg = window.location.pathname.split('/').filter(Boolean);
    if (seg.length === 2 && (seg[0].toLowerCase() === 'episodes' || seg[0].toLowerCase() === 'plus')) {
      document.documentElement.classList.add('iv-2026');
    }
  })();

  /* ---------------- mount point ----------------
     Resolved only after the episode file confirms a row, so a page with
     no episode data is never touched. */

  function contentHost() {
    return document.querySelector('.blog-item-content') ||
           document.querySelector('.blog-item-inner-wrapper') ||
           document.querySelector('article.entry');
  }

  function explicitRoot() { return document.getElementById('iv-episode-root'); }

  function bodyIsEmpty() {
    var host = contentHost();
    if (!host) return false;
    if ((host.innerText || '').trim().length) return false;
    if (host.querySelector('img, iframe, video')) return false;
    return true;
  }

  /* Takeover HIDES the post's existing blocks rather than deleting them, so
     unticking "Use New Template" in Airtable restores the old page exactly. */
  function resolveMount(takeover) {
    var explicit = explicitRoot();
    if (explicit) {
      /* If the block holding it is narrower than the post's content
         wrapper (a Code Block dropped into a half width column), lift
         it out so the layout always gets the full width. This is what
         squeezed the first build into a 583px column. */
      var full = contentHost();
      if (full && explicit.getBoundingClientRect().width < full.getBoundingClientRect().width - 8) {
        full.appendChild(explicit);
      }
      return explicit;
    }
    var host = contentHost();
    if (!host) return null;
    if (takeover) {
      host.querySelectorAll('.sqs-layout').forEach(function (el) { el.style.display = 'none'; });
    }
    var div = document.createElement('div');
    div.id = 'iv-episode-root';
    host.appendChild(div);
    return div;
  }


  // ---------------- helpers ----------------

  function esc(str) {
    return (str === undefined || str === null ? '' : str).toString().replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function parseJSONField(val) {
    if (!val) return [];
    try {
      var out = JSON.parse(val);
      return Array.isArray(out) ? out : [];
    } catch (e) {
      console.error('IV: bad JSON field', e);
      return [];
    }
  }

  /* ---------------- iv-episode-data: the static files ----------------
     The episode file this page loaded, kept so the guest and affiliate
     lookups further down read the records expanded inside it instead of
     asking for them separately. Null means no file answered, and the
     lookups then return nothing. */
  var IV_FILE = null;

  function ivDataGet(name) {
    return fetch(IV_DATA_BASE + encodeURIComponent(name) + '.json').then(function (r) {
      if (!r.ok) return null;
      return r.json();
    })['catch'](function () { return null; });
  }

  /* Resolves to the same { records: [ { id, fields } ] } shape the
     Airtable query used to, so every caller below is unchanged.

     Two spellings are tried, because Squarespace appends a five
     character collision suffix to a duplicated post. Plus Slug needs no
     second try: the build writes a file under BOTH a row's Slug and its
     Plus Slug, so either spelling is a direct hit.

     The second argument is an old Airtable query, kept only so the call
     sites stay unchanged; it is ignored. */
  function ivIsEpisodePath() {
    var p = (window.ivPath ? window.ivPath() : window.location.pathname).split('/').filter(Boolean);
    var top = (p[0] || '').toLowerCase();
    return p.length >= 2 && (top === 'episodes' || top === 'plus');
  }

  function ivEpisodeGet(name) {
    if (!ivIsEpisodePath()) return Promise.resolve({ records: [] });
    var base = name.replace(/-[a-z0-9]{5}$/i, '');
    return ivDataGet(name).then(function (d) {
      if (d || base === name) return d;
      return ivDataGet(base);
    }).then(function (d) {
      if (d && d.fields) {
        IV_FILE = d;
        return { records: [{ id: d.recordId || '', fields: d.fields }] };
      }
      console.info('IV: no static file for "' + name + '" (has build-index.yml run since it was published?)');
      return { records: [] };
    });
  }

  /* Guests and affiliates come out of the episode's own file. The two
     follow-up requests this replaces were the slowest part of the page,
     because the loading curtain was held until both had landed. */
  function ivLinkedGet(bucket, table, ids) {
    var by = IV_FILE && IV_FILE[bucket];
    if (!by) return Promise.resolve({ records: [] });
    return Promise.resolve({
      records: ids.filter(function (id) { return by[id]; })
        .map(function (id) { return { id: id, fields: by[id] }; })
    });
  }

  /* Airtable REST returns linked-record fields as plain arrays of id
     strings. Accept either shape so a schema change cannot break this. */
  function linkedIds(val) {
    if (!val) return [];
    return [].concat(val).map(function (v) {
      return (v && typeof v === 'object') ? v.id : v;
    }).filter(Boolean);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d)) return dateStr;
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function youtubeId(url) {
    if (!url) return '';
    var m = url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : '';
  }

  /* The Airtable field holding this episode's video was renamed from
     "YouTube URL" to "Video URL" when Vimeo was added as a fallback host.
     Reading the retired name is what silently emptied every player, so
     read the current name, keep accepting the old one, and detect the
     platform from the URL itself rather than from a second field. */
  function vimeoId(url) {
    if (!url) return '';
    var m = String(url).match(/vimeo\.com\/(?:video\/|channels\/[^\/]+\/|groups\/[^\/]+\/videos\/)?(\d{6,})/i);
    return m ? m[1] : '';
  }

  /* Odysee is the third fallback host, for videos YouTube has removed
     outright. The "id" is the claim path (@channel:1/name:c), because
     that is what the $/embed URL is built from, and $/embed accepts
     ?t=SECONDS, which is what chapter seeking needs. Checked BEFORE
     YouTube: an Odysee embed URL contains the literal "embed/", which
     youtubeId() would otherwise match. */
  function odyseePath(url) {
    if (!url) return '';
    var m = String(url).match(/odysee\.com\/(?:\$\/embed\/)?([^?#\s]+)/i);
    return m ? m[1].replace(/\/+$/, '') : '';
  }

  function videoEmbed(url) {
    var od = odyseePath(url);
    if (od) return { platform: 'odysee', id: od, src: 'https://odysee.com/$/embed/' + od + '?autoplay=1' };
    var yt = youtubeId(url);
    if (yt) return { platform: 'youtube', id: yt, src: 'https://www.youtube.com/embed/' + yt + '?autoplay=1&rel=0' };
    var vm = vimeoId(url);
    if (vm) return { platform: 'vimeo', id: vm, src: 'https://player.vimeo.com/video/' + vm + '?autoplay=1' };
    return { platform: '', id: '', src: '' };
  }

  function fmtTime(seconds) {
    seconds = Math.max(0, Math.floor(seconds || 0));
    if (!isFinite(seconds)) seconds = 0;
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = seconds % 60;
    var mm = h ? (m < 10 ? '0' + m : m) : m;
    var ss = s < 10 ? '0' + s : s;
    return h ? (h + ':' + mm + ':' + ss) : (mm + ':' + ss);
  }

  function pill(label, href, iconHtml) {
    return '<a class="iv-pill" href="' + esc(href) + '" target="_blank" rel="noopener">' +
      iconHtml + '<span>' + esc(label) + '</span></a>';
  }

  function imgIcon(src, alt) {
    return '<img src="' + esc(src) + '" alt="' + esc(alt) + '">';
  }

  /* Wrap *asterisked* spans in <em>, which the stylesheet renders italic
     and blue. This is how the reference headline accents one word; put
     asterisks around it in the Airtable Title and it matches. */
  function escEm(str) {
    return esc(str).replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  // ================================================================
  // SECTION BUILDERS
  // ================================================================

  function buildHeader(f, rootLabel) {
    /* Build 2026-09-24d-headroom (Chance: "lift the date and duration up to
       the top breadcrumbs"): one line, the path first and then the episode
       number, date and runtime. The year level is gone because the date
       carries it, and the meta line under the title is gone with it, so the
       header is a line shorter and the player clears the fold. The two
       groups are separate spans so a phone can drop the meta to its own
       line without a stranded separator. */
    var path = [esc(rootLabel || 'Podcast')];
    if (f.showCategory) path.push(esc(f.showCategory.toUpperCase()));
    /* Joined rather than concatenated with trailing separators: the rows
       added for /plus-only episodes carry no duration. */
    var bits = [];
    if (f.episodeNumber) bits.push('EPISODE ' + esc(f.episodeNumber));
    if (f.publishDate) bits.push(esc(formatDate(f.publishDate)));
    else if (f.year) bits.push(esc(f.year));
    if (f.duration) bits.push(esc(f.duration));
    return '' +
      '<div class="iv-header">' +
        '<div class="iv-header-breadcrumb">' +
          '<span class="iv-crumb-path">' + path.join(' / ') + '</span>' +
          (bits.length ? '<span class="iv-crumb-meta">' + bits.join(' &middot; ') + '</span>' : '') +
        '</div>' +
        (f.topicLine ? '<div class="iv-header-topic">' + esc(f.topicLine) + '</div>' : '') +
        '<h1 class="iv-header-title">' + escEm(f.title) + '</h1>' +
        '<div class="iv-header-rule"></div>' +
      '</div>';
  }

  /* ---------- the player clears the fold (build 2026-09-24d) ----------
     Chance: "The player needs to be fully visible before any scroll." On a
     desktop-sized window the player box is narrowed (never widened past
     its 1000px) until the bottom of the video sits above the fold and the
     fixed under-construction bar. Phones are left alone: there the video is
     already the full column and short. Measured at scroll 0 in page
     coordinates, so a resize after scrolling gives the same answer. The
     header above it never depends on the player's width, so this cannot
     loop. */
  var IV_FIT_MAX = 1000, IV_FIT_MIN = 480, IV_FIT_PAD = 14;
  function ivFitPlayer() {
    var box = document.querySelector('#iv-episode-root > .iv-media-toggle') ||
              document.querySelector('.blog-item-content .iv-media-toggle') ||
              document.querySelector('.blog-item-content .sqs-block-video .iv-ratio');
    if (!box) return;
    if (!document.documentElement.classList.contains('iv-2026') || window.innerWidth <= 700) {
      box.style.maxWidth = '';
      return;
    }
    var ratio = box.classList.contains('iv-ratio') ? box : box.querySelector('.iv-ratio');
    if (!ratio || !ratio.offsetHeight) return;          /* Listen tab showing: keep the last fit */
    var y = window.pageYOffset || 0;
    var boxTop = box.getBoundingClientRect().top + y;
    var above = ratio.getBoundingClientRect().top + y - boxTop;   /* the Watch/Listen row */
    var bar = document.querySelector('.iv-banner');
    var barH = 0;
    if (bar) {
      var cs = window.getComputedStyle(bar);
      if (cs.display !== 'none' && cs.position === 'fixed') barH = bar.offsetHeight;
    }
    var room = window.innerHeight - barH - IV_FIT_PAD - boxTop - above;
    var w = Math.floor(room * 16 / 9);
    w = Math.max(IV_FIT_MIN, Math.min(IV_FIT_MAX, w));
    box.style.maxWidth = w + 'px';
    if (box === ratio) { box.style.marginLeft = 'auto'; box.style.marginRight = 'auto'; }
  }
  var ivFitArmed = false;
  function ivFitPlayerArm() {
    ivFitPlayer();
    [150, 600, 1500, 3000].forEach(function (t) { setTimeout(ivFitPlayer, t); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ivFitPlayer);
    if (ivFitArmed) return;
    ivFitArmed = true;
    var tid = 0;
    window.addEventListener('resize', function () { clearTimeout(tid); tid = setTimeout(ivFitPlayer, 120); });
    window.addEventListener('load', ivFitPlayer);
  }

  function buildIntro(f) {
    return '<div class="iv-intro-text">' +
      (f.intro1 ? '<p>' + esc(f.intro1) + '</p>' : '') +
      (f.intro2 ? '<p>' + esc(f.intro2) + '</p>' : '') +
    '</div>';
  }

  /* ---------- episodes with no Plus extension ----------
     Whole shows are free: Vibe Rant, the Astro-Herbalism episodes inside
     it, Chance's guest spots and Marvelous Demystifiers were never split
     into a paid second half, so promising an "exclusive second half"
     there is a promise the page cannot keep.

     Precedence, most specific first:
       1. Any per-episode Plus, Substack or Patreon link proves an
          extension exists, whatever the show is. This is what lets a
          one-off paid Vibe Rant behave correctly with no field to tick.
       2. Otherwise the show itself decides.
     (A "Free Episode" checkbox read used to sit above rule 1; no such
     Airtable field exists, so it was removed in build 2026-09-21c.) */
  var FREE_SHOWS = ['vibe rant', 'astro-herbalism', 'chance guest spots', 'marvelous demystifiers'];

  function isFreeEpisode(rec, f) {
    if (f.directPlusUrl || f.substackUrl || f.patreonUrl) return false;
    for (var i = 0; i < f.showCategories.length; i++) {
      if (FREE_SHOWS.indexOf(String(f.showCategories[i]).toLowerCase()) > -1) return true;
    }
    return false;
  }

  /* ---------- the Plus card knows who is looking (build 2026-09-21c) ----------
     Four states. The column is whether this episode has a members' cut
     (Direct Plus URL set and not a perma-free show); the row is whether
     the visitor is an entitled member.
       signed out, has a cut:   sell the second half of THIS episode
       signed out, free show:   sell the catalogue ("Browse Plus+" pill)
       member, has a cut:       Watch the full episode on Plus+ / feed
       member, free show:       Go to Plus+ / newest Plus+ episode
     Member state is read from the html.iv-plus-member class, never from
     a new status call. The HEADER precheck sets it at first paint from
     the cached answer, so a returning member never sees the sales card
     flash; the nav's live /auth/status check then adds or removes it,
     and the observer in wirePlusCardMemberState redraws the card when
     that answer differs (a lapsed member falls back to the sales card).
     The Book a Session card beside it is the same in all four states. */
  function ivIsPlusMember() {
    return document.documentElement.classList.contains('iv-plus-member');
  }

  function buildPlusBookRow(f) {
    return '' +
      '<div class="iv-plus-book-row" id="iv-plus-card">' +
        buildPlusCard(f, ivIsPlusMember()) +
        buildBookSession() +
      '</div>';
  }

  function buildPlusCard(f, member) {
    return member ? buildPlusMemberCard(f) : buildPlusSalesCard(f);
  }

  function buildPlusMemberCard(f) {
    var hasCut = !f.free && !!f.directPlusUrl;
    var copy = hasCut
      ? 'The full, extended cut of this episode is waiting for you.'
      : 'This one\'s free for everyone. Your members\' library is waiting.';
    var primary = hasCut
      ? '<a class="iv-lock-btn iv-lock-btn-primary" href="' + esc(f.directPlusUrl) + '">Watch the full episode on Plus+</a>'
      : '<a class="iv-lock-btn iv-lock-btn-primary" href="' + esc(PLATFORM_HOME.plus) + '">Go to Plus+</a>';
    var secondary = hasCut
      ? '<a class="iv-lock-btn iv-plus-member-secondary" href="' + esc(PLATFORM_HOME.plus) + '">Your private podcast feed<span>&rarr;</span></a>'
      : '<a class="iv-lock-btn iv-plus-member-secondary" data-iv-newest-plus="1" href="' + esc(ivNewestPlusHref || PLATFORM_HOME.plus) + '">Newest Plus+ episode<span>&rarr;</span></a>';
    /* 2026-09-24: same horizontal card as the sales card, member copy. */
    var extra = iv2ExtraMinutes(f);
    var heading = hasCut ? ('Your full ' + (f.plusDuration ? esc(f.plusDuration) + ' ' : '') + 'episode is ready') : 'Your members\u2019 library is waiting';
    var copy2 = hasCut
      ? ('Welcome back. ' + (extra ? 'The extended episode continues for ' + extra + ' more minutes past the free version, ' : 'The extended episode is waiting for you, ') + 'in video and in your private feed.')
      : 'This one is free for everyone. Every extended episode, the complete Plus+ archive and your private feed are on Plus+.';
    if (hasCut && f.notesTease) copy2 += ' The full research notes are waiting on the members\u2019 page too.';   /* iv-show-notes */
    var primary2 = hasCut
      ? '<a class="iv-lock-btn iv-lock-btn-primary iv2-btn iv2-btn-gold" href="' + esc(f.directPlusUrl) + '">Watch the full episode</a>'
      : '<a class="iv-lock-btn iv-lock-btn-primary iv2-btn iv2-btn-gold" href="' + esc(PLATFORM_HOME.plus) + '">Go to Plus+</a>';
    var secondary2 = hasCut
      ? '<a class="iv-lock-btn iv-plus-member-secondary iv2-btn iv2-btn-secondary" href="' + esc(PLATFORM_HOME.plus) + '">Your private feed</a>'
      : '<a class="iv-lock-btn iv-plus-member-secondary iv2-btn iv2-btn-secondary" data-iv-newest-plus="1" href="' + esc(ivNewestPlusHref || PLATFORM_HOME.plus) + '">Newest Plus+ episode</a>';
    return '' +
      '<div class="iv-plus-cta iv-plus-member-card iv2-hcard" data-iv-plus-state="' + (hasCut ? 'member-cut' : 'member-free') + '">' +
        '<div class="iv2-mediacol">' +
          '<a class="iv2-media iv2-media-gold" href="' + esc(hasCut ? f.directPlusUrl : PLATFORM_HOME.plus) + '" aria-label="InnerVerse Plus+">' +
            '<img src="' + esc(ivImg(f.thumbnail, 750)) + '" alt="" loading="lazy">' +
            '<span class="iv2-badge">' + SVG.lock + 'Plus+</span>' +
          '</a>' +
          (f.plusDuration && hasCut ? '<span class="iv2-eyebrow iv2-gold">Full episode &middot; ' + esc(f.plusDuration) + '</span>' : '<span class="iv2-eyebrow iv2-gold">InnerVerse Plus+</span>') +
        '</div>' +
        '<div class="iv2-copy">' +
          '<div class="iv2-brand"><img src="' + esc(ICON.plusLogo) + '" alt=""><span class="iv2-eyebrow iv2-gold" style="margin:0">You&rsquo;re a Plus+ member</span></div>' +
          '<h3 class="iv2-h3">' + heading + '</h3>' +
          '<p class="iv2-p">' + esc(copy2) + '</p>' +
          '<div class="iv2-actions iv-lock-buttons iv-plus-member-buttons">' + primary2 + secondary2 + '</div>' +
        '</div>' +
      '</div>';
  }

  /* The newest Plus+ episode for the member free-show card, from the
     manifest the daily build already writes. Fetched once, only when that
     card is actually on screen; until it lands the link goes to /plus. */
  var ivNewestPlusHref = '';
  var ivNewestPlusReq = null;
  function ivFillNewestPlus(root) {
    if (!root.querySelector('a[data-iv-newest-plus]')) return;
    if (!ivNewestPlusReq) {
      ivNewestPlusReq = fetch(IV_DATA_BASE + '_manifest.json')
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (m) {
          var s = m && m.newestPlus && m.newestPlus.slug;
          if (s) ivNewestPlusHref = LIVE_ORIGIN + '/plus/' + encodeURIComponent(s);
          return ivNewestPlusHref;
        })['catch'](function () { return ''; });
    }
    ivNewestPlusReq.then(function (href) {
      if (!href) return;
      root.querySelectorAll('a[data-iv-newest-plus]').forEach(function (a) { a.setAttribute('href', href); });
    });
  }

  function wirePlusCardMemberState(root, f) {
    ivFillNewestPlus(root);
    if (root.__ivPlusCardObs) { root.__ivPlusCardObs.disconnect(); root.__ivPlusCardObs = null; }
    if (!window.MutationObserver) return;
    var last = ivIsPlusMember();
    var obs = new MutationObserver(function () {
      var now = ivIsPlusMember();
      if (now === last) return;
      last = now;
      var old = root.querySelector('.iv-plus-book-row > .iv-plus-cta');
      if (!old || !old.parentNode) return;
      var tmp = document.createElement('div');
      tmp.innerHTML = buildPlusCard(f, now);
      old.parentNode.replaceChild(tmp.firstChild, old);
      ivFillNewestPlus(root);
      var locked = root.querySelector('.iv2-locked');
      if (locked) { var lt = document.createElement('div'); lt.innerHTML = buildLockedChapters(f, now); if (lt.firstChild) locked.parentNode.replaceChild(lt.firstChild, locked); }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    root.__ivPlusCardObs = obs;
  }

  function buildPlusSalesCard(f) {
    /* Sell the catalogue, not "the second half of this episode", whenever
       there is no second half: a perma-free show, or any row with no Plus,
       Substack or Patreon extension at all (e.g. a row whose show tag is
       wrong). Signed-out copy for real members' cuts is unchanged. */
    var generic = f.free || !(f.directPlusUrl || f.substackUrl || f.patreonUrl);
    var plusUrl = generic ? PLATFORM_HOME.plus : (f.directPlusUrl || PLATFORM_HOME.plus);
    var substackHref = generic ? PLATFORM_HOME.substack : f.substackUrl;
    var patreonHref  = generic ? PLATFORM_HOME.patreon  : f.patreonUrl;
    /* The members' cut is frequently a SEPARATE upload from the free
       episode, so this pill prefers "YouTube Plus URL" and falls back to
       Video URL when that is blank - which is every row without a separate
       cut, so their behaviour is byte-for-byte unchanged. The main player
       higher up the page always uses Video URL and is never affected.
       Free episodes point at the channel join page either way. */
    var plusVideo = f.videoPlusUrl || f.videoUrl;
    var videoHref = generic ? PLATFORM_HOME.youtube : plusVideo;
    var videoPlatform = generic ? 'youtube' : videoEmbed(plusVideo).platform;
    var alts = '';
    alts += pill(generic ? 'Browse Plus+' : 'Direct', plusUrl, '<span class="iv-pill-circle-icon">' + imgIcon(ICON.ivLogo, 'InnerVerse') + '</span>');
    if (substackHref) alts += pill('Substack', substackHref, imgIcon(ICON.substack, 'Substack'));
    if (patreonHref) alts += pill('Patreon', patreonHref, imgIcon(ICON.patreon, 'Patreon'));
    if (videoHref) alts += pill(videoPlatform === 'vimeo' ? 'Vimeo' : (videoPlatform === 'odysee' ? 'Odysee' : 'YouTube'), videoHref,
      '<span class="iv-pill-circle-icon iv-pill-yt-icon"><svg viewBox="0 0 24 24" width="100%" height="100%"><rect width="24" height="24" rx="5" fill="' + (videoPlatform === 'vimeo' ? '#1AB7EA' : (videoPlatform === 'odysee' ? '#EF1970' : '#FF0000')) + '"></rect><path d="M10 8l6 4-6 4V8z" fill="#fff"></path></svg></span>');

    /* Free episodes sell the membership itself rather than the rest of
       this episode, because there is no rest of this episode. */
    var blurb = generic
      ? 'Unlock Extended episodes across the catalog, plus premium video and the Inner Circle, our members\' chat.'
      : 'Unlock the exclusive second half of this episode, plus the full archive, premium video, and the Inner Circle, our members\' chat.';

    /* 2026-09-24 (Lapis Library): a horizontal card, the episode art on the
       left in a gold-lit frame, the copy on the right. "Direct" is no longer
       a pill: the gold button IS the direct route. Substack, Patreon and the
       video platform stay as icon links. The extra-minutes line is only
       written when both runtimes are known. */
    var extra = iv2ExtraMinutes(f);
    var heading = generic ? 'Hear every full episode' : ('Hear the full ' + (f.plusDuration ? esc(f.plusDuration) + ' ' : '') + 'episode');
    var blurb2 = generic
      ? 'Every extended episode, the complete Plus+ archive, premium video and a private podcast feed for your app.'
      : ((extra ? extra + ' more minutes of this conversation, plus ' : 'The extended version of this episode, plus ') + 'the complete Plus+ archive, premium video and a private podcast feed for your app.');
    if (!generic && f.notesTease) blurb2 += ' ' + IV_NOTES_TEASE;   /* iv-show-notes */
    var joins = '';
    if (substackHref) joins += '<a href="' + esc(substackHref) + '" target="_blank" rel="noopener">' + imgIcon(ICON.substack, 'Substack') + 'Substack</a>';
    if (patreonHref) joins += '<a href="' + esc(patreonHref) + '" target="_blank" rel="noopener">' + imgIcon(ICON.patreon, 'Patreon') + 'Patreon</a>';
    if (videoHref) joins += '<a href="' + esc(videoHref) + '" target="_blank" rel="noopener">' +
      '<span class="iv-pill-circle-icon iv-pill-yt-icon"><svg viewBox="0 0 24 24" width="100%" height="100%"><rect width="24" height="24" rx="5" fill="' + (videoPlatform === 'vimeo' ? '#1AB7EA' : (videoPlatform === 'odysee' ? '#EF1970' : '#FF0000')) + '"></rect><path d="M10 8l6 4-6 4V8z" fill="#fff"></path></svg></span>' +
      (videoPlatform === 'vimeo' ? 'Vimeo' : (videoPlatform === 'odysee' ? 'Odysee' : 'YouTube')) + '</a>';
    return '' +
        '<div class="iv-plus-cta iv2-hcard" data-iv-plus-state="' + (generic ? 'sell-free' : 'sell-cut') + '">' +
          '<div class="iv2-mediacol">' +
            '<a class="iv2-media iv2-media-gold" href="' + esc(plusUrl) + '" aria-label="InnerVerse Plus+">' +
              '<img src="' + esc(ivImg(f.thumbnail, 750)) + '" alt="" loading="lazy">' +
              '<span class="iv2-badge">' + SVG.lock + 'Plus+</span>' +
            '</a>' +
            (f.plusDuration && !generic ? '<span class="iv2-eyebrow iv2-gold">Full episode &middot; ' + esc(f.plusDuration) + '</span>' : '<span class="iv2-eyebrow iv2-gold">InnerVerse Plus+</span>') +
          '</div>' +
          '<div class="iv2-copy">' +
            '<div class="iv2-brand"><img src="' + esc(ICON.plusLogo) + '" alt=""><span class="iv2-eyebrow iv2-gold" style="margin:0">InnerVerse Plus+</span></div>' +
            '<h3 class="iv2-h3">' + heading + '</h3>' +
            '<p class="iv2-p">' + esc(blurb2) + '</p>' +
            '<div class="iv2-actions">' +
              '<a class="iv-plus-btn iv2-btn iv2-btn-gold" href="' + esc(plusUrl) + '">Start your 7-day free trial</a>' +
              '<span class="iv2-fine">Then $9 a month.<br>Cancel any time.</span>' +
            '</div>' +
            (joins ? '<div class="iv2-join"><span>Or join through</span>' + joins + '</div>' : '') +
          '</div>' +
        '</div>';
  }

  /* Whole minutes the members' version runs past the free one, from the two
     Airtable duration strings ("1h 16m", "2h 9m", "48m"). Empty when either
     is missing or the answer is not positive. */
  function iv2Minutes(s) {
    var m = String(s || '').match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/);
    if (!m) return 0;
    return (parseInt(m[1] || 0, 10) * 60) + parseInt(m[2] || 0, 10);
  }
  function iv2ExtraMinutes(f) {
    var a = iv2Minutes(f.plusDuration), b = iv2Minutes(f.duration);
    return (a && b && a > b) ? String(a - b) : '';
  }

  /* ===== BEGIN iv-show-notes (build 2026-10-04a) =====
     Members' show notes (Chance, 2026-10-04). The file lives only in the
     Worker's private bucket; the episode data carries just the
     "Has Show Notes" tick. On /plus a member gets a download card under
     the description: the button asks the Worker for a ten minute link with
     the member's own session token (the same way the Listen tab gets its
     audio) and then opens it. On a free Inner Whirled page whose row has
     notes, the Plus card mentions them (Chance: a teaser only on the Inner
     Whirled episodes that have them). Rollback: delete the three
     ivShowNotes calls and the two teaser lines; this block then sits idle.
     Process doc: claude/plus-show-notes.md in the Website Recode project. */
  var IV_NOTES_WORKER = 'https://innerverse-plus.chance-5da.workers.dev';
  var IV_NOTES_TEASE = 'Members also get the full research notes for this episode.';
  function ivNotesTease(r) {
    if (!r || r['Has Show Notes'] !== true) return false;
    return (r['Show Categories'] || []).some(function (c) { return ((c && c.name) || c) === 'Inner Whirled'; });
  }
  function ivNotesStyle() {
    if (document.getElementById('iv-notes-style')) return;
    var st = document.createElement('style');
    st.id = 'iv-notes-style';
    st.textContent =
      'html.iv-2026 .iv-notes-card{display:flex;align-items:center;gap:20px;padding:22px 24px;margin:40px 0 0!important;border-left:3px solid var(--gold);}' +
      'html.iv-2026 .iv-notes-ico{flex:0 0 auto;width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:var(--gold-text);background:rgba(216,170,60,.12);}' +
      'html.iv-2026 .iv-notes-copy{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:6px;}' +
      'html.iv-2026 .iv-notes-copy .iv2-eyebrow{margin:0;color:var(--gold-text)!important;}' +
      'html.iv-2026 .iv-notes-card .iv2-btn{flex:0 0 auto;cursor:pointer;}' +
      'html.iv-2026 .iv-notes-card .iv2-btn[disabled]{opacity:.7;cursor:progress;}' +
      'html.iv-2026 .iv-notes-msg{font-family:Manrope,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.4;color:#B7C1D1;margin:2px 0 0;}' +
      '@media (max-width:700px){html.iv-2026 .iv-notes-card{flex-direction:column;align-items:stretch;padding:20px;margin:28px 0 0!important;}' +
      'html.iv-2026 .iv-notes-ico{display:none;}html.iv-2026 .iv-notes-card .iv2-btn{width:100%;}}';
    document.head.appendChild(st);
  }
  function ivShowNotesCard() {
    var ico = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5"></path><path d="M9 13h6M9 17h6"></path></svg>';
    return '' +
      '<div class="iv2-card iv-notes-card" id="iv-notes-card">' +
        '<div class="iv-notes-ico">' + ico + '</div>' +
        '<div class="iv-notes-copy">' +
          '<span class="iv2-eyebrow iv2-gold">For members</span>' +
          '<h3 class="iv2-h3">Show notes</h3>' +
          '<p class="iv2-p">The full research document behind this episode, as a Word file.</p>' +
          '<p class="iv-notes-msg" hidden></p>' +
        '</div>' +
        '<button type="button" class="iv2-btn iv2-btn-gold iv-notes-btn">Download the show notes</button>' +
      '</div>';
  }
  function ivWireShowNotes(card, slug) {
    var btn = card.querySelector('.iv-notes-btn');
    var msg = card.querySelector('.iv-notes-msg');
    if (!btn) return;
    function say(t) { if (msg) { msg.textContent = t; msg.hidden = !t; } }
    btn.addEventListener('click', function () {
      var m = window.ivMembership;
      var token = m && m.getToken ? m.getToken() : null;
      if (!token) { window.location.href = m && m.loginUrl ? m.loginUrl() : '/plus'; return; }
      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = 'Preparing your download';
      say('');
      fetch(IV_NOTES_WORKER + '/notes-link/' + encodeURIComponent(slug), { headers: { Authorization: 'Bearer ' + token } })
        .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, status: res.status, j: j }; }); })
        .then(function (x) {
          btn.disabled = false;
          btn.textContent = label;
          if (x.ok && x.j && x.j.url) { window.location.href = x.j.url; return; }
          if (x.status === 403) { say('Your sign-in has expired. Log in again and the download will work.'); return; }
          say('The notes are not available right now. Please try again in a minute.');
        })['catch'](function () {
          btn.disabled = false;
          btn.textContent = label;
          say('The download could not start. Please try again in a minute.');
        });
    });
  }
  /* /plus: the card goes straight under the description, above Get Tuned.
     A page still served by Squarespace's own unlock (an admin) also carries
     the old hand-placed button block; it is stood down so there is one. */
  function ivShowNotes(host, before, slug) {
    ivNotesStyle();
    host.querySelectorAll('.sqs-block-button a[href*="/s/"]').forEach(function (a) {
      if (!/\.docx?(\?|$)/i.test(a.getAttribute('href') || '')) return;
      var b = a.closest('.sqs-block-button');
      if (b) b.style.display = 'none';
    });
    var holder = document.createElement('div');
    holder.innerHTML = ivShowNotesCard();
    var card = holder.firstChild;
    if (before && before.parentElement) before.parentElement.insertBefore(card, before);
    else host.appendChild(card);
    ivWireShowNotes(card, slug);
  }
  /* ===== END iv-show-notes ===== */

  /* The members' chapters under the free chapters (2026-09-24). Reads the
     Plus Chapters JSON the /plus page already renders and lists the titles
     with a lock, then the trial button (or, for a member, the link to the
     members' page). Nothing when the row has no members' chapters or no
     members' page. */
  function buildLockedChapters(f, member) {
    if (!f.plusChapters || !f.plusChapters.length || f.free || !f.directPlusUrl) return '';
    var extra = iv2ExtraMinutes(f);
    var rows = f.plusChapters.map(function (ch) {
      return '<div class="iv2-lockrow"><span class="t">' + esc(ch.time) + '</span><span class="n">' + esc(ch.title) + '</span>' + SVG.lockGold + '</div>';
    }).join('');
    var actions = member
      ? '<a class="iv2-btn iv2-btn-gold" href="' + esc(f.directPlusUrl) + '">Watch the full episode</a>'
      : '<a class="iv2-btn iv2-btn-gold" href="' + esc(f.directPlusUrl) + '">Start your 7-day free trial</a>' +
        '<a class="iv2-btn iv2-btn-secondary" href="' + esc(PLATFORM_HOME.plus) + '">Already a member? Log in</a>';
    return '' +
      '<div class="iv2-card iv2-locked" data-iv-locked="' + (member ? 'member' : 'visitor') + '">' +
        '<div class="iv2-locked-head">' +
          '<span><span class="iv2-eyebrow iv2-gold">Continues in the full episode</span><span class="iv2-locked-title">' + (extra ? 'Members hear ' + extra + ' more minutes' : 'The members\u2019 version continues') + '</span></span>' +
          '<span class="iv2-count">' + f.plusChapters.length + ' more chapters</span>' +
        '</div>' +
        rows +
        '<div class="iv2-locked-actions">' + actions + '</div>' +
      '</div>';
  }

  /* Split out of buildPlusBookRow so /plus can carry the booking card on
     its own: the membership half of that row is redundant to someone who
     is already reading a members-only page. */
  /* 2026-09-24: the Get Tuned card, two tabs (Biofield Tuning first,
     Consultations second) beside the tuning-fork portrait from the homepage
     host section, using the homepage's own Get Tuned copy. */
  var IV2_FORKS = 'https://images.squarespace-cdn.com/content/v1/5987d897cf81e0278ec5322e/7a926674-e13c-4827-ac2a-8d4cf8964ab0/CHANCE+GARTON+ABOUT+PAGE+INNERVERSE.png';
  function buildBookSession() {
    return '' +
      '<div class="iv-booksession iv2-card iv2-hcard" id="iv2-tuned">' +
        '<div class="iv2-media iv2-media-forks"><img src="' + esc(ivImg(IV2_FORKS, 750)) + '" alt="Chance Garton holding a tuning fork" loading="lazy"></div>' +
        '<div class="iv2-copy">' +
          '<div class="iv2-tabs" role="tablist">' +
            '<button type="button" class="iv2-tab iv2-on" role="tab" data-i="0" aria-selected="true">Biofield Tuning</button>' +
            '<button type="button" class="iv2-tab" role="tab" data-i="1" aria-selected="false">Consultations</button>' +
          '</div>' +
          '<div class="iv2-pane iv2-on" data-i="0">' +
            '<div class="iv2-eyebrow" style="margin:4px 0 0">Transformative energy work</div>' +
            '<h3 class="iv2-h3">Get tuned with Chance</h3>' +
            '<p class="iv2-p">Tuning forks find where energy is stuck in the field around your body and bring it back into flow. Sessions over Zoom, recorded for you to keep.</p>' +
            '<div class="iv2-actions" style="gap:10px">' +
              '<a class="iv2-btn iv2-btn-primary iv-booksession-link-primary" href="/biofield-tuning">See availability</a>' +
              '<a class="iv2-btn iv2-btn-secondary iv-booksession-link" href="/biofield-tuning">Learn more</a>' +
            '</div>' +
          '</div>' +
          '<div class="iv2-pane" data-i="1">' +
            '<div class="iv2-eyebrow" style="margin:4px 0 0">Natal charts, tarot &amp; I Ching</div>' +
            '<h3 class="iv2-h3">30 Minute Consultations</h3>' +
            '<p class="iv2-p">Have something to look at, or looking for guidance? We can consult oracular tools, read your chart, or just talk through whatever you choose.</p>' +
            '<div class="iv2-actions" style="gap:10px">' +
              '<a class="iv2-btn iv2-btn-primary" href="/biofield-tuning">Book a consultation</a>' +
              '<a class="iv2-btn iv2-btn-secondary" href="/biofield-tuning">Learn more</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function wireTunedTabs(container) {
    var card = container.querySelector('#iv2-tuned');
    if (!card || card.__ivWired) return;
    card.__ivWired = true;
    card.addEventListener('click', function (e) {
      var tab = e.target && e.target.closest ? e.target.closest('.iv2-tab') : null;
      if (!tab) return;
      var i = tab.getAttribute('data-i');
      card.querySelectorAll('.iv2-tab').forEach(function (t) { var on = t.getAttribute('data-i') === i; t.classList.toggle('iv2-on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); });
      card.querySelectorAll('.iv2-pane').forEach(function (p) { p.classList.toggle('iv2-on', p.getAttribute('data-i') === i); });
    });
  }

  function sectionHead(labelCls, titleCls, label, title, aria, count) {
    return '' +
      '<div class="iv-section-head">' +
        '<div>' +
          '<div class="' + labelCls + '">' + esc(label) + '</div>' +
          '<h2 class="' + titleCls + '">' + esc(title) + '</h2>' +
        '</div>' +
        '<div class="iv2-headright">' +
          (count ? '<span class="iv2-count">' + esc(count) + '</span>' : '') +
          '<button type="button" class="iv-section-toggle" aria-label="' + esc(aria) + '">' + SVG.chevron + '</button>' +
        '</div>' +
      '</div>';
  }

  function buildChapters(chapters, extraHtml) {
    if (!chapters.length) return '';
    var rows = chapters.map(function (ch) {
      return '' +
        '<a href="#" class="iv-chapter-row" data-seek="' + esc(ch.seek) + '">' +
          '<span class="iv-chapter-time">' + esc(ch.time) + '</span>' +
          '<span class="iv-chapter-title">' + esc(ch.title) + '</span>' +
          '<span class="iv-chapter-btn">' + SVG.rowPlay + '</span>' +
        '</a>';
    }).join('');
    return '' +
      '<div class="iv-chapters iv-accordion" id="iv-chapters-acc">' +
        sectionHead('iv-chapters-label', 'iv-chapters-heading', 'Chapters', 'In this episode', 'Toggle chapters', chapters.length + ' chapters') +
        '<div class="iv-chapters-rule"></div>' +
        '<div class="iv-section-body"><div class="iv-chapters-list" id="iv-chapters-list">' + rows + '</div>' + (extraHtml || '') + '</div>' +
      '</div>';
  }

  function buildThemes(themes) {
    if (!themes.length) return '';
    var items = themes.map(function (t, i) {
      /* No leading zero, matching the /plus numbering. .iv-theme-num is a
         fixed 44px column with flex-shrink 0, so a one character number
         still leaves the body copy aligned with every other row. */
      var num = String(i + 1);
      return '' +
        '<div class="iv-theme-item">' +
          '<div class="iv-theme-num">' + num + '</div>' +
          '<div class="iv-theme-body">' +
            '<h3 class="iv-theme-title">' + esc(t.title) + '</h3>' +
            '<p class="iv-theme-text">' + esc(t.body) + '</p>' +
          '</div>' +
        '</div>';
    }).join('');
    return '' +
      '<div class="iv-themes-section iv-accordion" id="iv-themes-acc">' +
        sectionHead('iv-section-label', 'iv-section-title', 'Show notes', 'Core themes', 'Toggle core themes', themes.length + ' themes') +
        '<div class="iv-section-rule"></div>' +
        '<div class="iv-section-body"><div class="iv-themes-list">' + items + '</div></div>' +
      '</div>';
  }

  function buildQuotes(quotes, epTitle) {
    if (!quotes.length) return '';
    var cards = quotes.map(function (q) {
      return '' +
        '<div class="iv-quote-card">' +
          '<blockquote class="iv-quote-text">&ldquo;' + esc(q.text) + '&rdquo;</blockquote>' +
          '<div class="iv-quote-footer">' +
            '<span class="iv-quote-who">' +
              '<span class="iv-quote-avatar"></span>' +
              '<span class="iv-quote-author">' + esc(q.author) + '</span>' +
            '</span>' +
            '<button type="button" class="iv-quote-share-btn"' +
              ' data-quote="' + esc(q.text) + '"' +
              ' data-author="' + esc(q.author) + '"' +
              ' data-portrait="' + esc(q.portrait) + '"' +
              ' data-episode="' + esc(epTitle) + '"' +
              ' aria-label="Share this quote">' + SVG.quoteShare + '</button>' +
          '</div>' +
        '</div>';
    }).join('');
    return '' +
      '<div class="iv-quotes-outer iv-accordion" id="iv-quotes-acc">' +
        sectionHead('iv-section-label', 'iv-section-title', 'Memorable', 'Quotes', 'Toggle quotes', quotes.length + ' quotes') +
        '<div class="iv-section-rule"></div>' +
        '<div class="iv-section-body"><div class="iv-quotes-wrap">' + cards + '</div></div>' +
      '</div>';
  }

  /* The reference page never prints a raw URL. It shows the shortest thing a
     reader recognises: "innerversepodcast.com", "@symbolicstudies", "Amazon".
     Strip protocol, www, query and trailing slash, then shorten by host. */
  function linkText(url) {
    var s = String(url || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '')
      .replace(/[?#].*$/, '').replace(/\/+$/, '');
    if (!s) return '';
    var slash = s.indexOf('/');
    var host = slash > -1 ? s.slice(0, slash) : s;
    var path = slash > -1 ? s.slice(slash + 1) : '';
    if (/(^|\.)amazon\./i.test(host)) return 'Amazon';
    if (/(^|\.)audible\./i.test(host)) return 'Audible';
    if (/(^|\.)youtube\.com$/i.test(host) || /(^|\.)youtu\.be$/i.test(host)) {
      if (path.charAt(0) === '@') return path.split('/')[0];
      return path ? 'YouTube' : host;
    }
    if (/(^|\.)instagram\.com$/i.test(host)) return path ? '@' + path.split('/')[0] : host;
    if (/(^|\.)(twitter|x)\.com$/i.test(host)) return path ? '@' + path.split('/')[0] : host;
    if (!path) return host;
    if (path.length <= 18) return host + '/' + path;
    return host;
  }

  function guestPanelInner(g) {
    var links = [];
    if (g.website) links.push(['Website', g.website]);
    if (g.youtube) links.push(['YouTube', g.youtube]);
    if (g.substack) links.push(['Substack', g.substack]);
    if (g.books) links.push(['Books', g.books]);
    if (g.socials) links.push(['Socials', g.socials]);
    var first = (g.name || '').split(' ')[0];
    return '' +
      (g.role ? '<div class="iv-guest-subtitle">' + esc(g.role) + '</div>' : '') +
      '<p class="iv-guest-bio">' + esc(g.bio) + '</p>' +
      '<div class="iv-guest-divider"></div>' +
      '<a class="iv-guest-allbtn iv-guest-alllink" data-guest-id="' + esc(g.id) + '" data-guest-first="' + esc(first) + '" data-guest-name="' + esc(g.name) + '" style="display:none"></a>' +
      '<div class="iv-guest-links">' + links.map(function (l) {
        return '<div><span class="iv-guest-link-label">' + esc(l[0]) + '</span> <a href="' + esc(l[1]) + '" target="_blank" rel="noopener">' + esc(linkText(l[1])) + '</a></div>';
      }).join('') + '</div>';
  }

  /* The photo + name rows are rendered for a single guest too, otherwise
     the card is a bordered box with no identity in it. */
  function buildGuestCard(guests) {
    if (!guests.length) return '';
    var tabRow = guests.map(function (g, i) {
      return '<button type="button" class="iv-guest-tab-unit' + (i === 0 ? ' iv-guest-tab-active' : '') + '" data-i="' + i + '" aria-label="' + esc(g.name) + '">' +
        '<img class="iv-guest-tab-photo" src="' + esc(ivImg(g.portrait, 300)) + '" alt="' + esc(g.name) + '">' +
      '</button>';
    }).join('');
    var nameRow = guests.map(function (g, i) {
      return '<span class="iv-guest-name-unit">' +
        (i > 0 ? '<span class="iv-guest-name-sep">|</span>' : '') +
        '<button type="button" class="iv-guest-tab-name' + (i === 0 ? ' iv-guest-tab-active' : '') + '" data-i="' + i + '">' + esc(g.name) + '</button>' +
      '</span>';
    }).join('');
    /* The stylesheet has no rule for .iv-guest-panel, so the reference page
       hides inactive panels with an inline display:none. Match that or every
       guest's bio stacks up at once. */
    var panels = guests.map(function (g, i) {
      return '<div class="iv-guest-panel' + (i === 0 ? ' iv-guest-panel-active' : '') + '" data-i="' + i + '"' +
        (i === 0 ? '' : ' style="display:none"') + '>' + guestPanelInner(g) + '</div>';
    }).join('');
    return '<div class="iv-guest-card" id="iv-guest-card-1">' +
      '<div class="iv-guest-tab-row">' + tabRow + '</div>' +
      '<div class="iv-guest-name-row">' + nameRow + '</div>' +
      panels +
    '</div>';
  }

  /* Contract taken from the hand-built reference page, which was read
     element by element rather than guessed at:
       div.iv-aff-name.iv-aff-name-solo   <- solo class ALWAYS, it carries the
                                             12px gap under the name, tabbed
                                             or not
       p.iv-aff-body                      <- supports *emphasis*
       div.iv-aff-offer
       div.iv-aff-links                   <- omitted entirely when empty
       p.iv-aff-note                      <- a p, not a div
       div.iv-aff-books > a.iv-aff-book > img + span
     The books row is a flex row of a 40px cover and a title span. Emitting a
     bare text node instead drops the cover and leaves the title unstyled. */
  function affPanelInner(a) {
    var books = [];
    try { books = a.booksJson ? JSON.parse(a.booksJson) : []; } catch (e) { books = []; }
    if (!Object.prototype.toString.call(books).match(/Array/)) books = [];
    var linkHtml =
      (a.primaryUrl ? '<a class="iv-aff-link-primary" href="' + esc(a.primaryUrl) + '" target="_blank" rel="noopener">' + esc(a.primaryLabel || 'Learn More') + ' &rarr;</a>' : '') +
      (a.secondaryUrl ? '<a class="iv-aff-link" href="' + esc(a.secondaryUrl) + '" target="_blank" rel="noopener">' + esc(a.secondaryLabel || 'Learn More') + ' &rarr;</a>' : '');
    return '' +
      '<div class="iv-aff-name iv-aff-name-solo">' + esc(a.name) + '</div>' +
      '<p class="iv-aff-body">' + escEm(a.body) + '</p>' +
      (a.offerLine ? '<div class="iv-aff-offer">' + esc(a.offerLine) + '</div>' : '') +
      (linkHtml ? '<div class="iv-aff-links">' + linkHtml + '</div>' : '') +
      (a.note ? '<p class="iv-aff-note">' + esc(a.note) + '</p>' : '') +
      (books.length ? '<div class="iv-aff-books">' + books.map(function (b) {
        if (!b || !b.title) return '';
        return '<a class="iv-aff-book" href="' + esc(b.url || '#') + '" target="_blank" rel="noopener">' +
          (b.image ? '<img src="' + esc(b.image) + '" alt="' + esc(b.title) + '" loading="lazy">' : '') +
          '<span>' + esc(b.title) + '</span>' +
        '</a>';
      }).join('') + '</div>' : '');
  }

  /* ================================================================
     RELATED EPISODES
     ----------------------------------------------------------------
     Picks 3 to 6 genuinely similar episodes and changes per page.

     Why not just use Topics: the Topics field has only four choices,
     so on a 71 episode catalogue it buckets rather than ranks, and
     every "Consciousness & Reality" episode would tie with every
     other one. Show Categories is the same problem with six values.

     So the primary signal is the episode's own words. Titles in this
     catalogue are richly specific (Tartaria, Moses, Baal, terrain,
     biofield, astrotheology, herbs), which is exactly what a TF-IDF
     cosine similarity feeds on. Topic Line is counted twice because
     it is curated rather than incidental. On top of the text score
     come flat bonuses for a shared guest, a shared topic and a
     shared show category, plus a small nudge toward recent episodes
     to break ties.

     Weights were tuned against the real catalogue: the Chicago fire
     episode returns six Tartaria episodes, the Leo herbs episode
     returns the Gemini herbs episode first, and the atoms episode
     returns the other Marty Leeds and Steven Young show first. At a
     floor of 3.0 every one of the 71 episodes fills all six slots.
     ================================================================ */
  var REL_MAX = 6, REL_MIN = 3, REL_FLOOR = 3.0;
  var REL_STOP = {};
  ('the a an and or of in on to for with is are was were be been it its this that these those you your we our us they them from by at as not no but if then than so what who whom which how why when where all any both each few more most other some such own same too very can will just now ep episode part feat vs amp nbsp').split(' ')
    .forEach(function (w) { REL_STOP[w] = 1; });

  function relTokens(str) {
    return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ')
      .filter(function (t) { return t.length > 2 && !REL_STOP[t]; })
      .map(function (t) {
        /* crude singularisation, enough to join herb/herbs and myth/myths */
        return (t.length > 4 && /s$/.test(t) && !/ss$/.test(t)) ? t.slice(0, -1) : t;
      });
  }

  function relBuildIndex(records) {
    var docs = records.map(function (rec) {
      var f = rec.fields || {};
      var words = relTokens(f['Title']).concat(relTokens(f['Topic Line'])).concat(relTokens(f['Topic Line']));
      var tf = {};
      words.forEach(function (w) { tf[w] = (tf[w] || 0) + 1; });
      return {
        slug: f['Slug'] || '', title: f['Title'] || '', tf: tf,
        topics: linkedIds(f['Topics']), cats: linkedIds(f['Show Categories']),
        guests: linkedIds(f['Guests']), date: f['Publish Date'] || '',
        thumb: f['Thumbnail URL'] || '', num: f['Episode Number'],
        topicLine: f['Topic Line'] || ''
      };
    });
    var n = docs.length, df = {};
    docs.forEach(function (d) { Object.keys(d.tf).forEach(function (w) { df[w] = (df[w] || 0) + 1; }); });
    docs.forEach(function (d) {
      var vec = {}, sum = 0;
      Object.keys(d.tf).forEach(function (w) {
        var val = d.tf[w] * (Math.log(n / (df[w] || 1)) + 1);
        vec[w] = val; sum += val * val;
      });
      d.vec = vec; d.norm = Math.sqrt(sum) || 1;
    });
    return docs;
  }

  function relCosine(a, b) {
    var small = Object.keys(a.vec).length < Object.keys(b.vec).length ? a : b;
    var large = small === a ? b : a, dot = 0;
    Object.keys(small.vec).forEach(function (w) { if (large.vec[w]) dot += small.vec[w] * large.vec[w]; });
    return dot / (a.norm * b.norm);
  }

  function relOverlap(a, b) {
    var seen = {};
    a.forEach(function (x) { seen[x] = 1; });
    return b.filter(function (x) { return seen[x]; }).length;
  }

  function relRank(docs, slug) {
    var me = null;
    for (var i = 0; i < docs.length; i++) { if (docs[i].slug === slug) { me = docs[i]; break; } }
    if (!me) return [];
    var now = Date.now();
    var scored = [];
    docs.forEach(function (d) {
      /* A card with no artwork looks broken, so untagged rows sit out. */
      if (d === me || !d.thumb || !d.slug) return;
      var years = d.date ? Math.max(0, (now - new Date(d.date).getTime()) / (1000 * 86400 * 365)) : 5;
      var score = 10 * relCosine(me, d)
        + 4.5 * relOverlap(me.guests, d.guests)
        + 2 * relOverlap(me.topics, d.topics)
        + 1.5 * relOverlap(me.cats, d.cats)
        + Math.max(0, 0.5 - years * 0.08);
      if (score >= REL_FLOOR) scored.push({ doc: d, score: score });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, REL_MAX).map(function (x) { return x.doc; });
  }

  var REL_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  function relMeta(d) {
    var when = '';
    if (d.date) {
      var parts = String(d.date).split('-');
      if (parts.length >= 2) when = REL_MONTHS[parseInt(parts[1], 10) - 1] + ' ' + parts[0];
    }
    /* Episode Number is set on only a handful of rows, so the curated
       Topic Line leads when it exists and the number is the fallback. */
    var lead = d.topicLine ? d.topicLine : (d.num ? ('EP ' + d.num) : '');
    return [lead, when].filter(Boolean).join(' · ');
  }

  function relCard(d) {
    return '<a class="iv-related-card" href="' + esc(LIVE_ORIGIN + '/episodes/' + d.slug) + '">' +
        '<div class="iv-related-thumb"><img src="' + esc(ivImg(d.thumb, 500)) + '" alt="" loading="lazy"></div>' +
        '<div class="iv-related-body">' +
          '<div class="iv-related-meta">' + esc(relMeta(d)) + '</div>' +
          '<div class="iv-related-title">' + esc(d.title) + '</div>' +
        '</div>' +
      '</a>';
  }

  /* Rendered hidden and revealed only once it has enough cards, so a
     thin result never leaves an empty heading on the page. */
  function buildRelated() {
    return '<div class="iv-related" id="iv-related" style="display:none">' +
        '<div class="iv-section-label">Follow the thread</div>' +
        '<h2 class="iv-section-title">More episodes</h2>' +
        '<div class="iv-section-rule"></div>' +
        '<div class="iv-related-grid" id="iv-related-grid"></div>' +
      '</div>';
  }

  function relFetchAll() {
    var cached = null;
    try { cached = sessionStorage.getItem('iv_rel_corpus'); } catch (e) {}
    if (cached) {
      try { return Promise.resolve(JSON.parse(cached)); } catch (e) {}
    }
    /* One static file in place of the six paginated Airtable requests
       this used to make. Same records, same field names, so relBuildIndex
       below is untouched. */
    function keep(all) {
      try { sessionStorage.setItem('iv_rel_corpus', JSON.stringify(all)); } catch (e) {}
      return all;
    }
    return ivDataGet('_corpus').then(function (d) {
      if (d && d.records && d.records.length) return keep(d.records);
      console.info('IV: no static corpus');
      return [];
    });
  }

  /* One corpus fetch per page, shared by Related Episodes and the guest
     episode lists, so two independent consumers cannot race into two
     identical requests on a cold sessionStorage. */
  var relCorpusPromise = null;
  function relFetchAllOnce() {
    if (!relCorpusPromise) relCorpusPromise = relFetchAll();
    return relCorpusPromise;
  }

  /* ---------- every episode featuring one guest ----------
     The corpus already carries each row's Guests link field, so both the
     count in the button label and the list behind it cost no extra request.
     This replaced a link to /guest/<slug>, which never existed as a page. */
  function guestEpisodes(records, guestId) {
    var out = [];
    records.forEach(function (rec) {
      var f = rec.fields || {};
      if (!f['Slug']) return;
      if (linkedIds(f['Guests']).indexOf(guestId) === -1) return;
      out.push({ slug: f['Slug'], title: f['Title'] || '', date: f['Publish Date'] || '', thumb: f['Thumbnail URL'] || '' });
    });
    out.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    return out;
  }

  function guestEpWhen(date) {
    var p = String(date || '').split('-');
    return p.length >= 2 ? (REL_MONTHS[parseInt(p[1], 10) - 1] + ' ' + p[0]) : '';
  }

  function guestEpRow(ep, isCurrent) {
    var when = guestEpWhen(ep.date);
    var img = ep.thumb ? '<img src="' + esc(ivImg(ep.thumb, 300)) + '" alt="" loading="lazy">' : '';
    var meta = isCurrent ? (when ? when + ' · This episode' : 'This episode') : when;
    var body = '<span class="iv-guest-ep-body">' +
        '<span class="iv-guest-ep-title">' + esc(ep.title) + '</span>' +
        (meta ? '<span class="iv-guest-ep-meta">' + esc(meta) + '</span>' : '') +
      '</span>';
    /* The episode already open is listed but not linked, so the number in
       the label and the number of rows never disagree. */
    if (isCurrent) return '<div class="iv-guest-ep iv-guest-ep-current">' + img + body + '</div>';
    return '<a class="iv-guest-ep" href="' + esc(LIVE_ORIGIN + '/episodes/' + ep.slug) + '">' + img + body + '</a>';
  }

  function guestBtnLabel(open, count, first) {
    return (open ? 'Hide ' : 'Show all ') + count + ' ' + first + ' episodes' +
      '<span class="iv-guest-allcaret">' + (open ? '&uarr;' : '&darr;') + '</span>';
  }

  /* The host carries nearly the whole catalogue, so a toggle offering to
     list 98 of his own episodes on his own card is noise rather than
     navigation. Matched on the Airtable record id, with the name as a
     fallback in case that row is ever rebuilt. */
  var HOST_GUEST_ID = 'rec7Vm5QNrDbc9sdb';
  function isHostGuest(id, name) {
    return id === HOST_GUEST_ID || normName(name) === 'chance garton';
  }

  /* The post's own JSON, fetched once and shared. Both the tags cloud and
     the guest links need it, and it is the only source that gives the EXACT
     category strings Squarespace will match in a URL. */
  var IV_PAGE_JSON = null;
  function pageJson() {
    if (!IV_PAGE_JSON) {
      IV_PAGE_JSON = fetch(window.location.pathname + '?format=json')
        .then(function (r) { return r.json(); })['catch'](function () { return null; });
    }
    return IV_PAGE_JSON;
  }

  /* Guest names are Squarespace CATEGORIES on each post, in capitals, but
     NOT simply the guest's name uppercased: "Gabe (Slick Dissident)" is filed
     under "SLICK DISSIDENT", and a guessed URL 404s. So the exact string is
     taken from the post's own categories and matched three ways, widening
     only as far as needed. A guest with no matching category gets no link at
     all rather than a link to nowhere. */
  function matchCategory(cats, name) {
    var n = normName(String(name || '').replace(/[()]/g, ' '));
    if (!n || !cats || !cats.length) return '';
    var i, c;
    for (i = 0; i < cats.length; i++) { if (normName(cats[i]) === n) return cats[i]; }
    for (i = 0; i < cats.length; i++) {
      c = normName(cats[i]);
      if (c && (n.indexOf(c) > -1 || c.indexOf(n) > -1)) return cats[i];
    }
    var parts = n.split(' '), first = parts[0], last = parts[parts.length - 1];
    for (i = 0; i < cats.length; i++) {
      c = normName(cats[i]);
      if (first !== last && c.indexOf(first) > -1 && c.indexOf(last) > -1) return cats[i];
    }
    return '';
  }

  function linkGuestCategories(root) {
    var links = root.querySelectorAll('.iv-guest-alllink');
    if (!links.length) return Promise.resolve();
    return pageJson().then(function (data) {
      var cats = (data && data.item && data.item.categories) || (data && data.categories) || [];
      links.forEach(function (a) {
        if (isHostGuest(a.getAttribute('data-guest-id'), a.getAttribute('data-guest-name'))) return;
        var gname = a.getAttribute('data-guest-name') || '';
        var cat = IS_PLUS ? '' : matchCategory(cats, gname);
        /* No category on this post (every /plus post, and the odd free one):
           the /episodes guest filter lists the same episodes. */
        a.href = cat ? '/episodes/category/' + encodeURIComponent(cat) : '/episodes?guest=' + encodeURIComponent(gname);
        a.innerHTML = 'See all ' + esc(a.getAttribute('data-guest-first') || '') + ' episodes' +
          '<span class="iv-guest-allcaret">&rarr;</span>';
        a.style.display = '';
      });
    })['catch'](function (e) { console.warn('IV guest category links skipped:', e); });
  }

  function fillGuestEpisodes(root, currentSlug) {
    var btns = root.querySelectorAll('.iv-guest-alltoggle');
    if (!btns.length) return Promise.resolve();
    return relFetchAllOnce().then(function (records) {
      btns.forEach(function (btn) {
        var id = btn.getAttribute('data-guest-id');
        var first = btn.getAttribute('data-guest-first') || '';
        if (isHostGuest(id, btn.getAttribute('data-guest-name'))) return;
        var eps = guestEpisodes(records, id);
        /* A single result is this episode, so there is nothing to open. */
        if (eps.length < 2) return;
        var list = btn.parentNode.querySelector('.iv-guest-eplist[data-guest-id="' + id + '"]');
        if (!list) return;
        list.innerHTML = eps.map(function (ep) { return guestEpRow(ep, ep.slug === currentSlug); }).join('');
        btn.innerHTML = guestBtnLabel(false, eps.length, first);
        btn.style.display = '';
        btn.addEventListener('click', function () {
          var open = list.style.display === 'none';
          list.style.display = open ? '' : 'none';
          btn.classList.toggle('iv-open', open);
          btn.innerHTML = guestBtnLabel(open, eps.length, first);
        });
      });
    })['catch'](function (err) {
      console.warn('IV guest episodes skipped:', err);
    });
  }

  function fillRelated(root, slug) {
    var wrap = root.querySelector('#iv-related');
    var grid = root.querySelector('#iv-related-grid');
    if (!wrap || !grid) return Promise.resolve();
    return relFetchAllOnce().then(function (records) {
      var picks = relRank(relBuildIndex(records), slug);
      if (picks.length < REL_MIN) return;
      grid.innerHTML = picks.map(relCard).join('');
      wrap.style.display = '';
    }).catch(function (err) {
      console.warn('IV related episodes skipped:', err);
    });
  }

  function buildAffiliatesCard(affiliates) {
    if (!affiliates.length) return '';
    var solo = affiliates.length === 1;
    var tabs = affiliates.map(function (a, i) {
      return '<button type="button" class="iv-aff-tab' + (i === 0 ? ' iv-aff-tab-active' : '') + '" data-i="' + i + '">' + esc(a.name) + '</button>';
    }).join('');
    var panels = affiliates.map(function (a, i) {
      return '<div class="iv-affiliates-panel' + (i === 0 ? ' iv-affiliates-panel-active' : '') + '" data-i="' + i + '"' +
        (i === 0 ? '' : ' style="display:none"') + '>' + affPanelInner(a) + '</div>';
    }).join('');
    return '<div class="iv-affiliates-card" id="iv-affiliates-card">' +
      '<div class="iv-affiliates-heading">Support the show</div>' +
      (solo ? '' : '<div class="iv-affiliates-tabs">' + tabs + '</div>') +
      panels +
    '</div>';
  }

  /* Pills come from the post's own Squarespace tags, so there is no
     Airtable field to keep in sync. Hidden until they arrive. */
  function buildTagsCloud() {
    return '<div class="iv-tags-cloud" id="iv-tags-cloud" style="display:none">' +
      '<div class="iv-tags-label">Tagged</div>' +
      '<div class="iv-tags-row"></div>' +
    '</div>';
  }

  function buildPlatformsRow() {
    var pills = PLATFORMS.map(function (p) {
      return pill(p[0], p[1], imgIcon(p[2], p[0]));
    }).join('');
    return '' +
      '<div class="iv-platforms"><div class="iv-platforms-inner">' +
        '<div class="iv-platforms-label">ALSO ON</div>' +
        '<div class="iv-platform-row">' + pills +
          '<button type="button" class="iv-pill iv-share-btn" id="iv-share-trigger">' + imgIcon(ICON.share, 'Share') + '<span>Share</span></button>' +
        '</div>' +
      '</div></div>';
  }

  function shareOpt(id, label, iconSrc, labelId, extra) {
    return '<a class="iv-share-opt" id="' + id + '" href="#"' + (extra || '') + '>' +
      '<span class="iv-share-icon">' + imgIcon(iconSrc, '') + '</span>' +
      '<span class="iv-share-optlabel"' + (labelId ? ' id="' + labelId + '"' : '') + '>' + esc(label) + '</span>' +
    '</a>';
  }

  function buildShareModal(f) {
    return '' +
      '<div class="iv-share-overlay" id="iv-share-overlay">' +
        '<div class="iv-share-modal">' +
          '<button type="button" class="iv-share-close" id="iv-share-close">&times;</button>' +
          '<div class="iv-share-label">SHARE THIS EPISODE</div>' +
          '<div class="iv-share-title">' + esc(f.title) + '</div>' +
          '<div class="iv-share-grid">' +
            shareOpt('iv-share-imessage', 'iMessage', ICON.imessage) +
            shareOpt('iv-share-instagram', 'Instagram', ICON.instagram) +
            shareOpt('iv-share-telegram', 'Telegram', ICON.telegram, null, ' target="_blank" rel="noopener"') +
            shareOpt('iv-share-copy', 'Copy Link', ICON.copy, 'iv-share-copy-label') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function buildCommentsHeading() {
    return '' +
      '<div class="iv-comments-heading">' +
        '<div class="iv-comments-divider"><div class="iv-comments-divider-accent"></div></div>' +
        '<div class="iv-comments-heading-inner">' +
          '<div class="iv-comments-label">Join the conversation</div>' +
          '<h2 class="iv-comments-title">What inspired you?</h2>' +
        '</div>' +
      '</div>';
  }

  // ================================================================
  // INTERACTIVITY
  // ================================================================

  function wireAccordions(container) {
    container.querySelectorAll('.iv-section-toggle').forEach(function (btn) {
      if (btn.__ivWired) return;
      btn.__ivWired = true;
      btn.addEventListener('click', function () {
        btn.closest('.iv-accordion').classList.toggle('iv-open');
      });
    });

    /* The chevron stays, but it is a small target on a phone and the title
       beside it reads like the thing to press. The whole head now opens the
       section. Three things inside it keep their own behaviour: the chevron
       (already wired above, and a second toggle here would cancel the
       first), the FREE / PLUS switch, which does a different job in the same
       row, and any link or field that might be dropped in later. A live text
       selection is left alone so reading a title by dragging across it does
       not collapse the section under the cursor. */
    container.querySelectorAll('.iv-section-head').forEach(function (head) {
      if (head.__ivHeadWired) return;
      head.__ivHeadWired = true;
      var acc = head.closest('.iv-accordion');
      if (!acc) return;
      head.style.cursor = 'pointer';
      head.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        if (t.closest('.iv-section-toggle')) return;
        if (t.closest('.iv-dual-switch')) return;
        if (t.closest('a, button, input, select, textarea')) return;
        if (window.getSelection && String(window.getSelection()).length > 0) return;
        acc.classList.toggle('iv-open');
      });
    });
  }

  /* Squarespace's own scroll-reveal script tags content with "preFade"
     (opacity: 0) and reveals it with an observer that binds at page load.
     Nodes injected later can get the class without ever getting a reveal,
     which is how the footer title and tagline stayed invisible even when
     scrolled fully into view. Strip the class from our subtree and keep
     stripping it, so no amount of re-tagging can hide generated content. */
  function keepVisible(root) {
    function scrub(node) {
      if (!node || node.nodeType !== 1) return;
      if (node.classList && node.classList.contains('preFade')) {
        node.classList.remove('preFade');
        if (node.style && node.style.opacity === '0') node.style.opacity = '';
      }
      var kids = node.querySelectorAll ? node.querySelectorAll('.preFade') : [];
      for (var i = 0; i < kids.length; i++) {
        kids[i].classList.remove('preFade');
        if (kids[i].style && kids[i].style.opacity === '0') kids[i].style.opacity = '';
      }
    }
    scrub(root);
    if (typeof MutationObserver !== 'function') return;
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'attributes') { scrub(m.target); }
        else { for (var j = 0; j < m.addedNodes.length; j++) { scrub(m.addedNodes[j]); } }
      }
    });
    mo.observe(root, { subtree: true, childList: true, attributeFilter: ['class'] });
  }

  /* 2026-09-24: the guest names sit on one line. The row is fitted after
     the card lands (and again when the fonts finish and on resize): the
     font steps down from 17px to 13px until the names fit, and only if
     they still cannot is the row allowed to wrap, with each name carrying
     its own separator so a break never leaves a "|" hanging at a line end. */
  var GUEST_NAME_SIZES = [17, 16, 15, 14];
  var GUEST_NAME_SIZES_TIGHT = [17, 16, 15, 14, 13];
  function fitGuestNames(root) {
    var rows = (root || document).querySelectorAll('.iv-guest-name-row');
    if (!rows.length) return;
    function fits(row) { return row.scrollWidth <= row.clientWidth + 1; }
    rows.forEach(function (row) {
      var i;
      row.classList.remove('iv-guest-names-wrap');
      for (i = 0; i < GUEST_NAME_SIZES.length; i++) {
        row.style.fontSize = GUEST_NAME_SIZES[i] + 'px';
        if (fits(row)) return;
      }
      /* Still too wide with the separators: drop them (the class hides
         them and lets the row wrap) and try again from the top. */
      row.classList.add('iv-guest-names-wrap');
      for (i = 0; i < GUEST_NAME_SIZES_TIGHT.length; i++) {
        row.style.fontSize = GUEST_NAME_SIZES_TIGHT[i] + 'px';
        if (row.getBoundingClientRect().height < parseFloat(row.style.fontSize) * 2) return;
      }
    });
  }
  function wireGuestNameFit(root) {
    fitGuestNames(root);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { fitGuestNames(root); });
    }
    if (!window.__ivGuestFitResize) {
      window.__ivGuestFitResize = true;
      var t = null;
      window.addEventListener('resize', function () {
        clearTimeout(t);
        t = setTimeout(function () { fitGuestNames(document); }, 120);
      });
    }
  }

  function wireTabs(container, cardSel, tabSels, panelSel, activeCls, panelActiveCls) {
    var card = container.querySelector(cardSel);
    if (!card) return;
    function activate(i) {
      tabSels.forEach(function (sel) {
        card.querySelectorAll(sel).forEach(function (el) {
          el.classList.toggle(activeCls, el.getAttribute('data-i') === i);
        });
      });
      card.querySelectorAll(panelSel).forEach(function (el) {
        var on = el.getAttribute('data-i') === i;
        el.classList.toggle(panelActiveCls, on);
        el.style.display = on ? '' : 'none';
      });
    }
    card.querySelectorAll(tabSels.join(',')).forEach(function (el) {
      el.addEventListener('click', function () { activate(el.getAttribute('data-i')); });
    });
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  function flashLabel(el, msg) {
    if (!el) return;
    var original = el.textContent;
    el.textContent = msg;
    setTimeout(function () { el.textContent = original; }, 1500);
  }

  function wireShareModal(container, shareUrl, shareText) {
    var overlay = container.querySelector('.iv-share-overlay');
    var trigger = container.querySelector('.iv-share-btn');
    var closeBtn = container.querySelector('.iv-share-close');
    if (!overlay) return;

    if (trigger) {
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        overlay.classList.add('iv-open');
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', function () { overlay.classList.remove('iv-open'); });
    }
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.classList.remove('iv-open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') overlay.classList.remove('iv-open');
    });

    var imessage = container.querySelector('#iv-share-imessage');
    if (imessage) imessage.href = 'sms:&body=' + encodeURIComponent(shareText + ' ' + shareUrl);

    var telegram = container.querySelector('#iv-share-telegram');
    if (telegram) telegram.href = 'https://t.me/share/url?url=' + encodeURIComponent(shareUrl) + '&text=' + encodeURIComponent(shareText);

    var instagram = container.querySelector('#iv-share-instagram');
    if (instagram) {
      instagram.addEventListener('click', function (e) {
        e.preventDefault();
        copyToClipboard(shareUrl);
        flashLabel(instagram.querySelector('.iv-share-optlabel'), 'Link Copied');
      });
    }

    var copyBtn = container.querySelector('#iv-share-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', function (e) {
        e.preventDefault();
        copyToClipboard(shareUrl);
        flashLabel(container.querySelector('#iv-share-copy-label'), 'Copied!');
      });
    }
  }

  /* Tags come from the post's own Squarespace tags, fetched from the
     page's own JSON representation. No tags, no cloud. */
  function wireTagsCloud(container) {
    var cloud = container.querySelector('.iv-tags-cloud');
    if (!cloud) return;
    var parts = window.location.pathname.split('/').filter(Boolean);
    var collectionRoot = parts.length ? '/' + parts[0] : '';
    pageJson()
      .then(function (data) {
        var tags = (data && data.item && data.item.tags) || (data && data.tags) || [];
        tags = tags.slice(0, 10);
        if (!tags.length) return;
        var row = cloud.querySelector('.iv-tags-row');
        row.innerHTML = '';
        tags.forEach(function (tag) {
          var a = document.createElement('a');
          a.className = 'iv-tag-pill';
          a.href = collectionRoot + '/tag/' + encodeURIComponent(tag);
          a.textContent = tag;
          row.appendChild(a);
        });
        cloud.style.display = '';
      })
      .catch(function () { /* leave hidden */ });
  }

  // ---------------- shareable quote image ----------------

  function isMobileDevice() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      if (!src) { reject(new Error('no src')); return; }
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    var words = text.split(' ');
    var line = '';
    var lines = [];
    for (var n = 0; n < words.length; n++) {
      var testLine = line + words[n] + ' ';
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        lines.push(line.trim());
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());
    var startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach(function (l, i) { ctx.fillText(l, x, startY + i * lineHeight); });
    return lines.length;
  }

  /* ---------- quote share card ----------
     Laid out by measurement rather than fixed coordinates. The quote is
     the only element whose height varies, so it is fitted first: the type
     size steps down until the whole stack (quote, rule, author, episode)
     fits the band between the portrait and the footer, and only then is
     the stack centred in that band. Nothing can overlap the footer or the
     portrait because nothing is positioned until the height is known. */
  /* Webfonts for the card, fetched on first share rather than on page load,
     so nothing is paid for by a visitor who never shares. A light Playfair
     for the quote and Manrope for everything else; the only heavy weight on
     the card is the guest's name. Races a timeout so a slow or blocked font
     host can never stall the share, and every ctx.font below keeps a system
     fallback for that case. */
  var CARD_FONTS = null;
  function cardFonts() {
    if (CARD_FONTS) return CARD_FONTS;
    CARD_FONTS = (function () {
      try {
        if (!document.getElementById('iv-card-fonts')) {
          var link = document.createElement('link');
          link.id = 'iv-card-fonts';
          link.rel = 'stylesheet';
          link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=Manrope:wght@300;400;500;700;800&display=swap';
          document.head.appendChild(link);
        }
        if (!document.fonts || !document.fonts.load) return Promise.resolve();
        var want = ['400 60px "Playfair Display"', '500 60px "Playfair Display"',
                    '800 32px "Manrope"', '400 24px "Manrope"'];
        return Promise.race([
          Promise.all(want.map(function (f) { return document.fonts.load(f); })),
          new Promise(function (r) { setTimeout(r, 2500); })
        ]);
      } catch (e) { return Promise.resolve(); }
    })();
    return CARD_FONTS;
  }

  var CARD = {
    size: 1080,
    margin: 62,
    portraitCY: 202,
    portraitD: 250,
    bandTop: 362,
    footTop: 840,
    quoteMaxW: 880,
    quoteMin: 26,
    quoteMax: 58,
    blue: 'rgb(45,160,255)'
  };

  function cardWrap(ctx, text, maxWidth) {
    var words = String(text || '').split(/\s+/), lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = words[i]; }
      else { line = test; }
    }
    if (line) lines.push(line);
    return lines;
  }

  /* Horizontal extent of a PNG's actual ink, as fractions of its width, so a
     logo with transparent padding can still be centred on what you can see. */
  function opaqueBounds(img) {
    try {
      var n = 72, oc = document.createElement('canvas');
      oc.width = n; oc.height = n;
      var octx = oc.getContext('2d');
      octx.drawImage(img, 0, 0, n, n);
      var d = octx.getImageData(0, 0, n, n).data, minX = n, maxX = -1;
      for (var y = 0; y < n; y++) {
        for (var x = 0; x < n; x++) {
          if (d[(y * n + x) * 4 + 3] > 12) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
        }
      }
      if (maxX < minX) return null;
      return { l: minX / n, r: (maxX + 1) / n };
    } catch (e) { return null; }
  }

  function cardQuoteFont(size) { return '400 ' + size + 'px "Playfair Display", Georgia, "Times New Roman", serif'; }

  async function buildQuoteImage(quote, author, portraitUrl, episode) {
    var S = CARD.size;
    await cardFonts();
    var canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000308';
    ctx.fillRect(0, 0, S, S);
    try {
      var frame = await loadImage(ICON.quoteFrame);
      ctx.drawImage(frame, 0, 0, S, S);
    } catch (e) { /* frame optional */ }

    /* A scrim at the foot of the card: nothing at all just above the address
       row, deepening to the bottom edge. It mutes the artwork's horizon glow
       so the address stops competing with it, while leaving the picture
       visible underneath rather than boxing it out. */
    (function () {
      var top = 852;
      var g = ctx.createLinearGradient(0, top, 0, S);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.42, 'rgba(0,0,0,0.34)');
      g.addColorStop(1, 'rgba(0,0,0,0.76)');
      ctx.fillStyle = g;
      ctx.fillRect(0, top, S, S - top);
    })();

    /* ---- portrait ---- */
    var pR = CARD.portraitD / 2, pX = S / 2, pY = CARD.portraitCY;
    var portraitLoaded = false;

    /* The ring and the line beneath it are ONE path, stroked once per pass,
       so they share a weight, a colour and a bloom instead of being two
       shapes with two treatments meeting at a seam. The line is horizontal
       at the circle's lowest point, which the circle meets tangentially, and
       a horizontal gradient carries it to nothing well before the card edge
       so it reads as light thrown off the ring rather than a rule. */
    var ringPath = (function () {
      var pth = new Path2D(), ly = pY + pR;
      pth.moveTo(60, ly); pth.lineTo(S - 60, ly);
      pth.moveTo(pX + pR, pY);
      pth.arc(pX, pY, pR, 0, Math.PI * 2);
      return pth;
    })();
    function ringGradient(mid, edge) {
      var g = ctx.createLinearGradient(0, 0, S, 0);
      g.addColorStop(0, edge);
      g.addColorStop(0.30, mid);
      g.addColorStop(0.70, mid);
      g.addColorStop(1, edge);
      return g;
    }

    try {
      var portrait = await loadImage(ivImg(portraitUrl, 500));
      ctx.save();
      ctx.beginPath(); ctx.arc(pX, pY, pR, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
      ctx.drawImage(portrait, pX - pR, pY - pR, pR * 2, pR * 2);
      ctx.restore();
      portraitLoaded = true;
    } catch (e) { /* portrait optional */ }
    if (portraitLoaded) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(0,130,255,0.95)'; ctx.shadowBlur = 46;
      ctx.strokeStyle = ringGradient('rgba(0,135,250,0.85)', 'rgba(0,135,250,0)');
      ctx.lineWidth = 11; ctx.stroke(ringPath);
      ctx.shadowBlur = 30;
      ctx.strokeStyle = ringGradient('rgba(0,150,255,0.95)', 'rgba(0,150,255,0)');
      ctx.lineWidth = 7; ctx.stroke(ringPath);
      ctx.shadowColor = 'rgba(150,235,255,0.9)'; ctx.shadowBlur = 16;
      ctx.strokeStyle = ringGradient('rgba(215,255,255,1)', 'rgba(215,255,255,0)');
      ctx.lineWidth = 3; ctx.stroke(ringPath);
      ctx.restore();
    }

    var bandTop = portraitLoaded ? CARD.bandTop : 250;
    var bandBottom = CARD.footTop - 30;

    /* ---- episode title block, measured at a fixed size ---- */
    var epSize = 24, epLine = 31;
    ctx.font = '400 ' + epSize + 'px "Manrope", Arial, Helvetica, sans-serif';
    var epLines = cardWrap(ctx, episode, 720).slice(0, 3);

    /* ---- fit the quote ---- */
    var GAP_RULE = 38, GAP_AUTH = 34, AUTH_H = 34, GAP_EP = 26;
    var fixedH = GAP_RULE + 1 + GAP_AUTH + AUTH_H + (epLines.length ? GAP_EP + epLines.length * epLine : 0);
    var body = String(quote || '').replace(/^[“"'\s]+|[”"'\s]+$/g, '');
    var qSize = CARD.quoteMax, qLines = [], qLine = 0;
    for (; qSize >= CARD.quoteMin; qSize -= 2) {
      ctx.font = cardQuoteFont(qSize);
      /* No decorative marks any more, so the text gets the full column. */
      qLines = cardWrap(ctx, body, CARD.quoteMaxW);
      qLine = Math.round(qSize * 1.3);
      if (qLines.length * qLine + fixedH <= bandBottom - bandTop) break;
    }
    /* Last resort on an unusually long quote: trim rather than overlap. */
    if (qLines.length * qLine + fixedH > bandBottom - bandTop) {
      var maxLines = Math.max(3, Math.floor((bandBottom - bandTop - fixedH) / qLine));
      if (qLines.length > maxLines) {
        qLines = qLines.slice(0, maxLines);
        qLines[maxLines - 1] = qLines[maxLines - 1].replace(/[\s]+$/, '') + '…';
      }
    }

    var quoteH = qLines.length * qLine;
    var totalH = quoteH + fixedH;
    var y = bandTop + Math.max(0, ((bandBottom - bandTop) - totalH) / 2);

    var widest = 0;
    ctx.font = cardQuoteFont(qSize);
    qLines.forEach(function (l) { widest = Math.max(widest, ctx.measureText(l).width); });

    /* ---- quote ---- */
    ctx.font = cardQuoteFont(qSize);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    var firstBase = y + qSize;
    qLines.forEach(function (l, i) { ctx.fillText(l, S / 2, firstBase + i * qLine); });

    y += quoteH + GAP_RULE;

    /* ---- rule ---- */
    var ruleW = Math.min(widest + 40, 620);
    var grad = ctx.createLinearGradient((S - ruleW) / 2, 0, (S + ruleW) / 2, 0);
    grad.addColorStop(0, 'rgba(120,190,255,0)');
    grad.addColorStop(0.5, 'rgba(140,205,255,0.55)');
    grad.addColorStop(1, 'rgba(120,190,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect((S - ruleW) / 2, y, ruleW, 1);
    y += 1 + GAP_AUTH;

    /* ---- author, flanked by short rules ---- */
    ctx.font = '800 32px "Manrope", Arial, Helvetica, sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    ctx.fillStyle = CARD.blue;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var name = String(author || '').toUpperCase();
    ctx.fillText(name, S / 2, y + AUTH_H / 2);
    var nameW = ctx.measureText(name).width;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.fillStyle = 'rgba(90,175,255,0.75)';
    var flankGap = 26, flankW = 62, midY = Math.round(y + AUTH_H / 2);
    if (name) {
      ctx.fillRect(S / 2 - nameW / 2 - flankGap - flankW, midY, flankW, 2);
      ctx.fillRect(S / 2 + nameW / 2 + flankGap, midY, flankW, 2);
    }
    y += AUTH_H;

    /* ---- episode ---- */
    if (epLines.length) {
      y += GAP_EP;
      ctx.font = '400 ' + epSize + 'px "Manrope", Arial, Helvetica, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      epLines.forEach(function (l, i) { ctx.fillText(l, S / 2, y + epSize + i * epLine); });
    }

    /* ---- footer: one centred lockup ----
       The address used to be sized to meet the right margin, which left the
       group hanging off the left edge. It now takes a fixed size and the
       whole lockup, mark then divider then address, is measured and centred
       as a unit. */
    var M = CARD.margin, LOGO_W = 172, logoH = LOGO_W, logo = null;
    try {
      logo = await loadImage(ICON.ivLogo);
      logoH = LOGO_W * (logo.height / logo.width);
    } catch (e) { logoH = LOGO_W; }

    var url = 'INNERVERSEPODCAST.COM';
    var urlSize = 48, gapA = 28, gapB = 30, divW = 2;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
    ctx.font = '400 ' + urlSize + 'px "Manrope", Arial, Helvetica, sans-serif';
    /* Letter-spacing adds a trailing gap after the last glyph, and the mark's
       PNG carries transparent padding. Centring on the raw measurements puts
       the lockup visibly off to one side, so both are taken out and the group
       is centred on its ink instead of on its boxes. */
    var urlInkW = ctx.measureText(url).width - 3;
    var ink = logo ? opaqueBounds(logo) : null;
    var inkL = ink ? LOGO_W * ink.l : 0;
    var inkR = ink ? LOGO_W * (1 - ink.r) : 0;
    var logoInkW = logo ? (LOGO_W - inkL - inkR) : 0;

    var lockW = (logo ? logoInkW + gapA + divW + gapB : 0) + urlInkW;
    var lockX = Math.max(M, (S - lockW) / 2);
    var rowMid = S - M - logoH / 2;

    if (logo) {
      ctx.drawImage(logo, lockX - inkL, rowMid - logoH / 2, LOGO_W, logoH);
      ctx.fillStyle = 'rgba(120,195,255,0.55)';
      ctx.fillRect(lockX + logoInkW + gapA, rowMid - 42, divW, 84);
    }
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(url, lockX + (logo ? logoInkW + gapA + divW + gapB : 0), rowMid);
    ctx.restore();
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.textBaseline = 'alphabetic';

    return canvas;
  }

  /* ---------- portraits for quote share images ----------
     The Quotes JSON carries a portrait only for the host, so a guest's
     quote produced a share image with no face on it. The guest records
     already hold a Portrait URL, so any missing one is filled in here by
     matching the quote's author against the episode's guests. Nothing has
     to be added to the JSON, on this episode or any past one. */
  var HOST_PORTRAIT = 'https://images.squarespace-cdn.com/content/5987d897cf81e0278ec5322e/aa717e55-9487-4255-a7df-3f8ef10940c4/Chance+Garton+Patreon+Portrait.png?format=500w&content-type=image%2Fpng';

  /* The host portrait changed on 2026-09-21, and every episode's Quotes
     JSON still embeds the old one on Chance's quotes. Rather than rewrite
     those fields, a Chance-authored quote always takes the host's CURRENT
     portrait, ignoring the JSON value: his guest record's Portrait URL
     once the guest list has loaded, else the constant above. */
  function isHostAuthor(author) {
    return normName(author).split(' ')[0] === 'chance';
  }
  function hostPortrait(guests) {
    var h = (guests || []).filter(function (g) { return g && g.id === HOST_GUEST_ID && g.portrait; })[0];
    return h ? h.portrait : HOST_PORTRAIT;
  }

  function normName(s) {
    return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /* Exact match first, then one name being the start of the other, then
     first names, each pass across the WHOLE list. Done as three passes
     rather than one loop so a shared first name can never outrank an
     exact match further down the list. */
  function portraitFor(author, guests) {
    var a = normName(author);
    if (!a) return '';
    if (isHostAuthor(a)) return hostPortrait(guests);
    var list = (guests || []).filter(function (g) { return g && g.portrait && normName(g.name); });
    var hit = list.filter(function (g) { return normName(g.name) === a; })[0];
    if (!hit) hit = list.filter(function (g) {
      var n = normName(g.name);
      return n.indexOf(a + ' ') === 0 || a.indexOf(n + ' ') === 0;
    })[0];
    if (!hit) hit = list.filter(function (g) {
      return normName(g.name).split(' ')[0] === a.split(' ')[0];
    })[0];
    if (hit) return hit.portrait;
    return '';
  }

  function backfillQuotePortraits(root, guests) {
    root.querySelectorAll('.iv-quote-share-btn').forEach(function (btn) {
      var author = btn.getAttribute('data-author');
      var url = btn.getAttribute('data-portrait');
      if (!url || isHostAuthor(author)) {
        var fresh = portraitFor(author, guests);
        if (fresh) { url = fresh; btn.setAttribute('data-portrait', url); }
      }
      if (!url) return;
      /* The same face the share image uses, shown on the card itself so a
         reader can tell who said what without reading the name. Runs on
         both passes, so a host quote gets its face immediately and a
         guest's arrives with the guest records. */
      var card = btn.closest('.iv-quote-card');
      var av = card ? card.querySelector('.iv-quote-avatar') : null;
      if (av && av.getAttribute('data-iv-av') !== url) {
        av.style.backgroundImage = 'url("' + ivImg(url, 300) + '")';
        av.title = author || '';
        av.classList.add('iv-on');
        av.setAttribute('data-iv-av', url);
      }
    });
  }

  function wireQuoteShare(container, shareUrl) {
    container.querySelectorAll('.iv-quote-share-btn').forEach(function (btn) {
      if (btn.__ivWired) return;
      btn.__ivWired = true;
      btn.addEventListener('click', async function () {
        btn.disabled = true;
        try {
          var canvas = await buildQuoteImage(
            btn.getAttribute('data-quote'),
            btn.getAttribute('data-author'),
            btn.getAttribute('data-portrait'),
            btn.getAttribute('data-episode')
          );
          /* JPEG rather than PNG. The card is a photograph laid over
             artwork, so PNG buys no fidelity worth having and costs about
             1.8MB against 240KB, and an attachment that size is what stops
             a messaging client previewing it inline instead of hanging it
             off the message as a file. */
          canvas.toBlob(async function (blob) {
            var file = new File([blob], 'innerverse-quote.jpg', { type: 'image/jpeg' });
            if (isMobileDevice() && navigator.canShare && navigator.canShare({ files: [file] })) {
              /* Some share targets take files or a url but quietly drop one
                 when handed both, so the richer payload is offered first and
                 the image on its own is the fallback. */
              var payload = { files: [file], url: shareUrl };
              if (!navigator.canShare(payload)) payload = { files: [file] };
              try { await navigator.share(payload); }
              catch (e) { /* user cancelled the share sheet */ }
            } else {
              window.open(URL.createObjectURL(blob), '_blank');
            }
            btn.disabled = false;
          }, 'image/jpeg', 0.9);
        } catch (e) {
          console.error('IV: quote image failed', e);
          btn.disabled = false;
        }
      });
    });
  }

  /* (2026-10-28, stage 1b) The members' page render, carried back from the
     live iv-episode-render (IV_BUILD 2026-10-04a-shownotes) as it was, with
     four changes: renderPlus tells its caller when there is nothing to draw,
     the related cards and the guest card's See all button stay on this site,
     and it is started by ivPlusPage() below rather than by the Squarespace
     paywall. The page arrives as the signed-out join screen; this draws the
     members' page in front of it once the member state says so. */
  /* ===== BEGIN iv-plus-episode =====
     /plus/<slug> is the members' copy of an episode. It shares its slug
     with /episodes/<slug>, so this script used to match the same Airtable
     row and take the members' page over with the free layout and the free
     title - which is why every page under /plus was simply skipped for a
     while (the iv-plus-optout block this replaces).

     The rule now is narrower and safer than a full render: the paywalled
     blocks Squarespace serves are the product, so they are never rebuilt.
     Their video is re-skinned in place, their description is stood down
     only when Airtable actually has one to put in its place, and
     everything else this adds is new furniture around them - header,
     guest and affiliate sidebar, booking CTA, comments heading - in Plus
     yellow. No Airtable row means the page is left exactly as served.

     Rollback: replace the renderPlus() call below with
     "if (window.IVLoaderHide) window.IVLoaderHide(); return;" and delete
     the iv-plus-episode block in the header. ===== */

  /* Blue to yellow, generated from the live stylesheet rather than
     hand-listed. Every rule that paints rgb(0,137,255) gets a twin
     scoped to html.iv-plus-ep carrying only its colour declarations,
     with the blue swapped for Plus yellow. Hand-maintaining that list
     meant it went stale the moment a colour changed elsewhere; this
     cannot. The nav and footer are skipped: their member-state colour
     is decided sitewide by iv-nav-login-state, not per page. */
  function plusYellow(val) {
    return val.replace(/rgba?\(\s*0\s*,\s*137\s*,\s*255/g, function (m) {
      return m.charAt(3) === 'a' ? 'rgba(232,185,35' : 'rgb(232,185,35';
    });
  }

  function plusTwins(rules, out) {
    for (var j = 0; j < rules.length; j++) {
      var rule = rules[j];
      if (rule.type === 4 && rule.cssRules) {          /* @media */
        var inner = [];
        plusTwins(rule.cssRules, inner);
        if (inner.length) out.push('@media ' + rule.conditionText + '{' + inner.join('') + '}');
        continue;
      }
      if (rule.type !== 1 || !rule.selectorText) continue;
      var sel = rule.selectorText;
      if (sel.indexOf('.iv-nav-') > -1 || sel.indexOf('.iv-footer-') > -1) continue;
      var decls = '';
      for (var k = 0; k < rule.style.length; k++) {
        var prop = rule.style[k];
        var val = rule.style.getPropertyValue(prop);
        if (!/rgba?\(\s*0\s*,\s*137\s*,\s*255/.test(val)) continue;
        decls += prop + ':' + plusYellow(val) +
          (rule.style.getPropertyPriority(prop) ? ' !important' : '') + ';';
      }
      if (!decls) continue;
      out.push(sel.split(',').map(function (s) {
        return 'html.iv-plus-ep ' + s.trim();
      }).join(',') + '{' + decls + '}');
    }
  }

  function paintPlusYellow() {
    if (document.getElementById('iv-plus-yellow')) return;
    var out = [];
    var sheets = document.styleSheets;
    for (var i = 0; i < sheets.length; i++) {
      var rules;
      try { rules = sheets[i].cssRules; } catch (e) { continue; }  /* cross-origin */
      if (rules) plusTwins(rules, out);
    }
    if (!out.length) return;
    var el = document.createElement('style');
    el.id = 'iv-plus-yellow';
    el.textContent = out.join('\n');
    document.head.appendChild(el);
  }

  function plusPageVimeoId() {
    var f = document.querySelector('.blog-item-content iframe[src*="player.vimeo.com"]');
    return f ? vimeoId(f.getAttribute('src') || '') : '';
  }

  /* Tab-switch, plus actually stopping whichever player was running.
     The free page's wireMediaToggle binds a click handler straight onto
     .iv-video-cover, which is exactly the direct bind that breaks once
     Squarespace swaps this native video block for a copy of itself (see
     the delegated handler in renderPlus below), so that function still
     isn't reused here. But hiding a panel never stopped its player
     either, so switching tabs used to leave the old one making sound
     underneath the new one. The video iframe has no JS API to pause
     here (cross-origin, built by the delegated handler below), so
     switching away from Watch tears it down and rebuilds the original
     cover instead of just hiding it; switching away from Listen just
     pauses the audio element. */
  function wirePlusMediaTabs(container) {
    var btns = container.querySelectorAll('.iv-tbtn');
    var panels = container.querySelectorAll('.iv-toggle-panel');
    var box = container.querySelector('.iv-ratio');
    var coverHtml = box ? box.innerHTML : '';
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var which = btn.getAttribute('data-panel');
        var audio = container.querySelector('.iv-audio-player audio');
        var hadVideo = box && box.querySelector('iframe');

        function apply(resumeAt) {
          btns.forEach(function (b) { b.classList.toggle('iv-tbtn-active', b === btn); });
          panels.forEach(function (p) { p.style.display = (p.getAttribute('data-panel') === which) ? '' : 'none'; });
          if (which === 'listen') {
            if (hadVideo) box.innerHTML = coverHtml;
            if (resumeAt != null && audio) {
              audio.currentTime = resumeAt;
              audio.play()['catch'](function () { });
            }
          } else {
            ivPauseAudio(container);
            if (resumeAt != null && box) ivMountVideo(box, resumeAt);
          }
        }

        if (which === 'listen') {
          if (hadVideo) {
            ivVideoState().then(function (s) { apply(s.playing ? s.time : null); });
          } else {
            apply(null);
          }
        } else if (audio && !audio.paused) {
          apply(audio.currentTime);
        } else {
          apply(null);
        }
      });
    });

    /* Plus pages route through this tab-switcher, not wireMediaToggle,
       so the PiP button's hookup has to be wired here too - otherwise
       window.__ivPipOnMount never gets set on /plus pages and the
       button stays hidden forever, even though Plus is the only place
       Vimeo (and therefore PiP) is actually used. */
    wireVideoPip(container);
  }


  /* ===== BEGIN iv-plus-dual =====
     Chapters, core themes and quotes on the members' page, each as ONE
     section carrying both cuts behind a FREE / PLUS switch.

     Why a switch rather than two accordions: the Plus cut runs about
     1.7x the free cut, so its counts scale with it (24 chapters against
     12, 16 quotes against 10). Stacking a Plus list under a free list
     would double the height of all three sections at once. One section,
     one list visible, the other a click away.

     What decides whether a section exists is the PLUS field alone. Around
     a hundred /plus pages already carry free Chapters, Quotes and Core
     Themes JSON on their Airtable row, and reading those unconditionally
     would grow every one of those pages the moment this shipped. The free
     pane is an extra VIEW inside a section, never a reason for one to
     appear.

     The markup is the free page's accordion, reused class for class, so
     it inherits that component's type, rules, spacing and its mobile
     collapse. Only the switch is new. */

  function plusDualHead(label, title, hasBoth) {
    return '' +
      '<div class="iv-section-head">' +
        '<div>' +
          '<div class="iv-section-label">' + esc(label) + '</div>' +
          '<h2 class="iv-section-title">' + esc(title) + '</h2>' +
        '</div>' +
        '<div class="iv-dual-headright">' +
          (hasBoth
            ? '<div class="iv-dual-switch" role="tablist" aria-label="' + esc(title) + ', free or Plus cut">' +
                '<button type="button" role="tab" class="iv-dual-btn" data-cut="free" aria-selected="false">Free</button>' +
                '<button type="button" role="tab" class="iv-dual-btn iv-dual-btn-active" data-cut="plus" aria-selected="true">Plus</button>' +
              '</div>'
            : '') +
          '<button type="button" class="iv-section-toggle" aria-label="Toggle ' + esc(title) + '">' + SVG.chevron + '</button>' +
        '</div>' +
      '</div>';
  }

  /* The Plus cut opens first. This is the members' page and the extended
     cut is what they came for; the free view is the reference. */
  function buildDualSection(kind, id, label, title, freeHtml, plusHtml) {
    if (!freeHtml && !plusHtml) return '';
    var both = !!(freeHtml && plusHtml);
    var open = plusHtml ? 'plus' : 'free';
    function pane(cut, html) {
      if (!html) return '';
      return '<div class="iv-dual-pane' + (cut === open ? '' : ' iv-dual-pane-off') +
             '" data-cut="' + cut + '">' + html + '</div>';
    }
    return '' +
      '<div class="iv-plus-dual iv-accordion iv-dual-' + kind + '" id="' + id + '" data-cut="' + open + '">' +
        plusDualHead(label, title, both) +
        '<div class="iv-section-rule"></div>' +
        '<div class="iv-section-body">' + pane('free', freeHtml) + pane('plus', plusHtml) + '</div>' +
      '</div>';
  }

  /* Three list builders that stop at the list. buildChapters, buildThemes
     and buildQuotes each return a whole accordion of their own, which is
     right for the free page and one wrapper too many here, and they are
     left untouched rather than refactored so nothing on the free pages
     moves for a members-only feature. */
  function plusChapterRows(chapters) {
    return '<div class="iv-chapters-list">' + chapters.map(function (ch) {
      return '' +
        '<a href="#" class="iv-chapter-row" data-seek="' + esc(ch.seek) + '">' +
          '<span class="iv-chapter-time">' + esc(ch.time) + '</span>' +
          '<span class="iv-chapter-title">' + esc(ch.title) + '</span>' +
          '<span class="iv-chapter-btn">' + SVG.rowPlay + '</span>' +
        '</a>';
    }).join('') + '</div>';
  }

  /* startAt continues the numbering across the switch: the free pane runs
     1 to 5 and the Plus pane picks up at 6, so the two views read as one
     numbered run of ten rather than two lists that both start at one. No
     leading zero, which leaves 10 as the only two character number. */
  function plusThemeItems(themes, startAt) {
    return '<div class="iv-themes-list">' + themes.map(function (t, i) {
      var num = String((startAt || 1) + i);
      return '' +
        '<div class="iv-theme-item">' +
          '<div class="iv-theme-num">' + num + '</div>' +
          '<div class="iv-theme-body">' +
            '<h3 class="iv-theme-title">' + esc(t.title) + '</h3>' +
            '<p class="iv-theme-text">' + esc(t.body) + '</p>' +
          '</div>' +
        '</div>';
    }).join('') + '</div>';
  }

  function plusQuoteCards(quotes, epTitle) {
    return '<div class="iv-quotes-wrap">' + quotes.map(function (q) {
      return '' +
        '<div class="iv-quote-card">' +
          '<blockquote class="iv-quote-text">&ldquo;' + esc(q.text) + '&rdquo;</blockquote>' +
          '<div class="iv-quote-footer">' +
            '<span class="iv-quote-who">' +
              '<span class="iv-quote-avatar"></span>' +
              '<span class="iv-quote-author">' + esc(q.author) + '</span>' +
            '</span>' +
            '<button type="button" class="iv-quote-share-btn"' +
              ' data-quote="' + esc(q.text) + '"' +
              ' data-author="' + esc(q.author) + '"' +
              ' data-portrait="' + esc(q.portrait) + '"' +
              ' data-episode="' + esc(epTitle) + '"' +
              ' aria-label="Share this quote">' + SVG.quoteShare + '</button>' +
          '</div>' +
        '</div>';
    }).join('') + '</div>';
  }

  function wirePlusDual(root) {
    root.querySelectorAll('.iv-plus-dual').forEach(function (sec) {
      sec.querySelectorAll('.iv-dual-btn').forEach(function (btn) {
        if (btn.__ivWired) return;
        btn.__ivWired = true;
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          /* The section head is the accordion's own hit area on mobile, so
             without this a switch tap also collapses the section. */
          e.stopPropagation();
          var cut = btn.getAttribute('data-cut');
          if (sec.getAttribute('data-cut') === cut) return;
          sec.setAttribute('data-cut', cut);
          sec.querySelectorAll('.iv-dual-btn').forEach(function (b) {
            var on = b.getAttribute('data-cut') === cut;
            b.classList.toggle('iv-dual-btn-active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
          });
          sec.querySelectorAll('.iv-dual-pane').forEach(function (p) {
            p.classList.toggle('iv-dual-pane-off', p.getAttribute('data-cut') !== cut);
          });
        });
      });
    });
  }

  /* Chapter rows on this page seek the PLUS video, which is the only cut
     embedded here. That is why the free pane reads a re-timed field rather
     than Chapters JSON: the free cut is a different edit, so its own
     timestamps land in the wrong moment of this player.

     wireChapters cannot be reused as-is because it looks for .iv-ratio
     INSIDE the container it is given, and here the player sits in
     Squarespace's video block while the chapters sit in a full width row
     below it. */
  function wirePlusChapters(root) {
    root.querySelectorAll('.iv-chapter-row').forEach(function (row) {
      if (row.__ivWired) return;
      row.__ivWired = true;
      row.addEventListener('click', function (e) {
        e.preventDefault();
        var seconds = parseFloat(row.getAttribute('data-seek')) || 0;
        var ratio = document.querySelector('.blog-item-content .iv-ratio');
        var watchBtn = document.querySelector('.blog-item-content .iv-tbtn[data-panel="watch"]');
        /* No Watch/Listen tabs at all means this row carries no Plus Audio
           URL and the video is the only player, so it wins by default. */
        var watching = !watchBtn || watchBtn.classList.contains('iv-tbtn-active');
        var hasVideo = !!(ratio && ratio.getAttribute('data-video-id'));

        if (watching && hasVideo) {
          ivPauseAudio(document);
          if (ivVideoSeekPlay(ratio, seconds)) { plusScrollToPlayer(); return; }
        }
        if (window.__ivAudioSeekPlay) window.__ivAudioSeekPlay(seconds);
      });
    });
  }

  /* ivScrollToVideo anchors on .iv-media-toggle, which only exists on a
     /plus page whose row has a Plus Audio URL. Anchor on the player box
     instead so a video-only page still brings the jump into view. */
  function plusScrollToPlayer() {
    var box = document.querySelector('.blog-item-content .iv-media-toggle') ||
              document.querySelector('.blog-item-content .iv-ratio');
    if (!box) return;
    var top = box.getBoundingClientRect().top + window.pageYOffset - ivNavHeight() - 16;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  /* A sidebar taller than the window cannot usefully pin to the top: it
     freezes with its lower half permanently below the fold, so it reads as
     not moving at all until the column finally runs out. Giving it a
     NEGATIVE sticky top instead lets it scroll with the page from the
     first pixel and pin only once its bottom edge has arrived, so the
     whole column is readable and the movement starts immediately. A
     sidebar shorter than the window keeps the normal 100px offset. Below
     900px the column is static and the inline top is cleared. */
  function fitPlusSide() {
    var side = document.querySelector('.iv-plus-side');
    if (!side) return;
    if (window.innerWidth <= 900) { side.style.top = ''; return; }
    var h = side.offsetHeight, vh = window.innerHeight, pad = 24, navGap = 100;
    side.style.top = (h + pad > vh - navGap ? Math.round(vh - h - pad) : navGap) + 'px';
  }

  /* ===== END iv-plus-dual ===== */

  
  /* ================================================================
     PLUS RELATED EPISODES
     ----------------------------------------------------------------
     Same idea as the free page's Related Episodes just above (TF-IDF
     over the title, plus flat bonuses for a shared Show/Theme, plus a
     small recency nudge), built from plus-index.json instead of
     Airtable - Airtable only covers about half the /plus catalogue,
     the same reason the /plus search box (iv-plus-index) reads that
     file instead. This also means the free-only "no distinct Plus
     cut" entries (the redirect rows in plus-index.json) are eligible
     to be recommended here, and their own url already points at
     their real free page rather than a dead /plus link.

     No Guests/Topic Line signal here, since plus-index.json does not
     carry them - lighter engine than the free side's. Written so the
     ranking step is the only thing later work needs to touch: when
     subject tagging (search upgrade phase 1, see the 2.0 roadmap)
     lands, the theme/show overlap bonus below gets richer inputs for
     free; when semantic search (phase 2) lands, plusRelRank's scoring
     is the one function that needs replacing, everything else (fetch,
     card markup, mounting) stays as is.
     ================================================================ */
  var PLUSREL_MAX = 6, PLUSREL_MIN = 3, PLUSREL_FLOOR = 2.0;
  var PLUSREL_STOP = {};
  ('the a an and or of in on to for with is are was were be been it its this that these those you your we our us they them from by at as not no but if then than so what who whom which how why when where all any both each few more most other some such own same too very can will just now ep episode part feat vs amp nbsp plus').split(' ')
    .forEach(function (w) { PLUSREL_STOP[w] = 1; });

  function plusRelTokens(str) {
    return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ')
      .filter(function (t) { return t.length > 2 && !PLUSREL_STOP[t]; })
      .map(function (t) {
        return (t.length > 4 && /s$/.test(t) && !/ss$/.test(t)) ? t.slice(0, -1) : t;
      });
  }

  function plusRelBuildIndex(posts) {
    var docs = posts.map(function (p) {
      var words = plusRelTokens(p.title);
      var tf = {};
      words.forEach(function (w) { tf[w] = (tf[w] || 0) + 1; });
      return {
        slug: p.slug || '', title: p.title || '', url: p.url || '', tf: tf,
        shows: p.shows || [], themes: p.themes || [], date: p.date || '', thumb: p.thumb || ''
      };
    });
    var n = docs.length, df = {};
    docs.forEach(function (d) { Object.keys(d.tf).forEach(function (w) { df[w] = (df[w] || 0) + 1; }); });
    docs.forEach(function (d) {
      var vec = {}, sum = 0;
      Object.keys(d.tf).forEach(function (w) {
        var val = d.tf[w] * (Math.log(n / (df[w] || 1)) + 1);
        vec[w] = val; sum += val * val;
      });
      d.vec = vec; d.norm = Math.sqrt(sum) || 1;
    });
    return docs;
  }

  function plusRelCosine(a, b) {
    var small = Object.keys(a.vec).length < Object.keys(b.vec).length ? a : b;
    var large = small === a ? b : a, dot = 0;
    Object.keys(small.vec).forEach(function (w) { if (large.vec[w]) dot += small.vec[w] * large.vec[w]; });
    return dot / (a.norm * b.norm);
  }

  function plusRelOverlap(a, b) {
    var seen = {};
    a.forEach(function (x) { seen[x] = 1; });
    return b.filter(function (x) { return seen[x]; }).length;
  }

  function plusRelRank(docs, slug) {
    var me = null;
    for (var i = 0; i < docs.length; i++) { if (docs[i].slug === slug) { me = docs[i]; break; } }
    if (!me) return [];
    var now = Date.now();
    var scored = [];
    docs.forEach(function (d) {
      /* A card with no artwork looks broken, same rule as the free side. */
      if (d === me || !d.thumb || !d.slug) return;
      var years = d.date ? Math.max(0, (now - new Date(d.date).getTime()) / (1000 * 86400 * 365)) : 5;
      var score = 10 * plusRelCosine(me, d)
        + 3 * plusRelOverlap(me.themes, d.themes)
        + 2 * plusRelOverlap(me.shows, d.shows)
        + Math.max(0, 0.5 - years * 0.08);
      if (score >= PLUSREL_FLOOR) scored.push({ doc: d, score: score });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, PLUSREL_MAX).map(function (x) { return x.doc; });
  }

  /* 102 of 108 titles end in "(PLUS)"; noise on a page that is already
     entirely Plus, same call as the /plus search box makes. Display only. */
  function plusRelCleanTitle(t) {
    return String(t || '').replace(/\s*\(\s*PLUS\s*\)\s*$/i, '').trim();
  }

  var PLUSREL_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  function plusRelMeta(d) {
    var when = '';
    if (d.date) {
      var parts = String(d.date).split('-');
      if (parts.length >= 2) when = PLUSREL_MONTHS[parseInt(parts[1], 10) - 1] + ' ' + parts[0];
    }
    var lead = (d.shows && d.shows[0]) || '';
    return [lead, when].filter(Boolean).join(' \u00b7 ');
  }

  /* (2026-10-28) The index carries live-domain addresses; keep a reader on
     this site (the head script adds the test address prefix on click). */
  function plusLocalHref(u) {
    var m = String(u || '').match(/^https?:\/\/(?:www\.)?innerversepodcast\.com(\/.*)$/);
    return m ? m[1] : (u || '');
  }

  function plusRelCard(d) {
    return '<a class="iv-related-card" href="' + esc(plusLocalHref(d.url)) + '">' +
        '<div class="iv-related-thumb"><img src="' + esc(ivImg(d.thumb, 500)) + '" alt="" loading="lazy"></div>' +
        '<div class="iv-related-body">' +
          '<div class="iv-related-meta">' + esc(plusRelMeta(d)) + '</div>' +
          '<div class="iv-related-title">' + esc(plusRelCleanTitle(d.title)) + '</div>' +
        '</div>' +
      '</a>';
  }

  /* Reuses .iv-related / .iv-section-label / .iv-section-title /
     .iv-section-rule / .iv-related-grid wholesale from the free page's
     stylesheet - same classes, so paintPlusYellow() picks up its blue
     rules automatically and recolors this section too, with no hand
     written yellow twin needed here. */
  function buildPlusRelated() {
    return '<div class="iv-related" id="iv-plus-related" style="display:none">' +
        '<div class="iv-section-label">Follow the thread</div>' +
        '<h2 class="iv-section-title">More episodes</h2>' +
        '<div class="iv-section-rule"></div>' +
        '<div class="iv-related-grid" id="iv-plus-related-grid"></div>' +
      '</div>';
  }

  var PLUSREL_INDEX_URL = 'https://raw.githubusercontent.com/chance-garton/innerverse-data/main/plus-index.json';
  function plusRelFetchAll() {
    var cached = null;
    try { cached = sessionStorage.getItem('iv_plus_rel_corpus'); } catch (e) {}
    if (cached) {
      try { return Promise.resolve(JSON.parse(cached)); } catch (e) {}
    }
    return fetch(PLUSREL_INDEX_URL)
      .then(function (r) { if (!r.ok) throw new Error('plus index ' + r.status); return r.json(); })
      .then(function (d) {
        var posts = (d && d.episodes) || [];
        try { sessionStorage.setItem('iv_plus_rel_corpus', JSON.stringify(posts)); } catch (e) {}
        return posts;
      });
  }

  /* Inserted as a normal full width sibling right after the two column
     grid (wrap) and before the comments heading, not as a grid row
     inside wrap - the full width grid row approach is exactly what
     broke the members' page layout once already for the dual sections
     (see iv-plus-dual-sections.md), so this avoids that shape of bug
     entirely by staying outside the grid. */
  function fillPlusRelated(afterEl, slug) {
    if (!afterEl || !afterEl.parentElement) return Promise.resolve();
    var holder = document.createElement('div');
    holder.innerHTML = buildPlusRelated();
    var section = holder.firstChild;
    afterEl.parentElement.insertBefore(section, afterEl.nextSibling);
    return plusRelFetchAll().then(function (posts) {
      var picks = plusRelRank(plusRelBuildIndex(posts), slug);
      if (picks.length < PLUSREL_MIN) {
        if (section.parentElement) section.parentElement.removeChild(section);
        return;
      }
      document.getElementById('iv-plus-related-grid').innerHTML = picks.map(plusRelCard).join('');
      section.style.display = '';
    }).catch(function (err) {
      console.warn('IV plus related episodes skipped:', err);
      if (section.parentElement) section.parentElement.removeChild(section);
    });
  }

  function renderPlus(plusSlug, onFail) {
    var done = function () { if (window.IVLoaderHide) window.IVLoaderHide(); };
    var fail = function () { done(); if (onFail) onFail(); };
    var wrap = document.querySelector('.blog-item-content-wrapper');
    var host = document.querySelector('.blog-item-content');
    if (!wrap || !host) { fail(); return; }

    function slugEq(s) { var v = s.replace(/'/g, "\\'"); return "OR({Slug}='" + v + "',{Plus Slug}='" + v + "')"; }
    var slugBase = plusSlug.replace(/-[a-z0-9]{5}$/i, '');
    var filter = encodeURIComponent(
      slugBase !== plusSlug ? ('OR(' + slugEq(plusSlug) + ',' + slugEq(slugBase) + ')') : slugEq(plusSlug)
    );

    ivEpisodeGet(plusSlug, 'filterByFormula=' + filter + '&maxRecords=4')
      .then(function (data) {
        var recs = data.records || [];
        var rec = recs.filter(function (x) { return (x.fields || {})['Slug'] === plusSlug; })[0] || recs.filter(function (x) { return (x.fields || {})['Plus Slug'] === plusSlug; })[0] || recs[0];
        if (!rec) { fail(); return; }
        var r = rec.fields;

        var f = {
          title: r['Title'] || '',
          topicLine: r['Topic Line'] || '',
          showCategory: (r['Show Categories'] || [])[0] ? (r['Show Categories'][0].name || r['Show Categories'][0]) : '',
          year: r['Year'] || '',
          episodeNumber: r['Episode Number'] || '',
          publishDate: r['Publish Date'] || '',
          /* Duration is the FREE cut's runtime. Showing it in the members'
             header understated the episode on every /plus page, by an hour
             on some (inner-whirled-6 reads 23m free against 2h 35m here),
             and 48 of the 103 members' rows have no free Duration at all so
             they showed nothing. Plus Duration carries the members' runtime
             and is populated on all 103; the fallback keeps a row without
             one rendering exactly as it did before. */
          duration: r['Plus Duration'] || r['Duration'] || '',
          thumbnail: r['Thumbnail URL'] || '',
          intro1: r['Intro Paragraph 1'] || '',
          intro2: r['Intro Paragraph 2'] || ''
        };
        /* A row with no title is a stub, and a stub header would replace
           a real Squarespace title with an empty one. */
        if (!f.title) { fail(); return; }

        paintPlusYellow();
        document.documentElement.classList.add('iv-plus-ep');
        /* iv-inner-whirled (2026-09-29): the show skin, as on the free page */
        if ((r['Show Categories'] || []).some(function (c) { return ((c && c.name) || c) === 'Inner Whirled'; })) document.documentElement.classList.add('iv-iw');
        keepVisible(wrap);

        /* ---------------- header ---------------- */
        var head = document.createElement('div');
        head.className = 'iv-plus-headslot';
        head.innerHTML = buildHeader(f, 'PLUS');
        wrap.insertBefore(head, wrap.firstChild);

        /* ---------------- legacy column grid ----------------
           Mark spacer-only columns so the stylesheet can drop them. */
        host.querySelectorAll('.sqs-row > .col').forEach(function (col) {
          if (!col.querySelector('.sqs-block:not(.sqs-block-spacer)')) {
            col.classList.add('iv-plus-emptycol');
          }
        });

        /* ---------------- video ----------------
           The Vimeo id comes from Airtable's "Plus Video URL", which is a
           different upload from both "Video URL" (the free YouTube cut)
           and "YouTube Plus URL" (the members' cut on YouTube). The id
           already on the page is the fallback, so a page whose row has
           not been filled in still gets the treatment.

           The eager iframe is REPLACED rather than covered: left in place
           it loads the whole player before the visitor asks for it. */
        var vimeo = vimeoId(r['Plus Video URL'] || '') || plusPageVimeoId();
        var plusAudioUrl = r['Plus Audio URL'] || '';
        var vblock = host.querySelector('.sqs-block-video');
        if (vimeo && vblock) {
          /* No Plus Audio URL on the row -> the exact original video-only
             re-skin below, untouched. Present -> the same Watch/Listen
             toggle the free pages use (buildMediaToggle + wireAudioPlayer,
             reused as-is), so an episode with no audio rendition yet
             behaves exactly as it did before this was added. */
          if (plusAudioUrl) {
            vblock.innerHTML = buildMediaToggle({
              videoUrl: 'https://vimeo.com/' + vimeo,
              thumbnail: f.thumbnail,
              title: f.title,
              acastAudioUrl: plusAudioUrl
            });
            wirePlusMediaTabs(vblock);
            wireAudioPlayer(vblock);
          } else {
            vblock.innerHTML =
              '<div class="iv-ratio" data-video-platform="vimeo" ' +
                'data-video-id="' + esc(vimeo) + '" ' +
                'data-video-src="https://player.vimeo.com/video/' + esc(vimeo) + '?autoplay=1">' +
                '<div class="iv-video-cover" style="background-image:url(&#39;' + esc(ivImg(f.thumbnail, 1000)) + '&#39;);">' +
                  '<button type="button" class="iv-video-play" aria-label="Play video">' + SVG.bigPlay + '</button>' +
                '</div>' +
              '</div>';
          }
          ivFitPlayerArm();
          /* The play listener is delegated from the document rather than
             bound to the cover. Squarespace re-initialises its own video
             blocks after this runs and does it by swapping in a copy of
             the node: our markup survives that, a listener bound to it
             does not. Confirmed on the live page - the cover rendered
             correctly and simply did nothing when clicked. Delegation
             also covers the toggle-wrapped markup above, since both
             share the same .iv-ratio/.iv-video-cover contract. */
          document.addEventListener('click', function (e) {
            var cover = (e.target && e.target.closest) ? e.target.closest('.iv-video-cover') : null;
            if (!cover) return;
            var box = cover.closest('.iv-ratio');
            if (!box) return;
            /* Through ivMountVideo first, so the Vimeo player API attaches
               and a chapter row can seek in place instead of rebuilding the
               iframe on every jump. The raw build below stays as the fallback
               for a page whose row has no id, where the id came off the page
               itself. */
            if (box.getAttribute('data-video-id') && ivMountVideo(box, 0)) return;
            var src = box.getAttribute('data-video-src');
            if (!src) return;
            var frame = document.createElement('iframe');
            frame.src = src;
            frame.title = 'Episode video player';
            frame.setAttribute('frameborder', '0');
            frame.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
            frame.setAttribute('allowfullscreen', '');
            box.innerHTML = '';
            box.appendChild(frame);
          });
        }

        /* ---------------- description ----------------
           Airtable's intro wins when there is one. The 46 rows added for
           /plus-only episodes carry no intro, so those pages keep the copy
           already written on them rather than losing it to a blank. */
        if (f.intro1) {
          var theirs = host.querySelectorAll('.sqs-block-html');
          theirs.forEach(function (b) { b.classList.add('iv-plus-hidden'); });
          var intro = document.createElement('div');
          intro.className = 'iv-plus-intro';
          intro.innerHTML = buildIntro(f);
          /* Dropped exactly where their description stood, not below the
             video: inner-whirled-26 carries a "download the show notes"
             button between the two, and anchoring to the video pushed
             that button underneath the copy it belongs above. */
          if (theirs.length && theirs[0].parentElement) {
            theirs[0].parentElement.insertBefore(intro, theirs[0]);
          } else if (vblock && vblock.parentElement) {
            vblock.parentElement.insertBefore(intro, vblock.nextSibling);
          } else {
            host.appendChild(intro);
          }
        }

        /* ---------------- Get Tuned ----------------
           2026-09-24: under the description in the content column, the
           same full-width card the free page carries, instead of squeezed
           into the sidebar where its tabs were never wired. */
        var tunedRow = document.createElement('div');
        tunedRow.className = 'iv-plus-book-row iv-plus-tuned-row';
        tunedRow.innerHTML = buildBookSession();
        var tunedIntro = host.querySelector('.iv-plus-intro');
        var tunedHtml = host.querySelectorAll('.sqs-block-html');
        var tunedAnchor = tunedIntro || (tunedHtml.length ? tunedHtml[tunedHtml.length - 1] : null) || vblock;
        if (tunedAnchor && tunedAnchor.parentElement) {
          tunedAnchor.parentElement.insertBefore(tunedRow, tunedAnchor.nextSibling);
        } else {
          host.appendChild(tunedRow);
        }
        wireTunedTabs(tunedRow);
        if (r['Has Show Notes'] === true) ivShowNotes(host, tunedRow, r['Plus Slug'] || r['Slug'] || plusSlug);   /* iv-show-notes */

        /* ---------------- two columns, the free page's way ----------------
           2026-09-24 evening (Chance: the free format on /plus, only the
           colours differ). The player keeps the full width on its own and
           the copy, Get Tuned and the sections sit in a main column with
           the guest and affiliate cards beside them, level with the
           description, exactly the free page's .iv-sticky-layout. The
           video block itself is NOT moved: several selectors here and in
           the audio handshake expect it inside .blog-item-content, so
           instead everything that follows it in its column (the intro, Get
           Tuned, any served block) moves into the main column, and the
           sections and sidebar are built into the same layout below. The
           old grid on .blog-item-content-wrapper is switched off by the
           iv-episode-2026 stylesheet on html.iv-2026 pages. */
        var layout = document.createElement('div');
        layout.className = 'iv-sticky-layout iv-plus-cols';
        var main = document.createElement('div');
        main.className = 'iv-sticky-main iv-plus-colmain';
        var side = document.createElement('div');
        side.className = 'iv-sticky-sidebar iv-plus-side';
        side.innerHTML = '<div id="iv-guest-slot"></div>' +
                         '<div id="iv-aff-slot"></div>';
        layout.appendChild(main);
        layout.appendChild(side);
        var moveFrom = vblock && vblock.parentElement ? vblock.nextSibling : null;
        var toMove = [];
        while (moveFrom) { toMove.push(moveFrom); moveFrom = moveFrom.nextSibling; }
        toMove.forEach(function (node) { main.appendChild(node); });
        host.appendChild(layout);

        /* ---------------- chapters, core themes, quotes ----------------
           Gated on the PLUS fields alone, so a page whose Plus content has
           not been built renders exactly as it does today. See the
           iv-plus-dual block above for why the free JSON is not enough to
           make a section appear.

           Appended INSIDE the content column, not as a grid item of its
           own. As a full width grid row they sat in row 3 beneath the
           sticky sidebar in row 2, and on a real members' page the content
           column is only the video plus the Airtable intro, so the taller
           sidebar set the height of row 2, opened a large empty gap under
           the copy, and ran the sections underneath the sidebar, covering
           the right hand end of every section head including the switch.
           In the content column the column simply grows and nothing
           overlaps, which is also how the free page carries these. */
        var plusChapters = parseJSONField(r['Plus Chapters JSON']);
        var plusThemes   = parseJSONField(r['Plus Core Themes JSON']);
        var plusQuotes   = parseJSONField(r['Plus Quotes JSON']);
        /* Free chapters come from a re-timed field and never from
           Chapters JSON, whose seeks belong to the free cut's own edit. */
        var freeChapters = parseJSONField(r['Plus Free Chapters JSON']);
        var freeThemes   = parseJSONField(r['Core Themes JSON']);
        var freeQuotes   = parseJSONField(r['Quotes JSON']);

        var dual = '';
        if (plusChapters.length) {
          dual += buildDualSection('chapters', 'iv-plus-chapters-acc', 'Chapters', 'In this episode',
            freeChapters.length ? plusChapterRows(freeChapters) : '',
            plusChapterRows(plusChapters));
        }
        if (plusThemes.length) {
          dual += buildDualSection('themes', 'iv-plus-themes-acc', 'Show notes', 'Core themes',
            freeThemes.length ? plusThemeItems(freeThemes, 1) : '',
            plusThemeItems(plusThemes, freeThemes.length + 1));
        }
        if (plusQuotes.length) {
          dual += buildDualSection('quotes', 'iv-plus-quotes-acc', 'Memorable', 'Quotes',
            freeQuotes.length ? plusQuoteCards(freeQuotes, f.title) : '',
            plusQuoteCards(plusQuotes, f.title));
        }
        var dualRoot = null;
        if (dual) {
          dualRoot = document.createElement('div');
          dualRoot.className = 'iv-plus-sections';
          dualRoot.innerHTML = dual;
          main.appendChild(dualRoot);
          wirePlusDual(dualRoot);
          wireAccordions(dualRoot);
          if (window.innerWidth > 700) {
            /* 2026-09-24e: chapters open, themes and quotes closed until clicked, as on the free page. */
            var plusChapAcc = dualRoot.querySelector('#iv-plus-chapters-acc');
            if (plusChapAcc) plusChapAcc.classList.add('iv-open');
          }
          wirePlusChapters(dualRoot);
          wireQuoteShare(dualRoot, window.location.href);
          backfillQuotePortraits(dualRoot, []);
        }

        /* ---------------- sidebar ----------------
           Built above as the layout's second column (the guest card and the
           affiliates card; Get Tuned sits in the main column since the
           afternoon save). */

        /* Re-fit on every height change, because the guest and affiliate
           cards arrive from a later request and their portraits load later
           still, and each one changes how far the column can travel. */
        fitPlusSide();
        window.addEventListener('resize', fitPlusSide);
        window.addEventListener('load', fitPlusSide);
        /* The observer is kept on window rather than dropped on the floor:
           an unreferenced ResizeObserver is not reliably retained, which is
           why the first version of this silently never re-fired and left a
           1788px column pinned at the 100px offset meant for a short one. */
        if (window.ResizeObserver) {
          window.__ivSideRO = new window.ResizeObserver(fitPlusSide);
          window.__ivSideRO.observe(side);
        }

        fillPlusRelated(wrap, plusSlug);

        /* ---------------- comments ----------------
           The prev/next pager below the comments walks the /plus
           collection in raw publish order and is the one piece of the
           old page that reads as unfinished, so it goes. */
        var comments = document.querySelector('.blog-item-comments');
        if (comments && comments.parentElement) {
          var ch = document.createElement('div');
          ch.className = 'iv-plus-comments-head';
          ch.innerHTML = buildCommentsHeading();
          comments.parentElement.insertBefore(ch, comments);
        }
        document.querySelectorAll('.item-pagination').forEach(function (p) {
          p.style.display = 'none';
        });

        /* ---------------- sidebar lookups ---------------- */
        var guestIds = linkedIds(r['Guests']).filter(function (id) { return id !== HOST_GUEST_ID; });
        guestIds.push(HOST_GUEST_ID);
        var affIds = linkedIds(r['Affiliates Shown']);
        var lookups = [];

        if (guestIds.length) {
          lookups.push(
            ivLinkedGet('_guestsById', null, guestIds)
              .then(function (gdata) {
                var byId = {};
                gdata.records.forEach(function (g) { byId[g.id] = g.fields; });
                var guests = guestIds.map(function (id) {
                  var gf = byId[id] || {};
                  return {
                    id: id,
                    name: gf['Name'] || '', portrait: gf['Portrait URL'] || '', role: gf['Role'] || '',
                    bio: gf['Bio'] || '', slug: gf['Guest Page Slug'] || '', website: gf['Website URL'] || '',
                    youtube: gf['YouTube URL'] || '', substack: gf['Substack URL'] || '',
                    books: gf['Books URL'] || '', socials: gf['Socials URL'] || ''
                  };
                }).filter(function (g) { return g.name; });
                document.getElementById('iv-guest-slot').outerHTML = buildGuestCard(guests);
                wireTabs(wrap, '.iv-guest-card', ['.iv-guest-tab-unit', '.iv-guest-tab-name'], '.iv-guest-panel', 'iv-guest-tab-active', 'iv-guest-panel-active');
                wireGuestNameFit(wrap);
                plusGuestLinks(wrap);
                /* A free Quotes JSON row may carry no portrait; the guest
                   records have one, so the faces arrive with this pass. */
                if (dualRoot) backfillQuotePortraits(dualRoot, guests);
              })
          );
        }

        if (affIds.length) {
          lookups.push(
            ivLinkedGet('_affiliatesById', null, affIds)
              .then(function (adata) {
                var byId = {};
                adata.records.forEach(function (a) { byId[a.id] = a.fields; });
                var affiliates = affIds.map(function (id) {
                  var af = byId[id] || {};
                  return {
                    name: af['Name'] || '', body: af['Body'] || '', offerLine: af['Offer Line'] || '',
                    primaryLabel: af['Primary Link Label'] || '', primaryUrl: af['Primary Link URL'] || '',
                    secondaryLabel: af['Secondary Link Label'] || '', secondaryUrl: af['Secondary Link URL'] || '',
                    note: af['Note'] || '', booksJson: af['Books JSON'] || ''
                  };
                });
                document.getElementById('iv-aff-slot').outerHTML = buildAffiliatesCard(affiliates);
                wireTabs(wrap, '.iv-affiliates-card', ['.iv-aff-tab'], '.iv-affiliates-panel', 'iv-aff-tab-active', 'iv-affiliates-panel-active');
              })
          );
        }

        /* The guest and affiliate cards are what make this column taller
           than the window, so the offset is recomputed once they are in,
           deterministically, rather than trusting the observer alone. */
        function settle() { fitPlusSide(); setTimeout(fitPlusSide, 400); if (window.ivInnerWhirled) window.ivInnerWhirled(); done(); }
        return Promise.all(lookups).then(settle, settle);
      })
      .catch(function (err) {
        console.error('IV plus render:', err);
        fail();
      });
  }
  /* (2026-10-28) Squarespace category pages go away with Squarespace, so the
     guest card's See all button goes to the /episodes guest filter, as it
     already did on every /plus page (they had no categories). */
  function plusGuestLinks(root) {
    root.querySelectorAll('.iv-guest-alllink').forEach(function (a) {
      if (isHostGuest(a.getAttribute('data-guest-id'), a.getAttribute('data-guest-name'))) return;
      a.href = '/episodes?guest=' + encodeURIComponent(a.getAttribute('data-guest-name') || '');
      a.innerHTML = 'See all ' + esc(a.getAttribute('data-guest-first') || '') + ' episodes' +
        '<span class="iv-guest-allcaret">&rarr;</span>';
      a.style.display = '';
    });
  }
  /* ===== END iv-plus-episode ===== */


  // ================================================================
  // MAIN
  // ================================================================

  /* Squarespace appends a five character collision suffix when a post is
     duplicated, so /episodes/great-chicago-fire-b78pp is the same episode
     as the Airtable slug great-chicago-fire. Ask for both spellings and
     prefer an exact match, so no post URL has to be renamed. */
  function slugEq(s) { return "{Slug}='" + s.replace(/'/g, "\\'") + "'"; }
  var slugBase = slug.replace(/-[a-z0-9]{5}$/i, '');
  var episodeFilter = encodeURIComponent(
    slugBase !== slug ? ('OR(' + slugEq(slug) + ',' + slugEq(slugBase) + ')') : slugEq(slug)
  );

  /* (2026-10-19) The page arrives built; hydrate() at the end of this file wires it. */


  /* ===== BEGIN iv-chapter-video-seek (2026-09-09) =====
     Chapter rows drive whichever player is open: video when Watch is
     selected, audio when Listen is. Appended rather than spliced in,
     so these declarations override the originals above by hoisting and
     the whole feature reverts by deleting this block.
     Rollback: remove everything between the BEGIN and END markers. */

  window.IV_EPISODE_BUILD = IV_BUILD;

  var IV_VIDEO = { player: null, platform: '', ready: false };
  var ivYtApiPromise = null, ivVimeoApiPromise = null;

  function ivLoadScriptOnce(src, isReady) {
    if (isReady()) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      if (!document.querySelector('script[data-iv-src="' + src + '"]')) {
        var s = document.createElement('script');
        s.src = src;
        s.setAttribute('data-iv-src', src);
        document.head.appendChild(s);
      }
      var tries = 0;
      (function poll() {
        if (isReady()) return resolve();
        if (++tries > 100) return reject(new Error('IV: timed out loading ' + src));
        setTimeout(poll, 100);
      })();
    });
  }

  function ivYtApi() {
    if (!ivYtApiPromise) {
      ivYtApiPromise = ivLoadScriptOnce('https://www.youtube.com/iframe_api', function () {
        return !!(window.YT && window.YT.Player);
      });
    }
    return ivYtApiPromise;
  }

  function ivVimeoApi() {
    if (!ivVimeoApiPromise) {
      ivVimeoApiPromise = ivLoadScriptOnce('https://player.vimeo.com/api/player.js', function () {
        return !!(window.Vimeo && window.Vimeo.Player);
      });
    }
    return ivVimeoApiPromise;
  }

  /* The nav is fixed, so a scroll target has to clear it. Measure the
     real nav element first: --header-height reads 0 at load and only
     corrects after a resize, so it is the fallback, not the source. */
  function ivNavHeight() {
    var nav = document.getElementById('iv-nav');
    if (nav && nav.offsetHeight) return nav.offsetHeight;
    var v = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10);
    return isNaN(v) ? 0 : v;
  }

  /* Video jumps bring the player back into view. Audio jumps deliberately
     do not: the reader is in the chapter list and moving them away from
     it would be an annoyance rather than a help. */
  function ivScrollToVideo(container) {
    var media = container.querySelector('.iv-media-toggle');
    if (!media) return;
    var top = media.getBoundingClientRect().top + window.pageYOffset - ivNavHeight() - 16;
    try { window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' }); }
    catch (e) { window.scrollTo(0, Math.max(0, top)); }
  }

  function ivPauseAudio(container) {
    var audio = (container || document).querySelector('.iv-audio-player audio');
    if (audio && !audio.paused) audio.pause();
  }

  /* Free pages pair the YouTube cut with the Acast mp3, and many Acast
     files open with an intro bumper the video does not have. Chapters are
     timed on the video clock. The audio tag carries the per-episode gap
     (Audio Offset Seconds) as data-audio-offset: audio = video + offset.
     /plus audio is cut from the same upload as its video, so it is 0. */
  function ivAudioOffset(audio) {
    return (audio && parseFloat(audio.getAttribute('data-audio-offset'))) || 0;
  }
  function ivVideoToAudio(audio, t) { return Math.max(0, (Number(t) || 0) + ivAudioOffset(audio)); }
  function ivAudioToVideo(audio, t) { return Math.max(0, (Number(t) || 0) - ivAudioOffset(audio)); }

  function ivPauseVideo() {
    try {
      if (IV_VIDEO.platform === 'youtube' && IV_VIDEO.player && IV_VIDEO.player.pauseVideo) {
        IV_VIDEO.player.pauseVideo();
      } else if (IV_VIDEO.platform === 'odysee') {
        var odf = document.getElementById('iv-video-iframe');
        if (odf) odf.src = odf.src;
      } else if (IV_VIDEO.platform === 'vimeo' && IV_VIDEO.player && IV_VIDEO.player.pause) {
        IV_VIDEO.player.pause();
      }
    } catch (e) { }
  }

  /* Custom PiP buttons for a cross-origin embed (Vimeo/YouTube) relay the
     request over postMessage into the video's own frame, which strips the
     "real user gesture" browser/PiP APIs require - confirmed hanging
     indefinitely on desktop Chrome with no error either side, while phones
     enter PiP through their own native video chrome instead. Gating the
     button to touch devices avoids shipping a control that quietly does
     nothing on desktop. */
  function ivIsTouchDevice() {
    try { return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0); } catch (e) { return false; }
  }

  /* Used by the Watch/Listen toggle to carry a timestamp across a switch:
     only YouTube and Vimeo expose a state/time API, so Odysee (no API)
     always reports not-playing and the toggle falls back to its old
     behaviour there. */
  function ivVideoState() {
    if (!IV_VIDEO.player || !IV_VIDEO.ready) return Promise.resolve({ playing: false, time: 0 });
    if (IV_VIDEO.platform === 'youtube') {
      try {
        var state = IV_VIDEO.player.getPlayerState ? IV_VIDEO.player.getPlayerState() : -1;
        var time = IV_VIDEO.player.getCurrentTime ? IV_VIDEO.player.getCurrentTime() : 0;
        return Promise.resolve({ playing: state === 1, time: time || 0 });
      } catch (e) { return Promise.resolve({ playing: false, time: 0 }); }
    }
    if (IV_VIDEO.platform === 'vimeo' && IV_VIDEO.player.getPaused && IV_VIDEO.player.getCurrentTime) {
      return Promise.all([
        IV_VIDEO.player.getPaused()['catch'](function () { return true; }),
        IV_VIDEO.player.getCurrentTime()['catch'](function () { return 0; })
      ]).then(function (r) { return { playing: !r[0], time: r[1] || 0 }; });
    }
    return Promise.resolve({ playing: false, time: 0 });
  }

  /* Builds the embed already seeked, so a chapter click on a video nobody
     has started does not flash the opening seconds before jumping. */
  function ivMountVideo(ratio, seconds) {
    if (!ratio) return false;
    var platform = ratio.getAttribute('data-video-platform');
    var id = ratio.getAttribute('data-video-id') || ratio.getAttribute('data-yt-id');
    if (!platform || !id) return false;
    var at = Math.max(0, Math.floor(seconds || 0));

    var src;
    if (platform === 'youtube') {
      src = 'https://www.youtube.com/embed/' + id +
            '?autoplay=1&rel=0&enablejsapi=1' +
            '&origin=' + encodeURIComponent(window.location.origin) +
            (at ? '&start=' + at : '');
    } else if (platform === 'vimeo') {
      src = 'https://player.vimeo.com/video/' + id + '?autoplay=1' + (at ? '#t=' + at + 's' : '');
    } else if (platform === 'odysee') {
      src = 'https://odysee.com/$/embed/' + id + '?autoplay=1' + (at ? '&t=' + at : '');
    } else {
      return false;
    }

    var iframe = document.createElement('iframe');
    iframe.id = 'iv-video-iframe';
    iframe.src = src;
    iframe.title = 'Episode video player';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    iframe.setAttribute('allowfullscreen', '');
    ratio.innerHTML = '';
    ratio.appendChild(iframe);

    IV_VIDEO.platform = platform;
    IV_VIDEO.player = null;
    IV_VIDEO.ready = false;
    if (window.__ivPipOnMount) window.__ivPipOnMount(null);

    if (platform === 'youtube') {
      ivYtApi().then(function () {
        IV_VIDEO.player = new window.YT.Player(iframe, {
          events: { onReady: function () { IV_VIDEO.ready = true; } }
        });
      })['catch'](function (e) { console.warn('IV: YouTube API unavailable', e); });
    } else if (platform === 'vimeo') {
      ivVimeoApi().then(function () {
        IV_VIDEO.player = new window.Vimeo.Player(iframe);
        IV_VIDEO.ready = true;
        if (window.__ivPipOnMount) window.__ivPipOnMount(IV_VIDEO.player);
      })['catch'](function (e) { console.warn('IV: Vimeo API unavailable', e); });
    }
    return true;
  }

  /* Three tiers, most precise first: the player API, a raw postMessage
     while the API is still loading, then a rebuild at the timestamp,
     which always works because it is just a fresh embed URL. */
  function ivVideoSeekPlay(ratio, seconds) {
    if (!ratio) return false;
    var at = Math.max(0, Math.floor(seconds || 0));
    var iframe = ratio.querySelector('iframe');
    if (!iframe) return ivMountVideo(ratio, at);

    if (IV_VIDEO.platform === 'youtube') {
      if (IV_VIDEO.ready && IV_VIDEO.player && IV_VIDEO.player.seekTo) {
        try {
          IV_VIDEO.player.seekTo(at, true);
          if (IV_VIDEO.player.playVideo) IV_VIDEO.player.playVideo();
          return true;
        } catch (e) { }
      }
      try {
        var w = iframe.contentWindow;
        w.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [at, true] }), '*');
        w.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
        return true;
      } catch (e) { }
      return ivMountVideo(ratio, at);
    }

    /* Odysee exposes no player API, so a chapter jump rebuilds the
       embed at the timestamp. $/embed honours ?t=SECONDS. */
    if (IV_VIDEO.platform === 'odysee') {
      return ivMountVideo(ratio, at);
    }

    if (IV_VIDEO.platform === 'vimeo') {
      if (IV_VIDEO.player && IV_VIDEO.player.setCurrentTime) {
        try {
          IV_VIDEO.player.setCurrentTime(at).then(function () {
            if (IV_VIDEO.player.play) IV_VIDEO.player.play();
          })['catch'](function () { });
          return true;
        } catch (e) { }
      }
      return ivMountVideo(ratio, at);
    }

    return false;
  }

  /* ---- overrides ---- */

  function buildMediaToggle(f) {
    var v = videoEmbed(f.videoUrl);
    return '' +
      '<div class="iv-media-toggle">' +
        '<div class="iv-toggle-btns">' +
          '<span class="iv2-seg">' +
          '<button type="button" class="iv-tbtn iv-tbtn-active" data-panel="watch">' + SVG.play + ' Watch</button>' +
          '<button type="button" class="iv-tbtn" data-panel="listen">' + SVG.listen + ' Listen</button>' +
          '</span>' +
          (f.fullChip || '') +
          '<button type="button" class="iv-pip-btn" id="iv-pip-btn" aria-label="Play in a floating window" title="Play in a floating window" style="display:none;">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"></rect><rect x="12" y="11" width="7" height="5" rx="1" fill="currentColor" stroke="none"></rect></svg>' +
            '<span>Window</span>' +
          '</button>' +
        '</div>' +
        '<div class="iv-toggle-panel iv-panel-watch" data-panel="watch">' +
          '<div class="iv-ratio" id="iv-video-ratio" data-yt-id="' + esc(v.platform === 'youtube' ? v.id : '') + '" data-video-id="' + esc(v.id) + '" data-video-src="' + esc(v.src) + '" data-video-platform="' + esc(v.platform) + '">' +
            '<div class="iv-video-cover" id="iv-video-cover" style="background-image:url(&#39;' + esc(ivImg(f.thumbnail, 1000)) + '&#39;);">' +
              '<button type="button" class="iv-video-play" id="iv-video-play-btn" aria-label="Play video">' + SVG.bigPlay + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="iv-toggle-panel iv-panel-listen" data-panel="listen" style="display:none;">' +
          '<div class="iv-audio-player">' +
            '<img class="iv-audio-thumb" src="' + esc(ivImg(f.thumbnail, 300)) + '" alt="">' +
            '<div class="iv-audio-body">' +
              '<div class="iv-audio-label">INNERVERSE PODCAST</div>' +
              '<div class="iv-audio-title">' + esc(f.title) + '</div>' +
              '<div class="iv-audio-controls">' +
                '<button type="button" class="iv-audio-play" id="iv-audio-play" aria-label="Play">' +
                  '<svg class="iv-audio-icon-play" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M8 5v14l11-7z"></path></svg>' +
                  '<svg class="iv-audio-icon-pause" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="display:none"><path d="M6 5h4v14H6zM14 5h4v14h-4z"></path></svg>' +
                '</button>' +
                '<input type="range" class="iv-audio-scrub" id="iv-audio-scrub" min="0" max="100" value="0" step="0.1">' +
                '<div class="iv-audio-time" id="iv-audio-time">0:00 / --:--</div>' +
                '<button type="button" class="iv-audio-vol-btn" id="iv-audio-vol-btn" aria-label="Mute">' +
                  '<svg id="iv-audio-vol-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2A4.5 4.5 0 0 0 14 7.97v8.05A4.5 4.5 0 0 0 16.5 12z"></path></svg>' +
                '</button>' +
                '<input type="range" class="iv-audio-volume" id="iv-audio-volume" min="0" max="1" step="0.01" value="1">' +
              '</div>' +
            '</div>' +
            '<audio id="iv-audio-el" preload="none" data-audio-offset="' + (Number(f.audioOffset) || 0) + '" src="' + esc(f.acastAudioUrl) + '"></audio>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function wireChapters(container) {
    var ratio = container.querySelector('.iv-ratio');
    container.querySelectorAll('.iv-chapter-row').forEach(function (row) {
      if (row.__ivWired) return;
      row.__ivWired = true;
      row.addEventListener('click', function (e) {
        e.preventDefault();
        var seconds = parseFloat(row.getAttribute('data-seek')) || 0;
        var watchBtn = container.querySelector('.iv-tbtn[data-panel="watch"]');
        var watching = !!(watchBtn && watchBtn.classList.contains('iv-tbtn-active'));
        var hasVideo = !!(ratio && (ratio.getAttribute('data-video-id') || ratio.getAttribute('data-yt-id')));

        if (watching && hasVideo) {
          ivPauseAudio(container);
          if (ivVideoSeekPlay(ratio, seconds)) { ivScrollToVideo(container); return; }
        }

        /* Everything else lands on the audio, including a Watch panel on
           an episode with no video. A dead chapter row is worse than one
           that quietly does the sensible thing. */
        if (window.__ivAudioSeekPlay) window.__ivAudioSeekPlay(seconds);
      });
    });
  }

  /* ===== BEGIN iv-video-pip =====
     "Picture-in-Picture" control under the Watch video. Vimeo only - its
     player API is the only one of the three video hosts on this site
     (YouTube, Vimeo, Odysee) that exposes a way for OUR code to trigger
     the browser's floating-window mode, so the button stays hidden until
     ivMountVideo confirms (via the live player object) that the video
     just mounted actually supports it. Never assumes; always asks.
     Rollback: delete this block, the ivMountVideo hook that calls
     window.__ivPipOnMount, and the .iv-pip-row markup in buildMediaToggle. */
  function ivPipSupportCheck(player) {
    if (!player || typeof player.getPictureInPicture !== 'function') return Promise.resolve(false);
    return player.getPictureInPicture().then(function () { return true; })['catch'](function () { return false; });
  }

  function wireVideoPip(container) {
    var btn = container.querySelector('.iv-pip-btn');
    if (!btn) return;

    function setActive(active) {
      btn.classList.toggle('iv-pip-active', !!active);
      var label = btn.querySelector('span');
      if (label) label.textContent = active ? 'Playing' : 'Window';
      btn.title = active ? 'Playing in a floating window' : 'Play in a floating window';
    }

    btn.addEventListener('click', function () {
      var player = IV_VIDEO.player;
      if (!player) return;
      if (btn.classList.contains('iv-pip-active')) {
        player.exitPictureInPicture()['catch'](function () {});
      } else {
        player.requestPictureInPicture()['catch'](function () {});
      }
    });

    /* Re-runs on every ivMountVideo call, since a rebuilt iframe (a new
       chapter jump, a platform switch) is a brand new player object with
       its own answer - never trust a previous video's yes/no. */
    window.__ivPipOnMount = function (player) {
      btn.style.display = 'none';
      setActive(false);
      if (!player || !ivIsTouchDevice()) return;
      ivPipSupportCheck(player).then(function (supported) {
        if (!supported || IV_VIDEO.player !== player) return;
        btn.style.display = '';
        player.on('enterpictureinpicture', function () { setActive(true); });
        player.on('leavepictureinpicture', function () { setActive(false); });
      });
    };
  }
  /* ===== END iv-video-pip ===== */

  function wireMediaToggle(container) {
    var btns = container.querySelectorAll('.iv-tbtn');
    var panels = container.querySelectorAll('.iv-toggle-panel');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var which = btn.getAttribute('data-panel');
        var audio = container.querySelector('.iv-audio-player audio');
        var ratio = container.querySelector('.iv-ratio');

        /* Carries a timestamp across the switch so a listener who flips
           tabs mid-episode does not lose their place - only when the side
           being left was actually playing, never on a first switch before
           anything has started. */
        function apply(resumeAt) {
          btns.forEach(function (b) { b.classList.toggle('iv-tbtn-active', b === btn); });
          panels.forEach(function (p) { p.style.display = (p.getAttribute('data-panel') === which) ? '' : 'none'; });
          if (which === 'watch') {
            ivPauseAudio(container);
            if (resumeAt != null && ratio) {
              if (ratio.querySelector('iframe')) ivVideoSeekPlay(ratio, resumeAt);
              else ivMountVideo(ratio, resumeAt);
            }
          } else {
            ivPauseVideo();
            if (resumeAt != null && audio) {
              audio.currentTime = ivVideoToAudio(audio, resumeAt);
              audio.play()['catch'](function () { });
            }
          }
        }

        if (which === 'watch') {
          if (audio && !audio.paused) apply(ivAudioToVideo(audio, audio.currentTime)); else apply(null);
        } else if (ratio && ratio.querySelector('iframe')) {
          ivVideoState().then(function (s) { apply(s.playing ? s.time : null); });
        } else {
          apply(null);
        }
      });
    });

    var cover = container.querySelector('.iv-video-cover');
    var ratio = container.querySelector('.iv-ratio');
    if (cover && ratio) {
      cover.addEventListener('click', function () {
        ivPauseAudio(container);
        ivMountVideo(ratio, 0);
      });
    }

    wireVideoPip(container);
  }

  function wireAudioPlayer(container) {
    var audio = container.querySelector('.iv-audio-player audio');
    if (!audio) return;
    var playBtn = container.querySelector('.iv-audio-play');
    var iconPlay = container.querySelector('.iv-audio-icon-play');
    var iconPause = container.querySelector('.iv-audio-icon-pause');
    var scrub = container.querySelector('.iv-audio-scrub');
    var timeEl = container.querySelector('.iv-audio-time');
    var volume = container.querySelector('.iv-audio-volume');
    var volBtn = container.querySelector('.iv-audio-vol-btn');

    function setPlayingUI(playing) {
      iconPlay.style.display = playing ? 'none' : '';
      iconPause.style.display = playing ? '' : 'none';
    }

    playBtn.addEventListener('click', function () {
      if (audio.paused) { ivPauseVideo(); audio.play(); } else { audio.pause(); }
    });
    audio.addEventListener('play', function () { setPlayingUI(true); });
    audio.addEventListener('pause', function () { setPlayingUI(false); });
    /* fmtTime turns an unknown duration into 0:00, which made the player
       advertise a zero length track until someone pressed play. Show a
       placeholder instead, and repaint on durationchange too, because on
       /plus the real src arrives later from iv-plus-audio-handshake. */
    function paintTime() {
      var known = isFinite(audio.duration) && audio.duration > 0;
      timeEl.textContent = fmtTime(audio.currentTime) + ' / ' + (known ? fmtTime(audio.duration) : '--:--');
    }
    audio.addEventListener('timeupdate', function () {
      if (audio.duration) scrub.value = (audio.currentTime / audio.duration) * 100;
      paintTime();
    });
    audio.addEventListener('loadedmetadata', paintTime);
    audio.addEventListener('durationchange', paintTime);
    paintTime();

    /* The tag ships preload="none" so the /plus handshake can strip the
       unsigned worker URL before anything fetches it, which is the whole
       point of that block. Once a src we are allowed to load is in place,
       ask for metadata so the duration is known before the first play. The
       observer covers /plus, where the signed URL is assigned after this
       function has already run. */
    function armPreload() {
      var src = audio.getAttribute('src') || '';
      if (!src) return;
      if (/workers\.dev\/audio\//.test(src) && src.indexOf('?') === -1) return;
      if (audio.getAttribute('preload') === 'metadata') return;
      audio.setAttribute('preload', 'metadata');
      try { audio.load(); } catch (e) {}
    }
    armPreload();
    if (window.MutationObserver) {
      new window.MutationObserver(armPreload).observe(audio, { attributes: true, attributeFilter: ['src'] });
    }
    scrub.addEventListener('input', function () {
      if (audio.duration) audio.currentTime = (scrub.value / 100) * audio.duration;
    });
    volume.addEventListener('input', function () {
      audio.volume = parseFloat(volume.value);
      audio.muted = false;
    });
    volBtn.addEventListener('click', function () { audio.muted = !audio.muted; });

    window.__ivAudioSeekPlay = function (seconds) {
      ivPauseVideo();
      var listenBtn = container.querySelector('.iv-tbtn[data-panel="listen"]');
      if (listenBtn && !listenBtn.classList.contains('iv-tbtn-active')) listenBtn.click();
      /* Chapter seeks arrive on the video clock. */
      function go() { audio.currentTime = ivVideoToAudio(audio, seconds); audio.play(); }
      if (audio.readyState >= 1) { go(); }
      else { audio.addEventListener('loadedmetadata', go, { once: true }); audio.load(); }
    };
  }

  /* ===== END iv-chapter-video-seek ===== */

  /* ===== BEGIN iv-plus-page (2026-10-28, stage 1b of the move off Squarespace) =====
     Takes the job ivPlusMemberfulUnlock did on the live site. There, a locked
     Squarespace post decided between the join screen and the members' page.
     Here the generator writes the join screen (and the public part of the
     episode under it) into the HTML, so this only decides when a member's page
     goes in front of it:
       - html.iv-plus-member already set by the head script (a member whose
         answer is cached): draw the members' page straight away. The
         stylesheet hides the join screen for them from the first paint.
       - a sign-in with no cached answer: site.js asks the Worker, sets
         html.iv-plus-member when entitled, and the watcher below draws it.
       - the Worker says a cached member is no longer entitled: site.js takes
         the class away and the page is reloaded, which shows the join screen.
     The members' video address comes from the episode's public data file, as
     now; the audio is signed by the Worker (iv-plus-audio-handshake below) and
     the show notes are fetched through it (iv-show-notes), exactly as now. */
  function ivPlusPage(st) {
    var html = document.documentElement;
    var inner = document.querySelector('.blog-item-inner-wrapper');
    var pub = document.getElementById('iv-plus-public');
    if (!inner || !pub || !st || !st.slug) return;
    var m = window.ivMembership;

    /* The log-in links come back to this very page. */
    if (m && m.loginUrl) {
      var back = m.loginUrl(window.location.href);
      pub.querySelectorAll('a[data-iv-login]').forEach(function (a) { a.setAttribute('href', back); });
    }
    wireTabs(pub, '.iv-guest-card', ['.iv-guest-tab-unit', '.iv-guest-tab-name'], '.iv-guest-panel', 'iv-guest-tab-active', 'iv-guest-panel-active');
    wireGuestNameFit(pub);

    var state = 'public';
    function signedIn() { return !!(m && m.getToken && m.getToken()); }
    function mount() {
      if (state !== 'public' || !signedIn() || !html.classList.contains('iv-plus-member')) return;
      state = 'member';
      html.classList.add('iv-plus-unlocked');
      var synthWrap = document.createElement('div');
      synthWrap.className = 'blog-item-content-wrapper';
      var synthHost = document.createElement('div');
      synthHost.className = 'blog-item-content';
      var vplaceholder = document.createElement('div');
      vplaceholder.className = 'sqs-block-video';
      synthHost.appendChild(vplaceholder);
      synthWrap.appendChild(synthHost);
      inner.insertBefore(synthWrap, pub);
      renderPlus(st.slug, function () {
        /* No data to draw from: put the join screen back rather than a blank page. */
        state = 'failed';
        if (synthWrap.parentNode) synthWrap.parentNode.removeChild(synthWrap);
        html.classList.remove('iv-plus-unlocked', 'iv-plus-ep');
        html.classList.add('iv-plus-nodata');
      });
      ivPlusAudioHandshake();
    }
    mount();
    if (window.MutationObserver) {
      new MutationObserver(function () {
        var member = html.classList.contains('iv-plus-member');
        if (member) mount();
        else if (state === 'member') { state = 'leaving'; window.location.reload(); }
      }).observe(html, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /* ===== BEGIN iv-plus-audio-handshake (2026-09-10, carried over 2026-10-28) =====
     The live FOOTER block of the same name, unchanged except that it is
     started by ivPlusPage() (so it runs on members' pages only) instead of
     testing location.pathname, which the test address prefixes.

     The R2 bucket holding members' audio is private, and the Worker gates
     /audio/<slug> on a short-lived play token in the query string. An
     <audio> tag cannot send an Authorization header, so the page trades the
     member's session token for a tokenised play URL first. "Plus Audio URL"
     holds the canonical, UNSIGNED worker URL; anything not on the worker's
     /audio/ path is left alone. */
  var ivPlusAudioStarted = false;
  function ivPlusAudioHandshake() {
    if (ivPlusAudioStarted) return;
    ivPlusAudioStarted = true;
    var WORKER = 'https://innerverse-plus.chance-5da.workers.dev';
    var AUDIO_PREFIX = WORKER + '/audio/';
    var TOKEN_KEY = 'iv_session_token';

    function sessionToken() {
      try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
    }

    /* Drop the Listen button and stay on Watch. Better a page that behaves
       like it did last week than a tab that silently plays nothing. */
    function dropListen(box, why) {
      var btn = box.querySelector('.iv-tbtn[data-panel="listen"]');
      var panel = box.querySelector('.iv-toggle-panel[data-panel="listen"]');
      if (panel) panel.remove();
      if (btn) btn.remove();
      var btns = box.querySelector('.iv-toggle-btns');
      if (btns && !btns.querySelector('.iv-tbtn[data-panel="listen"]')) {
        btns.classList.add('iv-toggle-btns-solo');
      }
      if (why) console.info('[iv-plus-audio] Listen hidden:', why);
    }

    function slugOf(src) {
      return decodeURIComponent(src.slice(AUDIO_PREFIX.length).split('?')[0]);
    }

    /* Trade the session token for a ~6h play URL. Resolves to a string, or
       null when this visitor is not entitled / the worker refuses. */
    function mint(slug) {
      var tok = sessionToken();
      if (!tok) return Promise.resolve(null);
      return fetch(WORKER + '/audio-link/' + encodeURIComponent(slug), {
        headers: { 'Authorization': 'Bearer ' + tok }
      }).then(function (res) {
        if (!res.ok) return null;
        return res.json();
      }).then(function (j) {
        return (j && j.url) ? j.url : null;
      })['catch'](function () { return null; });
    }

    function wire(audio) {
      var box = audio.closest('.iv-media-toggle');
      var raw = audio.getAttribute('src') || '';
      if (raw.indexOf(AUDIO_PREFIX) !== 0) return;   /* not ours, leave it */

      var slug = slugOf(raw);
      audio.removeAttribute('src');                  /* never let the unsigned URL be fetched */

      mint(slug).then(function (url) {
        if (!url) { if (box) dropListen(box, 'no session token or not entitled'); return; }
        audio.src = url;

        /* The play token outlives any realistic sitting, but a tab left open
           overnight would wake up to a 403. One silent re-mint on error, then
           resume from where the listener was. */
        var retried = false;
        audio.addEventListener('error', function () {
          if (retried) return;
          retried = true;
          var at = audio.currentTime || 0;
          var wasPlaying = !audio.paused;
          mint(slug).then(function (fresh) {
            if (!fresh) return;
            audio.src = fresh;
            audio.addEventListener('loadedmetadata', function once() {
              audio.removeEventListener('loadedmetadata', once);
              try { audio.currentTime = at; } catch (e) {}
              if (wasPlaying) audio.play()['catch'](function () {});
            });
          });
        });
      });
    }

    /* The render is async, so watch for the player rather than guessing a delay. */
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
    function scan() {
      document.querySelectorAll('.iv-audio-player audio').forEach(function (a) {
        if (seen ? seen.has(a) : a.__ivSeen) return;
        if (seen) seen.add(a); else a.__ivSeen = true;
        wire(a);
      });
    }
    scan();
    if (window.MutationObserver) new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
    var ticks = 0;
    var poll = setInterval(function () { scan(); if (++ticks > 40) clearInterval(poll); }, 250);
  }
  /* ===== END iv-plus-audio-handshake ===== */
  /* ===== END iv-plus-page ===== */

  /* ===== BEGIN iv-hydrate (2026-10-19, the move off Squarespace) =====
     The page now arrives finished: the generator in innerverse-site wrote
     every section into the HTML from the same episode data, with the same
     markup the builders above produce. Nothing is redrawn here; this only
     wires what needs a script, reading the few values it needs from the
     iv-page-data JSON the generator embeds. The builders above stay because
     the member-aware Plus card and the members' chapters card are redrawn
     with them when the member state changes. */
  function hydrate() {
    var root = document.getElementById('iv-episode-root');
    var dataEl = document.getElementById('iv-page-data');
    if (!dataEl) return;
    var st;
    try { st = JSON.parse(dataEl.textContent); } catch (e) { return; }
    if (st && st.kind === 'plus') { ivPlusPage(st); return; }   /* iv-plus-page (2026-10-28) */
    if (!root) return;
    var f = st.f || {};
    /* The generator wrote the chip as a flag; the builders want markup. */
    if (f.fullChip === true) f.fullChip = '';

    /* The generator writes the signed-out cards. A member whose answer is
       already cached (the head script set the class before first paint)
       gets the member cards before anything else runs. */
    if (ivIsPlusMember()) {
      var card = root.querySelector('.iv-plus-book-row > .iv-plus-cta');
      if (card) { var tmp = document.createElement('div'); tmp.innerHTML = buildPlusCard(f, true); card.parentNode.replaceChild(tmp.firstChild, card); }
      var locked = root.querySelector('.iv2-locked');
      if (locked) { var lt = document.createElement('div'); lt.innerHTML = buildLockedChapters(f, true); if (lt.firstChild) locked.parentNode.replaceChild(lt.firstChild, locked); }
    }

    wireMediaToggle(root);
    wireAudioPlayer(root);
    ivFitPlayerArm();
    wirePlusCardMemberState(root, f);
    wireTunedTabs(root);
    wireShareModal(root, st.shareUrl, f.title);
    wireChapters(root);
    wireAccordions(root);
    wireQuoteShare(root, st.shareUrl);
    backfillQuotePortraits(root, st.guests || []);
    wireTabs(root, '.iv-guest-card', ['.iv-guest-tab-unit', '.iv-guest-tab-name'], '.iv-guest-panel', 'iv-guest-tab-active', 'iv-guest-panel-active');
    wireGuestNameFit(root);
    wireTabs(root, '.iv-affiliates-card', ['.iv-aff-tab'], '.iv-affiliates-panel', 'iv-aff-tab-active', 'iv-affiliates-panel-active');
    if (window.ivInnerWhirled) window.ivInnerWhirled();

    /* ?t=SECONDS opens the video at that moment. The chapter links and the
       structured data's key moments both point here. */
    var t = NaN;
    try { t = parseFloat(new URLSearchParams(window.location.search).get('t')); } catch (e) {}
    if (isFinite(t) && t >= 0) {
      var ratio = root.querySelector('.iv-ratio');
      if (ratio && ratio.getAttribute('data-video-id')) ivMountVideo(ratio, t);
      else if (window.__ivAudioSeekPlay) window.__ivAudioSeekPlay(t);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hydrate);
  else hydrate();
  /* ===== END iv-hydrate ===== */
})();
