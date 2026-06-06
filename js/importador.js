/* ============================================================
   PSEUDO-IDE — importador.js
   Interactive data importer: drag-drop, click-to-select columns,
   variable definition from selection, Pseudo code generation,
   and .pdados format export.
   ============================================================ */
(function () {
  "use strict";

  // ── State ───────────────────────────────────────────────────
  let _file    = null;  // { nome, tipo: 'csv'|'json'|'txt'|'pdados', conteudo }
  let _parsed  = null;  // CSV/PDADOS: {cabecalhos, dados}; JSON: any; TXT: string
  let _selCols = new Set();  // selected column indices
  let _rowStart = 0;
  let _rowEnd   = null;  // null = all rows
  let _selJsonPath = null;
  let _vars    = [];    // [{id, nome, tipo, cols?, rowStart?, rowEnd?, tipoAuto?, jsonPath?, txtSep?}]
  let _nextId  = 1;

  // ── Utilities ───────────────────────────────────────────────
  function esc(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }
  function pyStr(v) {
    if (v === null || v === undefined) return "indefinido";
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    return '"' + String(v).replace(/\\/g,"\\\\").replace(/"/g,'\\"') + '"';
  }
  function autoType(v) {
    if (v === "" || v == null) return v === "" ? "" : null;
    const n = Number(v);
    if (!isNaN(n) && String(v).trim() !== "") return n;
    const lo = String(v).toLowerCase();
    if (lo === "true"  || lo === "verdadeiro") return true;
    if (lo === "false" || lo === "falso")      return false;
    return v;
  }
  function toVarName(s) {
    return (s || "dados")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .replace(/^[0-9]/, "_$&")
      .toLowerCase()
      .slice(0, 24);
  }

  // ── CSV Parser ──────────────────────────────────────────────
  function parseCSV(text, sep) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
    if (!lines.length) return { cabecalhos: [], dados: [] };
    function parseLine(l) {
      const cells = []; let cur = "", inQ = false;
      for (let i = 0; i < l.length; i++) {
        const c = l[i];
        if      (c === '"' && inQ && l[i+1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = !inQ;
        else if (c === sep && !inQ) { cells.push(cur); cur = ""; }
        else cur += c;
      }
      cells.push(cur);
      return cells;
    }
    const cabecalhos = parseLine(lines[0]);
    const dados = lines.slice(1).map(parseLine);
    return { cabecalhos, dados };
  }

  function detectSep(text) {
    const first = text.split(/\r?\n/)[0] || "";
    const tabs   = (first.match(/\t/g)  || []).length;
    const semis  = (first.match(/;/g)   || []).length;
    const commas = (first.match(/,/g)   || []).length;
    if (tabs > commas && tabs > semis) return "\t";
    if (semis > commas) return ";";
    return ",";
  }

  // ── .pdados Parser ──────────────────────────────────────────
  function parsePDADOS(text) {
    const lines = text.split(/\r?\n/);
    if (!lines[0].startsWith("§PSEUDO-DADOS:")) return null;
    let cabecalhos = [], dados = [], inData = false;
    for (const line of lines.slice(1)) {
      if (line === "§DADOS") { inData = true; continue; }
      if (inData) {
        if (line.trim()) dados.push(JSON.parse(line));
      } else if (line.startsWith("colunas=")) {
        cabecalhos = JSON.parse(line.slice(8));
      }
    }
    return { cabecalhos, dados };
  }

  // ── JSON path accessor ──────────────────────────────────────
  function accessJsonPath(obj, path) {
    if (!path) return obj;
    for (const p of path.split(".")) {
      if (obj == null) return undefined;
      if (p.endsWith("[*]")) {
        const key = p.slice(0, -3);
        obj = key ? obj[key] : obj;
      } else if (Array.isArray(obj)) {
        obj = obj.map(item => (item && typeof item === "object") ? item[p] : undefined);
      } else {
        obj = obj[p];
      }
    }
    return obj;
  }

  // ── Preview renderers ────────────────────────────────────────
  const MAX_ROWS = 300;

  function renderCSVTable(cabecalhos, dados) {
    const show = Math.min(dados.length, MAX_ROWS);
    let html = '<div class="imp-table-wrap"><table class="imp-table" id="imp-csv-table"><thead><tr>';
    html += '<th class="imp-rn">#</th>';
    cabecalhos.forEach((h, ci) => {
      const sel = _selCols.has(ci) ? " imp-col-sel" : "";
      html += `<th class="imp-th${sel}" data-ci="${ci}" title="Clique para selecionar/deselecionar esta coluna">${esc(h)}</th>`;
    });
    html += "</tr></thead><tbody>";
    const rEnd = _rowEnd ?? dados.length;
    for (let i = 0; i < show; i++) {
      const inRange = i >= _rowStart && i < rEnd;
      html += `<tr${inRange ? ' class="imp-row-in"' : ""}><td class="imp-rn">${i + 1}</td>`;
      cabecalhos.forEach((_, ci) => {
        html += `<td class="imp-td${_selCols.has(ci) ? " imp-col-sel" : ""}" data-ci="${ci}">${esc(dados[i][ci] ?? "")}</td>`;
      });
      html += "</tr>";
    }
    if (dados.length > show)
      html += `<tr><td colspan="${cabecalhos.length + 1}" class="imp-table-more">+ ${dados.length - show} linhas não exibidas</td></tr>`;
    html += "</tbody></table></div>";
    html += `<div class="imp-meta">${dados.length} linha${dados.length !== 1 ? "s" : ""} · ${cabecalhos.length} coluna${cabecalhos.length !== 1 ? "s" : ""}</div>`;
    return html;
  }

  function renderJSON(obj) {
    // Build flat list of accessible paths
    const paths = [];
    function walk(o, path, depth) {
      if (depth > 4) return;
      if (Array.isArray(o)) {
        const len = o.length;
        paths.push({ path, label: path || "(raiz)", desc: `lista — ${len} item${len !== 1 ? "s" : ""}`, val: o });
        if (len > 0 && o[0] !== null && typeof o[0] === "object" && !Array.isArray(o[0])) {
          Object.keys(o[0]).forEach(k => walk(o[0][k], `${path}[*].${k}`, depth + 1));
        }
      } else if (o !== null && typeof o === "object") {
        if (path) paths.push({ path, label: path, desc: `objeto — ${Object.keys(o).length} chave${Object.keys(o).length !== 1 ? "s" : ""}`, val: o });
        Object.entries(o).forEach(([k, v]) => walk(v, path ? `${path}.${k}` : k, depth + 1));
      } else {
        paths.push({ path, label: path || "(valor)", desc: String(o).slice(0, 50), val: o });
      }
    }
    walk(obj, "", 0);

    const chips = paths.map(p =>
      `<div class="imp-json-path${_selJsonPath === p.path ? " imp-jp-sel" : ""}" data-path="${esc(p.path)}" onclick="impSelectJsonPath(this)">
        <code class="imp-jp-label">${esc(p.label || "(raiz)")}</code>
        <span class="imp-jp-desc">${esc(p.desc)}</span>
      </div>`
    ).join("");

    const rawPreview = JSON.stringify(obj, null, 2).split("\n").slice(0, 60).join("\n");
    return `
      <p class="imp-json-hint">Clique em um caminho para selecioná-lo como fonte da variável:</p>
      <div class="imp-json-paths">${chips}</div>
      <details class="imp-json-raw-wrap"><summary class="imp-json-raw-toggle">Ver JSON bruto</summary>
        <pre class="imp-pre imp-json-raw">${esc(rawPreview)}</pre>
      </details>`;
  }

  function renderTXT(text) {
    const lines = text.split("\n");
    const show  = lines.slice(0, 200);
    const extra = lines.length - 200;
    let t = show.join("\n");
    if (extra > 0) t += `\n... (+${extra} linhas)`;
    return `<pre class="imp-pre">${esc(t)}</pre>
      <div class="imp-meta">${lines.length} linha${lines.length !== 1 ? "s" : ""}</div>`;
  }

  // ── Column interaction ───────────────────────────────────────
  function toggleCol(ci) {
    if (_selCols.has(ci)) _selCols.delete(ci); else _selCols.add(ci);
    document.querySelectorAll(`#imp-csv-table [data-ci="${ci}"]`).forEach(el =>
      el.classList.toggle("imp-col-sel", _selCols.has(ci))
    );
    _updateSelInfo();
  }

  function updateRowHighlight() {
    const rEnd = _rowEnd ?? Infinity;
    document.querySelectorAll("#imp-csv-table tbody tr").forEach((tr, i) =>
      tr.classList.toggle("imp-row-in", i >= _rowStart && i < rEnd)
    );
    _updateSelInfo();
  }

  function _updateSelInfo() {
    const el  = document.getElementById("imp-sel-info");
    const btn = document.getElementById("imp-create-btn");
    if (!_file || !el) return;

    if (_file.tipo === "csv" || _file.tipo === "pdados") {
      const { cabecalhos, dados } = _parsed;
      const selArr = [..._selCols].sort((a, b) => a - b);
      const rEnd = _rowEnd ?? dados.length;
      const rowCount = Math.max(0, rEnd - _rowStart);
      if (selArr.length === 0) {
        el.textContent = "Clique nos cabeçalhos da tabela para selecionar colunas.";
        el.className = "imp-sel-info imp-sel-empty";
      } else {
        const names = selArr.map(ci => cabecalhos[ci]).join(", ");
        el.innerHTML = `<strong>${selArr.length} coluna${selArr.length > 1 ? "s" : ""}:</strong> ${esc(names)}` +
          ` <span class="imp-sel-rows">· ${rowCount} linha${rowCount !== 1 ? "s" : ""}</span>`;
        el.className = "imp-sel-info imp-sel-active";
        // Auto-suggest variable name if user hasn't typed one
        const nameEl = document.getElementById("imp-vname-inp");
        if (nameEl && !nameEl._userEdited) {
          nameEl.value = selArr.length === 1
            ? toVarName(cabecalhos[selArr[0]])
            : `dados${_vars.length + 1}`;
        }
      }
      if (btn) btn.disabled = selArr.length === 0;
    } else if (_file.tipo === "json") {
      if (_selJsonPath === null) {
        el.textContent = "Clique em um caminho acima para selecioná-lo.";
        el.className = "imp-sel-info imp-sel-empty";
      } else {
        el.innerHTML = `<strong>Caminho:</strong> <code>${esc(_selJsonPath || "(raiz)")}</code>`;
        el.className = "imp-sel-info imp-sel-active";
      }
      if (btn) btn.disabled = _selJsonPath === null;
    } else if (_file.tipo === "txt") {
      el.textContent = "Arquivo de texto pronto para importação.";
      el.className = "imp-sel-info imp-sel-active";
      if (btn) btn.disabled = false;
    }
  }

  window.impSelectJsonPath = function (el) {
    document.querySelectorAll(".imp-json-path.imp-jp-sel").forEach(e => e.classList.remove("imp-jp-sel"));
    _selJsonPath = el.dataset.path;
    el.classList.add("imp-jp-sel");
    _updateSelInfo();
    const nameEl = document.getElementById("imp-vname-inp");
    if (nameEl && !nameEl._userEdited)
      nameEl.value = toVarName(_selJsonPath.split(".").pop().replace("[*]", "") || "dados");
  };

  // ── Code generation (Pseudo syntax) ─────────────────────────
  function genCode(vd) {
    const { nome, tipo } = vd;
    if (!nome.trim()) return "";

    if (_file.tipo === "csv" || _file.tipo === "pdados") {
      const { cabecalhos, dados } = _parsed;
      const colIdxs = vd.cols
        .map(c => cabecalhos.indexOf(c))
        .filter(i => i >= 0);
      const rows    = dados.slice(vd.rowStart, vd.rowEnd);
      const useAuto = vd.tipoAuto !== false;
      function cell(row, ci) {
        const raw = row[ci] ?? "";
        return useAuto ? autoType(raw) : raw;
      }
      if (tipo === "lista") {
        const ci = colIdxs[0] ?? 0;
        return `super ${nome} = [${rows.map(r => pyStr(cell(r, ci))).join(", ")}];`;
      }
      if (tipo === "lista-listas") {
        const inner = rows.map(r =>
          `  [${colIdxs.map(ci => pyStr(cell(r, ci))).join(", ")}]`);
        return `super ${nome} = [\n${inner.join(",\n")}\n];`;
      }
      if (tipo === "lista-mapas") {
        const hdrs = colIdxs.map(ci => cabecalhos[ci]);
        const inner = rows.map(r => {
          const pairs = colIdxs.map((ci, ii) => `"${hdrs[ii]}": ${pyStr(cell(r, ci))}`);
          return `  {${pairs.join(", ")}}`;
        });
        return `super ${nome} = [\n${inner.join(",\n")}\n];`;
      }
      if (tipo === "mapa-listas") {
        const hdrs = colIdxs.map(ci => cabecalhos[ci]);
        const pairs = hdrs.map((h, ii) => {
          const ci = colIdxs[ii];
          return `  "${h}": [${rows.map(r => pyStr(cell(r, ci))).join(", ")}]`;
        });
        return `super ${nome} = {\n${pairs.join(",\n")}\n};`;
      }
      if (tipo === "matriz") {
        const inner = rows.map(r => {
          const nums = colIdxs.map(ci => { const v = parseFloat(r[ci]); return isNaN(v) ? 0 : v; });
          return `  [${nums.join(", ")}]`;
        });
        return `super ${nome} = mat.criar([\n${inner.join(",\n")}\n]);`;
      }
    }

    if (_file.tipo === "json") {
      const val = accessJsonPath(_parsed, vd.jsonPath);
      return `super ${nome} = ${JSON.stringify(val, null, 2)};`;
    }

    if (_file.tipo === "txt") {
      if (tipo === "lista") {
        const sep = vd.txtSep || "\n";
        const parts = _parsed.split(sep).filter(l => l.trim() !== "").map(l => pyStr(l));
        if (parts.length <= 6) return `super ${nome} = [${parts.join(", ")}];`;
        return `super ${nome} = [\n  ${parts.join(",\n  ")}\n];`;
      }
      return `super ${nome} = ${pyStr(_parsed)};`;
    }
    return "";
  }

  // ── Variable management ──────────────────────────────────────
  window.impCreateVar = function () {
    if (!_file) return;
    const nameEl = document.getElementById("imp-vname-inp");
    const typeEl = document.getElementById("imp-vtype-sel");
    const nome   = nameEl ? nameEl.value.trim() : "";
    const tipo   = typeEl ? typeEl.value : "lista-mapas";
    if (!nome) { if (nameEl) nameEl.focus(); return; }

    const vd = { id: _nextId++, nome, tipo };

    if (_file.tipo === "csv" || _file.tipo === "pdados") {
      const selArr = [..._selCols].sort((a, b) => a - b);
      if (!selArr.length) return;
      vd.cols     = selArr.map(ci => _parsed.cabecalhos[ci]);
      vd.rowStart = _rowStart;
      vd.rowEnd   = _rowEnd ?? _parsed.dados.length;
      vd.tipoAuto = document.getElementById("imp-auto-type")?.checked !== false;
    } else if (_file.tipo === "json") {
      if (_selJsonPath === null) return;
      vd.jsonPath = _selJsonPath;
    } else if (_file.tipo === "txt") {
      vd.txtSep = document.getElementById("imp-txt-sep")?.value || "\n";
    }

    _vars.push(vd);
    if (nameEl) { nameEl._userEdited = false; nameEl.value = `dados${_vars.length + 1}`; }

    _refreshVarsList();
    _refreshCode();
  };

  window.impRemoveVar = function (id) {
    _vars = _vars.filter(v => v.id !== id);
    _refreshVarsList();
    _refreshCode();
  };

  function _refreshVarsList() {
    const list = document.getElementById("imp-vars-list");
    if (!list) return;
    if (!_vars.length) {
      list.innerHTML = '<p class="imp-empty imp-vars-empty">Nenhuma variável ainda.</p>';
      return;
    }
    list.innerHTML = _vars.map(vd => {
      const desc = vd.cols ? vd.cols.join(", ") : vd.jsonPath != null ? (vd.jsonPath || "raiz") : "txt";
      const short = desc.length > 30 ? desc.slice(0, 28) + "…" : desc;
      return `<div class="imp-var-item">
        <span class="imp-vi-name">${esc(vd.nome)}</span>
        <span class="imp-vi-type">${esc(vd.tipo)}</span>
        <span class="imp-vi-cols" title="${esc(desc)}">${esc(short)}</span>
        <button class="imp-rm-btn" onclick="impRemoveVar(${vd.id})" title="Remover">✕</button>
      </div>`;
    }).join("");
  }

  function _refreshCode() {
    const ta = document.getElementById("imp-code-out");
    if (!ta) return;
    if (!_file || !_vars.length) { ta.value = ""; return; }
    ta.value = _vars.map(genCode).filter(Boolean).join("\n\n");
  }

  // ── .pdados export ───────────────────────────────────────────
  window.impExportPDADOS = function () {
    if (!_file || !_parsed || !_parsed.cabecalhos) return;
    const { cabecalhos, dados } = _parsed;
    const content = [
      "§PSEUDO-DADOS:1.0",
      `tipo=csv`,
      `colunas=${JSON.stringify(cabecalhos)}`,
      `linhas=${dados.length}`,
      "§DADOS",
      ...dados.map(row => JSON.stringify(row)),
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = _file.nome.replace(/\.[^.]+$/, "") + ".pdados";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Copy code ────────────────────────────────────────────────
  window.impCopyCode = function () {
    const ta = document.getElementById("imp-code-out");
    if (!ta || !ta.value.trim()) return;
    navigator.clipboard.writeText(ta.value).then(() => {
      const btn = document.getElementById("imp-copy-btn");
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = "✓ Copiado!"; btn.disabled = true;
        setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 1800);
      }
    });
  };

  // ── File loading ─────────────────────────────────────────────
  function loadFile(file) {
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target.result;
      const nome = file.name;
      let tipo;
      if      (nome.endsWith(".pdados")) tipo = "pdados";
      else if (nome.endsWith(".json"))   tipo = "json";
      else if (nome.endsWith(".csv") || nome.endsWith(".tsv")) tipo = "csv";
      else tipo = "txt";

      _file = { nome, tipo, conteudo: content };
      _vars = []; _selCols = new Set();
      _rowStart = 0; _rowEnd = null; _selJsonPath = null;
      _nextId = 1;

      // Show UI
      const drop    = document.getElementById("imp-drop");
      const badge   = document.getElementById("imp-file-badge");
      const meta    = document.getElementById("imp-file-meta");
      const main    = document.getElementById("imp-main-content");
      const preview = document.getElementById("imp-preview");
      const rowControls = document.getElementById("imp-row-controls");
      const txtControls = document.getElementById("imp-txt-controls");
      const expBtn  = document.getElementById("imp-export-btn");

      if (meta)   meta.textContent = nome;
      if (badge)  badge.style.display = "inline-flex";
      if (drop)   drop.classList.add("imp-drop-mini");
      if (main)   main.style.display = "";
      if (rowControls) rowControls.style.display = (tipo === "csv" || tipo === "pdados") ? "" : "none";
      if (txtControls) txtControls.style.display = tipo === "txt" ? "" : "none";
      if (expBtn)  expBtn.style.display = (tipo === "csv" || tipo === "pdados") ? "" : "none";

      const nameEl = document.getElementById("imp-vname-inp");
      if (nameEl) { nameEl.value = "dados1"; nameEl._userEdited = false; }

      if (tipo === "csv") {
        const sep = nome.endsWith(".tsv") ? "\t" : detectSep(content);
        _parsed = parseCSV(content, sep);
        if (preview) preview.innerHTML = renderCSVTable(_parsed.cabecalhos, _parsed.dados);
        _attachTableClick();
        _attachRowRange(_parsed.dados.length);
        _setTypeOptions(["lista","lista-listas","lista-mapas","mapa-listas","matriz"], "lista-mapas");
      } else if (tipo === "pdados") {
        const r = parsePDADOS(content);
        if (r) {
          _parsed = r;
          if (preview) preview.innerHTML = renderCSVTable(r.cabecalhos, r.dados);
          _attachTableClick();
          _attachRowRange(r.dados.length);
          _setTypeOptions(["lista","lista-listas","lista-mapas","mapa-listas","matriz"], "lista-mapas");
        } else {
          if (preview) preview.innerHTML = '<p class="imp-error">Arquivo .pdados inválido.</p>';
        }
      } else if (tipo === "json") {
        try {
          _parsed = JSON.parse(content);
          if (preview) preview.innerHTML = renderJSON(_parsed);
          _setTypeOptions(["objeto","lista","lista-mapas"], "lista-mapas");
        } catch(e) {
          _parsed = null;
          if (preview) preview.innerHTML = `<p class="imp-error">JSON inválido: ${esc(e.message)}</p>`;
        }
      } else {
        _parsed = content;
        if (preview) preview.innerHTML = renderTXT(content);
        _setTypeOptions(["lista","texto"], "lista");
      }

      _refreshVarsList();
      _refreshCode();
      _updateSelInfo();
    };
    reader.readAsText(file, "UTF-8");
  }

  function _setTypeOptions(types, def) {
    const sel = document.getElementById("imp-vtype-sel");
    if (sel) sel.innerHTML = types.map(t =>
      `<option value="${t}"${t === def ? " selected" : ""}>${t}</option>`
    ).join("");
  }

  function _attachTableClick() {
    const table = document.getElementById("imp-csv-table");
    if (!table) return;
    // Use one delegated listener (re-attachment safe via replaceWith)
    const newTable = table.cloneNode(true);
    table.parentNode.replaceChild(newTable, table);
    document.getElementById("imp-csv-table").addEventListener("click", e => {
      const th = e.target.closest("th[data-ci]");
      if (th) toggleCol(parseInt(th.dataset.ci));
    });
  }

  function _attachRowRange(totalRows) {
    const startEl = document.getElementById("imp-row-start");
    const endEl   = document.getElementById("imp-row-end");
    if (startEl) {
      startEl.max   = totalRows;
      startEl.value = 0;
      startEl.oninput = () => { _rowStart = parseInt(startEl.value) || 0; updateRowHighlight(); };
    }
    if (endEl) {
      endEl.max   = totalRows;
      endEl.value = totalRows;
      endEl.oninput = () => { _rowEnd = parseInt(endEl.value) || totalRows; updateRowHighlight(); };
    }
    _rowEnd = totalRows;
  }

  // ── New file ─────────────────────────────────────────────────
  window.impNewFile = function () {
    _file = null; _parsed = null; _vars = [];
    _selCols = new Set(); _rowStart = 0; _rowEnd = null; _selJsonPath = null;
    const fi = document.getElementById("imp-file-input");
    if (fi) fi.value = "";
    document.getElementById("imp-main-content")?.style.setProperty("display","none");
    document.getElementById("imp-drop")?.classList.remove("imp-drop-mini");
    const badge = document.getElementById("imp-file-badge");
    if (badge) badge.style.display = "none";
    document.getElementById("imp-preview") && (document.getElementById("imp-preview").innerHTML = "");
    _refreshVarsList(); _refreshCode();
  };

  // ── Init ─────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    const drop  = document.getElementById("imp-drop");
    const input = document.getElementById("imp-file-input");
    const nameEl = document.getElementById("imp-vname-inp");

    if (drop) {
      drop.addEventListener("click",     () => input?.click());
      drop.addEventListener("dragover",  e  => { e.preventDefault(); drop.classList.add("imp-dragging"); });
      drop.addEventListener("dragleave", ()  => drop.classList.remove("imp-dragging"));
      drop.addEventListener("drop", e => {
        e.preventDefault(); drop.classList.remove("imp-dragging");
        const f = e.dataTransfer.files[0]; if (f) loadFile(f);
      });
    }
    if (input) input.addEventListener("change", e => { const f = e.target.files[0]; if (f) loadFile(f); });
    if (nameEl) nameEl.addEventListener("input", () => { nameEl._userEdited = true; });

    _refreshVarsList();
    _updateSelInfo();
  });
})();
