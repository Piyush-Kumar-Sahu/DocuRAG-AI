import os
from typing import List, Dict, Any
import pymupdf
from app.core.config import settings

class PDFProcessor:
    @staticmethod
    def extract_text(file_path: str) -> List[Dict[str, Any]]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found at: {file_path}")
        try:
            doc = pymupdf.open(file_path)
        except Exception as e:
            raise ValueError(f"Failed to open PDF file: {str(e)}")
        pages_data: List[Dict[str, Any]] = []
        total_text = ""

        try:
            for page_index in range(len(doc)):
                page = doc[page_index]
                text = page.get_text("text")
                clean_text = text.strip() if text else ""
                total_text += clean_text
                pages_data.append({
                    "page_number": page_index + 1,
                    "text": clean_text
                })
        finally:
            doc.close()

        stripped_total = "".join(total_text.split())
        if len(stripped_total) < 20:
            raise ValueError(
                "The uploaded PDF contains no extractable text or is a scanned image. "
                "Text-based PDFs are required in version 1."
            )

        return pages_data

    @staticmethod
    def chunk_pages(
        pages_data: List[Dict[str, Any]],
        chunk_size: int = settings.RAG_CHUNK_SIZE,
        chunk_overlap: int = settings.RAG_CHUNK_OVERLAP
    ) -> List[Dict[str, Any]]:
        chunks: List[Dict[str, Any]] = []
        chunk_index = 0

        for page in pages_data:
            page_number = page["page_number"]
            page_text = page["text"]

            if not page_text:
                continue

            words = page_text.split()
            if not words:
                continue 
            words_per_chunk = max(20, chunk_size // 5)
            overlap_words = max(5, chunk_overlap // 5)
            step = max(1, words_per_chunk - overlap_words)

            for i in range(0, len(words), step):
                chunk_words = words[i:i + words_per_chunk]
                chunk_text = " ".join(chunk_words).strip()
                if chunk_text:
                    chunks.append({
                        "chunk_index": chunk_index,
                        "page_number": page_number,
                        "text": chunk_text
                    })
                    chunk_index += 1
                if i + words_per_chunk >= len(words):
                    break

        return chunks

pdf_processor = PDFProcessor()
