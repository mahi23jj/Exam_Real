"""Florence-2 Base local vision provider for image-heavy slide/page description."""
import logging
import io
from typing import Optional

from app.ai.vision.base import BaseVisionProvider

logger = logging.getLogger(__name__)

# Florence-2 is loaded once as a module-level singleton to avoid reloading on every request.
_florence_model = None
_florence_processor = None


def _load_florence():
    """Lazily loads Florence-2 model and processor on first use."""
    global _florence_model, _florence_processor
    if _florence_model is None:
        try:
            from transformers import AutoProcessor, AutoModelForCausalLM
            import torch
            logger.info("Loading Florence-2 Base model (first use)...")
            _florence_processor = AutoProcessor.from_pretrained(
                "microsoft/Florence-2-base",
                trust_remote_code=True
            )
            _florence_model = AutoModelForCausalLM.from_pretrained(
                "microsoft/Florence-2-base",
                trust_remote_code=True,
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32
            )
            logger.info("Florence-2 Base model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load Florence-2 model: {e}")
            raise RuntimeError(f"Florence-2 model could not be loaded: {e}") from e
    return _florence_model, _florence_processor


class FlorenceVisionProvider(BaseVisionProvider):
    """
    Uses Florence-2 Base locally to generate technical descriptions of
    image-heavy document pages or slides.

    This is intended for pages where OCR text yield is low, indicating
    they are primarily diagrams, charts, or figures.
    """

    # Pages where extracted text is below this character threshold are
    # considered image-heavy and are routed through this provider.
    IMAGE_HEAVY_TEXT_THRESHOLD: int = 80

    async def describe_image(self, image_bytes: bytes) -> str:
        """
        Generates a technical description of the image using Florence-2.
        Runs synchronously inside an executor to not block the event loop.
        """
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._run_inference, image_bytes)

    def _run_inference(self, image_bytes: bytes) -> str:
        """Blocking Florence-2 inference — runs in a thread pool."""
        try:
            from PIL import Image
            import torch

            model, processor = _load_florence()
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

            task_prompt = "<DETAILED_CAPTION>"
            inputs = processor(text=task_prompt, images=image, return_tensors="pt")

            device = next(model.parameters()).device
            inputs = {k: v.to(device) for k, v in inputs.items()}

            with torch.no_grad():
                generated_ids = model.generate(
                    input_ids=inputs["input_ids"],
                    pixel_values=inputs["pixel_values"],
                    max_new_tokens=512,
                    num_beams=3,
                )

            generated_text = processor.batch_decode(generated_ids, skip_special_tokens=False)[0]
            parsed = processor.post_process_generation(
                generated_text,
                task=task_prompt,
                image_size=(image.width, image.height)
            )
            return parsed.get("<DETAILED_CAPTION>", "").strip()

        except Exception as e:
            logger.warning(f"Florence-2 inference failed: {e}")
            return ""

    @classmethod
    def is_image_heavy(cls, extracted_text: str) -> bool:
        """Returns True if the extracted text is too short, indicating an image-heavy page."""
        return len(extracted_text.strip()) < cls.IMAGE_HEAVY_TEXT_THRESHOLD
