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
  "lançar",
  "erro",
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
const KW_OP = new Set(["e", "ou", "nao", "mod", "em", "na", "no"]);
const KW_IMPORT = new Set(["importar", "como"]);
const KW_FN = new Set([
  // Nativas
  "imprima", "leia", "raiz", "expo",
  // mat — básico
  "abs", "arred", "piso", "teto", "max", "min",
  "sen", "cos", "tan", "arcsen", "arccos", "arctan", "arctan2",
  "senh", "cosh", "tanh", "arcsenh", "arccosh", "arctanh",
  "hipot", "truncar", "grauParaRad", "radParaGrau",
  "ln", "log2", "log10", "log", "aleatorio", "somatorio", "produtorio",
  // tabular
  "separador", "tabela", "progresso", "tabelaVerdade",
  // metodos — estruturas
  "caracter", "lista", "mapa", "conjunto", "numero", "vetor", "matriz",
  // metodos — número
  "sinal", "int", "re", "decimal", "fatorar",
  // metodos — lista / string
  "adicionar", "remover", "obter", "tamanho", "ordenar", "contem",
  "maiusculo", "minusculo", "capitalizar", "inverter", "aparar", "mesclar",
  "transformar", "filtrar", "reduzir", "percorrer",
  // metodos — conjunto
  "uniao", "intersecao", "diferenca", "tem",
  // metodos — mapa
  "definir",
  // metodos — vetor/matriz
  "dimensao", "soma", "subtrair", "escalar", "ponto", "norma",
  "normalizar", "transposta", "mult",
  // calculo
  "limite", "derivada", "integral",
  // estatistica
  "fatorial", "combinacao", "arranjo",
  "media", "mediana", "moda", "variancia", "desvioPadrao",
  // tempo
  "agora", "milisegundos", "medirExecucao", "testeStress",
  // graficos
  "plotar", "dispersao", "superficie3D", "plotarFuncao", "plotarMultiplas",
  "grafico", "pontos", "conica", "relacao", "anotado", "interativo", "serie",
  // probabilidade
  "sortearComPesos", "uniforme", "rolarDados", "monteCarlo", "intervalo",
  // guards/tipo
  "eNumero", "eInteiro", "eReal", "eTexto", "eBooleano", "eLista",
  "eMapa", "eConjunto", "eVetor", "eMatriz", "eVazio", "eIndefinido",
  // algebra
  "vetorial", "angulo", "anguloDeg", "projecao", "saoParalelos", "saoOrtogonais",
  "identidade", "zeros", "determinante", "traco", "inversa", "resolverSistema",
  "distancia", "pontoMedio", "equacaoReta", "distPontoReta", "intersecaoRetas",
  "areaTriangulo", "perimetroTriangulo", "areaCirculo", "perimetroCirculo",
  "pontoCirculo", "equacaoPlano", "distPontoPlano", "saoColineares", "saoCoplanares",
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
  extrairSimbolosDoCodigo(); // sempre atualiza símbolos antes de renderizar
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
  // metodos — estruturas
  { label: "m.lista()", detail: "metodos — lista dinâmica", insert: "m.lista(" },
  { label: "m.mapa()", detail: "metodos — dicionário", insert: "m.mapa()" },
  { label: "m.conjunto()", detail: "metodos — conjunto único", insert: "m.conjunto()" },
  { label: "m.numero()", detail: "metodos — objeto numérico", insert: "m.numero(" },
  { label: "m.caracter()", detail: "metodos — objeto texto", insert: "m.caracter(" },
  { label: "m.vetor()", detail: "metodos — vetor matemático", insert: "m.vetor(" },
  { label: "m.matriz()", detail: "metodos — matriz bidimensional", insert: "m.matriz(" },
  // metodos — métodos de lista
  { label: ".adicionar()", detail: "lista — adiciona elemento", insert: ".adicionar(" },
  { label: ".remover()", detail: "lista — remove por índice/valor", insert: ".remover(" },
  { label: ".obter()", detail: "lista/mapa — obtém valor", insert: ".obter(" },
  { label: ".tamanho()", detail: "lista/string — comprimento", insert: ".tamanho()" },
  { label: ".ordenar()", detail: "lista — ordena in-place", insert: ".ordenar()" },
  { label: ".contem()", detail: "lista — verifica presença", insert: ".contem(" },
  { label: ".inverter()", detail: "lista — inverte ordem", insert: ".inverter()" },
  { label: ".transformar()", detail: "lista — map funcional", insert: ".transformar(" },
  { label: ".filtrar()", detail: "lista — filter funcional", insert: ".filtrar(" },
  { label: ".reduzir()", detail: "lista — reduce funcional", insert: ".reduzir(" },
  { label: ".percorrer()", detail: "lista — forEach funcional", insert: ".percorrer(" },
  { label: ".definir()", detail: "mapa — define chave/valor", insert: ".definir(" },
  // graficos
  { label: "importar graficos como g", detail: "snippet", insert: "importar graficos como g;" },
  { label: "importar graficos.interativo como g", detail: "snippet", insert: "importar graficos.interativo como g;" },
  { label: "g.plotar()", detail: "graficos — plota dados ou função", insert: "g.plotar(" },
  { label: "g.plotarFuncao()", detail: "graficos — plota uma função", insert: "g.plotarFuncao(" },
  { label: "g.plotarMultiplas()", detail: "graficos — plota várias funções", insert: "g.plotarMultiplas(" },
  { label: "g.dispersao()", detail: "graficos — gráfico de dispersão", insert: "g.dispersao(" },
  { label: "g.superficie3D()", detail: "graficos — superfície 3D", insert: "g.superficie3D(" },
  { label: "g.grafico()", detail: "graficos — gráfico composto", insert: "g.grafico(" },
  { label: "g.pontos()", detail: "graficos — plota lista de pontos", insert: "g.pontos(" },
  { label: "g.conica()", detail: "graficos — cônica Ax²+Bxy+Cy²+…", insert: "g.conica(" },
  { label: "g.relacao()", detail: "graficos — relação implícita", insert: "g.relacao(" },
  { label: "g.anotado()", detail: "graficos — função com marcadores", insert: "g.anotado(" },
  { label: "g.interativo.plotar()", detail: "interativo — descreve curva ou pontos", insert: "g.interativo.plotar(" },
  { label: "g.interativo.serie()", detail: "interativo — série discreta em x inteiros", insert: "g.interativo.serie(" },
  { label: "g.interativo.grafico()", detail: "interativo — canvas 2D pan/zoom", insert: "g.interativo.grafico(" },
  // algebra
  { label: "importar algebra como al", detail: "snippet", insert: "importar algebra como al;" },
  { label: "al.vetor()", detail: "algebra — cria vetor", insert: "al.vetor(" },
  { label: "al.matriz()", detail: "algebra — cria matriz", insert: "al.matriz(" },
  { label: "al.soma()", detail: "algebra — soma vetores/matrizes", insert: "al.soma(" },
  { label: "al.subtrair()", detail: "algebra — subtrai vetores/matrizes", insert: "al.subtrair(" },
  { label: "al.escalar()", detail: "algebra — produto por escalar", insert: "al.escalar(" },
  { label: "al.ponto()", detail: "algebra — produto escalar", insert: "al.ponto(" },
  { label: "al.vetorial()", detail: "algebra — produto vetorial 3D", insert: "al.vetorial(" },
  { label: "al.norma()", detail: "algebra — norma de vetor", insert: "al.norma(" },
  { label: "al.normalizar()", detail: "algebra — vetor unitário", insert: "al.normalizar(" },
  { label: "al.transposta()", detail: "algebra — transposta de matriz", insert: "al.transposta(" },
  { label: "al.determinante()", detail: "algebra — det(A)", insert: "al.determinante(" },
  { label: "al.inversa()", detail: "algebra — A⁻¹", insert: "al.inversa(" },
  { label: "al.resolverSistema()", detail: "algebra — resolve Ax=b", insert: "al.resolverSistema(" },
  { label: "al.distancia()", detail: "algebra — distância euclidiana", insert: "al.distancia(" },
  { label: "al.angulo()", detail: "algebra — ângulo entre vetores (rad)", insert: "al.angulo(" },
  { label: "al.anguloDeg()", detail: "algebra — ângulo entre vetores (graus)", insert: "al.anguloDeg(" },
  // tempo
  { label: "importar tempo como tp", detail: "snippet", insert: "importar tempo como tp;" },
  { label: "tp.agora()", detail: "tempo — timestamp atual (ms)", insert: "tp.agora()" },
  { label: "tp.milisegundos()", detail: "tempo — ms desde epoch", insert: "tp.milisegundos()" },
  { label: "tp.medirExecucao()", detail: "tempo — cronometra uma função", insert: "tp.medirExecucao(" },
  // probabilidade
  { label: "importar probabilidade como p", detail: "snippet", insert: "importar probabilidade como p;" },
  { label: "p.sortearComPesos()", detail: "prob — sorteia com pesos", insert: "p.sortearComPesos(" },
  { label: "p.uniforme()", detail: "prob — sorteia uniforme [a,b]", insert: "p.uniforme(" },
  { label: "p.rolarDados()", detail: "prob — simula dado de N faces", insert: "p.rolarDados(" },
  { label: "p.monteCarlo()", detail: "prob — simulação Monte Carlo", insert: "p.monteCarlo(" },
  { label: "p.intervalo()", detail: "prob — intervalo de confiança", insert: "p.intervalo(" },
  // mat — funções extras
  { label: "m.arcsen()", detail: "mat — arcosseno", insert: "m.arcsen(" },
  { label: "m.arccos()", detail: "mat — arcocosseno", insert: "m.arccos(" },
  { label: "m.arctan()", detail: "mat — arcotangente", insert: "m.arctan(" },
  { label: "m.arctan2()", detail: "mat — atan2(y, x)", insert: "m.arctan2(" },
  { label: "m.hipot()", detail: "mat — hipotenusa √(a²+b²)", insert: "m.hipot(" },
  { label: "m.truncar()", detail: "mat — trunca casas decimais", insert: "m.truncar(" },
  { label: "m.grauParaRad()", detail: "mat — converte graus→rad", insert: "m.grauParaRad(" },
  { label: "m.radParaGrau()", detail: "mat — converte rad→graus", insert: "m.radParaGrau(" },
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

  // Remove duplicatas
  window.simbolosDinamicos = Array.from(
    new Map(novosSimbolos.map((item) => [item.label, item])).values(),
  );

  // Sets para highlight de símbolos do usuário
  window._userFnSet  = new Set(window.assinaturasDinamicas.keys());
  window._userVarSet = new Set(
    novosSimbolos.filter((s) => !window.assinaturasDinamicas.has(s.label)).map((s) => s.label),
  );
}

/* ------------------------------------------------------------------ */
/* Itens base: linguagem, snippets, imports de descoberta — sem libs   */
/* ------------------------------------------------------------------ */
const BASE_COMPLETIONS = [
  { label: "inteiro",    detail: "tipo — número inteiro" },
  { label: "real",       detail: "tipo — número decimal" },
  { label: "caracter",   detail: "tipo — texto/string" },
  { label: "booleano",   detail: "tipo — verdadeiro/falso" },
  { label: "super",      detail: "tipo universal" },
  { label: "verdadeiro", detail: "valor booleano" },
  { label: "falso",      detail: "valor booleano" },
  { label: "vazio",      detail: "null — ausência de valor" },
  { label: "indefinido", detail: "undefined" },
  { label: "Infinito",   detail: "∞ positivo" },
  { label: "NegInfinito",detail: "−∞ negativo" },
  { label: "se",         detail: "condicional" },
  { label: "senao",      detail: "condicional" },
  { label: "enquanto",   detail: "laço while" },
  { label: "faca",       detail: "laço do-while" },
  { label: "para",       detail: "laço for" },
  { label: "funcao",     detail: "definição de função" },
  { label: "retorno",    detail: "retorna valor" },
  { label: "quebrar",    detail: "break" },
  { label: "continuar",  detail: "continue" },
  { label: "escolha",    detail: "switch" },
  { label: "caso",       detail: "case" },
  { label: "padrao",     detail: "default" },
  { label: "tentar",     detail: "try" },
  { label: "capturar",   detail: "catch" },
  { label: "importar",   detail: "importar biblioteca" },
  { label: "como",       detail: "alias de importação" },
  { label: "mod",        detail: "resto da divisão" },
  { label: "e",          detail: "lógico AND" },
  { label: "ou",         detail: "lógico OR" },
  { label: "nao",        detail: "lógico NOT" },
  { label: "imprima()",  detail: "saída no console",   insert: "imprima(" },
  { label: "leia()",     detail: "entrada do usuário", insert: "leia(" },
  { label: "raiz()",     detail: "raiz quadrada",      insert: "raiz(" },
  { label: "expo()",     detail: "potência",           insert: "expo(" },
  { label: "se (...) { }",        detail: "snippet", insert: "se () {\n    \n}" },
  { label: "senao se (...)",      detail: "snippet", insert: "senao se () {\n    \n}" },
  { label: "enquanto (...)",      detail: "snippet", insert: "enquanto () {\n    \n}" },
  { label: "faca { } enquanto",   detail: "snippet", insert: "faca {\n    \n} enquanto ();" },
  { label: "para (;;) { }",       detail: "snippet", insert: "para (inteiro i = 0; i < ; i++) {\n    \n}" },
  { label: "funcao nome() { }",   detail: "snippet", insert: "funcao nome() {\n    \n}" },
  { label: "tentar { } capturar", detail: "snippet", insert: "tentar {\n    \n} capturar (erro) {\n    imprima(erro);\n}" },
  // Snippets de importação (visíveis para descoberta)
  { label: "importar mat como m",             detail: "importação", insert: "importar mat como m;" },
  { label: "importar metodos como m",         detail: "importação", insert: "importar metodos como m;" },
  { label: "importar tabular como t",         detail: "importação", insert: "importar tabular como t;" },
  { label: "importar calculo como c",         detail: "importação", insert: "importar calculo como c;" },
  { label: "importar estatistica como e",     detail: "importação", insert: "importar estatistica como e;" },
  { label: "importar graficos como g",        detail: "importação", insert: "importar graficos como g;" },
  { label: "importar graficos.interativo como g", detail: "importação", insert: "importar graficos.interativo como g;" },
  { label: "importar algebra como al",        detail: "importação", insert: "importar algebra como al;" },
  { label: "importar tempo como tp",          detail: "importação", insert: "importar tempo como tp;" },
  { label: "importar probabilidade como p",   detail: "importação", insert: "importar probabilidade como p;" },
  { label: "importar arquivos como arq",      detail: "importação", insert: "importar arquivos como arq;" },
];

/* Definições por biblioteca — usadas para gerar completions contextuais */
const LIB_METHODS = {
  mat: {
    props: [
      { name: "pi", detail: "π" }, { name: "e", detail: "Euler" },
      { name: "E", detail: "constante de Euler" },
      { name: "Infinito", detail: "+∞" }, { name: "NegInfinito", detail: "−∞" },
    ],
    methods: [
      { name: "abs",        args: ["x"],                    detail: "valor absoluto" },
      { name: "arred",      args: ["x","casas?"],           detail: "arredondamento" },
      { name: "piso",       args: ["x"],                    detail: "floor" },
      { name: "teto",       args: ["x"],                    detail: "ceil" },
      { name: "max",        args: ["a","b"],                detail: "maior valor" },
      { name: "min",        args: ["a","b"],                detail: "menor valor" },
      { name: "sen",        args: ["x"],                    detail: "seno (rad)" },
      { name: "cos",        args: ["x"],                    detail: "cosseno (rad)" },
      { name: "tan",        args: ["x"],                    detail: "tangente (rad)" },
      { name: "arcsen",     args: ["x"],                    detail: "arcosseno" },
      { name: "arccos",     args: ["x"],                    detail: "arcocosseno" },
      { name: "arctan",     args: ["x"],                    detail: "arcotangente" },
      { name: "arctan2",    args: ["y","x"],                detail: "atan2(y,x)" },
      { name: "hipot",      args: ["a","b"],                detail: "√(a²+b²)" },
      { name: "ln",         args: ["x"],                    detail: "log natural" },
      { name: "log2",       args: ["x"],                    detail: "log base 2" },
      { name: "log10",      args: ["x"],                    detail: "log base 10" },
      { name: "log",        args: ["x","base"],             detail: "log qualquer base" },
      { name: "truncar",    args: ["x","casas?"],           detail: "trunca decimais" },
      { name: "grauParaRad",args: ["graus"],                detail: "graus→rad" },
      { name: "radParaGrau",args: ["rad"],                  detail: "rad→graus" },
      { name: "aleatorio",  args: ["min","max"],            detail: "int aleatório [min,max]" },
      { name: "somatorio",  args: ["funcao","inicio","fim"],detail: "Σ fn(i)" },
      { name: "produtorio", args: ["funcao","inicio","fim"],detail: "Π fn(i)" },
    ],
  },
  metodos: {
    props: [],
    methods: [
      { name: "lista",    args: ["...items?"], detail: "lista dinâmica" },
      { name: "mapa",     args: [],            detail: "dicionário" },
      { name: "conjunto", args: [],            detail: "conjunto único" },
      { name: "numero",   args: ["valor"],     detail: "objeto numérico" },
      { name: "caracter", args: ["texto"],     detail: "objeto texto" },
      { name: "vetor",    args: ["...vals"],   detail: "vetor matemático" },
      { name: "matriz",   args: ["linhas"],    detail: "matriz 2D" },
    ],
  },
  calculo: {
    props: [],
    methods: [
      { name: "limite",   args: ["funcao","ponto"],          detail: "lim x→p f(x)" },
      { name: "derivada", args: ["funcao","ponto","ordem?"], detail: "f'(x) ordem n" },
      { name: "integral", args: ["funcao","a","b"],          detail: "∫f dx em [a,b]" },
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
      { name: "tabelaVerdade", args: ["expressoes","variaveis","mostrarInter?"], detail: "tabela-verdade" },
    ],
  },
  graficos: {
    props: [],
    methods: [
      { name: "plotar",          args: ["dados","config?"],                      detail: "plota dados ou função" },
      { name: "plotarFuncao",    args: ["fn","intervalo?","opcoes?"],            detail: "plota uma função" },
      { name: "plotarMultiplas", args: ["listaFuncoes","intervalo?","opcoes?"], detail: "várias funções" },
      { name: "dispersao",       args: ["pontos","opcoes?"],                     detail: "dispersão (scatter)" },
      { name: "superficie3D",    args: ["fn","opcoes?"],                         detail: "superfície 3D" },
      { name: "grafico",         args: ["funcoes","opcoes?"],                    detail: "gráfico composto" },
      { name: "pontos",          args: ["lista","opcoes?"],                      detail: "lista de pontos" },
      { name: "conica",          args: ["A","B","C","D","E","F","opcoes?"],      detail: "cônica Ax²+Bxy+…" },
      { name: "relacao",         args: ["rel","opcoes?"],                        detail: "relação implícita" },
      { name: "anotado",         args: ["f","marcadores","opcoes?"],             detail: "função com marcadores" },
    ],
  },
  "graficos.interativo": {
    props: [],
    methods: [
      { name: "plotar",  args: ["dado","opcoes?"],   detail: "descritor de curva ou pontos" },
      { name: "serie",   args: ["funcao","opcoes?"], detail: "série discreta em x inteiros" },
      { name: "grafico", args: ["plotaveis","cfg?"], detail: "canvas 2D pan/zoom" },
    ],
  },
  algebra: {
    props: [],
    methods: [
      { name: "vetor",           args: ["componentes"], detail: "cria vetor" },
      { name: "matriz",          args: ["linhas"],       detail: "cria matriz" },
      { name: "soma",            args: ["a","b"],        detail: "soma vetores/matrizes" },
      { name: "subtrair",        args: ["a","b"],        detail: "subtrai" },
      { name: "escalar",         args: ["k","v"],        detail: "produto por escalar" },
      { name: "ponto",           args: ["a","b"],        detail: "produto escalar ⟨a,b⟩" },
      { name: "vetorial",        args: ["a","b"],        detail: "produto vetorial 3D" },
      { name: "norma",           args: ["v"],            detail: "norma ‖v‖" },
      { name: "normalizar",      args: ["v"],            detail: "vetor unitário" },
      { name: "transposta",      args: ["m"],            detail: "transposta" },
      { name: "determinante",    args: ["m"],            detail: "det(A)" },
      { name: "inversa",         args: ["m"],            detail: "A⁻¹" },
      { name: "resolverSistema", args: ["A","b"],        detail: "resolve Ax=b" },
      { name: "distancia",       args: ["p1","p2"],      detail: "distância euclidiana" },
      { name: "angulo",          args: ["a","b"],        detail: "ângulo (rad)" },
      { name: "anguloDeg",       args: ["a","b"],        detail: "ângulo (graus)" },
      { name: "pontoMedio",      args: ["p1","p2"],      detail: "ponto médio" },
    ],
  },
  tempo: {
    props: [],
    methods: [
      { name: "agora",         args: [],             detail: "timestamp atual em ms" },
      { name: "milisegundos",  args: [],             detail: "ms desde epoch" },
      { name: "medirExecucao", args: ["funcao"],     detail: "cronometra função" },
      { name: "testeStress",   args: ["funcao","n?"],detail: "stress test N iterações" },
    ],
  },
  probabilidade: {
    props: [],
    methods: [
      { name: "sortearComPesos", args: ["itens","pesos"],  detail: "sorteia com pesos" },
      { name: "uniforme",        args: ["a","b"],           detail: "sorteia uniforme [a,b]" },
      { name: "rolarDados",      args: ["faces","qtd?"],   detail: "dado de N faces" },
      { name: "monteCarlo",      args: ["n","funcao"],     detail: "simulação Monte Carlo" },
      { name: "intervalo",       args: ["dados","conf?"],  detail: "intervalo de confiança" },
    ],
  },
  arquivos: {
    props: [],
    methods: [
      { name: "lerCSV",  args: ["texto","opcoes?"], detail: "parseia CSV → lista de mapas" },
      { name: "lerJSON", args: ["texto"],           detail: "parseia JSON → objeto" },
    ],
  },
};

/* Extrai mapa alias→libName das importações do código */
function _parseImports(texto) {
  const imports = {};
  const re = /\bimportar\s+([\w.]+)\s+como\s+([A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_]*)/g;
  let m;
  while ((m = re.exec(texto)) !== null) imports[m[2]] = m[1];
  return imports;
}

/* Gera completions de biblioteca usando os aliases reais */
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

/* Token contextual antes do cursor: suporta alias.metodo e alias.sub.metodo */
function getContextBefore(pos) {
  const text = codeEditor.value.slice(0, pos);
  // nested: "g.interativo.plo" ou "g.interativo."
  let m = text.match(/[A-Za-zÀ-ÖØ-öø-ÿ_]\w*\.[A-Za-zÀ-ÖØ-öø-ÿ_]\w*\.([A-Za-zÀ-ÖØ-öø-ÿ_]\w*)?$/);
  if (m) return { full: m[0], replaceLen: m[0].length };
  // simples: "m.abs" ou "m."
  m = text.match(/[A-Za-zÀ-ÖØ-öø-ÿ_]\w*\.([A-Za-zÀ-ÖØ-öø-ÿ_]\w*)?$/);
  if (m) return { full: m[0], replaceLen: m[0].length };
  // palavra simples
  m = text.match(/[A-Za-zÀ-ÖØ-öø-ÿ_]\w*$/);
  if (m) return { full: m[0], replaceLen: m[0].length };
  return { full: "", replaceLen: 0 };
}

function showAutocomplete() {
  const pos = codeEditor.selectionStart;
  const ctx = getContextBefore(pos);
  if (!ctx.full) { hideAutocomplete(); return; }

  const imports = _parseImports(codeEditor.value);
  const libItems = _buildLibCompletions(imports);
  const all = [...window.simbolosDinamicos, ...BASE_COMPLETIONS, ...libItems];

  acList = all.filter((c) => c.label.toLowerCase().startsWith(ctx.full.toLowerCase()));
  if (!acList.length) { hideAutocomplete(); return; }
  acIdx = 0;
  renderAutocomplete(pos, ctx.replaceLen);
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
  const { replaceLen } = getContextBefore(pos);
  const before = codeEditor.value.slice(0, pos - replaceLen);
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

const ASSINATURAS_NATIVAS = {
  // nativas
  imprima: ["conteudo"],
  leia: ["mensagem"],
  raiz: ["x"],
  expo: ["base", "expoente"],
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

  // Busca os parâmetros: funções do usuário, nativas, ou métodos de biblioteca importada
  const libSigs = _buildLibSignatures(_parseImports(text));
  let parametros =
    window.assinaturasDinamicas.get(fnNameEncontrada) ||
    ASSINATURAS_NATIVAS[fnNameEncontrada] ||
    libSigs[fnNameEncontrada];

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
   AUTOSAVE
   ============================================================ */
const AS_KEY     = "pseudo_autosave_v1";
const AS_EN_KEY  = "pseudo_autosave_enabled";
let _asTimer     = null;

function _asEnabled() {
  return localStorage.getItem(AS_EN_KEY) !== "0";
}

function _asSave() {
  if (!_asEnabled()) return;
  localStorage.setItem(AS_KEY, JSON.stringify({ code: codeEditor.value, ts: Date.now() }));
}

function _asSchedule() {
  clearTimeout(_asTimer);
  _asTimer = setTimeout(_asSave, 1500);
}

function _asUpdateBtn() {
  const btn = document.getElementById("btn-autosave");
  if (!btn) return;
  const on = _asEnabled();
  btn.title = on ? "Autosave ativo — clique para desativar" : "Autosave inativo — clique para ativar";
  btn.classList.toggle("as-on", on);
}

window.toggleAutosave = function () {
  const on = _asEnabled();
  localStorage.setItem(AS_EN_KEY, on ? "0" : "1");
  _asUpdateBtn();
  if (!on) _asSave();
};

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

  _asUpdateBtn();

  // Restaurar autosave se habilitado e houver dados salvos
  if (_asEnabled()) {
    try {
      const saved = JSON.parse(localStorage.getItem(AS_KEY) || "null");
      if (saved && saved.code && saved.code !== codeEditor.value) {
        const dt = new Date(saved.ts).toLocaleString("pt-BR");
        if (confirm(`Há um rascunho salvo automaticamente (${dt}).\nDeseja restaurá-lo?`)) {
          codeEditor.value = saved.code;
          foldState.clear();
          extrairSimbolosDoCodigo();
          atualizarEditor();
        }
      }
    } catch (_) {}
  }
});

// Agendar salvamento a cada input
codeEditor.addEventListener("input", _asSchedule);
