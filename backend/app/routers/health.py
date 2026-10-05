from fastapi import APIRouter

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "lab-management-api",
        "phase": "Phase 1 - Project Foundation"
    }
