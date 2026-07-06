// Integration til Ordrestyring.dk's GraphQL API.
// Kraever miljoevariablen ORDRESTYRING_API_KEY (saettes i Vercel).
// Dokumentation: https://graphql.ordrestyring.dk/docs

const ENDPOINT = "https://graphql.ordrestyring.dk/graphql";

async function callGraphql(query, variables) {
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
      return { graphqlError: json.errors.map((e) => e.message).join("; "), data: json.data };
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
