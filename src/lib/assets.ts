import { supabase } from './supabase'

export type AssetKind = 'image' | 'font' | 'emoji' | 'file'

export type AtlasAsset = {
  id: string
  workspace_id: string
  owner_id: string
  kind: AssetKind
  name: string
  storage_path: string | null
  public_url: string | null
  value: string | null
  mime_type: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export async function getAssets(workspaceId: string, kind?: AssetKind): Promise<AtlasAsset[]> {
  let query = supabase.from('assets').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false })
  if (kind) query = query.eq('kind', kind)
  const { data, error } = await query
  if (error) throw error
  return (data || []) as AtlasAsset[]
}

export async function uploadAsset(workspaceId: string, userId: string, file: File, kind: 'image' | 'font' | 'file'): Promise<AtlasAsset> {
  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || `asset.${extension}`
  const path = `${userId}/${workspaceId}/${crypto.randomUUID()}-${safeName}`

  const { error: uploadError } = await supabase.storage.from('atlas-assets').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (uploadError) throw uploadError

  const { data: publicData } = supabase.storage.from('atlas-assets').getPublicUrl(path)
  const publicUrl = publicData.publicUrl

  const { data, error } = await supabase.from('assets').insert({
    workspace_id: workspaceId,
    owner_id: userId,
    kind,
    name: file.name,
    storage_path: path,
    public_url: publicUrl,
    mime_type: file.type || null,
    metadata: kind === 'font' ? { family: file.name.replace(/\.[^.]+$/, '') } : {},
  }).select('*').single()

  if (error) {
    await supabase.storage.from('atlas-assets').remove([path])
    throw error
  }
  return data as AtlasAsset
}

export async function saveEmojiAsset(workspaceId: string, userId: string, value: string, name = value): Promise<AtlasAsset> {
  const { data, error } = await supabase.from('assets').insert({
    workspace_id: workspaceId,
    owner_id: userId,
    kind: 'emoji',
    name,
    value,
    metadata: {},
  }).select('*').single()
  if (error) throw error
  return data as AtlasAsset
}

export async function deleteAsset(asset: AtlasAsset): Promise<void> {
  if (asset.storage_path) {
    const { error } = await supabase.storage.from('atlas-assets').remove([asset.storage_path])
    if (error) throw error
  }
  const { error } = await supabase.from('assets').delete().eq('id', asset.id)
  if (error) throw error
}

export async function loadFontAsset(asset: AtlasAsset): Promise<string> {
  if (asset.kind !== 'font' || !asset.public_url) throw new Error('This asset is not a font.')
  const family = String(asset.metadata?.family || asset.name.replace(/\.[^.]+$/, '') || 'Atlas Custom Font')
  const face = new FontFace(family, `url(${asset.public_url})`)
  await face.load()
  document.fonts.add(face)
  return family
}
