import fitz  # PyMuPDF
from typing import List, Dict, Any
from app.ai.ocr.ocr_engine import OCREngine


class PDFParser:
    """Extracts page text from PDF files using PyMuPDF (fitz) with OCR fallback for scanned pages."""

    @staticmethod
    def parse_pdf_bytes(pdf_bytes: bytes) -> List[Dict[str, Any]]:
        """Parses PDF bytes and returns list of page dicts: [{'page_number': 1, 'text': '...'}]"""
        pages_content = []
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        for page_index in range(len(doc)):
            page = doc[page_index]
            text = page.get_text("text").strip()

            # Perform OCR if page contains no selectable text (scanned page)
            if not text or len(text) < 20:
                pix = page.get_pixmap()
                img_bytes = pix.tobytes("png")
                ocr_text = OCREngine.extract_text_from_image_bytes(img_bytes)
                if ocr_text:
                    text = ocr_text

            pages_content.append({
                "page_number": page_index + 1,
                "text": text
            })

        doc.close()
        return pages_content
