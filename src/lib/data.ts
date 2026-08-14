import { supabase } from './supabase'
import type { Database, DatabaseView, Field, Layout, LayoutElement, LayoutSurface, RecordRow, ViewType, Workspace } from '../types'

export async function ensureWorkspace(userId: string, email?: string | null): Promise<Workspace> {
  const { data: memberships, error: membershipError } = await supabase.from('workspace_members').select('workspace:workspaces(*)').eq('user_id', userId).limit(1)
  if (membershipError) throw membershipError
  const existing = memberships?.[0]?.workspace as unknown as Workspace | undefined
  if (existing?.id) return existing
  const defaultName = email ? `${email.split('@')[0]}'s workspace` : 'My workspace'
  const { data: workspace, error } = await supabase.from('workspaces').insert({ name: defaultName, owner_id: userId }).select('*').single()
  if (error) throw error
  return workspace as Workspace
}

export async function getDatabases(workspaceId: string): Promise<Database[]> {
  const { data, error } = await supabase.from('databases').select('*').eq('workspace_id', workspaceId).order('created_at')
  if (error) throw error
  return (data || []) as Database[]
}

export async function createDatabase(workspaceId: string, name: string): Promise<Database> {
  const { data, error } = await supabase.from('databases').insert({ workspace_id: workspaceId, name, description: '' }).select('*').single()
  if (error) throw error
  const db = data as Database
  const { error: fieldError } = await supabase.from('fields').insert({ database_id: db.id, name: 'Name', type: 'text', position: 0, required: true, config: {} })
  if (fieldError) throw fieldError
  await ensureDefaultViews(db.id)
  return db
}

export async function getDatabase(databaseId: string): Promise<Database> {
  const { data, error } = await supabase.from('databases').select('*').eq('id', databaseId).single()
  if (error) throw error
  return data as Database
}

export async function updateDatabase(databaseId: string, patch: Partial<Pick<Database, 'name' | 'description' | 'icon'>>) {
  const { error } = await supabase.from('databases').update(patch).eq('id', databaseId)
  if (error) throw error
}

export async function deleteDatabase(databaseId: string) {
  const { error } = await supabase.from('databases').delete().eq('id', databaseId)
  if (error) throw error
}

export async function getFields(databaseId: string): Promise<Field[]> {
  const { data, error } = await supabase.from('fields').select('*').eq('database_id', databaseId).order('position')
  if (error) throw error
  return (data || []) as Field[]
}

export async function createField(databaseId: string, field: Pick<Field, 'name' | 'type' | 'required' | 'config'>, position: number) {
  const { data, error } = await supabase.from('fields').insert({ ...field, database_id: databaseId, position }).select('*').single()
  if (error) throw error
  return data as Field
}

export async function deleteField(fieldId: string) {
  const { error } = await supabase.from('fields').delete().eq('id', fieldId)
  if (error) throw error
}

export async function getRecords(databaseId: string): Promise<RecordRow[]> {
  const { data, error } = await supabase.from('records').select('*').eq('database_id', databaseId).order('updated_at', { ascending: false })
  if (error) throw error
  return (data || []) as RecordRow[]
}

export async function getRecord(recordId: string): Promise<RecordRow> {
  const { data, error } = await supabase.from('records').select('*').eq('id', recordId).single()
  if (error) throw error
  return data as RecordRow
}

export async function createRecord(databaseId: string, title = 'Untitled') {
  const { data, error } = await supabase.from('records').insert({ database_id: databaseId, title, data: {} }).select('*').single()
  if (error) throw error
  return data as RecordRow
}

export async function updateRecord(recordId: string, patch: Partial<Pick<RecordRow, 'title' | 'data'>>) {
  const { data, error } = await supabase.from('records').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', recordId).select('*').single()
  if (error) throw error
  return data as RecordRow
}

export async function deleteRecord(recordId: string) {
  const { error } = await supabase.from('records').delete().eq('id', recordId)
  if (error) throw error
}

export async function getViews(databaseId: string): Promise<DatabaseView[]> {
  const { data, error } = await supabase.from('views').select('*').eq('database_id', databaseId).order('position')
  if (error) throw error
  return (data || []) as DatabaseView[]
}

export async function ensureDefaultViews(databaseId: string): Promise<DatabaseView[]> {
  const existing = await getViews(databaseId)
  if (existing.length) return existing
  const rows = [
    { database_id: databaseId, name: 'Table', type: 'table', position: 0, config: { density: 'comfortable', showGrid: true } },
    { database_id: databaseId, name: 'Gallery', type: 'gallery', position: 1, config: { useDesignedCard: true } },
    { database_id: databaseId, name: 'Board', type: 'board', position: 2, config: { useDesignedCard: true } },
  ]
  const { data, error } = await supabase.from('views').insert(rows).select('*').order('position')
  if (error) throw error
  return (data || []) as DatabaseView[]
}

export async function createView(databaseId: string, name: string, type: ViewType, position: number) {
  const { data, error } = await supabase.from('views').insert({ database_id: databaseId, name, type, position, config: {} }).select('*').single()
  if (error) throw error
  return data as DatabaseView
}

export async function updateView(viewId: string, patch: Partial<Pick<DatabaseView, 'name' | 'position' | 'config'>>) {
  const { data, error } = await supabase.from('views').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', viewId).select('*').single()
  if (error) throw error
  return data as DatabaseView
}

export async function deleteView(viewId: string) {
  const { error } = await supabase.from('views').delete().eq('id', viewId)
  if (error) throw error
}

const surfaceSize: Record<LayoutSurface, { width: number; height: number }> = {
  record: { width: 900, height: 700 },
  gallery: { width: 420, height: 560 },
  board: { width: 320, height: 220 },
}

export async function getLayoutForSurface(databaseId: string, surface: LayoutSurface, recordId?: string | null): Promise<Layout | null> {
  let query = supabase.from('layouts').select('*').eq('database_id', databaseId).eq('surface', surface)
  query = recordId ? query.eq('record_id', recordId) : query.is('record_id', null)
  const { data, error } = await query.limit(1)
  if (error) throw error
  return (data?.[0] || null) as Layout | null
}

export async function getOrCreateSurfaceLayout(databaseId: string, surface: LayoutSurface, recordId?: string | null): Promise<Layout> {
  const existing = await getLayoutForSurface(databaseId, surface, recordId)
  if (existing) return existing

  const size = surfaceSize[surface]
  let seed: Layout | null = null
  if (recordId) seed = await getLayoutForSurface(databaseId, surface, null)

  const { data, error } = await supabase.from('layouts').insert({
    database_id: databaseId,
    name: recordId ? `Custom ${surface}` : `Default ${surface}`,
    surface,
    record_id: recordId || null,
    canvas_width: seed?.canvas_width || size.width,
    canvas_height: seed?.canvas_height || size.height,
    background: seed?.background || '#f8f4ec',
  }).select('*').single()
  if (error) throw error
  const layout = data as Layout

  if (recordId && seed) {
    const elements = await getLayoutElements(seed.id)
    if (elements.length) {
      const copies = elements.map(({ id: _id, layout_id: _layoutId, ...element }) => ({ ...element, layout_id: layout.id }))
      const { error: copyError } = await supabase.from('layout_elements').insert(copies)
      if (copyError) throw copyError
    }
  }
  return layout
}

export async function getOrCreateLayout(databaseId: string): Promise<Layout> {
  return getOrCreateSurfaceLayout(databaseId, 'record', null)
}

export async function updateLayout(layoutId: string, patch: Partial<Pick<Layout, 'name' | 'canvas_width' | 'canvas_height' | 'background'>>) {
  const { error } = await supabase.from('layouts').update(patch).eq('id', layoutId)
  if (error) throw error
}

export async function getLayoutElements(layoutId: string): Promise<LayoutElement[]> {
  const { data, error } = await supabase.from('layout_elements').select('*').eq('layout_id', layoutId).order('z_index')
  if (error) throw error
  return (data || []) as LayoutElement[]
}

export async function createLayoutElement(layoutId: string, element: Omit<LayoutElement, 'id' | 'layout_id'>) {
  const { data, error } = await supabase.from('layout_elements').insert({ ...element, layout_id: layoutId }).select('*').single()
  if (error) throw error
  return data as LayoutElement
}

export async function updateLayoutElement(elementId: string, patch: Partial<Omit<LayoutElement, 'id' | 'layout_id'>>) {
  const { error } = await supabase.from('layout_elements').update(patch).eq('id', elementId)
  if (error) throw error
}

export async function deleteLayoutElement(elementId: string) {
  const { error } = await supabase.from('layout_elements').delete().eq('id', elementId)
  if (error) throw error
}
