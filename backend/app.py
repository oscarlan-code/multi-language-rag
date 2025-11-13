"""FastAPI service exposing multilingual RAG endpoints."""

from __future__ import annotations

import logging
import os
import time
import re
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel

from rag_engine import RAGEngine, RetrievedChunk
from translator import Translator
from llm_client import LLMClient
from documents import extract_texts_from_upload

load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env", override=False)

app = FastAPI(title="Multilingual RAG API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger = logging.getLogger("rag")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)
_engine = RAGEngine()
_translator = Translator(enabled=os.getenv("TRANSLATION_ENABLED", "0") == "1")
_llm = LLMClient()


class QueryRequest(BaseModel):
    query: str
    target_lang: Optional[str] = None
    top_k: int = 5


class RetrievedDocument(BaseModel):
    doc_id: str
    original_text: str
    translated_text: Optional[str]
    score: float
    confidence: float
    language: str
    highlights: List[str]


class QueryResponse(BaseModel):
    query_lang: Optional[str]
    retrieved_langs: List[str]
    documents: List[RetrievedDocument]
    latency_ms: float
    score_mean: float
    token_count: int
    answer_text: str
    answer_language: Optional[str]
    answer_translated_text: Optional[str]


class IndexRequest(BaseModel):
    documents: List[str]


class FeedbackRequest(BaseModel):
    query: str
    doc_id: Optional[str] = None
    helpful: bool
    notes: Optional[str] = None


@app.post("/query", response_model=QueryResponse)
def run_query(payload: QueryRequest) -> QueryResponse:
    started_at = time.perf_counter()
    docs = _engine.query(payload.query, top_k=payload.top_k)
    query_lang = _translator.detect(payload.query)
    if query_lang in {"ko", "ja", "zh-cn", "zh-tw", "zh"}:
        if _contains_chinese(payload.query):
            query_lang = "zh-cn"
    retrieved_langs = [doc.language for doc in docs]
    max_score = max((doc.score for doc in docs), default=0.0)
    desired_answer_lang = query_lang or payload.target_lang
    answer_text, answer_lang = _llm.generate(
        query=payload.query,
        query_lang=query_lang,
        documents=docs,
        target_lang=desired_answer_lang,
    )
    answer_translated_text: Optional[str] = None
    if query_lang and answer_lang and answer_lang != query_lang:
        original_answer = answer_text
        translated_answer = _llm.translate_text(answer_text, query_lang)
        if translated_answer.strip():
            answer_text = translated_answer
            answer_translated_text = original_answer
            answer_lang = query_lang
    elif payload.target_lang and answer_lang and payload.target_lang != answer_lang:
        translated_answer = _llm.translate_text(answer_text, payload.target_lang)
        if translated_answer.strip():
            answer_translated_text = translated_answer
    translated_docs = []
    for doc in docs:
        translated_text: Optional[str] = None
        if payload.target_lang and payload.target_lang != doc.language:
            translated_text = _translator.translate(doc.text, payload.target_lang)
        confidence = doc.score / max_score if max_score else 0.0
        translated_docs.append(
            RetrievedDocument(
                doc_id=doc.doc_id,
                original_text=doc.text,
                translated_text=translated_text,
                score=doc.score,
                confidence=confidence,
                language=doc.language,
                highlights=doc.highlights,
            )
        )
    latency_ms = (time.perf_counter() - started_at) * 1000
    score_mean = float(sum(doc.score for doc in docs) / len(docs)) if docs else 0.0
    token_count = len(payload.query.split())
    logger.info(
        "query_complete",
        extra={
            "query_lang": query_lang,
            "retrieved_langs": retrieved_langs,
            "score_mean": score_mean,
            "latency_ms": latency_ms,
        },
    )
    return QueryResponse(
        query_lang=query_lang,
        retrieved_langs=retrieved_langs,
        documents=translated_docs,
        latency_ms=latency_ms,
        score_mean=score_mean,
        token_count=token_count,
        answer_text=answer_text,
        answer_language=answer_lang,
        answer_translated_text=answer_translated_text,
    )


_chinese_char_pattern = re.compile(r"[\u4e00-\u9fff]")


def _contains_chinese(text: str) -> bool:
    return bool(_chinese_char_pattern.search(text))


@app.post("/index")
def index_documents(payload: IndexRequest) -> dict[str, int]:
    _engine.index(payload.documents)
    logger.info("index_complete", extra={"count": len(payload.documents)})
    return {"count": len(payload.documents)}


@app.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...)) -> dict[str, int]:
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")
    extracted: List[str] = []
    for file in files:
        try:
            contents = await file.read()
            extracted.extend(extract_texts_from_upload(file.filename, contents))
        except ValueError as exc:
            logger.warning("upload_rejected", extra={"file": file.filename, "reason": str(exc)})
            raise HTTPException(status_code=400, detail=str(exc))
        except Exception as exc:  # pragma: no cover
            logger.exception("upload_processing_failed", extra={"file": file.filename})
            raise HTTPException(status_code=500, detail="Failed to process uploaded files.") from exc
        finally:
            await file.close()
    cleaned = [text for text in (text.strip() for text in extracted) if text]
    if not cleaned:
        raise HTTPException(status_code=400, detail="No text content extracted from provided files.")
    _engine.index(cleaned)
    logger.info("upload_index_complete", extra={"files": len(files), "documents": len(cleaned)})
    return {"files": len(files), "documents": len(cleaned)}


@app.post("/feedback")
def record_feedback(payload: FeedbackRequest) -> dict[str, str]:
    logger.info(
        "feedback_received",
        extra={
            "query": payload.query,
            "doc_id": payload.doc_id,
            "helpful": payload.helpful,
        },
    )
    return {"status": "received"}
