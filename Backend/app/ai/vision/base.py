"""Base abstract provider for vision/image understanding models."""
from abc import ABC, abstractmethod


class BaseVisionProvider(ABC):
    """Abstract base for vision models that describe images."""

    @abstractmethod
    async def describe_image(self, image_bytes: bytes) -> str:
        """Given raw image bytes, returns a text description of the image content."""
        pass
