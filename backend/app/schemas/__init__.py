from app.schemas.auth import LoginRequest, TokenResponse, TokenPayload
from app.schemas.user import UserBase, UserCreate, UserResponse, UserUpdate, UserListResponse
from app.schemas.lab import LabBase, LabCreate, LabUpdate, LabResponse, LabListResponse
from app.schemas.pc import PCBase, PCCreate, PCUpdate, PCResponse, PCListResponse, LabInfo
from app.schemas.inventory import InventoryBase, InventoryCreate, InventoryUpdate, InventoryResponse, InventoryListResponse
from app.schemas.complaint import (
    ComplaintBase, ComplaintCreate, ComplaintUpdate, ComplaintResponse,
    ComplaintListResponse, ComplaintStatsResponse
)
from app.schemas.maintenance import (
    MaintenanceBase, MaintenanceCreate, MaintenanceUpdate,
    MaintenanceResponse, MaintenanceListResponse
)
from app.schemas.booking import (
    BookingCreate, BookingStatusUpdate, BookingResponse,
    BookingListResponse, AvailabilitySlot, LabAvailability,
    BookingStatsResponse
)
from app.schemas.pc_health import (
    PCHealthCreate, PCHealthResponse,
    PCHealthPredictionRequest, PCHealthPredictionResponse
)

__all__ = [
    "LoginRequest", "TokenResponse", "TokenPayload",
    "UserBase", "UserCreate", "UserResponse", "UserUpdate", "UserListResponse",
    "LabBase", "LabCreate", "LabUpdate", "LabResponse", "LabListResponse",
    "PCBase", "PCCreate", "PCUpdate", "PCResponse", "PCListResponse", "LabInfo",
    "InventoryBase", "InventoryCreate", "InventoryUpdate", "InventoryResponse", "InventoryListResponse",
    "ComplaintBase", "ComplaintCreate", "ComplaintUpdate", "ComplaintResponse", "ComplaintListResponse", "ComplaintStatsResponse",
    "MaintenanceBase", "MaintenanceCreate", "MaintenanceUpdate", "MaintenanceResponse", "MaintenanceListResponse",
    "BookingCreate", "BookingStatusUpdate", "BookingResponse", "BookingListResponse",
    "AvailabilitySlot", "LabAvailability", "BookingStatsResponse",
    "PCHealthCreate", "PCHealthResponse",
    "PCHealthPredictionRequest", "PCHealthPredictionResponse",
]

