/* ============================================================
   PSEUDO-IDE — highlight.js
   Syntax-highlight engine shared by the IDE and the Notebook.
   Exports: window.aplicarHighlight(texto) → HTML string
   ============================================================ */
(function () {
  "use strict";

  const KW_TYPE = new Set(["inteiro", "real", "caracter", "booleano", "super"]);
  const KW_CTRL = new Set([
    "se", "senao", "enquanto", "faca", "para", "tentar", "capturar",
    "funcao", "retorno", "quebrar", "continuar", "escolha", "caso",
    "padrao", "lançar", "erro",
  ]);
  const KW_VAL = new Set([
    "verdadeiro", "falso", "vazio", "indefinido", "Infinito", "NegInfinito",
  ]);
  const KW_OP = new Set(["e", "ou", "nao", "mod", "em", "na", "no"]);
  const KW_IMPORT = new Set(["importar", "como"]);
  const KW_FN = new Set([
    "imprima", "leia", "raiz", "expo", "abs", "arred", "piso", "teto",
    "max", "min", "sen", "cos", "tan", "arcsen", "arccos", "arctan",
    "arctan2", "senh", "cosh", "tanh", "arcsenh", "arccosh", "arctanh",
    "hipot", "truncar", "grauParaRad", "radParaGrau", "ln", "log2",
    "log10", "log", "aleatorio", "somatorio", "produtorio", "separador",
    "tabela", "progresso", "tabelaVerdade", "caracter", "lista", "mapa",
    "conjunto", "numero", "vetor", "matriz", "sinal", "int", "re",
    "decimal", "fatorar", "adicionar", "remover", "obter", "tamanho",
    "ordenar", "contem", "maiusculo", "minusculo", "capitalizar",
    "inverter", "aparar", "mesclar", "uniao", "intersecao", "diferenca",
    "tem", "definir", "dimensao", "soma", "subtrair", "escalar", "ponto",
    "norma", "normalizar", "transposta", "mult", "limite", "derivada",
    "integral", "fatorial", "combinacao", "arranjo", "media", "mediana",
    "moda", "variancia", "desvioPadrao", "agora", "milisegundos",
    "medirExecucao", "testeStress",
    // graficos
    "plotar", "dispersao", "superficie3D", "plotarFuncao", "plotarMultiplas",
    "grafico", "pontos", "conica", "relacao", "anotado", "interativo", "serie",
    // probabilidade
    "sortearComPesos", "uniforme", "rolarDados", "monteCarlo", "intervalo",
    // tipos/guard
    "eNumero", "eInteiro", "eReal", "eTexto", "eBooleano", "eLista",
    "eMapa", "eConjunto", "eVetor", "eMatriz", "eVazio", "eIndefinido",
    // algebra
    "vetorial", "angulo", "anguloDeg", "projecao", "saoParalelos",
    "saoOrtogonais", "identidade", "zeros", "determinante", "traco",
    "inversa", "resolverSistema", "distancia", "pontoMedio", "equacaoReta",
    "distPontoReta", "intersecaoRetas", "areaTriangulo",
    "perimetroTriangulo", "areaCirculo", "perimetroCirculo", "pontoCirculo",
    "equacaoPlano", "distPontoPlano", "saoColineares", "saoCoplanares",
    // iteradores de lista
    "transformar", "filtrar", "reduzir", "percorrer",
    // graficos.interativo
    "plotarFuncao", "plotarMultiplas", "grafico", "pontos", "conica",
    "relacao", "anotado", "interativo", "serie",
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
    if (window._userFnSet && window._userFnSet.has(word))
      return `<span class="t-user-fn">${esc(word)}</span>`;
    if (window._userVarSet && window._userVarSet.has(word))
      return `<span class="t-user-var">${esc(word)}</span>`;
    return esc(word);
  }

  function aplicarHighlight(texto) {
    const cpStr =
      typeof window.cpInjetarSwatches === "function"
        ? window.cpInjetarSwatches
        : esc;
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
              `<span class="t-cmt">${esc(l)}</span>${idx < lines.length - 1 ? "\n" : ""}`
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
      // Raw strings: #"..." or #'...'
      if (ch === "#" && i + 1 < len && (texto[i + 1] === '"' || texto[i + 1] === "'")) {
        const q = texto[i + 1];
        let s = "#" + q;
        i += 2;
        while (i < len && texto[i] !== q && texto[i] !== "\n") s += texto[i++];
        if (i < len && texto[i] !== "\n") { s += texto[i++]; }
        html += `<span class="t-str">${esc(s)}</span>`;
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
      if (
        /[0-9]/.test(ch) ||
        (ch === "." && /[0-9]/.test(texto[i + 1] || ""))
      ) {
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

  window.aplicarHighlight = aplicarHighlight;
})();
