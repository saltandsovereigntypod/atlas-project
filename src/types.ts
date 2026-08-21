export type FieldType = 'text' | 'long_text' | 'number' | 'date' | 'checkbox' | 'select' | 'multi_select' | 'status' | 'url' | 'email' | 'phone' | 'image' | 'files' | 'relation' | 'created_time' | 'last_edited_time'
export type ViewType = 'table' | 'gallery' | 'board'
export type LayoutSurface = 'record' | 'gallery' | 'board'
export type PageContextType = 'home' | 'page' | 'database' | 'record'
export type PageBlockType = 'heading' | 'text' | 'document' | 'image' | 'audio' | 'file' | 'database_view' | 'divider' | 'callout' | 'property' | 'button' | 'metric' | 'progress' | 'section' | 'widget'
export type AutomationTriggerType = 'record_created' | 'field_changed'
export type AutomationActionType = 'set_field' | 'set_today' | 'set_checkbox'

export interface Workspace { id: string; name: string; owner_id: string; created_at: string }
export interface Database { id: string; workspace_id: string; name: string; description: string | null; icon: string | null; favorite: boolean; created_at: string }
export interface Field { id: string; database_id: string; name: string; type: FieldType; position: number; required: boolean; config: Record<string, unknown>; created_at: string }
export interface RecordRow { id: string; database_id: string; title: string; data: Record<string, unknown>; created_at: string; updated_at: string }
export interface DatabaseView { id: string; database_id: string; name: string; type: ViewType; position: number; config: Record<string, unknown>; created_at: string; updated_at: string }
export interface DatabaseAutomation { id: string; database_id: string; name: string; enabled: boolean; trigger_type: AutomationTriggerType; trigger_config: Record<string, unknown>; action_type: AutomationActionType; action_config: Record<string, unknown>; created_at: string; updated_at: string }
export interface Layout { id: string; database_id: string; name: string; surface: LayoutSurface; record_id: string | null; canvas_width: number; canvas_height: number; background: string; created_at: string }
export interface LayoutElement { id: string; layout_id: string; type: 'text' | 'field' | 'shape'; binding_field_id: string | null; x: number; y: number; width: number; height: number; rotation: number; z_index: number; props: Record<string, unknown> }
export interface Page { id: string; workspace_id: string; title: string; icon: string | null; cover: string | null; position: number; context_type: PageContextType; context_database_id: string | null; context_record_id: string | null; parent_id: string | null; favorite: boolean; settings: Record<string, unknown>; created_at: string; updated_at: string }
export interface PageBlock { id: string; page_id: string; type: PageBlockType; position: number; config: Record<string, unknown>; created_at: string; updated_at: string }
export interface DocumentObject { id: string; workspace_id: string; owner_id: string; title: string; body: string; parent_page_id: string | null; metadata: Record<string, unknown>; created_at: string; updated_at: string }
export type WorkspaceSelection =
  | { kind: 'page'; id: string }
  | { kind: 'page_block'; id: string }
  | { kind: 'database_view'; id: string }
  | { kind: 'canvas_card_element'; id: string; parentId: string }
  | { kind: 'canvas_card_record'; id: string; parentId: string }
