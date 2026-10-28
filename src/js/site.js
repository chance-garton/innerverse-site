/* InnerVerse sitewide script (assets/site.js): the membership helper, the nav
   and footer wiring, and the Inner Whirled brand swap.

   Carried over on 2026-10-19 from three Squarespace Code Injection blocks:
   the core of iv-plus-membership (ivMembership: capture the sign-in the
   Worker hands back, ask the Worker who this is), iv-site-nav (now only the
   wiring: the nav and footer markup is written into every page by the
   generator), and the iv-inner-whirled script. What was Squarespace-only is
   gone: the native header hide, the Member Areas cookie and the paywalled
   post probe (membership is the Worker's answer alone, as it already was for
   every Memberful and Patreon member). */
(function () {
  'use strict';

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
    ['iv_session_token', 'iv_plus_entitled', 'iv_plus_email', 'iv_plus_name', 'iv_plus_source'].forEach(function (k) {
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
  var LOGO_URL = 'https://images.squarespace-cdn.com/content/5987d897cf81e0278ec5322e/9a710a85-f780-4b67-a4c7-2b45690b6006/2025-Electric-Logo-2026.png?format=300w&content-type=image%2Fpng';
  var IV_PLUS_LOGO = 'https://images.squarespace-cdn.com/content/5987d897cf81e0278ec5322e/c3607ade-e087-4b27-af0f-e0913f4dc3d0/plus+asset.png?format=300w&content-type=image%2Fpng';

  function syncHeaderHeightVar(nav) {
    document.documentElement.style.setProperty('--header-height', nav.offsetHeight + 'px');
  }

  function ivSyncLoginState(nav) {
    var signedIn = !!getToken();
    nav.querySelectorAll('.iv-nav-login').forEach(function (btn) {
      var label = btn.querySelector('.iv-nav-login-label');
      var wrap = btn.closest('.iv-nav-account-wrap');
      if (!label) return;
      if (signedIn) {
        label.textContent = 'Account';
        btn.classList.add('iv-nav-signedin');
        if (wrap) wrap.classList.add('iv-nav-signed');
        btn.setAttribute('title', 'Signed in, open your account');
        btn.setAttribute('aria-label', 'Open your account');
      } else {
        label.textContent = 'Log in';
        btn.classList.remove('iv-nav-signedin');
        if (wrap) wrap.classList.remove('iv-nav-signed');
        btn.removeAttribute('title');
        btn.setAttribute('aria-label', 'Log in');
      }
    });
  }

  /* Memberful has no profile photo, so the picture is the member's Gravatar;
     no Gravatar means the gold monogram stays. */
  function ivGravatarUrl(email) {
    var sub = window.crypto && window.crypto.subtle;
    if (!sub || !window.TextEncoder || !email) return Promise.resolve('');
    try {
      return sub.digest('SHA-256', new window.TextEncoder().encode(String(email).trim().toLowerCase())).then(function (buf) {
        var hex = Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
        return 'https://gravatar.com/avatar/' + hex + '?s=96&d=404';
      })['catch'](function () { return ''; });
    } catch (e) { return Promise.resolve(''); }
  }
  function ivPaintAvatar(nav, who) {
    var name = (who && who.name) || '', email = (who && who.email) || '';
    var initial = String(name || email || '?').trim().charAt(0).toUpperCase() || '?';
    nav.querySelectorAll('.iv-nav-face').forEach(function (slot) {
      if (slot.getAttribute('data-iv-av') === '1') return;
      slot.setAttribute('data-iv-av', '1');
      var mono = document.createElement('span');
      mono.className = 'iv-nav-avatar';
      mono.textContent = initial;
      slot.innerHTML = '';
      slot.appendChild(mono);
      if (!email) return;
      ivGravatarUrl(email).then(function (u) {
        if (!u) return;
        var probe = new Image();
        probe.onload = function () {
          var img = document.createElement('img');
          img.className = 'iv-nav-avatar'; img.src = u; img.alt = '';
          if (mono.parentNode) mono.parentNode.replaceChild(img, mono);
        };
        probe.src = u;
      });
    });
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
    nav.querySelectorAll('.iv-nav-login').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var wrap = btn.closest('.iv-nav-account-wrap');
        if (!getToken()) { window.location.href = loginUrl(); return; }
        var inPanel = !!btn.closest('.iv-nav-mobile-panel');
        var noHover = !!(window.matchMedia && window.matchMedia('(hover: none)').matches);
        if (wrap && !inPanel && noHover && !wrap.classList.contains('iv-nav-account-open')) {
          wrap.classList.add('iv-nav-account-open');
          e.preventDefault();
          return;
        }
        ivOpenAccount();
      });
    });
    nav.querySelectorAll('.iv-nav-account-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        if (item.getAttribute('data-act') === 'logout') { ivDoLogout(); return; }
        ivOpenAccount();
      });
    });
    document.addEventListener('click', function (e) {
      nav.querySelectorAll('.iv-nav-account-wrap.iv-nav-account-open').forEach(function (w) {
        if (!w.contains(e.target)) w.classList.remove('iv-nav-account-open');
      });
    });
    ivSyncLoginState(nav);
    if (document.documentElement.classList.contains('iv-plus-member')) ivApplyPlusBranding();
    if (getToken()) {
      checkStatus(function (status) {
        if (status && status.entitled) ivApplyPlusBranding(); else ivRevertPlusBranding();
        ivSyncLoginState(nav);
        if (status && status.signedIn) ivPaintAvatar(nav, status);
      });
    }
  }

  function wireBurger(nav) {
    var btn = nav.querySelector('.iv-nav-burger');
    var panel = nav.querySelector('.iv-nav-mobile-panel');
    if (!btn || !panel) return;
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('iv-nav-menu-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    panel.querySelectorAll('a, button').forEach(function (el) {
      el.addEventListener('click', function () { nav.classList.remove('iv-nav-menu-open'); });
    });
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
  var IW_MARK = 'https://images.squarespace-cdn.com/content/5987d897cf81e0278ec5322e/a39095cd-b9d2-444d-b4e2-14a2484d766d/Inner-Whirled-Logo.png?format=300w';
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
        var first = nav.querySelector('.iv-nav-center .iv-nav-link');
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
      wireBurger(nav);
      wireScroll(nav);
      if (isIW()) iwFit();
    }
    wireFooter();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
