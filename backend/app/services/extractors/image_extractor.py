"""Image text extraction using EasyOCR."""

import io
from typing import Optional

import easyocr
from PIL import Image


class ImageExtractorError(Exception):
    """Custom exception for image extraction errors."""
    pass


class ImageExtractor:
    """Extract text from images using EasyOCR."""

    _reader: Optional[easyocr.Reader] = None

    @classmethod
    def get_reader(cls) -> easyocr.Reader:
        """Get or create EasyOCR reader instance."""
        if cls._reader is None:
            cls._reader = easyocr.Reader(
                ["en"],
                gpu=False,
                verbose=False,
            )
        return cls._reader

    @classmethod
    def extract_text(cls, image_content: bytes) -> str:
        """Extract text from image bytes.
        
        Args:
            image_content: Raw image bytes (PNG, JPG, JPEG, WEBP, etc.)
            
        Returns:
            Extracted text as string
        """
        try:
            reader = cls.get_reader()
            
            image = Image.open(io.BytesIO(image_content))
            
            if image.mode != "RGB":
                image = image.convert("RGB")
            
            image_bytes = io.BytesIO()
            image.save(image_bytes, format="PNG")
            image_bytes.seek(0)
            
            results = reader.readtext(image_bytes.read())
            
            if not results:
                return ""
            
            extracted_texts = []
            for bbox, text, confidence in results:
                if confidence > 0.3:
                    extracted_texts.append(text.strip())
            
            return " ".join(extracted_texts)
            
        except Exception as e:
            raise ImageExtractorError(f"Failed to extract text from image: {str(e)}")

    @classmethod
    def extract_text_with_boxes(cls, image_content: bytes) -> list[dict]:
        """Extract text with bounding box information.
        
        Returns:
            List of dicts with text, bbox, and confidence
        """
        try:
            reader = cls.get_reader()
            
            image = Image.open(io.BytesIO(image_content))
            
            if image.mode != "RGB":
                image = image.convert("RGB")
            
            image_bytes = io.BytesIO()
            image.save(image_bytes, format="PNG")
            image_bytes.seek(0)
            
            results = reader.readtext(image_bytes.read())
            
            return [
                {
                    "text": text.strip(),
                    "bbox": bbox,
                    "confidence": confidence,
                }
                for bbox, text, confidence in results
                if confidence > 0.3
            ]
            
        except Exception as e:
            raise ImageExtractorError(f"Failed to extract text with boxes: {str(e)}")


def extract_text_from_image(image_content: bytes) -> str:
    """Convenience function to extract text from image."""
    return ImageExtractor.extract_text(image_content)


def extract_text_with_boxes(image_content: bytes) -> list[dict]:
    """Convenience function to extract text with bounding boxes."""
    return ImageExtractor.extract_text_with_boxes(image_content)
