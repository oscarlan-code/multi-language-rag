# Multilingual RAG Architecture

## Overview
- **Frontend**: React + i18next with automatic language detection, retrieval log panel, and translation toggle.
- **Backend**: FastAPI service wrapping the RAG pipeline (BM25 + multilingual embedding) with structured logging.

## UX Flow
1. Detect user language and localize UI.
2. Accept free-form query in any language via smart input component.
3. Backend detects query language, performs retrieval, optionally translates response.
4. Display highlighted results and document metadata, offer translation toggle.
5. Collect user feedback for continuous improvement.

## Key Endpoints
- `POST /query`: run hybrid retrieval and return localized answer + metadata.
- `POST /index`: add or refresh corpus documents.
- `POST /feedback`: capture relevance signals (`helpful` or `not_accurate`).

## Implementation Notes
- Use `langdetect` for lightweight language detection; swap with `fastText` if GPU available.
- Default embedding model: `bge-m3` via `FlagEmbedding`.
- Provide translation wrapper that gracefully falls back to original text on errors.
- Persist structured logs with fields: `query_lang`, `retrieved_langs`, `latency_ms`, `score_mean`.
- Ensure RTL layout support and dynamic text sizing on the frontend.
