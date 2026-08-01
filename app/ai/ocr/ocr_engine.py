import io
from PIL import Image
import pytesseract


from typing import Dict, Any, List
import pytesseract
from pytesseract import Output


class OCREngine:
    """Wrapper around pytesseract OCR for image text extraction and layout data."""

    @staticmethod
    def extract_text_from_image_bytes(image_bytes: bytes) -> str:
        try:
            image = Image.open(io.BytesIO(image_bytes))
            text = pytesseract.image_to_string(image)
            return text.strip()
        except Exception:
            return ""

    @staticmethod
    def extract_with_layout(image_bytes: bytes) -> Dict[str, Any]:
        """Extracts text and word/block layout data from image bytes."""
        try:
            image = Image.open(io.BytesIO(image_bytes))
            width, height = image.size
            data = pytesseract.image_to_data(image, output_type=Output.DICT)
            
            # Group words by block_num
            blocks_map = {}
            full_text_list = []
            
            n_boxes = len(data['text'])
            for i in range(n_boxes):
                text_word = data['text'][i].strip()
                if not text_word:
                    continue
                full_text_list.append(text_word)
                b_num = data['block_num'][i]
                x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
                
                if b_num not in blocks_map:
                    blocks_map[b_num] = {
                        "text_parts": [text_word],
                        "bbox": [x, y, x + w, y + h]
                    }
                else:
                    blocks_map[b_num]["text_parts"].append(text_word)
                    b = blocks_map[b_num]["bbox"]
                    blocks_map[b_num]["bbox"] = [
                        min(b[0], x),
                        min(b[1], y),
                        max(b[2], x + w),
                        max(b[3], y + h)
                    ]

            blocks = []
            for b_info in blocks_map.values():
                blocks.append({
                    "text": " ".join(b_info["text_parts"]),
                    "bbox": b_info["bbox"]
                })

            return {
                "text": " ".join(full_text_list),
                "width": width,
                "height": height,
                "blocks": blocks,
                "source": "tesseract_ocr"
            }
        except Exception:
            return {
                "text": "",
                "width": 0,
                "height": 0,
                "blocks": [],
                "source": "tesseract_ocr"
            }
