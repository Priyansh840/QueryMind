"""
QueryMind - PDF Parser
Extracts text from PDF files using pypdf.
"""

from pypdf import PdfReader
from typing import List, Dict


def parse_pdf(file_path: str) -> Dict:
    """
    Extract text from a PDF file, page by page.

    Args:
        file_path: Path to the PDF file

    Returns:
        Dict with 'full_text', 'pages', 'page_count', and 'metadata'
    """
    reader = PdfReader(file_path)

    pages = []
    full_text_parts = []

    for page_num, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        
        pages.append({
            "page_number": page_num + 1,
            "text": text.strip(),
        })
        full_text_parts.append(text)

    metadata = reader.metadata or {}

    return {
        "full_text": "\n\n".join(full_text_parts).strip(),
        "pages": pages,
        "page_count": len(pages),
        "metadata": {
            "title": metadata.get("/Title", ""),
            "author": metadata.get("/Author", ""),
            "subject": metadata.get("/Subject", ""),
        },
    }
