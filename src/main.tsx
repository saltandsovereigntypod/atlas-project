import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { installTemplateEnhancements } from './lib/templateEnhancements'
import { installDashboardTemplateEnhancements } from './lib/dashboardTemplateEnhancements'
import { installTemplateLiveViews } from './lib/templateLiveViews'
import { installEditorRuntimeEnhancements } from './lib/editorRuntimeEnhancements'
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
import './database-picker-fix.css'
import './layout-fixes.css'
import './template-connections.css'
import './use-mode.css'
import './live-view-v2.css'
import './canvas-card-view.css'
import './canvas-card-sidebar.css'
import './information-architecture.css'
import './editor-clarity.css'
import './workspace-overlays.css'
import './design-controls.css'
import './widget-surface-fix.css'
import './design-popover-position.css'

installTemplateEnhancements()
installDashboardTemplateEnhancements()
installTemplateLiveViews()
installEditorRuntimeEnhancements()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><HashRouter><App /></HashRouter></React.StrictMode>,
)
