# 🍳 ChefMind — AI Recipe Generator

> **بتدخّل المكونات اللي عندك، ChefMind بيطلّعلك وصفة كاملة.**

---

## 💡 فكرة المشروع

كتير من الناس بتفتح التلاجة وبتلاقي مكونات متفرقة — فراخ، ثوم، ليمون، وربما معكرونة — وبتتساءل: أعمل إيه بالظبط؟

**ChefMind** هو نظام ذكاء اصطناعي بيحل المشكلة دي. بتكتبله المكونات اللي عندك، وهو بيولّد ليك وصفة طبخ كاملة ومنظّمة تشمل:

- 📛 **اسم الطبق**
- 🥘 **قائمة المكونات** مع الكميات
- 👨‍🍳 **خطوات الطبخ** مرتبة بالتفصيل
- ⏱️ **وقت التحضير**
- 📊 **درجة الصعوبة** (سهل / متوسط / صعب)

مش بس كده — ممكن كمان تحدد **نوع المطبخ** (إيطالي، آسيوي، شرق أوسطي…)، **وقت الطبخ**، أو **قيود غذائية** (نباتي، خالي من الجلوتين…) وهو بيأخدها في الاعتبار.

---

## 🧠 إزاي المشروع بيشتغل؟

المشروع بيجمع تقنيتين مع بعض:

### 1. Fine-Tuning — تدريب النموذج على وصفات حقيقية

خدنا نموذج لغة كبير هو **LLaMA 3.1 8B** وعملنا عليه **Fine-Tuning** باستخدام تقنية **LoRA (Low-Rank Adaptation)** على مجموعة من الوصفات الحقيقية.

الهدف: إن النموذج يتعلم "يفكر" زي شيف — يعرف يكتب وصفة منظمة ومنطقية بدل ما يكون مجرد نموذج لغوي عام.

### 2. RAG System — استرجاع المعلومات قبل التوليد

بدل ما النموذج يعتمد بس على اللي اتعلمه في التدريب، ربطناه بـ **قاعدة بيانات ضخمة من الوصفات** (+267,000 وصفة). لما حد يسأل، النظام:

1. **بيدور في قاعدة البيانات** على الوصفات الأقرب للمكونات المطلوبة
2. **بيجيب أحسن النتايج** ويديها للنموذج كـ "سياق"
3. **النموذج بيولّد** الوصفة النهائية بناءً على اللي لاقاه

ده بيخلي الإجابات أدق وأكثر واقعية من الاعتماد على النموذج لوحده.

---

## 📚 الـ Datasets المستخدمة

| Dataset | المصدر | عدد الوصفات | الاستخدام |
|---------|--------|-------------|-----------|
| `tengomucho/simple_recipes` | HuggingFace | 20,000 | Fine-Tuning + RAG |
| `rahul7star/food-recipes` | HuggingFace | 15,698 | RAG فقط |
| `formido/recipes` | HuggingFace | 231,637 | RAG فقط |
| **الإجمالي في RAG** | | **267,335** | قاعدة بيانات الاسترجاع |

---

## 🔄 رحلة الـ Request من أولها لآخرها

```
المستخدم يكتب: "chicken, garlic, lemon, rosemary"
                        │
                        ▼
         ┌──────────────────────────┐
         │   توليد 4 استعلامات     │
         │  (multi-query expansion) │
         └──────────┬───────────────┘
                    │
          ┌─────────┴──────────┐
          ▼                    ▼
   ┌─────────────┐      ┌─────────────┐
   │ FAISS       │      │ BM25        │
   │ (Dense)     │      │ (Sparse)    │
   │ semantic    │      │ keyword     │
   │ similarity  │      │ matching    │
   └──────┬──────┘      └──────┬──────┘
          └──────────┬──────────┘
                     ▼
           ┌──────────────────┐
           │  RRF Fusion      │
           │  (دمج النتايج)   │
           └────────┬─────────┘
                    ▼
           ┌──────────────────┐
           │ Cross-Encoder    │
           │ Re-ranking       │
           │ (أحسن 5 نتايج)  │
           └────────┬─────────┘
                    ▼
           ┌──────────────────┐
           │ LLaMA 3.1 8B     │
           │ + LoRA Adapter   │
           │ (توليد الوصفة)  │
           └────────┬─────────┘
                    ▼
         { recipe_name, ingredients,
           instructions, cooking_time,
           difficulty }
```

---

## 🏗️ هيكل المشروع

```
ChefMind/
├── frontend/                        # واجهة المستخدم
│   ├── index.html                   # هيكل الصفحة
│   ├── css/
│   │   └── style.css                # الستايل والتصميم
│   └── js/
│       └── app.js                   # منطق التطبيق (API, chips, rendering)
│
├── notebooks/                       # نوتبوكات Google Colab
│   ├── ChefMind_FineTuning1.ipynb   # تدريب LLaMA 3.1 8B بـ LoRA
│   └── ChefMind_RAG_final.ipynb     # RAG Pipeline + API Server
│
├── .gitignore
└── README.md
```

---

## 🚀 تشغيل المشروع

### الخطوة 1 — تشغيل الـ Backend (Google Colab)

1. افتح **`notebooks/ChefMind_RAG_final.ipynb`** في Google Colab مع GPU.
2. شغّل كل الـ cells بالترتيب.
3. آخر cell هيطلعلك **ngrok URL** — انسخه.

> **أول مرة فقط:** الـ cells 2–3 بتبني الـ indexes من 267k وصفة (~15 دقيقة). احفظهم على Google Drive (cell 8) عشان المرة الجاية تحملهم مباشرة.

### الخطوة 2 — فتح الـ Frontend

```bash
# افتح مباشرة في المتصفح
open frontend/index.html

# أو شغّل سيرفر محلي
cd frontend
python -m http.server 8080
# ثم افتح http://localhost:8080
```

الصق الـ ngrok URL في خانة **API** واضغط **Connect →** — لما النقطة تتحول خضرا، الكل شغّال.

### الخطوة 3 — إعادة التدريب (اختياري)

الـ LoRA adapter موجود جاهز على HuggingFace: [`Osamaelbably87/chefmind-lora`](https://huggingface.co/Osamaelbably87/chefmind-lora).

لو عايز تعيد التدريب أو تعدّل عليه، افتح **`notebooks/ChefMind_FineTuning1.ipynb`**.

---

## ⚙️ تفاصيل الـ Fine-Tuning

| إعداد | القيمة |
|-------|--------|
| النموذج الأساسي | `unsloth/Meta-Llama-3.1-8B-Instruct` |
| تقنية التدريب | QLoRA (4-bit NF4) |
| LoRA Rank | 16، Alpha 64 |
| الـ Target Modules | q, k, v, o, gate, up, down projections |
| حجم الـ Dataset | 20,000 وصفة |
| عدد الـ Steps | 100 |
| Final Loss | 1.30 |
| GPU | Tesla T4 (Google Colab) |
| وقت التدريب | ~2.4 ساعة |

---

## ⚙️ تفاصيل الـ RAG Pipeline

| المكوّن | التقنية |
|---------|---------|
| Dense Retrieval | FAISS + `all-MiniLM-L6-v2` |
| Sparse Retrieval | BM25 (rank-bm25) |
| Fusion | Reciprocal Rank Fusion (RRF) |
| Re-ranking | `cross-encoder/ms-marco-MiniLM-L-6-v2` |
| Chunk Size | 500 token, overlap 50 |
| Top-K Retrieval | 10 docs → rerank → top 5 |

---

## 🔌 الـ API

**Base URL:** ngrok URL بتاعك

### `GET /`
```json
{ "message": "ChefMind API is running! 🍳" }
```

### `POST /recipe`
**Request:**
```json
{ "query": "chicken, garlic, lemon, rosemary, Italian style" }
```

**Response:**
```json
{
  "recipe_name":  "Rosemary Lemon Chicken",
  "ingredients":  "2 chicken breasts, 4 garlic cloves (minced), ...",
  "instructions": "1. Marinate chicken with lemon and rosemary. 2. ...",
  "cooking_time": "35 minutes",
  "difficulty":   "Easy"
}
```

الـ Interactive docs موجودة على `<ngrok-url>/docs`.

---

## 📦 المتطلبات

الـ Backend شغّال بالكامل على **Google Colab** (T4 GPU مجاني كافي):

```
transformers==4.52.4  peft  accelerate  bitsandbytes  trl
datasets  langchain  langchain-community  langchain-huggingface
faiss-cpu  rank-bm25  sentence-transformers
fastapi  uvicorn  pyngrok  nest-asyncio
```

الـ Frontend **مفيهوش أي dependencies** — متصفح عادي كافي.

---

## 📄 License

MIT

---

*صُنع بعناية · Powered by LLaMA 3.1 8B + LoRA + Hybrid RAG*
