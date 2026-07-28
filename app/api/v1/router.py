from fastapi import APIRouter
from app.api.v1.endpoints import auth, courses, documents, questions

api_router = APIRouter(prefix="/v1")
api_router.include_router(auth.router)
api_router.include_router(courses.router)
api_router.include_router(documents.router)
api_router.include_router(questions.router)
