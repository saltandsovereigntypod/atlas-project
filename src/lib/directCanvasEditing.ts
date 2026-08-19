import { getFields, getRecords, updateRecord } from './data'

const wired = new WeakSet<HTMLElement>()
const useModeWired = new WeakSet<HTMLElement>()

function selectAllText(el: HTMLElement) {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(el)
  selection.removeAllRanges()
  selection.addRange(range)
}

function parseRecordLink(href: string) {
  const match = href.match(/\/database\/([^/]+)\/record\/([^/?#]+)/)
  return match ? { databaseId: match[1], recordId: match[2] } : null
}

function ensureCaptureStatus(capture: HTMLElement) {
  let status = capture.querySelector<HTMLElement>('.atlas-capture-status')
  if (!status) {
    status = document.createElement('span')
    status.className = 'atlas-capture-status'
    capture.appendChild(status)
  }
  return status
}

function wireCanvasText(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('.canvas-editable-text').forEach(el => {
    if (wired.has(el)) return
    wired.add(el)
    el.title = 'Double-click to edit text'
    el.addEventListener('pointerdown', event => {
      if (el.contentEditable === 'true') event.stopPropagation()
    })
    el.addEventListener('dblclick', event => {
      event.preventDefault()
      event.stopPropagation()
      el.contentEditable = 'true'
      el.classList.add('atlas-inline-canvas-edit')
      el.focus()
      selectAllText(el)
    })
    el.addEventListener('blur', () => {
      el.classList.remove('atlas-inline-canvas-edit')
      if (!document.body.classList.contains('atlas-editing')) el.contentEditable = 'false'
    })
    el.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        el.blur()
      }
    })
  })
}

function wireUseModeNotes(root: ParentNode = document) {
  root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('.widget-editable input[readonly], .widget-editable textarea[readonly]').forEach(el => {
    el.removeAttribute('readonly')
    el.classList.add('atlas-use-editable')
    el.title = 'Edit directly here. Atlas saves as you type.'
    if (useModeWired.has(el)) return
    useModeWired.add(el)
    el.addEventListener('pointerdown', event => event.stopPropagation())
  })
}

function wireQuickCapture(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('.widget-capture').forEach(capture => {
    if (useModeWired.has(capture)) return
    useModeWired.add(capture)
    const input = capture.querySelector<HTMLInputElement>('input')
    const button = capture.querySelector<HTMLButtonElement>('button')
    if (!input || !button) return
    const status = ensureCaptureStatus(capture)

    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey && input.value.trim() && !button.disabled) {
        event.preventDefault()
        button.click()
      }
    })

    button.addEventListener('click', () => {
      if (button.disabled) return
      status.textContent = 'Saving…'
      status.classList.remove('saved')
      window.setTimeout(() => {
        if (!input.value.trim()) {
          status.textContent = 'Added ✓'
          status.classList.add('saved')
          window.setTimeout(() => {
            status.textContent = ''
            status.classList.remove('saved')
          }, 1800)
        } else {
          status.textContent = ''
        }
      }, 500)
    })
  })
}

async function hydrateKanban(kanban: HTMLElement) {
  if (kanban.dataset.atlasKanbanHydrated === '1') return
  const firstLink = kanban.querySelector<HTMLAnchorElement>('a[href*="/database/"]')
  if (!firstLink) return
  const parsed = parseRecordLink(firstLink.href)
  if (!parsed) return

  try {
    const fields = await getFields(parsed.databaseId)
    const groupField = fields.find(field => field.type === 'status') || fields.find(field => field.type === 'select')
    if (!groupField) return
    kanban.dataset.atlasKanbanHydrated = '1'
    kanban.dataset.databaseId = parsed.databaseId
    kanban.dataset.fieldId = groupField.id

    const options = Array.isArray(groupField.config?.options) ? groupField.config.options.map(String) : []
    const existing = new Set(Array.from(kanban.children).map(column => column.querySelector('strong')?.textContent?.trim() || ''))
    options.forEach(option => {
      if (!option || existing.has(option)) return
      const column = document.createElement('div')
      const heading = document.createElement('strong')
      heading.textContent = option
      column.appendChild(heading)
      kanban.appendChild(column)
    })

    Array.from(kanban.children).forEach(columnNode => {
      const column = columnNode as HTMLElement
      const label = column.querySelector('strong')?.textContent?.trim() || 'Unassigned'
      column.dataset.atlasGroup = label
      column.classList.add('atlas-kanban-dropzone')
      column.addEventListener('dragover', event => {
        event.preventDefault()
        column.classList.add('is-drag-over')
      })
      column.addEventListener('dragleave', () => column.classList.remove('is-drag-over'))
      column.addEventListener('drop', async event => {
        event.preventDefault()
        column.classList.remove('is-drag-over')
        const payload = event.dataTransfer?.getData('application/x-atlas-record') || ''
        if (!payload) return
        const [databaseId, recordId] = payload.split('|')
        if (!databaseId || !recordId || databaseId !== kanban.dataset.databaseId) return
        const records = await getRecords(databaseId)
        const record = records.find(item => item.id === recordId)
        if (!record) return
        const value = label === 'Unassigned' ? '' : label
        await updateRecord(recordId, { data: { ...record.data, [groupField.id]: value } })
        const card = kanban.querySelector<HTMLAnchorElement>(`a[data-atlas-record-id="${recordId}"]`)
        if (card) column.appendChild(card)
      })
    })

    kanban.querySelectorAll<HTMLAnchorElement>('a[href*="/database/"]').forEach(link => {
      const info = parseRecordLink(link.href)
      if (!info) return
      link.draggable = true
      link.dataset.atlasRecordId = info.recordId
      link.title = 'Drag to change status. Click to open.'
      link.addEventListener('dragstart', event => {
        event.dataTransfer?.setData('application/x-atlas-record', `${info.databaseId}|${info.recordId}`)
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
        link.classList.add('is-dragging')
      })
      link.addEventListener('dragend', () => link.classList.remove('is-dragging'))
    })
  } catch (error) {
    console.error('Could not enable interactive kanban', error)
  }
}

function wireInlineRecordTitles(root: ParentNode = document) {
  root.querySelectorAll<HTMLAnchorElement>('.widget-record-list a[href*="/database/"], .widget-featured a[href*="/database/"], .widget-mini-table a[href*="/database/"]').forEach(link => {
    if (useModeWired.has(link)) return
    useModeWired.add(link)
    const info = parseRecordLink(link.href)
    if (!info) return
    const edit = document.createElement('button')
    edit.type = 'button'
    edit.className = 'atlas-inline-record-edit'
    edit.textContent = 'Edit title'
    edit.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      link.contentEditable = 'true'
      link.classList.add('is-inline-editing')
      link.focus()
      selectAllText(link)
    })
    link.insertAdjacentElement('afterend', edit)
    link.addEventListener('blur', async () => {
      if (link.contentEditable !== 'true') return
      const next = (link.textContent || '').trim()
      link.contentEditable = 'false'
      link.classList.remove('is-inline-editing')
      if (next) await updateRecord(info.recordId, { title: next })
    })
    link.addEventListener('keydown', event => {
      if (link.contentEditable !== 'true') return
      if (event.key === 'Enter') {
        event.preventDefault()
        link.blur()
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        link.contentEditable = 'false'
        link.classList.remove('is-inline-editing')
        link.blur()
      }
    })
  })
}

function wire(root: ParentNode = document) {
  wireCanvasText(root)
  wireUseModeNotes(root)
  wireQuickCapture(root)
  wireInlineRecordTitles(root)
  root.querySelectorAll<HTMLElement>('.widget-kanban').forEach(kanban => void hydrateKanban(kanban))
}

export function installDirectCanvasEditing() {
  if (typeof document === 'undefined') return () => {}
  wire()
  const observer = new MutationObserver(() => wire())
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['contenteditable', 'readonly'] })
  return () => observer.disconnect()
}
