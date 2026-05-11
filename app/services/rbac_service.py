from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.usuario_model import Usuario
from app.models.rol_model import Rol
from app.models.rol_permiso_model import RolPermiso
from app.models.permiso_model import Permiso


def get_user_with_roles_and_permissions(db: Session, user_id: int) -> Usuario | None:
    stmt = (
        select(Usuario)
        .where(Usuario.id == user_id, Usuario.activo == True)
        .options(
            selectinload(Usuario.roles)
            .selectinload(Rol.rol_permisos)
            .selectinload(RolPermiso.permiso)
        )
    )
    return db.execute(stmt).scalar_one_or_none()


def build_permissions_map(user: Usuario) -> dict[str, set[str]]:
    """
    Devuelve: {"turnos.cancelar": {"OWN","ANY"}, ...}
    """
    m: dict[str, set[str]] = {}
    for rol in user.roles:
        for rp in rol.rol_permisos:
            code = rp.permiso.codigo
            m.setdefault(code, set()).add(rp.scope)
    return m


def has_permission(perms_map: dict[str, set[str]], code: str) -> set[str]:
    return perms_map.get(code, set())