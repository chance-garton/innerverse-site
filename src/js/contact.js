/* Contact form (stage 3, 2026-11-03). Posts the four fields as JSON to the contact Worker. */
(function () {
  var f = document.getElementById('iv-contact-form');
  if (!f) return;
  var st = document.getElementById('iv-contact-status');
  var btn = f.querySelector('.iv-contact-submit');
  function say(t, bad) { st.textContent = t; st.className = 'iv-contact-status' + (bad ? ' is-bad' : ' is-ok'); }
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = {
      name: f.name.value.trim(), email: f.email.value.trim(),
      subject: f.subject.value.trim(), message: f.message.value.trim(), website: f.website.value
    };
    if (!d.name || !d.email || !d.message) { say('Please fill in your name, email and message.', true); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) { say('That email address does not look right.', true); return; }
    btn.disabled = true; say('Sending...', false);
    fetch(f.action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function () {
        f.reset();
        f.classList.add('is-sent');
        say('Thank you, your message was sent.', false);
      })
      .catch(function () {
        btn.disabled = false;
        say('That did not go through. Please email chance@innerversepodcast.com instead.', true);
      });
  });
})();
