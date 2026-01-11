from pydantic import BaseModel, EmailStr
from typing import Optional, List


class UsuarioOut(BaseModel):
    id: int
    username: str
    email: Optional[EmailStr] = None
    activo: bool
    profesional_id: Optional[int] = None
    roles: List[str] = []

    # class Config:
    #     orm_mode = True
    model_config = {
        "from_attributes": True
    }


class UsuarioCreate(BaseModel):
    username: str
    password: str
    email: Optional[EmailStr] = None
    profesional_id: Optional[int] = None
    rol_ids: List[int] = []


class UsuarioUpdateRoles(BaseModel):
    rol_ids: List[int]
