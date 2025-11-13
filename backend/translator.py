"""Translation helpers with graceful fallbacks."""

from __future__ import annotations

from typing import Optional


class Translator:
    def __init__(self, enabled: bool = False) -> None:
        self._enabled = enabled

    def translate(self, text: str, target_lang: str) -> str:
        if not self._enabled:
            return text
        # Placeholder: integrate DeepL or Google Translate SDK here.
        return text

    def detect(self, text: str) -> Optional[str]:
        try:
            import langdetect

            return langdetect.detect(text)
        except Exception:  # pragma: no cover
            return None
