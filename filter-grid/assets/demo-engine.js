(function () {
  'use strict';
  var DATA = [{"slug": "lumen-house", "title": "Lumen House", "type": "branding", "excerpt": "Visual identity for a brand of handmade lamps.", "img": "../assets/img/project-01.jpg"}, {"slug": "mirabelle-cafe", "title": "Mirabelle Café", "type": "website", "excerpt": "Showcase website with table booking for a café and bookshop.", "img": "../assets/img/project-02.jpg"}, {"slug": "commute", "title": "Commute", "type": "app", "excerpt": "Mobile app for car sharing between home and work.", "img": "../assets/img/project-03.jpg"}, {"slug": "waves-festival", "title": "Waves Festival", "type": "print", "excerpt": "Posters and programme for an electronic music festival.", "img": "../assets/img/project-04.jpg"}, {"slug": "verde-gardens", "title": "Verde Gardens", "type": "website", "excerpt": "New website for a landscape designer, with a project portfolio.", "img": "../assets/img/project-05.jpg"}, {"slug": "pixel-health", "title": "Pixel Health", "type": "app", "excerpt": "Dashboard for a network of medical practices.", "img": "../assets/img/project-06.jpg"}, {"slug": "harbour-brewery", "title": "Harbour Brewery", "type": "branding", "excerpt": "Labels and identity for a craft brewery.", "img": "../assets/img/project-07.jpg"}, {"slug": "kora-studio", "title": "Kora Studio", "type": "website", "excerpt": "Online shop for a ceramics brand.", "img": "../assets/img/project-08.jpg"}, {"slug": "orbit", "title": "Orbit", "type": "app", "excerpt": "Habit tracking app for iOS and Android.", "img": "../assets/img/project-09.jpg"}, {"slug": "paper-review", "title": "Paper Review", "type": "print", "excerpt": "Layout of a quarterly culture magazine.", "img": "../assets/img/project-10.jpg"}, {"slug": "sap-workshop", "title": "Sap Workshop", "type": "branding", "excerpt": "Logo and brand guidelines for a joinery.", "img": "../assets/img/project-11.jpg"}, {"slug": "trail-guide", "title": "Trail Guide", "type": "website", "excerpt": "Tourist office website with an interactive map.", "img": "../assets/img/project-12.jpg"}], TYPES = [["branding", "Branding"], ["website", "Website"], ["app", "App"], ["print", "Print"]], PER_PAGE = 6, TAX = 'project_type';
  var params = new URLSearchParams(window.location.search);
  var layout = ['load_more', 'numbers', 'infinite'].indexOf(params.get('layout')) > -1 ? params.get('layout') : 'load_more';
  var style = params.get('style') === 'dropdown' ? 'dropdown' : 'buttons';
  var multi = style === 'buttons' && params.get('multi') === '1';
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]; }); }
  function typeName(slug) { for (var i = 0; i < TYPES.length; i++) { if (TYPES[i][0] === slug) return TYPES[i][1]; } return slug; }
  function query(terms, s, page) {
    var q = (s || '').toLowerCase();
    var items = DATA.filter(function (d) {
      return (!terms.length || terms.indexOf(d.type) > -1) && (!q || (d.title + ' ' + d.excerpt).toLowerCase().indexOf(q) > -1);
    });
    var max = Math.ceil(items.length / PER_PAGE);
    return { items: items.slice((page - 1) * PER_PAGE, page * PER_PAGE), total: items.length, max: max };
  }
  function card(d) {
    var href = '#' + d.slug;
    return '<article class="d5fg-card"><a class="d5fg-card__image" href="' + href + '" tabindex="-1" aria-hidden="true"><img src="' + d.img + '" width="768" height="512" alt="" loading="lazy"></a>' +
      '<div class="d5fg-card__body"><h3 class="d5fg-card__title"><a href="' + href + '">' + esc(d.title) + '</a></h3>' +
      '<p class="d5fg-card__meta"><span class="d5fg-card__terms"><a href="?d5fg_project_type=' + d.type + '">' + esc(typeName(d.type)) + '</a></span></p>' +
      '<div class="d5fg-card__excerpt"><p>' + esc(d.excerpt) + '</p></div>' +
      '<a class="d5fg-card__more" href="' + href + '">View project<span class="d5fg-sr-only">: ' + esc(d.title) + '</span></a></div></article>';
  }
  function items(r) { return r.items.length ? r.items.map(card).join('') : '<p class="d5fg-empty">No results found.</p>'; }
  function announce(total) { return total === 0 ? 'No results found.' : total + (total === 1 ? ' result found.' : ' results found.'); }
  function stateUrl(terms, s, page) {
    var p = new URLSearchParams(window.location.search);
    p.delete('d5fg_project_type'); p.delete('d5fg_s'); p.delete('d5fg_page');
    if (terms.length) p.set('d5fg_project_type', terms.join(','));
    if (s) p.set('d5fg_s', s);
    if (page > 1) p.set('d5fg_page', String(page));
    var qs = p.toString().replace(/%2C/g, ',');
    return qs ? '?' + qs : window.location.pathname;
  }
  function pageNumbers(page, max) {
    var n = [1, max];
    for (var i = page - 1; i <= page + 1; i++) { if (i >= 1 && i <= max) n.push(i); }
    n = n.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
    return n;
  }
  function link(num, text, label, terms, s, mod) {
    return '<a class="d5fg-page' + (mod ? ' ' + mod : '') + '" href="' + esc(stateUrl(terms, s, num)) + '" data-page="' + num + '" aria-label="' + esc(label) + '">' + text + '</a>';
  }
  function pagination(page, max, terms, s) {
    if (max < 2) return '';
    if (layout !== 'numbers') {
      return page >= max ? '' : '<button type="button" class="d5fg-load-more"' + (layout === 'infinite' ? ' data-infinite' : '') + '>Load more projects</button>';
    }
    var h = '', prev = 0;
    if (page > 1) h += link(page - 1, '&lsaquo;', 'Previous page', terms, s, 'd5fg-page--prev');
    pageNumbers(page, max).forEach(function (n) {
      if (n - prev > 1) h += '<span class="d5fg-page-gap" aria-hidden="true">&hellip;</span>';
      h += n === page ? '<span class="d5fg-page is-current" aria-current="page"><span class="d5fg-sr-only">Page </span>' + n + '</span>' : link(n, String(n), 'Page ' + n, terms, s);
      prev = n;
    });
    if (page < max) h += link(page + 1, '&rsaquo;', 'Next page', terms, s, 'd5fg-page--next');
    return h;
  }
  // First render, as the server would print it for the current URL.
  var terms = (params.get('d5fg_project_type') || '').split(',').filter(function (t) { return TYPES.some(function (x) { return x[0] === t; }); });
  if (!multi) terms = terms.slice(0, 1);
  var s = (params.get('d5fg_s') || '').trim();
  var page = layout === 'numbers' ? Math.max(1, parseInt(params.get('d5fg_page'), 10) || 1) : 1;
  var r = query(terms, s, page);
  var filters;
  if (style === 'dropdown') {
    filters = '<div class="d5fg-filters d5fg-filters--dropdown" data-taxonomy="' + TAX + '" data-param="d5fg_project_type"><label class="d5fg-sr-only" for="d5fg-filter-1">Filter by Type</label><select class="d5fg-filter-select" id="d5fg-filter-1"><option value="">All projects</option>' +
      TYPES.map(function (t) { return '<option value="' + t[0] + '"' + (terms.indexOf(t[0]) > -1 ? ' selected' : '') + '>' + esc(t[1]) + '</option>'; }).join('') + '</select></div>';
  } else {
    var btn = function (slug, label, on) { return '<button type="button" class="d5fg-filter' + (on ? ' is-active' : '') + '" data-term="' + slug + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(label) + '</button>'; };
    filters = '<div class="d5fg-filters d5fg-filters--buttons" role="group" aria-label="Filter by Type" data-taxonomy="' + TAX + '" data-param="d5fg_project_type">' +
      btn('', 'All projects', !terms.length) + TYPES.map(function (t) { return btn(t[0], t[1], terms.indexOf(t[0]) > -1); }).join('') + '</div>';
  }
  var root = document.getElementById('demo-module');
  root.innerHTML = '<div class="d5fg" data-d5fg="" data-config="demo" data-sig="demo" data-endpoint="api/query" data-nonce="" data-pagination="' + layout + '" data-multi="' + (multi ? '1' : '0') + '" data-page="' + page + '">' +
    '<div class="d5fg-toolbar"><form class="d5fg-search" role="search"><label class="d5fg-sr-only" for="d5fg-search-1">Search</label><input class="d5fg-search__input" type="search" id="d5fg-search-1" name="d5fg_s" value="' + esc(s) + '" placeholder="Search projects…" autocomplete="off"></form>' + filters + '</div>' +
    '<p class="d5fg-status d5fg-sr-only" role="status" aria-live="polite" aria-atomic="true"></p><div class="d5fg-grid" aria-busy="false" tabindex="-1">' + items(r) + '</div>' +
    '<nav class="d5fg-pagination" aria-label="Pagination">' + pagination(page, r.max, terms, s) + '</nav></div>';

  // Stands in for the WordPress REST endpoint (d5fg/v1/query): same parameters, same response.
  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = new URL(typeof input === 'string' ? input : input.url, window.location.href);
    if (!/\/api\/query$/.test(url.pathname)) return realFetch(input, init);
    var t = (url.searchParams.get('terms[' + TAX + ']') || '').split(',').filter(Boolean);
    var q = (url.searchParams.get('s') || '').trim();
    var p = Math.max(1, parseInt(url.searchParams.get('page'), 10) || 1);
    var res = query(t, q, p);
    var body = JSON.stringify({ items: items(res), pagination: pagination(p, res.max, t, q), total: res.total, max_pages: res.max, page: p, announce: announce(res.total) });
    var signal = init && init.signal;
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { resolve(new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })); }, 250);
      if (signal) signal.addEventListener('abort', function () { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); });
    });
  };
})();
