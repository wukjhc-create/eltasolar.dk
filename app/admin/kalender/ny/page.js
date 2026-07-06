import { db } from "@/lib/db";
import { createTask } from "../actions";
import { fetchCaseByNumber } from "@/lib/ordrestyring";
import TaskForm from "@/components/TaskForm";

export const dynamic = "force-dynamic";

export default async function NewTask({ searchParams }) {
  const { data: employees } = await db()
    .from("employees")
    .select("*")
    .order("sort_order")
    .order("name");

  // Hvis der er skrevet et sagsnummer i "Hent fra Ordrestyring"-feltet,
  // slaas sagen op og formularen forudfyldes.
  const osNumber = (searchParams?.os || "").trim();
  let osResult = null;
  if (osNumber) {
    osResult = await fetchCaseByNumber(osNumber);
  }

  const draft = {
    date: searchParams?.dato || "",
    employee_id: searchParams?.medarbejder || "",
    order_number: osResult?.found ? osResult.caseNumber : osNumber || "",
    title: osResult?.found ? osResult.title : "",
    customer_address: osResult?.found ? osResult.customerAddress : "",
  };

  return (
    <main>
      <h1 className="font-display text-2xl font-extrabold tracking-tight mb-5">Ny opgave</h1>

      {/* Opslag i Ordrestyring */}
      <form method="GET" className="card p-4 max-w-2xl mb-4">
        <input type="hidden" name="dato" value={searchParams?.dato || ""} />
        <input type="hidden" name="medarbejder" value={searchParams?.medarbejder || ""} />
        <input type="hidden" name="uge" value={searchParams?.uge || ""} />
        <label className="label" htmlFor="os">Hent fra Ordrestyring</label>
        <div className="flex gap-2">
          <input
            id="os"
            name="os"
            defaultValue={osNumber}
            className="input max-w-xs"
            placeholder="Sagsnummer, fx 2115"
          />
          <button type="submit" className="btn-primary whitespace-nowrap">
            Hent sag
          </button>
        </div>
        {osResult?.found && (
          <p className="mt-2 text-sm text-green-700">
            ✓ Fandt sag {osResult.caseNumber}
            {osResult.osStatus ? ` · status i Ordrestyring: "${osResult.osStatus}"` : ""}.
            Felterne nedenfor er udfyldt – ret til og gem.
          </p>
        )}
        {osResult && osResult.found === false && (
          <p className="mt-2 text-sm text-red-600">
            Ingen sag med nummer {osNumber} i Ordrestyring. Tjek nummeret, eller udfyld manuelt.
          </p>
        )}
        {osResult?.error && (
          <p className="mt-2 text-sm text-red-600">{osResult.error}</p>
        )}
      </form>

      <TaskForm
        task={draft}
        employees={employees || []}
        action={createTask}
        weekParam={searchParams?.uge || ""}
      />
    </main>
  );
}
