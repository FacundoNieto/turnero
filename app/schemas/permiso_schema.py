from pydantic import BaseModel
from typing import Optional


class PermisoOut(BaseModel):
    id: int
    codigo: str
    descripcion: Optional[str] = None

    # class Config:
    #     orm_mode = True
    model_config = {
        "from_attributes": True
    }
