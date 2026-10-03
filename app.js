/* Designbook reader. Loads the site's encrypted data, unlocks it with the site password in the
   browser, and shows the game's design and its ideas. Read-only: nothing here writes anywhere. */
(function () {
  'use strict';

  var STORE_KEY = 'designbook-key:' + location.pathname;
  var PREF_KEY = 'designbook-prefs:' + location.pathname;

  /* ================================================================ vocabulary */
  /* Feature statuses come from the game's own documents; areas, idea states and costs from the
     design repository's settings, delivered inside the encrypted data. */
  var STATUS = [
    { v: 'Implemented', c: 'green', h: 'Built and in the game.' },
    { v: 'In Progress', c: 'blue', h: 'Partly built, or built and not verified yet.' },
    { v: 'Planned', c: 'gray', h: 'Designed, not built.' },
    { v: 'Deprecated', c: 'default', h: 'On its way out of the game.' }
  ];
  function byV(list) { var m = {}; list.forEach(function (o) { m[o.v] = o; }); return m; }
  var STATUS_BY = byV(STATUS);
  var AREAS = [], STATES = [], COSTS = [], AREA_BY = {}, STATE_BY = {}, COST_BY = {}, STATE_RANK = {};
  var FVIEWS = [{ id: 'area', label: 'By area', icon: 'table' }, { id: 'status', label: 'By status', icon: 'board' }];
  var IVIEWS = [{ id: 'board', label: 'Board', icon: 'board' }, { id: 'table', label: 'By area', icon: 'table' }];
  var FCOLS = [
    { k: 'name', l: 'Feature', i: 'pTitle', w: 250 },
    { k: 'status', l: 'Status', i: 'pStatus', w: 136 },
    { k: 'area', l: 'Area', i: 'pArea', w: 170 },
    { k: 'summary', l: 'What the player gets', i: 'pText', w: 460 },
    { k: 'ideas', l: 'Ideas', i: 'bulbSm', w: 76 },
    { k: 'reviewed', l: 'Reviewed', i: 'pCal', w: 116 }
  ];
  var ICOLS = [
    { k: 'name', l: 'Idea', i: 'pTitle', w: 250 },
    { k: 'state', l: 'State', i: 'pStatus', w: 140 },
    { k: 'cost', l: 'Cost', i: 'pSelect', w: 150 },
    { k: 'pitch', l: 'Pitch', i: 'pText', w: 380 },
    { k: 'leans', l: 'Builds on', i: 'pLink', w: 260 },
    { k: 'by', l: 'Added by', i: 'pPerson', w: 170 },
    { k: 'updated', l: 'Updated', i: 'pCal', w: 110 }
  ];

  /* ================================================================ icons */
  var I = {
    bulb: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7.3 13.3c0-1.7-2.6-2.7-2.6-5.6a5.3 5.3 0 0110.6 0c0 2.9-2.6 3.9-2.6 5.6z"/><path d="M7.7 15.7h4.6M8.5 17.9h3"/></svg>',
    bulbSm: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5.9 10.6c0-1.3-2-2.1-2-4.4a4.1 4.1 0 018.2 0c0 2.3-2 3.1-2 4.4z"/><path d="M6.2 12.6h3.6M6.9 14.4h2.2"/></svg>',
    book: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M3.3 4.3c2.5-.9 4.7-.6 6.7.9v11.4c-2-1.5-4.2-1.8-6.7-.9z"/><path d="M16.7 4.3c-2.5-.9-4.7-.6-6.7.9v11.4c2-1.5 4.2-1.8 6.7-.9z"/></svg>',
    flag: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17.6V3.4"/><path d="M5 4h9.6l-2.2 3.3 2.2 3.3H5"/></svg>',
    doc: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5.5 2.8h6l3.5 3.5v10.9H5.5z" stroke-linejoin="round"/><path d="M11.5 2.8v3.5H15M8 10h5M8 13h5"/></svg>',
    search: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8.8" cy="8.8" r="5.3"/><path d="M13 13l3.6 3.6"/></svg>',
    close: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M5 5l10 10M15 5L5 15"/></svg>',
    chevDown: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5L6 7.5l3-3"/></svg>',
    chevRight2: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5l5 5-5 5M11 5l5 5-5 5"/></svg>',
    menu: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3.5 6h13M3.5 10h13M3.5 14h13"/></svg>',
    lock: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="9" width="11" height="8" rx="1.6"/><path d="M7 9V6.6a3 3 0 016 0V9"/></svg>',
    board: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1.8" y="2.3" width="3.4" height="11.4" rx="1"/><rect x="6.3" y="2.3" width="3.4" height="7.4" rx="1"/><rect x="10.8" y="2.3" width="3.4" height="9.4" rx="1"/></svg>',
    table: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M2 6.5h12M2 10h12M6.5 6.5v7"/></svg>',
    open: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M9.5 2.5v11"/></svg>',
    check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.2 8.4l3 3 6.6-7"/></svg>',
    pTitle: '<svg viewBox="0 0 16 16"><text x="0.5" y="12" font-size="10.5" font-weight="600" font-family="Segoe UI, sans-serif" fill="currentColor">Aa</text></svg>',
    pStatus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 2.2v1.6M8 12.2v1.6M2.2 8h1.6M12.2 8h1.6M3.9 3.9l1.1 1.1M11 11l1.1 1.1M3.9 12.1L5 11M11 5l1.1-1.1"/></svg>',
    pSelect: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="5.8"/><path d="M5.6 7l2.4 2.4L10.4 7"/></svg>',
    pPerson: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="5.4" r="2.8"/><path d="M2.6 14c.6-2.8 2.8-4.3 5.4-4.3s4.8 1.5 5.4 4.3" stroke-linecap="round"/></svg>',
    pText: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2.5 4h11M2.5 8h11M2.5 12h7"/></svg>',
    pHash: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M6.2 2.5l-1.4 11M11.2 2.5l-1.4 11M2.8 5.8h11M2.2 10.2h11"/></svg>',
    pFile: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 2.5h7l3 3v8H3z" stroke-linejoin="round"/><path d="M5.5 7.5h5M5.5 10h3.5"/></svg>',
    pArea: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M2.5 3.5h4.8l1.4 1.6h4.8v7.4h-11z"/></svg>',
    pLink: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M6.8 9.2l2.4-2.4M6 5.2l1.4-1.4a2.6 2.6 0 013.7 3.7L9.7 8.9M10 10.8l-1.4 1.4a2.6 2.6 0 01-3.7-3.7l1.4-1.4"/></svg>',
    pCal: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2.3" y="3.2" width="11.4" height="10.5" rx="1.6"/><path d="M2.3 6.6h11.4M5.4 1.8v2.6M10.6 1.8v2.6" stroke-linecap="round"/></svg>'
  };

  /* ================================================================ state */
  var S = {
    box: null, data: null,
    game: new Map(), features: new Map(), ideas: new Map(), notes: new Map(),
    view: 'overview', noteId: null, peek: null, q: '', searchOpen: false,
    prefs: { fview: 'area', iview: 'board', showClosed: false, collapsed: {}, iarea: [], icost: [] }
  };
  function readPrefs() {
    try {
      var saved = JSON.parse(localStorage.getItem(PREF_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return;
      if (FVIEWS.some(function (v) { return v.id === saved.fview; })) S.prefs.fview = saved.fview;
      if (IVIEWS.some(function (v) { return v.id === saved.iview; })) S.prefs.iview = saved.iview;
      S.prefs.showClosed = !!saved.showClosed;
      if (saved.collapsed && typeof saved.collapsed === 'object') S.prefs.collapsed = saved.collapsed;
      ['iarea', 'icost'].forEach(function (k) { if (Array.isArray(saved[k])) S.prefs[k] = saved[k].filter(function (x) { return typeof x === 'string'; }); });
    } catch (e) {}
  }
  function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(S.prefs)); } catch (e) {} }

  var $app = document.getElementById('app'), $lock = document.getElementById('lock');
  var $sb = document.getElementById('sb'), $top = document.getElementById('topbar'), $main = document.getElementById('main');
  var $peek = document.getElementById('peek'), $scrim = document.getElementById('scrim');

  /* ================================================================ unlocking */
  /* data.json holds the design as gzip-compressed JSON, encrypted with AES-256-GCM under a key derived
     from the site password by PBKDF2-SHA256. "Remember on this device" keeps the derived key, never
     the password, and only for as long as the salt and iteration count stay the same. */
  function fromB64(s) { var bin = atob(s), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function toB64(buf) { var a = new Uint8Array(buf), s = ''; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
  function deriveKey(password, box) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: fromB64(box.salt), iterations: box.iterations, hash: 'SHA-256' },
        base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
    });
  }
  function openBox(key, box) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(box.iv) }, key, fromB64(box.data)).then(function (plain) {
      var stream = new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'));
      return new Response(stream).text();
    }).then(function (text) { return JSON.parse(text); });
  }
  function savedKey(box) {
    try {
      var s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      return s && s.salt === box.salt && s.iterations === box.iterations && typeof s.key === 'string' ? s.key : null;
    } catch (e) { return null; }
  }
  function forget() { try { localStorage.removeItem(STORE_KEY); } catch (e) {} }
  function lockMessage(text, isError) {
    var t = document.getElementById('lock-text'), e = document.getElementById('lock-err');
    if (isError) { e.textContent = text; e.hidden = false; } else { t.textContent = text; e.hidden = true; }
  }
  function lockReady(ready) {
    document.getElementById('pw').disabled = !ready;
    var b = document.getElementById('unlock-btn'); b.disabled = !ready; b.textContent = ready ? 'Unlock' : 'Unlocking…';
  }
  function showLock() {
    $app.hidden = true; $lock.hidden = false;
    lockMessage('This site is locked. Enter the password to read it.');
    lockReady(true);
    document.getElementById('pw').focus();
  }
  function unlock(e) {
    e.preventDefault();
    if (!S.box) return;
    var pw = document.getElementById('pw'), password = pw.value.trim(), remember = document.getElementById('remember').checked;
    if (!password) { pw.focus(); return; }
    lockReady(false);
    document.getElementById('lock-err').hidden = true;
    deriveKey(password, S.box).then(function (key) {
      return openBox(key, S.box).then(function (data) {
        if (!remember) { forget(); return data; }
        return crypto.subtle.exportKey('raw', key).then(function (raw) {
          try { localStorage.setItem(STORE_KEY, JSON.stringify({ salt: S.box.salt, iterations: S.box.iterations, key: toB64(raw) })); } catch (err) {}
          return data;
        });
      });
    }).then(function (data) { pw.value = ''; show(data); }, function () {
      lockReady(true);
      lockMessage('That password doesn’t open this site.', true);
      pw.select();
    });
  }
  function start() {
    readPrefs();
    document.getElementById('unlock').addEventListener('submit', unlock);
    if (!window.crypto || !crypto.subtle || typeof DecompressionStream === 'undefined') {
      lockMessage('This browser can’t open the site. Use a current Chrome, Edge, Firefox or Safari.', true);
      return;
    }
    fetch('data.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).then(function (box) {
      S.box = box;
      var raw = savedKey(box);
      if (!raw) { showLock(); return; }
      lockMessage('Unlocking…');
      crypto.subtle.importKey('raw', fromB64(raw), { name: 'AES-GCM' }, false, ['decrypt'])
        .then(function (key) { return openBox(key, box); })
        .then(show, function () { forget(); showLock(); });
    }).catch(function () {
      lockMessage('The site’s data could not be loaded. Reload the page to try again.', true);
    });
  }
  function lockNow() { forget(); location.hash = ''; location.reload(); }

  /* ================================================================ the design, unlocked */
  function show(data) {
    S.data = data;
    var cfg = data.config || {};
    AREAS = (cfg.areas || []).map(function (a) { return { v: a.name, c: a.color || 'default' }; });
    STATES = (cfg.states || []).map(function (s) { return { v: s.id, l: s.label || s.id, c: s.color || 'default', h: s.help || '', closed: !!s.closed, waiting: !!s.waiting }; });
    COSTS = (cfg.costs || []).map(function (c) { return { v: c.id, l: c.label || c.id, c: c.color || 'default', h: c.help || '' }; });
    AREA_BY = byV(AREAS); STATE_BY = byV(STATES); COST_BY = byV(COSTS);
    STATE_RANK = {}; STATES.forEach(function (o, i) { STATE_RANK[o.v] = i; });
    S.game = new Map((data.game || []).map(function (d) { return [d.id, d]; }));
    S.features = new Map((data.features || []).map(function (d) { return [d.id, d]; }));
    S.ideas = new Map((data.ideas || []).map(function (d) { return [d.id, d]; }));
    S.notes = new Map((data.notes || []).map(function (d) { return [d.id, d]; }));
    document.title = (data.project && data.project.title ? data.project.title + ' · ' : '') + 'Designbook';
    $lock.hidden = true; $app.hidden = false;
    var h = readHash();
    S.view = h.view; S.noteId = h.id || null;
    if (S.view === 'note' && !S.notes.has(S.noteId)) { S.view = 'overview'; S.noteId = null; }
    renderAll();
    if (h.peek && S[h.peek[0]].has(h.peek[1])) openPeek(h.peek[0], h.peek[1]);
    else setHash();
  }

  /* ================================================================ helpers */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ago(iso) {
    var ms = iso ? Date.parse(iso) : NaN; if (isNaN(ms)) return '';
    var s = (Date.now() - ms) / 1000;
    if (s < 50) return 'just now';
    if (s < 3600) return Math.round(s / 60) + 'm ago';
    if (s < 86400) return Math.round(s / 3600) + 'h ago';
    var d = Math.round(s / 86400);
    if (d < 14) return d + 'd ago';
    return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function kebab(stem) { return String(stem).replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase(); }
  function plainText(md) { return String(md || '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*|`|^#+\s*/gm, '').replace(/\s+/g, ' ').trim(); }
  function tag(label, color, title) { return '<span class="tag c-' + (color || 'default') + '"' + (title ? ' title="' + esc(title) + '"' : '') + '>' + esc(label) + '</span>'; }
  function pill(label, color, title) { return '<span class="pill c-' + (color || 'default') + '"' + (title ? ' title="' + esc(title) + '"' : '') + '><i></i>' + esc(label) + '</span>'; }
  function statusPill(v) { var o = STATUS_BY[v]; return o ? pill(o.v, o.c, o.h) : (v ? pill(v, 'default') : '<span class="empty">No status</span>'); }
  function areaTag(a) { return a ? tag(a, (AREA_BY[a] || {}).c || 'default') : ''; }
  function stateOf(d) { return STATE_BY[d.state] ? d.state : (STATES[0] ? STATES[0].v : ''); }
  function statePill(v) { var o = STATE_BY[v]; return o ? pill(o.l, o.c, o.h) : ''; }
  function costTag(v) { var o = COST_BY[v]; return o ? tag(o.l, o.c, o.h) : ''; }
  function ids(a) { return Array.isArray(a) ? a.filter(function (x) { return typeof x === 'string' && x; }) : []; }
  function featureName(id) { var f = S.features.get(id); return f ? (f.name || id) : id; }
  function ideasFor(fid) { var out = []; S.ideas.forEach(function (d, id) { if (ids(d.leansOn).indexOf(fid) >= 0 || ids(d.owners).indexOf(fid) >= 0) out.push(id); }); return out; }
  function isClosed(st) { return !!(STATE_BY[st] && STATE_BY[st].closed); }
  function areaRank(a) { var i = AREAS.findIndex(function (o) { return o.v === a; }); return i < 0 ? (a ? 100 : 200) : i; }

  /* ================================================================ markdown */
  /* Documents, ideas and notes are markdown. marked renders it and DOMPurify removes anything unsafe.
     Links between documents on this site become links inside it; links to the rest of the game's
     repository (tasks, contracts, guides) become plain text with the path on hover. */
  function inlineFallback(txt) {
    return txt.split(/(`[^`\n]+`)/g).map(function (part, i) {
      if (i % 2) return '<code>' + esc(part.slice(1, -1)) + '</code>';
      return esc(part).replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
    }).join('');
  }
  function fallbackHtml(text) {
    return String(text).split(/\n{2,}/).map(function (para) {
      var lines = para.split('\n');
      if (/^#{1,4}\s/.test(lines[0])) return '<h3>' + inlineFallback(lines[0].replace(/^#+\s*/, '')) + '</h3>' + (lines.length > 1 ? '<p>' + lines.slice(1).map(inlineFallback).join('<br>') + '</p>' : '');
      if (lines.every(function (l) { return /^\s*[-*]\s+/.test(l); })) return '<ul>' + lines.map(function (l) { return '<li>' + inlineFallback(l.replace(/^\s*[-*]\s+/, '')) + '</li>'; }).join('') + '</ul>';
      return '<p>' + lines.map(inlineFallback).join('<br>') + '</p>';
    }).join('');
  }
  function mdHtml(text) {
    var src = String(text || '');
    if (!src.trim()) return '';
    if (window.marked && typeof window.marked.parse === 'function' && window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
      try { return window.DOMPurify.sanitize(window.marked.parse(src, { gfm: true, breaks: false, async: false })); } catch (e) {}
    }
    return fallbackHtml(src);
  }
  function resolvePath(base, rel) {
    rel = String(rel || '').replace(/\\/g, '/').trim();
    if (!rel) return '';
    if (/^(Docs|Claude|Source|Config|Content|Tools|Plugins|content)\//.test(rel)) return rel;
    var parts = String(base || 'content/notes/x.md').split('/').slice(0, -1);
    rel.split('/').forEach(function (p) { if (p === '..') parts.pop(); else if (p && p !== '.') parts.push(p); });
    return parts.join('/');
  }
  function refFor(path) {
    var m = /^(?:Docs\/Design\/Features|content\/features)\/([A-Za-z0-9]+)\.md$/.exec(path);
    if (m) { var fid = kebab(m[1]); return S.features.has(fid) ? { go: 'feature', id: fid } : null; }
    if (/^(?:Docs\/Product|content\/game)\/[A-Za-z0-9]+\.md$/.test(path)) return { go: 'overview', id: '' };
    m = /^content\/ideas\/([a-z0-9-]+)\.md$/.exec(path);
    if (m) return S.ideas.has(m[1]) ? { go: 'idea', id: m[1] } : null;
    m = /^content\/notes\/([a-z0-9-]+)\.md$/.exec(path);
    if (m) return S.notes.has(m[1]) ? { go: 'note', id: m[1] } : null;
    return null;
  }
  function hrefFor(ref) { return '#' + (ref.go === 'overview' ? 'overview' : ref.go + '-' + ref.id); }
  function fixLinks(root, base) {
    root.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (/^https?:\/\//i.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; return; }
      var m = /^#(feature|idea|note)-([A-Za-z0-9_.~-]+)$/.exec(href);
      if (m) { a.dataset.go = m[1]; a.dataset.id = m[2]; return; }
      if (/^#(overview|features|ideas|search)$/.test(href)) { a.dataset.go = href.slice(1); a.dataset.id = ''; return; }
      var target = resolvePath(base, href.split('#')[0]), ref = /\.md$/i.test(target) ? refFor(target) : null;
      if (ref) { a.setAttribute('href', hrefFor(ref)); a.dataset.go = ref.go; a.dataset.id = ref.id; return; }
      var span = document.createElement('span');
      span.className = 'repo-ref'; span.title = (target || href) + ' (in the game’s repository, not on this site)';
      while (a.firstChild) span.appendChild(a.firstChild);
      a.replaceWith(span);
    });
    root.querySelectorAll('code').forEach(function (c) {
      if (c.closest('a, pre')) return;
      var t = c.textContent.trim();
      if (!/^[A-Za-z0-9_./-]+\.md$/.test(t)) return;
      var ref = refFor(resolvePath(base, t));
      if (!ref) return;
      var a = document.createElement('a');
      a.href = hrefFor(ref); a.dataset.go = ref.go; a.dataset.id = ref.id;
      c.replaceWith(a); a.appendChild(c);
    });
    root.querySelectorAll('table').forEach(function (t) {
      if (t.parentNode && t.parentNode.classList && t.parentNode.classList.contains('md-tw')) return;
      var w = document.createElement('div'); w.className = 'md-tw'; t.parentNode.insertBefore(w, t); w.appendChild(t);
    });
  }
  function renderMd(el, text, base) { if (!el) return; el.innerHTML = mdHtml(text); fixLinks(el, base); }

  /* ================================================================ sidebar + top bar */
  function renderSidebar() {
    var waiting = 0; S.ideas.forEach(function (d) { var s = STATE_BY[stateOf(d)]; if (s && s.waiting) waiting++; });
    var notes = Array.from(S.notes.values()).sort(function (a, b) { return (a.order || 0) - (b.order || 0) || String(a.title).localeCompare(String(b.title)); });
    var p = S.data.project || {}, b = S.data.built || {};
    var h = '<div class="sb-ws"><span class="ws-ic">' + I.bulb + '</span><span class="ws-n">' + esc(p.title || 'Designbook') + '</span>' +
      '<button class="ibtn sm sb-x" data-act="close-sb" aria-label="Close sidebar">' + I.close + '</button></div>';
    h += navItem('search', null, '<span class="ico i-gray">' + I.search + '</span>', 'Search', '');
    h += '<div class="sb-sec"><span>The game</span></div>';
    h += navItem('overview', null, '<span class="ico i-blue">' + I.flag + '</span>', 'Overview', '');
    h += navItem('features', null, '<span class="ico i-green">' + I.book + '</span>', 'Features', '<span class="cnt">' + S.features.size + '</span>');
    h += '<div class="sb-sec"><span>Ideas</span></div>';
    h += navItem('ideas', null, '<span class="ico i-orange">' + I.bulb + '</span>', 'Ideas', '<span class="cnt" title="Ideas waiting for a design session">' + waiting + '</span>');
    if (notes.length) {
      h += '<div class="sb-sec"><span>Notes</span></div>';
      notes.forEach(function (n) { h += navItem('note', n.id, '<span class="ico i-gray">' + I.doc + '</span>', n.title || 'Untitled', ''); });
    }
    h += '<div class="sb-foot"><div class="built"><span>Built ' + esc(ago(b.at)) + '</span>' +
      (b.game ? '<span>Game design from <code>' + esc(b.game) + '</code></span>' : '') +
      (b.design ? '<span>Ideas from <code>' + esc(b.design) + '</code></span>' : '') + '</div>' +
      '<button class="btn" data-act="lock" title="Forget the password on this device">' + I.lock + 'Lock</button></div>';
    $sb.innerHTML = h;
  }
  function navItem(view, id, ic, label, right) {
    var cur = S.view === view && (view !== 'note' || S.noteId === id);
    return '<button class="sb-item" data-nav="' + view + '"' + (id ? ' data-id="' + esc(id) + '"' : '') + (cur ? ' aria-current="page"' : '') + '>' +
      ic + '<span class="lbl">' + esc(label) + '</span>' + (right || '') + '</button>';
  }
  function renderTopbar() {
    var p = S.data.project || {};
    var crumbs = [{ html: '<span class="i-orange">' + I.bulb + '</span><span>' + esc(p.title || 'Designbook') + '</span>', nav: 'overview' }];
    var label = { overview: ['i-blue', I.flag, 'Overview'], features: ['i-green', I.book, 'Features'], ideas: ['i-orange', I.bulb, 'Ideas'], search: ['i-gray', I.search, 'Search'] }[S.view];
    if (label) crumbs.push({ html: '<span class="' + label[0] + '">' + label[1] + '</span><span>' + label[2] + '</span>', nav: S.view });
    else if (S.view === 'note') { var n = S.notes.get(S.noteId); crumbs.push({ html: '<span class="i-gray">' + I.doc + '</span><span>' + esc((n && n.title) || 'Untitled') + '</span>', nav: 'note', id: S.noteId }); }
    $top.innerHTML = '<button class="ibtn tb-menu" data-act="open-sb" aria-label="Open sidebar">' + I.menu + '</button>' +
      '<nav class="crumbs" aria-label="Breadcrumb">' + crumbs.map(function (c) { return '<button class="crumb" data-nav="' + c.nav + '"' + (c.id ? ' data-id="' + esc(c.id) + '"' : '') + '>' + c.html + '</button>'; }).join('<span class="crumb-sep">/</span>') + '</nav>' +
      '<div class="tb-right"><span class="edited">Updated ' + esc(ago((S.data.built || {}).at)) + '</span></div>';
  }

  /* ================================================================ main views */
  function renderAll() { renderSidebar(); renderTopbar(); renderMain(); if (S.peek) openPeek(S.peek.coll, S.peek.id, { keep: true }); }
  function renderMain() {
    if (S.view === 'features') return mountFeatures();
    if (S.view === 'ideas') return mountIdeas();
    if (S.view === 'search') return mountSearch();
    if (S.view === 'note' && S.noteId) return mountNote();
    return mountOverview();
  }
  function srcLine(d) { return d ? '<p class="src">From <code>' + esc(d.source || '') + '</code>' + (d.lastReviewed ? ' · reviewed ' + esc(d.lastReviewed) : '') + '</p>' : ''; }

  /* ---------------------------------------------------------------- overview */
  function mountOverview() {
    var d = S.data, items = (d.config && d.config.overview) || [], lead = null, cards = [], docs = [], named = {};
    items.forEach(function (o) {
      var g = S.game.get(o.doc); if (!g) return; named[o.doc] = 1;
      if (o.lead) lead = g;
      (o.style === 'cards' ? cards : docs).push({ heading: o.heading || g.name, g: g, cls: o.style === 'cards' ? 'md pillars' : 'md' });
    });
    S.game.forEach(function (g, id) { if (!named[id]) docs.push({ heading: g.name, g: g, cls: 'md' }); });
    var c = {}; STATUS.forEach(function (o) { c[o.v] = 0; });
    S.features.forEach(function (f) { if (c[f.status] != null) c[f.status]++; });
    var waiting = 0; S.ideas.forEach(function (x) { var s = STATE_BY[stateOf(x)]; if (s && s.waiting) waiting++; });
    function section(x) { return '<section class="ov-sec"><h2 class="ov-h">' + esc(x.heading) + '</h2><div class="' + x.cls + '" data-doc="' + esc(x.g.id) + '"></div>' + srcLine(x.g) + '</section>'; }
    var h = '<div class="page doc"><header class="ph"><div class="ph-title"><span class="pic i-blue">' + I.flag + '</span><h1>' + esc((d.project && d.project.title) || 'Overview') + '</h1></div>' +
      (lead && lead.summary ? '<p class="ph-lead">' + esc(lead.summary) + '</p>' : '') +
      '<div class="ph-stats"><span><b>' + S.features.size + '</b> features</span>' + STATUS.filter(function (o) { return c[o.v]; }).map(function (o) { return '<span><b>' + c[o.v] + '</b> ' + esc(o.v.toLowerCase()) + '</span>'; }).join('') +
      '<span><b>' + waiting + '</b> ideas waiting</span></div></header>';
    cards.forEach(function (x) { h += section(x); });
    h += '<section class="ov-sec"><h2 class="ov-h">Features at a glance</h2><div class="glance">' + glanceHtml() + '</div></section>';
    h += '<section class="ov-sec"><h2 class="ov-h">Latest ideas</h2>' + latestHtml() + '</section>';
    docs.forEach(function (x) { h += section(x); });
    $main.innerHTML = h + '</div>';
    $main.querySelectorAll('[data-doc]').forEach(function (el) { var g = S.game.get(el.dataset.doc); if (g) renderMd(el, g.body, g.source); });
  }
  function glanceHtml() {
    var groups = {};
    S.features.forEach(function (f, id) { var a = f.area || ''; (groups[a] = groups[a] || []).push({ id: id, f: f }); });
    return Object.keys(groups).sort(function (a, b) { return areaRank(a) - areaRank(b); }).map(function (a) {
      var list = groups[a].sort(function (x, y) { return String(x.f.name).localeCompare(String(y.f.name)); });
      return '<div class="glance-c"><h3>' + esc(a || 'No area') + '<span>' + list.length + '</span></h3><div class="links">' +
        list.map(function (x) { return '<button data-open="features" data-id="' + esc(x.id) + '" title="' + esc(x.f.status || '') + '">' + esc(x.f.name || x.id) + '</button>'; }).join('') + '</div></div>';
    }).join('');
  }
  function latestHtml() {
    var list = Array.from(S.ideas.values()).filter(function (d) { return !isClosed(stateOf(d)); })
      .sort(function (a, b) { return String(b.created || '').localeCompare(String(a.created || '')); }).slice(0, 6);
    if (!list.length) return '<p class="dim">No ideas yet.</p>';
    return '<div class="latest">' + list.map(function (d) { return ideaCard({ id: d.id, d: d, st: stateOf(d) }, null, true); }).join('') + '</div>' +
      '<div class="more"><button class="flink" data-nav="ideas">See every idea</button></div>';
  }

  /* ---------------------------------------------------------------- views bar and search box */
  function renderViewsBar() {
    var el = document.getElementById('views'); if (!el) return;
    var isF = S.view === 'features', views = isF ? FVIEWS : IVIEWS, cur = isF ? S.prefs.fview : S.prefs.iview;
    el.innerHTML = '<div class="vtabs" role="tablist" aria-label="Views">' + views.map(function (x) {
      return '<button class="vtab" role="tab" data-vtab="' + x.id + '" aria-selected="' + (x.id === cur) + '">' + I[x.icon] + esc(x.label) + '</button>';
    }).join('') + '</div><div class="vtools">' +
      (S.searchOpen || S.q ? '<label class="qbox">' + I.search + '<input id="q" type="text" placeholder="Type to filter…" autocomplete="off" value="' + esc(S.q) + '" aria-label="Filter"></label>'
        : '<button class="ibtn" data-act="open-search" title="Filter" aria-label="Filter">' + I.search + '</button>') + '</div>';
  }
  function tableHead(cols) {
    var width = cols.reduce(function (a, c) { return a + c.w; }, 0);
    return '<div class="tw"><table class="nt" style="width:' + width + 'px"><colgroup>' + cols.map(function (c) { return '<col style="width:' + c.w + 'px">'; }).join('') + '</colgroup>' +
      '<thead><tr>' + cols.map(function (c) { return '<th class="c-' + c.k + '"><span class="h">' + I[c.i] + esc(c.l) + '</span></th>'; }).join('') + '</tr></thead>';
  }
  function groupRow(gk, label, n, span) {
    var collapsed = !!S.prefs.collapsed[gk];
    return '<tr class="grp"><td colspan="' + span + '"><div class="grp-in"><button class="grp-h" data-group="' + esc(gk) + '" aria-expanded="' + !collapsed + '"><span class="chev">' + I.chevDown + '</span>' + label + '<span class="n">' + n + '</span></button></div></td></tr>';
  }
  function openId(coll) { return S.peek && S.peek.coll === coll ? S.peek.id : null; }

  /* ---------------------------------------------------------------- features */
  function mountFeatures() {
    var c = {}; STATUS.forEach(function (o) { c[o.v] = 0; });
    S.features.forEach(function (f) { if (c[f.status] != null) c[f.status]++; });
    $main.innerHTML = '<div class="page">' +
      '<header class="ph"><div class="ph-title"><span class="pic i-green">' + I.book + '</span><h1>Features</h1></div>' +
      '<p class="ph-desc">The approved design of every feature, copied from the game’s design documents after every push.</p>' +
      '<div class="ph-stats"><span><b>' + S.features.size + '</b> features</span>' + STATUS.filter(function (o) { return c[o.v]; }).map(function (o) { return '<span><b>' + c[o.v] + '</b> ' + esc(o.v.toLowerCase()) + '</span>'; }).join('') + '</div></header>' +
      '<div class="views" id="views"></div><div id="results"></div></div>';
    renderViewsBar(); renderFeatureResults();
  }
  function filteredFeatures() {
    var q = S.q.trim().toLowerCase(), out = [];
    S.features.forEach(function (f, id) {
      if (q && [f.name, f.status, f.statusNote, f.area, f.summary, f.body].join(' ').toLowerCase().indexOf(q) < 0) return;
      out.push({ id: id, f: f });
    });
    return out.sort(function (a, b) { return String(a.f.name || '').localeCompare(String(b.f.name || '')); });
  }
  function renderFeatureResults() {
    var el = document.getElementById('results'); if (!el || S.view !== 'features') return;
    var list = filteredFeatures();
    if (!list.length) { el.innerHTML = '<div class="none-row">No feature mentions that.</div>'; return; }
    el.innerHTML = S.prefs.fview === 'status' ? featureBoardHtml(list) : featureTableHtml(list);
  }
  function featureTableHtml(list) {
    var groups = new Map(), open = openId('features');
    list.forEach(function (r) { var k = r.f.area || ''; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
    var h = tableHead(FCOLS);
    Array.from(groups.keys()).sort(function (a, b) { return areaRank(a) - areaRank(b) || a.localeCompare(b); }).forEach(function (k) {
      var rows = groups.get(k), gk = 'farea:' + k;
      h += '<tbody>' + groupRow(gk, k ? areaTag(k) : '<span class="none">No area</span>', rows.length, FCOLS.length);
      if (!S.prefs.collapsed[gk]) rows.forEach(function (r) {
        var f = r.f, n = ideasFor(r.id).length;
        h += '<tr class="r' + (r.id === open ? ' is-open' : '') + '" data-open="features" data-id="' + esc(r.id) + '" tabindex="0">' +
          '<td class="c-name"><div class="nmc"><span class="nm">' + esc(f.name || r.id) + '</span>' +
          '<button class="open-btn" data-act="open-peek" data-coll="features" data-id="' + esc(r.id) + '">' + I.open + 'Open</button></div></td>' +
          '<td>' + statusPill(f.status) + '</td><td>' + areaTag(f.area) + '</td>' +
          '<td><div class="desc" title="' + esc(f.summary || '') + '">' + esc(f.summary || '') + '</div></td>' +
          '<td class="num">' + (n || '<span class="dim">0</span>') + '</td><td class="num">' + esc(f.lastReviewed || '') + '</td></tr>';
      });
      h += '</tbody>';
    });
    return h + '</table></div>';
  }
  function featureBoardHtml(list) {
    var buckets = {}, open = openId('features'); STATUS.forEach(function (o) { buckets[o.v] = []; });
    list.forEach(function (r) { if (buckets[r.f.status]) buckets[r.f.status].push(r); });
    return '<div class="board">' + STATUS.filter(function (o) { return o.v !== 'Deprecated' || buckets[o.v].length; }).map(function (o) {
      return '<section class="bcol c-' + o.c + '" aria-label="' + esc(o.v) + '"><div class="bcol-h">' + pill(o.v, o.c, o.h) + '<span class="n">' + buckets[o.v].length + '</span></div>' +
        '<div class="cards">' + buckets[o.v].map(function (r) {
          var n = ideasFor(r.id).length;
          return '<div class="bcard' + (r.id === open ? ' is-open' : '') + '" data-open="features" data-id="' + esc(r.id) + '" tabindex="0" role="button">' +
            '<div class="ct"><span>' + esc(r.f.name || r.id) + '</span></div>' +
            (r.f.summary ? '<div class="cpitch">' + esc(r.f.summary) + '</div>' : '') +
            '<div class="cmeta">' + areaTag(r.f.area) + (n ? '<span class="own" title="Ideas that build on it">' + I.bulbSm + n + '</span>' : '') + '</div></div>';
        }).join('') + '</div></section>';
    }).join('') + '</div>';
  }

  /* ---------------------------------------------------------------- ideas */
  function mountIdeas() {
    var c = {}; STATES.forEach(function (o) { c[o.v] = 0; });
    S.ideas.forEach(function (d) { c[stateOf(d)]++; });
    $main.innerHTML = '<div class="page">' +
      '<header class="ph"><div class="ph-title"><span class="pic i-orange">' + I.bulb + '</span><h1>Ideas</h1></div>' +
      '<p class="ph-desc">Ideas for the game that nobody has approved yet, written with Claude. A design session in the project turns a shortlisted idea into a real design.</p>' +
      '<div class="ph-stats"><span><b>' + S.ideas.size + '</b> ideas</span>' + STATES.filter(function (o) { return c[o.v]; }).map(function (o) { return '<span><b>' + c[o.v] + '</b> ' + esc(o.l.toLowerCase()) + '</span>'; }).join('') + '</div></header>' +
      '<div class="views" id="views"></div><div class="fbar" id="fbar"></div><div id="results"></div></div>';
    renderViewsBar(); renderFilterBar(); renderIdeaResults();
  }
  function renderFilterBar() {
    var el = document.getElementById('fbar'); if (!el || S.view !== 'ideas') return;
    var P = S.prefs, closed = 0;
    S.ideas.forEach(function (d) { if (isClosed(stateOf(d))) closed++; });
    function fp(key, label, vals, lab) {
      var on = vals.length > 0;
      return '<button class="fpill' + (on ? ' on' : '') + '" data-filter="' + key + '"><span>' + esc(label) + (on ? ': ' + esc(vals.map(lab).join(', ')) : '') + '</span>' + I.chevDown + '</button>';
    }
    el.innerHTML = fp('iarea', 'Area', P.iarea, function (v) { return v || 'No area'; }) +
      fp('icost', 'Cost', P.icost, function (v) { return (COST_BY[v] || {}).l || v; }) +
      (closed ? '<button class="fpill' + (P.showClosed ? ' on' : '') + '" data-ftoggle="showClosed"><span>Show ' + esc(STATES.filter(function (o) { return o.closed; }).map(function (o) { return o.l.toLowerCase(); }).join(' and ')) + ' (' + closed + ')</span></button>' : '') +
      (P.iarea.length || P.icost.length || S.q ? '<button class="flink" data-act="reset-filters">Reset</button>' : '');
  }
  function filteredIdeas() {
    var q = S.q.trim().toLowerCase(), P = S.prefs, out = [];
    S.ideas.forEach(function (d, id) {
      var st = stateOf(d);
      if (!P.showClosed && isClosed(st)) return;
      if (P.iarea.length && P.iarea.indexOf(d.area || '') < 0) return;
      if (P.icost.length && P.icost.indexOf(d.cost) < 0) return;
      if (q && [d.title, d.body, d.area, d.task, d.author, (STATE_BY[st] || {}).l, (COST_BY[d.cost] || {}).l]
        .concat(ids(d.leansOn).map(featureName), ids(d.owners).map(featureName)).join(' ').toLowerCase().indexOf(q) < 0) return;
      out.push({ id: id, d: d, st: st });
    });
    return out.sort(function (a, b) { return ((STATE_RANK[a.st] || 0) - (STATE_RANK[b.st] || 0)) || String(b.d.created || '').localeCompare(String(a.d.created || '')) || String(a.d.title).localeCompare(String(b.d.title)); });
  }
  function renderIdeaResults() {
    var el = document.getElementById('results'); if (!el || S.view !== 'ideas') return;
    var list = filteredIdeas();
    if (!list.length && S.prefs.iview === 'table') { el.innerHTML = '<div class="none-row">' + (S.ideas.size ? 'No idea matches. <button class="flink" data-act="reset-filters">Reset filters</button>' : 'No ideas yet.') + '</div>'; return; }
    el.innerHTML = S.prefs.iview === 'table' ? ideaTableHtml(list) : ideaBoardHtml(list);
  }
  function ideaCard(r, open, compact) {
    var d = r.d;
    return '<div class="bcard' + (r.id === open ? ' is-open' : '') + '" data-open="ideas" data-id="' + esc(r.id) + '" tabindex="0" role="button">' +
      '<div class="ct"><span>' + esc(d.title || 'Untitled idea') + '</span></div>' +
      (d.pitch ? '<div class="cpitch">' + esc(plainText(d.pitch)) + '</div>' : '') +
      '<div class="tags">' + (compact ? statePill(r.st) : '') + costTag(d.cost) + areaTag(d.area) + '</div>' +
      (d.author ? '<div class="cmeta"><span>' + esc(d.author) + '</span></div>' : '') + '</div>';
  }
  function ideaBoardHtml(list) {
    var cols = STATES.filter(function (o) { return S.prefs.showClosed || !o.closed; }), buckets = {}, open = openId('ideas');
    cols.forEach(function (o) { buckets[o.v] = []; });
    list.forEach(function (r) { if (buckets[r.st]) buckets[r.st].push(r); });
    return '<div class="board">' + cols.map(function (o) {
      return '<section class="bcol c-' + o.c + '" aria-label="' + esc(o.l) + '"><div class="bcol-h">' + pill(o.l, o.c, o.h) + '<span class="n">' + buckets[o.v].length + '</span></div>' +
        '<div class="cards">' + buckets[o.v].map(function (r) { return ideaCard(r, open, false); }).join('') + '</div></section>';
    }).join('') + '</div>';
  }
  function ideaTableHtml(list) {
    var groups = new Map(), open = openId('ideas');
    list.forEach(function (r) { var k = r.d.area || ''; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
    var h = tableHead(ICOLS);
    Array.from(groups.keys()).sort(function (a, b) { return areaRank(a) - areaRank(b) || a.localeCompare(b); }).forEach(function (k) {
      var rows = groups.get(k), gk = 'iarea:' + k;
      h += '<tbody>' + groupRow(gk, k ? areaTag(k) : '<span class="none">No area</span>', rows.length, ICOLS.length);
      if (!S.prefs.collapsed[gk]) rows.forEach(function (r) {
        var d = r.d;
        h += '<tr class="r' + (r.id === open ? ' is-open' : '') + '" data-open="ideas" data-id="' + esc(r.id) + '" tabindex="0">' +
          '<td class="c-name"><div class="nmc"><span class="nm">' + esc(d.title || 'Untitled idea') + '</span>' +
          '<button class="open-btn" data-act="open-peek" data-coll="ideas" data-id="' + esc(r.id) + '">' + I.open + 'Open</button></div></td>' +
          '<td>' + statePill(r.st) + '</td><td>' + costTag(d.cost) + '</td>' +
          '<td><div class="desc">' + esc(plainText(d.pitch)) + '</div></td>' +
          '<td><div class="tags nowrap">' + ids(d.leansOn).map(function (f) { return '<button class="rel-chip" data-feature="' + esc(f) + '"><span>' + esc(featureName(f)) + '</span></button>'; }).join('') + '</div></td>' +
          '<td><div class="desc">' + esc(d.author || '') + '</div></td><td class="dim">' + esc(d.updated || d.created || '') + '</td></tr>';
      });
      h += '</tbody>';
    });
    return h + '</table></div>';
  }

  /* ---------------------------------------------------------------- notes */
  function mountNote() {
    var n = S.notes.get(S.noteId);
    if (!n) { go('overview'); return; }
    $main.innerHTML = '<div class="page doc"><h1 class="doc-title">' + esc(n.title || 'Untitled') + '</h1>' +
      '<div class="pk-meta" style="margin:8px 0 22px">' + (n.author ? '<span>' + esc(n.author) + '</span>' : '') + (n.date ? '<span>' + esc(n.date) + '</span>' : '') + '</div>' +
      '<div class="md" id="note-body"></div></div>';
    renderMd(document.getElementById('note-body'), n.body, n.path);
  }

  /* ---------------------------------------------------------------- search */
  function snippet(text, q) {
    var t = plainText(text), i = t.toLowerCase().indexOf(q);
    if (i < 0) return esc(t.slice(0, 160)) + (t.length > 160 ? '…' : '');
    var from = Math.max(0, i - 70), to = Math.min(t.length, i + q.length + 90);
    return (from ? '…' : '') + esc(t.slice(from, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length, to)) + (to < t.length ? '…' : '');
  }
  function mountSearch() {
    $main.innerHTML = '<div class="page doc"><header class="ph"><div class="ph-title"><span class="pic i-gray">' + I.search + '</span><h1>Search</h1></div>' +
      '<p class="ph-desc">Every feature, idea and note, and the vision and pillars.</p></header>' +
      '<label class="search-big">' + I.search + '<input id="sq" type="search" placeholder="Search the design…" autocomplete="off" aria-label="Search the design" value="' + esc(S.q) + '"></label>' +
      '<div id="sresults"></div></div>';
    var inp = document.getElementById('sq');
    inp.addEventListener('input', function () { S.q = inp.value; renderSearchResults(); });
    renderSearchResults();
    setTimeout(function () { inp.focus(); }, 30);
  }
  function renderSearchResults() {
    var el = document.getElementById('sresults'); if (!el) return;
    var q = S.q.trim().toLowerCase();
    if (q.length < 2) { el.innerHTML = '<p class="dim" style="margin-top:18px">Type at least two letters.</p>'; return; }
    function hits(map, fields) {
      var out = [];
      map.forEach(function (d) {
        var hay = fields.map(function (f) { return d[f] || ''; }).join(' \n ').toLowerCase();
        if (hay.indexOf(q) >= 0) out.push(d);
      });
      return out;
    }
    var groups = [
      { t: 'Features', list: hits(S.features, ['name', 'summary', 'statusNote', 'body']), res: function (d) { return { act: 'data-open="features" data-id="' + esc(d.id) + '"', title: d.name, side: statusPill(d.status), text: d.body }; } },
      { t: 'Ideas', list: hits(S.ideas, ['title', 'author', 'body']), res: function (d) { return { act: 'data-open="ideas" data-id="' + esc(d.id) + '"', title: d.title, side: statePill(stateOf(d)), text: d.body }; } },
      { t: 'Notes', list: hits(S.notes, ['title', 'body']), res: function (d) { return { act: 'data-nav="note" data-id="' + esc(d.id) + '"', title: d.title, side: '', text: d.body }; } },
      { t: 'Vision and pillars', list: hits(S.game, ['name', 'body']), res: function (d) { return { act: 'data-nav="overview"', title: d.name, side: '', text: d.body }; } }
    ];
    var total = 0, h = '';
    groups.forEach(function (g) {
      if (!g.list.length) return;
      total += g.list.length;
      h += '<section class="sr-sec"><h2>' + esc(g.t) + ' · ' + g.list.length + '</h2>' + g.list.slice(0, 40).map(function (d) {
        var r = g.res(d);
        return '<button class="sr" ' + r.act + '><span class="sr-t">' + esc(r.title || 'Untitled') + r.side + '</span><span class="sr-s">' + snippet(r.text, q) + '</span></button>';
      }).join('') + '</section>';
    });
    el.innerHTML = total ? h : '<p class="dim" style="margin-top:18px">Nothing mentions that.</p>';
  }

  /* ================================================================ menus */
  var MENU = null, menuClosedAt = 0;
  function closeMenu() { if (MENU) { var a = MENU.anchor; MENU.el.remove(); MENU = null; if (a && a.removeAttribute) a.removeAttribute('aria-expanded'); } }
  function openMenu(anchor, cfg) {
    closeMenu();
    var el = document.createElement('div');
    el.className = 'menu'; el.tabIndex = -1; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', cfg.label || 'Options');
    document.body.appendChild(el);
    var m = MENU = { el: el, anchor: anchor, active: 0, opts: cfg.options || [], value: (cfg.value || []).slice() };
    el.innerHTML = (cfg.title ? '<div class="menu-t">' + esc(cfg.title) + '</div>' : '') + '<div class="menu-list" role="listbox" aria-multiselectable="true"></div>';
    var list = el.querySelector('.menu-list');
    function isSel(o) { return m.value.indexOf(o.v) >= 0; }
    function draw() {
      list.innerHTML = m.opts.map(function (o, i) {
        return '<button type="button" class="mi' + (i === m.active ? ' on' : '') + '" data-i="' + i + '" role="option" aria-selected="' + isSel(o) + '">' +
          cfg.render(o) + (isSel(o) ? '<span class="mi-check">' + I.check + '</span>' : '') + '</button>';
      }).join('');
    }
    function place() {
      var r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
      var top = r.bottom + 4; if (top + h > window.innerHeight - 8 && r.top - h - 4 > 8) top = r.top - h - 4;
      el.style.top = Math.max(8, Math.min(top, window.innerHeight - h - 8)) + 'px';
      el.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
    }
    function pick(o) { if (!o) return; var i = m.value.indexOf(o.v); if (i >= 0) m.value.splice(i, 1); else m.value.push(o.v); cfg.onPick(m.value.slice()); draw(); }
    list.addEventListener('mousedown', function (e) { var b = e.target.closest('.mi'); if (!b) return; e.preventDefault(); pick(m.opts[+b.dataset.i]); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); m.active = Math.min(m.opts.length - 1, m.active + 1); draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); m.active = Math.max(0, m.active - 1); draw(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(m.opts[m.active]); }
      else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); closeMenu(); if (anchor.focus) anchor.focus(); }
    });
    draw(); place();
    el.focus({ preventScroll: true });
    if (anchor.setAttribute) anchor.setAttribute('aria-expanded', 'true');
  }
  document.addEventListener('mousedown', function (e) { if (MENU && !MENU.el.contains(e.target) && !MENU.anchor.contains(e.target)) { closeMenu(); menuClosedAt = Date.now(); } }, true);
  window.addEventListener('resize', closeMenu);
  document.addEventListener('scroll', function (e) { if (MENU && !(e.target instanceof Node && MENU.el.contains(e.target))) closeMenu(); }, { capture: true, passive: true });
  function openFilterMenu(anchor, key) {
    var P = S.prefs, opts = key === 'iarea' ? AREAS.concat([{ v: '', l: 'No area', c: 'default' }]) : COSTS;
    openMenu(anchor, {
      options: opts, value: P[key], title: 'Show ideas where ' + (key === 'iarea' ? 'the area' : 'the cost') + ' is',
      render: function (o) { return o.v === '' ? '<span class="dim">No area</span>' : tag(o.l || o.v, o.c); },
      onPick: function (vals) { P[key] = vals; savePrefs(); renderFilterBar(); renderIdeaResults(); var a = document.querySelector('[data-filter="' + key + '"]'); if (a && MENU) MENU.anchor = a; }
    });
  }

  /* ================================================================ side peek */
  var peekBody = null;
  function prop(ic, label, body) { return '<div class="prop"><div class="pl">' + I[ic] + '<span>' + esc(label) + '</span></div><div class="pv">' + body + '</div></div>'; }
  function peekBar(crumb) {
    return '<div class="pk-bar"><button class="ibtn" data-act="close" aria-label="Close" title="Close">' + I.chevRight2 + '</button>' +
      '<span class="pk-crumb">' + crumb + '</span><span class="grow"></span></div>';
  }
  function chips(list, kind) {
    return list.length ? list.map(function (id) {
      if (kind === 'feature') return '<button class="rel-chip" data-feature="' + esc(id) + '"' + (S.features.has(id) ? '' : ' disabled') + '><span>' + esc(featureName(id)) + '</span></button>';
      var d = S.ideas.get(id);
      return '<button class="rel-chip" data-idea="' + esc(id) + '" title="' + esc((STATE_BY[stateOf(d)] || {}).l || '') + '"><span>' + esc(d.title || 'Untitled idea') + '</span></button>';
    }).join('') : '<span class="empty">None</span>';
  }
  function peekFeatureHtml(f, id) {
    var ideas = ideasFor(id).sort(function (a, b) { return (STATE_RANK[stateOf(S.ideas.get(a))] || 0) - (STATE_RANK[stateOf(S.ideas.get(b))] || 0); });
    return peekBar('Features <span class="dim">/</span> <b>' + esc(f.area || 'No area') + '</b>') + '<div class="pk-scroll">' +
      '<h2 class="pk-title-ro">' + esc(f.name || id) + '</h2>' +
      '<div class="props">' +
        prop('pStatus', 'Status', statusPill(f.status) + (f.statusNote ? '<div class="note" data-note></div>' : '')) +
        prop('pArea', 'Area', f.area ? areaTag(f.area) : '<span class="empty">None</span>') +
        prop('pCal', 'Last reviewed', esc(f.lastReviewed || 'Never')) +
        prop('pFile', 'Design document', '<code class="mono">' + esc(f.source || '') + '</code><span class="hint">in the game’s repository</span>') +
      '</div>' +
      '<div class="pk-sec"><h3>Ideas that build on this</h3><div class="chip-row">' + chips(ideas, 'idea') + '</div></div>' +
      '<div class="pk-div"></div><div class="md feature-body" data-body></div></div>';
  }
  function peekIdeaHtml(d) {
    var st = stateOf(d), so = STATE_BY[st] || {}, co = COST_BY[d.cost] || {};
    return peekBar('Ideas <span class="dim">/</span> <b>' + esc(so.l || '') + '</b>') + '<div class="pk-scroll">' +
      '<h2 class="pk-title-ro">' + esc(d.title || 'Untitled idea') + '</h2>' +
      '<div class="props">' +
        prop('pStatus', 'State', statePill(st) + (so.h ? '<span class="hint">' + esc(so.h) + '</span>' : '')) +
        prop('pArea', 'Area', d.area ? areaTag(d.area) : '<span class="empty">None</span>') +
        prop('pSelect', 'Cost', costTag(d.cost) + (co.h ? '<span class="hint">' + esc(co.h) + '</span>' : '')) +
        prop('pLink', 'Builds on', chips(ids(d.leansOn), 'feature')) +
        prop('pLink', 'Would change', chips(ids(d.owners), 'feature')) +
        (d.task ? prop('pHash', 'Task', '<code class="mono">' + esc(d.task) + '</code>') : '') +
        prop('pPerson', 'Added by', esc(d.author || 'Someone') + (d.created ? '<span class="hint">' + esc(d.created) + '</span>' : '')) +
        (d.updated && d.updated !== d.created ? prop('pCal', 'Updated', esc(d.updated)) : '') +
      '</div>' +
      '<div class="pk-div"></div><div class="md idea-body" data-body></div></div>';
  }
  function openPeek(coll, id, o) {
    o = o || {};
    closeMenu();
    var d = S[coll] && S[coll].get(id); if (!d) { closePeek(); return; }
    S.peek = { coll: coll, id: id };
    $peek.innerHTML = coll === 'features' ? peekFeatureHtml(d, id) : peekIdeaHtml(d);
    if (coll === 'features') {
      var note = $peek.querySelector('[data-note]'); if (note) note.innerHTML = mdHtml(d.statusNote);
      renderMd($peek.querySelector('[data-body]'), d.body, d.source);
    } else renderMd($peek.querySelector('[data-body]'), d.body, d.path);
    $peek.classList.add('open');
    $peek.setAttribute('aria-label', coll === 'features' ? 'Feature' : 'Idea');
    $scrim.hidden = window.innerWidth >= 1100;
    markOpen(); setHash();
    if (!o.keep) { var sc = $peek.querySelector('.pk-scroll'); if (sc) sc.scrollTop = 0; var c = $peek.querySelector('[data-act="close"]'); if (c) c.focus({ preventScroll: true }); }
  }
  function closePeek() {
    if (!S.peek) return;
    closeMenu();
    S.peek = null;
    $peek.classList.remove('open'); $scrim.hidden = true;
    markOpen(); setHash();
  }
  function markOpen() {
    var o = S.peek;
    document.querySelectorAll('#main [data-open]').forEach(function (n) { n.classList.toggle('is-open', !!o && n.dataset.id === o.id && n.dataset.open === o.coll); });
  }

  /* ================================================================ navigation */
  function go(view, id) {
    closePeek(); closeMenu();
    if (view !== S.view) { S.q = ''; S.searchOpen = false; }
    S.view = view; S.noteId = view === 'note' ? id : null;
    $sb.classList.remove('open'); $scrim.hidden = true;
    renderSidebar(); renderTopbar(); renderMain(); $main.scrollTop = 0;
    setHash();
  }
  function goTo(kind, id) {
    if (kind === 'feature') { if (S.features.has(id)) openPeek('features', id); }
    else if (kind === 'idea') { if (S.ideas.has(id)) openPeek('ideas', id); }
    else if (kind === 'note') { if (S.notes.has(id)) go('note', id); }
    else if (kind === 'overview' || kind === 'features' || kind === 'ideas' || kind === 'search') go(kind);
  }
  function setHash() {
    var t = S.peek ? (S.peek.coll === 'features' ? 'feature-' : 'idea-') + S.peek.id : S.view === 'note' ? 'note-' + S.noteId : S.view;
    try { if (location.hash.slice(1) !== t) history.replaceState(null, '', '#' + t); } catch (e) {}
  }
  function readHash() {
    var h = (location.hash || '').slice(1), m;
    if ((m = /^note-(.+)$/.exec(h))) return { view: 'note', id: m[1] };
    if ((m = /^feature-(.+)$/.exec(h))) return { view: 'features', peek: ['features', m[1]] };
    if ((m = /^idea-(.+)$/.exec(h))) return { view: 'ideas', peek: ['ideas', m[1]] };
    if (h === 'features' || h === 'ideas' || h === 'search') return { view: h };
    return { view: 'overview' };
  }

  /* ================================================================ events */
  document.addEventListener('click', function (e) {
    if (!S.data) return;
    var t = e.target;
    if (t.closest('.menu')) return;
    var goEl = t.closest('a[data-go]');
    if (goEl) { e.preventDefault(); goTo(goEl.dataset.go, goEl.dataset.id); return; }
    var act = t.closest('[data-act]');
    var nav = t.closest('[data-nav]');
    if (nav && !act) { go(nav.dataset.nav, nav.dataset.id); return; }
    var vt = t.closest('[data-vtab]');
    if (vt) { if (S.view === 'features') S.prefs.fview = vt.dataset.vtab; else S.prefs.iview = vt.dataset.vtab; savePrefs(); renderViewsBar(); if (S.view === 'features') renderFeatureResults(); else renderIdeaResults(); return; }
    var fp = t.closest('[data-filter]');
    if (fp) { if (MENU && MENU.anchor === fp) closeMenu(); else openFilterMenu(fp, fp.dataset.filter); return; }
    var ft = t.closest('[data-ftoggle]');
    if (ft) { S.prefs[ft.dataset.ftoggle] = !S.prefs[ft.dataset.ftoggle]; savePrefs(); renderFilterBar(); renderIdeaResults(); return; }
    var gh = t.closest('.grp-h');
    if (gh) { var k = gh.dataset.group; if (S.prefs.collapsed[k]) delete S.prefs.collapsed[k]; else S.prefs.collapsed[k] = 1; savePrefs(); if (S.view === 'features') renderFeatureResults(); else renderIdeaResults(); return; }
    var fc = t.closest('[data-feature]');
    if (fc) { if (!fc.disabled) goTo('feature', fc.dataset.feature); return; }
    var ic = t.closest('[data-idea]');
    if (ic) { goTo('idea', ic.dataset.idea); return; }
    if (act) {
      var a = act.dataset.act;
      if (a === 'close') { closePeek(); return; }
      if (a === 'open-sb') { $sb.classList.add('open'); $scrim.hidden = false; return; }
      if (a === 'close-sb') { $sb.classList.remove('open'); $scrim.hidden = !S.peek || window.innerWidth >= 1100; return; }
      if (a === 'open-search') { S.searchOpen = true; renderViewsBar(); var q = document.getElementById('q'); if (q) q.focus(); return; }
      if (a === 'reset-filters') { S.prefs.iarea = []; S.prefs.icost = []; S.q = ''; S.searchOpen = false; savePrefs(); mountIdeas(); return; }
      if (a === 'open-peek') { e.stopPropagation(); openPeek(act.dataset.coll, act.dataset.id); return; }
      if (a === 'lock') { lockNow(); return; }
    }
    var open = t.closest('#main [data-open]');
    if (open && !t.closest('a')) { openPeek(open.dataset.open, open.dataset.id); return; }
    /* A click on empty space outside the side panel closes it, unless it only closed a menu or ended a text selection. */
    if (S.peek && Date.now() - menuClosedAt > 300 && !t.closest('#peek, .menu, button, a, input, select, textarea, label')) {
      var selText = window.getSelection ? String(window.getSelection()) : '';
      if (!selText) closePeek();
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target.id !== 'q') return;
    S.q = e.target.value;
    if (S.view === 'features') renderFeatureResults(); else { renderFilterBar(); renderIdeaResults(); }
  });
  document.addEventListener('focusout', function (e) { if (e.target.id === 'q' && !S.q) { setTimeout(function () { if (!S.q && document.activeElement && document.activeElement.id !== 'q') { S.searchOpen = false; renderViewsBar(); } }, 150); } });
  $scrim.addEventListener('click', function () {
    if ($sb.classList.contains('open')) { $sb.classList.remove('open'); $scrim.hidden = !S.peek || window.innerWidth >= 1100; return; }
    closePeek();
  });
  document.addEventListener('keydown', function (e) {
    if (!S.data) return;
    if (e.key === 'Escape') {
      if (MENU) { closeMenu(); return; }
      if ($sb.classList.contains('open')) { $sb.classList.remove('open'); $scrim.hidden = true; return; }
      if (e.target.id === 'q') { S.q = ''; S.searchOpen = false; renderViewsBar(); if (S.view === 'features') renderFeatureResults(); else renderIdeaResults(); return; }
      if (S.peek) { closePeek(); return; }
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('#main [data-open]')) { e.preventDefault(); openPeek(e.target.dataset.open, e.target.dataset.id); }
  });
  window.addEventListener('resize', function () { if (S.peek) $scrim.hidden = window.innerWidth >= 1100 && !$sb.classList.contains('open'); });
  window.addEventListener('hashchange', function () {
    if (!S.data) return;
    var h = readHash(), cur = location.hash.slice(1);
    if (h.peek) { if (!S.peek || S.peek.id !== h.peek[1]) { if (S.view !== h.view && S.view !== 'overview') go(h.view); openPeek(h.peek[0], h.peek[1]); } return; }
    if (h.view !== S.view || (h.view === 'note' && h.id !== S.noteId)) go(h.view, h.id);
    else if (S.peek && cur === S.view) closePeek();
  });

  start();
})();
