# Atlas Studio

Atlas Studio is a domain-agnostic visual database workspace. The goal is not to build a Books app, Travel app, or Podcast app. The goal is to provide enough generic data, view, relation, page, and design primitives that all of those can be built inside Atlas without adding domain-specific code.

## Current revamp direction

Atlas now separates four ideas that were previously tangled together:

- **Data**: databases, properties, records, and relations.
- **Views**: saved table, gallery, and board presentations stored in Supabase.
- **Design surfaces**: independent default designs for record pages, gallery cards, and board cards.
- **Record overrides**: an individual record can clone the database default design and then become completely unique without changing the rest of the database.

That means a Books database can have one visual language while a Trips database has another, and a single record inside either database can still override its own page or card design.

## Supabase setup

For a brand-new Supabase project, run these SQL files in order:

1. `supabase/schema.sql`
2. `supabase/002_revamp.sql`

For an existing Atlas Supabase project that already ran `schema.sql`, run only:

```text
supabase/002_revamp.sql
```

The migration preserves existing records and layouts. Existing layouts become the default **record page** design for their database. It adds saved views plus the columns required for gallery, board, and per-record design overrides.

## What works now

- Email/password sign-up and sign-in with Supabase Auth
- Automatic workspace creation
- Arbitrary databases and flexible JSON-backed records
- Text, long text, number, date, checkbox, select, multi-select, URL, image, and relation properties
- Relation properties can target another Atlas database and select real records from it
- Table, gallery, and board views
- View configuration stored in Supabase instead of browser-only localStorage
- Table density and color controls
- Gallery and board grouping/cover configuration
- Independent visual designers for record pages, gallery cards, and board cards
- Dragging, resizing, typography, colors, shapes, images, and data-bound properties
- Default designs per database
- Per-record record-page overrides that begin as a clone of the database default
- Designed gallery and board cards render live record data
- Native image uploads through Supabase Storage
- Row Level Security for workspace data
- GitHub Pages deployment workflow

## Architecture

```text
Workspace
  -> Databases
      -> Fields
      -> Records
      -> Views
          -> Table configuration
          -> Gallery configuration
          -> Board configuration
      -> Layouts
          -> Record page default
          -> Gallery card default
          -> Board card default
          -> Record-specific overrides
```

The database owns information. Views and layouts own presentation. Changing a hotel address, podcast guest name, book rating, or project status changes the record. Moving that information around visually changes only the presentation.

## Design inheritance

The intended design hierarchy is:

```text
Database default design
        ↓
Saved/reusable templates (next layer)
        ↓
Individual record override
```

A record with no override inherits the database default. Opening **Customize this record** creates an override by cloning that default, after which the record can diverge completely.

## Relations

A Relation property stores related record IDs, but its field configuration now also identifies the target database. The editor shows real records from that target database rather than making the user paste UUIDs.

The next relation layer is reverse relations, embedded related-record views, rollups, counts, sums, and formulas. Those are necessary for things like travel budgets, podcast episode dashboards, series/character relationships, and project management.

## Product acceptance tests

Atlas should eventually be able to recreate all of these without domain-specific application code:

1. A rich book tracker with custom cards and unique book pages.
2. A travel workspace with trips, reservations, places, expenses, packing, timelines, photos, notes, and memories.
3. A podcast workspace with episodes, guests, research, sponsors, tasks, clips, publishing status, and assets.
4. An entirely different workflow we did not anticipate when designing the schema.

If a feature only works because Atlas understands what a “book,” “trip,” or “episode” is, the abstraction is wrong.

## Next major layer

The next revamp milestone is **page composition + embedded views**. A record page should be able to contain functional blocks such as related-record tables, galleries, boards, calendars, timelines, metrics, progress indicators, checklists, text, images, and freeform designed regions. That is what will let a Trip record become a full travel workspace or a Podcast record become a full production dashboard.

## Local development

Create a `.env` file with:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Then:

```bash
npm install
npm run dev
```

## GitHub Pages

Add these repository secrets under **Settings > Secrets and variables > Actions**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Set GitHub Pages source to **GitHub Actions**. Every push to `main` runs the included deployment workflow.

## Security

The browser receives only the Supabase publishable/anon key, which is expected to be public. Access control is enforced with Row Level Security. Never place a Supabase service-role or secret key in the frontend or GitHub Pages build secrets.
