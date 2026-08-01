import re
from typing import List, Dict, Any, Tuple, Optional


class LayoutMatcher:
    """
    Matches LLM-extracted questions against page layout blocks to resolve exact 
    page numbers and bounding box locations for interactive PDF features.
    """

    @staticmethod
    def match_question_location(
        question_text: str,
        choice_texts: List[str],
        pages: List[Dict[str, Any]]
    ) -> Tuple[Optional[int], Dict[str, Any]]:
        """
        Searches pages and layout blocks for matching question text.
        Returns (page_number, location_json).
        """
        cleaned_q = LayoutMatcher._normalize_str(question_text)
        if not cleaned_q:
            return None, {}

        # First 50 chars as match prefix
        search_prefix = cleaned_q[:50]

        best_page_num: Optional[int] = None
        matched_blocks: List[Dict[str, Any]] = []
        page_dim: Dict[str, float] = {"width": 0.0, "height": 0.0}
        source: str = "pymupdf"

        # Search across pages
        for page in pages:
            page_blocks = page.get("blocks", [])
            for block in page_blocks:
                block_norm = LayoutMatcher._normalize_str(block.get("text", ""))
                if search_prefix in block_norm or block_norm in search_prefix or LayoutMatcher._token_overlap(search_prefix, block_norm) > 0.6:
                    best_page_num = page.get("page_number")
                    page_dim = page.get("page_dimensions", {"width": 0.0, "height": 0.0})
                    source = page.get("source", "pymupdf")
                    matched_blocks.append(block)

            if best_page_num is not None:
                # Found on this page, look for additional choice blocks on the same page
                if choice_texts:
                    for choice_txt in choice_texts:
                        cleaned_c = LayoutMatcher._normalize_str(choice_txt)[:30]
                        if not cleaned_c:
                            continue
                        for block in page_blocks:
                            if block in matched_blocks:
                                continue
                            b_norm = LayoutMatcher._normalize_str(block.get("text", ""))
                            if cleaned_c in b_norm:
                                matched_blocks.append(block)
                break

        if not matched_blocks or best_page_num is None:
            return None, {}

        # Compute bounding region across matched blocks
        min_x = min(b["bbox"][0] for b in matched_blocks)
        min_y = min(b["bbox"][1] for b in matched_blocks)
        max_x = max(b["bbox"][2] for b in matched_blocks)
        max_y = max(b["bbox"][3] for b in matched_blocks)

        location_json = {
            "version": 1,
            "source": source,
            "page_dimensions": page_dim,
            "regions": [
                {
                    "type": "question_text",
                    "bbox": {
                        "x": round(float(min_x), 2),
                        "y": round(float(min_y), 2),
                        "width": round(float(max_x - min_x), 2),
                        "height": round(float(max_y - min_y), 2)
                    }
                }
            ]
        }

        return best_page_num, location_json

    @staticmethod
    def _normalize_str(s: str) -> str:
        s = re.sub(r'\s+', ' ', s)
        return re.sub(r'[^a-zA-Z0-9 ]', '', s).strip().lower()

    @staticmethod
    def _token_overlap(str1: str, str2: str) -> float:
        tokens1 = set(str1.split())
        tokens2 = set(str2.split())
        if not tokens1 or not tokens2:
            return 0.0
        overlap = tokens1.intersection(tokens2)
        return len(overlap) / min(len(tokens1), len(tokens2))
