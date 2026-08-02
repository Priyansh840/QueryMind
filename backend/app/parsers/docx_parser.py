"""
QueryMind - DOCX Parser
Extracts text from Word documents using python-docx.
"""

from docx import Document
from typing import Dict


def parse_docx(file_path: str) -> Dict:
    """
    Extract text from a DOCX file.

    Args:
        file_path: Path to the DOCX file

    Returns:
        Dict with 'full_text', 'paragraphs', and 'metadata'
    """
    doc = Document(file_path)

    paragraphs = []
    full_text_parts = []

    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            paragraphs.append({
                "text": text,
                "style": para.style.name if para.style else "Normal",
            })
            full_text_parts.append(text)

    # Extract core properties
    props = doc.core_properties
    metadata = {
        "title": props.title or "",
        "author": props.author or "",
        "subject": props.subject or "",
    }

    return {
        "full_text": "\n\n".join(full_text_parts).strip(),
        "paragraphs": paragraphs,
        "page_count": max(1, len(full_text_parts) // 30),  # Approximate
        "metadata": metadata,
    }
