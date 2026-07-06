# Driftstavle

Digital produktionstavle til montagevirksomhed. Én admin styrer tavlen, medarbejderne ser en read-only visning på en fælles skærm.

## Teknisk stack

- **Next.js 14** (App Router, JavaScript) – frontend og backend i ét projekt
- **Tailwind CSS** – styling
- **Supabase** (Postgres) – database, data gemmes online
- **Vercel** – hosting
- **Simpelt admin-login** – én adgangskode sat som miljøvariabel, ingen brugertabel

Al databaseadgang sker på serveren med Supabase service role-nøglen. RLS er slået til uden policies, så data kan ikke læses direkte udefra med den offentlige nøgle.

## Sider

| URL | Beskrivelse |
|---|---|
| `/tavle` | Read-only tavle til den fælles skærm (opdaterer sig selv hvert minut) |
| `/login` | Admin-login |
| `/admin` | Dashboard med ugens nøgletal og Top 3 |
| `/admin/kalender` | Ugekalender – opret, redigér, flyt og luk opgaver |
| `/admin/medarbejdere` | Opret/redigér medarbejdere, roller, hold, timer |
| `/admin/hold` | Opret/redigér hold, farve, sortering |
| `/admin/fravaer` | Klik-grid til fravær + samlet fraværsprocent |

## 1. Opsæt Supabase (5 minutter)

1. Opret en gratis konto på [supabase.com](https://supabase.com) og opret et nyt projekt.
2. Gå til **SQL Editor** → **New query**, indsæt hele indholdet af `supabase/schema.sql` og tryk **Run**.
3. (Valgfrit) Kør derefter `supabase/seed.sql` for at få 4 hold og 8 medarbejdere som testdata.
4. Gå til **Project Settings → API** og notér:
   - **Project URL** (fx `https://abcdefg.supabase.co`)
   - **service_role key** (under "Project API keys" – hold den hemmelig)

## 2. Kør projektet lokalt

Kræver Node.js 18 eller nyere.

```bash
npm install
cp .env.example .env.local
```

Åbn `.env.local` og udfyld:

```
SUPABASE_URL=https://dit-projekt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=din-service-role-key
ADMIN_PASSWORD=vælg-en-stærk-kode
```

Start udviklingsserveren:

```bash
npm run dev
```

- Tavlen: http://localhost:3000/tavle
- Admin: http://localhost:3000/admin (du sendes til login første gang)

## 3. Deploy til Vercel

1. Læg projektet på GitHub (`git init`, commit, push).
2. Gå til [vercel.com](https://vercel.com) → **Add New Project** → vælg dit repo. Vercel genkender Next.js automatisk.
3. Under **Environment Variables** tilføjes de samme tre variabler som i `.env.local`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`
4. Tryk **Deploy**.

Herefter:
- Åbn `https://dit-projekt.vercel.app/tavle` på den fælles skærm (sæt browseren i fuldskærm med F11).
- Administrér fra `https://dit-projekt.vercel.app/admin`.

## Sådan bruges tavlen i hverdagen

- **Opret opgave**: Admin → Kalender → klik på `+` i en celle. Ordrenummer, tekst, kunde/adresse, status og note.
- **Flyt opgave**: Klik på opgaven, ændr dato eller medarbejder, gem. (Drag-and-drop er bevidst udeladt i v1.)
- **Luk en sag**: Sæt status til *Lukket* – den bliver grøn og tæller med i Top 3.
- **Tilbage-sag**: Sæt status til *Tilbage* og vælg årsag (Materialer, Montage, Elektriker, Kunde/adgang, Vejr, Planlægning, Andet).
- **Fravær**: Admin → Fravær → klik på dagen. Registrerer medarbejderens standardtimer (fx 7,5). Tavlen viser kun den samlede procent – aldrig fravær pr. person.
- **Top 3**: Beregnes pr. hold ud fra lukkede sager i ugen (og måneden). Kun top 3 vises, ingen bundplaceringer.

## Beregninger

- **Færdiggørelsesprocent** = lukkede sager / alle sager i ugen × 100
- **Fraværsprocent** = fraværstimer / (aktive medarbejdere på tavlen × arbejdsdage × standardtimer) × 100
- **Top 3** = antal opgaver med status *Lukket* grupperet pr. hold i perioden

## Struktur

```
app/
  tavle/            Read-only tavle
  login/            Admin-login
  admin/
    page.js         Dashboard
    kalender/       Ugekalender + opret/redigér opgave + actions
    medarbejdere/   Liste + opret/redigér + actions
    hold/           Liste + opret/redigér + actions
    fravaer/        Fraværsgrid + actions
components/         BoardGrid, TaskForm, WeekNav, Legend, TopThree m.fl.
lib/                db.js, dates.js, stats.js (beregninger), status.js, auth.js
supabase/           schema.sql + seed.sql
middleware.js       Beskytter /admin med session-cookie
```

## Senere udvidelser (forberedt)

- Flere/færre hold og medarbejdere styres allerede 100 % i admin – ingen kode skal ændres.
- `settings`-tabellen er klar til fx konfigurerbare standardtimer eller ugevisning.
- Drag-and-drop, medarbejder-login, rapporter m.m. kan bygges ovenpå uden at ændre datamodellen.
