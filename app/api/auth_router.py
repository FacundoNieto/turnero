from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.core.security import verify_password, create_access_token
from app.core.deps import get_current_user, require_permission
from app.schemas.auth_schema import TokenResponse
from app.models.usuario_model import Usuario

router = APIRouter(prefix="/auth", tags=["auth"])
from app.schemas.auth_schema import MeResponse

@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.execute(
        select(Usuario).where(Usuario.username == form_data.username, Usuario.activo == True)
    ).scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)

@router.get("/me", response_model=MeResponse)
def me(
    user = Depends(get_current_user),
):
    roles = [r.nombre for r in (user.roles or [])]
    perms_map = getattr(user, "_perms_map", {})
    permissions = {k: list(v) for k, v in perms_map.items()}

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "profesional_id": user.profesional_id,
        },
        "roles": roles,
        "permissions": permissions,
    }
