// dotcode — code translator, no backend, talks straight to Groq.
// the key the visitor pastes in never leaves their browser except
// to go to Groq's API. everything below is just DOM wiring + a
// tiny theme engine, nothing fancy.

// languages we support. first 7 (free: true) are open to everyone,
// the rest are locked behind the "email me" paywall for now.
// want to add one? just drop another object in here.
const LANGUAGES = [
  { id: 'python', name: 'Python', free: true },
  { id: 'javascript', name: 'JavaScript', free: true },
  { id: 'java', name: 'Java', free: true },
  { id: 'cpp', name: 'C++', free: true },
  { id: 'csharp', name: 'C#', free: true },
  { id: 'go', name: 'Go', free: true },
  { id: 'php', name: 'PHP', free: true },
  { id: 'typescript', name: 'TypeScript', free: false },
  { id: 'rust', name: 'Rust', free: false },
  { id: 'kotlin', name: 'Kotlin', free: false },
  { id: 'swift', name: 'Swift', free: false },
  { id: 'ruby', name: 'Ruby', free: false },
  { id: 'r', name: 'R', free: false },
  { id: 'scala', name: 'Scala', free: false },
  { id: 'dart', name: 'Dart', free: false },
  { id: 'perl', name: 'Perl', free: false },
];

// theme presets, aka the "rice" packs
const PRESETS = [
  { id: 'amber', name: 'Amber CRT', accent: '#e3b341', bgDeep: '#0b0f14' },
  { id: 'nord', name: 'Nord', accent: '#88c0d0', bgDeep: '#0f1319' },
  { id: 'dracula', name: 'Dracula', accent: '#bd93f9', bgDeep: '#0e0e16' },
  { id: 'gruvbox', name: 'Gruvbox', accent: '#fabd2f', bgDeep: '#111008' },
  { id: 'solarized', name: 'Solarized', accent: '#2aa198', bgDeep: '#081418' },
  { id: 'paper', name: 'Paper Light', accent: '#b5502b', bgDeep: '#f4f1ea', light: true },
];

const DEFAULT_THEME = {
  accent: '#e3b341',
  radius: 6,
  density: 100,
  fontSize: 15,
  font: "'Inter', sans-serif",
  mono: "'JetBrains Mono', monospace",
  bgDeep: '#0b0f14',
  light: false,
};

const LS_KEYS = {
  theme: 'dotcode.theme',
  groqKey: 'dotcode.groqKey',
  model: 'dotcode.model',
};

function $(id) {
  return document.getElementById(id);
}

// grabbing all the elements up front so the rest of the file
// doesn't have to keep calling getElementById everywhere
const fromLangSel = $('fromLang');
const toLangSel = $('toLang');
const sourceCode = $('sourceCode');
const outputCode = $('outputCode');
const translateBtn = $('translateBtn');
const swapBtn = $('swapBtn');
const copyBtn = $('copyBtn');
const statusLine = $('statusLine');
const groqKeyInput = $('groqKey');
const modelInput = $('modelName');
const saveKeyBtn = $('saveKeyBtn');
const apiStatusDot = $('apiStatusDot');
const apiStatusLabel = $('apiStatusLabel');
const langGrid = $('langGrid');
const lockModal = $('lockModal');
const lockModalText = $('lockModalText');
const closeLockModal = $('closeLockModal');
const ricePresetsEl = $('ricePresets');

function populateLangSelects() {
  const freeLangs = LANGUAGES.filter((l) => l.free);

  [fromLangSel, toLangSel].forEach((sel, i) => {
    sel.innerHTML = '';
    for (const l of freeLangs) {
      const opt = document.createElement('option');
      opt.value = l.id;
      opt.textContent = l.name;
      sel.appendChild(opt);
    }
    // default: source = first language, target = second one
    // (or the same one if somehow there's only one free lang)
    sel.selectedIndex = i === 0 ? 0 : Math.min(1, freeLangs.length - 1);
  });
}

function populateLangGrid() {
  langGrid.innerHTML = '';

  LANGUAGES.forEach((l) => {
    const chip = document.createElement('div');
    chip.className = l.free ? 'lang-chip' : 'lang-chip locked';
    chip.innerHTML = `<span>${l.name}</span>` + (l.free ? '' : '<span class="lock-icon">🔒</span>');

    if (!l.free) {
      chip.addEventListener('click', () => openLockModal(l.name));
    }
    langGrid.appendChild(chip);
  });
}

function openLockModal(langName) {
  lockModalText.textContent = `${langName} is part of the paid language pack.`;
  lockModal.classList.add('open');
}

closeLockModal.addEventListener('click', () => lockModal.classList.remove('open'));
lockModal.addEventListener('click', (e) => {
  // only close if they clicked the dark overlay itself, not the box
  if (e.target === lockModal) lockModal.classList.remove('open');
});

// --- groq key handling ------------------------------------------------

function loadKey() {
  const key = localStorage.getItem(LS_KEYS.groqKey) || '';
  const model = localStorage.getItem(LS_KEYS.model) || modelInput.value;
  groqKeyInput.value = key;
  modelInput.value = model;
  updateApiStatus(Boolean(key));
}

function updateApiStatus(hasKey) {
  apiStatusDot.classList.toggle('ok', hasKey);
  apiStatusLabel.textContent = hasKey ? 'key connected' : 'no key';
}

saveKeyBtn.addEventListener('click', () => {
  const key = groqKeyInput.value.trim();
  const model = modelInput.value.trim();
  localStorage.setItem(LS_KEYS.groqKey, key);
  localStorage.setItem(LS_KEYS.model, model);
  updateApiStatus(Boolean(key));
  setStatus('Key saved in this browser.', 'ok');
  $('keyDrawer').removeAttribute('open');
});

// --- the actual translation call ---------------------------------------

function setStatus(msg, kind) {
  statusLine.textContent = msg;
  statusLine.className = kind ? `status-line ${kind}` : 'status-line';
}

async function translateCode() {
  const apiKey = localStorage.getItem(LS_KEYS.groqKey);
  const model = localStorage.getItem(LS_KEYS.model) || modelInput.value.trim();
  const code = sourceCode.value.trim();

  const fromName = (LANGUAGES.find((l) => l.id === fromLangSel.value) || {}).name || fromLangSel.value;
  const toName = (LANGUAGES.find((l) => l.id === toLangSel.value) || {}).name || toLangSel.value;

  if (!apiKey) {
    setStatus('Add your free Groq API key above first.', 'error');
    $('keyDrawer').setAttribute('open', 'true');
    return;
  }

  if (!code) {
    setStatus('Paste some source code first.', 'error');
    return;
  }

  translateBtn.disabled = true;
  setStatus(`Translating ${fromName} → ${toName}...`);
  outputCode.value = '';

  const systemPrompt =
    'You are a precise code translator. Convert the user\'s source code from ' + fromName + ' to ' + toName + '. ' +
    'Preserve behavior and structure as closely as the target language allows. ' +
    'Reply with ONLY the translated code, no explanations, no markdown code fences.';

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: code },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Groq API error (${res.status}): ${errBody.slice(0, 200)}`);
    }

    const data = await res.json();
    let result = (data.choices && data.choices[0] && data.choices[0].message.content) || '';

    // Groq sometimes wraps the answer in a code fence even when we
    // ask it not to, so strip that off if it's there.
    result = result.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();

    outputCode.value = result;
    setStatus('Done.', 'ok');
  } catch (err) {
    console.error(err);
    setStatus(err.message || 'Something went wrong reaching Groq.', 'error');
  } finally {
    translateBtn.disabled = false;
  }
}

translateBtn.addEventListener('click', translateCode);

swapBtn.addEventListener('click', () => {
  const f = fromLangSel.value;
  fromLangSel.value = toLangSel.value;
  toLangSel.value = f;

  const tmp = sourceCode.value;
  sourceCode.value = outputCode.value;
  outputCode.value = tmp;
});

copyBtn.addEventListener('click', async () => {
  if (!outputCode.value) return;
  await navigator.clipboard.writeText(outputCode.value);
  copyBtn.textContent = 'Copied!';
  setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
});

// --- theme / "rice" engine ----------------------------------------------
// this part just pushes CSS variables onto :root and mirrors the
// current values back into the controls so everything stays in sync.

function applyTheme(theme) {
  const root = document.documentElement.style;

  root.setProperty('--accent', theme.accent);
  root.setProperty('--radius', theme.radius + 'px');
  root.setProperty('--space', theme.density / 100);
  root.setProperty('--font-size-base', theme.fontSize + 'px');
  root.setProperty('--font-ui', theme.font);
  root.setProperty('--font-mono', theme.mono);

  if (theme.light) {
    root.setProperty('--bg-deep', theme.bgDeep || '#f4f1ea');
    root.setProperty('--bg-panel', '#eae6db');
    root.setProperty('--bg-raised', '#ffffff');
    root.setProperty('--border-dim', '#d8d2c2');
    root.setProperty('--fg-primary', '#241f16');
    root.setProperty('--fg-dim', '#6b6353');
    root.setProperty('--accent-contrast', '#ffffff');
  } else {
    root.setProperty('--bg-deep', theme.bgDeep || '#0b0f14');
    root.setProperty('--bg-panel', '#121822');
    root.setProperty('--bg-raised', '#171f2b');
    root.setProperty('--border-dim', '#232d3a');
    root.setProperty('--fg-primary', '#dce6ec');
    root.setProperty('--fg-dim', '#8593a3');
    root.setProperty('--accent-contrast', '#0b0f14');
  }

  $('accentPicker').value = theme.accent;
  $('radiusSlider').value = theme.radius;
  $('radiusVal').textContent = theme.radius + 'px';
  $('densitySlider').value = theme.density;
  $('densityVal').textContent = theme.density + '%';
  $('fontSizeSlider').value = theme.fontSize;
  $('fontSizeVal').textContent = theme.fontSize + 'px';
  $('fontChoice').value = theme.font;
  $('monoChoice').value = theme.mono;
}

function saveTheme(theme) {
  localStorage.setItem(LS_KEYS.theme, JSON.stringify(theme));
}

function loadTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEYS.theme));
    return saved ? Object.assign({}, DEFAULT_THEME, saved) : Object.assign({}, DEFAULT_THEME);
  } catch (e) {
    // malformed json in localStorage, whatever, just fall back
    return Object.assign({}, DEFAULT_THEME);
  }
}

let currentTheme = loadTheme();

function updateThemeFromControls() {
  currentTheme = Object.assign({}, currentTheme, {
    accent: $('accentPicker').value,
    radius: Number($('radiusSlider').value),
    density: Number($('densitySlider').value),
    fontSize: Number($('fontSizeSlider').value),
    font: $('fontChoice').value,
    mono: $('monoChoice').value,
  });
  applyTheme(currentTheme);
  saveTheme(currentTheme);
}

['accentPicker', 'radiusSlider', 'densitySlider', 'fontSizeSlider', 'fontChoice', 'monoChoice']
  .forEach((id) => $(id).addEventListener('input', updateThemeFromControls));

$('resetThemeBtn').addEventListener('click', () => {
  currentTheme = Object.assign({}, DEFAULT_THEME);
  applyTheme(currentTheme);
  saveTheme(currentTheme);
});

function populatePresets() {
  ricePresetsEl.innerHTML = '';

  PRESETS.forEach((p) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rice-preset-btn';
    btn.innerHTML = `<span class="rice-preset-swatch" style="background:${p.accent}"></span><span>${p.name}</span>`;

    btn.addEventListener('click', () => {
      currentTheme = Object.assign({}, currentTheme, {
        accent: p.accent,
        bgDeep: p.bgDeep,
        light: Boolean(p.light),
      });
      applyTheme(currentTheme);
      saveTheme(currentTheme);
    });

    ricePresetsEl.appendChild(btn);
  });
}

// --- kick everything off --------------------------------------------------
populateLangSelects();
populateLangGrid();
populatePresets();
applyTheme(currentTheme);
loadKey();
