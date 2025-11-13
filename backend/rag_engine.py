"""Hybrid multilingual RAG engine built for prototyping."""

from __future__ import annotations

from dataclasses import dataclass
from math import sqrt
from typing import Iterable, List, Sequence

from langdetect import detect
from rank_bm25 import BM25Okapi

try:
    from FlagEmbedding import FlagModel
except ImportError:  # pragma: no cover
    FlagModel = None  # type: ignore


@dataclass
class RetrievedChunk:
    doc_id: str
    text: str
    score: float
    language: str
    highlights: List[str]


class RAGEngine:
    """Coordinates BM25 + embedding retrieval."""

    def __init__(self, corpus: Sequence[str] | None = None) -> None:
        self._corpus: List[str] = list(corpus or [])
        tokenized_corpus = [doc.split() for doc in self._corpus]
        self._bm25 = BM25Okapi(tokenized_corpus) if tokenized_corpus else None
        self._embedder = FlagModel("BAAI/bge-m3", use_fp16=True) if FlagModel else None
        self._doc_embeddings: List[List[float]] = []
        if self._embedder and self._corpus:
            encoded = self._embedder.encode(self._corpus)
            if hasattr(encoded, "tolist"):
                encoded = encoded.tolist()
            self._doc_embeddings = [list(map(float, vector)) for vector in encoded]

    def index(self, documents: Iterable[str]) -> None:
        for doc in documents:
            self._corpus.append(doc)
        tokenized_corpus = [doc.split() for doc in self._corpus]
        self._bm25 = BM25Okapi(tokenized_corpus)
        if self._embedder:
            encoded = self._embedder.encode(self._corpus)
            if hasattr(encoded, "tolist"):
                encoded = encoded.tolist()
            self._doc_embeddings = [list(map(float, vector)) for vector in encoded]

    def query(self, text: str, top_k: int = 5) -> List[RetrievedChunk]:
        if not self._corpus or not self._bm25:
            return []
        query_tokens = text.split()
        bm25_scores = self._bm25.get_scores(query_tokens)
        embedding_scores: List[float] = [0.0 for _ in self._corpus]
        query_vector: List[float] | None = None
        if self._embedder and self._doc_embeddings:
            encoded = self._embedder.encode([text])
            if hasattr(encoded, "tolist"):
                encoded = encoded.tolist()
            if encoded:
                query_vector = list(map(float, encoded[0]))
        if query_vector:
            norm_query = sqrt(sum(value * value for value in query_vector)) or 1.0
            for idx, doc_vector in enumerate(self._doc_embeddings):
                norm_doc = sqrt(sum(value * value for value in doc_vector))
                if not norm_doc:
                    continue
                dot_product = sum(q * d for q, d in zip(query_vector, doc_vector))
                embedding_scores[idx] = dot_product / (norm_query * norm_doc)
        ranked_indices = sorted(
            range(len(self._corpus)),
            key=lambda idx: (0.6 * bm25_scores[idx]) + (0.4 * embedding_scores[idx]),
            reverse=True,
        )[:top_k]
        results: List[RetrievedChunk] = []
        token_set = {token.lower() for token in query_tokens if token}
        for idx in ranked_indices:
            doc = self._corpus[idx]
            try:
                lang = detect(doc)
            except Exception:  # pragma: no cover
                lang = "unknown"
            doc_tokens = [token for token in doc.split() if token]
            highlights = sorted({token for token in doc_tokens if token.lower() in token_set})
            results.append(
                RetrievedChunk(
                    doc_id=str(idx),
                    text=doc,
                    score=float(bm25_scores[idx]),
                    language=lang,
                    highlights=highlights,
                )
            )
        return results
