/* ============================================================
   PSEUDO-IDE — editor.js  v3.0
   ============================================================ */
"use strict";

/* -------- DOM -------- */
const codeEditor = document.getElementById("code-editor");
const highlightLayer = document.getElementById("highlight-layer");
const errorLayer = document.getElementById("error-layer"); // Nova linha
const lineNumbers = document.getElementById("line-numbers");
const algoNameDisplay = document.getElementById("algo-name-display");
const tabFilename = document.getElementById("tab-filename");

window.linhaComErro = null;

window.marcarErroNoEditor = function (linha) {
  window.linhaComErro = linha;
  atualizarEditor();
};

window.limparErroNoEditor = function () {
  window.linhaComErro = null;
  atualizarEditor();
};

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
]);
const KW_VAL = new Set([
  "verdadeiro",
  "falso",
  "vazio",
  "indefinido",
  "Infinito",
  "NegInfinito",
]);
const KW_OP = new Set(["e", "ou", "nao", "mod"]);
const KW_IMPORT = new Set(["importar", "como"]);
const KW_FN = new Set([
  // Nativas
  "imprima",
  "leia",
  "raiz",
  "expo",
  // mat
  "abs",
  "arred",
  "piso",
  "teto",
  "max",
  "min",
  "sen",
  "cos",
  "tan",
  "ln",
  "log2",
  "log10",
  "log",
  "aleatorio",
  "somatorio",
  "produtorio",
  // tabular
  "separador",
  "tabela",
  "progresso",
  "tabelaVerdade",
  // metodos
  "caracter",
  "lista",
  "mapa",
  "conjunto",
  "numero",
  // metodos.numero
  "sinal",
  "int",
  "re",
  "decimal",
  "fatorar",
  // metodos.lista / caracter
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
  // conjunto
  "uniao",
  "intersecao",
  "diferenca",
  "tem",
  // calculo
  "limite",
  "derivada",
  "integral",
  // estatistica
  "fatorial",
  "combinacao",
  "arranjo",
  "media",
  "mediana",
  "moda",
  "variancia",
  "desvioPadrao",
  // mapa
  "definir",
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
  let html = "",
    i = 0,
    len = texto.length;
  let inBlockComment = false;

  while (i < len) {
    const ch = texto[i];

    /* Marcadores @NOME[...] */
    if (ch === "@") {
      const mm = texto.slice(i).match(/^@(NOME|AUTOR|DESC|VERSAO)\[([^\]]*)\]/);
      if (mm) {
        html += `<span class="t-marker">@${mm[1]}</span><span class="t-marker-bracket">[</span><span class="t-marker-val">${esc(mm[2])}</span><span class="t-marker-bracket">]</span>`;
        i += mm[0].length;
        continue;
      }
    }

    /* Comentário de bloco /* ... */
    if (!inBlockComment && ch === "/" && texto[i + 1] === "*") {
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
      // Renderiza mantendo quebras de linha
      const lines = cmt.split("\n");
      html += lines
        .map(
          (l, idx) =>
            `<span class="t-cmt">${esc(l)}</span>${idx < lines.length - 1 ? "\n" : ""}`,
        )
        .join("");
      continue;
    }

    /* Comentário de linha // */
    if (ch === "/" && texto[i + 1] === "/") {
      let cmt = "";
      while (i < len && texto[i] !== "\n") cmt += texto[i++];
      html += `<span class="t-cmt">${esc(cmt)}</span>`;
      continue;
    }

    /* f-strings */
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
      html += `<span class="t-str">${esc(s)}</span>`;
      continue;
    }

    /* Strings */
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
      html += `<span class="t-str">${esc(s)}</span>`;
      continue;
    }

    /* Template literals */
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
      html += `<span class="t-str">${esc(s)}</span>`;
      continue;
    }

    /* Palavras */
    if (/[A-Za-zÀ-ÖØ-öø-ÿ_]/.test(ch)) {
      let w = "";
      while (i < len && /[A-Za-zÀ-ÖØ-öø-ÿ0-9_]/.test(texto[i])) w += texto[i++];
      html += kwClass(w);
      continue;
    }

    /* Números com suporte a notação científica (1.5e10, 2E-3) */
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(texto[i + 1] || ""))) {
      let n = "";
      while (i < len && /[0-9.eE+\-]/.test(texto[i])) {
        // evitar capturar - que não seja parte do expoente
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
   ESTADO DE FOLD (colapso de blocos)
   ============================================================ */
const foldState = new Map(); // lineIndex (0-based) → { content: string[], folded: bool }

function encontrarFechamento(linhas, aberturaIdx) {
  let depth = 0;
  for (let i = aberturaIdx; i < linhas.length; i++) {
    for (const ch of linhas[i]) {
      if (ch === "{") depth++;
      if (ch === "}") depth--;
    }
    if (depth === 0) return i;
  }
  return -1;
}

function toggleFold(lineIdx) {
  const val = codeEditor.value;
  const linhas = val.split("\n");
  if (lineIdx >= linhas.length) return;

  if (foldState.has(lineIdx)) {
    // Desdobrar
    const state = foldState.get(lineIdx);
    foldState.delete(lineIdx);
    linhas.splice(lineIdx, 1, ...state.content);
  } else {
    // Dobrar
    const fechamento = encontrarFechamento(linhas, lineIdx);
    if (fechamento <= lineIdx) return;
    const bloco = linhas.slice(lineIdx, fechamento + 1);
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

  /* Números de linha com fold arrows */
  const lnHtml = linhas
    .map((linha, idx) => {
      const temAbertura =
        /\{/.test(linha) && !/\}/.test(linha.replace(/.*\{/, ""));
      const isFolded = foldState.has(idx);
      const hasContent = temAbertura || isFolded;
      const isErrorLine = idx + 1 === window.linhaComErro;
      const arrow = hasContent
        ? `<span class="fold-arrow ${isFolded ? "folded" : ""}" data-line="${idx}" title="${isFolded ? "Expandir bloco" : "Recolher bloco"}">${isFolded ? "▶" : "▼"}</span>`
        : "";

      return `<div class="ln-row ${isErrorLine ? "has-error" : ""}">${arrow}<span class="ln-num">${idx + 1}</span></div>`;
    })
    .join("");
  lineNumbers.innerHTML = lnHtml;

  // Eventos nos arrows
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

  if (errorLayer) {
    if (window.linhaComErro) {
      errorLayer.innerHTML = linhas
        .map((linha, idx) => {
          if (idx + 1 === window.linhaComErro) {
            // Se a linha for vazia, adiciona um espaço para o sublinhado aparecer
            const txt = linha.trim() === "" ? " " : linha;
            return `<span class="error-squiggle">${esc(txt)}</span>`;
          }
          return ""; // Linhas sem erro ficam completamente vazias aqui
        })
        .join("\n");
    } else {
      errorLayer.innerHTML = "";
    }
    errorLayer.scrollLeft = codeEditor.scrollLeft;
    errorLayer.scrollTop = codeEditor.scrollTop;
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
  lineNumbers.scrollTop = codeEditor.scrollTop;
  if (errorLayer) {
    errorLayer.scrollTop = codeEditor.scrollTop;
    errorLayer.scrollLeft = codeEditor.scrollLeft;
  }
});

/* ============================================================
   AUTOCOMPLETE
   ============================================================ */
const COMPLETIONS = [
  // Tipos
  { label: "inteiro", detail: "tipo — número inteiro" },
  { label: "real", detail: "tipo — número decimal" },
  { label: "caracter", detail: "tipo — texto/string" },
  { label: "booleano", detail: "tipo — verdadeiro/falso" },
  {
    label: "super",
    detail: "tipo universal (aceita qualquer valor ou lista fixa [])",
  },
  // Valores
  { label: "verdadeiro", detail: "valor booleano" },
  { label: "falso", detail: "valor booleano" },
  { label: "vazio", detail: "null — ausência de valor" },
  { label: "indefinido", detail: "undefined — sem valor atribuído" },
  { label: "Infinito", detail: "∞ positivo" },
  { label: "NegInfinito", detail: "−∞ negativo" },
  // Controle
  { label: "se", detail: "condicional" },
  { label: "senao", detail: "condicional" },
  { label: "enquanto", detail: "laço" },
  { label: "faca", detail: "laço do-while" },
  { label: "para", detail: "laço for" },
  { label: "funcao", detail: "definição de função" },
  { label: "retorno", detail: "retorna valor da função" },
  { label: "quebrar", detail: "break — sai do laço" },
  { label: "continuar", detail: "continue — pula iteração" },
  { label: "escolha", detail: "switch" },
  { label: "caso", detail: "case" },
  { label: "padrao", detail: "default" },
  { label: "tentar", detail: "try — tratamento de erros" },
  { label: "capturar", detail: "catch" },
  { label: "importar", detail: "importar biblioteca" },
  { label: "como", detail: "alias de biblioteca" },
  { label: "mod", detail: "operador — resto da divisão" },
  // I/O nativo
  { label: "imprima()", detail: "saída no console", insert: "imprima(" },
  { label: "leia()", detail: "entrada do usuário", insert: "leia(" },
  { label: "raiz()", detail: "raiz quadrada nativa", insert: "raiz(" },
  { label: "expo()", detail: "potência nativa", insert: "expo(" },
  // Snippets de importação
  {
    label: "importar mat como m",
    detail: "snippet",
    insert: "importar mat como m;",
  },
  {
    label: "importar metodos como m",
    detail: "snippet",
    insert: "importar metodos como m;",
  },
  {
    label: "importar tabular como t",
    detail: "snippet",
    insert: "importar tabular como t;",
  },
  {
    label: "importar calculo como c",
    detail: "snippet",
    insert: "importar calculo como c;",
  },
  {
    label: "importar estatistica como e",
    detail: "snippet",
    insert: "importar estatistica como e;",
  },
  // Snippets de estrutura
  { label: "se (...) { }", detail: "snippet", insert: "se () {\n    \n}" },
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
    detail: "snippet",
    insert: "para (inteiro i = 0; i < ; i++) {\n    \n}",
  },
  {
    label: "funcao nome() { }",
    detail: "snippet",
    insert: "funcao nome() {\n    \n}",
  },
  {
    label: "tentar { } capturar",
    detail: "snippet",
    insert: "tentar {\n    \n} capturar (erro) {\n    imprima(erro);\n}",
  },
  // mat
  { label: "m.pi", detail: "mat — π" },
  { label: "m.e", detail: "mat — Euler" },
  { label: "m.Infinito", detail: "mat — +∞" },
  { label: "m.NegInfinito", detail: "mat — −∞" },
  { label: "m.abs()", detail: "mat — valor absoluto", insert: "m.abs(" },
  { label: "m.arred()", detail: "mat — arredondamento", insert: "m.arred(" },
  { label: "m.piso()", detail: "mat — floor", insert: "m.piso(" },
  { label: "m.teto()", detail: "mat — ceil", insert: "m.teto(" },
  { label: "m.max()", detail: "mat — maior valor", insert: "m.max(" },
  { label: "m.min()", detail: "mat — menor valor", insert: "m.min(" },
  { label: "m.sen()", detail: "mat — seno (radianos)", insert: "m.sen(" },
  { label: "m.cos()", detail: "mat — cosseno", insert: "m.cos(" },
  { label: "m.tan()", detail: "mat — tangente", insert: "m.tan(" },
  { label: "m.ln()", detail: "mat — log natural", insert: "m.ln(" },
  { label: "m.log2()", detail: "mat — log base 2", insert: "m.log2(" },
  { label: "m.log10()", detail: "mat — log base 10", insert: "m.log10(" },
  { label: "m.log()", detail: "mat — log qualquer base", insert: "m.log(" },
  {
    label: "m.aleatorio()",
    detail: "mat — int aleatório",
    insert: "m.aleatorio(",
  },
  { label: "m.somatorio()", detail: "mat — Σ fn(i)", insert: "m.somatorio(" },
  { label: "m.produtorio()", detail: "mat — Π fn(i)", insert: "m.produtorio(" },
  // calculo
  {
    label: "c.limite()",
    detail: "calculo — lim x→p f(x)",
    insert: "c.limite(",
  },
  {
    label: "c.derivada()",
    detail: "calculo — f'(x) ordem n",
    insert: "c.derivada(",
  },
  {
    label: "c.integral()",
    detail: "calculo — ∫f dx de a a b",
    insert: "c.integral(",
  },
  // estatistica
  { label: "e.fatorial()", detail: "estat — n!", insert: "e.fatorial(" },
  {
    label: "e.combinacao()",
    detail: "estat — C(n,k)",
    insert: "e.combinacao(",
  },
  { label: "e.arranjo()", detail: "estat — A(n,k)", insert: "e.arranjo(" },
  { label: "e.media()", detail: "estat — média", insert: "e.media(" },
  { label: "e.mediana()", detail: "estat — mediana", insert: "e.mediana(" },
  { label: "e.moda()", detail: "estat — moda", insert: "e.moda(" },
  {
    label: "e.variancia()",
    detail: "estat — variância σ²",
    insert: "e.variancia(",
  },
  {
    label: "e.desvioPadrao()",
    detail: "estat — desvio σ",
    insert: "e.desvioPadrao(",
  },
  // tabular
  { label: "t.tabela()", detail: "tabular — tabela HTML", insert: "t.tabela(" },
  {
    label: "t.separador()",
    detail: "tabular — linha divisória",
    insert: "t.separador()",
  },
  {
    label: "t.progresso()",
    detail: "tabular — barra de progresso",
    insert: "t.progresso(",
  },
  {
    label: "t.tabelaVerdade()",
    detail: "tabular — tabela-verdade",
    insert: "t.tabelaVerdade(",
  },
  // metodos
  {
    label: "m.lista()",
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
    label: "m.numero()",
    detail: "metodos — objeto numérico",
    insert: "m.numero(",
  },
  {
    label: "m.caracter()",
    detail: "metodos — objeto texto",
    insert: "m.caracter(",
  },
];

let acList = [],
  acIdx = -1,
  acTriggerStart = 0;
const acPopup = document.getElementById("autocomplete-popup");

function getWordBefore(pos) {
  const text = codeEditor.value.slice(0, pos);
  const m = text.match(/[A-Za-zÀ-ÖØ-öø-ÿ_]\w*$/);
  return m ? m[0] : "";
}

// Armazena as variáveis e funções extraídas do código atual
window.simbolosDinamicos = [];
window.assinaturasDinamicas = new Map(); // Guarda: nomeDaFuncao -> [arg1, arg2...]

function extrairSimbolosDoCodigo() {
  const texto = codeEditor.value;
  const novosSimbolos = [];
  window.assinaturasDinamicas.clear();

  // 1. Extrair Variáveis Declaradas
  const varRegex =
    /\b(inteiro|real|caracter|booleano|super)\s+([A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_]*)/g;
  let m;
  while ((m = varRegex.exec(texto)) !== null) {
    const tipo = m[1];
    const nome = m[2];
    novosSimbolos.push({
      label: nome,
      detail: `variável (${tipo})`,
      insert: nome,
    });
  }

  // 2. Extrair Funções Declaradas e seus parâmetros
  const fnRegex =
    /\bfuncao\s+([A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_]*)\s*\(([^)]*)\)/g;
  while ((m = fnRegex.exec(texto)) !== null) {
    const nome = m[1];
    const paramsRaw = m[2];
    novosSimbolos.push({
      label: nome,
      detail: "função do usuário",
      insert: nome + "(",
    });

    // Limpar a string de parâmetros para salvar na assinatura
    const paramsLimpos = paramsRaw
      .split(",")
      .map((p) => p.trim().split(":")[0].trim()) // Remove valores padrão
      .filter((p) => p.length > 0);

    window.assinaturasDinamicas.set(nome, paramsLimpos);
  }

  // Remove duplicatas (caso o usuário tenha digitado o mesmo nome duas vezes em escopos diferentes)
  window.simbolosDinamicos = Array.from(
    new Map(novosSimbolos.map((item) => [item.label, item])).values(),
  );
}

function showAutocomplete() {
  const pos = codeEditor.selectionStart;
  const word = getWordBefore(pos);
  if (word.length < 1) {
    hideAutocomplete();
    return;
  }
  const listaCompleta = [...window.simbolosDinamicos, ...COMPLETIONS];
  acList = listaCompleta.filter((c) =>
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
  acTriggerStart = pos - wordLen;
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

  // Posicionar popup abaixo da linha atual
  const lineHeight = parseFloat(getComputedStyle(codeEditor).lineHeight) || 22;
  const linesBefore = codeEditor.value.slice(0, pos).split("\n");
  const currentLine = linesBefore.length;
  const editorRect = codeEditor.getBoundingClientRect();
  const scrollTop = codeEditor.scrollTop;
  const top =
    editorRect.top + currentLine * lineHeight - scrollTop + lineHeight;
  const left = editorRect.left + 16;

  acPopup.style.top = Math.min(top, window.innerHeight - 200) + "px";
  acPopup.style.left = left + "px";
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
  const newPos = before.length + insert.length;
  codeEditor.selectionStart = codeEditor.selectionEnd = newPos;
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
   TECLADO PRINCIPAL
   ============================================================ */
codeEditor.addEventListener("keydown", function (e) {
  const ta = this,
    val = ta.value;
  const ss = ta.selectionStart,
    se = ta.selectionEnd;

  /* ---- Autocomplete: setas e Tab/Enter ---- */
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

  /* ---- Ctrl + S → Executar ---- */
  if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
    e.preventDefault();
    executarCodigo();
    return;
  }
  /* ---- Ctrl + M → Limpar ---- */
  if (e.ctrlKey && (e.key === "m" || e.key === "M")) {
    e.preventDefault();
    limparConsole();
    return;
  }
  /* ---- F1 → Docs ---- */
  if (e.key === "F1") {
    e.preventDefault();
    toggleHelp();
    return;
  }

  /* ---- Ctrl + Enter → Inserir linha ACIMA ---- */
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault();
    const linhasAntes = val.slice(0, ss).split("\n");
    const linhaAtual = linhasAntes[linhasAntes.length - 1];
    const indent = linhaAtual.match(/^(\s*)/)[1];
    // Início da linha atual
    const inicioLinha = ss - linhaAtual.length;
    ta.value =
      val.slice(0, inicioLinha) + indent + "\n" + val.slice(inicioLinha);
    ta.selectionStart = ta.selectionEnd = inicioLinha + indent.length;
    atualizarEditor();
    return;
  }

  /* ---- Ctrl + ' → Comentar/Descomentar linha(s) ---- */
  if (
    e.ctrlKey &&
    (e.key === "'" || e.key === "Dead" || e.key === "´" || e.keyCode === 222)
  ) {
    e.preventDefault();
    _toggleComment(ta, val, ss, se);
    atualizarEditor();
    return;
  }

  /* ---- Alt + ArrowUp/Down → Mover linha ---- */
  if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
    e.preventDefault();
    _moveLine(ta, val, ss, se, e.key === "ArrowUp" ? -1 : 1);
    atualizarEditor();
    return;
  }

  /* ---- Tab → 4 espaços ---- */
  if (e.key === "Tab" && !e.shiftKey) {
    e.preventDefault();
    if (ss !== se) {
      // Indentar seleção multi-linha
      _indentLines(ta, val, ss, se, 1);
    } else {
      const ins = "    ";
      ta.value = val.slice(0, ss) + ins + val.slice(se);
      ta.selectionStart = ta.selectionEnd = ss + ins.length;
    }
    atualizarEditor();
    return;
  }

  /* ---- Shift + Tab → Remover indentação ---- */
  if (e.key === "Tab" && e.shiftKey) {
    e.preventDefault();
    _indentLines(ta, val, ss, se, -1);
    atualizarEditor();
    return;
  }

  /* ---- Fechar pares automaticamente ---- */
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

  /* ---- Backspace sobre par ---- */
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

  /* ---- Enter → auto-indentação ---- */
  if (e.key === "Enter") {
    e.preventDefault();
    const before = val.slice(0, ss);
    const linhaAtual = before.split("\n").pop();
    const indent = linhaAtual.match(/^(\s*)/)[1];
    const extra = linhaAtual.trimEnd().endsWith("{") ? "    " : "";
    const proxCh = val[ss];
    let ins;
    if (extra && proxCh === "}") {
      ins = "\n" + indent + extra + "\n" + indent;
      ta.value = val.slice(0, ss) + ins + val.slice(se);
      ta.selectionStart = ta.selectionEnd =
        ss + indent.length + extra.length + 1;
    } else {
      ins = "\n" + indent + extra;
      ta.value = val.slice(0, ss) + ins + val.slice(se);
      ta.selectionStart = ta.selectionEnd = ss + ins.length;
    }
    atualizarEditor();
    return;
  }
});

/* ---- Input comum → Autocomplete ---- */
codeEditor.addEventListener("input", () => {
  if (window.linhaComErro) window.limparErroNoEditor();
  extrairSimbolosDoCodigo();
  atualizarEditor();
  showAutocomplete();
  verificarBalaoAssinatura();
});
codeEditor.addEventListener("click", verificarBalaoAssinatura);
codeEditor.addEventListener("keyup", (e) => {
  // Atualiza o balão se o usuário usar as setas de navegação
  if (e.key.startsWith("Arrow")) verificarBalaoAssinatura();
});

/* -------- Helpers de edição -------- */
function _getLineRange(val, ss, se) {
  // retorna {start, end} em chars para cobrir todas as linhas na seleção
  const before = val.slice(0, ss);
  const inicioLinha = before.lastIndexOf("\n") + 1;
  const after = val.slice(se);
  const fimLinha =
    se + (after.indexOf("\n") === -1 ? after.length : after.indexOf("\n"));
  return { start: inicioLinha, end: fimLinha };
}

function _toggleComment(ta, val, ss, se) {
  const { start, end } = _getLineRange(val, ss, se);
  const segmento = val.slice(start, end);
  const linhas = segmento.split("\n");
  const todasComentadas = linhas.every((l) => l.trimStart().startsWith("//"));
  const novas = linhas.map((l) => {
    if (todasComentadas) {
      return l.replace(/^(\s*)\/\/\s?/, "$1");
    } else {
      const ind = l.match(/^(\s*)/)[1];
      return ind + "// " + l.slice(ind.length);
    }
  });
  const novo = novas.join("\n");
  ta.value = val.slice(0, start) + novo + val.slice(end);
  // Reposicionar seleção
  const delta = novo.length - segmento.length;
  ta.selectionStart = ss;
  ta.selectionEnd = Math.max(ss, se + delta);
}

function _indentLines(ta, val, ss, se, dir) {
  const { start, end } = _getLineRange(val, ss, se);
  const segmento = val.slice(start, end);
  const linhas = segmento.split("\n");
  const novas = linhas.map((l) => {
    if (dir === 1) return "    " + l;
    return l.startsWith("    ")
      ? l.slice(4)
      : l.startsWith("\t")
        ? l.slice(1)
        : l.replace(/^ {1,3}/, "");
  });
  const novo = novas.join("\n");
  const delta = novo.length - segmento.length;
  ta.value = val.slice(0, start) + novo + val.slice(end);
  ta.selectionStart = Math.max(start, ss + delta);
  ta.selectionEnd = Math.max(ss, se + delta);
}

function _moveLine(ta, val, ss, se, dir) {
  const linhas = val.split("\n");
  // linha do cursor
  const before = val.slice(0, ss);
  const linhaIdx = before.split("\n").length - 1;
  if (dir === -1 && linhaIdx === 0) return;
  if (dir === 1 && linhaIdx >= linhas.length - 1) return;
  const alvo = linhaIdx + dir;
  [linhas[linhaIdx], linhas[alvo]] = [linhas[alvo], linhas[linhaIdx]];
  // Reconstruir e reposicionar cursor
  const novoVal = linhas.join("\n");
  const inicioAlvo =
    linhas.slice(0, alvo).join("\n").length + (alvo > 0 ? 1 : 0);
  const colAtual = ss - before.lastIndexOf("\n") - 1;
  const novoPosLinha = inicioAlvo + Math.min(colAtual, linhas[alvo].length);
  ta.value = novoVal;
  ta.selectionStart = ta.selectionEnd = novoPosLinha;
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
   SALVAR / ABRIR
   ============================================================ */
function salvarArquivo() {
  const codigo = codeEditor.value;
  const m = extrairMarcadores(codigo);
  let nome =
    (
      m.nome ||
      codeEditor.value.split("\n")[0].replace(/\(.*$/, "").trim() ||
      "algoritmo"
    )
      .replace(/[^a-zA-Z0-9_\-\s]/g, "")
      .trim()
      .replace(/\s+/g, "_") || "algoritmo";
  const blob = new Blob([codigo], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome + ".ide";
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
    codeEditor.value = ev.target.result;
    foldState.clear();
    atualizarEditor();
    codeEditor.focus();
  };
  r.readAsText(file, "UTF-8");
  e.target.value = "";
}

/* ============================================================
   MODAL
   ============================================================ */
function toggleHelp() {
  const m = document.getElementById("help-modal");
  m.classList.toggle("hidden");
  if (!m.classList.contains("hidden")) m.querySelector(".tab-btn").focus();
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
   ATALHOS GLOBAIS
   ============================================================ */
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && (e.key === "s" || e.key === "S")) e.preventDefault();
  if (e.ctrlKey && (e.key === "m" || e.key === "M")) e.preventDefault();
  if (e.key === "F1") e.preventDefault();
  if (e.key === "Escape") {
    if (!document.getElementById("help-modal").classList.contains("hidden"))
      toggleHelp();
    else hideAutocomplete();
  }
});

/*============================================================
    POPUP DE ASSINATURA
     ==========================================================*/
const sigPopup = document.getElementById("signature-popup");

// Um pequeno dicionário com as assinaturas das funções nativas mais usadas
const ASSINATURAS_NATIVAS = {
  imprima: ["conteudo"],
  leia: ["mensagem"],
  raiz: ["x"],
  expo: ["base", "expoente"],
  "m.aleatorio": ["min", "max"],
  "m.log": ["x", "base"],
  "c.limite": ["funcao", "ponto"],
  "c.derivada": ["funcao", "ponto", "ordem"],
  "c.integral": ["funcao", "a", "b"],
  "t.progresso": ["valor", "max"],
  "t.tabelaVerdade": ["expressoes", "variaveis", "mostrarIntermediarias"],
};

function verificarBalaoAssinatura() {
  const pos = codeEditor.selectionStart;
  const text = codeEditor.value;

  let depth = 0;
  let argIndex = 0;
  let fnNameEncontrada = null;

  // Varredura reversa: do cursor para trás
  for (let i = pos - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === ")") depth++;
    else if (ch === "(") {
      depth--;
      if (depth < 0) {
        // Encontramos o '(' que originou a chamada atual!
        // Agora pegamos o nome da função antes dele.
        let start = i - 1;
        while (start >= 0 && /\s/.test(text[start])) start--;
        let end = start;
        while (start >= 0 && /[A-Za-zÀ-ÖØ-öø-ÿ0-9_.]/.test(text[start]))
          start--;
        fnNameEncontrada = text.substring(start + 1, end + 1);
        break;
      }
    } else if (ch === "," && depth === 0) {
      // Conta as vírgulas apenas no nível atual (ignora funções aninhadas)
      argIndex++;
    }
  }

  if (!fnNameEncontrada) {
    sigPopup.classList.add("hidden");
    return;
  }

  // Busca os parâmetros na lista dinâmica ou nativa
  let parametros =
    window.assinaturasDinamicas.get(fnNameEncontrada) ||
    ASSINATURAS_NATIVAS[fnNameEncontrada];

  if (!parametros) {
    sigPopup.classList.add("hidden");
    return;
  }

  renderizarBalaoAssinatura(fnNameEncontrada, parametros, argIndex, pos);
}

function renderizarBalaoAssinatura(nome, params, argAtual, posCursor) {
  if (params.length === 0) params = ["()"];

  let html = `<span class="sig-fn">${nome}</span>(`;
  html += params
    .map((p, idx) => {
      // Se o usuário digitou mais vírgulas do que parâmetros, destaca o último
      const isActive =
        idx === argAtual ||
        (idx === params.length - 1 && argAtual >= params.length);
      return `<span class="sig-arg ${isActive ? "active" : ""}">${p}</span>`;
    })
    .join(", ");
  html += ")";

  sigPopup.innerHTML = html;
  sigPopup.classList.remove("hidden");

  // Posiciona o balão logo acima do cursor
  const lineHeight = parseFloat(getComputedStyle(codeEditor).lineHeight) || 22;
  const linesBefore = codeEditor.value.slice(0, posCursor).split("\n");
  const currentLine = linesBefore.length;
  const editorRect = codeEditor.getBoundingClientRect();
  const scrollTop = codeEditor.scrollTop;

  // Posiciona ligeiramente acima da linha atual
  const top =
    editorRect.top + currentLine * lineHeight - scrollTop - lineHeight;
  const left = editorRect.left + 40; // Deslocamento estimativo

  sigPopup.style.top = top + "px";
  sigPopup.style.left = left + "px";
}

/* ============================================================
   INIT
   ============================================================ */
window.addEventListener("load", () => {
  extrairSimbolosDoCodigo();
  atualizarEditor();
  codeEditor.focus();
  codeEditor.selectionStart = codeEditor.selectionEnd = codeEditor.value.length;
  document
    .getElementById("file-import")
    .addEventListener("change", _onFileImport);
});
