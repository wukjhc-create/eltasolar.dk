import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateTeam } from "../actions";
import TeamForm from "@/components/TeamForm";

export const dynamic = "force-dynamic";

export default async function EditTeam({ params }) {
  const { data: team } = await db().from("teams").select("*").eq("id", params.id).single();
  if (!team) notFound();
  return (
    <main>
      <h1 className="font-display text-2xl font-extrabold tracking-tight mb-5">Redigér hold</h1>
      <TeamForm team={team} action={updateTeam} />
    </main>
  );
}
