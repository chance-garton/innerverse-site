/* InnerVerse sitewide script (assets/site.js): the membership helper, the nav
   and footer wiring, and the Inner Whirled brand swap.

   Carried over on 2026-10-19 from three of the old site's Code Injection blocks:
   the core of iv-plus-membership (ivMembership: capture the sign-in the
   Worker hands back, ask the Worker who this is), iv-site-nav (now only the
   wiring: the nav and footer markup is written into every page by the
   generator), and the iv-inner-whirled script. What was old-site-only is
   gone: the native header hide, the Member Areas cookie and the paywalled
   post probe (membership is the Worker's answer alone, as it already was for
   every Memberful and Patreon member). */
(function () {
  'use strict';
  var SELF_SRC = (document.currentScript && document.currentScript.src) || '';

  /* ---------------- ivMembership ---------------- */
  var IV_WORKER_ORIGIN = 'https://innerverse-plus.chance-5da.workers.dev';
  var IV_SESSION_KEY = 'iv_session_token';

  function captureSessionFragment() {
    if (window.location.hash && window.location.hash.indexOf('#iv_session=') === 0) {
      var token = window.location.hash.slice('#iv_session='.length);
      try { window.localStorage.setItem(IV_SESSION_KEY, token); } catch (e) {}
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
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
        /* A lasting sign-in handed back for an older one (2026-10-19). */
        if (data && data.renew) { try { window.localStorage.setItem(IV_SESSION_KEY, data.renew); } catch (e) {} }
        try {
          if (data && data.entitled) window.localStorage.setItem('iv_plus_entitled', 'yes');
          else window.localStorage.removeItem('iv_plus_entitled');
          if (data && data.email) window.localStorage.setItem('iv_plus_email', data.email);
          if (data && data.name) window.localStorage.setItem('iv_plus_name', data.name);
          if (data && data.source) window.localStorage.setItem('iv_plus_source', data.source);
        } catch (e) {}
        cb(data);
      })
      .catch(function () { cb({ signedIn: false, entitled: false }); });
  }
  function logout() {
    ['iv_session_token', 'iv_plus_entitled', 'iv_plus_email', 'iv_plus_name', 'iv_plus_source', 'iv_circle_face', 'iv_circle_face_key', 'iv_circle_face_at'].forEach(function (k) {
      try { window.localStorage.removeItem(k); } catch (e) {}
    });
  }
  captureSessionFragment();
  window.ivMembership = {
    getToken: getToken, loginUrl: loginUrl, checkStatus: checkStatus, logout: logout,
    get accountUrl() {
      var src = null;
      try { src = window.localStorage.getItem('iv_plus_source'); } catch (e) {}
      return src === 'patreon' ? 'https://www.patreon.com/settings/memberships' : 'https://innerverseplus.memberful.com/account';
    }
  };

  /* ---------------- nav ---------------- */
  /* Copied images load from R2 (image move, stage 3); anything else as before. */
  var ivR2 = function (u) { return (window.ivImgR2 && window.ivImgR2(u)) || u; }
  var LOGO_URL = ivR2('https://images.innerversepodcast.com/sq/9a710a85-f780-4b67-a4c7-2b45690b6006/2025-electric-logo-2026/w300.webp');
  var IV_PLUS_LOGO = ivR2('https://images.innerversepodcast.com/sq/c3607ade-e087-4b27-af0f-e0913f4dc3d0/plus-asset/w300.webp');

  function syncHeaderHeightVar(nav) {
    document.documentElement.style.setProperty('--header-height', nav.offsetHeight + 'px');
  }

  function lsGet(k) { try { return window.localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { if (v) window.localStorage.setItem(k, v); else window.localStorage.removeItem(k); } catch (e) {} }

  /* Signed in, the header shows a round picture and no word (2026-11-25): the
     word "Account" is kept for screen readers and for the phone menu, where
     the row reads as the member's name. */
  function ivSyncLoginState(nav, who) {
    var signedIn = !!getToken();
    var name = String((who && who.name) || lsGet('iv_plus_name') || '').trim();
    nav.querySelectorAll('.iv-nav-login').forEach(function (btn) {
      var label = btn.querySelector('.iv-nav-login-label');
      var wrap = btn.closest('.iv-nav-account-wrap');
      var inPanel = !!btn.closest('.iv-nav-mobile-panel');
      if (!label) return;
      if (signedIn) {
        label.textContent = name || 'Account';
        btn.classList.add('iv-nav-signedin');
        if (wrap) wrap.classList.add('iv-nav-signed');
        btn.removeAttribute('title');
        btn.setAttribute('aria-label', inPanel ? 'Membership settings' + (name ? ', ' + name : '') : 'Your account' + (name ? ', ' + name : ''));
        if (!inPanel) { btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', wrap && wrap.classList.contains('iv-nav-account-open') ? 'true' : 'false'); }
      } else {
        label.textContent = 'Log in';
        btn.classList.remove('iv-nav-signedin');
        if (wrap) wrap.classList.remove('iv-nav-signed');
        btn.removeAttribute('title'); btn.removeAttribute('aria-haspopup'); btn.removeAttribute('aria-expanded');
        btn.setAttribute('aria-label', 'Log in');
      }
    });
    nav.querySelectorAll('.iv-nav-account-name').forEach(function (n) {
      n.textContent = signedIn ? (name || String((who && who.email) || lsGet('iv_plus_email') || '')) : '';
    });
  }

  /* The picture is the member's Inner Circle photo when they have set one,
     otherwise their initials (Chance Garton reads CG). 2026-11-25: this
     replaces the Gravatar lookup, so no outside service is asked about a
     member's email any more. The chat photo is kept on this device as a
     small copy, so later pages paint it at once without asking again. */
  function ivInitials(name, email) {
    var parts = String(name || '').replace(/[^A-Za-z0-9À-ɏ\s'-]/g, ' ').trim().split(/\s+/).filter(Boolean);
    var out = '';
    if (parts.length >= 2) out = parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
    else if (parts.length === 1) out = parts[0].charAt(0);
    else out = String(email || '').trim().charAt(0);
    return out.toUpperCase() || '?';
  }
  function ivPaintAvatar(nav, who) {
    var name = String((who && who.name) || lsGet('iv_plus_name') || ''), email = String((who && who.email) || lsGet('iv_plus_email') || '');
    var face = lsGet('iv_circle_face');
    var key = face ? 'img:' + face.length : 'ini:' + ivInitials(name, email);
    nav.querySelectorAll('.iv-nav-face').forEach(function (slot) {
      if (slot.getAttribute('data-iv-av') === key) return;
      slot.setAttribute('data-iv-av', key);
      var node;
      if (face) { node = document.createElement('img'); node.src = face; node.alt = ''; node.decoding = 'async'; }
      else { node = document.createElement('span'); node.textContent = ivInitials(name, email); node.setAttribute('aria-hidden', 'true'); }
      node.className = 'iv-nav-avatar';
      slot.innerHTML = '';
      slot.appendChild(node);
    });
  }
  /* The chat server answers /api/me with the member's own chat name and
     picture. CHAT_FACE stays off until that answer is live on the server
     (claude/RUN-inner-circle.md); with it off the header shows initials.
     Asked at most twice a day; a photo is fetched only when it changed. */
  var CIRCLE_API = 'https://innerverse-circle.chance-5da.workers.dev';
  var CHAT_FACE = false;
  function ivShrinkFace(blob) {
    return new Promise(function (resolve, reject) {
      var u = URL.createObjectURL(blob), im = new Image();
      im.onload = function () {
        try {
          var S = 96, c = document.createElement('canvas'); c.width = S; c.height = S;
          var side = Math.min(im.naturalWidth, im.naturalHeight);
          c.getContext('2d').drawImage(im, (im.naturalWidth - side) / 2, (im.naturalHeight - side) / 2, side, side, 0, 0, S, S);
          var out = c.toDataURL('image/webp', 0.82);
          if (out.indexOf('data:image/webp') !== 0) out = c.toDataURL('image/jpeg', 0.82);
          resolve(out);
        } catch (e) { reject(e); } finally { URL.revokeObjectURL(u); }
      };
      im.onerror = function () { URL.revokeObjectURL(u); reject(new Error('image')); };
      im.src = u;
    });
  }
  function ivRefreshFace(nav, who) {
    var token = getToken();
    if (!CHAT_FACE || !token || !(who && who.entitled) || !window.fetch) return;
    var last = parseInt(lsGet('iv_circle_face_at'), 10) || 0;
    if (Date.now() - last < 12 * 3600 * 1000) return;
    lsSet('iv_circle_face_at', String(Date.now()));
    var auth = { headers: { Authorization: 'Bearer ' + token } };
    fetch(CIRCLE_API + '/api/me', auth).then(function (r) { return r.ok ? r.json() : null; }).then(function (me) {
      if (!me) return;
      var av = String(me.avatar || ''), k = av.indexOf('img:') === 0 ? av.slice(4) : '';
      if (!k) { lsSet('iv_circle_face', ''); lsSet('iv_circle_face_key', ''); ivPaintAvatar(nav, who); return; }
      if (k === lsGet('iv_circle_face_key') && lsGet('iv_circle_face')) return;
      return fetch(CIRCLE_API + '/media/' + k, auth).then(function (r) { return r.ok ? r.blob() : null; }).then(function (b) {
        return b ? ivShrinkFace(b) : '';
      }).then(function (data) {
        if (!data) return;
        lsSet('iv_circle_face', data); lsSet('iv_circle_face_key', k);
        ivPaintAvatar(nav, who);
      });
    })['catch'](function () {});
  }

  function isIW() { return document.documentElement.classList.contains('iv-iw'); }

  function ivApplyPlusBranding() {
    document.documentElement.classList.add('iv-plus-member');
    if (isIW()) return;   /* the Inner Whirled mark stays on its own pages */
    document.querySelectorAll('.iv-nav-logo').forEach(function (img) {
      if (img.getAttribute('data-iv-plus') === '1') return;
      img.setAttribute('data-iv-plus', '1');
      img.setAttribute('data-iv-logo-original', img.getAttribute('src') || '');
      img.setAttribute('alt', 'InnerVerse Plus');
      img.src = IV_PLUS_LOGO;
    });
  }
  function ivRevertPlusBranding() {
    document.documentElement.classList.remove('iv-plus-member');
    document.querySelectorAll('.iv-nav-logo[data-iv-plus="1"]').forEach(function (img) {
      img.removeAttribute('data-iv-plus');
      img.setAttribute('alt', 'InnerVerse');
      img.src = img.getAttribute('data-iv-logo-original') || LOGO_URL;
    });
  }

  function ivOpenAccount() { window.location.href = window.ivMembership.accountUrl; }
  function ivDoLogout() { logout(); window.location.reload(); }

  function wireLogin(nav) {
    function setOpen(wrap, on) {
      wrap.classList.toggle('iv-nav-account-open', on);
      var b = wrap.querySelector('.iv-nav-login');
      if (b && b.hasAttribute('aria-haspopup')) b.setAttribute('aria-expanded', on ? 'true' : 'false');
    }
    nav.querySelectorAll('.iv-nav-login').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var wrap = btn.closest('.iv-nav-account-wrap');
        if (!getToken()) { window.location.href = loginUrl(); return; }
        /* In the phone menu the row goes straight to the membership settings;
           on the bar the picture opens and closes its menu. */
        if (btn.closest('.iv-nav-mobile-panel') || !wrap) { ivOpenAccount(); return; }
        e.preventDefault();
        setOpen(wrap, !wrap.classList.contains('iv-nav-account-open'));
      });
    });
    nav.querySelectorAll('.iv-nav-account-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        if (item.getAttribute('data-act') === 'logout') { ivDoLogout(); return; }
        ivOpenAccount();
      });
    });
    function closeAll(except) {
      nav.querySelectorAll('.iv-nav-account-wrap.iv-nav-account-open').forEach(function (w) {
        if (!except || !w.contains(except)) setOpen(w, false);
      });
    }
    document.addEventListener('click', function (e) { closeAll(e.target); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var openWrap = nav.querySelector('.iv-nav-account-wrap.iv-nav-account-open');
      if (!openWrap) return;
      closeAll(null);
      var b = openWrap.querySelector('.iv-nav-login'); if (b) b.blur();
    });
    ivSyncLoginState(nav);
    if (document.documentElement.classList.contains('iv-plus-member')) ivApplyPlusBranding();
    if (getToken()) {
      ivPaintAvatar(nav, null);   /* from what this device already knows, so no blank frame */
      checkStatus(function (status) {
        if (status && status.entitled) ivApplyPlusBranding(); else ivRevertPlusBranding();
        ivSyncLoginState(nav, status);
        if (status && status.signedIn) { ivPaintAvatar(nav, status); ivRefreshFace(nav, status); }
      });
    }
  }

  function wireBurger(nav) {
    var btn = nav.querySelector('.iv-nav-burger');
    var panel = nav.querySelector('.iv-nav-mobile-panel');
    if (!btn || !panel) return;
    btn.addEventListener('click', function () {
      if (window.ivNavSearch) window.ivNavSearch.close(false);
      var open = nav.classList.toggle('iv-nav-menu-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    panel.querySelectorAll('a, button').forEach(function (el) {
      el.addEventListener('click', function () { nav.classList.remove('iv-nav-menu-open'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Open menu'); });
    });
  }

  /* ---------------- search ----------------
     2026-11-25 (Chance): the magnifier opens a search that drops from the
     header on every page, in place of a trip to /episodes. It searches the
     archive that fits the person: the members' catalogue (plus-index.json,
     every full episode plus the free shows listed on /plus) for a Plus+
     member, the free archive (episodes-index.json) for everyone else. The
     ranking is the shared scorer (window.ivSubjects in archive.js, loaded
     here only when the search is first opened), so the results and the
     count match the archive page that "See all" leads to. On the archive
     page itself the magnifier puts the cursor in the page's own search. */
  var DATA = 'https://raw.githubusercontent.com/chance-garton/innerverse-data/main/';
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var ARROW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>';
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  /* No em or en dashes ever reach the page, whatever the data says. */
  function noDash(s) { return String(s == null ? '' : s).replace(/\s*[\u2013\u2014]\s*/g, ', '); }
  function getJSON(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }); }

  function wireSearch(nav) {
    var btn = nav.querySelector('.iv-nav-search'), panel = nav.querySelector('.iv-nav-sp');
    if (!btn || !panel || !window.fetch) return;
    var box = panel.querySelector('.iv-nav-sp-box'), input = panel.querySelector('.iv-nav-sp-input');
    var listEl = panel.querySelector('.iv-nav-sp-list'), closeBtn = panel.querySelector('.iv-nav-sp-close');
    var isOpen = false, mode = 'free', lists = {}, asked = {}, extraRaw = null, extraAsked = false, extraFor = {};
    var scorerAsked = false, rows = [], hl = -1, timer = null;

    function member() { return document.documentElement.classList.contains('iv-plus-member'); }
    function herePath() { return (window.ivPath ? window.ivPath() : window.location.pathname).replace(/\/+$/, '').toLowerCase(); }
    function allHref(q) { return (mode === 'plus' ? '/plus' : '/episodes') + (q ? '?q=' + encodeURIComponent(q) : ''); }
    function relUrl(u, fallback) { try { var x = new URL(u, window.location.origin); return x.pathname + x.search; } catch (e) { return fallback; } }
    function showOf(e) {
      var s = (e.shows || [])[0] || 'InnerVerse';
      if (/^innerverse$/i.test(s)) s = 'InnerVerse';
      return s === 'Chance Guest Spots' ? 'Chance on Other Podcasts' : s;
    }
    function monthYear(d) { var p = String(d || '').split('-'); return p.length >= 2 && MONTHS[+p[1] - 1] ? MONTHS[+p[1] - 1] + ' ' + p[0] : ''; }
    function byNewest(a, b) { var x = a.date || '', y = b.date || ''; return x < y ? 1 : x > y ? -1 : 0; }

    function loadList(m) {
      if (asked[m]) return asked[m];
      asked[m] = getJSON(DATA + (m === 'plus' ? 'plus-index.json' : 'episodes-index.json')).then(function (d) {
        var list = ((d && d.episodes) || []).map(function (e) {
          var o = {}; for (var k in e) o[k] = e[k];
          if (m === 'plus') {
            o.title = String(o.title || '').replace(/\s*\(PLUS\)\s*$/i, '');
            o.__href = relUrl(o.url, '/plus/' + encodeURIComponent(o.slug));
            o.__full = /\/plus\//.test(o.url || '');
            o.duration = o.plusDuration || o.duration || '';
          } else {
            var p = window.ivPremiere && window.ivPremiere(o.slug);
            if (p && p.date) o.date = p.date;
            o.__href = o.url ? relUrl(o.url, '/episodes/' + encodeURIComponent(o.slug)) : '/episodes/' + encodeURIComponent(o.slug);
          }
          if (!o.year && o.date) o.year = parseInt(String(o.date).slice(0, 4), 10) || undefined;
          return o;
        });
        lists[m] = list;
        if (m === 'free') applyTopics();
        return list;
      })['catch'](function () { asked[m] = null; return []; });
      return asked[m];
    }
    function loadScorer() {
      if (window.ivSubjects || scorerAsked) return;
      scorerAsked = true;
      var src = SELF_SRC && /site\.js/.test(SELF_SRC) ? SELF_SRC.replace(/site\.js/, 'archive.js') : (window.IV_BASE || '') + '/assets/archive.js';
      var sc = document.createElement('script');
      sc.src = src; sc.async = true;
      sc.onload = function () { if (isOpen) render(); };
      document.head.appendChild(sc);
    }
    /* The free index carries no topic lines (the members' one does), and the archive page ranks on them,
       so they are read from the same file it uses; otherwise the count here could fall short of the page's. */
    var topics = null;
    function applyTopics() {
      if (!topics || !lists.free) return;
      lists.free.forEach(function (e) { if (!e.topicLine && topics[e.slug]) { e.topicLine = topics[e.slug]; delete e.__doc; } });
    }
    /* Chapter, theme and quote mentions (a large file, cached for a year): asked for once somebody types. */
    function loadExtra() {
      if (mode === 'free' && !topics) {
        topics = {};
        getJSON(DATA + 'episodes/_corpus.json').then(function (d) {
          ((d && d.records) || []).forEach(function (r) { var f = r.fields || {}; if (f.Slug && f['Topic Line']) topics[f.Slug] = f['Topic Line']; });
          applyTopics();
          if (isOpen) render();
        })['catch'](function () {});
      }
      if (extraAsked) return;
      extraAsked = true;
      (window.IV_EXTRA ? getJSON(window.IV_EXTRA) : Promise.reject())['catch'](function () { return getJSON(DATA + 'episodes-extra.json'); }).then(function (d) {
        extraRaw = (d && d.extra) || null;
        if (isOpen) render();
      })['catch'](function () {});
    }
    /* The mentions are keyed by the free page's slug. The members' list gets a copy that also answers to
       its own slugs, and keeps every free key so the archive page's own search is never left short. */
    function extraOf(m) {
      if (!extraRaw) return null;
      if (m !== 'plus') return extraRaw;
      if (extraFor.plus) return extraFor.plus;
      var out = {}, k;
      for (k in extraRaw) out[k] = extraRaw[k];
      (lists.plus || []).forEach(function (e) { if (e.freeSlug && e.freeSlug !== e.slug && extraRaw[e.freeSlug] && !out[e.slug]) out[e.slug] = extraRaw[e.freeSlug]; });
      extraFor.plus = out;
      return out;
    }
    function find(q) {
      var list = lists[mode] || [], s = window.ivSubjects;
      if (s && s.filter) return s.filter(list, extraOf(mode), q, {}, '', 'best');
      var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      return list.filter(function (e) {
        var h = (e.title + ' ' + (e.guests || []).join(' ') + ' ' + (e.topics || []).join(' ') + ' ' + (e.shows || []).join(' ') + ' ' + (e.tags || []).join(' ') + ' ' + (e.topicLine || '')).toLowerCase();
        e.__why = ''; e.__close = false;
        return terms.every(function (t) { return h.indexOf(t) !== -1; });
      }).sort(byNewest);
    }
    function rowHtml(e, withWhy) {
      var thumb = e.thumb ? (window.ivImg ? window.ivImg(e.thumb, 300) : e.thumb) : '';
      var img = thumb ? '<img src="' + escHtml(thumb) + '" alt="" loading="lazy" decoding="async">' : '<span class="iv-nav-sp-noimg"></span>';
      var why = withWhy ? String(e.__why || '').split(' \u00b7 ')[0] : (e.duration || '');
      var meta = [showOf(e), monthYear(e.date), noDash(why)].filter(Boolean).join(' \u00b7 ');
      return '<a class="iv-nav-sp-row" role="option" href="' + escHtml(e.__href) + '">' + img +
        '<span class="iv-nav-sp-text"><span class="iv-nav-sp-title">' + escHtml(noDash(e.title)) + '</span>' +
        '<span class="iv-nav-sp-meta">' + escHtml(meta) + '</span></span></a>';
    }
    function setHl(i) {
      hl = i;
      rows.forEach(function (r, k) { r.classList.toggle('iv-nav-sp-hl', k === i); r.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      if (rows[i] && rows[i].scrollIntoView) rows[i].scrollIntoView({ block: 'nearest' });
    }
    function render() {
      var q = input.value.trim(), list = lists[mode], html = '';
      if (!list) { listEl.innerHTML = ''; rows = []; hl = -1; return; }
      if (q.length < 2) {
        /* Before a search: the three newest, so the panel is a quick way to the latest. */
        var newest = (mode === 'plus' ? list.filter(function (e) { return e.__full; }) : list.slice()).sort(byNewest).slice(0, 3);
        if (newest.length) html = '<div class="iv-nav-sp-head">' + (mode === 'plus' ? 'Newest full episodes' : 'Newest episodes') + '</div>' + newest.map(function (e) { return rowHtml(e, false); }).join('');
      } else {
        var found = find(q), hits = found.filter(function (e) { return !e.__close; });
        var show = (hits.length ? hits : found).slice(0, 5);
        if (!hits.length && show.length) html += '<div class="iv-nav-sp-head">Close matches</div>';
        html += show.map(function (e) { return rowHtml(e, true); }).join('');
        if (!found.length) html = '<div class="iv-nav-sp-none">Nothing matched. Try a guest, a subject or a single word.</div>';
        html += '<a class="iv-nav-sp-all" role="option" href="' + escHtml(allHref(hits.length ? q : '')) + '"><span>' +
          (hits.length ? 'See ' + (hits.length === 1 ? 'the 1 result' : 'all ' + hits.length + ' results') + ' in ' + (mode === 'plus' ? 'Plus+ Episodes' : 'the archive')
            : (mode === 'plus' ? 'Browse Plus+ Episodes' : 'Browse the archive')) + '</span>' + ARROW + '</a>';
      }
      listEl.innerHTML = html;
      rows = Array.prototype.slice.call(listEl.querySelectorAll('a'));
      hl = -1;
      input.setAttribute('aria-expanded', rows.length ? 'true' : 'false');
    }
    function open() {
      mode = member() ? 'plus' : 'free';
      /* The archive this would search has its own search on the page: use that one. */
      var own = document.getElementById('iva-q'), p = herePath();
      if (own && ((mode === 'plus' && p === '/plus') || (mode === 'free' && p === '/episodes'))) {
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
        try { own.focus({ preventScroll: true }); } catch (e) { own.focus(); }
        return;
      }
      if (isOpen) { input.focus(); return; }
      isOpen = true;
      nav.classList.remove('iv-nav-menu-open');
      var burger = nav.querySelector('.iv-nav-burger'); if (burger) burger.setAttribute('aria-expanded', 'false');
      panel.hidden = false;
      nav.classList.add('iv-nav-search-open');
      btn.setAttribute('aria-expanded', 'true');
      input.setAttribute('aria-label', mode === 'plus' ? 'Search Plus+ Episodes' : 'Search episodes');
      input.focus();
      input.select();
      loadScorer();
      loadList(mode).then(function () { if (isOpen) render(); });
      if (input.value.trim().length >= 2) loadExtra();
    }
    function close(refocus) {
      if (!isOpen) return;
      isOpen = false;
      panel.hidden = true;
      nav.classList.remove('iv-nav-search-open');
      btn.setAttribute('aria-expanded', 'false');
      if (refocus) btn.focus();
    }
    window.ivNavSearch = { open: open, close: close };

    btn.addEventListener('click', function (e) { e.preventDefault(); if (isOpen) close(false); else open(); });
    btn.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); if (isOpen) close(false); else open(); } });
    closeBtn.addEventListener('click', function () { close(true); });
    /* a click on the dimmed page closes it; a click inside the box does not */
    panel.addEventListener('click', function (e) { if (!box.contains(e.target)) close(false); });
    document.addEventListener('click', function (e) {
      if (isOpen && !panel.contains(e.target) && !btn.contains(e.target)) close(false);
    });
    input.addEventListener('input', function () {
      if (input.value.trim().length >= 2) loadExtra();
      clearTimeout(timer);
      timer = setTimeout(render, 110);
    });
    input.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowUp') {
        if (!rows.length) return;
        e.preventDefault();
        setHl(k === 'ArrowDown' ? (hl + 1) % rows.length : (hl <= 0 ? rows.length - 1 : hl - 1));
      } else if (k === 'Enter') {
        e.preventDefault();
        if (hl >= 0 && rows[hl]) { window.location.href = rows[hl].getAttribute('href'); return; }
        var q = input.value.trim();
        window.location.href = allHref(q);
      } else if (k === 'Escape') {
        e.preventDefault();
        close(true);
      }
    });
    /* "/" (or Ctrl or Cmd K) opens the search from anywhere outside a text field. */
    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented) return;
      var t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''));
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey) && !e.altKey) { e.preventDefault(); open(); return; }
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); open(); return; }
      if (e.key === 'Escape' && isOpen) close(true);
    });
    /* signing in or out on another tab changes which archive this searches */
    if (window.MutationObserver) {
      new MutationObserver(function () {
        if (!isOpen) return;
        var m = member() ? 'plus' : 'free';
        if (m !== mode) { mode = m; loadList(mode).then(function () { if (isOpen) render(); }); }
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function wireScroll(nav) {
    function onScroll() {
      var was = nav.classList.contains('iv-nav-scrolled');
      var is = window.scrollY > 40;
      if (was !== is) {
        nav.classList.toggle('iv-nav-scrolled', is);
        setTimeout(function () { syncHeaderHeightVar(nav); }, 320);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { syncHeaderHeightVar(nav); }, { passive: true });
    onScroll();
  }

  function wireFooter() {
    document.querySelectorAll('.iv-footer-login').forEach(function (btn) {
      btn.addEventListener('click', function () { window.location.href = loginUrl(); });
    });
  }

  /* ---------------- Inner Whirled brand ----------------
     The generator already writes the Inner Whirled mark and word into the
     nav on those pages. This keeps the menu where it sits on every other
     page (the wordmark is wider than InnerVerse) and tags card headings that
     carry a number so they set in Fjalla One. */
  /* A members' /plus page turns the skin on only once the member's page is
     drawn (as on the live site), so the nav it was served with carries the
     InnerVerse mark; put the Inner Whirled mark and word in its place. */
  var IW_MARK = ivR2('https://images.innerversepodcast.com/sq/a39095cd-b9d2-444d-b4e2-14a2484d766d/inner-whirled-logo/w300.webp');
  function iwBrand(nav) {
    nav.querySelectorAll('.iv-nav-logo').forEach(function (img) {
      if (img.getAttribute('src') === IW_MARK) return;
      img.removeAttribute('data-iv-plus');
      img.setAttribute('src', IW_MARK);
      img.setAttribute('alt', 'Inner Whirled');
    });
    nav.querySelectorAll('.iv-nav-word').forEach(function (w) {
      if (!w.querySelector('.iw-inner')) w.innerHTML = '<span class="iw-inner">Inner</span><span class="iw-whirled">Whirled</span>';
    });
  }
  var iwWatching = false;
  function iwWatch(nav) {
    if (iwWatching || !nav) return;
    iwWatching = true;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(iwFit);
    window.addEventListener('resize', iwFit);
    /* Refit when the bar shrinks or grows on scroll, not on the fit's own class. */
    var wasScrolled = nav.classList.contains('iv-nav-scrolled');
    new MutationObserver(function () {
      var now = nav.classList.contains('iv-nav-scrolled');
      if (now === wasScrolled) return;
      wasScrolled = now;
      setTimeout(iwFit, 400);
    }).observe(nav, { attributes: true, attributeFilter: ['class'] });
  }

  function iwFit() {
    if (!isIW()) return;
    var nav = document.getElementById('iv-nav');
    if (nav) { iwBrand(nav); iwWatch(nav); }
    var brand = nav && nav.querySelector('.iv-nav-brand');
    var word = nav && nav.querySelector('.iv-nav-word');
    var logo = nav && nav.querySelector('.iv-nav-logo');
    if (brand && word && logo) {
      brand.style.setProperty('--iw-brand-extra', '0px');
      if (window.innerWidth > 1100) {
        var scrolled = nav.classList.contains('iv-nav-scrolled');
        var probe = document.createElement('span');
        probe.textContent = 'InnerVerse';
        probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-family:"Fjalla One",sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:5px;font-size:' + (scrolled ? '21px' : '25px');
        document.body.appendChild(probe);
        var extra = word.getBoundingClientRect().width - probe.getBoundingClientRect().width + logo.getBoundingClientRect().width - (scrolled ? 36 : 48);
        probe.parentNode.removeChild(probe);
        /* (2026-10-28) The App link made the menu wider than this pull left
           room for, so the wordmark ran into EPISODES. Pull only as far as
           keeps a 32px gap; with no room even unpulled, use the burger. */
        nav.classList.remove('iv-nav-iw-tight');
        /* the first link that is on show (a member has no Episodes link) */
        var first = Array.prototype.filter.call(nav.querySelectorAll('.iv-nav-center .iv-nav-link'), function (l) { return l.offsetParent !== null; })[0];
        var room = first ? first.getBoundingClientRect().left - word.getBoundingClientRect().right : 999;
        if (room < 24) nav.classList.add('iv-nav-iw-tight');
        else {
          var pull = Math.min(extra, room - 32);
          if (pull > 0) brand.style.setProperty('--iw-brand-extra', (-pull) + 'px');
        }
      } else nav.classList.remove('iv-nav-iw-tight');
    }
    document.querySelectorAll('.iv2-h3, .iv2-locked-title').forEach(function (el) {
      if (/\d/.test(el.textContent)) el.classList.add('iv-iw-num');
    });
  }
  window.ivInnerWhirled = iwFit;

  function init() {
    var nav = document.getElementById('iv-nav');
    if (nav) {
      syncHeaderHeightVar(nav);
      wireLogin(nav);
      wireSearch(nav);
      wireBurger(nav);
      wireScroll(nav);
      if (isIW()) iwFit();
    }
    wireFooter();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
