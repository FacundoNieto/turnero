# En este archivo definimos las rutas o endpoints relacionados con los pedidos de turnos.
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_

from app.schemas.turno_schema import TurnoOut, TurnoCreate
from app.database import get_db
from app.models.turno_model import Turno
from app.models.paciente_model import Paciente
from app.models.profesional_model import Profesional
from app.services.notificaciones_service import programar_notifs_creacion_turno
from app.services.turnos_service import (
    crear_turno as crear_turno_service,
    validar_solapamiento_paciente,
    validar_solapamiento_profesional,
    hay_bloqueo_agenda,
    aplicar_evento_turno,
    _estado_id_por_codigo,
    EVENTO_CONFIRMAR,
    EVENTO_CANCELAR,
    EVENTO_COMPLETAR,
    EVENTO_NO_ASISTIO,
    query_turnos_filtrados,
    )

from app.core.deps import get_current_user, require_permission
from app.services.ownership_service import assert_turno_ownership

turnos_router = APIRouter(prefix="/turnos", tags=["turnos"])

@turnos_router.post("", response_model = TurnoOut)
def crear_turno(
    payload: TurnoCreate, 
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
    scope: str = Depends(require_permission("turnos.crear")),
):
    es_prof = bool(getattr(user, "profesional_id", None))
    puede_auto_confirmar = (scope == "ANY") or es_prof

    # Default: admin crea confirmado, resto reservado
    if payload.auto_confirm is None:
        auto_confirm = True if scope == "ANY" else False
    else:
        if payload.auto_confirm and not puede_auto_confirmar:
            raise HTTPException(
                status_code=403,
                detail="No autorizado a crear turnos confirmados directamente.",
            )
        auto_confirm = bool(payload.auto_confirm)

    turno = crear_turno_service(
        db,
        paciente_id = payload.paciente_id,
        profesional_id = payload.profesional_id,
        inicio = payload.fecha_hora_inicio,
        fin = payload.fecha_hora_fin,
        user = user,
        scope = scope,
        auto_confirm=auto_confirm,
    )

    return turno


@turnos_router.get("", response_model=list[TurnoOut])
def obtener_turnos(
    db: Session = Depends(get_db),
    profesional_id: int | None = Query(default=None),
    paciente_id: int | None = Query(default=None),
    desde: datetime | None = Query(default=None),
    hasta: datetime | None = Query(default=None),
    solo_activos: bool = Query(default=False),
    limit: int = Query(default=200, ge=1, le=1000),
    user = Depends(get_current_user),
    scope: str = Depends(require_permission("turnos.ver")),
):
    """
    Devuelve turnos filtrados.
    - Si pasás desde/hasta: devuelve turnos que se solapan con ese rango.
    - Si no pasás rango: devuelve los últimos `limit` turnos.
    """
    q =  query_turnos_filtrados(
        db,
        user = user,
        scope = scope,
        profesional_id = profesional_id,
        paciente_id = paciente_id,
        desde = desde,
        hasta = hasta,
        solo_activos = solo_activos,
    )

    return (
        q.order_by(Turno.fecha_hora_inicio.desc())
        .limit(limit)
        .all()
    )


@turnos_router.get("/{turno_id}", response_model=TurnoOut)
def obtener_turno_por_id(
    turno_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
    scope: str = Depends(require_permission("turnos.ver")),
):
    turno = (
        db.query(Turno)
        .options(joinedload(Turno.estado))
        .filter(Turno.id == turno_id)
        .first()
    )
    if not turno:
        raise HTTPException(status_code=404, detail="Turno no encontrado.")

    # RBAC OWN: si es OWN, solo puede ver turnos de su agenda
    if scope == "OWN":
        if not getattr(user, "profesional_id", None):
            raise HTTPException(status_code=403, detail="Usuario sin profesional asociado.")
        if turno.profesional_id != user.profesional_id:
            raise HTTPException(status_code=403, detail="No tenés acceso a este turno.")

    return turno

@turnos_router.post("/{turno_id}/confirmar", response_model=TurnoOut)
def confirmar_turno(
    turno_id: int, 
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
    scope: str = Depends(require_permission("turnos.confirmar")),
):
    turno = aplicar_evento_turno(db, turno_id, EVENTO_CONFIRMAR, user=user, scope=scope)
    db.refresh(turno, attribute_names=["estado"])
    return turno


@turnos_router.post("/{turno_id}/cancelar", response_model=TurnoOut)
def cancelar_turno(
    turno_id: int, 
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
    scope: str = Depends(require_permission("turnos.cancelar")),
):
    turno = aplicar_evento_turno(db, turno_id, EVENTO_CANCELAR, user=user, scope=scope)
    db.refresh(turno, attribute_names=["estado"])
    return turno


@turnos_router.post("/{turno_id}/completar", response_model=TurnoOut)
def completar_turno(
    turno_id: int, 
    db: Session = Depends(get_db), 
    user = Depends(get_current_user), 
    scope: str = Depends(require_permission("turnos.completar"))
):
    turno = aplicar_evento_turno(db, turno_id, EVENTO_COMPLETAR, user=user, scope=scope)
    db.refresh(turno, attribute_names=["estado"])
    return turno


@turnos_router.post("/{turno_id}/no_asistio", response_model=TurnoOut)
def marcar_no_asistio(
    turno_id: int, 
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
    scope: str = Depends(require_permission("turnos.no_asistio"))
):
    turno = aplicar_evento_turno(db, turno_id, EVENTO_NO_ASISTIO, user=user, scope=scope)
    db.refresh(turno, attribute_names=["estado"])
    return turno