const wired = new WeakSet<HTMLElement>()

function wire(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('.canvas-editable-text[contenteditable="true"]').forEach(el => {
    if (wired.has(el)) return
    wired.add(el)
    el.title = 'Double-click to edit text'
    el.addEventListener('pointerdown', event => {
      // Text editing should win over the parent canvas drag gesture.
      event.stopPropagation()
    })
    el.addEventListener('dblclick', event => {
      event.stopPropagation()
      el.focus()
      const selection = window.getSelection()
      if (!selection) return
      const range = document.createRange()
      range.selectNodeContents(el)
      selection.removeAllRanges()
      selection.addRange(range)
    })
    el.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        el.blur()
      }
    })
  })
}

export function installDirectCanvasEditing() {
  if (typeof document === 'undefined') return () => {}
  wire()
  const observer = new MutationObserver(() => wire())
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['contenteditable'] })
  return () => observer.disconnect()
}
