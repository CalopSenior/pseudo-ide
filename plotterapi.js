/* ============================================================
   PSEUDO-IDE — runtime.js  v4.3
   Classes internas, bibliotecas, I/O e utilitários.
   Carregado ANTES de compiler.js e editor.js.
   ============================================================ */
"use strict";

/* ============================================================
   0. CONSTANTES GLOBAIS
   ============================================================ */
const Infinito = Infinity;
const NegInfinito = -Infinity;

/* ============================================================
   1. VALIDAÇÃO DE TIPOS — __vp(valor, tipos, metodo, param)
   ============================================================ */
function __vp(valor, tipos, metodo, param) {
  const _leg = (v) => {
    if (v === null) return "vazio";
    if (v === undefined) return "indefinido";
    if (v instanceof PseudoLista) return "Lista";
    if (v instanceof PseudoConjunto) return "Conjunto";
    if (v instanceof PseudoCaracter) return "Caracter";
    if (v instanceof PseudoNumero) return "Numero";
    if (v instanceof PseudoMapa) return "Mapa";
    if (v instanceof PseudoVetor) return "Vetor";
    if (v instanceof PseudoMatriz) return "Matriz";
    if (typeof v === "boolean") return "booleano";
    if (typeof v === "function") return "função";
    if (typeof v === "number") {
      if (isNaN(v)) return "NaN";
      return Number.isInteger(v) ? "inteiro" : "real";
    }
    if (typeof v === "string") return "texto";
    return typeof v;
  };
  const ok = tipos.some((t) => {
    switch (t) {
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
      case "Mapa":
        return valor instanceof PseudoMapa;
      case "Conjunto":
        return valor instanceof PseudoConjunto;
      case "Caracter":
        return valor instanceof PseudoCaracter || typeof valor === "string";
      case "Numero":
        return valor instanceof PseudoNumero;
      case "Vetor":
        return valor instanceof PseudoVetor;
      case "Matriz":
        return valor instanceof PseudoMatriz;
      default:
        return false;
    }
  });
  if (!ok) {
    const rec = _leg(valor);
    const esp = tipos.join(" ou ");
    throw new Error(
      `Erro em ${metodo}(): parâmetro '${param}' esperava ${esp}, mas recebeu ${rec}` +
        (valor !== null && valor !== undefined
          ? ` (${String(valor).slice(0, 30)})`
          : "") +
        ".",
    );
  }
}

/* ============================================================
   1b. VERIFICAÇÃO FORTE DE TIPO — __tc(tipo, nome, valor)
   ============================================================ */
function __tc(tipo, nome, valor) {
  if (valor === undefined || valor === null) return valor;

  const ok = {
    inteiro: (v) => typeof v === "number" && Number.isInteger(v) && isFinite(v),
    real: (v) => typeof v === "number" && !isNaN(v),
    caracter: (v) => typeof v === "string" || v instanceof PseudoCaracter,
    booleano: (v) => typeof v === "boolean",
  };

  const _leg = (v) => {
    if (typeof v === "boolean")
      return `booleano (${v ? "verdadeiro" : "falso"})`;
    if (typeof v === "number") {
      if (!isFinite(v)) return `real (${v > 0 ? "Infinito" : "NegInfinito"})`;
      return Number.isInteger(v) ? `inteiro (${v})` : `real (${v})`;
    }
    if (typeof v === "string") return `caracter ("${v.slice(0, 40)}")`;
    if (v instanceof PseudoLista) return "Lista";
    if (v instanceof PseudoConjunto) return "Conjunto";
    if (v instanceof PseudoCaracter)
      return `Caracter ("${String(v).slice(0, 40)}")`;
    if (v instanceof PseudoNumero) return `Numero (${v})`;
    if (v instanceof PseudoVetor) return "Vetor";
    if (v instanceof PseudoMatriz) return "Matriz";
    return typeof v;
  };

  if (ok[tipo] && !ok[tipo](valor)) {
    throw new Error(
      `Erro de Tipo: variável '${nome}' declarada como ${tipo}, mas recebeu ${_leg(valor)}.\n` +
        `  Dica: ${
          tipo === "inteiro"
            ? "use apenas números sem casas decimais."
            : tipo === "real"
              ? "use números (inteiros ou decimais)."
              : tipo === "caracter"
                ? "use texto entre aspas."
                : "use verdadeiro ou falso."
        }`,
    );
  }
  return valor;
}

/* ============================================================
   1c. LANÇAR ESTRUTURADO — _pseudoLancar
   ============================================================ */
function _pseudoLancar(tipo, mensagem, dadoEntrada, dadoEsperado) {
  const partes = [];
  if (tipo !== undefined && tipo !== null) partes.push(`[${tipo}]`);
  if (mensagem !== undefined && mensagem !== null)
    partes.push(String(mensagem));
  if (dadoEntrada !== undefined)
    partes.push(`| recebido: ${JSON.stringify(dadoEntrada)}`);
  if (dadoEsperado !== undefined)
    partes.push(`| esperado: ${JSON.stringify(dadoEsperado)}`);
  const err = new Error(partes.join(" "));
  err.tipo = tipo;
  err.dadoEntrada = dadoEntrada;
  err.dadoEsperado = dadoEsperado;
  return err;
}

function _ternBool(v) {
  if (typeof v !== 'boolean')
    throw new TypeError(
      `Operador ternário (?): condição deve ser booleano (verdadeiro/falso), mas recebeu ${
        v === null ? 'vazio' : typeof v
      }.`
    );
  return v;
}

/* ============================================================
   2. TRADUÇÃO DE ERROS JS → PT-BR
   ============================================================ */
function traduzirErroJS(msg) {
  if (!msg) return msg;
  msg = msg.replace(
    /([A-Za-z_$][\w$]*) is not defined/g,
    "Erro de Referência: A variável ou função '$1' não foi declarada.",
  );
  msg = msg.replace(
    /([A-Za-z_$][\w$.]*) is not a function/g,
    "Erro de Tipo: '$1' não é uma função válida (talvez falte importar a biblioteca?).",
  );
  msg = msg.replace(
    /Cannot read propert(?:y|ies) of (null|undefined)/g,
    "Erro de Referência: Tentativa de acessar uma propriedade de um valor $1 (vazio/indefinido).",
  );
  msg = msg.replace(
    /Cannot read propert(?:y|ies) ['"]([\w$]+)['"] of (null|undefined)/g,
    "Erro de Referência: Tentativa de acessar '$1' em um valor $2.",
  );
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
  msg = msg.replace(
    /([A-Za-z_$][\w$]*) is not iterable/g,
    "Erro de Tipo: '$1' não pode ser percorrido em um laço — verifique se é uma Lista, Conjunto ou texto.",
  );
  msg = msg.replace(
    /Maximum call stack size exceeded/,
    "Erro de Recursão: O algoritmo entrou em loop infinito ou a recursão é muito profunda.",
  );
  msg = msg.replace(/Division by zero/i, "Erro Matemático: Divisão por zero.");
  msg = msg.replace(
    /Assignment to constant variable\./,
    "Erro de Atribuição: Tentativa de modificar uma variável de valor fixo.",
  );
  msg = msg.replace(
    /Invalid left-hand side in assignment/,
    "Erro de Sintaxe: Lado esquerdo da atribuição inválido.",
  );
  msg = msg.replace(
    /Cannot set propert(?:y|ies) of (null|undefined)/g,
    "Erro de Referência: Tentativa de definir propriedade em valor $1.",
  );
  msg = msg.replace(
    /Invalid array length/,
    "Erro de Intervalo: Tamanho de lista inválido (negativo ou muito grande).",
  );
  msg = msg.replace(
    /RangeError/g,
    "Erro de Intervalo",
  );
  msg = msg.replace(
    /TypeError/g,
    "Erro de Tipo",
  );
  msg = msg.replace(
    /ReferenceError/g,
    "Erro de Referência",
  );
  msg = msg.replace(
    /SyntaxError/g,
    "Erro de Sintaxe",
  );
  return msg;
}

/* ============================================================
   3. RASTREAMENTO DE LINHA DE ERRO
   ============================================================ */
let _lastTranslatedCode = "";
const _EVAL_HEADER_LINES = 2;

function _extrairLinhaErro(stack) {
  if (!stack || !_lastTranslatedCode) return null;
  const padroes = [
    /<anonymous>:(\d+):\d+/,
    /debugger eval code:(\d+):\d+/i,
    /eval code:(\d+):\d+/i,
    /Function code:(\d+):\d+/i,
    /@[^\n@]*:(\d+):\d+/,
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
  const bodyLine = linhaEval - _EVAL_HEADER_LINES;
  if (bodyLine <= 0) return null;
  const transLines = _lastTranslatedCode.split("\n");
  let pseudoLine = 0;
  for (let i = 0; i < Math.min(bodyLine, transLines.length); i++) {
    const t = transLines[i].trim();
    const injetada =
      /^let __p_\w+\s*=/.test(t) ||
      /^if\s*\(\s*__p_\w+\s*===\s*undefined\s*\)/.test(t) ||
      /^if\s*\(\s*!\s*\(__p_\w+/.test(t) ||
      /^(async )?function \w+\(__p_/.test(t) ||
      /^await window\._dbg/.test(t) ||
      t === "" ||
      t === "{" ||
      t === "}";
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
  [Symbol.iterator]() {
    return this._v[Symbol.iterator]();
  }
}

/* --- PseudoLista --- */
class PseudoLista {
  constructor(itens) {
    this._v = [...itens];
    return new Proxy(this, {
      get(t, p)    { return typeof p === "string" && /^\d+$/.test(p) ? t._v[+p] : t[p]; },
      set(t, p, v) { if (typeof p === "string" && /^\d+$/.test(p)) { t._v[+p] = v; return true; } t[p] = v; return true; },
    });
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
  inverter() {
    this._v.reverse();
    return this;
  }
  transformar(fn) {
    const f = _parseFnDisc(fn, "lista.transformar");
    if (f.constructor.name === "AsyncFunction")
      return (async () => new PseudoLista(await Promise.all(this._v.map(f))))();
    return new PseudoLista(this._v.map(f));
  }
  filtrar(predicado) {
    const f = _parseFnDisc(predicado, "lista.filtrar");
    if (f.constructor.name === "AsyncFunction")
      return (async () => {
        const flags = await Promise.all(this._v.map(f));
        return new PseudoLista(this._v.filter((_, i) => flags[i]));
      })();
    return new PseudoLista(this._v.filter(f));
  }
  reduzir(fn, inicial) {
    const f = _parseFnBin(fn, "lista.reduzir");
    if (this._v.length === 0 && inicial === undefined)
      throw new Error("lista.reduzir: lista vazia sem valor inicial.");
    if (f.constructor.name === "AsyncFunction")
      return (async () => {
        let acc = inicial !== undefined ? inicial : this._v[0];
        for (let i = inicial !== undefined ? 0 : 1; i < this._v.length; i++)
          acc = await f(acc, this._v[i]);
        return acc;
      })();
    return inicial !== undefined
      ? this._v.reduce(f, inicial)
      : this._v.reduce(f);
  }
  percorrer(fn) {
    __vp(fn, ["funcao"], "lista.percorrer", "fn");
    if (fn.constructor.name === "AsyncFunction")
      return (async () => {
        for (let i = 0; i < this._v.length; i++) await fn(this._v[i], i);
      })();
    this._v.forEach(fn);
  }
  toString() {
    return "[" + this._v.map(String).join(", ") + "]";
  }
  valueOf() {
    return this._v;
  }
  [Symbol.iterator]() {
    return this._v[Symbol.iterator]();
  }
}

/* --- PseudoMapa --- */
class PseudoMapa {
  constructor() {
    this._v = new Map();
  }
  definir(c, v) {
    this._v.set(c, v);
    return this;
  }
  obter(c) {
    return this._v.get(c);
  }
  remover(c) {
    this._v.delete(c);
    return this;
  }
  tem(c) {
    return this._v.has(c);
  }
  toString() {
    return "[Mapa]";
  }
  [Symbol.iterator]() {
    return this._v.entries();
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
  [Symbol.iterator]() {
    return this._v[Symbol.iterator]();
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
  sinal() {
    return Math.sign(this._v);
  }
  int() {
    return Math.trunc(this._v);
  }
  re() {
    return this._v;
  }
  decimal(n) {
    __vp(n, ["inteiro"], "numero.decimal", "n");
    if (n < 0) throw new Error("numero.decimal(): n deve ser ≥ 0.");
    return parseFloat(this._v.toFixed(n));
  }
  fatorar(modo = 0) {
    if (!Number.isInteger(this._v))
      throw new Error(
        "Erro em fatorar(): Esperado um número inteiro. Se estiver usando um valor real, utilize .int() antes de fatorar.",
      );
    const n = Math.abs(this._v);
    if (n < 2)
      throw new Error(
        `fatorar(): valor deve ser inteiro ≥ 2 (recebido: ${this._v}).`,
      );
    if (n > 1e12) throw new Error("fatorar(): valor muito grande (máx: 10¹²).");
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

/* --- PseudoVetor --- */
class PseudoVetor {
  constructor(componentes) {
    const arr =
      componentes instanceof PseudoLista
        ? componentes._v
        : Array.isArray(componentes)
          ? componentes
          : null;
    if (!arr)
      throw new Error("metodos.vetor(): esperado array ou Lista de números.");
    if (arr.some((v) => typeof v !== "number"))
      throw new Error(
        "metodos.vetor(): todos os componentes devem ser números.",
      );
    this._v = [...arr];
    return new Proxy(this, {
      get(t, p) { return typeof p === "string" && /^\d+$/.test(p) ? t._v[+p] : t[p]; },
    });
  }
  dimensao() {
    return this._v.length;
  }
  obter(i) {
    return this._v[i];
  }
  soma(outro) {
    __vp(outro, ["Vetor"], "vetor.soma", "outro");
    if (this._v.length !== outro._v.length)
      throw new Error("vetor.soma(): dimensões diferentes.");
    return new PseudoVetor(this._v.map((v, i) => v + outro._v[i]));
  }
  subtrair(outro) {
    __vp(outro, ["Vetor"], "vetor.subtrair", "outro");
    if (this._v.length !== outro._v.length)
      throw new Error("vetor.subtrair(): dimensões diferentes.");
    return new PseudoVetor(this._v.map((v, i) => v - outro._v[i]));
  }
  escalar(k) {
    __vp(k, ["numero"], "vetor.escalar", "k");
    return new PseudoVetor(this._v.map((v) => v * k));
  }
  ponto(outro) {
    __vp(outro, ["Vetor"], "vetor.ponto", "outro");
    if (this._v.length !== outro._v.length)
      throw new Error("vetor.ponto(): dimensões diferentes.");
    return this._v.reduce((s, v, i) => s + v * outro._v[i], 0);
  }
  norma() {
    return Math.sqrt(this._v.reduce((s, v) => s + v * v, 0));
  }
  normalizar() {
    const n = this.norma();
    if (n < 1e-14) throw new Error("vetor.normalizar(): vetor nulo.");
    return new PseudoVetor(this._v.map((v) => v / n));
  }
  toString() {
    return "(" + this._v.join(", ") + ")";
  }
  valueOf() {
    return this._v;
  }
  [Symbol.iterator]() {
    return this._v[Symbol.iterator]();
  }
}

/* --- PseudoMatriz --- */
class PseudoMatriz {
  constructor(linhas) {
    const src =
      linhas instanceof PseudoLista
        ? linhas._v
        : Array.isArray(linhas)
          ? linhas
          : null;
    if (!src)
      throw new Error(
        "metodos.matriz(): esperado array 2D ou Lista de Listas/arrays.",
      );
    this._v = src.map((r, ri) => {
      const row = r instanceof PseudoLista ? r._v : Array.isArray(r) ? r : null;
      if (!row)
        throw new Error(`metodos.matriz(): linha ${ri} não é array nem Lista.`);
      return row.map(Number);
    });
    this.linhas = this._v.length;
    this.colunas = this._v[0]?.length || 0;
  }
  obter(i, j) {
    return this._v[i][j];
  }
  soma(outra) {
    __vp(outra, ["Matriz"], "matriz.soma", "outra");
    if (this.linhas !== outra.linhas || this.colunas !== outra.colunas)
      throw new Error("matriz.soma(): dimensões incompatíveis.");
    return new PseudoMatriz(
      this._v.map((r, i) => r.map((v, j) => v + outra._v[i][j])),
    );
  }
  mult(outra) {
    if (outra instanceof PseudoMatriz) {
      if (this.colunas !== outra.linhas)
        throw new Error(
          `matriz.mult(): ${this.linhas}×${this.colunas} × ${outra.linhas}×${outra.colunas} incompatível.`,
        );
      const res = Array.from({ length: this.linhas }, () =>
        Array(outra.colunas).fill(0),
      );
      for (let i = 0; i < this.linhas; i++)
        for (let j = 0; j < outra.colunas; j++)
          for (let k = 0; k < this.colunas; k++)
            res[i][j] += this._v[i][k] * outra._v[k][j];
      return new PseudoMatriz(res);
    }
    if (outra instanceof PseudoVetor) {
      if (this.colunas !== outra._v.length)
        throw new Error("matriz.mult(): dimensões incompatíveis com Vetor.");
      return new PseudoVetor(
        this._v.map((r) => r.reduce((s, v, k) => s + v * outra._v[k], 0)),
      );
    }
    if (typeof outra === "number")
      return new PseudoMatriz(this._v.map((r) => r.map((v) => v * outra)));
    throw new Error(
      "matriz.mult(): argumento inválido. Esperado Matriz, Vetor ou número.",
    );
  }
  transposta() {
    return new PseudoMatriz(
      Array.from({ length: this.colunas }, (_, j) =>
        Array.from({ length: this.linhas }, (_, i) => this._v[i][j]),
      ),
    );
  }
  toString() {
    return (
      "[\n" + this._v.map((r) => "  [" + r.join(", ") + "]").join(",\n") + "\n]"
    );
  }
  [Symbol.iterator]() {
    return this._v[Symbol.iterator]();
  }
}

/* ============================================================
   5. HELPERS PRIVADOS
   ============================================================ */
function _c() {
  return window._nbCurrentCell || document.getElementById("console-saida");
}
function _sc() {
  const c = _c();
  c.scrollTop = c.scrollHeight;
  if (window._nbCurrentCell) {
    // Make output visible as soon as any content is appended
    c.classList.add("nb-has-output");
    const last = c.lastElementChild;
    if (last) last.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
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
function _fatorial(n) {
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
function _validarListaNumerica(lista, metodo) {
  __vp(lista, ["Lista"], metodo, "lista");
  if (lista._v.length === 0)
    throw new Error(`${metodo}(): a lista não pode estar vazia.`);
  lista._v.forEach((v, i) => {
    if (typeof v !== "number")
      throw new Error(
        `${metodo}(): a lista deve conter apenas números. Elemento na posição ${i} é "${typeof v}" (valor: "${v}").`,
      );
  });
}


/* ── Helpers para expressões funcionais em listas ────────────
   _parseFnDisc → converte string de expressão unária em função
                  ex: "*2" → x=>x*2  |  ">0" → x=>x>0  |  fn → fn
   _parseFnBin  → converte string de operador binário em função
                  ex: "+" → (a,x)=>a+x  |  "max" → max(a,x)  |  fn → fn
   ─────────────────────────────────────────────────────────── */
function _parseFnDisc(expr, metodo) {
  if (typeof expr === "function") return expr;
  if (typeof expr !== "string")
    throw new Error(
      `${metodo}: esperava uma função ou expressão como "*2", "/3", "+1", ">0".`,
    );
  const s = expr.trim();
  const m = s.match(/^(\*\*|[+\-*/]|mod|>=|<=|==|!=|>|<)\s*(-?[\d.]+)$/i);
  if (m) {
    const n = Number(m[2]);
    switch (m[1]) {
      case "+":    return (x) => x + n;
      case "-":    return (x) => x - n;
      case "*":    return (x) => x * n;
      case "**":   return (x) => x ** n;
      case "/":    return (x) => x / n;
      case "mod":  return (x) => ((x % n) + n) % n;
      case ">":    return (x) => x > n;
      case "<":    return (x) => x < n;
      case ">=":   return (x) => x >= n;
      case "<=":   return (x) => x <= n;
      case "==":   return (x) => x === n;
      case "!=":   return (x) => x !== n;
    }
  }
  throw new Error(
    `${metodo}: expressão "${s}" não reconhecida. ` +
    `Exemplos: "*2", "/3.14", "+1", "**2", "mod 2", ">0", "<=10", "!=0".`,
  );
}

function _parseFnBin(expr, metodo) {
  if (typeof expr === "function") return expr;
  if (typeof expr !== "string")
    throw new Error(
      `${metodo}: esperava uma função (acumulador, x) => ... ou operador como "+", "*", "max".`,
    );
  switch (expr.trim()) {
    case "+":   return (a, x) => a + x;
    case "-":   return (a, x) => a - x;
    case "*":   return (a, x) => a * x;
    case "max": return (a, x) => (x > a ? x : a);
    case "min": return (a, x) => (x < a ? x : a);
  }
  throw new Error(
    `${metodo}: operador "${expr.trim()}" não reconhecido. Use "+", "-", "*", "max" ou "min".`,
  );
}

/* ============================================================
   6. CATÁLOGO DE BIBLIOTECAS (Motor Polimórfico)
   ============================================================ */
const Bibliotecas = {
  /* ---- mat ---- */
  mat: {
    get pi() {
      return Math.PI;
    },
    get e() {
      return Math.E;
    },
    get E() {
      return Math.E;
    },
    get PI() {
      return Math.PI;
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
    arcsen: (x) => {
      __vp(x, ["numero"], "mat.arcsen", "x");
      if (x < -1 || x > 1) throw new Error(`mat.arcsen(): domínio é [-1, 1], recebeu ${x}.`);
      return Math.asin(x);
    },
    arccos: (x) => {
      __vp(x, ["numero"], "mat.arccos", "x");
      if (x < -1 || x > 1) throw new Error(`mat.arccos(): domínio é [-1, 1], recebeu ${x}.`);
      return Math.acos(x);
    },
    arctan: (x) => {
      __vp(x, ["numero"], "mat.arctan", "x");
      return Math.atan(x);
    },
    arctan2: (y, x) => {
      __vp(y, ["numero"], "mat.arctan2", "y");
      __vp(x, ["numero"], "mat.arctan2", "x");
      return Math.atan2(y, x);
    },
    senh: (x) => {
      __vp(x, ["numero"], "mat.senh", "x");
      return Math.sinh(x);
    },
    cosh: (x) => {
      __vp(x, ["numero"], "mat.cosh", "x");
      return Math.cosh(x);
    },
    tanh: (x) => {
      __vp(x, ["numero"], "mat.tanh", "x");
      return Math.tanh(x);
    },
    arcsenh: (x) => {
      __vp(x, ["numero"], "mat.arcsenh", "x");
      return Math.asinh(x);
    },
    arccosh: (x) => {
      __vp(x, ["numero"], "mat.arccosh", "x");
      if (x < 1) throw new Error(`mat.arccosh(): domínio é [1, ∞), recebeu ${x}.`);
      return Math.acosh(x);
    },
    arctanh: (x) => {
      __vp(x, ["numero"], "mat.arctanh", "x");
      if (x <= -1 || x >= 1) throw new Error(`mat.arctanh(): domínio é (-1, 1), recebeu ${x}.`);
      return Math.atanh(x);
    },
    hipot: (...ns) => {
      ns.forEach((n, i) => __vp(n, ["numero"], "mat.hipot", `n${i + 1}`));
      return Math.hypot(...ns);
    },
    truncar: (x) => {
      __vp(x, ["numero"], "mat.truncar", "x");
      return Math.trunc(x);
    },
    grauParaRad: (g) => {
      __vp(g, ["numero"], "mat.grauParaRad", "g");
      return (g * Math.PI) / 180;
    },
    radParaGrau: (r) => {
      __vp(r, ["numero"], "mat.radParaGrau", "r");
      return (r * 180) / Math.PI;
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
      if (fn.constructor.name === "AsyncFunction")
        return (async () => {
          let s = 0;
          for (let i = mn; i <= mx; i++) s += await fn(i);
          return s;
        })();
      let s = 0;
      for (let i = mn; i <= mx; i++) s += fn(i);
      return s;
    },
    produtorio: (fn, mn, mx) => {
      __vp(fn, ["funcao"], "mat.produtorio", "fn");
      __vp(mn, ["numero"], "mat.produtorio", "min");
      __vp(mx, ["numero"], "mat.produtorio", "max");
      if (fn.constructor.name === "AsyncFunction")
        return (async () => {
          let p = 1;
          for (let i = mn; i <= mx; i++) p *= await fn(i);
          return p;
        })();
      let p = 1;
      for (let i = mn; i <= mx; i++) p *= fn(i);
      return p;
    },
    linspace: (inicio, fim, n) => {
      __vp(inicio, ["numero"], "mat.linspace", "inicio");
      __vp(fim, ["numero"], "mat.linspace", "fim");
      __vp(n, ["inteiro"], "mat.linspace", "n");
      if (n < 2) throw new Error("mat.linspace(): n deve ser ≥ 2.");
      return new PseudoLista(Array.from({length: n}, (_, i) => inicio + i * (fim - inicio) / (n - 1)));
    },

  },

  /* ---- tabular ---- */
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
      const wh = cab instanceof PseudoLista ? cab._v : norm(cab);
      const wr = rows instanceof PseudoLista ? rows._v : norm(rows);
      const wrap = document.createElement("div");
      wrap.style.cssText = "overflow-x:auto;margin:8px 0;";
      let h = `<table style="border-collapse:collapse;font-family:'JetBrains Mono',monospace;font-size:12px;min-width:100%;background:#0a0c14;border:1px solid #2a2d40;border-radius:4px;overflow:hidden">`;
      h += '<thead><tr style="background:#1a1d28">';
      wh.forEach((c) => {
        h += `<th style="border-bottom:1px solid #2a2d40;padding:7px 14px;color:#7c83ff;text-align:center;font-weight:600;font-size:11px;letter-spacing:.4px;white-space:nowrap">${_e(String(c))}</th>`;
      });
      h += "</tr></thead><tbody>";
      wr.forEach((row, ri) => {
        const cells = Array.isArray(row)
          ? row
          : row instanceof PseudoLista
            ? row._v
            : [String(row)];
        h += `<tr style="background:${ri % 2 ? "rgba(255,255,255,.02)" : "transparent"}">`;
        cells.forEach((c) => {
          h += `<td style="border-bottom:1px solid #1e2135;padding:6px 14px;color:#d2d6e8;text-align:center;white-space:nowrap">${_e(String(c))}</td>`;
        });
        h += "</tr>";
      });
      h += "</tbody></table>";
      wrap.innerHTML = h;
      _c().appendChild(wrap);
      _sc();
    },
    progresso: (val, max) => {
      __vp(val, ["numero"], "tabular.progresso", "valor");
      __vp(max, ["numero"], "tabular.progresso", "max");
      if (max <= 0) throw new Error("tabular.progresso(): max deve ser > 0.");
      const pct = Math.min(1, Math.max(0, val / max)),
        ch = Math.round(pct * 30);
      const div = document.createElement("div");
      div.className = "console-line";
      div.innerHTML = `<span class="console-line-arrow" aria-hidden="true">›</span><span style="color:#7c83ff">[${"█".repeat(ch) + "░".repeat(30 - ch)}] ${String(Math.round(pct * 100)).padStart(3, " ")}% (${val}/${max})</span>`;
      _c().appendChild(div);
      _sc();
    },
    tabelaVerdade: (expressoes, variaveis, mostrarInter = false) => {
      let vars = [];
      if (variaveis instanceof PseudoLista) vars = variaveis._v.map(String);
      else if (Array.isArray(variaveis)) vars = variaveis.map(String);
      else
        throw new Error(
          "tabular.tabelaVerdade(): A lista de variáveis é obrigatória no 2º parâmetro.",
        );
      if (!vars.length)
        throw new Error("tabular.tabelaVerdade(): Lista de variáveis vazia.");
      if (vars.length > 8)
        throw new Error("tabular.tabelaVerdade(): Máximo de 8 variáveis.");
      let exprs =
        expressoes instanceof PseudoLista
          ? expressoes._v.map(String)
          : Array.isArray(expressoes)
            ? expressoes.map(String)
            : [String(expressoes)];
      if (!exprs.length)
        throw new Error("tabular.tabelaVerdade(): Nenhuma expressão.");
      let cols = [];
      if (mostrarInter) {
        const subs = new Set();
        exprs.forEach((ex) => {
          for (let i = 0; i < ex.length; i++) {
            if (ex[i] === "(") {
              let d = 1;
              for (let j = i + 1; j < ex.length; j++) {
                if (ex[j] === "(") d++;
                if (ex[j] === ")") d--;
                if (d === 0) {
                  subs.add(ex.substring(i, j + 1).trim());
                  break;
                }
              }
            }
          }
        });
        cols = Array.from(subs).sort((a, b) => a.length - b.length);
      }
      exprs.forEach((ex) => {
        if (!cols.includes(ex.trim())) cols.push(ex.trim());
      });
      const _tx = (ex) =>
        ex
          .replace(/<->/g, " === ")
          .replace(/->/g, " <= ")
          .replace(/\bxou\b/g, " !== ")
          .replace(/\bnao\b/g, " ! ")
          .replace(/\be\b/g, " && ")
          .replace(/\bou\b/g, " || ")
          .replace(/\bverdadeiro\b/g, " true ")
          .replace(/\bfalso\b/g, " false ");
      const funcs = cols.map((ex) => {
        try {
          return new Function(...vars, `return !!(${_tx(ex)});`);
        } catch (err) {
          throw new Error(
            `tabular.tabelaVerdade(): Expressão inválida — "${ex}". ${err.message}`,
          );
        }
      });
      const n = vars.length,
        total = Math.pow(2, n),
        linhas = [];
      for (let i = 0; i < total; i++) {
        const linha = [],
          args = [];
        for (let j = 0; j < n; j++) {
          const val = ((i >> (n - 1 - j)) & 1) === 0;
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
      const cab = [...vars, ...cols],
        nVars = vars.length,
        idxMain = nVars + (cols.length - exprs.length);
      const tit = document.createElement("div");
      tit.style.cssText =
        "color:#7c83ff;font-family:var(--font-code);font-size:11px;margin:12px 0 4px;text-transform:uppercase;letter-spacing:.4px;";
      tit.textContent = `Tabela-Verdade (${n} variáveis, ${total} linhas)`;
      _c().appendChild(tit);
      const wrap = document.createElement("div");
      wrap.style.cssText = "overflow-x:auto;margin:8px 0;";
      let h = `<table style="border-collapse:collapse;font-family:'JetBrains Mono',monospace;font-size:12px;min-width:100%;background:#0a0c14;border:1px solid #2a2d40;border-radius:4px;overflow:hidden"><thead><tr style="background:#1a1d28">`;
      cab.forEach((c) => {
        h += `<th style="border-bottom:1px solid #2a2d40;padding:7px 14px;color:#7c83ff;text-align:center;font-weight:600;font-size:11px;letter-spacing:.4px;white-space:nowrap">${_e(c)}</th>`;
      });
      h += "</tr></thead><tbody>";
      linhas.forEach((linha, ri) => {
        h += `<tr style="background:${ri % 2 === 0 ? "transparent" : "rgba(255,255,255,.02)"}">`;
        linha.forEach((cel, ci) => {
          const isVar = ci < nVars,
            isMain = ci >= idxMain;
          let color = "#d2d6e8",
            weight = "400";
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
          h += `<td style="border-bottom:1px solid #1e2135;padding:6px 14px;color:${color};text-align:center;font-weight:${weight};white-space:nowrap">${_e(String(cel))}</td>`;
        });
        h += "</tr>";
      });
      h += "</tbody></table>";
      wrap.innerHTML = h;
      _c().appendChild(wrap);
      _sc();
    },
  },

  /* ---- metodos ---- */
  metodos: {
    caracter: (v) => new PseudoCaracter(v),
    inteiro: (v) => {
      const n = parseInt(v, 10);
      if (isNaN(n))
        throw new Error(`metodos.inteiro(): "${v}" não pode ser convertido.`);
      return n;
    },
    real: (v) => {
      const n = parseFloat(v);
      if (isNaN(n))
        throw new Error(`metodos.real(): "${v}" não pode ser convertido.`);
      return n;
    },
    lista: function (...is) {
      if (is.length === 1) {
        const x = is[0];
        if (Array.isArray(x))            return new PseudoLista(x);
        if (x instanceof PseudoLista)    return new PseudoLista([...x._v]);
        if (x instanceof PseudoVetor)    return new PseudoLista([...x._v]);
        if (x instanceof PseudoConjunto) return new PseudoLista([...x._v]);
      }
      return new PseudoLista(is);
    },
    mapa: function (...is) {
      const m = new PseudoMapa();
      const _indexar = (arr) => { arr.forEach((v, i) => m._v.set(i, v)); return m; };
      if (is.length === 1) {
        const x = is[0];
        const arr = Array.isArray(x) ? x
          : x instanceof PseudoLista  ? x._v
          : x instanceof PseudoVetor  ? x._v
          : null;
        if (arr) return _indexar(arr);
      } else if (is.length > 1) {
        return _indexar(is);
      }
      return m;
    },
    conjunto: function (...is) {
      const c = new PseudoConjunto();
      if (is.length === 1) {
        const x = is[0];
        const src = Array.isArray(x)            ? x
          : x instanceof PseudoLista             ? x._v
          : x instanceof PseudoVetor             ? [...x._v]
          : x instanceof PseudoConjunto          ? [...x._v]
          : null;
        if (src) { src.forEach(v => c._v.add(v)); return c; }
      }
      is.forEach(v => c._v.add(v));
      return c;
    },
    numero: (v) => new PseudoNumero(v),

    // ── Funções de validação de tipo ──────────────────────────
    eNumero:    (v) => typeof v === "number" && !isNaN(v),
    eInteiro:   (v) => typeof v === "number" && Number.isInteger(v),
    eReal:      (v) => typeof v === "number" && !isNaN(v) && !Number.isInteger(v),
    eTexto:     (v) => typeof v === "string" || v instanceof PseudoCaracter,
    eBooleano:  (v) => typeof v === "boolean",
    eLista:     (v) => v instanceof PseudoLista,
    eMapa:      (v) => v instanceof PseudoMapa,
    eConjunto:  (v) => v instanceof PseudoConjunto,
    eVetor:     (v) => v instanceof PseudoVetor,
    eMatriz:    (v) => v instanceof PseudoMatriz,
    eVazio:     (v) => v === null,
    eIndefinido:(v) => v === undefined,

    vetor: function (componentes) {
      return new PseudoVetor(
        componentes instanceof PseudoLista  ? componentes._v
        : componentes instanceof PseudoVetor ? [...componentes._v]
        : Array.isArray(componentes)         ? componentes
        : [...arguments],
      );
    },
    matriz: (linhas) => new PseudoMatriz(linhas),
  },

  /* ---- calculo ---- */
  calculo: {
    limite: (fn, ponto) => {
      __vp(fn, ["funcao"], "calculo.limite", "fn");
      __vp(ponto, ["numero"], "calculo.limite", "ponto");
      if (fn.constructor.name === "AsyncFunction")
        return (async () => {
          const h = 1e-7,
            L = await fn(ponto - h),
            R = await fn(ponto + h);
          if (typeof L !== "number" || typeof R !== "number")
            throw new Error("calculo.limite(): fn deve retornar um número.");
          if (!isFinite(L) && !isFinite(R)) return L;
          if (Math.abs(L - R) > 1e-4)
            throw new Error("calculo.limite(): diverge.");
          return (L + R) / 2;
        })();
      const h = 1e-7,
        L = fn(ponto - h),
        R = fn(ponto + h);
      if (typeof L !== "number" || typeof R !== "number")
        throw new Error("calculo.limite(): fn deve retornar número.");
      if (!isFinite(L) && !isFinite(R)) return L;
      if (Math.abs(L - R) > 1e-4) throw new Error("calculo.limite(): diverge.");
      return (L + R) / 2;
    },
    derivada: (fn, ponto, ordem = 1) => {
      __vp(fn, ["funcao"], "calculo.derivada", "fn");
      __vp(ponto, ["numero"], "calculo.derivada", "ponto");
      __vp(ordem, ["inteiro"], "calculo.derivada", "ordem");
      if (ordem < 1 || ordem > 4)
        throw new Error("calculo.derivada(): ordem deve ser entre 1 e 4.");
      if (fn.constructor.name === "AsyncFunction")
        return (async () => {
          const f = fn,
            x = ponto;
          if (ordem === 1) {
            const h = 1e-5;
            return ((await f(x + h)) - (await f(x - h))) / (2 * h);
          }
          if (ordem === 2) {
            const h = 1e-4;
            return (
              ((await f(x + h)) - 2 * (await f(x)) + (await f(x - h))) / (h * h)
            );
          }
          if (ordem === 3) {
            const h = 1e-3;
            return (
              ((await f(x + 2 * h)) -
                2 * (await f(x + h)) +
                2 * (await f(x - h)) -
                (await f(x - 2 * h))) /
              (2 * h * h * h)
            );
          }
          if (ordem === 4) {
            const h = 1e-2;
            return (
              ((await f(x + 2 * h)) -
                4 * (await f(x + h)) +
                6 * (await f(x)) -
                4 * (await f(x - h)) +
                (await f(x - 2 * h))) /
              (h * h * h * h)
            );
          }
        })();
      const f = fn,
        x = ponto;
      if (ordem === 1) {
        const h = 1e-5;
        return (f(x + h) - f(x - h)) / (2 * h);
      }
      if (ordem === 2) {
        const h = 1e-4;
        return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
      }
      if (ordem === 3) {
        const h = 1e-3;
        return (
          (f(x + 2 * h) - 2 * f(x + h) + 2 * f(x - h) - f(x - 2 * h)) /
          (2 * h * h * h)
        );
      }
      if (ordem === 4) {
        const h = 1e-2;
        return (
          (f(x + 2 * h) -
            4 * f(x + h) +
            6 * f(x) -
            4 * f(x - h) +
            f(x - 2 * h)) /
          (h * h * h * h)
        );
      }
    },
    integral: (fn, a, b) => {
      __vp(fn, ["funcao"], "calculo.integral", "fn");
      __vp(a, ["numero"], "calculo.integral", "a");
      __vp(b, ["numero"], "calculo.integral", "b");
      if (fn.constructor.name === "AsyncFunction")
        return (async () => {
          if (a === b) return 0;
          const n = 1000,
            h = (b - a) / n;
          let soma = (await fn(a)) + (await fn(b));
          for (let i = 1; i < n; i++) {
            soma += (i % 2 === 0 ? 2 : 4) * (await fn(a + i * h));
          }
          return (h / 3) * soma;
        })();
      if (a === b) return 0;
      const n = 1000,
        h = (b - a) / n;
      let soma = fn(a) + fn(b);
      for (let i = 1; i < n; i++) {
        soma += (i % 2 === 0 ? 2 : 4) * fn(a + i * h);
      }
      return (h / 3) * soma;
    },
    gamma: (x) => {
      __vp(x, ["numero"], "calculo.gamma", "x");
      if (x <= 0 && Number.isInteger(x))
        throw new Error("calculo.gamma(): Não definida para inteiros ≤ 0.");
      if (x < 0.5)
        return (
          Math.PI / (Math.sin(Math.PI * x) * Bibliotecas.calculo.gamma(1 - x))
        );
      x -= 1;
      const p = [
        0.99999999999980993, 676.5203681218851, -1259.1392167224028,
        771.32342877765313, -176.61502916214059, 12.507343278686905,
        -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
      ];
      let a = p[0];
      for (let i = 1; i < p.length; i++) a += p[i] / (x + i);
      const t = x + 7.5;
      return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
    },
    digamma: (x) => {
      __vp(x, ["numero"], "calculo.digamma", "x");
      if (x <= 0 && Number.isInteger(x))
        throw new Error("calculo.digamma(): Não definida para inteiros ≤ 0.");
      if (x < 0)
        return (
          Bibliotecas.calculo.digamma(1 - x) - Math.PI / Math.tan(Math.PI * x)
        );
      let res = 0;
      while (x < 7) {
        res -= 1 / x;
        x++;
      }
      x -= 0.5;
      const invX2 = 1 / (x * x);
      res +=
        Math.log(x) -
        1 / (24 * x * x) +
        invX2 * invX2 * (7 / 960 - (invX2 * 31) / 8064);
      return res;
    },
    zeta: (s) => {
      __vp(s, ["numero"], "calculo.zeta", "s");
      if (s <= 1) throw new Error("calculo.zeta(): Requer s > 1.");
      let sum = 0,
        prev = -1,
        n = 1;
      while (Math.abs(sum - prev) > 1e-15 && n < 100000) {
        prev = sum;
        sum += 1 / Math.pow(n, s);
        n++;
      }
      return sum;
    },
    phi: (n) => {
      __vp(n, ["inteiro"], "calculo.phi", "n");
      if (n < 1) throw new Error("calculo.phi(): Requer n ≥ 1.");
      let res = n;
      for (let p = 2; p * p <= n; ++p) {
        if (n % p === 0) {
          while (n % p === 0) n /= p;
          res -= res / p;
        }
      }
      if (n > 1) res -= res / n;
      return res;
    },
    lambertW: (x) => {
      __vp(x, ["numero"], "calculo.lambertW", "x");
      if (x < -1 / Math.E)
        throw new Error("calculo.lambertW(): Requer x ≥ -1/e.");
      if (x === 0) return 0;
      let w = x < 1 ? x : Math.log(x) - Math.log(Math.log(x));
      for (let i = 0; i < 100; i++) {
        const ew = Math.exp(w);
        const wew = w * ew;
        const wewx = wew - x;
        const w1 = w + 1;
        const step = wewx / (ew * w1 - ((w + 2) * wewx) / (2 * w1));
        w -= step;
        if (Math.abs(step) < 1e-12) break;
      }
      return w;
    },
    taylor: (fn, a, x, n) => {
      __vp(fn, ["funcao"], "calculo.taylor", "fn");
      __vp(a, ["numero"], "calculo.taylor", "a");
      __vp(x, ["numero"], "calculo.taylor", "x");
      __vp(n, ["inteiro"], "calculo.taylor", "n");
      if (n < 0 || n > 4)
        throw new Error("calculo.taylor(): termos devem ser entre 0 e 4.");
      if (fn.constructor.name === "AsyncFunction")
        return (async () => {
          let sum = await fn(a);
          let fat = 1,
            powX = 1;
          for (let k = 1; k <= n; k++) {
            fat *= k;
            powX *= x - a;
            const deriv = await Bibliotecas.calculo.derivada(fn, a, k);
            sum += (deriv / fat) * powX;
          }
          return sum;
        })();
      let sum = fn(a);
      let fat = 1,
        powX = 1;
      for (let k = 1; k <= n; k++) {
        fat *= k;
        powX *= x - a;
        const deriv = Bibliotecas.calculo.derivada(fn, a, k);
        sum += (deriv / fat) * powX;
      }
      return sum;
    },
  },

  /* ---- estatistica ---- */
  estatistica: {
    fatorial: (n) => {
      __vp(n, ["inteiro"], "estatistica.fatorial", "n");
      if (n < 0 || n > 170) throw new Error("fatorial(): 0 ≤ n ≤ 170.");
      return _fatorial(n);
    },
    combinacao: (n, k) => {
      __vp(n, ["inteiro"], "estatistica.combinacao", "n");
      __vp(k, ["inteiro"], "estatistica.combinacao", "k");
      if (n < 0 || k < 0 || k > n || n > 170)
        throw new Error("combinacao(): limites inválidos.");
      return _fatorial(n) / (_fatorial(k) * _fatorial(n - k));
    },
    arranjo: (n, k) => {
      __vp(n, ["inteiro"], "estatistica.arranjo", "n");
      __vp(k, ["inteiro"], "estatistica.arranjo", "k");
      if (n < 0 || k < 0 || k > n || n > 170)
        throw new Error("arranjo(): limites inválidos.");
      return _fatorial(n) / _fatorial(n - k);
    },
    media: (l) => {
      _validarListaNumerica(l, "estatistica.media");
      return l._v.reduce((s, v) => s + v, 0) / l._v.length;
    },
    mediana: (l) => {
      _validarListaNumerica(l, "estatistica.mediana");
      const s = [...l._v].sort((a, b) => a - b),
        m = Math.floor(s.length / 2);
      return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
    },
    moda: (l) => {
      _validarListaNumerica(l, "estatistica.moda");
      const f = new Map();
      l._v.forEach((v) => f.set(v, (f.get(v) || 0) + 1));
      const mx = Math.max(...f.values());
      const md = [];
      f.forEach((v, k) => {
        if (v === mx) md.push(k);
      });
      return new PseudoLista(md);
    },
    variancia: (l) => {
      _validarListaNumerica(l, "estatistica.variancia");
      const m = Bibliotecas.estatistica.media(l);
      return l._v.reduce((s, v) => s + Math.pow(v - m, 2), 0) / l._v.length;
    },
    desvioPadrao: (l) => Math.sqrt(Bibliotecas.estatistica.variancia(l)),
  },

  /* ---- tempo ---- */
  tempo: {
    agora: () => performance.now(),
    milisegundos: () => performance.now(),
    medirExecucao: (fn, ...args) => {
      __vp(fn, ["funcao"], "tempo.medirExecucao", "fn");
      if (fn.constructor.name === "AsyncFunction")
        return (async () => {
          const t0 = performance.now();
          const res = await fn(...args);
          const dt = performance.now() - t0;
          imprima(`⏱ tempo.medirExecucao: ${dt.toFixed(4)} ms`);
          return res;
        })();
      const t0 = performance.now();
      const res = fn(...args);
      const dt = performance.now() - t0;
      imprima(`⏱ tempo.medirExecucao: ${dt.toFixed(4)} ms`);
      return res;
    },
    testeStress: (fn, n_max) => {
      __vp(fn, ["funcao"], "tempo.testeStress", "fn");
      __vp(n_max, ["inteiro"], "tempo.testeStress", "n_max");
      if (n_max < 10)
        throw new Error("tempo.testeStress(): n_max deve ser ≥ 10.");
      const tit = document.createElement("div");
      tit.style.cssText =
        "color:#7c83ff;font-family:var(--font-code);font-size:11px;margin:12px 0 4px;text-transform:uppercase;letter-spacing:.4px;";
      tit.textContent = "Stress Test — Crescimento Empírico";
      _c().appendChild(tit);
      if (fn.constructor.name === "AsyncFunction")
        return (async () => {
          const r = [];
          let n = 10;
          const T = 5000;
          while (n <= n_max) {
            const t0 = performance.now();
            try {
              await fn(n);
            } catch (_) {}
            const dt = performance.now() - t0;
            r.push([n, dt.toFixed(4) + " ms"]);
            if (dt > T) {
              r.push(["…", "abortado"]);
              break;
            }
            n *= 10;
          }
          Bibliotecas.tabular.tabela(["Tamanho (n)", "Tempo"], r);
        })();
      const r = [];
      let n = 10;
      const T = 5000;
      while (n <= n_max) {
        const t0 = performance.now();
        try {
          fn(n);
        } catch (_) {}
        const dt = performance.now() - t0;
        r.push([n, dt.toFixed(4) + " ms"]);
        if (dt > T) {
          r.push(["…", "abortado"]);
          break;
        }
        n *= 10;
      }
      Bibliotecas.tabular.tabela(["Tamanho (n)", "Tempo"], r);
    },
  },

  /* ---- graficos ---- */
  /* ---- graficos ---- */
  graficos: {
    _api: () => {
      if (!window.PlotterAPI)
        throw new Error(
          "graficos: PlotterAPI não encontrada. Certifique-se de que js/plotterApi.js está carregado no index.html.",
        );
      return window.PlotterAPI;
    },
    _inserir: (canvas) => {
      const wrap = document.createElement("div");
      wrap.style.cssText =
        "margin:10px 0;overflow:hidden;border-radius:6px;border:1px solid #2a2d40;";
      wrap.appendChild(canvas);
      _c().appendChild(wrap);
      _sc();
    },
    _opc: (o) => {
      // TRADUTOR: Transforma PseudoMapa em Objeto JS nativo
      if (o instanceof PseudoMapa) return Object.fromEntries(o._v);
      return o || {};
    },
    plotar: (dados, config = {}) => {
      const api = Bibliotecas.graficos._api();
      const tipo = config.tipo || "linha";
      const w = config.largura || 500,
        h = config.altura || 320;
      const titulo = config.titulo || "";
      let canvas = null;
      if (tipo === "linha") {
        const datasets =
          typeof dados === "function"
            ? [{ func: dados, color: "#7c83ff", label: titulo }]
            : dados instanceof PseudoLista
              ? dados._v
              : Array.isArray(dados)
                ? dados
                : [dados];
        canvas = api.multiLineGraph2D(datasets, config.intervalo || [-10, 10], {
          width: w,
          height: h,
          title: titulo,
          theme: "dark",
          legend: true,
        });
      } else if (tipo === "barra") {
        const rots =
          dados.rotulos instanceof PseudoLista
            ? dados.rotulos._v.map(String)
            : Array.isArray(dados.rotulos)
              ? dados.rotulos
              : [];
        const vals =
          dados.valores instanceof PseudoLista
            ? dados.valores._v.map(Number)
            : Array.isArray(dados.valores)
              ? dados.valores
              : [];
        canvas = api.barChart(rots, vals, {
          width: w,
          height: h,
          title: titulo,
          theme: "dark",
        });
      } else if (tipo === "dispersao") {
        // Usa a função de dispersão corrigida abaixo
        Bibliotecas.graficos.dispersao(dados, config);
        return;
      } else if (tipo === "3d") {
        if (typeof dados !== "function")
          throw new Error(
            'graficos.plotar(): tipo "3d" exige uma funcao como dados.',
          );
        canvas = api.graph3D(
          dados,
          config.intervalo || [-5, 5],
          config.intervalo || [-5, 5],
          { width: w, height: h, title: titulo },
        );
      } else {
        throw new Error(
          `graficos.plotar(): tipo "${tipo}" desconhecido. Use: 'linha', 'barra', 'dispersao', '3d'.`,
        );
      }
      if (canvas) Bibliotecas.graficos._inserir(canvas);
    },
    plotarFuncao: (fn, intervalo, opcoes = {}) => {
      __vp(fn, ["funcao"], "graficos.plotarFuncao", "fn");
      const api = Bibliotecas.graficos._api();
      const opc = Bibliotecas.graficos._opc(opcoes);
      const canvas = api.lineGraph2D(fn, intervalo || [-10, 10], {
        width: opc.largura || 500,
        height: opc.altura || 320,
        title: opc.titulo || "",
        theme: "dark",
      });
      Bibliotecas.graficos._inserir(canvas);
    },
    plotarMultiplas: (listaFuncoes, intervalo, opcoes = {}) => {
      __vp(listaFuncoes, ["Lista"], "graficos.plotarMultiplas", "listaFuncoes");
      const api = Bibliotecas.graficos._api();
      const opc = Bibliotecas.graficos._opc(opcoes);
      const cores = [
        "#7c83ff",
        "#4ade80",
        "#f87171",
        "#fbbf24",
        "#c084fc",
        "#38bdf8",
      ];
      const datasets = listaFuncoes._v.map((fn, i) => {
        __vp(
          fn,
          ["funcao"],
          "graficos.plotarMultiplas",
          `função na posição ${i}`,
        );
        return {
          func: fn,
          color: cores[i % cores.length],
          label: opc.legendas
            ? opc.legendas[i] || `f${i + 1}(x)`
            : `f${i + 1}(x)`,
        };
      });
      const canvas = api.multiLineGraph2D(datasets, intervalo || [-10, 10], {
        width: opc.largura || 500,
        height: opc.altura || 320,
        title: opc.titulo || "",
        theme: "dark",
        legend: true,
      });
      Bibliotecas.graficos._inserir(canvas);
    },
    dispersao: (pontos, opcoes = {}) => {
      const api = Bibliotecas.graficos._api();
      const opc = Bibliotecas.graficos._opc(opcoes);
      const pts =
        pontos instanceof PseudoLista
          ? pontos._v
          : Array.isArray(pontos)
            ? pontos
            : [];

      // TRADUTOR: Desempacota para o formato que a PlotterAPI entende
      const ptsProntos = pts.map((p) => {
        let coord = p;
        if (p instanceof PseudoLista || p instanceof PseudoVetor) coord = p._v;
        if (Array.isArray(coord)) return { x: coord[0], y: coord[1] };
        return coord;
      });

      if (ptsProntos.length === 0) return;

      // O SALVA-VIDAS DO EIXO X: Calcula os limites e evita a divisão por zero
      let xMin = Math.min(...ptsProntos.map((p) => p.x));
      let xMax = Math.max(...ptsProntos.map((p) => p.x));

      if (Math.abs(xMax - xMin) < 1e-10) {
        xMin -= 2; // Expande a grelha para a esquerda
        xMax += 2; // Expande a grelha para a direita
      }

      // Em vez de chamar api.scatterPlot(), usamos o motor principal diretamente
      // para conseguirmos injetar o intervalo X corrigido!
      const color = opc.cor || "#a78bfa";
      const canvas = api.multiLineGraph2D(
        [
          {
            points: ptsProntos,
            color: color,
            pointColor: color,
            pointRadius: opc.raio || 2.5, // Raio menor para parecer uma linha contínua
            label: opc.titulo || "",
          },
        ],
        [xMin, xMax],
        {
          width: opc.largura || 500,
          height: opc.altura || 320,
          title: opc.titulo || "",
          theme: "dark",
          pointHover: true,
        },
      );

      Bibliotecas.graficos._inserir(canvas);
    },
    superficie3D: (fn, opcoes = {}) => {
      __vp(fn, ["funcao"], "graficos.superficie3D", "fn");
      const api = Bibliotecas.graficos._api();
      const opc = Bibliotecas.graficos._opc(opcoes);
      const canvas = api.graph3D(
        fn,
        opc.intervalo || [-5, 5],
        opc.intervalo || [-5, 5],
        {
          width: opc.largura || 500,
          height: opc.altura || 380,
          title: opc.titulo || "",
        },
      );
      Bibliotecas.graficos._inserir(canvas);
    },

    // ── HELPER INTERNO ─────────────────────────────────────────────
    // Aceita múltiplos formatos e devolve sempre [{x,y}, ...]
    _extrairPontos: (item, f) => {
      const normUm = (raw) => {
        if (raw instanceof PseudoLista || raw instanceof PseudoVetor) raw = raw._v;
        // PseudoMapa com chaves "x"/"y" → ponto único
        if (raw instanceof PseudoMapa) {
          const x = raw._v.get("x") ?? raw._v.get("X") ?? null;
          const y = raw._v.get("y") ?? raw._v.get("Y") ?? null;
          if (x != null && y != null) return { x: Number(x), y: Number(y) };
          return null;
        }
        // Resultado de método numérico: { root, raiz, x }
        if (raw && typeof raw === "object" && !Array.isArray(raw)) {
          const x = raw.root ?? raw.raiz ?? raw.x ?? null;
          if (x != null) {
            const xN = Number(x);
            return { x: xN, y: raw.y != null ? Number(raw.y) : (f ? f(xN) : 0) };
          }
          return null;
        }
        // [x, y] — par explícito de coordenadas (2 elementos numéricos)
        if (Array.isArray(raw) && raw.length === 2 &&
            typeof raw[0] === "number" && typeof raw[1] === "number") {
          return { x: raw[0], y: raw[1] };
        }
        // número → x-coordenada, y calculado de f
        if (typeof raw === "number" && isFinite(raw)) {
          return { x: raw, y: f ? f(raw) : 0 };
        }
        return null;
      };

      if (item instanceof PseudoLista || item instanceof PseudoVetor) item = item._v;

      // PseudoMapa como fonte de pontos: cada entrada (chave → valor) vira {x, y}
      if (item instanceof PseudoMapa) {
        return [...item._v.entries()].map(([k, v]) => {
          const x = Number(k), y = Number(v);
          return isFinite(x) && isFinite(y) ? { x, y } : null;
        }).filter(Boolean).sort((a, b) => a.x - b.x);
      }

      if (Array.isArray(item)) {
        const first = item[0];
        // Array de arrays/objetos/PseudoListas → lista de pontos
        if (first != null && (Array.isArray(first) ||
            first instanceof PseudoLista || first instanceof PseudoVetor ||
            (typeof first === "object" && !Array.isArray(first)))) {
          return item.map(normUm).filter(Boolean);
        }
        // [number, number] → par de coordenadas explícito
        if (item.length === 2 && typeof item[0] === "number" && typeof item[1] === "number") {
          return [{ x: item[0], y: item[1] }];
        }
        // Lista de números → x-coordenadas, y = f(x)
        if (item.every((v) => typeof v === "number")) {
          return item.map((x) => ({ x, y: f ? f(x) : 0 }));
        }
        return item.map(normUm).filter(Boolean);
      }
      const p = normUm(item);
      return p ? [p] : [];
    },

    // ── GRÁFICO COMPOSTO ────────────────────────────────────────────
    // grafico(funcoes | [f1, f2, ...] | [{funcao, cor, rotulo}, ...], opcoes)
    grafico: (funcoes, opcoes = {}) => {
      const g = Bibliotecas.graficos;
      const api = g._api();
      const opc = g._opc(opcoes);
      const CORES = ["#7c83ff","#4ade80","#f87171","#fbbf24","#c084fc","#38bdf8","#fb923c","#e879f9"];
      const intervalo = opc.intervalo instanceof PseudoLista
        ? opc.intervalo._v : (opc.intervalo || [-10, 10]);
      const legendas = opc.legendas instanceof PseudoLista
        ? opc.legendas._v : (Array.isArray(opc.legendas) ? opc.legendas : []);
      const fns = funcoes instanceof PseudoLista ? funcoes._v
        : typeof funcoes === "function" ? [funcoes]
        : Array.isArray(funcoes) ? funcoes : [funcoes];
      const datasets = fns.map((item, i) => {
        const cor = CORES[i % CORES.length];
        if (typeof item === "function")
          return { func: item, color: cor, label: legendas[i] || `f${i + 1}(x)` };
        const obj = item instanceof PseudoMapa ? Object.fromEntries(item._v)
          : (item && typeof item === "object" ? item : {});
        const fn = obj.funcao || obj.func || obj["function"];
        const ptsSrc = obj.pontos || obj.points;
        return {
          func: typeof fn === "function" ? fn : undefined,
          points: ptsSrc != null ? g._extrairPontos(ptsSrc, fn || null) : undefined,
          color: obj.cor || obj.color || cor,
          label: obj.rotulo || obj.label || legendas[i] || `série${i + 1}`,
          pointRadius: obj.raio || obj.pointRadius || 4,
        };
      });
      const canvas = api.multiLineGraph2D(datasets, intervalo, {
        width: opc.largura || 500, height: opc.altura || 320,
        title: opc.titulo || "", theme: "dark",
        legend: opc.legenda !== false, pointHover: true,
      });
      g._inserir(canvas);
    },

    // ── NUVEM / LISTA DE PONTOS ─────────────────────────────────────
    // pontos([[x,y], ...] | [{x,y}, ...], opcoes)
    pontos: (listaPontos, opcoes = {}) => {
      const g = Bibliotecas.graficos;
      const api = g._api();
      const opc = g._opc(opcoes);
      const raw = listaPontos instanceof PseudoLista ? listaPontos._v
        : (Array.isArray(listaPontos) ? listaPontos : []);
      const pts = g._extrairPontos(raw, null);
      if (pts.length === 0) return;
      let xMin = Math.min(...pts.map((p) => p.x));
      let xMax = Math.max(...pts.map((p) => p.x));
      if (Math.abs(xMax - xMin) < 1e-10) { xMin -= 2; xMax += 2; }
      const cor = opc.cor || "#a78bfa";
      const canvas = api.multiLineGraph2D([{
        points: pts, color: cor, pointColor: cor,
        pointRadius: opc.raio || 5, label: opc.rotulo || "",
      }], [xMin, xMax], {
        width: opc.largura || 500, height: opc.altura || 320,
        title: opc.titulo || "", theme: "dark",
        pointHover: true, legend: false,
      });
      g._inserir(canvas);
    },

    // ── CÔNICAS ─────────────────────────────────────────────────────
    // conica(A, B, C, D, E, F, opcoes)  →  Ax²+Bxy+Cy²+Dx+Ey+F=0
    conica: (A, B, C, D, E, F, opcoes = {}) => {
      const g = Bibliotecas.graficos;
      const api = g._api();
      const opc = g._opc(opcoes);
      const [ramo1, ramo2] = api.conic2D(A, B, C, D, E, F);
      const intervalo = opc.intervalo instanceof PseudoLista
        ? opc.intervalo._v : (opc.intervalo || [-8, 8]);
      const cor = opc.cor || "#7c83ff";
      const canvas = api.multiLineGraph2D([
        { func: ramo1, color: cor, label: opc.rotulo || "cônica" },
        { func: ramo2, color: cor },
      ], intervalo, {
        width: opc.largura || 500, height: opc.altura || 320,
        title: opc.titulo || "", theme: "dark", legend: false,
      });
      g._inserir(canvas);
    },

    // ── RELAÇÕES (RAMOS / PARAMÉTRICA) ─────────────────────────────
    // relacao([f1, f2])              → dois ramos (ex: saída de conic2D)
    // relacao({x: t=>..., y: t=>..., t: [0, 2*PI]}) → curva paramétrica
    // relacao(f)                     → atalho para função simples
    relacao: (rel, opcoes = {}) => {
      const g = Bibliotecas.graficos;
      const api = g._api();
      const opc = g._opc(opcoes);
      const intervalo = opc.intervalo instanceof PseudoLista
        ? opc.intervalo._v : (opc.intervalo || [-10, 10]);
      let canvas;
      const arr = rel instanceof PseudoLista ? rel._v : (Array.isArray(rel) ? rel : null);
      if (arr && arr.length >= 2 && arr.every((f) => typeof f === "function")) {
        const CORES = ["#7c83ff","#4ade80","#f87171","#fbbf24","#c084fc","#38bdf8"];
        const datasets = arr.map((f, i) => ({
          func: f, color: CORES[i % CORES.length],
          label: i === 0 ? (opc.rotulo || "relação") : "",
        }));
        canvas = api.multiLineGraph2D(datasets, intervalo, {
          width: opc.largura || 500, height: opc.altura || 320,
          title: opc.titulo || "", theme: "dark", legend: false,
        });
      } else if (rel && typeof rel === "object" && !Array.isArray(rel) &&
                 !(rel instanceof PseudoLista) && !(rel instanceof PseudoVetor)) {
        const fx = rel.x || rel.fx, fy = rel.y || rel.fy;
        if (typeof fx !== "function" || typeof fy !== "function")
          throw new Error("graficos.relacao(): objeto paramétrico precisa de x e y como funções de t.");
        const tRange = rel.t instanceof PseudoLista ? rel.t._v : (rel.t || [0, 2 * Math.PI]);
        canvas = api.parametricCurve2D(fx, fy, tRange, {
          width: opc.largura || 500, height: opc.altura || 320,
          title: opc.titulo || "", theme: "dark", color: opc.cor || "#7c83ff",
        });
      } else if (typeof rel === "function") {
        canvas = api.lineGraph2D(rel, intervalo, {
          width: opc.largura || 500, height: opc.altura || 320,
          title: opc.titulo || "", theme: "dark",
        });
      } else {
        throw new Error("graficos.relacao(): esperava [f1,f2], {x,y,t} ou uma função.");
      }
      g._inserir(canvas);
    },

    // ── GRÁFICO ANOTADO ─────────────────────────────────────────────
    // anotado(f, [[x,y], listaDeXs, {root:x}, ...], opcoes)
    // Cada elemento de marcadores pode ser: [x,y], número, {root/raiz/x},
    // array de qualquer um deles, ou PseudoLista/PseudoVetor.
    anotado: (f, marcadores, opcoes = {}) => {
      __vp(f, ["funcao"], "graficos.anotado", "f");
      const g = Bibliotecas.graficos;
      const api = g._api();
      const opc = g._opc(opcoes);
      const CORES_ANOT = ["#22c55e","#ef4444","#f59e0b","#a78bfa","#38bdf8","#fb923c","#e879f9"];
      const intervalo = opc.intervalo instanceof PseudoLista
        ? opc.intervalo._v : (opc.intervalo || [-10, 10]);
      const legendas = opc.legendas instanceof PseudoLista
        ? opc.legendas._v : (Array.isArray(opc.legendas) ? opc.legendas : []);
      const datasets = [{ func: f, color: opc.cor || "#7c83ff", label: opc.rotulo || "f(x)" }];
      const marcArr = marcadores instanceof PseudoLista ? marcadores._v
        : (Array.isArray(marcadores) ? marcadores : [marcadores]);
      marcArr.forEach((m, i) => {
        const pts = g._extrairPontos(m, f);
        if (pts.length > 0) {
          const cor = CORES_ANOT[i % CORES_ANOT.length];
          datasets.push({ points: pts, color: cor, pointRadius: 7,
            label: legendas[i] || "", pointColor: cor });
        }
      });
      const canvas = api.multiLineGraph2D(datasets, intervalo, {
        width: opc.largura || 500, height: opc.altura || 320,
        title: opc.titulo || "Gráfico Anotado", theme: "dark",
        legend: datasets.length > 1, pointHover: true,
      });
      g._inserir(canvas);
    },
  },

  /* ---- probabilidade ---- */
  probabilidade: {
    sortearComPesos: (itens, pesos) => {
      const iArr =
        itens instanceof PseudoLista
          ? itens._v
          : Array.isArray(itens)
            ? itens
            : null;
      const pArr =
        pesos instanceof PseudoLista
          ? pesos._v
          : Array.isArray(pesos)
            ? pesos
            : null;
      if (!iArr || !pArr)
        throw new Error(
          "probabilidade.sortearComPesos(): itens e pesos devem ser Listas ou arrays.",
        );
      if (iArr.length !== pArr.length)
        throw new Error(
          "probabilidade.sortearComPesos(): tamanhos diferentes.",
        );
      if (pArr.some((p) => typeof p !== "number" || p < 0))
        throw new Error("probabilidade.sortearComPesos(): pesos inválidos.");
      const total = pArr.reduce((s, p) => s + p, 0);
      if (total <= 0)
        throw new Error(
          "probabilidade.sortearComPesos(): soma dos pesos deve ser > 0.",
        );
      let r = Math.random() * total;
      for (let i = 0; i < pArr.length; i++) {
        r -= pArr[i];
        if (r <= 0) return iArr[i];
      }
      return iArr[iArr.length - 1];
    },
    uniforme: (min, max) => {
      __vp(min, ["numero"], "probabilidade.uniforme", "min");
      __vp(max, ["numero"], "probabilidade.uniforme", "max");
      if (min > max)
        throw new Error("probabilidade.uniforme(): min deve ser ≤ max.");
      return min + Math.random() * (max - min);
    },
    aleatorioInteiro: (min, max) => {
      __vp(min, ["inteiro"], "probabilidade.aleatorioInteiro", "min");
      __vp(max, ["inteiro"], "probabilidade.aleatorioInteiro", "max");
      if (min > max)
        throw new Error(
          "probabilidade.aleatorioInteiro(): min deve ser ≤ max.",
        );
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    rolarDados: (quantidade, faces) => {
      __vp(quantidade, ["inteiro"], "probabilidade.rolarDados", "quantidade");
      __vp(faces, ["inteiro"], "probabilidade.rolarDados", "faces");
      if (quantidade < 1 || faces < 2)
        throw new Error("probabilidade.rolarDados(): valores inválidos.");
      const res = new PseudoLista([]);
      for (let i = 0; i < quantidade; i++)
        res.adicionar(Math.floor(Math.random() * faces) + 1);
      return res;
    },
    monteCarlo: (fn, n) => {
      __vp(fn, ["funcao"], "probabilidade.monteCarlo", "fn");
      __vp(n, ["inteiro"], "probabilidade.monteCarlo", "n");
      if (n < 1) throw new Error("probabilidade.monteCarlo(): n ≥ 1.");
      if (fn.constructor.name === "AsyncFunction")
        return (async () => {
          let d = 0;
          for (let i = 0; i < n; i++) {
            if (await fn(Math.random())) d++;
          }
          return d / n;
        })();
      let d = 0;
      for (let i = 0; i < n; i++) {
        if (fn(Math.random())) d++;
      }
      return d / n;
    },
  },

  /* ================================================================
       algebra — Álgebra Linear e Geometria Analítica
       Usa PseudoVetor e PseudoMatriz como representações de pontos/vetores.
       Importar: importar algebra como al;
   ================================================================ */
  algebra: (function () {
    const _al = {};

    // ── helpers internos ────────────────────────────────────────────
    function _assertVetor(v, fn, param) { __vp(v, ["Vetor"], fn, param); }
    function _assertMat(M, fn, param)   { __vp(M, ["Matriz"], fn, param); }
    function _assertNum(n, fn, param)   { __vp(n, ["numero"], fn, param); }
    function _assertInt(n, fn, param)   { __vp(n, ["inteiro"], fn, param); }
    function _assertMapa(m, fn, param)  { __vp(m, ["Mapa"], fn, param); }

    // ── Produto vetorial 3D ─────────────────────────────────────────
    _al.vetorial = (v, u) => {
      _assertVetor(v, "algebra.vetorial", "v");
      _assertVetor(u, "algebra.vetorial", "u");
      if (v._v.length !== 3 || u._v.length !== 3)
        throw new Error("algebra.vetorial(): ambos os vetores devem ter dimensão 3.");
      return new PseudoVetor([
        v._v[1] * u._v[2] - v._v[2] * u._v[1],
        v._v[2] * u._v[0] - v._v[0] * u._v[2],
        v._v[0] * u._v[1] - v._v[1] * u._v[0],
      ]);
    };

    // ── Ângulo entre vetores (radianos) ─────────────────────────────
    _al.angulo = (v, u) => {
      _assertVetor(v, "algebra.angulo", "v");
      _assertVetor(u, "algebra.angulo", "u");
      if (v._v.length !== u._v.length)
        throw new Error("algebra.angulo(): vetores devem ter a mesma dimensão.");
      const nv = v.norma(), nu = u.norma();
      if (nv === 0 || nu === 0)
        throw new Error("algebra.angulo(): vetor zero não possui ângulo definido.");
      const cos = Math.min(1, Math.max(-1, v.ponto(u) / (nv * nu)));
      return Math.acos(cos);
    };

    // ── Ângulo entre vetores (graus) ────────────────────────────────
    _al.anguloDeg = (v, u) => _al.angulo(v, u) * (180 / Math.PI);

    // ── Projeção de v sobre u ───────────────────────────────────────
    _al.projecao = (v, u) => {
      _assertVetor(v, "algebra.projecao", "v");
      _assertVetor(u, "algebra.projecao", "u");
      const nu2 = u.ponto(u);
      if (nu2 === 0)
        throw new Error("algebra.projecao(): não é possível projetar sobre o vetor zero.");
      return u.escalar(v.ponto(u) / nu2);
    };

    // ── Paralelismo e ortogonalidade ────────────────────────────────
    _al.saoParalelos = (v, u) => {
      _assertVetor(v, "algebra.saoParalelos", "v");
      _assertVetor(u, "algebra.saoParalelos", "u");
      const nv = v.norma(), nu = u.norma();
      if (nv === 0 || nu === 0) return true;
      return Math.abs(Math.abs(v.ponto(u) / (nv * nu)) - 1) < 1e-9;
    };
    _al.saoOrtogonais = (v, u) => {
      _assertVetor(v, "algebra.saoOrtogonais", "v");
      _assertVetor(u, "algebra.saoOrtogonais", "u");
      return Math.abs(v.ponto(u)) < 1e-9;
    };

    // ── Matrizes especiais ──────────────────────────────────────────
    _al.identidade = (n) => {
      _assertInt(n, "algebra.identidade", "n");
      if (n < 1) throw new Error("algebra.identidade(): n deve ser ≥ 1.");
      return new PseudoMatriz(
        Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))
      );
    };
    _al.zeros = (m, n) => {
      _assertInt(m, "algebra.zeros", "m");
      _assertInt(n, "algebra.zeros", "n");
      if (m < 1 || n < 1) throw new Error("algebra.zeros(): m e n devem ser ≥ 1.");
      return new PseudoMatriz(Array.from({ length: m }, () => new Array(n).fill(0)));
    };

    // ── Determinante (qualquer dimensão via eliminação de Gauss) ───
    _al.determinante = (M) => {
      _assertMat(M, "algebra.determinante", "M");
      if (M.linhas !== M.colunas)
        throw new Error("algebra.determinante(): a matriz deve ser quadrada.");
      const n = M.linhas;
      if (n === 1) return M._v[0][0];
      if (n === 2) {
        const a = M._v;
        return a[0][0] * a[1][1] - a[0][1] * a[1][0];
      }
      if (n === 3) {
        const a = M._v;
        return (
          a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) -
          a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) +
          a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0])
        );
      }
      const m = M._v.map((r) => [...r]);
      let det = 1;
      for (let col = 0; col < n; col++) {
        let pivotRow = -1;
        for (let row = col; row < n; row++) {
          if (Math.abs(m[row][col]) > 1e-10) { pivotRow = row; break; }
        }
        if (pivotRow === -1) return 0;
        if (pivotRow !== col) { [m[col], m[pivotRow]] = [m[pivotRow], m[col]]; det *= -1; }
        det *= m[col][col];
        for (let row = col + 1; row < n; row++) {
          const f = m[row][col] / m[col][col];
          for (let j = col; j < n; j++) m[row][j] -= f * m[col][j];
        }
      }
      return det;
    };

    // ── Traço ───────────────────────────────────────────────────────
    _al.traco = (M) => {
      _assertMat(M, "algebra.traco", "M");
      if (M.linhas !== M.colunas)
        throw new Error("algebra.traco(): a matriz deve ser quadrada.");
      let t = 0;
      for (let i = 0; i < M.linhas; i++) t += M._v[i][i];
      return t;
    };

    // ── Inversa (qualquer dimensão via Gauss-Jordan) ─────────────────
    _al.inversa = (M) => {
      _assertMat(M, "algebra.inversa", "M");
      const n = M.linhas;
      if (n !== M.colunas)
        throw new Error("algebra.inversa(): a matriz deve ser quadrada.");
      const det = _al.determinante(M);
      if (Math.abs(det) < 1e-10)
        throw new Error("algebra.inversa(): a matriz é singular (determinante = 0).");
      if (n === 2) {
        const a = M._v;
        return new PseudoMatriz([
          [ a[1][1] / det, -a[0][1] / det],
          [-a[1][0] / det,  a[0][0] / det],
        ]);
      }
      if (n === 3) {
        const a = M._v;
        return new PseudoMatriz([
          [(a[1][1]*a[2][2]-a[1][2]*a[2][1])/det, (a[0][2]*a[2][1]-a[0][1]*a[2][2])/det, (a[0][1]*a[1][2]-a[0][2]*a[1][1])/det],
          [(a[1][2]*a[2][0]-a[1][0]*a[2][2])/det, (a[0][0]*a[2][2]-a[0][2]*a[2][0])/det, (a[0][2]*a[1][0]-a[0][0]*a[1][2])/det],
          [(a[1][0]*a[2][1]-a[1][1]*a[2][0])/det, (a[0][1]*a[2][0]-a[0][0]*a[2][1])/det, (a[0][0]*a[1][1]-a[0][1]*a[1][0])/det],
        ]);
      }
      const aug = M._v.map((row, i) => {
        const r = [...row];
        for (let j = 0; j < n; j++) r.push(j === i ? 1 : 0);
        return r;
      });
      for (let col = 0; col < n; col++) {
        let pRow = col;
        for (let row = col + 1; row < n; row++)
          if (Math.abs(aug[row][col]) > Math.abs(aug[pRow][col])) pRow = row;
        if (Math.abs(aug[pRow][col]) < 1e-10)
          throw new Error("algebra.inversa(): a matriz é singular.");
        if (pRow !== col) [aug[col], aug[pRow]] = [aug[pRow], aug[col]];
        const piv = aug[col][col];
        for (let j = 0; j < 2 * n; j++) aug[col][j] /= piv;
        for (let row = 0; row < n; row++) {
          if (row !== col) {
            const f = aug[row][col];
            for (let j = 0; j < 2 * n; j++) aug[row][j] -= f * aug[col][j];
          }
        }
      }
      return new PseudoMatriz(aug.map((r) => r.slice(n)));
    };

    // ── Resolução de sistema linear Ax = b (Gauss com pivotamento) ──
    _al.resolverSistema = (A, b) => {
      _assertMat(A, "algebra.resolverSistema", "A");
      _assertVetor(b, "algebra.resolverSistema", "b");
      const n = A.linhas;
      if (n !== A.colunas)
        throw new Error("algebra.resolverSistema(): A deve ser quadrada.");
      if (n !== b._v.length)
        throw new Error("algebra.resolverSistema(): b deve ter o mesmo número de linhas que A.");
      const aug = A._v.map((row, i) => [...row, b._v[i]]);
      for (let col = 0; col < n; col++) {
        let pRow = col;
        for (let row = col + 1; row < n; row++)
          if (Math.abs(aug[row][col]) > Math.abs(aug[pRow][col])) pRow = row;
        if (Math.abs(aug[pRow][col]) < 1e-10)
          throw new Error("algebra.resolverSistema(): sistema sem solução única (matriz singular).");
        if (pRow !== col) [aug[col], aug[pRow]] = [aug[pRow], aug[col]];
        for (let row = col + 1; row < n; row++) {
          const f = aug[row][col] / aug[col][col];
          for (let j = col; j <= n; j++) aug[row][j] -= f * aug[col][j];
        }
      }
      const x = new Array(n);
      for (let i = n - 1; i >= 0; i--) {
        x[i] = aug[i][n];
        for (let j = i + 1; j < n; j++) x[i] -= aug[i][j] * x[j];
        x[i] /= aug[i][i];
      }
      return new PseudoVetor(x);
    };

    // ── Geometria Analítica ─────────────────────────────────────────

    // Distância euclidiana entre dois pontos (representados como Vetores)
    _al.distancia = (p1, p2) => {
      _assertVetor(p1, "algebra.distancia", "p1");
      _assertVetor(p2, "algebra.distancia", "p2");
      if (p1._v.length !== p2._v.length)
        throw new Error("algebra.distancia(): pontos devem ter a mesma dimensão.");
      return p1.subtrair(p2).norma();
    };

    // Ponto médio entre dois pontos
    _al.pontoMedio = (p1, p2) => {
      _assertVetor(p1, "algebra.pontoMedio", "p1");
      _assertVetor(p2, "algebra.pontoMedio", "p2");
      if (p1._v.length !== p2._v.length)
        throw new Error("algebra.pontoMedio(): pontos devem ter a mesma dimensão.");
      return new PseudoVetor(p1._v.map((v, i) => (v + p2._v[i]) / 2));
    };

    // Equação da reta 2D por dois pontos → Mapa {a, b, c} tal que ax + by + c = 0
    _al.equacaoReta = (A, B) => {
      _assertVetor(A, "algebra.equacaoReta", "A");
      _assertVetor(B, "algebra.equacaoReta", "B");
      if (A._v.length < 2 || B._v.length < 2)
        throw new Error("algebra.equacaoReta(): vetores devem ter dimensão ≥ 2.");
      const dx = B._v[0] - A._v[0], dy = B._v[1] - A._v[1];
      if (Math.abs(dx) < 1e-10 && Math.abs(dy) < 1e-10)
        throw new Error("algebra.equacaoReta(): A e B são o mesmo ponto.");
      const m = new PseudoMapa();
      m.definir("a", dy);
      m.definir("b", -dx);
      m.definir("c", -dy * A._v[0] + dx * A._v[1]);
      return m;
    };

    // Distância de um ponto 2D/3D a uma reta definida por dois pontos
    _al.distPontoReta = (P, A, B) => {
      _assertVetor(P, "algebra.distPontoReta", "P");
      _assertVetor(A, "algebra.distPontoReta", "A");
      _assertVetor(B, "algebra.distPontoReta", "B");
      const AP = P.subtrair(A), AB = B.subtrair(A);
      const abNorm = AB.norma();
      if (abNorm < 1e-10)
        throw new Error("algebra.distPontoReta(): A e B são o mesmo ponto.");
      if (AP._v.length === 2)
        return Math.abs(AP._v[0] * AB._v[1] - AP._v[1] * AB._v[0]) / abNorm;
      return _al.vetorial(AP, AB).norma() / abNorm;
    };

    // Intersecção de duas retas 2D, cada uma definida por dois pontos
    _al.intersecaoRetas = (A, B, C, D) => {
      _assertVetor(A, "algebra.intersecaoRetas", "A");
      _assertVetor(B, "algebra.intersecaoRetas", "B");
      _assertVetor(C, "algebra.intersecaoRetas", "C");
      _assertVetor(D, "algebra.intersecaoRetas", "D");
      const d1x = B._v[0] - A._v[0], d1y = B._v[1] - A._v[1];
      const d2x = D._v[0] - C._v[0], d2y = D._v[1] - C._v[1];
      const denom = d1x * d2y - d1y * d2x;
      if (Math.abs(denom) < 1e-10)
        throw new Error("algebra.intersecaoRetas(): as retas são paralelas ou coincidentes.");
      const t = ((C._v[0] - A._v[0]) * d2y - (C._v[1] - A._v[1]) * d2x) / denom;
      return new PseudoVetor([A._v[0] + t * d1x, A._v[1] + t * d1y]);
    };

    // Área de triângulo por três pontos (2D ou 3D)
    _al.areaTriangulo = (A, B, C) => {
      _assertVetor(A, "algebra.areaTriangulo", "A");
      _assertVetor(B, "algebra.areaTriangulo", "B");
      _assertVetor(C, "algebra.areaTriangulo", "C");
      const AB = B.subtrair(A), AC = C.subtrair(A);
      if (AB._v.length === 2)
        return Math.abs(AB._v[0] * AC._v[1] - AB._v[1] * AC._v[0]) / 2;
      return _al.vetorial(AB, AC).norma() / 2;
    };

    // Perímetro de triângulo por três pontos
    _al.perimetroTriangulo = (A, B, C) => {
      _assertVetor(A, "algebra.perimetroTriangulo", "A");
      _assertVetor(B, "algebra.perimetroTriangulo", "B");
      _assertVetor(C, "algebra.perimetroTriangulo", "C");
      return _al.distancia(A, B) + _al.distancia(B, C) + _al.distancia(C, A);
    };

    // Área e perímetro de círculo
    _al.areaCirculo = (r) => {
      _assertNum(r, "algebra.areaCirculo", "r");
      if (r < 0) throw new Error("algebra.areaCirculo(): raio deve ser ≥ 0.");
      return Math.PI * r * r;
    };
    _al.perimetroCirculo = (r) => {
      _assertNum(r, "algebra.perimetroCirculo", "r");
      if (r < 0) throw new Error("algebra.perimetroCirculo(): raio deve ser ≥ 0.");
      return 2 * Math.PI * r;
    };

    // Ponto sobre uma circunferência dado ângulo θ em radianos → Vetor 2D
    _al.pontoCirculo = (cx, cy, r, theta) => {
      _assertNum(cx, "algebra.pontoCirculo", "cx");
      _assertNum(cy, "algebra.pontoCirculo", "cy");
      _assertNum(r,  "algebra.pontoCirculo", "r");
      _assertNum(theta, "algebra.pontoCirculo", "theta");
      if (r < 0) throw new Error("algebra.pontoCirculo(): raio deve ser ≥ 0.");
      return new PseudoVetor([cx + r * Math.cos(theta), cy + r * Math.sin(theta)]);
    };

    // Equação do plano 3D por três pontos → Mapa {a, b, c, d} tal que ax+by+cz+d=0
    _al.equacaoPlano = (A, B, C) => {
      _assertVetor(A, "algebra.equacaoPlano", "A");
      _assertVetor(B, "algebra.equacaoPlano", "B");
      _assertVetor(C, "algebra.equacaoPlano", "C");
      if ([A, B, C].some((v) => v._v.length < 3))
        throw new Error("algebra.equacaoPlano(): vetores devem ter dimensão 3.");
      const normal = _al.vetorial(B.subtrair(A), C.subtrair(A));
      if (normal.norma() < 1e-10)
        throw new Error("algebra.equacaoPlano(): os três pontos são colineares.");
      const [a, b, c] = normal._v;
      const d = -(a * A._v[0] + b * A._v[1] + c * A._v[2]);
      const m = new PseudoMapa();
      m.definir("a", a); m.definir("b", b); m.definir("c", c); m.definir("d", d);
      return m;
    };

    // Distância de um ponto 3D a um plano (dado como Mapa com chaves a,b,c,d)
    _al.distPontoPlano = (P, plano) => {
      _assertVetor(P, "algebra.distPontoPlano", "P");
      _assertMapa(plano, "algebra.distPontoPlano", "plano");
      if (!["a","b","c","d"].every((k) => plano._v.has(k)))
        throw new Error("algebra.distPontoPlano(): use al.equacaoPlano() para gerar o plano.");
      if (P._v.length < 3)
        throw new Error("algebra.distPontoPlano(): P deve ser um Vetor 3D.");
      const a = plano._v.get("a"), b = plano._v.get("b"),
            c = plano._v.get("c"), d = plano._v.get("d");
      return Math.abs(a*P._v[0] + b*P._v[1] + c*P._v[2] + d) /
             Math.sqrt(a*a + b*b + c*c);
    };

    // Colinearidade e coplanaridade
    _al.saoColineares = (A, B, C) => {
      _assertVetor(A, "algebra.saoColineares", "A");
      _assertVetor(B, "algebra.saoColineares", "B");
      _assertVetor(C, "algebra.saoColineares", "C");
      return _al.areaTriangulo(A, B, C) < 1e-10;
    };
    _al.saoCoplanares = (A, B, C, D) => {
      [A,B,C,D].forEach((v,i) => _assertVetor(v, "algebra.saoCoplanares", ["A","B","C","D"][i]));
      if ([A,B,C,D].some((v) => v._v.length < 3))
        throw new Error("algebra.saoCoplanares(): vetores devem ter dimensão 3.");
      const normal = _al.vetorial(B.subtrair(A), C.subtrair(A));
      return Math.abs(normal.ponto(D.subtrair(A))) < 1e-8;
    };

    _al.linspace = (inicio, fim, n) => {
      __vp(inicio, ["numero"], "algebra.linspace", "inicio");
      __vp(fim, ["numero"], "algebra.linspace", "fim");
      __vp(n, ["inteiro"], "algebra.linspace", "n");
      if (n < 2) throw new Error("algebra.linspace(): n deve ser ≥ 2.");
      return new PseudoVetor(Array.from({length: n}, (_, i) => inicio + i * (fim - inicio) / (n - 1)));
    };

    return _al;
  })(),

  /* ---- latex ---- */
  latex: (() => {
    // Shared promise — all concurrent callers await the same load
    let _loadPromise = null;

    function _load() {
      if (window.katex) return Promise.resolve();
      if (!_loadPromise) {
        _loadPromise = new Promise((res, rej) => {
          if (!document.querySelector('link[href*="katex"]')) {
            const lnk = document.createElement("link");
            lnk.rel = "stylesheet";
            lnk.href =
              "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
            document.head.appendChild(lnk);
          }
          const s = document.createElement("script");
          s.src =
            "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js";
          s.onload = res;
          s.onerror = () => rej(new Error("Falha ao carregar KaTeX"));
          document.head.appendChild(s);
        });
      }
      return _loadPromise;
    }

    // Restore JS-eaten escape sequences so LaTeX backslashes survive
    // e.g. "\frac" → JS parses \f as form feed → _fixTex restores to \frac
    function _fixTex(s) {
      return s
        .replace(/\f/g, "\\f")   // \frac, \forall, \flat …
        .replace(/\n/g, "\\n")   // \nabla, \newline, \neq …
        .replace(/\t/g, "\\t")   // \text, \textbf, \times, \theta …
        .replace(/[\b]/g, "\\b") // \beta, \bigcup, \boldsymbol … ([\b] = backspace U+0008, não word boundary)
        .replace(/\r/g, "\\r")   // \rho, \rightarrow, \rangle …
        .replace(/\v/g, "\\v");  // \vec, \vee, \varphi …
    }

    function _emit(html, display) {
      const wrap = document.createElement("div");
      wrap.className = display ? "latex-block" : "latex-inline";
      wrap.style.cssText = display
        ? "margin:6px 0;text-align:center;overflow-x:auto;line-height:2"
        : "display:inline-block;vertical-align:middle";
      wrap.innerHTML = html;
      _c().appendChild(wrap);
      _sc();
    }

    function _render(tex, display) {
      try {
        return window.katex.renderToString(tex, {
          displayMode: display,
          throwOnError: false,
          output: "html",
        });
      } catch (e) {
        const d = document.createElement("span");
        d.style.color = "var(--red,#f87171)";
        d.textContent = `[LaTeX inválido: ${e.message}]`;
        return d.outerHTML;
      }
    }

    // ── converter JS → TeX ──────────────────────────────────────
    const _MAPS = [
      [/\bmat\.arcsen\b/g, "\\arcsin"],
      [/\bmat\.arccos\b/g, "\\arccos"],
      [/\bmat\.arctan\b/g, "\\arctan"],
      [/\bmat\.sen\b/g, "\\sin"],
      [/\bmat\.cos\b/g, "\\cos"],
      [/\bmat\.tan\b/g, "\\tan"],
      [/\bmat\.ln\b/g, "\\ln"],
      [/\bmat\.log10\b/g, "\\log_{10}"],
      [/\bmat\.log\b/g, "\\log"],
      [/\bmat\.exp\b/g, "\\exp"],
      [/\bmat\.PI\b/g, "\\pi"],
      [/\bmat\.E\b/g, "e"],
      [/\bMath\.PI\b/g, "\\pi"],
      [/\bMath\.E\b/g, "e"],
    ];

    function _balancedArg(src, start) {
      // Returns [content, endIndex] for balanced parens/braces starting after '('
      let depth = 1, i = start;
      while (i < src.length && depth > 0) {
        if (src[i] === "(") depth++;
        else if (src[i] === ")") depth--;
        i++;
      }
      return [src.slice(start, i - 1), i];
    }

    function _toTex(src) {
      // Strip arrow or named function wrapper
      src = src
        .replace(/^\s*(?:async\s+)?(?:function\s*\w*\s*)?\([^)]*\)\s*(?:=>\s*|\{[\s\S]*?\bretorno\b\s*|\{[\s\S]*?\breturn\b\s*)/,"")
        .replace(/^\s*\w+\s*=>\s*/, "")
        .replace(/[;\s}]+$/, "")
        .trim();

      // Apply symbol maps
      for (const [pat, rep] of _MAPS) src = src.replace(pat, rep);

      // mat.sqrt(expr) → \sqrt{expr}, mat.cbrt(expr) → \sqrt[3]{expr}
      src = src.replace(/\bmat\.sqrt\s*\(/g, "__SQRT__(");
      src = src.replace(/\bmat\.cbrt\s*\(/g, "__CBRT__(");
      src = src.replace(/\bmat\.abs\s*\(/g, "__ABS__(");

      let out = "";
      let i = 0;
      while (i < src.length) {
        const sqIdx = src.indexOf("__SQRT__(", i);
        const cbIdx = src.indexOf("__CBRT__(", i);
        const abIdx = src.indexOf("__ABS__(", i);
        const candidates = [sqIdx, cbIdx, abIdx].filter((x) => x >= 0);
        if (candidates.length === 0) { out += src.slice(i); break; }
        const next = Math.min(...candidates);
        out += src.slice(i, next);
        if (src.startsWith("__SQRT__(", next)) {
          const [arg, end] = _balancedArg(src, next + 9);
          out += `\\sqrt{${_toTex(arg)}}`;
          i = end;
        } else if (src.startsWith("__CBRT__(", next)) {
          const [arg, end] = _balancedArg(src, next + 9);
          out += `\\sqrt[3]{${_toTex(arg)}}`;
          i = end;
        } else {
          const [arg, end] = _balancedArg(src, next + 8);
          out += `\\left|${_toTex(arg)}\\right|`;
          i = end;
        }
      }
      src = out;

      // Known LaTeX functions: wrap args with \left( \right)
      out = "";
      i = 0;
      const fnRe = /\\(sin|cos|tan|arcsin|arccos|arctan|ln|log(?:_\{[^}]+\})?|exp)\s*\(/g;
      let m;
      fnRe.lastIndex = 0;
      let last = 0;
      while ((m = fnRe.exec(src)) !== null) {
        out += src.slice(last, m.index) + "\\" + m[1] + "\\!\\left(";
        const [arg, end] = _balancedArg(src, m.index + m[0].length);
        out += _toTex(arg) + "\\right)";
        last = end;
        fnRe.lastIndex = end;
      }
      src = out + src.slice(last);

      // a ** b  →  a^{b} (handle parens around base)
      src = src.replace(/\(([^)]+)\)\s*\*\*\s*(\w+)/g, (_, base, exp) => `\\left(${base}\\right)^{${exp}}`);
      src = src.replace(/(\w+)\s*\*\*\s*(\w+)/g, "$1^{$2}");

      // a * b  →  a \cdot b
      src = src.replace(/\s*\*\s*/g, " \\cdot ");

      return src.trim();
    }

    // ── public API ───────────────────────────────────────────────
    return {
      linha: async function (tex) {
        await _load();
        _emit(_render(_fixTex(String(tex)), false), false);
      },

      bloco: async function (...exprs) {
        await _load();
        let tex;
        if (exprs.length === 1) {
          tex = _fixTex(String(exprs[0]));
        } else {
          tex =
            "\\begin{aligned}\n" +
            exprs.map((e) => `& ${_fixTex(String(e))}`).join(" \\\\\\\\\n") +
            "\n\\end{aligned}";
        }
        _emit(_render(tex, true), true);
      },

      converterParaLatex: async function (fn) {
        await _load();
        const tex = _toTex(typeof fn === "function" ? fn.toString() : String(fn));
        _emit(_render(tex, true), true);
        return tex;
      },

      texString: function (fn) {
        return _toTex(typeof fn === "function" ? fn.toString() : String(fn));
      },
    };
  })(),

  /* ---- arquivos ---- */
  arquivos: (() => {
    function _lerArquivo(accept) {
      return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        let settled = false;
        input.onchange = (e) => {
          settled = true;
          const file = e.target.files[0];
          if (!file) return reject(new Error("Nenhum arquivo selecionado."));
          const reader = new FileReader();
          reader.onload = (ev) =>
            resolve({ nome: file.name, conteudo: ev.target.result });
          reader.onerror = () =>
            reject(new Error("Erro ao ler o arquivo."));
          reader.readAsText(file, "UTF-8");
        };
        // Detect cancel via window focus after dialog closes
        window.addEventListener(
          "focus",
          () => { setTimeout(() => { if (!settled) reject(new Error("Importação cancelada.")); }, 500); },
          { once: true }
        );
        input.click();
      });
    }

    function _parseCSV(text, sep, cabecalho) {
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
          } else if (c === sep && !inQ) { cells.push(cur); cur = ""; }
          else cur += c;
        }
        cells.push(cur);
        return cells;
      }
      const hdrs = cabecalho
        ? parseLine(lines[0])
        : parseLine(lines[0]).map((_, i) => `col${i + 1}`);
      const dados = lines.slice(cabecalho ? 1 : 0).map(parseLine);
      return { cabecalhos: hdrs, dados };
    }

    function _autoType(v) {
      if (v === "") return "";
      const n = Number(v);
      return isNaN(n) ? v : n;
    }

    // Recursively convert plain JS value → Pseudo native type
    function _jsToNativo(v) {
      if (Array.isArray(v)) return new PseudoLista(v.map(_jsToNativo));
      if (v !== null && typeof v === "object" && !(v instanceof PseudoLista) && !(v instanceof PseudoMapa)) {
        const m = new PseudoMapa();
        Object.entries(v).forEach(([k, val]) => m._v.set(k, _jsToNativo(val)));
        return m;
      }
      return v;
    }

    // Build a Pseudo result based on tipo option (shared by lerCSV / lerPDADOS)
    function _construirResultado(tipo, cabecalhos, dados, cell) {
      if (tipo === "lista")        return new PseudoLista(dados.map((r) => cell(r, 0)));
      if (tipo === "lista-listas") return new PseudoLista(dados.map((r) => new PseudoLista(cabecalhos.map((_, ci) => cell(r, ci)))));
      if (tipo === "lista-mapas")  return new PseudoLista(dados.map((r) => {
        const m = new PseudoMapa();
        cabecalhos.forEach((h, ci) => m._v.set(h, cell(r, ci)));
        return m;
      }));
      if (tipo === "mapa-listas") {
        const mapa = new PseudoMapa();
        cabecalhos.forEach((h, ci) => mapa._v.set(h, new PseudoLista(dados.map((r) => cell(r, ci)))));
        return mapa;
      }
      if (tipo === "matriz")       return new PseudoMatriz(dados.map((r) => cabecalhos.map((_, ci) => parseFloat(r[ci]) || 0)));
      return new PseudoLista(dados.map((r) => new PseudoLista(cabecalhos.map((_, ci) => cell(r, ci)))));
    }

    return {
      lerCSV: async function (opcoes) {
        const opts = opcoes || {};
        const sep      = opts.separador || ",";
        const cabecalho = opts.cabecalho !== false;
        const tipo     = opts.tipo || "lista-mapas";
        const { conteudo } = await _lerArquivo(".csv,.tsv,.txt");
        const { cabecalhos, dados } = _parseCSV(conteudo, sep, cabecalho);
        const useAuto = opts.converterNumeros !== false;
        function cell(row, ci) {
          const v = row[ci] ?? "";
          return useAuto ? _autoType(v) : v;
        }
        return _construirResultado(tipo, cabecalhos, dados, cell);
      },

      lerJSON: async function (opcoes) {
        const opts = opcoes || {};
        const { conteudo } = await _lerArquivo(".json");
        let obj;
        try { obj = JSON.parse(conteudo); }
        catch (e) { throw new Error("JSON inválido: " + e.message); }
        if (opts.caminho) {
          for (const p of opts.caminho.split(".")) {
            if (obj == null) break;
            obj = obj[p];
          }
        }
        return _jsToNativo(obj);
      },

      lerTXT: async function (opcoes) {
        const opts = opcoes || {};
        const tipo = opts.tipo || "lista";
        const { conteudo } = await _lerArquivo(".txt,.csv,.tsv");
        if (tipo === "texto") return conteudo;
        const sep = opts.separador || "\n";
        return new PseudoLista(conteudo.split(sep).filter((l) => l.trim() !== ""));
      },

      lerPDADOS: async function (opcoes) {
        const opts = opcoes || {};
        const tipo = opts.tipo || "lista-mapas";
        const { conteudo } = await _lerArquivo(".pdados");
        const lines = conteudo.split(/\r?\n/);
        if (!lines[0].startsWith("§PSEUDO-DADOS:"))
          throw new Error("Arquivo .pdados inválido: cabeçalho não reconhecido.");
        let cabecalhos = [], dados = [], inData = false;
        for (const line of lines.slice(1)) {
          if (line === "§DADOS") { inData = true; continue; }
          if (inData) { if (line.trim()) dados.push(JSON.parse(line)); }
          else if (line.startsWith("colunas=")) cabecalhos = JSON.parse(line.slice(8));
        }
        const useAuto = opts.converterNumeros !== false;
        function cell(row, ci) {
          const v = row[ci] ?? "";
          return useAuto ? _autoType(v) : v;
        }
        return _construirResultado(tipo, cabecalhos, dados, cell);
      },

      abrirImportador: function () {
        window.open("importador.html", "_blank");
      },
    };
  })(),
};

/* ============================================================
   7. I/O GLOBAL
   ============================================================ */
/* ============================================================
   8. BUILT-IN GLOBAL UTILITIES
   ============================================================ */

/* a...b range operator helper — inclusive on both ends, integer step */
function _pseudoRange(a, b) {
  if (typeof a !== "number" || typeof b !== "number")
    throw new Error("Operador de intervalo (...): ambos os lados devem ser números.");
  const step = a <= b ? 1 : -1;
  const result = [];
  for (let i = a; step > 0 ? i <= b : i >= b; i += step) result.push(i);
  return result;
}

/* intervalo(fim)                  → [0, 1, 2, ..., fim-1]
   intervalo(inicio, fim)          → [inicio, ..., fim-1]  (passo auto-detectado)
   intervalo(inicio, fim, passo)   → início to fim exclusive, by passo
   Suporta passo fracionário e negativo.  Análogo ao range/arange do Python. */
function intervalo(a, b, passo) {
  let start, stop, step;
  if      (b     === undefined) { start = 0; stop = a; step = a >= 0 ? 1 : -1; }
  else if (passo === undefined) { start = a; stop = b; step = a <= b ? 1 : -1; }
  else                          { start = a; stop = b; step = passo; }
  if (step === 0) throw new Error("intervalo(): o passo não pode ser zero.");
  const n = Math.max(0, Math.ceil((stop - start) / step));
  const result = [];
  for (let i = 0; i < n; i++) {
    result.push(parseFloat((start + i * step).toPrecision(10)));
  }
  return new PseudoLista(result);
}

function imprima(...args) {
  const div = document.createElement("div");
  div.className = "console-line";
  const arrow = document.createElement("span");
  arrow.className = "console-line-arrow";
  arrow.textContent = "›";
  arrow.setAttribute("aria-hidden", "true");
  const cnt = document.createElement("span");
  cnt.textContent = args.map(_vtx).join(" ");
  div.appendChild(arrow);
  div.appendChild(cnt);
  _c().appendChild(div);
  _sc();
}

function _imprimaErro(erro, linhaUsuario = null) {
  const erroObj = erro instanceof Error ? erro : new Error(String(erro));
  console.warn(
    `%c[Pseudo-IDE] Erro de execução${linhaUsuario ? ` na linha ~${linhaUsuario}` : ""}`,
    "color:#f87171;font-weight:bold",
    "\nMensagem:",
    erroObj.message,
    "\nStack:\n" + (erroObj.stack ?? "(não disponível)"),
  );
  if (linhaUsuario && typeof window.marcarErroNoEditor === "function")
    window.marcarErroNoEditor(linhaUsuario);
  const div = document.createElement("div");
  div.className = "console-error";
  const rawMsg = erro instanceof Error ? erro.message : String(erro);
  const msg = traduzirErroJS(rawMsg);
  const pre = linhaUsuario ? `[Linha ${linhaUsuario}] ` : "";
  div.innerHTML = `<strong>${pre}Erro de Execução:</strong> ${_e(msg)}`;
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
    // In notebook mode the output div may still be hidden at this point;
    // ensure it is shown before attempting focus (hidden elements are not focusable).
    if (window._nbCurrentCell) _c().classList.add("nb-has-output");
    _sc();
    field.focus();
    field.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const raw = field.value;
      field.disabled = true;
      field.style.color = "var(--text-muted)";
      field.style.borderColor = "transparent";
      prompt.style.color = "var(--text-muted)";
      const trimmed = raw.trim();
      if (trimmed === "Infinito")    { resolve(Infinity);  return; }
      if (trimmed === "NegInfinito") { resolve(-Infinity); return; }
      resolve(trimmed !== "" && !isNaN(trimmed) ? parseFloat(trimmed) : trimmed);
    });
  });
}

function raiz(x) {
  if (typeof x !== "number" || isNaN(x)) throw new Error(`raiz(): esperado número, recebeu ${_vtx(x)}.`);
  if (x < 0) throw new Error(`raiz(): raiz quadrada de número negativo (${x}) não é real.`);
  return Math.sqrt(x);
}
function expo(x, y) {
  if (typeof x !== "number" || isNaN(x)) throw new Error(`expo(): base deve ser número, recebeu ${_vtx(x)}.`);
  if (typeof y !== "number" || isNaN(y)) throw new Error(`expo(): expoente deve ser número, recebeu ${_vtx(y)}.`);
  return Math.pow(x, y);
}

/* ============================================================
   8. MARCADORES DE PROJETO
   ============================================================ */
function extrairMarcadores(fonte) {
  const r = {
    nome: null,
    autor: null,
    desc: null,
    versao: null,
    biblioteca: null,
  };
  const re = /@(NOME|AUTOR|DESC|VERSAO|BIBLIOTECA)\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(fonte)) !== null) r[m[1].toLowerCase()] = m[2].trim();
  return r;
}
function removerMarcadores(c) {
  return c.replace(
    /@(?:NOME|AUTOR|DESC|VERSAO|BIBLIOTECA)\[[^\]]*\][ \t]*/g,
    "",
  );
}
