from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    name: Optional[str] = None
    is_verified: bool
    is_active: bool
    created_at: datetime
