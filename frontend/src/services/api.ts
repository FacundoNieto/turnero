export type Turno = {
  id: number
  fecha: string
  hora_inicio: string
  duracion_min: number
  estado_codigo: 'RESERVADO' | 'CONFIRMADO' | 'CANCELADO' | 'NO_ASISTIO' | 'COMPLETADO'
  estado_descripcion: string
  titulo?: string
  cliente?: string
}

export type GetTurnosParams = {
  desde: Date
  hasta: Date
  profesional_id?: number
  paciente_id?: number
}

type BackendEstado = {
  codigo?: string
  descripcion?: string
} | null

type BackendTurno = {
  id: number
  fecha_hora_inicio: string
  fecha_hora_fin: string
  estado: BackendEstado
  paciente?: { nombre?: string }
  profesional?: { nombre?: string }
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  const storedToken = window.localStorage.getItem('access_token')
  if (storedToken) return storedToken

  const tokenCookie = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('access_token='))
  if (!tokenCookie) return null

  return tokenCookie.split('=')[1] || null
}

function mapEstado(estado: BackendEstado): { codigo: Turno['estado_codigo']; descripcion: string } {
  const codigo = estado?.codigo ?? 'RESERVADO'
  const descripcion = estado?.descripcion ?? 'Reservado'
  return { codigo: codigo as Turno['estado_codigo'], descripcion }
}

function formatTwoDigits(value: number) {
  return String(value).padStart(2, '0')
}

function getTimeFromISO(dateTime: string) {
  const date = new Date(dateTime)
  const time = date.getTime()
  if (Number.isNaN(time)) {
    throw new Error(`Fecha inválida en hora de inicio: ${dateTime}`)
  }
  const hours = date.getHours()
  const minutes = date.getMinutes()
  return `${formatTwoDigits(hours)}:${formatTwoDigits(minutes)}`
}

function getDateOnlyFromISO(dateTime: string) {
  const date = new Date(dateTime)
  const time = date.getTime()
  if (Number.isNaN(time)) {
    throw new Error(`Fecha inválida en fecha de turno: ${dateTime}`)
  }
  return `${date.getFullYear()}-${formatTwoDigits(date.getMonth() + 1)}-${formatTwoDigits(date.getDate())}`
}

function getDurationMinutes(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const startMs = startDate.getTime()
  const endMs = endDate.getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    throw new Error(`Fechas inválidas en duración: ${start} - ${end}`)
  }
  return Math.round((endMs - startMs) / 60000)
}

function mapTurno(backend: BackendTurno): Turno {
  const fecha = getDateOnlyFromISO(backend.fecha_hora_inicio)
  const hora_inicio = getTimeFromISO(backend.fecha_hora_inicio)
  const duracion_min = getDurationMinutes(backend.fecha_hora_inicio, backend.fecha_hora_fin)
  if (Number.isNaN(duracion_min)) {
    throw new Error(`Duración NaN en turno id=${backend.id}`)
  }
  if (duracion_min <= 0) {
    throw new Error(`Duración inválida en turno id=${backend.id}: ${duracion_min}`)
  }
  const estado = mapEstado(backend.estado)
  return {
    id: backend.id,
    fecha,
    hora_inicio,
    duracion_min,
    estado_codigo: estado.codigo,
    estado_descripcion: estado.descripcion,
    titulo: backend.profesional ? `Turno con ${backend.profesional.nombre ?? 'profesional'}` : 'Turno',
    cliente: backend.paciente?.nombre,
  }
}

export async function getTurnos(params: GetTurnosParams): Promise<Turno[]> {
  const query = new URLSearchParams({
    desde: params.desde.toISOString(),
    hasta: params.hasta.toISOString(),
  })

  if (params.profesional_id) query.append('profesional_id', String(params.profesional_id))
  if (params.paciente_id) query.append('paciente_id', String(params.paciente_id))

  const token = getAuthToken()
  const headers: Record<string, string> = {}

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`/api/turnos?${query.toString()}`, {
    method: 'GET',
    credentials: 'include',
    headers,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Error fetching turnos (${res.status})`)
  }

  const data = (await res.json()) as BackendTurno[]
  console.log('TURNOS RAW:', data)

  const mappedTurnos = data.map(mapTurno)
  console.log('TURNOS MAPEADOS:', mappedTurnos)

  const validTurnos = mappedTurnos.filter((turno) => {
    if (!turno.duracion_min || turno.duracion_min < 5) {
      console.warn('Turno inválido descartado:', turno)
      return false
    }
    return true
  })

  return validTurnos
}
