"""Lightweight client for LLM summarization with graceful fallback."""

from __future__ import annotations

import json
import os
from typing import Dict, Iterable, Optional

import httpx

from rag_engine import RetrievedChunk


class LLMClient:
    """Dispatches generation prompts to a configured chat completion endpoint."""

    def __init__(self) -> None:
        self._base_url = os.getenv("LLM_API_BASE_URL")
        self._api_key = os.getenv("LLM_API_KEY")
        self._model = os.getenv("LLM_MODEL_NAME", "deepseek-chat")
        self._timeout = float(os.getenv("LLM_API_TIMEOUT", "30"))
        self._openai_api_key = os.getenv("OPENAI_API_KEY")
        self._openai_model = os.getenv("OPENAI_MODEL_NAME", "gpt-4o-mini")
        self._openai_timeout = float(os.getenv("OPENAI_API_TIMEOUT", "30"))
        self._language_names: Dict[str, str] = {
            "en": "English",
            "en-us": "English",
            "en-gb": "English",
            "zh": "Chinese",
            "zh-cn": "Simplified Chinese",
            "zh-tw": "Traditional Chinese",
            "jp": "Japanese",
            "ja": "Japanese",
            "ko": "Korean",
            "hi": "Hindi",
            "bn": "Bengali",
            "vi": "Vietnamese",
            "id": "Indonesian",
            "ms": "Malay",
            "th": "Thai",
            "de": "German",
            "fr": "French",
            "es": "Spanish",
            "pt": "Portuguese",
            "ru": "Russian",
            "ar": "Arabic",
        }

    def _is_enabled(self) -> bool:
        return bool(self._base_url and self._api_key)

    def generate(
        self,
        query: str,
        query_lang: Optional[str],
        documents: Iterable[RetrievedChunk],
        target_lang: Optional[str],
    ) -> tuple[str, Optional[str]]:
        """Return generated answer and detected language (if known)."""
        if not query.strip():
            return "", query_lang
        doc_list = list(documents)
        doc_summaries = "\n\n".join(f"[{chunk.doc_id}] {chunk.text}" for chunk in doc_list)
        desired_lang_code = (target_lang or query_lang or "en") or "en"
        desired_lang_name = self._resolve_language_name(desired_lang_code)
        system_prompt = (
            "You are a multilingual retrieval-augmented assistant. "
            "Answer using only the provided context and be concise. "
            "If the context is insufficient, reply that you do not have enough information. "
            f"Always respond strictly in {desired_lang_name}."
        )
        user_prompt = (
            f"User language: {query_lang or 'unknown'}\n"
            f"Answer language: {desired_lang_name}\n"
            f"User query: {query}\n\n"
            f"Context passages:\n{doc_summaries or 'No supporting documents available.'}\n\n"
            "Compose a response in the requested answer language."
        )

        if not doc_list and self._openai_api_key:
            openai_response = self._generate_with_openai(
                system_prompt, query, desired_lang_code, desired_lang_name, None
            )
            if openai_response:
                return openai_response, desired_lang_code
            return self._fallback_response(doc_list, desired_lang_code), desired_lang_code

        if not self._is_enabled():
            if self._openai_api_key:
                openai_response = self._generate_with_openai(
                    system_prompt, query, desired_lang_code, desired_lang_name, doc_summaries
                )
                if openai_response:
                    return openai_response, desired_lang_code
            return self._fallback_response(doc_list, desired_lang_code), desired_lang_code

        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": float(os.getenv("LLM_TEMPERATURE", "0.2")),
        }
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        try:
            with httpx.Client(base_url=self._base_url, timeout=self._timeout) as client:
                response = client.post("/chat/completions", headers=headers, data=json.dumps(payload))
                response.raise_for_status()
                body = response.json()
        except Exception:
            if self._openai_api_key:
                openai_response = self._generate_with_openai(
                    system_prompt, query, desired_lang_code, desired_lang_name, doc_summaries
                )
                if openai_response:
                    return openai_response, desired_lang_code
            return self._fallback_response(doc_list, desired_lang_code), desired_lang_code

        choices = body.get("choices") or []
        if not choices:
            if self._openai_api_key:
                openai_response = self._generate_with_openai(
                    system_prompt, query, desired_lang_code, desired_lang_name, doc_summaries
                )
                if openai_response:
                    return openai_response, desired_lang_code
            return self._fallback_response(doc_list, desired_lang_code), desired_lang_code
        message = choices[0].get("message") or {}
        content = message.get("content") or ""
        return content.strip(), desired_lang_code

    def _generate_with_openai(
        self,
        system_prompt: str,
        query: str,
        desired_lang_code: str,
        desired_lang_name: str,
        doc_summaries: Optional[str],
    ) -> str:
        if not self._openai_api_key:
            return ""
        user_prompt = (
            f"Answer language: {desired_lang_name}\n"
            f"User query: {query}\n\n"
        )
        if doc_summaries:
            user_prompt += f"Context passages:\n{doc_summaries}\n\n"
        user_prompt += "Respond in the requested answer language."
        payload = {
            "model": self._openai_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": float(os.getenv("OPENAI_TEMPERATURE", "0.3")),
        }
        headers = {
            "Authorization": f"Bearer {self._openai_api_key}",
            "Content-Type": "application/json",
        }
        try:
            with httpx.Client(base_url="https://api.openai.com/v1", timeout=self._openai_timeout) as client:
                response = client.post("/chat/completions", headers=headers, data=json.dumps(payload))
                response.raise_for_status()
                body = response.json()
        except Exception:
            return ""
        choices = body.get("choices") or []
        if not choices:
            return ""
        message = choices[0].get("message") or {}
        return (message.get("content") or "").strip()

    def _fallback_response(self, documents: Iterable[RetrievedChunk], language: str) -> str:
        excerpts = []
        for chunk in documents:
            snippet = chunk.text.strip().replace("\n", " ")
            if snippet:
                excerpts.append(f"- {snippet}")
        if not excerpts:
            base_message = "No supporting knowledge was retrieved to answer the question."
        else:
            base_message = "Key findings:\n" + "\n".join(excerpts[:3])
        if language and language.lower() not in {"en", "en-us", "en-gb"}:
            translated = self.translate_text(base_message, language)
            if translated.strip():
                return translated
        return base_message

    def translate_text(self, text: str, target_lang: Optional[str]) -> str:
        if not text.strip() or not target_lang:
            return text
        target_lang_name = self._resolve_language_name(target_lang)
        translation_prompt = (
            "You are a professional translator. "
            f"Translate the text to {target_lang_name} and return only the translated sentence without explanations."
        )
        payload = {
            "messages": [
                {"role": "system", "content": translation_prompt},
                {"role": "user", "content": text},
            ],
            "temperature": 0.0,
        }
        if self._openai_api_key:
            payload_with_model = {**payload, "model": self._openai_model}
            headers = {
                "Authorization": f"Bearer {self._openai_api_key}",
                "Content-Type": "application/json",
            }
            try:
                with httpx.Client(base_url="https://api.openai.com/v1", timeout=self._openai_timeout) as client:
                    response = client.post("/chat/completions", headers=headers, data=json.dumps(payload_with_model))
                    response.raise_for_status()
                    body = response.json()
                    choices = body.get("choices") or []
                    if choices:
                        return (choices[0].get("message", {}).get("content") or "").strip() or text
            except Exception:
                pass
        if self._is_enabled():
            payload_with_model = {**payload, "model": self._model}
            headers = {
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            }
            try:
                with httpx.Client(base_url=self._base_url, timeout=self._timeout) as client:
                    response = client.post("/chat/completions", headers=headers, data=json.dumps(payload_with_model))
                    response.raise_for_status()
                    body = response.json()
                    choices = body.get("choices") or []
                    if choices:
                        return (choices[0].get("message", {}).get("content") or "").strip() or text
            except Exception:
                pass
        return text

    def _resolve_language_name(self, language: Optional[str]) -> str:
        if not language:
            return "English"
        code = language.lower()
        if code in self._language_names:
            return self._language_names[code]
        base = code.split("-")[0]
        if base in self._language_names:
            return self._language_names[base]
        return language.capitalize()

