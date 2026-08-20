const ACTIVE_KEY = 'atlas:editor-navigation:active'
const STACK_KEY = 'atlas:editor-navigation:stack'
const SCROLL_KEY = 'atlas:editor-navigation:scroll'
const BACK_CLASS = 'atlas-editor-back'

let suppressNextHash = false
let autoEntering = false
let observer: MutationObserver | null = null

type ScrollMap = Record<string, number>

function routeKey() {
  return window.location.hash || '#/'
}

function readStack(): string[] {
  try {
    const raw = JSON.parse(sessionStorage.getItem(STACK_KEY) || '[]')
    return Array.isArray(raw) ? raw.map(String).filter(Boolean) : []
  } catch {
    return []
  }
}

function writeStack(stack: string[]) {
  sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-40)))
}

function readScroll(): ScrollMap {
  try {
    const raw = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || '{}')
    return raw && typeof raw === 'object' ? raw as ScrollMap : {}
  } catch {
    return {}
  }
}

function saveScroll(route = routeKey()) {
  const map = readScroll()
  map[route] = window.scrollY
  sessionStorage.setItem(SCROLL_KEY, JSON.stringify(map))
}

function restoreScroll(route = routeKey()) {
  const y = readScroll()[route]
  if (!Number.isFinite(y)) return
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'auto' })))
}

function sessionActive() {
  return sessionStorage.getItem(ACTIVE_KEY) === '1'
}

function beginSession() {
  sessionStorage.setItem(ACTIVE_KEY, '1')
  const current = routeKey()
  const stack = readStack()
  if (!stack.length || stack[stack.length - 1] !== current) writeStack([current])
  updateBackButton()
}

function endSession() {
  sessionStorage.removeItem(ACTIVE_KEY)
  sessionStorage.removeItem(STACK_KEY)
  sessionStorage.removeItem(SCROLL_KEY)
  document.querySelector(`.${BACK_CLASS}`)?.remove()
}

function recordRoute(route: string) {
  if (!sessionActive()) return
  const stack = readStack()
  if (stack[stack.length - 1] === route) return
  writeStack([...stack, route])
  updateBackButton()
}

function goBackInsideEditor() {
  const stack = readStack()
  if (stack.length < 2) return
  saveScroll()
  stack.pop()
  const previous = stack[stack.length - 1]
  writeStack(stack)
  suppressNextHash = true
  window.location.hash = previous.startsWith('#') ? previous.slice(1) : previous
  updateBackButton()
}

function updateBackButton() {
  const head = document.querySelector<HTMLElement>('.atlas-edit-rail-head')
  if (!head || !sessionActive()) return
  const stack = readStack()
  let button = head.querySelector<HTMLButtonElement>(`.${BACK_CLASS}`)
  if (stack.length < 2) {
    button?.remove()
    return
  }
  if (!button) {
    button = document.createElement('button')
    button.type = 'button'
    button.className = BACK_CLASS
    button.innerHTML = '<span aria-hidden="true">←</span><span>Back</span>'
    button.title = 'Back to the previous page in this editing session'
    button.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      goBackInsideEditor()
    })
    const done = Array.from(head.querySelectorAll<HTMLButtonElement>('button')).find(item => item.textContent?.trim() === 'Done')
    if (done) head.insertBefore(button, done)
    else head.appendChild(button)
  }
}

function ensureEditingAfterNavigation() {
  if (!sessionActive() || document.body.classList.contains('atlas-editing') || autoEntering) {
    updateBackButton()
    return
  }
  const editButton = document.querySelector<HTMLButtonElement>('.canvas-toolbar-button.edit')
  if (!editButton) return
  autoEntering = true
  editButton.click()
  window.requestAnimationFrame(() => {
    autoEntering = false
    updateBackButton()
    restoreScroll()
  })
}

function handleClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (!target) return

  const toolbar = target.closest<HTMLButtonElement>('.canvas-toolbar-button')
  if (toolbar?.classList.contains('edit')) {
    if (!sessionActive()) beginSession()
    return
  }
  if (toolbar?.classList.contains('done')) {
    endSession()
    return
  }

  const editorDone = target.closest<HTMLButtonElement>('.atlas-edit-rail-head button')
  if (editorDone?.textContent?.trim() === 'Done') {
    endSession()
    return
  }

  if (!sessionActive()) return
  const anchor = target.closest<HTMLAnchorElement>('a[href]')
  if (!anchor) return
  const href = anchor.getAttribute('href') || ''
  if (!href.startsWith('#/')) return
  saveScroll()
}

function handleHashChange() {
  if (!sessionActive()) return
  const current = routeKey()
  if (suppressNextHash) suppressNextHash = false
  else recordRoute(current)
  ensureEditingAfterNavigation()
}

function wireCurrentEditor() {
  if (!sessionActive() && document.body.classList.contains('atlas-editing')) beginSession()
  updateBackButton()
  ensureEditingAfterNavigation()
}

export function installEditorNavigation() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}

  document.addEventListener('click', handleClick, true)
  window.addEventListener('hashchange', handleHashChange)
  observer = new MutationObserver(() => wireCurrentEditor())
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
  wireCurrentEditor()

  return () => {
    document.removeEventListener('click', handleClick, true)
    window.removeEventListener('hashchange', handleHashChange)
    observer?.disconnect()
    observer = null
  }
}
