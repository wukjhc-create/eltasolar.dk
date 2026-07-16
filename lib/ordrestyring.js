// Integration til Ordrestyring.dk's GraphQL API.
// Kraever miljoevariablen ORDRESTYRING_API_KEY (saettes i Vercel).
// Dokumentation: https://graphql.ordrestyring.dk/docs

const ENDPOINT = "https://graphql.ordrestyring.dk/graphql";

export async function callGraphql(query, variables) {
  const key = process.env.ORDRESTYRING_API_KEY;
  if (!key) {
    return { error: "ORDRESTYRING_API_KEY mangler i miljøvariablerne (Vercel → Settings)." };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
      cache: "no-store",
    });
    const json = await res.json();
    if (json.errors?.length) {
      return { graphqlError: JSON.stringify(json.errors).slice(0, 600), data: json.data };
    }
    return { data: json.data };
  } catch (err) {
    return {
      error:
        err.name === "AbortError"
          ? "Ordrestyring svarede ikke inden for 15 sekunder."
          : `Kunne ikke kontakte Ordrestyring: ${err.message}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/* ---------- Enkelt sagsopslag (bruges af "Hent sag"-knappen) ---------- */

const CASE_QUERY = `
  query HentSag($nr: String!) {
    caseByCaseNumber(caseNumber: $nr) {
      caseNumber
      description
      projectName
      customer { name fullAddress }
      workAddress { fullAddress name address postalCode city }
      status { text }
    }
  }
`;
const CASE_QUERY_INT = CASE_QUERY.replace("$nr: String!", "$nr: Int!");

// Faelles mapping af en sag til tavlens felter
export function mapCase(c) {
  const wa = c?.workAddress;
  const address =
    wa?.fullAddress ||
    [wa?.address, [wa?.postalCode, wa?.city].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ") ||
    c?.customer?.fullAddress ||
    "";
  const customerName = c?.customer?.name || wa?.name || "";
  const customerAddress = [customerName, address].filter(Boolean).join(" · ").slice(0, 150);

  let title = (c?.description || c?.projectName || "").replace(/\s+/g, " ").trim();
  if (title.length > 100) title = title.slice(0, 97) + "...";

  return {
    caseNumber: c?.caseNumber || "",
    title,
    customerAddress,
    osStatus: c?.status?.text || null,
  };
}

export async function fetchCaseByNumber(rawNumber) {
  const nr = String(rawNumber || "").trim();
  if (!nr) return { error: "Intet sagsnummer angivet." };

  let result = await callGraphql(CASE_QUERY, { nr });
  if (result.graphqlError && /Int/.test(result.graphqlError) && /^\d+$/.test(nr)) {
    result = await callGraphql(CASE_QUERY_INT, { nr: parseInt(nr, 10) });
  }
  if (result.error) return { error: result.error };
  if (result.graphqlError && !result.data?.caseByCaseNumber) {
    return { error: `Ordrestyring svarede med en fejl: ${result.graphqlError}` };
  }
  const c = result.data?.caseByCaseNumber;
  if (!c) return { found: false };

  return { found: true, ...mapCase(c) };
}

/* ---------- Medarbejdere ---------- */

const USERS_TIERS = [
  `query { users(pagination: {cursor: null, limit: 200}) {
     items { id fullName active workHours employeeType { name } } nextCursor } }`,
  `query { users(pagination: {cursor: null, limit: 200}) {
     items { id fullName active } nextCursor } }`,
  `query { users { id fullName active } }`,
];

// Henter alle brugere fra Ordrestyring. Proever flere varianter af
// forespoergslen, da feltnavne kan variere mellem installationer.
export async function fetchOsUsers() {
  let lastError = null;
  for (const query of USERS_TIERS) {
    const result = await callGraphql(query, {});
    if (result.error) return { error: result.error };
    if (result.graphqlError) {
      lastError = result.graphqlError;
      continue; // proev naeste variant
    }
    const raw = result.data?.users;
    const items = Array.isArray(raw) ? raw : raw?.items || [];
    return {
      users: items
        .filter((u) => u && u.id != null)
        .map((u) => ({
          id: u.id,
          name: (u.fullName || "").trim(),
          active: u.active !== false,
          workHours: typeof u.workHours === "number" ? u.workHours : null,
          employeeType: u.employeeType?.name || null,
        })),
    };
  }
  return {
    error: `Kunne ikke hente medarbejdere fra Ordrestyring. Seneste fejl: ${lastError || "ukendt"}`,
  };
}

/* ---------- Kalender-events (planlaegning) ---------- */

const EVENT_CASE = `case { caseNumber description projectName customer { name fullAddress } workAddress { fullAddress address postalCode city name } status { text } }`;
const EVENT_FIELDSETS = [
  `identifier id header text type startTime stopTime hourType { name } user { id fullName } ${EVENT_CASE}`,
  `identifier id header text type startTime stopTime user { id fullName } ${EVENT_CASE}`,
];

// Ordrestyrings events-kald kraever et "between" med { field, from, to }.
// Vi introspekterer API'et foerst, saa vi altid bruger de rigtige typer.
const BETWEEN_INTROSPECT = `query {
  col: __type(name: "CalendarBetweenColumn") { enumValues { name } }
  input: __type(name: "CalendarBetweenInput") {
    inputFields { name type { kind name ofType { kind name ofType { kind name } } } }
  }
}`;

function unwrapTypeName(t) {
  while (t && !t.name && t.ofType) t = t.ofType;
  return t?.name || null;
}

// Henter planlagte events i et datointerval (begge datoer YYYY-MM-DD).
export async function fetchOsEvents(fromISO, toISO) {
  const unixFrom = Math.floor(new Date(`${fromISO}T00:00:00+02:00`).getTime() / 1000);
  const unixTo = Math.floor(new Date(`${toISO}T23:59:59+02:00`).getTime() / 1000);

  // 1) Spoerg API'et hvilke kolonner og taltyper det forventer
  let enumCandidates = ["START_TIME", "STARTTIME", "startTime", "START"];
  let scalar = "Int";
  const intro = await callGraphql(BETWEEN_INTROSPECT, {});
  if (!intro.error && !intro.graphqlError) {
    const vals = (intro.data?.col?.enumValues || []).map((v) => v.name);
    if (vals.length) {
      const preferred = vals.find((n) => /start/i.test(n)) || vals[0];
      enumCandidates = [preferred, ...vals.filter((v) => v !== preferred)];
    }
    const fromField = (intro.data?.input?.inputFields || []).find((f) => f.name === "from");
    const t = unwrapTypeName(fromField?.type);
    if (t) scalar = t;
  }

  const isString = scalar === "String";
  const from = isString ? fromISO : unixFrom;
  const to = isString ? toISO : unixTo;
  let lastError = null;

  // 2) Proev kolonnerne og feltsaet i prioriteret raekkefoelge
  for (const en of enumCandidates.slice(0, 5)) {
    for (const fields of EVENT_FIELDSETS) {
      const query = `query Hent($from: ${scalar}!, $to: ${scalar}!) {
        events(between: {field: ${en}, from: $from, to: $to}) { ${fields} }
      }`;
      const result = await callGraphql(query, { from, to });
      if (result.error) return { error: result.error };
      if (result.graphqlError) {
        lastError = result.graphqlError;
        continue;
      }
      return { events: result.data?.events || [] };
    }
  }

  return {
    error: `Kunne ikke hente kalenderen fra Ordrestyring. Seneste fejl: ${lastError || "ukendt"}`,
  };
}

// Konverterer Ordrestyrings tidsformat (unix-sekunder eller tekst) til dansk dato (YYYY-MM-DD)
export function osTimeToDateISO(value) {
  if (value == null) return null;
  let d;
  if (typeof value === "number") {
    d = new Date(value < 1e12 ? value * 1000 : value);
  } else {
    const s = String(value).trim();
    if (/^\d+$/.test(s)) {
      const n = parseInt(s, 10);
      d = new Date(n < 1e12 ? n * 1000 : n);
    } else if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.slice(0, 10);
    } else {
      d = new Date(s);
    }
  }
  if (isNaN(d)) return null;
  // Dansk tidszone, format YYYY-MM-DD
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Copenhagen" });
}

/* ---------------- OS Vehicle: GPS-ture (koerebogen) ---------------- */
// En "tur" = start/slut-tid, adresser og koordinater + evt. sagskobling.
// Bilens sidst kendte position = slutpunktet paa dens seneste tur.
const GPS_FIELDS = `
  car carRegistrationNumber startTime stopTime startAddress stopAddress distance
  startPoint { latitude longitude }
  stopPoint { latitude longitude }
  case { caseNumber }
`;

// Henter GPS-ture med API-ets faktiske opskrift (fundet via diagnosen):
//   filters: { startTime: { from, to } }  - indlejret datointerval
//   orderBy: { field, direction: DESC }   - nyeste foerst
// Feltnavnene i intervallet bekraeftes ved runtime-introspektion.
export async function fetchGpsEntries(limit = 250) {
  const debug = [];
  const now = Math.floor(Date.now() / 1000);
  const from = now - 14 * 24 * 3600;

  // Bekraeft feltnavnene i GpsStartTimeBetweenInput (forventet: from/to)
  let fromName = "from";
  let toName = "to";
  const intro = await callGraphql(
    `query { __type(name: "GpsStartTimeBetweenInput") { inputFields { name } } }`,
    {}
  );
  const fields = (intro.data?.__type?.inputFields || []).map((f) => f.name);
  if (fields.length) {
    debug.push(`GpsStartTimeBetweenInput: ${fields.join(", ")}`);
    fromName = fields.find((n) => /from|start|after/i.test(n)) || fields[0];
    toName = fields.find((n) => /to|stop|end|before/i.test(n)) || fields[1] || fields[0];
  }

  const filt = `filters: {startTime: {${fromName}: ${from}, ${toName}: ${now}}}`;
  const candidates = [];
  for (const lim of [100, 25, 5]) {
    const pag = `pagination: {cursor: null, limit: ${lim}}`;
    candidates.push(
      `query { gpsEntriesPaginated(${pag}, ${filt}, orderBy: {field: "startTime", direction: DESC}) { items { ${GPS_FIELDS} } } }`,
      `query { gpsEntriesPaginated(${pag}, ${filt}) { items { ${GPS_FIELDS} } } }`,
      `query { gpsEntriesPaginated(${pag}) { items { ${GPS_FIELDS} } } }`
    );
  }

  let emptySeen = false;
  let serverBug = false;
  for (const query of candidates) {
    const result = await callGraphql(query, {});
    if (result.error) return { error: result.error, debug: debug.join(" | ") };
    if (result.graphqlError) {
      if (/SQLSTATE/i.test(String(result.graphqlError))) serverBug = true;
      debug.push(`fejl: ${String(result.graphqlError).slice(0, 300)}`);
      continue;
    }
    const items = result.data?.gpsEntriesPaginated?.items || [];
    debug.push(`forsøg gav ${items.length} ture`);
    if (items.length > 0) return { entries: items, debug: debug.join(" | ") };
    emptySeen = true;
  }
  if (emptySeen) return { entries: [], debug: debug.join(" | ") };
  if (serverBug) {
    return {
      serverBug: true,
      error:
        "Ordrestyrings GPS-endpoint har i øjeblikket en serverfejl (SQL-fejlen 'Ambiguous column name StarDate' i deres database). " +
        "Aceve kender fejlen og arbejder på den (deres ticket OS-12191). Kortet tænder automatisk, når den er rettet.",
      debug: debug.join(" | "),
    };
  }
  return { error: `Ingen forespørgsel lykkedes. ${debug.join(" | ")}`, debug: debug.join(" | ") };
}

// NOEDLOESNING: gpsEntriesPaginated er i stykker hos Aceve (SQL-fejl).
// gpsEntriesForCase bruger muligvis en anden kode-sti - proev turene sag for sag.
export async function fetchGpsViaCases(caseNumbers) {
  const debug = [];
  const numbers = [...new Set((caseNumbers || []).filter(Boolean))].slice(0, 10);
  if (!numbers.length) return { entries: [], debug: "ingen sager at slå op" };

  // Hvordan ser gpsEntriesForCase ud?
  const intro = await callGraphql(
    `query { __type(name: "Query") { fields { name args { name type { kind name ofType { kind name ofType { name } } } } type { kind name ofType { kind name ofType { name } } } } } }`,
    {}
  );
  if (intro.error) return { error: intro.error, debug: debug.join(" | ") };
  const field = (intro.data?.__type?.fields || []).find((f) => f.name === "gpsEntriesForCase");
  if (!field) return { error: "gpsEntriesForCase findes ikke i API'et.", debug: debug.join(" | ") };
  const unwrap = (t) => (t ? t.name || unwrap(t.ofType) : null);
  const caseArg = (field.args || []).find((a) => /case/i.test(a.name)) || field.args?.[0];
  const argName = caseArg?.name || "caseId";
  const argType = unwrap(caseArg?.type) || "Int";
  const hasPagination = (field.args || []).some((a) => a.name === "pagination");
  const retType = unwrap(field.type) || "";
  const wrapItems = /Pagination/i.test(retType);
  debug.push(`gpsEntriesForCase(${(field.args || []).map((a) => a.name).join(", ")}) -> ${retType}`);

  const entries = [];
  let serverBug = false;
  for (const nr of numbers) {
    // Slaa sagens interne id op
    let idResult = await callGraphql(
      `query($nr: String!) { caseByCaseNumber(caseNumber: $nr) { id } }`,
      { nr: String(nr) }
    );
    if (idResult.graphqlError && /Int/.test(idResult.graphqlError) && /^\d+$/.test(String(nr))) {
      idResult = await callGraphql(
        `query($nr: Int!) { caseByCaseNumber(caseNumber: $nr) { id } }`,
        { nr: parseInt(nr, 10) }
      );
    }
    const caseId = idResult.data?.caseByCaseNumber?.id;
    if (!caseId) continue;

    const val = /Int/i.test(argType) ? caseId : `"${caseId}"`;
    const pagPart = hasPagination ? `, pagination: {cursor: null, limit: 50}` : "";
    const query = wrapItems
      ? `query { gpsEntriesForCase(${argName}: ${val}${pagPart}) { items { ${GPS_FIELDS} } } }`
      : `query { gpsEntriesForCase(${argName}: ${val}${pagPart}) { ${GPS_FIELDS} } }`;
    const r = await callGraphql(query, {});
    if (r.graphqlError) {
      if (/SQLSTATE/i.test(String(r.graphqlError))) {
        serverBug = true;
        debug.push(`sag ${nr}: samme serverfejl`);
        break; // samme defekte kode-sti - ingen grund til at hamre videre
      }
      debug.push(`sag ${nr}: ${String(r.graphqlError).slice(0, 120)}`);
      continue;
    }
    const list = wrapItems ? r.data?.gpsEntriesForCase?.items : r.data?.gpsEntriesForCase;
    if (Array.isArray(list) && list.length) {
      entries.push(...list);
      debug.push(`sag ${nr}: ${list.length} ture`);
    }
  }
  return { entries, viaCases: true, serverBug, debug: debug.join(" | ") };
}

// WORKAROUND fra Aceve-support (Magnus, ticket OS-12191): den ikke-paginerede
// gpsEntries-query rammer ikke SQL-fejlen. Den kraever car + startTime.from/to
// og kaldes derfor en gang pr. bil.
export async function fetchGpsViaCars(days = 7, extraNames = []) {
  const debug = [];
  const now = Math.floor(Date.now() / 1000);
  const from = now - days * 24 * 3600;

  // Bilerne: API-ets cars-liste + manuelt indtastede navne fra admin
  let names = [];
  const carsResult = await callGraphql(`query { cars { name } }`, {});
  if (!carsResult.error && !carsResult.graphqlError) {
    names = (carsResult.data?.cars || []).map((c) => c?.name).filter(Boolean);
  }
  for (const n of extraNames) {
    const clean = String(n || "").trim();
    if (clean && !names.includes(clean)) names.push(clean);
  }
  debug.push(`${names.length} biler${extraNames.length ? ` (heraf ${extraNames.length} indtastet)` : ""}`);
  if (!names.length)
    return {
      entries: [],
      via: "cars",
      debug: debug.join(" | ") + " - indtast bilnavnene på Flåden-siden",
    };

  // gpsEntries er deprecated og derfor USYNLIG i introspektion - kald den direkte.
  // To varianter: svaret som ren liste eller pakket ind i items.
  const entries = [];
  let serverBug = false;
  let wrapItems = null; // ukendt indtil foerste svar
  for (const name of names) {
    const safe = String(name).replace(/"/g, '\\"');
    const variants =
      wrapItems === null
        ? [
            `query { gpsEntries(car: "${safe}", startTime: {from: ${from}, to: ${now}}) { ${GPS_FIELDS} } }`,
            `query { gpsEntries(car: "${safe}", startTime: {from: ${from}, to: ${now}}) { items { ${GPS_FIELDS} } } }`,
          ]
        : wrapItems
          ? [`query { gpsEntries(car: "${safe}", startTime: {from: ${from}, to: ${now}}) { items { ${GPS_FIELDS} } } }`]
          : [`query { gpsEntries(car: "${safe}", startTime: {from: ${from}, to: ${now}}) { ${GPS_FIELDS} } }`];

    let handled = false;
    for (let i = 0; i < variants.length && !handled; i++) {
      const r = await callGraphql(variants[i], {});
      if (r.graphqlError) {
        if (/SQLSTATE/i.test(String(r.graphqlError))) {
          serverBug = true;
          debug.push(`${name}: serverfejl`);
          handled = true;
          break;
        }
        if (i === variants.length - 1) {
          debug.push(`${name}: ${String(r.graphqlError).slice(0, 100)}`);
          handled = true;
        }
        continue; // proev naeste variant
      }
      const raw = r.data?.gpsEntries;
      const list = Array.isArray(raw) ? raw : raw?.items;
      if (wrapItems === null) wrapItems = !Array.isArray(raw);
      if (Array.isArray(list) && list.length) {
        entries.push(...list);
        debug.push(`${name}: ${list.length} ture`);
      } else {
        debug.push(`${name}: 0 ture`);
      }
      handled = true;
    }
    if (serverBug) break;
  }
  return { entries, via: "cars", serverBug, debug: debug.join(" | ") };
}

// Smart orkestrering: bedste tilgaengelige vej vinder.
// 1) gpsEntriesPaginated (taender selv naar Aceve retter OS-12191)
// 2) gpsEntries pr. bil (Aceves anbefalede workaround)
// 3) gpsEntriesForCase pr. sag (sidste udvej)
export async function fetchGpsSmart(caseNumbers = [], carNames = []) {
  const main = await fetchGpsEntries(100);
  if (main.entries?.length || (main.entries && !main.error && !main.serverBug)) {
    if (main.entries.length) return { ...main, via: "paginated" };
  }
  if (!main.error && main.entries?.length === 0) {
    // Tomt men uden fejl: proev workaround alligevel (kan vaere samme skjulte forhold)
  }

  const perCar = await fetchGpsViaCars(7, carNames);
  if (perCar.entries?.length) {
    return { ...perCar, debug: `${main.debug || main.error || ""} || pr. bil: ${perCar.debug}` };
  }

  const perCase = await fetchGpsViaCases(caseNumbers);
  if (perCase.entries?.length) {
    return { ...perCase, via: "cases", debug: `pr. sag: ${perCase.debug}` };
  }

  // Intet gav data: returner den mest sigende fejl
  if (main.error) return { ...main, debug: [main.debug, perCar.debug, perCase.debug].filter(Boolean).join(" || ") };
  return {
    entries: [],
    debug: [main.debug, perCar.debug, perCase.debug].filter(Boolean).join(" || "),
  };
}
