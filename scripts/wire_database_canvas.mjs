import fs from 'node:fs'

const path = 'src/pages/UniversalPage.tsx'
let source = fs.readFileSync(path, 'utf8')

const importLine = "import DatabaseCanvasView from '../components/DatabaseCanvasView'\n"
if (!source.includes(importLine.trim())) {
  source = source.replace("import FieldInput from '../components/FieldInput'\n", "import FieldInput from '../components/FieldInput'\n" + importLine)
}

source = source.replace(
  "if (block.type === 'database_view') return <DatabaseView config={config} editing={editing} databases={databases} />",
  "if (block.type === 'database_view') return <DatabaseCanvasView blockId={block.id} config={config} editing={editing} databases={databases} save={save} />"
)

fs.writeFileSync(path, source)
