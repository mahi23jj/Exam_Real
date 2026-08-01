import uuid
from typing import Optional, List, Tuple
from sqlmodel import select, col, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.social import (
    KnowledgePin,
    Reaction,
    SavedItem,
    LearningQuestion,
    QuestionReply,
    Follow,
    UserActivity,
    PinType,
    Visibility,
    TargetType,
    ReactionType,
    ActivityType,
)

from app.repositories.base import BaseRepository


class KnowledgePinRepository(BaseRepository[KnowledgePin]):
    def __init__(self, session: AsyncSession):
        super().__init__(KnowledgePin, session)

    async def get_by_id_with_author(self, pin_id: uuid.UUID) -> Optional[KnowledgePin]:
        statement = (
            select(KnowledgePin)
            .options(selectinload(KnowledgePin.author))
            .where(and_(KnowledgePin.id == pin_id, KnowledgePin.is_active == True))
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def list_pins(
        self,
        document_id: Optional[uuid.UUID] = None,
        page_number: Optional[int] = None,
        pin_type: Optional[PinType] = None,
        visibility: Optional[Visibility] = None,
        author_id: Optional[uuid.UUID] = None,
        viewer_id: Optional[uuid.UUID] = None,
        followed_user_ids: Optional[List[uuid.UUID]] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Tuple[List[KnowledgePin], int]:
        """Lists pins enforcing visibility rules and flexible filtering."""
        statement = select(KnowledgePin).options(selectinload(KnowledgePin.author)).where(KnowledgePin.is_active == True)

        if document_id:
            statement = statement.where(KnowledgePin.document_id == document_id)
        if page_number is not None:
            statement = statement.where(KnowledgePin.page_number == page_number)
        if pin_type:
            statement = statement.where(KnowledgePin.pin_type == pin_type)
        if author_id:
            statement = statement.where(KnowledgePin.author_id == author_id)

        # Apply visibility authorization filters
        if viewer_id:
            followed = followed_user_ids or []
            visibility_conditions = [
                KnowledgePin.visibility == Visibility.PUBLIC,
                KnowledgePin.author_id == viewer_id,
            ]
            if followed:
                visibility_conditions.append(
                    and_(
                        KnowledgePin.visibility == Visibility.FOLLOWERS_ONLY,
                        KnowledgePin.author_id.in_(followed)
                    )
                )
            statement = statement.where(or_(*visibility_conditions))
        elif visibility:
            statement = statement.where(KnowledgePin.visibility == visibility)
        else:
            statement = statement.where(KnowledgePin.visibility == Visibility.PUBLIC)

        # Search term filter
        if search:
            search_pattern = f"%{search}%"
            statement = statement.where(
                or_(
                    KnowledgePin.title.ilike(search_pattern),
                    KnowledgePin.content.ilike(search_pattern),
                    KnowledgePin.selected_text_snapshot.ilike(search_pattern)
                )
            )

        # Total count query
        count_statement = select(func.count()).select_from(statement.subquery())
        total_result = await self.session.execute(count_statement)
        total = total_result.scalar_one() or 0

        # Sorting logic
        order_column = getattr(KnowledgePin, sort_by, KnowledgePin.created_at)
        if sort_order.lower() == "desc":
            statement = statement.order_by(order_column.desc())
        else:
            statement = statement.order_by(order_column.asc())

        # Pagination
        statement = statement.offset(skip).limit(limit)
        result = await self.session.execute(statement)
        items = list(result.scalars().all())

        return items, total


class ReactionRepository(BaseRepository[Reaction]):
    def __init__(self, session: AsyncSession):
        super().__init__(Reaction, session)

    async def get_user_reaction(
        self,
        user_id: uuid.UUID,
        target_type: TargetType,
        target_id: uuid.UUID,
        reaction_type: ReactionType = ReactionType.LIKE
    ) -> Optional[Reaction]:
        statement = select(Reaction).where(
            and_(
                Reaction.user_id == user_id,
                Reaction.target_type == target_type,
                Reaction.target_id == target_id,
                Reaction.reaction_type == reaction_type
            )
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def get_user_reactions_for_targets(
        self,
        user_id: uuid.UUID,
        target_type: TargetType,
        target_ids: List[uuid.UUID]
    ) -> List[Reaction]:
        if not target_ids:
            return []
        statement = select(Reaction).where(
            and_(
                Reaction.user_id == user_id,
                Reaction.target_type == target_type,
                Reaction.target_id.in_(target_ids)
            )
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())


class SavedItemRepository(BaseRepository[SavedItem]):
    def __init__(self, session: AsyncSession):
        super().__init__(SavedItem, session)

    async def get_user_saved_item(
        self,
        user_id: uuid.UUID,
        target_type: TargetType,
        target_id: uuid.UUID
    ) -> Optional[SavedItem]:
        statement = select(SavedItem).where(
            and_(
                SavedItem.user_id == user_id,
                SavedItem.target_type == target_type,
                SavedItem.target_id == target_id
            )
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def get_user_saves_for_targets(
        self,
        user_id: uuid.UUID,
        target_type: TargetType,
        target_ids: List[uuid.UUID]
    ) -> List[SavedItem]:
        if not target_ids:
            return []
        statement = select(SavedItem).where(
            and_(
                SavedItem.user_id == user_id,
                SavedItem.target_type == target_type,
                SavedItem.target_id.in_(target_ids)
            )
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())


class LearningQuestionRepository(BaseRepository[LearningQuestion]):
    def __init__(self, session: AsyncSession):
        super().__init__(LearningQuestion, session)

    async def get_by_id_with_author(self, question_id: uuid.UUID) -> Optional[LearningQuestion]:
        statement = (
            select(LearningQuestion)
            .options(selectinload(LearningQuestion.author))
            .where(and_(LearningQuestion.id == question_id, LearningQuestion.is_active == True))
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def list_questions(
        self,
        document_id: Optional[uuid.UUID] = None,
        page_number: Optional[int] = None,
        status: Optional[str] = None,
        visibility: Optional[Visibility] = None,
        author_id: Optional[uuid.UUID] = None,
        viewer_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Tuple[List[LearningQuestion], int]:
        statement = (
            select(LearningQuestion)
            .options(selectinload(LearningQuestion.author))
            .where(LearningQuestion.is_active == True)
        )

        if document_id:
            statement = statement.where(LearningQuestion.document_id == document_id)
        if page_number is not None:
            statement = statement.where(LearningQuestion.page_number == page_number)
        if status:
            statement = statement.where(LearningQuestion.status == status)
        if author_id:
            statement = statement.where(LearningQuestion.author_id == author_id)

        # Visibility rules
        if viewer_id:
            statement = statement.where(
                or_(
                    LearningQuestion.visibility == Visibility.PUBLIC,
                    LearningQuestion.author_id == viewer_id
                )
            )
        elif visibility:
            statement = statement.where(LearningQuestion.visibility == visibility)
        else:
            statement = statement.where(LearningQuestion.visibility == Visibility.PUBLIC)

        # Search filter
        if search:
            pattern = f"%{search}%"
            statement = statement.where(
                or_(
                    LearningQuestion.title.ilike(pattern),
                    LearningQuestion.content.ilike(pattern),
                    LearningQuestion.selected_text_snapshot.ilike(pattern)
                )
            )

        # Total count
        count_statement = select(func.count()).select_from(statement.subquery())
        total_res = await self.session.execute(count_statement)
        total = total_res.scalar_one() or 0

        # Sorting
        order_col = getattr(LearningQuestion, sort_by, LearningQuestion.created_at)
        if sort_order.lower() == "desc":
            statement = statement.order_by(order_col.desc())
        else:
            statement = statement.order_by(order_col.asc())

        statement = statement.offset(skip).limit(limit)
        result = await self.session.execute(statement)
        return list(result.scalars().all()), total


class QuestionReplyRepository(BaseRepository[QuestionReply]):
    def __init__(self, session: AsyncSession):
        super().__init__(QuestionReply, session)

    async def get_by_id_with_author(self, reply_id: uuid.UUID) -> Optional[QuestionReply]:
        statement = (
            select(QuestionReply)
            .options(selectinload(QuestionReply.author))
            .where(and_(QuestionReply.id == reply_id, QuestionReply.is_active == True))
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def get_all_replies_for_question(self, question_id: uuid.UUID) -> List[QuestionReply]:
        statement = (
            select(QuestionReply)
            .options(selectinload(QuestionReply.author))
            .where(and_(QuestionReply.question_id == question_id, QuestionReply.is_active == True))
            .order_by(QuestionReply.created_at.asc())
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def clear_accepted_answers(self, question_id: uuid.UUID) -> None:
        statement = (
            select(QuestionReply)
            .where(
                and_(
                    QuestionReply.question_id == question_id,
                    QuestionReply.is_accepted_answer == True,
                    QuestionReply.is_active == True
                )
            )
        )
        result = await self.session.execute(statement)
        for reply in result.scalars().all():
            reply.is_accepted_answer = False
            self.session.add(reply)
        await self.session.flush()


class FollowRepository(BaseRepository[Follow]):
    def __init__(self, session: AsyncSession):
        super().__init__(Follow, session)

    async def get_follow(
        self,
        follower_id: uuid.UUID,
        target_type: TargetType,
        target_id: uuid.UUID
    ) -> Optional[Follow]:
        statement = select(Follow).where(
            and_(
                Follow.follower_id == follower_id,
                Follow.target_type == target_type,
                Follow.target_id == target_id
            )
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def get_follower_user_ids(self, target_type: TargetType, target_id: uuid.UUID) -> List[uuid.UUID]:
        statement = select(Follow.follower_id).where(
            and_(
                Follow.target_type == target_type,
                Follow.target_id == target_id
            )
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def get_following_target_ids(self, follower_id: uuid.UUID, target_type: TargetType) -> List[uuid.UUID]:
        statement = select(Follow.target_id).where(
            and_(
                Follow.follower_id == follower_id,
                Follow.target_type == target_type
            )
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def count_followers(self, target_type: TargetType, target_id: uuid.UUID) -> int:
        statement = select(func.count(Follow.id)).where(
            and_(
                Follow.target_type == target_type,
                Follow.target_id == target_id
            )
        )
        result = await self.session.execute(statement)
        return result.scalar_one() or 0

    async def count_following(self, follower_id: uuid.UUID, target_type: Optional[TargetType] = None) -> int:
        statement = select(func.count(Follow.id)).where(Follow.follower_id == follower_id)
        if target_type:
            statement = statement.where(Follow.target_type == target_type)
        result = await self.session.execute(statement)
        return result.scalar_one() or 0


class UserActivityRepository(BaseRepository[UserActivity]):
    def __init__(self, session: AsyncSession):
        super().__init__(UserActivity, session)

    async def get_recent_activities(
        self,
        user_ids: List[uuid.UUID],
        limit: int = 50,
        skip: int = 0
    ) -> List[UserActivity]:
        if not user_ids:
            return []
            
        statement = (
            select(UserActivity)
            .options(selectinload(UserActivity.user))
            .where(UserActivity.user_id.in_(user_ids))
            .order_by(col(UserActivity.created_at).desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())


