/* ============================================================
   PSEUDO NOTEBOOK — notebook.js  v1.0
   ============================================================ */
"use strict";

(function () {
  // ---------- state ----------
  let _cells = [];
  let _nextId = 0;

  const _container = () => document.getElementById("nb-cells");
  const _titleEl = () => document.getElementById("nb-title");
  const _statusEl = () => document.getElementById("nb-status-text");
  const _cellCountEl = () => document.getElementById("nb-cell-count");

  // ---------- output routing hook ----------
  window._nbSwitch = function (idx) {
    window._nbCurrentCell =
      window._nbOutputs && window._nbOutputs[idx]
        ? window._nbOutputs[idx]
        : null;
  };

  // ---------- shared environment namespace ----------
  window._nbEnv = {};

  // ---------- auto-resize textarea ----------
  function _autoResize(ta) {
    const sy = window.scrollY;
    ta.style.height = "0px";
    ta.style.height = Math.max(56, ta.scrollHeight) + "px";
    if (window.scrollY !== sy) window.scrollTo(0, sy);
  }

  // ---------- update syntax-highlight layer ----------
  function _updateHL(ta, hlLayer) {
    if (!hlLayer || typeof window.aplicarHighlight !== "function") return;
    const txt = ta.value;
    // trailing newline needs a trailing space so the last line renders
    hlLayer.innerHTML = window.aplicarHighlight(
      txt.endsWith("\n") ? txt + " " : txt
    );
  }

  // ---------- minimal markdown renderer ----------
  function _renderMd(raw) {
    const lines = raw.split("\n");
    const out = [];
    let inCode = false, codeBuf = [], codeLang = "";
    let inList = false, listOl = false;
    let inMath = false, mathBuf = [], mathCloser = "", mathIncludeClose = false;
    let inAlign = false, alignBuf = [], alignDir = "";
    let tableRows = [];

    function flushList() {
      if (!inList) return;
      out.push(listOl ? "</ol>" : "</ul>");
      inList = false;
    }

    function flushAlign() {
      if (!inAlign) return;
      out.push(`<div class="md-align-${alignDir}">${_renderMd(alignBuf.join("\n"))}</div>`);
      inAlign = false; alignBuf = []; alignDir = "";
    }

    function _parseTableRow(line) {
      return line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map(s => s.trim());
    }

    function flushTable() {
      if (!tableRows.length) return;
      const rows = tableRows; tableRows = [];
      // validate: need at least header + separator, separator must be only dashes/colons
      const sepOk = rows.length >= 2 &&
        /^[\s|:\-]+$/.test(rows[1]) &&
        rows[1].includes("-");
      if (!sepOk) { rows.forEach(r => out.push(`<p>${inline(r)}</p>`)); return; }
      const headers = _parseTableRow(rows[0]);
      const aligns = _parseTableRow(rows[1]).map(s => {
        const t = s.trim();
        if (/^:-+:$/.test(t)) return "center";
        if (/^-+:$/.test(t)) return "right";
        return "left";
      });
      let html = '<table class="md-table"><thead><tr>';
      headers.forEach((h, ci) =>
        html += `<th style="text-align:${aligns[ci] || "left"}">${inline(h)}</th>`);
      html += '</tr></thead><tbody>';
      rows.slice(2).forEach(row => {
        const cells = _parseTableRow(row);
        html += '<tr>';
        aligns.forEach((al, ci) =>
          html += `<td style="text-align:${al}">${inline(cells[ci] || "")}</td>`);
        html += '</tr>';
      });
      html += '</tbody></table>';
      out.push(html);
    }

    function _katexBlock(tex) {
      if (window.katex) {
        try {
          return '<div class="latex-block">' +
            window.katex.renderToString(tex, { displayMode: true, throwOnError: false }) +
            '</div>';
        } catch (_) {}
      }
      return `<div class="latex-block"><code>$$${tex.replace(/</g, "&lt;")}$$</code></div>`;
    }

    function inline(s) {
      const spans = [];
      const mark = (tex, display) => {
        spans.push({ tex, display });
        return `\x00M${spans.length - 1}\x00`;
      };
      let t = s;
      // \$ → literal dollar (protect from math detection)
      t = t.replace(/\\\$/g, "\x00DOLLAR\x00");
      // $$...$$ display (inline, single line)
      t = t.replace(/\$\$([^$\n]+?)\$\$/g, (_, tex) => mark(tex, true));
      // \[...\] display (inline, single line)
      t = t.replace(/\\\[(.+?)\\\]/g, (_, tex) => mark(tex, true));
      // $...$ inline math
      t = t.replace(/\$([^$\n]+?)\$/g, (_, tex) => mark(tex, false));
      // \(...\) inline math
      t = t.replace(/\\\((.+?)\\\)/g, (_, tex) => mark(tex, false));
      // Restore escaped dollar
      t = t.replace(/\x00DOLLAR\x00/g, "&#36;");
      t = t
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/\*\*\*([^*\n]+)\*\*\*/g, "<strong><em>$1</em></strong>")
        .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
        .replace(/__([^_\n]+)__/g, "<u>$1</u>")
        .replace(/~~([^~\n]+)~~/g, "<del>$1</del>")
        .replace(/~([^~\n]+)~/g, "<sub>$1</sub>")
        .replace(/\^([^\^\n]+)\^/g, "<sup>$1</sup>")
        .replace(/==([^=\n]+)==/g, "<mark>$1</mark>")
        .replace(/`([^`\n]+)`/g, "<code>$1</code>")
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      return t.replace(/\x00M(\d+)\x00/g, (_, i) => {
        const { tex, display } = spans[+i];
        if (window.katex) {
          try {
            return window.katex.renderToString(tex, { displayMode: display, throwOnError: false });
          } catch (_) {}
        }
        return display
          ? `<span class="latex-block"><code>$$${tex.replace(/</g, "&lt;")}$$</code></span>`
          : `<code>$${tex.replace(/</g, "&lt;")}$</code>`;
      });
    }

    // \begin{env} environments treated as block display math
    const MATH_ENVS =
      /^\\begin\{(equation\*?|align\*?|aligned|gather\*?|multline\*?|split|cases|dcases|pmatrix|bmatrix|vmatrix|Bmatrix|Vmatrix|matrix|array)\}/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // fenced code block (highest priority — trumps math)
      if (/^```/.test(line)) {
        if (!inCode) {
          flushList();
          inCode = true; codeLang = line.slice(3).trim(); codeBuf = [];
        } else {
          const esc = codeBuf.join("\n").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          out.push(`<pre><code class="lang-${codeLang}">${esc}</code></pre>`);
          inCode = false; codeBuf = []; codeLang = "";
        }
        continue;
      }
      if (inCode) { codeBuf.push(line); continue; }

      // alignment block: collect lines until :::
      if (inAlign) {
        if (line.trim() === ":::") { flushAlign(); } else { alignBuf.push(line); }
        continue;
      }

      // collecting block math (must check before any new math opener)
      if (inMath) {
        if (line.trim() === mathCloser) {
          if (mathIncludeClose) mathBuf.push(line);
          out.push(_katexBlock(mathBuf.join("\n")));
          inMath = false; mathBuf = []; mathCloser = ""; mathIncludeClose = false;
        } else {
          mathBuf.push(line);
        }
        continue;
      }

      // table row detection (flush table when a non-table line is encountered)
      const isTableRow = /^\s*\|/.test(line);
      if (tableRows.length && !isTableRow) flushTable();
      if (isTableRow) { flushList(); tableRows.push(line); continue; }

      // block math: $$ (single or multi-line)
      if (/^\$\$/.test(line)) {
        const single = line.match(/^\$\$(.+)\$\$\s*$/);
        if (single) { flushList(); out.push(_katexBlock(single[1])); }
        else {
          flushList();
          const rest = line.slice(2).trim();
          inMath = true; mathCloser = "$$"; mathIncludeClose = false;
          mathBuf = rest ? [rest] : [];
        }
        continue;
      }

      // block math: \[...\] (single or multi-line)
      if (/^\\\[/.test(line)) {
        const single = line.match(/^\\\[(.+?)\\\]\s*$/);
        if (single) { flushList(); out.push(_katexBlock(single[1])); }
        else {
          flushList();
          const rest = line.slice(2).trim();
          inMath = true; mathCloser = "\\]"; mathIncludeClose = false;
          mathBuf = rest ? [rest] : [];
        }
        continue;
      }

      // block math: \begin{env}...\end{env}
      const bm = line.match(MATH_ENVS);
      if (bm) {
        flushList();
        inMath = true;
        mathCloser = `\\end{${bm[1]}}`;
        mathIncludeClose = true;
        mathBuf = [line];
        continue;
      }

      // alignment block opener  :::center / :::right / :::left / :::justify
      const am = line.match(/^:::(center|right|left|justify)\s*$/);
      if (am) { flushList(); inAlign = true; alignDir = am[1]; alignBuf = []; continue; }

      // heading (H1–H6)
      const hm = line.match(/^(#{1,6})\s+(.+)$/);
      if (hm) {
        const lvl = hm[1].length;
        flushList(); out.push(`<h${lvl}>${inline(hm[2])}</h${lvl}>`); continue;
      }

      // hr  ---  ___  ***
      if (/^(?:-{3,}|_{3,}|\*{3,})\s*$/.test(line)) { flushList(); out.push("<hr>"); continue; }

      // blockquote
      if (/^> /.test(line)) { flushList(); out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`); continue; }

      // ordered list
      const olm = line.match(/^(\d+)\. (.+)$/);
      if (olm) {
        if (!inList || !listOl) { flushList(); out.push("<ol>"); inList = true; listOl = true; }
        out.push(`<li>${inline(olm[2])}</li>`); continue;
      }

      // unordered list
      const ulm = line.match(/^[*\-] (.+)$/);
      if (ulm) {
        if (!inList || listOl) { flushList(); out.push("<ul>"); inList = true; listOl = false; }
        out.push(`<li>${inline(ulm[1])}</li>`); continue;
      }

      // empty line
      if (line.trim() === "") { flushList(); out.push("<p></p>"); continue; }

      // paragraph
      flushList();
      out.push(`<p>${inline(line)}</p>`);
    }
    flushList();
    flushAlign();
    flushTable();
    if (inMath && mathBuf.length) out.push(_katexBlock(mathBuf.join("\n")));
    if (inCode && codeBuf.length) {
      const esc = codeBuf.join("\n").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      out.push(`<pre><code>${esc}</code></pre>`);
    }
    return out.join("\n");
  }

  // ---------- cell DOM builders ----------
  function _buildCodeCell(id, content) {
    const el = document.createElement("div");
    el.className = "nb-cell nb-cell-codigo";
    el.dataset.nbId = id;
    el.innerHTML = `
      <div class="nb-cell-toolbar">
        <button class="nb-btn-icon nb-btn-collapse" data-action="toggle-collapse" title="Encolher/expandir">&#9660;</button>
        <span class="nb-cell-type-badge">pseudo</span>
        <div class="nb-cell-actions">
          <button class="nb-btn-run" data-action="run" title="Ctrl+Enter">&#9654; Executar</button>
          <button class="nb-btn-icon" data-action="up" title="Mover acima">&#8593;</button>
          <button class="nb-btn-icon" data-action="down" title="Mover abaixo">&#8595;</button>
          <button class="nb-btn-icon" data-action="add-code" title="Inserir c&eacute;lula c&oacute;digo abaixo">+C</button>
          <button class="nb-btn-icon" data-action="add-md" title="Inserir c&eacute;lula texto abaixo">+T</button>
          <button class="nb-btn-icon nb-btn-env" data-action="toggle-env" title="Expor variáveis ao ambiente">amb</button>
          <button class="nb-btn-icon nb-btn-del" data-action="del" title="Remover c&eacute;lula">&#215;</button>
        </div>
      </div>
      <div class="nb-editor-wrap">
        <div class="nb-hl-layer" aria-hidden="true"></div>
        <textarea class="nb-cell-editor" spellcheck="false" autocorrect="off"
          autocapitalize="off" placeholder="// escreva seu algoritmo aqui"></textarea>
      </div>
      <div class="nb-cell-output"></div>
    `;
    const ta = el.querySelector(".nb-cell-editor");
    const hlLayer = el.querySelector(".nb-hl-layer");

    function _refresh() {
      _autoResize(ta);
      _updateHL(ta, hlLayer);
    }

    ta.value = content || "";
    ta.addEventListener("input", _refresh);
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const s = ta.selectionStart, end = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + "  " + ta.value.slice(end);
        ta.selectionStart = ta.selectionEnd = s + 2;
        _refresh();
      }
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        _cellAction(id, "run");
      }
    });
    el.querySelector(".nb-cell-toolbar").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (btn) _cellAction(id, btn.dataset.action);
    });
    setTimeout(_refresh, 0);
    return el;
  }

  function _buildMdCell(id, content) {
    const el = document.createElement("div");
    el.className = "nb-cell nb-cell-markdown";
    el.dataset.nbId = id;
    el.innerHTML = `
      <div class="nb-cell-toolbar">
        <button class="nb-btn-icon nb-btn-collapse" data-action="toggle-collapse" title="Encolher/expandir">&#9660;</button>
        <span class="nb-cell-type-badge nb-md-badge">texto</span>
        <div class="nb-cell-actions">
          <button class="nb-btn-icon" data-action="toggle-md" title="Editar">&#9998;</button>
          <button class="nb-btn-icon" data-action="up" title="Mover acima">&#8593;</button>
          <button class="nb-btn-icon" data-action="down" title="Mover abaixo">&#8595;</button>
          <button class="nb-btn-icon" data-action="add-code" title="Inserir c&eacute;lula c&oacute;digo abaixo">+C</button>
          <button class="nb-btn-icon" data-action="add-md" title="Inserir c&eacute;lula texto abaixo">+T</button>
          <button class="nb-btn-icon nb-btn-del" data-action="del" title="Remover c&eacute;lula">&#215;</button>
        </div>
      </div>
      <div class="nb-md-edit" style="display:none">
        <textarea class="nb-md-editor" spellcheck="false" placeholder="# Título&#10;&#10;Escreva em **Markdown**..."></textarea>
        <div class="nb-md-done-bar">
          <button class="nb-btn-icon nb-md-done-btn" data-action="toggle-md">&#10003; Ok</button>
        </div>
      </div>
      <div class="nb-md-preview"></div>
    `;
    const ta = el.querySelector(".nb-md-editor");
    const preview = el.querySelector(".nb-md-preview");
    ta.value = content || "";
    ta.addEventListener("input", () => _autoResize(ta));
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const s = ta.selectionStart, end = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + "  " + ta.value.slice(end);
        ta.selectionStart = ta.selectionEnd = s + 2;
        _autoResize(ta);
      }
      if (e.key === "Escape") _toggleMdEdit(el, false);
    });
    preview.addEventListener("dblclick", () => _toggleMdEdit(el, true));
    el.querySelector(".nb-cell-toolbar").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (btn) _cellAction(id, btn.dataset.action);
    });
    el.querySelector(".nb-md-done-bar").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (btn) _cellAction(id, btn.dataset.action);
    });
    // Render initial preview
    if ((content || "").trim()) {
      preview.innerHTML = _renderMd(content);
    } else {
      _toggleMdEdit(el, true);
    }
    setTimeout(() => _autoResize(ta), 0);
    return el;
  }

  function _toggleMdEdit(el, forceEdit) {
    const editDiv = el.querySelector(".nb-md-edit");
    const preview = el.querySelector(".nb-md-preview");
    const ta = el.querySelector(".nb-md-editor");
    const isEditing = editDiv.style.display !== "none";
    const goEdit = forceEdit !== undefined ? forceEdit : !isEditing;
    if (goEdit) {
      editDiv.style.display = "";
      preview.style.display = "none";
      ta.focus();
      _autoResize(ta);
    } else {
      const raw = ta.value;
      preview.innerHTML = raw.trim() ? _renderMd(raw) : "";
      editDiv.style.display = "none";
      preview.style.display = "";
    }
  }

  // ---------- cell actions ----------
  function _cellAction(id, action) {
    const idx = _cells.findIndex((c) => c.id === id);
    if (idx < 0) return;
    switch (action) {
      case "run":       _runCell(id); break;
      case "up":        _moveCell(idx, -1); break;
      case "down":      _moveCell(idx, 1); break;
      case "add-code":  _addCell("codigo", idx); break;
      case "add-md":    _addCell("markdown", idx); break;
      case "del":       _deleteCell(idx); break;
      case "toggle-md": _toggleMdEdit(_cells[idx].el); break;
      case "toggle-env": _toggleEnvMode(id); break;
      case "toggle-collapse": _toggleCollapse(id); break;
    }
  }

  function _toggleEnvMode(id) {
    const cell = _cells.find((c) => c.id === id);
    if (!cell || cell.type !== "codigo") return;
    cell.envMode = !cell.envMode;
    cell.el.classList.toggle("nb-env-mode", cell.envMode);
    const btn = cell.el.querySelector(".nb-btn-env");
    if (btn) {
      btn.title = cell.envMode
        ? "Variáveis desta célula são visíveis nas outras (clique para desativar)"
        : "Expor variáveis ao ambiente";
    }
  }

  function _toggleCollapse(id) {
    const cell = _cells.find((c) => c.id === id);
    if (!cell) return;
    cell.collapsed = !cell.collapsed;
    cell.el.classList.toggle("nb-cell-collapsed", cell.collapsed);
    const btn = cell.el.querySelector(".nb-btn-collapse");
    if (btn) btn.innerHTML = cell.collapsed ? "&#9654;" : "&#9660;";
  }

  // ---------- CRUD ----------
  function _addCell(type, afterIdx) {
    const id = _nextId++;
    const el =
      type === "markdown"
        ? _buildMdCell(id, "")
        : _buildCodeCell(id, "");
    const cell = { id, type, el, envMode: false, collapsed: false };
    const container = _container();

    if (afterIdx !== undefined && afterIdx >= 0 && afterIdx < _cells.length) {
      const afterEl = _cells[afterIdx].el;
      _cells.splice(afterIdx + 1, 0, cell);
      container.insertBefore(el, afterEl.nextSibling);
    } else {
      _cells.push(cell);
      container.appendChild(el);
    }
    _updateCellCount();
    const ta = el.querySelector(".nb-cell-editor, .nb-md-editor");
    if (ta) setTimeout(() => ta.focus(), 30);
    return id;
  }

  function _deleteCell(idx) {
    if (_cells.length <= 1) return;
    _cells[idx].el.remove();
    _cells.splice(idx, 1);
    _updateCellCount();
  }

  function _moveCell(idx, dir) {
    const target = idx + dir;
    if (target < 0 || target >= _cells.length) return;
    const container = _container();
    const a = _cells[idx], b = _cells[target];
    _cells[idx] = b;
    _cells[target] = a;
    if (dir === -1) {
      container.insertBefore(a.el, b.el);
    } else {
      container.insertBefore(b.el, a.el);
    }
  }

  function _updateCellCount() {
    const el = _cellCountEl();
    if (el) el.textContent = `${_cells.length} célula${_cells.length !== 1 ? "s" : ""}`;
  }

  // ---------- get source from cell ----------
  function _getCellSource(cell) {
    if (cell.type !== "codigo") return null;
    const ta = cell.el.querySelector(".nb-cell-editor");
    return ta ? ta.value : "";
  }

  function _setOutputVisible(outputEl, hasContent) {
    outputEl.classList.toggle("nb-has-output", hasContent);
  }

  // ---------- env helpers ----------
  function _extractPublicVars(compiledCode) {
    const names = new Set();
    const declRe = /\b(?:let|const|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
    let m;
    while ((m = declRe.exec(compiledCode)) !== null) {
      const n = m[1];
      if (!n.startsWith("_") && n !== "undefined" && n !== "null") names.add(n);
    }
    const fnRe = /\bfunction\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
    while ((m = fnRe.exec(compiledCode)) !== null) {
      const n = m[1];
      if (!n.startsWith("_")) names.add(n);
    }
    return [...names];
  }

  function _buildEnvCapture(names) {
    if (!names.length) return "";
    return (
      names
        .map((n) => `try{window._nbEnv[${JSON.stringify(n)}]=${n};}catch(_nbE){}`)
        .join(";") + ";"
    );
  }

  // ---------- execution ----------
  async function _runAll() {
    _setStatus("executando…");
    const runBtn = document.getElementById("nb-run-all-btn");
    if (runBtn) runBtn.disabled = true;
    window._nbEnv = {};

    const codeCells = _cells.filter((c) => c.type === "codigo");
    const outputs = [];
    let combined = "";

    codeCells.forEach((cell, i) => {
      const outputEl = cell.el.querySelector(".nb-cell-output");
      outputEl.innerHTML = "";
      _setOutputVisible(outputEl, false);
      outputs.push(outputEl);
      const src = _getCellSource(cell) || "";
      combined += `window._nbSwitch(${i});\n${src}\n`;
    });

    window._nbOutputs = outputs;

    if (!combined.trim()) {
      _setStatus("nada para executar");
      if (runBtn) runBtn.disabled = false;
      return;
    }

    let translated;
    try {
      translated = traduzirCodigo(combined, false);
    } catch (e) {
      console.error("[Pseudo Notebook] Erro de compilação:", e);
      _appendError(outputs[0] || null, e);
      if (outputs[0]) _setOutputVisible(outputs[0], true);
      _setStatus("erro de compilação", true);
      if (runBtn) runBtn.disabled = false;
      return;
    }

    // Append env capture for env-mode cells (runs after all cells share scope)
    const _envCapVars = new Set();
    codeCells.forEach((cell) => {
      if (!cell.envMode) return;
      const src = _getCellSource(cell) || "";
      let cComp = "";
      try { cComp = traduzirCodigo(src, false); } catch (_) {}
      _extractPublicVars(cComp).forEach((n) => _envCapVars.add(n));
    });
    if (_envCapVars.size) translated += "\n" + _buildEnvCapture([..._envCapVars]);

    console.groupCollapsed("[Pseudo Notebook] JS gerado — executar tudo");
    console.log(translated);
    console.groupEnd();

    // errors inside code are caught by __NB__ and routed via _imprimaErro → _c()
    window.__inicioExecucao = Date.now();
    const ctx = `(async function __NB__(){\ntry{\n${translated}\n}catch(__e){\n_imprimaErro(__e);\n}})();`;
    let execOk = true;
    try {
      // eslint-disable-next-line no-eval
      await (0, eval)(ctx);
    } catch (e) {
      // only reached if the eval wrapper itself explodes (rare)
      console.error("[Pseudo Notebook] Erro de execução (wrapper):", e);
      execOk = false;
      _setStatus("erro de execução", true);
    } finally {
      outputs.forEach((o) => { if (o.hasChildNodes()) _setOutputVisible(o, true); });
      if (execOk) _setStatus("executado com sucesso ✓");
      if (runBtn) runBtn.disabled = false;
      _updateEnvPanel();
    }
  }

  async function _runCell(id) {
    const idx = _cells.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const cell = _cells[idx];
    if (cell.type !== "codigo") return;

    const runBtn = cell.el.querySelector(".nb-btn-run");
    if (runBtn) runBtn.classList.add("nb-running");

    const outputEl = cell.el.querySelector(".nb-cell-output");
    outputEl.innerHTML = "";
    _setOutputVisible(outputEl, false);
    window._nbCurrentCell = outputEl;
    window._nbOutputs = [outputEl];

    const src = _getCellSource(cell) || "";
    if (!src.trim()) {
      if (runBtn) runBtn.classList.remove("nb-running");
      return;
    }

    let translated;
    try {
      translated = traduzirCodigo(src, false);
    } catch (e) {
      console.error("[Pseudo Notebook] Erro de compilação:", e);
      _appendError(outputEl, e);
      _setOutputVisible(outputEl, true);
      if (runBtn) runBtn.classList.remove("nb-running");
      return;
    }

    // Wrap with env injection (with) + optional capture for env-mode cells
    const captureCode = cell.envMode ? _buildEnvCapture(_extractPublicVars(translated)) : "";
    const execCode = `with(window._nbEnv||{}){\n${translated}\n${captureCode}\n}`;

    console.groupCollapsed("[Pseudo Notebook] JS gerado — célula");
    console.log(execCode);
    console.groupEnd();

    window.__inicioExecucao = Date.now();
    const ctx = `(async function __NBC__(){\ntry{\nwindow._nbSwitch(0);\n${execCode}\n}catch(__e){\n_imprimaErro(__e);\n}})();`;
    try {
      // (0,eval) = indirect eval → non-strict context, allows `with` for env injection
      // eslint-disable-next-line no-eval
      await (0, eval)(ctx);
    } catch (_e) {
      // errors are handled inside __NBC__ by _imprimaErro
      console.error("[Pseudo Notebook] Erro de execução (wrapper):", _e);
    } finally {
      if (outputEl.hasChildNodes()) _setOutputVisible(outputEl, true);
      if (runBtn) runBtn.classList.remove("nb-running");
      _updateEnvPanel();
    }
  }

  function _appendError(outputEl, e) {
    if (!outputEl) return;
    const div = document.createElement("div");
    div.className = "console-error";
    const msg = e && e.message ? e.message : String(e);
    div.innerHTML = `<strong>Erro:</strong> ${msg.replace(/</g, "&lt;")}`;
    outputEl.appendChild(div);
  }

  // ---------- status ----------
  function _setStatus(msg, isErr) {
    const el = _statusEl();
    if (!el) return;
    el.textContent = msg;
    el.className = isErr ? "nb-status-err" : msg ? "nb-status-ok" : "";
  }

  // ---------- serialize / deserialize ----------
  function _toJSON() {
    const title = (_titleEl() ? _titleEl().value.trim() : "") || "sem título";
    const celulas = _cells.map((cell) => {
      let conteudo = "";
      if (cell.type === "codigo") {
        const ta = cell.el.querySelector(".nb-cell-editor");
        conteudo = ta ? ta.value : "";
      } else {
        const ta = cell.el.querySelector(".nb-md-editor");
        conteudo = ta ? ta.value : "";
      }
      const obj = { tipo: cell.type, conteudo };
      if (cell.envMode) obj.env = true;
      if (cell.collapsed) obj.collapsed = true;
      return obj;
    });
    return JSON.stringify({ versao: "1.0", titulo: title, celulas }, null, 2);
  }

  function _fromJSON(data) {
    const container = _container();
    container.innerHTML = "";
    _cells = [];
    _nextId = 0;
    if (data.titulo && _titleEl()) _titleEl().value = data.titulo;
    document.title = (data.titulo || "Notebook") + " — Pseudo Notebook";
    const celulas = Array.isArray(data.celulas) ? data.celulas : [];
    if (celulas.length === 0) {
      _addCell("codigo");
    } else {
      celulas.forEach((c) => {
        const id = _nextId++;
        const type = c.tipo === "markdown" ? "markdown" : "codigo";
        const el =
          type === "markdown"
            ? _buildMdCell(id, c.conteudo || "")
            : _buildCodeCell(id, c.conteudo || "");
        const envMode = !!c.env;
        const collapsed = !!c.collapsed;
        if (envMode) el.classList.add("nb-env-mode");
        if (collapsed) {
          el.classList.add("nb-cell-collapsed");
          const btn = el.querySelector(".nb-btn-collapse");
          if (btn) btn.innerHTML = "&#9654;";
        }
        _cells.push({ id, type, el, envMode, collapsed });
        container.appendChild(el);
      });
    }
    _updateCellCount();
  }

  // ---------- save ----------
  function _save() {
    const json = _toJSON();
    const title =
      (_titleEl() ? _titleEl().value.trim() : "") || "notebook";
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = title.replace(/[^a-zA-Z0-9À-ÿ _\-]/g, "_") + ".pseudonb";
    a.click();
    URL.revokeObjectURL(a.href);
    _setStatus("arquivo salvo ✓");
  }

  // ---------- load ----------
  function _load() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pseudonb,.json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          _fromJSON(JSON.parse(ev.target.result));
          _setStatus("arquivo aberto ✓");
        } catch {
          alert(
            "Erro ao abrir o arquivo. Certifique-se de que é um .pseudonb válido."
          );
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ---------- export HTML (executable) ----------
  function _exportHTML() {
    _setStatus("exportando…");

    const title = (_titleEl() ? _titleEl().value.trim() : "") || "Notebook";
    const safeTitle = title.replace(/</g, "&lt;");

    // Collect sources and build cell HTML
    const sources = [];   // raw pseudo source strings (one per code cell)
    let cellsHtml = "";
    let codeIdx = 0;

    for (const cell of _cells) {
      if (cell.type === "codigo") {
        const ta = cell.el.querySelector(".nb-cell-editor");
        const src = ta ? ta.value : "";
        const ci = codeIdx++;
        sources.push(src);

        const srcEscaped = src
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        cellsHtml += `
<div class="exp-cell exp-code">
  <div class="exp-cell-header">
    <span class="exp-badge">pseudo</span>
    <button class="exp-run-btn" onclick="expRunCell(this)" data-ci="${ci}" title="Executar célula (Ctrl+Enter)">&#9654;</button>
  </div>
  <pre class="exp-src"><code>${srcEscaped}</code></pre>
  <div class="nb-cell-output exp-out" data-ci="${ci}"></div>
</div>`;
      } else {
        const preview = cell.el.querySelector(".nb-md-preview");
        const ta = cell.el.querySelector(".nb-md-editor");
        const mdHtml = preview ? preview.innerHTML : _renderMd(ta ? ta.value : "");
        cellsHtml += `
<div class="exp-cell exp-md">
  <div class="exp-md-body">${mdHtml}</div>
</div>`;
      }
    }

    // Escape </script> inside JSON string to avoid breaking the script tag
    const sourcesJson = JSON.stringify(sources).replace(/<\/script>/gi, "<\\/script>");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${safeTitle}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    :root{
      --bg:#0f1117;--bg2:#13151f;--bg3:#1a1d28;--border:#2a2d40;
      --text:#d2d6e8;--dim:#8890b0;--muted:#5a6080;--accent:#7c83ff;
      --green:#4ade80;--red:#f87171;
      --fc:"JetBrains Mono","Fira Code","Courier New",monospace;
      --fu:"Outfit","Segoe UI",sans-serif;
    }
    html,body{background:var(--bg);color:var(--text);font-family:var(--fu);padding:0 0 80px}
    ::-webkit-scrollbar{width:6px;height:6px}
    ::-webkit-scrollbar-thumb{background:#2e3250;border-radius:4px}
    .exp-header{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;background:var(--bg2);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:10}
    .exp-header h1{font-size:16px;font-weight:600;font-family:var(--fu)}
    .exp-run-all-btn{display:flex;align-items:center;gap:6px;padding:5px 14px;background:rgba(124,131,255,.15);border:1px solid rgba(124,131,255,.35);color:var(--accent);border-radius:5px;font-size:12px;cursor:pointer;font-family:var(--fu)}
    .exp-run-all-btn:hover{background:rgba(124,131,255,.25)}
    .exp-run-all-btn:disabled{opacity:.5;cursor:default}
    .nb-wrap{max-width:860px;margin:0 auto;display:flex;flex-direction:column;gap:14px;padding:24px 20px}
    .exp-cell{border:1px solid var(--border);border-radius:6px;overflow:hidden}
    .exp-cell-header{display:flex;align-items:center;justify-content:space-between;background:rgba(124,131,255,.06);border-bottom:1px solid var(--border);padding:3px 10px 3px 12px}
    .exp-badge{font-family:var(--fc);font-size:10px;color:var(--accent)}
    .exp-run-btn{background:rgba(124,131,255,.12);border:1px solid rgba(124,131,255,.3);color:var(--accent);border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer;line-height:1.6}
    .exp-run-btn:hover{background:rgba(124,131,255,.25)}
    .exp-run-btn.running{opacity:.6;cursor:default}
    .exp-src{background:var(--bg2);padding:12px 16px;font-family:var(--fc);font-size:13px;line-height:1.65;overflow-x:auto;white-space:pre-wrap;word-break:break-word}
    .nb-cell-output{display:none;background:#0d0f16;border-top:1px solid var(--border);padding:10px 16px;font-family:var(--fc);font-size:13px;line-height:1.6}
    .nb-cell-output.nb-has-output{display:block}
    .exp-md{background:var(--bg3)}
    .exp-md-body{padding:16px 20px;font-size:14px;line-height:1.8}
    .exp-md-body h1{font-size:22px;margin:10px 0 6px}
    .exp-md-body h2{font-size:18px;margin:8px 0 5px}
    .exp-md-body h3{font-size:15px;margin:7px 0 4px}
    .exp-md-body p{margin:5px 0}
    .exp-md-body strong{color:#7dd3fc}
    .exp-md-body em{font-style:italic;color:var(--dim)}
    .exp-md-body code{font-family:var(--fc);font-size:12px;background:rgba(0,0,0,.3);padding:1px 5px;border-radius:3px;color:#fca5a1}
    .exp-md-body pre{background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:12px 14px;margin:10px 0;overflow-x:auto}
    .exp-md-body pre code{background:transparent;padding:0;font-size:13px}
    .exp-md-body ul,.exp-md-body ol{margin:6px 0 6px 24px}
    .exp-md-body li{margin:3px 0}
    .exp-md-body hr{border:none;border-top:1px solid var(--border);margin:12px 0}
    .exp-md-body a{color:var(--accent)}
    .exp-md-body blockquote{border-left:3px solid var(--accent);margin:8px 0;padding:4px 14px;color:var(--dim)}
    .exp-md-body h4{font-size:13px;margin:6px 0 3px;font-weight:600}
    .exp-md-body h5,.exp-md-body h6{font-size:12px;margin:5px 0 2px;font-weight:600}
    .exp-md-body del{text-decoration:line-through;opacity:.6}
    .exp-md-body u{text-decoration:underline}
    .exp-md-body mark{background:rgba(250,204,21,.25);padding:0 2px;border-radius:2px}
    .exp-md-body sup,.exp-md-body sub{font-size:.75em}
    .exp-md-body .md-align-center{text-align:center}
    .exp-md-body .md-align-right{text-align:right}
    .exp-md-body .md-align-justify{text-align:justify}
    .exp-md-body .md-table{border-collapse:collapse;width:100%;margin:10px 0;font-size:13px}
    .exp-md-body .md-table th,.exp-md-body .md-table td{border:1px solid var(--border);padding:5px 12px}
    .exp-md-body .md-table th{background:rgba(124,131,255,.1);color:#7dd3fc;font-weight:600}
    .exp-md-body .md-table tr:nth-child(even) td{background:rgba(255,255,255,.03)}
    .console-line{padding:2px 0;display:flex;align-items:baseline;gap:6px}
    .console-line-arrow{color:var(--muted)}
    .console-error{color:var(--red);padding:3px 0}
    .console-end-marker{color:var(--green);font-size:11px;margin-top:4px}
    .exp-status{font-size:11px;color:var(--dim);padding:4px 20px;text-align:center;min-height:22px}
    .exp-status.ok{color:var(--green)}
    .exp-status.err{color:var(--red)}
    leia-input{display:block;margin-top:4px}
    leia-input input{background:#0a0c14;border:1px solid var(--border);color:var(--text);font-family:var(--fc);font-size:13px;padding:3px 8px;border-radius:4px;outline:none;width:260px}
    leia-input input:focus{border-color:var(--accent)}
    .latex-block{margin:6px 0;text-align:center;overflow-x:auto;line-height:2}
    .latex-inline{display:inline-block;vertical-align:middle;margin:2px 4px}
    .katex{font-size:1.05em}
    .katex-display{overflow-x:auto}
  </style>
</head>
<body>
  <div class="exp-header">
    <h1>${safeTitle}</h1>
    <button class="exp-run-all-btn" id="exp-run-all-btn" onclick="expRunAll()">
      &#9654;&#9654; Executar Tudo
    </button>
  </div>
  <div id="exp-status" class="exp-status"></div>
  <div class="nb-wrap">${cellsHtml}
  </div>
  <div id="console-saida" style="display:none" aria-hidden="true"></div>

  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"><\/script>
  <script src="https://pseudo-ide.netlify.app/js/plotterApi.js"><\/script>
  <script src="https://pseudo-ide.netlify.app/plotterapi.js"><\/script>
  <script src="https://pseudo-ide.netlify.app/editor.js"><\/script>
  <script>
    var _nbSources = ${sourcesJson};

    // Map output divs by code-cell index
    var _expOutputs = Array.from(document.querySelectorAll('.nb-cell-output'));

    // Setup routing globals expected by plotterapi.js
    window._nbOutputs = _expOutputs;
    window._nbCurrentCell = null;
    window._nbSwitch = function(i) {
      window._nbCurrentCell = _expOutputs[i] || null;
    };

    function _expSetStatus(msg, cls) {
      var el = document.getElementById('exp-status');
      if (!el) return;
      el.textContent = msg;
      el.className = 'exp-status' + (cls ? ' ' + cls : '');
    }

    function _expAppendError(outputEl, e) {
      if (!outputEl) return;
      var div = document.createElement('div');
      div.className = 'console-error';
      var msg = e && e.message ? e.message : String(e);
      div.innerHTML = '<strong>Erro:</strong> ' + msg.replace(/</g, '&lt;');
      outputEl.appendChild(div);
      outputEl.classList.add('nb-has-output');
    }

    async function expRunAll() {
      var btn = document.getElementById('exp-run-all-btn');
      if (btn) btn.disabled = true;
      _expSetStatus('executando…');

      // Reset all outputs
      _expOutputs.forEach(function(o) {
        o.innerHTML = '';
        o.classList.remove('nb-has-output');
      });
      document.querySelectorAll('.exp-run-btn').forEach(function(b) {
        b.classList.remove('running');
      });

      // Build combined source with _nbSwitch calls
      var combined = '';
      _nbSources.forEach(function(src, i) {
        combined += 'window._nbSwitch(' + i + ');\\n' + src + '\\n';
      });

      if (!combined.trim()) {
        _expSetStatus('nada para executar');
        if (btn) btn.disabled = false;
        return;
      }

      var translated;
      try {
        translated = traduzirCodigo(combined, false);
      } catch (e) {
        _expAppendError(_expOutputs[0] || null, e);
        _expSetStatus('erro de compilação', 'err');
        if (btn) btn.disabled = false;
        return;
      }

      window.__inicioExecucao = Date.now();
      var ctx = '(async function __NB__(){\\ntry{\\n' + translated + '\\n}catch(__e){\\n_imprimaErro(__e);\\n}})();';
      try {
        await eval(ctx);
        _expSetStatus('executado com sucesso ✓', 'ok');
      } catch (e) {
        _expSetStatus('erro de execução', 'err');
      } finally {
        _expOutputs.forEach(function(o) { if (o.hasChildNodes()) o.classList.add('nb-has-output'); });
        if (btn) btn.disabled = false;
      }
    }

    async function expRunCell(btn) {
      var ci = parseInt(btn.getAttribute('data-ci'), 10);
      var outputEl = _expOutputs[ci];
      if (!outputEl) return;

      btn.classList.add('running');
      outputEl.innerHTML = '';
      outputEl.classList.remove('nb-has-output');
      window._nbCurrentCell = outputEl;
      window._nbOutputs = _expOutputs;

      var src = _nbSources[ci] || '';
      if (!src.trim()) { btn.classList.remove('running'); return; }

      var translated;
      try {
        translated = traduzirCodigo(src, false);
      } catch (e) {
        _expAppendError(outputEl, e);
        btn.classList.remove('running');
        return;
      }

      window.__inicioExecucao = Date.now();
      window._nbSwitch(ci);
      var ctx = '(async function __NBC__(){\\ntry{\\nwindow._nbSwitch(' + ci + ');\\n' + translated + '\\n}catch(__e){\\n_imprimaErro(__e);\\n}})();';
      try {
        await eval(ctx);
      } catch (e) {
        // handled inside wrapper
      } finally {
        if (outputEl.hasChildNodes()) outputEl.classList.add('nb-has-output');
        btn.classList.remove('running');
      }
    }
  <\/script>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = title.replace(/[^a-zA-Z0-9À-ÿ _\-]/g, "_") + ".html";
    a.click();
    URL.revokeObjectURL(a.href);
    _setStatus("HTML exportado ✓");
  }

  // ---------- run-all sequential (respects env mode per cell) ----------
  async function _runAllEnv() {
    _setStatus("executando (amb)…");
    const runBtn = document.getElementById("nb-run-all-btn");
    if (runBtn) runBtn.disabled = true;
    window._nbEnv = {};

    const codeCells = _cells.filter((c) => c.type === "codigo");
    const outputs = [];

    codeCells.forEach((cell) => {
      const outputEl = cell.el.querySelector(".nb-cell-output");
      outputEl.innerHTML = "";
      _setOutputVisible(outputEl, false);
      outputs.push(outputEl);
    });
    window._nbOutputs = outputs;

    if (codeCells.length === 0) {
      _setStatus("nada para executar");
      if (runBtn) runBtn.disabled = false;
      return;
    }

    let execOk = true;
    window.__inicioExecucao = Date.now();

    for (let i = 0; i < codeCells.length; i++) {
      const cell = codeCells[i];
      const src = _getCellSource(cell) || "";
      if (!src.trim()) continue;

      let translated;
      try {
        translated = traduzirCodigo(src, false);
      } catch (e) {
        _appendError(outputs[i], e);
        _setOutputVisible(outputs[i], true);
        execOk = false;
        break;
      }

      const captureCode = cell.envMode ? _buildEnvCapture(_extractPublicVars(translated)) : "";
      const execCode = `with(window._nbEnv||{}){\n${translated}\n${captureCode}\n}`;
      const ctx = `(async function __NBCE${i}__(){\ntry{\nwindow._nbSwitch(${i});\n${execCode}\n}catch(__e){\n_imprimaErro(__e);\n}})();`;

      try {
        // eslint-disable-next-line no-eval
        await (0, eval)(ctx);
      } catch (e) {
        console.error("[Pseudo Notebook] Erro na célula", i, e);
        execOk = false;
        break;
      }
    }

    outputs.forEach((o) => { if (o.hasChildNodes()) _setOutputVisible(o, true); });
    if (execOk) _setStatus("executado (amb) ✓");
    else _setStatus("erro de execução", true);
    if (runBtn) runBtn.disabled = false;
    _updateEnvPanel();
  }

  // ---------- run-mode selector ----------
  let _runMode = "amb"; // 'amb' | 'livre'

  function _setRunMode(mode) {
    _runMode = mode;
    const label = document.getElementById("nb-run-label");
    if (label) label.textContent = mode === "livre" ? "Executar Tudo (Livre)" : "Executar Tudo";
    document.querySelectorAll(".nb-run-menu-item").forEach((btn) => {
      btn.classList.toggle("nb-run-menu-active", btn.dataset.mode === mode);
    });
  }

  // ---------- keyboard shortcut: Ctrl+Shift+Enter → run all ----------
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "Enter") {
      e.preventDefault();
      _runMode === "livre" ? _runAll() : _runAllEnv();
    }
  });

  // ---------- title → document.title sync ----------
  document.addEventListener("DOMContentLoaded", () => {
    const titleEl = _titleEl();
    if (titleEl) {
      titleEl.addEventListener("input", () => {
        document.title =
          (titleEl.value.trim() || "Notebook") + " — Pseudo Notebook";
      });
    }
  });

  // ---------- env panel ----------
  function _inferType(v) {
    if (v === null || v === undefined) return { label: "null", cls: "env-t-null" };
    if (typeof v === "function") return { label: "func", cls: "env-t-func" };
    if (typeof v === "number") return { label: "núm", cls: "env-t-num" };
    if (typeof v === "boolean") return { label: "bool", cls: "env-t-bool" };
    if (typeof v === "string") return { label: "txt", cls: "env-t-str" };
    if (typeof v === "object") {
      if (v && Array.isArray(v._v)) return { label: `lista·${v._v.length}`, cls: "env-t-list" };
      if (Array.isArray(v)) return { label: `arr·${v.length}`, cls: "env-t-list" };
      return { label: "obj", cls: "env-t-obj" };
    }
    return { label: "?", cls: "" };
  }

  function _previewVal(v) {
    if (v === null || v === undefined) return String(v);
    if (typeof v === "function") {
      const h = v.toString().split("\n")[0].trim();
      return h.length > 42 ? h.slice(0, 42) + "…" : h;
    }
    if (typeof v === "string") {
      const s = v.length > 38 ? v.slice(0, 38) + "…" : v;
      return `"${s}"`;
    }
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v === "object") {
      if (v && Array.isArray(v._v)) {
        const prev = v._v.slice(0, 6).map(x => { try { return JSON.stringify(x); } catch (_) { return "?"; } }).join(", ");
        return `[${prev}${v._v.length > 6 ? ", …" : ""}]`;
      }
      try {
        const s = JSON.stringify(v);
        return s && s.length > 44 ? s.slice(0, 44) + "…" : (s || String(v));
      } catch (_) { return "[objeto]"; }
    }
    return String(v);
  }

  function _escHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function _updateEnvPanel() {
    const list = document.getElementById("nb-env-list");
    if (!list) return;
    const env = window._nbEnv || {};
    const keys = Object.keys(env);
    if (!keys.length) {
      list.innerHTML = '<div class="nb-env-empty">Nenhuma variável.<br>Execute células com <strong>amb</strong> ativo.</div>';
      return;
    }
    list.innerHTML = keys.map(k => {
      const v = env[k];
      const { label, cls } = _inferType(v);
      const preview = _previewVal(v);
      return `<div class="nb-env-row">
        <div class="nb-env-row-head">
          <span class="nb-env-name">${_escHtml(k)}</span>
          <span class="nb-env-type ${cls}">${label}</span>
        </div>
        <div class="nb-env-val">${_escHtml(preview)}</div>
      </div>`;
    }).join("");
  }

  // ---------- init ----------
  function _init() {
    _addCell("codigo");
    _updateCellCount();

    // Expose public API
    window.nbRunAll = _runAll;
    window.nbRunAllEnv = _runAllEnv;
    window.nbRunDefault = () => (_runMode === "livre" ? _runAll() : _runAllEnv());
    window.nbToggleRunMenu = () => {
      const menu = document.getElementById("nb-run-menu");
      if (!menu) return;
      const open = menu.classList.toggle("nb-run-menu-open");
      if (open) {
        const close = (ev) => {
          if (!document.getElementById("nb-run-group")?.contains(ev.target)) {
            menu.classList.remove("nb-run-menu-open");
            document.removeEventListener("click", close, true);
          }
        };
        setTimeout(() => document.addEventListener("click", close, true), 0);
      }
    };
    window.nbRunMenuSelect = (mode) => {
      _setRunMode(mode);
      document.getElementById("nb-run-menu")?.classList.remove("nb-run-menu-open");
      mode === "livre" ? _runAll() : _runAllEnv();
    };
    window.nbGuideOpen = () => {
      const el = document.getElementById("nb-guide-overlay");
      if (el) el.style.display = "flex";
    };
    window.nbGuideClose = () => {
      const el = document.getElementById("nb-guide-overlay");
      if (el) el.style.display = "none";
    };
    window.nbEnvPanelToggle = () => {
      const panel = document.getElementById("nb-env-panel");
      if (!panel) return;
      const open = panel.classList.toggle("nb-env-panel-open");
      if (open) _updateEnvPanel();
    };
    window.nbEnvPanelClose = () => {
      document.getElementById("nb-env-panel")?.classList.remove("nb-env-panel-open");
    };
    window.nbEnvClear = () => {
      window._nbEnv = {};
      _updateEnvPanel();
    };
    window.nbSave = _save;
    window.nbLoad = _load;
    window.nbExportHTML = _exportHTML;
    window.nbAddCell = function (type, afterId) {
      if (afterId !== undefined) {
        const idx = _cells.findIndex((c) => c.id === afterId);
        _addCell(type, idx >= 0 ? idx : undefined);
      } else {
        _addCell(type);
      }
    };

    // Apply default run mode visual state
    _setRunMode("amb");
  }

  document.addEventListener("DOMContentLoaded", _init);
})();
