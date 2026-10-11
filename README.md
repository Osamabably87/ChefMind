# 🍳 ChefMind — AI Recipe Generator with Hybrid RAG

> **LLaMA 3.1 8B fine-tuned on 267k+ recipes, augmented with a hybrid FAISS + BM25 retrieval pipeline and a polished mobile-first web frontend.**

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Datasets](#datasets)
- [Fine-Tuning](#fine-tuning)
- [RAG Pipeline v2](#rag-pipeline-v2)
- [Frontend](#frontend)
- [API Reference](#api-reference)
- [Quick Start](#quick-start)
- [Security Notes](#security-notes)

---

## Overview

ChefMind generates structured, step-by-step recipes from a list of ingredients using a retrieval-augmented generation (RAG) approach on top of a QLoRA fine-tuned LLaMA 3.1 8B model.

**Key capabilities:**

- **Hybrid retrieval** — dense FAISS (semantic similarity) + sparse BM25 (keyword match) fused via Reciprocal Rank Fusion (RRF), then re-ranked by a Cross-Encoder for precision
- **Fine-tuned generation** — QLoRA adapter trained on 267k recipes; hosted at [`Osamaelbably87/chefmind-lora`](https://huggingface.co/Osamaelbably87/chefmind-lora)
- **Local nutrition lookup** — per-serving macros estimated from a 100+ ingredient database, no external API call needed
- **Auto food photography** — recipe header image auto-selected from Unsplash by dish category
- **Zero-build frontend** — pure HTML / CSS / JS, no bundler or framework required

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│  index.html + css/style.css + js/app.js                      │
│  • Ingredient tags  • Cuisine / time / diet filters           │
│  • Nutrition bar (local DB)  • Unsplash food photo           │
└───────────────────┬──────────────────────────────────────────┘
                    │  HTTPS (ngrok tunnel)
                    ▼
┌──────────────────────────────────────────────────────────────┐
│              FastAPI Backend  (Google Colab GPU)              │
│                                                              │
│  POST /                                                      │
│  ├── 1. Hybrid Retriever                                     │
│  │       ├── FAISS (all-MiniLM-L6-v2)   — dense             │
│  │       ├── BM25Okapi                   — sparse            │
│  │       └── RRF fusion + Cross-Encoder re-rank             │
│  │             (ms-marco-MiniLM-L-6-v2)                     │
│  └── 2. LLaMA 3.1 8B + LoRA adapter                         │
│          ├── Prompt injection with top-k RAG context         │
│          ├── Stop token enforcement                          │
│          └── Bleed guard (truncates at recipe #2 start)     │
│                                                              │
│  GET  /health   — liveness probe                             │
└──────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Base model | `meta-llama/Meta-Llama-3.1-8B` |
| Fine-tuning | QLoRA · PEFT · `SFTTrainer` (TRL) |
| Quantization | BitsAndBytes NF4 4-bit |
| Dense retrieval | FAISS + `sentence-transformers/all-MiniLM-L6-v2` |
| Sparse retrieval | `rank_bm25` (BM25Okapi) |
| Re-ranker | `cross-encoder/ms-marco-MiniLM-L-6-v2` |
| Serving | FastAPI + `pyngrok` |
| Runtime | Google Colab A100 / T4 |
| Index persistence | Google Drive |
| Frontend | Vanilla HTML5 + CSS3 + ES6 |
| Photos | Unsplash (free tier CDN) |
| Nutrition | Local DB (hand-curated, ~100 ingredients) |

---

## Project Structure

```
ChefMind/
├── frontend/
│   ├── index.html          # App shell — no inline JS or CSS
│   ├── css/
│   │   └── style.css       # Green design system, CSS custom properties
│   └── js/
│       └── app.js          # All app logic: RAG call, render, nutrition, photos
├── notebooks/
│   ├── ChefMind_RAG.ipynb          # Full RAG backend (pipeline v2)
│   └── ChefMind_FineTuning.ipynb   # QLoRA fine-tuning on 267k recipes
├── .gitignore
└── README.md
```

---

## Datasets

Three HuggingFace datasets are merged into a single retrieval corpus:

| Dataset | Recipes | Notes |
|---|---|---|
| `Osamaelbably87/chefmind_dataset` | ~100k | Primary fine-tune split |
| `Hieu-Pham/kaggle_food_recipes` | ~80k | Diverse cuisine coverage |
| `mbien/recipe_nlg_lite` | ~87k | Long-form instruction style |
| **Total** | **~267k** | Deduplicated by title |

FAISS and BM25 indexes, plus a `recipe_names.json` cache, are persisted to Google Drive so subsequent Colab sessions skip the 10–15 min rebuild.

---

## Fine-Tuning

**Notebook:** `notebooks/ChefMind_FineTuning.ipynb`

### LoRA Configuration

```python
LoraConfig(
    r=16,
    lora_alpha=64,
    target_modules=["q_proj","v_proj","k_proj","o_proj",
                    "gate_proj","up_proj","down_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)
```

### Training Setup

```python
SFTTrainingArguments(
    max_steps=100,
    learning_rate=2e-4,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    warmup_steps=5,
    fp16=True,
    optim="paged_adamw_32bit",
)
```

**Result:** Final training loss **1.30** — consistent with well-converged recipe instruction generation.

**Adapter:** Published to HuggingFace Hub at `Osamaelbably87/chefmind-lora`.

---

## RAG Pipeline v2

**Notebook:** `notebooks/ChefMind_RAG.ipynb`

### Retrieval

```
Query (ingredients + dish name)
  │
  ├──▶ FAISS top-50  (dense — semantic)
  ├──▶ BM25  top-50  (sparse — keyword)
  │
  └──▶ RRF fusion → top-20
            │
            └──▶ Cross-Encoder re-rank → top-3 context docs
```

### Generation

The top-3 retrieved recipes are injected into a structured prompt before the base LLaMA generation call:

```
[INST] You are a professional chef...
Context recipes:
1. <name> | Ingredients: ... | Steps: ...
2. ...
3. ...

Now create a recipe using: {ingredients}
Cuisine: {cuisine} | Diet: {diet} | Time: {time_limit}
[/INST]
```

### Output Hardening

| Guard | Description |
|---|---|
| Stop tokens | `[INST]`, `<\|eot_id\|>`, `Recipe 2:`, `---` halt generation |
| Bleed regex | Line-level scan; truncates at any second recipe header |
| Step cap | Maximum 9 instruction steps rendered in UI |
| Name cache | `recipe_names.json` on Drive — avoids re-scanning 267k docs each run |

### API

```
GET  /health  →  {"status": "ok", "model": "...", "index_size": N}
POST /        →  {ingredients, cuisine, time_limit, diet_restriction}
              ←  {recipe_name, cook_time, difficulty, servings,
                  ingredients_list, steps, nutrition_hint}
```

---

## Frontend

**Location:** `frontend/`

The frontend is intentionally zero-dependency — open `index.html` directly in a browser or serve with any static file server (`python -m http.server 8080`).

### Features

| Feature | Implementation |
|---|---|
| Quick-pick dishes | 5 preset buttons pre-fill ingredient tags |
| Ingredient tags | Add/remove chips; `Enter` key support |
| Cuisine / time / diet filters | Three `<select>` dropdowns passed to API |
| Nutrition bar | Local `NUTR_DB` (~100 ingredients) — fuzzy matched, estimated per serving; no external call |
| Recipe photo | `FOOD_IMGS` map (12 categories) → random Unsplash URL, loaded with fade-in |
| Bleed guard | `BLEED_RE` + `DISH_BLEED_RE` regexes strip second-recipe leak at render time |
| 5-min timeout | `AbortSignal.timeout(300_000)` on all fetch calls |
| Debug logging | `console.log('[ChefMind] …')` only — no on-page panel |
| Connection check | `GET /health` then `GET /` — status dot turns green on success |

### Nutrition DB (excerpt)

```js
// [calories, protein_g, carbs_g, fat_g] per 100g
const NUTR_DB = {
  chicken: [165, 31, 0,   3.6],
  beef:    [250, 26, 0,   17 ],
  pasta:   [131,  5, 25,  1.1],
  rice:    [130,  2.7, 28, 0.3],
  egg:     [155, 13, 1.1, 11 ],
  // … 95+ more
};
```

Values are estimated and intended as rough per-serving guidance, not clinical nutrition data.

---

## API Reference

### `GET /health`

Liveness check. Returns `200 OK` when the model and indexes are loaded.

```json
{
  "status": "ok",
  "model": "Osamaelbably87/chefmind-lora",
  "index_size": 267335
}
```

### `POST /`

Generate a recipe.

**Request body:**

```json
{
  "ingredients": "chicken, garlic, lemon, thyme",
  "cuisine":     "Mediterranean",
  "time_limit":  "Under 30 min",
  "diet_restriction": ""
}
```

**Response:**

```json
{
  "recipe_name":       "Lemon Herb Chicken",
  "cook_time":         "25 min",
  "difficulty":        "Easy",
  "servings":          "2–4",
  "ingredients_list":  ["2 chicken breasts", "3 garlic cloves", "…"],
  "steps":             ["Preheat oven to 200°C.", "…"],
  "nutrition_hint":    null
}
```

---

## Quick Start

### 1. Run the Backend (Google Colab)

```
Open:  notebooks/ChefMind_RAG.ipynb
Runtime → Change runtime type → GPU (A100 or T4)
Run all cells

The last cell prints your ngrok URL, e.g.:
  ✅ API ready at https://xxxx.ngrok-free.app
```

### 2. Open the Frontend

```bash
# Serve locally
cd frontend
python -m http.server 8080
# Open http://localhost:8080

# Or just open frontend/index.html directly in Chrome / Firefox
```

### 3. Connect

1. Paste your ngrok URL into the **API** field
2. Click **Connect →** — the dot turns green when `/health` responds
3. Add ingredients or pick a quick-pick dish
4. Set cuisine / time / diet (optional)
5. Click **✨ Generate Recipe**

First generation on a cold Colab session may take 60–90 s while the model loads. Subsequent calls are typically 10–20 s.

---

## Security Notes

> ⚠️ **Do not commit the notebooks to a public repository without scrubbing secrets first.**

Both notebooks contain credentials that must be rotated or removed before any public push:

| Secret | Location | Action |
|---|---|---|
| HuggingFace token (`hf_Dk…`) | `ChefMind_FineTuning.ipynb` | Revoke at hf.co/settings/tokens and use `notebook_login()` interactively |
| ngrok auth token (`3I3ol8…`) | `ChefMind_RAG.ipynb` | Revoke at dashboard.ngrok.com and use an env var: `os.environ["NGROK_TOKEN"]` |

**Recommended pattern for notebooks:**

```python
import os
from google.colab import userdata

HF_TOKEN    = userdata.get("HF_TOKEN")      # set in Colab Secrets
NGROK_TOKEN = userdata.get("NGROK_TOKEN")   # set in Colab Secrets
```

---

## License

This project is released for educational and research purposes. Base model weights are governed by the [Meta LLaMA 3.1 Community License](https://llama.meta.com/llama3_1/license/). Fine-tuned adapter weights inherit those terms. Recipe data is sourced from publicly available HuggingFace datasets; see each dataset's individual license.

---

*Built with 🍳 and a lot of garlic.*
