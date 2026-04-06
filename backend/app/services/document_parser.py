"""Document parser for PDF, TXT, DOCX, images, audio, and video files."""

import io
from pathlib import Path
from typing import Optional
from typing import Union

import fitz
from docx import Document

from app.services.extractors import (
    extract_text_from_image,
    transcribe_audio,
    transcribe_video,
)
from app.services.extractors.image_extractor import ImageExtractorError, extract_text_with_boxes
from app.services.extractors.audio_extractor import AudioExtractorError, transcribe_audio_with_segments
from app.services.extractors.video_extractor import VideoExtractorError, transcribe_video_with_segments, extract_video_frames


class DocumentParser:
    """Parse various document formats to extract text."""

    SUPPORTED_TYPES = {
        "pdf", "txt", "docx",
        "png", "jpg", "jpeg", "webp", "bmp", "gif",
        "mp3", "wav", "ogg", "m4a", "flac",
        "mp4", "webm", "avi", "mov",
    }

    IMAGE_TYPES = {"png", "jpg", "jpeg", "webp", "bmp", "gif"}
    AUDIO_TYPES = {"mp3", "wav", "ogg", "m4a", "flac"}
    VIDEO_TYPES = {"mp4", "webm", "avi", "mov"}

    @staticmethod
    def get_file_type(filename: str) -> str:
        """Extract file extension without dot."""
        return Path(filename).suffix.lower().lstrip(".")

    @staticmethod
    def get_media_type(filename: str) -> str:
        """Determine media type from filename."""
        file_type = Path(filename).suffix.lower().lstrip(".")
        
        if file_type in DocumentParser.IMAGE_TYPES:
            return "image"
        elif file_type in DocumentParser.AUDIO_TYPES:
            return "audio"
        elif file_type in DocumentParser.VIDEO_TYPES:
            return "video"
        else:
            return "document"

    @staticmethod
    def parse_pdf(file_content: bytes) -> list[dict]:
        """Parse PDF with structural metadata, tables, and image detection."""
        pages = []
        doc = fitz.open(stream=file_content, filetype="pdf")
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            blocks = page.get_text("dict")["blocks"]
            
            page_text = page.get_text().strip()
            has_images = any(b["type"] == 1 for b in blocks)
            
            tables = []
            try:
                table_findings = page.find_tables()
                if table_findings:
                    for table in table_findings:
                        table_data = table.extract()
                        if table_data:
                            tables.append({
                                "rows": len(table_data),
                                "cols": len(table_data[0]) if table_data else 0,
                                "data": table_data,
                            })
            except Exception:
                pass
            
            if page_text:
                pages.append({
                    "text": page_text,
                    "page": page_num + 1,
                    "modality": "text",
                    "has_images": has_images,
                    "confidence": 1.0,
                    "tables": tables,
                })
        
        doc.close()
        return pages

    @staticmethod
    def parse_txt(file_content: bytes) -> list[dict]:
        """Parse plain text file."""
        text = file_content.decode("utf-8", errors="replace")
        if text.strip():
            return [{"text": text.strip(), "page": 1, "modality": "text", "confidence": 1.0}]
        return []

    @staticmethod
    def parse_docx(file_content: bytes) -> list[dict]:
        """Parse DOCX file and extract text."""
        doc = Document(io.BytesIO(file_content))
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        
        if paragraphs:
            return [{"text": "\n\n".join(paragraphs), "page": 1, "modality": "text", "confidence": 1.0}]
        return []

    @staticmethod
    def parse_image(file_content: bytes) -> list[dict]:
        """Extract text from image using OCR with regions and confidence."""
        try:
            regions = extract_text_with_boxes(file_content)
            if not regions:
                return []
            
            full_text = " ".join(r["text"] for r in regions)
            avg_confidence = sum(r["confidence"] for r in regions) / len(regions) if regions else 0.0
            
            return [{
                "text": full_text,
                "page": 1,
                "modality": "image",
                "confidence": round(avg_confidence, 3),
                "regions": regions,
            }]
        except ImageExtractorError as e:
            raise ValueError(f"Image extraction failed: {str(e)}")

    @staticmethod
    def parse_audio(file_content: bytes, model_name: str = "tiny") -> list[dict]:
        """Transcribe audio file with segments and timestamps."""
        try:
            result = transcribe_audio_with_segments(file_content, model_name)
            text = result.get("text", "").strip()
            segments = result.get("segments", [])
            
            if not text:
                return []
            
            return [{
                "text": text,
                "page": 1,
                "modality": "audio",
                "confidence": 1.0,
                "segments": segments,
            }]
        except AudioExtractorError as e:
            raise ValueError(f"Audio transcription failed: {str(e)}")

    @staticmethod
    def parse_video(file_content: bytes, model_name: str = "tiny") -> list[dict]:
        """Transcribe video with segments + extract frame text."""
        try:
            result = transcribe_video_with_segments(file_content, model_name)
            text = result.get("text", "").strip()
            segments = result.get("segments", [])
            
            frames = extract_video_frames(file_content, max_frames=5)
            frame_texts = []
            for i, frame_bytes in enumerate(frames):
                try:
                    ft = extract_text_from_image(frame_bytes)
                    if ft.strip():
                        frame_texts.append({"frame_index": i, "text": ft.strip()})
                except Exception:
                    pass
            
            if not text and not frame_texts:
                return []
            
            combined_text = text or " ".join(ft["text"] for ft in frame_texts)
            
            return [{
                "text": combined_text,
                "page": 1,
                "modality": "video",
                "confidence": 1.0,
                "segments": segments,
                "frame_texts": frame_texts,
            }]
        except VideoExtractorError as e:
            raise ValueError(f"Video transcription failed: {str(e)}")

    @classmethod
    def parse(
        cls,
        file_content: bytes,
        filename: str,
        whisper_model: str = "tiny",
    ) -> list[dict]:
        """Parse document based on file type."""
        file_type = cls.get_file_type(filename)
        
        if file_type not in cls.SUPPORTED_TYPES:
            raise ValueError(
                f"Unsupported file type: {file_type}. "
                f"Supported: {', '.join(sorted(cls.SUPPORTED_TYPES))}"
            )
        
        if file_type in ("pdf", "txt", "docx"):
            if file_type == "pdf":
                return cls.parse_pdf(file_content)
            elif file_type == "txt":
                return cls.parse_txt(file_content)
            elif file_type == "docx":
                return cls.parse_docx(file_content)
        
        elif file_type in cls.IMAGE_TYPES:
            return cls.parse_image(file_content)
        
        elif file_type in cls.AUDIO_TYPES:
            return cls.parse_audio(file_content, whisper_model)
        
        elif file_type in cls.VIDEO_TYPES:
            return cls.parse_video(file_content, whisper_model)
        
        return []


def parse_document(
    file_content: bytes,
    filename: str,
    whisper_model: str = "tiny",
) -> list[dict]:
    """Convenience function to parse a document."""
    return DocumentParser.parse(file_content, filename, whisper_model)


def get_media_type(filename: str) -> str:
    """Convenience function to get media type."""
    return DocumentParser.get_media_type(filename)
