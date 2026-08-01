import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlmodel import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.study_history import RecentStudyItem, StudyItemType
from app.repositories.base import BaseRepository


class RecentStudyItemRepository(BaseRepository[RecentStudyItem]):
    def __init__(self, session: AsyncSession):
        super().__init__(RecentStudyItem, session)

    async def upsert_recent_item(
        self,
        user_id: uuid.UUID,
        item_type: StudyItemType,
        item_id: uuid.UUID,
        title: str,
        subtitle: Optional[str],
        continue_url: str,
        metadata_json: Optional[Dict[str, Any]] = None
    ) -> RecentStudyItem:
        statement = select(RecentStudyItem).where(
            and_(
                RecentStudyItem.user_id == user_id,
                RecentStudyItem.item_type == item_type,
                RecentStudyItem.item_id == item_id
            )
        )
        result = await self.session.execute(statement)
        item = result.scalar_one_or_none()

        if item:
            item.title = title
            item.subtitle = subtitle
            item.continue_url = continue_url
            item.last_opened_at = datetime.utcnow()
            if metadata_json:
                item.metadata_json = metadata_json
            self.session.add(item)
        else:
            item = RecentStudyItem(
                user_id=user_id,
                item_type=item_type,
                item_id=item_id,
                title=title,
                subtitle=subtitle,
                continue_url=continue_url,
                last_opened_at=datetime.utcnow(),
                metadata_json=metadata_json or {}
            )
            self.session.add(item)

        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def list_recent_items(self, user_id: uuid.UUID, limit: int = 10) -> List[RecentStudyItem]:
        statement = (
            select(RecentStudyItem)
            .where(RecentStudyItem.user_id == user_id)
            .order_by(RecentStudyItem.last_opened_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())
