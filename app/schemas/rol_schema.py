from pydantic import BaseModel
from typing import Optional, List


class RolOut(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None

    # class Config:
    #     orm_mode = True
    model_config = {
        "from_attributes": True
    }


class RolPermisoOut(BaseModel):
    permiso_codigo: str
    scope: str  # "OWN" | "ANY"


class RolDetalleOut(RolOut):
    permisos: List[RolPermisoOut] = []
