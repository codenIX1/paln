"""Audio transcription using Whisper."""

import io
import tempfile
from pathlib import Path
from typing import Optional

import whisper


class AudioExtractorError(Exception):
    """Custom exception for audio extraction errors."""
    pass


class AudioExtractor:
    """Transcribe audio files using OpenAI Whisper."""

    _model: Optional[whisper.Whisper] = None

    @classmethod
    def get_model(cls, model_name: str = "tiny") -> whisper.Whisper:
        """Get or create Whisper model instance.
        
        Args:
            model_name: Whisper model size (tiny, base, small, medium, large)
        """
        if cls._model is None or cls._model_name != model_name:
            cls._model = whisper.load_model(model_name)
            cls._model_name = model_name
        return cls._model

    @classmethod
    def transcribe(cls, audio_content: bytes, model_name: str = "tiny") -> str:
        """Transcribe audio bytes to text.
        
        Args:
            audio_content: Raw audio bytes (MP3, WAV, etc.)
            model_name: Whisper model size
            
        Returns:
            Transcribed text
        """
        try:
            model = cls.get_model(model_name)
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
                tmp_file.write(audio_content)
                tmp_path = tmp_file.name
            
            try:
                result = model.transcribe(tmp_path, language="en")
                return result.get("text", "").strip()
            finally:
                Path(tmp_path).unlink(missing_ok=True)
                
        except Exception as e:
            raise AudioExtractorError(f"Failed to transcribe audio: {str(e)}")

    @classmethod
    def transcribe_with_segments(cls, audio_content: bytes, model_name: str = "tiny") -> dict:
        """Transcribe audio with timestamp segments.
        
        Returns:
            Dict with text and segments (each with start, end, text)
        """
        try:
            model = cls.get_model(model_name)
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
                tmp_file.write(audio_content)
                tmp_path = tmp_file.name
            
            try:
                result = model.transcribe(tmp_path, language="en")
                return {
                    "text": result.get("text", "").strip(),
                    "segments": [
                        {
                            "start": seg.get("start"),
                            "end": seg.get("end"),
                            "text": seg.get("text", "").strip(),
                        }
                        for seg in result.get("segments", [])
                    ],
                }
            finally:
                Path(tmp_path).unlink(missing_ok=True)
                
        except Exception as e:
            raise AudioExtractorError(f"Failed to transcribe audio: {str(e)}")

    @classmethod
    def detect_language(cls, audio_content: bytes, model_name: str = "tiny") -> str:
        """Detect language of audio.
        
        Returns:
            Language code (e.g., "en", "es", "fr")
        """
        try:
            model = cls.get_model(model_name)
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
                tmp_file.write(audio_content)
                tmp_path = tmp_file.name
            
            try:
                audio = whisper.load_audio(tmp_path)
                audio = whisper.pad_or_trim(audio)
                
                mel = whisper.log_mel_spectrogram(audio, n_mels=model.dims.n_mels).to(model.device)
                
                _, probs = model.detect_language(mel)
                return max(probs, key=probs.get)
            finally:
                Path(tmp_path).unlink(missing_ok=True)
                
        except Exception as e:
            raise AudioExtractorError(f"Failed to detect language: {str(e)}")


def transcribe_audio(audio_content: bytes, model_name: str = "tiny") -> str:
    """Convenience function to transcribe audio."""
    return AudioExtractor.transcribe(audio_content, model_name)


def transcribe_audio_with_segments(audio_content: bytes, model_name: str = "tiny") -> dict:
    """Convenience function to transcribe audio with segments."""
    return AudioExtractor.transcribe_with_segments(audio_content, model_name)
