"""
QueryMind - Recursive Text Chunker
Splits documents into overlapping semantic chunks for RAG.
"""

from typing import List
from dataclasses import dataclass


@dataclass
class TextChunk:
    """Represents a single chunk of text from a document."""
    content: str
    chunk_index: int
    page_number: int | None = None
    section_heading: str | None = None


class RecursiveChunker:
    """
    Recursively splits text into overlapping chunks using multiple separators.

    Algorithm:
    1. Try splitting by paragraphs (\\n\\n)
    2. If chunks are still too large, split by sentences (. ! ?)
    3. If still too large, split by newlines (\\n)
    4. Last resort: split by spaces

    Overlap ensures context continuity between adjacent chunks.
    """

    def __init__(
        self,
        chunk_size: int = 500,
        chunk_overlap: int = 100,
        separators: List[str] | None = None,
    ):
        """
        Args:
            chunk_size: Maximum number of characters per chunk
            chunk_overlap: Number of overlapping characters between chunks
            separators: List of separators to try, in order of priority
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", ". ", "! ", "? ", " "]

    def chunk_text(
        self,
        text: str,
        page_number: int | None = None,
        section_heading: str | None = None,
    ) -> List[TextChunk]:
        """
        Split text into overlapping chunks.

        Args:
            text: Full text to split
            page_number: Optional page number for metadata
            section_heading: Optional section heading for metadata

        Returns:
            List of TextChunk objects
        """
        if not text or not text.strip():
            return []

        # Clean the text
        text = text.strip()

        # If text fits in one chunk, return as-is
        if len(text) <= self.chunk_size:
            return [
                TextChunk(
                    content=text,
                    chunk_index=0,
                    page_number=page_number,
                    section_heading=section_heading,
                )
            ]

        # Recursively split the text
        splits = self._recursive_split(text, self.separators)

        # Merge splits into chunks with overlap
        chunks = self._merge_splits(splits)

        # Convert to TextChunk objects
        return [
            TextChunk(
                content=chunk,
                chunk_index=i,
                page_number=page_number,
                section_heading=section_heading,
            )
            for i, chunk in enumerate(chunks)
        ]

    def _recursive_split(self, text: str, separators: List[str]) -> List[str]:
        """Recursively split text using separators in order of priority."""
        if not separators:
            # Last resort: character-level split
            return [text[i:i + self.chunk_size] for i in range(0, len(text), self.chunk_size)]

        separator = separators[0]
        remaining_separators = separators[1:]

        # Split by current separator
        parts = text.split(separator)

        result = []
        for part in parts:
            part = part.strip()
            if not part:
                continue

            if len(part) <= self.chunk_size:
                result.append(part)
            else:
                # Part is too large, try next separator
                result.extend(self._recursive_split(part, remaining_separators))

        return result

    def _merge_splits(self, splits: List[str]) -> List[str]:
        """Merge small splits into chunks of target size with overlap."""
        chunks = []
        current_chunk = ""

        for split in splits:
            # If adding this split would exceed chunk size
            if current_chunk and len(current_chunk) + len(split) + 1 > self.chunk_size:
                chunks.append(current_chunk.strip())

                # Create overlap from end of current chunk
                if self.chunk_overlap > 0:
                    overlap_text = current_chunk[-self.chunk_overlap:]
                    current_chunk = overlap_text + " " + split
                else:
                    current_chunk = split
            else:
                if current_chunk:
                    current_chunk += " " + split
                else:
                    current_chunk = split

        # Don't forget the last chunk
        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        return chunks


# Default chunker instance
chunker = RecursiveChunker(chunk_size=500, chunk_overlap=100)
