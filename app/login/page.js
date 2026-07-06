import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function login(formData) {
  "use server";
  const password = formData.get("password");
  if (password && password === process.env.ADMIN_PASSWORD) {
    cookies().set("tavle_admin", sessionToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 dage
    });
    redirect("/admin/morgen");
  }
  redirect("/login?fejl=1");
}

export default function LoginPage({ searchParams }) {
  const hasError = searchParams?.fejl === "1";
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6">
          <div className="font-display text-2xl font-800 font-extrabold tracking-tight">
            Driftstavle
          </div>
          <p className="text-sm text-slate-500 mt-1">Log ind som administrator</p>
        </div>
        <form action={login} className="space-y-4">
          <div>
            <label className="label" htmlFor="password">Adgangskode</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              className="input"
              placeholder="••••••••"
            />
          </div>
          {hasError && (
            <p className="text-sm text-red-600">
              Forkert adgangskode. Prøv igen.
            </p>
          )}
          <button type="submit" className="btn-primary w-full justify-center">
            Log ind
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-6">
          Tavlen kan ses uden login på <span className="font-mono">/tavle</span>
        </p>
      </div>
    </main>
  );
}
