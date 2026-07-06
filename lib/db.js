import { createClient } from "@supabase/supabase-js";

export function db() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// Henter alt data der skal bruges til en uge (tavle + admin-kalender)
export async function getWeekData(fromISO, toISO) {
  const client = db();
  const [teams, employees, tasks, absences] = await Promise.all([
    client.from("teams").select("*").order("sort_order").order("name"),
    client.from("employees").select("*").order("sort_order").order("name"),
    client.from("tasks").select("*").gte("date", fromISO).lte("date", toISO).order("created_at"),
    client.from("absences").select("*").gte("date", fromISO).lte("date", toISO),
  ]);
  return {
    teams: teams.data || [],
    employees: employees.data || [],
    tasks: tasks.data || [],
    absences: absences.data || [],
  };
}
