/* ============================================================
   PSEUDO-IDE — compiler.js  v4.2 (Cloud Seguro & Auto-Export)
   ============================================================ */
"use strict";

/* ============================================================
   PRÉ-PROCESSADOR — PARÂMETROS TIPADOS
   ============================================================ */
function _splitParams(str) {
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
const _FUNCAO_HEADER_RE =
  /\bfuncao\s+([A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_]*)\s*\(/g;

function processarParametrosTipados(codigo, isDebug = false) {
  const out = [];
  let cursor = 0;
  _FUNCAO_HEADER_RE.lastIndex = 0;
  let m;
  while ((m = _FUNCAO_HEADER_RE.exec(codigo)) !== null) {
    const nome = m[1];
    const openIdx = m.index + m[0].length - 1;
    let depth = 1,
      j = openIdx + 1;
    while (j < codigo.length && depth > 0) {
      if (codigo[j] === "(") depth++;
      if (codigo[j] === ")") depth--;
      j++;
    }
    const closeIdx = j - 1;
    const paramStr = codigo.slice(openIdx + 1, closeIdx);
    let k = j;
    while (k < codigo.length && /[\s\n]/.test(codigo[k])) k++;
    const temBrace = codigo[k] === "{";
    const temTipado = /\b(inteiro|real|caracter|booleano)\s*\(/.test(paramStr);
    if (!temBrace || !temTipado) {
      out.push(codigo.slice(cursor, m.index + m[0].length));
      cursor = m.index + m[0].length;
      _FUNCAO_HEADER_RE.lastIndex = cursor;
      continue;
    }
    const params = _splitParams(paramStr);
    const jsParams = [],
      validations = [];
    params.forEach((raw) => {
      raw = raw.trim();
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
        const cm = raw.match(/^([A-Za-zÀ-ÖØ-öø-ÿ_]\w*)\s*:\s*(.+)$/);
        jsParams.push(cm ? `${cm[1]} = ${cm[2]}` : raw);
      }
    });
    out.push(codigo.slice(cursor, m.index));
    const prefixo = isDebug ? "async function" : "function";
    out.push(
      `${prefixo} ${nome}(${jsParams.join(", ")}){\n${validations.join("\n")}`,
    );
    cursor = k + 1;
    _FUNCAO_HEADER_RE.lastIndex = cursor;
  }
  out.push(codigo.slice(cursor));
  return out.join("");
}

/* ============================================================
   INJETOR DE AWAIT (AST-Lite Seguro)
   ============================================================ */
function injectAwait(codigo, funcsToAwait) {
  if (funcsToAwait.length === 0) return codigo;
  const nomes = funcsToAwait
    .map((n) => n.replace(/\./g, "\\."))
    .sort((a, b) => b.length - a.length);
  const re = new RegExp(`\\b(${nomes.join("|")})\\s*\\(`, "g");
  let matches = [];
  let m;
  while ((m = re.exec(codigo)) !== null) {
    const before = codigo.substring(0, m.index);
    if (/(?:\bfuncao|\bfunction|\bawait)\s*$/.test(before)) continue;
    if (/\.\s*$/.test(before) && !m[1].includes(".")) continue;
    matches.push({ index: m.index, nome: m[1], length: m[0].length });
  }
  let out = codigo;
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    let depth = 1;
    let j = match.index + match.length;
    let inString = false;
    let stringChar = "";
    while (j < out.length && depth > 0) {
      const char = out[j];
      if (
        (char === '"' || char === "'" || char === "`") &&
        out[j - 1] !== "\\"
      ) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (stringChar === char) {
          inString = false;
        }
      }
      if (!inString) {
        if (char === "(") depth++;
        else if (char === ")") depth--;
      }
      j++;
    }
    out =
      out.substring(0, match.index) +
      `(await ${match.nome}(` +
      out.substring(match.index + match.length, j) +
      `)` +
      out.substring(j);
  }
  return out;
}

function _isLinhaInjetada(t) {
  return (
    /^let \w+=__p_\w+;/.test(t) ||
    /^if\s*\(\s*\w+\s*===\s*undefined\s*\)\s*throw/.test(t) ||
    /^if\s*\(\s*!\s*\(/.test(t) ||
    /^(async )?function \w+\(__p_/.test(t) ||
    /^await window\._dbg/.test(t) ||
    /^if\s*\(!Bibliotecas\[/.test(t) ||
    /^function __getVars\s*\(/.test(t) ||
    /^try\s*\{\s*r\[/.test(t) ||
    /^return r;\s*\}/.test(t) ||
    t === "" ||
    t === "{" ||
    t === "}"
  );
}

let _dbgPrefixLines = 0;

/* ============================================================
   COMPARAÇÕES ENCADEADAS  a < b < c  →  a<b && b<c
   ============================================================ */
function _expandChainedComps(code) {
  const S = '\x00';
  const CMPOPS = ['<=', '>=', '==', '!=', '<', '>'];
  const dirOf = op =>
    op === '<' || op === '<=' ?  1 :
    op === '>' || op === '>=' ? -1 :
    op === '==' ? 0 : NaN;

  function skipFwd(s, i) {
    const j = s.indexOf(S, i + 1);
    return j < 0 ? s.length : j + 1;
  }

  function skipStmtKw(s, from, until) {
    let p = from;
    while (p < until && /[ \t]/.test(s[p])) p++;
    const kw = s.slice(p, until).match(/^(retorno|lançar)\s+/);
    return kw ? p + kw[0].length : p;
  }

  function isBoundary(between) {
    const clean = between.replace(/\x00\d+\x00/g, '').trim();
    if (/[;{}\n]/.test(clean)) return true;
    if (/&&|\|\|/.test(clean)) return true;
    if (/\?/.test(clean)) return true;
    // Bracket-depth check: unbalanced ) or comma at depth 0 = different scope
    let d = 0;
    for (const ch of clean) {
      if ('([{'.includes(ch)) d++;
      else if (')]}'.includes(ch)) { d--; if (d < 0) return true; }
      else if (ch === ',' && d === 0) return true;
    }
    const logicKw = /(?<![A-Za-zÀ-ÖØ-öø-ÿ_\d])(e|ou)(?![A-Za-zÀ-ÖØ-öø-ÿ_\d])/.test(clean);
    if (logicKw && clean !== 'e' && clean !== 'ou') return true;
    return false;
  }

  function _logicKwAt(s, pos) {
    if (!/[A-Za-z]/.test(s[pos])) return -1;
    let ks = pos, ke = pos + 1;
    while (ks > 0 && /[A-Za-zÀ-ÖØ-öø-ÿ_\d]/.test(s[ks - 1])) ks--;
    while (ke < s.length && /[A-Za-zÀ-ÖØ-öø-ÿ_\d]/.test(s[ke])) ke++;
    const kw = s.slice(ks, ke);
    if (kw !== 'e' && kw !== 'ou') return -1;
    const prev = ks > 0 ? s[ks - 1] : ' ';
    return !/[A-Za-zÀ-ÖØ-öø-ÿ_\d]/.test(prev) ? ke : -1;
  }

  const found = [];
  let depth = 0, i = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === S) { i = skipFwd(code, i); continue; }
    if (ch === '(' || ch === '[' || ch === '{') { depth++; i++; continue; }
    if (ch === ')' || ch === ']' || ch === '}') { depth = Math.max(0, depth - 1); i++; continue; }
    if (ch === '=' && code[i + 1] === '>') { i += 2; continue; }
    let op = null;
    for (const o of CMPOPS) {
      if (code.startsWith(o, i)) {
        if ((o === '==' || o === '!=') && code[i + o.length] === '=') { i += o.length + 1; op = null; break; }
        op = o; break;
      }
    }
    if (op) { found.push({ i, op, depth, end: i + op.length }); i += op.length; }
    else i++;
  }

  if (found.length < 2) return code;

  const chains = [];
  let j = 0;
  while (j < found.length) {
    const grp = [j];
    for (let k = j + 1; k < found.length; k++) {
      const prev = found[grp[grp.length - 1]], cur = found[k];
      if (cur.depth !== prev.depth) break;
      if (isBoundary(code.slice(prev.end, cur.i))) break;
      grp.push(k);
    }
    if (grp.length >= 2) chains.push(grp);
    j = grp[grp.length - 1] + 1;
  }

  if (!chains.length) return code;

  let result = code;
  for (let ci = chains.length - 1; ci >= 0; ci--) {
    const ops = chains[ci].map(idx => found[idx]);
    const firstOp = ops[0], lastOp = ops[ops.length - 1];

    const dirs = ops.map(o => dirOf(o.op));
    if (dirs.some(d => isNaN(d)))
      throw new Error("Encadeamento inválido: '!=' não pode ser encadeado. Use 'e' explícito.");
    const uniqueDirs = new Set(dirs.filter(d => d !== 0));
    if (uniqueDirs.size > 1)
      throw new Error("Encadeamento inválido: não misture < e > no mesmo encadeamento.");

    let lp = firstOp.i - 1, ld = 0;
    while (lp >= 0) {
      const c = result[lp];
      if (c === S) { const o = result.lastIndexOf(S, lp - 1); lp = o < 0 ? -1 : o - 1; continue; }
      if (c === ')' || c === ']' || c === '}') { ld++; lp--; continue; }
      if (c === '(' || c === '[' || c === '{') { ld--; if (ld < 0) { lp++; break; } lp--; continue; }
      if (ld === 0) {
        if (/[;,\n]/.test(c)) { lp++; break; }
        if (c === '&' && result[lp - 1] === '&') { lp += 1; break; }
        if (c === '&' && result[lp + 1] === '&') { lp += 2; break; }
        if (c === '|' && result[lp - 1] === '|') { lp += 1; break; }
        if (c === '|' && result[lp + 1] === '|') { lp += 2; break; }
        let ke = _logicKwAt(result, lp);
        if (ke >= 0) { while (ke < result.length && /[ \t]/.test(result[ke])) ke++; lp = ke; break; }
      }
      lp--;
    }
    if (lp < 0) lp = 0;

    let rp = lastOp.end, rd = 0;
    while (rp < result.length) {
      const c = result[rp];
      if (c === S) { rp = skipFwd(result, rp); continue; }
      if (c === '(' || c === '[') { rd++; rp++; continue; }
      if (c === ')' || c === ']') { if (rd <= 0) break; rd--; rp++; continue; }
      if (c === '{') { rd++; rp++; continue; }
      if (c === '}') { if (rd <= 0) break; rd--; rp++; continue; }
      if (rd === 0) {
        if (/[;,\n?]/.test(c)) break;
        if (/[A-Za-z]/.test(c)) {
          const prev = rp > 0 ? result[rp - 1] : ' ';
          if (!/[A-Za-zÀ-ÖØ-öø-ÿ_\d]/.test(prev) &&
              /^(?:e|ou)(?![A-Za-zÀ-ÖØ-öø-ÿ_\d])/.test(result.slice(rp))) break;
        }
        if (result.startsWith('&&', rp) || result.startsWith('||', rp)) break;
      }
      rp++;
    }

    const elp = skipStmtKw(result, lp, firstOp.i);
    const prefix = result.slice(lp, elp);

    const segs = [];
    let segStart = elp;
    for (const op of ops) { segs.push(result.slice(segStart, op.i).trim()); segStart = op.end; }
    segs.push(result.slice(segStart, rp).trim());

    const parts = [];
    for (let s = 0; s < ops.length; s++) parts.push(`${segs[s]}${ops[s].op}${segs[s + 1]}`);
    const trailSep = (rp < result.length && !/[\s)\]},;]/.test(result[rp])) ? ' ' : '';
    result = result.slice(0, lp) + prefix + parts.join(' && ') + trailSep + result.slice(rp);
  }

  return result;
}

/* ============================================================
   OPERADOR TERNÁRIO ESTRITO  cond ? a : b  →  _ternBool(cond) ? a : b
   ============================================================ */
function _expandTernary(code) {
  let result = code;
  for (let iter = 0; iter < 100; iter++) {
    const next = _processOneTernary(result);
    if (next === result) break;
    result = next;
  }
  return result;
}

function _processOneTernary(code) {
  const S = '\x00';
  for (let i = code.length - 1; i >= 0; i--) {
    if (code[i] !== '?') continue;
    const nx = code[i + 1] || '';
    const pv = code[i - 1] || '';
    if (nx === '.' || nx === '?' || pv === '?') continue;
    const q = i;

    let cStart = q - 1, d = 0;
    while (cStart >= 0) {
      const c = code[cStart];
      if (c === S) { const o = code.lastIndexOf(S, cStart - 1); if (o < 0) { cStart = 0; break; } cStart = o - 1; continue; }
      if (c === ')' || c === ']' || c === '}') { d++; cStart--; continue; }
      if (c === '(' || c === '[' || c === '{') { d--; if (d < 0) { cStart++; break; } cStart--; continue; }
      if (d === 0 && /[,;:\n]/.test(c)) { cStart++; break; }
      if (d === 0 && c === '?' && !/[.?]/.test(code[cStart + 1] || '') && code[cStart - 1] !== '?') { cStart++; break; }
      if (d === 0 && c === '=' && !/[<>=!]/.test(code[cStart - 1] || '') && !/[<>=!]/.test(code[cStart + 1] || '')) { cStart++; break; }
      cStart--;
    }
    if (cStart < 0) cStart = 0;

    let exprStart = cStart;
    {
      let p = cStart;
      while (p < q && /[ \t]/.test(code[p])) p++;
      const kw = code.slice(p, q).match(/^(retorno|lançar)\s+/);
      if (kw) exprStart = p + kw[0].length;
    }

    const condRaw = code.slice(exprStart, q);
    const cond = condRaw.trim();
    if (!cond || cond.startsWith('_ternBool(')) continue;
    const leadWS = condRaw.match(/^\s*/)[0];

    let td = 1, pd = 0, colon = -1;
    for (let j = q + 1; j < code.length; j++) {
      const c = code[j];
      if (c === S) { const e = code.indexOf(S, j + 1); if (e >= 0) j = e; continue; }
      if (c === '(' || c === '[') pd++;
      else if (c === ')' || c === ']') pd--;
      else if (pd === 0) {
        if (c === '?') td++;
        else if (c === ':') { td--; if (td === 0) { colon = j; break; } }
        else if (c === ';' || c === '\n') break;
      }
    }
    if (colon < 0) {
      let eol = code.indexOf('\n', q);
      if (eol < 0) eol = code.length;
      code = code.slice(0, eol) + ' : null' + code.slice(eol);
    }

    return code.slice(0, exprStart) + leadWS + `_ternBool(${cond}) ` + code.slice(q);
  }
  return code;
}

/* ============================================================
   TRADUTOR  pseudo → JavaScript
   ============================================================ */
function traduzirCodigo(fonte, isDebug = false) {
  let c = String(fonte).trimEnd();
  c = removerMarcadores(c);
  const wm = c.match(
    /^\s*[A-Za-zÀ-ÖØ-öø-ÿ_]\w*\s*\(\s*\)\s*\{([\s\S]*)\}\s*$/,
  );
  if (wm) c = wm[1];

  // Raw strings: #"..." or #'...' — backslashes are literal, never escape sequences
  c = c.replace(/#"([^"\n]*)"/g,  (_, body) => '"' + body.replace(/\\/g, "\\\\") + '"');
  c = c.replace(/#'([^'\n]*)'/g,  (_, body) => "'" + body.replace(/\\/g, "\\\\") + "'");

  // Raw interpolated f-strings: #f"..." or #f'...' — backslashes literal, {expr} interpolated
  // Must run before f"..." so the f" inside #f"..." is not consumed by the f-string regex
  const _rawFTpl = (body) => {
    let tpl = "", li = 0, mt;
    const re = /\{([^}]+)\}/g;
    while ((mt = re.exec(body)) !== null) {
      tpl += body.slice(li, mt.index).replace(/\\/g, "\\\\") + "${" + mt[1] + "}";
      li = mt.index + mt[0].length;
    }
    return "`" + tpl + body.slice(li).replace(/\\/g, "\\\\") + "`";
  };
  c = c.replace(/#f"([^"\n]*)"/g, (_, body) => _rawFTpl(body));
  c = c.replace(/#f'([^'\n]*)'/g, (_, body) => _rawFTpl(body));

  c = c.replace(/f(["'])((?:[^\\\n]|\\.)*?)\1/g, (_, q, body) => {
    const tpl = body.replace(/\{([^}]+)\}/g, "${$1}");
    return "`" + tpl + "`";
  });

  const S = "\x00";
  const tks = [];
  const p = (s) => {
    tks.push(s);
    return S + (tks.length - 1) + S;
  };
  c = c.replace(/`(?:[^`\\]|\\.)*`/g, p);
  c = c.replace(/"(?:[^"\\]|\\.)*"/g, p);
  c = c.replace(/'(?:[^'\\]|\\.)*'/g, p);
  c = c.replace(/\/\*[\s\S]*?\*\//g, p);
  c = c.replace(/\/\/.*/g, p);
  c = _expandChainedComps(c);
  c = _expandTernary(c);

  /* INJEÇÃO DO DEPURADOR VISUAL */
  let dbgInjetor = "";
  if (isDebug) {
    const vars = new Set();
    const userFuncs = new Set();
    const aliasesToAwait = new Set([
      "m.somatorio",
      "m.produtorio",
      "c.limite",
      "c.derivada",
      "c.integral",
      "c.taylor",
      "p.monteCarlo",
      "tp.testeStress",
      "tp.medirExecucao",
    ]);

    const varRe =
      /\b(inteiro|real|caracter|booleano|super)\s+([A-Za-zÀ-ÖØ-öø-ÿ_]\w*)/g;
    const paramRe =
      /\b(inteiro|real|caracter|booleano)\s*\(\s*([A-Za-zÀ-ÖØ-öø-ÿ_]\w*)/g;
    const fnRe = /\bfuncao\s+([A-Za-zÀ-ÖØ-öø-ÿ_]\w*)/g;
    const importRe =
      /\bimportar\s+([A-Za-z_]\w*)(?:\.([A-Za-z_]\w*))?(?:\s+como\s+([A-Za-z_]\w*))?\s*;?/g;

    let m;
    while ((m = varRe.exec(c)) !== null) vars.add(m[2]);
    while ((m = paramRe.exec(c)) !== null) vars.add(m[2]);
    while ((m = fnRe.exec(c)) !== null) userFuncs.add(m[1]);
    while ((m = importRe.exec(c)) !== null) {
      const bib = m[1],
        sub = m[2],
        alias = m[3] || sub || bib;
      const fullName = sub ? `${bib}.${sub}` : bib;
      if (aliasesToAwait.has(fullName)) aliasesToAwait.add(alias);
    }

    dbgInjetor = "function __getVars() { let r = {};\n";
    vars.forEach((v) => {
      dbgInjetor += `try { r['${v}'] = ${v}; } catch(e) {}\n`;
    });
    dbgInjetor += "return r; }\n";

    const funcsToAwait = Array.from(userFuncs).concat(
      Array.from(aliasesToAwait),
    );
    c = injectAwait(c, funcsToAwait);

    const safeStart =
      /^(inteiro|real|caracter|booleano|super|se|enquanto|para|escolha|tentar|lançar|imprima|leia|retorno|quebrar|continuar|[A-Za-zÀ-ÖØ-öø-ÿ_]\w*(?:\.[A-Za-zÀ-ÖØ-öø-ÿ_]\w*)*\s*(?:=|\())/;
    let linhas = c.split("\n");
    for (let i = 0; i < linhas.length; i++) {
      let l = linhas[i].trim();
      if (
        /^(senao|caso\b|padrao\b|faca\b|capturar\b|\{|\})/.test(l) ||
        /^funcao\b/.test(l)
      )
        continue;
      if (safeStart.test(l)) {
        linhas[i] = `await window._dbg(${i + 1}, __getVars()); ` + linhas[i];
      }
    }
    c = linhas.join("\n");
  }

  c = processarParametrosTipados(c, isDebug);

  c = c.replace(
    /\b(inteiro|real|caracter|booleano)\s+([A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_]*)\s*=(?!=)\s*([^\n;]+)/g,
    (_, tipo, nome, expr) =>
      `let ${nome} = __tc('${tipo}','${nome}',${expr.trimEnd()})`,
  );

  const tp = String.raw`\x00\d+\x00`;
  c = c.replace(
    new RegExp(`(${tp})\\s*\\*\\s*([A-Za-z0-9_]+)`, "g"),
    "$1.repeat($2)",
  );
  c = c.replace(
    new RegExp(`([A-Za-z0-9_]+)\\s*\\*\\s*(${tp})`, "g"),
    "$2.repeat($1)",
  );

  // Range literals: a...b (inclusive both ends) → _pseudoRange(a, b)
  c = c.replace(/\b(\w+)\s*\.\.\.\s*(\w+)\b/g, "_pseudoRange($1, $2)");

  c = c.replace(
    /\bimportar\s+([A-Za-z_]\w*)(?:\.([A-Za-z_]\w*))?(?:\s+como\s+([A-Za-z_]\w*))?\s*;?/g,
    (_, bib, sub, alias) => {
      const obj = sub ? `['${bib}']['${sub}']` : `['${bib}']`;
      const aliasStr = alias || sub || bib;
      return `if (!Bibliotecas['${bib}']) { await window._baixarDaNuvem('${bib}'); }\nvar ${aliasStr}=Bibliotecas${obj};`;
    },
  );

  c = c.replace(
    /\bpara\s*\(\s*(?:(?:inteiro|real|caracter|booleano|super)\s+)?([A-Za-zÀ-ÖØ-öø-ÿ_]\w*)\s+(?:em|na|no)\s+((?:[^)(]|\([^)]*\))+)\)/g,
    (_, varName, expr) => `for(let ${varName.trim()} of ${expr.trim()})`,
  );

  c = c.replace(/(?<!')\bsuper\b/g, "let");
  c = c.replace(/(?<!')\bbooleano\b/g, "let");
  c = c.replace(/(?<!')\binteiro\b/g, "let");
  c = c.replace(/(?<!')\breal\b/g, "let");
  c = c.replace(/(?<!')\bcaracter\b/g, "let");
  c = c.replace(/(?<!\.)\bverdadeiro\b/g, "true");
  c = c.replace(/(?<!\.)\bfalso\b/g, "false");
  c = c.replace(/(?<!\.)\bvazio\b/g, "null");
  c = c.replace(/(?<!\.)\bindefinido\b/g, "undefined");
  c = c.replace(/(?<!\.)\bInfinito\b/g, "Infinity");
  c = c.replace(/(?<!\.)\bNegInfinito\b/g, "-Infinity");
  c = c.replace(/\bmod\b/g, "%");
  c = c.replace(/\bou\b/g, "||");
  // Substituição context-aware: casa 'e' (operador lógico) somente quando
  // cercado por espaços E precedido por fim de expressão. \s+ (não \s*)
  // é essencial para não casar 'e' dentro de palavras como "Bibliotecas".
  c = c.replace(/(?<=[)\]}\w])\s+e\s+(?=[(\[!\w])/g, " && ");
  c = c.replace(/\bnao\b/g, "!");
  c = c.replace(/\blançar\s+erro(?=\s*\()/g, "throw _pseudoLancar");
  // lançar erro "msg"  →  throw new Error("msg")  [string já tokenizada como \x00N\x00]
  c = c.replace(
    new RegExp("\\blançar\\s+erro\\s+(" + S + "\\d+" + S + ")", "g"),
    (_, tok) => "throw new Error(" + tok + ")",
  );
  // lançar erro variavel  →  throw new Error(variavel)
  c = c.replace(
    /\blançar\s+erro\s+([A-Za-zÀ-ÖØ-öø-ÿ_][\w]*)/g,
    "throw new Error($1)",
  );
  c = c.replace(/\blançar\s+erro\b/g, "throw new Error");
  c = c.replace(/\blançar\b/g, "throw");

  c = c.replace(/\bfuncao\b/g, isDebug ? "async function" : "function");
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
  if (isDebug) {
    c = c.replace(
      /\bcapturar\s*\(([^)]+)\)\s*\{/g,
      (_, param) => {
        const p = param.trim();
        return `catch (${p}) { if (${p} && ${p}.message === "DEBUG_ABORT") throw ${p};`;
      },
    );
  } else {
    c = c.replace(/\bcapturar\b/g, "catch");
  }
  c = c.replace(/\bleia\b/g, "await leiaAsync");
  // Auto-await async arquivos functions (lerCSV, lerJSON, lerTXT)
  {
    const _arqM = c.match(/var\s+(\w+)\s*=\s*Bibliotecas\['arquivos'\]/);
    if (_arqM) {
      const _a = _arqM[1];
      ["lerCSV", "lerJSON", "lerTXT", "lerPDADOS"].forEach((fn) => {
        c = c.replace(
          new RegExp(`(?<!await )\\b${_a}\\.${fn}\\b`, "g"),
          `await ${_a}.${fn}`
        );
      });
    }
  }
  c = c.replace(new RegExp(S + "(\\d+)" + S, "g"), (_, i) => tks[parseInt(i)]);

  const watchdogCode = `if (Date.now() - window.__inicioExecucao > 3000) throw new Error("Tempo limite de execução excedido (Loop Infinito?). O algoritmo foi abortado para proteger o navegador.");`;

  c = c.replace(
    /(for\s*\([^)]+\)\s*\{|while\s*\([^)]+\)\s*\{|do\s*\{)/g,
    `$1 ${watchdogCode}\n`,
  );

  if (isDebug) {
    _dbgPrefixLines = (dbgInjetor.match(/\n/g) || []).length;
    c = dbgInjetor + c;
  } else {
    _dbgPrefixLines = 0;
  }
  _lastTranslatedCode = c;
  return c;
}

function _extrairLinhaErro(stack) {
  if (!stack || !_lastTranslatedCode) return null;
  const transLines = _lastTranslatedCode.split("\n");
  const maxJS = transLines.length;

  // Collect all anonymous-eval frame line numbers from the full stack
  const frameRe =
    /(?:<anonymous>|debugger eval code|eval code|Function code).*?:(\d+):\d+/gi;
  const atRe = /@[^\n@]*?:(\d+):\d+/gi;
  const candidatos = [];
  let m;
  for (const re of [frameRe, atRe]) {
    re.lastIndex = 0;
    while ((m = re.exec(stack)) !== null) {
      const bodyLine = parseInt(m[1]) - 2;
      if (bodyLine > _dbgPrefixLines && bodyLine <= maxJS + 4)
        candidatos.push(bodyLine);
    }
  }
  if (candidatos.length === 0) return null;

  // The first candidate is the deepest (most specific) frame — closest to where the error threw
  const bodyLine = candidatos[0];
  if (bodyLine <= 0) return null;

  // Count non-injected lines from after the dbgInjetor prefix up to bodyLine
  let pseudoLine = 0;
  for (let i = _dbgPrefixLines; i < Math.min(bodyLine, transLines.length); i++) {
    if (!_isLinhaInjetada(transLines[i].trim())) pseudoLine++;
  }
  return pseudoLine > 0 ? pseudoLine : null;
}

function limparConsole() {
  if (typeof window.limparErroNoEditor === "function")
    window.limparErroNoEditor();
  _c().innerHTML =
    '<div class="console-placeholder"><span class="placeholder-icon">▶</span>Execute seu algoritmo para ver os resultados.</div>';
  const s = document.getElementById("exec-status");
  if (s) {
    s.textContent = "";
    s.className = "exec-status";
  }
}

async function executarCodigo(isDebug = false) {
  limparConsole();
  _c().innerHTML = "";
  window.__inicioExecucao = Date.now();
  const status = document.getElementById("exec-status");
  let traduzido;
  try {
    traduzido = traduzirCodigo(
      document.getElementById("code-editor").value,
      isDebug,
    );
  } catch (erroTrad) {
    console.warn("[Pseudo-IDE] Erro na tradução:", erroTrad);
    _imprimaErro(erroTrad);
    if (status) {
      status.textContent = "erro";
      status.className = "exec-status error";
    }
    return;
  }

  console.groupCollapsed("[Pseudo-IDE] Código JS gerado");
  console.log(traduzido);
  console.groupEnd();
  const ctx = `(async function __A__(){\ntry{\n${traduzido}\nconst __f=document.createElement('div');__f.className='console-end-marker';__f.textContent='Execução finalizada com sucesso';\ndocument.getElementById('console-saida').appendChild(__f);\ndocument.getElementById('console-saida').scrollTop=99999;\n}catch(__e){\nif(__e && __e.message === "DEBUG_ABORT") return;\nconst __ln=_extrairLinhaErro(__e&&__e.stack);\n_imprimaErro(__e,__ln);\n}})();`;

  try {
    await eval(ctx);
    if (status) {
      status.textContent = "OK";
      status.className = "exec-status ok";
    }
  } catch (erroEval) {
    if (erroEval && erroEval.message === "DEBUG_ABORT") return;
    const ln = _extrairLinhaErro(erroEval && erroEval.stack);
    _imprimaErro(erroEval, ln);
    if (status) {
      status.textContent = "erro";
      status.className = "exec-status error";
    }
  }
}

/* ============================================================
   EMPACOTADOR E NUVEM (CLOUD)
   ============================================================ */
window.compilarParaBiblioteca = function (codigo, nomeBib) {
  let traduzido = traduzirCodigo(codigo, false);

  let funcoesExportadas = [];
  const fnRegex =
    /(?:async\s+)?function\s+([A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_]*)\s*\(/g;
  let m;
  while ((m = fnRegex.exec(traduzido)) !== null) {
    // Se o nome da função NÃO começar com sublinhado, ela é exportada!
    if (!m[1].startsWith("_")) {
      funcoesExportadas.push(m[1]);
    }
  }

  if (funcoesExportadas.length === 0) {
    throw new Error(
      "A biblioteca não possui funções exportáveis. Lembre-se que elas precisam ser declaradas usando a palavra 'funcao'.",
    );
  }

  let exportacoes = funcoesExportadas.map((f) => `${f}: ${f}`).join(", ");

  // Transformamos a capa num escopo ASSÍNCRONO para suportar importações nativas internamente!
  return `
// Autogerado: ${nomeBib}
(async function() {
    ${traduzido}
    Bibliotecas['${nomeBib}'] = { ${exportacoes} };
})();
`;
};

window._baixarDaNuvem = async function (nomeBib) {
  const url = localStorage.getItem("pseudo_ide_cloud_url");
  if (!url)
    throw new Error(
      `Servidor de Nuvem não configurado. Vá no botão 'API' no cabeçalho.`,
    );

  if (typeof imprima === "function")
    imprima(`⏳ Baixando pacote '${nomeBib}' da nuvem...`);

  try {
    const char = url.includes("?") ? "&" : "?";
    const res = await fetch(`${url}${char}nome=${nomeBib}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const libData = await res.json();

    // A blindagem de integridade!
    if (!libData || !libData.codigoInjetor) {
      throw new Error(
        `O servidor respondeu, mas o pacote '${nomeBib}' veio vazio ou não existe no banco de dados.`,
      );
    }

    // O await eval garante que a biblioteca tenha tempo de carregar as próprias dependências
    await eval(libData.codigoInjetor);

    if (typeof imprima === "function")
      imprima(`✓ Biblioteca '${nomeBib}' carregada com sucesso!`);
  } catch (e) {
    throw new Error(
      `Falha ao carregar a biblioteca '${nomeBib}': ${e.message}`,
    );
  }
};
