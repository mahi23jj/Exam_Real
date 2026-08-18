import uuid
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
    CommunityStatsRead,
    CommunityProfileRead,
    UserSummary,
    UserActivityRead,
    FeedResponse,
    CommunityContextRequest,
    CommunityContextResponse,
)



class KnowledgePinService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.pin_repo = KnowledgePinRepository(session)
        self.doc_repo = DocumentRepository(session)
        self.reaction_repo = ReactionRepository(session)
        self.save_repo = SavedItemRepository(session)

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
        if current_user:
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
                dto.is_liked_by_me = p.id in liked_pin_ids
                dto.is_saved_by_me = p.id in saved_pin_ids
                pin_dtos.append(dto)
        else:
            pin_dtos = [KnowledgePinRead.model_validate(p) for p in pins]

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

        existing_reaction = await self.reaction_repo.get_user_reaction(
            user_id=current_user.id,
            target_type=TargetType.PIN,
            target_id=pin_id,
            reaction_type=ReactionType.LIKE
        )

        if existing_reaction:
            await self.reaction_repo.delete(existing_reaction)
            new_count = max(0, pin.likes_count - 1)
            await self.pin_repo.update(pin, {"likes_count": new_count})
            return ReactionToggleResponse(
                is_reacted=False,
                reaction_type=ReactionType.LIKE,
                new_count=new_count
            )
        else:
            reaction = Reaction(
                user_id=current_user.id,
                target_type=TargetType.PIN,
                target_id=pin_id,
                reaction_type=ReactionType.LIKE
            )
            await self.reaction_repo.create(reaction)
            new_count = pin.likes_count + 1
            await self.pin_repo.update(pin, {"likes_count": new_count})
            return ReactionToggleResponse(
                is_reacted=True,
                reaction_type=ReactionType.LIKE,
                new_count=new_count
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

        existing_save = await self.save_repo.get_user_saved_item(
            user_id=current_user.id,
            target_type=TargetType.PIN,
            target_id=pin_id
        )

        if existing_save:
            await self.save_repo.delete(existing_save)
            new_count = max(0, pin.saves_count - 1)
            await self.pin_repo.update(pin, {"saves_count": new_count})
            return SavedItemToggleResponse(is_saved=False, new_count=new_count)
        else:
            saved_item = SavedItem(
                user_id=current_user.id,
                target_type=TargetType.PIN,
                target_id=pin_id
            )
            await self.save_repo.create(saved_item)
            new_count = pin.saves_count + 1
            await self.pin_repo.update(pin, {"saves_count": new_count})
            return SavedItemToggleResponse(is_saved=True, new_count=new_count)


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
        if current_user:
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
                d.is_liked_by_me = q.id in liked_ids
                d.is_saved_by_me = q.id in saved_ids
                dtos.append(d)
        else:
            dtos = [LearningQuestionRead.model_validate(q) for q in questions]

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

    async def toggle_like(self, question_id: uuid.UUID, current_user: User) -> ReactionToggleResponse:
        question = await self.question_repo.get_by_id(question_id)
        if not question or not question.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")

        existing = await self.reaction_repo.get_user_reaction(
            user_id=current_user.id,
            target_type=TargetType.QUESTION,
            target_id=question_id,
            reaction_type=ReactionType.LIKE
        )

        if existing:
            await self.reaction_repo.delete(existing)
            new_count = max(0, question.likes_count - 1)
            await self.question_repo.update(question, {"likes_count": new_count})
            return ReactionToggleResponse(is_reacted=False, reaction_type=ReactionType.LIKE, new_count=new_count)
        else:
            rx = Reaction(user_id=current_user.id, target_type=TargetType.QUESTION, target_id=question_id, reaction_type=ReactionType.LIKE)
            await self.reaction_repo.create(rx)
            new_count = question.likes_count + 1
            await self.question_repo.update(question, {"likes_count": new_count})
            return ReactionToggleResponse(is_reacted=True, reaction_type=ReactionType.LIKE, new_count=new_count)

    async def toggle_save(self, question_id: uuid.UUID, current_user: User) -> SavedItemToggleResponse:
        question = await self.question_repo.get_by_id(question_id)
        if not question or not question.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")

        existing = await self.save_repo.get_user_saved_item(
            user_id=current_user.id,
            target_type=TargetType.QUESTION,
            target_id=question_id
        )

        if existing:
            await self.save_repo.delete(existing)
            new_count = max(0, question.saves_count - 1)
            await self.question_repo.update(question, {"saves_count": new_count})
            return SavedItemToggleResponse(is_saved=False, new_count=new_count)
        else:
            sv = SavedItem(user_id=current_user.id, target_type=TargetType.QUESTION, target_id=question_id)
            await self.save_repo.create(sv)
            new_count = question.saves_count + 1
            await self.question_repo.update(question, {"saves_count": new_count})
            return SavedItemToggleResponse(is_saved=True, new_count=new_count)


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

        existing = await self.reaction_repo.get_user_reaction(
            user_id=current_user.id,
            target_type=TargetType.REPLY,
            target_id=reply_id,
            reaction_type=ReactionType.LIKE
        )

        if existing:
            await self.reaction_repo.delete(existing)
            new_count = max(0, reply.likes_count - 1)
            await self.reply_repo.update(reply, {"likes_count": new_count})
            return ReactionToggleResponse(is_reacted=False, reaction_type=ReactionType.LIKE, new_count=new_count)
        else:
            rx = Reaction(user_id=current_user.id, target_type=TargetType.REPLY, target_id=reply_id, reaction_type=ReactionType.LIKE)
            await self.reaction_repo.create(rx)
            new_count = reply.likes_count + 1
            await self.reply_repo.update(reply, {"likes_count": new_count})
            return ReactionToggleResponse(is_reacted=True, reaction_type=ReactionType.LIKE, new_count=new_count)

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
        return QuestionReplyRead.model_validate(updated_reply)


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


class CommunityProfileService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)
        self.pin_repo = KnowledgePinRepository(session)
        self.question_repo = LearningQuestionRepository(session)
        self.reply_repo = QuestionReplyRepository(session)
        self.follow_repo = FollowRepository(session)
        self.reaction_repo = ReactionRepository(session)

    async def get_community_profile(
        self,
        user_id: uuid.UUID,
        current_user: Optional[User] = None
    ) -> CommunityProfileRead:
        target_user = await self.user_repo.get_by_id(user_id)
        if not target_user or not target_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )

        user_summary = UserSummary(
            id=target_user.id,
            full_name=target_user.full_name,
            email=target_user.email
        )

        # Aggregate stats
        public_pins, total_pins = await self.pin_repo.list_pins(
            author_id=user_id,
            visibility=Visibility.PUBLIC,
            skip=0,
            limit=10,
            sort_by="created_at",
            sort_order="desc"
        )

        public_questions, total_questions = await self.question_repo.list_questions(
            author_id=user_id,
            visibility=Visibility.PUBLIC,
            skip=0,
            limit=10,
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
            following_courses_count=following_courses_count
        )

        pin_dtos = [KnowledgePinRead.model_validate(p) for p in public_pins]
        question_dtos = [LearningQuestionRead.model_validate(q) for q in public_questions]

        is_following_user = False
        if current_user and current_user.id != user_id:
            follow = await self.follow_repo.get_follow(current_user.id, TargetType.USER, user_id)
            is_following_user = follow is not None

        return CommunityProfileRead(
            user=user_summary,
            stats=stats,
            public_pins=pin_dtos,
            public_questions=question_dtos,
            is_following_user=is_following_user
        )


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
                summary = UserSummary.model_validate(act.user)
            else:
                summary = UserSummary(id=act.user_id, full_name="Unknown", email="")
                
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
                top_contributors.append(UserSummary.model_validate(u))
                
        return CommunityContextResponse(
            related_pins=[KnowledgePinRead.model_validate(p) for p in visible_pins],
            related_questions=[LearningQuestionRead.model_validate(q) for q in visible_questions],
            top_contributors=top_contributors
        )



