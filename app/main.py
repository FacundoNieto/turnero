from fastapi import FastAPI
from app.api.turnos_router import turnos_router
from app.api.pacientes_router import paciente_router
from app.api.profesionales_router import profesionales_router
from app.api.bloqueos_agenda_router import bloqueos_agenda_router
from app.api.estados_turno_router import estados_turno_router

from apscheduler.schedulers.background import BackgroundScheduler
from app.scheduler import _procesar_turnos_sistema
scheduler = BackgroundScheduler()

from app.notificaciones_scheduler import procesar_notificaciones

from app.api.auth_router import router as auth_router
from app.api.usuarios_router import router as usuarios_router
from app.api.roles_router import router as roles_router
from app.api.permisos_router import router as permisos_router

app = FastAPI(title="Sistema de Gestión de Turnos")
app.include_router(turnos_router, prefix="/api")
app.include_router(paciente_router, prefix="/api")
app.include_router(profesionales_router, prefix="/api")
app.include_router(bloqueos_agenda_router, prefix="/api")
app.include_router(estados_turno_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(usuarios_router, prefix="/api")
app.include_router(roles_router, prefix="/api")
app.include_router(permisos_router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.on_event("startup")
def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(_procesar_turnos_sistema, "interval", seconds=60)
        scheduler.add_job(procesar_notificaciones, "interval", seconds=30)
        scheduler.start()


@app.on_event("shutdown")
def shutdown_scheduler():
    scheduler.shutdown()