/* ============================================================
   COLOR PICKER — seletor de cor inline para o editor
   ============================================================ */
(function () {
  "use strict";

  /* ── Conversões de cor ──────────────────────────────────── */

  function hsvToRgb(h, s, v) {
    s /= 100; v /= 100;
    const f = (n) => {
      const k = (n + h / 60) % 6;
      return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
    };
    return [f(5), f(3), f(1)];
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d) {
      if (max === r)      h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else                h = (r - g) / d + 4;
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }
    return [h, max ? Math.round((d / max) * 100) : 0, Math.round(max * 100)];
  }

  function hexToRgba(hex) {
    let h = hex.replace(/^#/, "");
    if (h.length === 3 || h.length === 4)
      h = h.split("").map((c) => c + c).join("");
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255,
    ];
  }

  const ch2 = (n) =>
    Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");

  function parseColor(str) {
    str = (str || "").trim();
    if (/^#[0-9a-fA-F]{8}$/.test(str)) {
      const [r, g, b, a] = hexToRgba(str); return { r, g, b, a, fmt: "hex8" };
    }
    if (/^#[0-9a-fA-F]{6}$/.test(str)) {
      const [r, g, b] = hexToRgba(str); return { r, g, b, a: 255, fmt: "hex6" };
    }
    if (/^#[0-9a-fA-F]{4}$/.test(str)) {
      const [r, g, b, a] = hexToRgba(str); return { r, g, b, a, fmt: "hex8" };
    }
    if (/^#[0-9a-fA-F]{3}$/.test(str)) {
      const [r, g, b] = hexToRgba(str); return { r, g, b, a: 255, fmt: "hex3" };
    }
    const m = str.match(
      /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i,
    );
    if (m) {
      const r = +m[1], g = +m[2], b = +m[3];
      const a =
        m[4] !== undefined
          ? +m[4] <= 1 ? Math.round(+m[4] * 255) : Math.round(+m[4])
          : 255;
      return { r, g, b, a, fmt: m[4] !== undefined ? "rgba" : "rgb" };
    }
    return null;
  }

  function formatColor(r, g, b, a, fmt) {
    const cl = (n) => Math.round(Math.max(0, Math.min(255, n)));
    r = cl(r); g = cl(g); b = cl(b); a = cl(a);
    switch (fmt) {
      case "hex3": {
        const h6 = "#" + ch2(r) + ch2(g) + ch2(b);
        const ok = h6[1] === h6[2] && h6[3] === h6[4] && h6[5] === h6[6];
        return ok ? "#" + h6[1] + h6[3] + h6[5] : h6;
      }
      case "hex8": return "#" + ch2(r) + ch2(g) + ch2(b) + ch2(a);
      case "rgb":  return `rgb(${r}, ${g}, ${b})`;
      case "rgba": return `rgba(${r}, ${g}, ${b}, ${+(a / 255).toFixed(2)})`;
      default:     return "#" + ch2(r) + ch2(g) + ch2(b);
    }
  }

  /* ── Regex de cor (compartilhado) ───────────────────────── */

  const COLOR_RE =
    /#[0-9a-fA-F]{8}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{4}|#[0-9a-fA-F]{3}(?![0-9a-fA-F])|rgba?\([^)\n]*\)/gi;

  function escHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* Injeta o círculo colorido antes de cada token de cor em texto bruto de string */
  window.cpInjetarSwatches = function (raw) {
    COLOR_RE.lastIndex = 0;
    let out = "", last = 0, m;
    while ((m = COLOR_RE.exec(raw)) !== null) {
      out += escHtml(raw.slice(last, m.index));
      const p = parseColor(m[0]);
      if (p) {
        const css = `rgba(${p.r},${p.g},${p.b},${(p.a / 255).toFixed(3)})`;
        out += `<span class="t-color-swatch" style="background:${css}"></span>`;
      }
      out += escHtml(m[0]);
      last = m.index + m[0].length;
    }
    return out + escHtml(raw.slice(last));
  };

  /* Devolve o token de cor que cobre a posição `pos` no texto, ou null */
  window.cpFindColorAt = function (text, pos) {
    COLOR_RE.lastIndex = 0;
    let m;
    while ((m = COLOR_RE.exec(text)) !== null) {
      if (m.index <= pos && pos <= m.index + m[0].length)
        return { value: m[0], start: m.index, end: m.index + m[0].length };
    }
    return null;
  };

  /* ── Popup DOM ───────────────────────────────────────────── */

  let popup = null;
  let gradCanvas, gradCtx, gradCursor;
  let hueRange, alphaRange, alphaCanvas;
  let hexInput, rInp, gInp, bInp, aInp;
  let previewEl, alphaRow, aLabel;

  let st = { h: 0, s: 100, v: 100, a: 255, fmt: "hex6" };
  let activeTA = null, mStart = -1, mEnd = -1;
  let isDragging = false;

  function buildDOM() {
    popup = document.createElement("div");
    popup.className = "cp-popup";
    popup.innerHTML = `
      <div class="cp-grad-wrap">
        <canvas class="cp-canvas" width="226" height="148"></canvas>
        <div class="cp-cursor"></div>
      </div>
      <div class="cp-bars">
        <div class="cp-bar-wrap cp-hue-wrap">
          <input type="range" class="cp-range" min="0" max="360" step="1">
        </div>
        <div class="cp-bar-wrap cp-alpha-wrap">
          <canvas class="cp-alpha-canvas" height="14"></canvas>
          <input type="range" class="cp-range" min="0" max="255" step="1">
        </div>
      </div>
      <div class="cp-bottom">
        <div class="cp-pv-wrap"><div class="cp-pv"></div></div>
        <div class="cp-fields">
          <input class="cp-hex" type="text" maxlength="9" spellcheck="false" placeholder="#rrggbb">
          <div class="cp-rgb-row">
            <label class="cp-lbl">R<input type="number" min="0" max="255"></label>
            <label class="cp-lbl">G<input type="number" min="0" max="255"></label>
            <label class="cp-lbl">B<input type="number" min="0" max="255"></label>
            <label class="cp-lbl cp-a-lbl">A<input type="number" min="0" max="255"></label>
          </div>
        </div>
      </div>`;
    document.body.appendChild(popup);

    gradCanvas  = popup.querySelector(".cp-canvas");
    gradCtx     = gradCanvas.getContext("2d");
    gradCursor  = popup.querySelector(".cp-cursor");
    hueRange    = popup.querySelectorAll(".cp-range")[0];
    alphaRange  = popup.querySelectorAll(".cp-range")[1];
    alphaCanvas = popup.querySelector(".cp-alpha-canvas");
    hexInput    = popup.querySelector(".cp-hex");
    previewEl   = popup.querySelector(".cp-pv");
    alphaRow    = popup.querySelector(".cp-alpha-wrap");
    aLabel      = popup.querySelector(".cp-a-lbl");

    const nums = popup.querySelectorAll(".cp-rgb-row input");
    [rInp, gInp, bInp, aInp] = nums;

    gradCanvas.addEventListener("mousedown", (e) => {
      isDragging = true; pickGrad(e); e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => { if (isDragging) pickGrad(e); });
    document.addEventListener("mouseup", () => { isDragging = false; });

    hueRange.addEventListener("input", () => {
      st.h = +hueRange.value; drawGrad(); syncAll(true);
    });
    alphaRange.addEventListener("input", () => {
      st.a = +alphaRange.value; syncAll(true);
    });

    hexInput.addEventListener("change", applyHex);
    hexInput.addEventListener("blur",   applyHex);
    hexInput.addEventListener("keydown", (e) => { if (e.key === "Enter") applyHex(); });

    [rInp, gInp, bInp].forEach((inp) => inp.addEventListener("change", applyRgb));
    aInp.addEventListener("change", () => {
      st.a = +aInp.value; alphaRange.value = st.a; syncAll(true);
    });

    document.addEventListener("mousedown", (e) => {
      if (
        popup.style.display !== "none" &&
        !popup.contains(e.target) &&
        e.target !== activeTA
      ) cpHide();
    }, true);
  }

  function pickGrad(e) {
    const rect = gradCanvas.getBoundingClientRect();
    st.s = Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 100);
    st.v = Math.round((1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))) * 100);
    drawGrad();
    syncAll(true);
  }

  function applyHex() {
    const p = parseColor(hexInput.value.trim());
    if (!p) return;
    const [h, s, v] = rgbToHsv(p.r, p.g, p.b);
    Object.assign(st, { h, s, v, a: p.a });
    hueRange.value = h; alphaRange.value = p.a;
    drawGrad(); syncAll(false);
  }

  function applyRgb() {
    const [h, s, v] = rgbToHsv(+rInp.value, +gInp.value, +bInp.value);
    Object.assign(st, { h, s, v });
    hueRange.value = h;
    drawGrad(); syncAll(true);
  }

  /* ── Desenho ─────────────────────────────────────────────── */

  function drawGrad() {
    const W = gradCanvas.width, H = gradCanvas.height;
    gradCtx.fillStyle = `hsl(${st.h},100%,50%)`;
    gradCtx.fillRect(0, 0, W, H);
    const wg = gradCtx.createLinearGradient(0, 0, W, 0);
    wg.addColorStop(0, "rgba(255,255,255,1)");
    wg.addColorStop(1, "rgba(255,255,255,0)");
    gradCtx.fillStyle = wg; gradCtx.fillRect(0, 0, W, H);
    const bg = gradCtx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "rgba(0,0,0,0)");
    bg.addColorStop(1, "rgba(0,0,0,1)");
    gradCtx.fillStyle = bg; gradCtx.fillRect(0, 0, W, H);
    gradCursor.style.left = (st.s / 100) * W + "px";
    gradCursor.style.top  = (1 - st.v / 100) * H + "px";
  }

  function drawAlpha(r, g, b) {
    const W = alphaCanvas.offsetWidth;
    if (!W) return;
    alphaCanvas.width = W;
    const ctx2 = alphaCanvas.getContext("2d");
    const g2 = ctx2.createLinearGradient(0, 0, W, 0);
    g2.addColorStop(0, `rgba(${r},${g},${b},0)`);
    g2.addColorStop(1, `rgba(${r},${g},${b},1)`);
    ctx2.clearRect(0, 0, W, 14);
    ctx2.fillStyle = g2;
    ctx2.fillRect(0, 0, W, 14);
  }

  /* ── Sincronizar estado → UI + textarea ─────────────────── */

  function syncAll(updateHexField) {
    const [r, g, b] = hsvToRgb(st.h, st.s, st.v);
    const colorStr = formatColor(r, g, b, st.a, st.fmt);

    previewEl.style.background = `rgba(${r},${g},${b},${st.a / 255})`;
    if (updateHexField) hexInput.value = colorStr;
    rInp.value = r; gInp.value = g; bInp.value = b; aInp.value = st.a;

    const hasA = st.fmt === "rgba" || st.fmt === "hex8";
    alphaRow.style.display = hasA ? "" : "none";
    aLabel.style.display   = hasA ? "" : "none";

    drawAlpha(r, g, b);

    if (activeTA && mStart >= 0) {
      const txt = activeTA.value;
      activeTA.value = txt.slice(0, mStart) + colorStr + txt.slice(mEnd);
      mEnd = mStart + colorStr.length;
      activeTA.selectionStart = activeTA.selectionEnd = mEnd;
      activeTA.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  /* ── API pública ─────────────────────────────────────────── */

  function cpShow(x, y, match, textarea) {
    if (!popup) buildDOM();
    const p = parseColor(match.value);
    if (!p) return;

    activeTA = textarea;
    mStart   = match.start;
    mEnd     = match.end;

    const [h, s, v] = rgbToHsv(p.r, p.g, p.b);
    st = { h, s, v, a: p.a, fmt: p.fmt };
    hueRange.value   = h;
    alphaRange.value = p.a;

    const hasA = p.fmt === "rgba" || p.fmt === "hex8";
    alphaRow.style.display = hasA ? "" : "none";
    aLabel.style.display   = hasA ? "" : "none";

    popup.style.display    = "block";
    popup.style.visibility = "hidden";
    drawGrad();
    syncAll(true);

    requestAnimationFrame(() => {
      const PW = popup.offsetWidth, PH = popup.offsetHeight;
      let left = x + 12, top = y + 12;
      if (left + PW > window.innerWidth  - 8) left = x - PW - 4;
      if (top  + PH > window.innerHeight - 8) top  = Math.max(4, window.innerHeight - PH - 4);
      popup.style.left       = Math.max(4, left) + "px";
      popup.style.top        = Math.max(4, top)  + "px";
      popup.style.visibility = "";
    });
  }

  function cpHide() {
    if (popup) popup.style.display = "none";
    activeTA = null;
    mStart = mEnd = -1;
  }

  window.cpShow = cpShow;
  window.cpHide = cpHide;
})();
