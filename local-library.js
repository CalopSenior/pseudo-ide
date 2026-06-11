/* ============================================================
   PSEUDO-IDE — local-library.js
   IndexedDB library + modal for Código and Notebooks
   ============================================================ */
window.LocalLib = (function () {

  /* ── IndexedDB helpers ── */
  const DB_NAME = 'pseudo_ide_lib';
  const DB_VER  = 1;

  function _openDB() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('code'))
          db.createObjectStore('code', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('notebook'))
          db.createObjectStore('notebook', { keyPath: 'id' });
      };
      req.onsuccess = function (e) { resolve(e.target.result); };
      req.onerror   = function (e) { reject(e.target.error); };
    });
  }

  function _list(store) {
    return _openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = db.transaction(store, 'readonly').objectStore(store).getAll();
        req.onsuccess = function (e) { resolve(e.target.result); };
        req.onerror   = function (e) { reject(e.target.error); };
      });
    });
  }

  function _get(store, id) {
    return _openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = db.transaction(store, 'readonly').objectStore(store).get(id);
        req.onsuccess = function (e) { resolve(e.target.result); };
        req.onerror   = function (e) { reject(e.target.error); };
      });
    });
  }

  function _put(store, entry) {
    return _openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = db.transaction(store, 'readwrite').objectStore(store).put(entry);
        req.onsuccess = function () { resolve(); };
        req.onerror   = function (e) { reject(e.target.error); };
      });
    });
  }

  function _del(store, id) {
    return _openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = db.transaction(store, 'readwrite').objectStore(store).delete(id);
        req.onsuccess = function () { resolve(); };
        req.onerror   = function (e) { reject(e.target.error); };
      });
    });
  }

  function _uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function _relDate(iso) {
    var diff = Date.now() - new Date(iso).getTime();
    var min = Math.floor(diff / 60000);
    if (min < 1)  return 'agora';
    if (min < 60) return min + 'min atrás';
    var h = Math.floor(min / 60);
    if (h < 24)   return h + 'h atrás';
    return Math.floor(h / 24) + 'd atrás';
  }

  /* ── Metadata extractor ── */
  function _meta(codigo) {
    var lines = (codigo || '').split('\n').slice(0, 20);
    function get(key) {
      var line = lines.find(function (l) {
        return l.trim().match(new RegExp('@' + key + '\\b', 'i'));
      });
      return line ? line.replace(new RegExp('.*@' + key + '\\s*', 'i'), '').trim() : '';
    }
    return {
      nome:    get('nome')    || 'Sem nome',
      autor:   get('autor'),
      versao:  get('versao'),
      desc:    get('desc') || get('descricao'),
      isBib:   lines.some(function (l) { return /@biblioteca\b/i.test(l); }),
      bibNome: get('biblioteca')
    };
  }

  /* ── HTML escaping ── */
  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Modal state ── */
  var _tab    = 'code';
  var _prevId = null;
  var _query  = '';

  /* ── Toast ── */
  function _toast(msg, type) {
    var t = document.getElementById('lib-toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'lib-toast lib-toast-show' + (type === 'err' ? ' lib-toast-err' : '');
    clearTimeout(t._to);
    t._to = setTimeout(function () { t.classList.remove('lib-toast-show'); }, 3000);
  }

  /* ── Public: save code ── */
  function saveCode(codigo, titleOverride) {
    codigo = codigo || '';
    var m    = _meta(codigo);
    var nome = titleOverride || m.nome;
    return _list('code').then(function (entries) {
      var existing = entries.find(function (e) { return e.nome === nome; });
      var now = new Date().toISOString();
      var entry = existing
        ? Object.assign({}, existing, { nome: nome, autor: m.autor, versao: m.versao, desc: m.desc, isBib: m.isBib, bibNome: m.bibNome, codigo: codigo, updatedAt: now })
        : { id: _uid(), nome: nome, autor: m.autor, versao: m.versao, desc: m.desc, isBib: m.isBib, bibNome: m.bibNome, codigo: codigo, savedAt: now, updatedAt: now };
      return _put('code', entry).then(function () {
        _toast('"' + nome + '" salvo na biblioteca.');
        return entry;
      });
    });
  }

  /* ── Public: save notebook ── */
  function saveNotebook(titleOverride) {
    var titleEl = document.getElementById('nb-title');
    var nome = titleOverride || (titleEl ? titleEl.value.trim() : '') || 'sem título';
    var cells = [];
    document.querySelectorAll('.nb-cell').forEach(function (cell) {
      var isCode = cell.classList.contains('nb-cell-code');
      var ta = cell.querySelector('.nb-cell-editor') || cell.querySelector('.nb-md-editor');
      if (ta) cells.push({ type: isCode ? 'codigo' : 'markdown', content: ta.value || ta.textContent || '' });
    });
    var now = new Date().toISOString();
    return _list('notebook').then(function (entries) {
      var existing = entries.find(function (e) { return e.nome === nome; });
      var entry = existing
        ? Object.assign({}, existing, { nome: nome, cells: cells, updatedAt: now })
        : { id: _uid(), nome: nome, cells: cells, savedAt: now, updatedAt: now };
      return _put('notebook', entry).then(function () {
        _toast('"' + nome + '" salvo na biblioteca.');
        return entry;
      });
    });
  }

  /* ── Tab switching ── */
  function _switchTab(tab) {
    _tab    = tab;
    _prevId = null;
    _query  = '';
    var tabCode = document.getElementById('lib-tab-code');
    var tabNb   = document.getElementById('lib-tab-nb');
    if (tabCode) tabCode.classList.toggle('lib-tab-on', tab === 'code');
    if (tabNb)   tabNb.classList.toggle('lib-tab-on', tab === 'notebook');
    var searchEl = document.getElementById('lib-search');
    if (searchEl) searchEl.value = '';
    _refresh();
  }

  function _onSearch(q) {
    _query = q;
    _refresh();
  }

  /* ── Row HTML for list view ── */
  function _codeRowHTML(e) {
    var badge = e.isBib ? '<span class="lib-bib-badge">lib</span>' : '';
    var desc  = e.desc  ? '<span class="lib-item-desc">' + _esc(e.desc.slice(0, 60)) + '</span>' : '';
    return '<div class="lib-item" data-id="' + _esc(e.id) + '">' +
      '<div class="lib-item-ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></div>' +
      '<div class="lib-item-info">' +
        '<div class="lib-item-name">' + _esc(e.nome) + ' ' + badge + '</div>' +
        '<div class="lib-item-meta">' + desc + '<span class="lib-item-age">' + _relDate(e.updatedAt) + '</span></div>' +
      '</div>' +
      '<div class="lib-item-acts">' +
        '<button class="lib-act" onclick="LocalLib._preview(\'' + _esc(e.id) + '\')" title="Pré-visualizar">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
        '</button>' +
        '<button class="lib-act" onclick="LocalLib._open(\'' + _esc(e.id) + '\')" title="Abrir no editor">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>' +
        '</button>' +
        '<button class="lib-act" onclick="LocalLib._export(\'' + _esc(e.id) + '\')" title="Exportar .pseudo">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
        '</button>' +
        '<button class="lib-act lib-act-del" onclick="LocalLib._delete(\'' + _esc(e.id) + '\')" title="Apagar">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>';
  }

  function _nbRowHTML(e) {
    var cnt    = (e.cells || []).length;
    var cntTxt = cnt === 1 ? '1 célula' : cnt + ' células';
    return '<div class="lib-item" data-id="' + _esc(e.id) + '">' +
      '<div class="lib-item-ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="21"/></svg></div>' +
      '<div class="lib-item-info">' +
        '<div class="lib-item-name">' + _esc(e.nome) + '</div>' +
        '<div class="lib-item-meta"><span class="lib-item-desc">' + cntTxt + '</span><span class="lib-item-age">' + _relDate(e.updatedAt) + '</span></div>' +
      '</div>' +
      '<div class="lib-item-acts">' +
        '<button class="lib-act" onclick="LocalLib._preview(\'' + _esc(e.id) + '\')" title="Pré-visualizar">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
        '</button>' +
        '<button class="lib-act" onclick="LocalLib._openNotebook(\'' + _esc(e.id) + '\')" title="Abrir no Notebook">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>' +
        '</button>' +
        '<button class="lib-act" onclick="LocalLib._exportNotebook(\'' + _esc(e.id) + '\')" title="Exportar .pseudonb">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
        '</button>' +
        '<button class="lib-act lib-act-del" onclick="LocalLib._delete(\'' + _esc(e.id) + '\')" title="Apagar">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>';
  }

  /* ── Preview renderer ── */
  function _renderPreview(entry, storeType) {
    var cnt = document.getElementById('lib-cnt');
    if (!cnt) return;

    var previewHTML = '';
    if (storeType === 'code') {
      var highlighted = (typeof aplicarHighlight === 'function')
        ? aplicarHighlight(entry.codigo || '')
        : _esc(entry.codigo || '');
      previewHTML = '<pre class="lib-prev-code">' + highlighted + '</pre>';
    } else {
      previewHTML = (entry.cells || []).map(function (c, i) {
        var label   = c.type === 'codigo' ? 'Código' : 'Markdown';
        var content = (c.type === 'codigo' && typeof aplicarHighlight === 'function')
          ? aplicarHighlight(c.content || '')
          : _esc(c.content || '');
        return '<div class="lib-prev-cell">' +
          '<div class="lib-prev-cell-label">' + label + ' ' + (i + 1) + '</div>' +
          '<pre class="lib-prev-code">' + content + '</pre>' +
          '</div>';
      }).join('');
    }

    var id  = _esc(entry.id);
    var isC = storeType === 'code';

    var editBtn = isC
      ? '<button class="lib-prev-act" onclick="LocalLib._open(\'' + id + '\')" title="Abrir no editor">' +
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg> Editar' +
        '</button>'
      : '<button class="lib-prev-act" onclick="LocalLib._openNotebook(\'' + id + '\')" title="Abrir no Notebook">' +
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg> Abrir' +
        '</button>';

    var runBtn = isC
      ? '<button class="lib-prev-act" onclick="LocalLib._run(\'' + id + '\')" title="Executar agora">' +
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Executar' +
        '</button>' : '';

    var libBtn = isC
      ? '<button class="lib-prev-act" onclick="LocalLib._useAsLib(\'' + id + '\')" title="Injetar como biblioteca local">' +
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> Usar como Biblioteca' +
        '</button>' : '';

    var shareBtn = isC
      ? '<button class="lib-prev-act" onclick="LocalLib._share(\'' + id + '\')" title="Gerar link">' +
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Compartilhar' +
        '</button>' : '';

    var pubBtn = isC
      ? '<button class="lib-prev-act" onclick="LocalLib._publish(\'' + id + '\')" title="Publicar na nuvem">' +
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/></svg> Publicar na Nuvem' +
        '</button>' : '';

    var exportBtn = isC
      ? '<button class="lib-prev-act" onclick="LocalLib._export(\'' + id + '\')" title="Exportar .pseudo">' +
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Exportar' +
        '</button>'
      : '<button class="lib-prev-act" onclick="LocalLib._exportNotebook(\'' + id + '\')" title="Exportar .pseudonb">' +
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Exportar' +
        '</button>';

    cnt.innerHTML =
      '<div class="lib-body-preview">' +
        '<div class="lib-prev-hd">' +
          '<button class="lib-prev-back" onclick="LocalLib._backToList()">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg> Voltar' +
          '</button>' +
          '<span class="lib-prev-title">' + _esc(entry.nome) + '</span>' +
        '</div>' +
        '<div class="lib-prev-toolbar">' +
          editBtn + runBtn + libBtn + shareBtn + pubBtn + exportBtn +
          '<button class="lib-prev-act lib-prev-act-del" onclick="LocalLib._delete(\'' + id + '\')" title="Apagar">' +
            '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg> Apagar' +
          '</button>' +
          '<button class="lib-prev-act" onclick="LocalLib._backToList()" title="Fechar preview">' +
            '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Fechar' +
          '</button>' +
        '</div>' +
        '<div class="lib-prev-content">' + previewHTML + '</div>' +
      '</div>';
  }

  /* ── List/preview refresh ── */
  function _refresh() {
    var cnt = document.getElementById('lib-cnt');
    if (!cnt) return;

    var store = _tab === 'code' ? 'code' : 'notebook';

    if (_prevId) {
      _get(store, _prevId).then(function (entry) {
        if (entry) _renderPreview(entry, store);
        else { _prevId = null; _refresh(); }
      });
      return;
    }

    Promise.all([_list('code'), _list('notebook')]).then(function (results) {
      var codes = results[0];
      var nbs   = results[1];

      /* update tab badges */
      var tabCode = document.getElementById('lib-tab-code');
      var tabNb   = document.getElementById('lib-tab-nb');
      if (tabCode) {
        var cntEl = tabCode.querySelector('.lib-tab-cnt');
        if (cntEl) cntEl.textContent = codes.length ? codes.length : '';
      }
      if (tabNb) {
        var cntElNb = tabNb.querySelector('.lib-tab-cnt');
        if (cntElNb) cntElNb.textContent = nbs.length ? nbs.length : '';
      }

      var entries  = _tab === 'code' ? codes : nbs;
      var q        = _query.toLowerCase().trim();
      var filtered = q
        ? entries.filter(function (e) {
            return (e.nome || '').toLowerCase().includes(q) || (e.desc || '').toLowerCase().includes(q);
          })
        : entries;

      if (filtered.length === 0) {
        var emptyMsg = q
          ? 'Nenhum resultado para "' + _esc(q) + '".'
          : (_tab === 'code' ? 'Nenhum código salvo ainda.' : 'Nenhum notebook salvo ainda.');
        var hint = !q
          ? '<p style="font-size:11px;margin-top:4px;color:var(--text-muted)">Use "Salvar Local" no menu Salvar para adicionar itens.</p>'
          : '';
        cnt.innerHTML =
          '<div class="lib-empty">' +
            '<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.25"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' +
            '<p>' + emptyMsg + '</p>' + hint +
          '</div>';
        return;
      }

      /* sort newest first */
      filtered.sort(function (a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); });

      var rows = filtered.map(function (e) {
        return _tab === 'code' ? _codeRowHTML(e) : _nbRowHTML(e);
      }).join('');
      cnt.innerHTML = '<div class="lib-list">' + rows + '</div>';
    });
  }

  /* ── Build & open modal ── */
  function openModal(tab) {
    if (tab) _tab = tab;
    _prevId = null;
    _query  = '';

    var modal = document.getElementById('lib-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id        = 'lib-modal';
      modal.className = 'lib-overlay';
      modal.innerHTML =
        '<div class="lib-box">' +
          '<div class="lib-topbar">' +
            '<div class="lib-topbar-left">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="margin-right:7px;flex-shrink:0"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' +
              '<span class="lib-topbar-title">Biblioteca Local</span>' +
            '</div>' +
            '<button class="lib-close" onclick="LocalLib.closeModal()" title="Fechar">&#10005;</button>' +
          '</div>' +
          '<div class="lib-tabs">' +
            '<button class="lib-tab lib-tab-on" id="lib-tab-code" onclick="LocalLib._switchTab(\'code\')">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>' +
              ' Código <span class="lib-tab-cnt"></span>' +
            '</button>' +
            '<button class="lib-tab" id="lib-tab-nb" onclick="LocalLib._switchTab(\'notebook\')">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="21"/></svg>' +
              ' Notebook <span class="lib-tab-cnt"></span>' +
            '</button>' +
            '<div class="lib-search-wrap">' +
              '<input class="lib-search" id="lib-search" placeholder="Filtrar..." oninput="LocalLib._onSearch(this.value)" />' +
            '</div>' +
          '</div>' +
          '<div class="lib-cnt" id="lib-cnt"></div>' +
        '</div>' +
        '<div id="lib-toast" class="lib-toast"></div>';

      document.body.appendChild(modal);
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();
      });
    }

    document.getElementById('lib-tab-code').classList.toggle('lib-tab-on', _tab === 'code');
    document.getElementById('lib-tab-nb').classList.toggle('lib-tab-on', _tab === 'notebook');
    var searchEl = document.getElementById('lib-search');
    if (searchEl) searchEl.value = '';

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    _refresh();
  }

  function closeModal() {
    var modal = document.getElementById('lib-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  /* ── Actions ── */
  function _preview(id) {
    _prevId = id;
    _refresh();
  }

  function _backToList() {
    _prevId = null;
    _refresh();
  }

  function _open(id) {
    _get('code', id).then(function (entry) {
      if (!entry) return;
      var ta = document.getElementById('code-editor');
      if (!ta) {
        window.location.href = 'index.html';
        sessionStorage.setItem('lib_open_code', JSON.stringify(entry));
        return;
      }
      if (!confirm('Isso vai substituir o código atual no editor. Continuar?')) return;
      ta.value = entry.codigo || '';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      var nameEl = document.getElementById('algo-name-display');
      if (nameEl) nameEl.textContent = entry.nome;
      closeModal();
      _toast('"' + entry.nome + '" aberto no editor.');
    });
  }

  function _openNotebook(id) {
    _get('notebook', id).then(function (entry) {
      if (!entry) return;
      if (typeof nbAddCell === 'function') {
        if (!confirm('Isso vai substituir o notebook atual. Continuar?')) return;
        _loadNotebookEntry(entry);
        closeModal();
        _toast('"' + entry.nome + '" aberto no notebook.');
      } else {
        sessionStorage.setItem('lib_open_nb', JSON.stringify(entry));
        window.location.href = 'notebook.html';
      }
    });
  }

  function _loadNotebookEntry(entry) {
    var cells = document.getElementById('nb-cells');
    if (cells) cells.innerHTML = '';
    (entry.cells || []).forEach(function (c) {
      nbAddCell(c.type === 'codigo' ? 'codigo' : 'markdown');
      var allCells = document.querySelectorAll('.nb-cell');
      var last = allCells[allCells.length - 1];
      if (last) {
        var ta = last.querySelector('.nb-cell-editor') || last.querySelector('.nb-md-editor');
        if (ta) { ta.value = c.content; ta.dispatchEvent(new Event('input', { bubbles: true })); }
      }
    });
    var titleEl = document.getElementById('nb-title');
    if (titleEl) titleEl.value = entry.nome;
  }

  function _export(id) {
    _get('code', id).then(function (entry) {
      if (!entry) return;
      var blob = new Blob([entry.codigo || ''], { type: 'text/plain' });
      var a    = document.createElement('a');
      a.href   = URL.createObjectURL(blob);
      a.download = (entry.nome || 'codigo').replace(/\s+/g, '_') + '.pseudo';
      a.click();
      URL.revokeObjectURL(a.href);
      _toast('"' + entry.nome + '" exportado.');
    });
  }

  function _exportNotebook(id) {
    _get('notebook', id).then(function (entry) {
      if (!entry) return;
      var blob = new Blob([JSON.stringify(entry, null, 2)], { type: 'application/json' });
      var a    = document.createElement('a');
      a.href   = URL.createObjectURL(blob);
      a.download = (entry.nome || 'notebook').replace(/\s+/g, '_') + '.pseudonb';
      a.click();
      URL.revokeObjectURL(a.href);
      _toast('"' + entry.nome + '" exportado.');
    });
  }

  function _run(id) {
    _get('code', id).then(function (entry) {
      if (!entry) return;
      var ta = document.getElementById('code-editor');
      if (!ta) { _toast('Execute na página IDE.', 'err'); return; }
      if (typeof executarCodigo !== 'function') { _toast('Executor não disponível.', 'err'); return; }
      ta.value = entry.codigo || '';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      closeModal();
      setTimeout(function () { executarCodigo(); }, 80);
    });
  }

  function _useAsLib(id) {
    _get('code', id).then(function (entry) {
      if (!entry) return;
      if (typeof compilarParaBiblioteca !== 'function') {
        _toast('Disponível apenas na IDE.', 'err');
        return;
      }
      var libNome = (entry.bibNome || entry.nome || 'minha_lib')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/gi, '');
      try {
        var injector = compilarParaBiblioteca(entry.codigo, libNome);
        /* jshint evil:true */ eval(injector); /* jshint evil:false */
        if (typeof window._registerLibForIDE === 'function')
          window._registerLibForIDE(libNome);
        var ta = document.getElementById('code-editor');
        if (ta) {
          var importLine = 'importar ' + libNome + ' como ' + libNome + ';\n';
          if (!ta.value.startsWith(importLine)) {
            ta.value = importLine + ta.value;
            ta.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        closeModal();
        _toast('"' + libNome + '" registrado como biblioteca!');
      } catch (err) {
        _toast('Erro ao compilar: ' + err.message, 'err');
      }
    });
  }

  function _share(id) {
    _get('code', id).then(function (entry) {
      if (!entry) return;
      if (typeof gerarLinkCompartilhamento !== 'function') { _toast('Compartilhamento não disponível.', 'err'); return; }
      var ta = document.getElementById('code-editor');
      if (!ta) { _toast('Compartilhe na página IDE.', 'err'); return; }
      ta.value = entry.codigo || '';
      closeModal();
      setTimeout(function () { gerarLinkCompartilhamento(); }, 100);
    });
  }

  function _publish(id) {
    _get('code', id).then(function (entry) {
      if (!entry) return;
      if (typeof publicarNaNuvem !== 'function') { _toast('Publicação não disponível.', 'err'); return; }
      var ta = document.getElementById('code-editor');
      if (!ta) { _toast('Publique na página IDE.', 'err'); return; }
      ta.value = entry.codigo || '';
      closeModal();
      setTimeout(function () { publicarNaNuvem(); }, 100);
    });
  }

  function _delete(id) {
    if (!confirm('Apagar este item da biblioteca? Esta ação não pode ser desfeita.')) return;
    var store = _tab === 'code' ? 'code' : 'notebook';
    _del(store, id).then(function () {
      _prevId = null;
      _refresh();
      _toast('Item apagado.');
    });
  }

  /* ── Cross-page pending opens ── */
  document.addEventListener('DOMContentLoaded', function () {
    var pendingCode = sessionStorage.getItem('lib_open_code');
    if (pendingCode) {
      sessionStorage.removeItem('lib_open_code');
      try {
        var entry = JSON.parse(pendingCode);
        var ta = document.getElementById('code-editor');
        if (ta) {
          ta.value = entry.codigo || '';
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          var nameEl = document.getElementById('algo-name-display');
          if (nameEl) nameEl.textContent = entry.nome;
        }
      } catch (e) { /* ignore */ }
    }

    var pendingNb = sessionStorage.getItem('lib_open_nb');
    if (pendingNb) {
      sessionStorage.removeItem('lib_open_nb');
      try {
        var nbEntry = JSON.parse(pendingNb);
        setTimeout(function () {
          if (typeof nbAddCell === 'function') _loadNotebookEntry(nbEntry);
        }, 500);
      } catch (e) { /* ignore */ }
    }
  });

  /* ── Public API ── */
  return {
    saveCode:       saveCode,
    saveNotebook:   saveNotebook,
    openModal:      openModal,
    closeModal:     closeModal,
    _switchTab:     _switchTab,
    _onSearch:      _onSearch,
    _refresh:       _refresh,
    _preview:       _preview,
    _backToList:    _backToList,
    _open:          _open,
    _openNotebook:  _openNotebook,
    _export:        _export,
    _exportNotebook:_exportNotebook,
    _run:           _run,
    _useAsLib:      _useAsLib,
    _share:         _share,
    _publish:       _publish,
    _delete:        _delete
  };
})();
