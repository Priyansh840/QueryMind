"""
QueryMind - Image Parser (OCR)
Extracts text from images using Tesseract OCR.
"""

import pytesseract
from PIL import Image
from typing import Dict


def parse_image(file_path: str) -> Dict:
    """
    Extract text from an image using Tesseract OCR.

    Args:
        file_path: Path to the image file (PNG, JPG, JPEG, etc.)

    Returns:
        Dict with 'full_text' and 'metadata'
    """
    image = Image.open(file_path)

    # Preprocess: convert to RGB if needed
    if image.mode != "RGB":
        image = image.convert("RGB")

    # Extract text using Tesseract
    text = pytesseract.image_to_string(image)

    return {
        "full_text": text.strip(),
        "pages": [{"page_number": 1, "text": text.strip()}],
        "page_count": 1,
        "metadata": {
            "title": "",
            "author": "",
            "subject": "",
            "image_size": f"{image.width}x{image.height}",
        },
    }
