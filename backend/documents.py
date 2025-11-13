"""Utilities for ingesting documents (text + PDF with OCR fallback)."""

from __future__ import annotations

import io
import os
import tempfile
from typing import List

import pdfplumber
from PIL import Image
import pytesseract

ALLOWED_TEXT_EXTENSIONS = {
    ".txt",
    ".md",
    ".markdown",
    ".json",
    ".csv",
    ".tsv",
    ".yml",
    ".yaml",
    ".html",
    ".xml",
}


def extract_texts_from_upload(filename: str, data: bytes) -> List[str]:
    suffix = os.path.splitext(filename or "")[1].lower()
    if suffix in ALLOWED_TEXT_EXTENSIONS:
        text = data.decode("utf-8", errors="ignore")
        return [text]
    if suffix == ".pdf":
        return _extract_from_pdf(data)
    raise ValueError(f"Unsupported file type: {filename}")


def _extract_from_pdf(data: bytes) -> List[str]:
    """Extract text from a PDF, falling back to OCR for empty pages."""
    results: List[str] = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            text = (page.extract_text() or "").strip()
            if text:
                results.append(text)
                continue
            # Attempt OCR if no text layer is present
            try:
                with tempfile.NamedTemporaryFile(suffix=".png") as temp_img:
                    page_image = page.to_image(resolution=300)
                    page_image.save(temp_img.name, format="PNG")
                    with Image.open(temp_img.name) as image:
                        ocr_text = pytesseract.image_to_string(image)
                        if ocr_text.strip():
                            results.append(ocr_text.strip())
            except Exception:  # pragma: no cover
                continue
    return results

