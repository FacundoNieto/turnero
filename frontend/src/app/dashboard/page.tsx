"use client"

import React from 'react'
import { getTurnos } from '../../services/api'

type Turno = {
  id: number
  fecha: string // ISO
  hora_inicio: string // HH:mm
  duracion_min: number
  estado_codigo: 'RESERVADO' | 'CONFIRMADO' | 'CANCELADO' | 'NO_ASISTIO' | 'COMPLETADO'
  estado_descripcion: string
  titulo?: string
  cliente?: string
}

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const
const TIME_START = 12
const TIME_END = 23
const INTERVAL_MIN = 15
const INTERVAL_COUNT = ((TIME_END - TIME_START) * 60) / INTERVAL_MIN
const DAY_MINUTES = (TIME_END - TIME_START) * 60

const EVENT_COLORS: Record<Turno['estado_codigo'], string> = {
  RESERVADO: 'bg-yellow-400/90 text-black border-yellow-600',
  CONFIRMADO: 'bg-blue-500/90 text-white border-blue-700',
  CANCELADO: 'bg-gray-400/90 text-white border-gray-600',
  NO_ASISTIO: 'bg-orange-500/90 text-white border-orange-700',
  COMPLETADO: 'bg-green-600/90 text-white border-green-800',
}

function isTurnoActivo(estado_codigo: Turno['estado_codigo']) {
  return estado_codigo === 'RESERVADO' || estado_codigo === 'CONFIRMADO'
}

function getMonday(date: Date) {
  const result = new Date(date)
  const day = result.getDay()
  const diff = (day + 6) % 7
  result.setDate(result.getDate() - diff)
  result.setHours(0, 0, 0, 0)
  return result
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(date)
}

function formatWeekRange(start: Date) {
  const end = addDays(start, 5)
  return `${formatShortDate(start)} - ${formatShortDate(end)}`
}

function parseMinutes(time: string) {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

function formatDateISO(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getDayIndex(weekStart: Date, fecha: string) {
  const dayDate = new Date(`${fecha}T00:00:00`)
  const diff = Math.floor((dayDate.getTime() - weekStart.getTime()) / 86400000)
  return diff
}

function buildDayLayout(turnos: Turno[], weekStart: Date) {
  const dayBuckets: Array<Array<PositionedTurno>> = Array.from({ length: 6 }, () => [])

  const eventItems = turnos
    .map((turno) => {
      const dayIndex = getDayIndex(weekStart, turno.fecha)
      if (dayIndex < 0 || dayIndex >= 6) return null
      const startMin = parseMinutes(turno.hora_inicio)
      return {
        ...turno,
        dayIndex,
        startMin,
        endMin: startMin + turno.duracion_min,
        column: 0,
        columns: 1,
      }
    })
    .filter(Boolean) as PositionedTurno[]

  for (let day = 0; day < 6; day += 1) {
    const dayEvents = eventItems.filter((item) => item.dayIndex === day)
    dayEvents.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)
    let cluster: PositionedTurno[] = []
    let clusterEnd = 0

    const flushCluster = () => {
      if (!cluster.length) return
      const lanes: number[] = []
      cluster.forEach((event) => {
        let laneIndex = lanes.findIndex((end) => end <= event.startMin)
        if (laneIndex === -1) {
          laneIndex = lanes.length
          lanes.push(event.endMin)
        } else {
          lanes[laneIndex] = event.endMin
        }
        event.column = laneIndex
      })
      const totalColumns = lanes.length || 1
      cluster.forEach((event) => {
        event.columns = totalColumns
      })
      cluster = []
      clusterEnd = 0
    }

    dayEvents.forEach((event) => {
      if (cluster.length === 0 || event.startMin < clusterEnd) {
        cluster.push(event)
        clusterEnd = Math.max(clusterEnd, event.endMin)
      } else {
        flushCluster()
        cluster.push(event)
        clusterEnd = event.endMin
      }
    })
    flushCluster()
    dayBuckets[day] = dayEvents
  }

  return dayBuckets
}

type PositionedTurno = Turno & {
  dayIndex: number
  startMin: number
  endMin: number
  column: number
  columns: number
}

function TimeColumn() {
  return (
    <div className="relative h-full border-r border-slate-200 bg-slate-50">
      {Array.from({ length: INTERVAL_COUNT }).map((_, idx) => (
        <div
          key={idx}
          className="absolute left-0 right-0 border-t border-slate-200"
          style={{ top: `${(idx / INTERVAL_COUNT) * 100}%` }}
        />
      ))}
      {Array.from({ length: TIME_END - TIME_START + 1 }).map((_, idx) => {
        const hour = TIME_START + idx
        return (
          <div
            key={hour}
            className="absolute left-2 text-[11px] text-slate-600"
            style={{ top: `${((hour - TIME_START) * 60 / DAY_MINUTES) * 100}%`, transform: 'translateY(-50%)' }}
          >
            {String(hour).padStart(2, '0')}:00
          </div>
        )
      })}
    </div>
  )
}

function EventBlock({ turno, onSelect }: { turno: PositionedTurno; onSelect: (turno: Turno) => void }) {
  const top = ((turno.startMin - TIME_START * 60) / DAY_MINUTES) * 100
  const height = (turno.duracion_min / DAY_MINUTES) * 100
  const safeHeight = Math.max(height, 2)
  const safeTop = Math.max(0, Math.min(top, 100))
  const width = `calc(${100 / turno.columns}% - 0.75rem)`
  const left = `calc(${(turno.column * 100) / turno.columns}% + 0.375rem)`

  console.log({
    fecha: turno.fecha,
    hora_inicio: turno.hora_inicio,
    startMin: turno.startMin,
    TIME_START_MIN: TIME_START * 60,
    TIME_END_MIN: TIME_END * 60,
    top,
    safeTop,
    height,
    safeHeight,
  })

  if (turno.startMin < TIME_START * 60 || turno.startMin > TIME_END * 60) {
    console.warn('Turno fuera de rango visible:', turno)
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(turno)}
      className={`group absolute left-0 rounded-xl px-2 py-1 text-left text-xs shadow-sm transition hover:scale-[1.01] focus:outline-none z-50 ${EVENT_COLORS[turno.estado_codigo]}`}
      style={{ top: `${safeTop}%`, height: `${safeHeight}%`, width, left }}
      title={`${turno.titulo ?? 'Turno'} · ${turno.hora_inicio} · ${turno.estado_descripcion}`}
    >
      <div className="font-semibold truncate">{turno.titulo ?? 'Turno'}</div>
      <div className="text-[11px] opacity-90">
        {turno.hora_inicio} · {turno.duracion_min} min
      </div>
      <div className="mt-1 text-[10px] opacity-80">{turno.cliente ?? 'Sin paciente'}</div>
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition group-hover:opacity-100">
        <div className="absolute inset-0 bg-black/10 rounded-xl" />
      </div>
    </button>
  )
}

function DayColumn({ date, dayName, turnos, onSelect }: { date: Date; dayName: string; turnos: PositionedTurno[]; onSelect: (turno: Turno) => void }) {
  return (
    <div className="relative h-full border-r border-slate-200 bg-white">
      <div className="relative h-full">
        {Array.from({ length: INTERVAL_COUNT }).map((_, idx) => (
          <div
            key={idx}
            className="absolute left-0 right-0 border-t border-slate-200"
            style={{ top: `${(idx / INTERVAL_COUNT) * 100}%` }}
          />
        ))}
        {turnos.map((turno) => (
          <EventBlock key={turno.id} turno={turno} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [weekStart, setWeekStart] = React.useState(() => getMonday(new Date()))
  const [selectedTurno, setSelectedTurno] = React.useState<Turno | null>(null)
  const [now, setNow] = React.useState(() => new Date())
  const [turnos, setTurnos] = React.useState<Turno[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  React.useEffect(() => {
    let isMounted = true
    const fetchTurnos = async () => {
      setLoading(true)
      setError(null)
      const desde = new Date(weekStart)
      desde.setHours(0, 0, 0, 0)
      const hasta = new Date(addDays(weekStart, 5))
      hasta.setHours(23, 59, 0, 0)

      try {
        const data = await getTurnos({ desde, hasta })
        console.log('TURNOS MAPEADOS:', data)
        if (!isMounted) return
        setTurnos(data)
      } catch (err: any) {
        if (!isMounted) return
        setError(err?.message || 'Error cargando turnos')
        setTurnos([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchTurnos()
    return () => {
      isMounted = false
    }
  }, [weekStart])

  const weekDates = React.useMemo(
    () => Array.from({ length: 6 }, (_, idx) => addDays(weekStart, idx)),
    [weekStart],
  )

  React.useEffect(() => {
    if (turnos.length === 0) return
    console.log('TURNOS MAPEADOS:', turnos)
    turnos.forEach((turno) => {
      if (!turno.duracion_min || turno.duracion_min < 5) {
        console.warn('Turno inválido:', turno)
      }
    })
  }, [turnos])

  const dayLayouts = React.useMemo(() => buildDayLayout(turnos, weekStart), [turnos, weekStart])

  const currentTop = React.useMemo(() => {
    const todayIndex = getDayIndex(weekStart, formatDateISO(now))
    if (todayIndex < 0 || todayIndex >= 6) return null
    const minutes = now.getHours() * 60 + now.getMinutes()
    if (minutes < TIME_START * 60 || minutes > TIME_END * 60) return null
    return ((minutes - TIME_START * 60) / DAY_MINUTES) * 100
  }, [now, weekStart])

  return (
    <div className="space-y-6 px-4 py-6 text-slate-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Dashboard de turnos</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Vista semanal</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekStart((prev) => addDays(prev, -7))}
            className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ← Semana anterior
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(getMonday(new Date()))}
            className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((prev) => addDays(prev, 7))}
            className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Semana siguiente →
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-500">Semana seleccionada</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{formatWeekRange(weekStart)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 shadow-sm">
          <p className="font-semibold text-slate-800">Turnos en la semana</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{turnos.length}</p>
        </div>
      </div>

      {(loading || error || (!loading && !error && turnos.length === 0)) && (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 shadow-sm">
          {loading && <p className="font-medium text-slate-900">Cargando turnos...</p>}
          {error && <p className="font-medium text-rose-700">{error}</p>}
          {!loading && !error && turnos.length === 0 && (
            <p className="font-medium text-slate-900">No hay turnos disponibles para esta semana.</p>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid min-w-[960px] grid-cols-[96px_repeat(6,minmax(0,1fr))]">
          <div className="border-b border-r border-slate-200 bg-slate-50" />
          {weekDates.map((date, index) => (
            <div key={index} className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{WEEK_DAYS[index]}</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{formatShortDate(date)}</div>
            </div>
          ))}
        </div>

        <div className="relative">
          {currentTop !== null && (
            <div
              className="pointer-events-none absolute left-[96px] right-0 z-10 h-px bg-red-500"
              style={{ top: `${currentTop}%` }}
            />
          )}
          <div className="grid min-w-[960px] grid-cols-[96px_repeat(6,minmax(0,1fr))] h-[1536px]">
            <div className="relative">
              <TimeColumn />
            </div>
            {weekDates.map((date, index) => (
              <div key={index} className="relative h-full">
                <DayColumn date={date} dayName={WEEK_DAYS[index]} turnos={dayLayouts[index]} onSelect={setSelectedTurno} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedTurno && (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Detalle del turno</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">{selectedTurno.titulo ?? 'Turno seleccionado'}</h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTurno(null)}
              className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              Cerrar
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Día</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{formatShortDate(new Date(`${selectedTurno.fecha}T00:00:00`))}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Horario</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{selectedTurno.hora_inicio}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Duración</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{selectedTurno.duracion_min} min</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Estado</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{selectedTurno.estado_descripcion}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Paciente</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{selectedTurno.cliente ?? 'No disponible'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
