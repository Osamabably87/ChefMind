let ingredients = [];
let connected   = false;
let lastRecipe  = null;

// ── Local nutrition DB (per 100 g) ─────────────────────────────────────────
// Format: [calories, protein_g, carbs_g, fat_g]
const NUTR_DB = {
  // Proteins
  chicken:[165,31,0,3.6], beef:[250,26,0,17], lamb:[294,25,0,21], pork:[242,27,0,14],
  salmon:[208,20,0,13], tuna:[130,29,1,1], shrimp:[85,20,0,1], fish:[104,22,0,2],
  egg:[155,13,1,11], eggs:[155,13,1,11], tofu:[76,8,2,5], lentils:[116,9,20,0],
  chickpeas:[164,9,27,3], beans:[347,22,63,1],
  // Dairy
  milk:[61,3,5,3], cream:[340,3,3,36], butter:[717,1,0,81], cheese:[402,25,1,33],
  yogurt:[59,10,4,0], parmesan:[431,38,4,29], mozzarella:[280,28,2,17], feta:[264,14,4,21],
  // Carbs
  pasta:[371,13,75,2], rice:[365,7,80,1], bread:[265,9,49,3], flour:[364,10,76,1],
  oats:[389,17,66,7], quinoa:[368,14,64,6], potato:[77,2,17,0], potatoes:[77,2,17,0],
  couscous:[376,13,77,1], bulgur:[342,12,76,1], breadcrumbs:[395,13,72,5],
  // Vegetables
  tomato:[18,1,4,0], tomatoes:[18,1,4,0], onion:[40,1,9,0], onions:[40,1,9,0],
  garlic:[149,6,33,1], carrot:[41,1,10,0], carrots:[41,1,10,0], spinach:[23,3,4,0],
  broccoli:[34,3,7,0], zucchini:[17,1,3,0], pepper:[31,1,6,0], peppers:[31,1,6,0],
  mushroom:[22,3,3,0], mushrooms:[22,3,3,0], eggplant:[25,1,6,0], cauliflower:[25,2,5,0],
  celery:[16,1,3,0], cucumber:[15,1,4,0], cabbage:[25,1,6,0], peas:[81,5,14,0],
  corn:[86,3,19,1], asparagus:[20,2,4,0], leek:[61,2,14,0], kale:[49,4,9,1],
  beetroot:[43,2,10,0], sweet_potato:[86,2,20,0],
  // Nuts & seeds
  almonds:[579,21,22,50], walnuts:[654,15,14,65], peanuts:[567,26,16,49],
  cashews:[553,18,30,44], peanut_butter:[588,25,20,50],
  // Oils
  'olive oil':[884,0,0,100], oil:[884,0,0,100], coconut_oil:[862,0,0,99],
  // Fruits
  lemon:[29,1,9,0], lime:[30,1,11,0], orange:[47,1,12,0], apple:[52,0,14,0],
  banana:[89,1,23,0], tomato_sauce:[29,1,7,0],
  // Condiments
  soy_sauce:[53,8,5,0], vinegar:[18,0,1,0], ketchup:[100,1,26,0],
  mayonnaise:[680,1,1,75], honey:[304,0,82,0], sugar:[387,0,100,0],
  // Spices & herbs
  salt:[0,0,0,0], cumin:[375,18,44,22], paprika:[282,14,54,13],
  cinnamon:[247,4,81,1], turmeric:[312,9,67,3], oregano:[265,9,69,4],
  basil:[23,3,3,0], parsley:[36,3,6,1], thyme:[101,6,24,2],
  ginger:[80,2,18,1], chili:[40,2,9,0], tahini:[595,17,21,54], harissa:[43,2,7,2],
  // Liquids
  stock:[8,1,0,0], broth:[8,1,0,0], wine:[83,0,3,0], water:[0,0,0,0],
  // Breads & wraps
  tortilla:[304,8,52,7], pita:[275,10,56,1], naan:[310,10,56,5],
};

function lookupNutr(raw) {
  const name  = raw.toLowerCase().replace(/[^a-z ]/g, '').trim();
  if (NUTR_DB[name]) return NUTR_DB[name];
  const first = name.split(' ')[0];
  if (NUTR_DB[first]) return NUTR_DB[first];
  for (const key of Object.keys(NUTR_DB)) {
    if (name.includes(key) || key.includes(first)) return NUTR_DB[key];
  }
  return null;
}

function loadNutrition(ings) {
  const bar   = document.getElementById('nutritionBar');
  const names = ings.slice(0, 5)
    .map(i => typeof i === 'string' ? i : (i.name || ''))
    .filter(Boolean);
  let cal = 0, pro = 0, carb = 0, fat = 0, found = 0;
  names.forEach(name => {
    const n = lookupNutr(name);
    if (!n) return;
    cal += n[0] * 0.8; pro += n[1] * 0.8; carb += n[2] * 0.8; fat += n[3] * 0.8;
    found++;
  });
  if (!found) {
    bar.innerHTML = '<div class="nutr-loading" style="color:var(--muted)">Nutrition data unavailable</div>';
    return;
  }
  bar.innerHTML = `
    <div class="nutr-item"><div class="nutr-label">Calories</div><div class="nutr-value">${Math.round(cal)}</div><div class="nutr-note">kcal est.</div></div>
    <div class="nutr-item"><div class="nutr-label">Protein</div><div class="nutr-value">${Math.round(pro)}g</div><div class="nutr-note">estimated</div></div>
    <div class="nutr-item"><div class="nutr-label">Carbs</div><div class="nutr-value">${Math.round(carb)}g</div><div class="nutr-note">estimated</div></div>
    <div class="nutr-item"><div class="nutr-label">Fat</div><div class="nutr-value">${Math.round(fat)}g</div><div class="nutr-note">estimated</div></div>
  `;
}

// ── Food photos (Unsplash) ─────────────────────────────────────────────────
const FOOD_IMGS = {
  pasta:   ['https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=800&q=80','https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80','https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&q=80'],
  chicken: ['https://images.unsplash.com/photo-1598103442097-8b74394b95c8?w=800&q=80','https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=800&q=80','https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&q=80'],
  beef:    ['https://images.unsplash.com/photo-1558030006-450675393462?w=800&q=80','https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80','https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&q=80'],
  fish:    ['https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&q=80','https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80','https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=800&q=80'],
  salad:   ['https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80','https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80','https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80'],
  soup:    ['https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80','https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=800&q=80','https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80'],
  rice:    ['https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=800&q=80','https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=800&q=80','https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&q=80'],
  bread:   ['https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&q=80','https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80','https://images.unsplash.com/photo-1600398138360-766b7f6e3e4b?w=800&q=80'],
  stew:    ['https://images.unsplash.com/photo-1608835291093-394b0c943a75?w=800&q=80','https://images.unsplash.com/photo-1612871689009-27f04c6e8bb8?w=800&q=80','https://images.unsplash.com/photo-1574484284002-952d92456975?w=800&q=80'],
  cake:    ['https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80','https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&q=80','https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=800&q=80'],
  egg:     ['https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80','https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800&q=80','https://images.unsplash.com/photo-1536697246787-1f7ae568d89a?w=800&q=80'],
  default: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80','https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80','https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80'],
};

function loadRecipeImage(recipeName) {
  const img  = document.getElementById('recipeImg');
  img.classList.remove('loaded');
  const name = recipeName.toLowerCase();
  let cat    = 'default';
  if      (name.match(/pasta|spaghetti|lasagna|noodle|penne|rigatoni|fettuccine/)) cat = 'pasta';
  else if (name.match(/cake|cookie|dessert|brownie|sweet|pudding|pie/))            cat = 'cake';
  else if (name.match(/soup|broth|chowder|bisque/))                                cat = 'soup';
  else if (name.match(/stew|casserole|curry|tagine/))                              cat = 'stew';
  else if (name.match(/salad|slaw|bowl/))                                          cat = 'salad';
  else if (name.match(/chicken|turkey|poultry|hen/))                               cat = 'chicken';
  else if (name.match(/beef|steak|brisket|pork|lamb|veal/))                        cat = 'beef';
  else if (name.match(/fish|salmon|tuna|seafood|shrimp|prawn|cod|tilapia/))        cat = 'fish';
  else if (name.match(/egg|omelette|frittata|quiche/))                             cat = 'egg';
  else if (name.match(/bread|naan|pita|biscuit|roll|focaccia/))                    cat = 'bread';
  else if (name.match(/rice|pilaf|risotto|fried rice|paella/))                     cat = 'rice';
  const pool = FOOD_IMGS[cat] || FOOD_IMGS.default;
  const url  = pool[Math.floor(Math.random() * pool.length)];
  img.src = url;
  img.onload  = () => img.classList.add('loaded');
  img.onerror = () => {
    const def = FOOD_IMGS.default;
    img.src = def[Math.floor(Math.random() * def.length)];
    img.onload  = () => img.classList.add('loaded');
    img.onerror = () => {};
  };
}

// ── Persist API URL ────────────────────────────────────────────────────────
window.onload = () => {
  try {
    const saved = localStorage.getItem('chefmind_api');
    if (saved) document.getElementById('apiUrl').value = saved;
  } catch(e) {}
};

// ── Connection ─────────────────────────────────────────────────────────────
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
          signal:  AbortSignal.timeout(6000),
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
    showStatus('err', 'Cannot reach the API. Make sure your Colab cell is running and paste the correct ngrok URL above.');
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

// ── Ingredients ────────────────────────────────────────────────────────────
function addIngredient() {
  const input = document.getElementById('ingInput');
  const val   = input.value.trim();
  if (!val) return;
  val.split(',').forEach(v => {
    const clean = v.trim();
    if (clean && !ingredients.includes(clean.toLowerCase()))
      ingredients.push(clean.toLowerCase());
  });
  input.value = '';
  renderTags();
  input.focus();
}

function removeIngredient(i) {
  ingredients.splice(i, 1);
  renderTags();
}

function clearIngredients() {
  ingredients = [];
  renderTags();
  document.getElementById('ingInput').focus();
}

function renderTags() {
  const hasItems = ingredients.length > 0;
  document.getElementById('tags').innerHTML =
    ingredients.map((ing, i) => `<span class="tag">${ing}<button onclick="removeIngredient(${i})">×</button></span>`).join('') +
    (hasItems ? `<button class="btn-clear-all" onclick="clearIngredients()">✕ Clear all</button>` : '');
}

function quickPick(dish) {
  ingredients = [];
  document.getElementById('ingInput').value = dish;
  addIngredient();
}

// ── Debug (console only) ───────────────────────────────────────────────────
function dbg(msg)  { console.log('[ChefMind]', msg); }
function clearDbg() {}

// ── Generate ───────────────────────────────────────────────────────────────
async function generateRecipe() {
  hideBanner();
  clearDbg();

  if (!connected) {
    dbg('Not connected — trying to connect first…');
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

  dbg(`📤 Sending: "${query}"`);
  setLoading(true);
  document.getElementById('recipeCard').style.display = 'none';

  const startTime = Date.now();
  try {
    dbg('⏳ Waiting for model… (30s–2min on T4)');
    const res = await fetch(getBaseUrl() + '/recipe', {
      method:  'POST',
      headers: {
        'Content-Type':              'application/json',
        'ngrok-skip-browser-warning': 'true',
        'Accept':                    'application/json',
      },
      body:   JSON.stringify({ query }),
      signal: AbortSignal.timeout(300000),   // 5-minute timeout
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    dbg(`📥 Response in ${elapsed}s — HTTP ${res.status}`);

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Server error ${res.status}${txt ? ': ' + txt.slice(0, 120) : ''}`);
    }

    const raw = await res.text();
    dbg(`📄 First 150 chars: ${raw.slice(0, 150)}`);

    let data;
    try { data = JSON.parse(raw); }
    catch(e) { throw new Error('API returned invalid JSON — check Colab logs'); }

    dbg(`✅ recipe_name="${data.recipe_name}", steps=${Array.isArray(data.instructions) ? data.instructions.length : '?'}, ings=${Array.isArray(data.ingredients) ? data.ingredients.length : '?'}`);

    lastRecipe = data;
    renderRecipe(data, query);
    dbg('🎉 Done!');

  } catch(e) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    if (e.name === 'TimeoutError') {
      dbg(`⏱ Timed out after ${elapsed}s`);
      showBanner('Request timed out — model may be overloaded. Try again.');
    } else {
      dbg(`❌ ${e.name}: ${e.message}`);
      showBanner(e.message || 'Cannot reach the API. Make sure your Colab cell is running.');
      connected = false;
      showStatus('err', 'Disconnected');
    }
  } finally {
    setLoading(false);
  }
}

// ── Bleed guard: stop if a second recipe bleeds in ────────────────────────
const BLEED_RE      = /^(ingredients\s*:|instructions\s*:|recipe\s*\d*\s*:|INGREDIENTS|INSTRUCTIONS)/i;
const DISH_BLEED_RE = /^[A-Z][a-z]+(\s+[A-Z][a-z]+)?\s+(Salmon|Chicken|Pasta|Beef|Stew|Cake|Soup|Rice|Salad|Shrimp|Fish|Pork|Lamb|Tofu|Curry|Noodle|Burger|Pizza|Taco|Wrap|Bowl)/;

// ── Render recipe ──────────────────────────────────────────────────────────
function renderRecipe(data, query) {
  // Title
  document.getElementById('recipeName').textContent =
    data.recipe_name || query || "Chef's Creation";

  // Meta
  document.getElementById('cookTime').textContent   = data.cooking_time || '30 min';
  document.getElementById('difficulty').textContent = data.difficulty   || 'Medium';

  // ── Ingredients ──────────────────────────────────────────────────────────
  const ingGrid = document.getElementById('ingGrid');
  ingGrid.innerHTML = '';
  let ings = data.ingredients;

  if (typeof ings === 'string' && ings.trim()) {
    ings = ings.split(',').map(s => {
      const m = s.trim().match(/^(.+?)\s*\(([^)]*)\)$/);
      return m ? { name: m[1].trim(), quantity: m[2].trim() } : { name: s.trim(), quantity: '' };
    });
  }

  const ING_ACTION = /\b(heat|add|mix|stir|cook|bake|fry|boil|simmer|pour|place|combine|season|remove|serve|chop|cut|preheat|whisk|blend|drain|rinse|marinate|grill|roast|sauté|transfer|cover|bring|reduce|prepare|coat|sprinkle|spread|flip|toss|squeeze|mince|dice|peel|wash|pat|beat|fold|knead|roll|shape|press|arrange|garnish|until|minutes|degrees)\b/i;

  function isIngredient(name) {
    if (!name || name.length < 2 || name.length > 65) return false;
    if (/^\d+\./.test(name.trim())) return false;
    if (ING_ACTION.test(name) && name.length > 28)    return false;
    return true;
  }

  let ingRendered = 0;
  (Array.isArray(ings) && ings.length > 0 ? ings : []).forEach(ing => {
    const name = typeof ing === 'string' ? ing : (ing.name || '');
    const qty  = typeof ing === 'object' ? (ing.quantity || '') : '';
    if (!isIngredient(name)) return;
    const chip = document.createElement('div');
    chip.className = 'ing-chip';
    chip.innerHTML = `<span class="dot"></span><span>${name}</span>${qty ? `<span class="qty">${qty}</span>` : ''}`;
    ingGrid.appendChild(chip);
    ingRendered++;
  });

  // Fallback: show user's typed ingredients
  if (ingRendered === 0) {
    if (ingredients.length > 0) {
      ingredients.forEach(ing => {
        const chip = document.createElement('div');
        chip.className = 'ing-chip';
        chip.innerHTML = `<span class="dot"></span><span>${ing}</span>`;
        ingGrid.appendChild(chip);
      });
    } else {
      ingGrid.innerHTML = '<p style="color:var(--muted);font-size:.85rem">Ingredients not specified</p>';
    }
  }

  // ── Instructions ─────────────────────────────────────────────────────────
  const stepsList = document.getElementById('stepsList');
  stepsList.innerHTML = '';
  let steps = data.instructions;

  if (typeof steps === 'string' && steps.trim()) {
    const parts = steps.split(/(?=Step\s+\d+[:.]\s*)/i).filter(s => s.trim());
    steps = parts.length > 1 ? parts
          : steps.split(/\d+[.)]\s+/).filter(s => s.trim());
    if (!steps.length) steps = [steps.join(' ') || steps];
  }

  if (Array.isArray(steps) && steps.length > 0) {
    let stepNum = 1;
    for (const step of steps) {
      if (stepNum > 9) break;   // hard cap at 9 steps

      const text = typeof step === 'string' ? step : String(step);
      let clean  = text
        .replace(/^Step\s*\d+[:.)\-]\s*/i, '')
        .replace(/^\d+[.)\-]\s*/, '')
        .replace(/^[-•*]\s*/, '')
        .trim();

      if (!clean || clean.length < 8) continue;
      if (BLEED_RE.test(clean)) break;
      if (DISH_BLEED_RE.test(clean) && stepNum > 1) break;
      if (clean.length > 350) clean = clean.slice(0, 350) + '…';

      const item = document.createElement('div');
      item.className = 'step-item';
      item.innerHTML = `<div class="step-num">${stepNum++}</div><div class="step-text">${clean}</div>`;
      stepsList.appendChild(item);
    }
  }

  if (stepsList.children.length === 0) {
    stepsList.innerHTML = '<p style="color:var(--muted);font-size:.85rem">No instructions available.</p>';
  }

  // Show card
  const card = document.getElementById('recipeCard');
  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Non-blocking: photo + nutrition
  loadRecipeImage(data.recipe_name || query);
  loadNutrition(Array.isArray(data.ingredients) ? data.ingredients : ingredients.map(i => ({ name: i })));
}

// ── UI helpers ─────────────────────────────────────────────────────────────
function setLoading(on) {
  const btn  = document.getElementById('generateBtn');
  const icon = document.getElementById('btnIcon');
  const txt  = document.getElementById('btnText');
  btn.disabled = on;
  if (on) {
    icon.innerHTML  = '<div class="spinner"></div>';
    txt.textContent = 'Cooking…';
  } else {
    icon.textContent = '✨';
    txt.textContent  = 'Generate Recipe';
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
  if (typeof ings === 'string') { /* keep as-is */ }
  else if (Array.isArray(ings))
    ings = ings.map(i => typeof i === 'string' ? i : `${i.name}${i.quantity ? ' — ' + i.quantity : ''}`).join('\n');

  let steps = lastRecipe.instructions;
  if (Array.isArray(steps))
    steps = steps.map((s, i) => `${i + 1}. ${String(s).replace(/^Step\s*\d+[:.]\s*/i, '')}`).join('\n');

  const text = `🍽️ ${name}\n\n⏱ ${lastRecipe.cooking_time || ''} | ${lastRecipe.difficulty || ''}\n\n🥘 INGREDIENTS\n${ings}\n\n👨‍🍳 INSTRUCTIONS\n${steps}`;

  const markDone = btn => {
    const orig = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => btn.textContent = orig, 2000);
  };

  navigator.clipboard.writeText(text)
    .then(() => markDone(event.target))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      markDone(event.target);
    });
}
