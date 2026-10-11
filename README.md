# 🍳 ChefMind — AI Recipe Generator

> **Drop your ingredients. Get a complete recipe — instantly.**

ChefMind is an end-to-end AI system that generates structured, culinary-quality recipes from freeform ingredient input. It combines a fine-tuned **LLaMA 3.1 8B** language model with a **Hybrid RAG pipeline** backed by 267,000+ real recipes, exposed through a lightweight REST API and a clean browser UI.

---

## ✨ Features

- **Ingredient-to-recipe generation** — type anything, get a complete dish
- **Cuisine, time & dietary filters** — Italian, Vegan, Gluten-free, and more
- **Hybrid retrieval** — FAISS (dense) + BM25 (sparse) with RRF fusion
- **Cross-encoder re-ranking** — surfaces the most relevant context before generation
- **Fine-tuned model** — LLaMA 3.1 8B trained on 20,000 real recipes via QLoRA
- **Zero-dependency frontend** — pure HTML/CSS/JS, no build step required
- **ngrok API bridge** — run the backend on Google Colab's free T4 GPU

---

## 🧠 How It Works

### 1 — Fine-Tuning
LLaMA 3.1 8B was fine-tuned on 20,000 human-written recipes using **QLoRA** (4-bit NF4), teaching the model to produce structured, culinary-aware responses rather than generic text completions.

### 2 — Hybrid RAG
At inference time the query is expanded into four variants, retrieved in parallel from a **FAISS** vector index and a **BM25** index, fused via **Reciprocal Rank Fusion**, then re-ranked with a **Cross-Encoder**. The top-3 documents are injected as context before generation.

```
User query: "chicken, garlic, lemon, rosemary"
        │
        ▼
┌─────────────────────────────┐
│  Multi-query expansion (×4) │
└──────────────┬──────────────┘
               │
    ┌──────────┴───────────┐
    ▼                      ▼
┌──────────┐          ┌──────────┐
│  FAISS   │          │   BM25   │
│  Dense   │          │  Sparse  │
└────┬─────┘          └────┬─────┘
     └──────────┬──────────┘
                ▼
       ┌─────────────────┐
       │   RRF Fusion    │
       └────────┬────────┘
                ▼
       ┌─────────────────┐
       │ Cross-Encoder   │
       │  Re-ranking     │
       └────────┬────────┘
                ▼
       ┌─────────────────┐
       │ LLaMA 3.1 8B   │
       │  + LoRA Adapter │
       └────────┬────────┘
                ▼
  { recipe_name, ingredients,
    instructions, cooking_time,
    difficulty }
```

---

## 📂 Project Structure

```
ChefMind/
├── frontend/
│   ├── index.html          # App shell
│   ├── css/
│   │   └── style.css       # Styles
│   └── js/
│       └── app.js          # API client, rendering logic
│
├── notebooks/
│   ├── ChefMind_FineTuning.ipynb   # QLoRA training on LLaMA 3.1 8B
│   └── ChefMind_RAG.ipynb          # Hybrid RAG pipeline + FastAPI server
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Step 1 — Run the Backend (Google Colab)

1. Open `notebooks/ChefMind_RAG.ipynb` in [Google Colab](https://colab.research.google.com) with a **T4 GPU** runtime.
2. Run all cells in order.
3. The final cell starts a FastAPI server and prints an **ngrok URL** — copy it.

> **First run only:** Cells 2–3 build FAISS and BM25 indexes from 267k recipes (~15 min). Save them to Google Drive (cell 8) so subsequent runs skip this step and load in seconds.

### Step 2 — Open the Frontend

```bash
# Open directly in your browser
open frontend/index.html

# Or serve locally
cd frontend && python -m http.server 8080
# then visit http://localhost:8080
```

Paste the ngrok URL into the **API** field and click **Connect →**. When the dot turns green, you're ready.

### Step 3 — Re-train (Optional)

The LoRA adapter is published on HuggingFace: [`Osamaelbably87/chefmind-lora`](https://huggingface.co/Osamaelbably87/chefmind-lora).

To retrain or experiment, open `notebooks/ChefMind_FineTuning.ipynb`.

---

## 📊 Datasets

| Dataset | Source | Recipes | Used For |
|---|---|---|---|
| `tengomucho/simple_recipes` | HuggingFace | 20,000 | Fine-tuning + RAG |
| `rahul7star/food-recipes` | HuggingFace | 15,698 | RAG only |
| `formido/recipes` | HuggingFace | 231,637 | RAG only |
| **Total (RAG index)** | | **267,335** | Retrieval corpus |

---

## ⚙️ Fine-Tuning Configuration

| Parameter | Value |
|---|---|
| Base model | `unsloth/Meta-Llama-3.1-8B-Instruct` |
| Technique | QLoRA — 4-bit NF4 quantization |
| LoRA rank / alpha | 16 / 64 |
| Target modules | q, k, v, o, gate, up, down projections |
| Training examples | 20,000 recipes |
| Steps | 100 |
| Final loss | 1.30 |
| Hardware | Tesla T4 (Google Colab free tier) |
| Training time | ~2.4 hours |

---

## ⚙️ RAG Pipeline Configuration

| Component | Technology |
|---|---|
| Dense retrieval | FAISS + `sentence-transformers/all-MiniLM-L6-v2` |
| Sparse retrieval | BM25 (`rank-bm25`) |
| Fusion strategy | Reciprocal Rank Fusion (RRF) |
| Re-ranker | `cross-encoder/ms-marco-MiniLM-L-6-v2` |
| Chunk size | 500 tokens, 50-token overlap |
| Retrieval depth | Top-10 → re-rank → Top-3 injected as context |

---

## 🔌 API Reference

**Base URL:** your ngrok URL

### `GET /`
```json
{ "message": "ChefMind API is running! 🍳" }
```

### `POST /recipe`

**Request**
```json
{ "query": "chicken, garlic, lemon, rosemary, Italian style" }
```

**Response**
```json
{
  "recipe_name":  "Rosemary Lemon Chicken",
  "ingredients":  [{ "name": "chicken breast", "quantity": "2 pieces" }, ...],
  "instructions": ["Step 1: ...", "Step 2: ...", ...],
  "cooking_time": "35 minutes",
  "difficulty":   "Easy"
}
```

Interactive Swagger docs are available at `<ngrok-url>/docs`.

---

## 📦 Dependencies

The backend runs entirely on **Google Colab** — a free T4 GPU is sufficient:

```
transformers==4.52.4  peft  accelerate  bitsandbytes  trl
datasets  langchain  langchain-community  langchain-huggingface
faiss-cpu  rank-bm25  sentence-transformers
fastapi  uvicorn  pyngrok  nest-asyncio
```

The frontend has **zero dependencies** — any modern browser works.

---

## 📄 License

MIT — free to use, modify, and distribute.

---

*Built with care · Powered by LLaMA 3.1 8B + QLoRA + Hybrid RAG*
