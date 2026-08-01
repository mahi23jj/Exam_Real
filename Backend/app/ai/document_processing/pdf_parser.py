import fitz  # PyMuPDF
from typing import List, Dict, Any
from app.ai.ocr.ocr_engine import OCREngine


import fitz  # PyMuPDF
from typing import List, Dict, Any
from app.ai.ocr.ocr_engine import OCREngine


class PDFParser:
    """Extracts page text and spatial layout blocks from PDF files using PyMuPDF (fitz) with OCR fallback."""

    @staticmethod
    def parse_pdf_bytes(pdf_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Parses PDF bytes and returns list of page dicts:
        [{
            'page_number': 1,
            'text': '...',
            'page_dimensions': {'width': 595.0, 'height': 842.0},
            'blocks': [{'bbox': [x0, y0, x1, y1], 'text': '...'}],
            'source': 'pymupdf'
        }]
        """
        pages_content = []
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        for page_index in range(len(doc)):
            page = doc[page_index]
            page_rect = page.rect
            page_dim = {"width": float(page_rect.width), "height": float(page_rect.height)}
            
            page_dict = page.get_text("dict")
            text = page.get_text("text").strip()
            
            blocks = []
            for b in page_dict.get("blocks", []):
                if b.get("type") == 0:  # Text block
                    bbox = [float(c) for c in b.get("bbox", [])]
                    lines_text = []
                    for line in b.get("lines", []):
                        span_texts = [span.get("text", "") for span in line.get("spans", [])]
                        lines_text.append("".join(span_texts))
                    block_text = "\n".join(lines_text).strip()
                    if block_text:
                        blocks.append({
                            "bbox": bbox,
                            "text": block_text
                        })

            source = "pymupdf"

            # Perform OCR if page contains no selectable text (scanned page)
            if not text or len(text) < 20:
                pix = page.get_pixmap()
                img_bytes = pix.tobytes("png")
                ocr_result = OCREngine.extract_with_layout(img_bytes)
                if ocr_result and ocr_result.get("text"):
                    text = ocr_result["text"]
                    blocks = ocr_result["blocks"]
                    page_dim = {"width": float(ocr_result["width"]), "height": float(ocr_result["height"])}
                    source = "tesseract_ocr"

            pages_content.append({
                "page_number": page_index + 1,
                "text": text,
                "page_dimensions": page_dim,
                "blocks": blocks,
                "source": source
            })

        doc.close()
        return pages_content
