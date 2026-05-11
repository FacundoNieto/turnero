"use client"
import React, { useState, useEffect, useRef} from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const TurnoSchema = z.object({
  paciente_id: z.coerce.number().int().positive(),
  profesional_id: z.coerce.number().int().positive(),
  fecha_hora_inicio: z.string(),
  fecha_hora_fin: z.string(),
})

// Schema auxiliar para capturar inputs del formulario
const TurnoFormSchema = z.object({
  paciente_id: z.string().optional(),
  profesional_id: z.string().optional(),
  dia: z.string().min(1, "Seleccioná un día"),
  hora: z.string().min(1, "Seleccioná una hora"),
  duracion: z.string().min(1, "Seleccioná una duración"),
})

// Duraciones disponibles en minutos
const DURACIONES_DISPONIBLES = [
  { label: '40 minutos', valor: 40 },
  { label: '60 minutos', valor: 60 },
  { label: '90 minutos', valor: 90 },
] as const

type FormValues = z.infer<typeof TurnoFormSchema>

type PersonMini = {
  id: number
  nombre: string
  telefono?: string
}

type Turno = {
  id: number
  paciente_id: number
  profesional_id: number
  paciente?: PersonMini
  profesional?: PersonMini
  estado?: { id: number; codigo?: string }
  fecha_hora_inicio: string
  fecha_hora_fin: string
}

// Action types & helpers
type TurnoEstado = { codigo?: string; nombre?: string } | string
type ActionKey = "confirmar" | "cancelar" | "completar" | "no_asistio"
interface ActionDef { key: ActionKey; label: string; endpoint: (id:number)=>string; needsConfirm?: boolean; confirmText?: string }

const ACTIONS: Record<ActionKey, ActionDef> = {
  confirmar: { key: 'confirmar', label: 'Confirmar', endpoint: (id)=>`/api/turnos/${id}/confirmar`, needsConfirm: true, confirmText: '¿Confirmás este turno?' },
  cancelar: { key: 'cancelar', label: 'Cancelar', endpoint: (id)=>`/api/turnos/${id}/cancelar`, needsConfirm: true, confirmText: '¿Confirmás cancelar este turno?' },
  completar: { key: 'completar', label: 'Completar', endpoint: (id)=>`/api/turnos/${id}/completar`, needsConfirm: true, confirmText: '¿Confirmás completar este turno?' },
  no_asistio: { key: 'no_asistio', label: 'No asistió', endpoint: (id)=>`/api/turnos/${id}/no_asistio`, needsConfirm: true, confirmText: 'Marcar como no asistió?' },
}

function safeGetEstadoCodigo(t: any): string | undefined {
  if (!t) return undefined
  const st = t.estado ?? t.estado_id ?? (t as any).estado
  if (!st) return undefined
  if (typeof st === 'string') return st
  if (typeof st === 'object') return st.codigo ?? (st as any).codigo
  return undefined
}

function getAllowedActions(t: any): ActionKey[] {
  const codigo = (safeGetEstadoCodigo(t) || '').toUpperCase()
  switch (codigo) {
    case 'RESERVADO': return ['confirmar','cancelar']
    case 'CONFIRMADO': return ['completar','no_asistio','cancelar']
    case 'COMPLETADO':
    case 'CANCELADO':
    case 'NO_ASISTIO':
      return []
    default:
      return []
  }
}

async function fetchTurnos({ queryKey }: any) {
  const [_key, filters] = queryKey as [string, any]
  const params = new URLSearchParams()
  if (filters) {
    if (filters.paciente_nombre) params.append('paciente_nombre', filters.paciente_nombre)
    if (filters.profesional_nombre) params.append('profesional_nombre', filters.profesional_nombre)
    if (filters.estado) params.append('estado', filters.estado)
    if (filters.desde) {
      try { params.append('desde', new Date(filters.desde).toISOString()) } catch {}
    }
    if (filters.hasta) {
      try { params.append('hasta', new Date(filters.hasta).toISOString()) } catch {}
    }
    if (filters.solo_activos) params.append('solo_activos', 'true')
  }
  const url = '/api/turnos' + (params.toString() ? `?${params.toString()}` : '')
  const res = await fetch(url, { method: 'GET', credentials: 'include' })
  if (res.status === 401 || res.status === 403) throw { status: res.status }
  if (!res.ok) throw new Error('Error fetching turnos')
  return res.json()
}

async function createTurno(payload: z.infer<typeof TurnoSchema>) {
  const res = await fetch('/api/turnos', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (res.status === 401 || res.status === 403) throw { status: res.status }
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.detail || 'Error creating turno')
  }
  return res.json()
}

export default function TurnosPage() {
  const router = useRouter()
  const qc = useQueryClient()

  type FilterValues = {
    paciente_nombre?: string
    profesional_nombre?: string
    desde?: string
    hasta?: string
    estado?: string
    solo_activos?: boolean
  }

  const [filters, setFilters] = React.useState<FilterValues>({ estado: 'RESERVADO' })
  const [openFilter, setOpenFilter] = React.useState<string | null>(null)
  const [tempValue, setTempValue] = React.useState<string>('')

  const mapColToKey = (col: string) => {
    switch (col) {
      case 'paciente':
        return 'paciente_nombre'
      case 'profesional':
        return 'profesional_nombre'
      case 'estado':
        return 'estado'
      case 'inicio':
        return 'desde'
      case 'fin':
        return 'hasta'
      default:
        return col
    }
  }

  const openColumnFilter = (col: string) => {
    const key = mapColToKey(col)
    setTempValue((filters as any)[key] ?? '')
    setOpenFilter(col)
  }

  const applyColumnFilter = (col: string) => {
    const key = mapColToKey(col)
    setFilters((prev) => ({ ...prev, [key]: tempValue || undefined }))
    setOpenFilter(null)
  }

  const clearColumnFilter = (col: string) => {
    const key = mapColToKey(col)
    setFilters((prev) => {
      const copy = { ...prev } as any
      delete copy[key]
      return copy
    })
    setOpenFilter(null)
  }

  const { data, isLoading, isError } = useQuery(['turnos', filters], fetchTurnos, {
    retry: false,
  })

  const [estadosList, setEstadosList] = React.useState<Array<{ id: number; codigo: string; descripcion: string }>>([])
  const [estadosLoading, setEstadosLoading] = React.useState(false)
  const [estadosError, setEstadosError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (openFilter !== 'estado') return
    let mounted = true
    setEstadosLoading(true)
    fetch('/api/estados_turno', { method: 'GET', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Error fetching estados')
        const j = await res.json()
        if (!mounted) return
        setEstadosList(j)
        setEstadosError(null)
      })
      .catch((e) => {
        if (!mounted) return
        setEstadosError(String(e))
      })
      .finally(() => { if (mounted) setEstadosLoading(false) })
    return () => { mounted = false }
  }, [openFilter])

  const mutation = useMutation(createTurno, {
    onSuccess: () => qc.invalidateQueries(['turnos']),
    onError: (err: any) => {
      if (err && err.status && (err.status === 401 || err.status === 403)) {
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).finally(() => router.push('/login'))
      }
    },
  })

  const { register, handleSubmit, reset, watch, getValues, setValue } = useForm<FormValues>()

  const horaValue = watch('hora')
  const { register: registerFilter, handleSubmit: handleFilterSubmit, reset: resetFilters } = useForm()

  const clearFilterByKey = (key: string) => {
    setFilters((prev) => {
      const copy = { ...prev } as any
      delete copy[key]
      return copy
    })
  }

  const clearAllFilters = () => setFilters({})

  // autocomplete state for pacientes/profesionales
  const [pacientesList, setPacientesList] = React.useState<Array<{ id: number; nombre: string; dni?: string }>>([])
  const [profesionalesList, setProfesionalesList] = React.useState<Array<{ id: number; nombre: string }>>([])
  const [pacienteQuery, setPacienteQuery] = React.useState('')
  const [profesionalQuery, setProfesionalQuery] = React.useState('')
  const [pacienteSelected, setPacienteSelected] = React.useState<{ id: number; nombre: string; dni?: string } | null>(null)
  const [profesionalSelected, setProfesionalSelected] = React.useState<{ id: number; nombre: string } | null>(null)
  const [openList, setOpenList] = React.useState<string | null>(null)
  const [pacientePage, setPacientePage] = React.useState(1)
  const [profesionalPage, setProfesionalPage] = React.useState(1)
  const ITEMS_PER_PAGE = 5
  const [showPacienteSuggestions, setShowPacienteSuggestions] = React.useState(false)
  const [showProfesionalSuggestions, setShowProfesionalSuggestions] = React.useState(false)
  // pagination for turnos listing
  const [turnoPage, setTurnoPage] = React.useState(1)
  const PAGE_SIZE = 10

  // actions UI state
  const [openActionId, setOpenActionId] = React.useState<number | null>(null)
  const [loadingActionId, setLoadingActionId] = React.useState<number | null>(null)

  // try to get current user / permissions from cache if available
  const me = qc.getQueryData(['me']) as any | undefined

  async function performAction(turno: any, actionKey: ActionKey) {
    const action = ACTIONS[actionKey]
    if (!action) return

    // permissions check (if me exists and has permissions array)
    if (me && Array.isArray(me.permissions)) {
      const permName = `turnos.${actionKey}`
      if (!me.permissions.includes(permName)) {
        alert('No tenés permiso para realizar esta acción')
        return
      }
    }

    if (action.needsConfirm) {
      const ok = window.confirm(action.confirmText || 'Confirmar?')
      if (!ok) return
    }

    try {
      setLoadingActionId(turno.id)
      setOpenActionId(null)
      const res = await fetch(action.endpoint(turno.id), { method: 'POST', credentials: 'include' })
      if (res.status === 401 || res.status === 403) {
        // force logout and redirect
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).finally(() => router.push('/login'))
        return
      }
      if (!res.ok) {
        const j = await res.json().catch(()=>({ detail: 'Error' }))
        throw new Error(j.detail || 'Error ejecutando acción')
      }
      const updated = await res.json()
      // update only the affected turno in cache
      qc.setQueryData(['turnos', filters], (old: any) => {
        if (!old) return old
        return old.map((it: any) => it.id === updated.id ? updated : it)
      })
    } catch (e: any) {
      alert(String(e?.message || e))
    } finally {
      setLoadingActionId(null)
    }
  }

  React.useEffect(() => {
    // fetch pacientes and profesionales lists once (simple approach)
    fetch('/api/pacientes', { credentials: 'include' }).then(async (res) => {
      if (!res.ok) return
      const j = await res.json()
      setPacientesList(j.map((p: any) => ({ id: p.id, nombre: p.nombre, dni: p.dni })))
    }).catch(() => {})
    fetch('/api/profesionales', { credentials: 'include' }).then(async (res) => {
      if (!res.ok) return
      const j = await res.json()
      setProfesionalesList(j.map((p: any) => ({ id: p.id, nombre: p.nombre })))
    }).catch(() => {})
  }, [])

  // close popups when clicking outside
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      const insidePacientePopup = !!target.closest('[data-popup="paciente"]')
      const insideProfesionalPopup = !!target.closest('[data-popup="profesional"]')
      const insideFilterPopup = !!target.closest('[data-filter]')
      const insideActionsPopup = !!target.closest('[data-actions]')
      const insideSuggestions = !!target.closest('.z-40') // suggestion dropdowns have z-40

      if (!insidePacientePopup && openList === 'paciente') setOpenList(null)
      if (!insideProfesionalPopup && openList === 'profesional') setOpenList(null)
      if (!insideFilterPopup && openFilter !== null) setOpenFilter(null)
      if (!insideActionsPopup && openActionId !== null) setOpenActionId(null)

      // hide inline suggestions if click outside suggestions or inputs
      if (!insideSuggestions) {
        setShowPacienteSuggestions(false)
        setShowProfesionalSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [openList, openFilter])

  // reset listing page when filters change
  React.useEffect(() => {
    setTurnoPage(1)
  }, [filters])

  const onSubmit = (vals: any) => {
    try {
      const formValues = getValues()
      
      // Validar que Día, Hora y Duración estén presentes
      if (!formValues.dia || !formValues.hora || !formValues.duracion) {
        return alert('Completá todos los campos de fecha y duración')
      }

      // Combinar Día + Hora para obtener fecha_hora_inicio
      const inicio = new Date(`${formValues.dia}T${formValues.hora}`)
      if (isNaN(inicio.getTime())) {
        return alert('Día u Hora inválidos')
      }

      // Calcular fecha_hora_fin = inicio + duración
      const duracionMinutos = parseInt(formValues.duracion, 10)
      const fin = new Date(inicio.getTime() + duracionMinutos * 60000)

      // Resolver paciente/profesional
      let finalPaciente = pacienteSelected
      let finalProfesional = profesionalSelected
      if (!finalPaciente && pacienteQuery) {
        const exact = pacientesList.find(p => p.nombre.toLowerCase() === pacienteQuery.toLowerCase())
        finalPaciente = exact ?? pacientesList.find(p => p.nombre.toLowerCase().includes(pacienteQuery.toLowerCase())) ?? null
      }
      if (!finalProfesional && profesionalQuery) {
        const exactP = profesionalesList.find(p => p.nombre.toLowerCase() === profesionalQuery.toLowerCase())
        finalProfesional = exactP ?? profesionalesList.find(p => p.nombre.toLowerCase().includes(profesionalQuery.toLowerCase())) ?? null
      }

      if (!finalPaciente) return alert('Seleccioná un paciente válido')
      if (!finalProfesional) return alert('Seleccioná un profesional válido')

      // Construir payload con las fechas calculadas (ISO 8601)
      const payload = {
        paciente_id: finalPaciente.id,
        profesional_id: finalProfesional.id,
        fecha_hora_inicio: inicio.toISOString(),
        fecha_hora_fin: fin.toISOString(),
      }

      // Validar schema
      const parsed = TurnoSchema.parse(payload)
      mutation.mutate(parsed)
      
      // Reset
      reset()
      setPacienteSelected(null)
      setProfesionalSelected(null)
      setPacienteQuery('')
      setProfesionalQuery('')
    } catch (e: any) {
      alert(e.errors ? e.errors.map((x: any) => x.message).join('\n') : e.message)
    }
  }

  // TimePickerCustom component
  const TimePickerCustom = ({ value, onChange }: { value?: string; onChange: (val: string) => void }) => {
    const [hour, setHour] = useState(0)
    const [minute, setMinute] = useState(0)
    const [open, setOpen] = useState(false)
    const [inputValue, setInputValue] = useState(value || '')
    const isInteractingRef = useRef(false)
    const containerRef = React.useRef<HTMLDivElement>(null)

    const validateTime = (timeStr: string): boolean => {
      const match = timeStr.match(/^(\d{1,2}):(\d{2})$/)
      if (!match) return false
      const h = parseInt(match[1], 10)
      const m = parseInt(match[2], 10)
      if (h < 0 || h > 23) return false
      if (![0, 10, 20, 30, 40, 50].includes(m)) return false
      return true
    }

    const parseTime = (timeStr: string) => {
      if (!validateTime(timeStr)) return
      const [h, m] = timeStr.split(':').map(Number)
      setHour(h)
      setMinute(m)
    }

    const formatTimeInput = (raw: string) => {
      let digits = raw.replace(/[^0-9]/g, '')
      if (digits.length > 4) digits = digits.slice(0, 4)
      
      if (digits.length === 0) return ''
      
      // 1 digit: validate H1 (0, 1, 2 only)
      if (digits.length === 1) {
        const h1 = parseInt(digits[0])
        return h1 <= 2 ? digits[0] : ''
      }
      
      // 2 digits: validate H1:H2
      if (digits.length === 2) {
        const h1 = parseInt(digits[0])
        const h2 = parseInt(digits[1])
        if (h1 > 2) return digits[0]
        if (h1 === 2 && h2 > 3) return digits[0]
        return digits
      }
      
      // 3 digits: HH:M1
      if (digits.length === 3) {
        const h1 = parseInt(digits[0])
        const h2 = parseInt(digits[1])
        const m1 = parseInt(digits[2])
        
        if (h1 > 2 || (h1 === 2 && h2 > 3)) return digits.slice(0, 2)
        if (m1 > 5) return digits.slice(0, 2)
        
        return `${digits.slice(0, 2)}:${digits[2]}`
      }
      
      // 4 digits: HH:MM
      if (digits.length === 4) {
        const h1 = parseInt(digits[0])
        const h2 = parseInt(digits[1])
        const m1 = parseInt(digits[2])
        
        if (h1 > 2 || (h1 === 2 && h2 > 3)) return digits.slice(0, 2)
        if (m1 > 5) return digits.slice(0, 2)
        
        return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`
      }
      
      return ''
    }

    useEffect(() => {
      if (value !== undefined && value !== inputValue) {
        setInputValue(value || '')
      }
    }, [value, inputValue])

    useEffect(() => {
      if (value && validateTime(value)) {
        parseTime(value)
      }
    }, [value])

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setOpen(false)
        }
      }
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatTimeInput(e.target.value)
      setInputValue(formatted)
      onChange(formatted)
      if (validateTime(formatted)) {
        parseTime(formatted)
      }
    }

    const handleSelect = (h: number, m: number) => {
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      setInputValue(timeStr)
      onChange(timeStr)
      parseTime(timeStr)
    }

    // const hours = Array.from({ length: 24 }, (_, i) => i)
    const hours = Array.from({ length: 17 }, (_, i) => i + 7)
    const minutes = [0, 10, 20, 30, 40, 50]

    return (
      <div ref={containerRef} className="relative w-full">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          className="w-full border p-2 rounded"
          placeholder="HH:mm"
        />
        {open && (
          <div onClick={(e) => e.stopPropagation()} className="absolute top-full left-0 right-0 z-50 bg-white border rounded shadow-lg mt-1 flex">
            <div className="flex-1 overflow-y-auto h-32 scroll-snap-y-mandatory">
              {hours.map((h) => (
                <div
                  key={h}
                  className={`p-2 text-center cursor-pointer hover:bg-gray-100 scroll-snap-align-center ${
                    h === hour ? 'bg-blue-100 font-semibold' : ''
                  }`}
                  onClick={() => handleSelect(h, minute)}
                >
                  {String(h).padStart(2, '0')}
                </div>
              ))}
            </div>
            <div className="w-px bg-gray-300"></div>
            <div className="flex-1 overflow-y-auto h-32 scroll-snap-y-mandatory">
              {minutes.map((m) => (
                <div
                  key={m}
                  className={`p-2 text-center cursor-pointer hover:bg-gray-100 scroll-snap-align-center ${
                    m === minute ? 'bg-blue-100 font-semibold' : ''
                  }`}
                  onClick={() => handleSelect(hour, m)}
                >
                  {String(m).padStart(2, '0')}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Turnos</h1>

      <section className="mb-6">
        <h2 className="font-semibold">Crear Turno</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-3 max-w-2xl mt-2">
          <div className="relative">
            <label className="block text-sm">Paciente (nombre)</label>
            <div className="flex items-center">
              <input type="text" value={pacienteSelected ? pacienteSelected.nombre : pacienteQuery} onChange={(e) => { setPacienteQuery(e.target.value); setPacienteSelected(null) }} onFocus={() => setShowPacienteSuggestions(true)} className="flex-1 border p-2 rounded" placeholder="Buscar paciente por nombre" />
              <button type="button" title="Ver todos los pacientes" onClick={() => { setOpenList('paciente'); setPacientePage(1) }} className="ml-2 p-2 text-gray-600 hover:text-gray-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="11" cy="11" r="7" strokeWidth="2" />
                  <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {pacienteQuery.length > 0 && !pacienteSelected && showPacienteSuggestions && (
              <div className="absolute z-40 bg-white border rounded mt-1 w-full max-h-48 overflow-auto">
                {pacientesList.filter(p => p.nombre.toLowerCase().includes(pacienteQuery.toLowerCase())).map(p => (
                      <div key={p.id} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => { setPacienteSelected(p); setPacienteQuery(p.nombre) }}>
                        {p.nombre} <span className="text-xs text-gray-500">{p.dni ?? '-'}</span>
                      </div>
                    ))}
              </div>
            )}
            

            {openList === 'paciente' && (
              <div data-popup="paciente" className="absolute z-50 bg-white border rounded p-3 shadow mt-2" style={{ minWidth: 320 }}>
                <div className="mb-2 font-medium">Pacientes (página {pacientePage})</div>
                <div className="max-h-48 overflow-auto">
                  {pacientesList.slice((pacientePage-1)*ITEMS_PER_PAGE, pacientePage*ITEMS_PER_PAGE).map(p => (
                    <div key={p.id} className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between" onClick={() => { setPacienteSelected(p); setPacienteQuery(p.nombre); setOpenList(null) }}>
                      <div>{p.nombre}</div>
                      <div className="text-xs text-gray-500">DNI: {p.dni ?? '-'}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between">
                  <button disabled={pacientePage <= 1} className="px-2 py-1 bg-gray-200 rounded" onClick={() => setPacientePage(p => Math.max(1, p-1))}>Anterior</button>
                  <div className="text-sm text-gray-600">{Math.max(1, Math.ceil(pacientesList.length / ITEMS_PER_PAGE))} páginas</div>
                  <button disabled={pacientePage >= Math.ceil(pacientesList.length / ITEMS_PER_PAGE)} className="px-2 py-1 bg-gray-200 rounded" onClick={() => setPacientePage(p => p + 1)}>Siguiente</button>
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <label className="block text-sm">Profesional (nombre)</label>
            <div className="flex items-center">
              <input type="text" value={profesionalSelected ? profesionalSelected.nombre : profesionalQuery} onChange={(e) => { setProfesionalQuery(e.target.value); setProfesionalSelected(null) }} onFocus={() => setShowProfesionalSuggestions(true)} className="flex-1 border p-2 rounded" placeholder="Buscar profesional por nombre" />
              <button type="button" title="Ver todos los profesionales" onClick={() => { setOpenList('profesional'); setProfesionalPage(1) }} className="ml-2 p-2 text-gray-600 hover:text-gray-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="11" cy="11" r="7" strokeWidth="2" />
                  <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {profesionalQuery.length > 0 && !profesionalSelected && showProfesionalSuggestions && (
              <div className="absolute z-40 bg-white border rounded mt-1 w-full max-h-48 overflow-auto">
                {profesionalesList.filter(p => p.nombre.toLowerCase().includes(profesionalQuery.toLowerCase())).map(p => (
                  <div key={p.id} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => { setProfesionalSelected(p); setProfesionalQuery(p.nombre) }}>
                    {p.nombre} <span className="text-xs text-gray-500">#{p.id}</span>
                  </div>
                ))}
              </div>
            )}

            {openList === 'profesional' && (
              <div data-popup="profesional" className="absolute z-50 bg-white border rounded p-3 shadow mt-2" style={{ minWidth: 320 }}>
                <div className="mb-2 font-medium">Profesionales (página {profesionalPage})</div>
                <div className="max-h-48 overflow-auto">
                  {profesionalesList.slice((profesionalPage-1)*ITEMS_PER_PAGE, profesionalPage*ITEMS_PER_PAGE).map(p => (
                    <div key={p.id} className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between" onClick={() => { setProfesionalSelected(p); setProfesionalQuery(p.nombre); setOpenList(null) }}>
                      <div>{p.nombre}</div>
                      <div className="text-xs text-gray-500">#{p.id}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between">
                  <button disabled={profesionalPage <= 1} className="px-2 py-1 bg-gray-200 rounded" onClick={() => setProfesionalPage(p => Math.max(1, p-1))}>Anterior</button>
                  <div className="text-sm text-gray-600">{Math.max(1, Math.ceil(profesionalesList.length / ITEMS_PER_PAGE))} páginas</div>
                  <button disabled={profesionalPage >= Math.ceil(profesionalesList.length / ITEMS_PER_PAGE)} className="px-2 py-1 bg-gray-200 rounded" onClick={() => setProfesionalPage(p => p + 1)}>Siguiente</button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm">Día</label>
            <input type="date" {...register('dia')} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm">Hora</label>
            <input type="time" {...register('hora')} className="w-full border p-2 rounded"/>
            {/* <TimePickerCustom
              value={horaValue}
              onChange={(val) => setValue('hora', val)}
            /> */}
          </div>
          <div>
            <label className="block text-sm">Duración</label>
            <select {...register('duracion')} className="w-full border p-2 rounded">
              <option value="">Seleccioná duración</option>
              {DURACIONES_DISPONIBLES.map(d => (
                <option key={d.valor} value={String(d.valor)}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <button className="bg-green-600 text-white px-4 py-2 rounded" type="submit">Crear Turno</button>
          </div>
        </form>
      </section>

      

      <section>
        <h2 className="font-semibold mb-2">Listado</h2>
        {/* Active filters summary */}
        {Object.values(filters).some(v => v !== undefined && v !== null && v !== '') && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {Object.entries(filters).filter(([k, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => {
              const label = k === 'paciente_nombre' ? 'Paciente'
                : k === 'profesional_nombre' ? 'Profesional'
                : k === 'estado' ? 'Estado'
                : k === 'desde' ? 'Desde'
                : k === 'hasta' ? 'Hasta'
                : k === 'solo_activos' ? 'Solo activos' : k
              const display = (k === 'desde' || k === 'hasta') ? (() => {
                try { return new Date(String(v)).toLocaleString() } catch { return String(v) }
              })() : String(v)
              return (
                <div key={k} className="flex items-center bg-gray-100 border rounded px-2 py-1 text-sm">
                  <span className="font-medium mr-2">{label}:</span>
                  <span className="mr-2 text-gray-700">{display}</span>
                  <button title="Quitar filtro" onClick={() => clearFilterByKey(k)} className="text-gray-500 hover:text-gray-800">✕</button>
                </div>
              )
            })}
            <button onClick={clearAllFilters} className="ml-2 px-2 py-1 text-sm bg-red-100 text-red-700 rounded">Limpiar filtros</button>
          </div>
        )}
        {isLoading && <div>Cargando...</div>}
        {isError && <div className="text-red-600">Error al cargar turnos</div>}
        {data && data.length === 0 && !isLoading && (
          <div className="text-gray-600">No se encontraron turnos con los filtros aplicados.</div>
        )}
        {data && data.length > 0 && (() => {
          const total = data.length
          const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
          const start = total === 0 ? 0 : (turnoPage - 1) * PAGE_SIZE + 1
          const end = Math.min(turnoPage * PAGE_SIZE, total)
          const paginated = data.slice((turnoPage - 1) * PAGE_SIZE, turnoPage * PAGE_SIZE)
          return (
            <>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm text-gray-600">Mostrando {start}-{end} de {total}</div>
                <div className="flex items-center gap-2">
                  <button disabled={turnoPage <= 1} onClick={() => setTurnoPage(p => Math.max(1, p - 1))} className="px-2 py-1 bg-gray-200 rounded">Anterior</button>
                  <div className="text-sm">Página {turnoPage} / {totalPages}</div>
                  <button disabled={turnoPage >= totalPages} onClick={() => setTurnoPage(p => Math.min(totalPages, p + 1))} className="px-2 py-1 bg-gray-200 rounded">Siguiente</button>
                </div>
              </div>
              <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="text-left">
                <th className="border p-2">ID</th>
                <th className="border p-2 relative">Paciente
                  <button onClick={() => openColumnFilter('paciente')} title="Filtrar paciente" className="ml-2 text-gray-500 hover:text-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-.293.707L14 14.414V19a1 1 0 0 1-.553.894l-4 2A1 1 0 0 1 8 21v-6.586L3.293 6.707A1 1 0 0 1 3 6V4z" />
                    </svg>
                  </button>
                  {openFilter === 'paciente' && (
                    <div data-filter="paciente" className="absolute z-50 bg-white border rounded p-3 shadow mt-2" style={{ minWidth: 220 }}>
                      <div className="mb-2 text-sm font-medium">Filtrar Paciente (nombre)</div>
                      <input className="w-full border p-1 rounded mb-2" value={tempValue} onChange={(e) => setTempValue(e.target.value)} placeholder="Nombre o parte" />
                      <div className="flex gap-2 justify-end">
                        <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => clearColumnFilter('paciente')}>Limpiar</button>
                        <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={() => applyColumnFilter('paciente')}>Aplicar</button>
                      </div>
                    </div>
                  )}
                </th>
                <th className="border p-2 relative">Profesional
                  <button onClick={() => openColumnFilter('profesional')} title="Filtrar profesional" className="ml-2 text-gray-500 hover:text-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-.293.707L14 14.414V19a1 1 0 0 1-.553.894l-4 2A1 1 0 0 1 8 21v-6.586L3.293 6.707A1 1 0 0 1 3 6V4z" />
                    </svg>
                  </button>
                  {openFilter === 'profesional' && (
                    <div data-filter="profesional" className="absolute z-50 bg-white border rounded p-3 shadow mt-2" style={{ minWidth: 220 }}>
                      <div className="mb-2 text-sm font-medium">Filtrar Profesional (nombre)</div>
                      <input className="w-full border p-1 rounded mb-2" value={tempValue} onChange={(e) => setTempValue(e.target.value)} placeholder="Nombre o parte" />
                      <div className="flex gap-2 justify-end">
                        <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => clearColumnFilter('profesional')}>Limpiar</button>
                        <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={() => applyColumnFilter('profesional')}>Aplicar</button>
                      </div>
                    </div>
                  )}
                </th>
                <th className="border p-2 relative">Estado
                  <button onClick={() => openColumnFilter('estado')} title="Filtrar estado" className="ml-2 text-gray-500 hover:text-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-.293.707L14 14.414V19a1 1 0 0 1-.553.894l-4 2A1 1 0 0 1 8 21v-6.586L3.293 6.707A1 1 0 0 1 3 6V4z" />
                    </svg>
                  </button>
                  {openFilter === 'estado' && (
                    <div data-filter="estado" className="absolute z-50 bg-white border rounded p-3 shadow mt-2" style={{ minWidth: 220 }}>
                      <div className="mb-2 text-sm font-medium">Filtrar por Estado</div>
                      {estadosLoading && <div className="text-sm">Cargando estados...</div>}
                      {estadosError && <div className="text-sm text-red-600">Error cargando estados</div>}
                      {!estadosLoading && !estadosError && (
                        <div className="max-h-60 overflow-auto">
                          {estadosList.map((e) => (
                            <div key={e.id} className="flex items-center justify-between py-1 px-2 hover:bg-gray-100 cursor-pointer" onClick={() => { setFilters((prev) => ({ ...prev, estado: e.codigo })); setOpenFilter(null) }}>
                              <div>
                                <div className="text-sm font-medium">{e.codigo}</div>
                                <div className="text-xs text-gray-600">{e.descripcion}</div>
                              </div>
                              <div className="text-xs text-gray-500">Seleccionar</div>
                            </div>
                          ))}
                          <div className="mt-2 flex gap-2 justify-end">
                            <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => clearColumnFilter('estado')}>Limpiar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </th>
                <th className="border p-2 relative">Inicio
                  <button onClick={() => openColumnFilter('inicio')} title="Filtrar inicio" className="ml-2 text-gray-500 hover:text-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-.293.707L14 14.414V19a1 1 0 0 1-.553.894l-4 2A1 1 0 0 1 8 21v-6.586L3.293 6.707A1 1 0 0 1 3 6V4z" />
                    </svg>
                  </button>
                  {openFilter === 'inicio' && (
                    <div data-filter="inicio" className="absolute z-50 bg-white border rounded p-3 shadow mt-2" style={{ minWidth: 240 }}>
                      <div className="mb-2 text-sm font-medium">Filtrar Fecha Inicio (desde)</div>
                      <input type="datetime-local" className="w-full border p-1 rounded mb-2" value={tempValue} onChange={(e) => setTempValue(e.target.value)} />
                      <div className="flex gap-2 justify-end">
                        <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => clearColumnFilter('inicio')}>Limpiar</button>
                        <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={() => applyColumnFilter('inicio')}>Aplicar</button>
                      </div>
                    </div>
                  )}
                </th>
                <th className="border p-2 relative">Fin
                  <button onClick={() => openColumnFilter('fin')} title="Filtrar fin" className="ml-2 text-gray-500 hover:text-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-.293.707L14 14.414V19a1 1 0 0 1-.553.894l-4 2A1 1 0 0 1 8 21v-6.586L3.293 6.707A1 1 0 0 1 3 6V4z" />
                    </svg>
                  </button>
                  {openFilter === 'fin' && (
                    <div data-filter="fin" className="absolute z-50 bg-white border rounded p-3 shadow mt-2" style={{ minWidth: 240 }}>
                      <div className="mb-2 text-sm font-medium">Filtrar Fecha Fin (hasta)</div>
                      <input type="datetime-local" className="w-full border p-1 rounded mb-2" value={tempValue} onChange={(e) => setTempValue(e.target.value)} />
                      <div className="flex gap-2 justify-end">
                        <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => clearColumnFilter('fin')}>Limpiar</button>
                        <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={() => applyColumnFilter('fin')}>Aplicar</button>
                      </div>
                    </div>
                  )}
                </th>
                <th className="border p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((t: any) => (
                <tr key={t.id}>
                  <td className="border p-2">{t.id}</td>
                  <td className="border p-2">
                    {t.paciente ? (
                      <div>
                        <div className="font-medium">{t.paciente.nombre}</div>
                        <div className="text-xs text-gray-500">DNI: {t.paciente.dni ?? '-'} · CUIL: {t.paciente.cuil ?? '-'}</div>
                      </div>
                    ) : t.paciente_id}
                  </td>
                  <td className="border p-2">{t.profesional ? `${t.profesional.nombre}` : t.profesional_id}</td>
                  <td className="border p-2">{t.estado?.codigo ?? t.estado_id}</td>
                  <td className="border p-2">{new Date(t.fecha_hora_inicio).toLocaleString('es-AR',{timeZone: 'America/Argentina/Buenos_Aires', hour12: false})}</td>
                  <td className="border p-2">{new Date(t.fecha_hora_fin).toLocaleString('es-AR',{timeZone: 'America/Argentina/Buenos_Aires', hour12: false})}</td>
                  <td className="border p-2 relative">
                    <div>
                      <button disabled={loadingActionId === t.id} onClick={() => setOpenActionId(openActionId === t.id ? null : t.id)} className="px-2 py-1 bg-white border rounded">
                        {loadingActionId === t.id ? '...' : '⋯'}
                      </button>
                    </div>
                    {openActionId === t.id && (
                      <div data-actions className="absolute right-0 mt-2 bg-white border rounded shadow z-50" style={{ minWidth: 160 }}>
                        {getAllowedActions(t).map((key) => {
                          const def = ACTIONS[key]
                          const disabled = !!(me && Array.isArray(me.permissions) && !me.permissions.includes(`turnos.${key}`))
                          console.log("RAW:", t.fecha_hora_inicio)
                          return (
                            <div key={def.key} className={`p-2 cursor-pointer hover:bg-gray-100 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => { if (!disabled) performAction(t, def.key) }}>
                              {def.label}
                            </div>
                          )
                        })}
                        {getAllowedActions(t).length === 0 && (
                          <div className="p-2 text-sm text-gray-600">No hay acciones disponibles</div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </>
          )
        })()}
      </section>
    </div>
  )
}
