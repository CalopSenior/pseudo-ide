/* Pseudo-IDE — Theme engine
   Applies on load, exposes _openThemeModal / _closeThemeModal / _resetTheme */
(function () {
  'use strict';
  const STORE_KEY = 'pseudo_ide_theme';

  const DEFAULTS = {
    '--bg-app':        '#0f1117',
    '--bg-editor':     '#13151f',
    '--bg-console':    '#0d0f16',
    '--bg-panel':      '#1a1d28',
    '--bg-header':     '#1e2130',
    '--bg-hover':      '#252840',
    '--bg-modal':      '#161924',
    '--bg-tab':        '#12141e',
    '--border':        '#2a2d40',
    '--border-light':  '#353850',
    '--text':          '#d2d6e8',
    '--text-muted':    '#5a6080',
    '--text-dim':      '#8890b0',
    '--accent':        '#7c83ff',
    '--accent-dim':    '#4a50c8',
    '--green':         '#4ade80',
    '--red':           '#f87171',
    '--syn-type':      '#7dd3fc',
    '--syn-ctrl':      '#c084fc',
    '--syn-fn':        '#86efac',
    '--syn-val':       '#f9a8d4',
    '--syn-str':       '#fca5a1',
    '--syn-num':       '#fdba74',
    '--syn-cmt':       '#4b5280',
    '--syn-op':        '#e879f9',
    '--syn-import':    '#93c5fd',
    '--syn-user-fn':   '#34d399',
    '--syn-user-var':  '#fbbf24',
  };

  const PRESETS = {
    'Escuro (padrão)': { ...DEFAULTS },
    'Claro': {
      '--bg-app':        '#f0f2f8',
      '--bg-editor':     '#ffffff',
      '--bg-console':    '#f5f7fc',
      '--bg-panel':      '#eaecf4',
      '--bg-header':     '#dde1f0',
      '--bg-hover':      '#d0d4e8',
      '--bg-modal':      '#f8f9fe',
      '--bg-tab':        '#e8eaf4',
      '--border':        '#c8ccdc',
      '--border-light':  '#aab0cc',
      '--text':          '#1a1f38',
      '--text-muted':    '#8090b0',
      '--text-dim':      '#5060a0',
      '--accent':        '#5056d8',
      '--accent-dim':    '#3038b0',
      '--green':         '#16a34a',
      '--red':           '#dc2626',
      '--syn-type':      '#0284c7',
      '--syn-ctrl':      '#7c3aed',
      '--syn-fn':        '#059669',
      '--syn-val':       '#be185d',
      '--syn-str':       '#b91c1c',
      '--syn-num':       '#c2410c',
      '--syn-cmt':       '#94a3b8',
      '--syn-op':        '#a21caf',
      '--syn-import':    '#1d4ed8',
      '--syn-user-fn':   '#047857',
      '--syn-user-var':  '#b45309',
    },
    'Dracula': {
      '--bg-app':        '#282a36',
      '--bg-editor':     '#21222c',
      '--bg-console':    '#191a21',
      '--bg-panel':      '#2a2c3a',
      '--bg-header':     '#21222c',
      '--bg-hover':      '#343746',
      '--bg-modal':      '#1e1f29',
      '--bg-tab':        '#191a21',
      '--border':        '#44475a',
      '--border-light':  '#6272a4',
      '--text':          '#f8f8f2',
      '--text-muted':    '#6272a4',
      '--text-dim':      '#8d95bd',
      '--accent':        '#bd93f9',
      '--accent-dim':    '#6272a4',
      '--green':         '#50fa7b',
      '--red':           '#ff5555',
      '--syn-type':      '#8be9fd',
      '--syn-ctrl':      '#ff79c6',
      '--syn-fn':        '#50fa7b',
      '--syn-val':       '#ffb86c',
      '--syn-str':       '#f1fa8c',
      '--syn-num':       '#ffb86c',
      '--syn-cmt':       '#6272a4',
      '--syn-op':        '#ff79c6',
      '--syn-import':    '#8be9fd',
      '--syn-user-fn':   '#50fa7b',
      '--syn-user-var':  '#ffb86c',
    },
    'Nord': {
      '--bg-app':        '#2e3440',
      '--bg-editor':     '#2e3440',
      '--bg-console':    '#3b4252',
      '--bg-panel':      '#3b4252',
      '--bg-header':     '#2e3440',
      '--bg-hover':      '#434c5e',
      '--bg-modal':      '#2e3440',
      '--bg-tab':        '#252a35',
      '--border':        '#4c566a',
      '--border-light':  '#616e88',
      '--text':          '#eceff4',
      '--text-muted':    '#4c566a',
      '--text-dim':      '#7b88a8',
      '--accent':        '#88c0d0',
      '--accent-dim':    '#5e81ac',
      '--green':         '#a3be8c',
      '--red':           '#bf616a',
      '--syn-type':      '#88c0d0',
      '--syn-ctrl':      '#81a1c1',
      '--syn-fn':        '#a3be8c',
      '--syn-val':       '#d08770',
      '--syn-str':       '#a3be8c',
      '--syn-num':       '#b48ead',
      '--syn-cmt':       '#616e88',
      '--syn-op':        '#81a1c1',
      '--syn-import':    '#8fbcbb',
      '--syn-user-fn':   '#8fbcbb',
      '--syn-user-var':  '#ebcb8b',
    },
    'Oceânico': {
      '--bg-app':        '#0d1117',
      '--bg-editor':     '#0d1117',
      '--bg-console':    '#090d12',
      '--bg-panel':      '#161b22',
      '--bg-header':     '#161b22',
      '--bg-hover':      '#1f2937',
      '--bg-modal':      '#0d1117',
      '--bg-tab':        '#0d1117',
      '--border':        '#21262d',
      '--border-light':  '#30363d',
      '--text':          '#c9d1d9',
      '--text-muted':    '#484f58',
      '--text-dim':      '#8b949e',
      '--accent':        '#388bfd',
      '--accent-dim':    '#1158c7',
      '--green':         '#3fb950',
      '--red':           '#f85149',
      '--syn-type':      '#79c0ff',
      '--syn-ctrl':      '#ff7b72',
      '--syn-fn':        '#d2a8ff',
      '--syn-val':       '#79c0ff',
      '--syn-str':       '#a5d6ff',
      '--syn-num':       '#f2cc60',
      '--syn-cmt':       '#484f58',
      '--syn-op':        '#ff7b72',
      '--syn-import':    '#79c0ff',
      '--syn-user-fn':   '#56d364',
      '--syn-user-var':  '#f2cc60',
    },
  };

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function applyVars(vars) {
    const root = document.documentElement;
    const merged = Object.assign({}, DEFAULTS, vars);
    for (const [k, v] of Object.entries(merged)) {
      root.style.setProperty(k, v);
    }
    const [ar, ag, ab] = hexToRgb(merged['--accent'] || DEFAULTS['--accent']);
    const [gr, gg, gb] = hexToRgb(merged['--green']  || DEFAULTS['--green']);
    const [rr, rg, rb] = hexToRgb(merged['--red']    || DEFAULTS['--red']);
    root.style.setProperty('--accent-glow', `rgba(${ar},${ag},${ab},0.15)`);
    root.style.setProperty('--green-dim',   `rgba(${gr},${gg},${gb},0.15)`);
    root.style.setProperty('--red-dim',     `rgba(${rr},${rg},${rb},0.12)`);

    // docs-api.html uses its own inline var names — bridge them
    root.style.setProperty('--bg',      merged['--bg-app']);
    root.style.setProperty('--panel',   merged['--bg-panel']);
    root.style.setProperty('--muted',   merged['--text-muted']);
    root.style.setProperty('--accent2', merged['--syn-import']);
    root.style.setProperty('--yellow',  merged['--syn-num']);
    root.style.setProperty('--pink',    merged['--syn-val']);
    root.style.setProperty('--fn',      merged['--syn-fn']);
    root.style.setProperty('--type',    merged['--syn-type']);
    root.style.setProperty('--kw',      merged['--syn-ctrl']);
  }

  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (_) { return {}; }
  }

  function saveCurrent(vars) {
    localStorage.setItem(STORE_KEY, JSON.stringify(vars));
    applyVars(vars);
  }

  // ─── Modal ────────────────────────────────────────────────────────────────

  const GROUPS = [
    {
      label: 'Interface',
      items: [
        ['--bg-app',       'Fundo geral'],
        ['--bg-editor',    'Fundo do editor'],
        ['--bg-console',   'Fundo do console'],
        ['--bg-panel',     'Fundo de painéis'],
        ['--bg-header',    'Cabeçalho'],
        ['--bg-hover',     'Hover / seleção'],
        ['--bg-modal',     'Modais'],
        ['--bg-tab',       'Abas / barras'],
        ['--border',       'Borda padrão'],
        ['--border-light', 'Borda clara'],
        ['--text',         'Texto principal'],
        ['--text-muted',   'Texto apagado'],
        ['--text-dim',     'Texto intermediário'],
        ['--accent',       'Cor de destaque'],
        ['--accent-dim',   'Destaque escuro'],
        ['--green',        'Verde (sucesso)'],
        ['--red',          'Vermelho (erro)'],
      ],
    },
    {
      label: 'Syntax Highlighting',
      items: [
        ['--syn-type',      'Tipos  (inteiro, real…)'],
        ['--syn-ctrl',      'Controle  (se, para, enquanto…)'],
        ['--syn-fn',        'Funções nativas'],
        ['--syn-val',       'Valores literais  (verdadeiro, nulo…)'],
        ['--syn-str',       'Strings'],
        ['--syn-num',       'Números'],
        ['--syn-cmt',       'Comentários'],
        ['--syn-op',        'Operadores'],
        ['--syn-import',    'importar / como'],
        ['--syn-user-fn',   'Funções definidas pelo usuário'],
        ['--syn-user-var',  'Variáveis definidas pelo usuário'],
      ],
    },
  ];

  function buildModal() {
    if (document.getElementById('theme-modal')) return;

    const current = Object.assign({}, DEFAULTS, loadSaved());

    const presetHtml = Object.keys(PRESETS)
      .map(n => `<button class="theme-preset-btn" data-preset="${n}">${n}</button>`)
      .join('');

    const groupsHtml = GROUPS.map(g => {
      const rows = g.items.map(([varName, lbl]) => {
        const val = current[varName] || '#000000';
        return `<div class="theme-var-row">
          <div class="theme-swatch-wrap">
            <span class="theme-swatch" style="background:${val}"></span>
            <input type="color" data-var="${varName}" value="${val}" title="${lbl}">
          </div>
          <input type="text" class="theme-hex-input" data-var="${varName}" maxlength="7" value="${val}" spellcheck="false">
          <span class="theme-var-lbl">${lbl}</span>
        </div>`;
      }).join('');
      return `<div class="theme-group">
        <div class="theme-group-label">${g.label}</div>
        <div class="theme-vars-grid">${rows}</div>
      </div>`;
    }).join('');

    const tpl = `<div id="theme-modal" class="modal-overlay hidden" role="dialog" aria-modal="true">
  <div class="modal-box" style="max-width:700px">
    <div class="modal-header">
      <h2>Configurações de Aparência</h2>
      <button class="btn-close" onclick="window._closeThemeModal()" title="Fechar">×</button>
    </div>
    <div class="modal-body" style="padding:20px 24px;overflow-y:auto">
      <p style="margin-bottom:14px;font-size:13px;color:var(--text-dim)">
        Personalize cada cor da IDE. As mudanças são salvas automaticamente e aplicadas em todas as páginas.
      </p>
      <div class="theme-presets">${presetHtml}</div>
      ${groupsHtml}
    </div>
    <div class="modal-footer">
      <button class="btn-icon" onclick="window._resetTheme()" style="color:var(--red);margin-right:auto">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        Restaurar padrão
      </button>
      <button class="btn-primary" onclick="window._closeThemeModal()">Fechar</button>
    </div>
  </div>
</div>`;

    document.body.insertAdjacentHTML('beforeend', tpl);
    wireEvents();
  }

  function wireEvents() {
    const modal = document.getElementById('theme-modal');

    modal.querySelectorAll('.theme-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = PRESETS[btn.dataset.preset];
        if (!preset) return;
        saveCurrent(preset);
        refreshInputs(preset);
      });
    });

    modal.querySelectorAll('input[type="color"]').forEach(inp => {
      inp.addEventListener('input', () => syncFromColor(inp));
    });

    modal.querySelectorAll('.theme-hex-input').forEach(inp => {
      inp.addEventListener('input', () => {
        if (/^#[0-9a-fA-F]{6}$/.test(inp.value)) syncFromHex(inp);
      });
      inp.addEventListener('blur', () => {
        if (!/^#[0-9a-fA-F]{6}$/.test(inp.value)) {
          const saved = Object.assign({}, DEFAULTS, loadSaved());
          inp.value = saved[inp.dataset.var] || DEFAULTS[inp.dataset.var] || '#000000';
        }
      });
    });

    modal.addEventListener('click', e => { if (e.target === modal) window._closeThemeModal(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) window._closeThemeModal();
    });
  }

  function syncFromColor(inp) {
    const val = inp.value;
    const row = inp.closest('.theme-var-row');
    if (row) {
      const swatch = row.querySelector('.theme-swatch');
      const hexInp = row.querySelector('.theme-hex-input');
      if (swatch) swatch.style.background = val;
      if (hexInp) hexInp.value = val;
    }
    const cur = loadSaved();
    cur[inp.dataset.var] = val;
    saveCurrent(cur);
  }

  function syncFromHex(inp) {
    const val = inp.value;
    const row = inp.closest('.theme-var-row');
    if (row) {
      const swatch = row.querySelector('.theme-swatch');
      const colInp = row.querySelector('input[type="color"]');
      if (swatch) swatch.style.background = val;
      if (colInp) colInp.value = val;
    }
    const cur = loadSaved();
    cur[inp.dataset.var] = val;
    saveCurrent(cur);
  }

  function refreshInputs(vars) {
    const modal = document.getElementById('theme-modal');
    if (!modal) return;
    const merged = Object.assign({}, DEFAULTS, vars);
    modal.querySelectorAll('[data-var]').forEach(inp => {
      const val = merged[inp.dataset.var] || '#000000';
      inp.value = val;
      const row = inp.closest('.theme-var-row');
      if (row) {
        const swatch = row.querySelector('.theme-swatch');
        if (swatch) swatch.style.background = val;
      }
    });
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  window._openThemeModal = function () {
    buildModal();
    document.getElementById('theme-modal').classList.remove('hidden');
  };

  window._closeThemeModal = function () {
    const el = document.getElementById('theme-modal');
    if (el) el.classList.add('hidden');
  };

  window._resetTheme = function () {
    localStorage.removeItem(STORE_KEY);
    applyVars({});
    refreshInputs({});
  };

  // Apply immediately on load
  applyVars(loadSaved());
})();
