from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    courses,
    documents,
    questions,
    pins,
    learning_questions,
    follows,
    community_profile,
    community,
    analytics
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(courses.router)
api_router.include_router(documents.router)
api_router.include_router(questions.router)
api_router.include_router(pins.router)
api_router.include_router(learning_questions.router)
api_router.include_router(follows.router, prefix="/follows", tags=["follows"])
api_router.include_router(community_profile.router, prefix="/users", tags=["users"])
api_router.include_router(community.router, prefix="/community", tags=["community"])
api_router.include_router(analytics.router)
