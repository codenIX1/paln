"""Text chunking handler for upload processing."""

import re
from typing import Optional


class TextChunker:
    """Handles text chunking with overlap and smart splitting."""

    def __init__(
        self,
        chunk_size: int = 500,
        chunk_overlap: int = 100,
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split_by_paragraphs(self, text: str) -> list[str]:
        """Split text by double newlines (paragraphs)."""
        paragraphs = re.split(r"\n\s*\n", text)
        return [p.strip() for p in paragraphs if p.strip()]

    def split_by_sentences(self, text: str) -> list[str]:
        """Split text into sentences."""
        sentence_pattern = r"(?<=[.!?])\s+"
        sentences = re.split(sentence_pattern, text)
        return [s.strip() for s in sentences if s.strip()]

    def chunk_text(self, text: str) -> list[str]:
        """Split text into chunks with overlap.
        
        Args:
            text: Input text to chunk
            
        Returns:
            List of text chunks
        """
        if len(text) <= self.chunk_size:
            return [text] if text.strip() else []

        chunks = []
        start = 0

        while start < len(text):
            end = start + self.chunk_size
            
            if end < len(text):
                chunk = text[start:end]
                last_period = chunk.rfind(".")
                last_newline = chunk.rfind("\n")
                split_pos = max(last_period, last_newline)
                
                if split_pos > start + self.chunk_size // 2:
                    end = start + split_pos + 1
            
            chunks.append(text[start:end].strip())
            start = end - self.chunk_overlap

        return [c for c in chunks if c]

    def chunk_pages(self, pages: list[dict]) -> list[dict]:
        """Chunk pages and preserve page numbers.
        
        Args:
            pages: List of dicts with 'text' and 'page' keys
            
        Returns:
            List of chunks with 'text' and 'page' keys
        """
        all_chunks = []
        
        for page in pages:
            text = page.get("text", "")
            page_num = page.get("page", 1)
            
            if not text:
                continue
            
            paragraphs = self.split_by_paragraphs(text)
            current_chunk = ""
            
            for para in paragraphs:
                if len(current_chunk) + len(para) + 1 <= self.chunk_size:
                    current_chunk += ("\n\n" if current_chunk else "") + para
                else:
                    if current_chunk:
                        all_chunks.append({
                            "text": current_chunk,
                            "page": page_num,
                        })
                    
                    if len(para) > self.chunk_size:
                        para_chunks = self.chunk_text(para)
                        for pc in para_chunks:
                            all_chunks.append({
                                "text": pc,
                                "page": page_num,
                            })
                        current_chunk = ""
                    else:
                        current_chunk = para
            
            if current_chunk:
                all_chunks.append({
                    "text": current_chunk,
                    "page": page_num,
                })
        
        return all_chunks

    def chunk_text_with_pages(self, text: str, page: int = 1) -> list[dict]:
        """Chunk plain text and return with page number.
        
        Args:
            text: Input text
            page: Page number to assign
            
        Returns:
            List of chunks with 'text' and 'page' keys
        """
        chunks = self.chunk_text(text)
        return [{"text": c, "page": page} for c in chunks]


class ModalityAwareChunker(TextChunker):
    """Chunks text with semantic segment detection + modality tagging."""

    HEADING_PATTERNS = [
        re.compile(r'^#{1,6}\s'),
        re.compile(r'^[A-Z][A-Z\s]{5,80}$'),
        re.compile(r'^\d+\.\s+[A-Z]'),
    ]
    CAPTION_PATTERN = re.compile(
        r'^(Fig(ure)?|Table|Chart|Image|Diagram)\s*\.?\s*\d+', re.IGNORECASE
    )
    LIST_PATTERN = re.compile(r'^[\-\*•]\s')

    def detect_segment_type(self, text: str) -> str:
        first_line = text.strip().split('\n')[0] if text.strip() else ""
        if any(p.match(first_line) for p in self.HEADING_PATTERNS):
            return "heading"
        if self.CAPTION_PATTERN.match(first_line):
            return "caption"
        if self.LIST_PATTERN.match(first_line):
            return "list"
        return "paragraph"

    def chunk_pages_with_metadata(self, pages: list[dict], modality: str = "text") -> list[dict]:
        raw_chunks = self.chunk_pages(pages)
        for i, chunk in enumerate(raw_chunks):
            chunk["modality"] = modality
            chunk["segment_type"] = self.detect_segment_type(chunk["text"])
            chunk["confidence"] = pages[0].get("confidence", 1.0) if pages else 1.0
            chunk["chunk_index"] = i
            chunk["source_anchor"] = {
                "chunk_index": i,
                "page": chunk.get("page", 1),
                "timestamp_start": None,
                "timestamp_end": None,
            }
        return raw_chunks

    def chunk_audio_segments(self, segments: list[dict], modality: str = "audio") -> list[dict]:
        return [
            {
                "text": seg["text"].strip(),
                "page": 1,
                "modality": modality,
                "segment_type": "transcript_segment",
                "confidence": 1.0,
                "chunk_index": i,
                "source_anchor": {
                    "chunk_index": i,
                    "page": 1,
                    "timestamp_start": seg.get("start"),
                    "timestamp_end": seg.get("end"),
                },
            }
            for i, seg in enumerate(segments)
            if seg.get("text", "").strip()
        ]


def chunk_document(pages: list[dict]) -> list[dict]:
    """Convenience function to chunk document pages."""
    chunker = TextChunker()
    return chunker.chunk_pages(pages)
