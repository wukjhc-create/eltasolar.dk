import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateEmployee } from "../actions";
import EmployeeForm from "@/components/EmployeeForm";

export const dynamic = "force-dynamic";

export default async function EditEmployee({ params }) {
  const client = db();
  const [{ data: employee }, { data: teams }] = await Promise.all([
    client.from("employees").select("*").eq("id", params.id).single(),
    client.from("teams").select("*").order("sort_order").order("name"),
  ]);
  if (!employee) notFound();
  return (
    <main>
      <h1 className="font-display text-2xl font-extrabold tracking-tight mb-5">
        Redigér medarbejder
      </h1>
      <EmployeeForm employee={employee} teams={teams || []} action={updateEmployee} />
    </main>
  );
}
