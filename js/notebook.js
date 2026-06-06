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

  // ---------- auto-resize textarea ----------
  function _autoResize(ta) {
    // height:0 forces scrollHeight to reflect full content regardless of overflow
    ta.style.height = "0px";
    ta.style.height = Math.max(56, ta.scrollHeight) + "px";
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
    let inMath = false, mathBuf = [];

    function flushList() {
      if (!inList) return;
      out.push(listOl ? "</ol>" : "</ul>");
      inList = false;
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
      // Extract $...$ spans BEFORE HTML-escaping so LaTeX < > survive
      const mathSpans = [];
      let t = s.replace(/\$([^$\n]+)\$/g, (_, tex) => {
        mathSpans.push(tex);
        return `\x00M${mathSpans.length - 1}\x00`;
      });
      t = t
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
        .replace(/`([^`\n]+)`/g, "<code>$1</code>")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      return t.replace(/\x00M(\d+)\x00/g, (_, i) => {
        const tex = mathSpans[+i];
        if (window.katex) {
          try { return window.katex.renderToString(tex, { displayMode: false, throwOnError: false }); }
          catch (_) {}
        }
        return `<code>$${tex.replace(/</g, "&lt;")}$</code>`;
      });
    }

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

      // block math $$
      if (/^\$\$/.test(line)) {
        if (!inMath) {
          const single = line.match(/^\$\$(.+)\$\$\s*$/);
          if (single) { flushList(); out.push(_katexBlock(single[1])); }
          else {
            flushList();
            inMath = true; mathBuf = [];
            const rest = line.slice(2).trim();
            if (rest) mathBuf.push(rest);
          }
        } else {
          out.push(_katexBlock(mathBuf.join("\n")));
          inMath = false; mathBuf = [];
        }
        continue;
      }
      if (inMath) { mathBuf.push(line); continue; }

      // heading
      const hm = line.match(/^(#{1,3})\s+(.+)$/);
      if (hm) { flushList(); out.push(`<h${hm[1].length}>${inline(hm[2])}</h${hm[1].length}>`); continue; }

      // hr
      if (/^---+$/.test(line.trim())) { flushList(); out.push("<hr>"); continue; }

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
        <span class="nb-cell-type-badge">pseudo</span>
        <div class="nb-cell-actions">
          <button class="nb-btn-run" data-action="run" title="Ctrl+Enter">&#9654; Executar</button>
          <button class="nb-btn-icon" data-action="up" title="Mover acima">&#8593;</button>
          <button class="nb-btn-icon" data-action="down" title="Mover abaixo">&#8595;</button>
          <button class="nb-btn-icon" data-action="add-code" title="Inserir c&eacute;lula c&oacute;digo abaixo">+C</button>
          <button class="nb-btn-icon" data-action="add-md" title="Inserir c&eacute;lula texto abaixo">+T</button>
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
    }
  }

  // ---------- CRUD ----------
  function _addCell(type, afterIdx) {
    const id = _nextId++;
    const el =
      type === "markdown"
        ? _buildMdCell(id, "")
        : _buildCodeCell(id, "");
    const cell = { id, type, el };
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

  // ---------- execution ----------
  async function _runAll() {
    _setStatus("executando…");
    const runBtn = document.getElementById("nb-run-all-btn");
    if (runBtn) runBtn.disabled = true;

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

    console.groupCollapsed("[Pseudo Notebook] JS gerado — executar tudo");
    console.log(translated);
    console.groupEnd();

    // errors inside code are caught by __NB__ and routed via _imprimaErro → _c()
    window.__inicioExecucao = Date.now();
    const ctx = `(async function __NB__(){\ntry{\n${translated}\n}catch(__e){\n_imprimaErro(__e);\n}})();`;
    let execOk = true;
    try {
      await eval(ctx);
    } catch (e) {
      // only reached if the eval wrapper itself explodes (rare)
      console.error("[Pseudo Notebook] Erro de execução (wrapper):", e);
      execOk = false;
      _setStatus("erro de execução", true);
    } finally {
      outputs.forEach((o) => { if (o.hasChildNodes()) _setOutputVisible(o, true); });
      if (execOk) _setStatus("executado com sucesso ✓");
      if (runBtn) runBtn.disabled = false;
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

    console.groupCollapsed("[Pseudo Notebook] JS gerado — célula");
    console.log(translated);
    console.groupEnd();

    window.__inicioExecucao = Date.now();
    const ctx = `(async function __NBC__(){\ntry{\nwindow._nbSwitch(0);\n${translated}\n}catch(__e){\n_imprimaErro(__e);\n}})();`;
    try {
      await eval(ctx);
    } catch (_e) {
      // errors are handled inside __NBC__ by _imprimaErro
      console.error("[Pseudo Notebook] Erro de execução (wrapper):", _e);
    } finally {
      if (outputEl.hasChildNodes()) _setOutputVisible(outputEl, true);
      if (runBtn) runBtn.classList.remove("nb-running");
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
      return { tipo: cell.type, conteudo };
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
        _cells.push({ id, type, el });
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

  // ---------- keyboard shortcut: Ctrl+Shift+Enter → run all ----------
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "Enter") {
      e.preventDefault();
      _runAll();
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

  // ---------- init ----------
  function _init() {
    _addCell("codigo");
    _updateCellCount();

    // Expose public API
    window.nbRunAll = _runAll;
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
  }

  document.addEventListener("DOMContentLoaded", _init);
})();
