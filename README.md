# Atlas Studio

Atlas Studio is a functional first version of a visual database workspace. It combines flexible user-created databases with a reusable record canvas. The app is intentionally domain-agnostic. A Books database, Dream Journal, Character Bible, Podcast Planner, Grimoire, Recipe Box, or Project Tracker all use the same underlying system.

## What works now

- Email/password sign-up and sign-in with Supabase Auth
- Automatic first workspace creation
- Create and delete arbitrary databases
- Custom field creation with text, long text, number, date, checkbox, select, multi-select, URL, image URL, and relation field types
- Create, edit, search, and delete records
- JSON-backed flexible record values
- Visual designer for each database
- Add and drag text, data-bound fields, and shapes
- Bind design elements to record title or any custom field
- Render image fields as images in the canvas
- Change position, size, rotation, typography, alignment, color, shape fill, corner radius, opacity, and canvas background
- Preview a saved design against different database records
- Persistent design layouts stored in Supabase
- Row Level Security so workspace data is private to workspace members
- GitHub Pages deployment workflow
- Native image uploads to Supabase Storage, plus direct image URLs

## Stack

- React 18
- TypeScript
- Vite
- Supabase Postgres + Auth + Storage
- React Router using hash routing, which works cleanly on GitHub Pages
- Lucide icons
- Plain CSS for the application shell and editor

The canvas is DOM-based in v0.1 rather than Konva. That keeps the first version easier to understand and deploy while still giving you draggable, persistent, data-bound design elements. A later version can move to Konva or another canvas renderer when multi-select, snapping, zoom, grouping, and richer transformations are needed.

## 1. Create the Supabase project

1. Create a free project at Supabase.
2. Open **SQL Editor**.
3. Paste the entire contents of `supabase/schema.sql` into a new query.
4. Run it once.
5. Open **Project Settings > API** and copy the Project URL and anon/public key.

The SQL creates all tables, indexes, Row Level Security policies, the automatic workspace-owner membership trigger, and the `user-assets` storage bucket.

### Auth note

Supabase normally requires email confirmation for new users. During private development, you can either keep that behavior and confirm each email, or adjust it in **Authentication > Providers > Email** in your Supabase dashboard.

## 2. Run locally

Copy the environment template:

```bash
cp .env.example .env
```

Then edit `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Install and run:

```bash
npm install
npm run dev
```

Open the local address printed by Vite.

## 3. Put it on GitHub

Create a new GitHub repository and push this project to the `main` branch.

In the GitHub repository, go to **Settings > Secrets and variables > Actions** and create these repository secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Use the same values as your local `.env` file.

Then go to **Settings > Pages** and set **Source** to **GitHub Actions**.

Every push to `main` will run `.github/workflows/deploy.yml`, build the Vite app, and deploy it to GitHub Pages.

## 4. Supabase URL configuration

In Supabase, open **Authentication > URL Configuration**.

During local development, add your Vite local URL, commonly:

```text
http://localhost:5173
```

After GitHub Pages is live, add the Pages URL as an allowed redirect URL too. Hash routing is used, so direct navigation to app screens does not require special GitHub Pages rewrite rules.

## Data model

The core tables are:

```text
workspaces
workspace_members
databases
fields
records
layouts
layout_elements
```

A record stores flexible field values in its `data` JSONB column, keyed by field UUID. This is deliberately different from hardcoding tables such as `books` or `characters`.

For example, a database might contain a field whose ID is `abc...`. A record could contain:

```json
{
  "abc...": "Finished",
  "def...": 5,
  "ghi...": ["Fantasy", "Romance"]
}
```

The field definitions tell the UI what each value means and how it should be edited.

## About relation fields

Relation is included as a schema type, but v0.1 does not yet have a dedicated relation picker UI. Relation values can be represented as record IDs in JSON. The next architecture step should introduce a proper relation editor, reverse relations, and rollups.

## Important v0.1 limitations

This is a functional MVP, not a finished replacement for Notion or Canva. The biggest missing pieces are:

- Dedicated relation picker and rollups
- Multiple saved database views
- Sort and filter builders
- Gallery and board views
- Rich text document blocks
- Canvas resize handles
- Multi-select, grouping, snapping, guides, undo/redo, zoom, and keyboard shortcuts
- Reusable templates across databases
- Responsive/auto-layout containers
- Conditional visibility and conditional styling
- Formulas
- Real-time multi-user collaboration

The database schema is already shaped so those features can be layered on without turning the project into a Books-only tracker.

## Recommended next milestone

The most valuable next build is **Views + Relations**:

1. Add a `views` table with table/gallery/board view configuration.
2. Add filter and sort rules.
3. Build a true relation picker between databases.
4. Add reverse relation display and rollups.
5. Add native Supabase Storage image uploads.

After that, the design editor can become much more Canva-like without the data foundation changing underneath it.

## Security

The browser only receives the Supabase anon key. That key is expected to be public. Data access is protected by Supabase Row Level Security. Never put the Supabase service role key in this frontend or in GitHub Pages secrets used by the build.
