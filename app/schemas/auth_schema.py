from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    username: str
    email: str | None = None
    profesional_id: int | None = None


class MeResponse(BaseModel):
    user: UserOut
    roles: list[str]
    permissions: dict[str, list[str]]
