// ── Default NGROK URL ──────────────────────────────────────────────────────
const DEFAULT_API = 'https://arguable-clarify-capillary.ngrok-free.dev';

let ings = [], apiBase = '', last = null;

// On load: prefer localStorage, fall back to default
(function init() {
  let saved = '';
  try { saved = localStorage.getItem('cm_api2') || ''; } catch(e) {}
  apiBase = saved || DEFAULT_API;
  document.getElementById('apiUrl').value = apiBase;
  checkStatus();
})();

function toggleTheme(){
  const r = document.documentElement;
  const cur = r.getAttribute('data-theme');
  if (!cur) { r.setAttribute('data-theme', window.matchMedia('(prefers-color-scheme:dark)').matches ? 'light' : 'dark'); }
  else r.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
}

function saveUrl(){
  const v = document.getElementById('apiUrl').value.trim().replace(/\/$/, '');
  apiBase = v;
  try { localStorage.setItem('cm_api2', v); } catch(e) {}
  checkStatus();
}

async function checkStatus(){
  const dot = document.getElementById('sDot'), txt = document.getElementById('sTxt');
  if (!apiBase) { dot.className = 's-dot'; txt.textContent = 'Paste your API URL above'; return; }
  txt.textContent = 'Connecting…'; dot.className = 's-dot';
  try {
    const r = await fetch(apiBase + '/', { headers: { 'ngrok-skip-browser-warning': '1' } });
    if (r.ok) { dot.className = 's-dot on'; txt.textContent = 'Connected — ready to cook 🍳'; }
    else throw 0;
  } catch {
    dot.className = 's-dot off';
    txt.textContent = 'Cannot reach API — start your Colab cell then click Connect';
  }
}

function addIng(){
  const inp = document.getElementById('ingInp');
  const raw = inp.value.trim(); if (!raw) return;
  raw.split(',').map(s => s.trim()).filter(Boolean).forEach(p => {
    if (p && !ings.includes(p.toLowerCase())) ings.push(p.toLowerCase());
  });
  inp.value = ''; renderChips(); inp.focus();
}

function removeIng(i){ ings.splice(i, 1); renderChips(); }

function renderChips(){
  const area = document.getElementById('chips');
  const em = document.getElementById('chipsEm');
  area.querySelectorAll('.chip').forEach(c => c.remove());
  if (!ings.length) { em.hidden = false; return; }
  em.hidden = true;
  ings.forEach((ing, i) => {
    const c = document.createElement('span');
    c.className = 'chip';
    c.innerHTML = `${ing}<button class="chip-x" onclick="removeIng(${i})">✕</button>`;
    area.appendChild(c);
  });
}

function setEx(q){
  ings = []; document.getElementById('ingInp').value = q; addIng();
}

async function generate(){
  const btn = document.getElementById('genBtn');
  const err = document.getElementById('errBox');
  err.className = 'err';
  if (!apiBase) { showErr('Connect your API first.'); return; }
  if (!ings.length) { showErr('Add at least one ingredient!'); return; }
  const cuisine = document.getElementById('cuisine').value;
  const pt = document.getElementById('ptime').value;
  const diet = document.getElementById('diet').value;
  let q = ings.join(', ');
  if (cuisine) q += `, ${cuisine} style`;
  if (diet) q += `, ${diet}`;
  if (pt) q += `, ready in ${pt}`;
  btn.disabled = true; btn.classList.add('loading');
  document.getElementById('result').classList.remove('show');
  try {
    const r = await fetch(apiBase + '/recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' },
      body: JSON.stringify({ query: q })
    });
    if (!r.ok) throw new Error('API error ' + r.status);
    const data = await r.json();
    render(data, q);
  } catch(e) {
    // Demo fallback so the UI stays useful even when API is down
    renderDemo(q);
  } finally {
    btn.disabled = false; btn.classList.remove('loading');
  }
}

function normalizeIngredients(raw) {
  // Handle list of objects: [{name, quantity}], list of strings, or plain string
  if (Array.isArray(raw)) {
    return raw.map(i => {
      if (typeof i === 'object' && i !== null) {
        const name = i.name || i.ingredient || '';
        const qty  = i.quantity || i.amount || '';
        return qty ? `${qty} ${name}` : name;
      }
      return String(i);
    }).filter(Boolean).join(', ');
  }
  return String(raw || '');
}

function normalizeInstructions(raw) {
  if (Array.isArray(raw)) {
    return raw.map((s, i) => `${i + 1}. ${typeof s === 'object' ? JSON.stringify(s) : s}`).join('\n');
  }
  return String(raw || '');
}

function render(data, q){
  const name  = data.recipe_name || "Chef's Creation";
  const ingsR = normalizeIngredients(data.ingredients) || q;
  const steps = normalizeInstructions(data.instructions) || 'Follow the steps carefully.';
  const time  = data.cooking_time || '30 min';
  const diff  = data.difficulty   || 'Medium';
  show(name, ingsR, steps, time, diff);
}

function renderDemo(q){
  show(
    'Herb & Garlic Pasta',
    q + ', salt, black pepper, parmesan, fresh parsley',
    '1. Bring a large pot of salted water to boil and cook pasta al dente.\n2. Heat olive oil in a wide pan over medium-low heat.\n3. Add garlic and cook gently until fragrant, about 2 minutes.\n4. Toss in pasta with a splash of pasta water.\n5. Season with salt and black pepper to taste.\n6. Finish with parmesan and fresh parsley.',
    '25 min', 'Easy'
  );
}

function show(name, ingsRaw, stepsRaw, time, diff){
  document.getElementById('rTitle').textContent = name;
  document.getElementById('rTime').textContent  = time;
  const dc = diff.toLowerCase().includes('easy') ? 'diff-easy' : diff.toLowerCase().includes('hard') ? 'diff-hard' : 'diff-med';
  document.getElementById('rDiff').innerHTML = `<span class="diff-pill ${dc}">${diff}</span>`;

  const ig = document.getElementById('rIngs'); ig.innerHTML = '';
  ingsRaw.split(/,\s*|\n/).filter(Boolean).forEach((item, n) => {
    const d = document.createElement('div');
    d.className = 'ing-tag'; d.style.animationDelay = n * .04 + 's';
    d.textContent = item.trim(); ig.appendChild(d);
  });

  const sl = document.getElementById('rSteps'); sl.innerHTML = '';
  stepsRaw.split(/\n|\d+\.\s+/).filter(s => s.trim()).forEach((s, i) => {
    const d = document.createElement('div');
    d.className = 'step'; d.style.animationDelay = i * .05 + 's';
    d.innerHTML = `<div class="step-n">${i + 1}</div><div class="step-t">${s.trim()}</div>`;
    sl.appendChild(d);
  });

  // food image from Unsplash
  const img = document.getElementById('rImg'), ph = document.getElementById('rPh');
  img.style.display = 'none'; ph.style.display = 'flex';
  img.src = `https://source.unsplash.com/780x260/?${encodeURIComponent(name.split(' ').slice(0,3).join(' ') + ' food dish')}`;

  last = { name, ings: ingsRaw, steps: stepsRaw, time, diff };
  document.getElementById('result').classList.add('show');
  setTimeout(() => document.getElementById('result').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

function showErr(m){
  const e = document.getElementById('errBox');
  e.textContent = '⚠ ' + m; e.className = 'err show';
}

function copyRecipe(){
  if (!last) return;
  const t = `${last.name}\n\nIngredients:\n${last.ings}\n\nInstructions:\n${last.steps}\n\nTime: ${last.time} | Difficulty: ${last.diff}`;
  navigator.clipboard.writeText(t).catch(() => {});
  const b = event.currentTarget; b.textContent = '✓ Copied!';
  setTimeout(() => { b.innerHTML = '📋 Copy'; }, 2000);
}

function newRecipe(){
  document.getElementById('result').classList.remove('show');
  document.getElementById('ingInp').focus();
}
