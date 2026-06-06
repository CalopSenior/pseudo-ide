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
  if (KW_TYPE.has(word)) return `<span class="t-type">${esc(word)}</span>`;
  if (KW_CTRL.has(word)) return `<span class="t-ctrl">${esc(word)}</span>`;
  if (KW_VAL.has(word)) return `<span class="t-val">${esc(word)}</span>`;
  if (KW_OP.has(word)) return `<span class="t-op">${esc(word)}</span>`;
  if (KW_IMPORT.has(word)) return `<span class="t-import">${esc(word)}</span>`;
  if (KW_FN.has(word)) return `<span class="t-fn">${esc(word)}</span>`;
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
const COMPLETIONS = [
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
  { label: "m.pi", detail: "mat — π ≈ 3.14159" },
  { label: "m.e", detail: "mat — e ≈ 2.71828" },
  { label: "m.Infinito", detail: "mat — +∞" },
  { label: "m.NegInfinito", detail: "mat — −∞" },
  { label: "m.abs()", detail: "mat — |x|", insert: "m.abs(" },
  { label: "m.arred()", detail: "mat — arredonda", insert: "m.arred(" },
  { label: "m.piso()", detail: "mat — floor ⌊x⌋", insert: "m.piso(" },
  { label: "m.teto()", detail: "mat — ceil ⌈x⌉", insert: "m.teto(" },
  { label: "m.max()", detail: "mat — maior dos dois", insert: "m.max(" },
  { label: "m.min()", detail: "mat — menor dos dois", insert: "m.min(" },
  { label: "m.sen()", detail: "mat — seno (rad)", insert: "m.sen(" },
  { label: "m.cos()", detail: "mat — cosseno", insert: "m.cos(" },
  { label: "m.tan()", detail: "mat — tangente", insert: "m.tan(" },
  { label: "m.ln()", detail: "mat — log natural", insert: "m.ln(" },
  { label: "m.log2()", detail: "mat — log₂", insert: "m.log2(" },
  { label: "m.log10()", detail: "mat — log₁₀", insert: "m.log10(" },
  {
    label: "m.log(x, base)",
    detail: "mat — log qualquer base",
    insert: "m.log(",
  },
  {
    label: "m.aleatorio()",
    detail: "mat — inteiro em [min,max]",
    insert: "m.aleatorio(",
  },
  {
    label: "m.somatorio()",
    detail: "mat — Σ fn(i) de min a max",
    insert: "m.somatorio(",
  },
  {
    label: "m.produtorio()",
    detail: "mat — Π fn(i) de min a max",
    insert: "m.produtorio(",
  },
  {
    label: "c.limite(fn, ponto)",
    detail: "calculo — lim x→p",
    insert: "c.limite(",
  },
  {
    label: "c.derivada(fn, x, n)",
    detail: "calculo — f'(x) ordem n",
    insert: "c.derivada(",
  },
  {
    label: "c.integral(fn, a, b)",
    detail: "calculo — ∫f dx de a a b",
    insert: "c.integral(",
  },
  { label: "c.gamma(x)", detail: "calculo — função Γ(x)", insert: "c.gamma(" },
  {
    label: "c.digamma(x)",
    detail: "calculo — função ψ(x)",
    insert: "c.digamma(",
  },
  {
    label: "c.zeta(s)",
    detail: "calculo — Riemann ζ(s) (s>1)",
    insert: "c.zeta(",
  },
  {
    label: "c.phi(n)",
    detail: "calculo — Totiente de Euler φ(n)",
    insert: "c.phi(",
  },
  {
    label: "c.lambertW(x)",
    detail: "calculo — função W(x)",
    insert: "c.lambertW(",
  },
  {
    label: "c.taylor(fn, a, x, n)",
    detail: 'calculo — série de Taylor em "a"',
    insert: "c.taylor(",
  },
  { label: "e.fatorial(n)", detail: "estat — n!", insert: "e.fatorial(" },
  {
    label: "e.combinacao(n,k)",
    detail: "estat — C(n,k)",
    insert: "e.combinacao(",
  },
  { label: "e.arranjo(n,k)", detail: "estat — A(n,k)", insert: "e.arranjo(" },
  { label: "e.media(lista)", detail: "estat — média", insert: "e.media(" },
  {
    label: "e.mediana(lista)",
    detail: "estat — mediana",
    insert: "e.mediana(",
  },
  { label: "e.moda(lista)", detail: "estat — moda(s)", insert: "e.moda(" },
  { label: "e.variancia(lista)", detail: "estat — σ²", insert: "e.variancia(" },
  {
    label: "e.desvioPadrao(lista)",
    detail: "estat — σ",
    insert: "e.desvioPadrao(",
  },
  {
    label: "t.tabela(cab, linhas)",
    detail: "tabular — tabela formatada",
    insert: "t.tabela(",
  },
  {
    label: "t.separador()",
    detail: "tabular — linha divisória",
    insert: "t.separador()",
  },
  {
    label: "t.progresso(val, max)",
    detail: "tabular — barra visual",
    insert: "t.progresso(",
  },
  {
    label: "t.tabelaVerdade(expr, vars, inter?)",
    detail: "tabular — tabela-verdade",
    insert: "t.tabelaVerdade(",
  },
  {
    label: "m.lista(...)",
    detail: "metodos — lista dinâmica",
    insert: "m.lista(",
  },
  { label: "m.mapa()", detail: "metodos — dicionário", insert: "m.mapa()" },
  {
    label: "m.conjunto()",
    detail: "metodos — conjunto único",
    insert: "m.conjunto()",
  },
  {
    label: "m.numero(v)",
    detail: "metodos — objeto numérico",
    insert: "m.numero(",
  },
  {
    label: "m.caracter(v)",
    detail: "metodos — objeto texto",
    insert: "m.caracter(",
  },
  {
    label: "m.vetor([...])",
    detail: "metodos — vetor N-dim",
    insert: "m.vetor([",
  },
  {
    label: "m.matriz([[...]])",
    detail: "metodos — matriz M×N",
    insert: "m.matriz([[\n    \n]])",
  },
  { label: "tp.agora()", detail: "tempo — ms atual", insert: "tp.agora()" },
  {
    label: "tp.medirExecucao(fn)",
    detail: "tempo — mede e imprime",
    insert: "tp.medirExecucao(",
  },
  {
    label: "tp.testeStress(fn,max)",
    detail: "tempo — tabela Big-O",
    insert: "tp.testeStress(",
  },
  {
    label: "g.plotar(dados, config)",
    detail: "graficos — interface unificada",
    insert: "g.plotar(",
  },
  {
    label: "g.plotarFuncao(fn, [-,+])",
    detail: "graficos — função 2D",
    insert: "g.plotarFuncao(",
  },
  {
    label: "g.plotarMultiplas(lista_fn, [-,+])",
    detail: "graficos — várias funções",
    insert: "g.plotarMultiplas(",
  },
  {
    label: "g.dispersao(pontos)",
    detail: "graficos — scatter {x,y}",
    insert: "g.dispersao(",
  },
  {
    label: "g.superficie3D(fn)",
    detail: "graficos — z=f(x,z) 3D",
    insert: "g.superficie3D(",
  },
  {
    label: "p.sortearComPesos(itens, pesos)",
    detail: "prob — sorteio ponderado",
    insert: "p.sortearComPesos(",
  },
  {
    label: "p.uniforme(min, max)",
    detail: "prob — real em [min,max]",
    insert: "p.uniforme(",
  },
  {
    label: "p.aleatorioInteiro(min, max)",
    detail: "prob — int em [min,max]",
    insert: "p.aleatorioInteiro(",
  },
  {
    label: "p.rolarDados(qtd, faces)",
    detail: "prob — simula dados",
    insert: "p.rolarDados(",
  },
  {
    label: "p.monteCarlo(fn, n)",
    detail: "prob — simulação Monte Carlo",
    insert: "p.monteCarlo(",
  },
  // ── algebra ──────────────────────────────────────────────
  {
    label: "importar algebra como al",
    detail: "snippet",
    insert: "importar algebra como al;\n",
  },
  {
    label: "al.vetorial(v, u)",
    detail: "algebra — produto vetorial 3D",
    insert: "al.vetorial(",
  },
  {
    label: "al.angulo(v, u)",
    detail: "algebra — ângulo entre vetores (rad)",
    insert: "al.angulo(",
  },
  {
    label: "al.anguloDeg(v, u)",
    detail: "algebra — ângulo entre vetores (graus)",
    insert: "al.anguloDeg(",
  },
  {
    label: "al.projecao(v, u)",
    detail: "algebra — projeção de v sobre u",
    insert: "al.projecao(",
  },
  {
    label: "al.saoParalelos(v, u)",
    detail: "algebra — v ∥ u ?",
    insert: "al.saoParalelos(",
  },
  {
    label: "al.saoOrtogonais(v, u)",
    detail: "algebra — v ⊥ u ?",
    insert: "al.saoOrtogonais(",
  },
  {
    label: "al.identidade(n)",
    detail: "algebra — matriz identidade n×n",
    insert: "al.identidade(",
  },
  {
    label: "al.zeros(m, n)",
    detail: "algebra — matriz zero m×n",
    insert: "al.zeros(",
  },
  {
    label: "al.determinante(M)",
    detail: "algebra — det(M)",
    insert: "al.determinante(",
  },
  {
    label: "al.traco(M)",
    detail: "algebra — tr(M) soma da diagonal",
    insert: "al.traco(",
  },
  {
    label: "al.inversa(M)",
    detail: "algebra — M⁻¹",
    insert: "al.inversa(",
  },
  {
    label: "al.resolverSistema(A, b)",
    detail: "algebra — Ax = b, retorna vetor x",
    insert: "al.resolverSistema(",
  },
  {
    label: "al.distancia(p1, p2)",
    detail: "algebra — distância euclidiana",
    insert: "al.distancia(",
  },
  {
    label: "al.pontoMedio(p1, p2)",
    detail: "algebra — ponto médio",
    insert: "al.pontoMedio(",
  },
  {
    label: "al.equacaoReta(A, B)",
    detail: "algebra — mapa {a,b,c} de ax+by+c=0",
    insert: "al.equacaoReta(",
  },
  {
    label: "al.distPontoReta(P, A, B)",
    detail: "algebra — dist ponto→reta",
    insert: "al.distPontoReta(",
  },
  {
    label: "al.intersecaoRetas(A, B, C, D)",
    detail: "algebra — interseção 2D AB∩CD",
    insert: "al.intersecaoRetas(",
  },
  {
    label: "al.areaTriangulo(A, B, C)",
    detail: "algebra — área do triângulo",
    insert: "al.areaTriangulo(",
  },
  {
    label: "al.perimetroTriangulo(A, B, C)",
    detail: "algebra — perímetro do triângulo",
    insert: "al.perimetroTriangulo(",
  },
  {
    label: "al.areaCirculo(r)",
    detail: "algebra — π·r²",
    insert: "al.areaCirculo(",
  },
  {
    label: "al.perimetroCirculo(r)",
    detail: "algebra — 2·π·r",
    insert: "al.perimetroCirculo(",
  },
  {
    label: "al.pontoCirculo(cx, cy, r, theta)",
    detail: "algebra — ponto na circunferência",
    insert: "al.pontoCirculo(",
  },
  {
    label: "al.equacaoPlano(A, B, C)",
    detail: "algebra — mapa {a,b,c,d} de ax+by+cz+d=0",
    insert: "al.equacaoPlano(",
  },
  {
    label: "al.distPontoPlano(P, plano)",
    detail: "algebra — dist ponto→plano",
    insert: "al.distPontoPlano(",
  },
  {
    label: "al.saoColineares(A, B, C)",
    detail: "algebra — A, B, C colineares?",
    insert: "al.saoColineares(",
  },
  {
    label: "al.saoCoplanares(A, B, C, D)",
    detail: "algebra — A,B,C,D coplanares?",
    insert: "al.saoCoplanares(",
  },
  // ── metodos — verificadores de tipo ──────────────────────
  {
    label: "m.eNumero(v)",
    detail: "metodos — v é número (não-NaN)?",
    insert: "m.eNumero(",
  },
  {
    label: "m.eInteiro(v)",
    detail: "metodos — v é inteiro?",
    insert: "m.eInteiro(",
  },
  {
    label: "m.eReal(v)",
    detail: "metodos — v é real (não inteiro)?",
    insert: "m.eReal(",
  },
  {
    label: "m.eTexto(v)",
    detail: "metodos — v é caracter/texto?",
    insert: "m.eTexto(",
  },
  {
    label: "m.eBooleano(v)",
    detail: "metodos — v é booleano?",
    insert: "m.eBooleano(",
  },
  {
    label: "m.eLista(v)",
    detail: "metodos — v é lista?",
    insert: "m.eLista(",
  },
  {
    label: "m.eMapa(v)",
    detail: "metodos — v é mapa?",
    insert: "m.eMapa(",
  },
  {
    label: "m.eConjunto(v)",
    detail: "metodos — v é conjunto?",
    insert: "m.eConjunto(",
  },
  {
    label: "m.eVetor(v)",
    detail: "metodos — v é vetor?",
    insert: "m.eVetor(",
  },
  {
    label: "m.eMatriz(v)",
    detail: "metodos — v é matriz?",
    insert: "m.eMatriz(",
  },
  {
    label: "m.eVazio(v)",
    detail: "metodos — v é vazio (null)?",
    insert: "m.eVazio(",
  },
  {
    label: "m.eIndefinido(v)",
    detail: "metodos — v é indefinido?",
    insert: "m.eIndefinido(",
  },
];

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
}

function showAutocomplete() {
  const pos = codeEditor.selectionStart;
  const word = getWordBefore(pos);
  if (word.length < 1) {
    hideAutocomplete();
    return;
  }
  const all = [...window.simbolosDinamicos, ...COMPLETIONS];
  acList = all.filter((c) =>
    c.label.toLowerCase().startsWith(word.toLowerCase()),
  );
  if (!acList.length) {
    hideAutocomplete();
    return;
  }
  acIdx = 0;
  renderAutocomplete(pos, word.length);
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
  const word = getWordBefore(pos);
  const before = codeEditor.value.slice(0, pos - word.length);
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
  "c.limite": ["fn", "ponto"],
  "c.derivada": ["fn", "ponto", "ordem"],
  "c.integral": ["fn", "a", "b"],
  "c.gamma": ["x"],
  "c.digamma": ["x"],
  "c.zeta": ["s"],
  "c.phi": ["n"],
  "c.lambertW": ["x"],
  "c.taylor": ["fn", "pontoA", "valorX", "nTermos"],
  "t.tabelaVerdade": ["expressoes", "variaveis", "mostrarIntermediarias"],
  "t.progresso": ["valor", "max"],
  "tp.medirExecucao": ["fn", "...args"],
  "tp.testeStress": ["fn", "n_max"],
  "g.plotar": ["dados", "config"],
  "g.plotarFuncao": ["fn", "intervalo", "opcoes"],
  "g.plotarMultiplas": ["listaFuncoes", "intervalo", "opcoes"],
  "g.dispersao": ["pontos", "opcoes"],
  "g.superficie3D": ["fn", "opcoes"],
  "p.sortearComPesos": ["itens", "pesos"],
  "p.uniforme": ["min", "max"],
  "p.aleatorioInteiro": ["min", "max"],
  "p.rolarDados": ["quantidade", "faces"],
  "p.monteCarlo": ["fn", "n"],
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
  const params =
    window.assinaturasDinamicas.get(fnName) || ASSINATURAS_NATIVAS[fnName];
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

  // A IDE gera um ID único com prefixo 'snp_' (snippet) localmente
  const shortId = "snp_" + Math.random().toString(36).substring(2, 8);

  try {
    // Usamos a mesma estrutura de payload que o servidor já aceita
    const payload = {
      tipo: "snippet",
      nome: shortId,
      autor: "Compartilhamento",
      versao: "1.0",
      codigoInjetor: codigo, // Mandamos o código cru em vez do código compilado
    };

    const res = await fetch(urlNuvem, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error();

    // Pega a URL atual da IDE e adiciona o parâmetro
    const urlBase = window.location.href.split("?")[0];
    const linkFinal = `${urlBase}?id=${shortId}`;

    await navigator.clipboard.writeText(linkFinal);
    imprima(`🔗 Link copiado para a área de transferência:\n${linkFinal}`);
  } catch (e) {
    _imprimaErro("Falha ao gerar o link. Verifique o servidor.");
  }
};

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

window.addEventListener("load", async () => {
  _lastSnap = codeEditor.value;
  _UNDO_STACK.push({ value: "", ss: 0, se: 0 });
  extrairSimbolosDoCodigo();
  atualizarEditor();

  const urlParams = new URLSearchParams(window.location.search);
  const idSnippet = urlParams.get("id");
  const urlNuvem = localStorage.getItem("pseudo_ide_cloud_url");

  if (idSnippet && urlNuvem) {
    try {
      const char = urlNuvem.includes("?") ? "&" : "?";
      // Pede ao servidor agnóstico usando a mesma query de busca de biblioteca (?nome=)
      const res = await fetch(`${urlNuvem}${char}nome=${idSnippet}`);
      const libData = await res.json();

      // Se o servidor devolveu o JSON e ele tem o código cru
      if (libData && libData.codigoInjetor) {
        codeEditor.value = libData.codigoInjetor;
        atualizarEditor();
        imprima(`✓ Código compartilhado carregado com sucesso!`);

        // Limpa a URL da barra de endereços para não recarregar caso o aluno dê F5
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
    } catch (e) {
      console.error("Falha ao puxar snippet do servidor", e);
    }
  } else {
    codeEditor.focus();
    codeEditor.selectionStart = codeEditor.selectionEnd =
      codeEditor.value.length;
    document
      .getElementById("file-import")
      .addEventListener("change", _onFileImport);
  }
});
