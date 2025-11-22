# Multilingual RAG System

A multilingual Retrieval-Augmented Generation (RAG) system with dynamic UI translation and unlimited language support.

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
export OPENAI_API_KEY="sk-..."  # Required for translation
uvicorn app:app --reload
```

### Frontend
```bash
cd ui
npm install
npm run dev
```

Access at: http://localhost:5173

## Workflow

### 1. UI Translation (Dynamic)
- **Base Language**: English (`ui/locales/en.json` is the only translation file)
- **Dynamic Translation**: All UI content is translated on-demand via `/translate-ui` API
- **Supported Languages**: Unlimited (English, Chinese, Japanese, Korean, Hindi, Bengali, Vietnamese, Indonesian, Thai, Malay, and more)
- **Caching**: Translations cached in localStorage (24h TTL) for instant subsequent loads
- **Flow**: User selects language → Frontend requests translation → Backend translates via LLM → UI updates

### 2. Query Processing
1. User enters query in any language
2. Backend detects query language using `langdetect`
3. Hybrid retrieval: BM25 + `bge-m3` embeddings
4. LLM generates answer in query language
5. Response matches query language (auto-translated if needed)

### 3. Document Ingestion
- **Upload**: Text files (.txt, .md, .json, etc.) or PDFs via UI or API
- **Processing**: PDFs use pdfplumber, fallback to Tesseract OCR
- **Indexing**: Documents added to corpus, re-indexed with BM25 + embeddings
- **Language**: Detected during retrieval (no preprocessing needed)

### 4. Answer Generation
- **Primary**: LLM generates answer in query language using retrieved context
- **Fallback**: If no documents, uses OpenAI API directly
- **Translation**: Auto-translates answer if LLM responds in wrong language
- **Toggle**: UI allows switching between original and translated answer

## API Endpoints

- `POST /query` - Query with multilingual retrieval and generation
- `POST /upload` - Upload documents (text or PDF)
- `POST /index` - Index text documents
- `POST /translate-ui` - Translate UI strings on-demand
- `POST /feedback` - Submit feedback

## Key Features

- ✅ **Unlimited Language Support**: Dynamic UI translation (no pre-translated files)
- ✅ **Query-Response Language Matching**: Answer always matches query language
- ✅ **Multilingual Retrieval**: Hybrid BM25 + semantic search across languages
- ✅ **PDF Support**: Text extraction with OCR fallback
- ✅ **Smart Caching**: Translations cached for performance

## Environment Variables

```bash
OPENAI_API_KEY=sk-...          # Required for translation
LLM_API_BASE_URL=...           # Optional: Custom LLM endpoint
LLM_API_KEY=...                # Optional: Custom LLM API key
```

## Architecture

- **Frontend**: React + TypeScript + Vite + i18next (dynamic backend)
- **Backend**: FastAPI + Python
- **Retrieval**: BM25 (rank-bm25) + bge-m3 embeddings (FlagEmbedding)
- **LLM**: OpenAI (primary) or configurable endpoint
- **Translation**: LLM-based on-demand translation
