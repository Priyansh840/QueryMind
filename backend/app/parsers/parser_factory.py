"""
QueryMind - Parser Factory
Routes files to the correct parser based on file type.
"""

from typing import Dict

from app.parsers.pdf_parser import parse_pdf
from app.parsers.docx_parser import parse_docx
from app.parsers.text_parser import parse_text
from app.parsers.image_parser import parse_image


# Supported file types and their parsers
PARSER_MAP = {
    "pdf": parse_pdf,
    "docx": parse_docx,
    "txt": parse_text,
    "md": parse_text,
    "markdown": parse_text,
    "png": parse_image,
    "jpg": parse_image,
    "jpeg": parse_image,
    "webp": parse_image,
}

SUPPORTED_EXTENSIONS = set(PARSER_MAP.keys())


def get_file_extension(filename: str) -> str:
    """Extract and normalize file extension."""
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def parse_document(file_path: str, filename: str) -> Dict:
    """
    Parse a document using the appropriate parser.

    Args:
        file_path: Path to the uploaded file
        filename: Original filename (used to determine type)

    Returns:
        Dict with 'full_text', 'pages', 'page_count', 'metadata'

    Raises:
        ValueError: If file type is not supported
    """
    ext = get_file_extension(filename)

    if ext not in PARSER_MAP:
        raise ValueError(
            f"Unsupported file type: .{ext}. "
            f"Supported types: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )

    parser_func = PARSER_MAP[ext]
    return parser_func(file_path)
