from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import Base, engine
from app.routers import auth, health, users, labs, pcs, inventory, dashboard, complaints, maintenance, bookings, pc_health, utilization, reports
from app.seed import seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables and seed default data
    try:
        Base.metadata.create_all(bind=engine)
        seed_database()
        print("[LIFESPAN] Database tables ready and seed data verified.")
    except Exception as e:
        print(f"[LIFESPAN WARNING] Error during table creation/seeding: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="4.0.0",
    description="Backend API for AI-Based Smart Computer Laboratory Management and Asset Monitoring System",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(labs.router, prefix=settings.API_V1_STR)
app.include_router(pcs.router, prefix=settings.API_V1_STR)
app.include_router(inventory.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(complaints.router, prefix=settings.API_V1_STR)
app.include_router(maintenance.router, prefix=settings.API_V1_STR)
app.include_router(bookings.router, prefix=settings.API_V1_STR)
app.include_router(pc_health.router, prefix=settings.API_V1_STR)
app.include_router(utilization.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "phase": "Phase 4 - Lab Booking and Availability",
        "api_docs": "/docs"
    }
