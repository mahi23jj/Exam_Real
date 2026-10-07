import uuid
from datetime import datetime
from typing import Any, Optional, List, Tuple, Dict
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.db.models.document import Document
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
    QuestionStatus,
    ActivityType,
    LocationTargetType,
)
from app.repositories.social_repository import (
    KnowledgePinRepository,
    ReactionRepository,
    SavedItemRepository,
    LearningQuestionRepository,
    QuestionReplyRepository,
    FollowRepository,
    UserActivityRepository,
)
from app.repositories.user_repository import UserRepository
from app.repositories.community_repository import CommunityRepository
from app.repositories.document_repository import DocumentRepository
from app.schemas.social import (
    KnowledgePinCreate,
    KnowledgePinUpdate,
    KnowledgePinRead,
    KnowledgePinListResponse,
    ReactionToggleResponse,
    SavedItemToggleResponse,
    LearningQuestionCreate,
    LearningQuestionUpdate,
    LearningQuestionRead,
    LearningQuestionListResponse,
    QuestionReplyCreate,
    QuestionReplyUpdate,
    QuestionReplyRead,
    QuestionReplyTreeResponse,
    FollowToggleResponse,
    FollowUserResponse,
    FollowStateRead,
    FollowUserSummary,
    FollowUserListResponse,
    AuthorRelationshipRead,
    SharedCourseRead,
    ProfileCourseRead,
    RecommendedUserRead,
    RecommendedUserListResponse,
    CommunityStatsRead,
    CommunityProfileRead,
    UserSummary,
    UserActivityRead,
    FeedResponse,
    FeedItemRead,
    FeedPageResponse,
    FeedScope,
    FeedContentType,
    CommunityContextRequest,
    CommunityContextResponse,
)
from app.repositories.feed_repository import (
    FeedRepository,
    SOURCE_PIN,
    SOURCE_QUESTION,
)
from app.services.source_resolver import attach_sources, resolve_sources



async def _toggle_like(
    reaction_repo: ReactionRepository,
    user_id: uuid.UUID,
    target_type: TargetType,
    target_id: uuid.UUID,
) -> Tuple[bool, int]:
    """Flips a user's like and returns ``(is_reacted, authoritative_count)``.

    The write is decided by the unique constraint rather than a prior SELECT, so
    simultaneous taps cannot create duplicate likes. The count is then read back
    from the reaction rows, so the denormalised column can never drift.
    """
    if await reaction_repo.remove_reaction(user_id, target_type, target_id):
        is_reacted = False
    else:
        is_reacted = await reaction_repo.add_reaction_if_absent(user_id, target_type, target_id)

    count = await reaction_repo.count_reactions(target_type, target_id)
    return is_reacted, count


async def _toggle_save(
    save_repo: SavedItemRepository,
    user_id: uuid.UUID,
    target_type: TargetType,
    target_id: uuid.UUID,
) -> Tuple[bool, int]:
    """Flips a user's save and returns ``(is_saved, authoritative_count)``."""
    if await save_repo.remove_save(user_id, target_type, target_id):
        is_saved = False
    else:
        is_saved = await save_repo.add_save_if_absent(user_id, target_type, target_id)

    count = await save_repo.count_saves(target_type, target_id)
    return is_saved, count


async def _resolve_author_relationships(
    follow_repo: FollowRepository,
    author_ids: List[uuid.UUID],
    viewer_id: uuid.UUID
) -> Dict[uuid.UUID, AuthorRelationshipRead]:
    """Resolves viewer follow state for many content authors with a single query.

    Authors are eager-loaded by the repositories, so a page of 30 pins/questions
    costs one extra query instead of one per item (no N+1).
    """
    unique_ids = list({a for a in author_ids if a})
    if not unique_ids:
        return {}

    followed = await follow_repo.get_followed_target_ids_batch(
        follower_id=viewer_id,
        target_type=TargetType.USER,
        target_ids=unique_ids
    )
    return {
        author_id: AuthorRelationshipRead(
            is_following=author_id in followed,
            is_self=author_id == viewer_id,
        )
        for author_id in unique_ids
    }


def public_author_summary(user: Optional[User]) -> Optional[UserSummary]:
    """Author payload safe for other students (no email, never a placeholder)."""
    if user is None:
        return None
    return UserSummary(
        id=user.id,
        full_name=user.display_name(),
        picture=user.picture,
        department=user.department,
    )


class KnowledgePinService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.pin_repo = KnowledgePinRepository(session)
        self.doc_repo = DocumentRepository(session)
        self.reaction_repo = ReactionRepository(session)
        self.save_repo = SavedItemRepository(session)
        self.follow_repo = FollowRepository(session)

    async def _author_relationships(
        self,
        author_ids: List[uuid.UUID],
        viewer_id: uuid.UUID
    ) -> Dict[uuid.UUID, AuthorRelationshipRead]:
        return await _resolve_author_relationships(self.follow_repo, author_ids, viewer_id)

    async def create_pin(self, pin_in: KnowledgePinCreate, current_user: User) -> KnowledgePin:
        # Verify document exists
        doc = await self.doc_repo.get_by_id(pin_in.document_id)
        if not doc or not doc.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target document not found or inactive."
            )

        pin = KnowledgePin(
            author_id=current_user.id,
            document_id=pin_in.document_id,
            document_version=pin_in.document_version,
            page_number=pin_in.page_number,
            target_type=pin_in.target_type,
            target_id=pin_in.target_id,
            selection_start_offset=pin_in.selection_start_offset,
            selection_end_offset=pin_in.selection_end_offset,
            selected_text_snapshot=pin_in.selected_text_snapshot,
            location_metadata_json=pin_in.location_metadata_json,
            pin_type=pin_in.pin_type,
            visibility=pin_in.visibility,
            title=pin_in.title,
            content=pin_in.content,
        )
        return await self.pin_repo.create(pin)

    async def get_pin_by_id(self, pin_id: uuid.UUID, current_user: Optional[User] = None) -> KnowledgePinRead:
        pin = await self.pin_repo.get_by_id_with_author(pin_id)
        if not pin:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Knowledge pin not found."
            )

        # Enforce visibility checks
        if pin.visibility == Visibility.PRIVATE and (not current_user or pin.author_id != current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this private pin."
            )

        pin_dto = KnowledgePinRead.model_validate(pin)
        pin_dto.author = public_author_summary(pin.author)
        pin_dto.source = (await resolve_sources(self.session, [pin])).get(pin.id)
        if current_user:
            relationships = await self._author_relationships([pin.author_id], current_user.id)
            pin_dto.relationship = relationships.get(
                pin.author_id,
                AuthorRelationshipRead(is_following=False, is_self=False),
            )
            user_reaction = await self.reaction_repo.get_user_reaction(
                user_id=current_user.id,
                target_type=TargetType.PIN,
                target_id=pin.id,
                reaction_type=ReactionType.LIKE
            )
            user_save = await self.save_repo.get_user_saved_item(
                user_id=current_user.id,
                target_type=TargetType.PIN,
                target_id=pin.id
            )
            pin_dto.is_liked_by_me = user_reaction is not None
            pin_dto.is_saved_by_me = user_save is not None

        return pin_dto

    async def list_pins(
        self,
        document_id: Optional[uuid.UUID] = None,
        page_number: Optional[int] = None,
        pin_type: Optional[PinType] = None,
        visibility: Optional[Visibility] = None,
        author_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
        page: int = 1,
        size: int = 20,
        current_user: Optional[User] = None
    ) -> KnowledgePinListResponse:
        skip = (page - 1) * size
        viewer_id = current_user.id if current_user else None
        
        pins, total = await self.pin_repo.list_pins(
            document_id=document_id,
            page_number=page_number,
            pin_type=pin_type,
            visibility=visibility,
            author_id=author_id,
            viewer_id=viewer_id,
            search=search,
            skip=skip,
            limit=size
        )

        pin_dtos: List[KnowledgePinRead] = []
        if viewer_id and pins:
            pin_ids = [p.id for p in pins]
            relationships = await self._author_relationships(
                [p.author_id for p in pins], viewer_id
            )
            user_reactions = await self.reaction_repo.get_user_reactions_for_targets(
                user_id=viewer_id,
                target_type=TargetType.PIN,
                target_ids=pin_ids
            )
            liked_pin_ids = {r.target_id for r in user_reactions if r.reaction_type == ReactionType.LIKE}
            user_saves = await self.save_repo.get_user_saves_for_targets(
                user_id=viewer_id,
                target_type=TargetType.PIN,
                target_ids=pin_ids
            )
            saved_pin_ids = {s.target_id for s in user_saves}

            for p in pins:
                dto = KnowledgePinRead.model_validate(p)
                dto.author = public_author_summary(p.author)
                dto.relationship = relationships.get(
                    p.author_id,
                    AuthorRelationshipRead(is_following=False, is_self=False),
                )
                dto.is_liked_by_me = p.id in liked_pin_ids
                dto.is_saved_by_me = p.id in saved_pin_ids
                pin_dtos.append(dto)
        else:
            for p in pins:
                dto = KnowledgePinRead.model_validate(p)
                dto.author = public_author_summary(p.author)
                pin_dtos.append(dto)

        # One extra query resolves the whole page's deep links.
        await attach_sources(self.session, pins, pin_dtos)

        return KnowledgePinListResponse(
            items=pin_dtos,
            total=total,
            page=page,
            size=size
        )

    async def update_pin(
        self,
        pin_id: uuid.UUID,
        pin_update: KnowledgePinUpdate,
        current_user: User
    ) -> KnowledgePin:
        pin = await self.pin_repo.get_by_id(pin_id)
        if not pin or not pin.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Knowledge pin not found."
            )

        if pin.author_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the pin author can modify this pin."
            )

        update_data = pin_update.model_dump(exclude_unset=True)
        return await self.pin_repo.update(pin, update_data)

    async def delete_pin(self, pin_id: uuid.UUID, current_user: User) -> None:
        pin = await self.pin_repo.get_by_id(pin_id)
        if not pin or not pin.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Knowledge pin not found."
            )

        if pin.author_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the pin author can delete this pin."
            )

        await self.pin_repo.update(pin, {"is_active": False})
        # Reaction/save rows are polymorphic, so nothing cascades for us; drop
        # them explicitly or they linger against a deleted pin indefinitely.
        await self.reaction_repo.delete_for_target(TargetType.PIN, pin.id)
        await self.save_repo.delete_for_target(TargetType.PIN, pin.id)

    async def toggle_like(
        self,
        pin_id: uuid.UUID,
        current_user: User
    ) -> ReactionToggleResponse:
        pin = await self.pin_repo.get_by_id(pin_id)
        if not pin or not pin.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Knowledge pin not found."
            )

        is_reacted, new_count = await _toggle_like(
            self.reaction_repo,
            current_user.id,
            TargetType.PIN,
            pin_id,
        )
        await self.pin_repo.patch(pin, {"likes_count": new_count})
        return ReactionToggleResponse(
            is_reacted=is_reacted,
            reaction_type=ReactionType.LIKE,
            new_count=new_count,
        )

    async def toggle_save(
        self,
        pin_id: uuid.UUID,
        current_user: User
    ) -> SavedItemToggleResponse:
        pin = await self.pin_repo.get_by_id(pin_id)
        if not pin or not pin.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Knowledge pin not found."
            )

        is_saved, new_count = await _toggle_save(
            self.save_repo,
            current_user.id,
            TargetType.PIN,
            pin_id,
        )
        await self.pin_repo.patch(pin, {"saves_count": new_count})
        return SavedItemToggleResponse(is_saved=is_saved, new_count=new_count)


# =========================================================
# LEARNING QUESTION SERVICE & UNLIMITED NESTED REPLIES SERVICE
# =========================================================

class LearningQuestionService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.question_repo = LearningQuestionRepository(session)
        self.doc_repo = DocumentRepository(session)
        self.reaction_repo = ReactionRepository(session)
        self.save_repo = SavedItemRepository(session)
        self.follow_repo = FollowRepository(session)

    async def _author_relationships(
        self,
        author_ids: List[uuid.UUID],
        viewer_id: uuid.UUID
    ) -> Dict[uuid.UUID, AuthorRelationshipRead]:
        return await _resolve_author_relationships(self.follow_repo, author_ids, viewer_id)

    async def create_question(self, question_in: LearningQuestionCreate, current_user: User) -> LearningQuestion:
        doc = await self.doc_repo.get_by_id(question_in.document_id)
        if not doc or not doc.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target document not found or inactive."
            )

        question = LearningQuestion(
            author_id=current_user.id,
            document_id=question_in.document_id,
            document_version=question_in.document_version,
            page_number=question_in.page_number,
            target_type=question_in.target_type,
            target_id=question_in.target_id,
            selection_start_offset=question_in.selection_start_offset,
            selection_end_offset=question_in.selection_end_offset,
            selected_text_snapshot=question_in.selected_text_snapshot,
            location_metadata_json=question_in.location_metadata_json,
            title=question_in.title,
            content=question_in.content,
            visibility=question_in.visibility,
            status=QuestionStatus.OPEN
        )
        return await self.question_repo.create(question)

    async def get_question_by_id(self, question_id: uuid.UUID, current_user: Optional[User] = None) -> LearningQuestionRead:
        question = await self.question_repo.get_by_id_with_author(question_id)
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Learning question not found."
            )

        if question.visibility == Visibility.PRIVATE and (not current_user or question.author_id != current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this private question."
            )

        # Increment view count
        await self.question_repo.update(question, {"views_count": question.views_count + 1})

        dto = LearningQuestionRead.model_validate(question)
        dto.author = public_author_summary(question.author)
        dto.source = (await resolve_sources(self.session, [question])).get(question.id)
        if current_user:
            relationships = await self._author_relationships(
                [question.author_id], current_user.id
            )
            dto.relationship = relationships.get(
                question.author_id,
                AuthorRelationshipRead(is_following=False, is_self=False),
            )
            user_reaction = await self.reaction_repo.get_user_reaction(
                user_id=current_user.id,
                target_type=TargetType.QUESTION,
                target_id=question.id,
                reaction_type=ReactionType.LIKE
            )
            user_save = await self.save_repo.get_user_saved_item(
                user_id=current_user.id,
                target_type=TargetType.QUESTION,
                target_id=question.id
            )
            dto.is_liked_by_me = user_reaction is not None
            dto.is_saved_by_me = user_save is not None

        return dto

    async def list_questions(
        self,
        document_id: Optional[uuid.UUID] = None,
        page_number: Optional[int] = None,
        status_filter: Optional[str] = None,
        visibility: Optional[Visibility] = None,
        author_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
        page: int = 1,
        size: int = 20,
        current_user: Optional[User] = None
    ) -> LearningQuestionListResponse:
        skip = (page - 1) * size
        viewer_id = current_user.id if current_user else None

        questions, total = await self.question_repo.list_questions(
            document_id=document_id,
            page_number=page_number,
            status=status_filter,
            visibility=visibility,
            author_id=author_id,
            viewer_id=viewer_id,
            search=search,
            skip=skip,
            limit=size
        )

        dtos: List[LearningQuestionRead] = []
        if viewer_id and questions:
            q_ids = [q.id for q in questions]
            relationships = await self._author_relationships(
                [q.author_id for q in questions], viewer_id
            )
            user_reactions = await self.reaction_repo.get_user_reactions_for_targets(
                user_id=viewer_id,
                target_type=TargetType.QUESTION,
                target_ids=q_ids
            )
            liked_ids = {r.target_id for r in user_reactions if r.reaction_type == ReactionType.LIKE}
            user_saves = await self.save_repo.get_user_saves_for_targets(
                user_id=viewer_id,
                target_type=TargetType.QUESTION,
                target_ids=q_ids
            )
            saved_ids = {s.target_id for s in user_saves}

            for q in questions:
                d = LearningQuestionRead.model_validate(q)
                d.author = public_author_summary(q.author)
                d.relationship = relationships.get(
                    q.author_id,
                    AuthorRelationshipRead(is_following=False, is_self=False),
                )
                d.is_liked_by_me = q.id in liked_ids
                d.is_saved_by_me = q.id in saved_ids
                dtos.append(d)
        else:
            for q in questions:
                d = LearningQuestionRead.model_validate(q)
                d.author = public_author_summary(q.author)
                dtos.append(d)

        # One extra query resolves the whole page's deep links.
        await attach_sources(self.session, questions, dtos)

        return LearningQuestionListResponse(
            items=dtos,
            total=total,
            page=page,
            size=size
        )

    async def update_question(
        self,
        question_id: uuid.UUID,
        update_in: LearningQuestionUpdate,
        current_user: User
    ) -> LearningQuestion:
        question = await self.question_repo.get_by_id(question_id)
        if not question or not question.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Learning question not found."
            )

        if question.author_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the question author can update this question."
            )

        update_data = update_in.model_dump(exclude_unset=True)
        return await self.question_repo.update(question, update_data)

    async def delete_question(self, question_id: uuid.UUID, current_user: User) -> None:
        question = await self.question_repo.get_by_id(question_id)
        if not question or not question.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Learning question not found."
            )

        if question.author_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the question author can delete this question."
            )

        await self.question_repo.update(question, {"is_active": False})
        await self.reaction_repo.delete_for_target(TargetType.QUESTION, question.id)
        await self.save_repo.delete_for_target(TargetType.QUESTION, question.id)

    async def toggle_like(self, question_id: uuid.UUID, current_user: User) -> ReactionToggleResponse:
        question = await self.question_repo.get_by_id(question_id)
        if not question or not question.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")

        is_reacted, new_count = await _toggle_like(
            self.reaction_repo,
            current_user.id,
            TargetType.QUESTION,
            question_id,
        )
        await self.question_repo.patch(question, {"likes_count": new_count})
        return ReactionToggleResponse(
            is_reacted=is_reacted, reaction_type=ReactionType.LIKE, new_count=new_count
        )

    async def toggle_save(self, question_id: uuid.UUID, current_user: User) -> SavedItemToggleResponse:
        question = await self.question_repo.get_by_id(question_id)
        if not question or not question.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")

        is_saved, new_count = await _toggle_save(
            self.save_repo,
            current_user.id,
            TargetType.QUESTION,
            question_id,
        )
        await self.question_repo.patch(question, {"saves_count": new_count})
        return SavedItemToggleResponse(is_saved=is_saved, new_count=new_count)


class NestedReplyService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.reply_repo = QuestionReplyRepository(session)
        self.question_repo = LearningQuestionRepository(session)
        self.reaction_repo = ReactionRepository(session)

    async def create_reply(
        self,
        question_id: uuid.UUID,
        reply_in: QuestionReplyCreate,
        current_user: User
    ) -> QuestionReply:
        question = await self.question_repo.get_by_id(question_id)
        if not question or not question.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning question not found.")

        if reply_in.parent_reply_id:
            parent = await self.reply_repo.get_by_id(reply_in.parent_reply_id)
            if not parent or not parent.is_active or parent.question_id != question_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid parent reply ID."
                )

        reply = QuestionReply(
            question_id=question_id,
            parent_reply_id=reply_in.parent_reply_id,
            author_id=current_user.id,
            content=reply_in.content
        )
        created_reply = await self.reply_repo.create(reply)

        # Increment answers count on question
        await self.question_repo.update(question, {"answers_count": question.answers_count + 1})
        return created_reply

    async def get_reply_tree_for_question(
        self,
        question_id: uuid.UUID,
        current_user: Optional[User] = None
    ) -> QuestionReplyTreeResponse:
        question = await self.question_repo.get_by_id(question_id)
        if not question or not question.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning question not found.")

        replies = await self.reply_repo.get_all_replies_for_question(question_id)
        if not replies:
            return QuestionReplyTreeResponse(question_id=question_id, total_replies=0, tree=[])

        viewer_id = current_user.id if current_user else None
        liked_reply_ids = set()
        if viewer_id:
            reply_ids = [r.id for r in replies]
            user_reactions = await self.reaction_repo.get_user_reactions_for_targets(
                user_id=viewer_id,
                target_type=TargetType.REPLY,
                target_ids=reply_ids
            )
            liked_reply_ids = {r.target_id for r in user_reactions if r.reaction_type == ReactionType.LIKE}

        # Build dictionary map of reply DTOs
        dto_map: Dict[uuid.UUID, QuestionReplyRead] = {}
        for r in replies:
            dto = QuestionReplyRead.model_validate(r)
            dto.author = public_author_summary(r.author)
            dto.is_liked_by_me = r.id in liked_reply_ids
            dto.children = []
            dto_map[r.id] = dto

        # Assemble tree hierarchy
        root_nodes: List[QuestionReplyRead] = []
        for r in replies:
            dto = dto_map[r.id]
            if r.parent_reply_id and r.parent_reply_id in dto_map:
                dto_map[r.parent_reply_id].children.append(dto)
            else:
                root_nodes.append(dto)

        return QuestionReplyTreeResponse(
            question_id=question_id,
            total_replies=len(replies),
            tree=root_nodes
        )

    async def update_reply(
        self,
        reply_id: uuid.UUID,
        reply_in: QuestionReplyUpdate,
        current_user: User
    ) -> QuestionReply:
        reply = await self.reply_repo.get_by_id(reply_id)
        if not reply or not reply.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reply not found.")

        if reply.author_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only author can edit reply.")

        return await self.reply_repo.update(reply, {"content": reply_in.content})

    async def delete_reply(self, reply_id: uuid.UUID, current_user: User) -> None:
        reply = await self.reply_repo.get_by_id(reply_id)
        if not reply or not reply.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reply not found.")

        if reply.author_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only author can delete reply.")

        await self.reply_repo.update(reply, {"is_active": False})

    async def toggle_like(self, reply_id: uuid.UUID, current_user: User) -> ReactionToggleResponse:
        reply = await self.reply_repo.get_by_id(reply_id)
        if not reply or not reply.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reply not found.")

        is_reacted, new_count = await _toggle_like(
            self.reaction_repo,
            current_user.id,
            TargetType.REPLY,
            reply_id,
        )
        await self.reply_repo.patch(reply, {"likes_count": new_count})
        return ReactionToggleResponse(
            is_reacted=is_reacted, reaction_type=ReactionType.LIKE, new_count=new_count
        )

    async def mark_accepted_answer(
        self,
        question_id: uuid.UUID,
        reply_id: uuid.UUID,
        current_user: User
    ) -> QuestionReplyRead:
        question = await self.question_repo.get_by_id(question_id)
        if not question or not question.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning question not found.")

        if question.author_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the question author can accept an answer."
            )

        reply = await self.reply_repo.get_by_id(reply_id)
        if not reply or not reply.is_active or reply.question_id != question_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reply not found for this question.")

        # Unmark previously accepted answers for this question
        await self.reply_repo.clear_accepted_answers(question_id)

        # Mark this reply as accepted and mark question as SOLVED
        await self.reply_repo.update(reply, {"is_accepted_answer": True})
        await self.question_repo.update(question, {"status": QuestionStatus.SOLVED})

        updated_reply = await self.reply_repo.get_by_id_with_author(reply_id)
        dto = QuestionReplyRead.model_validate(updated_reply)
        dto.author = public_author_summary(updated_reply.author)
        return dto


# =========================================================
# FOLLOW SERVICE & COMMUNITY PROFILE SERVICE
# =========================================================

class FollowService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.follow_repo = FollowRepository(session)
        self.user_repo = UserRepository(session)

    async def toggle_follow(
        self,
        target_type: TargetType,
        target_id: uuid.UUID,
        current_user: User
    ) -> FollowToggleResponse:
        if target_type == TargetType.USER and target_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot follow yourself."
            )

        # Validate target exists
        if target_type == TargetType.USER:
            target_user = await self.user_repo.get_by_id(target_id)
            if not target_user or not target_user.is_active:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        existing = await self.follow_repo.get_follow(
            follower_id=current_user.id,
            target_type=target_type,
            target_id=target_id
        )

        if existing:
            await self.follow_repo.delete(existing)
            count = await self.follow_repo.count_followers(target_type, target_id)
            return FollowToggleResponse(is_following=False, followers_count=count)
        else:
            follow = Follow(
                follower_id=current_user.id,
                target_type=target_type,
                target_id=target_id
            )
            await self.follow_repo.create(follow)
            count = await self.follow_repo.count_followers(target_type, target_id)
            return FollowToggleResponse(is_following=True, followers_count=count)

    async def get_user_followers(self, user_id: uuid.UUID) -> List[uuid.UUID]:
        return await self.follow_repo.get_follower_user_ids(TargetType.USER, user_id)

    async def get_user_following(self, user_id: uuid.UUID, target_type: TargetType) -> List[uuid.UUID]:
        return await self.follow_repo.get_following_target_ids(user_id, target_type)

    async def is_following(
        self,
        follower_id: uuid.UUID,
        target_type: TargetType,
        target_id: uuid.UUID
    ) -> bool:
        follow = await self.follow_repo.get_follow(follower_id, target_type, target_id)
        return follow is not None

    async def _get_active_target_user(self, target_id: uuid.UUID) -> User:
        target_user = await self.user_repo.get_by_id(target_id)
        if not target_user or not target_user.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        return target_user

    async def follow_user(self, target_id: uuid.UUID, current_user: User) -> FollowUserResponse:
        """Idempotently follows another user (one-way, no approval state)."""
        if target_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot follow yourself."
            )

        await self._get_active_target_user(target_id)

        existing = await self.follow_repo.get_follow(
            follower_id=current_user.id,
            target_type=TargetType.USER,
            target_id=target_id
        )
        if not existing:
            await self.follow_repo.create(
                Follow(
                    follower_id=current_user.id,
                    target_type=TargetType.USER,
                    target_id=target_id
                )
            )

        return await self._user_follow_response(target_id, is_following=True)

    async def unfollow_user(self, target_id: uuid.UUID, current_user: User) -> FollowUserResponse:
        """Stops following a user. Unfollowing a non-followed user is a no-op."""
        existing = await self.follow_repo.get_follow(
            follower_id=current_user.id,
            target_type=TargetType.USER,
            target_id=target_id
        )
        if existing:
            await self.follow_repo.delete(existing)

        return await self._user_follow_response(target_id, is_following=False)

    async def get_follow_state(
        self,
        target_id: uuid.UUID,
        current_user: Optional[User] = None
    ) -> FollowStateRead:
        """Relationship snapshot between the viewer and a user."""
        await self._get_active_target_user(target_id)

        is_self = bool(current_user and current_user.id == target_id)

        is_following = False
        if current_user and not is_self:
            follow = await self.follow_repo.get_follow(
                current_user.id, TargetType.USER, target_id
            )
            is_following = follow is not None

        return FollowStateRead(
            is_following=is_following,
            is_self=is_self,
            followers_count=await self.follow_repo.count_followers(TargetType.USER, target_id),
            following_count=await self.follow_repo.count_following(target_id, TargetType.USER),
        )

    async def _user_follow_response(self, target_id: uuid.UUID, is_following: bool) -> FollowUserResponse:
        return FollowUserResponse(
            is_following=is_following,
            followers_count=await self.follow_repo.count_followers(TargetType.USER, target_id),
            following_count=await self.follow_repo.count_following(target_id, TargetType.USER),
        )

    async def _to_follow_user_summaries(
        self,
        rows: List[Tuple[User, datetime]],
        viewer_id: Optional[uuid.UUID],
    ) -> List[FollowUserSummary]:
        """Decorates a page of people with viewer follow state and counts.

        The page of ids arrives from one joined query; the follow state and the
        two counts are then resolved with a fixed three extra queries, so the
        cost does not grow with page size.
        """
        user_ids = [user.id for user, _ in rows]
        if not user_ids:
            return []

        followed: set = set()
        if viewer_id:
            followed = await self.follow_repo.get_followed_target_ids_batch(
                follower_id=viewer_id,
                target_type=TargetType.USER,
                target_ids=user_ids,
            )

        follower_counts = await self.follow_repo.count_followers_batch(
            TargetType.USER, user_ids
        )
        following_counts = await self.follow_repo.count_following_users_batch(user_ids)

        return [
            FollowUserSummary(
                id=user.id,
                full_name=user.display_name(),
                picture=user.picture,
                department=user.department,
                is_self=bool(viewer_id and user.id == viewer_id),
                is_following=user.id in followed,
                followers_count=follower_counts.get(user.id, 0),
                following_count=following_counts.get(user.id, 0),
                followed_at=followed_at,
            )
            for user, followed_at in rows
        ]

    async def list_following(
        self,
        current_user: User,
        page: int = 1,
        size: int = 20,
        search: Optional[str] = None,
    ) -> FollowUserListResponse:
        """People the viewer follows, for the Feed rail and Following tab."""
        rows, total = await self.follow_repo.list_followed_users(
            follower_id=current_user.id, page=page, size=size, search=search
        )
        items = await self._to_follow_user_summaries(rows, current_user.id)
        return FollowUserListResponse(items=items, total=total, page=page, size=size)

    async def list_followers(
        self,
        target_id: uuid.UUID,
        viewer_id: Optional[uuid.UUID],
        page: int = 1,
        size: int = 20,
    ) -> FollowUserListResponse:
        """Followers of one student, for their profile."""
        await self._get_active_target_user(target_id)
        rows, total = await self.follow_repo.list_followers(
            target_id=target_id, page=page, size=size
        )
        items = await self._to_follow_user_summaries(rows, viewer_id)
        return FollowUserListResponse(items=items, total=total, page=page, size=size)


class CommunityProfileService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)
        self.pin_repo = KnowledgePinRepository(session)
        self.question_repo = LearningQuestionRepository(session)
        self.reply_repo = QuestionReplyRepository(session)
        self.follow_repo = FollowRepository(session)
        self.reaction_repo = ReactionRepository(session)
        self.community_repo = CommunityRepository(session)

    async def get_community_profile(
        self,
        user_id: uuid.UUID,
        current_user: Optional[User] = None,
        page: int = 1,
        size: int = 10
    ) -> CommunityProfileRead:
        target_user = await self.user_repo.get_by_id(user_id)
        if not target_user or not target_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )

        user_summary = UserSummary(
            id=target_user.id,
            full_name=target_user.display_name(),
            picture=target_user.picture,
            department=target_user.department
        )

        skip = (page - 1) * size

        # Aggregate stats — only PUBLIC content is exposed on a profile.
        public_pins, total_pins = await self.pin_repo.list_pins(
            author_id=user_id,
            visibility=Visibility.PUBLIC,
            skip=skip,
            limit=size,
            sort_by="created_at",
            sort_order="desc"
        )

        public_questions, total_questions = await self.question_repo.list_questions(
            author_id=user_id,
            visibility=Visibility.PUBLIC,
            skip=skip,
            limit=size,
            sort_by="created_at",
            sort_order="desc"
        )

        # Count answers by this user
        from sqlmodel import select, func
        from sqlalchemy import and_
        from app.db.models.social import QuestionReply as QR
        answer_count_stmt = select(func.count(QR.id)).where(
            and_(QR.author_id == user_id, QR.is_active == True)
        )
        answer_result = await self.session.execute(answer_count_stmt)
        total_answers = answer_result.scalar_one() or 0

        # Count helpful contributions (accepted answers)
        helpful_stmt = select(func.count(QR.id)).where(
            and_(QR.author_id == user_id, QR.is_accepted_answer == True, QR.is_active == True)
        )
        helpful_result = await self.session.execute(helpful_stmt)
        total_helpful = helpful_result.scalar_one() or 0

        followers_count = await self.follow_repo.count_followers(TargetType.USER, user_id)
        following_users_count = await self.follow_repo.count_following(user_id, TargetType.USER)
        following_courses_count = await self.follow_repo.count_following(user_id, TargetType.COURSE)

        stats = CommunityStatsRead(
            total_pins=total_pins,
            total_questions=total_questions,
            total_answers=total_answers,
            total_helpful_contributions=total_helpful,
            followers_count=followers_count,
            following_users_count=following_users_count,
            following_courses_count=following_courses_count,
            following_count=following_users_count
        )

        # Study context: courses followed + courses created (PRIVATE stay hidden).
        is_self = bool(current_user and current_user.id == user_id)
        courses = await self.community_repo.list_user_courses(
            user_id,
            include_private=is_self,
        )
        course_reads = [
            ProfileCourseRead(
                id=c.id,
                title=c.title,
                code=c.code,
                category=c.category,
                open_url=f"/courses/{c.code.lower()}",
            )
            for c in courses
        ]

        # Annotate the author's own content with the viewer's relationship.
        viewer_id = current_user.id if current_user else None
        is_following_user = False
        relationships: Dict[uuid.UUID, AuthorRelationshipRead] = {}
        if viewer_id:
            relationships = await _resolve_author_relationships(
                self.follow_repo, [user_id], viewer_id
            )
            relationship = relationships.get(
                user_id, AuthorRelationshipRead(is_following=False, is_self=False)
            )
            is_following_user = relationship.is_following
        else:
            relationship = AuthorRelationshipRead(is_following=False, is_self=is_self)

        pin_dtos: List[KnowledgePinRead] = []
        for p in public_pins:
            dto = KnowledgePinRead.model_validate(p)
            dto.author = public_author_summary(p.author)
            if viewer_id:
                dto.relationship = relationships.get(
                    p.author_id,
                    AuthorRelationshipRead(is_following=False, is_self=False),
                )
            pin_dtos.append(dto)

        question_dtos: List[LearningQuestionRead] = []
        for q in public_questions:
            dto = LearningQuestionRead.model_validate(q)
            dto.author = public_author_summary(q.author)
            if viewer_id:
                dto.relationship = relationships.get(
                    q.author_id,
                    AuthorRelationshipRead(is_following=False, is_self=False),
                )
            question_dtos.append(dto)

        await attach_sources(self.session, public_pins, pin_dtos)
        await attach_sources(self.session, public_questions, question_dtos)

        return CommunityProfileRead(
            user=user_summary,
            stats=stats,
            public_pins=pin_dtos,
            public_questions=question_dtos,
            is_following_user=is_following_user,
            relationship=relationship,
            courses=course_reads,
            pins_total=total_pins,
            questions_total=total_questions,
            page=page,
            size=size
        )


class UserRecommendationService:
    """People discovery based on department and shared courses only."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.community_repo = CommunityRepository(session)
        self.follow_repo = FollowRepository(session)

    async def get_recommended_users(
        self,
        current_user: User,
        page: int = 1,
        size: int = 20
    ) -> RecommendedUserListResponse:
        skip = (page - 1) * size

        candidates, total = await self.community_repo.list_recommended_users(
            current_user,
            skip=skip,
            limit=size,
        )

        if not candidates:
            return RecommendedUserListResponse(items=[], total=total, page=page, size=size)

        candidate_ids = [candidate.id for candidate, _ in candidates]

        viewer_course_ids = await self.community_repo.get_viewer_course_ids(current_user.id)
        shared_courses = await self.community_repo.get_shared_courses_for_users(
            viewer_course_ids, candidate_ids
        )
        follower_counts = await self.follow_repo.count_followers_batch(
            TargetType.USER, candidate_ids
        )
        followed = await self.follow_repo.get_followed_target_ids_batch(
            follower_id=current_user.id,
            target_type=TargetType.USER,
            target_ids=candidate_ids
        )

        items: List[RecommendedUserRead] = []
        for candidate, _shared_count in candidates:
            same_department = bool(
                current_user.department
                and candidate.department
                and candidate.department == current_user.department
            )
            courses = shared_courses.get(candidate.id, [])
            items.append(
                RecommendedUserRead(
                    id=candidate.id,
                    full_name=candidate.full_name,
                    picture=candidate.picture,
                    department=candidate.department,
                    same_department=same_department,
                    shared_courses=[
                        SharedCourseRead.model_validate(c) for c in courses
                    ],
                    recommendation_reasons=self._build_reasons(
                        same_department, courses
                    ),
                    is_following=candidate.id in followed,
                    follower_count=follower_counts.get(candidate.id, 0),
                )
            )

        return RecommendedUserListResponse(
            items=items,
            total=total,
            page=page,
            size=size
        )

    @staticmethod
    def _build_reasons(
        same_department: bool,
        shared_courses: List[Any]
    ) -> List[str]:
        """Human-readable explanation for the frontend."""
        reasons: List[str] = []
        shared_titles = [c.title for c in shared_courses]

        if shared_titles:
            count = len(shared_titles)
            label = "course" if count == 1 else "courses"
            reasons.append(f"{count} shared {label}")

        if same_department:
            reasons.append("Same department")

        return reasons


# =========================================================
# ACTIVITY LOG & FEED SERVICES
# =========================================================

class ActivityLogService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.activity_repo = UserActivityRepository(session)

    async def log_activity(
        self,
        user_id: uuid.UUID,
        activity_type: ActivityType,
        target_type: Optional[TargetType] = None,
        target_id: Optional[uuid.UUID] = None,
        context_data: Optional[Dict[str, Any]] = None
    ) -> UserActivity:
        activity = UserActivity(
            user_id=user_id,
            activity_type=activity_type,
            target_type=target_type,
            target_id=target_id,
            context_data=context_data or {}
        )
        return await self.activity_repo.create(activity)


class RecommendationEngine:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.follow_repo = FollowRepository(session)
    
    async def get_recommended_user_ids(self, user_id: uuid.UUID) -> List[uuid.UUID]:
        # For a production system, this could be complex ML or graph traversal.
        # For now, simply return the IDs of users that the current user is following.
        return await self.follow_repo.get_following_target_ids(user_id, TargetType.USER)


class FeedService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.activity_repo = UserActivityRepository(session)
        self.recommendation_engine = RecommendationEngine(session)
        self.feed_repo = FeedRepository(session)
        self.pin_repo = KnowledgePinRepository(session)
        self.question_repo = LearningQuestionRepository(session)
        self.reaction_repo = ReactionRepository(session)
        self.save_repo = SavedItemRepository(session)
        self.follow_repo = FollowRepository(session)

    async def get_feed(
        self,
        current_user: User,
        scope: FeedScope = FeedScope.EVERYONE,
        content_type: FeedContentType = FeedContentType.ALL,
        search: Optional[str] = None,
        page: int = 1,
        size: int = 20,
        author_id: Optional[uuid.UUID] = None,
    ) -> FeedPageResponse:
        """Unified, chronological feed of questions and pins.

        Ordering/limit/offset are applied to the merged set in SQL, so page N
        never repeats or skips rows across the two content tables. An optional
        ``author_id`` narrows the feed to a single selected person.
        """
        skip = (page - 1) * size
        followed_ids = await self.feed_repo.followed_user_ids(current_user.id)

        rows, total = await self.feed_repo.list_feed(
            viewer_id=current_user.id,
            scope=scope.value,
            content_type=content_type.value,
            search=search,
            skip=skip,
            limit=size,
            followed_ids=followed_ids,
            author_id=author_id,
        )
        if not rows:
            return FeedPageResponse(
                items=[],
                total=total,
                page=page,
                size=size,
                has_more=skip + 0 < total,
                scope=scope,
                content_type=content_type,
            )

        pin_ids = [r.id for r in rows if r.content_type == SOURCE_PIN]
        question_ids = [r.id for r in rows if r.content_type == SOURCE_QUESTION]

        # Two bounded queries regardless of page size.
        pins, questions = await self.feed_repo.load_items(pin_ids, question_ids)
        reply_counts = await self.feed_repo.load_reply_counts(question_ids)

        pins_by_id = {p.id: p for p in pins}
        questions_by_id = {q.id: q for q in questions}

        # Decoration: relationships + viewer state in a fixed number of queries.
        author_ids = {r.author_id for r in rows}
        relationships = await self._batch_author_relationships(author_ids, current_user.id)
        liked_pin_ids = await self._liked_target_ids(current_user.id, TargetType.PIN, pin_ids)
        saved_pin_ids = await self._saved_target_ids(current_user.id, TargetType.PIN, pin_ids)
        liked_question_ids = await self._liked_target_ids(
            current_user.id, TargetType.QUESTION, question_ids
        )
        saved_question_ids = await self._saved_target_ids(
            current_user.id, TargetType.QUESTION, question_ids
        )

        items: List[FeedItemRead] = []
        # Sources are resolved once per content type after the loop; resolving
        # them per item would issue one query per row.
        pin_rows: List[KnowledgePin] = []
        pin_dtos: List[KnowledgePinRead] = []
        question_rows: List[LearningQuestion] = []
        question_dtos: List[LearningQuestionRead] = []
        for row in rows:
            relationship = relationships.get(
                row.author_id,
                AuthorRelationshipRead(is_following=False, is_self=row.author_id == current_user.id),
            )
            if row.content_type == SOURCE_PIN:
                pin = pins_by_id.get(row.id)
                if pin is None:
                    # Deleted between the union and the load; skip rather than
                    # emit a hole in the feed.
                    continue
                dto = KnowledgePinRead.model_validate(pin)
                dto.author = public_author_summary(pin.author)
                dto.relationship = relationship
                dto.is_liked_by_me = pin.id in liked_pin_ids
                dto.is_saved_by_me = pin.id in saved_pin_ids
                pin_rows.append(pin)
                pin_dtos.append(dto)
                items.append(
                    FeedItemRead(
                        content_type=FeedContentType.PINS,
                        id=pin.id,
                        author=dto.author,
                        relationship=relationship,
                        created_at=pin.created_at,
                        pin=dto,
                        question=None,
                        reply_count=0,
                    )
                )
            else:
                question = questions_by_id.get(row.id)
                if question is None:
                    continue
                dto = LearningQuestionRead.model_validate(question)
                dto.author = public_author_summary(question.author)
                dto.relationship = relationship
                dto.is_liked_by_me = question.id in liked_question_ids
                dto.is_saved_by_me = question.id in saved_question_ids
                question_rows.append(question)
                question_dtos.append(dto)
                items.append(
                    FeedItemRead(
                        content_type=FeedContentType.QUESTIONS,
                        id=question.id,
                        author=dto.author,
                        relationship=relationship,
                        created_at=question.created_at,
                        pin=None,
                        question=dto,
                        reply_count=reply_counts.get(question.id, 0),
                    )
                )

        # Two bounded queries for the whole page, regardless of page size.
        await attach_sources(self.session, pin_rows, pin_dtos)
        await attach_sources(self.session, question_rows, question_dtos)

        return FeedPageResponse(
            items=items,
            total=total,
            page=page,
            size=size,
            has_more=skip + len(items) < total,
            scope=scope,
            content_type=content_type,
        )

    async def _batch_author_relationships(
        self, author_ids: set, viewer_id: uuid.UUID
    ) -> Dict[uuid.UUID, AuthorRelationshipRead]:
        author_ids = {a for a in author_ids if a}
        if not author_ids:
            return {}
        followed = await self.follow_repo.get_followed_target_ids_batch(
            viewer_id, TargetType.USER, list(author_ids)
        )
        result: Dict[uuid.UUID, AuthorRelationshipRead] = {}
        for author_id in author_ids:
            result[author_id] = AuthorRelationshipRead(
                is_following=author_id in followed,
                is_self=author_id == viewer_id,
            )
        return result

    async def _liked_target_ids(
        self, user_id: uuid.UUID, target_type: TargetType, target_ids: List[uuid.UUID]
    ) -> set:
        if not target_ids:
            return set()
        reactions = await self.reaction_repo.get_user_reactions_for_targets(
            user_id=user_id,
            target_type=target_type,
            target_ids=target_ids,
        )
        return {r.target_id for r in reactions if r.reaction_type == ReactionType.LIKE}

    async def _saved_target_ids(
        self, user_id: uuid.UUID, target_type: TargetType, target_ids: List[uuid.UUID]
    ) -> set:
        if not target_ids:
            return set()
        saves = await self.save_repo.get_user_saves_for_targets(
            user_id=user_id,
            target_type=target_type,
            target_ids=target_ids,
        )
        return {s.target_id for s in saves}

    async def get_user_feed(
        self,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 20
    ) -> FeedResponse:
        # Get IDs of people the user follows to build the feed
        following_ids = await self.recommendation_engine.get_recommended_user_ids(user_id)
        
        # If they don't follow anyone, maybe include their own activity or return empty
        # Let's include their own activities and those they follow.
        feed_user_ids = following_ids + [user_id]
        
        activities = await self.activity_repo.get_recent_activities(
            user_ids=feed_user_ids,
            limit=limit,
            skip=skip
        )
        
        # Convert to Pydantic reads
        activity_dtos = []
        for act in activities:
            if act.user:
                summary = UserSummary(
                    id=act.user.id,
                    full_name=act.user.display_name(),
                    picture=act.user.picture,
                    department=act.user.department,
                )
            else:
                summary = UserSummary(id=act.user_id, full_name="ExamReal Student")
                
            activity_dtos.append(
                UserActivityRead(
                    id=act.id,
                    user=summary,
                    activity_type=act.activity_type,
                    target_type=act.target_type,
                    target_id=act.target_id,
                    context_data=act.context_data,
                    created_at=act.created_at
                )
            )
            
        return FeedResponse(
            activities=activity_dtos,
            total=len(activity_dtos) # We don't have total count endpoint in repo for now, simple length is fine
        )


# =========================================================
# COMMUNITY CONTEXT SERVICE
# =========================================================

class CommunityContextService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.pin_repo = KnowledgePinRepository(session)
        self.question_repo = LearningQuestionRepository(session)
        self.user_repo = UserRepository(session)
        
    async def get_community_context(
        self,
        request: CommunityContextRequest,
        current_user: Optional[User] = None
    ) -> CommunityContextResponse:
        """
        Given a specific document location coordinate (version, type, offsets),
        returns related pins and questions, as well as top contributors for this document.
        """
        # Fetch matching Pins
        pins = await self.pin_repo.get_by_location(
            document_id=request.document_id,
            document_version=request.document_version,
            target_type=request.target_type,
            selection_start_offset=request.selection_start_offset,
            selection_end_offset=request.selection_end_offset
        )
        
        # Only include PUBLIC pins, plus the user's own PRIVATE/FOLLOWERS pins if current_user
        visible_pins = []
        for p in pins:
            if p.visibility == Visibility.PUBLIC:
                visible_pins.append(p)
            elif current_user and p.author_id == current_user.id:
                visible_pins.append(p)
                
        # Fetch matching Questions
        questions = await self.question_repo.get_by_location(
            document_id=request.document_id,
            document_version=request.document_version,
            target_type=request.target_type,
            selection_start_offset=request.selection_start_offset,
            selection_end_offset=request.selection_end_offset
        )
        
        visible_questions = []
        for q in questions:
            if q.visibility == Visibility.PUBLIC:
                visible_questions.append(q)
            elif current_user and q.author_id == current_user.id:
                visible_questions.append(q)
                
        # Determine Top Contributors for the document (this is a simplified logic)
        # E.g. find all unique authors of pins & questions in this location
        author_ids = {p.author_id for p in visible_pins}.union({q.author_id for q in visible_questions})
        top_contributors = []
        for author_id in list(author_ids)[:5]: # cap at 5
            u = await self.user_repo.get_by_id(author_id)
            if u:
                top_contributors.append(
                    UserSummary(
                        id=u.id,
                        full_name=u.display_name(),
                        picture=u.picture,
                        department=u.department,
                    )
                )
                
        context_pin_dtos: List[KnowledgePinRead] = []
        for p in visible_pins:
            pin_dto = KnowledgePinRead.model_validate(p)
            pin_dto.author = public_author_summary(p.author)
            context_pin_dtos.append(pin_dto)

        context_question_dtos: List[LearningQuestionRead] = []
        for q in visible_questions:
            question_dto = LearningQuestionRead.model_validate(q)
            question_dto.author = public_author_summary(q.author)
            context_question_dtos.append(question_dto)

        await attach_sources(self.session, visible_pins, context_pin_dtos)
        await attach_sources(self.session, visible_questions, context_question_dtos)

        return CommunityContextResponse(
            related_pins=context_pin_dtos,
            related_questions=context_question_dtos,
            top_contributors=top_contributors
        )



