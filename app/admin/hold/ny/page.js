import { createTeam } from "../actions";
import TeamForm from "@/components/TeamForm";

export default function NewTeam() {
  return (
    <main>
      <h1 className="font-display text-2xl font-extrabold tracking-tight mb-5">Nyt hold</h1>
      <TeamForm action={createTeam} />
    </main>
  );
}
