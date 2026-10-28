(function () {
  var root = document.getElementById('tl');
  var data = JSON.parse(document.getElementById('tl-data').textContent);
  var showPh = root.getAttribute('data-placeholders') === 'true';
  // RULE: writing and papers live in _data/writing.yml and _data/papers.yml only;
  // they are added to the timeline here, so nothing is entered twice.
  function slug(t) { return String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); }
  (data.writing || []).forEach(function (w) {
    if (w.status !== 'published' || !w.title || !w.url || !w.date) return;
    data.events = (data.events || []).concat([{ id: 'w-' + slug(w.title), chapter: 'now', category: 'writing',
      tags: ['ai-safety', 'writing'], date: w.date, title: w.title, summary: w.summary || '',
      status: 'sourced', sources: [{ label: w.venue || 'Read', url: w.url }] }]);
  });
  (data.papers || []).forEach(function (p) {
    if (!p.show || !p.title || !p.date) return;
    var src = []; if (p.pdf) src.push({ label: 'Paper', url: p.pdf }); if (p.code) src.push({ label: 'Code', url: p.code });
    data.events = (data.events || []).concat([{ id: 'p-' + slug(p.title), chapter: 'now', category: 'papers',
      tags: ['ai-safety', 'technical', 'papers'], date: p.date, title: p.title,
      summary: [p.venue, p.status].filter(Boolean).join(' · ') + (p.summary ? '. ' + p.summary : ''),
      status: src.length ? 'sourced' : 'self-reported', sources: src }]);
  });
  var tag = root.getAttribute('data-tag') || '';
  var streams = {}; (data.streams || []).forEach(function (st) { streams[st.id] = st; });
  var profile = null; (data.profiles || []).forEach(function (p) { if (p.id === root.getAttribute('data-profile')) profile = p; });
  function inProfile(x) { return !profile || (profile.include || []).indexOf(x.id) >= 0; }
  function inStream(x) { return inProfile(x) && (!tag || (x.tags || []).indexOf(tag) >= 0 || x.category === tag); }
  var base = root.getAttribute('data-base') || '';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function ym(s) { if (!s || s === 'TODO') return null; var p = String(s).split('-'); return (+p[0]) * 12 + ((+p[1] || 1) - 1) + (p[2] ? (+p[2]) / 32 : 0); }
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // One date style everywhere: "Mon YYYY", or just "YYYY" when the month isn't known (precision: year).
  function fmt(d, prec) {
    if (!d || d === 'TODO') return '';
    var p = String(d).split('-');
    return (p.length < 2 || prec === 'year') ? p[0] : MONTHS[(+p[1]) - 1] + ' ' + p[0];
  }
  function whenOf(x, isTrack) {
    if (x.placeholder) return ['Date to confirm'];
    if (isTrack) return [fmt(x.start, x.precision), '– ' + (ym(x.end) == null ? 'now' : fmt(x.end, x.precision))];
    return [fmt(x.date, x.precision) || x.when || ''];
  }
  function whenHtml(x, isTrack) { return whenOf(x, isTrack).map(function (s) { return '<span class="w">' + esc(s) + '</span>'; }).join(' '); }
  function catLabel(x) { var c = catOf(x); return c ? '<p class="cat"><i style="--c: var(--' + esc(c.color) + ')" aria-hidden="true"></i>' + esc(c.label) + '</p>' : ''; }
  function visible(x) { return (!x.draft || (showPh && x.placeholder)) && inStream(x); }

  var cats = {}; (data.categories || []).forEach(function (c) { cats[c.id] = c; });
  function catOf(x) {
    if (x.category && cats[x.category]) return cats[x.category];
    return null;
  }
  var now = new Date();
  var todayD = now.getFullYear() * 12 + now.getMonth() + now.getDate() / 32;
  var today = todayD;
  // On a stream page, keep the lines that shown entries branch off (and their parents),
  // drawn as quiet context, so nothing floats unconnected.
  function published(x) { return !x.draft || (showPh && x.placeholder); }
  var allTracks = {}; (data.tracks || []).forEach(function (t) { allTracks[t.id] = t; });
  var needed = {};
  function need(x) {
    (x.tracks || []).concat(x.continues ? [x.continues] : []).forEach(function (id) {
      var p = allTracks[id];
      if (p && published(p) && !needed[id]) { needed[id] = true; need(p); }
    });
  }
  (data.events || []).concat(data.tracks || []).filter(visible).forEach(need);
  var tracks = (data.tracks || []).filter(function (t) {
    if (visible(t)) return true;
    if ((tag || profile) && needed[t.id] && published(t)) { t.context = true; return true; }
    return false;
  }).filter(function (t) { return ym(t.start) != null; });
  tracks.forEach(function (t) { var tc = catOf(t); if (tc) t.color = t.shade || tc.color; t.s = ym(t.start); t.ongoing = ym(t.end) == null; t.e = t.ongoing ? Infinity : ym(t.end) + (String(t.end).split('-').length < 3 ? 0.99 : 0); });
  tracks.sort(function (a, b) { return a.s - b.s; });

  var laneEnd = [];
  tracks.forEach(function (t) {
    var l = -1;
    var parent = t.continues && tracks.filter(function (p) { return p.id === t.continues; })[0];
    if (parent && parent.lane != null) { l = parent.lane; t.continuesFrom = parent; parent.continuedBy = t; }
    else for (var i = 0; i < laneEnd.length; i++) { if (laneEnd[i] < t.s) { l = i; break; } }
    if (l < 0) { l = laneEnd.length; laneEnd.push(0); }
    laneEnd[l] = t.e; t.lane = l;
  });
  var nL = laneEnd.length;
  root.style.setProperty('--lanes', nL);

  var chapterList = data.chapters || [];
  var order = {}; chapterList.forEach(function (c, i) { order[c.id] = i; });
  var chapters = {}; chapterList.forEach(function (c) { chapters[c.id] = c; });

  var rows = [];
  var horizon = [];
  (data.events || []).filter(visible).forEach(function (e) {
    var d = ym(e.date); if (d == null) return;
    if (d > todayD) horizon.push({ d: d, x: e });   // still ahead: shown above Today
    else rows.push({ kind: 'event', d: d, x: e, chapter: e.chapter });
  });
  horizon.sort(function (a, b) { return b.d - a.d; });
  tracks.forEach(function (t) { rows.push({ kind: 'start', d: t.s, x: t, chapter: t.chapter }); });
  // Present at the top: chapters in listed order (now -> roots), newest first inside each.
  rows.sort(function (a, b) {
    var tie = 0;
    if (a.kind === 'start' && b.kind === 'start') {
      // a line that branches off another line starting the same month sits just above its parent
      if ((a.x.tracks || []).indexOf(b.x.id) >= 0) tie = -1;
      else if ((b.x.tracks || []).indexOf(a.x.id) >= 0) tie = 1;
    }
    return (order[a.chapter] - order[b.chapter]) || (b.d - a.d) || tie || (a.kind === 'start' ? 1 : -1);
  });

  var out = [], seen = {};
  rows.forEach(function (r) {
    if (!seen[r.chapter] && chapters[r.chapter]) { out.push({ kind: 'chapter', d: r.d, x: chapters[r.chapter], chapter: r.chapter }); seen[r.chapter] = true; }
    out.push(r);
  });

  // Each track runs from its start row (bottom) up through newer rows in its chapter until it has ended.
  out.forEach(function (r, i) { if (r.kind === 'start') r.x.startIdx = i; });
  tracks.forEach(function (t) {
    var top = t.startIdx;
    for (var j = t.startIdx - 1; j >= 0; j--) {
      var r = out[j];
      if (r.d > t.e) break;   // lines continue across chapter boundaries while their dates do
      // only pass through a section header if the line also continues into the section above it
      if (r.kind === 'chapter' && (j === 0 ? !t.ongoing : out[j - 1].d > t.e)) break;
      top = j;   // line covers every row inside its dates, so its length matches its duration
    }
    t.topIdx = top;
    var tr = out[top];
    // If the top row is not part of this track, end the line at that row's top edge
    // instead of beside its title, so it never looks connected to that card.
    t.topIsMember = top === t.startIdx || (tr.kind !== 'chapter' && (tr.x.tracks || []).indexOf(t.id) >= 0);
  });

  var byId = {}; tracks.forEach(function (t) { byId[t.id] = t; });
  function rowColor(x) {
    if (x.shade) return x.shade;
    var c = catOf(x); if (c) return c.color;
    var p = (x.tracks || []).map(function (id) { return byId[id]; }).filter(Boolean)[0];
    return p ? p.color : 'blue';
  }
  function linksFor(i) {
    var r = out[i]; if (r.kind !== 'event' && r.kind !== 'start') return [];
    return (r.x.tracks || []).map(function (id) { return byId[id]; })
      .filter(function (t) { return t && t !== r.x && t.topIdx <= i && i <= t.startIdx; });
  }

  function laneCells(i) {
    var r = out[i], linked = linksFor(i);
    var cells = [];
    for (var l = 0; l < nL; l++) {
      var t = null;
      tracks.forEach(function (k) { if (k.lane === l && k.topIdx <= i && i <= k.startIdx) t = k; });
      if (!t) { cells.push('<span class="lane"></span>'); continue; }
      var isTop = i === t.topIdx && !(t.ongoing && t.topIdx === 0), isStart = i === t.startIdx;
      // a line that continues into a successor (e.g. promotion) runs straight up with no end cap,
      // and the successor's start runs straight down to meet it
      if (isTop && t.continuedBy) isTop = false;
      var cls = 'seg ' + (isStart && t.continuesFrom ? (isTop ? 'start' : 'full') : isTop && isStart ? 'only' : isTop ? (t.topIsMember ? 'start' : 'start edge') : isStart ? 'end' : 'full') + (t.placeholder ? ' ph' : '');
      var c = esc(t.color || 't1');
      cells.push('<span class="lane"><span class="' + cls + '" style="--c: var(--' + c + ')"></span>' +
        (isStart ? '<span class="node" style="--c: var(--' + c + ')"></span>' : '') +
        (isTop && !isStart && t.e < today ? '<span class="cap' + (t.topIsMember ? '' : ' edge') + '" style="--c: var(--' + c + ')"></span>' : '') +
        (linked.indexOf(t) >= 0 ? '<span class="node small" style="--c: var(--' + c + ');--k:0"></span>' : '') + '</span>');
    }
    return '<div class="lanes" aria-hidden="true">' + cells.join('') + '</div>';
  }

  function sources(x) {
    if (x.sources && x.sources.length) {
      return '<p class="sources">Sources: ' + x.sources.map(function (s) { return '<a href="' + esc(s.url) + '" rel="noopener">' + esc(s.label) + '</a>'; }).join(', ') + '</p>';
    }
    return x.status === 'self-reported' ? '<p class="sources">From my own records</p>' : '';
  }
  function tagLinks(x) {
    if (profile) return '';
    var t = (x.tags || []).filter(function (id) { return streams[id] && !streams[id].parent && id !== tag && !(streams[tag] && streams[tag].parent === id); });
    if (!t.length) return '';
    return '<p class="tags">Also in: ' + t.map(function (id) { return '<a href="' + esc(base + '/streams/' + id + '/') + '" data-stream="' + esc(id) + '">' + esc(streams[id].title) + '</a>'; }).join(', ') + '</p>';
  }
  function link(u, text) { return u ? '<p><a class="story-link" href="' + esc(base + u) + '">' + text + '</a></p>' : ''; }

  var html = out.map(function (r, i) {
    var x = r.x;
    if (r.kind === 'chapter') {
      return '<div class="row chapter-row layer-' + esc(x.layer || '') + '" id="chapter-' + esc(x.id) + '">' + '<div class="when"></div>' + laneCells(i) + '<div class="spine"></div>' +
        '<div class="body chapter-head"><h2>' + esc(x.title) + '</h2><p class="years">' + esc(x.years) + '</p><p class="chapter-intro">' + esc((profile && profile.intros && profile.intros[x.id]) || (tag && x.intros && (x.intros[tag] || (streams[tag] && x.intros[streams[tag].parent]))) || x.intro) + '</p>' + link(x.story, 'Read the longer story') + '</div></div>';
    }
    var isStart = r.kind === 'start';
    var swatch = isStart ? '<span class="swatch' + (x.placeholder ? ' ph' : '') + '" style="--c: var(--' + esc(x.color || 't1') + ')"></span>' : '';
    // Branches: an event connects each of its lines straight to the spine.
    // A line that starts here connects its parent line(s) to its own node, then runs from its node to the spine,
    // so wires never pass through another line's start node.
    function branch(t, k, endLane) {
      var y = 8.6 + 6 * k;   // px from row top, matches .branch top
      var hops = [];
      tracks.forEach(function (o) {
        if (o === t || o.lane <= t.lane || (endLane != null && o.lane >= endLane) || o.topIdx > i || i > o.startIdx) return;
        var oTop = i === o.topIdx && !(o.ongoing && o.topIdx === 0), oStart = i === o.startIdx;
        var covers = (oTop && oStart) ? false : oTop ? (o.topIsMember ? y > 9.6 : true) : oStart ? y < 12 : true;
        if (covers) hops.push(o.lane);
      });
      hops.sort(function (a, b) { return a - b; });
      var u = function (h) { return '(' + (h - t.lane) + ' * var(--lane-w))'; };
      var parts = '', x = null;
      hops.forEach(function (h) {
        var from = x ? 'calc(' + x + ')' : '0px';
        parts += '<span class="wire" style="left:' + from + ';width:calc(' + u(h) + ' - 5px - ' + (x ? '(' + x + ')' : '0px') + ')"></span>' +
                 '<span class="hop" style="left:calc(' + u(h) + ' - 5px)"></span>';
        x = u(h) + ' + 5px';
      });
      parts += '<span class="wire" style="left:' + (x ? 'calc(' + x + ')' : '0px') + ';right:0"></span>';
      var w = endLane != null ? ';width:calc(' + (endLane - t.lane) + ' * var(--lane-w))' : '';
      return '<span class="branch" aria-hidden="true" style="--l:' + t.lane + ';--k:' + k + ';--c: var(--' + esc(t.color || 't1') + ')' + w + '">' + parts + '</span>';
    }
    // Chain every line that touches this row, left to right: each wire runs to the next line's dot,
    // and only the line nearest the spine continues to the spine. No two wires ever run side by side.
    var chain = linksFor(i).slice();
    if (isStart && chain.indexOf(x) < 0) chain.push(x);
    chain.sort(function (p, q) { return p.lane - q.lane; });
    var branches = chain.map(function (t, k) { return branch(t, 0, k < chain.length - 1 ? chain[k + 1].lane : null); }).join('');
    var layer = chapters[r.chapter] && chapters[r.chapter].layer ? ' layer-' + esc(chapters[r.chapter].layer) : '';
    return '<div class="row ' + (isStart ? 'track-row' : 'event-row') + (x.context ? ' context' : '') + layer + (x.story ? ' has-story' : '') + '" id="' + esc(x.id) + '">' + branches +
      '<div class="when">' + whenHtml(x, isStart) + '</div>' + laneCells(i) +
      '<div class="spine"><span class="dot' + (isStart ? ' start' : '') + '" style="--c: var(--' + esc(rowColor(x)) + ')"></span></div>' +
      (x.context ? '<div class="body"><p class="when-inline">' + whenHtml(x, isStart) + '</p><h3>' + swatch + esc(x.title) + '</h3></div></div>' :
      '<div class="body">' + catLabel(x) + '<p class="when-inline">' + whenHtml(x, isStart) + '</p><h3>' + swatch + esc(x.title) + '</h3><p>' + esc(x.summary) + '</p>' +
      (x.placeholder ? '<p class="sources">Dates are placeholders until confirmed</p>' : '') + sources(x) + link(x.story, 'More on this') + tagLinks(x) + '</div></div>');
  }).join('');

  var todayLabel = MONTHS[now.getMonth()] + ' ' + now.getFullYear();
  var todayRow = '<div class="row today-row"><div class="when">' + esc(todayLabel) + '</div>' +
    '<div class="lanes" aria-hidden="true">' + (function () { var c = []; for (var l = 0; l < nL; l++) { var k = null; tracks.forEach(function (x) { if (x.lane === l && x.ongoing && x.topIdx === 0) k = x; }); c.push('<span class="lane">' + (k ? '<span class="seg start ongoing" style="--c: var(--' + esc(k.color || 't1') + ')"></span>' : '') + '</span>'); } return c.join(''); })() + '</div>' +
    '<div class="spine"><span class="dot today"></span></div>' +
    '<div class="body"><p class="when-inline">' + esc(todayLabel) + '</p><h3>Today</h3></div></div>';
  var emptyLanes = '<div class="lanes" aria-hidden="true">' + new Array(nL + 1).join('<span class="lane"></span>') + '</div>';
  var horizonHtml = horizon.length ? '<div class="row horizon-head"><div class="when"></div>' + emptyLanes + '<div class="spine"></div>' +
      '<div class="body"><h2>Coming up</h2></div></div>' +
    horizon.map(function (h) {
      var x = h.x;
      return '<div class="row event-row horizon" id="' + esc(x.id) + '"><div class="when">' + whenHtml(x, false) + '</div>' + emptyLanes +
        '<div class="spine"><span class="dot upcoming" style="--c: var(--' + esc(rowColor(x)) + ')"></span></div>' +
        '<div class="body"><p class="when-inline">' + whenHtml(x, false) + '</p><h3>' + esc(x.title) + '</h3><p>' + esc(x.summary) + '</p>' +
        sources(x) + tagLinks(x) + '</div></div>';
    }).join('') : '';
  if (html || horizonHtml) html = horizonHtml + todayRow + html;

  // Scroll rail: a slim copy of the timeline spine fixed to the right edge.
  // Chapter dots sit where each chapter is on the page; the blue fill shows how far you've read.
  function buildRail() {
    var old = document.getElementById('tl-rail'); if (old) old.remove();
    var heads = [].slice.call(root.querySelectorAll('.chapter-row'));
    if (!heads.length) return;
    var rail = document.createElement('nav');
    rail.id = 'tl-rail'; rail.className = 'rail'; rail.setAttribute('aria-label', 'Timeline sections');
    rail.innerHTML = '<span class="rail-fill"></span>' + heads.map(function (h, k) {
      var label = h.classList.contains('today-row') ? 'Today' : (h.querySelector('h2') || {}).textContent || '';
      return '<a class="rail-mark" href="#' + esc(h.id || ('section-' + k)) + '" data-k="' + k + '" aria-label="Jump to ' + esc(label) + '"><span>' + esc(label) + '</span></a>';
    }).join('');
    document.body.appendChild(rail);
    var marks = rail.querySelectorAll('.rail-mark'), fill = rail.querySelector('.rail-fill');
    function docH() { return Math.max(1, document.documentElement.scrollHeight - innerHeight); }
    function place() {
      var H = rail.clientHeight, total = document.documentElement.scrollHeight;
      heads.forEach(function (h, k) {
        var y = h.getBoundingClientRect().top + scrollY;
        marks[k].style.top = Math.min(H, Math.max(0, y / total * H)) + 'px';
      });
      update();
    }
    function update() {
      var p = Math.min(1, scrollY / docH());
      fill.style.height = (p * rail.clientHeight) + 'px';
      var cur = 0;
      heads.forEach(function (h, k) { if (h.getBoundingClientRect().top < innerHeight * 0.4) cur = k; });
      [].forEach.call(marks, function (m, k) { m.classList.toggle('current', k === cur); });
    }
    rail.addEventListener('click', function (e) {
      var a = e.target.closest('.rail-mark'); if (!a) return;
      e.preventDefault(); var tgt = heads[+a.getAttribute('data-k')]; tgt.setAttribute('tabindex', '-1'); tgt.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); tgt.focus({ preventScroll: true });
    });
    if (!window.__railBound) {
      window.__railBound = true;
      addEventListener('scroll', function () { window.__railUpdate && window.__railUpdate(); }, { passive: true });
      addEventListener('resize', function () { window.__railPlace && window.__railPlace(); });
    }
    window.__railUpdate = update; window.__railPlace = place;
    place();
  }
  root.setAttribute('role', 'list'); root.setAttribute('aria-label', 'Timeline, newest first');
  root.innerHTML = html || '<p class="empty">Nothing in this view yet.</p>';
  [].forEach.call(root.querySelectorAll('.row'), function (r) { r.setAttribute('role', 'listitem'); });
  buildRail();
})();
