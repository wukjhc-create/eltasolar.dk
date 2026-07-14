// Endegyldig GPS-diagnose: dumper ALT fra API-et om gpsEntriesPaginated og cars,
// saa fejlsoegningen kan afsluttes med ET skaermbillede.
// Ligger under /admin, saa den er beskyttet af login.

import { callGraphql } from "@/lib/ordrestyring";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run(label, query) {
  try {
    const r = await callGraphql(query, {});
    return { label, query, result: r.error || r.graphqlError || r.data };
  } catch (e) {
    return { label, query, result: `Uventet fejl: ${e.message}` };
  }
}

export default async function GpsDiagnose() {
  const argIntro = await run(
    "1) Argumenter paa gpsEntriesPaginated (fuld typebeskrivelse)",
    `query { __type(name: "Query") { fields { name args { name type { kind name ofType { kind name ofType { kind name ofType { name } } } } } } } }`
  );
  // Reducer til kun gps-feltet, saa dumpen kan laeses
  if (argIntro.result?.__type?.fields) {
    argIntro.result = argIntro.result.__type.fields.filter((f) =>
      /^(gpsEntriesPaginated|gpsEntriesForCase|gpsEntry|cars)$/.test(f.name)
    );
  }

  const checks = [argIntro];
  // Find input-typenavne for filters/orderBy og dump dem raat
  const gpsField = Array.isArray(argIntro.result)
    ? argIntro.result.find((f) => f.name === "gpsEntriesPaginated")
    : null;
  const unwrap = (t) => (t ? t.name || unwrap(t.ofType) : null);
  for (const argName of ["filters", "orderBy", "pagination", "search", "car"]) {
    const arg = gpsField?.args?.find((a) => a.name === argName);
    const typeName = arg ? unwrap(arg.type) : null;
    if (typeName) {
      checks.push(
        await run(
          `2) Typen bag "${argName}": ${typeName}`,
          `query { __type(name: "${typeName}") { kind name enumValues { name } inputFields { name type { kind name ofType { kind name ofType { name } } } } } }`
        )
      );
    }
  }

  checks.push(
    await run(
      "3) Raat kald: gpsEntriesPaginated (limit 5)",
      `query { gpsEntriesPaginated(pagination: {cursor: null, limit: 5}) { items { car carRegistrationNumber startTime stopTime startAddress stopAddress } } }`
    )
  );
  checks.push(await run("4) Bil-listen: cars", `query { cars { name } }`));

  return (
    <main>
      <h1 className="font-display text-2xl font-extrabold tracking-tight mb-2">
        GPS-diagnose (teknisk)
      </h1>
      <p className="mb-5 max-w-3xl text-sm text-slate-500">
        Send et skærmbillede af HELE denne side til fejlsøgning. Punkt 4 afgør, om OS
        Vehicle-data overhovedet er åbnet for API-nøglen.
      </p>
      {checks.map((c, i) => (
        <div key={i} className="card mb-4 max-w-4xl overflow-x-auto p-4">
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            {c.label}
          </div>
          <pre className="whitespace-pre-wrap break-all text-[11px] leading-snug text-slate-700">
            {JSON.stringify(c.result, null, 1)}
          </pre>
        </div>
      ))}
    </main>
  );
}
