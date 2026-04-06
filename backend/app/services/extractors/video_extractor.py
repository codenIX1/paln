"""Video transcription using FFmpeg + Whisper."""

import subprocess
import tempfile
from pathlib import Path
from typing import Optional

from app.services.extractors.audio_extractor import AudioExtractor, AudioExtractorError
from app.config import get_settings


def get_ffmpeg_path() -> str:
    """Get FFmpeg path from settings."""
    return get_settings().ffmpeg_path


class VideoExtractorError(Exception):
    """Custom exception for video extraction errors."""
    pass


class VideoExtractor:
    """Extract and transcribe audio from video files."""

    @classmethod
    def extract_audio(cls, video_content: bytes) -> bytes:
        """Extract audio from video bytes using FFmpeg.
        
        Args:
            video_content: Raw video bytes (MP4, WEBM, etc.)
            
        Returns:
            Audio bytes (WAV format)
        """
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp_input:
                tmp_input.write(video_content)
                tmp_input_path = tmp_input.name

            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_output:
                tmp_output_path = tmp_output.name

            try:
                result = subprocess.run(
                    [
                        get_ffmpeg_path(),
                        "-i", tmp_input_path,
                        "-vn",
                        "-acodec", "pcm_s16le",
                        "-ac", "1",
                        "-ar", "16000",
                        "-t", "3600",
                        tmp_output_path,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=300,
                )

                if result.returncode != 0:
                    raise VideoExtractorError(f"FFmpeg failed: {result.stderr}")

                with open(tmp_output_path, "rb") as f:
                    return f.read()

            finally:
                Path(tmp_input_path).unlink(missing_ok=True)
                Path(tmp_output_path).unlink(missing_ok=True)

        except subprocess.TimeoutExpired:
            raise VideoExtractorError("Video audio extraction timed out")
        except FileNotFoundError:
            raise VideoExtractorError(
                f"FFmpeg not found. Please install FFmpeg: https://ffmpeg.org/download.html"
            )
        except Exception as e:
            raise VideoExtractorError(f"Failed to extract audio from video: {str(e)}")

    @classmethod
    def transcribe(cls, video_content: bytes, model_name: str = "tiny") -> str:
        """Transcribe video to text.
        
        Args:
            video_content: Raw video bytes
            model_name: Whisper model size
            
        Returns:
            Transcribed text
        """
        try:
            audio_content = cls.extract_audio(video_content)
            
            if not audio_content:
                raise VideoExtractorError("No audio found in video")
            
            return AudioExtractor.transcribe(audio_content, model_name)
            
        except AudioExtractorError:
            raise
        except Exception as e:
            raise VideoExtractorError(f"Failed to transcribe video: {str(e)}")

    @classmethod
    def transcribe_with_segments(cls, video_content: bytes, model_name: str = "tiny") -> dict:
        """Transcribe video with timestamp segments.
        
        Returns:
            Dict with text and segments
        """
        try:
            audio_content = cls.extract_audio(video_content)
            
            if not audio_content:
                raise VideoExtractorError("No audio found in video")
            
            return AudioExtractor.transcribe_with_segments(audio_content, model_name)
            
        except AudioExtractorError:
            raise
        except Exception as e:
            raise VideoExtractorError(f"Failed to transcribe video: {str(e)}")

    @classmethod
    def extract_frames(cls, video_content: bytes, max_frames: int = 10) -> list[bytes]:
        """Extract key frames from video for potential image OCR.
        
        Args:
            video_content: Raw video bytes
            max_frames: Maximum number of frames to extract
            
        Returns:
            List of frame bytes (JPEG)
        """
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp_input:
                tmp_input.write(video_content)
                tmp_input_path = tmp_input.name

            with tempfile.TemporaryDirectory() as tmp_dir:
                output_pattern = str(Path(tmp_dir) / "frame_%04d.jpg")

                result = subprocess.run(
                    [
                        get_ffmpeg_path(),
                        "-i", tmp_input_path,
                        "-vf", f"select='eq(pict_type,PICT_TYPE_I)',thumbnail={max_frames}",
                        "-vsync", "vfr",
                        "-frame_pts", "1",
                        "-q:v", "2",
                        output_pattern,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=300,
                )

                if result.returncode != 0:
                    return []

                frames = []
                frame_files = sorted(Path(tmp_dir).glob("frame_*.jpg"))
                
                for frame_file in frame_files[:max_frames]:
                    with open(frame_file, "rb") as f:
                        frames.append(f.read())
                
                return frames

        except Exception:
            return []
        finally:
            Path(tmp_input_path).unlink(missing_ok=True)


def transcribe_video(video_content: bytes, model_name: str = "tiny") -> str:
    """Convenience function to transcribe video."""
    return VideoExtractor.transcribe(video_content, model_name)


def transcribe_video_with_segments(video_content: bytes, model_name: str = "tiny") -> dict:
    """Convenience function to transcribe video with segments."""
    return VideoExtractor.transcribe_with_segments(video_content, model_name)


def extract_video_frames(video_content: bytes, max_frames: int = 10) -> list[bytes]:
    """Convenience function to extract key frames from video."""
    return VideoExtractor.extract_frames(video_content, max_frames)
