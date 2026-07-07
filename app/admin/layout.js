import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function logout() {
  "use server";
  cookies().delete("tavle_admin");
  redirect("/login");
}

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/morgen", label: "Gennemgang" },
  { href: "/admin/kalender", label: "Kalender" },
  { href: "/admin/medarbejdere", label: "Medarbejdere" },
  { href: "/admin/hold", label: "Hold" },
  { href: "/admin/fravaer", label: "Fravær" },
  { href: "/admin/tilbage", label: "Tilbagekørsler" },
  { href: "/admin/nyheder", label: "Nyheder" },
  { href: "/admin/synk", label: "Synk" },
];

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen">
      <nav className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
          <span className="font-display font-extrabold tracking-tight">Driftstavle</span>
          <div className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/tavle"
              target="_blank"
              className="rounded px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
            >
              Åbn tavlen ↗
            </Link>
            <form action={logout}>
              <button className="rounded px-3 py-1.5 text-sm font-medium text-slate-400 hover:bg-slate-700 hover:text-white">
                Log ud
              </button>
            </form>
          </div>
        </div>
      </nav>
      <div className="mx-auto max-w-7xl p-6">{children}</div>
    </div>
  );
}
