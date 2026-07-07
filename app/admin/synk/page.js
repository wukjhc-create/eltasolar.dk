import { getLastSyncReport } from "@/lib/sync";
import { runSyncNow } from "./actions";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function formatTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("da-DK", {
    timeZone: "Europe/Copenhagen",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function SyncPage() {
  const report = await getLastSyncReport();

  return (
    <main>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          Synkronisering med Ordrestyring
        </h1>
        <form action={runSyncNow}>
          <button className="btn-primary">Synkronisér nu</button>
        </form>
      </div>

      <div className="card p-5 max-w-2xl space-y-4">
        {!report && (
          <p className="text-slate-500">
            Ingen synkronisering kørt endnu. Tryk på &quot;Synkronisér nu&quot; for at hente
            medarbejdere og planlagte sager fra Ordrestyring. Herefter kører den automatisk
            hvert 5. minut.
          </p>
        )}

        {report && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Seneste synkronisering
              </span>
              <span className="text-sm text-slate-600">{formatTime(report.finishedAt)}</span>
            </div>

            {report.error ? (
              <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                <strong>Fejl:</strong> {report.error}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded bg-slate-50 p-3">
                  <div className="font-display text-2xl font-extrabold tabular-nums">
                    {report.employees.created + report.employees.updated}
                  </div>
                  <div className="text-xs text-slate-500">
                    medarbejdere ({report.employees.created} nye)
                  </div>
                </div>
                <div className="rounded bg-slate-50 p-3">
                  <div className="font-display text-2xl font-extrabold tabular-nums">
                    {report.tasks.created + report.tasks.updated}
                  </div>
                  <div className="text-xs text-slate-500">
                    opgaver ({report.tasks.created} nye, {report.tasks.deleted} fjernet)
                  </div>
                </div>
                <div className="rounded bg-slate-50 p-3">
                  <div className="font-display text-2xl font-extrabold tabular-nums">
                    {report.absences.created}
                  </div>
                  <div className="text-xs text-slate-500">fraværsdage</div>
                </div>
              </div>
            )}

            {report.warnings?.length > 0 && (
              <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                <strong>Bemærkninger:</strong>
                <ul className="mt-1 list-disc pl-5">
                  {report.warnings.slice(0, 10).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="border-t border-slate-100 pt-4 text-sm text-slate-500 space-y-2">
          <p>
            <strong className="text-slate-700">Sådan virker det:</strong> Ordrestyring bestemmer,
            hvem der er på hvilke sager og hvornår. Tavlen henter det automatisk hvert 5. minut.
          </p>
          <p>
            <strong className="text-slate-700">Ordrestyring er den eneste sandhed:</strong>{" "}
            kalender og status spejles direkte derfra ved hver synkronisering (flyttede og slettede aftaler forsvinder også fra tavlen) – også hvis en fejl
            rettes, genberegnes al statistik automatisk. Her styrer I kun holdene (sættes én
            gang under Medarbejdere).
          </p>
          <p>
            Sagens status oversættes PR. FAG: &quot;El færdig&quot; lukker kun elektrikerens kort, &quot;Solceller færdig&quot; kun montørernes, &quot;Kræver genbesøg EL/Solceller&quot; rammer kun det fag, og &quot;Klar til tilmelding/fakturering&quot; lukker begge. Ingen straffes for den andens arbejde.
            Nye medarbejdere fra Ordrestyring lander uden hold – tildel dem et hold under
            Medarbejdere, så tæller de med i Top 3. Kalender-aftaler med ord som ferie, sygdom
            og fri registreres automatisk som fravær.
          </p>
        </div>
      </div>
    </main>
  );
}
