from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import decode_token
from app.services.rbac_service import get_user_with_roles_and_permissions, build_permissions_map, has_permission

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
):
    try:
        payload = decode_token(token)
        sub = payload.get("sub")
        if not sub:
            raise ValueError("missing sub")
        user_id = int(sub)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado")

    user = get_user_with_roles_and_permissions(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado o inactivo")

    # Adjuntamos el mapa de permisos al objeto (sin ensuciar el modelo permanentemente)
    user._perms_map = build_permissions_map(user)  # type: ignore[attr-defined]
    return user


def require_permission(code: str):
    """
    Devuelve el scope efectivo para este permiso:
      - "ANY" si lo tiene
      - "OWN" si solo tiene OWN
    Si no lo tiene -> 403
    """
    def _dep(user=Depends(get_current_user)):
        perms_map = getattr(user, "_perms_map", {})
        scopes = has_permission(perms_map, code)

        if "ANY" in scopes:
            return "ANY"
        if "OWN" in scopes:
            return "OWN"

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Falta permiso: {code}")

    return _dep