from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.core.deps import require_permission
from app.models.permiso_model import Permiso
from app.schemas.permiso_schema import PermisoOut

router = APIRouter(prefix="/permisos", tags=["permisos"])


@router.get("", response_model=list[PermisoOut])
def listar_permisos(
    db: Session = Depends(get_db),
    _scope: str = Depends(require_permission("auth.usuarios.editar_roles")),
):
    permisos = db.execute(select(Permiso).order_by(Permiso.codigo)).scalars().all()
    return permisos
