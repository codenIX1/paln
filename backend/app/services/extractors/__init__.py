"""Multimodal extraction services.

This module provides extractors for different media types:
- Image: OCR using EasyOCR
- Audio: Transcription using Whisper
- Video: Audio extraction + Whisper transcription
"""

from app.services.extractors.audio_extractor import (
    AudioExtractor,
    AudioExtractorError,
    transcribe_audio,
    transcribe_audio_with_segments,
)
from app.services.extractors.image_extractor import (
    ImageExtractor,
    ImageExtractorError,
    extract_text_from_image,
    extract_text_with_boxes,
)
from app.services.extractors.video_extractor import (
    VideoExtractor,
    VideoExtractorError,
    extract_video_frames,
    transcribe_video,
    transcribe_video_with_segments,
)

__all__ = [
    # Image
    "ImageExtractor",
    "ImageExtractorError",
    "extract_text_from_image",
    "extract_text_with_boxes",
    # Audio
    "AudioExtractor",
    "AudioExtractorError",
    "transcribe_audio",
    "transcribe_audio_with_segments",
    # Video
    "VideoExtractor",
    "VideoExtractorError",
    "transcribe_video",
    "transcribe_video_with_segments",
    "extract_video_frames",
]
