/* ============================================================
   PSEUDO-IDE — importador.js
   Importer screen: drag-drop file loading, preview, variable
   definition UI, and Pseudo code generation.
   ============================================================ */
(function () {
  "use strict";

  let _file   = null;   // { nome, tipo: 'csv'|'json'|'txt', conteudo }
  let _parsed = null;   // for CSV: { cabecalhos, dados }; JSON: object; TXT: string
  let _vars   = [];     // [{ id, nome, tipo, opts }]
  let _nextId = 1;

  // ── Utilities ───────────────────────────────────────────────
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function pyStr(v) {
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    return '"' + String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
  }

  function autoType(v) {
    if (v === "" || v == null) return v === "" ? "" : null;
    const n = Number(v);
    if (!isNaN(n) && v.trim() !== "") return n;
    const lo = String(v).toLowerCase();
    if (lo === "true") return true;
    if (lo === "false") return false;
    return v;
  }

  // ── CSV Parser ──────────────────────────────────────────────
  function parseCSV(text, sep) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (!lines.length) return { cabecalhos: [], dados: [] };
    function parseLine(l) {
      const cells = [];
      let cur = "", inQ = false;
      for (let i = 0; i < l.length; i++) {
        const c = l[i];
        if (c === '"') {
          if (inQ && l[i + 1] === '"') { cur += '"'; i++; }
          else inQ = !inQ;
        } else if (c === sep && !inQ) {
          cells.push(cur); cur = "";
        } else cur += c;
      }
      cells.push(cur);
      return cells;
    }
    const cabecalhos = parseLine(lines[0]);
    const dados = lines.slice(1).map(parseLine);
    return { cabecalhos, dados };
  }

  // ── Preview renderers ────────────────────────────────────────
  function renderCSV(parsed, maxRows) {
    const { cabecalhos, dados } = parsed;
    if (!cabecalhos.length) return '<p class="imp-empty">Arquivo CSV vazio.</p>';
    const show = Math.min(dados.length, maxRows || 200);
    let html = '<div class="imp-table-wrap"><table class="imp-table"><thead><tr>';
    html += '<th class="imp-rn">#</th>';
    cabecalhos.forEach((h) => (html += `<th>${esc(h)}</th>`));
    html += "</tr></thead><tbody>";
    for (let i = 0; i < show; i++) {
      html += `<tr><td class="imp-rn">${i + 1}</td>`;
      cabecalhos.forEach(
        (_, ci) => (html += `<td>${esc(dados[i][ci] ?? "")}</td>`)
      );
      html += "</tr>";
    }
    if (dados.length > show) {
      html += `<tr><td colspan="${cabecalhos.length + 1}" class="imp-table-more">+ ${dados.length - show} linhas não exibidas</td></tr>`;
    }
    html += "</tbody></table></div>";
    html += `<div class="imp-meta">${dados.length} linha${dados.length !== 1 ? "s" : ""} · ${cabecalhos.length} coluna${cabecalhos.length !== 1 ? "s" : ""}</div>`;
    return html;
  }

  function renderJSON(obj) {
    const str = JSON.stringify(obj, null, 2);
    const lines = str.split("\n");
    const show = lines.slice(0, 200);
    const extra = lines.length - 200;
    let t = show.join("\n");
    if (extra > 0) t += `\n... (+${extra} linhas)`;
    return `<pre class="imp-pre">${esc(t)}</pre>`;
  }

  function renderTXT(text) {
    const lines = text.split("\n");
    const show = lines.slice(0, 200);
    const extra = lines.length - 200;
    let t = show.join("\n");
    if (extra > 0) t += `\n... (+${extra} linhas)`;
    return `<pre class="imp-pre">${esc(t)}</pre>`;
  }

  // ── Code generators ─────────────────────────────────────────
  function genCode(vd) {
    const { nome, tipo, opts } = vd;
    if (!nome.trim()) return "";

    if (_file.tipo === "csv") {
      const { cabecalhos, dados } = _parsed;
      const colIdxs =
        opts.colunas && opts.colunas.length > 0
          ? opts.colunas.map((c) => cabecalhos.indexOf(c)).filter((i) => i >= 0)
          : cabecalhos.map((_, i) => i);

      const inicio = opts.linhaInicio || 0;
      const fim =
        opts.linhaFim !== undefined ? opts.linhaFim : dados.length;
      const rows = dados.slice(inicio, fim);
      const useAutoType = opts.tipoAuto !== false;

      function cell(row, ci) {
        const raw = row[ci] ?? "";
        return useAutoType ? autoType(raw) : raw;
      }

      if (tipo === "lista") {
        const ci = colIdxs[0] ?? 0;
        const vals = rows.map((r) => pyStr(cell(r, ci)));
        return `var ${nome} = [${vals.join(", ")}];`;
      }
      if (tipo === "lista-listas") {
        const inner = rows.map((r) => {
          const cells = colIdxs.map((ci) => pyStr(cell(r, ci)));
          return `  [${cells.join(", ")}]`;
        });
        return `var ${nome} = [\n${inner.join(",\n")}\n];`;
      }
      if (tipo === "lista-mapas") {
        const hdrs = colIdxs.map((ci) => cabecalhos[ci]);
        const inner = rows.map((r) => {
          const pairs = colIdxs.map(
            (ci, ii) => `"${hdrs[ii]}": ${pyStr(cell(r, ci))}`
          );
          return `  {${pairs.join(", ")}}`;
        });
        return `var ${nome} = [\n${inner.join(",\n")}\n];`;
      }
      if (tipo === "mapa-listas") {
        const hdrs = colIdxs.map((ci) => cabecalhos[ci]);
        const pairs = hdrs.map((h, ii) => {
          const ci = colIdxs[ii];
          const vals = rows.map((r) => pyStr(cell(r, ci)));
          return `  "${h}": [${vals.join(", ")}]`;
        });
        return `var ${nome} = {\n${pairs.join(",\n")}\n};`;
      }
      if (tipo === "matriz") {
        const inner = rows.map((r) => {
          const nums = colIdxs.map((ci) => {
            const v = parseFloat(r[ci]);
            return isNaN(v) ? 0 : v;
          });
          return `  [${nums.join(", ")}]`;
        });
        return `var ${nome} = mat.criar([\n${inner.join(",\n")}\n]);`;
      }
    }

    if (_file.tipo === "json") {
      let obj = _parsed;
      if (opts.caminho) {
        for (const p of opts.caminho.split(".")) {
          if (obj != null) obj = obj[p];
        }
      }
      return `var ${nome} = ${JSON.stringify(obj, null, 2)};`;
    }

    if (_file.tipo === "txt") {
      if (tipo === "lista") {
        const sep = opts.separador || "\n";
        const parts = _parsed
          .split(sep)
          .filter((l) => l.trim() !== "")
          .map((l) => pyStr(l));
        return `var ${nome} = [${parts.join(", ")}];`;
      }
      return `var ${nome} = ${pyStr(_parsed)};`;
    }

    return `// Erro ao gerar código para "${nome}"`;
  }

  // ── Variable card HTML ───────────────────────────────────────
  function buildVarCard(vd) {
    const tiposCSV = [
      "lista", "lista-listas", "lista-mapas", "mapa-listas", "matriz",
    ];
    const tiposJSON = ["objeto", "lista", "lista-mapas"];
    const tiposTXT = ["lista", "texto"];

    const tipos =
      !_file
        ? tiposCSV
        : _file.tipo === "json"
        ? tiposJSON
        : _file.tipo === "txt"
        ? tiposTXT
        : tiposCSV;

    const tipoOpts = tipos
      .map(
        (t) =>
          `<option value="${t}"${t === vd.tipo ? " selected" : ""}>${t}</option>`
      )
      .join("");

    let extra = "";

    if (_file && _file.tipo === "csv" && _parsed) {
      const { cabecalhos, dados } = _parsed;
      const activeCols = vd.opts.colunas || cabecalhos;
      const checkboxes = cabecalhos
        .map(
          (h) =>
            `<label class="imp-col-check"><input type="checkbox" class="imp-col-cb" value="${esc(h)}"${activeCols.includes(h) ? " checked" : ""}> ${esc(h)}</label>`
        )
        .join("");

      extra = `
        <div class="imp-var-field">
          <span class="imp-field-label">Colunas incluídas:</span>
          <div class="imp-col-checks" id="cols-${vd.id}">${checkboxes}</div>
        </div>
        <div class="imp-var-row-range">
          <span class="imp-field-label">Linhas:</span>
          <input type="number" class="imp-num-inp" id="row-s-${vd.id}" min="0" value="${vd.opts.linhaInicio || 0}">
          <span class="imp-range-sep">até</span>
          <input type="number" class="imp-num-inp" id="row-e-${vd.id}" min="0" value="${vd.opts.linhaFim !== undefined ? vd.opts.linhaFim : dados.length}">
          <span class="imp-range-hint">(de ${dados.length} total)</span>
        </div>
        <div class="imp-var-field imp-auto-type-row">
          <label><input type="checkbox" id="auto-t-${vd.id}"${vd.opts.tipoAuto !== false ? " checked" : ""}> Converter números automaticamente</label>
        </div>`;
    } else if (_file && _file.tipo === "json") {
      extra = `
        <div class="imp-var-field">
          <span class="imp-field-label">Caminho (ex: <code>data.items</code>):</span>
          <input type="text" class="imp-text-inp" id="jpath-${vd.id}" value="${esc(vd.opts.caminho || "")}" placeholder="deixe vazio para a raiz">
        </div>`;
    } else if (_file && _file.tipo === "txt") {
      extra = `
        <div class="imp-var-field">
          <span class="imp-field-label">Separador:</span>
          <input type="text" class="imp-text-inp imp-sep-inp" id="tsep-${vd.id}" value="${esc(vd.opts.separador || "\\n")}" placeholder="\\n">
        </div>`;
    }

    return `<div class="imp-var-card" id="vcard-${vd.id}">
  <div class="imp-var-head">
    <div class="imp-var-name-wrap">
      <span class="imp-field-label">Nome:</span>
      <input type="text" class="imp-text-inp imp-vname" id="vn-${vd.id}" value="${esc(vd.nome)}">
    </div>
    <button class="imp-rm-btn" onclick="impRemoveVar(${vd.id})" title="Remover">✕</button>
  </div>
  <div class="imp-var-field">
    <span class="imp-field-label">Tipo de dado:</span>
    <select class="imp-select" id="vt-${vd.id}">${tipoOpts}</select>
  </div>
  ${extra}
</div>`;
  }

  // ── Refresh UI ───────────────────────────────────────────────
  function refreshVarsPane() {
    const list = document.getElementById("imp-vars-list");
    if (!list) return;
    list.innerHTML =
      _vars.length === 0
        ? '<p class="imp-empty">Clique em "+ Nova variável" para começar.</p>'
        : _vars.map(buildVarCard).join("");

    _vars.forEach((vd) => {
      function on(id, ev, fn) {
        const el = document.getElementById(id);
        if (el) el.addEventListener(ev, fn);
      }
      on(`vn-${vd.id}`, "input", (e) => { vd.nome = e.target.value; refreshCode(); });
      on(`vt-${vd.id}`, "change", (e) => { vd.tipo = e.target.value; refreshCode(); });

      if (_file && _file.tipo === "csv" && _parsed) {
        document.querySelectorAll(`#cols-${vd.id} .imp-col-cb`).forEach((cb) => {
          cb.addEventListener("change", () => {
            vd.opts.colunas = [
              ...document.querySelectorAll(`#cols-${vd.id} .imp-col-cb:checked`),
            ].map((c) => c.value);
            refreshCode();
          });
        });
        on(`row-s-${vd.id}`, "input", (e) => {
          vd.opts.linhaInicio = parseInt(e.target.value) || 0;
          refreshCode();
        });
        on(`row-e-${vd.id}`, "input", (e) => {
          vd.opts.linhaFim =
            parseInt(e.target.value) || _parsed.dados.length;
          refreshCode();
        });
        on(`auto-t-${vd.id}`, "change", (e) => {
          vd.opts.tipoAuto = e.target.checked;
          refreshCode();
        });
      } else if (_file && _file.tipo === "json") {
        on(`jpath-${vd.id}`, "input", (e) => {
          vd.opts.caminho = e.target.value;
          refreshCode();
        });
      } else if (_file && _file.tipo === "txt") {
        on(`tsep-${vd.id}`, "input", (e) => {
          vd.opts.separador = e.target.value;
          refreshCode();
        });
      }
    });
    refreshCode();
  }

  function refreshCode() {
    const ta = document.getElementById("imp-code-out");
    if (!ta) return;
    if (!_file || _vars.length === 0) { ta.value = ""; return; }
    ta.value = _vars
      .map((vd) => genCode(vd))
      .filter(Boolean)
      .join("\n\n");
  }

  // ── File loading ─────────────────────────────────────────────
  function loadFile(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target.result;
      const nome = file.name;
      let tipo;
      if (nome.endsWith(".json")) tipo = "json";
      else if (nome.endsWith(".csv") || nome.endsWith(".tsv")) tipo = "csv";
      else tipo = "txt";

      _file = { nome, tipo, conteudo: content };
      _vars = [];
      _nextId = 1;

      // Show main content
      const main = document.getElementById("imp-main-content");
      const drop = document.getElementById("imp-drop");
      const fileMeta = document.getElementById("imp-file-meta");
      const preview = document.getElementById("imp-preview");

      if (fileMeta) {
        fileMeta.textContent = nome;
        document.getElementById("imp-file-badge").style.display = "inline-flex";
      }
      if (drop) drop.classList.add("imp-drop-mini");
      if (main) main.style.display = "";

      if (tipo === "csv") {
        const sep = nome.endsWith(".tsv") ? "\t" : ",";
        _parsed = parseCSV(content, sep);
        if (preview) preview.innerHTML = renderCSV(_parsed);
      } else if (tipo === "json") {
        try {
          _parsed = JSON.parse(content);
          if (preview) preview.innerHTML = renderJSON(_parsed);
        } catch (e) {
          _parsed = null;
          if (preview)
            preview.innerHTML = `<p class="imp-error">JSON inválido: ${esc(e.message)}</p>`;
        }
      } else {
        _parsed = content;
        if (preview) preview.innerHTML = renderTXT(content);
      }

      refreshVarsPane();
    };
    reader.readAsText(file, "UTF-8");
  }

  // ── Public actions (called by HTML) ─────────────────────────
  window.impAddVar = function () {
    if (!_file) return;
    const defTipo =
      _file.tipo === "json"
        ? "objeto"
        : _file.tipo === "txt"
        ? "lista"
        : "lista-mapas";
    _vars.push({ id: _nextId++, nome: `dados${_vars.length + 1}`, tipo: defTipo, opts: {} });
    refreshVarsPane();
  };

  window.impRemoveVar = function (id) {
    _vars = _vars.filter((v) => v.id !== id);
    refreshVarsPane();
  };

  window.impCopyCode = function () {
    const ta = document.getElementById("imp-code-out");
    if (!ta || !ta.value.trim()) return;
    navigator.clipboard.writeText(ta.value).then(() => {
      const btn = document.getElementById("imp-copy-btn");
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = "Copiado!";
        btn.disabled = true;
        setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 1800);
      }
    });
  };

  window.impNewFile = function () {
    _file = null; _parsed = null; _vars = [];
    const main = document.getElementById("imp-main-content");
    const drop = document.getElementById("imp-drop");
    const badge = document.getElementById("imp-file-badge");
    const fi = document.getElementById("imp-file-input");
    if (main) main.style.display = "none";
    if (drop) drop.classList.remove("imp-drop-mini");
    if (badge) badge.style.display = "none";
    if (fi) fi.value = "";
  };

  // ── Init ─────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    const drop  = document.getElementById("imp-drop");
    const input = document.getElementById("imp-file-input");

    if (drop) {
      drop.addEventListener("click", () => { if (input) input.click(); });
      drop.addEventListener("dragover",  (e) => { e.preventDefault(); drop.classList.add("imp-dragging"); });
      drop.addEventListener("dragleave", ()  => drop.classList.remove("imp-dragging"));
      drop.addEventListener("drop", (e) => {
        e.preventDefault();
        drop.classList.remove("imp-dragging");
        const f = e.dataTransfer.files[0];
        if (f) loadFile(f);
      });
    }
    if (input) {
      input.addEventListener("change", (e) => {
        const f = e.target.files[0];
        if (f) loadFile(f);
      });
    }
  });
})();
