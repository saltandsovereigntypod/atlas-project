import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { installDirectCanvasEditing } from './lib/directCanvasEditing'
import './styles.css'
import './atlas.css'
import './navigation.css'
import './canvas-first.css'
import './database-canvas.css'
import './editor-sidebar.css'
import './editor-sidebar-plus.css'
import './editor-ux.css'
import './data-editor.css'
import './database-workspace.css'
import './database-polish.css'
import './database-context.css'
import './embedded-database.css'
import './widgets.css'
import './tutorial.css'

installDirectCanvasEditing()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><HashRouter><App /></HashRouter></React.StrictMode>,
)
