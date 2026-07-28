import io
from PIL import Image
import pytesseract


class OCREngine:
    """Wrapper around pytesseract OCR for image text extraction."""

    @staticmethod
    def extract_text_from_image_bytes(image_bytes: bytes) -> str:
        try:
            image = Image.open(io.BytesIO(image_bytes))
            text = pytesseract.image_to_string(image)
            return text.strip()
        except Exception as e:
            return ""
