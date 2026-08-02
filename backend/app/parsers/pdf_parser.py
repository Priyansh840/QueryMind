"""
QueryMind - PDF Parser
Extracts text from PDF files using PyMuPDF (fitz).
"""

import fitz  # PyMuPDF
from typing import List, Dict


def parse_pdf(file_path: str) -> Dict:
    """
    Extract text from a PDF file, page by page.

    Args:
        file_path: Path to the PDF file

    Returns:
        Dict with 'full_text', 'pages', 'page_count', and 'metadata'
    """
    doc = fitz.open(file_path)

    pages = []
    full_text_parts = []

    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text("text")

        pages.append({
            "page_number": page_num + 1,
            "text": text.strip(),
        })
        full_text_parts.append(text)

    metadata = doc.metadata or {}
    doc.close()

    return {
        "full_text": "\n\n".join(full_text_parts).strip(),
        "pages": pages,
        "page_count": len(pages),
        "metadata": {
            "title": metadata.get("title", ""),
            "author": metadata.get("author", ""),
            "subject": metadata.get("subject", ""),
        },
    }
