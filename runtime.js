/* ============================================================
   PSEUDO-IDE — editor.js  v4.0 (com Depurador Visual)
   ============================================================ */
"use strict";

/* -------- DOM -------- */
const codeEditor = document.getElementById("code-editor");
const highlightLayer = document.getElementById("highlight-layer");
const errorLayer = document.getElementById("error-layer");
const warningLayer = document.getElementById("warning-layer");
const lineNumbers = document.getElementById("line-numbers");
const algoNameDisplay = document.getElementById("algo-name-display");
const tabFilename = document.getElementById("tab-filename");

/* -------- Estado de erro/warning no editor -------- */
window.linhaComErro = null;
window.marcarErroNoEditor = (l) => {
  window.linhaComErro = l;
  atualizarEditor();
};
window.limparErroNoEditor = () => {
  window.linhaComErro = null;
  atualizarEditor();
};

/* -------- Estado de Depuração -------- */
window.__emDepuracao = false;
window._resolveDebug = null;
window._linhaDebugAtual = null;

window.iniciarDepuracao = function () {
  window.__emDepuracao = true;
  document.getElementById("debug-panel").classList.remove("hidden");
  document.getElementById("code-editor").classList.add("debug-mode");
  executarCodigo(true); // Executa em modo debug passando a flag para o compiler
};

window.pararDepuracao = function () {
  window.__emDepuracao = false;
  if (window._resolveDebug) window._resolveDebug();
  document.getElementById("debug-panel").classList.add("hidden");
  document.getElementById("code-editor").classList.remove("debug-mode");
  window._linhaDebugAtual = null;
  atualizarEditor();
};

window.continuarDepuracao = function () {
  if (window._resolveDebug) window._resolveDebug();
};

window._dbg = async function (linha, vars) {
  if (!window.__emDepuracao) throw new Error("DEBUG_ABORT");

  window._linhaDebugAtual = linha;
  atualizarEditor();

  // Rola o editor para mostrar a linha atual
  const lh = parseFloat(getComputedStyle(codeEditor).lineHeight) || 22;
  codeEditor.scrollTop = Math.max(0, (linha - 5) * lh);

  // Renderiza as variáveis lidas da memória
  const painel = document.getElementById("debug-vars");
  painel.innerHTML = Object.entries(vars)
    .map(([k, v]) => {
      let valStr =
        v === undefined ? "indefinido" : v === null ? "vazio" : String(v);
      if (typeof v === "string") valStr = `"${valStr}"`;
      return `<div class="debug-var"><span class="debug-var-name">${k}</span><span class="debug-var-val">${esc(valStr)}</span></div>`;
    })
    .join("");

  // Pausa a execução esperando o clique no botão "Próximo"
  await new Promise((r) => (window._resolveDebug = r));
  if (!window.__emDepuracao) throw new Error("DEBUG_ABORT");
};

/* ============================================================
   UNDO / REDO CUSTOMIZADO
   ============================================================ */
const _UNDO_STACK = [];
const _REDO_STACK = [];
let _lastSnap = "";
let _snapTimer = null;
const _MAX_UNDO = 300;

function _pushSnap(imediato = false) {
  const val = codeEditor.value;
  if (val === _lastSnap) return;
  _UNDO_STACK.push({
    value: _lastSnap,
    ss: codeEditor.selectionStart,
    se: codeEditor.selectionEnd,
  });
  if (_UNDO_STACK.length > _MAX_UNDO) _UNDO_STACK.shift();
  _REDO_STACK.length = 0;
  _lastSnap = val;
}
function _scheduleSnap() {
  clearTimeout(_snapTimer);
  _snapTimer = setTimeout(() => _pushSnap(), 400);
}
function _undo() {
  _pushSnap();
  if (!_UNDO_STACK.length) return;
  const snap = _UNDO_STACK.pop();
  _REDO_STACK.push({
    value: codeEditor.value,
    ss: codeEditor.selectionStart,
    se: codeEditor.selectionEnd,
  });
  codeEditor.value = snap.value;
  codeEditor.selectionStart = snap.ss;
  codeEditor.selectionEnd = snap.se;
  _lastSnap = snap.value;
  if (window.linhaComErro) window.limparErroNoEditor();
  atualizarEditor();
}
function _redo() {
  if (!_REDO_STACK.length) return;
  const snap = _REDO_STACK.pop();
  _UNDO_STACK.push({
    value: codeEditor.value,
    ss: codeEditor.selectionStart,
    se: codeEditor.selectionEnd,
  });
  codeEditor.value = snap.value;
  codeEditor.selectionStart = snap.ss;
  codeEditor.selectionEnd = snap.se;
  _lastSnap = snap.value;
  if (window.linhaComErro) window.limparErroNoEditor();
  atualizarEditor();
}

/* ============================================================
   SYNTAX HIGHLIGHTING
   ============================================================ */
const KW_TYPE = new Set(["inteiro", "real", "caracter", "booleano", "super"]);
const KW_CTRL = new Set([
  "se",
  "senao",
  "enquanto",
  "faca",
  "para",
  "tentar",
  "capturar",
  "funcao",
  "retorno",
  "quebrar",
  "continuar",
  "escolha",
  "caso",
  "padrao",
  "lançar",
  "erro",
]);
const KW_VAL = new Set([
  "verdadeiro",
  "falso",
  "vazio",
  "indefinido",
  "Infinito",
  "NegInfinito",
]);
const KW_OP = new Set(["e", "ou", "nao", "mod", "em", "na", "no"]);
const KW_IMPORT = new Set(["importar", "como"]);
const KW_FN = new Set([
  "imprima",
  "leia",
  "raiz",
  "expo",
  "abs",
  "arred",
  "piso",
  "teto",
  "max",
  "min",
  "sen",
  "cos",
  "tan",
  "arcsen",
  "arccos",
  "arctan",
  "arctan2",
  "senh",
  "cosh",
  "tanh",
  "arcsenh",
  "arccosh",
  "arctanh",
  "hipot",
  "truncar",
  "grauParaRad",
  "radParaGrau",
  "ln",
  "log2",
  "log10",
  "log",
  "aleatorio",
  "somatorio",
  "produtorio",
  "separador",
  "tabela",
  "progresso",
  "tabelaVerdade",
  "caracter",
  "lista",
  "mapa",
  "conjunto",
  "numero",
  "vetor",
  "matriz",
  "sinal",
  "int",
  "re",
  "decimal",
  "fatorar",
  "adicionar",
  "remover",
  "obter",
  "tamanho",
  "ordenar",
  "contem",
  "maiusculo",
  "minusculo",
  "capitalizar",
  "inverter",
  "aparar",
  "mesclar",
  "uniao",
  "intersecao",
  "diferenca",
  "tem",
  "definir",
  "dimensao",
  "soma",
  "subtrair",
  "escalar",
  "ponto",
  "norma",
  "normalizar",
  "transposta",
  "mult",
  "limite",
  "derivada",
  "integral",
  "fatorial",
  "combinacao",
  "arranjo",
  "media",
  "mediana",
  "moda",
  "variancia",
  "desvioPadrao",
  "agora",
  "milisegundos",
  "medirExecucao",
  "testeStress",
  "plotar",
  "funcao",
  "dispersao",
  "superficie3D",
  "sortearComPesos",
  "uniforme",
  "rolarDados",
  "monteCarlo",
  "intervalo",
  // metodos — verificadores de tipo
  "eNumero",
  "eInteiro",
  "eReal",
  "eTexto",
  "eBooleano",
  "eLista",
  "eMapa",
  "eConjunto",
  "eVetor",
  "eMatriz",
  "eVazio",
  "eIndefinido",
  // algebra — vetorial e matricial
  "vetorial",
  "angulo",
  "anguloDeg",
  "projecao",
  "saoParalelos",
  "saoOrtogonais",
  "identidade",
  "zeros",
  "determinante",
  "traco",
  "inversa",
  "resolverSistema",
  // algebra — geometria analítica
  "distancia",
  "pontoMedio",
  "equacaoReta",
  "distPontoReta",
  "intersecaoRetas",
  "areaTriangulo",
  "perimetroTriangulo",
  "areaCirculo",
  "perimetroCirculo",
  "pontoCirculo",
  "equacaoPlano",
  "distPontoPlano",
  "saoColineares",
  "saoCoplanares",
]);

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function kwClass(word) {
  if (KW_TYPE.has(word))   return `<span class="t-type">${esc(word)}</span>`;
  if (KW_CTRL.has(word))   return `<span class="t-ctrl">${esc(word)}</span>`;
  if (KW_VAL.has(word))    return `<span class="t-val">${esc(word)}</span>`;
  if (KW_OP.has(word))     return `<span class="t-op">${esc(word)}</span>`;
  if (KW_IMPORT.has(word)) return `<span class="t-import">${esc(word)}</span>`;
  if (KW_FN.has(word))     return `<span class="t-fn">${esc(word)}</span>`;
  if (window._userFnSet  && window._userFnSet.has(word))  return `<span class="t-user-fn">${esc(word)}</span>`;
  if (window._userVarSet && window._userVarSet.has(word)) return `<span class="t-user-var">${esc(word)}</span>`;
  return esc(word);
}

function aplicarHighlight(texto) {
  const cpStr = typeof window.cpInjetarSwatches === "function"
    ? window.cpInjetarSwatches : esc;
  let html = "",
    i = 0,
    len = texto.length;
  while (i < len) {
    const ch = texto[i];
    if (ch === "@") {
      const mm = texto
        .slice(i)
        .match(/^@(NOME|AUTOR|DESC|VERSAO|BIBLIOTECA)\[([^\]]*)\]/);
      if (mm) {
        html += `<span class="t-marker">@${mm[1]}</span><span class="t-marker-bracket">[</span><span class="t-marker-val">${esc(mm[2])}</span><span class="t-marker-bracket">]</span>`;
        i += mm[0].length;
        continue;
      }
    }
    if (ch === "/" && texto[i + 1] === "*") {
      let cmt = "";
      while (i < len) {
        cmt += texto[i];
        if (texto[i] === "*" && texto[i + 1] === "/") {
          cmt += texto[i + 1];
          i += 2;
          break;
        }
        i++;
      }
      const lines = cmt.split("\n");
      html += lines
        .map(
          (l, idx) =>
            `<span class="t-cmt">${esc(l)}</span>${idx < lines.length - 1 ? "\n" : ""}`,
        )
        .join("");
      continue;
    }
    if (ch === "/" && texto[i + 1] === "/") {
      let cmt = "";
      while (i < len && texto[i] !== "\n") cmt += texto[i++];
      html += `<span class="t-cmt">${esc(cmt)}</span>`;
      continue;
    }
    if (
      ch === "f" &&
      i + 1 < len &&
      (texto[i + 1] === '"' || texto[i + 1] === "'")
    ) {
      const q = texto[i + 1];
      let s = "f" + q;
      i += 2;
      while (i < len && texto[i] !== q) {
        if (texto[i] === "\\") {
          s += texto[i] + (texto[i + 1] || "");
          i += 2;
        } else s += texto[i++];
      }
      s += texto[i] || "";
      i++;
      html += `<span class="t-str">${cpStr(s)}</span>`;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let s = ch;
      i++;
      while (i < len && texto[i] !== ch) {
        if (texto[i] === "\\") {
          s += texto[i] + (texto[i + 1] || "");
          i += 2;
        } else s += texto[i++];
      }
      s += texto[i] || "";
      i++;
      html += `<span class="t-str">${cpStr(s)}</span>`;
      continue;
    }
    if (ch === "`") {
      let s = "`";
      i++;
      while (i < len && texto[i] !== "`") {
        if (texto[i] === "\\") {
          s += texto[i] + (texto[i + 1] || "");
          i += 2;
        } else s += texto[i++];
      }
      s += texto[i] || "";
      i++;
      html += `<span class="t-str">${cpStr(s)}</span>`;
      continue;
    }
    if (/[A-Za-zÀ-ÖØ-öø-ÿ_]/.test(ch)) {
      let w = "";
      while (i < len && /[A-Za-zÀ-ÖØ-öø-ÿ0-9_]/.test(texto[i])) w += texto[i++];
      html += kwClass(w);
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(texto[i + 1] || ""))) {
      let n = "";
      while (i < len && /[0-9.eE+\-]/.test(texto[i])) {
        if (
          (texto[i] === "-" || texto[i] === "+") &&
          !["e", "E"].includes(n[n.length - 1])
        )
          break;
        n += texto[i++];
      }
      html += `<span class="t-num">${esc(n)}</span>`;
      continue;
    }
    html += esc(ch);
    i++;
  }
  return html;
}

/* ============================================================
   LINTER ESTÁTICO (warning layer)
   ============================================================ */
const _LINTER_RULES = [
  {
    re: /=\s*\{[^}]*\}/,
    test: (linha) =>
      /=\s*\{/.test(linha) &&
      !/\b(funcao|se|senao|enquanto|para|faca|tentar|capturar|escolha)\b/.test(
        linha,
      ),
    msg: "Objeto JS literal detectado. Use m.mapa() da biblioteca metodos para criar dicionários na Pseudo-IDE.",
  },
  {
    test: (linha) =>
      /\b(var|const)\s+/.test(linha) && !linha.trimStart().startsWith("//"),
    msg: "Palavra-chave JS nativa detectada. Use os tipos da Pseudo-IDE: inteiro, real, caracter, booleano ou super.",
  },
  {
    test: (linha) => /\bnew\s+(Map|Set|Array|Object)\b/.test(linha),
    msg: "Construtor JS nativo detectado. Use as funções da biblioteca metodos: m.mapa(), m.conjunto(), m.lista(), etc.",
  },
];

let _linterWarnings = new Map();

function executarLinter(texto) {
  const warnings = new Map();
  texto.split("\n").forEach((linha, idx) => {
    if (linha.trimStart().startsWith("//")) return;
    for (const rule of _LINTER_RULES) {
      if (rule.test(linha)) {
        warnings.set(idx + 1, rule.msg);
        break;
      }
    }
  });
  return warnings;
}

/* ============================================================
   FOLD
   ============================================================ */
const foldState = new Map();

function encontrarFechamento(linhas, idx) {
  let depth = 0;
  for (let i = idx; i < linhas.length; i++) {
    for (const ch of linhas[i]) {
      if (ch === "{") depth++;
      if (ch === "}") depth--;
    }
    if (depth === 0) return i;
  }
  return -1;
}

function toggleFold(lineIdx) {
  const val = codeEditor.value,
    linhas = val.split("\n");
  if (lineIdx >= linhas.length) return;
  if (foldState.has(lineIdx)) {
    const state = foldState.get(lineIdx);
    foldState.delete(lineIdx);
    linhas.splice(lineIdx, 1, ...state.content);
  } else {
    const fim = encontrarFechamento(linhas, lineIdx);
    if (fim <= lineIdx) return;
    const bloco = linhas.slice(lineIdx, fim + 1);
    foldState.set(lineIdx, { content: bloco });
    linhas.splice(lineIdx, bloco.length, linhas[lineIdx].trimEnd() + " { … }");
  }
  const pos = codeEditor.selectionStart;
  codeEditor.value = linhas.join("\n");
  codeEditor.selectionStart = codeEditor.selectionEnd = Math.min(
    pos,
    codeEditor.value.length,
  );
  atualizarEditor();
}

/* ============================================================
   ATUALIZAR EDITOR
   ============================================================ */
function atualizarEditor() {
  const texto = codeEditor.value;
  const linhas = texto.split("\n");
  _linterWarnings = executarLinter(texto);

  /* Números de linha e injeção de classes de erro/debug */
  lineNumbers.innerHTML = linhas
    .map((linha, idx) => {
      const temAbertura =
        /\{/.test(linha) && !/\}/.test(linha.replace(/.*\{/, ""));
      const isFolded = foldState.has(idx);
      const hasContent = temAbertura || isFolded;

      // Verifica as variáveis de estado de erro e debug perfeitamente
      const isErr = idx + 1 === window.linhaComErro;
      const isDbg = idx + 1 === window._linhaDebugAtual;
      const warnMsg = _linterWarnings.get(idx + 1);

      const arrow = hasContent
        ? `<span class="fold-arrow ${isFolded ? "folded" : ""}" data-line="${idx}">${isFolded ? "▶" : "▼"}</span>`
        : "";

      const cls = [
        isErr ? "has-error" : "",
        warnMsg ? "has-warning" : "",
        isDbg ? "debug-active" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const ttl = warnMsg
        ? ` title="${warnMsg.replace(/"/g, "'")}"`
        : isErr
          ? ' title="Linha com erro"'
          : "";
      return `<div class="ln-row ${cls}"${ttl}>${arrow}<span class="ln-num">${idx + 1}</span></div>`;
    })
    .join("");

  lineNumbers.querySelectorAll(".fold-arrow").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFold(+el.dataset.line);
    });
  });

  /* Highlight */
  const textoHL = texto.endsWith("\n") ? texto + " " : texto;
  highlightLayer.innerHTML = aplicarHighlight(textoHL);
  highlightLayer.scrollLeft = codeEditor.scrollLeft;
  highlightLayer.scrollTop = codeEditor.scrollTop;

  /* Error layer */
  if (errorLayer) {
    if (window.linhaComErro) {
      errorLayer.innerHTML = linhas
        .map((l, idx) => {
          if (idx + 1 === window.linhaComErro) {
            const t = l.trim() === "" ? " " : l;
            return `<span class="error-squiggle">${esc(t)}</span>`;
          }
          return "";
        })
        .join("\n");
    } else {
      errorLayer.innerHTML = "";
    }
    errorLayer.scrollLeft = codeEditor.scrollLeft;
    errorLayer.scrollTop = codeEditor.scrollTop;
  }

  /* Warning layer */
  if (warningLayer) {
    if (_linterWarnings.size > 0) {
      warningLayer.innerHTML = linhas
        .map((l, idx) => {
          if (_linterWarnings.has(idx + 1)) {
            const t = l.trim() === "" ? " " : l;
            return `<span class="warning-squiggle">${esc(t)}</span>`;
          }
          return "";
        })
        .join("\n");
    } else {
      warningLayer.innerHTML = "";
    }
    warningLayer.scrollLeft = codeEditor.scrollLeft;
    warningLayer.scrollTop = codeEditor.scrollTop;
  }

  /* Metadados */
  atualizarMetadados(texto);

  /* Título */
  const firstLine = linhas[0] || "";
  const nomeAlgo = firstLine.replace(/\(.*$/, "").trim();
  if (nomeAlgo) {
    document.title = nomeAlgo + " — Pseudo-IDE";
    algoNameDisplay.textContent = nomeAlgo;
    if (tabFilename) tabFilename.textContent = nomeAlgo + ".pseudo";
  } else {
    document.title = "Pseudo-IDE";
    algoNameDisplay.textContent = "sem título";
    if (tabFilename) tabFilename.textContent = "algoritmo.pseudo";
  }
}

codeEditor.addEventListener("scroll", () => {
  highlightLayer.scrollTop = codeEditor.scrollTop;
  highlightLayer.scrollLeft = codeEditor.scrollLeft;
  if (errorLayer) {
    errorLayer.scrollTop = codeEditor.scrollTop;
    errorLayer.scrollLeft = codeEditor.scrollLeft;
  }
  if (warningLayer) {
    warningLayer.scrollTop = codeEditor.scrollTop;
    warningLayer.scrollLeft = codeEditor.scrollLeft;
  }
  lineNumbers.scrollTop = codeEditor.scrollTop;
});

/* ============================================================
   AUTOCOMPLETE
   ============================================================ */
const BASE_COMPLETIONS = [
  { label: "inteiro", detail: "tipo — número inteiro" },
  { label: "real", detail: "tipo — número decimal" },
  { label: "caracter", detail: "tipo — texto/string" },
  { label: "booleano", detail: "tipo — verdadeiro/falso" },
  { label: "super", detail: "tipo universal — aceita qualquer valor" },
  { label: "verdadeiro", detail: "booleano" },
  { label: "falso", detail: "booleano" },
  { label: "vazio", detail: "null — ausência de valor" },
  { label: "indefinido", detail: "undefined — sem valor atribuído" },
  { label: "Infinito", detail: "+∞" },
  { label: "NegInfinito", detail: "−∞" },
  { label: "se", detail: "condicional" },
  { label: "senao", detail: "condicional" },
  { label: "enquanto", detail: "laço while" },
  { label: "faca", detail: "laço do-while" },
  { label: "para", detail: "laço for / for-of" },
  { label: "em", detail: "para (x em lista) — for-of" },
  { label: "funcao", detail: "definição de função" },
  { label: "retorno", detail: "return — retorna valor" },
  { label: "quebrar", detail: "break — sai do laço" },
  { label: "continuar", detail: "continue — pula iteração" },
  { label: "escolha", detail: "switch" },
  { label: "caso", detail: "case" },
  { label: "padrao", detail: "default" },
  { label: "tentar", detail: "try — tenta executar" },
  { label: "capturar", detail: "catch — captura exceção" },
  { label: "lançar", detail: "throw — lança exceção" },
  { label: "importar", detail: "importar biblioteca" },
  { label: "como", detail: "alias de importação" },
  { label: "mod", detail: "operador — resto da divisão" },
  { label: "intervalo(fim)", detail: "lista [0, 1, …, fim-1]", insert: "intervalo(" },
  { label: "intervalo(inicio, fim)", detail: "lista de inicio até fim-1", insert: "intervalo(" },
  { label: "intervalo(inicio, fim, passo)", detail: "lista com passo personalizado", insert: "intervalo(" },
  { label: "imprima()", detail: "saída no console", insert: "imprima(" },
  { label: "leia()", detail: "entrada do usuário", insert: "leia(" },
  { label: "raiz()", detail: "raiz quadrada nativa", insert: "raiz(" },
  { label: "expo()", detail: "potência nativa", insert: "expo(" },
  {
    label: "importar mat como m",
    detail: "snippet",
    insert: "importar mat como m;\n",
  },
  {
    label: "importar metodos como m",
    detail: "snippet",
    insert: "importar metodos como m;\n",
  },
  {
    label: "importar tabular como t",
    detail: "snippet",
    insert: "importar tabular como t;\n",
  },
  {
    label: "importar calculo como c",
    detail: "snippet",
    insert: "importar calculo como c;\n",
  },
  {
    label: "importar estatistica como e",
    detail: "snippet",
    insert: "importar estatistica como e;\n",
  },
  {
    label: "importar tempo como tp",
    detail: "snippet",
    insert: "importar tempo como tp;\n",
  },
  {
    label: "importar graficos como g",
    detail: "snippet",
    insert: "importar graficos como g;\n",
  },
  {
    label: "importar probabilidade como p",
    detail: "snippet",
    insert: "importar probabilidade como p;\n",
  },
  {
    label: "importar metodos.lista como li",
    detail: "snippet — importação modular",
    insert: "importar metodos.lista como li;\n",
  },
  {
    label: "importar metodos.mapa como mp",
    detail: "snippet — importação modular",
    insert: "importar metodos.mapa como mp;\n",
  },
  { label: "se (...) { }", detail: "snippet", insert: "se () {\n    \n}" },
  {
    label: "se/senao completo",
    detail: "snippet",
    insert: "se () {\n    \n} senao {\n    \n}",
  },
  {
    label: "senao se (...)",
    detail: "snippet",
    insert: "senao se () {\n    \n}",
  },
  {
    label: "enquanto (...)",
    detail: "snippet",
    insert: "enquanto () {\n    \n}",
  },
  {
    label: "faca { } enquanto",
    detail: "snippet",
    insert: "faca {\n    \n} enquanto ();",
  },
  {
    label: "para (;;) { }",
    detail: "snippet — laço clássico",
    insert: "para (inteiro i = 0; i < ; i++) {\n    \n}",
  },
  {
    label: "para (i em lista)",
    detail: "snippet — for-of",
    insert: "para (i em ) {\n    \n}",
  },
  {
    label: "funcao nome() { }",
    detail: "snippet — função simples",
    insert: "funcao nome() {\n    retorno\n}",
  },
  {
    label: "funcao tipada",
    detail: "snippet — com validação de tipo",
    insert: "funcao nome(inteiro(n > 0)) {\n    retorno n\n}",
  },
  {
    label: "tentar { } capturar",
    detail: "snippet",
    insert:
      "tentar {\n    \n} capturar (erro) {\n    imprima(erro.message);\n}",
  },
  {
    label: "lançar erro()",
    detail: "snippet — exceção estruturada",
    insert:
      'lançar erro("TypeError", "Descrição do erro", valorRecebido, valorEsperado)',
  },
  {
    label: 'lançar erro ""',
    detail: "snippet — exceção simples",
    insert: 'lançar erro "Mensagem de erro"',
  },
  {
    label: "escolha/caso",
    detail: "snippet",
    insert:
      "escolha (variavel) {\n    caso 1:\n        \n        quebrar;\n    caso 2:\n        \n        quebrar;\n    padrao:\n        \n}",
  },
  {
    label: "algoritmo wrapper",
    detail: "snippet — estrutura base",
    insert: "meuAlgoritmo()\n{\n    // Código aqui\n}",
  },
  {
    label: "busca linear",
    detail: "snippet — algoritmo",
    insert:
      "funcao buscaLinear(lista, alvo) {\n    para (inteiro i = 0; i < lista.tamanho(); i++) {\n        se (lista.obter(i) == alvo) { retorno i; }\n    }\n    retorno -1;\n}",
  },
  {
    label: "fatorial recursivo",
    detail: "snippet — recursão",
    insert:
      "funcao fatorial(inteiro(n >= 0)) {\n    se (n <= 1) { retorno 1; }\n    retorno n * fatorial(n - 1);\n}",
  },
  {
    label: "fibonacci",
    detail: "snippet — sequência",
    insert:
      "funcao fib(inteiro(n >= 0)) {\n    se (n <= 1) { retorno n; }\n    retorno fib(n - 1) + fib(n - 2);\n}",
  },
  {
    label: "mdc (Euclides)",
    detail: "snippet — algoritmo",
    insert:
      "funcao mdc(inteiro(a > 0), inteiro(b > 0)) {\n    enquanto (b != 0) {\n        inteiro r = a mod b;\n        a = b;\n        b = r;\n    }\n    retorno a;\n}",
  },
  {
    label: "monte carlo π",
    detail: "snippet — simulação",
    insert:
      'importar probabilidade como p;\ninteiro N = 100000;\nreal pi_est = p.monteCarlo(\n    (x) => {\n        real y = p.uniforme(0, 1);\n        retorno x*x + y*y <= 1;\n    },\n    N\n) * 4;\nimprima(f"π ≈ {pi_est}");\n',
  },
  {
    label: "stress test",
    detail: "snippet — benchmark",
    insert:
      "importar tempo como tp;\nfuncao minhaFuncao(n) {\n    // implementação O(?)\n    retorno n;\n}\ntp.testeStress(minhaFuncao, 1000000);\n",
  },
];  // end BASE_COMPLETIONS

/* Definições por biblioteca — completions contextuais */
const LIB_METHODS = {
  mat: {
    props: [
      { name: "pi", detail: "π" }, { name: "e", detail: "e de Euler" },
      { name: "Infinito", detail: "+∞" }, { name: "NegInfinito", detail: "−∞" },
    ],
    methods: [
      { name: "abs",        args: ["x"],                 detail: "valor absoluto" },
      { name: "arred",      args: ["x","casas?"],        detail: "arredondamento" },
      { name: "piso",       args: ["x"],                 detail: "floor" },
      { name: "teto",       args: ["x"],                 detail: "ceil" },
      { name: "max",        args: ["a","b"],             detail: "máximo" },
      { name: "min",        args: ["a","b"],             detail: "mínimo" },
      { name: "sen",        args: ["x"],                 detail: "seno (rad)" },
      { name: "cos",        args: ["x"],                 detail: "cosseno (rad)" },
      { name: "tan",        args: ["x"],                 detail: "tangente (rad)" },
      { name: "arcsen",     args: ["x"],                 detail: "arcosseno" },
      { name: "arccos",     args: ["x"],                 detail: "arcocosseno" },
      { name: "arctan",     args: ["x"],                 detail: "arcotangente" },
      { name: "arctan2",    args: ["y","x"],             detail: "atan2(y,x)" },
      { name: "hipot",      args: ["a","b"],             detail: "√(a²+b²)" },
      { name: "senh",       args: ["x"],                 detail: "seno hiperbólico" },
      { name: "cosh",       args: ["x"],                 detail: "cosseno hiperbólico" },
      { name: "tanh",       args: ["x"],                 detail: "tang. hiperbólica" },
      { name: "ln",         args: ["x"],                 detail: "log natural" },
      { name: "log2",       args: ["x"],                 detail: "log base 2" },
      { name: "log10",      args: ["x"],                 detail: "log base 10" },
      { name: "log",        args: ["x","base"],          detail: "log qualquer base" },
      { name: "truncar",    args: ["x","casas?"],        detail: "trunca decimais" },
      { name: "grauParaRad",args: ["graus"],             detail: "graus→rad" },
      { name: "radParaGrau",args: ["rad"],               detail: "rad→graus" },
      { name: "aleatorio",  args: ["min","max"],         detail: "int aleatório" },
      { name: "somatorio",  args: ["fn","ini","fim"],    detail: "Σ fn(i)" },
      { name: "produtorio", args: ["fn","ini","fim"],    detail: "Π fn(i)" },
      { name: "sinal",      args: ["x"],                 detail: "−1, 0 ou 1" },
      { name: "linspace",   args: ["ini","fim","n"],     detail: "n pts espaçados" },
    ],
  },
  metodos: {
    props: [],
    methods: [
      { name: "lista",      args: ["...items?"],  detail: "lista dinâmica" },
      { name: "mapa",       args: [],             detail: "dicionário" },
      { name: "conjunto",   args: [],             detail: "conjunto único" },
      { name: "numero",     args: ["valor"],      detail: "objeto numérico" },
      { name: "caracter",   args: ["texto"],      detail: "objeto texto" },
      { name: "vetor",      args: ["...vals"],    detail: "vetor matemático" },
      { name: "matriz",     args: ["linhas"],     detail: "matriz 2D" },
      { name: "eNumero",    args: ["v"],          detail: "v é número?" },
      { name: "eInteiro",   args: ["v"],          detail: "v é inteiro?" },
      { name: "eReal",      args: ["v"],          detail: "v é real?" },
      { name: "eTexto",     args: ["v"],          detail: "v é texto?" },
      { name: "eBooleano",  args: ["v"],          detail: "v é booleano?" },
      { name: "eLista",     args: ["v"],          detail: "v é lista?" },
      { name: "eMapa",      args: ["v"],          detail: "v é mapa?" },
      { name: "eConjunto",  args: ["v"],          detail: "v é conjunto?" },
      { name: "eVetor",     args: ["v"],          detail: "v é vetor?" },
      { name: "eMatriz",    args: ["v"],          detail: "v é matriz?" },
      { name: "eVazio",     args: ["v"],          detail: "v é vazio?" },
      { name: "eIndefinido",args: ["v"],          detail: "v é indefinido?" },
    ],
  },
  calculo: {
    props: [],
    methods: [
      { name: "limite",    args: ["fn","ponto"],          detail: "lim x→p f(x)" },
      { name: "derivada",  args: ["fn","ponto","ordem?"], detail: "f'(x) ordem n" },
      { name: "integral",  args: ["fn","a","b"],          detail: "∫f dx em [a,b]" },
      { name: "gamma",     args: ["x"],                   detail: "Γ(x)" },
      { name: "digamma",   args: ["x"],                   detail: "ψ(x)" },
      { name: "zeta",      args: ["s"],                   detail: "ζ(s)" },
      { name: "phi",       args: ["n"],                   detail: "φ(n) totiente" },
      { name: "lambertW",  args: ["x"],                   detail: "W(x)" },
      { name: "taylor",    args: ["fn","a","x","n"],      detail: "série de Taylor" },
    ],
  },
  estatistica: {
    props: [],
    methods: [
      { name: "fatorial",     args: ["n"],     detail: "n!" },
      { name: "combinacao",   args: ["n","k"], detail: "C(n,k)" },
      { name: "arranjo",      args: ["n","k"], detail: "A(n,k)" },
      { name: "media",        args: ["lista"], detail: "média aritmética" },
      { name: "mediana",      args: ["lista"], detail: "mediana" },
      { name: "moda",         args: ["lista"], detail: "moda" },
      { name: "variancia",    args: ["lista"], detail: "variância σ²" },
      { name: "desvioPadrao", args: ["lista"], detail: "desvio padrão σ" },
    ],
  },
  tabular: {
    props: [],
    methods: [
      { name: "tabela",        args: ["dados","opcoes?"],                       detail: "tabela HTML" },
      { name: "separador",     args: [],                                         detail: "linha divisória" },
      { name: "progresso",     args: ["valor","max"],                            detail: "barra de progresso" },
      { name: "tabelaVerdade", args: ["exprs","vars","mostrarInter?"],           detail: "tabela-verdade" },
    ],
  },
  graficos: {
    props: [],
    methods: [
      { name: "plotar",          args: ["dados","config?"],             detail: "plota dados ou função" },
      { name: "plotarFuncao",    args: ["fn","intervalo?","opcoes?"],   detail: "plota uma função" },
      { name: "plotarMultiplas", args: ["fns","intervalo?","opcoes?"],  detail: "várias funções" },
      { name: "dispersao",       args: ["pontos","opcoes?"],            detail: "gráfico de dispersão" },
      { name: "superficie3D",    args: ["fn","opcoes?"],                detail: "superfície 3D" },
      { name: "grafico",         args: ["funcoes","opcoes?"],           detail: "gráfico composto" },
      { name: "pontos",          args: ["lista","opcoes?"],             detail: "lista de pontos" },
      { name: "conica",          args: ["A","B","C","D","E","F"],       detail: "cônica Ax²+…" },
      { name: "relacao",         args: ["rel","opcoes?"],               detail: "relação implícita" },
      { name: "anotado",         args: ["f","marcadores","opcoes?"],    detail: "função com marcadores" },
    ],
  },
  "graficos.interativo": {
    props: [],
    methods: [
      { name: "plotar",  args: ["dado","opcoes?"],    detail: "curva/pontos interativos" },
      { name: "serie",   args: ["fn","opcoes?"],      detail: "série discreta" },
      { name: "grafico", args: ["plotaveis","cfg?"],  detail: "canvas 2D pan/zoom" },
    ],
  },
  algebra: {
    props: [],
    methods: [
      { name: "vetor",              args: ["componentes"],  detail: "cria vetor" },
      { name: "matriz",             args: ["linhas"],       detail: "cria matriz" },
      { name: "soma",               args: ["a","b"],        detail: "soma" },
      { name: "subtrair",           args: ["a","b"],        detail: "subtrai" },
      { name: "escalar",            args: ["k","v"],        detail: "escalar k·v" },
      { name: "ponto",              args: ["a","b"],        detail: "produto escalar ⟨a,b⟩" },
      { name: "vetorial",           args: ["a","b"],        detail: "produto vetorial 3D" },
      { name: "norma",              args: ["v"],            detail: "‖v‖" },
      { name: "normalizar",         args: ["v"],            detail: "vetor unitário" },
      { name: "transposta",         args: ["m"],            detail: "Mᵀ" },
      { name: "determinante",       args: ["m"],            detail: "det(A)" },
      { name: "inversa",            args: ["m"],            detail: "A⁻¹" },
      { name: "resolverSistema",    args: ["A","b"],        detail: "Ax=b" },
      { name: "distancia",          args: ["p1","p2"],      detail: "dist. euclidiana" },
      { name: "angulo",             args: ["a","b"],        detail: "ângulo (rad)" },
      { name: "anguloDeg",          args: ["a","b"],        detail: "ângulo (°)" },
      { name: "pontoMedio",         args: ["p1","p2"],      detail: "ponto médio" },
      { name: "projecao",           args: ["v","u"],        detail: "proj v→u" },
      { name: "saoParalelos",       args: ["v","u"],        detail: "v ∥ u?" },
      { name: "saoOrtogonais",      args: ["v","u"],        detail: "v ⊥ u?" },
      { name: "identidade",         args: ["n"],            detail: "I n×n" },
      { name: "zeros",              args: ["m","n?"],       detail: "matriz zeros" },
      { name: "traco",              args: ["m"],            detail: "tr(A)" },
      { name: "linspace",           args: ["ini","fim","n"],detail: "n pontos" },
      { name: "distPontoReta",      args: ["P","A","B"],    detail: "dist ponto→reta" },
      { name: "intersecaoRetas",    args: ["A","B","C","D"],detail: "interseção AB∩CD" },
      { name: "areaTriangulo",      args: ["A","B","C"],    detail: "área triângulo" },
      { name: "perimetroTriangulo", args: ["A","B","C"],    detail: "perímetro triângulo" },
      { name: "areaCirculo",        args: ["r"],            detail: "π·r²" },
      { name: "perimetroCirculo",   args: ["r"],            detail: "2·π·r" },
      { name: "equacaoReta",        args: ["A","B"],        detail: "ax+by+c=0" },
      { name: "equacaoPlano",       args: ["A","B","C"],    detail: "ax+by+cz+d=0" },
      { name: "distPontoPlano",     args: ["P","plano"],    detail: "dist ponto→plano" },
      { name: "saoColineares",      args: ["A","B","C"],    detail: "colineares?" },
      { name: "saoCoplanares",      args: ["A","B","C","D"],detail: "coplanares?" },
      { name: "pontoCirculo",       args: ["cx","cy","r","theta"], detail: "ponto na circunf." },
    ],
  },
  latex: {
    props: [],
    methods: [
      { name: "linha",             args: ["tex"],           detail: "LaTeX inline" },
      { name: "bloco",             args: ["...tex"],        detail: "LaTeX display" },
      { name: "converterParaLatex",args: ["fn"],            detail: "fn → TeX renderizado" },
      { name: "texString",         args: ["fn"],            detail: "fn → string TeX" },
    ],
  },
  tempo: {
    props: [],
    methods: [
      { name: "agora",         args: [],              detail: "timestamp em ms" },
      { name: "milisegundos",  args: [],              detail: "ms desde epoch" },
      { name: "medirExecucao", args: ["fn"],          detail: "cronometra função" },
      { name: "testeStress",   args: ["fn","n?"],     detail: "stress test N iter." },
    ],
  },
  probabilidade: {
    props: [],
    methods: [
      { name: "sortearComPesos",  args: ["itens","pesos"],   detail: "sorteia com pesos" },
      { name: "uniforme",         args: ["a","b"],            detail: "real uniforme [a,b]" },
      { name: "aleatorioInteiro", args: ["min","max"],        detail: "int em [min,max]" },
      { name: "rolarDados",       args: ["qtd","faces"],      detail: "simula dados" },
      { name: "monteCarlo",       args: ["fn","n"],           detail: "Monte Carlo" },
      { name: "intervalo",        args: ["dados","conf?"],    detail: "int. de confiança" },
    ],
  },
  arquivos: {
    props: [],
    methods: [
      { name: "lerCSV",          args: ["opcoes?"],  detail: "CSV → lista de mapas" },
      { name: "lerJSON",         args: ["opcoes?"],  detail: "JSON → objeto" },
      { name: "lerTXT",          args: ["opcoes?"],  detail: "TXT → lista de linhas" },
      { name: "lerPDADOS",       args: ["opcoes?"],  detail: ".pdados nativo" },
      { name: "abrirImportador", args: [],           detail: "tela de importação" },
    ],
  },
};

/* Extrai alias→libName das importações */
function _parseImports(texto) {
  const imports = {};
  const re = /\bimportar\s+([\w.]+)\s+como\s+([A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_]*)/g;
  let m;
  while ((m = re.exec(texto)) !== null) imports[m[2]] = m[1];
  return imports;
}

/* Gera completions usando os aliases reais do código */
function _buildLibCompletions(imports) {
  const items = [];
  for (const [alias, libName] of Object.entries(imports)) {
    const lib = LIB_METHODS[libName];
    if (!lib) continue;
    lib.props.forEach((p) =>
      items.push({ label: `${alias}.${p.name}`, detail: `${libName} — ${p.detail}`, insert: `${alias}.${p.name}` })
    );
    lib.methods.forEach((md) =>
      items.push({ label: `${alias}.${md.name}()`, detail: `${libName} — ${md.detail}`, insert: `${alias}.${md.name}(` })
    );
  }
  return items;
}

/* Gera mapa "alias.metodo" → [params] para o balão de assinatura */
function _buildLibSignatures(imports) {
  const sigs = {};
  for (const [alias, libName] of Object.entries(imports)) {
    const lib = LIB_METHODS[libName];
    if (!lib) continue;
    lib.methods.forEach((md) => { sigs[`${alias}.${md.name}`] = md.args; });
  }
  return sigs;
}

/* Token contextual antes do cursor: alias.metodo, alias.sub.metodo ou palavra simples */
function getContextBefore(pos) {
  const text = codeEditor.value.slice(0, pos);
  let m = text.match(/[A-Za-zÀ-ÖØ-öø-ÿ_]\w*\.[A-Za-zÀ-ÖØ-öø-ÿ_]\w*\.([A-Za-zÀ-ÖØ-öø-ÿ_]\w*)?$/);
  if (m) return { full: m[0], replaceLen: m[0].length };
  m = text.match(/[A-Za-zÀ-ÖØ-öø-ÿ_]\w*\.([A-Za-zÀ-ÖØ-öø-ÿ_]\w*)?$/);
  if (m) return { full: m[0], replaceLen: m[0].length };
  m = text.match(/[A-Za-zÀ-ÖØ-öø-ÿ_]\w*$/);
  if (m) return { full: m[0], replaceLen: m[0].length };
  return { full: "", replaceLen: 0 };
}

let acList = [],
  acIdx = -1;
const acPopup = document.getElementById("autocomplete-popup");

function getWordBefore(pos) {
  const m = codeEditor.value.slice(0, pos).match(/[A-Za-zÀ-ÖØ-öø-ÿ_]\w*$/);
  return m ? m[0] : "";
}

window.simbolosDinamicos = [];
window.assinaturasDinamicas = new Map();

function extrairSimbolosDoCodigo() {
  const texto = codeEditor.value;
  const novos = [];
  window.assinaturasDinamicas.clear();
  const varRe =
    /\b(inteiro|real|caracter|booleano|super)\s+([A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_]*)/g;
  let m;
  while ((m = varRe.exec(texto)) !== null)
    novos.push({ label: m[2], detail: `variável (${m[1]})`, insert: m[2] });
  const fnRe =
    /\bfuncao\s+([A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_]*)\s*\(([^)]*)\)/g;
  while ((m = fnRe.exec(texto)) !== null) {
    novos.push({
      label: m[1],
      detail: "função do usuário",
      insert: m[1] + "(",
    });
    const pars = m[2]
      .split(",")
      .map((p) => p.trim().split(":")[0].trim())
      .filter((p) => p.length > 0);
    window.assinaturasDinamicas.set(m[1], pars);
  }
  window.simbolosDinamicos = Array.from(
    new Map(novos.map((item) => [item.label, item])).values(),
  );
  window._userFnSet  = new Set(window.assinaturasDinamicas.keys());
  window._userVarSet = new Set(
    novos.filter((s) => !window.assinaturasDinamicas.has(s.label)).map((s) => s.label),
  );
}

function showAutocomplete() {
  const pos = codeEditor.selectionStart;
  const { full, replaceLen } = getContextBefore(pos);
  if (replaceLen < 1) {
    hideAutocomplete();
    return;
  }
  const imports = _parseImports(codeEditor.value);
  const libItems = _buildLibCompletions(imports);
  const all = [...window.simbolosDinamicos, ...BASE_COMPLETIONS, ...libItems];
  acList = all.filter((c) =>
    c.label.toLowerCase().startsWith(full.toLowerCase()),
  );
  if (!acList.length) {
    hideAutocomplete();
    return;
  }
  acIdx = 0;
  renderAutocomplete(pos, replaceLen);
}

function renderAutocomplete(pos, wordLen) {
  acPopup.innerHTML = "";
  acList.forEach((item, i) => {
    const li = document.createElement("div");
    li.className = "ac-item" + (i === acIdx ? " ac-active" : "");
    li.innerHTML = `<span class="ac-label">${esc(item.label)}</span><span class="ac-detail">${esc(item.detail)}</span>`;
    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      applyCompletion(i);
    });
    acPopup.appendChild(li);
  });
  const lh = parseFloat(getComputedStyle(codeEditor).lineHeight) || 22;
  const linesBefore = codeEditor.value.slice(0, pos).split("\n");
  const curLine = linesBefore.length;
  const rect = codeEditor.getBoundingClientRect();
  const top = rect.top + curLine * lh - codeEditor.scrollTop + lh;
  acPopup.style.top = Math.min(top, window.innerHeight - 200) + "px";
  acPopup.style.left = rect.left + 16 + "px";
  acPopup.style.display = "block";
}

function hideAutocomplete() {
  acPopup.style.display = "none";
  acList = [];
  acIdx = -1;
}
function applyCompletion(idx) {
  if (idx < 0 || idx >= acList.length) return;
  const item = acList[idx];
  const pos = codeEditor.selectionStart;
  const { replaceLen } = getContextBefore(pos);
  const before = codeEditor.value.slice(0, pos - replaceLen);
  const after = codeEditor.value.slice(pos);
  const insert = item.insert !== undefined ? item.insert : item.label;
  codeEditor.value = before + insert + after;
  codeEditor.selectionStart = codeEditor.selectionEnd =
    before.length + insert.length;
  hideAutocomplete();
  atualizarEditor();
  codeEditor.focus();
}
function navigateAC(dir) {
  if (!acList.length) return false;
  acIdx = (acIdx + dir + acList.length) % acList.length;
  acPopup.querySelectorAll(".ac-item").forEach((el, i) => {
    el.classList.toggle("ac-active", i === acIdx);
    if (i === acIdx) el.scrollIntoView({ block: "nearest" });
  });
  return true;
}

/* ============================================================
   SIGNATURE POPUP
   ============================================================ */
const sigPopup = document.getElementById("signature-popup");
const ASSINATURAS_NATIVAS = {
  imprima: ["conteudo"],
  leia: ["mensagem"],
  raiz: ["x"],
  expo: ["base", "expoente"],
  _pseudoLancar: ["tipo", "mensagem", "dadoEntrada", "dadoEsperado"],
};

function verificarBalaoAssinatura() {
  const pos = codeEditor.selectionStart;
  const text = codeEditor.value;
  let depth = 0,
    argIndex = 0,
    fnName = null;
  for (let i = pos - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === ")") depth++;
    else if (ch === "(") {
      depth--;
      if (depth < 0) {
        let start = i - 1;
        while (start >= 0 && /\s/.test(text[start])) start--;
        let end = start;
        while (start >= 0 && /[A-Za-zÀ-ÖØ-öø-ÿ0-9_.]/.test(text[start]))
          start--;
        fnName = text.substring(start + 1, end + 1);
        break;
      }
    } else if (ch === "," && depth === 0) argIndex++;
  }
  if (!fnName) {
    sigPopup.classList.add("hidden");
    return;
  }
  const _libSigs = _buildLibSignatures(_parseImports(codeEditor.value));
  const params =
    window.assinaturasDinamicas.get(fnName) ||
    _libSigs[fnName] ||
    ASSINATURAS_NATIVAS[fnName];
  if (!params) {
    sigPopup.classList.add("hidden");
    return;
  }
  let html = `<span class="sig-fn">${fnName}</span>(`;
  html += params
    .map((p, idx) => {
      const active =
        idx === argIndex ||
        (idx === params.length - 1 && argIndex >= params.length);
      return `<span class="sig-arg${active ? " active" : ""}">${p}</span>`;
    })
    .join(", ");
  html += ")";
  sigPopup.innerHTML = html;
  sigPopup.classList.remove("hidden");
  const lh = parseFloat(getComputedStyle(codeEditor).lineHeight) || 22;
  const linesBefore = codeEditor.value.slice(0, pos).split("\n");
  const rect = codeEditor.getBoundingClientRect();
  sigPopup.style.top =
    rect.top + linesBefore.length * lh - codeEditor.scrollTop - lh + "px";
  sigPopup.style.left = rect.left + 40 + "px";
}

/* ============================================================
   TECLADO
   ============================================================ */
codeEditor.addEventListener("keydown", function (e) {
  const ta = this,
    val = ta.value,
    ss = ta.selectionStart,
    se = ta.selectionEnd;

  /* Autocomplete */
  if (acList.length > 0) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      navigateAC(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      navigateAC(-1);
      return;
    }
    if (e.key === "Tab" || e.key === "Enter") {
      if (acIdx >= 0) {
        e.preventDefault();
        applyCompletion(acIdx);
        return;
      }
    }
    if (e.key === "Escape") {
      hideAutocomplete();
      return;
    }
  }

  if (e.ctrlKey && e.altKey && (e.key === "f" || e.key === "F")) {
    e.preventDefault();
    window.formatarCodigo();
    return;
  }
  if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
    e.preventDefault();
    executarCodigo();
    return;
  }
  if (e.ctrlKey && (e.key === "m" || e.key === "M")) {
    e.preventDefault();
    limparConsole();
    return;
  }
  if (e.key === "F1") {
    e.preventDefault();
    toggleHelp();
    return;
  }

  /* Atalhos do Depurador */
  if (e.key === "F9") {
    e.preventDefault();
    if (window.__emDepuracao) pararDepuracao();
    else iniciarDepuracao();
    return;
  }
  if (e.key === "F10" && window.__emDepuracao) {
    e.preventDefault();
    continuarDepuracao();
    return;
  }

  /* Ctrl+Z → desfazer (custom undo) */
  if (e.ctrlKey && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
    e.preventDefault();
    _undo();
    return;
  }
  /* Ctrl+Y ou Ctrl+Shift+Z → refazer (custom redo) */
  if (
    (e.ctrlKey && (e.key === "y" || e.key === "Y")) ||
    (e.ctrlKey && e.shiftKey && (e.key === "z" || e.key === "Z"))
  ) {
    e.preventDefault();
    _redo();
    return;
  }

  /* Ctrl+Enter → linha acima */
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault();
    _pushSnap();
    const linhasAntes = val.slice(0, ss).split("\n");
    const linhaAtual = linhasAntes[linhasAntes.length - 1];
    const indent = linhaAtual.match(/^(\s*)/)[1];
    const inicioLinha = ss - linhaAtual.length;
    ta.value =
      val.slice(0, inicioLinha) + indent + "\n" + val.slice(inicioLinha);
    ta.selectionStart = ta.selectionEnd = inicioLinha + indent.length;
    atualizarEditor();
    return;
  }

  /* Ctrl+' → comentar/descomentar */
  if (
    e.ctrlKey &&
    (e.key === "'" || e.key === "Dead" || e.key === "´" || e.keyCode === 222)
  ) {
    e.preventDefault();
    _pushSnap();
    _toggleComment(ta, val, ss, se);
    atualizarEditor();
    return;
  }

  /* Alt+Arrow → mover linha(s) selecionadas */
  if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
    e.preventDefault();
    _pushSnap();
    _moveLinesBlock(ta, val, ss, se, e.key === "ArrowUp" ? -1 : 1);
    atualizarEditor();
    return;
  }

  /* Tab */
  if (e.key === "Tab" && !e.shiftKey) {
    e.preventDefault();
    if (ss !== se) _indentLines(ta, val, ss, se, 1);
    else {
      ta.value = val.slice(0, ss) + "    " + val.slice(se);
      ta.selectionStart = ta.selectionEnd = ss + 4;
    }
    atualizarEditor();
    return;
  }
  /* Shift+Tab */
  if (e.key === "Tab" && e.shiftKey) {
    e.preventDefault();
    _indentLines(ta, val, ss, se, -1);
    atualizarEditor();
    return;
  }

  /* Fechar pares */
  const pares = { "{": "}", "(": ")", "[": "]" };
  const paresStr = { '"': '"', "'": "'" };
  const todos = { ...pares, ...paresStr };
  if (todos[e.key]) {
    if (paresStr[e.key] && val[ss] === e.key && ss === se) {
      e.preventDefault();
      ta.selectionStart = ta.selectionEnd = ss + 1;
      return;
    }
    e.preventDefault();
    const sel = val.slice(ss, se);
    ta.value = val.slice(0, ss) + e.key + sel + todos[e.key] + val.slice(se);
    ta.selectionStart = ta.selectionEnd = ss + 1 + sel.length;
    atualizarEditor();
    return;
  }

  /* Backspace sobre par */
  if (e.key === "Backspace" && ss === se) {
    const par = { "{": "}", "(": ")", "[": "]", '"': '"', "'": "'" };
    if (par[val[ss - 1]] === val[ss]) {
      e.preventDefault();
      ta.value = val.slice(0, ss - 1) + val.slice(ss + 1);
      ta.selectionStart = ta.selectionEnd = ss - 1;
      atualizarEditor();
      return;
    }
  }

  /* Enter → auto-indentação + snapshot */
  if (e.key === "Enter") {
    e.preventDefault();
    _pushSnap();
    const before = val.slice(0, ss);
    const linhaAtual = before.split("\n").pop();
    const indent = linhaAtual.match(/^(\s*)/)[1];
    const extra = linhaAtual.trimEnd().endsWith("{") ? "    " : "";
    const proxCh = val[ss];
    if (extra && proxCh === "}") {
      const ins = "\n" + indent + extra + "\n" + indent;
      ta.value = val.slice(0, ss) + ins + val.slice(se);
      ta.selectionStart = ta.selectionEnd =
        ss + indent.length + extra.length + 1;
    } else {
      const ins = "\n" + indent + extra;
      ta.value = val.slice(0, ss) + ins + val.slice(se);
      ta.selectionStart = ta.selectionEnd = ss + ins.length;
    }
    atualizarEditor();
    return;
  }
});

codeEditor.addEventListener("input", () => {
  if (window.linhaComErro) window.limparErroNoEditor();
  extrairSimbolosDoCodigo();
  atualizarEditor();
  showAutocomplete();
  verificarBalaoAssinatura();
  _scheduleSnap();
});
codeEditor.addEventListener("click", verificarBalaoAssinatura);
codeEditor.addEventListener("click", (e) => {
  if (typeof window.cpFindColorAt !== "function") return;
  setTimeout(() => {
    const match = window.cpFindColorAt(codeEditor.value, codeEditor.selectionStart);
    if (match) window.cpShow(e.clientX, e.clientY, match, codeEditor);
  }, 0);
});
codeEditor.addEventListener("keyup", (e) => {
  if (e.key.startsWith("Arrow")) verificarBalaoAssinatura();
});

/* -------- Helpers de edição -------- */
function _getLineRange(val, ss, se) {
  const before = val.slice(0, ss);
  const inicioLinha = before.lastIndexOf("\n") + 1;
  const after = val.slice(se);
  const fimLinha =
    se + (after.indexOf("\n") === -1 ? after.length : after.indexOf("\n"));
  return { start: inicioLinha, end: fimLinha };
}
function _toggleComment(ta, val, ss, se) {
  const { start, end } = _getLineRange(val, ss, se);
  const seg = val.slice(start, end);
  const linhas = seg.split("\n");
  const todas = linhas.every((l) => l.trimStart().startsWith("//"));
  const novas = linhas.map((l) =>
    todas
      ? l.replace(/^(\s*)\/\/\s?/, "$1")
      : l.match(/^(\s*)/)[1] + "// " + l.slice(l.match(/^(\s*)/)[1].length),
  );
  const novo = novas.join("\n");
  ta.value = val.slice(0, start) + novo + val.slice(end);
  ta.selectionStart = ss;
  ta.selectionEnd = Math.max(ss, se + (novo.length - seg.length));
}
function _indentLines(ta, val, ss, se, dir) {
  const { start, end } = _getLineRange(val, ss, se);
  const seg = val.slice(start, end);
  const novas = seg
    .split("\n")
    .map((l) =>
      dir === 1
        ? "    " + l
        : l.startsWith("    ")
          ? l.slice(4)
          : l.startsWith("\t")
            ? l.slice(1)
            : l.replace(/^ {1,3}/, ""),
    );
  const novo = novas.join("\n");
  const delta = novo.length - seg.length;
  ta.value = val.slice(0, start) + novo + val.slice(end);
  ta.selectionStart = Math.max(start, ss + delta);
  ta.selectionEnd = Math.max(ss, se + delta);
}

function _moveLinesBlock(ta, val, ss, se, dir) {
  const linhas = val.split("\n");
  const startLineIdx = val.slice(0, ss).split("\n").length - 1;
  const beforeSe = val.slice(0, se);
  const endLineRaw = beforeSe.split("\n").length - 1;
  const endLineIdx =
    se > ss && val[se - 1] === "\n" ? endLineRaw - 1 : endLineRaw;

  if (dir === -1 && startLineIdx === 0) return;
  if (dir === 1 && endLineIdx >= linhas.length - 1) return;

  const bloco = linhas.splice(startLineIdx, endLineIdx - startLineIdx + 1);
  const alvo = startLineIdx + dir;
  linhas.splice(alvo, 0, ...bloco);

  const novoVal = linhas.join("\n");
  ta.value = novoVal;

  const linhasAteAlvo = linhas.slice(0, alvo).join("\n");
  const newSS =
    linhasAteAlvo.length +
    (alvo > 0 ? 1 : 0) +
    (ss -
      val.slice(
        0,
        val.split("\n").slice(0, startLineIdx).join("\n").length +
          (startLineIdx > 0 ? 1 : 0),
      ).length);
  const blocoStr = bloco.join("\n");
  const newSE = linhasAteAlvo.length + (alvo > 0 ? 1 : 0) + blocoStr.length;

  const colSS =
    ss -
    val.split("\n").slice(0, startLineIdx).join("\n").length -
    (startLineIdx > 0 ? 1 : 0);
  const colSE =
    se -
    val.split("\n").slice(0, endLineIdx).join("\n").length -
    (endLineIdx > 0 ? 1 : 0);

  const prefAlvo = linhas.slice(0, alvo).join("\n") + (alvo > 0 ? "\n" : "");
  const nSS = prefAlvo.length + Math.min(colSS, linhas[alvo].length);
  const blocoNoPos = linhas.slice(alvo, alvo + bloco.length).join("\n");
  const nSE =
    prefAlvo.length +
    Math.min(
      blocoNoPos.length,
      Math.max(
        0,
        blocoStr.length -
          (bloco[bloco.length - 1].length -
            Math.min(colSE, bloco[bloco.length - 1].length)),
      ),
    );

  ta.selectionStart = nSS;
  ta.selectionEnd = ss === se ? nSS : nSE;
}

/* ============================================================
   MARCADORES
   ============================================================ */
function atualizarMetadados(texto) {
  const m = extrairMarcadores(texto);
  const bar = document.getElementById("metadata-bar");
  const hasAny = m.nome || m.autor || m.desc || m.versao;
  if (!hasAny) {
    bar.classList.add("hidden");
    return;
  }
  bar.classList.remove("hidden");
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = val ? "" : "none";
      if (val) el.querySelector(".meta-val").textContent = val;
    }
  };
  setEl("meta-nome", m.nome);
  setEl("meta-autor", m.autor ? "por " + m.autor : null);
  setEl("meta-versao", m.versao ? "v" + m.versao : null);
  setEl("meta-desc", m.desc);
}

/* ============================================================
   INTEGRAÇÃO CLOUD & SALVAR / ABRIR
   ============================================================ */
function configurarNuvem() {
  const urlAtual = localStorage.getItem("pseudo_ide_cloud_url") || "";
  const novaUrl = prompt(
    "Configurar Servidor de Bibliotecas (URL da API):",
    urlAtual,
  );
  if (novaUrl !== null) {
    localStorage.setItem("pseudo_ide_cloud_url", novaUrl.trim());
    imprima(`☁️ Servidor cloud configurado para: ${novaUrl.trim()}`);
  }
}

async function publicarNaNuvem() {
  const codigo = codeEditor.value;
  const m = extrairMarcadores(codigo);

  if (!m.biblioteca) {
    _imprimaErro(
      "Adicione o marcador @BIBLIOTECA[nome_da_lib] no topo do arquivo para poder publicá-lo.",
    );
    return;
  }

  const url = localStorage.getItem("pseudo_ide_cloud_url");
  if (!url) {
    alert("Você precisa configurar um servidor primeiro!");
    configurarNuvem();
    return;
  }

  try {
    const codigoCompilado = window.compilarParaBiblioteca(codigo, m.biblioteca);
    const payload = {
      tipo: "biblioteca",
      nome: m.biblioteca,
      autor: m.autor || "Desconhecido",
      versao: m.versao || "1.0",
      codigoInjetor: codigoCompilado,
    };

    imprima(`☁️ Publicando biblioteca '${m.biblioteca}' no servidor...`);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });

    if (res.ok) imprima("✓ Biblioteca publicada com sucesso na Nuvem!");
    else throw new Error();
  } catch (e) {
    _imprimaErro(
      "Falha na conexão. Verifique se o servidor está online e aceita requisições POST (CORS).",
    );
  }
}

function salvarArquivo() {
  const codigo = codeEditor.value;
  const m = extrairMarcadores(codigo);

  // Se for uma biblioteca, exporta como pacote .idelib injetável
  if (m.biblioteca) {
    try {
      const codigoCompilado = window.compilarParaBiblioteca(
        codigo,
        m.biblioteca,
      );
      const payload = JSON.stringify({
        tipo: "biblioteca",
        nome: m.biblioteca,
        autor: m.autor || "Desconhecido",
        versao: m.versao || "1.0",
        codigoInjetor: codigoCompilado,
      });
      const blob = new Blob([payload], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = m.biblioteca + ".idelib";
      a.click();
      URL.revokeObjectURL(url);
      imprima(`✓ Biblioteca local compilada: ${m.biblioteca}.idelib!`);
    } catch (e) {
      _imprimaErro(e);
    }
    return;
  }

  // Salvamento normal de script
  let nome =
    (m.nome || codigo.split("\n")[0].replace(/\(.*$/, "").trim() || "algoritmo")
      .replace(/[^a-zA-Z0-9_\-\s]/g, "")
      .trim()
      .replace(/\s+/g, "_") || "algoritmo";
  const blob = new Blob([codigo], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome + ".pseudo";
  a.click();
  URL.revokeObjectURL(url);
}

function abrirArquivo() {
  document.getElementById("file-import").click();
}

function _onFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const r = new FileReader();

  r.onload = (ev) => {
    // Instalação drag-and-drop de bibliotecas offline
    if (file.name.endsWith(".idelib")) {
      try {
        const libData = JSON.parse(ev.target.result);
        if (libData.tipo === "biblioteca" && libData.codigoInjetor) {
          eval(libData.codigoInjetor);
          imprima(
            `📦 Biblioteca '${libData.nome}' (v${libData.versao}) instalada localmente!`,
          );
          Object.keys(Bibliotecas[libData.nome]).forEach((funcName) => {
            COMPLETIONS.push({
              label: `... .${funcName}()`,
              detail: `bib: ${libData.nome}`,
              insert: `${funcName}(`,
            });
          });
        }
      } catch (err) {
        _imprimaErro("O arquivo .idelib parece estar corrompido.");
      }
      e.target.value = "";
      return;
    }

    codeEditor.value = ev.target.result;
    foldState.clear();
    atualizarEditor();
    codeEditor.focus();
  };
  r.readAsText(file, "UTF-8");
  e.target.value = "";
}

/* ============================================================
   SISTEMA DE BUSCA NATIVA (CTRL+F)
   ============================================================ */
const searchBox = document.getElementById("search-box");
const searchInput = document.getElementById("search-input");
const searchCount = document.getElementById("search-count");
const searchPrev = document.getElementById("search-prev");
const searchNext = document.getElementById("search-next");
const searchClose = document.getElementById("search-close");

let searchMatches = [];
let currentMatchIdx = -1;

window.openSearch = function () {
  searchBox.classList.remove("hidden");
  // Se o usuário selecionou uma palavra antes de dar Ctrl+F, joga ela pro input
  const selection = codeEditor.value.substring(
    codeEditor.selectionStart,
    codeEditor.selectionEnd,
  );
  if (selection && !selection.includes("\n")) {
    searchInput.value = selection;
  }
  searchInput.focus();
  searchInput.select();
  performSearch();
};

window.closeSearch = function () {
  searchBox.classList.add("hidden");
  codeEditor.focus();
};

function performSearch() {
  const query = searchInput.value;
  searchMatches = [];
  currentMatchIdx = -1;

  if (!query) {
    searchCount.textContent = "0/0";
    return;
  }

  const text = codeEditor.value;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let startIndex = 0;
  let index;

  // Localiza todas as ocorrências
  while ((index = lowerText.indexOf(lowerQuery, startIndex)) > -1) {
    searchMatches.push({ start: index, end: index + query.length });
    startIndex = index + query.length;
  }

  if (searchMatches.length > 0) {
    currentMatchIdx = 0;
    goToMatch(0);
  } else {
    searchCount.textContent = "0/0";
  }
}

function goToMatch(dir = 0) {
  if (searchMatches.length === 0) return;

  currentMatchIdx =
    (currentMatchIdx + dir + searchMatches.length) % searchMatches.length;
  searchCount.textContent = `${currentMatchIdx + 1}/${searchMatches.length}`;

  const match = searchMatches[currentMatchIdx];

  // Foca no editor para poder selecionar
  codeEditor.focus();
  codeEditor.setSelectionRange(match.start, match.end);

  // Calcula o scroll para centralizar o resultado na tela
  const lh = parseFloat(getComputedStyle(codeEditor).lineHeight) || 22;
  const linesBefore = codeEditor.value.substring(0, match.start).split("\n");
  const lineIdx = linesBefore.length - 1;
  codeEditor.scrollTop = Math.max(0, (lineIdx - 5) * lh);

  // Devolve o foco pro input para permitir continuar navegando com Enter
  searchInput.focus();
}

searchInput.addEventListener("input", performSearch);
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    goToMatch(e.shiftKey ? -1 : 1); // Shift+Enter volta, Enter avança
  }
  if (e.key === "Escape") {
    e.preventDefault();
    closeSearch();
  }
});

searchNext.addEventListener("click", () => goToMatch(1));
searchPrev.addEventListener("click", () => goToMatch(-1));
searchClose.addEventListener("click", closeSearch);

/* ============================================================
   MODAL
   ============================================================ */
function toggleHelp() {
  const m = document.getElementById("help-modal");
  m.classList.toggle("hidden");
  if (!m.classList.contains("hidden")) m.querySelector(".tab-btn").focus();
}
function toggleTeacherModal() {
  const m = document.getElementById("teacher-modal");
  m.classList.toggle("hidden");
}
function switchTab(tabId, btn) {
  document
    .querySelectorAll(".tab-pane")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}
document.getElementById("help-modal").addEventListener("click", function (e) {
  if (e.target === this) toggleHelp();
});

/* ============================================================
   RESIZER
   ============================================================ */
(function () {
  const resizer = document.getElementById("resizer");
  const editorPanel = document.getElementById("editor-panel");
  const consolePanel = document.getElementById("console-panel");
  const mainLayout = document.getElementById("main-layout");
  let dragging = false,
    startX = 0,
    startW = 0;
  resizer.addEventListener("mousedown", (e) => {
    dragging = true;
    startX = e.clientX;
    startW = editorPanel.getBoundingClientRect().width;
    resizer.classList.add("dragging");
    document.body.style.cssText = "cursor:col-resize;user-select:none";
  });
  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const total =
      mainLayout.getBoundingClientRect().width - resizer.offsetWidth;
    const nw = Math.max(
      260,
      Math.min(total - 220, startW + (e.clientX - startX)),
    );
    editorPanel.style.cssText = `flex:none;width:${nw}px`;
    consolePanel.style.cssText = `flex:none;width:${total - nw}px`;
  });
  document.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    resizer.classList.remove("dragging");
    document.body.style.cssText = "";
  });
})();

/* ============================================================
   PRETTIER NATIVO (Auto-Formatação)
   ============================================================ */
window.formatarCodigo = function () {
  _pushSnap();

  // Tokenize strings ("...") e comentários (//) para não distorcer
  // a contagem de chaves nem o espaçamento aplicados abaixo.
  const toks = [];
  let s = codeEditor.value.replace(
    /"(?:[^"\\]|\\.)*"|\/\/[^\n]*/g,
    (m) => { toks.push(m); return `\x00${toks.length - 1}\x00`; }
  );

  // Vírgula sem espaço → vírgula + espaço  ("a,b" → "a, b")
  s = s.replace(/,(?!\s)/g, ", ");

  // Garante exatamente um espaço antes de "{"  ("f(){" → "f() {")
  s = s.replace(/([^\s])\s*\{/g, "$1 {");

  // Indentação (4 espaços) + colapso de linhas em branco consecutivas
  const linhas = s.split("\n");
  let nivel = 0;
  const out = [];
  let ultBranco = false;

  for (const linha of linhas) {
    const l = linha.trim();

    if (!l) {
      if (!ultBranco) out.push("");
      ultBranco = true;
      continue;
    }
    ultBranco = false;

    const ab = (l.match(/\{/g) || []).length;
    const fe = (l.match(/\}/g) || []).length;

    if (l[0] === "}") nivel = Math.max(0, nivel - 1);
    out.push("    ".repeat(nivel) + l);
    // Se a linha começa com "}" (ex: "} senao {"), apenas adiciona
    // as aberturas de volta; as fechamentos já foram descontadas acima.
    nivel = l[0] === "}" ? Math.max(0, nivel + ab) : Math.max(0, nivel + ab - fe);
  }

  // Remove linhas em branco no final
  while (out.length && out[out.length - 1] === "") out.pop();

  // Restaura tokens protegidos
  codeEditor.value = out.join("\n").replace(/\x00(\d+)\x00/g, (_, i) => toks[+i]);
  atualizarEditor();
  imprima("✓ Código formatado.");
};

window.gerarLinkCompartilhamento = async function () {
  const urlNuvem = localStorage.getItem("pseudo_ide_cloud_url");
  if (!urlNuvem) {
    alert("Configure a URL da API primeiro (Botão ⚙️ API).");
    return;
  }

  const codigo = codeEditor.value.trim();
  if (!codigo) return;

  imprima("⏳ Gerando link de compartilhamento...");

  const shortId = "snp_" + Math.random().toString(36).substring(2, 8);

  try {
    const payload = {
      tipo: "snippet",
      nome: shortId,
      autor: "Compartilhamento",
      versao: "1.0",
      codigoInjetor: codigo,
    };

    const res = await fetch(urlNuvem, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error();

    // Codifica {id, api} como base64url — evita exposição direta na barra de endereços
    // e mantém o formato extensível para campos futuros.
    const token = _encodeShareToken({ id: shortId, api: urlNuvem });
    const urlBase = window.location.href.split("?")[0];
    const linkFinal = `${urlBase}?c=${token}`;

    await navigator.clipboard.writeText(linkFinal);
    imprima(`🔗 Link copiado para a área de transferência:\n${linkFinal}`);
  } catch (e) {
    _imprimaErro("Falha ao gerar o link. Verifique o servidor.");
  }
};

/* Codifica um objeto como base64url (URL-safe, sem padding). */
function _encodeShareToken(obj) {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/* Decodifica um token base64url gerado por _encodeShareToken. */
function _decodeShareToken(token) {
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

/* ============================================================
   ATALHOS GLOBAIS + INIT
   ============================================================ */
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && (e.key === "s" || e.key === "S")) e.preventDefault();
  if (e.ctrlKey && (e.key === "m" || e.key === "M")) e.preventDefault();
  /* Ctrl+Alt+F → formatar código (Prettier nativo) */
  if (e.ctrlKey && e.altKey && (e.key === "f" || e.key === "F")) {
    e.preventDefault();
    window.formatarCodigo();
    return;
  }
  /* BLOQUEIA O CTRL+F DO NAVEGADOR E ABRE A NOSSA BUSCA */
  if (e.ctrlKey && !e.altKey && (e.key === "f" || e.key === "F")) {
    e.preventDefault();
    window.openSearch();
    return;
  }
  if (e.key === "F1") e.preventDefault();
  if (
    e.ctrlKey &&
    (e.key === "z" || e.key === "Z" || e.key === "y" || e.key === "Y")
  )
    e.preventDefault();
  if (e.key === "Escape") {
    if (!document.getElementById("help-modal").classList.contains("hidden"))
      toggleHelp();
    else if (
      !document.getElementById("teacher-modal").classList.contains("hidden")
    )
      toggleTeacherModal();
    else hideAutocomplete();
  }
});

/* ============================================================
   HEADER DROPDOWNS
   ============================================================ */
window.toggleHdrDd = function (id) {
  const all = document.querySelectorAll(".hdr-dd");
  all.forEach((dd) => { if (dd.id !== id) dd.classList.remove("hdr-dd-open"); });
  document.getElementById(id)?.classList.toggle("hdr-dd-open");
};
document.addEventListener("click", (e) => {
  if (!e.target.closest(".hdr-dd")) {
    document.querySelectorAll(".hdr-dd").forEach((dd) => dd.classList.remove("hdr-dd-open"));
  }
});

/* ============================================================
   AUTOSAVE
   ============================================================ */
const AS_KEY    = "pseudo_autosave_v1";
const AS_EN_KEY = "pseudo_autosave_enabled";
let _asTimer    = null;

function _asEnabled() { return localStorage.getItem(AS_EN_KEY) !== "0"; }
function _asSave() {
  if (!_asEnabled()) return;
  localStorage.setItem(AS_KEY, JSON.stringify({ code: codeEditor.value, ts: Date.now() }));
}
function _asSchedule() { clearTimeout(_asTimer); _asTimer = setTimeout(_asSave, 1500); }
function _asUpdateBtn() {
  const btn = document.getElementById("btn-autosave");
  if (!btn) return;
  btn.classList.toggle("as-on", _asEnabled());
}
window.toggleAutosave = function () {
  localStorage.setItem(AS_EN_KEY, _asEnabled() ? "0" : "1");
  _asUpdateBtn();
  if (_asEnabled()) _asSave();
};

codeEditor.addEventListener("input", () => _asSchedule());

window.addEventListener("load", async () => {
  _lastSnap = codeEditor.value;
  _UNDO_STACK.push({ value: "", ss: 0, se: 0 });
  extrairSimbolosDoCodigo();
  atualizarEditor();
  _asUpdateBtn();

  /* Autosave restore prompt */
  if (_asEnabled()) {
    try {
      const saved = JSON.parse(localStorage.getItem(AS_KEY) || "null");
      if (saved && saved.code && saved.code !== codeEditor.value) {
        const age = Math.round((Date.now() - saved.ts) / 60000);
        if (confirm(`Há um rascunho salvo há ${age} min. Restaurar?`)) {
          codeEditor.value = saved.code;
          atualizarEditor();
        }
      }
    } catch (_) {}
  }

  const urlParams = new URLSearchParams(window.location.search);

  // Resolve id + api a partir de qualquer formato de link suportado:
  //   ?c=<base64url>        — formato atual (v3)
  //   ?id=X&api=Y           — formato anterior (v2)
  //   ?id=X                 — formato original sem api (v1, requer localStorage)
  let idSnippet = null;
  let urlNuvem = null;

  const tokenParam = urlParams.get("c");
  if (tokenParam) {
    const decoded = _decodeShareToken(tokenParam);
    if (decoded) { idSnippet = decoded.id; urlNuvem = decoded.api; }
  } else {
    idSnippet = urlParams.get("id");
    urlNuvem = urlParams.get("api");
  }
  urlNuvem = urlNuvem || localStorage.getItem("pseudo_ide_cloud_url");

  if (idSnippet && urlNuvem) {
    try {
      const char = urlNuvem.includes("?") ? "&" : "?";
      const res = await fetch(`${urlNuvem}${char}nome=${idSnippet}`);
      const libData = await res.json();

      if (libData && libData.codigoInjetor) {
        codeEditor.value = libData.codigoInjetor;
        atualizarEditor();
        imprima(`✓ Código compartilhado carregado com sucesso!`);

        // Limpa a URL para não recarregar caso o usuário dê F5
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
    } catch (e) {
      console.error("Falha ao puxar snippet do servidor", e);
    }
  } else if (idSnippet && !urlNuvem) {
    imprima("⚠️ Este link não contém a URL da API. Peça ao autor um link mais recente, ou configure a API manualmente (botão ⚙️ API).");
  } else {
    codeEditor.focus();
    codeEditor.selectionStart = codeEditor.selectionEnd =
      codeEditor.value.length;
    document
      .getElementById("file-import")
      .addEventListener("change", _onFileImport);
  }
});
