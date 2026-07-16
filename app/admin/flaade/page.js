import { fetchGpsSmart } from "@/lib/ordrestyring";
import { getFleetCarNames } from "@/lib/goals";
import { gemBilnavne } from "./actions";
import { db } from "@/lib/db";
import { toISODate, addDays } from "@/lib/dates";
import { latestByCar, formatSince } from "@/lib/fleet";
import FleetMap from "@/components/FleetMap";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function FleetPage() {
  const since = toISODate(addDays(new Date(), -7));
  const { data: recent } = await db()
    .from("tasks")
    .select("order_number")
    .gte("date", since)
    .not("order_number", "is", null)
    .limit(300);
  const numbers = [...new Set((recent || []).map((r) => r.order_number))];
  const carNames = await getFleetCarNames();
  const result = await fetchGpsSmart(numbers, carNames);
  const cars = result.entries ? latestByCar(result.entries) : [];
  const viaLabel =
    result.via === "cars"
      ? " · via kørebog pr. bil (Aceve-workaround, ticket OS-12191)"
      : result.via === "cases"
        ? " · via sags-opslag (nødløsning)"
        : "";

  return (
    <main>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Flåden</h1>
        <span className="text-xs text-slate-400">
          🔒 Kun i admin · sidst kendte position fra kørebogen · opdaterer hvert minut
          {viaLabel}
        </span>
      </div>
      <p className="mb-5 max-w-3xl text-sm text-slate-500">
        Hver bils position er slutpunktet på dens seneste tur i OS Vehicle. Omdøb bilerne til
        &quot;Bil 1&quot;–&quot;Bil 11&quot; i OS Vehicle, så matcher numre og farver tavlen
        automatisk.
      </p>

      <form action={gemBilnavne} className="card mb-5 max-w-2xl p-4">
        <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
          Bilnavne fra OS Vehicle (én pr. linje)
        </div>
        <p className="mb-2 text-xs text-slate-500">
          API&apos;ets egen bil-liste kommer pt. tom retur, så skriv navnene præcis som de står i
          OS Vehicle (fx &quot;Flynn&quot; eller &quot;Bil 1&quot;) – så henter Flåden turene pr. bil.
        </p>
        <textarea
          name="names"
          rows={5}
          defaultValue={carNames.join("\n")}
          placeholder={"Bil 1\nBil 2\nFlynn\nKean/dennis"}
          className="w-full rounded-lg border border-slate-300 p-2 text-sm"
        />
        <button type="submit" className="btn-primary mt-2">
          Gem bilnavne
        </button>
      </form>

      {result.error ? (
        <div className="max-w-2xl space-y-3">
          <div className="card border-red-200 bg-red-50 p-5 text-sm text-red-800">
            <strong>Kunne ikke hente GPS-data:</strong> {result.error}
          </div>
          {result.debug && (
            <details className="card p-4 text-xs text-slate-600">
              <summary className="cursor-pointer font-semibold text-slate-500">
                Tekniske detaljer (til Aceve-support)
              </summary>
              <div className="mt-2 break-all">{result.debug}</div>
            </details>
          )}
        </div>
      ) : cars.length === 0 ? (
        <div className="max-w-2xl space-y-3">
          <div className="card p-8 text-center text-slate-500">
            Ingen GPS-ture fundet endnu. Tjek at OS Vehicle-enhederne er aktive.
          </div>
          <a href="/admin/flaade/diagnose" className="btn-ghost inline-block">
            Åbn fuld teknisk diagnose →
          </a>
          {result.debug && (
            <div className="card border-slate-300 bg-slate-50 p-4 text-xs text-slate-600">
              <div className="mb-1 font-semibold uppercase tracking-wide text-slate-500">
                Diagnose (send et billede af denne boks til fejlsøgning)
              </div>
              {result.debug}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_16rem] items-start gap-5">
          <div className="card overflow-hidden p-2">
            <FleetMap cars={cars} showNames reloadSeconds={60} />
          </div>

          <aside className="card overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Biler ({cars.length})
            </div>
            <ul>
              {cars.map((car) => (
                <li key={car.name} className="border-b border-slate-100 px-4 py-2.5 last:border-0">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                    <span>{car.bilNo != null ? `Bil ${car.bilNo}` : car.name}</span>
                    <span className={car.moving ? "text-green-600" : "text-slate-400"}>
                      {car.moving ? "● i bevægelse" : `⏸ ${formatSince(car.minutesSince)}`}
                    </span>
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {car.bilNo != null ? `${car.name} · ` : ""}
                    {car.address || "ukendt adresse"}
                    {car.caseNumber ? ` · sag ${car.caseNumber}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}
    </main>
  );
}
