from typing import List, Dict, Any


class SemanticChunker:
    """Splits raw page/slide text into semantic ContentBlocks with order and page numbers."""

    def __init__(self, target_chunk_size: int = 500, overlap: int = 50):
        self.target_chunk_size = target_chunk_size
        self.overlap = overlap

    def chunk_document_pages(self, pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Takes list of [{'page_number': int, 'text': str}] and outputs list of ContentBlock dicts."""
        chunks = []
        global_block_order = 1

        for page in pages:
            page_num = page["page_number"]
            raw_text = page["text"].strip()
            if not raw_text:
                continue

            # Split paragraphs
            paragraphs = [p.strip() for p in raw_text.split("\n\n") if p.strip()]
            
            current_chunk = ""
            for paragraph in paragraphs:
                if len(current_chunk) + len(paragraph) <= self.target_chunk_size:
                    current_chunk += ("\n\n" if current_chunk else "") + paragraph
                else:
                    if current_chunk:
                        chunks.append({
                            "page_number": page_num,
                            "block_order": global_block_order,
                            "content": current_chunk,
                            "metadata_json": {"char_length": len(current_chunk)}
                        })
                        global_block_order += 1
                    
                    overlap_text = ""
                    if self.overlap > 0 and current_chunk:
                        overlap_text = current_chunk[-self.overlap:]
                        space_idx = overlap_text.find(" ")
                        if space_idx != -1 and space_idx < len(overlap_text) - 1:
                            overlap_text = overlap_text[space_idx+1:].strip()
                        else:
                            overlap_text = overlap_text.strip()
                            
                    current_chunk = overlap_text + ("\n\n" if overlap_text else "") + paragraph

            if current_chunk:
                chunks.append({
                    "page_number": page_num,
                    "block_order": global_block_order,
                    "content": current_chunk,
                    "metadata_json": {"char_length": len(current_chunk)}
                })
                global_block_order += 1

        return chunks
