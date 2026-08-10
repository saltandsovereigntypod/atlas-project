import { supabase } from './supabase'
import type { Database, Field, Layout, LayoutElement, RecordRow, Workspace } from '../types'

export async function ensureWorkspace(userId: string, email?: string | null): Promise<Workspace> {
  const { data: memberships, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace:workspaces(*)')
    .eq('user_id', userId)
    .limit(1)
  if (membershipError) throw membershipError

  const existing = memberships?.[0]?.workspace as unknown as Workspace | undefined
  if (existing?.id) return existing

  const defaultName = email ? `${email.split('@')[0]}'s workspace` : 'My workspace'
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .insert({ name: defaultName, owner_id: userId })
    .select('*')
    .single()
  if (error) throw error
  return workspace as Workspace
}

export async function getDatabases(workspaceId: string): Promise<Database[]> {
  const { data, error } = await supabase.from('databases').select('*').eq('workspace_id', workspaceId).order('created_at')
  if (error) throw error
  return (data || []) as Database[]
}

export async function createDatabase(workspaceId: string, name: string): Promise<Database> {
  const { data, error } = await supabase
    .from('databases')
    .insert({ workspace_id: workspaceId, name, description: '' })
    .select('*')
    .single()
  if (error) throw error
  const db = data as Database
  const { error: fieldError } = await supabase.from('fields').insert({
    database_id: db.id,
    name: 'Name',
    type: 'text',
    position: 0,
    required: true,
    config: {},
  })
  if (fieldError) throw fieldError
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
  const { data, error } = await supabase
    .from('fields')
    .insert({ ...field, database_id: databaseId, position })
    .select('*')
    .single()
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
  const { data, error } = await supabase
    .from('records')
    .insert({ database_id: databaseId, title, data: {} })
    .select('*')
    .single()
  if (error) throw error
  return data as RecordRow
}

export async function updateRecord(recordId: string, patch: Partial<Pick<RecordRow, 'title' | 'data'>>) {
  const { data, error } = await supabase
    .from('records')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', recordId)
    .select('*')
    .single()
  if (error) throw error
  return data as RecordRow
}

export async function deleteRecord(recordId: string) {
  const { error } = await supabase.from('records').delete().eq('id', recordId)
  if (error) throw error
}

export async function getOrCreateLayout(databaseId: string): Promise<Layout> {
  const { data: existing, error: findError } = await supabase.from('layouts').select('*').eq('database_id', databaseId).limit(1)
  if (findError) throw findError
  if (existing?.[0]) return existing[0] as Layout

  const { data, error } = await supabase
    .from('layouts')
    .insert({ database_id: databaseId, name: 'Default card', canvas_width: 900, canvas_height: 560, background: '#f8f4ec' })
    .select('*')
    .single()
  if (error) throw error
  return data as Layout
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
