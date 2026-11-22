/* Support page (2026-11-22): the Read more buttons on the affiliate rows.
   Each affiliate's text is held to a few lines by the stylesheet; a button
   is shown only where the text is really cut, and opens that row. */
(function () {
  var rows = Array.prototype.slice.call(document.querySelectorAll('.iv-sup-aff'));
  if (!rows.length) return;
  function fit() {
    rows.forEach(function (row) {
      var text = row.querySelector('.iv-sup-aff-text'), btn = row.querySelector('.iv-sup-more');
      if (!text || !btn || row.classList.contains('iv-sup-aff-open')) return;
      btn.hidden = text.scrollHeight <= text.clientHeight + 2;
    });
  }
  rows.forEach(function (row) {
    var btn = row.querySelector('.iv-sup-more');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var open = row.classList.toggle('iv-sup-aff-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.firstChild.nodeValue = open ? 'Show less' : 'Read more';
    });
  });
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('load', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();
