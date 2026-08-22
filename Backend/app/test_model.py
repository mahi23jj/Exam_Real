import asyncio
from groq import AsyncGroq
from app.core.config import settings


async def main():
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    models = await client.models.list()

    for model in models.data:
        print(model.id)


asyncio.run(main())