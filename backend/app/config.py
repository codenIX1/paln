"""Application configuration using Pydantic Settings."""

from pathlib import Path
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Ollama Configuration
    ollama_base_url: str = Field(
        default="http://localhost:11434",
        description="Base URL for Ollama API"
    )
    ollama_embed_model: str = Field(
        default="nomic-embed-text",
        description="Model to use for text embeddings"
    )
    ollama_chat_model: str = Field(
        default="llama3.2",
        description="Model to use for chat completions"
    )
    generation_system_prompt: str = Field(
        default="You are an assistant that summarizes documents using ONLY the provided context.\n\nStrict Rules:\n* Do NOT use any knowledge outside the context\n* Do NOT invent or assume missing information\n* If information is missing, state: 'Not specified in the context'\n* Be concise, precise, and structured\n* Avoid repetition and filler text\n\nTask:\nGenerate a structured summary of the content.\n\nOutput format:\n\n### Overview\n(2–3 sentences summarizing the main idea)\n\n### Key Points\n* Point 1\n* Point 2\n* Point 3\n  (4–6 bullet points total)\n\n### Important Details\n* Include critical facts, examples, or data if present\n* If none write: 'Not specified in the context'\n\n### Conclusion\n(1–2 sentences summarizing the takeaway)",
        description="System prompt for the generation model"
    )

    # Multimodal Embedding Models
    ollama_image_embed_model: str = Field(
        default="nomic-embed-text",
        description="Model to use for image embeddings"
    )
    ollama_audio_embed_model: str = Field(
        default="nomic-embed-text",
        description="Model to use for audio embeddings"
    )
    ollama_video_embed_model: str = Field(
        default="nomic-embed-text",
        description="Model to use for video embeddings"
    )

    # Whisper Model
    whisper_model: str = Field(
        default="tiny",
        description="Whisper model size for audio transcription"
    )

    # FFmpeg Path
    ffmpeg_path: str = Field(
        default="ffmpeg",
        description="Path to FFmpeg executable"
    )

    # Qdrant Vector Database
    qdrant_host: str = Field(
        default="localhost",
        description="Qdrant server host"
    )
    qdrant_port: int = Field(
        default=6333,
        description="Qdrant REST API port"
    )
    qdrant_grpc_port: int = Field(
        default=6334,
        description="Qdrant gRPC port"
    )

    # Storage
    upload_dir: Path = Field(
        default=Path("./uploads"),
        description="Directory to store uploaded files"
    )

    # API
    api_host: str = Field(
        default="0.0.0.0",
        description="Host to bind the API server"
    )
    api_port: int = Field(
        default=8000,
        description="Port to bind the API server"
    )

    # JWT
    jwt_secret: str = Field(
        default="change-me-in-production",
        description="JWT secret key"
    )
    jwt_algorithm: str = Field(
        default="HS256",
        description="JWT algorithm"
    )
    
    # Admin
    admin_email: str = Field(
        default="",
        description="Admin email for analytics access"
    )


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
