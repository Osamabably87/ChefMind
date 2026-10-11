let ingredients = [];
let connected = false;
let lastRecipe = null;

// ── Persist API URL ──
window.onload = () => {
  try {
    const saved = localStorage.getItem('chefmind_api');
    if (saved) document.getElementById('apiUrl').value = saved;
  } catch(e) {}
};

// ── Connection ──
async function checkConnection() {
  const url = getBaseUrl();
  if (!url) { showStatus('err', 'Please enter your ngrok URL first'); return; }
  showStatus('', 'Connecting…');
  try {
    let ok = false;
    for (const path of ['/health', '/']) {
      try {
        const r = await fetch(url + path, {
          headers: { 'ngrok-skip-browser-warning': 'true' },
          signal: AbortSignal.timeout(6000)
        });
        if (r.ok) { ok = true; break; }
      } catch(e) {}
    }
    if (ok) {
      connected = true;
      try { localStorage.setItem('chefmind_api', document.getElementById('apiUrl').value.trim()); } catch(e) {}
      showStatus('ok', 'Connected — ready to cook 🍳');
    } else {
      showStatus('err', 'Cannot reach API — check the URL and that your Colab cell is running');
    }
  } catch(e) {
    showStatus('err', 'Cannot reach the API. Make sure your Colab cell is running and paste the correct ngrok URL above, then click Connect.');
  }
}

function getBaseUrl() {
  return document.getElementById('apiUrl').value.trim().replace(/\/+$/, '');
}

function showStatus(type, msg) {
  const el = document.getElementById('status');
  el.className = 'status ' + type;
  document.getElementById('statusText').textContent = msg;
}

// ── Ingredients ──
function addIngredient() {
  const input = document.getElementById('ingInput');
  const val = input.value.trim();
  if (!val) return;
  val.split(',').forEach(v => {
    const clean = v.trim();
    if (clean && !ingredients.includes(clean.toLowerCase())) {
      ingredients.push(clean.toLowerCase());
    }
  });
  input.value = '';
  renderTags();
  input.focus();
}

function removeIngredient(i) {
  ingredients.splice(i, 1);
  renderTags();
}

function renderTags() {
  const el = document.getElementById('tags');
  el.innerHTML = ingredients.map((ing, i) =>
    `<span class="tag">${ing}<button onclick="removeIngredient(${i})">×</button></span>`
  ).join('');
}

function quickPick(dish) {
  ingredients = [];
  document.getElementById('ingInput').value = dish;
  addIngredient();
}

// ── Generate ──
async function generateRecipe() {
  hideBanner();

  if (!connected) {
    await checkConnection();
    if (!connected) return;
  }

  if (ingredients.length === 0) {
    showBanner('Please add at least one ingredient or pick a dish above.');
    return;
  }

  const cuisine = document.getElementById('cuisine').value;
  const time    = document.getElementById('time').value;
  const diet    = document.getElementById('diet').value;

  let query = ingredients.join(', ');
  if (cuisine) query += `, ${cuisine} cuisine`;
  if (time)    query += `, ${time}`;
  if (diet)    query += `, ${diet}`;

  setLoading(true);
  document.getElementById('recipeCard').style.display = 'none';

  try {
    const res = await fetch(getBaseUrl() + '/recipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(180000)
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Server error ${res.status}${txt ? ': ' + txt.slice(0,120) : ''}`);
    }

    const data = await res.json();
    lastRecipe = data;
    renderRecipe(data, query);

  } catch(e) {
    if (e.name === 'TimeoutError') {
      showBanner('Request timed out — try again or reduce the number of ingredients.');
    } else {
      showBanner(e.message || 'Cannot reach the API. Make sure your Colab cell is running.');
      connected = false;
      showStatus('err', 'Disconnected');
    }
  } finally {
    setLoading(false);
  }
}

// ── Render recipe ──
function renderRecipe(data, query) {
  document.getElementById('recipeName').textContent = data.recipe_name || query || 'Chef\'s Creation';
  document.getElementById('cookTime').textContent = data.cooking_time || '30 min';
  document.getElementById('difficulty').textContent = data.difficulty || 'Medium';

  const ingGrid = document.getElementById('ingGrid');
  ingGrid.innerHTML = '';
  let ings = data.ingredients;

  if (typeof ings === 'string' && ings.trim()) {
    ings = ings.split(',').map(s => {
      const m = s.trim().match(/^(.+?)\s*\(([^)]*)\)$/);
      return m ? { name: m[1].trim(), quantity: m[2].trim() } : { name: s.trim(), quantity: '' };
    });
  }

  if (Array.isArray(ings) && ings.length > 0) {
    ings.forEach(ing => {
      const name = typeof ing === 'string' ? ing : (ing.name || '');
      const qty  = typeof ing === 'object' ? (ing.quantity || '') : '';
      if (!name || name.length < 2) return;
      const chip = document.createElement('div');
      chip.className = 'ing-chip';
      chip.innerHTML = `<span class="dot"></span><span>${name}</span>${qty ? `<span class="qty">${qty}</span>` : ''}`;
      ingGrid.appendChild(chip);
    });
    if (ingGrid.children.length === 0) {
      ingredients.forEach(ing => {
        const chip = document.createElement('div');
        chip.className = 'ing-chip';
        chip.innerHTML = `<span class="dot"></span><span>${ing}</span>`;
        ingGrid.appendChild(chip);
      });
    }
  } else if (ingredients.length > 0) {
    ingredients.forEach(ing => {
      const chip = document.createElement('div');
      chip.className = 'ing-chip';
      chip.innerHTML = `<span class="dot"></span><span>${ing}</span>`;
      ingGrid.appendChild(chip);
    });
  } else {
    ingGrid.innerHTML = '<p style="color:var(--muted);font-size:.85rem">Ingredients not specified</p>';
  }

  const stepsList = document.getElementById('stepsList');
  stepsList.innerHTML = '';
  let steps = data.instructions;

  if (typeof steps === 'string' && steps.trim()) {
    const parts = steps.split(/(?=Step\s+\d+[:.]\s*)/i).filter(s => s.trim());
    if (parts.length > 1) {
      steps = parts;
    } else {
      steps = steps.split(/\d+[.)]\s+/).filter(s => s.trim());
      if (steps.length <= 1) {
        steps = steps[0] ? [steps[0]] : ['Follow the recipe steps carefully.'];
      }
    }
  }

  if (Array.isArray(steps) && steps.length > 0) {
    let stepNum = 1;
    steps.forEach((step) => {
      const text = typeof step === 'string' ? step : String(step);
      const clean = text
        .replace(/^Step\s*\d+[:.)\-]\s*/i, '')
        .replace(/^\d+[.)\-]\s*/, '')
        .trim();
      if (!clean) return;
      const item = document.createElement('div');
      item.className = 'step-item';
      item.innerHTML = `<div class="step-num">${stepNum++}</div><div class="step-text">${clean}</div>`;
      stepsList.appendChild(item);
    });
  } else {
    stepsList.innerHTML = '<p style="color:var(--muted);font-size:.85rem">No instructions available.</p>';
  }

  const card = document.getElementById('recipeCard');
  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── UI helpers ──
function setLoading(on) {
  const btn  = document.getElementById('generateBtn');
  const icon = document.getElementById('btnIcon');
  const txt  = document.getElementById('btnText');
  btn.disabled = on;
  if (on) {
    icon.innerHTML = '<div class="spinner"></div>';
    txt.textContent = 'Cooking…';
  } else {
    icon.innerHTML = '✨';
    txt.textContent = 'Generate Recipe';
  }
}

function showBanner(msg) {
  const b = document.getElementById('errorBanner');
  document.getElementById('errorText').textContent = msg;
  b.className = 'banner err';
}
function hideBanner() {
  document.getElementById('errorBanner').className = 'banner';
}

function newRecipe() {
  document.getElementById('recipeCard').style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function copyRecipe() {
  if (!lastRecipe) return;
  const name = lastRecipe.recipe_name || 'Recipe';
  let ings = lastRecipe.ingredients;
  if (typeof ings === 'string') ings = ings;
  else if (Array.isArray(ings)) ings = ings.map(i => typeof i === 'string' ? i : `${i.name}${i.quantity ? ' - '+i.quantity : ''}`).join('\n');

  let steps = lastRecipe.instructions;
  if (Array.isArray(steps)) steps = steps.map((s,i) => `${i+1}. ${s.replace(/^Step\s*\d+[:.]\s*/i,'')}`).join('\n');

  const text = `🍽️ ${name}\n\n⏱ ${lastRecipe.cooking_time || ''} | ${lastRecipe.difficulty || ''}\n\n🥘 INGREDIENTS\n${ings}\n\n👨‍🍳 INSTRUCTIONS\n${steps}`;
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    const orig = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => btn.textContent = orig, 2000);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const btn = event.target;
    const orig = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => btn.textContent = orig, 2000);
  });
}
