# Multilingual RAG Prototype

This project provides a Cursor-friendly prototype for a multilingual Retrieval-Augmented Generation (RAG) system. It is organized into a React-based UI (`ui`) and a FastAPI backend (`backend`).

## Getting Started

### Backend

```bash
conda activate intellifix
source ../visual-doc-analyzer/backend/env.example 2>/dev/null || true
cd /Users/songlan/oscar-code/rag_multi_language/backend
pip install -r requirements.txt
export LLM_API_BASE_URL="https://api.deepseek.com/v1"
export LLM_API_KEY="sk-..."
# optional: export LLM_MODEL_NAME="deepseek-chat"
# optional: configure OpenAI for zero-context answers
export OPENAI_API_KEY="sk-..."
# export OPENAI_MODEL_NAME="gpt-4o-mini"
# optional: install tooling for PDF OCR
# macOS (Homebrew): brew install tesseract
# Ubuntu: sudo apt-get install tesseract-ocr
uvicorn app:app --reload
```

### Frontend

```bash
cd /Users/songlan/oscar-code/rag_multi_language/ui
npm install
npm run dev
```

### Document Ingestion & Workflow

- Upload UTF-8 text or PDF files directly from the UI using the “Upload documents” button. PDFs are parsed with pdfplumber and fall back to Tesseract OCR when no text layer is present.
- Alternatively, call the API:

```bash
curl -X POST http://127.0.0.1:8000/upload \
  -F "files=@docs/sample.pdf" \
  -F "files=@docs/notes.txt"
```

- **UI localization**  
  - `react-i18next` loads locale packs for English plus ten major Asian languages (Simplified/Traditional Chinese, Japanese, Korean, Hindi, Bengali, Vietnamese, Indonesian, Thai, Malay).  
  - The top-bar language selector persists in `localStorage` and automatically updates `document.lang`/`dir`.

- **Query flow**  
  1. React posts `/query` with the raw query, desired translation target, and `top_k`.  
  2. FastAPI detects the query language via `langdetect` and supplements it with heuristics for mixed Chinese/Korean content.  
  3. `RAGEngine` performs hybrid retrieval: BM25 (token-level scoring) + dense similarity using `BAAI/bge-m3` embeddings. Retrieved chunks are annotated with detected language and keyword overlaps.  
  4. Structured logging captures `query_lang`, retrieved languages, average score, and latency.

- **Generation & translation**  
  - `LLMClient` builds a multilingual system prompt instructing the model to answer strictly in the detected query language.  
  - Primary LLM call: configurable chat-completion endpoint (`LLM_API_*`) or DeepSeek.  
  - Fallbacks: if the primary call fails or returns an unexpected language, OpenAI (`OPENAI_API_KEY`) or the same LLM is used to translate. Both the original and translated answers are returned so the UI can toggle between them.  
  - When no supporting passages exist, a natural-language fallback summary is generated and translated into the query language.

- **Result rendering**  
  - React renders the generated answer, contextual documents with highlight tags, confidence scores, and language badges.  
  - “Show original/translated” toggles swap between the raw and translated answer texts and document snippets.  
  - Feedback widgets post relevance signals to `/feedback`; the backend simply logs them for now.

- **Document handling**  
  - `/upload` accepts UTF-8 text and PDFs; `documents.extract_texts_from_upload` extracts text, applying pdfplumber first and Tesseract OCR if no text layer exists.  
  - Extracted passages are appended to the corpus and re-indexed via `RAGEngine`. Ingestion events are logged with file/document counts.

Refer to `ARCHITECTURE.md` for additional implementation notes.
