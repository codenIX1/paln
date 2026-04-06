"""Text cleaning pipeline for upload processing."""

import re
from typing import Optional


class TextCleaner:
    """Handles text cleaning pipeline: clean → normalize → deduplicate.
    
    Supports multiple modalities:
    - document: PDF, TXT, DOCX text
    - image: OCR extracted text
    - audio: Transcription text
    - video: Transcription text
    """

    def __init__(self, min_line_length: int = 3):
        self.min_line_length = min_line_length

    def clean(self, text: str) -> str:
        """Remove control characters and fix common OCR artifacts.
        
        Args:
            text: Raw input text
            
        Returns:
            Cleaned text
        """
        if not text:
            return ""
        
        result = text
        
        result = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', result)
        
        result = re.sub(r'[\u200b-\u200f\u2028-\u202f]', '', result)
        
        result = re.sub(r'(?<=[a-zA-Z])[\u2018\u2019](?=[a-zA-Z])', "'", result)
        result = re.sub(r'(?<=[a-zA-Z])[\u201c\u201d](?=[a-zA-Z])', '"', result)
        
        result = re.sub(r'\u2014', ' -- ', result)
        result = re.sub(r'\u2013', ' - ', result)
        result = re.sub(r'\u2026', '...', result)
        
        result = re.sub(r'[\u00a0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000]', ' ', result)
        
        result = re.sub(r'(?<!\n)\n(?!\n)', ' ', result)
        
        result = re.sub(r'[ \t]+\n', '\n', result)
        result = re.sub(r'\n[ \t]+', '\n', result)
        
        return result

    def normalize(self, text: str) -> str:
        """Normalize text: standardize quotes, dashes, spacing.
        
        Args:
            text: Input text
            
        Returns:
            Normalized text
        """
        if not text:
            return ""
        
        result = text
        
        result = re.sub(r'[\u2018\u2019]', "'", result)
        result = re.sub(r'[\u201c\u201d]', '"', result)
        
        result = re.sub(r'[\u2014\u2013]', '-', result)
        
        result = re.sub(r'(\w)[\u2022\u2023\u2043\u2219](\w)', r'\1\2', result)
        
        result = re.sub(r'([.!?])\1+', r'\1', result)
        
        result = re.sub(r' {2,}', ' ', result)
        
        result = re.sub(r'\n{3,}', '\n\n', result)
        
        result = re.sub(r'^[\s]+', '', result, flags=re.MULTILINE)
        result = re.sub(r'[\s]+$', '', result, flags=re.MULTILINE)
        
        return result

    def deduplicate(self, text: str) -> str:
        """Remove consecutive duplicate lines.
        
        Args:
            text: Input text
            
        Returns:
            Deduplicated text
        """
        if not text:
            return ""
        
        lines = text.split('\n')
        result_lines = []
        prev_line: Optional[str] = None
        
        for line in lines:
            stripped = line.strip()
            
            if stripped and stripped != prev_line:
                result_lines.append(line)
                prev_line = stripped
            elif not stripped:
                result_lines.append(line)
        
        return '\n'.join(result_lines)

    def process(self, text: str) -> str:
        """Run full cleaning pipeline: clean → normalize → deduplicate.
        
        Args:
            text: Raw input text
            
        Returns:
            Fully processed text
        """
        if not text:
            return ""
        
        text = self.clean(text)
        text = self.normalize(text)
        text = self.deduplicate(text)
        
        return text.strip()

    def process_pages(self, pages: list[dict]) -> list[dict]:
        """Clean each page's text while preserving page numbers.
        
        Args:
            pages: List of dicts with 'text' and 'page' keys
            
        Returns:
            List of cleaned pages
        """
        result = []
        
        for page in pages:
            text = page.get("text", "")
            page_num = page.get("page", 1)
            
            cleaned_text = self.process(text)
            
            if cleaned_text:
                result.append({
                    "text": cleaned_text,
                    "page": page_num,
                })
        
        return result


class MediaCleaner:
    """Cleaner specialized for different media modalities.
    
    Modalities:
    - document: PDF, TXT, DOCX
    - image: OCR output
    - audio: Transcription
    - video: Transcription
    """

    def __init__(self):
        self.text_cleaner = TextCleaner()

    def clean_document(self, text: str) -> str:
        """Clean document text (PDF, TXT, DOCX).
        
        Standard cleaning with text-specific fixes.
        """
        return self.text_cleaner.process(text)

    def clean_ocr(self, text: str) -> str:
        """Clean OCR output - handles common OCR errors.
        
        Additional cleaning for:
        - Common OCR misreads (rn → m, vv → w, etc.)
        - Line break artifacts
        - Extra spaces around punctuation
        """
        if not text:
            return ""
        
        result = text
        
        result = re.sub(r'\brn\b', 'm', result)
        result = re.sub(r'\bvv\b', 'w', result)
        result = re.sub(r'\bII\b', 'II', result)
        
        result = re.sub(r'(?<=[a-zA-Z])\s+([.,!?;:])', r'\1', result)
        result = re.sub(r'([(])\s+', r'\1', result)
        result = re.sub(r'\s+([)])', r'\1', result)
        
        result = re.sub(r'(\w)-\s+(\w)', r'\1\2', result)
        
        result = re.sub(r'(?<=[a-z])\n(?=[a-z])', ' ', result)
        
        result = re.sub(r'\s{2,}', ' ', result)
        
        return self.text_cleaner.process(result)

    def clean_transcription(self, text: str) -> str:
        """Clean transcription output (audio/video).
        
        Additional cleaning for:
        - Timestamps (if present)
        - Speaker labels
        - Fragmented sentences from ASR
        - Repeated words (common in auto-transcription)
        """
        if not text:
            return ""
        
        result = text
        
        result = re.sub(r'\d{1,2}:\d{2}(?::\d{2})?\s*', '', result)
        
        result = re.sub(r'\[.*?\]', '', result)
        
        result = re.sub(r'(?i)^(speaker \d|spk \d|person \d|user \d):\s*', '', result, flags=re.MULTILINE)
        
        result = re.sub(r'\b(\w+)\s+\1\b', r'\1', result)
        
        result = re.sub(r'\s+([.,!?])', r'\1', result)
        result = re.sub(r'([(])\s+', r'\1', result)
        result = re.sub(r'\s+([)])', r'\1', result)
        
        result = re.sub(r'\n{2,}', '\n\n', result)
        
        return self.text_cleaner.process(result)

    def clean(self, text: str, media_type: str) -> str:
        """Clean text based on media type.
        
        Args:
            text: Raw input text
            media_type: One of 'document', 'image', 'audio', 'video'
            
        Returns:
            Cleaned text
        """
        cleaners = {
            "document": self.clean_document,
            "image": self.clean_ocr,
            "audio": self.clean_transcription,
            "video": self.clean_transcription,
        }
        
        cleaner = cleaners.get(media_type, self.clean_document)
        return cleaner(text)

    def clean_pages(self, pages: list[dict], media_type: str = "document") -> list[dict]:
        """Clean pages based on media type.
        
        Args:
            pages: List of dicts with 'text' and 'page' keys
            media_type: Media type for cleaning strategy
            
        Returns:
            List of cleaned pages
        """
        result = []
        
        for page in pages:
            text = page.get("text", "")
            page_num = page.get("page", 1)
            
            cleaned_text = self.clean(text, media_type)
            
            if cleaned_text:
                result.append({
                    "text": cleaned_text,
                    "page": page_num,
                })
        
        return result


def clean_text(text: str) -> str:
    """Convenience function for quick text cleaning."""
    return TextCleaner().process(text)


def clean_media(text: str, media_type: str) -> str:
    """Convenience function for cleaning media-specific text.
    
    Args:
        text: Raw input text
        media_type: One of 'document', 'image', 'audio', 'video'
        
    Returns:
        Cleaned text
    """
    return MediaCleaner().clean(text, media_type)