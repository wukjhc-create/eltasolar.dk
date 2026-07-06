import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateTask, deleteTask } from "../../actions";
import TaskForm from "@/components/TaskForm";

export const dynamic = "force-dynamic";

export default async function EditTask({ params, searchParams }) {
  const client = db();
  const [{ data: task }, { data: employees }] = await Promise.all([
    client.from("tasks").select("*").eq("id", params.id).single(),
    client.from("employees").select("*").order("sort_order").order("name"),
  ]);
  if (!task) notFound();

  return (
    <main>
      <h1 className="font-display text-2xl font-extrabold tracking-tight mb-5">
        Redigér opgave
      </h1>
      <TaskForm
        task={task}
        employees={employees || []}
        action={updateTask}
        deleteAction={deleteTask}
        weekParam={searchParams?.uge || task.date}
      />
    </main>
  );
}
