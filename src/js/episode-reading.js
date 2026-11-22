/* Episode notes and transcript (2026-11-22, Chance).
   1. A slide in the notes opens full screen; arrows, swipe and the keyboard page
      through the deck, Escape or a tap on the dark closes it.
   2. The transcript search marks every match, counts them and steps through them.
   The transcript times play the episode from episode.js (wireChapters). */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* ---------- slides ---------- */
  function wireSlides() {
    var imgs = Array.prototype.slice.call(document.querySelectorAll('.ivn-body img'));
    if (!imgs.length) return;
    var box = document.createElement('div');
    box.className = 'ivn-lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Slide viewer');
    box.innerHTML =
      '<button type="button" class="ivn-lb-close" aria-label="Close">&#215;</button>' +
      '<button type="button" class="ivn-lb-prev" aria-label="Previous slide">&#8249;</button>' +
      '<figure class="ivn-lb-fig"><img alt=""><figcaption></figcaption></figure>' +
      '<button type="button" class="ivn-lb-next" aria-label="Next slide">&#8250;</button>';
    document.body.appendChild(box);
    var big = box.querySelector('img');
    var cap = box.querySelector('figcaption');
    var at = 0, lastFocus = null;

    function show(i) {
      at = (i + imgs.length) % imgs.length;
      var im = imgs[at];
      big.src = im.getAttribute('data-full') || im.currentSrc || im.src;
      big.alt = im.alt || '';
      cap.textContent = (at + 1) + ' / ' + imgs.length + (im.alt ? '  ' + im.alt : '');
    }
    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      box.classList.add('ivn-open');
      document.documentElement.classList.add('ivn-lock');
      box.querySelector('.ivn-lb-close').focus();
    }
    function close() {
      box.classList.remove('ivn-open');
      document.documentElement.classList.remove('ivn-lock');
      big.removeAttribute('src');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    imgs.forEach(function (im, i) {
      im.setAttribute('tabindex', '0');
      im.setAttribute('role', 'button');
      im.addEventListener('click', function () { open(i); });
      im.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
      });
    });
    box.querySelector('.ivn-lb-close').addEventListener('click', close);
    box.querySelector('.ivn-lb-prev').addEventListener('click', function () { show(at - 1); });
    box.querySelector('.ivn-lb-next').addEventListener('click', function () { show(at + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('ivn-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(at - 1);
      else if (e.key === 'ArrowRight') show(at + 1);
    });
    var x0 = null;
    box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) show(at + (dx < 0 ? 1 : -1));
    });
  }

  /* ---------- transcript search ---------- */
  function wireSearch() {
    var sec = document.getElementById('iv-transcript-acc');
    if (!sec) return;
    var input = sec.querySelector('.ivt-search');
    var count = sec.querySelector('.ivt-count');
    var body = sec.querySelector('.ivt-body');
    var paras = Array.prototype.slice.call(body.querySelectorAll('.ivt-p'));
    var originals = paras.map(function (p) { return p.innerHTML; });
    var marks = [], at = -1, timer = null;

    function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    function clear() {
      paras.forEach(function (p, i) { if (p.__ivMarked) { p.innerHTML = originals[i]; p.__ivMarked = false; } });
      marks = []; at = -1;
    }
    function run() {
      clear();
      var q = input.value.trim();
      if (q.length < 2) { count.textContent = ''; return; }
      var re = new RegExp(escRe(q), 'gi');
      paras.forEach(function (p) {
        /* Only the text after the time link is searched and marked. */
        var walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null);
        var nodes = [], n;
        while ((n = walker.nextNode())) { if (!n.parentNode.closest('.iv-tx-time')) nodes.push(n); }
        nodes.forEach(function (node) {
          var t = node.nodeValue;
          re.lastIndex = 0;
          if (!re.test(t)) return;
          re.lastIndex = 0;
          var frag = document.createDocumentFragment(), last = 0, m;
          while ((m = re.exec(t))) {
            frag.appendChild(document.createTextNode(t.slice(last, m.index)));
            var mk = document.createElement('mark');
            mk.className = 'ivt-mark';
            mk.textContent = m[0];
            frag.appendChild(mk);
            last = m.index + m[0].length;
          }
          frag.appendChild(document.createTextNode(t.slice(last)));
          node.parentNode.replaceChild(frag, node);
          p.__ivMarked = true;
        });
      });
      marks = Array.prototype.slice.call(body.querySelectorAll('mark.ivt-mark'));
      count.textContent = marks.length ? marks.length + (marks.length === 1 ? ' match' : ' matches') : 'No matches';
      if (marks.length) step(1);
    }
    function step(d) {
      if (!marks.length) return;
      if (at >= 0) marks[at].classList.remove('ivt-here');
      at = (at + d + marks.length) % marks.length;
      var mk = marks[at];
      mk.classList.add('ivt-here');
      count.textContent = (at + 1) + ' of ' + marks.length;
      /* The transcript scrolls inside its own box; centre the match there,
         then make sure the box itself is on screen. */
      var boxTop = body.getBoundingClientRect().top;
      body.scrollTop += mk.getBoundingClientRect().top - boxTop - body.clientHeight / 2;
      var r = body.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) body.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 200); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); step(e.shiftKey ? -1 : 1); }
    });
    sec.querySelectorAll('.ivt-step').forEach(function (b) {
      b.addEventListener('click', function () { step(parseInt(b.getAttribute('data-step'), 10)); });
    });
  }

  ready(function () { wireSlides(); wireSearch(); });
})();
