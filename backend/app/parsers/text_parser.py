"""
QueryMind - Text/Markdown Parser
Handles plain text (.txt) and Markdown (.md) files.
"""

from typing import Dict


def parse_text(file_path: str) -> Dict:
    """
    Read and return plain text or markdown file content.

    Args:
        file_path: Path to the text/markdown file

    Returns:
        Dict with 'full_text' and 'metadata'
    """
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    return {
        "full_text": content.strip(),
        "pages": [{"page_number": 1, "text": content.strip()}],
        "page_count": 1,
        "metadata": {"title": "", "author": "", "subject": ""},
    }
