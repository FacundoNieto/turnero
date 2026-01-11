from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.core.deps import require_permission
from app.models.rol_model import Rol
from app.schemas.rol_schema import RolOut

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("", response_model=list[RolOut])
def listar_roles(
    db: Session = Depends(get_db),
    _scope: str = Depends(require_permission("auth.usuarios.editar_roles")),
):
    roles = db.execute(select(Rol).order_by(Rol.nombre)).scalars().all()
    return roles
