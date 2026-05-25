"use client"
import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import useMe from '../../lib/useMe'
import { flattenPermissions, can as canPerm } from '../../lib/permissions'

type Paciente = {
  id: number
  nombre: string
  dni?: string | null
  cuil?: string | null
  activo?: boolean
}

async function fetchPacientes() {
  const res = await fetch('/api/pacientes', { credentials: 'include' })
  if (res.status === 401 || res.status === 403) throw { status: res.status }
  if (!res.ok) throw new Error('Error fetching pacientes')
  return res.json()
}

async function createPaciente(payload: Partial<Paciente>) {
  const res = await fetch('/api/pacientes', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (res.status === 401 || res.status === 403) throw { status: res.status }
  if (!res.ok) {
    const j = await res.json().catch(() => null)
    let msg = 'Error creating paciente'
    if (j) {
      if (Array.isArray(j)) {
        msg = j.map((it: any) => it.msg || it.detail || JSON.stringify(it)).join('\n')
      } else if (typeof j === 'object') {
        msg = j.detail || Object.values(j).flat().map((v: any) => (typeof v === 'string' ? v : JSON.stringify(v))).join('\n')
      } else if (typeof j === 'string') {
        msg = j
      }
    }
    throw new Error(msg)
  }
  return res.json()
}

async function patchPaciente(id: number, payload: any) {
  const res = await fetch(`/api/pacientes/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (res.status === 401 || res.status === 403) throw { status: res.status }
  if (!res.ok) {
    const j = await res.json().catch(() => null)
    let msg = 'Error patching paciente'
    if (j) {
      if (Array.isArray(j)) {
        msg = j.map((it: any) => it.msg || it.detail || JSON.stringify(it)).join('\n')
      } else if (typeof j === 'object') {
        msg = j.detail || Object.values(j).flat().map((v: any) => (typeof v === 'string' ? v : JSON.stringify(v))).join('\n')
      } else if (typeof j === 'string') {
        msg = j
      }
    }
    throw new Error(msg)
  }
  return res.json()
}

export default function PacientesPage() {
  const qc = useQueryClient()
  const { data, isLoading, isError } = useQuery(['pacientes'], fetchPacientes, { retry: false })
  const meQuery = useMe()
  const me = meQuery.data as any | undefined

  // build permissions set compatible with helper
  const permsSet = React.useMemo(() => {
    if (!me) return new Set<string>()
    if (Array.isArray(me.permissions)) return new Set(me.permissions)
    return flattenPermissions(me.permissions || {})
  }, [me])

  const canCreate = canPerm(permsSet, 'pacientes.crear')
  const canEdit = canPerm(permsSet, 'pacientes.editar')
  const isAdmin = !!(me && Array.isArray(me.roles) && me.roles.some((r: string) => r.toLowerCase() === 'admin'))

  const createMut = useMutation(createPaciente, { onSuccess: () => qc.invalidateQueries(['pacientes']) })
  const patchMut = useMutation(({ id, payload }: any) => patchPaciente(id, payload), { onSuccess: () => qc.invalidateQueries(['pacientes']) })

  const { register, handleSubmit, reset } = useForm<{ nombre: string; dni?: string; cuil?: string; telefono: string; canal_contacto: string }>()
  const [editingId, setEditingId] = React.useState<number | null>(null)
  const [toast, setToast] = React.useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  React.useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // pagination for pacientes listing
  const [patientPage, setPatientPage] = React.useState(1)
  const PATIENTS_PAGE_SIZE = 10
  const [openFilter, setOpenFilter] = React.useState<string | null>(null)
  const [tempValue, setTempValue] = React.useState<string>('')
  const [filters, setFilters] = React.useState<{ nombre?: string; telefono?: string; dni?: string; cuil?: string }>({})

  const onCreate = async (vals: any) => {
    try {
      await createMut.mutateAsync({ nombre: vals.nombre, dni: vals.dni || null, cuil: vals.cuil || null, telefono: vals.telefono, canal_contacto: vals.canal_contacto })
      reset()
      setToast({ msg: 'Paciente creado correctamente.', type: 'success' })
    } catch (e: any) {
      if (e && e.status && (e.status === 401 || e.status === 403)) {
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).finally(() => location.assign('/login'))
        return
      }
      // Friendly error rendering: if thrown value is an Error show message, if it's array/object render nicely
      if (e instanceof Error) {
        alert(e.message)
      } else if (Array.isArray(e)) {
        alert(e.map(it => it.msg || it.detail || JSON.stringify(it)).join('\n'))
      } else if (typeof e === 'object') {
        alert(e.detail || JSON.stringify(e))
      } else {
        alert(String(e))
      }
    }
  }

  const onSaveEdit = async (id: number, vals: any) => {
    try {
      await patchMut.mutateAsync({ id, payload: vals })
      setEditingId(null)
      setToast({ msg: 'Datos del paciente actualizados.', type: 'success' })
    } catch (e: any) {
      if (e && e.status && (e.status === 401 || e.status === 403)) {
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).finally(() => location.assign('/login'))
        return
      }
      if (e instanceof Error) {
        alert(e.message)
      } else if (Array.isArray(e)) {
        alert(e.map(it => it.msg || it.detail || JSON.stringify(it)).join('\n'))
      } else if (typeof e === 'object') {
        alert(e.detail || JSON.stringify(e))
      } else {
        alert(String(e))
      }
    }
  }

  const toggleActivo = async (p: Paciente, next: boolean) => {
    if (!canEdit || !isAdmin) return alert('No autorizado')
    try {
      await patchMut.mutateAsync({ id: p.id, payload: { activo: next } })
      setToast({ msg: next ? 'Paciente activado.' : 'Paciente desactivado.', type: 'success' })
    } catch (e: any) {
      if (e instanceof Error) {
        alert(e.message)
      } else if (Array.isArray(e)) {
        alert(e.map(it => it.msg || it.detail || JSON.stringify(it)).join('\n'))
      } else if (typeof e === 'object') {
        alert(e.detail || JSON.stringify(e))
      } else {
        alert(String(e))
      }
    }
  }

  return (
    <div>
      {toast && (
        <div role="status" aria-live="polite" className={`fixed right-4 bottom-6 z-50 px-4 py-2 rounded shadow ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}
      <h1 className="text-2xl font-bold mb-4">Pacientes</h1>

      <section className="mb-6">
        <h2 className="font-semibold">Crear Paciente</h2>
        {!canCreate && <div className="text-sm text-gray-600">No tenés permiso para crear pacientes.</div>}
        {canCreate && (
          <form onSubmit={handleSubmit(onCreate)} className="grid grid-cols-3 gap-2 max-w-xl mt-2">
            <input {...register('nombre', { required: true })} placeholder="Nombre completo" className="border p-2 rounded col-span-3" />
            <input {...register('dni')} placeholder="DNI" className="border p-2 rounded" />
            <input {...register('cuil')} placeholder="CUIL" className="border p-2 rounded" />
            <input {...register('telefono', { required: true })} placeholder="Teléfono" className="border p-2 rounded" />
            <select {...register('canal_contacto', { required: true })} className="border p-2 rounded">
              <option value="whatsapp">whatsapp</option>
              <option value="telegram">telegram</option>
              <option value="sms">sms</option>
            </select>
            <div className="col-span-3">
              <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">Nuevo paciente</button>
            </div>
          </form>
        )}
      </section>

      <section>
        <h2 className="font-semibold mb-2">Listado</h2>
        {isLoading && <div>Cargando...</div>}
        {isError && <div className="text-red-600">Error al cargar pacientes</div>}
        {data && data.length === 0 && <div className="text-gray-600">No hay pacientes.</div>}
        {/* Active filters summary */}
        {Object.values(filters).some(v => v !== undefined && v !== null && v !== '') && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {Object.entries(filters).filter(([k, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => {
              const label = k === 'nombre' ? 'Nombre'
                : k === 'telefono' ? 'Teléfono'
                : k === 'dni' ? 'DNI'
                : k === 'cuil' ? 'CUIL' : k
              const display = String(v)
              return (
                <div key={k} className="flex items-center bg-gray-100 border rounded px-2 py-1 text-sm">
                  <span className="font-medium mr-2">{label}:</span>
                  <span className="mr-2 text-gray-700">{display}</span>
                  <button title="Quitar filtro" onClick={() => { setFilters((prev:any) => { const copy = { ...prev }; delete copy[k]; return copy }) ; setPatientPage(1) }} className="text-gray-500 hover:text-gray-800">✕</button>
                </div>
              )
            })}
            <button onClick={() => { setFilters({}); setPatientPage(1) }} className="ml-2 px-2 py-1 text-sm bg-red-100 text-red-700 rounded">Limpiar filtros</button>
          </div>
        )}

        {data && data.length > 0 && (() => {
          // apply client-side filters
          const filtered = data.filter((p: any) => {
            if (filters.nombre && !(p.nombre || '').toLowerCase().includes(filters.nombre.toLowerCase())) return false
            if (filters.telefono && !(p.telefono || '').toLowerCase().includes(filters.telefono.toLowerCase())) return false
            if (filters.dni && !((p.dni || '').toLowerCase().includes(filters.dni.toLowerCase()))) return false
            if (filters.cuil && !((p.cuil || '').toLowerCase().includes(filters.cuil.toLowerCase()))) return false
            return true
          })
          const total = filtered.length
          const totalPages = Math.max(1, Math.ceil(total / PATIENTS_PAGE_SIZE))
          const start = total === 0 ? 0 : (patientPage - 1) * PATIENTS_PAGE_SIZE + 1
          const end = Math.min(patientPage * PATIENTS_PAGE_SIZE, total)
          const paginated = filtered.slice((patientPage - 1) * PATIENTS_PAGE_SIZE, patientPage * PATIENTS_PAGE_SIZE)
          return (
            <>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm text-gray-600">Mostrando {start}-{end} de {total}</div>
                <div className="flex items-center gap-2">
                  <button disabled={patientPage <= 1} onClick={() => setPatientPage(p => Math.max(1, p - 1))} className="px-2 py-1 bg-gray-200 rounded">Anterior</button>
                  <div className="text-sm">Página {patientPage} / {totalPages}</div>
                  <button disabled={patientPage >= totalPages} onClick={() => setPatientPage(p => Math.min(totalPages, p + 1))} className="px-2 py-1 bg-gray-200 rounded">Siguiente</button>
                </div>
              </div>
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr className="text-left">
                    <th className="border p-2 relative">Nombre
                      <button onClick={() => { setTempValue(filters.nombre || ''); setOpenFilter('nombre') }} title="Filtrar nombre" className="ml-2 text-gray-500 hover:text-gray-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-.293.707L14 14.414V19a1 1 0 0 1-.553.894l-4 2A1 1 0 0 1 8 21v-6.586L3.293 6.707A1 1 0 0 1 3 6V4z" />
                        </svg>
                      </button>
                      {openFilter === 'nombre' && (
                        <div data-filter="nombre" className="absolute z-50 bg-white border rounded p-3 shadow mt-2" style={{ minWidth: 220 }}>
                          <div className="mb-2 text-sm font-medium">Filtrar por Nombre</div>
                          <input className="w-full border p-1 rounded mb-2" value={tempValue} onChange={(e)=>setTempValue(e.target.value)} placeholder="Nombre o parte" />
                          <div className="flex gap-2 justify-end">
                            <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => { setFilters(prev=>{ const c = { ...prev }; delete c.nombre; return c }); setOpenFilter(null) }}>Limpiar</button>
                            <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={() => { setFilters(prev=>({ ...prev, nombre: tempValue || undefined })); setPatientPage(1); setOpenFilter(null) }}>Aplicar</button>
                          </div>
                        </div>
                      )}
                    </th>
                    <th className="border p-2 relative">Teléfono
                      <button onClick={() => { setTempValue(filters.telefono || ''); setOpenFilter('telefono') }} title="Filtrar teléfono" className="ml-2 text-gray-500 hover:text-gray-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-.293.707L14 14.414V19a1 1 0 0 1-.553.894l-4 2A1 1 0 0 1 8 21v-6.586L3.293 6.707A1 1 0 0 1 3 6V4z" />
                        </svg>
                      </button>
                      {openFilter === 'telefono' && (
                        <div data-filter="telefono" className="absolute z-50 bg-white border rounded p-3 shadow mt-2" style={{ minWidth: 220 }}>
                          <div className="mb-2 text-sm font-medium">Filtrar por Teléfono</div>
                          <input className="w-full border p-1 rounded mb-2" value={tempValue} onChange={(e)=>setTempValue(e.target.value)} placeholder="Teléfono o parte" />
                          <div className="flex gap-2 justify-end">
                            <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => { setFilters(prev=>{ const c = { ...prev }; delete c.telefono; return c }); setOpenFilter(null) }}>Limpiar</button>
                            <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={() => { setFilters(prev=>({ ...prev, telefono: tempValue || undefined })); setPatientPage(1); setOpenFilter(null) }}>Aplicar</button>
                          </div>
                        </div>
                      )}
                    </th>
                    <th className="border p-2 relative">DNI / CUIL
                      <button onClick={() => { setTempValue(filters.dni || ''); setOpenFilter('dni') }} title="Filtrar dni" className="ml-2 text-gray-500 hover:text-gray-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-.293.707L14 14.414V19a1 1 0 0 1-.553.894l-4 2A1 1 0 0 1 8 21v-6.586L3.293 6.707A1 1 0 0 1 3 6V4z" />
                        </svg>
                      </button>
                      {openFilter === 'dni' && (
                        <div data-filter="dni" className="absolute z-50 bg-white border rounded p-3 shadow mt-2" style={{ minWidth: 220 }}>
                          <div className="mb-2 text-sm font-medium">Filtrar por DNI</div>
                          <input className="w-full border p-1 rounded mb-2" value={tempValue} onChange={(e)=>setTempValue(e.target.value)} placeholder="DNI o parte" />
                          <div className="flex gap-2 justify-end">
                            <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => { setFilters(prev=>{ const c = { ...prev }; delete c.dni; return c }); setOpenFilter(null) }}>Limpiar</button>
                            <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={() => { setFilters(prev=>({ ...prev, dni: tempValue || undefined })); setPatientPage(1); setOpenFilter(null) }}>Aplicar</button>
                          </div>
                        </div>
                      )}
                      <div className="mt-1 text-xs text-gray-500">(también filtra CUIL)</div>
                    </th>
                    <th className="border p-2">Activo</th>
                    <th className="border p-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p: Paciente) => (
                    <tr key={p.id}>
                      <td className="border p-2">
                        {editingId === p.id ? (
                          <InlineEditPaciente paciente={p} onSave={(vals:any)=>onSaveEdit(p.id, vals)} onCancel={()=>setEditingId(null)} />
                        ) : (
                          <div className="font-medium">{p.nombre}</div>
                        )}
                      </td>
                      <td className="border p-2">{p.telefono ?? '-'}</td>
                      <td className="border p-2">DNI: {p.dni ?? '-'} · CUIL: {p.cuil ?? '-'}</td>
                      <td className="border p-2">
                        {canEdit && isAdmin ? (
                          <input type="checkbox" checked={!!p.activo} onChange={(e)=>toggleActivo(p, e.target.checked)} />
                        ) : (
                          <span className={`px-2 py-1 rounded text-sm ${p.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span>
                        )}
                      </td>
                      <td className="border p-2">
                        {canEdit ? (
                          <div className="flex gap-2">
                            <button onClick={()=>setEditingId(p.id)} className="px-2 py-1 bg-yellow-200 rounded">Editar</button>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600">Sin permisos</div>
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

function InlineEditPaciente({ paciente, onSave, onCancel }: any) {
  const { register, handleSubmit } = useForm<{ nombre: string; dni?: string; cuil?: string }>({ defaultValues: { nombre: paciente.nombre, dni: paciente.dni ?? '', cuil: paciente.cuil ?? '' } })
  return (
    <form onSubmit={handleSubmit(onSave)} className="flex gap-2">
      <input {...register('nombre')} className="border p-1 rounded" />
      <input {...register('dni')} className="border p-1 rounded" placeholder="DNI" />
      <input {...register('cuil')} className="border p-1 rounded" placeholder="CUIL" />
      <div className="flex items-center gap-2">
        <button type="submit" className="px-2 py-1 bg-blue-600 text-white rounded">Guardar</button>
        <button type="button" onClick={onCancel} className="px-2 py-1 bg-gray-200 rounded">Cancelar</button>
      </div>
    </form>
  )
}
