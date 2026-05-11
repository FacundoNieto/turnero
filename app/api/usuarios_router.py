from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select

from app.database import get_db
from app.core.deps import require_permission
from app.core.security import hash_password

from app.models.usuario_model import Usuario
from app.models.rol_model import Rol

from app.schemas.usuario_schema import UsuarioCreate, UsuarioUpdateRoles, UsuarioOut

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


def _usuario_to_out(u: Usuario) -> UsuarioOut:
    return UsuarioOut(
        id=u.id,
        username=u.username,
        email=u.email,
        activo=bool(u.activo),
        profesional_id=u.profesional_id,
        roles=[r.nombre for r in (u.roles or [])],
    )


@router.post("", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    payload: UsuarioCreate,
    db: Session = Depends(get_db),
    scope: str = Depends(require_permission("auth.usuarios.crear")),
):
    # El username no debe ya existir en la base de datos
    existe_user = db.execute(select(Usuario).where(Usuario.username == payload.username)).scalar_one_or_none()
    if existe_user:
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese username.")

    # El email (si viene) no debe ya existir en la base de datos
    if payload.email:
        existe_email = db.execute(select(Usuario).where(Usuario.email == payload.email)).scalar_one_or_none()
        if existe_email:
            raise HTTPException(status_code=409, detail="Ya existe un usuario con ese email.")

    u = Usuario(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        activo=True,
        profesional_id=payload.profesional_id,
    )

    # roles por rol_ids (si mandan)
    if payload.rol_ids:
        roles = db.execute(select(Rol).where(Rol.id.in_(payload.rol_ids))).scalars().all()
        if len(roles) != len(set(payload.rol_ids)):
            raise HTTPException(status_code=400, detail="Uno o más rol_ids no existen.")
        u.roles = roles

    db.add(u)
    db.commit()
    db.refresh(u)

    # asegura que roles esté disponible para armar response
    _ = u.roles

    return _usuario_to_out(u)


@router.patch("/{usuario_id}/roles", response_model=UsuarioOut)
def actualizar_roles_usuario(
    usuario_id: int,
    payload: UsuarioUpdateRoles,
    db: Session = Depends(get_db),
    scope: str = Depends(require_permission("auth.usuarios.editar_roles")),
):
    u = db.get(Usuario, usuario_id)
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    roles = db.execute(select(Rol).where(Rol.id.in_(payload.rol_ids))).scalars().all()
    if len(roles) != len(set(payload.rol_ids)):
        raise HTTPException(status_code=400, detail="Uno o más rol_ids no existen.")

    # Reemplazo total (MVP claro): lo que mandás = lo que queda
    u.roles = roles

    db.commit()
    db.refresh(u)
    _ = u.roles

    return _usuario_to_out(u)


@router.get("", response_model=list[UsuarioOut])
def listar_usuarios(
    db: Session = Depends(get_db),
    scope: str = Depends(require_permission("auth.usuarios.editar_roles")),
):
    stmt = (
        select(Usuario)
        .options(selectinload(Usuario.roles))
        .order_by(Usuario.id)
    )
    usuarios = db.execute(stmt).scalars().all()
    return [_usuario_to_out(u) for u in usuarios]