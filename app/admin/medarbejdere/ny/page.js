import { db } from "@/lib/db";
import { createEmployee } from "../actions";
import EmployeeForm from "@/components/EmployeeForm";

export const dynamic = "force-dynamic";

export default async function NewEmployee() {
  const { data: teams } = await db()
    .from("teams").select("*").eq("active", true)
    .order("sort_order").order("name");
  return (
    <main>
      <h1 className="font-display text-2xl font-extrabold tracking-tight mb-5">Ny medarbejder</h1>
      <EmployeeForm teams={teams || []} action={createEmployee} />
    </main>
  );
}
