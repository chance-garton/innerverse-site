/* library-client.js
   One door to a Plus+ member's library (2026-11-25): the same store the InnerVerse app keeps on the
   Inner Circle server. Loaded on /music and /library ahead of their own scripts.

     ivLib.member()            a Plus+ member with a sign-in on this device
     ivLib.load()              a promise of ivLib once the library has been read (asked once per page)
     ivLib.get(key)            one row, or null: {key, saved, savedAt, note, noteAt, watched, watchedAt}
     ivLib.all()               every row
     ivLib.messages()          {messages, people}: what the member saved in the chat
     ivLib.put(key, change)    {saved}, {note} or {watched}; shown at once, taken back if the server says no
     ivLib.on(fn)              told after every change: fn(key, row or null)

   Keys, as in the app: "p:<plus slug>" when an episode has a members' page, otherwise "e:<free slug>";
   a song is "s:<song id>". */
(function () {
  'use strict';
  var API = 'https://innerverse-circle.chance-5da.workers.dev';
  var rows = {}, extra = { messages: [], people: {} }, asked = null, heard = [];

  function token() { var m = window.ivMembership; return (m && m.getToken && m.getToken()) || ''; }
  function member() { return document.documentElement.classList.contains('iv-plus-member') && !!token(); }
  function call(method, body) {
    return fetch(API + '/api/library', {
      method: method,
      headers: method === 'POST' ? { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' } : { Authorization: 'Bearer ' + token() },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    }).then(function (r) { if (!r.ok) { var e = new Error(String(r.status)); e.status = r.status; throw e; } return r.json(); });
  }
  function tell(key) { heard.slice().forEach(function (fn) { try { fn(key, rows[key] || null); } catch (e) {} }); }

  var api = {
    member: member,
    load: function () {
      if (!member() || !window.fetch) return Promise.reject(new Error('not a member'));
      if (!asked) {
        asked = call('GET').then(function (res) {
          var next = {};
          ((res && res.items) || []).forEach(function (x) { if (x && x.key) next[x.key] = x; });
          /* a change made while the answer was on its way stays */
          Object.keys(rows).forEach(function (k) { if (rows[k] && rows[k]._mine) next[k] = rows[k]; });
          rows = next;
          extra = { messages: (res && res.messages) || [], people: (res && res.people) || {} };
          return api;
        });
        asked['catch'](function () { asked = null; });
      }
      return asked;
    },
    get: function (key) { return rows[key] || null; },
    all: function () { return Object.keys(rows).map(function (k) { return rows[k]; }); },
    messages: function () { return extra; },
    put: function (key, change) {
      var prev = rows[key] || null;
      var base = prev || { key: key, saved: false, savedAt: 0, note: '', noteAt: 0, watched: false, watchedAt: 0 };
      var next = {}, k;
      for (k in base) next[k] = base[k];
      for (k in change) next[k] = change[k];
      next.key = key; next._mine = true;
      if ('saved' in change) next.savedAt = change.saved ? (base.saved ? base.savedAt : Date.now()) : 0;
      if ('note' in change) next.noteAt = Date.now();
      if ('watched' in change) next.watchedAt = change.watched ? (base.watched ? base.watchedAt : Date.now()) : 0;
      if (!next.saved && !next.note && !next.watched) delete rows[key]; else rows[key] = next;
      tell(key);
      var body = { key: key };
      for (k in change) body[k] = change[k];
      return call('POST', body).then(function () { if (rows[key] === next) delete next._mine; return true; }, function (err) {
        /* put it back only if nothing newer has been written over it */
        if ((rows[key] || null) === (next.saved || next.note || next.watched ? next : null)) {
          if (prev) rows[key] = prev; else delete rows[key];
          tell(key);
        }
        throw err;
      });
    },
    on: function (fn) { heard.push(fn); }
  };
  window.ivLib = api;
})();
