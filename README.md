# 🍳 ChefMind

**AI-powered recipe generation from ingredients** — Fine-tuned LLaMA 3.1 8B + Hybrid RAG (FAISS + BM25) + FastAPI backend + modern web frontend.

---

## 🗂️ Project Structure

```
ChefMind/
├── frontend/
│   ├── css/
│   │   └── style.css          # All styles (dark/light theme, animations, layout)
│   ├── js/
│   │   └── main.js            # All JavaScript (API calls, UI logic, recipe rendering)
│   └── index.html             # Main HTML page
├── notebooks/
│   ├── ChefMind_FineTuning.ipynb   # LLaMA 3.1 8B fine-tuning with LoRA on Google Colab
│   └── ChefMind_RAG.ipynb          # Hybrid RAG pipeline + FastAPI server on Google Colab
├── .gitignore
└── README.md
```

---

## 🧠 Architecture

```
User Input (Ingredients)
        │
        ▼
  Frontend (HTML/CSS/JS)
        │  POST /recipe
        ▼
  FastAPI Server (Colab + ngrok)
        │
        ├── Hybrid Retrieval
        │     ├── FAISS (dense, semantic search)
        │     └── BM25  (sparse, keyword search)
        │         └── RRF Fusion
        │             └── CrossEncoder Reranking
        │
        └── LLaMA 3.1 8B (fine-tuned with LoRA)
              └── Structured JSON Recipe Output
```

---

## 🔥 Fine-Tuning (Notebook 1)

| Setting | Value |
|---|---|
| Base Model | `unsloth/Meta-Llama-3.1-8B-Instruct` |
| Dataset | `tengomucho/simple_recipes` (20k recipes) |
| Method | LoRA (r=16, alpha=64) |
| Target Modules | q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj |
| Quantization | 4-bit NF4 (BitsAndBytesConfig) |
| Training Steps | 100 |
| Final Loss | 1.3002 |
| Hardware | Tesla T4 (Google Colab) |
| Adapter | [`Osamaelbably87/chefmind-lora`](https://huggingface.co/Osamaelbably87/chefmind-lora) |

---

## 📚 RAG Pipeline (Notebook 2)

| Component | Details |
|---|---|
| Datasets | `tengomucho/simple_recipes`, `rahul7star/food-recipes`, `formido/recipes` (~267k recipes) |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` |
| Dense Index | FAISS (cosine similarity) |
| Sparse Index | BM25Okapi |
| Fusion | Reciprocal Rank Fusion (RRF) |
| Reranker | `cross-encoder/ms-marco-MiniLM-L-6-v2` |
| LLM | LLaMA 3.1 8B + `Osamaelbably87/chefmind-lora` adapter |
| API | FastAPI + uvicorn + ngrok tunnel |

---

## 🚀 Quick Start

### 1. Fine-tune the model (optional — adapter already on HuggingFace)

Open `notebooks/ChefMind_FineTuning.ipynb` in Google Colab with a T4 GPU and run all cells.

### 2. Start the RAG API

1. Open `notebooks/ChefMind_RAG.ipynb` in Google Colab with a T4 GPU
2. Add your ngrok auth token in **Step 9**
3. Run all cells — the last cell prints your ngrok URL
4. Copy the URL

### 3. Open the frontend

1. Open `frontend/index.html` in any browser
2. Paste your ngrok URL in the **API** bar at the top
3. Click **Connect →**
4. Add ingredients and click **Generate Recipe** 🍽️

---

## ✨ Frontend Features

- Dark / light theme toggle with smooth transitions
- Animated ambient background blobs
- API status indicator (green = connected)
- Ingredient chips with comma-split support
- Quick-start recipe pills (Lemon Chicken, Pasta Pomodoro, Asian Salmon…)
- Cuisine / time / diet preference selectors
- Recipe card with Unsplash food image, meta strip, ingredient grid, numbered steps
- Demo fallback mode when API is offline
- One-click recipe copy to clipboard

---

## 🔗 Links

- 🤗 LoRA Adapter: [Osamaelbably87/chefmind-lora](https://huggingface.co/Osamaelbably87/chefmind-lora)
- 📦 Dataset: [tengomucho/simple_recipes](https://huggingface.co/datasets/tengomucho/simple_recipes)

---

## ⚙️ Dependencies

All installed inside Colab notebooks via `pip`:

```
transformers==4.52.4
peft
accelerate
bitsandbytes
trl
datasets
langchain
langchain-huggingface
faiss-cpu
rank-bm25
sentence-transformers
fastapi
uvicorn[standard]
pyngrok
```

---

## 📝 Notes

- **Tokens**: Never commit HuggingFace or ngrok tokens. Use environment variables or Colab Secrets.
- **ngrok URL**: Changes every Colab session — update the API bar in the frontend each time.
- **GPU**: A free Colab T4 is sufficient for both fine-tuning and inference.

---

Made with ❤️ by Osama Elbably
