/* ============================================================
   PSEUDO-IDE — compiler.js  v4.0
   Módulos:
     1. Validação de tipos (__vp)
     2. Tradução de erros JS → PT-BR
     3. Rastreamento de linha de erro
     4. Classes internas (Caracter, Lista, Mapa, Conjunto, Numero)
     5. Helpers privados de biblioteca (_fatorial, _listaNum, etc.)
     6. Catálogo de Bibliotecas (mat, tabular, metodos, calculo, estatistica)
     7. I/O global (imprima, leiaAsync, raiz, expo)
     8. Marcadores de projeto
     9. Pré-processador de parâmetros tipados
    10. Tradutor de pseudo-código → JavaScript
    11. Execução (limparConsole, executarCodigo)
   ============================================================ */
"use strict";

/* ============================================================
   0. CONSTANTES GLOBAIS DA LINGUAGEM
   ============================================================ */
const Infinito = Infinity;
const NegInfinito = -Infinity;

/* ============================================================
   1. VALIDAÇÃO DE TIPOS — __vp(valor, tipos, metodo, param)
      tipos: array de strings identificando os tipos aceitos:
        'numero'   → typeof number (incluindo NaN-safe)
        'inteiro'  → number e Number.isInteger
        'texto'    → string (nativo)
        'booleano' → boolean
        'funcao'   → function
        'Lista'    → instância de PseudoLista
        'Conjunto' → instância de PseudoConjunto
        'Caracter' → instância de PseudoCaracter ou string nativa
        'Numero'   → instância de PseudoNumero
   ============================================================ */
function __vp(valor, tipos, metodo, param) {
  const _tipoLegivel = (v) => {
    if (v === null) return "vazio";
    if (v === undefined) return "indefinido";
    if (v instanceof PseudoLista) return "Lista";
    if (v instanceof PseudoConjunto) return "Conjunto";
    if (v instanceof PseudoCaracter) return "Caracter";
    if (v instanceof PseudoNumero) return "Numero";
    if (typeof v === "boolean") return "booleano";
    if (typeof v === "function") return "função";
    if (typeof v === "number") return Number.isInteger(v) ? "inteiro" : "real";
    if (typeof v === "string") return "texto";
    return typeof v;
  };

  const ok = tipos.some((tipo) => {
    switch (tipo) {
      case "numero":
        return typeof valor === "number" && !isNaN(valor);
      case "inteiro":
        return typeof valor === "number" && Number.isInteger(valor);
      case "texto":
        return typeof valor === "string";
      case "booleano":
        return typeof valor === "boolean";
      case "funcao":
        return typeof valor === "function";
      case "Lista":
        return valor instanceof PseudoLista;
      case "Conjunto":
        return valor instanceof PseudoConjunto;
      case "Caracter":
        return valor instanceof PseudoCaracter || typeof valor === "string";
      case "Numero":
        return valor instanceof PseudoNumero;
      default:
        return false;
    }
  });

  if (!ok) {
    const esperado = tipos.join(" ou ");
    const recebido = _tipoLegivel(valor);
    throw new Error(
      `Erro em ${metodo}(): parâmetro '${param}' esperava ${esperado}, ` +
        `mas recebeu ${recebido}` +
        (valor !== null && valor !== undefined
          ? ` (${String(valor).slice(0, 30)})`
          : "") +
        ".",
    );
  }
}

/* ============================================================
   2. TRADUÇÃO DE ERROS JS → PT-BR
   ============================================================ */
function traduzirErroJS(msg) {
  if (!msg) return msg;

  // ReferenceError
  msg = msg.replace(
    /([A-Za-z_$][\w$]*) is not defined/g,
    "Erro de Referência: A variável ou função '$1' não foi declarada.",
  );
  // TypeError — not a function
  msg = msg.replace(
    /([A-Za-z_$][\w$.]*) is not a function/g,
    "Erro de Tipo: '$1' não é uma função válida (talvez esteja faltando importar a biblioteca?).",
  );
  // TypeError — cannot read property
  msg = msg.replace(
    /Cannot read propert(?:y|ies) of (null|undefined)/g,
    "Erro de Referência: Tentativa de acessar uma propriedade de um valor $1 (vazio/indefinido).",
  );
  msg = msg.replace(
    /Cannot read propert(?:y|ies) ['"]([\w$]+)['"] of (null|undefined)/g,
    "Erro de Referência: Tentativa de acessar '$1' em um valor $2.",
  );
  // SyntaxError — unexpected token
  msg = msg.replace(
    /Unexpected token '?(.+?)'?$/,
    "Erro de Sintaxe: Símbolo inesperado '$1'. Verifique parênteses, chaves e ponto-e-vírgula.",
  );
  msg = msg.replace(
    /Unexpected end of input/,
    "Erro de Sintaxe: Código incompleto — falta fechar algum bloco, parêntese ou chave.",
  );
  msg = msg.replace(
    /Unexpected identifier '?(.+?)'?/,
    "Erro de Sintaxe: Identificador inesperado '$1'. Talvez falte um operador ou vírgula.",
  );
  // TypeError — not iterable
  msg = msg.replace(
    /([A-Za-z_$][\w$]*) is not iterable/g,
    "Erro de Tipo: '$1' não pode ser percorrido em um laço (use uma lista ou intervalo).",
  );
  // Stack overflow
  msg = msg.replace(
    /Maximum call stack size exceeded/,
    "Erro de Recursão: O algoritmo entrou em loop infinito ou a recursão é muito profunda.",
  );
  // Division by zero (JS retorna Infinity, não erro — mas pode aparecer em erros manuais)
  msg = msg.replace(/Division by zero/i, "Erro Matemático: Divisão por zero.");
  // Assignment to constant
  msg = msg.replace(
    /Assignment to constant variable\./,
    "Erro de Atribuição: Tentativa de modificar uma variável de valor fixo.",
  );
  // Invalid left-hand side
  msg = msg.replace(
    /Invalid left-hand side in assignment/,
    "Erro de Sintaxe: Lado esquerdo da atribuição inválido (não é possível atribuir a esse valor).",
  );
  return msg;
}

/* ============================================================
   3. RASTREAMENTO DE LINHA DE ERRO
   
   Estratégia:
   - _lastTranslatedCode guarda o código JS final após tradução.
   - O eval envolve o código em 2 linhas de cabeçalho:
       linha 1: (async function __A__(){
       linha 2: try{
       linha 3+: código do usuário (= linha pseudo 1)
   - _extrairLinhaErro lê o número de linha JS do stack trace,
     subtrai o cabeçalho (2 linhas) e então mapeia de volta ao
     pseudocódigo IGNORANDO as linhas injetadas pelo
     processarParametrosTipados (identificáveis pelo prefixo __p_).
   ============================================================ */
let _lastTranslatedCode = ""; // atualizado a cada execução bem-sucedida de traduzirCodigo

const _EVAL_HEADER_LINES = 2; // linhas do wrapper async antes do código do usuário

function _extrairLinhaErro(stack) {
  if (!stack || !_lastTranslatedCode) return null;

  // Padrões de stack trace — do mais específico para o mais genérico
  const padroes = [
    /<anonymous>:(\d+):\d+/, // Chrome / Edge
    /debugger eval code:(\d+):\d+/i, // Firefox
    /eval code:(\d+):\d+/i, // Firefox (variante)
    /Function code:(\d+):\d+/i, // Edge legacy
    /@[^\n@]*:(\d+):\d+/, // Firefox genérico  (@url:L:C)
  ];

  let linhaEval = null;
  for (const re of padroes) {
    const m = stack.match(re);
    if (m) {
      linhaEval = parseInt(m[1]);
      break;
    }
  }
  if (!linhaEval) return null;

  // Linha no corpo traduzido (1-based)
  const bodyLine = linhaEval - _EVAL_HEADER_LINES;
  if (bodyLine <= 0) return null;

  // Mapear linha JS → linha pseudo ignorando linhas injetadas pelo
  // processarParametrosTipados (reconhecidas pelo prefixo __p_).
  const transLines = _lastTranslatedCode.split("\n");
  let pseudoLine = 0;
  const linhasParaVarrer = Math.min(bodyLine, transLines.length);

  for (let i = 0; i < linhasParaVarrer; i++) {
    const t = transLines[i].trim();
    // Linha injetada? (validação de tipo/valor de parâmetro tipado)
    const injetada =
      /^let __p_\w+\s*=/.test(t) ||
      /^if\s*\(\s*__p_\w+\s*===\s*undefined\s*\)/.test(t) ||
      /^if\s*\(\s*!\s*\(__p_\w+/.test(t);
    if (!injetada) pseudoLine++;
  }

  return pseudoLine > 0 ? pseudoLine : null;
}

/* ============================================================
   4. CLASSES INTERNAS
   ============================================================ */

/* --- PseudoCaracter --- */
class PseudoCaracter {
  constructor(v) {
    __vp(
      v,
      ["texto", "numero", "booleano", "Caracter"],
      "metodos.caracter",
      "valor",
    );
    this._v = String(v instanceof PseudoCaracter ? v._v : v);
  }
  maiusculo() {
    return new PseudoCaracter(this._v.toUpperCase());
  }
  minusculo() {
    return new PseudoCaracter(this._v.toLowerCase());
  }
  capitalizar() {
    return new PseudoCaracter(
      this._v.charAt(0).toUpperCase() + this._v.slice(1).toLowerCase(),
    );
  }
  contem(s) {
    __vp(s, ["texto", "Caracter"], "caracter.contem", "s");
    return this._v.includes(String(s));
  }
  tamanho() {
    return this._v.length;
  }
  inverter() {
    return new PseudoCaracter(this._v.split("").reverse().join(""));
  }
  aparar() {
    return new PseudoCaracter(this._v.trim());
  }
  mesclar(s) {
    return new PseudoCaracter(this._v + String(s));
  }
  toString() {
    return this._v;
  }
  valueOf() {
    return this._v;
  }
}

/* --- PseudoLista --- */
class PseudoLista {
  constructor(itens) {
    this._v = [...itens];
  }
  adicionar(item) {
    this._v.push(item);
    return this;
  }
  remover(item) {
    const i = this._v.indexOf(item);
    if (i > -1) this._v.splice(i, 1);
    return this;
  }
  obter(i) {
    __vp(i, ["inteiro"], "lista.obter", "indice");
    if (i < 0 || i >= this._v.length)
      throw new Error(
        `lista.obter(): índice ${i} fora do intervalo [0, ${this._v.length - 1}].`,
      );
    return this._v[i];
  }
  tamanho() {
    return this._v.length;
  }
  ordenar() {
    this._v.sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
    return this;
  }
  contem(item) {
    return this._v.includes(item);
  }
  toString() {
    return "[" + this._v.map(String).join(", ") + "]";
  }
  valueOf() {
    return this._v;
  }
}

/* --- PseudoMapa --- */
class PseudoMapa {
  constructor() {
    this._v = new Map();
  }
  definir(chave, val) {
    this._v.set(chave, val);
    return this;
  }
  obter(chave) {
    return this._v.get(chave);
  }
  remover(chave) {
    this._v.delete(chave);
    return this;
  }
  tem(chave) {
    return this._v.has(chave);
  }
  toString() {
    return "[Mapa]";
  }
}

/* --- PseudoConjunto --- */
class PseudoConjunto {
  constructor() {
    this._v = new Set();
  }
  adicionar(v) {
    this._v.add(v);
    return this;
  }
  remover(v) {
    this._v.delete(v);
    return this;
  }
  tem(v) {
    return this._v.has(v);
  }
  tamanho() {
    return this._v.size;
  }

  uniao(outro) {
    __vp(outro, ["Conjunto"], "conjunto.uniao", "outro");
    const r = new PseudoConjunto();
    this._v.forEach((v) => r._v.add(v));
    outro._v.forEach((v) => r._v.add(v));
    return r;
  }
  intersecao(outro) {
    __vp(outro, ["Conjunto"], "conjunto.intersecao", "outro");
    const r = new PseudoConjunto();
    this._v.forEach((v) => {
      if (outro._v.has(v)) r._v.add(v);
    });
    return r;
  }
  diferenca(outro) {
    __vp(outro, ["Conjunto"], "conjunto.diferenca", "outro");
    const r = new PseudoConjunto();
    this._v.forEach((v) => {
      if (!outro._v.has(v)) r._v.add(v);
    });
    return r;
  }
  toString() {
    return "{" + [...this._v].map(String).join(", ") + "}";
  }
}

/* --- PseudoNumero --- */
class PseudoNumero {
  constructor(v) {
    if (v === true || v === "verdadeiro") {
      this._v = 1;
      return;
    }
    if (v === false || v === "falso") {
      this._v = 0;
      return;
    }
    if (typeof v !== "number" && typeof v !== "string")
      throw new Error(
        `metodos.numero(): não é possível converter ${typeof v} em número.`,
      );
    const n = Number(v);
    if (isNaN(n))
      throw new Error(`metodos.numero(): "${v}" não é um número válido.`);
    this._v = n;
  }

  /** Retorna 1 (positivo), -1 (negativo) ou 0 (zero). */
  sinal() {
    return Math.sign(this._v);
  }

  /** Converte para inteiro truncando (sem arredondar). verdadeiro→1, falso→0. */
  int() {
    return Math.trunc(this._v);
  }

  /** Retorna o valor como número real. */
  re() {
    return this._v;
  }

  /** Arredonda para n casas decimais, retornando um real. */
  decimal(n) {
    __vp(n, ["inteiro"], "numero.decimal", "n");
    if (n < 0) throw new Error("numero.decimal(): n deve ser ≥ 0.");
    return parseFloat(this._v.toFixed(n));
  }

  /**
   * Fatoração em primos.
   * EXIGE que o valor seja um inteiro — não faz truncamento silencioso.
   * modo 0 → Lista de Listas [[base, exp], ...]
   * modo 1 → string formatada "2³ × 3²"
   */
  fatorar(modo = 0) {
    if (!Number.isInteger(this._v))
      throw new Error(
        "Erro em fatorar(): Esperado um número inteiro. " +
          "Se estiver usando um valor real, utilize .int() antes de fatorar. " +
          `(valor atual: ${this._v})`,
      );
    const n = Math.abs(this._v);
    if (n < 2)
      throw new Error(
        `fatorar(): o valor deve ser um inteiro ≥ 2 (recebido: ${this._v}).`,
      );
    if (n > 1e12)
      throw new Error(
        "fatorar(): valor muito grande para fatoração (máx: 10¹²).",
      );

    const fatores = [];
    let rest = n;
    for (let d = 2; d * d <= rest; d++) {
      if (rest % d === 0) {
        let e = 0;
        while (rest % d === 0) {
          e++;
          rest = Math.trunc(rest / d);
        }
        fatores.push([d, e]);
      }
    }
    if (rest > 1) fatores.push([rest, 1]);

    if (modo === 1) {
      const sup = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
      return fatores
        .map(
          ([b, e]) =>
            b +
            String(e)
              .split("")
              .map((d) => sup[+d])
              .join(""),
        )
        .join(" × ");
    }
    return new PseudoLista(fatores.map(([b, e]) => new PseudoLista([b, e])));
  }

  toString() {
    return String(this._v);
  }
  valueOf() {
    return this._v;
  }
}

/* ============================================================
   5. HELPERS PRIVADOS DE BIBLIOTECA
   ============================================================ */

/* Utilitários de console */
function _c() {
  return document.getElementById("console-saida");
}
function _sc() {
  const c = _c();
  c.scrollTop = c.scrollHeight;
}
function _e(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function _vtx(v) {
  if (v === null) return "vazio";
  if (v === undefined) return "indefinido";
  if (v === true) return "verdadeiro";
  if (v === false) return "falso";
  if (v === Infinity) return "Infinito";
  if (v === -Infinity) return "-Infinito";
  return String(v);
}

/* Fatorial puro (helper interno, sem validação — chamadores validam) */
function _fatorial(n) {
  if (n === 0 || n === 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/* Valida que uma PseudoLista existe, não está vazia e só contém números. */
function _validarListaNumerica(lista, metodo) {
  __vp(lista, ["Lista"], metodo, "lista");
  if (lista._v.length === 0)
    throw new Error(`${metodo}(): a lista não pode estar vazia.`);
  lista._v.forEach((v, i) => {
    if (typeof v !== "number")
      throw new Error(
        `${metodo}(): a lista deve conter apenas números. ` +
          `Elemento na posição ${i} é do tipo "${typeof v}" (valor: "${v}").`,
      );
  });
}

/* Renderização de tabela HTML no console */
function _renderizarTabela(cabecalhos, linhas, colorFn = null) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "overflow-x:auto;margin:8px 0;";
  let h =
    `<table style="border-collapse:collapse;font-family:'JetBrains Mono',monospace;` +
    `font-size:12px;min-width:100%;background:#0a0c14;border:1px solid #2a2d40;` +
    `border-radius:4px;overflow:hidden">`;
  h += '<thead><tr style="background:#1a1d28">';
  cabecalhos.forEach((c) => {
    h +=
      `<th style="border-bottom:1px solid #2a2d40;padding:7px 14px;color:#7c83ff;` +
      `text-align:center;font-weight:600;font-size:11px;text-transform:uppercase;` +
      `letter-spacing:.4px">${_e(c)}</th>`;
  });
  h += "</tr></thead><tbody>";
  linhas.forEach((row, ri) => {
    h += `<tr style="background:${ri % 2 ? "rgba(255,255,255,.02)" : "transparent"}">`;
    row.forEach((celula, ci) => {
      const cor = colorFn ? colorFn(celula, ci, ri) : "#d2d6e8";
      h +=
        `<td style="border-bottom:1px solid #1e2135;padding:6px 14px;` +
        `color:${cor};text-align:center;font-weight:${ci === row.length - 1 ? "600" : "400"}"` +
        `>${_e(String(celula))}</td>`;
    });
    h += "</tr>";
  });
  h += "</tbody></table>";
  wrap.innerHTML = h;
  _c().appendChild(wrap);
  _sc();
}

/* ============================================================
   6. CATÁLOGO DE BIBLIOTECAS
   ============================================================ */
const Bibliotecas = {
  /* ================================================================
       mat — Matemática
       ================================================================ */
  mat: {
    get pi() {
      return Math.PI;
    },
    get e() {
      return Math.E;
    },
    get Infinito() {
      return Infinity;
    },
    get NegInfinito() {
      return -Infinity;
    },

    abs: (x) => {
      __vp(x, ["numero"], "mat.abs", "x");
      return Math.abs(x);
    },
    arred: (x) => {
      __vp(x, ["numero"], "mat.arred", "x");
      return Math.round(x);
    },
    piso: (x) => {
      __vp(x, ["numero"], "mat.piso", "x");
      return Math.floor(x);
    },
    teto: (x) => {
      __vp(x, ["numero"], "mat.teto", "x");
      return Math.ceil(x);
    },

    max: (a, b) => {
      __vp(a, ["numero"], "mat.max", "a");
      __vp(b, ["numero"], "mat.max", "b");
      return Math.max(a, b);
    },
    min: (a, b) => {
      __vp(a, ["numero"], "mat.min", "a");
      __vp(b, ["numero"], "mat.min", "b");
      return Math.min(a, b);
    },

    sen: (x) => {
      __vp(x, ["numero"], "mat.sen", "x");
      return Math.sin(x);
    },
    cos: (x) => {
      __vp(x, ["numero"], "mat.cos", "x");
      return Math.cos(x);
    },
    tan: (x) => {
      __vp(x, ["numero"], "mat.tan", "x");
      return Math.tan(x);
    },

    ln: (x) => {
      __vp(x, ["numero"], "mat.ln", "x");
      return Math.log(x);
    },
    log2: (x) => {
      __vp(x, ["numero"], "mat.log2", "x");
      return Math.log2(x);
    },
    log10: (x) => {
      __vp(x, ["numero"], "mat.log10", "x");
      return Math.log10(x);
    },
    log: (x, base) => {
      __vp(x, ["numero"], "mat.log", "x");
      __vp(base, ["numero"], "mat.log", "base");
      if (base <= 0 || base === 1)
        throw new Error("mat.log(): base deve ser > 0 e ≠ 1.");
      return Math.log(x) / Math.log(base);
    },

    aleatorio: (mn, mx) => {
      __vp(mn, ["inteiro"], "mat.aleatorio", "min");
      __vp(mx, ["inteiro"], "mat.aleatorio", "max");
      if (mn > mx)
        throw new Error("mat.aleatorio(): min não pode ser maior que max.");
      return Math.floor(Math.random() * (mx - mn + 1)) + mn;
    },

    somatorio: (fn, mn, mx) => {
      __vp(fn, ["funcao"], "mat.somatorio", "fn");
      __vp(mn, ["numero"], "mat.somatorio", "min");
      __vp(mx, ["numero"], "mat.somatorio", "max");
      let s = 0;
      for (let i = mn; i <= mx; i++) s += fn(i);
      return s;
    },

    produtorio: (fn, mn, mx) => {
      __vp(fn, ["funcao"], "mat.produtorio", "fn");
      __vp(mn, ["numero"], "mat.produtorio", "min");
      __vp(mx, ["numero"], "mat.produtorio", "max");
      let p = 1;
      for (let i = mn; i <= mx; i++) p *= fn(i);
      return p;
    },
  },

  /* ================================================================
       tabular — Saída Visual
       ================================================================ */
  tabular: {
    separador: () => {
      const el = document.createElement("div");
      el.style.cssText =
        "border-top:1px dashed #353850;margin:10px 0;opacity:.7;";
      _c().appendChild(el);
      _sc();
    },

    tabela: (cab, rows) => {
      const norm = (v) =>
        Array.isArray(v) ? v : v instanceof PseudoLista ? v._v : [String(v)];
      _renderizarTabela(norm(cab), norm(rows).map(norm));
    },

    progresso: (val, max) => {
      __vp(val, ["numero"], "tabular.progresso", "valor");
      __vp(max, ["numero"], "tabular.progresso", "max");
      if (max <= 0) throw new Error("tabular.progresso(): max deve ser > 0.");
      const pct = Math.min(1, Math.max(0, val / max));
      const tot = 30,
        ch = Math.round(pct * tot);
      const bar = "█".repeat(ch) + "░".repeat(tot - ch);
      const div = document.createElement("div");
      div.className = "console-line";
      div.innerHTML =
        `<span class="console-line-arrow" aria-hidden="true">›</span>` +
        `<span style="color:#7c83ff">[${bar}] ` +
        `${String(Math.round(pct * 100)).padStart(3, " ")}% ` +
        `(${val}/${max})</span>`;
      _c().appendChild(div);
      _sc();
    },

    /**
     * tabelaVerdade(expressoes, variaveis, mostrarIntermediarias=false)
     *
     *   expressoes          → string única OU Lista de strings com expressões lógicas
     *                         Operadores suportados: e, ou, nao, xou, ->, <->
     *   variaveis           → Lista (ou array) de strings com os nomes das variáveis
     *   mostrarIntermediarias → se verdadeiro, exibe colunas para cada
     *                          sub-expressão entre parênteses
     *
     * Exemplo:
     *   t.tabelaVerdade("(p e q) ou nao r", m.lista("p","q","r"), verdadeiro)
     */
    tabelaVerdade: (expressoes, variaveis, mostrarIntermediarias = false) => {
      // 1. Validar e normalizar variáveis
      let vars = [];
      if (variaveis instanceof PseudoLista) vars = variaveis._v.map(String);
      else if (Array.isArray(variaveis)) vars = variaveis.map(String);
      else
        throw new Error(
          "tabular.tabelaVerdade(): A lista de variáveis é obrigatória no 2º parâmetro " +
            "(ex: m.lista('p', 'q')).",
        );
      if (vars.length === 0)
        throw new Error(
          "tabular.tabelaVerdade(): A lista de variáveis não pode estar vazia.",
        );
      if (vars.length > 8)
        throw new Error(
          "tabular.tabelaVerdade(): Máximo de 8 variáveis permitidas (2⁸ = 256 linhas).",
        );

      // 2. Normalizar expressões (aceita string única ou Lista)
      let exprs_input = [];
      if (expressoes instanceof PseudoLista)
        exprs_input = expressoes._v.map(String);
      else if (Array.isArray(expressoes)) exprs_input = expressoes.map(String);
      else exprs_input = [String(expressoes)];
      if (exprs_input.length === 0)
        throw new Error(
          "tabular.tabelaVerdade(): Nenhuma expressão fornecida.",
        );

      // 3. Extrair sub-expressões entre parênteses (para colunas intermediárias)
      let colunasExpr = [];
      if (mostrarIntermediarias) {
        const subs = new Set();
        exprs_input.forEach((ex) => {
          for (let i = 0; i < ex.length; i++) {
            if (ex[i] === "(") {
              let depth = 1;
              for (let j = i + 1; j < ex.length; j++) {
                if (ex[j] === "(") depth++;
                if (ex[j] === ")") depth--;
                if (depth === 0) {
                  subs.add(ex.substring(i, j + 1).trim());
                  break;
                }
              }
            }
          }
        });
        // Ordena da sub-expressão mais curta para a mais longa (mais interna primeiro)
        colunasExpr = Array.from(subs).sort((a, b) => a.length - b.length);
      }
      // Garante que as expressões principais aparecem no final
      exprs_input.forEach((ex) => {
        if (!colunasExpr.includes(ex.trim())) colunasExpr.push(ex.trim());
      });

      // 4. Compilar uma função avaliadora por coluna de expressão
      const _traduzirExpr = (ex) =>
        ex
          .replace(/<->/g, " === ") // bicondicional
          .replace(/->/g, " <= ") // condicional (p->q ≡ !p||q, mas <= funciona pois booleano 0/1)
          .replace(/\bxou\b/g, " !== ") // ou exclusivo
          .replace(/\bnao\b/g, " ! ")
          .replace(/\be\b/g, " && ")
          .replace(/\bou\b/g, " || ")
          .replace(/\bverdadeiro\b/g, " true ")
          .replace(/\bfalso\b/g, " false ");

      const funcs = colunasExpr.map((ex) => {
        try {
          return new Function(...vars, `return !!(${_traduzirExpr(ex)});`);
        } catch (err) {
          throw new Error(
            `tabular.tabelaVerdade(): Expressão inválida — "${ex}". ` +
              `Verifique a sintaxe lógica. Detalhes: ${err.message}`,
          );
        }
      });

      // 5. Gerar todas as linhas (2ⁿ combinações)
      const n = vars.length;
      const total = Math.pow(2, n);
      const linhas = [];

      for (let i = 0; i < total; i++) {
        const linha = [],
          args = [];
        for (let j = 0; j < n; j++) {
          const val = ((i >> (n - 1 - j)) & 1) === 0; // MSB = primeira variável
          args.push(val);
          linha.push(val ? "V" : "F");
        }
        funcs.forEach((fn) => {
          try {
            linha.push(fn(...args) ? "V" : "F");
          } catch {
            linha.push("?");
          }
        });
        linhas.push(linha);
      }

      // 6. Renderizar com coloração semântica por tipo de coluna
      const cab = [...vars, ...colunasExpr];
      const nVars = vars.length;
      const nInter = colunasExpr.length - exprs_input.length; // colunas intermediárias
      const idxMainStart = nVars + nInter; // início das expressões principais

      const tit = document.createElement("div");
      tit.style.cssText =
        "color:#7c83ff;font-family:var(--font-code);font-size:11px;" +
        "margin:12px 0 4px;text-transform:uppercase;letter-spacing:.4px;";
      tit.textContent = `Tabela-Verdade (${n} variáveis, ${total} linhas)`;
      _c().appendChild(tit);

      const wrapper = document.createElement("div");
      wrapper.style.cssText = "overflow-x:auto;margin:8px 0;";
      let html =
        `<table style="border-collapse:collapse;font-family:'JetBrains Mono',monospace;` +
        `font-size:12px;min-width:100%;background:#0a0c14;border:1px solid #2a2d40;` +
        `border-radius:4px;overflow:hidden">` +
        `<thead><tr style="background:#1a1d28">`;

      cab.forEach((h) => {
        html +=
          `<th style="border-bottom:1px solid #2a2d40;padding:7px 14px;color:#7c83ff;` +
          `text-align:center;font-weight:600;font-size:11px;letter-spacing:0.4px;` +
          `white-space:nowrap">${_e(h)}</th>`;
      });
      html += "</tr></thead><tbody>";

      linhas.forEach((linha, ri) => {
        const bg = ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)";
        html += `<tr style="background:${bg}">`;
        linha.forEach((cel, ci) => {
          const isVar = ci < nVars;
          const isMain = ci >= idxMainStart;
          const isInter = !isVar && !isMain;

          let color = "#d2d6e8";
          let weight = "400";

          if (cel === "V") {
            color = isMain ? "#4ade80" : isVar ? "#d2d6e8" : "#86efac";
            weight = isMain ? "700" : isVar ? "400" : "600";
          } else if (cel === "F") {
            color = isMain ? "#f87171" : isVar ? "#5a6080" : "#fca5a5";
            weight = isMain ? "700" : isVar ? "400" : "600";
          } else if (cel === "?") {
            color = "#fbbf24";
            weight = "600";
          }

          html +=
            `<td style="border-bottom:1px solid #1e2135;padding:6px 14px;` +
            `color:${color};text-align:center;font-weight:${weight};` +
            `white-space:nowrap">${_e(String(cel))}</td>`;
        });
        html += "</tr>";
      });

      html += "</tbody></table>";
      wrapper.innerHTML = html;
      _c().appendChild(wrapper);
      _sc();
    },
  },

  /* ================================================================
       metodos — Estruturas de Dados
       ================================================================ */
  metodos: {
    caracter: (v) => new PseudoCaracter(v),
    inteiro: (v) => {
      const n = parseInt(v, 10);
      if (isNaN(n))
        throw new Error(
          `metodos.inteiro(): "${v}" não pode ser convertido para inteiro.`,
        );
      return n;
    },
    real: (v) => {
      const n = parseFloat(v);
      if (isNaN(n))
        throw new Error(
          `metodos.real(): "${v}" não pode ser convertido para real.`,
        );
      return n;
    },
    lista: (...is) => new PseudoLista(is),
    mapa: () => new PseudoMapa(),
    conjunto: () => new PseudoConjunto(),
    numero: (v) => new PseudoNumero(v),
  },

  /* ================================================================
       calculo — Análise Numérica (apoio a demonstrações)
       Todas as funções exigem que fn seja callable e os pontos numéricos.
       ================================================================ */
  calculo: {
    /**
     * limite(fn, ponto)
     * Calcula o limite de fn quando x → ponto por diferença central.
     * Lança erro se o limite lateral esquerdo e direito divergirem.
     */
    limite: (fn, ponto) => {
      __vp(fn, ["funcao"], "calculo.limite", "fn");
      __vp(ponto, ["numero"], "calculo.limite", "ponto");

      const h = 1e-7;
      const L = fn(ponto - h);
      const R = fn(ponto + h);

      if (typeof L !== "number" || typeof R !== "number")
        throw new Error("calculo.limite(): fn deve retornar um número.");
      if (!isFinite(L) && !isFinite(R)) return L; // Ambos ±Infinity — retorna Infinity/NegInfinito
      if (Math.abs(L - R) > 1e-4)
        throw new Error(
          `calculo.limite(): O limite em ${ponto} não converge.\n` +
            `  Limite pela esquerda ≈ ${L.toFixed(6)}\n` +
            `  Limite pela direita  ≈ ${R.toFixed(6)}`,
        );
      return (L + R) / 2;
    },

    /**
     * derivada(fn, ponto, ordem=1)
     * Derivada numérica de ordem n pelo método de diferenças centrais.
     * Suporta ordens 1 e 2 com fórmulas estáveis; ordens > 2 via recursão (máx: 4).
     */
    derivada: (fn, ponto, ordem = 1) => {
      __vp(fn, ["funcao"], "calculo.derivada", "fn");
      __vp(ponto, ["numero"], "calculo.derivada", "ponto");
      __vp(ordem, ["inteiro"], "calculo.derivada", "ordem");
      if (ordem < 1) throw new Error("calculo.derivada(): ordem deve ser ≥ 1.");
      if (ordem > 4)
        throw new Error(
          "calculo.derivada(): máximo suportado: ordem 4 (precisão numérica).",
        );

      const h = 1e-5;
      if (ordem === 1) {
        return (fn(ponto + h) - fn(ponto - h)) / (2 * h);
      }
      if (ordem === 2) {
        return (fn(ponto + h) - 2 * fn(ponto) + fn(ponto - h)) / (h * h);
      }
      // Ordens 3 e 4 via recursão sobre a derivada de ordem 1
      const fnDeriv = (x) => Bibliotecas.calculo.derivada(fn, x, ordem - 1);
      return Bibliotecas.calculo.derivada(fnDeriv, ponto, 1);
    },

    /**
     * integral(fn, a, b)
     * Integral definida de fn entre a e b pela Regra de Simpson Composta (n=1000).
     * Precisão adequada para fins didáticos.
     */
    integral: (fn, a, b) => {
      __vp(fn, ["funcao"], "calculo.integral", "fn");
      __vp(a, ["numero"], "calculo.integral", "a");
      __vp(b, ["numero"], "calculo.integral", "b");

      if (a === b) return 0;

      const n = 1000; // par, obrigatório para Simpson
      const h = (b - a) / n;
      let soma = fn(a) + fn(b);

      for (let i = 1; i < n; i++) {
        const y = fn(a + i * h);
        if (typeof y !== "number")
          throw new Error("calculo.integral(): fn deve retornar um número.");
        soma += (i % 2 === 0 ? 2 : 4) * y;
      }
      return (h / 3) * soma;
    },
  },

  /* ================================================================
       estatistica — Probabilidade e Análise de Dados
       ================================================================ */
  estatistica: {
    /**
     * fatorial(n) — n! para inteiro n ≥ 0.
     * Máx: n=170 (JavaScript não representa 171! em float64).
     */
    fatorial: (n) => {
      __vp(n, ["inteiro"], "estatistica.fatorial", "n");
      if (n < 0) throw new Error("estatistica.fatorial(): n deve ser ≥ 0.");
      if (n > 170)
        throw new Error("estatistica.fatorial(): n muito grande (máx: 170).");
      return _fatorial(n);
    },

    /**
     * combinacao(n, k) — C(n,k) = n! / (k! × (n-k)!)
     * Exige 0 ≤ k ≤ n, ambos inteiros não-negativos.
     */
    combinacao: (n, k) => {
      __vp(n, ["inteiro"], "estatistica.combinacao", "n");
      __vp(k, ["inteiro"], "estatistica.combinacao", "k");
      if (n < 0 || k < 0)
        throw new Error("estatistica.combinacao(): n e k devem ser ≥ 0.");
      if (k > n)
        throw new Error(
          "estatistica.combinacao(): k não pode ser maior que n.",
        );
      if (n > 170)
        throw new Error("estatistica.combinacao(): n muito grande (máx: 170).");
      return _fatorial(n) / (_fatorial(k) * _fatorial(n - k));
    },

    /**
     * arranjo(n, k) — A(n,k) = n! / (n-k)!
     * Exige 0 ≤ k ≤ n, ambos inteiros não-negativos.
     */
    arranjo: (n, k) => {
      __vp(n, ["inteiro"], "estatistica.arranjo", "n");
      __vp(k, ["inteiro"], "estatistica.arranjo", "k");
      if (n < 0 || k < 0)
        throw new Error("estatistica.arranjo(): n e k devem ser ≥ 0.");
      if (k > n)
        throw new Error("estatistica.arranjo(): k não pode ser maior que n.");
      if (n > 170)
        throw new Error("estatistica.arranjo(): n muito grande (máx: 170).");
      return _fatorial(n) / _fatorial(n - k);
    },

    /**
     * media(lista) — Média aritmética.
     * Exige Lista não-vazia de números.
     */
    media: (lista) => {
      _validarListaNumerica(lista, "estatistica.media");
      return lista._v.reduce((s, v) => s + v, 0) / lista._v.length;
    },

    /**
     * mediana(lista) — Valor central após ordenação.
     * Listas de tamanho par: média dos dois centrais.
     */
    mediana: (lista) => {
      _validarListaNumerica(lista, "estatistica.mediana");
      const s = [...lista._v].sort((a, b) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
    },

    /**
     * moda(lista) — Valor(es) mais frequente(s). Retorna Lista.
     */
    moda: (lista) => {
      _validarListaNumerica(lista, "estatistica.moda");
      const freq = new Map();
      lista._v.forEach((v) => freq.set(v, (freq.get(v) || 0) + 1));
      const maxFreq = Math.max(...freq.values());
      const modas = [];
      freq.forEach((f, v) => {
        if (f === maxFreq) modas.push(v);
      });
      return new PseudoLista(modas);
    },

    /**
     * variancia(lista) — Variância populacional (σ²).
     */
    variancia: (lista) => {
      _validarListaNumerica(lista, "estatistica.variancia");
      const m = Bibliotecas.estatistica.media(lista);
      return (
        lista._v.reduce((s, v) => s + Math.pow(v - m, 2), 0) / lista._v.length
      );
    },

    /**
     * desvioPadrao(lista) — Desvio padrão populacional (σ).
     */
    desvioPadrao: (lista) => {
      return Math.sqrt(Bibliotecas.estatistica.variancia(lista));
    },
  },
};

/* ============================================================
   7. I/O GLOBAL
   ============================================================ */
function imprima(conteudo) {
  const div = document.createElement("div");
  div.className = "console-line";
  const arrow = document.createElement("span");
  arrow.className = "console-line-arrow";
  arrow.textContent = "›";
  arrow.setAttribute("aria-hidden", "true");
  const cnt = document.createElement("span");
  cnt.textContent = _vtx(conteudo);
  div.appendChild(arrow);
  div.appendChild(cnt);
  _c().appendChild(div);
  _sc();
}

function _imprimaErro(erro, linhaUsuario = null) {
  // ── Log completo no console do navegador para depuração ──────────────
  const erroObj = erro instanceof Error ? erro : new Error(String(erro));
  console.warn(
    `%c[Pseudo-IDE] Erro de execução${linhaUsuario ? ` na linha ~${linhaUsuario}` : ""}`,
    "color:#f87171;font-weight:bold",
    "\nMensagem:",
    erroObj.message,
    "\nStack completo:\n" + (erroObj.stack ?? "(não disponível)"),
  );
  // ─────────────────────────────────────────────────────────────────────

  if (linhaUsuario && typeof window.marcarErroNoEditor === "function") {
    window.marcarErroNoEditor(linhaUsuario);
  }

  const div = document.createElement("div");
  div.className = "console-error";
  const rawMsg = erro instanceof Error ? erro.message : String(erro);
  const msg = traduzirErroJS(rawMsg);
  const prefixo = linhaUsuario ? `[Linha ${linhaUsuario}] ` : "";
  div.innerHTML = `<strong>${prefixo}Erro de Execução:</strong> ${_e(msg)}`;
  _c().appendChild(div);
  _sc();
}

function leiaAsync(mensagem) {
  return new Promise((resolve) => {
    if (mensagem !== undefined && mensagem !== "") imprima(mensagem);

    const container = document.createElement("div");
    container.className = "console-input-line";

    const prompt = document.createElement("span");
    prompt.className = "console-input-prompt";
    prompt.textContent = "? ";

    const field = document.createElement("input");
    field.type = "text";
    field.className = "console-input-field";
    field.autocomplete = "off";
    field.spellcheck = false;

    container.appendChild(prompt);
    container.appendChild(field);
    _c().appendChild(container);
    field.focus();
    _sc();

    field.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const raw = field.value;
      field.disabled = true;
      field.style.color = "var(--text-muted)";
      field.style.borderColor = "transparent";
      prompt.style.color = "var(--text-muted)";
      resolve(raw.trim() !== "" && !isNaN(raw) ? parseFloat(raw) : raw);
    });
  });
}

const raiz = (x) => Math.sqrt(x);
const expo = (x, y) => Math.pow(x, y);

/* ============================================================
   8. MARCADORES DE PROJETO
   ============================================================ */
function extrairMarcadores(fonte) {
  const r = { nome: null, autor: null, desc: null, versao: null };
  const re = /@(NOME|AUTOR|DESC|VERSAO)\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(fonte)) !== null) r[m[1].toLowerCase()] = m[2].trim();
  return r;
}
function removerMarcadores(c) {
  return c.replace(/@(?:NOME|AUTOR|DESC|VERSAO)\[[^\]]*\][ \t]*/g, "");
}

/* ============================================================
   9. PRÉ-PROCESSADOR — PARÂMETROS TIPADOS
   
   Converte:
     funcao soma(inteiro(a >= 0), real(b) : 0.0) {
   em:
     function soma(__p_a = undefined, __p_b = 0.0) {
     let a = __p_a; if (a===undefined) throw ...;  if (!(a >= 0)) throw ...;
     let b = __p_b;
   
   A detecção do fim da lista de parâmetros usa escaneamento de
   parênteses aninhados (não regex simples), para que construções
   como inteiro(a >= 0) não interrompam o match no primeiro ")".
   ============================================================ */
function _splitParams(str) {
  // Divide parâmetros respeitando parênteses aninhados
  const parts = [];
  let depth = 0,
    cur = "";
  for (const ch of str) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

function _defVal(val) {
  return val
    .replace(/\bverdadeiro\b/g, "true")
    .replace(/\bfalso\b/g, "false")
    .replace(/\bvazio\b/g, "null");
}

// Regex que localiza "funcao NOME(" — não tenta capturar os parâmetros
// diretamente; eles são extraídos manualmente para suportar aninhamento.
const _FUNCAO_HEADER_RE =
  /\bfuncao\s+([A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_]*)\s*\(/g;

function processarParametrosTipados(codigo) {
  const out = [];
  let cursor = 0;

  _FUNCAO_HEADER_RE.lastIndex = 0; // reset — regex global é reutilizada

  let m;
  while ((m = _FUNCAO_HEADER_RE.exec(codigo)) !== null) {
    const nome = m[1];
    const openIdx = m.index + m[0].length - 1; // posição do '(' de abertura

    // ── 1. Encontrar ')' de fechamento da lista de parâmetros ─────────
    let depth = 1;
    let j = openIdx + 1;
    while (j < codigo.length && depth > 0) {
      if (codigo[j] === "(") depth++;
      if (codigo[j] === ")") depth--;
      j++;
    }
    // j aponta para o caractere DEPOIS do ')'
    const closeIdx = j - 1; // posição do ')' de fechamento
    const paramStr = codigo.slice(openIdx + 1, closeIdx);

    // ── 2. Encontrar o '{' que abre o corpo da função ─────────────────
    let k = j;
    while (k < codigo.length && /[\s\n]/.test(codigo[k])) k++;

    const temBrace = codigo[k] === "{";
    const temParamTipado = /\b(inteiro|real|caracter|booleano)\s*\(/.test(
      paramStr,
    );

    if (!temBrace || !temParamTipado) {
      // Função sem parâmetros tipados — emitir como veio
      // (avança o cursor até depois do '(' para continuar a busca)
      out.push(codigo.slice(cursor, m.index + m[0].length));
      cursor = m.index + m[0].length;
      _FUNCAO_HEADER_RE.lastIndex = cursor;
      continue;
    }

    // ── 3. Processar parâmetros tipados ───────────────────────────────
    const params = _splitParams(paramStr);
    const jsParams = [];
    const validations = [];

    params.forEach((raw) => {
      raw = raw.trim();
      // Padrão: tipo(nome [operador valor]) [: default]
      const pm = raw.match(
        /^(inteiro|real|caracter|booleano)\s*\(\s*([A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_]*)\s*((?:[><=!]{1,2}=?\s*[^)]+?)?)\s*\)\s*(?::\s*(.+))?$/,
      );
      if (pm) {
        const [, , pn, restricao, defVal] = pm;
        const jsDef =
          defVal !== undefined ? _defVal(defVal.trim()) : "__OBRIG__";
        const ip = `__p_${pn}`;
        jsParams.push(
          jsDef === "__OBRIG__" ? `${ip}=undefined` : `${ip}=${jsDef}`,
        );
        let vb = `let ${pn}=${ip};`;
        if (jsDef === "__OBRIG__")
          vb += `\nif(${pn}===undefined)throw new Error("${nome}: parâmetro '${pn}' é obrigatório.");`;
        const r = restricao && restricao.trim();
        if (r) {
          const rJS = r
            .replace(/\bverdadeiro\b/g, "true")
            .replace(/\bfalso\b/g, "false");
          vb += `\nif(!(${pn} ${rJS}))throw new Error("${nome}: '${pn}' deve satisfazer: ${pn} ${r.replace(/"/g, "'")}.");`;
        }
        validations.push(vb);
      } else {
        // Parâmetro sem tipagem dentro de uma lista mista
        jsParams.push(raw);
      }
    });

    // Emite: tudo antes da funcao + substituição
    out.push(codigo.slice(cursor, m.index));
    out.push(
      `function ${nome}(${jsParams.join(", ")}) {\n${validations.join("\n")}`,
    );

    // Avança o cursor para DEPOIS do '{' (já foi consumido na substituição)
    cursor = k + 1;
    _FUNCAO_HEADER_RE.lastIndex = cursor;
  }

  out.push(codigo.slice(cursor));
  return out.join("");
}

/* ============================================================
   10. TRADUTOR  pseudo → JavaScript
   ============================================================ */
function traduzirCodigo(fonte) {
  let c = String(fonte).trimEnd();

  /* 0 — Remover marcadores */
  c = removerMarcadores(c);

  /* 1 — Extrair corpo do wrapper nomeAlgo() { ... } */
  const wm = c.match(
    /^[ \t]*[A-Za-zÀ-ÖØ-öø-ÿ_]\w*[ \t]*\(\s*\)\s*\{([\s\S]*)\}[ \t]*$/,
  );
  if (wm) c = wm[1];

  /* 2 — f-strings: f"texto {expr}" → `texto ${expr}` */
  c = c.replace(
    /f(["'])((?:[^\\]|\\.)*?)\1/g,
    (_, q, body) => "`" + body.replace(/\{([^}]+)\}/g, "${$1}") + "`",
  );

  /* 3 — Proteger literais e comentários */
  const S = "\x00";
  const tks = [];
  const p = (s) => {
    tks.push(s);
    return S + (tks.length - 1) + S;
  };
  c = c.replace(/`(?:[^`\\]|\\.)*`/g, p); // template literals (f-strings convertidas)
  c = c.replace(/"(?:[^"\\]|\\.)*"/g, p); // strings duplas
  c = c.replace(/'(?:[^'\\]|\\.)*'/g, p); // strings simples
  c = c.replace(/\/\*[\s\S]*?\*\//g, p); // comentários /* */
  c = c.replace(/\/\/.*/g, p); // comentários //

  /* 4 — Parâmetros tipados (antes de traduzir 'funcao') */
  c = processarParametrosTipados(c);

  /* 5 — Repetição de string: n * "txt" / "txt" * n */
  const tp = String.raw`\x00\d+\x00`;
  c = c.replace(
    new RegExp(`(${tp})\\s*\\*\\s*([A-Za-z0-9_]+)`, "g"),
    "$1.repeat($2)",
  );
  c = c.replace(
    new RegExp(`([A-Za-z0-9_]+)\\s*\\*\\s*(${tp})`, "g"),
    "$2.repeat($1)",
  );

  /* 6 — Importar bibliotecas */
  c = c.replace(
    /\bimportar\s+([A-Za-z_]\w*)(?:\s+como\s+([A-Za-z_]\w*))?\s*;?/g,
    (_, bib, alias) => `const ${alias || bib}=Bibliotecas['${bib}'];`,
  );

  /* 7 — Tipos de dados (incluindo 'super' → let, o tipo universal) */
  c = c.replace(/\bsuper\b/g, "let"); // tipo universal (como 'any' do TS)
  c = c.replace(/\bbooleano\b/g, "let");
  c = c.replace(/\binteiro\b/g, "let");
  c = c.replace(/\breal\b/g, "let");
  c = c.replace(/\bcaracter\b/g, "let");

  /* 8 — Valores especiais */
  c = c.replace(/(?<!\.)\bverdadeiro\b/g, "true");
  c = c.replace(/(?<!\.)\bfalso\b/g, "false");
  c = c.replace(/(?<!\.)\bvazio\b/g, "null");
  c = c.replace(/(?<!\.)\bindefinido\b/g, "undefined");
  c = c.replace(/(?<!\.)\bInfinito\b/g, "Infinity");
  c = c.replace(/(?<!\.)\bNegInfinito\b/g, "-Infinity");

  /* 9 — Operadores */
  c = c.replace(/\bmod\b/g, "%");
  c = c.replace(/\be\b/g, "&&");
  c = c.replace(/\bou\b/g, "||");
  c = c.replace(/\bnao\b/g, "!");

  /* 10 — Controle de fluxo (senao ANTES de se) */
  c = c.replace(/\bfuncao\b/g, "function");
  c = c.replace(/\bretorno\b/g, "return");
  c = c.replace(/\bquebrar\b/g, "break");
  c = c.replace(/\bcontinuar\b/g, "continue");
  c = c.replace(/\bsenao\b/g, "else");
  c = c.replace(/\bse\b/g, "if");
  c = c.replace(/\bescolha\b/g, "switch");
  c = c.replace(/\bcaso\b/g, "case");
  c = c.replace(/\bpadrao\b/g, "default");
  c = c.replace(/\benquanto\b/g, "while");
  c = c.replace(/\bfaca\b/g, "do");
  c = c.replace(/\bpara\b/g, "for");
  c = c.replace(/\btentar\b/g, "try");
  c = c.replace(/\bcapturar\b/g, "catch");

  /* 11 — I/O assíncrono */
  c = c.replace(/\bleia\b/g, "await leiaAsync");

  /* 12 — Restaurar tokens protegidos */
  c = c.replace(new RegExp(S + "(\\d+)" + S, "g"), (_, i) => tks[parseInt(i)]);

  /* 13 — Guardar código traduzido para mapeamento de linha de erro */
  _lastTranslatedCode = c;

  return c;
}

/* ============================================================
   11. EXECUÇÃO
   ============================================================ */
function limparConsole() {
  if (typeof window.limparErroNoEditor === "function") {
    window.limparErroNoEditor();
  }

  _c().innerHTML =
    '<div class="console-placeholder">' +
    '<span class="placeholder-icon">▶</span>' +
    "Execute seu algoritmo para ver os resultados." +
    "</div>";
  const s = document.getElementById("exec-status");
  if (s) {
    s.textContent = "";
    s.className = "exec-status";
  }
}

async function executarCodigo() {
  limparConsole();
  _c().innerHTML = "";
  const status = document.getElementById("exec-status");

  let traduzido;
  try {
    traduzido = traduzirCodigo(document.getElementById("code-editor").value);
  } catch (erroTrad) {
    console.warn(
      "[Pseudo-IDE] Erro durante a tradução do pseudocódigo:",
      erroTrad,
    );
    _imprimaErro(erroTrad);
    if (status) {
      status.textContent = "erro";
      status.className = "exec-status error";
    }
    return;
  }

  // Log do código traduzido para depuração (visível no DevTools)
  console.groupCollapsed("[Pseudo-IDE] Código JS gerado (expandir para ver)");
  console.log(traduzido);
  console.groupEnd();

  /* Contexto assíncrono:
         linha 1: (async function __A__(){
         linha 2: try{
         linha 3+: código do usuário  ← _EVAL_HEADER_LINES = 2            */
  const ctx =
    `(async function __A__(){\n` +
    `try{\n` +
    `${traduzido}\n` +
    `const __f=document.createElement('div');\n` +
    `__f.className='console-end-marker';\n` +
    `__f.textContent='Execução finalizada com sucesso';\n` +
    `document.getElementById('console-saida').appendChild(__f);\n` +
    `document.getElementById('console-saida').scrollTop=99999;\n` +
    `}catch(__e){\n` +
    `  const __ln=_extrairLinhaErro(__e&&__e.stack);\n` +
    `  _imprimaErro(__e,__ln);\n` +
    `}})();`;

  try {
    await eval(ctx);
    if (status) {
      status.textContent = "OK";
      status.className = "exec-status ok";
    }
  } catch (erroEval) {
    const ln = _extrairLinhaErro(erroEval && erroEval.stack);
    _imprimaErro(erroEval, ln);
    if (status) {
      status.textContent = "erro";
      status.className = "exec-status error";
    }
  }
}
